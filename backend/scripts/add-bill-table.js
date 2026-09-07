/**
 * 添加账单记录表脚本
 * 用于在现有数据库中创建 bill_records 表
 */

const { getDb, saveDb } = require('../config/db');

async function addBillRecordsTable() {
  try {
    const db = await getDb();

    console.log('正在创建账单记录表...');

    // 创建账单记录表
    db.run(`
      CREATE TABLE IF NOT EXISTS bill_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sim_id INTEGER NOT NULL,
        phone_number TEXT NOT NULL,
        billing_month TEXT NOT NULL,
        monthly_fee REAL DEFAULT 0.00,
        actual_fee REAL DEFAULT 0.00,
        extra_charges REAL DEFAULT 0.00,
        total_fee REAL DEFAULT 0.00,
        note TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        UNIQUE(sim_id, billing_month)
      )
    `);

    console.log('账单记录表创建成功');

    // 保存数据库
    saveDb();
    console.log('数据库已保存');

  } catch (error) {
    console.error('创建表失败:', error.message);
    throw error;
  }
}

// 执行
addBillRecordsTable();