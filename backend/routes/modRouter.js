import express from 'express';
import { authenticate, isStaff } from '../middleware/adminMiddleware.js';
import { query } from '../config/db_conn.js';

const modRouter = express.Router();

// Apply authentication middleware to all routes
modRouter.use(authenticate, isStaff);

// Get all messages
modRouter.get('/messages', authenticate, isStaff, async (req, res) => {
  try {
    const results = await query('SELECT messages.*,users.fname, users.lname, users.email FROM messages JOIN users ON messages.user_id = users.id ORDER BY messages.created_at DESC;');
    res.json(results);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get a specific message by ID
modRouter.get('/messages/:id', authenticate, isStaff, async (req, res) => {
  try {
    const results = await query(
      'SELECT messages.*, users.id, users.fname, users.lname, users.email FROM messages JOIN users ON messages.user_id = users.id WHERE messages.id = ?',
      [req.params.id]
    );
    if (results.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Update message status to seen
modRouter.patch('/messages/:id/status', authenticate, isStaff, async (req, res) => {
  try {
    const newStatus = req.body.status || 'seen'; // Allow setting status to 'new' or 'seen'
    const result = await query(
      'UPDATE messages SET status = ? WHERE id = ?',
      [newStatus, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});
// Get all exercises
modRouter.get('/exercises', authenticate, isStaff, async (req, res) => {
  try {
    const results = await query('SELECT * FROM exercises');
    res.json(results);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

export default modRouter;