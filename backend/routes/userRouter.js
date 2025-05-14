import express from 'express';
import authenticateToken from '../auth/AuthToken.js';
import { db, query } from '../config/db_conn.js';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../services/emailService.js';
import { 
  generateResetToken, 
  saveResetToken, 
  verifyResetToken, 
  deleteResetToken 
} from '../auth/AuthToken.js';

const userRouter = express.Router();

// Add this helper function at the top of the file
const calculateTDEE = (weight, height, age, gender, activityLevel) => {
  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr;
  if (gender.toLowerCase() === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multiplier based on training days
  const getActivityMultiplier = (days) => {
    if (days <= 2) return 1.375;     // Light
    if (days <= 4) return 1.55;      // Moderate
    if (days <= 6) return 1.725;     // Active
    return 1.9;                      // Very active
  };

  return Math.round(bmr * getActivityMultiplier(activityLevel));
};

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

    //console.log('User plan query result:', userPlan);

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

    //console.log('Plan exercises query result:', planExercises);

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

    //console.log('Sending response:', response);
    res.json(response);

  } catch (error) {
    console.error('Error fetching workout plan:', error);
    res.status(500).json({ error: 'Failed to fetch workout plan' });
  }
});


//inserting into logs table
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

    //increment exercises counter for the day
    await query(`
      UPDATE users
      SET daily_counter = CASE 
        WHEN counter_date = CURDATE() THEN daily_counter + 1 
        ELSE 1 
      END,
      counter_date = CURDATE()
      WHERE id = ?
    `, [req.user.id]);

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

//exercise logs for today
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

//recent exercise logs but not only today
userRouter.get('/exercise-logs/recent', authenticateToken, async (req, res) => {
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
      ORDER BY ewl.log_date DESC
      LIMIT 100
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
    // Update the SQL query to format birth_date
    const userProfile = await query(`
      SELECT 
        u.id,
        u.creation_date,
        u.fname,
        u.lname,
        DATE_FORMAT(u.birth_date, '%Y-%m-%d') as birth_date,
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

// Add this route to handle profile updates
userRouter.put('/profile', authenticateToken, async (req, res) => {
  try {
    const {
      fname,
      lname,
      gender,
      birth_date,
      weight,
      height,
      number_of_training_days,
      fitness_goal
    } = req.body;

    // Update user profile
    await query(`
      UPDATE users 
      SET 
        fname = ?,
        lname = ?,
        gender = ?,
        birth_date = ?,
        weight = ?,
        height = ?,
        number_of_training_days = ?,
        fitness_goal = ?
      WHERE id = ?`,
      [
        fname,
        lname,
        gender,
        birth_date,
        weight,
        height,
        number_of_training_days,
        fitness_goal,
        req.user.id
      ]
    );

    // Fetch updated profile
    const [updatedProfile] = await query(`
      SELECT 
        id,
        fname,
        lname,
        DATE_FORMAT(birth_date, '%Y-%m-%d') as birth_date,
        height,
        weight,
        gender,
        fitness_goal,
        number_of_training_days
      FROM users 
      WHERE id = ?`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: error.message
    });
  }
});

// Update the diet plan route
userRouter.get('/diet-plan', authenticateToken, async (req, res) => {
  try {
    // Get user's assigned diet plan
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

    // Get meals for the diet plan
    const meals = await query(`
      SELECT 
        m.*,
        dpm.meal_type
      FROM meals m
      JOIN diet_plan_meals dpm ON m.id = dpm.meal_id
      WHERE dpm.diet_plan_id = ?
      ORDER BY 
        CASE dpm.meal_type 
          WHEN 'breakfast' THEN 1 
          WHEN 'lunch' THEN 2 
          WHEN 'dinner' THEN 3 
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

      formattedPlan.total_calories += meal.calories;
      formattedPlan.total_protein += meal.protein;
      formattedPlan.total_carbs += meal.carbs;
      formattedPlan.total_fat += meal.fats;
    });

    res.json(formattedPlan);

  } catch (error) {
    console.error('Error fetching diet plan:', error);
    res.status(500).json({ error: 'Failed to fetch diet plan' });
  }
});

