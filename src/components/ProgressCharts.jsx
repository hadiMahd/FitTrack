import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import api from '../utils/axiosConfig';
import { Box, Typography, CircularProgress } from '@mui/material';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ProgressCharts = () => {
  const [loading, setLoading] = useState(true);
  const [exerciseLogs, setExerciseLogs] = useState({});

  useEffect(() => {
    fetchExerciseLogs();
  }, []);

  const fetchExerciseLogs = async () => {
    try {
      const response = await api.get('/api/user/exercise-logs/recent');
      const logs = response.data;

      // Group logs by exercise
      const groupedLogs = logs.reduce((acc, log) => {
        if (!acc[log.exercise_name]) {
          acc[log.exercise_name] = [];
        }
        acc[log.exercise_name].push({
          weight: log.weight,
          date: new Date(log.log_date)
        });
        return acc;
      }, {});

      // Sort logs by date for each exercise
      Object.keys(groupedLogs).forEach(exercise => {
        groupedLogs[exercise].sort((a, b) => a.date - b.date);
      });

      setExerciseLogs(groupedLogs);
    } catch (error) {
      console.error('Error fetching exercise logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChartData = (exerciseName, logs) => {
    return {
      labels: logs.map(log => log.date.toLocaleDateString()),
      datasets: [
        {
          label: exerciseName,
          data: logs.map(log => log.weight),
          borderColor: '#5E58D5',
          backgroundColor: 'rgba(94, 88, 213, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Weight Progression'
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Weight (kg)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Exercise Progress
      </Typography>
      {Object.entries(exerciseLogs).map(([exerciseName, logs]) => (
        <Box key={exerciseName} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {exerciseName}
          </Typography>
          <Box sx={{ height: 300 }}>
            <Line data={createChartData(exerciseName, logs)} options={chartOptions} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default ProgressCharts;
