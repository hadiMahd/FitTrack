// geminiRouter.js
import express from 'express';
import authenticateToken from '../auth/AuthToken.js';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';
//import { fileURLToPath } from 'url';
//import { dirname } from 'path';
import process from 'process';
import { calculateTDEE } from '../../src/utils/tdeeCalculator.js'; // Adjust the import path as necessary


dotenv.config(); // Load environment variables from .env file

const geminiRouter = express.Router();

// Add after imports
const chatSessions = new Map();

// --- Configuration ---
const API_KEY = process.env.REACT_APP_GOOGLE_GENAI_API_KEY;
if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable not set.");
    process.exit(1); // Exit if API key is missing
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // Or "gemini-pro" - flash is often faster/cheaper for structured output
    // Optional: Configure safety settings if needed
    // safetySettings: [
    //     { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    //     { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    // ]
});

// Add helper function
const calculateAge = (birthDate) => {
  if (!birthDate) return 25; // default age
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// --- Helper Function to Build the Prompt ---
const buildWorkoutPrompt = (height, weight, age, gender, goal, numTrainingDays) => {
    // Define the exact JSON structure we want Gemini to return
    const desiredJsonStructure = `{
  "workout_plan": {
    "name": "Generated Workout Plan Name",
    "description": "Short description based on goal and user",
    "num_of_days": 3, // Example: Can be adjusted based on goal/level
    "days": [
      {
        "day_num": 1,
        "exercises": [
          {
            "exercise": {
              "name": "Exercise Name 1",
              "description": "Brief description of how to perform"
            },
            "sets": 3, // Example number of sets
            "reps": 12, // Example number of reps (can be range like "8-12")
            "order_in_day": 1
          },
          {
            "exercise": {
              "name": "Exercise Name 2",
              "description": "Brief description of how to perform"
            },
            "sets": 3,
            "reps": 10,
            "order_in_day": 2
          }
          // ... potentially more exercises per day
        ]
      }
      // ... potentially more days (matching num_of_days)
    ]
  }
}`;

    // Construct the prompt for Gemini
    return `
Generate a personalized workout plan based on the following user details:
- Height: ${height}
- Weight: ${weight}
- Age: ${age}
- Gender: ${gender}
- Fitness Goal: ${goal}
- Number of Days The User Can Train: ${numTrainingDays}

**Instructions:**
1.  Create a workout plan suitable for the user's details and goal. Consider a beginner level if not otherwise specified by the goal.
2.  The output **MUST** be a single, valid JSON object.
3.  The JSON object **MUST** strictly adhere to the following structure:
    \`\`\`json
    ${desiredJsonStructure}
    \`\`\`
4.  Populate the fields within the JSON structure appropriately based on the user's details and goal.
5.  Ensure the number of day objects in the "days" array matches the value of "num_of_days".
6.  Include a reasonable number of exercises per day (e.g., 3-6).
7.  Provide realistic set and rep counts.
8.  Give concise exercise descriptions.
9.  **IMPORTANT:** Do not include any text, explanations, apologies, or markdown formatting (like \`\`\`json ... \`\`\`) before or after the JSON object in your response. Output ONLY the raw JSON object itself.
`;
};

geminiRouter.get('/test-gemini', async (req, res) => {
    console.log("GET /api/test-gemini endpoint hit - attempting simple Gemini call...");

    // Define a very simple test prompt
    const testPrompt = "Explain what a large language model is in one sentence.";

    try {
        console.log("Sending test prompt to Gemini:", testPrompt);

        const result = await model.generateContent(testPrompt);
        const response = result.response;
        const geminiText = response.text();

        console.log("Received response from Gemini test:", geminiText);

        // Send Gemini's response back to the client
        res.status(200).json({
            message: "Gemini API test successful!",
            prompt_sent: testPrompt,
            gemini_response: geminiText
        });

    } catch (error) {
        console.error("Error during Gemini test call:", error);
         // Check for specific safety blocking errors
         if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
            console.error("Safety Blocking Reason:", error.response.promptFeedback.blockReason);
            console.error("Safety Ratings:", error.response.promptFeedback.safetyRatings);
             return res.status(400).json({ // Use 400 for blocked prompt
                error: `Test prompt blocked due to safety settings: ${error.response.promptFeedback.blockReason}`,
                details: "The simple test prompt violated safety policies."
            });
        }
        // General error
        res.status(500).json({
            error: "Failed to communicate with Gemini API during test.",
            details: error.message || "An unknown error occurred"
        });
    }
});

