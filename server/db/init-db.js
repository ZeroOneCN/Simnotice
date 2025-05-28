const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function initDatabase() {
  let connection;

  try {
    // 创建与MySQL服务器的连接（不指定数据库）
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    const dbName = process.env.DB_NAME || 'simnotice_db';

    // 创建数据库（如果不存在）
    console.log(`正在创建数据库 ${dbName}...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`数据库 ${dbName} 创建成功或已存在`);

    // 切换到新创建的数据库
    await connection.query(`USE ${dbName}`);

    // 创建SIM卡表
    console.log('正在创建SIM卡表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sim_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL UNIQUE,
        balance DECIMAL(10,2) DEFAULT 0.00,
        carrier VARCHAR(50) NOT NULL,
        monthly_fee DECIMAL(10,2) DEFAULT 0.00,
        billing_day INT NOT NULL,
        data_plan VARCHAR(100),
        call_minutes VARCHAR(100),
        sms_count VARCHAR(100),
        location VARCHAR(50),
        activation_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('SIM卡表创建成功');

    // 检查是否需要添加location列
    try {
      const [columns] = await connection.query(`SHOW COLUMNS FROM sim_cards LIKE 'location'`);
      if (columns.length === 0) {
        console.log('正在添加归属地字段...');
        await connection.query(`ALTER TABLE sim_cards ADD COLUMN location VARCHAR(50) AFTER sms_count`);
        console.log('归属地字段添加成功');
      }
    } catch (error) {
      console.error('检查或添加归属地字段失败:', error.message);
    }

    // 创建运营商表
    console.log('正在创建运营商表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS carriers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('运营商表创建成功');

    // 创建设置表
    console.log('正在创建设置表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(50) NOT NULL UNIQUE,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('设置表创建成功');

    // 插入默认数据
    console.log('正在插入默认数据...');
    
    // 插入默认运营商
    await connection.query(`
      INSERT IGNORE INTO carriers (name) VALUES 
      ('中国移动'),
      ('中国电信'),
      ('中国联通'),
      ('中国广电')
    `);

    // 默认HTML邮件模板
    const defaultEmailTemplate = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #1890ff;">SIM卡提醒通知</h2>
  </div>
  <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
    <p>尊敬的用户：</p>
    <p>您的SIM卡 <strong>{{phone_number}}</strong> 当前状态如下：</p>
    <ul>
      <li>当前余额：<span style="color: {{balance < 20 ? 'red' : 'green'}};">{{balance}} 元</span></li>
      <li>月租费用：{{monthly_fee}} 元</li>
      <li>账单日期：每月 {{billing_day}} 日</li>
    </ul>
    <p>请注意及时充值，避免影响正常使用。</p>
  </div>
  <div style="text-align: center; font-size: 12px; color: #999;">
    <p>此邮件由系统自动发送，请勿回复</p>
  </div>
</div>`;

    // 重置数据库并清空设置表
    await connection.query(`DELETE FROM settings`);
    console.log('清空设置表');

    // 插入基本设置
    console.log('插入基本设置...');
    await connection.query(`
      INSERT INTO settings (setting_key, setting_value, description) VALUES 
      ('notification_type', 'email', '通知方式: email(仅邮件), wechat(仅企业微信), both(两者都启用)'),
      ('email_enabled', 'true', '是否启用邮件通知'),
      ('wechat_enabled', 'false', '是否启用企业微信通知'),
      ('balance_threshold', '10', '余额低于此值时发送提醒（单位：元）'),
      ('notification_days_before', '3', '账单日前几天发送提醒'),
      ('email_subject', 'SIM卡余额不足提醒', '提醒邮件的主题')
    `);

    // 插入邮件模板
    console.log('插入邮件模板...');
    await connection.query(`
      INSERT INTO settings (setting_key, setting_value, description) 
      VALUES ('email_template', ?, '邮件内容模板(支持HTML)')
    `, [defaultEmailTemplate]);

    // 插入企业微信设置
    console.log('插入企业微信设置...');
    await connection.query(`
      INSERT INTO settings (setting_key, setting_value, description) VALUES 
      ('wechat_webhook_url', '', '企业微信机器人Webhook地址')
    `);

    // 插入企业微信模板
    const wechatTemplate = `## SIM卡余额提醒
您的SIM卡 <font color="info">{{phone_number}}</font> 需要注意：

> 当前余额：<font color="{{balance < 20 ? 'warning' : 'info'}}">{{balance}} 元</font>
> 月租费用：{{monthly_fee}} 元
> 账单日期：每月 {{billing_day}} 日

请及时充值，以免影响正常使用。`;

    console.log('插入企业微信模板...');
    await connection.query(`
      INSERT INTO settings (setting_key, setting_value, description) 
      VALUES ('wechat_template', ?, '企业微信消息模板(支持markdown)')
    `, [wechatTemplate]);

    console.log('默认数据插入成功');
    console.log('数据库初始化完成');

  } catch (error) {
    console.error('数据库初始化失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行初始化
initDatabase(); 