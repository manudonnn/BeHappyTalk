require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only';
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// ─── Helper: upsert inbox entry ───────────────────────────────────────────────
function upsertInbox(userId, providerId, message, providerStatus) {
  const id = `inbox_${userId}_${providerId}`;
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  db.run(
    `INSERT INTO inbox (id, userId, providerId, date, type, status, message, icon, iconColor, isSystem)
     VALUES (?, ?, ?, ?, 'chat', ?, ?, 'message-text', '#34D399', 0)
     ON CONFLICT(id) DO UPDATE SET message = excluded.message, date = excluded.date, status = excluded.status`,
    [id, userId, providerId, today, providerStatus || 'online', message]
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}

// ─── REST Endpoints ───────────────────────────────────────────────────────────

// Register
app.post('/api/register', async (req, res) => {
  const { phone, password, name } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });

  db.get('SELECT * FROM users WHERE phone = ?', [phone], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Phone already registered.' });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newId = 'u' + Date.now();
      
      db.run(
        'INSERT INTO users (id, name, phone, password) VALUES (?, ?, ?, ?)',
        [newId, name || 'Anonymous', phone, hashedPassword],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });

          // Seed welcome system inbox message for new user
          const sysId = `sys_${newId}`;
          db.run(
            `INSERT OR IGNORE INTO inbox (id, userId, providerId, date, type, status, message, icon, iconColor, isSystem)
             VALUES (?, ?, null, ?, 'system', 'online', 'Welcome to BeHappyTalk! 🌟 Start chatting now.', 'emoticon-happy', '#FACC15', 1)`,
            [sysId, newId, new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })]
          );

          const token = jwt.sign({ id: newId, phone }, JWT_SECRET, { expiresIn: '30d' });
          res.json({ id: newId, name: name || 'Anonymous', phone, token });
        }
      );
    } catch (hashError) {
      res.status(500).json({ error: 'Error hashing password' });
    }
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });

  db.get('SELECT * FROM users WHERE phone = ?', [phone], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No account found with this number.' });
    
    const validPassword = await bcrypt.compare(password, row.password);
    if (!validPassword) return res.status(401).json({ error: 'Incorrect password.' });
    
    const token = jwt.sign({ id: row.id, phone: row.phone }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ id: row.id, name: row.name, phone: row.phone, token });
  });
});

// Provider Login
app.post('/api/provider/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });

  db.get('SELECT * FROM providers WHERE phone = ?', [phone], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No provider found with this number.' });
    
    const validPassword = await bcrypt.compare(password, row.password);
    if (!validPassword) return res.status(401).json({ error: 'Incorrect password.' });
    
    const token = jwt.sign({ id: row.id, phone: row.phone, role: 'provider' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ id: row.id, name: row.name, phone: row.phone, token });
  });
});

// Get single provider
app.get('/api/provider/:providerId', (req, res) => {
  db.get('SELECT * FROM providers WHERE id = ?', [req.params.providerId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Provider not found.' });
    // Remove password before sending
    const { password, ...safeData } = row;
    res.json(safeData);
  });
});

// Get single user
app.get('/api/user/:userId', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found.' });
    res.json(row);
  });
});

