const { pool } = require('../config/db');

class Carrier {
  /**
   * 获取所有运营商
   * @returns {Promise<Array>} - 运营商列表
   */
  static async getAll() {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM carriers ORDER BY name ASC
      `);
      return rows;
    } catch (error) {
      console.error('获取运营商列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取单个运营商
   * @param {number} id - 运营商ID
   * @returns {Promise<Object>} - 运营商信息
   */
  static async getById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM carriers WHERE id = ?
      `, [id]);
      return rows[0];
    } catch (error) {
      console.error(`获取ID为${id}的运营商失败:`, error.message);
      throw error;
    }
  }

  /**
   * 创建运营商
   * @param {string} name - 运营商名称
   * @returns {Promise<Object>} - 创建结果
   */
  static async create(name) {
    try {
      const [result] = await pool.query(`
        INSERT INTO carriers (name) VALUES (?)
      `, [name]);

      return { id: result.insertId, name };
    } catch (error) {
      console.error('创建运营商失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新运营商
   * @param {number} id - 运营商ID
   * @param {string} name - 新名称
   * @returns {Promise<boolean>} - 更新结果
   */
  static async update(id, name) {
    try {
      const [result] = await pool.query(`
        UPDATE carriers SET name = ? WHERE id = ?
      `, [name, id]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`更新ID为${id}的运营商失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除运营商
   * @param {number} id - 运营商ID
   * @returns {Promise<boolean>} - 删除结果
   */
  static async delete(id) {
    try {
      // 检查是否有SIM卡使用此运营商
      const [simCards] = await pool.query(`
        SELECT COUNT(*) as count FROM sim_cards WHERE carrier = (SELECT name FROM carriers WHERE id = ?)
      `, [id]);

      if (simCards[0].count > 0) {
        throw new Error('此运营商正在被使用，无法删除');
      }

      const [result] = await pool.query(`
        DELETE FROM carriers WHERE id = ?
      `, [id]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`删除ID为${id}的运营商失败:`, error.message);
      throw error;
    }
  }
}

module.exports = Carrier; 