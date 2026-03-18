const { query, execute } = require('../config/db');

class Setting {
  /**
   * 获取所有设置
   */
  static async getAll() {
    try {
      const rows = await query(`SELECT * FROM settings ORDER BY id ASC`);
      return rows;
    } catch (error) {
      console.error('获取设置列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取单个设置
   */
  static async getByKey(key) {
    try {
      const rows = await query(`SELECT * FROM settings WHERE setting_key = ?`, [key]);
      return rows[0];
    } catch (error) {
      console.error(`获取键为${key}的设置失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取多个设置值
   */
  static async getMultiple(keys) {
    try {
      const placeholders = keys.map(() => '?').join(',');
      const rows = await query(
        `SELECT setting_key, setting_value FROM settings WHERE setting_key IN (${placeholders})`,
        keys
      );

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
   */
  static async update(key, value) {
    try {
      const result = await execute(
        `UPDATE settings SET setting_value = ?, updated_at = datetime('now', 'localtime') WHERE setting_key = ?`,
        [value, key]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`更新键为${key}的设置失败:`, error.message);
      throw error;
    }
  }

  /**
   * 批量更新设置
   */
  static async batchUpdate(settings) {
    try {
      for (const [key, value] of Object.entries(settings)) {
        await execute(
          `UPDATE settings SET setting_value = ?, updated_at = datetime('now', 'localtime') WHERE setting_key = ?`,
          [String(value), key]
        );
      }
      return true;
    } catch (error) {
      console.error('批量更新设置失败:', error.message);
      throw error;
    }
  }
}

module.exports = Setting;