// --- API Route ---
geminiRouter.post('/generate-workout', authenticateToken, async (req, res) => {
    console.log("Received request body:", req.body);

    const { height, weight, birth_date, gender, goal, numTrainingDays } = req.body;

    // Calculate age from birth_date
    const age = calculateAge(birth_date);

    // Basic Input Validation
    if (!height || !weight || !birth_date || !gender || !goal || !numTrainingDays) {
        console.error("Validation Error: Missing required fields");
        return res.status(400).json({
            error: "Missing required fields. Please provide height, weight, birth date, gender, and goal.",
        });
    }

    try {
        const prompt = buildWorkoutPrompt(height, weight, age, gender, goal, numTrainingDays);
        console.log("\n--- Sending Prompt to Gemini ---");
        console.log(prompt);
        console.log("-------------------------------\n");

        const result = await model.generateContent(prompt);
        const response = result.response;
        const geminiOutput = response.text();

        console.log("\n--- Received Raw Output from Gemini ---");
        console.log(geminiOutput);
        console.log("-------------------------------------\n");

        // Attempt to parse the JSON response from Gemini
        let workoutPlanJson;
        try {
            let processedOutput = geminiOutput.trim(); // Start with basic trimming
        
            // 1. Remove optional leading ```json or ```
            if (processedOutput.startsWith("```json")) {
                processedOutput = processedOutput.substring(7).trim(); // Remove ```json and trim again
            } else if (processedOutput.startsWith("```")) {
                processedOutput = processedOutput.substring(3).trim(); // Remove ``` and trim again
            }
        
            // 2. Remove optional trailing ```
            if (processedOutput.endsWith("```")) {
                processedOutput = processedOutput.substring(0, processedOutput.length - 3).trim(); // Remove trailing ``` and trim
            }
        
            // 3. Now, attempt to parse the potentially cleaner string
            console.log("\n--- Attempting to Parse Cleaned Output ---");
            console.log(processedOutput); // Log exactly what you're trying to parse
            console.log("-----------------------------------------\n");
        
            workoutPlanJson = JSON.parse(processedOutput);
        
        } catch (parseError) {
            console.error("Error parsing JSON response from Gemini:", parseError);
            console.error("Gemini Raw Output that caused error:", geminiOutput); // Log the original problematic output
            // Log the state *after* cleaning attempts if debugging
            // console.error("Output after cleaning attempt:", processedOutput);
            return res.status(500).json({
                error: "Failed to parse workout plan from AI response. The AI might not have returned valid JSON.",
                raw_ai_output: geminiOutput, // Optionally send back the raw output for debugging
                // cleaned_output_attempt: processedOutput // Optionally send this back too
            });
        }

        // Send the successfully parsed JSON back to the client
        res.status(200).json(workoutPlanJson);

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Check for specific safety blocking errors
        if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
            console.error("Safety Blocking Reason:", error.response.promptFeedback.blockReason);
            console.error("Safety Ratings:", error.response.promptFeedback.safetyRatings);
             return res.status(400).json({ // Use 400 for blocked prompt
                error: `Request blocked due to safety settings: ${error.response.promptFeedback.blockReason}`,
                details: "The prompt or the generated response violated safety policies."
            });
        }
        res.status(500).json({ error: "Failed to generate workout plan due to an internal server error." });
    }
});

