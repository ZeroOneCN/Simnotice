const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 数据库文件路径
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../data/simnotice.db');

// 确保数据目录存在
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db = null;
let SQL = null;

// 初始化 SQL.js
async function initSql() {
  if (SQL) return SQL;
  SQL = await initSqlJs();
  return SQL;
}

// 获取数据库实例
async function getDb() {
  // 如果已经有缓存的实例，直接返回
  if (db) return db;

  const SQL = await initSql();

  // 如果数据库文件存在，加载它
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    // 创建新的数据库
    db = new SQL.Database();
  }

  return db;
}

// 保存数据库到文件
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// 测试数据库连接
async function testConnection() {
  try {
    const database = await getDb();

    // 检查 sim_cards 表是否存在
    const result = database.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sim_cards'"
    );

    if (result.length === 0 || result[0].values.length === 0) {
      console.log('数据库表不存在，需要初始化');
      return false;
    }

    console.log('数据库连接成功且表结构完整！');
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    return false;
  }
}

// 执行查询（返回所有结果）
async function query(sql, params = []) {
  const database = await getDb();

  try {
    const stmt = database.prepare(sql);

    // 绑定参数
    if (params.length > 0) {
      stmt.bind(params);
    }

    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }
    stmt.free();

    return results;
  } catch (error) {
    console.error('查询执行失败:', error.message);
    throw error;
  }
}

// 执行更新/插入/删除操作
async function execute(sql, params = []) {
  const database = await getDb();

  try {
    // 使用 prepare 和 step 来执行
    const stmt = database.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    stmt.step();
    stmt.free();

    // 获取影响的行数（必须在 saveDb 之前，因为 export() 会重置 changes）
    const changesResult = database.exec('SELECT changes() as count');
    const changes = changesResult.length > 0 ? changesResult[0].values[0][0] : 0;

    // 获取最后插入的 ID
    const lastIdResult = database.exec('SELECT last_insert_rowid() as id');
    const insertId = lastIdResult.length > 0 ? lastIdResult[0].values[0][0] : 0;

    saveDb();

    return { insertId, affectedRows: changes };
  } catch (error) {
    console.error('执行操作失败:', error.message);
    throw error;
  }
}

// 关闭数据库连接
function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

// 重新加载数据库（用于迁移后刷新）
async function reloadDb() {
  closeDb();
  return getDb();
}

module.exports = {
  getDb,
  saveDb,
  testConnection,
  query,
  execute,
  closeDb,
  reloadDb,
  DB_PATH
};