export interface IProfile {
  id: string;
  name: string;
  fitness_goal: string | null;
  avatar_emoji: string;
  created_at: string;
  email?: string;
}

export interface IWorkout {
  id: number;
  user_id: string;
  name: string;
  day_of_week: number;
  muscle_group: string;
  description: string | null;
  created_at: string;
}

export interface IExercise {
  id: number;
  workout_id: number;
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  notes: string | null;
}

export interface IWorkoutSession {
  id: number;
  user_id: string;
  workout_id: number;
  checkin_date: string;
  completed_at: string;
  notes: string | null;
}

export interface IExerciseLog {
  id: number;
  session_id: number;
  exercise_id: number;
  is_completed: boolean;
}

export interface ICheckin {
  id: number;
  user_id: string;
  checkin_date: string;
  workout_id: number | null;
  streak_count: number;
  created_at: string;
}

export interface IHabit {
  id: number;
  user_id: string;
  name: string;
  icon_emoji: string;
  target_days_per_week: number;
  created_at: string;
}

export interface IHabitLog {
  id: number;
  habit_id: number;
  log_date: string;
}

export interface IGroup {
  id: number;
  name: string;
  description: string | null;
  created_by_user_id: string;
  invite_code: string;
  created_at: string;
  member_count?: number;
}

export interface IGroupMember {
  id: number;
  group_id: number;
  user_id: string;
  joined_at: string;
  user_name?: string;
  user_avatar?: string;
  streak_count?: number;
  last_checkin?: string;
}

export interface IGroupCheckin {
  id: number;
  group_id: number;
  user_id: string;
  checkin_date: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface IWeeklyStats {
  total_sessions: number;
  current_streak: number;
  longest_streak: number;
  sessions_by_day: Record<number, number>;
}

export interface IHabitStats {
  total_habits: number;
  done_today: number;
  done_this_week: number;
  longest_streak: number;
  total_logs_30d: number;
}
