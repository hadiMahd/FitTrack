import React from 'react'
import Home from './pages/Home';
import Products from './pages/Products';
import LandingPage from './pages/LandingPage';
import { Routes, Route } from 'react-router-dom';
import UserDashboard from './pages/UserDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminPage from './pages/Admin';
import ModeratorPage from './pages/Moderator';
import EditWorkoutPlan from './components/EditWorkoutPlan';
import DietPlans from './components/DietPlans';
import ForgotPassword from './components/ForgotPass';
import SendMessage from './components/SendMessage';

const App = () => {
  return (
    <div>
      <div className='container'>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/products" element={<Products />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/admin/dashboard" element={<AdminPage />} />
        <Route path="/mod/dashboard" element={<ModeratorPage />} />
        <Route path="/admin/workout-plans/:id/edit" element={<EditWorkoutPlan />} />
        <Route path='/diet-plans' element={<DietPlans />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/contact-support" element={<SendMessage />} />
      </Routes>
      </div>
    </div>
  )
}

export default App;