//generate daily tips
geminiRouter.get('/daily-challenge', authenticateToken, async (req, res) => {
    // Assuming router is mounted like app.use('/api', geminiRouter); path would be /api/daily-challenge
    console.log(`GET ${req.originalUrl} endpoint hit`);

    // Define the fallback content first in case of errors
    const fallbackChallenge = {
        exercises: [
          { name: "Jumping Jacks", duration_seconds: 30 },
          { name: "Push-ups", reps: 10 },
          { name: "Mountain Climbers", duration_seconds: 30 },
          { name: "Squats", reps: 15 }
        ]
    };

    try {
        // Define the prompt for the daily challenge
        // Keys clarified: "duration_seconds" for time, "reps" for count
        const prompt = `Generate a JSON object representing a new 10-minute HIIT workout with exactly 4 exercises.
The JSON object MUST strictly follow this structure:
\`\`\`json
{
  "exercises": [
    {"name": "Exercise Name 1", "duration_seconds": 30},
    {"name": "Exercise Name 2", "reps": 15},
    {"name": "Exercise Name 3", "duration_seconds": 45},
    {"name": "Exercise Name 4", "reps": 12}
  ]
}
\`\`\`
Ensure the output contains ONLY the raw JSON object, with no surrounding text or markdown formatting like \`\`\`json ... \`\`\`. Include a mix of duration-based (use "duration_seconds" key) and rep-based (use "reps" key) exercises suitable for HIIT, and be innovative and give brand new exercises each time i request.`;

        console.log("Sending prompt to Gemini for daily challenge...");

        // Call the AI model using the router's initialized 'model' instance
        const result = await model.generateContent(prompt);
        const response = result.response;

        // --- Robust Handling of Potential API Issues ---
        if (!response) {
             console.error("Received no response object from Gemini API call.");
             throw new Error("Received no response from Gemini."); // Will trigger catch block
        }
        // Check for safety blocks *before* trying to access text
        if (response.promptFeedback && response.promptFeedback.blockReason) {
            const blockReason = response.promptFeedback.blockReason;
            console.error(`Gemini request blocked due to safety settings: ${blockReason}`);
            // Throw a specific error to be handled differently in catch block if needed
            throw new Error(`Request blocked by safety filter: ${blockReason}`);
        }
        // --- End Robust Handling ---

        const rawText = response.text();
        console.log("Raw response from Gemini:", rawText);

        // Parse the JSON response robustly
        let challenge;
        try {
            // Clean potential markdown fences and trim whitespace
            let cleanedText = rawText.trim();
            if (cleanedText.startsWith("```json")) {
                cleanedText = cleanedText.substring(7).trim();
            } else if (cleanedText.startsWith("```")) {
               cleanedText = cleanedText.substring(3).trim();
            }
            if (cleanedText.endsWith("```")) {
                cleanedText = cleanedText.substring(0, cleanedText.length - 3).trim();
            }

            console.log("Attempting to parse cleaned text:", cleanedText);
            challenge = JSON.parse(cleanedText);

            // Optional: Basic validation of the parsed structure
            if (!challenge || !Array.isArray(challenge.exercises) || challenge.exercises.length === 0) {
               console.error("Parsed JSON structure is invalid or empty:", challenge);
               throw new Error("Parsed JSON structure is invalid or empty."); // Trigger outer catch
            }

            // Send the successfully parsed challenge
            console.log("Successfully parsed challenge:", challenge);
            res.status(200).json(challenge); // Send success response

        } catch (parseError) {
            console.error("Failed to parse JSON response from Gemini:", parseError);
            // Throw a new error to be caught by the outer catch block
            throw new Error(`Failed to parse workout JSON from AI. Raw text: ${rawText}`);
        }

    } catch (error) {
        // General error handler for API call errors, parsing errors, safety blocks etc.
        console.error('Error fetching or processing daily challenge:', error.message);

        // Decide response based on error type
        if (error.message.includes("Request blocked by safety filter")) {
             // Send a specific error for safety blocks
             res.status(400).json({
                 error: "Content generation blocked",
                 message: error.message,
                 fallback_available: false // Indicate fallback isn't appropriate here
             });
        }
        else if (error.message.includes("Received no response from Gemini")) {
             // Specific error for Gemini communication failure
             res.status(502).json({ // 502 Bad Gateway might be appropriate
                 error: "Failed to communicate with AI service",
                 message: error.message,
                 fallback_available: true
             });
        }
        else {
            // For other errors (parsing failure, unexpected API issues), return fallback content
            console.log("Setting fallback daily challenge content due to error.");
            res.status(200).json(fallbackChallenge);
            // --- Alternatively, send a 500 error ---
            // res.status(500).json({
            //    error: "Failed to generate daily challenge",
            //    message: error.message,
            //    fallback_content: fallbackChallenge // Optionally include fallback in error
            // });
            // --- End Alternative ---
        }
    }
});

