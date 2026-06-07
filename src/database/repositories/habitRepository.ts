import { supabase } from '../../lib/supabase';
import { IHabit, IHabitLog, IHabitStats } from '../../interfaces';
import { calcStreakFromDates } from '../../utils/streak';

export function useHabitRepository() {
  async function createHabit(userId: string, name: string, iconEmoji: string, targetDays: number): Promise<number> {
    const { data, error } = await supabase
      .from('habits')
      .insert({ user_id: userId, name, icon_emoji: iconEmoji, target_days_per_week: targetDays })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async function getHabitsByUser(userId: string): Promise<IHabit[]> {
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async function logHabit(habitId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habitId)
      .eq('log_date', today)
      .maybeSingle();

    if (existing) {
      await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', today);
    } else {
      await supabase.from('habit_logs').insert({ habit_id: habitId, log_date: today });
    }
  }

  async function getWeeklyHabitLogs(habitId: number): Promise<IHabitLog[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const from = sevenDaysAgo.toISOString().split('T')[0];
    const { data } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('habit_id', habitId)
      .gte('log_date', from)
      .order('log_date', { ascending: true });
    return data ?? [];
  }

  async function isLoggedToday(habitId: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('habit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('habit_id', habitId)
      .eq('log_date', today);
    return (count ?? 0) > 0;
  }

  async function deleteHabit(habitId: number): Promise<void> {
    const { error } = await supabase.from('habits').delete().eq('id', habitId);
    if (error) throw error;
  }

  async function getHabitLogDates(habitId: number, days = 90): Promise<string[]> {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const { data } = await supabase
      .from('habit_logs')
      .select('log_date')
      .eq('habit_id', habitId)
      .gte('log_date', from.toISOString().split('T')[0]);
    return (data ?? []).map(l => l.log_date);
  }

  async function getHabitStreak(habitId: number): Promise<number> {
    const dates = await getHabitLogDates(habitId);
    return calcStreakFromDates(dates).streak;
  }

  async function getHabitStats(userId: string): Promise<IHabitStats> {
    const habits = await getHabitsByUser(userId);
    if (habits.length === 0) {
      return { total_habits: 0, done_today: 0, done_this_week: 0, longest_streak: 0, total_logs_30d: 0 };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const from30 = thirtyDaysAgo.toISOString().split('T')[0];

    let doneToday = 0;
    let doneThisWeek = 0;
    let longestStreak = 0;
    let totalLogs30d = 0;

    await Promise.all(
      habits.map(async habit => {
        const [loggedToday, weekLogs, streak, { count }] = await Promise.all([
          isLoggedToday(habit.id),
          getWeeklyHabitLogs(habit.id),
          getHabitStreak(habit.id),
          supabase
            .from('habit_logs')
            .select('*', { count: 'exact', head: true })
            .eq('habit_id', habit.id)
            .gte('log_date', from30),
        ]);
        if (loggedToday) doneToday++;
        doneThisWeek += weekLogs.length;
        longestStreak = Math.max(longestStreak, streak);
        totalLogs30d += count ?? 0;
      })
    );

    return {
      total_habits: habits.length,
      done_today: doneToday,
      done_this_week: doneThisWeek,
      longest_streak: longestStreak,
      total_logs_30d: totalLogs30d,
    };
  }

  return {
    createHabit,
    getHabitsByUser,
    logHabit,
    getWeeklyHabitLogs,
    isLoggedToday,
    deleteHabit,
    getHabitStreak,
    getHabitStats,
  };
}
