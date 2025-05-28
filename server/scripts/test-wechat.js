/**
 * 测试企业微信通知
 * 使用方法: node scripts/test-wechat.js [webhook地址]
 */

const { sendTestWeChatNotification } = require('../config/mailer');
const Setting = require('../models/Setting');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 从命令行参数获取webhook地址
const webhookUrl = process.argv[2];

async function testWechat() {
  try {
    let webhook = webhookUrl;
    let template;

    // 如果没有提供webhook地址，从数据库获取
    if (!webhook) {
      console.log('未提供webhook地址，尝试从数据库获取...');
      const settings = await Setting.getMultiple(['wechat_webhook_url', 'wechat_template']);
      webhook = settings.wechat_webhook_url;
      template = settings.wechat_template;
      
      if (!webhook) {
        console.error('错误: 未配置企业微信Webhook地址，请在设置中配置或作为参数提供');
        process.exit(1);
      }
    } else {
      console.log(`使用命令行提供的webhook地址: ${webhook}`);
      const settings = await Setting.getMultiple(['wechat_template']);
      template = settings.wechat_template;
    }

    console.log('正在发送测试消息...');
    const result = await sendTestWeChatNotification(webhook, template);
    
    if (result.success) {
      console.log('✅ 企业微信测试消息发送成功!');
    } else {
      console.error('❌ 企业微信测试消息发送失败:', result.error);
    }
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

testWechat(); 