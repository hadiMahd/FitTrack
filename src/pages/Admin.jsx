import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import React from 'react';
import { Container, Box, Button, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const AdminDashboard = () => {
  const [moderatorEmail, setModeratorEmail] = useState('');
  const [deleteEmail, setDeleteEmail] = useState('');
  const [analytics, setAnalytics] = useState({ daily: 0, weekly: 0, monthly: 0 });
  const [messages, setMessages] = useState([]);
  const [moderators, setModerators] = useState([]);
  const [workoutPlan, setWorkoutPlan] = useState({
    name: '',
    description: '',
    num_of_days: ''
  });
  const [exercise, setExercise] = useState({
    name: '',
    description: '',
    sets: '',
    reps: ''
  });
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [expandedExercises, setExpandedExercises] = useState({});
  const [expandedPlans, setExpandedPlans] = useState({});
  const navigate = useNavigate();
  
  const newMessages = messages.filter(message => message.status === 'new');
  const seenMessages = messages.filter(message => message.status === 'seen');

  const api= axios.create({
    baseURL: 'http://localhost:3000/admin',
    withCredentials: true,
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, messagesRes, moderatorsRes, workoutPlansRes, exercisesRes] = await Promise.all([
          api.get('/analytics'),
          api.get('/messages'),
          api.get('/moderators'),
          api.get('/workout-plans'),
          api.get('/exercises')
        ]);
        
        setAnalytics(analyticsRes.data);
        setMessages(messagesRes.data);
        setModerators(moderatorsRes.data);
        setWorkoutPlans(workoutPlansRes.data);
        setExercises(exercisesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Add moderator
  const handleAddModerator = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/moderators', { email: moderatorEmail });
      setModerators([...moderators, response.data]);
      setModeratorEmail('');
      alert('Moderator added successfully');
    } catch (error) {
      alert(`Error adding moderator: ${error.response?.data?.error || error.message}`);
    }
  };

  // Remove moderator
  const handleDeleteModerator = async (e) => {
    e.preventDefault();
    try {
      await api.delete(`/moderators/${deleteEmail}`);
      setModerators(moderators.filter(m => m.email !== deleteEmail));
      setDeleteEmail('');
      alert('Moderator removed successfully');
    } catch (error) {
      alert(`Error removing moderator: ${error.response?.data?.error || error.message}`);
    }
  };

  // Mark message status
  const handleMarkStatus = async (messageId, newStatus) => {
    try {
      await api.patch(`/messages/${messageId}/status`, { status: newStatus });
      setMessages(messages.map(message => 
        message.id === messageId 
          ? { ...message, status: newStatus }
          : message
      ));
    } catch (error) {
      alert(`Error updating message status: ${error.response?.data?.error || error.message}`);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages(messages.filter(message => message.id !== messageId));
      alert('Message deleted successfully');
    } catch (error) {
      alert(`Error deleting message: ${error.response?.data?.error || error.message}`);
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      await axios.get('/api/auth/logout', { withCredentials: true });
      alert('Logged out successfully');
      navigate('/login');
    } catch (error) {
      alert('Error logging out: ' + error.message);
    }
  };

  const handleWorkoutPlanSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/add-workout-plans', workoutPlan);
      setWorkoutPlan({ name: '', description: '', num_of_days: '' });
      alert('Workout plan added successfully');
    } catch (error) {
      alert(`Error adding workout plan: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleExerciseSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exercises', exercise);
      setExercise({ name: '', description: '', sets: '', reps: '' });
      alert('Exercise added successfully');
    } catch (error) {
      alert(`Error adding exercise: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleEditPlan = (planId) => {
    navigate(`/admin/workout-plans/${planId}/edit`);
  };

  const handleDeleteExercise = async (exerciseId) => {
    try {
      await api.delete(`/exercises/${exerciseId}`);
      setExercises(exercises.filter(exercise => exercise.id !== exerciseId));
      alert('Exercise deleted successfully');
    } catch (error) {
      alert(`Error deleting exercise: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleExpandExercise = (exerciseId) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const handleExpandPlan = (planId) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <div style={styles.container}>
          {/* Header with FitTrack logo and Logout button */}
          <header style={styles.header}>
            <div style={styles.logoContainer}>
              <h1 style={styles.logoText}>FitTrack</h1>
            </div>
            <h1 style={styles.pageHeader}>Admin Dashboard</h1>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </header>

          {/* Add Moderator Section */}
          <section style={styles.section}>
            <h2>Add Moderator</h2>
            <form onSubmit={handleAddModerator} style={styles.form}>
              <input
                type="email"
                placeholder="Enter moderator email"
                value={moderatorEmail}
                onChange={(e) => setModeratorEmail(e.target.value)}
                style={styles.input}
                required
              />
              <button type="submit" style={styles.button}>Add Moderator</button>
            </form>
          </section>

          {/* Remove Moderator Section */}
          <section style={styles.section}>
            <h2>Remove User</h2>
            <form onSubmit={handleDeleteModerator} style={styles.form}>
              <input
                type="email"
                placeholder="Enter user email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                style={styles.input}
                required
              />
              <button type="submit" style={{ ...styles.button, backgroundColor: '#ff4444' }}>
                Remove User
              </button>
            </form>
          </section>

          {/* Moderators List Section */}
          <section style={styles.section}>
            <h2>Current Moderators ({moderators.length})</h2>
            <div style={styles.usersList}>
              <div style={{...styles.userItem, fontWeight: 'bold'}}>
                <span>Name</span>
                <span>Email</span>
                <span>Joined At</span>
              </div>
              {moderators.map(moderator => (
                <div key={moderator.id} style={styles.userItem}>
                  <span>{moderator.fname} {moderator.lname}</span>
                  <span>{moderator.email}</span>
                  <span>{new Date(moderator.creation_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Analytics Section */}
          <section style={styles.section}>
            <h2>Active Users</h2>
            <div style={styles.analyticsGrid}>
              <div style={styles.analyticsCard}>
                <h3>Daily</h3>
                <p style={styles.analyticsNumber}>
                  {analytics.dailyActiveUsers}
                </p>
              </div>
              <div style={styles.analyticsCard}>
                <h3>Weekly</h3>
                <p style={styles.analyticsNumber}>
                  {analytics.weeklyActiveUsers}
                </p>
              </div>
              <div style={styles.analyticsCard}>
                <h3>Monthly</h3>
                <p style={styles.analyticsNumber}>
                  {analytics.monthlyActiveUsers}
                </p>
              </div>
            </div>
          </section>

          {/* Messages Section */}
          <section style={styles.section}>
            <h2>Messages</h2>
            <div style={styles.messageSection}>
              <h3 style={styles.sectionHeader}>New Messages</h3>
              <div style={styles.messagesContainer}>
                {newMessages.map(message => (
                  <div key={message.id} style={{...styles.messageCard, borderLeft: '4px solid #ff4444'}}>
                    <div style={styles.statusBadge}>New</div>
                    <div style={styles.isolatedContent}>
                      <p style={styles.messageContent}>
                        {message.content}
                      </p>
                    </div>
                    <div style={styles.messageMeta}>
                      <div style={styles.metaLeft}>
                        <span>Type: {message.message_type}</span>
                        <span>From: {message.email}</span>
                        <span>Status: {message.status}</span>
                      </div>
                      <div style={styles.metaRight}>
                        <span>{new Date(message.created_at).toLocaleString()}</span>
                        <span>User ID: {message.user_id}</span>
                      </div>
                    </div>
                    {(message.fname || message.lname) && (
                      <div style={styles.nameContainer}>
                        <span>Name: {message.fname} {message.lname}</span>
                      </div>
                    )}
                    <div style={styles.buttonContainer}>
                      <button 
                        onClick={() => handleMarkStatus(message.id, 'seen')}
                        style={styles.seenButton}
                      >
                        Mark as Seen
                      </button>
                      <button 
                        onClick={() => handleDeleteMessage(message.id)}
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={styles.messageSection}>
              <h3 style={styles.sectionHeader}>Seen Messages</h3>
              <div style={styles.messagesContainer}>
                {seenMessages.map(message => (
                  <div key={message.id} style={{...styles.messageCard, borderLeft: '4px solid #4CAF50'}}>
                    <div style={styles.statusBadge}>Seen</div>
                    <div style={styles.isolatedContent}>
                      <p style={styles.messageContent}>
                        {message.content}
                      </p>
                    </div>
                    <div style={styles.messageMeta}>
                      <div style={styles.metaLeft}>
                        <span>Type: {message.message_type}</span>
                        <span>From: {message.email}</span>
                        <span>Status: {message.status}</span>
                      </div>
                      <div style={styles.metaRight}>
                        <span>{new Date(message.created_at).toLocaleString()}</span>
                        <span>User ID: {message.user_id}</span>
                      </div>
                    </div>
                    {(message.fname || message.lname) && (
                      <div style={styles.nameContainer}>
                        <span>Name: {message.fname} {message.lname}</span>
                      </div>
                    )}
                    <div style={styles.buttonContainer}>
                      <button 
                        onClick={() => handleMarkStatus(message.id, 'new')}
                        style={styles.newButton}
                      >
                        Mark as New
                      </button>
                      <button 
                        onClick={() => handleDeleteMessage(message.id)}
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Workout Plan Section */}
          <section style={styles.section}>
            <h2>Add Workout Plan</h2>
            <form onSubmit={handleWorkoutPlanSubmit} style={styles.form}>
              <input
                type="text"
                placeholder="Plan Name"
                value={workoutPlan.name}
                onChange={(e) => setWorkoutPlan({...workoutPlan, name: e.target.value})}
                style={styles.input}
                required
              />
              <textarea
                placeholder="Plan Description"
                value={workoutPlan.description}
                onChange={(e) => setWorkoutPlan({...workoutPlan, description: e.target.value})}
                style={{...styles.input, minHeight: '100px'}}
                required
              />
              <input
                type="number"
                placeholder="Number of Days"
                value={workoutPlan.num_of_days}
                onChange={(e) => setWorkoutPlan({...workoutPlan, num_of_days: e.target.value})}
                style={styles.input}
                min="1"
                max="30"
                required
              />
              <button type="submit" style={styles.button}>
                Add Workout Plan
              </button>
            </form>
          </section>

          {/* Add Exercise Section */}
          <section style={styles.section}>
            <h2>Add Exercise</h2>
            <form onSubmit={handleExerciseSubmit} style={styles.form}>
              <input
                type="text"
                placeholder="Exercise Name"
                value={exercise.name}
                onChange={(e) => setExercise({...exercise, name: e.target.value})}
                style={styles.input}
                required
              />
              <textarea
                placeholder="Exercise Description"
                value={exercise.description}
                onChange={(e) => setExercise({...exercise, description: e.target.value})}
                style={{...styles.input, minHeight: '100px'}}
                required
              />
              <input
                type="number"
                placeholder="Number of Sets"
                value={exercise.sets}
                onChange={(e) => setExercise({...exercise, sets: e.target.value})}
                style={styles.input}
                min="1"
                max="10"
                required
              />
              <input
                type="number"
                placeholder="Number of Reps"
                value={exercise.reps}
                onChange={(e) => setExercise({...exercise, reps: e.target.value})}
                style={styles.input}
                min="1"
                max="100"
                required
              />
              <button type="submit" style={styles.button}>
                Add Exercise
              </button>
            </form>
          </section>

          {/* Exercise List Section */}
          <section style={styles.section}>
            <h2>Exercise List</h2>
            <div style={styles.exercisesList}>
              {exercises.map(exercise => (
                <div key={exercise.id} style={styles.exerciseCard}>
                  <div style={styles.exerciseHeader}>
                    <h3 style={styles.exerciseName}>{exercise.name}</h3>
                    <div style={styles.exerciseActions}>
                      <IconButton 
                        onClick={() => handleExpandExercise(exercise.id)}
                        sx={{ transform: expandedExercises[exercise.id] ? 'rotate(180deg)' : 'none' }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                      <button 
                        onClick={() => handleDeleteExercise(exercise.id)}
                        style={styles.deleteButton}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <Collapse in={expandedExercises[exercise.id]} timeout="auto" unmountOnExit>
                    <div style={styles.exerciseDetails}>
                      <p style={styles.exerciseDescription}>{exercise.description}</p>
                      <div style={styles.exerciseStats}>
                        <span>Sets: {exercise.sets}</span>
                        <span>Reps: {exercise.reps}</span>
                      </div>
                    </div>
                  </Collapse>
                </div>
              ))}
            </div>
          </section>

          {/* Workout Plans Section */}
          <section style={styles.section}>
            <h2>Workout Plans</h2>
            <div style={styles.workoutPlansList}>
              {workoutPlans.map(plan => (
                <div key={plan.id} style={styles.workoutPlanCard}>
                  <div style={styles.workoutPlanHeader}>
                    <h3 style={styles.planName}>{plan.name}</h3>
                    <div style={styles.planActions}>
                      <IconButton 
                        onClick={() => handleExpandPlan(plan.id)}
                        sx={{ transform: expandedPlans[plan.id] ? 'rotate(180deg)' : 'none' }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                      <button 
                        onClick={() => handleEditPlan(plan.id)}
                        style={styles.editButton}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <Collapse in={expandedPlans[plan.id]} timeout="auto" unmountOnExit>
                    <div style={styles.planDetails}>
                      <p style={styles.planDescription}>{plan.description}</p>
                      <span style={styles.planDays}>Days: {plan.num_of_days}</span>
                    </div>
                  </Collapse>
                </div>
              ))}
            </div>
          </section>

          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/diet-plans')}
            sx={{ 
              mt: 2, 
              mb: 2,
              width: '100%',
              padding: '15px',
              fontSize: '1.1rem'
            }}
          >
            Manage Diet Plans & Meals
          </Button>
        </div>
      </Box>
    </Container>
  );
};

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  isolatedContent: {
    borderTop: '2px solid #f0f0f0',
    borderBottom: '2px solid #f0f0f0',
    padding: '15px 0',
    margin: '10px 0',
    backgroundColor: '#fafafa',
    overflow: 'hidden', // Contain content
    wordBreak: 'break-word', // Prevent overflow
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: 'rgb(94, 88, 213)',
    borderBottom: '1px solid #ddd',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    height: '40px',
    marginRight: '10px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '5px',
  },
  pageHeader: {
    textAlign: 'center',
    marginBottom: '20px',
    backgroundColor: 'rgb(94, 88, 213)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    padding: '10px',
    fontSize: '16px',
  },
  button: {
    padding: '10px',
    fontSize: '16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  userItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginTop: '15px'
  },
  analyticsCard: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  analyticsNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: '10px 0',
    color: '#2c3e50'
  },
  section: {
    margin: '20px 0',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  messageCard: {
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
    width: '100%', // Ensure consistent width
    boxSizing: 'border-box', // Include padding in width
  },
  /*
  isolatedContent: {
    borderTop: '2px solid #f0f0f0',
    borderBottom: '2px solid #f0f0f0',
    padding: '15px 0',
    margin: '10px 0',
    backgroundColor: '#fafafa',
  },
  */
  messageContent: {
    fontSize: '16px',
    color: '#333',
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap', // Preserve line breaks but wrap text
    maxWidth: '100%', // Constrain to container
    overflowWrap: 'break-word', // Break long words
  },
  
  messageMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#666',
    gap: '15px',
  },
  
  metaLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  
  metaRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  
  nameContainer: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px dashed #eee',
    fontSize: '14px',
    color: '#444',
  },
  buttonContainer: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  seenButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  newButton: {
    padding: '8px 16px',
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '10px',
    fontSize: '14px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '5px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: 'white',
    backgroundColor: '#666',
    textTransform: 'capitalize',
  },
  messageSection: {
    marginBottom: '30px',
  },
  sectionHeader: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333',
    borderBottom: '2px solid #eee',
    paddingBottom: '8px',
  },
  editButton: {
    padding: '10px',
    fontSize: '14px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '5px',
  },
  workoutPlansList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  workoutPlanCard: {
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  workoutPlanInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  exercisesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '20px',
  },
  exerciseItem: {
    display: 'grid',
    gridTemplateColumns: '2fr 3fr 1fr 1fr 1fr', // Added column for delete button
    gap: '20px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '10px',
    overflow: 'hidden',
  },
  exerciseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    borderBottom: '1px solid #eee',
  },
  exerciseName: {
    margin: 0,
    fontSize: '18px',
    color: '#333',
  },
  exerciseActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  exerciseDetails: {
    padding: '15px',
    backgroundColor: '#f9f9f9',
  },
  exerciseDescription: {
    margin: '0 0 10px 0',
    color: '#666',
  },
  exerciseStats: {
    display: 'flex',
    gap: '20px',
    color: '#444',
    fontSize: '14px',
  },
  workoutPlanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    borderBottom: '1px solid #eee',
  },
  planName: {
    margin: 0,
    fontSize: '18px',
    color: '#333',
  },
  planActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  planDetails: {
    padding: '15px',
    backgroundColor: '#f9f9f9',
  },
  planDescription: {
    margin: '0 0 10px 0',
    color: '#666',
  },
  planDays: {
    color: '#444',
    fontSize: '14px',
  },
};

export default AdminDashboard;