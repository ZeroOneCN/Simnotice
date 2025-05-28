const express = require('express');
const router = express.Router();
const SimCard = require('../models/SimCard');
const Carrier = require('../models/Carrier');
const { pool } = require('../config/db');

// 获取所有SIM卡
router.get('/', async (req, res) => {
  try {
    const simCards = await SimCard.getAll();
    res.json(simCards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取单个SIM卡
router.get('/:id', async (req, res) => {
  try {
    const simCard = await SimCard.getById(req.params.id);
    if (!simCard) {
      return res.status(404).json({ message: '未找到SIM卡' });
    }
    res.json(simCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 创建SIM卡
router.post('/', async (req, res) => {
  try {
    const simCard = await SimCard.create(req.body);
    res.status(201).json(simCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 更新SIM卡
router.put('/:id', async (req, res) => {
  try {
    const updated = await SimCard.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: '未找到SIM卡' });
    }
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 更新余额
router.patch('/:id/balance', async (req, res) => {
  try {
    const { balance } = req.body;
    if (balance === undefined) {
      return res.status(400).json({ message: '余额不能为空' });
    }
    
    const updated = await SimCard.updateBalance(req.params.id, balance);
    if (!updated) {
      return res.status(404).json({ message: '未找到SIM卡' });
    }
    res.json({ message: '余额更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 充值余额
router.post('/:id/recharge', async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (amount === undefined || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: '充值金额必须大于0' });
    }

    // 获取SIM卡当前信息
    const simCard = await SimCard.getById(req.params.id);
    if (!simCard) {
      return res.status(404).json({ message: '未找到SIM卡' });
    }

    // 计算新余额
    const previousBalance = parseFloat(simCard.balance);
    const newBalance = parseFloat((previousBalance + parseFloat(amount)).toFixed(2));

    // 更新余额
    const updated = await SimCard.updateBalance(req.params.id, newBalance);
    if (!updated) {
      return res.status(500).json({ message: '余额更新失败' });
    }

    // 记录交易
    await SimCard.recordTransaction({
      sim_id: simCard.id,
      phone_number: simCard.phone_number,
      amount: parseFloat(amount),
      type: 'add',
      description: description || '手动充值',
      previous_balance: previousBalance,
      new_balance: newBalance
    });

    res.json({ 
      message: '充值成功', 
      sim_id: simCard.id,
      phone_number: simCard.phone_number,
      previous_balance: previousBalance,
      amount: parseFloat(amount),
      new_balance: newBalance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取交易记录
router.get('/:id/transactions', async (req, res) => {
  try {
    // 检查SIM卡是否存在
    const simCard = await SimCard.getById(req.params.id);
    if (!simCard) {
      return res.status(404).json({ message: '未找到SIM卡' });
    }

    // 查询交易记录
    const [rows] = await pool.query(`
      SELECT * FROM transactions 
      WHERE sim_id = ? 
      ORDER BY created_at DESC
    `, [req.params.id]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 删除SIM卡
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await SimCard.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: '未找到SIM卡' });
    }
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取所有运营商
router.get('/carriers/all', async (req, res) => {
  try {
    const carriers = await Carrier.getAll();
    res.json(carriers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 创建运营商
router.post('/carriers', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: '运营商名称不能为空' });
    }
    
    const carrier = await Carrier.create(name);
    res.status(201).json(carrier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 更新运营商
router.put('/carriers/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: '运营商名称不能为空' });
    }
    
    const updated = await Carrier.update(req.params.id, name);
    if (!updated) {
      return res.status(404).json({ message: '未找到运营商' });
    }
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 删除运营商
router.delete('/carriers/:id', async (req, res) => {
  try {
    const deleted = await Carrier.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: '未找到运营商' });
    }
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 