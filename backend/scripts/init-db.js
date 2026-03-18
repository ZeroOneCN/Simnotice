const { getDb, saveDb } = require('../config/db');

async function initDatabase() {
  try {
    const db = await getDb();

    console.log('正在创建数据库表...');

    // 创建SIM卡表
    db.run(`
      CREATE TABLE IF NOT EXISTS sim_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);
    console.log('SIM卡表创建成功');

    // 创建运营商表
    db.run(`
      CREATE TABLE IF NOT EXISTS carriers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);
    console.log('运营商表创建成功');

    // 创建设置表
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);
    console.log('设置表创建成功');

    // 创建交易记录表
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sim_id INTEGER NOT NULL,
        phone_number TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('deduct', 'add')),
        description TEXT,
        previous_balance REAL NOT NULL,
        new_balance REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (sim_id) REFERENCES sim_cards(id) ON DELETE CASCADE
      )
    `);
    console.log('交易记录表创建成功');

    // 插入默认数据
    console.log('正在插入默认数据...');

    // 检查运营商是否已存在
    const carriersExist = db.exec("SELECT COUNT(*) FROM carriers");
    if (carriersExist.length === 0 || carriersExist[0].values[0][0] === 0) {
      db.run(`INSERT INTO carriers (name) VALUES ('中国移动')`);
      db.run(`INSERT INTO carriers (name) VALUES ('中国电信')`);
      db.run(`INSERT INTO carriers (name) VALUES ('中国联通')`);
      db.run(`INSERT INTO carriers (name) VALUES ('中国广电')`);
      console.log('默认运营商插入成功');
    }

    // 检查设置是否已存在
    const settingsExist = db.exec("SELECT COUNT(*) FROM settings");
    if (settingsExist.length === 0 || settingsExist[0].values[0][0] === 0) {
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

      const wechatTemplate = `## SIM卡余额提醒
您的SIM卡 {{phone_number}} 需要注意：

> 当前余额：{{balance}} 元
> 月租费用：{{monthly_fee}} 元
> 账单日期：每月 {{billing_day}} 日

请及时充值，以免影响正常使用。`;

      db.run(`INSERT INTO settings (setting_key, setting_value, description) VALUES
        ('notification_type', 'email', '通知方式: email(仅邮件), wechat(仅企业微信), both(两者都启用)'),
        ('email_enabled', 'true', '是否启用邮件通知'),
        ('wechat_enabled', 'false', '是否启用企业微信通知'),
        ('balance_threshold', '10', '余额低于此值时发送提醒（单位：元）'),
        ('notification_days_before', '3', '账单日前几天发送提醒'),
        ('email_subject', 'SIM卡余额不足提醒', '提醒邮件的主题'),
        ('email_template', ?, '邮件内容模板(支持HTML)'),
        ('wechat_webhook_url', '', '企业微信机器人Webhook地址'),
        ('wechat_template', ?, '企业微信消息模板(支持markdown)')`,
        [defaultEmailTemplate, wechatTemplate]
      );
      console.log('默认设置插入成功');
    }

    // 保存数据库
    saveDb();
    console.log('数据库初始化完成');

  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    throw error;
  }
}

// 执行初始化
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };