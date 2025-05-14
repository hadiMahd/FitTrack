import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SaveIcon from '@mui/icons-material/Save';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import api from '../utils/axiosConfig';

const theme = createTheme({
  palette: {
    primary: {
      main: '#5E58D5',
    },
    secondary: {
      main: '#4caf50',
    },
  },
});

const DietPlan = ({ userProfile }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [availablePlans, setAvailablePlans] = useState(null);
  const [tdeeInfo, setTdeeInfo] = useState(null);

  useEffect(() => {
    fetchDietPlan();
  }, []);

  const fetchDietPlan = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/user/diet-plan');
      setDietPlan(response.data);
    } catch (err) {
      // Only set error for non-404 responses
      if (err.response?.status !== 404) {
        setError('Failed to load diet plan');
        console.error('Diet plan loading error:', err);
      } else {
        // For 404, just set dietPlan to null without error
        setDietPlan(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      setLoadingAvailable(true);
      const response = await api.get('/api/user/available-diet-plans');
      
      // Parse and set the TDEE info
      setTdeeInfo({
        tdee: response.data.meta.tdee,
        targetCalories: response.data.meta.targetCalories,
        generatedAt: new Date(response.data.meta.generatedAt)
      });

      // Parse and set the available plans
      setAvailablePlans(response.data.plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        total_calories: plan.totalCalories,
        match_score: Math.round(plan.matchPercentage * 100),
        calorieDeviation: plan.totalCalories ? 
          ((plan.totalCalories - response.data.meta.targetCalories) / 
          response.data.meta.targetCalories * 100) : 0,
        meals: plan.meals.reduce((acc, meal) => {
          const type = meal.meal_type.toLowerCase();
          if (!acc[type]) acc[type] = [];
          acc[type].push({
            food: meal.name,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fats
          });
          return acc;
        }, {})
      })));

    } catch (err) {
      setError('Failed to load available plans');
      console.error('Available plans loading error:', err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const generateDietPlan = async () => {
    try {
      setGenerating(true);
      setError(null);

      // Validate userProfile before making the request
      if (!userProfile || !userProfile.height || !userProfile.weight || 
          !userProfile.birth_date || !userProfile.gender || 
          !userProfile.fitness_goal || !userProfile.number_of_training_days) {
        throw new Error('Please complete your profile information first');
      }

      const response = await api.post('/gemini/generate-diet', {
        height: parseFloat(userProfile.height),
        weight: parseFloat(userProfile.weight),
        birth_date: userProfile.birth_date,
        gender: userProfile.gender.toLowerCase(),
        goal: userProfile.fitness_goal,
        numTrainingDays: parseInt(userProfile.number_of_training_days)
      });

      if (response.data) {
        setGeneratedPlan(response.data); // Set generated plan instead of dietPlan
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate diet plan. Please try again.');
      console.error('Diet plan generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const saveDietPlan = async (planToSave) => {
    try {
      // For existing plans from database
      if (planToSave.id) {
        const response = await api.post('/api/user/select-diet-plan', {
          planId: planToSave.id
        });

        if (response.data.success) {
          await fetchDietPlan(); // Refresh the displayed plan
          setGeneratedPlan(null);
          setAvailablePlans(null);
          setError(null);
        } else {
          throw new Error('Failed to save diet plan');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save diet plan');
      console.error('Diet plan save error:', err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ maxWidth: 800, margin: '0 auto', padding: 3 }}>
        {!dietPlan ? (
          <Box textAlign="center">
            <Typography variant="h6" gutterBottom>
              No diet plan found
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" gutterBottom sx={{ color: '#333' }}>
                {dietPlan.name || 'Your Diet Plan'}
              </Typography>
              <Typography color="textSecondary" sx={{ mb: 1 }}>
                {dietPlan.description}
              </Typography>
            </Box>

            {['breakfast', 'lunch', 'dinner'].map((mealType) => (
              <Card key={mealType} sx={{ mb: 2 }}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RestaurantIcon color="primary" />
                      <Typography variant="h6">
                        {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {dietPlan[mealType]?.map((meal, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {meal.food}
                        </Typography>
                        {meal.description && (
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            {meal.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                          <Typography variant="body2">
                            Calories: {meal.calories} kcal
                          </Typography>
                          <Typography variant="body2">
                            Protein: {meal.protein}g
                          </Typography>
                          <Typography variant="body2">
                            Carbs: {meal.carbs}g
                          </Typography>
                          <Typography variant="body2">
                            Fat: {meal.fat}g
                          </Typography>
                        </Box>
                        {index < dietPlan[mealType].length - 1 && <Divider sx={{ my: 2 }} />}
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              </Card>
            ))}

            <Box sx={{ mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Daily Nutrition Totals
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Typography variant="body1" color="textSecondary">
                  Total Calories: {dietPlan.total_calories} kcal
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Total Protein: {dietPlan.total_protein}g
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Total Carbs: {dietPlan.total_carbs}g
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Total Fat: {dietPlan.total_fat}g
                </Typography>
              </Box>
            </Box>
          </>
        )}

        <Box sx={{ mt: 4, textAlign: 'center', display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SmartToyIcon />}
            onClick={generateDietPlan}
            disabled={generating}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              py: 1.5,
              px: 4,
            }}
          >
            {generating ? <CircularProgress size={24} /> : 'Generate New Plan with AI'}
          </Button>
          
          <Button
            variant="contained"
            color="secondary"
            startIcon={<FormatListBulletedIcon />}
            onClick={fetchAvailablePlans}
            disabled={loadingAvailable}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              py: 1.5,
              px: 4,
            }}
          >
            {loadingAvailable ? (
              <CircularProgress size={24} />
            ) : (
              'Available Plans for Your Needs'
            )}
          </Button>
        </Box>

        {tdeeInfo && (
          <Box sx={{ mt: 3, mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Personalized Plan Recommendations
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, color: 'text.secondary' }}>
              <Typography variant="body2">
                Your TDEE: {tdeeInfo.tdee} kcal
              </Typography>
              <Typography variant="body2">
                Target Calories: {tdeeInfo.targetCalories} kcal
              </Typography>
            </Box>
          </Box>
        )}

        {availablePlans && (
          <Box sx={{ mt: 4 }}>
            {availablePlans.map((plan) => (
              <Card key={plan.id} sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography color="textSecondary" sx={{ mb: 2 }}>
                    {plan.description}
                  </Typography>
                  
                  {['breakfast', 'lunch', 'dinner'].map((mealType) => (
                    <Box key={mealType} sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ color: theme.palette.primary.main, mb: 1 }}>
                        {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </Typography>
                      {plan.meals[mealType]?.map((meal, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {meal.food}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                            <Typography variant="body2">
                              Calories: {meal.calories} kcal
                            </Typography>
                            <Typography variant="body2">
                              Protein: {meal.protein}g
                            </Typography>
                            <Typography variant="body2">
                              Carbs: {meal.carbs}g
                            </Typography>
                            <Typography variant="body2">
                              Fat: {meal.fat}g
                            </Typography>
                          </Box>
                          {index < plan.meals[mealType].length - 1 && <Divider sx={{ my: 2 }} />}
                        </Box>
                      ))}
                    </Box>
                  ))}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Typography variant="body2" color="textSecondary">
                        Total Calories: {plan.total_calories} kcal
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Match Score: {plan.match_score}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Calorie Deviation: {plan.calorieDeviation ? 
                          `${Math.abs(Math.round(plan.calorieDeviation))}%` : 
                          '0%'
                        }
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<SaveIcon />}
                      onClick={() => saveDietPlan(plan)}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      Select This Plan
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {generatedPlan && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#333', textAlign: 'center' }}>
              Generated Diet Plan
            </Typography>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {generatedPlan.name}
                </Typography>
                <Typography color="textSecondary" sx={{ mb: 2 }}>
                  {generatedPlan.description}
                </Typography>

                {['breakfast', 'lunch', 'dinner'].map((mealType) => (
                  <Box key={mealType} sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ color: theme.palette.primary.main, mb: 1 }}>
                      {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                    </Typography>
                    {generatedPlan[mealType]?.map((meal, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {meal.food}
                        </Typography>
                        {meal.description && (
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            {meal.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                          <Typography variant="body2">
                            Calories: {meal.calories} kcal
                          </Typography>
                          <Typography variant="body2">
                            Protein: {meal.protein}g
                          </Typography>
                          <Typography variant="body2">
                            Carbs: {meal.carbs}g
                          </Typography>
                          <Typography variant="body2">
                            Fat: {meal.fat}g
                          </Typography>
                        </Box>
                        {index < generatedPlan[mealType].length - 1 && <Divider sx={{ my: 2 }} />}
                      </Box>
                    ))}
                  </Box>
                ))}

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<SaveIcon />}
                    onClick={() => saveDietPlan(generatedPlan)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      py: 1.5,
                      px: 4,
                    }}
                  >
                    Save as My Plan
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default DietPlan;