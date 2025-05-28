const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkTemplates() {
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

    console.log('正在查询邮件模板...');
    const [emailResult] = await connection.query('SELECT setting_value FROM settings WHERE setting_key = "email_template"');
    
    if (emailResult.length > 0) {
      console.log('\n===== 邮件模板内容 =====');
      console.log(emailResult[0].setting_value);
    } else {
      console.log('未找到邮件模板');
    }
    
    console.log('\n正在查询企业微信模板...');
    const [wechatResult] = await connection.query('SELECT setting_value FROM settings WHERE setting_key = "wechat_template"');
    
    if (wechatResult.length > 0) {
      console.log('\n===== 企业微信模板内容 =====');
      console.log(wechatResult[0].setting_value);
    } else {
      console.log('未找到企业微信模板');
    }

  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTemplates(); 