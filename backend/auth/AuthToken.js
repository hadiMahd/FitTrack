import jwt from 'jsonwebtoken';
import process from 'process';
import crypto from 'crypto';
import { query } from '../config/db_conn.js';

// Generate access token

const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role 
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '24h' }
  );
};

// Generate password reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Save reset token to database
const saveResetToken = async (userId, token) => {
  try {
    // Delete any existing reset tokens for this user
    await query(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [userId]
    );

    // Insert new reset token with 1-hour expiry
    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [userId, token]
    );
  } catch (error) {
    console.error('Error saving reset token:', error);
    throw new Error('Failed to save reset token');
  }
};

// Verify reset token
const verifyResetToken = async (token) => {
  try {
    const [result] = await query(
      `SELECT user_id, expires_at 
       FROM password_reset_tokens 
       WHERE token = ? AND expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    if (!result) {
      throw new Error('Invalid or expired reset token');
    }

    return result.user_id;
  } catch (error) {
    console.error('Error verifying reset token:', error);
    throw new Error('Failed to verify reset token');
  }
};

// Delete reset token
const deleteResetToken = async (token) => {
  try {
    await query(
      'DELETE FROM password_reset_tokens WHERE token = ?',
      [token]
    );
  } catch (error) {
    console.error('Error deleting reset token:', error);
    throw new Error('Failed to delete reset token');
  }
};

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token; // Get token from HttpOnly cookie named 'authToken'

  if (!token) {
    console.log('Auth middleware: No token cookie found');
    // No token provided, user is not authenticated
    return res.status(401).json({ message: 'Authentication required: No token provided' });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    console.log('Attempting to verify token...');
    
    if (err) {
      console.error('Auth middleware: Token verification failed -', err.message);
      // If token is invalid (e.g., expired, tampered), clear the cookie
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', // Match the setting used during login
      });
      return res.status(403).json({ message: 'Authentication failed: Invalid or expired token' });
    }

    // Make sure we have the required user data
    if (!decoded.userId) {
      console.error('Auth middleware: Token missing userId');
      return res.status(403).json({ message: 'Invalid token format' });
    }

    // Attach user info to request object
    req.user = {
      id: decoded.userId,      // Change to match the JWT payload
      email: decoded.email,
      role: decoded.role
    };

    console.log('Auth middleware: Token verified for user:', req.user.id);
    next();
  });
};

export {
  authenticateToken as default,
  generateAccessToken,
  generateResetToken,
  saveResetToken,
  verifyResetToken,
  deleteResetToken
};