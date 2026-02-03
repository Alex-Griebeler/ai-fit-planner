// Injury area options for structured health data collection
export const INJURY_AREA_OPTIONS = [
  { key: 'shoulder', label: 'Ombro', description: 'Dor, instabilidade ou limitação' },
  { key: 'lower_back', label: 'Lombar', description: 'Dor, hérnia ou desconforto' },
  { key: 'cervical', label: 'Cervical', description: 'Dor ou tensão' },
  { key: 'knee', label: 'Joelho', description: 'Dor, instabilidade ou crepitação' },
  { key: 'hip', label: 'Quadril', description: 'Dor ou limitação de movimento' },
  { key: 'ankle_foot', label: 'Tornozelo/Pé', description: 'Dor, entorse ou lesão' },
] as const;

export type InjuryArea = typeof INJURY_AREA_OPTIONS[number]['key'];

export type CardioTiming = 'post_workout' | 'separate_day' | 'ai_decides';

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
  cardioTiming: CardioTiming | null;
  
  // Step 8 - Experience Level
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  
  // Step 9 - Split Preference (only for 3x/week intermediate/advanced)
  splitPreference: 'fullbody' | 'hybrid' | null;
  
  // Step 10 - Body Areas
  bodyAreas: string[];
  
  // Step 11 - Health
  hasHealthConditions: boolean;
  injuryAreas: InjuryArea[];
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
  cardioTiming: null,
  experienceLevel: null,
  splitPreference: null,
  bodyAreas: [],
  hasHealthConditions: false,
  injuryAreas: [],
  healthDescription: '',
  sleepHours: null,
  stressLevel: null,
};
