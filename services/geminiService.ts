import { GoogleGenAI } from "@google/genai";
import { UserProfile, AnalysisResult, DietType, MealSlot } from "../types";

// Helper to convert File to Base64 (without the data:... prefix)
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string, mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(",")[1]; // remove "data:image/...;base64,"
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Keywords that indicate non-vegetarian ingredients
const NON_VEG_KEYWORDS = [
  "chicken", "meat", "beef", "pork", "lamb", "mutton", "fish", "seafood", 
  "prawn", "shrimp", "crab", "lobster", "ham", "bacon", "sausage", "salmon", 
  "tuna", "steak", "pepperoni", "salami"
];

// Keywords that indicate eggs
const EGG_KEYWORDS = ["egg", "omelet", "omelette", "scramble", "poached egg"];

const sanitizeMealPlan = (result: AnalysisResult, userProfile: UserProfile): AnalysisResult => {
  if (!result.dailyPlan || !Array.isArray(result.dailyPlan)) return result;

  const isVeg = userProfile.dietType === DietType.Vegetarian;
  const isVegPlusEggs = userProfile.dietType === DietType.VegPlusEggs;

  // If Non-Veg, no restriction needed
  if (!isVeg && !isVegPlusEggs) return result;

  const forbiddenWords = isVeg 
    ? [...NON_VEG_KEYWORDS, ...EGG_KEYWORDS] 
    : [...NON_VEG_KEYWORDS];

  const safeReplacement = userProfile.country.toLowerCase().includes('india')
    ? "Chef's Special: Paneer Tikka with Vegetables & Lentils"
    : "Chef's Special: Grilled Plant Protein with Roasted Vegetables";

  const sanitizedPlan: MealSlot[] = result.dailyPlan.map(slot => {
    // Safety check: Ensure options is an array
    if (!slot.options || !Array.isArray(slot.options)) return slot;

    const sanitizedOptions = slot.options.map(option => {
      const lowerDesc = option.foodItems.toLowerCase();
      const hasForbidden = forbiddenWords.some(word => lowerDesc.includes(word));

      if (hasForbidden) {
        // Detected a violation. Replace the food description to be safe.
        return {
          ...option,
          foodItems: `${safeReplacement} (Replaced non-compliant item)`,
        };
      }
      return option;
    });

    return {
      ...slot,
      options: sanitizedOptions
    };
  });

  return {
    ...result,
    dailyPlan: sanitizedPlan
  };
};

