import { supabase } from '../../lib/supabase';
import { ICheckin, IWeeklyStats } from '../../interfaces';

export function useCheckinRepository() {
  function todayDate() {
    return new Date().toISOString().split('T')[0];
  }

  function yesterdayDate() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  async function hasCheckinToday(userId: string): Promise<boolean> {
    const { count } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('checkin_date', todayDate());
    return (count ?? 0) > 0;
  }

  async function getLastCheckin(userId: string): Promise<ICheckin | null> {
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(1)
      .single();
    return data ?? null;
  }

  async function doCheckin(userId: string, workoutId: number | null): Promise<ICheckin> {
    const today = todayDate();
    const yesterday = yesterdayDate();
    const last = await getLastCheckin(userId);

    if (last && last.checkin_date === today) return last;

    let streak = 1;
    if (last && last.checkin_date === yesterday) {
      streak = last.streak_count + 1;
    }

    const { data, error } = await supabase
      .from('checkins')
      .upsert({ user_id: userId, checkin_date: today, workout_id: workoutId, streak_count: streak })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function getCurrentStreak(userId: string): Promise<number> {
    const last = await getLastCheckin(userId);
    if (!last) return 0;
    const today = todayDate();
    const yesterday = yesterdayDate();
    if (last.checkin_date === today || last.checkin_date === yesterday) return last.streak_count;
    return 0;
  }

  async function getCheckinsLast30Days(userId: string): Promise<ICheckin[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('checkin_date', fromDate)
      .order('checkin_date', { ascending: false });
    return data ?? [];
  }

  async function getWeeklyStats(userId: string): Promise<IWeeklyStats> {
    const checkins = await getCheckinsLast30Days(userId);
    const currentStreak = await getCurrentStreak(userId);

    const { data: maxRow } = await supabase
      .from('checkins')
      .select('streak_count')
      .eq('user_id', userId)
      .order('streak_count', { ascending: false })
      .limit(1)
      .single();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekAgo = sevenDaysAgo.toISOString().split('T')[0];

    const weekCheckins = checkins.filter(c => c.checkin_date >= weekAgo);
    const sessionsByDay: Record<number, number> = {};
    weekCheckins.forEach(c => {
      const day = new Date(c.checkin_date + 'T12:00:00').getDay();
      sessionsByDay[day] = (sessionsByDay[day] ?? 0) + 1;
    });

    return {
      total_sessions: checkins.length,
      current_streak: currentStreak,
      longest_streak: maxRow?.streak_count ?? 0,
      sessions_by_day: sessionsByDay,
    };
  }

  return {
    hasCheckinToday,
    doCheckin,
    getCurrentStreak,
    getCheckinsLast30Days,
    getWeeklyStats,
    getLastCheckin,
  };
}
