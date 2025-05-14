export const calculateTDEE = (weight, height, age, gender, activityLevel) => {
  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr;
  if (gender.toLowerCase() === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2, // Little or no exercise
    light: 1.375,   // 1-3 days/week
    moderate: 1.55, // 3-5 days/week
    active: 1.725,  // 6-7 days/week
    veryActive: 1.9 // Very intense exercise daily
  };

  // Map training days to activity level
  const getActivityMultiplier = (trainingDays) => {
    if (trainingDays <= 2) return activityMultipliers.light;
    if (trainingDays <= 4) return activityMultipliers.moderate;
    if (trainingDays <= 6) return activityMultipliers.active;
    return activityMultipliers.veryActive;
  };

  const multiplier = getActivityMultiplier(activityLevel);
  const tdee = Math.round(bmr * multiplier);

  return {
    bmr: Math.round(bmr),
    tdee: tdee,
    targets: {
      muscle_gain: Math.round(tdee + 500),    // Caloric surplus
      lose_fat: Math.round(tdee - 500),       // Caloric deficit
      maintain: tdee                          // Maintenance
    }
  };
};