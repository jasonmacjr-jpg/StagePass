const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const TokenService = {
  getToken: () => localStorage.getItem('sp_token'),
  getAdminToken: () => localStorage.getItem('sp_admin_token'),
  getArtistToken: () => localStorage.getItem('sp_artist_token'),
  setToken: (t) => localStorage.setItem('sp_token', t),
  setAdminToken: (t) => localStorage.setItem('sp_admin_token', t),
  setArtistToken: (t) => localStorage.setItem('sp_artist_token', t),
  clear: () => {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_admin_token');
    localStorage.removeItem('sp_artist_token');
    localStorage.removeItem('sp_user');
    localStorage.removeItem('sp_artist');
  },
  getUser: () => { const u = localStorage.getItem('sp_user'); return u ? JSON.parse(u) : null; },
  setUser: (u) => localStorage.setItem('sp_user', JSON.stringify(u)),
  getArtist: () => { const a = localStorage.getItem('sp_artist'); return a ? JSON.parse(a) : null; },
  setArtist: (a) => localStorage.setItem('sp_artist', JSON.stringify(a))
};

async function api(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = options.useAdmin ? TokenService.getAdminToken() : options.useArtist ? TokenService.getArtistToken() : TokenService.getToken();
  if (token) {
    if (options.useAdmin) headers['x-admin-token'] = token;
    else headers['Authorization'] = `Bearer ${token}`;
  }
  const config = { ...options, headers };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) config.body = JSON.stringify(options.body);
  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

const AuthAPI = {
  register: (data) => api('/auth/register', { method: 'POST', body: data }),
  login: (data) => api('/auth/login', { method: 'POST', body: data }),
  me: () => api('/auth/me', { method: 'GET' }),
  artistRegister: (data) => api('/artists/register', { method: 'POST', body: data }),
  artistLogin: (data) => api('/artists/login', { method: 'POST', body: data }),
  artistMe: () => api('/artists/me/profile', { method: 'GET', useArtist: true }),
  adminLogin: (data) => api('/admin/login', { method: 'POST', body: data }),
  adminDashboard: () => api('/admin/dashboard', { method: 'GET', useAdmin: true }),
  adminUsers: () => api('/admin/users', { method: 'GET', useAdmin: true }),
  adminOrders: () => api('/admin/orders', { method: 'GET', useAdmin: true }),
  adminUpdateOrder: (id, data) => api(`/admin/orders/${id}`, { method: 'PUT', body: data, useAdmin: true })
};

const EventAPI = {
  list: (params = '') => api(`/events${params}`, { method: 'GET' }),
  get: (id) => api(`/events/${id}`, { method: 'GET' })
};

const ArtistAPI = {
  list: (params = '') => api(`/artists${params}`, { method: 'GET' }),
  get: (id) => api(`/artists/${id}`, { method: 'GET' })
};

const OrderAPI = {
  create: (data) => api('/orders', { method: 'POST', body: data }),
  myOrders: () => api('/orders/my-orders', { method: 'GET' })
};

const MessageAPI = {
  send: (data) => api('/messages', { method: 'POST', body: data }),
  myMessages: () => api('/messages/my-messages', { method: 'GET' }),
  reply: (id, message) => api(`/messages/${id}/reply`, { method: 'POST', body: { message } }),
  allMessages: () => api('/messages/admin/all', { method: 'GET', useAdmin: true }),
  adminReply: (id, message) => api(`/messages/admin/${id}/reply`, { method: 'POST', body: { message }, useAdmin: true })
};

async function uploadFile(file, type = 'payment') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  const token = TokenService.getToken() || TokenService.getArtistToken();
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Upload failed'); }
  return res.json();
}

function isLoggedIn() { return !!TokenService.getToken() || !!TokenService.getArtistToken(); }
function isAdmin() { return !!TokenService.getAdminToken(); }
function logoutAll() { TokenService.clear(); window.location.reload(); }

window.TokenService = TokenService;
window.api = api;
window.AuthAPI = AuthAPI;
window.EventAPI = EventAPI;
window.ArtistAPI = ArtistAPI;
window.OrderAPI = OrderAPI;
window.MessageAPI = MessageAPI;
window.uploadFile = uploadFile;
window.isLoggedIn = isLoggedIn;
window.isAdmin = isAdmin;
window.logoutAll = logoutAll;
