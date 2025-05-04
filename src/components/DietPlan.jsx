import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestaurantIcon from '@mui/icons-material/Restaurant';

const api = axios.create({
  baseURL: 'http://localhost:3000/', // Add /api to the baseURL
  withCredentials: true
});

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

const DietPlan = () => {
  const [dietPlan, setDietPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDietPlan();
  }, []);

  const fetchDietPlan = async () => {
    try {
      console.log('Fetching diet plan...');
      const response = await api.get('/api/user/diet-plan'); // Remove /api from here since it's in baseURL
      console.log('Diet plan response:', response.data);
      setDietPlan(response.data);
    } catch (err) {
      console.error('Error details:', {
        status: err.response?.status,
        url: err.config?.url,
        method: err.config?.method,
        message: err.message
      });
      setError('Failed to load diet plan');
    } finally {
      setLoading(false);
    }
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

  if (!dietPlan) {
    return (
      <Box p={3}>
        <Alert severity="info">No diet plan found</Alert>
      </Box>
    );
  }

  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ maxWidth: 800, margin: '0 auto', padding: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ color: '#333' }}>
            Your Diet Plan
          </Typography>
          <Typography color="textSecondary" sx={{ mb: 2 }}>
            Daily Calorie Target: {dietPlan.daily_calories} kcal
          </Typography>
        </Box>

        {meals.map((meal) => (
          <Card key={meal} sx={{ mb: 2, overflow: 'visible' }}>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: '#f8f9fa',
                  borderBottom: '1px solid #e0e0e0'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RestaurantIcon color="primary" />
                  <Typography variant="h6">{meal}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {dietPlan[meal.toLowerCase()]?.map((item, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        {item.food}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                        <Typography variant="body2">
                          Calories: {item.calories} kcal
                        </Typography>
                        <Typography variant="body2">
                          Protein: {item.protein}g
                        </Typography>
                        <Typography variant="body2">
                          Carbs: {item.carbs}g
                        </Typography>
                        <Typography variant="body2">
                          Fat: {item.fat}g
                        </Typography>
                      </Box>
                      {index < dietPlan[meal.toLowerCase()].length - 1 && (
                        <Divider sx={{ my: 2 }} />
                      )}
                    </Box>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Card>
        ))}

        <Box sx={{ mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Daily Nutrition Totals
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Typography color="textSecondary">
              Protein: {dietPlan.total_protein}g
            </Typography>
            <Typography color="textSecondary">
              Carbs: {dietPlan.total_carbs}g
            </Typography>
            <Typography color="textSecondary">
              Fat: {dietPlan.total_fat}g
            </Typography>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default DietPlan;