const express = require('express');
const router = express.Router();
const { query, execute } = require('../config/db');

// 获取所有账单记录
router.get('/', async (req, res) => {
  try {
    const rows = await query(`
      SELECT * FROM bill_records
      ORDER BY billing_month DESC, phone_number ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 导入账单记录
router.post('/import', async (req, res) => {
  try {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: '无效的账单数据' });
    }

    let count = 0;
    for (const record of records) {
      // 根据电话号码查找 SIM 卡 ID
      const simCards = await query(`SELECT id FROM sim_cards WHERE phone_number = ?`, [record.phone_number]);
      
      if (simCards.length === 0) {
        console.warn(`未找到电话号码 ${record.phone_number} 对应的 SIM 卡，跳过`);
        continue;
      }

      const sim_id = simCards[0].id;

      // 检查是否已存在该月的账单
      const existing = await query(
        `SELECT id FROM bill_records WHERE sim_id = ? AND billing_month = ?`,
        [sim_id, record.billing_month]
      );

      if (existing.length > 0) {
        // 更新已有记录
        await execute(`
          UPDATE bill_records
          SET monthly_fee = ?, actual_fee = ?, extra_charges = ?, total_fee = ?, note = ?, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `, [record.monthly_fee, record.actual_fee, record.extra_charges, record.total_fee, record.note || '', existing[0].id]);
      } else {
        // 插入新记录
        await execute(`
          INSERT INTO bill_records (sim_id, phone_number, billing_month, monthly_fee, actual_fee, extra_charges, total_fee, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [sim_id, record.phone_number, record.billing_month, record.monthly_fee, record.actual_fee, record.extra_charges, record.total_fee, record.note || '']);
      }
      
      count++;
    }

    res.json({ count, message: `成功导入 ${count} 条记录` });
  } catch (error) {
    console.error('导入账单失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 删除单条账单记录
router.delete('/:id', async (req, res) => {
  try {
    const result = await execute(`DELETE FROM bill_records WHERE id = ?`, [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '未找到账单记录' });
    }
    
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 批量删除账单记录
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '无效的 ID 列表' });
    }

    const placeholders = ids.map(() => '?').join(',');
    await execute(`DELETE FROM bill_records WHERE id IN (${placeholders})`, ids);
    
    res.json({ message: `成功删除 ${ids.length} 条记录` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取统计数据
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_records,
        SUM(total_fee) as total_paid,
        AVG(total_fee) as avg_fee,
        MIN(billing_month) as first_month,
        MAX(billing_month) as last_month
      FROM bill_records
    `);
    
    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 按号码获取累计扣费
router.get('/stats/by-sim', async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        sim_id,
        phone_number,
        COUNT(*) as bill_count,
        SUM(total_fee) as total_paid,
        AVG(total_fee) as avg_monthly_fee,
        MIN(billing_month) as first_month,
        MAX(billing_month) as last_month
      FROM bill_records
      GROUP BY sim_id, phone_number
      ORDER BY total_paid DESC
    `);
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;