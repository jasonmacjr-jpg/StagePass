class StagePassSocket {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) return;
    const token = TokenService.getToken();
    const artistToken = TokenService.getArtistToken();
    const adminToken = TokenService.getAdminToken();
    const auth = {};
    if (adminToken) auth.adminToken = adminToken;
    else if (artistToken) auth.token = artistToken;
    else if (token) auth.token = token;
    if (!auth.token && !auth.adminToken) return;

    this.socket = io(SOCKET_URL, { auth, transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000 });

    this.socket.on('connect', () => { this.connected = true; this.emit('connected'); });
    this.socket.on('disconnect', () => { this.connected = false; this.emit('disconnected'); });

    this.socket.on('new_message', (data) => this.emit('new_message', data));
    this.socket.on('new_customer_message', (data) => { this.emit('new_customer_message', data); if (typeof showToast === 'function') showToast(`New message from ${data.from}`, 'info'); });
    this.socket.on('admin_replied', (data) => { this.emit('admin_replied', data); if (typeof showToast === 'function') showToast('Support replied!', 'info'); });
    this.socket.on('typing', (data) => this.emit('typing', data));
    this.socket.on('error', (data) => this.emit('error', data));
  }

  disconnect() { if (this.socket) { this.socket.disconnect(); this.socket = null; this.connected = false; } }
  joinConversation(id) { if (this.connected) this.socket.emit('join_conversation', id); }
  leaveConversation(id) { if (this.connected) this.socket.emit('leave_conversation', id); }
  sendMessage(id, msg) { if (!this.connected) return false; this.socket.emit('send_message', { conversationId: id, message: msg }); return true; }
  sendTyping(id, typing = true) { if (this.connected) this.socket.emit('typing', { conversationId: id, isTyping: typing }); }
  on(event, cb) { if (!this.listeners.has(event)) this.listeners.set(event, []); this.listeners.get(event).push(cb); }
  emit(event, data) { if (!this.listeners.has(event)) return; this.listeners.get(event).forEach(cb => { try { cb(data); } catch (e) {} }); }
}

const spSocket = new StagePassSocket();
document.addEventListener('DOMContentLoaded', () => { if (isLoggedIn() || isAdmin()) spSocket.connect(); });
window.spSocket = spSocket;