// Add this after the daily-challenge endpoint
geminiRouter.get('/daily-tip', authenticateToken, async (req, res) => {
    console.log(`GET ${req.originalUrl} endpoint hit`);

    // Define fallback tip
    const fallbackTip = {
        tip: "Stay hydrated throughout your workout and maintain proper form during exercises."
    };

    try {
        const prompt = `Generate a short, motivational fitness tip in JSON format.
The JSON object MUST strictly follow this structure:
{
  "tip": "Your two-sentence maximum fitness tip here"
}
Ensure the output contains ONLY the raw JSON object, with no surrounding text or markdown.
Make the tip specific, actionable, and motivating.`;

        console.log("Sending prompt to Gemini for daily tip...");
        
        const result = await model.generateContent(prompt);
        const response = result.response;

        if (!response) {
            throw new Error("Received no response from Gemini.");
        }

        const rawText = response.text();
        console.log("Raw response from Gemini:", rawText);

        // Clean and parse the response
        let cleanedText = rawText.trim();
        if (cleanedText.startsWith("```json")) {
            cleanedText = cleanedText.substring(7).trim();
        } else if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.substring(3).trim();
        }
        if (cleanedText.endsWith("```")) {
            cleanedText = cleanedText.substring(0, cleanedText.length - 3).trim();
        }

        const tipJson = JSON.parse(cleanedText);
        res.status(200).json(tipJson);

    } catch (error) {
        console.error('Error generating daily tip:', error);
        res.status(200).json(fallbackTip);
    }
});

// --- Helper Function to Build the Prompt ---
const buildDietPrompt = (height, weight, age, gender, goal, numTrainingDays, tdee, targetCalories) => {
    // Define the exact JSON structure we want Gemini to return
    const desiredJsonStructure = `{
  id: 1,
  name: 'High-Protein Muscle Builder',
  description: 'Designed for muscle gain: 35% protein, 40% carbs, 25% fats. Includes meals like Grilled Chicken Salad, Salmon & Quinoa, and Beef Burger. 5 meals/day, ~2,800 kcal daily.',  
  breakfast: [
    {
      food: 'Spinach Mushroom Omelette',
      description: '3 eggs (whisked), 50g spinach, 50g mushrooms, 10g feta. Sauté veggies, pour eggs, cook 3 mins. Fold and top with feta.',
      calories: 310,
      protein: 22,
      carbs: 6,
      fat: 22
    }
  ],
  lunch: [
    {
      food: 'Grilled Chicken Salad',
      description: '150g grilled chicken breast (marinated in 5ml olive oil, salt, pepper), 50g mixed greens, 100g cherry tomatoes, 50g cucumber. Grill chicken 6 mins/side. Toss with veggies.',
      calories: 320,
      protein: 35,
      carbs: 12,
      fat: 14
    }
  ],
  dinner: [
    {
      food: 'Baked Salmon Meal',
      description: '200g salmon fillet (season with lemon, dill, salt), 100g quinoa, 100g steamed asparagus. Bake salmon at 200°C for 15 mins. Serve with cooked quinoa.',
      calories: 480,
      protein: 38,
      carbs: 35,
      fat: 20
    }
    ]}`;

    // Construct the prompt for Gemini
    return `
    Generate a personalized diet plan based on the following user details:
    - Height: ${height}
    - Weight: ${weight}
    - TDEE: ${tdee}
    - Target Calories: ${targetCalories}
    - Age: ${age}
    - Gender: ${gender}
    - Fitness Goal: ${goal}
    - Number of Days The User is Active/Working out: ${numTrainingDays}

    **Instructions:**
    1.  Create a diet plan suitable for the user's details and goal.
    2.  The output **MUST** be a single, valid JSON object.
    3.  The JSON object **MUST** strictly adhere to the following structure:
        \`\`\`json
        ${desiredJsonStructure}
        \`\`\`
    4.  Populate the fields within the JSON structure appropriately based on the user's details and goal.
    5.  Do not add any sncaks, or other meals outside of the breakfast, lunch, and dinner categories.
    6.  **IMPORTANT:** Do not include any text, explanations, apologies, or markdown formatting (like \`\`\`json ... \`\`\`) before or after the JSON object in your response. Output ONLY the raw JSON object itself.
    `;
};

