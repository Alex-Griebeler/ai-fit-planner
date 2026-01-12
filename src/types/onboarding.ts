export interface OnboardingData {
  // Step 1 - Name
  name: string;
  
  // Step 2 - Personal Data
  gender: 'female' | 'male' | 'other' | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  
  // Step 3 - Goals
  goal: 'weight_loss' | 'hypertrophy' | 'health' | 'performance' | null;
  
  // Step 4 - Timeframe
  timeframe: '3months' | '6months' | '12months' | null;
  
  // Step 5 - Training Days
  trainingDays: string[];
  
  // Step 6 - Session Duration
  sessionDuration: '30min' | '45min' | '60min' | '60plus' | null;
  
  // Step 7 - Exercise Types
  exerciseTypes: string[];
  includeCardio: boolean;
  
  // Step 8 - Experience Level
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  
  // Step 9 - Variation Preference
  variationPreference: 'high' | 'moderate' | 'low' | null;
  
  // Step 10 - Body Areas
  bodyAreas: string[];
  
  // Step 11 - Health
  hasHealthConditions: boolean;
  healthDescription: string;
  
  // Step 12 - Sleep & Stress
  sleepHours: string | null;
  stressLevel: 'low' | 'moderate' | 'high' | null;
}

export const initialOnboardingData: OnboardingData = {
  name: '',
  gender: null,
  age: null,
  height: null,
  weight: null,
  goal: null,
  timeframe: null,
  trainingDays: [],
  sessionDuration: null,
  exerciseTypes: [],
  includeCardio: false,
  experienceLevel: null,
  variationPreference: null,
  bodyAreas: [],
  hasHealthConditions: false,
  healthDescription: '',
  sleepHours: null,
  stressLevel: null,
};
