const socketAuth = require('./middleware/socketAuth');
const Message = require('./models/Message');

module.exports = (io) => {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    console.log(`Connected: ${socket.userType} ${socket.userId}`);
    socket.join(`user_${socket.userId}`);
    if (socket.userType === 'admin') socket.join('admins');

    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    socket.on('send_message', async (data) => {
      try {
        const { conversationId, message } = data;
        if (!message.trim()) return;

        const msg = await Message.findById(conversationId);
        if (!msg) return;

        const senderType = socket.userType;
        const reply = {
          sender: senderType === 'admin' ? 'admin' : 'user',
          message: message.trim(),
          sentAt: new Date(),
          adminId: senderType === 'admin' ? socket.userId : undefined
        };

        msg.replies.push(reply);
        msg.status = senderType === 'admin' ? 'in_progress' : 'open';
        msg.updatedAt = new Date();
        await msg.save();

        const populatedMsg = await Message.findById(conversationId)
          .populate('user', 'fullName email')
          .populate('replies.adminId', 'username');

        io.to(`conv_${conversationId}`).emit('new_message', {
          conversationId,
          reply: populatedMsg.replies[populatedMsg.replies.length - 1],
          message: populatedMsg
        });

        if (senderType !== 'admin') {
          io.to('admins').emit('new_customer_message', {
            conversationId,
            from: socket.user.fullName || socket.user.stageName || 'User',
            preview: message.substring(0, 60),
            timestamp: new Date()
          });
        }

        if (senderType === 'admin') {
          io.to(`user_${msg.user}`).emit('admin_replied', {
            conversationId,
            preview: message.substring(0, 60),
            timestamp: new Date()
          });
        }
      } catch (err) {
        console.error('Socket message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data) => {
      const { conversationId, isTyping } = data;
      socket.to(`conv_${conversationId}`).emit('typing', {
        userId: socket.userId,
        userType: socket.userType,
        isTyping
      });
    });

    socket.on('disconnect', () => {
      console.log(`Disconnected: ${socket.userType} ${socket.userId}`);
    });
  });
};
