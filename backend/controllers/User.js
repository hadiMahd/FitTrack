import bcrypt from 'bcryptjs';
import{ db, query } from '../config/db_conn.js';

export default class User {
  static async create({email, password }) {
    //const hashedPassword = await bcrypt.hash(password, 10);
    //user is the role in the database
    const role = 'user';
    const result = await query(
      'INSERT INTO users (email, password_hash, role) VALUES ( ?, ?, ?)',
      [email, password, role]
    );
    return { id: result.insertId, email };
  }

  static async deleteUserByEmail(email) {
    const result = await query(
      'DELETE FROM users WHERE email = ?',
      [email]
    );
    return result.affectedRows > 0; // Return true if a user was deleted
  }

  static async findByEmail(email) {
    const [user] = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return user;
  }

  static async findById(id) {
    const [user] = await query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return user;
  }

  static async getDailyActiveUsers() {
    const [result] = await query(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE id IN (
         SELECT user_id 
         FROM exercise_weight_logs 
         WHERE DATE(log_date) = CURDATE()
       )`
    );
    return result.count;
  }

  static async getWeeklyActiveUsers() {
    const [result] = await query(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM exercise_weight_logs 
       WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)` 
    );
    return result.count;
  }
  static async getMonthlyActiveUsers() {
    const [result] = await query(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM exercise_weight_logs
       WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)`
    );
    return result.count;
  }
}