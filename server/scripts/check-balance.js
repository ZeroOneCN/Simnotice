/**
 * 检查SIM卡余额并发送提醒
 * 可以通过cron任务定期执行此脚本
 */

const path = require('path');
const dotenv = require('dotenv');
const SimCard = require('../models/SimCard');
const Setting = require('../models/Setting');
const { sendBalanceLowNotification, sendWeChatNotification } = require('../config/mailer');
const { testConnection } = require('../config/db');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkBalance() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('数据库连接失败，无法执行余额检查');
      process.exit(1);
    }

    // 获取设置
    const settings = await Setting.getMultiple([
      'notification_type',
      'email_enabled',
      'wechat_enabled',
      'balance_threshold',
      'notification_days_before',
      'email_subject',
      'email_template',
      'wechat_webhook_url',
      'wechat_template'
    ]);

    // 确定通知方式
    const notificationType = settings.notification_type || 'email';
    const emailEnabled = settings.email_enabled === 'true' || notificationType === 'both' || notificationType === 'email';
    const wechatEnabled = settings.wechat_enabled === 'true' || notificationType === 'both' || notificationType === 'wechat';

    if (!emailEnabled && !wechatEnabled) {
      console.log('所有通知方式均已禁用，跳过余额检查');
      process.exit(0);
    }

    // 获取余额低的SIM卡
    const threshold = parseFloat(settings.balance_threshold) || parseFloat(process.env.BALANCE_THRESHOLD) || 10;
    const lowBalanceSims = await SimCard.getLowBalance(threshold);

    if (lowBalanceSims.length === 0) {
      console.log('没有余额不足的SIM卡');
      process.exit(0);
    }

    console.log(`找到 ${lowBalanceSims.length} 张余额不足的SIM卡`);

    // 获取收件人邮箱
    let recipientEmail = process.env.RECIPIENT_EMAIL;
    if (emailEnabled && !recipientEmail) {
      console.warn('未配置收件人邮箱，无法发送邮件通知');
    }

    // 获取企业微信Webhook
    const webhookUrl = settings.wechat_webhook_url;
    if (wechatEnabled && !webhookUrl) {
      console.warn('未配置企业微信Webhook，无法发送企业微信通知');
    }

    // 发送提醒
    for (const sim of lowBalanceSims) {
      try {
        // 发送邮件通知
        if (emailEnabled && recipientEmail) {
          const emailResult = await sendBalanceLowNotification(
            sim,
            recipientEmail,
            settings.email_template,
            settings.email_subject
          );

          if (emailResult.success) {
            console.log(`成功发送邮件提醒: ${sim.phone_number}`);
          } else {
            console.error(`发送邮件提醒失败: ${sim.phone_number}`, emailResult.error);
          }
        }

        // 发送企业微信通知
        if (wechatEnabled && webhookUrl) {
          const wechatResult = await sendWeChatNotification(
            sim,
            webhookUrl,
            settings.wechat_template
          );

          if (wechatResult.success) {
            console.log(`成功发送企业微信提醒: ${sim.phone_number}`);
          } else {
            console.error(`发送企业微信提醒失败: ${sim.phone_number}`, wechatResult.error);
          }
        }
      } catch (error) {
        console.error(`处理SIM卡 ${sim.phone_number} 时出错:`, error.message);
      }
    }

    console.log('余额检查完成');
    process.exit(0);
  } catch (error) {
    console.error('余额检查失败:', error.message);
    process.exit(1);
  }
}

// 执行检查
checkBalance();