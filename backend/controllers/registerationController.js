import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './User.js';
import { config } from 'dotenv';
config({ path: '../.env' });

const registerationController = async (req, res) => {
    try {
          // Server-side code
          const { email, password } = req.body;
    
            // Validate inputs
            if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
            }
          // Check for existing user
          const existingUser = await User.findByEmail({ email });
          if (existingUser) {
            return res.status(409).json({ message: 'Email already exists' });
          }
      
          // Hash password
          const hashedPassword = await bcrypt.hash(password, 12);
      
          // Create user
          const user = await User.create({
            email: email,
            password: hashedPassword
          });
      
          console.log('Created user:', user); // Debug user object
    
        // Check JWT_SECRET
        if (!process.env.JWT_SECRET) {
          console.error('JWT_SECRET is not defined!');
          return res.status(500).json({ message: 'Server configuration error' });
        }
    
        // Check user ID
        if (!user || !user.id) {
          console.error('User object missing ID:', user);
          return res.status(500).json({ message: 'User creation error' });
        }
    
        // When creating JWT
        const token = jwt.sign({
            userId: user.id,
            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
        }, process?.env?.JWT_SECRET || 'your-default-secret');
    
        res.status(201).json({ token });
        
      } catch (error) {
            console.error('Registration error:', error);
            
            // Check for duplicate entry error
            if (error.code === 'ER_DUP_ENTRY' || // MySQL
                error.code === '23505' ||         // PostgreSQL
                (error.message && error.message.includes('duplicate key')) ||
                (error.sqlMessage && error.sqlMessage.includes('Duplicate entry'))) {
            
            return res.status(409).json({ 
                message: 'Email already exists',
                error: 'DUPLICATE_EMAIL'
            });
            }
            
            // Other server errors
            res.status(500).json({ 
            message: 'Registration failed', 
            error: error.message
            });
        }
};

export default registerationController;