export const analyzeMeal = async (
  imageFile: File | null,
  description: string,
  userProfile: UserProfile,
  planType: "analyze" | "full_day",
  mealsPerDay: number
): Promise<AnalysisResult> => {
  // Use process.env.API_KEY exclusively as required by guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use gemini-3-pro-preview for complex reasoning and planning
  const modelName = 'gemini-3-pro-preview';

  let imagePart = null;
  if (imageFile) {
    imagePart = await fileToGenerativePart(imageFile);
  }

  const prompt = `
    You are an expert fitness and nutrition coach called "CraveSmart".

    I will provide ${imageFile ? "a meal image and " : ""}some user details.

    User Profile:
    - Age: ${userProfile.age}
    - Gender: ${userProfile.gender}
    - Height: ${userProfile.height} cm
    - Weight: ${userProfile.weight} kg
    - Activity: ${userProfile.activityLevel}
    - Goal: ${userProfile.goal}
    - Diet Type: ${userProfile.dietType}
    - Country: ${userProfile.country}
    - Prefer Local Cuisine: ${userProfile.preferLocalFood ? "Yes" : "No"}
    - Available Ingredients: "${userProfile.availableItems || "None provided"}"
    
    Advanced Preferences:
    - Currently on a specific diet: ${userProfile.isOnDiet ? "Yes" : "No"}
    - Specific Diet Details: ${userProfile.isOnDiet && userProfile.dietDescription ? userProfile.dietDescription : "None"}
    - Macro/Goal Preference: ${userProfile.macroPreference || "Balanced calories and protein (Default)"}
    - Protein Preference: ${userProfile.proteinPreference || "No specific preference (default)"}
    - Manual Calorie Limit Enabled: ${userProfile.manualCalorieLimitEnabled ? "Yes" : "No"}
    - Manual Calorie Limit Value: ${userProfile.manualCalorieLimitEnabled && userProfile.manualCalorieLimit ? userProfile.manualCalorieLimit + " kcal" : "None"}

    User Request:
    - Plan Type: ${planType === "full_day" ? (imageFile ? "Full Day Plan including this meal" : "Create a Full Day Plan based on profile") : "Just Analyze this meal"}
    - Meals Per Day Preference: ${mealsPerDay}
    - Optional User Description of Meal: "${description && description.trim().length > 0 ? description : "None provided"}"

    CRITICAL STRICT DIET RULES (MUST FOLLOW):
    1. If Diet Type is 'Vegetarian': DO NOT include meat, fish, seafood, or eggs in ANY suggested meal.
    2. If Diet Type is 'Vegetarian + Eggs': DO NOT include meat, fish, or seafood. Eggs are allowed.
    3. If Diet Type is 'Non-Vegetarian': No restrictions.
    4. If the user is on a specific diet (e.g., Keto), strictly adhere to those principles (e.g., low carb).
    
    Task:
    1. ${imageFile ? "Analyze the image and description to identify the food. Identify main foods and approximate portions." : "No image provided. Skip food identification."}
    2. ${imageFile ? "Estimate total calories, Protein (g), Carbs (g), and Fats (g). If uncertain, make a reasonable educated estimate." : "Skip specific meal macro estimation, return 0 for meal macros."}
    3. ${imageFile ? "Analyze if this meal fits the user's goal and macro preferences." : "Skip specific meal analysis."}
    4. ${planType === "full_day" ? `Create a full day diet plan${imageFile ? " that INCLUDES this meal as one of the meals" : ""}. 
       - If 'Available Ingredients' are provided, PRIORITIZE using these items in the meal options where possible.
       - CRITICAL CALORIE RULE: If 'Manual Calorie Limit Enabled' is Yes and a value is provided, the TOTAL daily calories MUST NOT exceed that limit.
       - Otherwise, calculate TDEE using Mifflin-St Jeor.
       - The plan should have EXACTLY ${mealsPerDay} meal slots.
       - For ${mealsPerDay} meals:
         - If 2 meals: Suggest "Breakfast" and "Dinner" (ideal for intermittent fasting/cutting) or "Lunch" and "Dinner".
         - If 3 meals: Suggest "Breakfast", "Lunch", "Dinner".
         - If 4+ meals: Suggest appropriate snacks or pre/post workout slots.
       - FOR EACH MEAL SLOT, provide 2-3 distinct options (e.g., Option 1, Option 2, Option 3) so the user can mix and match.
       - FOR EACH meal option inside dailyPlan[i].options, you MUST calculate and return:
          - calories (number)
          - protein (grams, number)
          - carbs (grams, number)
          - fats (grams, number)
       - Do NOT leave these fields empty, null, or zero. Every option MUST contain numeric values.
       - If any meal option is missing calories or macros, recompute them before returning the final JSON.
       - Ensure 'options' is always an array of objects.
       ` : "Do not generate a full day plan."}
    5. Adjust the daily protein target based on the user’s protein preference.
    6. If the user prefers local cuisine (Prefer Local Cuisine: Yes), all meals must use dishes common in ${userProfile.country}.
    7. Provide a short "Coach Summary" giving advice or encouragement.

    CRITICAL: Return the output strictly as a JSON object.

    Expected JSON Structure:
    {
      "detectedMealName": "${imageFile ? "String description of the meal" : "Full Day Plan Generation"}",
      "estimatedCalories": Number,
      "macros": {
        "protein": Number,
        "carbs": Number,
        "fats": Number
      },
      "healthAnalysis": "String paragraph evaluating the meal against goals (or general advice if no meal)",
      "dailyPlan": [
        {
          "mealTime": "String",
          "options": [
            {
              "optionName": "Option 1",
              "foodItems": "List of foods",
              "calories": Number,
              "protein": Number,
              "carbs": Number,
              "fats": Number
            }
          ]
        }
      ],
      "coachSummary": "String summary"
    }
  `;

  try {
    const textPart = { text: prompt };
    const contents = imagePart ? { parts: [imagePart, textPart] } : prompt;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("Received empty response from Gemini");

    const data = JSON.parse(text) as AnalysisResult;
    
    // Apply client-side safety check for strict diet enforcement
    const sanitizedData = sanitizeMealPlan(data, userProfile);
    
    return sanitizedData;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze meal or generate plan. Please try again.");
  }
};