// geminiRouter.js
import express from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const geminiRouter = express.Router();

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
geminiRouter.get('/generate-workout', async (req, res) => {
    console.log("Received request body:", req.body); // Log incoming data

    const { height, weight, age, gender, goal, numTrainingDays } = req.query; // Use query parameters for GET request

    // Basic Input Validation
    if (!height || !weight || !age || !gender || !goal || !numTrainingDays) {
        console.error("Validation Error: Missing required fields");
        return res.status(400).json({
            error: "Missing required fields. Please provide height, weight, age, gender, and goal.",
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
geminiRouter.get('/daily-challenge', async (req, res) => {
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
        const prompt = `Generate a JSON object representing a 10-minute HIIT workout with exactly 4 exercises.
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
Ensure the output contains ONLY the raw JSON object, with no surrounding text or markdown formatting like \`\`\`json ... \`\`\`. Include a mix of duration-based (use "duration_seconds" key) and rep-based (use "reps" key) exercises suitable for HIIT.`;

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
geminiRouter.get('/daily-tip', async (req, res) => {
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

export default geminiRouter; // Use ES module export