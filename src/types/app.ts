// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export interface Habits {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    description?: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    target_count?: number;
    color?: string;
    icon?: string;
    created_at?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface HabitLogs {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    habit_id?: string; // applookup -> URL zu 'Habits' Record
    date?: string; // Format: YYYY-MM-DD oder ISO String
    completed?: boolean;
    notes?: string;
  };
}

export const APP_IDS = {
  HABITS: '6980ab411df14e26ef90fad2',
  HABIT_LOGS: '6980ab417ea92a137dca8cf8',
} as const;

// Helper Types for creating new records
export type CreateHabits = Habits['fields'];
export type CreateHabitLogs = HabitLogs['fields'];