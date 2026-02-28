import express from 'express';
import { createServer as createViteServer } from 'vite';
import db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post('/api/auth/login', (req, res) => {
    const { contact, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE contact = ? AND password = ?').get(contact, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
  });

  app.post('/api/auth/register', (req, res) => {
    const { id, name, contact, password } = req.body;
    try {
      db.prepare('INSERT INTO users (id, name, contact, password) VALUES (?, ?, ?, ?)').run(id, name, contact, password);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      res.json({ success: true, user });
    } catch (error) {
      res.status(400).json({ success: false, message: 'El contacto ya existe' });
    }
  });

  app.post('/api/reports', (req, res) => {
    const { id, user_id, type, animal, notes, lat, lng, photo_url, anonymous } = req.body;
    try {
      db.prepare(`
        INSERT INTO reports (id, user_id, type, animal, notes, lat, lng, photo_url, anonymous)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, user_id, type, animal, notes, lat, lng, photo_url, anonymous ? 1 : 0);
      
      // Add points
      db.prepare('UPDATE users SET points = MIN(points + 10, 150) WHERE id = ?').run(user_id);
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Failed to save report' });
    }
  });

  app.get('/api/reports', (req, res) => {
    const { user_id, days } = req.query;
    let reports;
    
    let query = 'SELECT reports.*, users.name as user_name, users.contact as user_contact FROM reports LEFT JOIN users ON reports.user_id = users.id';
    const params: any[] = [];
    
    if (user_id) {
      query += " WHERE reports.user_id = ? AND reports.status != 'denied'";
      params.push(user_id);
    }
    
    if (days) {
      query += (params.length > 0 ? ' AND' : ' WHERE') + ` reports.created_at >= date('now', '-${days} days')`;
    }
    
    query += ' ORDER BY reports.created_at DESC';
    
    reports = db.prepare(query).all(...params);
    res.json({ success: true, reports });
  });

  app.put('/api/reports/:id/status', (req, res) => {
    const { status } = req.body;
    try {
      db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update status' });
    }
  });

  app.get('/api/users/:id', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, user });
  });

  app.post('/api/redeem', (req, res) => {
    const { user_id } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id) as any;
    if (user && user.points >= 150) {
      db.prepare('UPDATE users SET points = points - 150 WHERE id = ?').run(user_id);
      
      // Simulate webhook
      console.log(`[WEBHOOK] User ${user.name} (${user.contact}) redeemed 150 points!`);
      
      res.json({ success: true, newPoints: user.points - 150 });
    } else {
      res.status(400).json({ success: false, message: 'Not enough points' });
    }
  });

  app.get('/api/guides', (req, res) => {
    const groups = db.prepare('SELECT * FROM guide_groups ORDER BY created_at ASC').all();
    const guides = db.prepare('SELECT * FROM guides ORDER BY created_at DESC').all();
    res.json({ success: true, groups, guides });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
