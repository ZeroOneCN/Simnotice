const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 创建邮件传输器
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 465,
  secure: true, // 使用SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * 发送邮件函数
 * @param {string} to - 收件人邮箱
 * @param {string} subject - 邮件主题
 * @param {string} html - 邮件内容（HTML格式）
 * @returns {Promise} - 发送结果
 */
async function sendMail(to, subject, html) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('邮件发送成功:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('邮件发送失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 替换模板中的变量
 * @param {string} template - 模板字符串
 * @param {object} data - 替换数据
 * @returns {string} - 替换后的字符串
 */
function replaceTemplateVariables(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  }
  
  // 处理条件表达式，如 {{balance < 20 ? 'red' : 'green'}}
  const conditionalRegex = /{{(.*?)\?(.*?):(.*?)}}/g;
  result = result.replace(conditionalRegex, (match, condition, trueValue, falseValue) => {
    try {
      // 替换条件中的变量
      for (const [key, value] of Object.entries(data)) {
        const varRegex = new RegExp(`${key}`, 'g');
        condition = condition.replace(varRegex, value);
      }
      // 执行条件表达式
      return eval(condition) ? trueValue.trim() : falseValue.trim();
    } catch (e) {
      console.error('条件表达式解析错误:', e);
      return '';
    }
  });
  
  return result;
}

/**
 * 获取默认HTML邮件模板
 * @returns {string} HTML模板
 */
function getDefaultEmailTemplate() {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;">
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
</div>
  `;
}

/**
 * 发送SIM卡余额不足提醒邮件
 * @param {object} simCard - SIM卡信息
 * @param {string} to - 收件人邮箱
 * @param {string} template - 邮件模板
 * @param {string} subject - 邮件主题
 * @returns {Promise} - 发送结果
 */
async function sendBalanceLowNotification(simCard, to, template, subject) {
  if (!template || template.trim() === '') {
    template = getDefaultEmailTemplate();
  }
  
  // 替换模板中的变量
  const htmlContent = replaceTemplateVariables(template, simCard);
  
  return await sendMail(to, subject, htmlContent);
}

/**
 * 发送企业微信通知
 * @param {object} simCard - SIM卡信息
 * @param {string} webhookUrl - 企业微信机器人Webhook地址
 * @param {string} template - 消息模板
 * @returns {Promise} - 发送结果
 */
async function sendWeChatNotification(simCard, webhookUrl, template) {
  try {
    if (!webhookUrl) {
      throw new Error('企业微信Webhook地址未设置');
    }
    
    if (!template || template.trim() === '') {
      template = `SIM卡 {{phone_number}} 余额提醒：
- 当前余额：{{balance}}元
- 月租费用：{{monthly_fee}}元
- 账单日期：每月{{billing_day}}日`;
    }
    
    // 替换模板变量
    const content = replaceTemplateVariables(template, simCard);
    
    // 发送markdown消息到企业微信
    const response = await axios.post(webhookUrl, {
      msgtype: 'markdown',
      markdown: {
        content
      }
    });
    
    if (response.data && response.data.errcode === 0) {
      console.log('企业微信通知发送成功');
      return { success: true };
    } else {
      console.error('企业微信通知发送失败:', response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.error('企业微信通知发送错误:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 发送测试企业微信通知
 * @param {string} webhookUrl - 企业微信机器人Webhook地址
 * @param {string} template - 消息模板
 * @returns {Promise} - 发送结果
 */
async function sendTestWeChatNotification(webhookUrl, template) {
  // 测试数据
  const testData = {
    phone_number: '13800138000',
    balance: 9.99,
    monthly_fee: 19.99,
    billing_day: 10
  };
  
  return await sendWeChatNotification(testData, webhookUrl, template);
}

// 测试邮件连接
async function testMailer() {
  try {
    await transporter.verify();
    console.log('邮件服务器连接成功');
    return true;
  } catch (error) {
    console.error('邮件服务器连接失败:', error.message);
    return false;
  }
}

module.exports = {
  sendMail,
  sendBalanceLowNotification,
  sendWeChatNotification,
  sendTestWeChatNotification,
  testMailer,
  getDefaultEmailTemplate
}; 