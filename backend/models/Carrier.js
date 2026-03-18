const { query, execute } = require('../config/db');

class Carrier {
  /**
   * 获取所有运营商
   */
  static async getAll() {
    try {
      const rows = await query(`SELECT * FROM carriers ORDER BY name ASC`);
      return rows;
    } catch (error) {
      console.error('获取运营商列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取单个运营商
   */
  static async getById(id) {
    try {
      const rows = await query(`SELECT * FROM carriers WHERE id = ?`, [id]);
      return rows[0];
    } catch (error) {
      console.error(`获取ID为${id}的运营商失败:`, error.message);
      throw error;
    }
  }

  /**
   * 创建运营商
   */
  static async create(name) {
    try {
      const result = await execute(`INSERT INTO carriers (name) VALUES (?)`, [name]);
      return { id: result.insertId, name };
    } catch (error) {
      console.error('创建运营商失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新运营商
   */
  static async update(id, name) {
    try {
      const result = await execute(
        `UPDATE carriers SET name = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
        [name, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`更新ID为${id}的运营商失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除运营商
   */
  static async delete(id) {
    try {
      // 获取运营商名称
      const carrier = await this.getById(id);
      if (!carrier) {
        throw new Error('运营商不存在');
      }

      // 检查是否有SIM卡使用此运营商
      const simCards = await query(
        `SELECT COUNT(*) as count FROM sim_cards WHERE carrier = ?`,
        [carrier.name]
      );

      if (simCards[0] && simCards[0]['COUNT(*)'] > 0) {
        throw new Error('此运营商正在被使用，无法删除');
      }

      const result = await execute(`DELETE FROM carriers WHERE id = ?`, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`删除ID为${id}的运营商失败:`, error.message);
      throw error;
    }
  }
}

module.exports = Carrier;