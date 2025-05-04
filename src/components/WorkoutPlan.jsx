import React, { useState, useEffect, forwardRef } from 'react';
import axios from 'axios';
import {
  Card,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true
});

const theme = createTheme({
  palette: {
    primary: {
      main: '#5E58D5',
    },
    success: {
      main: '#4caf50',
      dark: '#388e3c',
    },
  },
});

const WorkoutPlan = forwardRef(({ onStatsChange }, ref) => {
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedExercises, setCompletedExercises] = useState({});
  const [exerciseWeights, setExerciseWeights] = useState({});

  useEffect(() => {
    fetchWorkoutPlan();
  }, []);

  const fetchWorkoutPlan = async () => {
    try {
      const response = await api.get('/api/user/workout-plan');
      setWorkoutPlan(response.data);

      const logsResponse = await api.get('/api/user/exercise-logs/today');

      // Create a map of completed exercises
      const completed = {};
      logsResponse.data.forEach(log => {
        completed[log.exercise_id] = true;
      });
      setCompletedExercises(completed);

      // Calculate stats for today
      const today = new Date().getDay() || 7;
      const todaysExercises = response.data.days[today] || [];
      const totalExercises = todaysExercises.length;
      const completedCount = todaysExercises.filter(ex => completed[ex.exercise_id]).length;

      console.log('WorkoutPlan stats:', {
        total: totalExercises,
        completed: completedCount
      });

      // Pass stats up to parent immediately
      if (onStatsChange) {
        console.log('Calling onStatsChange with:', { completed: completedCount, total: totalExercises });
        onStatsChange({
          completed: completedCount,
          total: totalExercises
        });
      }
    } catch (err) {
      console.error('Error loading workout plan:', err);
      setError('Failed to load workout plan');
    }
  };

  const handleExerciseComplete = async (exerciseId) => {
    try {
      // Update local state
      const newCompleted = {
        ...completedExercises,
        [exerciseId]: true
      };
      setCompletedExercises(newCompleted);

      // Recalculate stats
      const today = new Date().getDay() || 7;
      const todaysExercises = workoutPlan.days[today] || [];
      const totalExercises = todaysExercises.length;
      const completedCount = todaysExercises.filter(ex => newCompleted[ex.id]).length;

      console.log('Updating stats:', {
        completed: completedCount,
        total: totalExercises
      });

      // Pass updated stats to parent
      onStatsChange({
        completed: completedCount,
        total: totalExercises
      });

      // API call to log exercise
      const response = await api.post('/api/user/exercise-logs', {
        exercise_id: exerciseId,
        weight: exerciseWeights[exerciseId] || 0
      });

    } catch (err) {
      console.error('Error completing exercise:', err);
      // Revert the completion state if API call fails
      setCompletedExercises(prev => ({
        ...prev,
        [exerciseId]: false
      }));
    }
  };

  const handleWeightChange = (exerciseId, value) => {
    // Validate weight input
    const weight = parseFloat(value);
    if (!isNaN(weight) && weight >= 0) {
      setExerciseWeights(prev => ({
        ...prev,
        [exerciseId]: weight
      }));
    }
  };

  const renderWeightInput = (exercise) => (
    <Box sx={{ width: 120 }}>
      <Typography variant="caption" color="textSecondary">
        Weight (kg)
      </Typography>
      <input
        type="number"
        value={exerciseWeights[exercise.id] || ''}
        onChange={(e) => handleWeightChange(exercise.id, e.target.value)}
        disabled={completedExercises[exercise.id]}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          marginTop: '4px',
          backgroundColor: completedExercises[exercise.id] ? '#f5f5f5' : 'white'
        }}
        min="0"
        step="0.5"
        placeholder="Enter weight"
      />
    </Box>
  );

  if (!workoutPlan) return (
    <Box display="flex" justifyContent="center" p={3}>
      <CircularProgress />
    </Box>
  );
  
  if (error) return (
    <Box p={3}>
      <Alert severity="error">{error}</Alert>
    </Box>
  );
  
  if (!workoutPlan.days || Object.keys(workoutPlan.days).length === 0) return (
    <Box p={3}>
      <Alert severity="info">No exercises in workout plan</Alert>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ maxWidth: 800, margin: '0 auto', padding: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#333' }}>
          {workoutPlan.name || 'Your Workout Plan'}
        </Typography>

        {Object.entries(workoutPlan.days).map(([dayNum, exercises]) => (
          <Box key={dayNum} sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ 
              color: '#5E58D5',
              borderBottom: '2px solid #5E58D5',
              paddingBottom: 1,
              marginBottom: 2
            }}>
              Day {dayNum}
            </Typography>

            {exercises.map((exercise) => (
              <Card 
                key={exercise.id} 
                sx={{ 
                  mb: 2, 
                  p: 2,
                  backgroundColor: completedExercises[exercise.id] ? '#f0f7f0' : 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box flex={1}>
                    <Typography variant="h6" sx={{ color: '#333' }}>
                      {exercise.name}
                    </Typography>
                    <Typography color="textSecondary">
                      {exercise.sets} sets × {exercise.reps} reps
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
                      {exercise.description}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    {renderWeightInput(exercise)}
                    <Button
                      variant="contained"
                      color={completedExercises[exercise.id] ? "success" : "primary"}
                      onClick={() => handleExerciseComplete(exercise.id)}
                      disabled={completedExercises[exercise.id]}
                      startIcon={completedExercises[exercise.id] ? <CheckCircleIcon /> : null}
                    >
                      {completedExercises[exercise.id] ? 'Completed' : 'Mark Done'}
                    </Button>
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        ))}
      </Box>
    </ThemeProvider>
  );
});

export default WorkoutPlan;