// --- API Route ---
geminiRouter.post('/generate-diet', authenticateToken, async (req, res) => {
    console.log("Received request body:", req.body);

    const { height, weight, birth_date, gender, goal, numTrainingDays} = req.body;
    console.log("Parsed request body:", { height, weight, birth_date, gender, goal, numTrainingDays });
    // Basic Input Validation
    if (!height || !weight || !birth_date || !gender || !goal || !numTrainingDays) {
        console.error("Validation Error: Missing required fields");
        return res.status(400).json({
            error: "Missing required fields. Please provide height, weight, birth date, gender, and goal.",
        });
    }

    // Calculate age from birth_date
    const age = calculateAge(birth_date);

    // Calculate TDEE and target calories using the imported calculator
    const tdeeResult = calculateTDEE(weight, height, age, gender, numTrainingDays);
    
    // Set target calories based on goal
    let targetCalories;
    switch(goal.toLowerCase()) {
        case 'gain_muscle':
            targetCalories = tdeeResult.targets.muscle_gain;
            break;
        case 'lose_fat':
            targetCalories = tdeeResult.targets.lose_fat;
            break;
        default:
            targetCalories = tdeeResult.targets.maintain;
    }

    try {
        const prompt = buildDietPrompt(height, weight, age, gender, goal, numTrainingDays, tdeeResult.tdee, targetCalories);
        console.log("\n--- Sending Prompt to Gemini ---");
        console.log(prompt);
        console.log("-------------------------------\n");

        const result = await model.generateContent(prompt);
        const response = result.response;
        const geminiOutput = response.text();

        console.log("\n--- Received Raw Output from Gemini ---");
        console.log(geminiOutput);
        console.log("-------------------------------------\n");

        // Attempt to parse the JSON response from Gemini
        let workoutPlanJson;
        try {
            let processedOutput = geminiOutput.trim(); // Start with basic trimming
        
            // 1. Remove optional leading ```json or ```
            if (processedOutput.startsWith("```json")) {
                processedOutput = processedOutput.substring(7).trim(); // Remove ```json and trim again
            } else if (processedOutput.startsWith("```")) {
                processedOutput = processedOutput.substring(3).trim(); // Remove ``` and trim again
            }
        
            // 2. Remove optional trailing ```
            if (processedOutput.endsWith("```")) {
                processedOutput = processedOutput.substring(0, processedOutput.length - 3).trim(); // Remove trailing ``` and trim
            }
        
            // 3. Now, attempt to parse the potentially cleaner string
            console.log("\n--- Attempting to Parse Cleaned Output ---");
            console.log(processedOutput); // Log exactly what you're trying to parse
            console.log("-----------------------------------------\n");
        
            workoutPlanJson = JSON.parse(processedOutput);
        
        } catch (parseError) {
            console.error("Error parsing JSON response from Gemini:", parseError);
            console.error("Gemini Raw Output that caused error:", geminiOutput); // Log the original problematic output
            // Log the state *after* cleaning attempts if debugging
            // console.error("Output after cleaning attempt:", processedOutput);
            return res.status(500).json({
                error: "Failed to parse diet plan from AI response. The AI might not have returned valid JSON.",
                raw_ai_output: geminiOutput, // Optionally send back the raw output for debugging
                // cleaned_output_attempt: processedOutput // Optionally send this back too
            });
        }

        // Send the successfully parsed JSON back to the client
        res.status(200).json(workoutPlanJson);

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Check for specific safety blocking errors
        if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
            console.error("Safety Blocking Reason:", error.response.promptFeedback.blockReason);
            console.error("Safety Ratings:", error.response.promptFeedback.safetyRatings);
             return res.status(400).json({ // Use 400 for blocked prompt
                error: `Request blocked due to safety settings: ${error.response.promptFeedback.blockReason}`,
                details: "The prompt or the generated response violated safety policies."
            });
        }
        res.status(500).json({ error: "Failed to generate diet plan due to an internal server error." });
    }
});

