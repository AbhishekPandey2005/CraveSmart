import React, { useState, useRef, useEffect } from 'react';
import { ActivityLevel, DietType, FitnessGoal, Gender, UserProfile, AnalysisResult, Account, SavedProfile } from './types';
import { analyzeMeal } from './services/geminiService';
import { Button } from './components/Button';
import { FormInput } from './components/FormInput';
import { FormSelect } from './components/FormSelect';
import { MacroCard } from './components/MacroCard';
import { AuthScreen } from './components/AuthScreen';
import { ThemeToggle } from './components/ThemeToggle';
import { Camera, Upload, ChefHat, Activity, User, Utensils, AlertCircle, Settings2, LogOut, Save, Trash2, FolderOpen, ArrowLeft, ArrowRight } from 'lucide-react';

const DB_KEY = 'craveSmart_db';
const THEME_KEY = 'craveSmartTheme';

const INITIAL_PROFILE: UserProfile = {
  age: 25,
  gender: Gender.Male,
  height: 175,
  weight: 70,
  activityLevel: ActivityLevel.Moderate,
  goal: FitnessGoal.Maintenance,
  dietType: DietType.NonVeg,
  country: 'India',
  preferLocalFood: true,
  isOnDiet: false,
  dietDescription: '',
  macroPreference: 'Balanced calories and protein (default)',
  proteinPreference: 'No specific preference (default)',
  manualCalorieLimitEnabled: false,
  manualCalorieLimit: undefined,
  availableItems: ''
};

const MACRO_PREFERENCES = [
  { label: "Balanced calories and protein (Default)", value: "Balanced calories and protein (default)" },
  { label: "Higher protein, lower calories (Cutting)", value: "Higher protein, lower calories (lean / cutting focus)" },
  { label: "Higher calories and higher protein (Bulking)", value: "Higher calories and higher protein (bulking focus)" },
  { label: "Lower carbs, moderate fats", value: "Lower carbs, moderate fats (low-carb style)" },
  { label: "Flexible, just make it realistic", value: "Flexible, just make it realistic" }
];

const PROTEIN_PREFERENCES = [
  { label: "No specific preference (default)", value: "No specific preference (default)" },
  { label: "Higher protein than normal", value: "Higher protein than normal" },
  { label: "Very high protein target (aggressive)", value: "Very high protein target (aggressive)" },
  { label: "Moderate protein", value: "Moderate protein" },
  { label: "Lower protein", value: "Lower protein" }
];