userRouter.post('/save-workout-plan', authenticateToken, async (req, res) => {
  try {
    const result = await db.transaction(async (conn) => {
      // 1. Insert workout plan
      const [planResult] = await conn.query(
        'INSERT INTO workout_plans (name, description, num_of_days) VALUES (?, ?, ?)',
        [req.body.name, req.body.description, req.body.num_of_days]
      );
      const planId = planResult.insertId;

      // 2. Insert exercises with sets and reps, then link to workout plan
      for (const day of req.body.days) {
        for (const exercise of day.exercises) {
          // Insert exercise with sets and reps
          const [exerciseResult] = await conn.query(
            'INSERT INTO exercises (name, description, sets, reps) VALUES (?, ?, ?, ?)',
            [
              exercise.exercise.name, 
              exercise.exercise.description,
              exercise.sets,
              exercise.reps
            ]
          );
          const exerciseId = exerciseResult.insertId;

          // Link exercise to workout plan with day and order
          await conn.query(
            `INSERT INTO workout_plan_exercises 
             (workout_plan_id, exercise_id, day_num, order_in_day) 
             VALUES (?, ?, ?, ?)`,
            [
              planId, 
              exerciseId, 
              day.day_num, 
              exercise.order_in_day || 1
            ]
          );
        }
      }

      // 3. Update user's workout plan
      await conn.query(
        'UPDATE users SET workout_plan_id = ? WHERE id = ?',
        [planId, req.user.id]
      );

      return planId;
    });

    // Get the newly saved plan with exercise details
    const savedPlan = await query(
      `SELECT 
        wp.id, wp.name, wp.description, wp.num_of_days,
        e.id as exercise_id, 
        e.name as exercise_name, 
        e.description as exercise_description,
        e.sets, 
        e.reps,
        wpe.day_num, 
        wpe.order_in_day
       FROM workout_plans wp
       LEFT JOIN workout_plan_exercises wpe ON wp.id = wpe.workout_plan_id
       LEFT JOIN exercises e ON wpe.exercise_id = e.id
       WHERE wp.id = ?
       ORDER BY wpe.day_num, wpe.order_in_day`,
      [result]
    );

    res.status(200).json({
      success: true,
      message: 'Workout plan saved successfully',
      plan: savedPlan
    });

  } catch (error) {
    console.error('Error saving workout plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save workout plan',
      details: error.message
    });
  }
});

// Add this new route
userRouter.get('/available-workout-plans', authenticateToken, async (req, res) => {
  try {
    // Get user's current training days from database
    const [userProfile] = await query(
      'SELECT number_of_training_days FROM users WHERE id = ?',
      [req.user.id]
    );

    const trainingDays = userProfile.number_of_training_days;
    console.log('User training days:', trainingDays); // Debug log

    // Fetch plans matching user's training days
    const availablePlans = await query(`
      SELECT 
        wp.id, 
        wp.name, 
        wp.description, 
        wp.num_of_days
      FROM workout_plans wp
      WHERE wp.num_of_days = ?
      ORDER BY wp.name`,
      [trainingDays]
    );

    //console.log('Available plans:', availablePlans); // Debug log

    res.json(availablePlans);
  } catch (error) {
    console.error('Error fetching available plans:', error);
    res.status(500).json({ error: 'Failed to fetch available plans' });
  }
});

// Add this new route before export
userRouter.post('/update-workout-plan', authenticateToken, async (req, res) => {
  try {
    // Validate request
    if (!req.body.plan_id) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    // Verify plan exists
    const [plan] = await query(
      'SELECT id FROM workout_plans WHERE id = ?',
      [req.body.plan_id]
    );

    if (!plan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    // Update user's workout plan
    await query(
      'UPDATE users SET workout_plan_id = ? WHERE id = ?',
      [req.body.plan_id, req.user.id]
    );

    res.json({ 
      success: true,
      message: 'Workout plan updated successfully' 
    });

  } catch (error) {
    console.error('Error updating workout plan:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update workout plan',
      details: error.message 
    });
  }
});

