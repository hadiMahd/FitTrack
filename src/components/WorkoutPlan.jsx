import React, { useState, useEffect, forwardRef } from 'react';
//import axios from 'axios';
import api from '../utils/axiosConfig';
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
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SaveIcon from '@mui/icons-material/Save';
/*
const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true
});
*/
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

const WorkoutPlan = forwardRef(({ onStatsChange, userProfile }, ref) => {
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [completedExercises, setCompletedExercises] = useState({});
  const [exerciseWeights, setExerciseWeights] = useState({});
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [showAvailablePlans, setShowAvailablePlans] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [todayStats, setTodayStats] = useState(null);

  // Add motivational messages array
  const motivationalMessages = [
    "Keep pushing your limits! 💪",
    "You're crushing it today! 🔥",
    "Every rep counts! 🏋️‍♂️",
    "Stay strong, stay focused! 💯",
    "You're making progress! 🌟",
    "Your future self thanks you! 🙌",
    "One step closer to your goals! 🎯",
    "You've got this! 💪",
    "Making gains, one exercise at a time! 💪",
    "Your dedication is inspiring! 🌟"
  ];

  // Update the useEffect that loads the initial count
  useEffect(() => {
    const fetchTodayStats = async () => {
      try {
        const response = await api.get('/api/user/today-stats');
        setTodayStats(response.data);
        setCompletedCount(response.data.exercises_completed);
        
        // Update completed exercises based on today's logs
        const completed = {};
        response.data.recent_logs.forEach(log => {
          completed[log.exercise_id] = true;
        });
        setCompletedExercises(completed);

        // Update stats for parent component
        onStatsChange({
          completed: response.data.exercises_completed,
          total: response.data.total_exercises
        });
      } catch (err) {
        console.error('Error fetching today stats:', err);
      }
    };

    fetchTodayStats();
  }, []);

  useEffect(() => {
    fetchWorkoutPlan();
  }, []);

  useEffect(() => {
    fetchAvailablePlans();
  }, []);

  // Update the fetchWorkoutPlan function
  const fetchWorkoutPlan = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/user/workout-plan');
      setWorkoutPlan(response.data);

      if (response.data) {
        const today = new Date().getDay() || 7;
        const todaysExercises = response.data.days[today] || [];
        const totalExercises = todaysExercises.length;

        // Get today's stats from the backend
        const statsResponse = await api.get('/api/user/today-stats');
        setTodayStats(statsResponse.data);
        setCompletedCount(statsResponse.data.exercises_completed);
        
        // Update completed exercises based on today's logs
        const completed = {};
        statsResponse.data.recent_logs.forEach(log => {
          completed[log.exercise_id] = true;
        });
        setCompletedExercises(completed);

        onStatsChange({
          completed: statsResponse.data.exercises_completed,
          total: totalExercises
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // For 404, just set workoutPlan to null without error
        setWorkoutPlan(null);
      } else {
        console.error('Error loading workout plan:', err);
        setError('Failed to load workout plan');
      }
    } finally {
      setLoading(false); // Make sure loading is always set to false
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      setLoadingAvailable(true);
      console.log('Fetching available plans...');

      // Get user's training days
      const profileResponse = await api.get('/api/user/profile');
      console.log('Profile response:', profileResponse.data);
      const trainingDays = profileResponse.data.profile.number_of_training_days;
      console.log('Training days:', trainingDays);

      // Get available plans
      const plansResponse = await api.get(`/api/user/available-workout-plans?days=${trainingDays}`);
      console.log('Available plans response:', plansResponse.data);
      
      setAvailablePlans(plansResponse.data);
      setShowAvailablePlans(true); // Add this line to show plans after fetching
    } catch (err) {
      console.error('Error fetching available plans:', err);
      console.log('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError('Failed to load available plans');
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleExerciseComplete = async (exerciseId) => {
    if (completedExercises[exerciseId]) {
      return;
    }

    try {
      const newCompleted = {
        ...completedExercises,
        [exerciseId]: true
      };
      setCompletedExercises(newCompleted);

      const newCount = completedCount + 1;
      setCompletedCount(newCount);

      const today = new Date().getDay() || 7;
      const todaysExercises = workoutPlan.days[today] || [];

      onStatsChange({
        completed: newCount,
        total: todaysExercises.length
      });

      if (exerciseWeights[exerciseId] > 0) {
        await api.post('/api/user/exercise-logs', {
          exercise_id: exerciseId,
          weight: exerciseWeights[exerciseId]
        });
      } else {
        await api.post('/api/user/exercise-logs', {
          exercise_id: exerciseId
        });
      }

      // Refresh today's stats after completing exercise
      const statsResponse = await api.get('/api/user/today-stats');
      setTodayStats(statsResponse.data);

    } catch (err) {
      console.error('Error completing exercise:', err);
    }
  };

  const handleWeightChange = (exerciseId, value) => {
    const weight = parseFloat(value);
    if (!isNaN(weight) && weight >= 0) {
      setExerciseWeights(prev => ({
        ...prev,
        [exerciseId]: weight
      }));
    }
  };

  const generateWorkout = async () => {
    try {
      setIsGenerating(true);
      
      if (!userProfile) {
        throw new Error('User profile not available');
      }

      const requestBody = {
        height: userProfile.height,
        weight: userProfile.weight,
        birth_date: userProfile.birth_date,
        gender: userProfile.gender?.toLowerCase() || 'male',
        goal: userProfile.fitness_goal?.toLowerCase() || 'general fitness',
        numTrainingDays: userProfile.number_of_training_days
      };

      const response = await api.post('/gemini/generate-workout', requestBody);
      setGeneratedPlan(response.data.workout_plan);
    } catch (err) {
      console.error('Error generating workout:', err);
      setError('Failed to generate AI workout plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveGeneratedPlan = async () => {
    try {
      setIsSaving(true);
      
      if (!generatedPlan) {
        throw new Error('No generated plan to save');
      }

      const response = await api.post('/api/user/save-workout-plan', generatedPlan);
      
      if (response.data.success) {
        await fetchWorkoutPlan();
        setGeneratedPlan(null);
        setCompletedExercises({});
        setCompletedCount(0);
        alert('Workout plan saved successfully!');
      }
    } catch (err) {
      console.error('Error saving workout plan:', err);
      alert('Failed to save workout plan: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlanSelect = async (planId) => {
    try {
      await api.post('/api/user/update-workout-plan', { plan_id: planId });
      await fetchWorkoutPlan();
      setShowAvailablePlans(false);
    } catch (err) {
      console.error('Error updating workout plan:', err);
      setError('Failed to update workout plan');
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

  // Update the renderProgress function
  const renderProgress = () => {
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    
    return (
      <Box sx={{ 
        mb: 3, 
        p: 3, 
        bgcolor: '#f8f8f8', 
        borderRadius: 2,
        textAlign: 'center'
      }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#666' }}>
          Completed Exercises for Today
        </Typography>
        <Typography 
          variant="h2" 
          sx={{ 
            color: '#5E58D5',
            fontWeight: 'bold',
            my: 2
          }}
        >
          {todayStats?.exercises_completed || 0}
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#666',
            fontStyle: 'italic',
            mt: 1
          }}
        >
          {randomMessage}
        </Typography>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ maxWidth: 800, margin: '0 auto', padding: 3 }}>
        {!workoutPlan ? (
          <Box textAlign="center">
            <Typography variant="h6" gutterBottom>
              No Workout Plan Selected
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Get started by selecting an available plan below.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (!showAvailablePlans) {
                  fetchAvailablePlans();
                }
                setShowAvailablePlans(!showAvailablePlans);
              }}
              disabled={loadingAvailable}
              sx={{ mb: 2 }}
            >
              {loadingAvailable ? (
                <CircularProgress size={24} />
              ) : (
                showAvailablePlans ? 'Hide Available Plans' : 'Browse Available Plans'
              )}
            </Button>

            {/* Show available plans only when showAvailablePlans is true */}
            {showAvailablePlans && availablePlans.length > 0 && (
              <Box sx={{ mt: 3 }}>
                {availablePlans.map((plan) => (
                  <Card key={plan.id} sx={{ mb: 2, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box>
                        <Typography variant="h6" sx={{ color: '#333' }}>
                          {plan.name}
                        </Typography>
                        <Typography color="textSecondary" sx={{ mb: 1 }}>
                          {plan.description}
                        </Typography>
                        <Typography variant="body2">
                          {plan.num_of_days} training days per week
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handlePlanSelect(plan.id)}
                        sx={{
                          ml: 2,
                          backgroundColor: '#5E58D5',
                          '&:hover': {
                            backgroundColor: '#4A45C2'
                          }
                        }}
                      >
                        Select Plan
                      </Button>
                    </Box>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <>
            <Typography variant="h4" gutterBottom sx={{ color: '#333' }}>
              {workoutPlan.name || 'Your Workout Plan'}
            </Typography>

            {renderProgress()}

            <Box sx={{ mt: 4, mb: 4 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setShowAvailablePlans(!showAvailablePlans)}
                sx={{ mb: 2 }}
              >
                {showAvailablePlans ? 'Hide Available Plans' : 'Show Available Plans'}
              </Button>

              {showAvailablePlans && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Available Plans
                    {availablePlans.length > 0 && ` (${availablePlans[0].num_of_days} days/week)`}
                  </Typography>
                  {availablePlans.map((plan) => (
                    <Card key={plan.id} sx={{ mb: 2, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <Box>
                          <Typography variant="h6" sx={{ color: '#333' }}>
                            {plan.name}
                          </Typography>
                          <Typography color="textSecondary" sx={{ mb: 1 }}>
                            {plan.description}
                          </Typography>
                          <Typography variant="body2">
                            {plan.num_of_days} training days per week
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handlePlanSelect(plan.id)}
                          sx={{
                            ml: 2,
                            backgroundColor: '#5E58D5',
                            '&:hover': {
                              backgroundColor: '#4A45C2'
                            }
                          }}
                        >
                          Select Plan
                        </Button>
                      </Box>
                    </Card>
                  ))}
                  {availablePlans.length === 0 && (
                    <Alert severity="info">
                      No plans available for your training schedule
                    </Alert>
                  )}
                </Box>
              )}
            </Box>

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
                      opacity: completedExercises[exercise.id] ? 0.8 : 1,
                      pointerEvents: completedExercises[exercise.id] ? 'none' : 'auto'
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
                          sx={{
                            '&.Mui-disabled': {
                              backgroundColor: '#4caf50',
                              color: 'white'
                            }
                          }}
                        >
                          {completedExercises[exercise.id] ? 'Completed' : 'Mark Done'}
                        </Button>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            ))}
          </>
        )}

        {/* AI Generation Section */}
        <Box sx={{ mt: 6, mb: 4 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AutorenewIcon />}
            onClick={generateWorkout}
            disabled={isGenerating}
            sx={{ 
              backgroundColor: '#5E58D5',
              '&:hover': {
                backgroundColor: '#4A45C2'
              }
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Alternative Plan with AI'}
          </Button>
        </Box>

        {/* AI Generated Plan Display */}
        {generatedPlan && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ color: '#5E58D5' }}>
                AI Generated Plan: {generatedPlan.name}
              </Typography>
              <Button
                variant="contained"
                color="success"
                startIcon={<SaveIcon />}
                onClick={saveGeneratedPlan}
                disabled={isSaving}
                sx={{
                  backgroundColor: '#4caf50',
                  '&:hover': {
                    backgroundColor: '#388e3c'
                  }
                }}
              >
                {isSaving ? 'Saving...' : 'Save as My Plan'}
              </Button>
            </Box>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              {generatedPlan.description}
            </Typography>

            {generatedPlan.days.map((day) => (
              <Box key={day.day_num} sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  color: '#5E58D5',
                  borderBottom: '2px solid #5E58D5',
                  paddingBottom: 1,
                  marginBottom: 2
                }}>
                  Day {day.day_num}
                </Typography>
                
                {day.exercises.map((ex, index) => (
                  <Card key={index} sx={{ mb: 2, p: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ color: '#333' }}>
                        {ex.exercise.name}
                      </Typography>
                      <Typography color="textSecondary">
                        {ex.sets} sets × {ex.reps} reps
                      </Typography>
                      {ex.exercise.description && (
                        <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
                          {ex.exercise.description}
                        </Typography>
                      )}
                    </Box>
                  </Card>
                ))}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
});

export default WorkoutPlan;