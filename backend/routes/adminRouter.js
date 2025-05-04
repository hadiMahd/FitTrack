import express from 'express';
import User from '../controllers/User.js';
import { authenticate, isAdmin, isStaff } from '../middleware/adminMiddleware.js';
import Moderator from '../controllers/Moderator.js';
import { query } from '../config/db_conn.js';
const adminRouter = express.Router(); // Renamed to adminRouter

adminRouter.use(authenticate, isAdmin); // Middleware to parse JSON bodies

/*
// Example 1: Admin-only route
adminRouter.get('/dashboard', authenticate, isAdmin, async (req, res) => {
  try {
    console.log('Dashboard'); // Debug log
  } catch (error) {
    console.error('Error fetching moderators:', error);
    res.status(500).json({ error: 'Failed to fetch moderators' });
  }
});
*/

// Example 2: Staff-only route (admin/moderator)
adminRouter.get('/messages', authenticate, isStaff, async (req, res) => {
  try {
    const results = await query('SELECT messages.*,users.fname, users.lname, users.email FROM messages JOIN users ON messages.user_id = users.id ORDER BY messages.created_at DESC;');
    res.json(results);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});
adminRouter.get('/analytics', authenticate, isStaff, async (req, res) => {
  try {
    const dailyActiveUsers = await User.getDailyActiveUsers();
    const weeklyActiveUsers = await User.getWeeklyActiveUsers();
    const monthlyActiveUsers = await User.getMonthlyActiveUsers();

    res.json({
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});


// Example 3: Protected user profile
adminRouter.get('/profile', authenticate, (req, res) => {
  res.json({ profile: req.user });
});

// Get moderators
adminRouter.get('/moderators', authenticate, isAdmin, async (req, res) => {
  try {
    const moderators = await Moderator.getMods();
    if (!moderators || moderators.length === 0) {
      return res.status(404).json({ error: 'No moderators found' });
    }
    res.json(moderators);
  } catch (error) {
    console.error('Error fetching moderators:', error);
    res.status(500).json({ error: 'Failed to fetch moderators' });
  }
});

// Add moderator
adminRouter.post('/moderators', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await Moderator.promoteToModerator(req.body.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error promoting user to moderator:', error);
    res.status(500).json({ error: 'Failed to promote user to moderator' });
  }
});

// Remove moderator
adminRouter.delete('/moderators/:email', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.deleteUserByEmail(req.params.email);
    if (!user) return res.status(404).json({ error: 'Moderator not found' });
    res.sendStatus(204);
  } catch (error) {
    console.error('Error demoting moderator:', error);
    res.status(500).json({ error: 'Failed to demote moderator' });
  }
});

// Add message status update endpoint
adminRouter.patch('/messages/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const newStatus = req.body.status;
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

// Delete a message
adminRouter.delete('/messages/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM messages WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Add workout plan
adminRouter.post('/add-workout-plans', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, num_of_days } = req.body;
    const result = await query(
      'INSERT INTO workout_plans (name, description, num_of_days) VALUES (?, ?, ?)',
      [name, description, num_of_days]
    );
    res.status(201).json({ 
      id: result.insertId,
      name,
      description,
      num_of_days
    });
  } catch (error) {
    console.error('Error creating workout plan:', error);
    res.status(500).json({ error: 'Failed to create workout plan' });
  }
});

// Get all workout plans
adminRouter.get('/workout-plans', authenticate, isAdmin, async (req, res) => {
  try {
    const results = await query('SELECT * FROM workout_plans ORDER BY name');
    res.json(results);
  } catch (error) {
    console.error('Error fetching workout plans:', error);
    res.status(500).json({ error: 'Failed to fetch workout plans' });
  }
});

// Get workout plan exercises
adminRouter.get('/workout-plans/:id/exercises', authenticate, isAdmin, async (req, res) => {
  try {
    const results = await query(
      `SELECT wp.*, e.name as exercise_name, e.id as exercise_id, wpe.day_num, wpe.order_in_day 
       FROM workout_plans wp 
       LEFT JOIN workout_plan_exercises wpe ON wp.id = wpe.workout_plan_id 
       LEFT JOIN exercises e ON wpe.exercise_id = e.id 
       WHERE wp.id = ?
       ORDER BY wpe.day_num, wpe.order_in_day`,
      [req.params.id]
    );
    if (results.length === 0) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }
    res.json(results);
  } catch (error) {
    console.error('Error fetching workout plan:', error);
    res.status(500).json({ error: 'Failed to fetch workout plan' });
  }
});

// Add exercise to workout plan
adminRouter.post('/workout-plans/:id/exercises', authenticate, isAdmin, async (req, res) => {
  try {
    const { exercise_id, day_num, order_in_day } = req.body;
    const result = await query(
      'INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_num, order_in_day) VALUES (?, ?, ?, ?)',
      [req.params.id, exercise_id, day_num, order_in_day]
    );
    res.status(201).json({ 
      id: result.insertId,
      workout_plan_id: req.params.id,
      exercise_id,
      day_num,
      order_in_day
    });
  } catch (error) {
    console.error('Error adding exercise to workout plan:', error);
    res.status(500).json({ error: 'Failed to add exercise to workout plan' });
  }
});

