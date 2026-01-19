
export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other'
}

export enum ActivityLevel {
  Sedentary = 'Sedentary (little to no exercise)',
  Light = 'Light (exercise 1-3 times/week)',
  Moderate = 'Moderate (exercise 4-5 times/week)',
  High = 'High (intense exercise 6-7 times/week)'
}

export enum FitnessGoal {
  Bulking = 'Bulking (Gain Muscle)',
  Cutting = 'Cutting (Lose Fat)',
  Maintenance = 'Maintenance (Stay same)'
}

export enum DietType {
  Vegetarian = 'Vegetarian',
  VegPlusEggs = 'Vegetarian + Eggs',
  NonVeg = 'Non-Vegetarian'
}

export interface UserProfile {
  age: number;
  gender: Gender;
  height: number; // cm
  weight: number; // kg
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  dietType: DietType;
  country: string;
  preferLocalFood: boolean;
  // Advanced Preferences
  isOnDiet?: boolean;
  dietDescription?: string;
  macroPreference?: string;
  proteinPreference?: string;
  manualCalorieLimitEnabled?: boolean;
  manualCalorieLimit?: number;
  availableItems?: string;
}

export interface SavedProfile extends UserProfile {
  id: string;
  profileName: string;
}

export interface Account {
  id: string;
  username: string;
  email?: string;
  password: string; // Plain text for demo
  profiles: SavedProfile[];
}

export interface MealOption {
  optionName: string; // "Option 1", "High Protein Option", etc.
  foodItems: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MealSlot {
  mealTime: string; // Breakfast, Lunch, etc.
  options: MealOption[];
}

export interface AnalysisResult {
  detectedMealName: string;
  estimatedCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  healthAnalysis: string;
  dailyPlan?: MealSlot[];
  coachSummary: string;
  disclaimer?: string;
}

export interface AppState {
  userProfile: UserProfile;
  mealImage: File | null;
  mealDescription: string;
  planType: 'analyze' | 'full_day';
  mealsPerDay: 2 | 3 | 4 | 5;
  loading: boolean;
  result: AnalysisResult | null;
  error: string | null;
}
