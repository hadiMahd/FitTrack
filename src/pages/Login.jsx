import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styling/Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error on input change
  };

  const validateForm = () => {
    const { email, password } = formData;
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return false;
    }
    
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
  
    try {
      setLoading(true);
      setError('');
  
      const response = await axios.post('http://localhost:3000/api/auth/login', 
        {
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        },
        {
          withCredentials: true, // Required for cookies
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
  
      if (response.status === 200) {
        const { userId, role } = response.data;
        
        // Store only non-sensitive data in localStorage
        localStorage.setItem('userId', userId);
        localStorage.setItem('role', role);
  
        // Handle navigation based on role
        const navigationPaths = {
          admin: '/admin/dashboard',
          user: '/dashboard',
          moderator: '/mod/dashboard'
        };
        
        navigate(navigationPaths[role] || '/');
      }
  
    } catch (err) {
      const status = err.response?.status;
      let message = 'Login failed. Please try again.';
      
      if (status === 401) {
        message = 'Invalid email or password';
      } else if (status === 429) {
        message = 'Too many attempts. Please try again later.';
      } else if (status >= 500) {
        message = 'Server error. Please try again later.';
      }
      
      setError(`${message} (Code: ${status || 'N/A'})`);
  
    } finally {
      setLoading(false);
    }
  };

  // Update the forgot password link styling
  const forgotPasswordStyles = {
    color: '#5E58D5',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline'
    }
  };

  return (
    <div className="auth-container">
      <header className="auth-header">
        <Link to="/" className="logo">FitTrack</Link>
      </header>

      <div className="auth-content">
        <h1>Welcome Back! 🏋️♂️</h1>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              autoComplete="email"
              aria-describedby="emailHelp"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
              autoComplete="current-password"
              required
              minLength="6"
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
            aria-label={loading ? 'Signing in' : 'Sign in'}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true"></span>
                Signing In...
              </>
            ) : 'Sign In'}
          </button>

          <div className="forgot-password-container">
            <Link 
              to="/forgot-password" 
              className="forgot-password"
              aria-label="Reset password"
              style={forgotPasswordStyles}
            >
              Forgot password?
            </Link>
          </div>
        </form>

        <div className="auth-switch">
          Don't have an account?{' '}
          <Link to="/register" aria-label="Create account">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;