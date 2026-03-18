const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { testConnection } = require('./config/db');
const scheduler = require('./services/scheduler');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 初始化 Express 应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 路由
app.use('/api/sim', require('./routes/sim'));
app.use('/api/settings', require('./routes/settings'));

// 生产环境下的静态文件服务
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'frontend', 'dist', 'index.html'));
  });
}

// 环境变量
const PORT = process.env.PORT || 9501;

// 启动服务器并初始化数据库
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.log('数据库连接失败，尝试初始化数据库...');
      // 执行数据库初始化
      const { initDatabase } = require('./scripts/init-db');
      await initDatabase();
      console.log('数据库初始化完成');
    }

    // 启动定时任务服务
    scheduler.init();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n服务器运行在端口 ${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('服务器出错！');
});