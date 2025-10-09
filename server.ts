// server.ts - Next.js Standalone + Socket.IO - Updated for database fix
import { setupSocket } from '@/lib/socket';
import { initializeSystem } from '@/lib/init-admin';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const currentPort = 3000;
const hostname = '0.0.0.0';

// Custom server with Socket.IO integration
async function createCustomServer() {
  try {
    // 系统初始化 - 自动创建管理员账户和系统配置
    await initializeSystem();

    // Create Next.js app
    const nextApp = next({ 
      dev,
      dir: process.cwd(),
      // In production, use the current directory where .next is located
      conf: dev ? undefined : { distDir: './.next' }
    });

    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    // Create HTTP server that will handle both Next.js and Socket.IO
    const server = createServer((req, res) => {
      // Skip socket.io requests from Next.js handler
      if (req.url?.startsWith('/api/socketio')) {
        return;
      }
      handle(req, res);
    });

    // Setup Socket.IO
    const io = new Server(server, {
      path: '/api/socketio',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // 将Socket.IO实例设置为全局变量，以便API路由可以访问
    (global as any).io = io;

    setupSocket(io);

    // Start the server
    server.listen(currentPort, hostname, () => {
      console.log(`\n🚀 服务器启动成功:`);
      console.log(`   📡 HTTP服务: http://${hostname}:${currentPort}`);
      console.log(`   🔌 WebSocket: ws://${hostname}:${currentPort}/api/socketio`);
      console.log(`   🌍 环境: ${dev ? '开发环境' : '生产环境'}`);
      console.log(`\n💡 管理员登录信息:`);
      console.log(`   用户名: admin`);
      console.log(`   密码: admin123`);
      console.log(`   请立即登录并修改密码！\n`);
    });

  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

// Start the server
createCustomServer();
