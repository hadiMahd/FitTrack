import React from 'react';
import '../styling/landing_page.css';

const LandingPage = () => {
  return (

    <div className="lp-container">
      <header className="lp-header">
        <div className="lp-logo">FitTrack</div>
        <nav>
          <a href="./Login" className="lp-sign-in-link">Sign In</a>
        </nav>
      </header>

      <section className="lp-hero">
        <h1>Transform Your Fitness with AI</h1>
        <p>Smart tracking, personalized insights, and real-time progress monitoring</p>
        <button className="cta-button">Get Started for Free</button>
      </section>

      <section className="features">
        <h2>Why Choose FitTrack?</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <span className="emoji-icon">🧠</span>
            <h3>AI-Powered Tracking</h3>
            <p>Smart algorithms analyze your workouts and provide personalized recommendations</p>
          </div>
          <div className="feature-card">
            <span className="emoji-icon">📈</span>
            <h3>Progress Monitoring</h3>
            <p>Track calories, duration, and achievements with real-time analytics</p>
          </div>
          <div className="feature-card">
            <span className="emoji-icon">🏋️♂️</span>
            <h3>Smart Workouts</h3>
            <p>AI-generated workout plans tailored to your goals and progress</p>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <p>&copy; 2024 FitTrack. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;