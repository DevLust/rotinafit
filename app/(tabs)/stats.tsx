import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/context/auth.context';
import { useCheckinRepository } from '../../src/database/repositories/checkinRepository';
import { useHabitRepository } from '../../src/database/repositories/habitRepository';
import { useSessionRepository, SessionWithWorkout } from '../../src/database/repositories/sessionRepository';
import { Card } from '../../src/components/Card';
import { StreakDisplay } from '../../src/components/StreakDisplay';
import { colors, DAY_NAMES, getFireLevel } from '../../src/utils/theme';
import { IWeeklyStats, IHabit, ICheckin, IHabitStats } from '../../src/interfaces';

export default function Stats() {
  const { user } = useAuthContext();
  const { getWeeklyStats, getCheckinsLast30Days, getCurrentStreak } = useCheckinRepository();
  const { getHabitsByUser, getWeeklyHabitLogs, isLoggedToday, logHabit, getHabitStreak, getHabitStats } = useHabitRepository();
  const { getRecentSessions, getSessionsLast30Days } = useSessionRepository();

  const [stats, setStats] = useState<IWeeklyStats | null>(null);
  const [checkins, setCheckins] = useState<ICheckin[]>([]);
  const [habits, setHabits] = useState<IHabit[]>([]);
  const [habitStatus, setHabitStatus] = useState<Record<number, boolean>>({});
  const [habitWeekly, setHabitWeekly] = useState<Record<number, number>>({});
  const [habitStreaks, setHabitStreaks] = useState<Record<number, number>>({});
  const [habitStats, setHabitStats] = useState<IHabitStats | null>(null);
  const [sessions, setSessions] = useState<SessionWithWorkout[]>([]);
  const [sessions30d, setSessions30d] = useState(0);
  const [streak, setStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  async function loadData() {
    if (!user) return;
    const [ws, recent, s, h, hs, recentSessions, count30] = await Promise.all([
      getWeeklyStats(user.id),
      getCheckinsLast30Days(user.id),
      getCurrentStreak(user.id),
      getHabitsByUser(user.id),
      getHabitStats(user.id),
      getRecentSessions(user.id, 8),
      getSessionsLast30Days(user.id),
    ]);
    setStats(ws);
    setCheckins(recent);
    setStreak(s);
    setHabits(h);
    setHabitStats(hs);
    setSessions(recentSessions);
    setSessions30d(count30);

    const status: Record<number, boolean> = {};
    const weekly: Record<number, number> = {};
    const streaks: Record<number, number> = {};
    await Promise.all(
      h.map(async habit => {
        const [loggedToday, logs, habitStreak] = await Promise.all([
          isLoggedToday(habit.id),
          getWeeklyHabitLogs(habit.id),
          getHabitStreak(habit.id),
        ]);
        status[habit.id] = loggedToday;
        weekly[habit.id] = logs.length;
        streaks[habit.id] = habitStreak;
      })
    );
    setHabitStatus(status);
    setHabitWeekly(weekly);
    setHabitStreaks(streaks);
  }

  async function handleToggleHabit(habitId: number) {
    await logHabit(habitId);
    const [loggedToday, logs, habitStreak, hs] = await Promise.all([
      isLoggedToday(habitId),
      getWeeklyHabitLogs(habitId),
      getHabitStreak(habitId),
      user ? getHabitStats(user.id) : Promise.resolve(null),
    ]);
    setHabitStatus(prev => ({ ...prev, [habitId]: loggedToday }));
    setHabitWeekly(prev => ({ ...prev, [habitId]: logs.length }));
    setHabitStreaks(prev => ({ ...prev, [habitId]: habitStreak }));
    if (hs) setHabitStats(hs);
  }

  const last30Days = generateLast30Days();
  const checkinDates = new Set(checkins.map(c => c.checkin_date));
  const fireLevel = getFireLevel(streak);

  const weeklyConsistency = stats
    ? Math.round((Object.values(stats.sessions_by_day).reduce((a, b) => a + b, 0) / 7) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Estatísticas 📊</Text>

        <StreakDisplay streak={streak} />

        {stats && (
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total_sessions}</Text>
              <Text style={styles.statLabel}>Check-ins total</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: fireLevel.color || colors.primary }]}>
                {stats.longest_streak}
              </Text>
              <Text style={styles.statLabel}>Maior sequência</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{Math.min(weeklyConsistency, 100)}%</Text>
              <Text style={styles.statLabel}>Consistência semana</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{sessions30d}</Text>
              <Text style={styles.statLabel}>Treinos (30 dias)</Text>
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico dos últimos 30 dias</Text>
          <Card>
            <View style={styles.calendarGrid}>
              {last30Days.map(({ date, dayLabel, isToday }) => {
                const hasCheckin = checkinDates.has(date);
                return (
                  <View key={date} style={styles.calDay}>
                    <View style={[styles.calDot, hasCheckin && styles.calDotActive, isToday && styles.calDotToday]} />
                  </View>
                );
              })}
            </View>
            <View style={styles.calLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.calDotActive]} />
                <Text style={styles.legendText}>Treinou</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Descansou</Text>
              </View>
            </View>
          </Card>
        </View>

        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Treinos por dia da semana</Text>
            <Card>
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const count = stats.sessions_by_day[day] ?? 0;
                const maxCount = Math.max(...Object.values(stats.sessions_by_day), 1);
                const barWidth = count > 0 ? (count / maxCount) * 100 : 0;
                const isToday = day === new Date().getDay();
                return (
                  <View key={day} style={styles.barRow}>
                    <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>{DAY_NAMES[day]}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${barWidth}%` }]} />
                    </View>
                    <Text style={styles.barCount}>{count}</Text>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Histórico de treinos</Text>
            <Card style={styles.historyCard}>
              {sessions.map(s => (
                <View key={s.id} style={styles.historyRow}>
                  <View>
                    <Text style={styles.historyName}>{s.workout_name ?? 'Treino'}</Text>
                    <Text style={styles.historyMeta}>{s.muscle_group ?? ''} • {formatSessionDate(s.checkin_date)}</Text>
                  </View>
                  <Text style={styles.historyDone}>✓</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {habitStats && habitStats.total_habits > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estatísticas de hábitos</Text>
            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{habitStats.done_today}/{habitStats.total_habits}</Text>
                <Text style={styles.statLabel}>Concluídos hoje</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{habitStats.done_this_week}</Text>
                <Text style={styles.statLabel}>Feitos esta semana</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.success }]}>{habitStats.longest_streak}</Text>
                <Text style={styles.statLabel}>Maior sequência</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{habitStats.total_logs_30d}</Text>
                <Text style={styles.statLabel}>Registros (30 dias)</Text>
              </Card>
            </View>
          </View>
        )}

        {habits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hábitos desta semana</Text>
            {habits.map(habit => {
              const done = habitStatus[habit.id] ?? false;
              const weekly = habitWeekly[habit.id] ?? 0;
              const habitStreak = habitStreaks[habit.id] ?? 0;
              const fire = getFireLevel(habitStreak);
              const progress = Math.min((weekly / habit.target_days_per_week) * 100, 100);
              return (
                <Card key={habit.id} style={styles.habitCard}>
                  <View style={styles.habitHeader}>
                    <View style={styles.habitLeft}>
                      <Text style={styles.habitEmoji}>{habit.icon_emoji}</Text>
                      <View>
                        <View style={styles.habitNameRow}>
                          <Text style={styles.habitName}>{habit.name}</Text>
                          {done && <Text style={styles.doneBadge}>Concluído</Text>}
                        </View>
                        <Text style={styles.habitTarget}>
                          {weekly}/{habit.target_days_per_week} dias esta semana
                          {habitStreak > 0 ? ` • ${fire.emoji} ${habitStreak} seguidos` : ''}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleToggleHabit(habit.id)}
                      style={[styles.habitCheck, done && styles.habitCheckDone]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.habitCheckText}>{done ? '✓' : ''}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.habitProgress}>
                    <View style={[styles.habitProgressFill, { width: `${progress}%` }]} />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatSessionDate(dateStr: string) {
  const today = new Date().toISOString().split('T')[0];
  if (dateStr === today) return 'Hoje';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function generateLast30Days() {
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    days.push({
      date: d.toISOString().split('T')[0],
      dayLabel: DAY_NAMES[d.getDay()],
      isToday: i === 0,
    });
  }
  return days;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 20, gap: 4 },
  statValue: { fontSize: 28, fontWeight: '900', color: colors.primary },
  statLabel: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  calDay: { width: '11%', alignItems: 'center' },
  calDot: { width: 24, height: 24, borderRadius: 6, backgroundColor: colors.border + '60' },
  calDotActive: { backgroundColor: colors.primary },
  calDotToday: { borderWidth: 2, borderColor: colors.accent },
  calLegend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.border + '60' },
  legendText: { color: colors.textSecondary, fontSize: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  barLabel: { width: 32, color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  barLabelToday: { color: colors.accent },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.border + '60', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
  barCount: { width: 20, color: colors.textSecondary, fontSize: 12, textAlign: 'right' },
  habitCard: { gap: 10 },
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  habitLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  habitEmoji: { fontSize: 28 },
  habitNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  habitName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  doneBadge: { backgroundColor: colors.success + '25', color: colors.success, fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  habitTarget: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  habitCheck: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  habitCheckDone: { backgroundColor: colors.success, borderColor: colors.success },
  habitCheckText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  habitProgress: { height: 6, backgroundColor: colors.border + '60', borderRadius: 3, overflow: 'hidden' },
  habitProgressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 3 },
  historyCard: { gap: 0, paddingVertical: 4 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
  historyName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  historyMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  historyDone: { color: colors.success, fontSize: 18, fontWeight: '700' },
});
