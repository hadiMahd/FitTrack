import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
  Collapse,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const theme = {
  primary: {
    main: '#7E57C2', // Purple
    light: '#B085F5',
    dark: '#4D2C91',
  },
  secondary: {
    main: '#673AB7', // Deep Purple
    light: '#9A67EA',
    dark: '#320B86',
  }
};

const DietPlans = () => {
  const navigate = useNavigate();
  const [meals, setMeals] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [selectedDietPlan, setSelectedDietPlan] = useState('');
  const [selectedMeal, setSelectedMeal] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [dietPlanDetails, setDietPlanDetails] = useState({});
  const [searchMeal, setSearchMeal] = useState('');
  const [searchPlan, setSearchPlan] = useState('');
  const [searchResults, setSearchResults] = useState({
    meals: [],
    plans: []
  });

  const [newMeal, setNewMeal] = useState({
    name: '',
    description: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
  });

  const [newDietPlan, setNewDietPlan] = useState({
    name: '',
    description: '',
  });

  const [expandedPlans, setExpandedPlans] = useState({});
  const [expandedMeals, setExpandedMeals] = useState({});

  const api = axios.create({
    baseURL: 'http://localhost:3000/admin',
    withCredentials: true,
  });

  useEffect(() => {
    fetchMeals();
    fetchDietPlans();
  }, []);

  useEffect(() => {
    dietPlans.forEach(plan => {
      fetchDietPlanDetails(plan.id);
    });
  }, [dietPlans]);

  const fetchMeals = async () => {
    try {
      const response = await api.get('/meals');
      console.log('Meals response:', response.data);
      setMeals(response.data);
    } catch (error) {
      console.error('Error fetching meals:', error);
      alert('Error loading meals');
    }
  };

  const fetchDietPlans = async () => {
    try {
      const response = await api.get('/diet-plans');
      console.log('Diet plans response:', response.data);
      setDietPlans(response.data);
    } catch (error) {
      console.error('Error fetching diet plans:', error);
      alert('Error loading diet plans');
    }
  };

  const fetchDietPlanDetails = async (planId) => {
    try {
      const response = await api.get(`/diet-plans/${planId}/meals`);
      setDietPlanDetails(prev => ({
        ...prev,
        [planId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching diet plan details:', error);
    }
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/meals', newMeal);
      setNewMeal({
        name: '',
        description: '',
        calories: '',
        protein: '',
        carbs: '',
        fats: '',
      });
      fetchMeals();
      alert('Meal added successfully');
    } catch (error) {
      console.error('Error adding meal:', error);
      alert('Error adding meal');
    }
  };

  const handleAddDietPlan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/diet-plans', newDietPlan);
      setNewDietPlan({
        name: '',
        description: '',
      });
      fetchDietPlans();
      alert('Diet plan added successfully');
    } catch (error) {
      console.error('Error adding diet plan:', error);
      alert('Error adding diet plan');
    }
  };

  const handleAddMealToDietPlan = async () => {
    if (!selectedDietPlan || !selectedMeal) {
      alert('Please select both a diet plan and a meal');
      return;
    }

    try {
      await api.post('/diet-plan-meals', {
        diet_plan_id: selectedDietPlan,
        meal_id: selectedMeal,
        meal_type: mealType,
      });
      alert('Meal added to diet plan successfully!');
    } catch (error) {
      console.error('Error adding meal to diet plan:', error);
      alert('Error adding meal to diet plan');
    }
  };

  const handleSearchMeals = (searchTerm) => {
    setSearchMeal(searchTerm);
    const filtered = meals.filter(meal => 
      meal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meal.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(prev => ({ ...prev, meals: filtered }));
  };

  const handleSearchPlans = (searchTerm) => {
    setSearchPlan(searchTerm);
    const filtered = dietPlans.filter(plan => 
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(prev => ({ ...prev, plans: filtered }));
  };

  const handleDeleteDietPlan = async (planId) => {
    try {
      await api.delete(`/diet-plans/${planId}`);
      fetchDietPlans();
      alert('Diet plan deleted successfully');
    } catch (error) {
      console.error('Error deleting diet plan:', error);
      alert('Error deleting diet plan');
    }
  };

  const handleDeleteMeal = async (mealId) => {
    try {
      await api.delete(`/meals/${mealId}`);
      fetchMeals();
      alert('Meal deleted successfully');
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Error deleting meal');
    }
  };

  const handleExpandPlan = (planId) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  const handleExpandMeal = (mealId) => {
    setExpandedMeals(prev => ({
      ...prev,
      [mealId]: !prev[mealId]
    }));
  };

  return (
    <Container maxWidth="xl">
      <Box my={4}>
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center" 
          mb={4}
          sx={{
            backgroundColor: theme.primary.light,
            padding: '20px',
            borderRadius: '8px',
          }}
        >
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              color: 'white',
              margin: 0
            }}
          >
            Diet Plans Management
          </Typography>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'white',
              color: theme.primary.main,
              '&:hover': {
                backgroundColor: theme.primary.dark,
                color: 'white',
              },
            }}
            onClick={() => navigate('/admin/dashboard')}
          >
            Go Back
          </Button>
        </Box>

        <Grid container spacing={4}>
          {/* Add New Meal Form */}
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                border: `1px solid ${theme.primary.light}`,
                '& .MuiCardContent-root': {
                  borderTop: `4px solid ${theme.primary.main}`,
                }
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Add New Meal
                </Typography>
                <form onSubmit={handleAddMeal}>
                  <TextField
                    fullWidth
                    label="Meal Name"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: theme.primary.main,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: theme.primary.main,
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Description"
                    value={newMeal.description}
                    onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })}
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: theme.primary.main,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: theme.primary.main,
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Calories"
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: theme.primary.main,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: theme.primary.main,
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Protein (g)"
                    type="number"
                    value={newMeal.protein}
                    onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: theme.primary.main,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: theme.primary.main,
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Carbs (g)"
                    type="number"
                    value={newMeal.carbs}
                    onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: theme.primary.main,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: theme.primary.main,
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Fats (g)"
                    type="number"
                    value={newMeal.fats}
                    onChange={(e) => setNewMeal({ ...newMeal, fats: e.target.value })}
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: theme.primary.main,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: theme.primary.main,
                      },
                    }}
                  />
                  <Button 
                    type="submit" 
                    variant="contained" 
                    sx={{ 
                      mt: 2,
                      backgroundColor: theme.primary.main,
                      '&:hover': {
                        backgroundColor: theme.primary.dark,
                      },
                    }}
                  >
                    Add Meal
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Grid>

          {/* Add New Diet Plan Form */}
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                border: `1px solid ${theme.primary.light}`,
                '& .MuiCardContent-root': {
                  borderTop: `4px solid ${theme.primary.main}`,
                }
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Add New Diet Plan
                </Typography>
                <form onSubmit={handleAddDietPlan}>
                  <TextField
                    fullWidth
                    label="Diet Plan Name"
                    value={newDietPlan.name}
                    onChange={(e) => setNewDietPlan({ ...newDietPlan, name: e.target.value })}
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: theme.primary.main,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: theme.primary.main,
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Description"
                    value={newDietPlan.description}
                    onChange={(e) => setNewDietPlan({ ...newDietPlan, description: e.target.value })}
                    margin="normal"
                    multiline
                    rows={4}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: theme.primary.main,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: theme.primary.main,
                      },
                    }}
                  />
                  <Button 
                    type="submit" 
                    variant="contained" 
                    sx={{ 
                      mt: 2,
                      backgroundColor: theme.primary.main,
                      '&:hover': {
                        backgroundColor: theme.primary.dark,
                      },
                    }}
                  >
                    Add Diet Plan
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Grid>

          {/* Add Meal to Diet Plan Form */}
          <Grid item xs={12}>
            <Card 
              sx={{ 
                border: `1px solid ${theme.primary.light}`,
                '& .MuiCardContent-root': {
                  borderTop: `4px solid ${theme.primary.main}`,
                }
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Add Meal to Diet Plan
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <FormControl 
                      fullWidth 
                      margin="normal" 
                      sx={{ 
                        minWidth: 200,
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: theme.primary.main,
                          },
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: theme.primary.main,
                        },
                      }}
                    >
                      <InputLabel>Select Diet Plan</InputLabel>
                      <Select
                        value={selectedDietPlan}
                        onChange={(e) => setSelectedDietPlan(e.target.value)}
                      >
                        {dietPlans.map((plan) => (
                          <MenuItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl 
                      fullWidth 
                      margin="normal" 
                      sx={{ 
                        minWidth: 200,
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: theme.primary.main,
                          },
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: theme.primary.main,
                        },
                      }}
                    >
                      <InputLabel>Select Meal</InputLabel>
                      <Select
                        value={selectedMeal}
                        onChange={(e) => setSelectedMeal(e.target.value)}
                      >
                        {meals.map((meal) => (
                          <MenuItem key={meal.id} value={meal.id}>
                            {meal.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl 
                      fullWidth 
                      margin="normal" 
                      sx={{ 
                        minWidth: 200,
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: theme.primary.main,
                          },
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: theme.primary.main,
                        },
                      }}
                    >
                      <InputLabel>Meal Type</InputLabel>
                      <Select
                        value={mealType}
                        onChange={(e) => setMealType(e.target.value)}
                      >
                        <MenuItem value="breakfast">Breakfast</MenuItem>
                        <MenuItem value="lunch">Lunch</MenuItem>
                        <MenuItem value="dinner">Dinner</MenuItem>
                        <MenuItem value="snack">Snack</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Button
                  variant="contained"
                  sx={{ 
                    mt: 3, 
                    mb: 1,
                    backgroundColor: theme.primary.main,
                    '&:hover': {
                      backgroundColor: theme.primary.dark,
                    },
                  }}
                  onClick={handleAddMealToDietPlan}
                >
                  Add Meal to Diet Plan
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Diet Plans List with Search */}
          <Grid item xs={12}>
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                mt: 4, 
                mb: 2,
                color: theme.primary.main,
                borderBottom: `2px solid ${theme.primary.main}`,
                paddingBottom: '8px',
              }}
            >
              Diet Plans
            </Typography>
            <TextField
              fullWidth
              label="Search Diet Plans"
              value={searchPlan}
              onChange={(e) => handleSearchPlans(e.target.value)}
              margin="normal"
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: theme.primary.main,
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: theme.primary.main,
                },
              }}
            />
            {(searchPlan ? searchResults.plans : dietPlans.slice(0, 5)).map((plan) => (
              <Card 
                key={plan.id} 
                sx={{ 
                  mb: 2,
                  border: `1px solid ${theme.primary.light}`,
                  '& .MuiCardContent-root': {
                    borderTop: `4px solid ${theme.primary.main}`,
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <div>
                      <Typography variant="h6">{plan.name}</Typography>
                    </div>
                    <Box display="flex" alignItems="center">
                      <IconButton 
                        onClick={() => handleExpandPlan(plan.id)}
                        sx={{ transform: expandedPlans[plan.id] ? 'rotate(180deg)' : 'none' }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => handleDeleteDietPlan(plan.id)}
                        sx={{
                          minWidth: 'auto',
                          ml: 2
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                  <Collapse in={expandedPlans[plan.id]} timeout="auto" unmountOnExit>
                    <Typography color="textSecondary" gutterBottom>
                      {plan.description}
                    </Typography>
                    <List>
                      {dietPlanDetails[plan.id]?.map((meal, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={meal.meal_name}
                            secondary={`${meal.meal_type} - ${meal.calories} calories, Protein: ${meal.protein}g, Carbs: ${meal.carbs}g, Fats: ${meal.fats}g`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </CardContent>
              </Card>
            ))}
          </Grid>

          {/* Meals List with Search */}
          <Grid item xs={12}>
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                mt: 4, 
                mb: 2,
                color: theme.primary.main,
                borderBottom: `2px solid ${theme.primary.main}`,
                paddingBottom: '8px',
              }}
            >
              Available Meals
            </Typography>
            <TextField
              fullWidth
              label="Search Meals"
              value={searchMeal}
              onChange={(e) => handleSearchMeals(e.target.value)}
              margin="normal"
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: theme.primary.main,
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: theme.primary.main,
                },
              }}
            />
            <Grid container spacing={2}>
              {(searchMeal ? searchResults.meals : meals.slice(0, 6)).map((meal) => (
                <Grid item xs={12} md={6} lg={4} key={meal.id}>
                  <Card 
                    sx={{ 
                      border: `1px solid ${theme.primary.light}`,
                      '& .MuiCardContent-root': {
                        borderTop: `4px solid ${theme.primary.main}`,
                      }
                    }}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="h6">{meal.name}</Typography>
                        <Box display="flex" alignItems="center">
                          <IconButton 
                            onClick={() => handleExpandMeal(meal.id)}
                            sx={{ transform: expandedMeals[meal.id] ? 'rotate(180deg)' : 'none' }}
                          >
                            <ExpandMoreIcon />
                          </IconButton>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => handleDeleteMeal(meal.id)}
                            sx={{
                              minWidth: 'auto',
                              ml: 2
                            }}
                          >
                            Delete
                          </Button>
                        </Box>
                      </Box>
                      <Collapse in={expandedMeals[meal.id]} timeout="auto" unmountOnExit>
                        <Typography color="textSecondary" gutterBottom>
                          {meal.description}
                        </Typography>
                        <Typography variant="body2">
                          Calories: {meal.calories} kcal<br />
                          Protein: {meal.protein}g<br />
                          Carbs: {meal.carbs}g<br />
                          Fats: {meal.fats}g
                        </Typography>
                      </Collapse>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default DietPlans;