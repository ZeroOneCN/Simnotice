const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkSettings() {
  let connection;

  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'simnotice_db'
    });

    console.log('正在查询设置表...');
    const [rows] = await connection.query('SELECT setting_key, description FROM settings');
    
    console.log('设置表内容:');
    console.table(rows);
    
    console.log(`\n共找到 ${rows.length} 个设置项`);

  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkSettings(); 