// Add this new route
geminiRouter.post('/chat', authenticateToken, async (req, res) => {
    try {
      const { message, chatId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      let chat;
      let newChatId = chatId;

      if (chatId) {
        // Get existing chat history
        const chatHistory = chatSessions.get(chatId) || [];
        
        // Create chat with existing history
        chat = model.startChat({
          history: chatHistory
        });

        // Send new message to existing chat
        const result = await chat.sendMessage(message);
        const response = result.response;
        const geminiText = response.text();

        // Clean up the response text
        const cleanedText = geminiText
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/\n\*/g, '\n•')
          .replace(/(\d+\.)/g, '\n$1')
          .replace(/([.!?])\s+/g, '$1\n')
          .trim();

        // Update chat history with new exchange
        chatHistory.push(
          { role: "user", parts: [{ text: message }] },
          { role: "model", parts: [{ text: cleanedText }] }
        );
        chatSessions.set(chatId, chatHistory);

        res.status(200).json({ 
          response: cleanedText,
          chatId: chatId
        });
      } else {
        // Start new chat session
        newChatId = Date.now().toString();
        const initialHistory = [
          {
            role: "user",
            parts: [{ text: "You are a helpful fitness assistant. Please provide detailed, comprehensive responses about fitness, workouts, and health. For each response:\n1. Give specific details and examples\n2. Explain the reasoning behind recommendations\n3. Include relevant tips and best practices\n4. Aim for 3-5 sentences minimum\n5. Do not use markdown formatting\n6. If asked about exercises, include proper form instructions and common mistakes to avoid" }]
          },
          {
            role: "model",
            parts: [{ text: "I understand. I'll provide detailed, comprehensive responses with specific examples, proper explanations, and practical tips. I'll focus on giving thorough answers that are helpful and actionable." }]
          }
        ];

        chat = model.startChat({
          history: initialHistory
        });

        const result = await chat.sendMessage(message);
        const response = result.response;
        const geminiText = response.text();

        const cleanedText = geminiText
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/\n\*/g, '\n•')
          .replace(/(\d+\.)/g, '\n$1')
          .replace(/([.!?])\s+/g, '$1\n')
          .trim();

        // Store initial exchange
        initialHistory.push(
          { role: "user", parts: [{ text: message }] },
          { role: "model", parts: [{ text: cleanedText }] }
        );
        chatSessions.set(newChatId, initialHistory);

        res.status(200).json({ 
          response: cleanedText,
          chatId: newChatId
        });
      }
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
});

export default geminiRouter; // Use ES module export