import type { GoalValue } from '@/lib/goals';

// Injury area options for structured health data collection
export const INJURY_AREA_OPTIONS = [
  { key: 'shoulder', label: 'Ombro' },
  { key: 'lower_back', label: 'Lombar' },
  { key: 'cervical', label: 'Cervical' },
  { key: 'knee', label: 'Joelho' },
  { key: 'hip', label: 'Quadril' },
  { key: 'ankle_foot', label: 'Tornozelo/Pé' },
] as const;

export type InjuryArea = typeof INJURY_AREA_OPTIONS[number]['key'];

export type CardioTiming = 'pre_workout' | 'post_workout' | 'separate_day' | 'ai_decides';

export interface OnboardingData {
  // Step 1 - Name
  name: string;
  
  // Step 2 - Personal Data
  gender: 'female' | 'male' | 'other' | null;
  birthDate: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  
  // Step 3 - Goals
  goal: GoalValue | null;
  goals: GoalValue[];
  
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
  splitPreference: 'fullbody' | 'push_pull_legs' | 'hybrid' | 'no_preference' | null;
  
  // Step 10 - Variation Preference
  variationPreference: 'high' | 'moderate' | 'low' | null;
  
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
  birthDate: null,
  age: null,
  height: null,
  weight: null,
  goal: null,
  goals: [],
  timeframe: '6months', // Fixo em 6 meses para modelo low-cost
  trainingDays: [],
  sessionDuration: null,
  exerciseTypes: [],
  includeCardio: false,
  cardioTiming: null,
  experienceLevel: null,
  splitPreference: null, // Ignorado no modelo low-cost (automático)
  variationPreference: 'low', // Fixo em 'low' para modelo low-cost
  bodyAreas: [],
  hasHealthConditions: false,
  injuryAreas: [],
  healthDescription: '',
  sleepHours: null,
  stressLevel: null,
};
