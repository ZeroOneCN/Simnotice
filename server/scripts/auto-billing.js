/**
 * 自动扣费脚本
 * 检查当天是否有SIM卡到月结日，并自动扣除月租费
 * 可以通过cron任务每天执行此脚本
 */

const path = require('path');
const dotenv = require('dotenv');
const SimCard = require('../models/SimCard');
const Setting = require('../models/Setting');
const { testConnection } = require('../config/db');
const { sendBalanceLowNotification, sendWeChatNotification } = require('../config/mailer');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function autoBilling() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('数据库连接失败，无法执行自动扣费');
      process.exit(1);
    }

    console.log('开始执行自动扣费任务...');
    
    // 获取今天需要扣费的SIM卡
    const cardsForBilling = await SimCard.getCardsForBilling();
    
    if (cardsForBilling.length === 0) {
      console.log('今天没有需要扣费的SIM卡');
      process.exit(0);
    }
    
    console.log(`找到 ${cardsForBilling.length} 张需要扣费的SIM卡`);

    // 获取设置，用于后续可能的通知
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

    // 处理每张需要扣费的卡
    const deductionResults = {
      success: 0,
      failed: 0,
      notEnoughBalance: 0
    };

    for (const card of cardsForBilling) {
      try {
        console.log(`处理SIM卡: ${card.phone_number}, 月租: ${card.monthly_fee}元, 当前余额: ${card.balance}元`);
        
        // 检查余额是否足够
        if (card.balance < card.monthly_fee) {
          console.log(`SIM卡 ${card.phone_number} 余额不足，无法扣除月租`);
          deductionResults.notEnoughBalance++;
          
          // 记录交易失败
          await SimCard.recordTransaction({
            sim_id: card.id,
            phone_number: card.phone_number,
            amount: card.monthly_fee,
            type: 'deduct',
            description: `自动扣费失败：余额不足 (月租: ${card.monthly_fee}元, 余额: ${card.balance}元)`,
            previous_balance: card.balance,
            new_balance: card.balance
          });
          
          // 如果余额不足，发送通知
          if (emailEnabled && recipientEmail) {
            await sendBalanceLowNotification(
              card,
              recipientEmail,
              settings.email_template,
              '月租扣费失败：余额不足'
            );
          }
          
          if (wechatEnabled && webhookUrl) {
            await sendWeChatNotification(
              card,
              webhookUrl,
              settings.wechat_template
            );
          }
          
          continue;
        }
        
        // 执行扣费
        const result = await SimCard.deductMonthlyFee(card.id, card.monthly_fee, card.balance);
        
        if (result.success) {
          console.log(`SIM卡 ${card.phone_number} 成功扣除月租 ${card.monthly_fee}元，剩余余额: ${result.newBalance}元`);
          deductionResults.success++;
          
          // 记录成功交易
          await SimCard.recordTransaction({
            sim_id: card.id,
            phone_number: card.phone_number,
            amount: card.monthly_fee,
            type: 'deduct',
            description: `自动扣除月租费`,
            previous_balance: card.balance,
            new_balance: result.newBalance
          });
          
          // 如果扣费后余额低于阈值，发送通知
          const threshold = parseFloat(settings.balance_threshold) || 10;
          if (result.newBalance < threshold) {
            if (emailEnabled && recipientEmail) {
              await sendBalanceLowNotification(
                { ...card, balance: result.newBalance },
                recipientEmail,
                settings.email_template,
                settings.email_subject
              );
            }
            
            if (wechatEnabled && webhookUrl) {
              await sendWeChatNotification(
                { ...card, balance: result.newBalance },
                webhookUrl,
                settings.wechat_template
              );
            }
          }
        } else {
          console.error(`SIM卡 ${card.phone_number} 扣费失败:`, result.error);
          deductionResults.failed++;
          
          // 记录失败交易
          await SimCard.recordTransaction({
            sim_id: card.id,
            phone_number: card.phone_number,
            amount: card.monthly_fee,
            type: 'deduct',
            description: `自动扣费失败：${result.error}`,
            previous_balance: card.balance,
            new_balance: card.balance
          });
        }
      } catch (error) {
        console.error(`处理SIM卡 ${card.phone_number} 时出错:`, error.message);
        deductionResults.failed++;
      }
    }
    
    // 打印结果统计
    console.log('\n自动扣费任务完成，结果统计:');
    console.log(`- 成功: ${deductionResults.success} 张卡`);
    console.log(`- 余额不足: ${deductionResults.notEnoughBalance} 张卡`);
    console.log(`- 失败: ${deductionResults.failed} 张卡`);
    
    process.exit(0);
  } catch (error) {
    console.error('自动扣费任务失败:', error.message);
    process.exit(1);
  }
}

// 执行自动扣费
autoBilling(); 