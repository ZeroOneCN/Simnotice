const { pool } = require('../config/db');

class SimCard {
  /**
   * 获取所有SIM卡
   * @returns {Promise<Array>} - SIM卡列表
   */
  static async getAll() {
    try {
      const [rows] = await pool.query(`
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
   * @param {number} id - SIM卡ID
   * @returns {Promise<Object>} - SIM卡信息
   */
  static async getById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM sim_cards WHERE id = ?
      `, [id]);
      return rows[0];
    } catch (error) {
      console.error(`获取ID为${id}的SIM卡失败:`, error.message);
      throw error;
    }
  }

  /**
   * 创建SIM卡
   * @param {Object} simData - SIM卡数据
   * @returns {Promise<Object>} - 创建结果
   */
  static async create(simData) {
    try {
      const { 
        phone_number, balance, carrier, monthly_fee, billing_day, 
        data_plan, call_minutes, sms_count, location, activation_date 
      } = simData;

      const [result] = await pool.query(`
        INSERT INTO sim_cards 
        (phone_number, balance, carrier, monthly_fee, billing_day, data_plan, call_minutes, sms_count, location, activation_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        phone_number, balance, carrier, monthly_fee, billing_day, 
        data_plan, call_minutes, sms_count, location, activation_date
      ]);

      return { id: result.insertId, ...simData };
    } catch (error) {
      console.error('创建SIM卡失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新SIM卡
   * @param {number} id - SIM卡ID
   * @param {Object} simData - 更新数据
   * @returns {Promise<boolean>} - 更新结果
   */
  static async update(id, simData) {
    try {
      const { 
        phone_number, balance, carrier, monthly_fee, billing_day, 
        data_plan, call_minutes, sms_count, location, activation_date 
      } = simData;

      const [result] = await pool.query(`
        UPDATE sim_cards 
        SET phone_number = ?, balance = ?, carrier = ?, monthly_fee = ?, billing_day = ?,
            data_plan = ?, call_minutes = ?, sms_count = ?, location = ?, activation_date = ?
        WHERE id = ?
      `, [
        phone_number, balance, carrier, monthly_fee, billing_day, 
        data_plan, call_minutes, sms_count, location, activation_date, id
      ]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`更新ID为${id}的SIM卡失败:`, error.message);
      throw error;
    }
  }

  /**
   * 更新余额
   * @param {number} id - SIM卡ID
   * @param {number} balance - 新余额
   * @returns {Promise<boolean>} - 更新结果
   */
  static async updateBalance(id, balance) {
    try {
      const [result] = await pool.query(`
        UPDATE sim_cards SET balance = ? WHERE id = ?
      `, [balance, id]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`更新ID为${id}的SIM卡余额失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除SIM卡
   * @param {number} id - SIM卡ID
   * @returns {Promise<boolean>} - 删除结果
   */
  static async delete(id) {
    try {
      const [result] = await pool.query(`
        DELETE FROM sim_cards WHERE id = ?
      `, [id]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`删除ID为${id}的SIM卡失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取余额低于阈值的SIM卡
   * @param {number} threshold - 阈值
   * @returns {Promise<Array>} - SIM卡列表
   */
  static async getLowBalance(threshold) {
    try {
      const [rows] = await pool.query(`
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
   * 获取当天需要扣费的SIM卡（今天是月结日的卡）
   * @returns {Promise<Array>} - SIM卡列表
   */
  static async getCardsForBilling() {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM sim_cards 
        WHERE billing_day = DAY(CURDATE())
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
   * @param {number} id - SIM卡ID
   * @param {number} monthlyFee - 月租费用
   * @param {number} currentBalance - 当前余额
   * @returns {Promise<{success: boolean, newBalance: number, error: string|null}>} - 扣费结果
   */
  static async deductMonthlyFee(id, monthlyFee, currentBalance) {
    try {
      // 计算扣除月租后的余额
      const newBalance = parseFloat((currentBalance - monthlyFee).toFixed(2));
      
      // 更新余额
      const [result] = await pool.query(`
        UPDATE sim_cards SET balance = ? WHERE id = ?
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
   * @param {Object} transactionData - 交易数据
   * @returns {Promise<Object>} - 创建结果
   */
  static async recordTransaction(transactionData) {
    try {
      const { 
        sim_id, phone_number, amount, type, description, 
        previous_balance, new_balance
      } = transactionData;

      // 检查交易记录表是否存在，不存在则创建
      await pool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sim_id INT NOT NULL,
          phone_number VARCHAR(20) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          type ENUM('deduct', 'add') NOT NULL,
          description TEXT,
          previous_balance DECIMAL(10,2) NOT NULL,
          new_balance DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sim_id) REFERENCES sim_cards(id) ON DELETE CASCADE
        )
      `);

      const [result] = await pool.query(`
        INSERT INTO transactions 
        (sim_id, phone_number, amount, type, description, previous_balance, new_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        sim_id, phone_number, amount, type, description, 
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