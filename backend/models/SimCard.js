const { query, execute } = require('../config/db');

class SimCard {
  /**
   * 获取所有SIM卡
   */
  static async getAll() {
    try {
      const rows = await query(`
        SELECT * FROM sim_cards
        ORDER BY
          CASE WHEN activation_date IS NULL THEN 1 ELSE 0 END,
          activation_date ASC,
          id DESC
      `);
      return rows;
    } catch (error) {
      console.error('获取SIM卡列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取单个SIM卡
   */
  static async getById(id) {
    try {
      const rows = await query(`SELECT * FROM sim_cards WHERE id = ?`, [id]);
      return rows[0];
    } catch (error) {
      console.error(`获取ID为${id}的SIM卡失败:`, error.message);
      throw error;
    }
  }

  /**
   * 创建SIM卡
   */
  static async create(simData) {
    try {
      const {
        phone_number, balance, carrier, monthly_fee, billing_day,
        data_plan, call_minutes, sms_count, location, activation_date
      } = simData;

      const result = await execute(`
        INSERT INTO sim_cards
        (phone_number, balance, carrier, monthly_fee, billing_day, data_plan, call_minutes, sms_count, location, activation_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        phone_number, balance, carrier, monthly_fee, billing_day,
        data_plan || null, call_minutes || null, sms_count || null, location || null, activation_date || null
      ]);

      return { id: result.insertId, ...simData };
    } catch (error) {
      console.error('创建SIM卡失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新SIM卡
   */
  static async update(id, simData) {
    try {
      const {
        phone_number, balance, carrier, monthly_fee, billing_day,
        data_plan, call_minutes, sms_count, location, activation_date
      } = simData;

      const result = await execute(`
        UPDATE sim_cards
        SET phone_number = ?, balance = ?, carrier = ?, monthly_fee = ?, billing_day = ?,
            data_plan = ?, call_minutes = ?, sms_count = ?, location = ?, activation_date = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `, [
        phone_number, balance, carrier, monthly_fee, billing_day,
        data_plan || null, call_minutes || null, sms_count || null, location || null, activation_date || null, id
      ]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`更新ID为${id}的SIM卡失败:`, error.message);
      throw error;
    }
  }

  /**
   * 更新余额
   */
  static async updateBalance(id, balance) {
    try {
      const result = await execute(`
        UPDATE sim_cards SET balance = ?, updated_at = datetime('now', 'localtime') WHERE id = ?
      `, [balance, id]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`更新ID为${id}的SIM卡余额失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除SIM卡
   */
  static async delete(id) {
    try {
      const result = await execute(`DELETE FROM sim_cards WHERE id = ?`, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`删除ID为${id}的SIM卡失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取余额低于阈值的SIM卡
   */
  static async getLowBalance(threshold) {
    try {
      const rows = await query(`
        SELECT * FROM sim_cards
        WHERE balance < monthly_fee OR balance < ?
        ORDER BY balance ASC
      `, [threshold]);
      return rows;
    } catch (error) {
      console.error('获取余额不足的SIM卡失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取当天需要扣费的SIM卡
   */
  static async getCardsForBilling() {
    try {
      const rows = await query(`
        SELECT * FROM sim_cards
        WHERE billing_day = CAST(strftime('%d', 'now', 'localtime') AS INTEGER)
        ORDER BY carrier, phone_number
      `);
      return rows;
    } catch (error) {
      console.error('获取需要扣费的SIM卡失败:', error.message);
      throw error;
    }
  }

  /**
   * 自动扣除月租费
   */
  static async deductMonthlyFee(id, monthlyFee, currentBalance) {
    try {
      const newBalance = parseFloat((currentBalance - monthlyFee).toFixed(2));

      const result = await execute(`
        UPDATE sim_cards SET balance = ?, updated_at = datetime('now', 'localtime') WHERE id = ?
      `, [newBalance, id]);

      if (result.affectedRows > 0) {
        return { success: true, newBalance, error: null };
      } else {
        return { success: false, newBalance: currentBalance, error: '未找到SIM卡' };
      }
    } catch (error) {
      console.error(`扣除ID为${id}的SIM卡月租失败:`, error.message);
      return { success: false, newBalance: currentBalance, error: error.message };
    }
  }

  /**
   * 记录交易历史
   */
  static async recordTransaction(transactionData) {
    try {
      const {
        sim_id, phone_number, amount, type, description,
        previous_balance, new_balance
      } = transactionData;

      const result = await execute(`
        INSERT INTO transactions
        (sim_id, phone_number, amount, type, description, previous_balance, new_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        sim_id, phone_number, amount, type, description || null,
        previous_balance, new_balance
      ]);

      return { id: result.insertId, ...transactionData };
    } catch (error) {
      console.error('记录交易失败:', error.message);
      throw error;
    }
  }
}

module.exports = SimCard;