// Update workout plan exercises
adminRouter.put('/workout-plans/:id/exercises', authenticate, isAdmin, async (req, res) => {
  try {
    const { exercises } = req.body;
    
    // First delete all existing exercises for this plan
    await query('DELETE FROM workout_plan_exercises WHERE workout_plan_id = ?', [req.params.id]);
    
    // Then insert the new exercises
    for (const exercise of exercises) {
      await query(
        'INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_num, order_in_day) VALUES (?, ?, ?, ?)',
        [req.params.id, exercise.exercise_id, exercise.day_num, exercise.order_in_day]
      );
    }
    
    res.json({ message: 'Workout plan exercises updated successfully' });
  } catch (error) {
    console.error('Error updating workout plan exercises:', error);
    res.status(500).json({ error: 'Failed to update workout plan exercises' });
  }
});

// Remove exercise from workout plan
adminRouter.delete('/workout-plans/:id/exercises/:exerciseId/:dayNum', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM workout_plan_exercises WHERE workout_plan_id = ? AND exercise_id = ? AND day_num = ?',
      [req.params.id, req.params.exerciseId, req.params.dayNum]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Exercise not found in workout plan' });
    }
    
    res.sendStatus(204);
  } catch (error) {
    console.error('Error removing exercise:', error);
    res.status(500).json({ error: 'Failed to remove exercise' });
  }
});

// Get all exercises
adminRouter.get('/exercises', authenticate, isAdmin, async (req, res) => {
  try {
    const results = await query('SELECT * FROM exercises');
    res.json(results);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// Add exercise
adminRouter.post('/exercises', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, sets, reps } = req.body;
    const result = await query(
      'INSERT INTO exercises (name, description, sets, reps) VALUES (?, ?, ?, ?)',
      [name, description, sets, reps]
    );
    res.status(201).json({ 
      id: result.insertId,
      name,
      description,
      sets,
      reps
    });
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

// Delete exercise
adminRouter.delete('/exercises/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM exercises WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

// Get all meals
adminRouter.get('/meals', authenticate, isAdmin, async (req, res) => {
  try {
    const results = await query('SELECT * FROM meals ORDER BY name');
    res.json(results);
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// Add new meal
adminRouter.post('/meals', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, calories, protein, carbs, fats } = req.body;
    const result = await query(
      'INSERT INTO meals (name, description, calories, protein, carbs, fats) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, calories, protein, carbs, fats]
    );
    res.status(201).json({ 
      id: result.insertId,
      name,
      description,
      calories,
      protein,
      carbs,
      fats
    });
  } catch (error) {
    console.error('Error creating meal:', error);
    res.status(500).json({ error: 'Failed to create meal' });
  }
});

// Delete meal
adminRouter.delete('/meals/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await query('DELETE FROM meals WHERE id = ?', [req.params.id]);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// Get all diet plans
adminRouter.get('/diet-plans', authenticate, isAdmin, async (req, res) => {
  try {
    const results = await query('SELECT * FROM diet_plans ORDER BY name');
    res.json(results);
  } catch (error) {
    console.error('Error fetching diet plans:', error);
    res.status(500).json({ error: 'Failed to fetch diet plans' });
  }
});

// Add new diet plan
adminRouter.post('/diet-plans', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await query(
      'INSERT INTO diet_plans (name, description) VALUES (?, ?)',
      [name, description]
    );
    res.status(201).json({ 
      id: result.insertId,
      name,
      description
    });
  } catch (error) {
    console.error('Error creating diet plan:', error);
    res.status(500).json({ error: 'Failed to create diet plan' });
  }
});

// Delete diet plan
adminRouter.delete('/diet-plans/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await query('DELETE FROM diet_plans WHERE id = ?', [req.params.id]);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error deleting diet plan:', error);
    res.status(500).json({ error: 'Failed to delete diet plan' });
  }
});

// Add meal to diet plan
adminRouter.post('/diet-plan-meals', authenticate, isAdmin, async (req, res) => {
  try {
    const { diet_plan_id, meal_id, meal_type } = req.body;
    const result = await query(
      'INSERT INTO diet_plan_meals (diet_plan_id, meal_id, meal_type) VALUES (?, ?, ?)',
      [diet_plan_id, meal_id, meal_type]
    );
    res.status(201).json({ 
      id: result.insertId,
      diet_plan_id,
      meal_id,
      meal_type
    });
  } catch (error) {
    console.error('Error adding meal to diet plan:', error);
    res.status(500).json({ error: 'Failed to add meal to diet plan' });
  }
});

// Get meals in a diet plan
adminRouter.get('/diet-plans/:id/meals', authenticate, isAdmin, async (req, res) => {
  try {
    const results = await query(
      `SELECT dp.*, m.name as meal_name, m.calories, m.protein, m.carbs, m.fats, dpm.meal_type 
       FROM diet_plans dp 
       LEFT JOIN diet_plan_meals dpm ON dp.id = dpm.diet_plan_id 
       LEFT JOIN meals m ON dpm.meal_id = m.id 
       WHERE dp.id = ?
       ORDER BY dpm.meal_type`,
      [req.params.id]
    );
    if (results.length === 0) {
      return res.status(404).json({ error: 'Diet plan not found' });
    }
    res.json(results);
  } catch (error) {
    console.error('Error fetching diet plan meals:', error);
    res.status(500).json({ error: 'Failed to fetch diet plan meals' });
  }
});

// Remove meal from diet plan
adminRouter.delete('/diet-plans/:planId/meals/:mealId', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM diet_plan_meals WHERE diet_plan_id = ? AND meal_id = ?',
      [req.params.planId, req.params.mealId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Meal not found in diet plan' });
    }
    res.sendStatus(204);
  } catch (error) {
    console.error('Error removing meal from diet plan:', error);
    res.status(500).json({ error: 'Failed to remove meal from diet plan' });
  }
});

export default adminRouter; // Exporting as adminRouter