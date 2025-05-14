import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './User.js';
import { config } from 'dotenv';
config({ path: '../.env' });
import process from 'process';

// Rate limiting setup (in-memory store)
const rateLimit = {};
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

const loginController = async (req, res) => {
  try {
    // Get data from request body
    console.log('Received body:', req.body);
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check for rate limiting
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userKey = `${ipAddress}:${email.toLowerCase().trim()}`;

    if (rateLimit[userKey]) {
      const { lockUntil } = rateLimit[userKey];
      
      // Check if user is locked out
      if (lockUntil && lockUntil > Date.now()) {
        return res.status(429).json({
          message: 'Too many attempts. Please try again later.',
          retryAfter: Math.ceil((lockUntil - Date.now()) / 1000)
        });
      }
      
      // Reset lockout if it's expired
      if (lockUntil && lockUntil <= Date.now()) {
        rateLimit[userKey] = { attempts: 0 };
      }
      
      // Increment attempts
      rateLimit[userKey].attempts += 1;
      
      // Lock account if max attempts reached
      if (rateLimit[userKey].attempts >= MAX_ATTEMPTS) {
        rateLimit[userKey].lockUntil = Date.now() + LOCKOUT_TIME;
        return res.status(429).json({
          message: 'Too many attempts. Please try again later.',
          retryAfter: Math.ceil(LOCKOUT_TIME / 1000)
        });
      }
    } else {
      // Initialize rate limiting for this user+IP
      rateLimit[userKey] = { attempts: 1 };
    }

    // Find user by email
    const user = await User.findByEmail(email.toLowerCase().trim());
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Reset rate limiting on successful login
    if (rateLimit[userKey]) {
      delete rateLimit[userKey];
    }

    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined!');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role || 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    // You could update last login timestamp here if needed
    // Example: await query('UPDATE user_credentials SET last_login = NOW() WHERE id = ?', [user.id]);

    // Return token and success message
    res.status(200).json({ 
      userId: user.id,
      role: user.role || 'user',
      message: 'Login successful' 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed'+error, 
      error: error.message 
    });
  }
};

export default loginController;