import express from 'express';
import authenticateToken from '../auth/AuthToken.js';
import { query } from '../config/db_conn.js';

const userRouter = express.Router();

// Update route paths to match frontend requests
userRouter.get('/workout-plan', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching workout plan for user:', req.user.id);
    
    // First get the user's assigned plan
    const userPlan = await query(`
      SELECT 
        wp.id, 
        wp.name, 
        wp.description, 
        wp.num_of_days
      FROM workout_plans wp
      JOIN users u ON wp.id = u.workout_plan_id
      WHERE u.id = ?
      LIMIT 1
    `, [req.user.id]);

    console.log('User plan query result:', userPlan);

    if (!userPlan || userPlan.length === 0) {
      return res.status(404).json({ error: 'No workout plan assigned' });
    }

    // Get exercises grouped by days
    const planExercises = await query(`
      SELECT 
        e.id,
        e.name,
        e.description,
        e.sets,
        e.reps,
        wpe.day_num,
        wpe.order_in_day
      FROM workout_plan_exercises wpe 
      JOIN exercises e ON wpe.exercise_id = e.id 
      WHERE wpe.workout_plan_id = ?
      ORDER BY wpe.day_num, wpe.order_in_day
    `, [userPlan[0].id]);

    console.log('Plan exercises query result:', planExercises);

    // Group exercises by day
    const exercisesByDay = {};
    planExercises.forEach(exercise => {
      if (!exercisesByDay[exercise.day_num]) {
        exercisesByDay[exercise.day_num] = [];
      }
      exercisesByDay[exercise.day_num].push(exercise);
    });

    // Structure the response
    const response = {
      id: userPlan[0].id,
      name: userPlan[0].name,
      description: userPlan[0].description,
      num_of_days: userPlan[0].num_of_days,
      days: exercisesByDay
    };

    console.log('Sending response:', response);
    res.json(response);

  } catch (error) {
    console.error('Error fetching workout plan:', error);
    res.status(500).json({ error: 'Failed to fetch workout plan' });
  }
});

userRouter.post('/exercise-logs', authenticateToken, async (req, res) => {
  try {
    const { exercise_id, weight } = req.body;

    if (!exercise_id) {
      return res.status(400).json({ 
        error: 'Missing required field: exercise_id'
      });
    }

    // Validate weight is a number
    const parsedWeight = parseFloat(weight) || 0;
    if (isNaN(parsedWeight) || parsedWeight < 0) {
      return res.status(400).json({ 
        error: 'Invalid weight value' 
      });
    }

    // Verify exercise exists in user's workout plan
    const exerciseExists = await query(`
      SELECT 1 FROM workout_plan_exercises wpe
      JOIN users u ON wpe.workout_plan_id = u.workout_plan_id
      WHERE wpe.exercise_id = ? AND u.id = ?
    `, [exercise_id, req.user.id]);

    if (!exerciseExists.length) {
      return res.status(404).json({ error: 'Exercise not found in your plan' });
    }

    // Insert into exercise_weight_logs with only required fields
    await query(`
      INSERT INTO exercise_weight_logs (user_id, exercise_id, weight)
      VALUES (?, ?, ?)
    `, [req.user.id, exercise_id, parsedWeight]);

    res.status(201).json({ 
      message: 'Exercise logged successfully',
      data: {
        user_id: req.user.id,
        exercise_id,
        weight: parsedWeight
      }
    });

  } catch (error) {
    console.error('Error logging exercise:', error);
    res.status(500).json({ 
      error: 'Failed to log exercise',
      details: error.sqlMessage 
    });
  }
});

userRouter.get('/exercise-logs/today', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        ewl.*,
        e.name as exercise_name,
        e.sets,
        e.reps
      FROM exercise_weight_logs ewl
      JOIN exercises e ON ewl.exercise_id = e.id
      WHERE ewl.user_id = ? 
      AND DATE(ewl.log_date) = CURDATE()
      ORDER BY ewl.log_date DESC
    `, [req.user.id]);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching exercise logs:', error);
    res.status(500).json({ error: 'Failed to fetch exercise logs' });
  }
});

userRouter.get('/exercise-logs/recent', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        el.*,
        e.name as exercise_name,
        e.sets,
        e.reps
      FROM exercise_weight_logs el
      JOIN exercises e ON el.exercise_id = e.id
      WHERE el.user_id = ? 
      ORDER BY el.log_date DESC
      LIMIT 5
    `, [req.user.id]);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching recent logs:', error);
    res.status(500).json({ error: 'Failed to fetch recent logs' });
  }
});