const App: React.FC = () => {
  // Auth & Account State
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // App Logic State
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null); 
  const [isSaving, setIsSaving] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const [mealImage, setMealImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [planType, setPlanType] = useState<'analyze' | 'full_day'>('analyze');
  const [mealsPerDay, setMealsPerDay] = useState<2 | 3 | 4 | 5>(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Mix & Match State
  const [selectedOptionIndices, setSelectedOptionIndices] = useState<number[]>([]);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === 'dark';
    }
    return false;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.accounts) {
          setAccounts(parsed.accounts);
        }
      } catch (e) {
        console.error("Failed to load accounts", e);
      }
    }
  }, []);

  const saveAccountsToStorage = (updatedAccounts: Account[]) => {
    setAccounts(updatedAccounts);
    localStorage.setItem(DB_KEY, JSON.stringify({ accounts: updatedAccounts }));
  };

  const updateCurrentUser = (updatedUser: Account) => {
    setCurrentUser(updatedUser);
    const updatedAccounts = accounts.map(a => a.id === updatedUser.id ? updatedUser : a);
    saveAccountsToStorage(updatedAccounts);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  const handleLogin = async (usernameOrEmail: string, password: string): Promise<string | null> => {
    const account = accounts.find(a => 
      (a.username === usernameOrEmail || a.email === usernameOrEmail) && a.password === password
    );
    if (account) {
      setCurrentUser(account);
      setProfile(INITIAL_PROFILE);
      setSelectedProfileId(null);
      setResult(null);
      return null;
    }
    return "Invalid username or password.";
  };

  const handleSignup = async (username: string, email: string, password: string): Promise<string | null> => {
    if (accounts.some(a => a.username === username)) {
      return "Username already exists.";
    }
    const newAccount: Account = {
      id: crypto.randomUUID(),
      username,
      email,
      password,
      profiles: []
    };
    const newAccounts = [...accounts, newAccount];
    saveAccountsToStorage(newAccounts);
    setCurrentUser(newAccount);
    setProfile(INITIAL_PROFILE);
    setSelectedProfileId(null);
    return null;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setResult(null);
    setMealImage(null);
    setPreviewUrl(null);
    setProfile(INITIAL_PROFILE);
    setSelectedProfileId(null);
    setPlanType('analyze');
  };

  const handleProfileSelect = (id: string) => {
    if (id === 'new') {
      setProfile(INITIAL_PROFILE);
      setSelectedProfileId(null);
    } else if (currentUser) {
      const selected = currentUser.profiles.find(p => p.id === id);
      if (selected) {
        setProfile(selected);
        setSelectedProfileId(selected.id);
      }
    }
  };

  const handleSaveProfile = () => {
    if (!currentUser) return;
    if (selectedProfileId) {
      const updatedProfiles = currentUser.profiles.map(p => 
        p.id === selectedProfileId ? { ...profile, id: p.id, profileName: p.profileName } : p
      );
      updateCurrentUser({ ...currentUser, profiles: updatedProfiles });
      alert("Profile updated successfully!");
    } else {
      setIsSaving(true);
    }
  };

  const confirmSaveNewProfile = () => {
    if (!currentUser || !newProfileName.trim()) return;
    const newProfile: SavedProfile = {
      ...profile,
      id: crypto.randomUUID(),
      profileName: newProfileName.trim()
    };
    updateCurrentUser({
      ...currentUser,
      profiles: [...currentUser.profiles, newProfile]
    });
    setSelectedProfileId(newProfile.id);
    setIsSaving(false);
    setNewProfileName('');
  };

  const handleDeleteProfile = () => {
    if (!currentUser || !selectedProfileId) return;
    if (window.confirm("Are you sure you want to delete this profile?")) {
      const updatedProfiles = currentUser.profiles.filter(p => p.id !== selectedProfileId);
      updateCurrentUser({ ...currentUser, profiles: updatedProfiles });
      setProfile(INITIAL_PROFILE);
      setSelectedProfileId(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMealImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResult(null); 
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (planType === 'analyze' && !mealImage) {
      setError("Please upload a meal photo to analyze.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeMeal(mealImage, description, profile, planType, mealsPerDay);
      setResult(data);
      if (data.dailyPlan) {
        setSelectedOptionIndices(new Array(data.dailyPlan.length).fill(0));
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    if (planType === 'analyze') {
        setDescription('');
        setMealImage(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cycleOption = (mealIndex: number, direction: 'prev' | 'next') => {
    if (!result?.dailyPlan) return;
    const options = result.dailyPlan[mealIndex].options;
    if (!options || options.length <= 1) return;

    const currentIndex = selectedOptionIndices[mealIndex] ?? 0;
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= options.length) newIndex = 0;
    if (newIndex < 0) newIndex = options.length - 1;

    const newIndices = [...selectedOptionIndices];
    newIndices[mealIndex] = newIndex;
    setSelectedOptionIndices(newIndices);
  };

  /**
   * Robust number parsing helper for AI response fields.
   * Handles literal numbers, numeric strings with units (e.g., "25g", "400 kcal"),
   * and accidentally nested objects from the AI.
   */
  const safeNum = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    
    // If AI mistakenly nested data in an object, try to extract first numeric property
    if (typeof val === 'object' && val !== null) {
      for (const k in val) {
        const v = val[k];
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          const n = parseFloat(v.replace(/[^\d.]/g, ''));
          if (!isNaN(n)) return n;
        }
      }
      return 0;
    }

    // Handle strings: strip all non-digit/decimal characters
    const cleaned = String(val).replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  /**
   * Formats a value for display with a fallback for truly missing data.
   */
  const formatVal = (val: any, suffix: string = ''): string => {
    const rawNum = safeNum(val);
    
    // Fallback logic
    const isActuallyMissing = val === undefined || val === null || val === '';
    
    // Show placeholder for 0 calories as it's unlikely for a full meal
    if (rawNum === 0 && suffix.includes('kcal')) return '—';
    if (rawNum === 0 && isActuallyMissing) return '—';
    
    return `${rawNum}${suffix}`;
  };

  const calculateDailyTotals = () => {
    if (!result?.dailyPlan || result.dailyPlan.length === 0) return null;
    
    const sums = result.dailyPlan.reduce((acc, slot, idx) => {
      const optionIdx = selectedOptionIndices[idx] ?? 0;
      const option = slot.options?.[optionIdx];
      
      if (!option) return acc;

      return {
        calories: acc.calories + safeNum(option.calories),
        protein: acc.protein + safeNum(option.protein),
        carbs: acc.carbs + safeNum(option.carbs),
        fats: acc.fats + safeNum(option.fats),
      };
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const displayTotals = {
        calories: sums.calories > 0 ? sums.calories : '—',
        protein: sums.protein > 0 ? sums.protein : '—',
        carbs: sums.carbs > 0 ? sums.carbs : '—',
        fats: sums.fats > 0 ? sums.fats : '—',
    };

    return displayTotals;
  };

  if (!currentUser) {
    return (
      <AuthScreen 
        onLogin={handleLogin} 
        onSignup={handleSignup} 
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  const totals = calculateDailyTotals();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 transition-colors duration-200">
      
      {isSaving && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-xl animate-fadeIn">
            <h3 className="font-bold text-lg mb-4 dark:text-white">Name your Profile</h3>
            <input
              type="text"
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-3 mb-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Bulking Plan, Keto Diet..."
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsSaving(false)} className="w-auto py-2 px-4">Cancel</Button>
              <Button onClick={confirmSaveNewProfile} className="w-auto py-2 px-4">Save</Button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm transition-colors duration-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
              <ChefHat size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight hidden sm:block">CraveSmart</h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 mr-2">
               <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:block">Hi, {currentUser.username}</span>
             </div>
             <ThemeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Log Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {!result && !loading && (
          <div className="text-center py-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Your Personal AI Nutritionist</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">Snap a photo of your meal or generate a full day plan tailored to your goals.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 text-red-700 dark:text-red-300 animate-fadeIn">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!result && (
          <div className="space-y-6 animate-fadeIn">
            
            <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
               <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                <Activity className="text-emerald-600 dark:text-emerald-400" size={20} />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">1. Select Mode</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <button
                     className={`p-4 rounded-xl border-2 text-left transition-all ${
                       planType === 'analyze' 
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                     }`}
                     onClick={() => setPlanType('analyze')}
                   >
                     <div className="font-semibold text-slate-800 dark:text-slate-200">Analyze Meal Only</div>
                     <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload a photo to get macros and insights.</div>
                   </button>
                   <button
                     className={`p-4 rounded-xl border-2 text-left transition-all ${
                       planType === 'full_day' 
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                     }`}
                     onClick={() => setPlanType('full_day')}
                   >
                     <div className="font-semibold text-slate-800 dark:text-slate-200">Build Full Day Plan</div>
                     <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Generate a complete diet plan from scratch.</div>
                   </button>
                </div>
              </div>
            </section>
            
            {planType === 'analyze' && (
              <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200 animate-fadeIn">
                <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                  <Camera className="text-emerald-600 dark:text-emerald-400" size={20} />
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200">2. Upload Meal Photo (Required)</h3>
                </div>
                <div className="p-6">
                  <div 
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                      previewUrl 
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageChange}
                    />
                    
                    {previewUrl ? (
                      <div className="relative inline-block">
                        <img src={previewUrl} alt="Meal preview" className="max-h-64 rounded-lg shadow-md" />
                        <div className="absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center group">
                           <div className="bg-white/90 text-slate-700 px-3 py-1.5 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 shadow-sm">
                             <Upload size={16} /> Change Photo
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full">
                           <Utensils size={32} />
                        </div>
                        <div>
                          <p className="text-slate-700 dark:text-slate-300 font-medium">Click to upload meal photo</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">JPG, PNG supported</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1 mb-1 block">Describe (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., 2 slices of toast with avocado and 1 egg"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                    />
                  </div>
                </div>
              </section>
            )}

            {planType === 'full_day' && (
              <>
                <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200 animate-fadeIn">
                  <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <FolderOpen className="text-emerald-600 dark:text-emerald-400" size={20} />
                       <h3 className="font-semibold text-slate-700 dark:text-slate-200">2. Select Profile</h3>
                     </div>
                     <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                       {currentUser.profiles.length} Saved
                     </div>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-1 w-full">
                        <FormSelect
                          label="Load a Saved Profile"
                          value={selectedProfileId || 'new'}
                          onChange={(e) => handleProfileSelect(e.target.value)}
                          options={[
                            { label: '+ Create New / Editing Unsaved', value: 'new' },
                            ...currentUser.profiles.map(p => ({ label: p.profileName, value: p.id }))
                          ]}
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={handleSaveProfile}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                          title={selectedProfileId ? "Update Profile" : "Save as New Profile"}
                        >
                          <Save size={16} />
                          {selectedProfileId ? 'Update' : 'Save'}
                        </button>
                        {selectedProfileId && (
                           <button 
                             onClick={handleDeleteProfile}
                             className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                             title="Delete Profile"
                           >
                             <Trash2 size={16} />
                           </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200 animate-fadeIn">
                   <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                    <User className="text-emerald-600 dark:text-emerald-400" size={20} />
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">3. Profile Details</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormInput 
                          label="Age" 
                          type="number" 
                          value={profile.age} 
                          onChange={(e) => setProfile({...profile, age: Number(e.target.value)})}
                          min={10} max={100}
                        />
                        <FormSelect
                          label="Gender"
                          value={profile.gender}
                          onChange={(e) => setProfile({...profile, gender: e.target.value as Gender})}
                          options={Object.values(Gender).map(g => ({ label: g, value: g }))}
                        />
                        <FormInput 
                          label="Height (cm)" 
                          type="number" 
                          value={profile.height}
                          onChange={(e) => setProfile({...profile, height: Number(e.target.value)})} 
                        />
                        <FormInput 
                          label="Weight (kg)" 
                          type="number" 
                          value={profile.weight}
                          onChange={(e) => setProfile({...profile, weight: Number(e.target.value)})} 
                        />
                        <FormSelect
                          className="md:col-span-2"
                          label="Activity Level"
                          value={profile.activityLevel}
                          onChange={(e) => setProfile({...profile, activityLevel: e.target.value as ActivityLevel})}
                          options={Object.values(ActivityLevel).map(a => ({ label: a, value: a }))}
                        />
                        <FormSelect
                          label="Fitness Goal"
                          value={profile.goal}
                          onChange={(e) => setProfile({...profile, goal: e.target.value as FitnessGoal})}
                          options={Object.values(FitnessGoal).map(g => ({ label: g, value: g }))}
                        />
                        <FormSelect
                          label="Diet Preference"
                          value={profile.dietType}
                          onChange={(e) => setProfile({...profile, dietType: e.target.value as DietType})}
                          options={Object.values(DietType).map(d => ({ label: d, value: d }))}
                        />
                        <FormInput
                          label="Country"
                          placeholder="e.g. India, USA, UK"
                          value={profile.country}
                          onChange={(e) => setProfile({...profile, country: e.target.value})}
                        />
                        <FormSelect
                          label="Prefer Local Cuisine?"
                          value={profile.preferLocalFood ? "Yes" : "No"}
                          onChange={(e) => setProfile({...profile, preferLocalFood: e.target.value === "Yes"})}
                          options={[
                            { label: "Yes, use local foods", value: "Yes" },
                            { label: "No, standard global plan", value: "No" }
                          ]}
                        />
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200 animate-fadeIn">
                   <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                    <Settings2 className="text-emerald-600 dark:text-emerald-400" size={20} />
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">4. Advanced Preferences (Optional)</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            checked={profile.isOnDiet || false}
                            onChange={(e) => setProfile({...profile, isOnDiet: e.target.checked})}
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Are you currently on a specific diet?</span>
                        </label>
                      </div>

                      {profile.isOnDiet && (
                        <div className="md:col-span-2 animate-fadeIn">
                           <FormInput 
                              label="Diet Description" 
                              placeholder="e.g., keto, low-carb, intermittent fasting, etc."
                              value={profile.dietDescription || ''}
                              onChange={(e) => setProfile({...profile, dietDescription: e.target.value})}
                           />
                        </div>
                      )}

                      <div className="md:col-span-2">
                         <FormSelect 
                            label="Macro / Goal Preference"
                            value={profile.macroPreference || MACRO_PREFERENCES[0].value}
                            onChange={(e) => setProfile({...profile, macroPreference: e.target.value})}
                            options={MACRO_PREFERENCES}
                         />
                      </div>

                      <div className="md:col-span-2">
                         <FormSelect 
                            label="Protein Intake Preference"
                            value={profile.proteinPreference || PROTEIN_PREFERENCES[0].value}
                            onChange={(e) => setProfile({...profile, proteinPreference: e.target.value})}
                            options={PROTEIN_PREFERENCES}
                         />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1 mb-1 block">Available ingredients / items you can cook with</label>
                        <textarea
                          placeholder="e.g. paneer, eggs, cheese, oats, rice, dal, vegetables..."
                          rows={3}
                          value={profile.availableItems || ''}
                          onChange={(e) => setProfile({...profile, availableItems: e.target.value})}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 outline-none hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
                        />
                      </div>

                      <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800 my-1"></div>

                      <div className="md:col-span-2">
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            checked={profile.manualCalorieLimitEnabled || false}
                            onChange={(e) => setProfile({...profile, manualCalorieLimitEnabled: e.target.checked})}
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Do you want to manually set a maximum calorie limit?</span>
                        </label>
                      </div>

                      {profile.manualCalorieLimitEnabled && (
                        <div className="md:col-span-2 animate-fadeIn">
                           <FormInput 
                              label="Maximum Daily Calories" 
                              type="number"
                              placeholder="e.g., 1800, 2000"
                              value={profile.manualCalorieLimit || ''}
                              onChange={(e) => setProfile({...profile, manualCalorieLimit: Number(e.target.value)})}
                              suffix="kcal"
                           />
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200 animate-fadeIn">
                   <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                    <Activity className="text-emerald-600 dark:text-emerald-400" size={20} />
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">5. Plan Options</h3>
                  </div>
                  <div className="p-6">
                     <FormSelect
                        label="Meals Per Day"
                        value={mealsPerDay}
                        onChange={(e) => setMealsPerDay(Number(e.target.value) as 2|3|4|5)}
                        options={[
                          { label: '2 Meals', value: 2 },
                          { label: '3 Meals', value: 3 },
                          { label: '4 Meals', value: 4 },
                          { label: '5 Meals', value: 5 },
                        ]}
                      />
                  </div>
                </section>
              </>
            )}

            <div className="pt-4 pb-8">
               <Button 
                 onClick={handleAnalyze} 
                 isLoading={loading}
                 disabled={planType === 'analyze' && !mealImage}
                 className="text-lg py-4 shadow-emerald-200 dark:shadow-none shadow-xl"
               >
                 {planType === 'analyze' ? 'Analyze Meal' : 'Generate Full Day Plan'}
               </Button>
            </div>

          </div>
        )}

        {loading && !result && (
           <div className="space-y-4 animate-pulse pt-8 text-center">
              <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full mx-auto max-w-sm mb-6"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mx-auto"></div>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-4 animate-bounce">Consulting the AI Nutritionist...</p>
           </div>
        )}

        {result && (
          <div className="space-y-6 animate-fadeIn">
             
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
                <div className="relative h-48 bg-slate-800">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Analyzed Meal" className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-slate-900 opacity-80 flex items-center justify-center">
                      <ChefHat className="text-white opacity-20" size={64} />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <h2 className="text-2xl font-bold text-white mb-1">{result.detectedMealName}</h2>
                    {safeNum(result.estimatedCalories) > 0 && (
                      <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
                         <span>{formatVal(result.estimatedCalories, ' kcal')}</span>
                         <span>•</span>
                         <span>Analyzed by CraveSmart</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-6">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Health Analysis</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{result.healthAnalysis}</p>
                  </div>

                  {(safeNum(result.macros?.protein) > 0 || safeNum(result.macros?.carbs) > 0 || safeNum(result.macros?.fats) > 0) && (
                    <>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">Meal Macros</h4>
                      <div className="grid grid-cols-3 gap-3">
                         <MacroCard label="Protein" value={safeNum(result.macros.protein)} unit="g" colorClass="text-blue-600 dark:text-blue-400" />
                         <MacroCard label="Carbs" value={safeNum(result.macros.carbs)} unit="g" colorClass="text-amber-600 dark:text-amber-400" />
                         <MacroCard label="Fats" value={safeNum(result.macros.fats)} unit="g" colorClass="text-rose-600 dark:text-rose-400" />
                      </div>
                    </>
                  )}
                </div>
             </div>
             
             {result.dailyPlan && result.dailyPlan.length > 0 && (
               <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
                  <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/20 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Utensils className="text-emerald-600 dark:text-emerald-400" size={20} />
                      <h3 className="font-semibold text-slate-700 dark:text-slate-200">Full Day Plan (Mix & Match)</h3>
                    </div>
                    
                    {totals && (
                       <div className="flex flex-wrap gap-3 text-xs font-medium bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-300">Total: {totals.calories} kcal</span>
                          <span className="text-blue-600 dark:text-blue-400">{totals.protein}g P</span>
                          <span className="text-amber-600 dark:text-amber-400">{totals.carbs}g C</span>
                          <span className="text-rose-600 dark:text-rose-400">{totals.fats}g F</span>
                       </div>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                     {result.dailyPlan.map((slot, mealIdx) => {
                       const options = slot.options || [];
                       if (options.length === 0) return null;

                       const selectedOptionIdx = selectedOptionIndices[mealIdx] ?? 0;
                       const selectedOption = options[selectedOptionIdx] || options[0];
                       const optionCount = options.length;

                       return (
                         <div key={mealIdx} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                               <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{slot.mealTime}</span>
                               
                               {optionCount > 1 && (
                                 <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                    <button 
                                      onClick={() => cycleOption(mealIdx, 'prev')}
                                      className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 transition-colors"
                                      aria-label="Previous Option"
                                    >
                                      <ArrowLeft size={14} />
                                    </button>
                                    <span className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-[70px] text-center">
                                      Option {selectedOptionIdx + 1} / {optionCount}
                                    </span>
                                    <button 
                                      onClick={() => cycleOption(mealIdx, 'next')}
                                      className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 transition-colors"
                                      aria-label="Next Option"
                                    >
                                      <ArrowRight size={14} />
                                    </button>
                                 </div>
                               )}
                            </div>

                            {selectedOption && (
                              <div className="animate-fadeIn">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                      {selectedOption.optionName}
                                    </span>
                                    <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                                      {formatVal(selectedOption.calories, ' kcal')}
                                    </span>
                                  </div>
                                  
                                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
                                    {selectedOption.foodItems}
                                  </p>
                                  
                                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {formatVal(selectedOption.protein, 'g')} Protein</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> {formatVal(selectedOption.carbs, 'g')} Carbs</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> {formatVal(selectedOption.fats, 'g')} Fats</span>
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                    <a 
                                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedOption.foodItems + " recipe")}`}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                                    >
                                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                                      </svg>
                                      Watch on YouTube
                                    </a>
                                  </div>
                              </div>
                            )}
                         </div>
                       );
                     })}
                  </div>
               </div>
             )}

             <div className="bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-800 dark:to-teal-900 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden transition-colors duration-200">
                <ChefHat className="absolute top-4 right-4 text-emerald-500 opacity-20" size={64} />
                <h3 className="font-bold text-lg mb-2 relative z-10">Coach's Summary</h3>
                <p className="text-emerald-50 text-sm leading-relaxed relative z-10 opacity-90">
                  {result.coachSummary}
                </p>
             </div>

             <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={handleReset}>
                  {planType === 'full_day' && !mealImage ? 'Generate Another Plan' : 'Analyze Another Meal'}
                </Button>
             </div>

             <div className="text-center py-6">
                <p className="text-xs text-slate-400 dark:text-slate-600 max-w-lg mx-auto">
                  Disclaimer: This is an AI-based nutritional estimate and suggestion generator. Values are approximate. This is not a substitute for professional medical advice, diagnosis, or treatment.
                </p>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;