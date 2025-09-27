#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查环境变量
function checkEnvVars() {
  const requiredVars = ['DATABASE_URL', 'REDIS_URL'];
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    log(`缺少必需的环境变量: ${missingVars.join(', ')}`, 'red');
    log('请设置这些环境变量后再进行部署', 'yellow');
    return false;
  }
  
  return true;
}

// 构建项目
function buildProject() {
  log('开始构建项目...', 'blue');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    log('项目构建成功', 'green');
    return true;
  } catch (error) {
    log('项目构建失败', 'red');
    log(error.message, 'red');
    return false;
  }
}

// 部署到 Vercel
function deployToVercel() {
  log('部署到 Vercel...', 'blue');
  
  try {
    // 检查是否安装了 Vercel CLI
    execSync('vercel --version', { stdio: 'pipe' });
  } catch (error) {
    log('请先安装 Vercel CLI: npm install -g vercel', 'red');
    return false;
  }
  
  try {
    execSync('vercel --prod', { stdio: 'inherit' });
    log('部署到 Vercel 成功', 'green');
    return true;
  } catch (error) {
    log('部署到 Vercel 失败', 'red');
    log(error.message, 'red');
    return false;
  }
}

// 部署到 Netlify
function deployToNetlify() {
  log('部署到 Netlify...', 'blue');
  
  try {
    // 检查是否安装了 Netlify CLI
    execSync('netlify --version', { stdio: 'pipe' });
  } catch (error) {
    log('请先安装 Netlify CLI: npm install -g netlify-cli', 'red');
    return false;
  }
  
  try {
    execSync('netlify deploy --prod', { stdio: 'inherit' });
    log('部署到 Netlify 成功', 'green');
    return true;
  } catch (error) {
    log('部署到 Netlify 失败', 'red');
    log(error.message, 'red');
    return false;
  }
}

// 部署到 Cloudflare
function deployToCloudflare() {
  log('部署到 Cloudflare...', 'blue');
  
  try {
    // 检查是否安装了 Wrangler
    execSync('wrangler --version', { stdio: 'pipe' });
  } catch (error) {
    log('请先安装 Wrangler: npm install -g wrangler', 'red');
    return false;
  }
  
  try {
    execSync('wrangler deploy', { stdio: 'inherit' });
    log('部署到 Cloudflare 成功', 'green');
    return true;
  } catch (error) {
    log('部署到 Cloudflare 失败', 'red');
    log(error.message, 'red');
    return false;
  }
}

// 显示帮助信息
function showHelp() {
  log('扫码挪车系统部署脚本', 'cyan');
  log('');
  log('用法:', 'yellow');
  log('  node deploy.js [platform] [options]', 'reset');
  log('');
  log('平台:', 'yellow');
  log('  vercel    - 部署到 Vercel', 'reset');
  log('  netlify   - 部署到 Netlify', 'reset');
  log('  cloudflare - 部署到 Cloudflare', 'reset');
  log('  all       - 部署到所有平台', 'reset');
  log('');
  log('选项:', 'yellow');
  log('  --help    - 显示帮助信息', 'reset');
  log('  --check   - 仅检查环境变量', 'reset');
  log('  --build   - 仅构建项目', 'reset');
  log('');
  log('环境变量:', 'yellow');
  log('  DATABASE_URL - 数据库连接字符串', 'reset');
  log('  REDIS_URL    - Redis 连接字符串', 'reset');
  log('  NODE_ENV     - 环境设置 (production/development)', 'reset');
  log('');
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const platform = args[0];
  const options = args.slice(1);
  
  // 显示帮助
  if (options.includes('--help') || !platform) {
    showHelp();
    return;
  }
  
  // 检查环境变量
  if (options.includes('--check')) {
    log('检查环境变量...', 'blue');
    if (checkEnvVars()) {
      log('环境变量检查通过', 'green');
    } else {
      log('环境变量检查失败', 'red');
    }
    return;
  }
  
  // 仅构建项目
  if (options.includes('--build')) {
    buildProject();
    return;
  }
  
  // 检查环境变量
  if (!checkEnvVars()) {
    process.exit(1);
  }
  
  // 构建项目
  if (!buildProject()) {
    process.exit(1);
  }
  
  // 部署到指定平台
  switch (platform) {
    case 'vercel':
      deployToVercel();
      break;
    case 'netlify':
      deployToNetlify();
      break;
    case 'cloudflare':
      deployToCloudflare();
      break;
    case 'all':
      log('部署到所有平台...', 'blue');
      deployToVercel();
      deployToNetlify();
      deployToCloudflare();
      break;
    default:
      log(`未知平台: ${platform}`, 'red');
      showHelp();
      break;
  }
}

// 运行主函数
main();