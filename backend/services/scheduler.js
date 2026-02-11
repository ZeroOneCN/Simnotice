/**
 * 定时任务调度服务
 * 集成余额检查和自动扣费功能到服务器启动中
 */

const cron = require('node-cron');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

class SchedulerService {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }

  /**
   * 初始化定时任务
   */
  init() {
    if (this.isRunning) {
      console.log('定时任务服务已经在运行中');
      return;
    }

    console.log('正在初始化定时任务服务...');

    // 每天上午8点执行余额检查
    this.scheduleBalanceCheck();
    
    // 每天凌晨1点执行自动扣费
    this.scheduleAutoBilling();

    // 可选：在启动时立即执行一次，用于验证或联调
    const runOnStart = (process.env.SCHEDULER_RUN_ON_START || '').toLowerCase();
    if (runOnStart && runOnStart !== 'none') {
      setTimeout(async () => {
        console.log('检测到 SCHEDULER_RUN_ON_START:', runOnStart);
        try {
          if (['balance', 'both', 'all'].includes(runOnStart)) {
            await this.runBalanceCheckNow();
          }
          if (['billing', 'both', 'all'].includes(runOnStart)) {
            await this.runAutoBillingNow();
          }
        } catch (err) {
          console.error('启动即跑任务失败:', err.message);
        }
      }, 1000);
    }

    this.isRunning = true;
    console.log('定时任务服务初始化完成');
  }

  /**
   * 安排余额检查任务
   */
  scheduleBalanceCheck() {
    const task = cron.schedule('0 8 * * *', async () => {
      console.log('\n=== 开始执行定时余额检查 ===');
      console.log('执行时间:', new Date().toLocaleString('zh-CN'));
      
      try {
        // 动态导入以避免启动时的循环依赖
        const { checkBalance } = require('../scripts/check-balance');
        await checkBalance();
        console.log('=== 定时余额检查完成 ===\n');
      } catch (error) {
        console.error('定时余额检查失败:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    this.tasks.push(task);
    console.log('余额检查任务已安排: 每天上午8:00');
  }

  /**
   * 安排自动扣费任务
   */
  scheduleAutoBilling() {
    const task = cron.schedule('0 1 * * *', async () => {
      console.log('\n=== 开始执行定时自动扣费 ===');
      console.log('执行时间:', new Date().toLocaleString('zh-CN'));
      
      try {
        // 动态导入以避免启动时的循环依赖
        const { autoBilling } = require('../scripts/auto-billing');
        await autoBilling();
        console.log('=== 定时自动扣费完成 ===\n');
      } catch (error) {
        console.error('定时自动扣费失败:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    this.tasks.push(task);
    console.log('自动扣费任务已安排: 每天凌晨1:00');
  }

  /**
   * 手动执行余额检查（用于测试）
   */
  async runBalanceCheckNow() {
    console.log('\n=== 手动执行余额检查 ===');
    try {
      const { checkBalance } = require('../scripts/check-balance');
      await checkBalance();
      console.log('=== 手动余额检查完成 ===\n');
    } catch (error) {
      console.error('手动余额检查失败:', error.message);
      throw error;
    }
  }

  /**
   * 手动执行自动扣费（用于测试）
   */
  async runAutoBillingNow() {
    console.log('\n=== 手动执行自动扣费 ===');
    try {
      const { autoBilling } = require('../scripts/auto-billing');
      await autoBilling();
      console.log('=== 手动自动扣费完成 ===\n');
    } catch (error) {
      console.error('手动自动扣费失败:', error.message);
      throw error;
    }
  }

  /**
   * 停止所有定时任务
   */
  stop() {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    this.isRunning = false;
    console.log('定时任务服务已停止');
  }

  /**
   * 获取任务状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      taskCount: this.tasks.length,
      tasks: this.tasks.map((task, index) => ({
        id: index,
        expression: task.options.rule,
        nextExecution: task.nextDate()
      }))
    };
  }
}

// 创建单例实例
const scheduler = new SchedulerService();

module.exports = scheduler;