// Get all providers
app.get('/api/providers', (req, res) => {
  db.all('SELECT * FROM providers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get inbox for user
app.get('/api/inbox/:userId', (req, res) => {
  const query = `
    SELECT inbox.*, providers.name as providerName, providers.status as providerStatus
    FROM inbox
    LEFT JOIN providers ON inbox.providerId = providers.id
    WHERE inbox.userId = ?
    ORDER BY inbox.date DESC
  `;
  db.all(query, [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const mapped = rows.map(r => ({
      id: r.id,
      name: r.isSystem ? 'BeHappyTalk' : r.providerName,
      date: r.date,
      type: r.type,
      status: r.providerStatus || r.status,
      message: r.message,
      icon: r.icon,
      iconColor: r.iconColor,
      isSystem: Boolean(r.isSystem),
      providerId: r.providerId,
    }));
    res.json(mapped);
  });
});

// Get provider session history
app.get('/api/provider/history/:providerId', (req, res) => {
  const query = `
    SELECT sessions.*, users.name as userName
    FROM sessions
    JOIN users ON sessions.userId = users.id
    WHERE sessions.providerId = ? AND sessions.status = 'completed'
    ORDER BY sessions.startTime DESC
  `;
  db.all(query, [req.params.providerId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get recent contacts
app.get('/api/recents/:userId', (req, res) => {
  const query = `
    SELECT DISTINCT providers.id, providers.name, providers.status
    FROM messages
    JOIN providers ON messages.providerId = providers.id
    WHERE messages.userId = ?
    ORDER BY messages.timestamp DESC
    LIMIT 10
  `;
  db.all(query, [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get inbox for provider (list of users who chatted with this provider)
app.get('/api/provider/inbox/:providerId', (req, res) => {
  const query = `
    SELECT DISTINCT users.id, users.name
    FROM messages
    JOIN users ON messages.userId = users.id
    WHERE messages.providerId = ?
    ORDER BY messages.timestamp DESC
    LIMIT 20
  `;
  db.all(query, [req.params.providerId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get chat history
app.get('/api/chat/:userId/:providerId', (req, res) => {
  const { userId, providerId } = req.params;
  db.all(
    'SELECT * FROM messages WHERE userId = ? AND providerId = ? ORDER BY timestamp ASC',
    [userId, providerId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ─── Billing Internals ────────────────────────────────────────────────────────
const activeBillingTimers = {};

function stopBillingInterval(sessionId) {
  if (activeBillingTimers[sessionId]) {
    clearInterval(activeBillingTimers[sessionId]);
    delete activeBillingTimers[sessionId];
    db.run('UPDATE sessions SET status = ? WHERE id = ?', ['completed', sessionId]);
  }
}

function startBillingInterval(sessionId, userId, providerId, rate, room, passedDuration) {
  if (activeBillingTimers[sessionId]) return;
  
  const duration = Number(passedDuration) || 5; // Default to 5 if undefined or cached client
  let minutesPassed = 0;
  
  const deduct = () => {
     if (minutesPassed >= duration) {
        stopBillingInterval(sessionId);
        io.to(room).emit('session_ended', { sessionId, reason: 'duration_ended' });
        io.to(`user_room_${userId}`).emit('session_ended', { sessionId, reason: 'duration_ended' });
        return;
     }

        db.get('SELECT walletBalance FROM users WHERE id = ?', [userId], (err, row) => {
           if (!row) return stopBillingInterval(sessionId);
           let userBalance = row.walletBalance;
           
           if (userBalance < rate) {
              stopBillingInterval(sessionId);
              io.to(room).emit('session_ended', { sessionId, reason: 'insufficient_funds' });
              io.to(`user_room_${userId}`).emit('session_ended', { sessionId, reason: 'insufficient_funds' });
              return;
           }

           const newUserBalance = userBalance - rate;

           // Deduct from User, Add to Provider
           db.run('UPDATE users SET walletBalance = ? WHERE id = ?', [newUserBalance, userId]);
           db.run('UPDATE providers SET walletBalance = walletBalance + ? WHERE id = ?', [rate, providerId]);
           db.run('UPDATE sessions SET duration = duration + 1, cost = cost + ? WHERE id = ?', [rate, sessionId]);
           
           minutesPassed++;
           
           io.to(`user_room_${userId}`).emit('wallet_update', { walletBalance: newUserBalance });
           io.to(`provider_room_${providerId}`).emit('wallet_update', { walletBalance: 'FETCH_NEEDED' }); // Trigger UI refresh
           io.to(room).emit('wallet_update', { walletBalance: newUserBalance });
        });
  };

  // Charge first minute upfront
  deduct();
  
  // Charge subsequent minutes
  activeBillingTimers[sessionId] = setInterval(deduct, 60000);
}

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('user_online', ({ userId }) => {
    socket.join(`user_room_${userId}`);
    console.log(`[Socket] User ${userId} joined their room.`);
  });

  socket.on('provider_online', ({ providerId }) => {
    socket.join(`provider_room_${providerId}`);
    console.log(`[Socket] Provider ${providerId} joined their room.`);
  });

  socket.on('request_interaction', ({ userId, providerId, type, rate, userName, duration }) => {
    console.log(`[Socket] Interaction Request from ${userId} to ${providerId} (Type: ${type}, Rate: ${rate}, Mins: ${duration})`);
    // Notify provider on dashboard
    io.to(`provider_room_${providerId}`).emit('incoming_request', { userId, userName, providerId, type, rate, duration });
  });

  socket.on('cancel_interaction', ({ providerId }) => {
    console.log(`[Socket] Interaction cancelled for provider ${providerId}`);
    io.to(`provider_room_${providerId}`).emit('request_cancelled');
  });

  socket.on('accept_interaction', ({ userId, providerId, type, rate, duration }) => {
    console.log(`[Socket] Interaction Accepted by ${providerId} for ${userId} (Duration: ${duration})`);
    const sessionId = `sess_${Date.now()}`;
    db.run(
      'INSERT INTO sessions (id, userId, providerId, type, rate, status) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, userId, providerId, type, rate, 'active'],
      function(err) {
        if (err) return console.error(err);
        
        const room = `chat_${userId}_${providerId}`;
        
        // Notify the user to proceed
        io.to(`user_room_${userId}`).emit('session_accepted', { providerId, sessionId, type, rate, duration, room });
        
        // Notify any active chat windows
        io.to(room).emit('session_started', { sessionId, type, rate, duration });

        startBillingInterval(sessionId, userId, providerId, rate, room, duration);
      }
    );
  });

  socket.on('reject_interaction', ({ userId, providerId }) => {
    io.to(`user_room_${userId}`).emit('session_rejected', { providerId });
  });

  socket.on('end_interaction', ({ sessionId }) => {
    stopBillingInterval(sessionId);
    db.get('SELECT userId, providerId FROM sessions WHERE id = ?', [sessionId], (err, row) => {
      if (!err && row) {
        const room = `chat_${row.userId}_${row.providerId}`;
        io.to(room).emit('session_ended', { sessionId, reason: 'user_ended' });
        io.to(`user_room_${row.userId}`).emit('session_ended', { sessionId, reason: 'user_ended' });
      }
    });
  });

  socket.on('join_chat', ({ userId, providerId }) => {
    const room = `chat_${userId}_${providerId}`;
    socket.join(room);
    console.log(`Joined room: ${room}`);
  });

  socket.on('send_message', ({ userId, providerId, senderId, text }) => {
    // SECURITY: Only allow messaging if an active session exists
    db.get(
      'SELECT id FROM sessions WHERE userId = ? AND providerId = ? AND status = ?',
      [userId, providerId, 'active'],
      (err, session) => {
        if (err || !session) {
          console.log(`[Chat] Blocked message from ${senderId}: No active session found.`);
          socket.emit('session_ended', { reason: 'access_denied' });
          return;
        }

        const room = `chat_${userId}_${providerId}`;

        // Save message
        db.run(
          'INSERT INTO messages (userId, providerId, senderId, text) VALUES (?, ?, ?, ?)',
          [userId, providerId, senderId, text],
          function (err) {
            if (err) { console.error('Error saving message:', err); return; }

            const msg = {
              id: this.lastID,
              userId, providerId, senderId, text,
              timestamp: new Date().toISOString(),
            };
            console.log(`[Chat] Message from ${senderId} to room ${room}: "${text.substring(0, 20)}..."`);
            io.to(room).emit('receive_message', msg);
            
            // Update user's inbox to show latest message preview
            upsertInbox(userId, providerId, text, 'online');
          }
        );
      }
    );
  });

  socket.on('webrtc_signal', ({ to, signal }) => {
    // Relay WebRTC SDP or ICE candidates to the target room
    // 'to' should be the target room name, e.g., 'chat_u1_p1'
    console.log(`[WebRTC] Relay signal from ${socket.id} to ${to}: ${signal.type}`);
    socket.to(to).emit('webrtc_signal', { from: socket.id, signal });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅  BeHappyTalk server running on http://localhost:${PORT}`);
});

// ─── Keep-Alive Ping (Render Free Tier) ──────────────────────────────────────
// Pings itself every 14 minutes to prevent Render from sleeping the service.
if (process.env.NODE_ENV === 'production') {
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_URL) {
    setInterval(() => {
      const https = require('https');
      https.get(RENDER_URL, (res) => {
        console.log(`[KeepAlive] Ping OK: ${res.statusCode}`);
      }).on('error', (err) => {
        console.log(`[KeepAlive] Ping failed: ${err.message}`);
      });
    }, 14 * 60 * 1000); // every 14 minutes
    console.log(`[KeepAlive] Self-ping active for ${RENDER_URL}`);
  }
}