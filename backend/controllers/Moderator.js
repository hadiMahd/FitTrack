import { db, query } from '../config/db_conn.js';

export default class Moderator {
  // Promote a user to moderator
  static async promoteToModerator(email) {
    try {
      const role = 'moderator';
      const result = await query(
        'UPDATE users SET role = ? WHERE email = ?',
        [role, email]
      );
      console.log('Result of promoting user to moderator:', result); // Debug log
      if (result.affectedRows === 0) {
        return null; // No user was updated
      }

      const [user] = await query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return user;
    } catch (error) {
      console.error('Error promoting user to moderator:', error);
      throw new Error('Database error while promoting user to moderator');
    }
  }

  // Get all moderators
  static async getMods() {
    try {
      const role = 'moderator';
      const mods = await query(
        'SELECT id, email, creation_date, fname, lname FROM users WHERE role = ?',
        [role]
      );
      console.log('Moderators:', mods); // Debug log
      if (!mods || mods.length === 0) {
        console.log('No moderators found'); // Debug log
        return []; // Return an empty array if no moderators are found
      }

      return mods;
    } catch (error) {
      console.error('Error fetching moderators:', error);
      throw new Error('Database error while fetching moderators');
    }
  }
}