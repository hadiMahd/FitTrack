import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkoutPlan from '../components/WorkoutPlan';
import DietPlan from '../components/DietPlan';
import ProfileSettings from '../components/ProfileSettings';
import ProgressCharts from '../components/ProgressCharts';
import Footer from '../components/Footer';
import api from '../utils/axiosConfig';
import FloatingChat from '../components/AiChat';

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
  const [recentLogs, setRecentLogs] = useState([]);
  const [dailyTip, setDailyTip] = useState('Loading your daily tip...');
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [tipLoading, setTipLoading] = useState(true);
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState({
    creation_time: null,
    fname: '',
    lname: '',
    birth_date: null,
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
    setTodayStats(prev => ({
      ...prev,
      exercises_completed: stats.completed,
      total_exercises: stats.total
    }));
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await Promise.all([
          fetchRecentLogs(),
          fetchDailyTip(),
          fetchDailyChallenge(),
          fetchUserData()
        ]);
      } catch (err) {
        console.error('Dashboard loading error:', err);
      }
    };

    fetchAllData();
  }, []);

  const fetchRecentLogs = async () => {
    try {
      const response = await api.get('/api/user/exercise-logs/today'); // Changed from /recent to /today
      setRecentLogs(response.data);
    } catch (error) {
      console.error('Error fetching today\'s logs:', error);
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
      console.log('Raw challenge response:', response.data); // Debug log
      
      // Map the exercises with correct field names
      const exercises = response.data.exercises.map(exercise => ({
        name: exercise.name,
        reps: exercise.reps,
        duration_seconds: exercise.duration_seconds // Change duration to duration_seconds
      }));
      
      console.log('Processed exercises:', exercises); // Debug log
      setDailyChallenge({ exercises });
    } catch (error) {
      console.error('Error fetching daily challenge:', error);
      setDailyChallenge({
        exercises: [
          { name: "Jumping Jacks", duration_seconds: 30 },
          { name: "Push-ups", reps: 10 },
          { name: "Mountain Climbers", duration_seconds: 30 },
          { name: "Squats", reps: 15 }
        ]
      });
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await api.get('/api/user/profile');
      const todayStatsResponse = await api.get('/api/user/today-stats');
      
      // Store complete user profile
      setUserProfile(response.data.profile);
      
      // Update todayStats with backend data
      setTodayStats(todayStatsResponse.data);

    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

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

  const renderStatsCard = () => {
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 4 }}>
        <Box sx={styles.statsCard}>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <FitnessCenterIcon sx={{ mr: 1, color: '#5E58D5', fontSize: 28 }} />
              <Typography variant="h6">Today's Progress</Typography>
            </Box>
            
            <Typography 
              variant="h2" 
              sx={{ 
                color: '#5E58D5',
                fontWeight: 'bold',
                my: 3,
                fontSize: '4rem'
              }}
            >
              {todayStats.exercises_completed}
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
        </Box>
      </Box>
    );
  };

  const renderRecentActivity = () => (
    <Box sx={styles.card}>
      <Typography variant="h6" gutterBottom>📝 Today's Activity</Typography>
      {recentLogs.length > 0 ? (
        recentLogs.map((log) => (
          <Box 
            key={`${log.exercise_id}-${new Date(log.log_date).getTime()}`} 
            sx={styles.logItem}
          >
            <Box>
              <Typography sx={styles.logExercise}>
                {log.exercise_name}
              </Typography>
              <Typography sx={styles.logDetails}>
                {log.sets} sets × {log.reps} reps
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {log.weight > 0 && (
                <Typography sx={styles.logWeight}>{log.weight}kg</Typography>
              )}
              <Typography sx={{ color: 'success.main', fontSize: '0.875rem' }}>
                ✓ Completed
              </Typography>
            </Box>
          </Box>
        ))
      ) : (
        <Typography color="textSecondary">
          No exercises completed today
        </Typography>
      )}
    </Box>
  );

  const renderContent = () => {
    return (
      <Box>
        {activeTab === 'profile' ? (
          <ProfileSettings 
            userProfile={userProfile} 
            onProfileUpdate={(updatedProfile) => setUserProfile(updatedProfile)}
          />
        ) : activeTab === 'workout-plan' ? (
          <WorkoutPlan 
            onStatsChange={handleWorkoutStatsChange} 
            userProfile={userProfile}
            ref={workoutPlanRef} 
          />
        ) : activeTab === 'progress-stats' ? (
          <ProgressCharts />
        ) : activeTab === 'diet-plan' ? (
          <DietPlan userProfile={userProfile} />
        ) : (
          <Box>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" gutterBottom>
                Welcome back, {userProfile.fname}!
              </Typography>
            </Box>

            {renderStatsCard()}

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
                    {dailyChallenge.exercises?.map((exercise, index) => (
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
                          {exercise.duration_seconds ? `${exercise.duration_seconds} seconds` : 
                           exercise.reps ? `${exercise.reps} reps` : 
                           '15 reps' /* fallback */}
                        </Typography>
                      </Box>
                    ))}
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
      <Box sx={{ 
        ...styles.container,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <Box sx={styles.header}>
          <Box sx={{
            ...styles.headerContent,
            flexDirection: 'column',
            gap: 2,
            py: 2
          }}>
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              px: 2
            }}>
              <Box sx={{ width: 100 }} /> {/* Spacer for balance */}
              <Typography 
                variant="h4" 
                sx={{ 
                  ...styles.logo,
                  cursor: 'pointer',
                  textAlign: 'center',
                  '&:hover': {
                    opacity: 0.8
                  }
                }}
                onClick={() => navigate('/')}
              >
                FitTrack
              </Typography>
              <Button
                sx={{
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                  width: 100
                }}
                onClick={async () => {
                  try {
                    await api.get('/api/auth/logout');
                    localStorage.removeItem('token');
                    navigate('/');
                  } catch (error) {
                    console.error('Logout error:', error);
                  }
                }}
              >
                Logout
              </Button>
            </Box>

            <Box sx={{
              ...styles.nav,
              width: '100%',
              justifyContent: 'center'
            }}>
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
                sx={activeTab === 'progress-stats' ? styles.activeNavButton : styles.navButton}
                onClick={() => setActiveTab('progress-stats')}
              >
                Progress Stats
              </Button>
              <Button 
                sx={activeTab === 'diet-plan' ? styles.activeNavButton : styles.navButton}
                onClick={() => setActiveTab('diet-plan')}
              >
                Diet Plan
              </Button>
              <Button 
                sx={activeTab === 'profile' ? styles.activeNavButton : styles.navButton}
                onClick={() => setActiveTab('profile')}
              >
                Profile Settings
              </Button>
            </Box>
          </Box>
        </Box>

        <Container sx={{ ...styles.main, flex: 1 }}>
          {renderContent()}
        </Container>

        <Footer />
        <FloatingChat />
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
    transition: 'transform 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: 2,
    },
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