userRouter.get('/today-stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;

    // Get total exercises for today
    const todayExercises = await query(`
      SELECT COUNT(*) as total_exercises
      FROM workout_plan_exercises wpe
      JOIN users u ON wpe.workout_plan_id = u.workout_plan_id
      WHERE u.id = ? AND wpe.day_num = ?
    `, [req.user.id, dayOfWeek]);

    // Get completed exercises
    const completedExercises = await query(`
      SELECT COUNT(*) as exercises_completed
      FROM exercise_weight_logs
      WHERE user_id = ? 
      AND DATE(log_date) = CURDATE()
    `, [req.user.id]);

    // Get today's logs with exercise details
    const todayLogs = await query(`
      SELECT 
        ewl.*,
        e.name as exercise_name,
        e.sets,
        e.reps
      FROM exercise_weight_logs ewl
      JOIN exercises e ON ewl.exercise_id = e.id
      WHERE ewl.user_id = ? 
      AND DATE(ewl.log_date) = CURDATE()
      ORDER BY ewl.log_date DESC
    `, [req.user.id]);

    res.json({
      exercises_completed: completedExercises[0].exercises_completed,
      total_exercises: todayExercises[0].total_exercises,
      day_of_week: dayOfWeek,
      recent_logs: todayLogs
    });

  } catch (error) {
    console.error('Error fetching today stats:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s statistics' });
  }
});

userRouter.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Get user profile with workout and diet plan details
    const userProfile = await query(`
      SELECT 
        u.id,
        u.creation_date,
        u.fname,
        u.lname,
        u.height,
        u.weight,
        u.gender,
        u.fitness_goal,
        u.number_of_training_days,
        u.workout_plan_id,
        u.diet_plan_id,
        wp.name as workout_plan_name,
        wp.description as workout_plan_description,
        dp.name as diet_plan_name,
        dp.description as diet_plan_description,
        DATE_FORMAT(u.creation_date, '%Y-%m-%d %H:%i:%s') as formatted_creation_time
      FROM users u
      LEFT JOIN workout_plans wp ON u.workout_plan_id = wp.id
      LEFT JOIN diet_plans dp ON u.diet_plan_id = dp.id
      WHERE u.id = ?
    `, [req.user.id]);

    if (!userProfile || userProfile.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Get today's workout day number
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // Convert Sunday from 0 to 7

    // Get exercises for today's workout
    const todayExercises = await query(`
      SELECT 
        e.id,
        e.name,
        e.description,
        e.sets,
        e.reps,
        wpe.day_num
      FROM workout_plan_exercises wpe 
      JOIN exercises e ON wpe.exercise_id = e.id 
      WHERE wpe.workout_plan_id = ? 
      AND wpe.day_num = ?
      ORDER BY wpe.order_in_day
    `, [userProfile[0].workout_plan_id, dayOfWeek]);

    // Format the response
    const profile = {
      ...userProfile[0],
      creation_time: userProfile[0].formatted_creation_time,
      today: {
        day_number: dayOfWeek,
        total_exercises: todayExercises.length,
        exercises: todayExercises
      },
      plans: {
        workout: {
          id: userProfile[0].workout_plan_id,
          name: userProfile[0].workout_plan_name,
          description: userProfile[0].workout_plan_description
        },
        diet: {
          id: userProfile[0].diet_plan_id,
          name: userProfile[0].diet_plan_name,
          description: userProfile[0].diet_plan_description
        }
      }
    };

    // Remove redundant fields
    delete profile.workout_plan_name;
    delete profile.workout_plan_description;
    delete profile.diet_plan_name;
    delete profile.diet_plan_description;
    delete profile.formatted_creation_time;

    res.json({ 
      profile,
      message: 'Profile fetched successfully' 
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user profile',
      details: error.message 
    });
  }
});

// Add this route to handle diet plan requests
userRouter.get('/diet-plan', authenticateToken, async (req, res) => {
  try {
    // First get the user's diet plan
    const [dietPlan] = await query(`
      SELECT dp.*
      FROM diet_plans dp
      JOIN users u ON dp.id = u.diet_plan_id
      WHERE u.id = ?
      LIMIT 1
    `, [req.user.id]);

    if (!dietPlan) {
      return res.status(404).json({ error: 'No diet plan assigned' });
    }

    // Get all meals for this diet plan
    const meals = await query(`
      SELECT 
        m.*,
        dpm.meal_type
      FROM meals m
      JOIN diet_plan_meals dpm ON m.id = dpm.meal_id
      WHERE dpm.plan_id = ?
      ORDER BY 
        CASE dpm.meal_type 
          WHEN 'breakfast' THEN 1 
          WHEN 'lunch' THEN 2 
          WHEN 'dinner' THEN 3 
          ELSE 4 
        END
    `, [dietPlan.id]);

    // Structure the response
    const formattedPlan = {
      id: dietPlan.id,
      name: dietPlan.name,
      description: dietPlan.description,
      breakfast: [],
      lunch: [],
      dinner: [],
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0
    };

    // Group meals by type and calculate totals
    meals.forEach(meal => {
      const mealType = meal.meal_type.toLowerCase();
      
      const mealData = {
        food: meal.name,
        description: meal.description,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fats
      };

      if (formattedPlan[mealType]) {
        formattedPlan[mealType].push(mealData);
      }

      // Add to daily totals
      formattedPlan.total_calories += meal.calories;
      formattedPlan.total_protein += meal.protein;
      formattedPlan.total_carbs += meal.carbs;
      formattedPlan.total_fat += meal.fats;
    });

    res.json(formattedPlan);

  } catch (error) {
    console.error('Error fetching diet plan:', error);
    res.status(500).json({ 
      error: 'Failed to fetch diet plan',
      details: error.message 
    });
  }
});

export default userRouter;