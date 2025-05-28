const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { sendBalanceLowNotification, testMailer, sendTestWeChatNotification } = require('../config/mailer');

// 获取所有设置
router.get('/', async (req, res) => {
  try {
    const settings = await Setting.getAll();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取单个设置
router.get('/:key', async (req, res) => {
  try {
    const setting = await Setting.getByKey(req.params.key);
    if (!setting) {
      return res.status(404).json({ message: '未找到设置' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 更新设置
router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ message: '设置值不能为空' });
    }
    
    const updated = await Setting.update(req.params.key, value);
    if (!updated) {
      return res.status(404).json({ message: '未找到设置' });
    }
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 批量更新设置
router.post('/batch', async (req, res) => {
  try {
    const settings = req.body;
    if (!settings || Object.keys(settings).length === 0) {
      return res.status(400).json({ message: '设置不能为空' });
    }
    
    await Setting.batchUpdate(settings);
    res.json({ message: '批量更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 测试邮件服务
router.post('/test-email', async (req, res) => {
  try {
    const { recipient } = req.body;
    if (!recipient) {
      return res.status(400).json({ message: '收件人邮箱不能为空' });
    }
    
    // 获取邮件设置
    const emailSettings = await Setting.getMultiple([
      'email_subject',
      'email_template'
    ]);
    
    // 测试数据
    const testData = {
      phone_number: '13800138000',
      balance: 9.99,
      monthly_fee: 19.99,
      billing_day: 10
    };
    
    const result = await sendBalanceLowNotification(
      testData,
      recipient,
      emailSettings.email_template || '测试邮件',
      emailSettings.email_subject || '测试邮件'
    );
    
    if (result.success) {
      res.json({ message: '邮件发送成功', messageId: result.messageId });
    } else {
      res.status(500).json({ message: '邮件发送失败', error: result.error });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 测试企业微信通知
router.post('/test-wechat', async (req, res) => {
  try {
    // 获取企业微信设置
    const wechatSettings = await Setting.getMultiple([
      'wechat_webhook_url',
      'wechat_template'
    ]);
    
    if (!wechatSettings.wechat_webhook_url) {
      return res.status(400).json({ message: '企业微信Webhook地址未设置' });
    }
    
    const result = await sendTestWeChatNotification(
      wechatSettings.wechat_webhook_url,
      wechatSettings.wechat_template
    );
    
    if (result.success) {
      res.json({ message: '企业微信通知发送成功' });
    } else {
      res.status(500).json({ message: '企业微信通知发送失败', error: result.error });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 测试邮件服务器连接
router.get('/test-email-connection', async (req, res) => {
  try {
    const connected = await testMailer();
    if (connected) {
      res.json({ message: '邮件服务器连接成功' });
    } else {
      res.status(500).json({ message: '邮件服务器连接失败' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 