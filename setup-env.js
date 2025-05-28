/**
 * 生成.env文件的脚本
 * 运行方式: node setup-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 环境变量模板
const envTemplate = `# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=simnotice_db
DB_PORT=3306

# 服务器配置
PORT=5000

# 邮件配置（阿里云邮箱）
EMAIL_HOST=smtp.mxhichina.com
EMAIL_PORT=465
EMAIL_USER=your_email@aliyun.com
EMAIL_PASS=your_email_password
EMAIL_FROM=your_email@aliyun.com

# 接收通知的邮箱
RECIPIENT_EMAIL=your_email@example.com

# 通知配置
BALANCE_THRESHOLD=10  # 余额低于此值时发送提醒（单位：元）
`;

// 环境变量文件路径
const envPath = path.join(__dirname, '.env');

// 检查.env文件是否存在
if (fs.existsSync(envPath)) {
  rl.question('检测到.env文件已存在，是否要覆盖它？(y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      createEnvFile();
    } else {
      console.log('操作已取消，保留现有.env文件。');
      rl.close();
    }
  });
} else {
  createEnvFile();
}

// 创建.env文件
function createEnvFile() {
  console.log('创建.env文件...');
  
  fs.writeFile(envPath, envTemplate, (err) => {
    if (err) {
      console.error('创建.env文件失败:', err);
      rl.close();
      return;
    }
    
    console.log('.env文件已创建成功！');
    console.log('请编辑.env文件，填写您的数据库和邮箱配置信息。');
    console.log('文件路径:', envPath);
    
    rl.close();
  });
}

rl.on('close', () => {
  process.exit(0);
}); 