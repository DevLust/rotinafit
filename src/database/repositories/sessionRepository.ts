import { supabase } from '../../lib/supabase';
import { IWorkoutSession } from '../../interfaces';
import { todayDate } from '../../utils/streak';

export interface SessionWithWorkout extends IWorkoutSession {
  workout_name?: string;
  muscle_group?: string;
}

export function useSessionRepository() {
  async function completeWorkoutSession(
    userId: string,
    workoutId: number,
    completedExerciseIds: number[],
  ): Promise<IWorkoutSession> {
    const today = todayDate();

    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('workout_id', workoutId)
      .eq('checkin_date', today)
      .maybeSingle();

    let sessionId: number;

    if (existing) {
      sessionId = existing.id;
      await supabase
        .from('workout_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', sessionId);
    } else {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          workout_id: workoutId,
          checkin_date: today,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      sessionId = data.id;
    }

    if (completedExerciseIds.length > 0) {
      await supabase.from('exercise_logs').delete().eq('session_id', sessionId);
      await supabase.from('exercise_logs').insert(
        completedExerciseIds.map(exerciseId => ({
          session_id: sessionId,
          exercise_id: exerciseId,
          is_completed: true,
        })),
      );
    }

    const { data: session } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    return session!;
  }

  async function hasSessionToday(userId: string, workoutId: number): Promise<boolean> {
    const { count } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('workout_id', workoutId)
      .eq('checkin_date', todayDate());
    return (count ?? 0) > 0;
  }

  async function getRecentSessions(userId: string, limit = 10): Promise<SessionWithWorkout[]> {
    const { data } = await supabase
      .from('workout_sessions')
      .select('*, workouts(name, muscle_group)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    return (data ?? []).map((s: any) => ({
      ...s,
      workout_name: s.workouts?.name,
      muscle_group: s.workouts?.muscle_group,
    }));
  }

  async function getSessionsLast30Days(userId: string): Promise<number> {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const { count } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('checkin_date', from.toISOString().split('T')[0]);
    return count ?? 0;
  }

  return {
    completeWorkoutSession,
    hasSessionToday,
    getRecentSessions,
    getSessionsLast30Days,
  };
}
