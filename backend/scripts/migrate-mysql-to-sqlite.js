/**
 * MySQL 到 SQLite 数据迁移脚本
 */

const mysql = require('mysql2/promise');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_PATH = path.resolve(__dirname, '../data/simnotice.db');

// 将值转换为 SQLite 兼容格式
function toSqliteValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().replace('T', ' ').substring(0, 19);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  return String(value);
}

async function migrateData() {
  let mysqlConnection;
  let sqliteDb;

  try {
    console.log('=== MySQL 到 SQLite 数据迁移 ===\n');

    // 连接 MySQL
    console.log('正在连接 MySQL 数据库...');
    mysqlConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'simnotice_db',
      port: process.env.DB_PORT || 3306,
    });
    console.log('MySQL 连接成功\n');

    // 初始化 SQL.js
    console.log('正在初始化 SQLite...');
    const SQL = await initSqlJs();

    // 确保目录存在
    const DB_DIR = path.dirname(DB_PATH);
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    // 创建新的数据库
    sqliteDb = new SQL.Database();
    console.log('SQLite 初始化成功\n');

    // 创建表结构
    console.log('创建表结构...');
    
    sqliteDb.run(`
      CREATE TABLE sim_cards (
        id INTEGER PRIMARY KEY,
        phone_number TEXT NOT NULL UNIQUE,
        balance REAL DEFAULT 0.00,
        carrier TEXT NOT NULL,
        monthly_fee REAL DEFAULT 0.00,
        billing_day INTEGER NOT NULL,
        data_plan TEXT,
        call_minutes TEXT,
        sms_count TEXT,
        location TEXT,
        activation_date TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    sqliteDb.run(`
      CREATE TABLE carriers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    sqliteDb.run(`
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT,
        description TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    sqliteDb.run(`
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY,
        sim_id INTEGER NOT NULL,
        phone_number TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        previous_balance REAL NOT NULL,
        new_balance REAL NOT NULL,
        created_at TEXT
      )
    `);

    console.log('表结构创建完成\n');

    // 迁移 SIM 卡数据
    console.log('--- 迁移 SIM 卡数据 ---');
    const [simCards] = await mysqlConnection.query('SELECT * FROM sim_cards');
    console.log(`找到 ${simCards.length} 条 SIM 卡记录`);

    for (const card of simCards) {
      try {
        const params = [
          card.id, 
          card.phone_number, 
          card.balance, 
          card.carrier, 
          card.monthly_fee,
          card.billing_day, 
          card.data_plan, 
          card.call_minutes, 
          card.sms_count,
          card.location, 
          toSqliteValue(card.activation_date), 
          toSqliteValue(card.created_at), 
          toSqliteValue(card.updated_at)
        ];
        
        const stmt = sqliteDb.prepare(
          `INSERT INTO sim_cards (id, phone_number, balance, carrier, monthly_fee, billing_day, data_plan, call_minutes, sms_count, location, activation_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        stmt.bind(params);
        stmt.step();
        stmt.free();
        
        console.log(`  ✓ ${card.phone_number}`);
      } catch (error) {
        console.error(`  ✗ ${card.phone_number}:`, error);
      }
    }
    
    // 验证插入
    const verifySim = sqliteDb.exec('SELECT COUNT(*) as c FROM sim_cards');
    console.log(`验证: ${verifySim[0].values[0][0]} 条 SIM 卡记录\n`);

    // 迁移运营商数据
    console.log('--- 迁移运营商数据 ---');
    const [carriers] = await mysqlConnection.query('SELECT * FROM carriers');
    console.log(`找到 ${carriers.length} 条运营商记录`);

    for (const carrier of carriers) {
      const stmt = sqliteDb.prepare(`INSERT INTO carriers (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`);
      stmt.bind([carrier.id, carrier.name, toSqliteValue(carrier.created_at), toSqliteValue(carrier.updated_at)]);
      stmt.step();
      stmt.free();
      console.log(`  ✓ ${carrier.name}`);
    }
    console.log(`成功迁移 ${carriers.length} 条运营商记录\n`);

    // 迁移设置数据
    console.log('--- 迁移设置数据 ---');
    const [settings] = await mysqlConnection.query('SELECT * FROM settings');
    console.log(`找到 ${settings.length} 条设置记录`);

    for (const setting of settings) {
      const stmt = sqliteDb.prepare(`INSERT INTO settings (id, setting_key, setting_value, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
      stmt.bind([setting.id, setting.setting_key, setting.setting_value, setting.description, toSqliteValue(setting.created_at), toSqliteValue(setting.updated_at)]);
      stmt.step();
      stmt.free();
      console.log(`  ✓ ${setting.setting_key}`);
    }
    console.log(`成功迁移 ${settings.length} 条设置记录\n`);

    // 迁移交易记录数据
    console.log('--- 迁移交易记录数据 ---');
    try {
      const [transactions] = await mysqlConnection.query('SELECT * FROM transactions ORDER BY id');
      console.log(`找到 ${transactions.length} 条交易记录`);

      for (const tx of transactions) {
        const stmt = sqliteDb.prepare(`INSERT INTO transactions (id, sim_id, phone_number, amount, type, description, previous_balance, new_balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.bind([tx.id, tx.sim_id, tx.phone_number, tx.amount, tx.type, tx.description, tx.previous_balance, tx.new_balance, toSqliteValue(tx.created_at)]);
        stmt.step();
        stmt.free();
      }
      console.log(`成功迁移 ${transactions.length} 条交易记录\n`);
    } catch (error) {
      console.log('交易记录表不存在，跳过\n');
    }

    // 最终验证
    console.log('=== 最终验证 ===');
    const finalSim = sqliteDb.exec('SELECT COUNT(*) as c FROM sim_cards');
    const finalCarrier = sqliteDb.exec('SELECT COUNT(*) as c FROM carriers');
    const finalSetting = sqliteDb.exec('SELECT COUNT(*) as c FROM settings');
    console.log(`SIM 卡: ${finalSim[0].values[0][0]}`);
    console.log(`运营商: ${finalCarrier[0].values[0][0]}`);
    console.log(`设置: ${finalSetting[0].values[0][0]}`);

    // 保存到文件
    console.log('\n正在保存数据库文件...');
    const data = sqliteDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    console.log(`数据库已保存到: ${DB_PATH}`);
    console.log(`文件大小: ${buffer.length} 字节`);

    // 从文件重新加载验证
    console.log('\n从文件重新加载验证...');
    const buffer2 = fs.readFileSync(DB_PATH);
    const db2 = new SQL.Database(buffer2);
    const verifyFromFile = db2.exec('SELECT COUNT(*) as c FROM sim_cards');
    console.log(`文件中 SIM 卡数量: ${verifyFromFile[0].values[0][0]}`);
    db2.close();

    console.log('\n=== 迁移完成 ===');

  } catch (error) {
    console.error('\n迁移失败:', error);
  } finally {
    if (mysqlConnection) await mysqlConnection.end();
    if (sqliteDb) sqliteDb.close();
  }
}

migrateData();