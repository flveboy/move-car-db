import { Server } from 'socket.io';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // 加入扫码房间
    socket.on('join_room', (data: { roomId: string }) => {
      socket.join(data.roomId);
      console.log(`Client ${socket.id} joined room: ${data.roomId}`);
      
      // 发送确认消息
      socket.emit('room_joined', {
        roomId: data.roomId,
        message: `成功加入房间: ${data.roomId}`
      });
    });

    // 离开扫码房间
    socket.on('leave_room', (data: { roomId: string }) => {
      socket.leave(data.roomId);
      console.log(`Client ${socket.id} left room: ${data.roomId}`);
    });

    // 推送回复消息到扫码房间
    socket.on('push_reply_message', (data: {
      roomId: string;
      message: string;
      senderName: string;
      senderRole: string;
      timestamp: string;
      recordId: string;
    }) => {
      console.log(`推送回复消息到房间 ${data.roomId}:`, data.message);
      
      // 广播消息到房间内的所有客户端
      io.to(data.roomId).emit('reply_message', {
        id: Date.now().toString(),
        message: data.message,
        senderName: data.senderName,
        senderRole: data.senderRole,
        timestamp: data.timestamp,
        recordId: data.recordId
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Send welcome message
    socket.emit('message', {
      text: '欢迎使用挪车系统WebSocket服务',
      senderId: 'system',
      timestamp: new Date().toISOString(),
    });
  });
};