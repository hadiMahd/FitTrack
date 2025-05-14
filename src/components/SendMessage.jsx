//here the user can send a message to the admin
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';

const SendMessage = () => {
  const [messageData, setMessageData] = useState({
    message_type: '',
    content: ''
  });
  const [status, setStatus] = useState({ success: false, error: null });
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/api/user/messages', messageData);
      if (response.data.success) {
        setStatus({ success: true, error: null });
        setMessageData({ message_type: '', content: '' }); // Reset form
      }
    } catch (err) {
      setStatus({ 
        success: false, 
        error: err.response?.data?.message || 'Failed to send message' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setMessageData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#5E58D5', mb: 0 }}>
            Contact Support
          </Typography>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            sx={{
              borderColor: '#5E58D5',
              color: '#5E58D5',
              '&:hover': {
                borderColor: '#4A45C2',
                backgroundColor: 'rgba(94, 88, 213, 0.04)'
              }
            }}
          >
            Go to Dashboard
          </Button>
        </Box>

        {status.success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Message sent successfully!
          </Alert>
        )}

        {status.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {status.error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="message-type-label">Message Type</InputLabel>
            <Select
              labelId="message-type-label"
              name="message_type"
              value={messageData.message_type}
              onChange={handleChange}
              required
              label="Message Type"
            >
              <MenuItem value="report">Report an Issue</MenuItem>
              <MenuItem value="message">General Message</MenuItem>
              <MenuItem value="feedback">Feedback</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            name="content"
            label="Message Content"
            value={messageData.content}
            onChange={handleChange}
            required
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={<SendIcon />}
            sx={{
              backgroundColor: '#5E58D5',
              '&:hover': {
                backgroundColor: '#4A45C2'
              }
            }}
          >
            {loading ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default SendMessage;