userRouter.post('/save-diet-plan', authenticateToken, async (req, res) => {
  try {
    const result = await db.transaction(async (conn) => {
      // 1. Insert diet plan
      const [planResult] = await conn.query(
        'INSERT INTO diet_plans (name, description) VALUES (?, ?)',
        [req.body.name, req.body.description]
      );
      const planId = planResult.insertId;

      // 2. Insert meals and link them to diet plan
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      for (const mealType of mealTypes) {
        if (req.body[mealType] && Array.isArray(req.body[mealType])) {
          for (const meal of req.body[mealType]) {
            // Insert meal with nutritional info
            const [mealResult] = await conn.query(
              `INSERT INTO meals 
               (name, description, calories, protein, carbs, fats) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                meal.food,
                meal.description,
                meal.calories,
                meal.protein,
                meal.carbs,
                meal.fat
              ]
            );
            const mealId = mealResult.insertId;

            // Link meal to diet plan
            await conn.query(
              `INSERT INTO diet_plan_meals 
               (diet_plan_id, meal_id, meal_type) 
               VALUES (?, ?, ?)`,
              [planId, mealId, mealType]
            );
          }
        }
      }

      // 3. Update user's diet plan
      await conn.query(
        'UPDATE users SET diet_plan_id = ? WHERE id = ?',
        [planId, req.user.id]
      );

      return planId;
    });

    // Get the newly saved plan
    const savedPlan = await query(`
      SELECT 
        dp.id, dp.name, dp.description,
        m.id as meal_id,
        m.name as food,
        m.description as meal_description,
        m.calories,
        m.protein,
        m.carbs,
        m.fats as fat,
        dpm.meal_type
      FROM diet_plans dp
      LEFT JOIN diet_plan_meals dpm ON dp.id = dpm.diet_plan_id
      LEFT JOIN meals m ON dpm.meal_id = m.id
      WHERE dp.id = ?
      ORDER BY 
        CASE dpm.meal_type 
          WHEN 'breakfast' THEN 1 
          WHEN 'lunch' THEN 2 
          WHEN 'dinner' THEN 3 
          ELSE 4 
        END`,
      [result]
    );

    // Format the response to match the expected structure
    const formattedPlan = {
      id: savedPlan[0].id,
      name: savedPlan[0].name,
      description: savedPlan[0].description,
      breakfast: [],
      lunch: [],
      dinner: [],
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0
    };

    // Group meals by type and calculate totals
    savedPlan.forEach(meal => {
      if (!meal.meal_type) return;

      const mealData = {
        food: meal.food,
        description: meal.meal_description,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat
      };

      formattedPlan[meal.meal_type].push(mealData);
      formattedPlan.total_calories += meal.calories;
      formattedPlan.total_protein += meal.protein;
      formattedPlan.total_carbs += meal.carbs;
      formattedPlan.total_fat += meal.fat;
    });

    res.status(200).json({
      success: true,
      message: 'Diet plan saved successfully',
      plan: formattedPlan
    });

  } catch (error) {
    console.error('Error saving diet plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save diet plan',
      details: error.message
    });
  }
});

userRouter.get('/available-diet-plans', authenticateToken, async (req, res) => {
  try {
    // 1. Fetch user data with proper validation
    const userQuery = await query(
      `SELECT 
        fitness_goal, 
        weight, 
        height, 
        birth_date, 
        gender, 
        number_of_training_days
       FROM users 
       WHERE id = ?`,
      [req.user.id]
    );

    if (!userQuery || userQuery.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    const user = userQuery[0];

    // 2. Calculate age with proper date handling
    const calculateAge = (birthDate) => {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    const age = calculateAge(user.birth_date);

    // 3. TDEE Calculation with fallbacks
    const calculateTDEE = () => {
      const weight = parseFloat(user.weight) || 70;
      const height = parseFloat(user.height) || 170;
      const activityLevels = {
        low: 1.2,       // 0-2 days
        moderate: 1.375, // 3-4 days
        high: 1.55,      // 5 days
        extreme: 1.725   // 6-7 days
      };

      // Handle invalid/missing gender
      const baseBMR = gender => {
        const base = 10 * weight + 6.25 * height - 5 * age;
        return gender?.toLowerCase() === 'female' ? base - 161 : base + 5;
      };

      const activityDays = Math.min(Math.max(user.number_of_training_days || 0, 0), 7);
      const activityMultiplier = activityDays <= 2 ? activityLevels.low :
        activityDays <= 4 ? activityLevels.moderate :
        activityDays === 5 ? activityLevels.high :
        activityLevels.extreme;

      try {
        const bmr = baseBMR(user.gender);
        return bmr * activityMultiplier;
      } catch {
        // Fallback to average of male/female BMR
        const maleBMR = 10 * weight + 6.25 * height - 5 * age + 5;
        const femaleBMR = maleBMR - 166;
        return ((maleBMR + femaleBMR) / 2) * activityMultiplier;
      }
    };

    const tdee = calculateTDEE();

    // 4. Determine target calories with bounds
    const getTargetCalories = () => {
      const base = user.fitness_goal === 'gain_muscle' ? tdee + 500 :
        user.fitness_goal === 'lose_fat' ? tdee - 500 :
        tdee;
      
      return Math.max(base, 1200); // Ensure minimum 1200 calories
    };

    const targetCalories = getTargetCalories();

    // 5. Database query with full error protection
    let dietPlans = [];
    try {
      // Set group concat max length first
      await query("SET SESSION group_concat_max_len = 1000000;");

      const dbResult = await query(
        `SELECT 
          dp.id,
          dp.name,
          dp.description,
          SUM(COALESCE(m.calories, 0)) AS total_calories,
          COUNT(*) AS meal_count,
          COALESCE(
            GROUP_CONCAT(
              CONCAT_WS('|||',
                COALESCE(dpm.meal_type, 'unknown'),
                COALESCE(m.name, 'Unnamed Meal'),
                COALESCE(m.calories, 0),
                COALESCE(m.protein, 0),
                COALESCE(m.carbs, 0),
                COALESCE(m.fats, 0)
              ) SEPARATOR '####'
            ), ''
          ) AS meals_data
        FROM diet_plans dp
        LEFT JOIN diet_plan_meals dpm ON dp.id = dpm.diet_plan_id
        LEFT JOIN meals m ON dpm.meal_id = m.id
        GROUP BY dp.id, dp.name, dp.description
        HAVING 
          SUM(COALESCE(m.calories, 0)) BETWEEN ? - 100 AND ? + 100
          AND COUNT(*) >= 3
        ORDER BY ABS(SUM(COALESCE(m.calories, 0)) - ?) ASC
        LIMIT 5`,
        [targetCalories, targetCalories, targetCalories]
      );

      dietPlans = Array.isArray(dbResult) ? dbResult : [];
    } catch (dbError) {
      console.error('Database Error:', dbError);
    }

    // 6. Safe data parsing with full error protection
    const parseMealData = (plan) => {
      try {
        if (!plan.meals_data) return [];
        
        return plan.meals_data.split('####').map(mealEntry => {
          const parts = mealEntry.split('|||');
          return {
            meal_type: parts[0] || 'unknown',
            name: parts[1] || 'Unnamed Meal',
            calories: Math.round(Number(parts[2]) || 0),
            protein: Math.round(Number(parts[3]) || 0),
            carbs: Math.round(Number(parts[4]) || 0),
            fats: Math.round(Number(parts[5]) || 0)
          };
        });
      } catch (parseError) {
        console.error('Meal Parsing Error:', parseError);
        return [];
      }
    };

    // 7. Build final response
    const response = {
      meta: {
        tdee: Math.round(tdee),
        targetCalories: Math.round(targetCalories),
        generatedAt: new Date().toISOString()
      },
      plans: dietPlans.map(plan => ({
        id: plan.id || null,
        name: plan.name || 'Unnamed Plan',
        description: plan.description || '',
        totalCalories: Math.round(plan.total_calories || 0),
        calorieDeviation: Math.abs((plan.total_calories || 0) - targetCalories),
        matchPercentage: Math.round(
          Math.max(0, Math.min(100, 
            (1 - Math.abs((plan.total_calories || 0) - targetCalories) / targetCalories * 100
          ))
        )),
        meals: parseMealData(plan)
      }))
    };

    // 8. Final empty state handling
    if (response.plans.length === 0) {
      response.warning = 'No matching plans found - try expanding calorie range';
      response.suggestedRange = {
        min: Math.round(targetCalories - 200),
        max: Math.round(targetCalories + 200)
      };
    }

    res.json(response);

  } catch (error) {
    console.error('System Error:', error);
    res.status(500).json({
      error: 'Failed to process diet plan request',
      code: 'DIET_PLAN_SYSTEM_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Add the plan selection endpoint
userRouter.post('/select-diet-plan', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    
    // Verify plan exists
    const [plan] = await query(
      'SELECT id FROM diet_plans WHERE id = ?',
      [planId]
    );

    if (!plan) {
      return res.status(404).json({ error: 'Diet plan not found' });
    }

    // Update user's diet plan
    await query(
      'UPDATE users SET diet_plan_id = ? WHERE id = ?',
      [planId, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error selecting diet plan:', error);
    res.status(500).json({ error: 'Failed to select diet plan' });
  }
});

// Update your forgot password route
userRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const [user] = await query(
      'SELECT id, fname, email FROM users WHERE email = ?', 
      [email]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Generate and save reset token
    const token = generateResetToken();
    await saveResetToken(user.id, token);
    
    // Send reset email
    await sendPasswordResetEmail(email, token, user.fname);
    
    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// After password change
userRouter.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token and get user ID
    const userId = await verifyResetToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Get user details for email notification
    const [user] = await query(
      'SELECT fname, email FROM users WHERE id = ?',
      [userId]
    );

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    // Delete used token
    await deleteResetToken(token);

    // Send confirmation email
    await sendPasswordChangedEmail(user.email, user.fname);

    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Add this new route before export
userRouter.post('/messages', authenticateToken, async (req, res) => {
  try {
    const { message_type, content } = req.body;
    
    // Validate required fields
    if (!message_type || !content) {
      return res.status(400).json({ 
        success: false,
        error: 'Message type and content are required' 
      });
    }

    // Validate message type
    const validTypes = ['report', 'message', 'feedback', 'other'];
    if (!validTypes.includes(message_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message type'
      });
    }

    // Insert message into database
    const result = await query(`
      INSERT INTO messages (
        user_id,
        message_type,
        content
      ) VALUES (?, ?, ?)
    `, [req.user.id, message_type, content]);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: result.insertId,
        message_type,
        content,
        created_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
  }
});

export default userRouter;