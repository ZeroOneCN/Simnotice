const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'simnotice_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库连接
async function testConnection() {
  let connection;
  try {
    // 首先测试基本连接
    const testConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });
    await testConnection.end();
    
    // 然后测试数据库和表是否存在
    connection = await pool.getConnection();
    
    // 检查数据库是否存在
    const [dbResult] = await connection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [process.env.DB_NAME || 'simnotice_db']
    );
    
    if (dbResult.length === 0) {
      console.log('数据库不存在，需要初始化');
      connection.release();
      return false;
    }
    
    // 检查sim_cards表是否存在
    const [tableResult] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sim_cards'`,
      [process.env.DB_NAME || 'simnotice_db']
    );
    
    if (tableResult.length === 0) {
      console.log('数据库表不存在，需要初始化');
      connection.release();
      return false;
    }
    
    console.log('数据库连接成功且表结构完整！');
    connection.release();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    if (connection) {
      connection.release();
    }
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
