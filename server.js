// server.js
const express = require('express');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const SECRET = 'replace_this_secret';
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SQLite
const db = new sqlite3.Database('./chat.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    nickname TEXT,
    bio TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT,
    to_user TEXT,
    content TEXT,
    time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS moments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    content TEXT,
    time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// 注册
app.post('/api/register', async (req, res) => {
  const { username, password, nickname } = req.body;
  if (!username || !password) return res.status(400).json({ error: '缺参数' });
  const hash = await bcrypt.hash(password, 10);
  db.run(
    'INSERT INTO users (username,password,nickname,bio) VALUES (?,?,?,?)',
    [username, hash, nickname || username, ''],
    err => {
      if (err) return res.status(400).json({ error: '用户已存在' });
      res.json({ msg: '注册成功' });
    }
  );
});

// 登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username=?', [username], async (err, user) => {
    if (!user) return res.status(401).json({ error: '用户不存在' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: '密码错误' });
    const token = jwt.sign({ username }, SECRET, { expiresIn: '7d' });
    res.json({ token, username, nickname: user.nickname });
  });
});

// 发动态
app.post('/api/moment', (req, res) => {
  const { token, content } = req.body;
  try {
    const data = jwt.verify(token, SECRET);
    db.run('INSERT INTO moments (username,content) VALUES (?,?)', [data.username, content]);
    res.json({ msg: 'ok' });
  } catch { res.status(401).json({ error: '未登录' }); }
});

// 拉动态
app.get('/api/moments', (req, res) => {
  db.all('SELECT * FROM moments ORDER BY id DESC LIMIT 50', (e, rows) => res.json(rows));
});

// 聊天历史
app.get('/api/history', (req, res) => {
  const { token, user } = req.query;
  let data;
  try { data = jwt.verify(token, SECRET); } catch { return res.status(401).end(); }
  db.all(
    `SELECT * FROM messages 
     WHERE (from_user=? AND to_user=?)
        OR (from_user=? AND to_user=?)
     ORDER BY id ASC`,
    [data.username, user, user, data.username],
    (e, rows) => res.json(rows)
  );
});

// WebSocket
const online = {};
io.on('connection', socket => {
  let user = null;
  socket.on('auth', token => {
    try {
      user = jwt.verify(token, SECRET).username;
      online[user] = socket.id;
    } catch {}
  });

  socket.on('private_msg', ({ token, to, content }) => {
    let from;
    try { from = jwt.verify(token, SECRET).username; } catch { return; }
    db.run('INSERT INTO messages (from_user,to_user,content) VALUES (?,?,?)', [from, to, content]);
    if (online[to]) io.to(online[to]).emit('msg', { from, content });
    socket.emit('msg', { from: 'me', content });
  });
});

server.listen(3000, () => console.log('http://localhost:3000'));