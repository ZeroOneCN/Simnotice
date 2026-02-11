const { pool } = require('../config/db');

class Setting {
  /**
   * 获取所有设置
   * @returns {Promise<Array>} - 设置列表
   */
  static async getAll() {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM settings ORDER BY id ASC
      `);
      return rows;
    } catch (error) {
      console.error('获取设置列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取单个设置
   * @param {string} key - 设置键
   * @returns {Promise<Object>} - 设置信息
   */
  static async getByKey(key) {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM settings WHERE setting_key = ?
      `, [key]);
      return rows[0];
    } catch (error) {
      console.error(`获取键为${key}的设置失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取多个设置值
   * @param {Array<string>} keys - 设置键数组
   * @returns {Promise<Object>} - 设置值映射对象
   */
  static async getMultiple(keys) {
    try {
      const [rows] = await pool.query(`
        SELECT setting_key, setting_value FROM settings 
        WHERE setting_key IN (?)
      `, [keys]);
      
      // 转换为对象形式 { key: value }
      const result = {};
      for (const row of rows) {
        result[row.setting_key] = row.setting_value;
      }
      
      return result;
    } catch (error) {
      console.error('获取多个设置失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新设置
   * @param {string} key - 设置键
   * @param {string} value - 设置值
   * @returns {Promise<boolean>} - 更新结果
   */
  static async update(key, value) {
    try {
      const [result] = await pool.query(`
        UPDATE settings SET setting_value = ? WHERE setting_key = ?
      `, [value, key]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`更新键为${key}的设置失败:`, error.message);
      throw error;
    }
  }

  /**
   * 批量更新设置
   * @param {Object} settings - 设置键值对
   * @returns {Promise<boolean>} - 更新结果
   */
  static async batchUpdate(settings) {
    try {
      // 开始事务
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        for (const [key, value] of Object.entries(settings)) {
          await connection.query(`
            UPDATE settings SET setting_value = ? WHERE setting_key = ?
          `, [value, key]);
        }

        // 提交事务
        await connection.commit();
        connection.release();
        return true;
      } catch (error) {
        // 回滚事务
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('批量更新设置失败:', error.message);
      throw error;
    }
  }
}

module.exports = Setting; 