import express from 'express'
import cors from 'cors'
import { DevEnvironment } from 'vite'
import db from './config/db_conn.js';
import User from './controllers/User.js';
import Moderator from './controllers/Moderator.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
config({ path: './.env' });
import crypto from 'crypto';
import coockieParser from 'cookie-parser';
import registerationController from './controllers/registerationController.js';
import loginController from './controllers/loginController.js';
import authenticateToken from './auth/AuthToken.js';
import adminRouter from './routes/adminRouter.js';
import modRouter from './routes/modRouter.js';
import { query } from './config/db_conn.js'
import userRouter from './routes/userRouter.js';
import geminiRouter from './routes/geminiRouter.js';

const app = express()
const port = 3000
app.listen(port, () => console.log(`Example app listening on port ${port}!`))

app.use(cors({
    origin: 'http://localhost:5173', // Replace with your frontend URL
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
    
app.use(express.json())
app.use(coockieParser())
app.use(express.urlencoded({ extended: true }))
console.log('JWT_SECRET defined:', !!process.env.JWT_SECRET);
console.log('Gemini API Key defined:', !!process.env.REACT_APP_GOOGLE_GENAI_API_KEY);
app.use('/admin', adminRouter);
app.use('/mod', modRouter);
app.use('/api/user', userRouter);
app.use('/gemini', geminiRouter);

if (!process.env.CORS_ORIGIN) {
    console.warn('WARN: CORS_ORIGIN is not set in .env. CORS might not work as expected.');
}

app.get('/', (req, res) => res.send('Hello World!'))
// Get all exercises
app.get('/exercises', async (req, res) => {
    try {
      const results = await query('SELECT * FROM exercises');
      res.json(results);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      res.status(500).json({ error: 'Failed to fetch exercises' });
    }
  });


app.post('/api/auth/register', registerationController);
app.post('/api/auth/login', loginController);
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    // Send back the user's role and other details
    res.status(200).json({
        userId: req.user.userId,
        email: req.user.email,
        role: req.userRole, // This is set by the authenticateToken middleware
    });
});

app.get('/api/auth/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/' // MUST match cookie path from login
      });
    res.status(200).json({ message: 'Logged out successfully' });
});