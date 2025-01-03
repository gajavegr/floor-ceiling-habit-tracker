export interface User {
  id: string;
  name: string;
}

export interface GoalLog {
  id: string;
  goalId: string;
  userId: string;
  date: string;
  status: 'achieved' | 'failed' | 'not_logged';
  rating?: number; // 1-10 rating when status is 'achieved'
}

export type FrequencyType = 
  | 'daily' 
  | 'specific_days' 
  | 'days_per_period' 
  | 'repeating_n_days';

export type PeriodUnit = 'week' | 'month' | 'year';

export interface Goal {
  id: string;
  userId: string;
  category: string;
  title: string;
  floor: string;
  ceiling: string;
  unit: string;
  startDate: Date;
  // New fields
  frequencyType: FrequencyType;
  specificDays?: string[]; // ['monday', 'wednesday', etc.]
  daysPerPeriod?: number;
  periodUnit?: PeriodUnit;
  repeatEveryNDays?: number;
  targetDate?: Date;
  targetSuccesses?: number;
}