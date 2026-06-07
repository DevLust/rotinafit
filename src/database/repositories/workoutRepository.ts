import { supabase } from '../../lib/supabase';
import { IWorkout, IExercise } from '../../interfaces';

export function useWorkoutRepository() {
  async function createWorkout(data: Omit<IWorkout, 'id' | 'created_at'>): Promise<number> {
    const { data: row, error } = await supabase
      .from('workouts')
      .insert(data)
      .select('id')
      .single();
    if (error) throw error;
    return row.id;
  }

  async function getWorkoutsByUser(userId: string): Promise<IWorkout[]> {
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week', { ascending: true });
    return data ?? [];
  }

  async function getWorkoutById(id: number): Promise<IWorkout | null> {
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .single();
    return data ?? null;
  }

  async function getWorkoutsByDay(userId: string, dayOfWeek: number): Promise<IWorkout[]> {
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .eq('day_of_week', dayOfWeek);
    return data ?? [];
  }

  async function updateWorkout(id: number, data: Partial<Omit<IWorkout, 'id' | 'user_id' | 'created_at'>>) {
    const { error } = await supabase
      .from('workouts')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async function deleteWorkout(id: number) {
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) throw error;
  }

  async function createExercise(data: Omit<IExercise, 'id'>): Promise<number> {
    const { data: row, error } = await supabase
      .from('exercises')
      .insert(data)
      .select('id')
      .single();
    if (error) throw error;
    return row.id;
  }

  async function getExercisesByWorkout(workoutId: number): Promise<IExercise[]> {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('workout_id', workoutId);
    return data ?? [];
  }

  async function updateExercise(id: number, data: Partial<Omit<IExercise, 'id' | 'workout_id'>>) {
    const { error } = await supabase
      .from('exercises')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async function deleteExercise(id: number) {
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) throw error;
  }

  return {
    createWorkout,
    getWorkoutsByUser,
    getWorkoutById,
    getWorkoutsByDay,
    updateWorkout,
    deleteWorkout,
    createExercise,
    getExercisesByWorkout,
    updateExercise,
    deleteExercise,
  };
}
