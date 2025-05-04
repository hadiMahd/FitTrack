import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkoutPlan from '../components/WorkoutPlan';
import DietPlan from '../components/DietPlan';
import axios from 'axios';
const apiKeyy = import.meta.env.REACT_APP_GOOGLE_GENAI_API_KEY;

import { 
  CircularProgress, 
  Alert,
  ThemeProvider,
  createTheme,
  Box,
  Container,
  Typography,
  Button 
} from '@mui/material';

import { GoogleGenAI } from "@google/genai";
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
//const ai = new GoogleGenAI({ apiKey: apiKeyy });

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true
});

const theme = createTheme({
  palette: {
    primary: {
      main: '#5E58D5',
    },
  },
});

const UserDashboard = () => {
  const workoutPlanRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [dailyTip, setDailyTip] = useState('Loading your daily tip...');
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tipLoading, setTipLoading] = useState(true);
  const navigate = useNavigate();

  const [userData, setUserData] = useState({
    name: "User",
    stats: {
      exercises_completed: 0
    },
    goals: {
      exercises: 5
    }
  });

  const [userProfile, setUserProfile] = useState({
    creation_time: null,
    fname: '',
    lname: '',
    height: 0,
    weight: 0,
    gender: '',
    fitness_goal: '',
    number_of_training_days: 0,
    workout_plan_id: null,
    diet_plan_id: null
  });

  const [todayStats, setTodayStats] = useState({
    exercises_completed: 0,
    total_exercises: 0,
    recent_logs: []
  });

  const handleWorkoutStatsChange = (stats) => {
    console.log('Received workout stats in UserDashboard:', stats);
    if (stats.total > 0) { // Only update if there are exercises
      setTodayStats(prevStats => ({
        ...prevStats,
        exercises_completed: stats.completed,
        total_exercises: stats.total
      }));
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchRecentLogs(),
          fetchDailyTip(),
          fetchDailyChallenge(),
          fetchUserData()
        ]);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const fetchRecentLogs = async () => {
    try {
      const response = await api.get('/api/user/exercise-logs/recent');
      setRecentLogs(response.data);
    } catch (error) {
      console.error('Error fetching recent logs:', error);
    }
  };

  const fetchDailyTip = async () => {
    try {
      setTipLoading(true);
      const response = await api.get('/gemini/daily-tip');
      if (response.data && response.data.tip) {
        setDailyTip(response.data.tip);
      } else {
        throw new Error('Invalid tip format');
      }
    } catch (error) {
      console.error('Error fetching daily tip:', error);
      setDailyTip('Stay hydrated and maintain good form during exercises.');
    } finally {
      setTipLoading(false);
    }
  };
  
  const fetchDailyChallenge = async () => {
    try {
      const response = await api.get('/gemini/daily-challenge');
      // Ensure proper data structure and parsing
      const exercises = response.data.exercises.map(exercise => ({
        name: exercise.name,
        // Convert string values to numbers and ensure either reps or duration exists
        reps: exercise.reps ? parseInt(exercise.reps) : undefined,
        duration: exercise.duration ? parseInt(exercise.duration) : undefined
      }));
      
      setDailyChallenge({ exercises });
    } catch (error) {
      console.error('Error fetching daily challenge:', error);
      // Fallback content with consistent format
      setDailyChallenge({
        exercises: [
          { name: "Jumping Jacks", duration: 30 },
          { name: "Push-ups", reps: 10 },
          { name: "Mountain Climbers", duration: 30 },
          { name: "Squats", reps: 15 }
        ]
      });
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await api.get('/api/user/profile');
      const todayStats = await api.get('/api/user/today-stats');
      
      // Store complete user profile
      setUserProfile(response.data.profile);
      
      // Update existing userData state
      setUserData({
        name: `${response.data.profile.fname} ${response.data.profile.lname}`,
        stats: {
          exercises_completed: todayStats.data.exercises_completed || 0
        },
        goals: {
          exercises: todayStats.data.total_exercises || 5
        }
      });

      setRecentLogs(todayStats.data.recent_logs || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user profile');
    }
  };

  const calculateProgress = (current, goal) => {
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  const renderStatsCard = () => {
    const progress = Math.min(
      ((todayStats.exercises_completed || 0) / (userData.goals.exercises || 1)) * 100, 
      100
    );

    return (
      <div style={styles.statsGrid}>
        <div style={styles.statsCard}>
          <h3 style={styles.statsTitle}>Exercises Completed Today</h3>
          <div style={styles.statsNumbers}>
            <span style={styles.currentStat}>{todayStats.exercises_completed || 0}</span>
            <span style={styles.goalStat}> / {userData.goals.exercises || 0}</span>
          </div>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${progress}%`
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderRecentActivity = () => (
    <Box sx={styles.card}>
      <Typography variant="h6" gutterBottom>📝 Today's Activity</Typography>
      {recentLogs.length > 0 ? (
        recentLogs.map((log) => (
          // Use unique combination of exercise_id and log_date as key
          <Box 
            key={`${log.exercise_id}-${new Date(log.log_date).getTime()}`} 
            sx={styles.logItem}
          >
            <Box>
              <Typography sx={styles.logExercise}>{log.exercise_name}</Typography>
              <Typography sx={styles.logDetails}>
                {log.sets} sets × {log.reps} reps
              </Typography>
            </Box>
            <Typography sx={styles.logWeight}>{log.weight}kg</Typography>
          </Box>
        ))
      ) : (
        <Typography color="textSecondary">No exercises completed today</Typography>
      )}
    </Box>
  );

  const renderContent = () => {
    return (
      <Box>
        {/* Hidden WorkoutPlan to load initial stats */}
        <Box sx={{ display: 'none' }}>
          <WorkoutPlan ref={workoutPlanRef} onStatsChange={handleWorkoutStatsChange} />
        </Box>

        {activeTab === 'workout-plan' ? (
          <WorkoutPlan onStatsChange={handleWorkoutStatsChange} />
        ) : activeTab === 'diet-plan' ? (
          <DietPlan />
        ) : (
          <Box>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" gutterBottom>
                Welcome back, {userProfile.fname}!
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 4 }}>
              <Box sx={styles.statsCard}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <FitnessCenterIcon sx={{ mr: 1, color: '#5E58D5' }} />
                  <Typography variant="h6">Today's Progress</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                  <Typography variant="h4" sx={{ mr: 1, color: '#333' }}>
                    {todayStats.exercises_completed}
                  </Typography>
                  <Typography variant="h6" color="textSecondary">
                    / {todayStats.total_exercises}
                  </Typography>
                </Box>
                <Box sx={styles.progressBar}>
                  <Box sx={{
                    ...styles.progressFill,
                    width: `${(todayStats.exercises_completed / (todayStats.total_exercises || 1)) * 100}%`,
                    bgcolor: '#5E58D5',
                    transition: 'width 0.3s ease-in-out'
                  }} />
                </Box>
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  {todayStats.total_exercises - todayStats.exercises_completed} exercises remaining
                </Typography>
              </Box>
            </Box>

            {/* Recent Activity */}
            {renderRecentActivity()}

            {/* Daily Tip */}
            <Box sx={styles.card}>
              <Typography variant="h6" gutterBottom>💡 Tip of the Day</Typography>
              {tipLoading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={20} />
                </Box>
              ) : dailyTip ? (
                <Typography>{dailyTip}</Typography>
              ) : (
                <Typography color="textSecondary">Unable to load tip</Typography>
              )}
            </Box>

            {/* HIIT Challenge */}
            <Box sx={styles.card}>
              <Typography variant="h6" gutterBottom>🏃 Today's HIIT Challenge</Typography>
              {dailyChallenge ? (
                <Box>
                  <Typography sx={{ mb: 2 }}>10-minute HIIT Workout:</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {dailyChallenge.exercises?.map((exercise, index) => {
                      // Parse both values to ensure they're numbers
                      const reps = parseInt(exercise.reps);
                      const duration = parseInt(exercise.duration);
                      
                      return (
                        <Box 
                          key={index}
                          sx={{
                            p: 2,
                            bgcolor: '#f8f8f8',
                            borderRadius: 1,
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}
                        >
                          <Typography>{exercise.name}</Typography>
                          <Typography color="textSecondary">
                            {!isNaN(duration) ? `${duration} seconds` : 
                             !isNaN(reps) ? `${reps} reps` : 
                             '15 reps' /* fallback */}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                  <Typography sx={{ mt: 2, color: 'text.secondary' }}>
                    Perform each exercise with maximum effort, rest 30 seconds between exercises
                  </Typography>
                </Box>
              ) : (
                <Typography color="textSecondary">Loading challenge...</Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={styles.container}>
        <Box sx={styles.header}>
          <Box sx={styles.headerContent}>
            <Typography variant="h4" sx={styles.logo}>
              FitTrack
            </Typography>
            <Box sx={styles.nav}>
              <Button 
                sx={activeTab === 'dashboard' ? styles.activeNavButton : styles.navButton}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </Button>
              <Button 
                sx={activeTab === 'workout-plan' ? styles.activeNavButton : styles.navButton}
                onClick={() => setActiveTab('workout-plan')}
              >
                Workout Plan
              </Button>
              <Button 
                sx={activeTab === 'diet-plan' ? styles.activeNavButton : styles.navButton}
                onClick={() => setActiveTab('diet-plan')}
              >
                Diet Plan
              </Button>
            </Box>
            <Box sx={styles.profile}>
              <Typography>
                Hi, {userProfile.fname || 'User'} {/* Use first name only in header */}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Container sx={styles.main}>
          {renderContent()}
        </Container>
      </Box>
    </ThemeProvider>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    bgcolor: '#f5f5f5',
  },
  header: {
    bgcolor: '#5E58D5',
    color: 'white',
    p: 2,
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    mx: 'auto',
  },
  logo: {
    fontWeight: 'bold',
  },
  nav: {
    display: 'flex',
    gap: 2,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  navButton: {
    color: 'white',
    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  activeNavButton: {
    bgcolor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
  },
  profile: {
    position: 'relative',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '1200px',
    p: 3,
  },
  welcomeSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 4,
  },
  welcomeText: {
    fontWeight: 'bold',
    color: '#333',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 2,
    mb: 4,
  },
  statsCard: {
    bgcolor: 'white',
    borderRadius: 1,
    boxShadow: 1,
    p: 3,
  },
  card: {
    bgcolor: 'white',
    borderRadius: 1,
    boxShadow: 1,
    p: 3,
    mb: 2,
  },
  logItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    p: 2,
    bgcolor: '#f8f8f8',
    borderRadius: 1,
    mb: 1,
  },
  statsTitle: {
    color: '#666',
    mb: 1,
  },
  statsNumbers: {
    mb: 2,
  },
  currentStat: {
    fontWeight: 'bold',
    color: '#333',
  },
  goalStat: {
    color: '#666',
  },
  progressBar: {
    height: 8,
    bgcolor: '#eee',
    borderRadius: 1,
    overflow: 'hidden', // Add this to prevent overflow
  },
  progressFill: {
    height: '100%',
    bgcolor: '#5E58D5',
    borderRadius: 1,
    transition: 'width 0.3s ease',
    maxWidth: '100%', // Add this to prevent overflow
  },
  tipCard: {
    bgcolor: 'white',
    p: 3,
    borderRadius: 2,
    boxShadow: 1,
    mb: 3,
  },
  cardTitle: {
    fontWeight: 'bold',
    mb: 2,
    color: '#333',
  },
  tipText: {
    color: '#666',
    lineHeight: 1.5,
  },
  logsCard: {
    bgcolor: 'white',
    p: 3,
    borderRadius: 2,
    boxShadow: 1,
    mb: 3,
  },
  logsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  emptyState: {
    textAlign: 'center',
    color: '#666',
    padding: '16px',
  },
  logTime: {
    marginLeft: '8px',
    color: '#666',
    fontSize: '14px',
  },
  logWeight: {
    fontWeight: '500',
    color: '#5E58D5',
  },
  logExercise: {
    fontWeight: '500',
    color: '#333',
  },
  logDetails: {
    color: '#666',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    color: '#666',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '400px',
    color: '#ff4444',
    p: 4,
  },
};

export default UserDashboard;