import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EditWorkoutPlan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [planExercises, setPlanExercises] = useState([]);
  const [selectedDay, setSelectedDay] = useState(1);

  const api = axios.create({
    baseURL: 'http://localhost:3000/admin',
    withCredentials: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [planRes, exercisesRes] = await Promise.all([
          api.get(`/workout-plans/${id}/exercises`),
          api.get('/exercises')
        ]);
        
        console.log('Plan Response:', planRes.data);
        console.log('Exercises Response:', exercisesRes.data);
        
        setPlan(planRes.data[0]);
        setExercises(exercisesRes.data);
        
        // Filter and process plan exercises more carefully
        const exercisesWithDetails = planRes.data
          .filter(item => item.exercise_id != null)
          .map(item => ({
            exercise_id: item.exercise_id,
            exercise_name: item.exercise_name,
            day_num: item.day_num,
            order_in_day: item.order_in_day
          }));
        
        console.log('Processed Plan Exercises:', exercisesWithDetails);
        setPlanExercises(exercisesWithDetails);
      } catch (error) {
        console.error('Error:', error);
        alert('Error loading workout plan');
      }
    };

    fetchData();
  }, [id]);

  const handleAddExercise = async (exerciseId) => {
    try {
      console.log('Adding exercise:', exerciseId, 'to day:', selectedDay);
      const exercise = exercises.find(e => e.id === exerciseId);
      console.log('Found exercise:', exercise);

      const newExercise = {
        exercise_id: exerciseId,
        day_num: selectedDay,
        order_in_day: planExercises.filter(e => e.day_num === selectedDay).length + 1
      };
      console.log('New exercise data:', newExercise);

      const response = await api.post(`/workout-plans/${id}/exercises`, newExercise);
      console.log('API response:', response.data);

      setPlanExercises([...planExercises, {
        ...newExercise,
        exercise_name: exercise.name
      }]);

      alert('Exercise added successfully');
    } catch (error) {
      console.error('Error adding exercise:', error);
      alert('Failed to add exercise: ' + error.message);
    }
  };

  const handleRemoveExercise = async (exerciseId, dayNum) => {
    try {
      console.log('Removing exercise:', exerciseId, 'from day:', dayNum);
      
      // Make API call to remove exercise
      await api.delete(`/workout-plans/${id}/exercises/${exerciseId}/${dayNum}`);
      
      // Update local state
      setPlanExercises(planExercises.filter(
        e => !(e.exercise_id === exerciseId && e.day_num === dayNum)
      ));
      
      alert('Exercise removed successfully');
    } catch (error) {
      console.error('Error removing exercise:', error);
      alert('Failed to remove exercise: ' + error.message);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/workout-plans/${id}/exercises`, { exercises: planExercises });
      alert('Workout plan updated successfully');
      navigate('/admin/dashboard');
    } catch (error) {
      alert('Error updating workout plan: ' + error.message);
    }
  };

  if (!plan) return <div>Loading...</div>;

  return (
    <div style={styles.container}>
      <h2>Edit Workout Plan: {plan.name}</h2>
      
      {/* Day selector */}
      <div style={styles.section}>
        <h3>Select Day</h3>
        <select 
          value={selectedDay}
          onChange={(e) => setSelectedDay(Number(e.target.value))}
          style={styles.select}
        >
          {[...Array(plan.num_of_days)].map((_, index) => (
            <option key={index + 1} value={index + 1}>
              Day {index + 1}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.exercisesContainer}>
        {/* Available exercises */}
        <div style={styles.section}>
          <h3>Available Exercises</h3>
          <div style={styles.exerciseList}>
            {exercises.map(exercise => (
              <div key={exercise.id} style={styles.exerciseItem}>
                <span>{exercise.name}</span>
                <button 
                  onClick={() => handleAddExercise(exercise.id)}
                  style={styles.addButton}
                >
                  Add to Day {selectedDay}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Current day exercises */}
        <div style={styles.section}>
          <h3>Exercises for Day {selectedDay}</h3>
          <div style={styles.exerciseList}>
            {planExercises
              .filter(e => e.day_num === selectedDay)
              .sort((a, b) => a.order_in_day - b.order_in_day)
              .map(exercise => (
                <div key={exercise.exercise_id} style={styles.exerciseItem}>
                  <span>{exercise.exercise_name}</span>
                  <button 
                    onClick={() => handleRemoveExercise(exercise.exercise_id, selectedDay)}
                    style={styles.removeButton}
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        <button onClick={handleSave} style={styles.saveButton}>
          Save Changes
        </button>
        <button onClick={() => navigate('/admin/dashboard')} style={styles.cancelButton}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  section: {
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  select: {
    padding: '8px',
    fontSize: '16px',
    marginTop: '10px',
    width: '200px',
  },
  exercisesContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginTop: '20px',
  },
  exerciseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '10px',
  },
  exerciseItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  removeButton: {
    padding: '8px 16px',
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default EditWorkoutPlan;