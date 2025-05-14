import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import api from '../utils/axiosConfig';

// Add this helper function at the top of your component
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Add this helper function to parse ISO date string
const parseISODate = (isoString) => {
  if (!isoString) return '';
  // Remove the time portion and timezone
  return isoString.split('T')[0];
};

const ProfileSettings = ({ userProfile, onProfileUpdate }) => {
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    gender: '',
    birth_date: '',
    weight: '',
    height: '',
    number_of_training_days: '',
    fitness_goal: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Update the useEffect hook
  useEffect(() => {
    if (userProfile) {
      setFormData({
        fname: userProfile.fname || '',
        lname: userProfile.lname || '',
        gender: userProfile.gender || '',
        birth_date: userProfile.birth_date || '', // Now directly usable
        weight: userProfile.weight || '',
        height: userProfile.height || '',
        number_of_training_days: userProfile.number_of_training_days || '',
        fitness_goal: userProfile.fitness_goal || ''
      });
    }
  }, [userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Update the handleSubmit function
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Create submitData with the date in YYYY-MM-DD format
      const submitData = {
        ...formData,
        birth_date: formData.birth_date // Already in correct format
      };

      const response = await api.put('/api/user/profile', submitData);
      setSuccess(true);
      if (onProfileUpdate) {
        onProfileUpdate(response.data.profile);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ color: '#333', mb: 3 }}>
        Profile Settings
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'grid', gap: 3, mb: 4 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              name="fname"
              label="First Name"
              value={formData.fname}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              name="lname"
              label="Last Name"
              value={formData.lname}
              onChange={handleChange}
              required
              fullWidth
            />
          </Box>

          <FormControl fullWidth>
            <InputLabel>Gender</InputLabel>
            <Select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              label="Gender"
              required
            >
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            name="birth_date"
            label="Birth Date"
            type="date"
            value={formData.birth_date}
            onChange={handleChange}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
            helperText={formData.birth_date ? `Age: ${calculateAge(formData.birth_date)}` : ''}
            inputProps={{
              max: parseISODate(new Date().toISOString()) // Prevent future dates
            }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              name="weight"
              label="Weight (kg)"
              type="number"
              value={formData.weight}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              name="height"
              label="Height (cm)"
              type="number"
              value={formData.height}
              onChange={handleChange}
              required
              fullWidth
            />
          </Box>

          <FormControl fullWidth>
            <InputLabel>Training Days per Week</InputLabel>
            <Select
              name="number_of_training_days"
              value={formData.number_of_training_days}
              onChange={handleChange}
              label="Training Days per Week"
              required
            >
              {[3, 4, 5, 6].map(num => (
                <MenuItem key={num} value={num}>{num} days</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Fitness Goal</InputLabel>
            <Select
              name="fitness_goal"
              value={formData.fitness_goal}
              onChange={handleChange}
              label="Fitness Goal"
              required
            >
              <MenuItem value="gain_muscle">Muscle Gain</MenuItem>
              <MenuItem value="lose_fat">Burn Fat</MenuItem>
              <MenuItem value="keep_currrent_weight">Keep my current weight</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Profile updated successfully!
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          fullWidth
          sx={{
            bgcolor: '#5E58D5',
            '&:hover': {
              bgcolor: '#4A45C2'
            }
          }}
        >
          {loading ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
      </form>
    </Box>
  );
};

export default ProfileSettings;