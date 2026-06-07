import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/context/auth.context';
import { useCheckinRepository } from '../../src/database/repositories/checkinRepository';
import { useWorkoutRepository } from '../../src/database/repositories/workoutRepository';
import { useHabitRepository } from '../../src/database/repositories/habitRepository';
import { StreakDisplay } from '../../src/components/StreakDisplay';
import { HabitDailyChecklist } from '../../src/components/HabitDailyChecklist';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, DAY_NAMES, DAY_FULL_NAMES, getFireLevel } from '../../src/utils/theme';
import { getPreferences, isPastReminderTime } from '../../src/utils/preferences';
import { IWorkout, IWeeklyStats } from '../../src/interfaces';

export default function Dashboard() {
  const { user } = useAuthContext();
  const { getCurrentStreak, getWeeklyStats, hasCheckinToday } = useCheckinRepository();
  const { getWorkoutsByDay } = useWorkoutRepository();
  const { getHabitsByUser, logHabit, isLoggedToday, getHabitStreak } = useHabitRepository();

  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState<IWeeklyStats | null>(null);
  const [todayWorkouts, setTodayWorkouts] = useState<IWorkout[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [habitChecklist, setHabitChecklist] = useState<{ id: number; name: string; icon_emoji: string; loggedToday: boolean; streak: number }[]>([]);
  const [showWorkoutReminder, setShowWorkoutReminder] = useState(false);
  const [showHabitReminder, setShowHabitReminder] = useState(false);

  const today = new Date().getDay();
  const todayName = DAY_FULL_NAMES[today];

  async function loadData() {
    if (!user) return;
    const [s, ws, tw, checked, habits, prefs] = await Promise.all([
      getCurrentStreak(user.id),
      getWeeklyStats(user.id),
      getWorkoutsByDay(user.id, today),
      hasCheckinToday(user.id),
      getHabitsByUser(user.id),
      getPreferences(user.id),
    ]);
    setStreak(s);
    setStats(ws);
    setTodayWorkouts(tw);
    setCheckedInToday(checked);

    const checklist = await Promise.all(
      habits.map(async h => ({
        id: h.id,
        name: h.name,
        icon_emoji: h.icon_emoji,
        loggedToday: await isLoggedToday(h.id),
        streak: await getHabitStreak(h.id),
      }))
    );
    setHabitChecklist(checklist);

    const habitsPending = checklist.some(h => !h.loggedToday);
    setShowWorkoutReminder(prefs.workoutReminder && !checked && isPastReminderTime(prefs.workoutTime));
    setShowHabitReminder(prefs.habitReminder && habitsPending);
  }

  async function handleToggleHabit(id: number) {
    await logHabit(id);
    await loadData();
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const fireLevel = getFireLevel(streak);
  const greeting = streak > 0 ? `${streak} dias seguidos! ${fireLevel.emoji}` : 'Comece sua sequência hoje!';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]} {user?.avatar_emoji}</Text>
            <Text style={styles.subGreeting}>{greeting}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{user?.avatar_emoji}</Text>
          </TouchableOpacity>
        </View>

        <StreakDisplay streak={streak} />

        <View style={styles.quickRow}>
          {[
            { emoji: '🏋️', label: 'Treinos', route: '/(tabs)/workout' },
            { emoji: '🔥', label: 'Check-in', route: '/(tabs)/checkin' },
            { emoji: '🎯', label: 'Hábitos', route: '/(tabs)/habits' },
            { emoji: '👥', label: 'Grupos', route: '/(tabs)/groups' },
          ].map(item => (
            <TouchableOpacity key={item.route} style={styles.quickItem} onPress={() => router.push(item.route as any)}>
              <Text style={styles.quickEmoji}>{item.emoji}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showWorkoutReminder && (
          <Card variant="highlighted" style={styles.reminderCard}>
            <Text style={styles.reminderTitle}>⏰ Hora do treino!</Text>
            <Text style={styles.reminderText}>Você ainda não fez check-in hoje. Mantenha sua sequência!</Text>
            <Button title="Fazer check-in" size="sm" onPress={() => router.push('/(tabs)/checkin')} />
          </Card>
        )}

        {showHabitReminder && (
          <Card style={styles.reminderCard}>
            <Text style={styles.reminderTitle}>📋 Hábitos pendentes</Text>
            <Text style={styles.reminderText}>Complete seu checklist de hoje abaixo.</Text>
          </Card>
        )}

        <HabitDailyChecklist
          habits={habitChecklist}
          onToggle={handleToggleHabit}
          onAdd={() => router.push('/(tabs)/habits')}
          compact
        />

        {!checkedInToday && (
          <Card variant="highlighted" style={styles.checkinCard}>
            <Text style={styles.checkinCardTitle}>🏃 Hora de treinar!</Text>
            <Text style={styles.checkinCardText}>
              Faça seu check-in de hoje e mantenha sua sequência{streak > 0 ? ` de ${streak} dias` : ''} viva!
            </Text>
            <Button
              title="Fazer check-in agora 🔥"
              onPress={() => router.push('/(tabs)/checkin')}
              style={styles.checkinBtn}
            />
          </Card>
        )}

        {checkedInToday && (
          <Card variant="highlighted" style={styles.doneCard}>
            <Text style={styles.doneTitle}>✅ Check-in feito hoje!</Text>
            <Text style={styles.doneText}>Continue assim! Você está arrasando.</Text>
          </Card>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Treino de hoje — {todayName}</Text>
          {todayWorkouts.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>😴</Text>
              <Text style={styles.emptyText}>Nenhum treino para {todayName}</Text>
              <Button
                title="Criar treino"
                variant="outline"
                size="sm"
                fullWidth={false}
                onPress={() => router.push('/workout/create')}
              />
            </Card>
          ) : (
            todayWorkouts.map(w => (
              <TouchableOpacity key={w.id} onPress={() => router.push(`/workout/${w.id}`)}>
                <Card style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <View>
                      <Text style={styles.workoutName}>{w.name}</Text>
                      <Text style={styles.workoutMuscle}>{w.muscle_group}</Text>
                    </View>
                    <Text style={styles.workoutArrow}>→</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>

        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimos 7 dias</Text>
            <Card>
              <View style={styles.weekRow}>
                {[0, 1, 2, 3, 4, 5, 6].map(day => {
                  const count = stats.sessions_by_day[day] ?? 0;
                  const isToday = day === today;
                  return (
                    <View key={day} style={styles.dayCol}>
                      <View style={[styles.dayDot, count > 0 && styles.dayDotActive, isToday && styles.dayDotToday]}>
                        <Text style={styles.dayDotText}>{count > 0 ? '✓' : ''}</Text>
                      </View>
                      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{DAY_NAMES[day]}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.total_sessions}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.current_streak}</Text>
                  <Text style={styles.statLabel}>Sequência</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.longest_streak}</Text>
                  <Text style={styles.statLabel}>Recorde</Text>
                </View>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text },
  subGreeting: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarEmoji: { fontSize: 24 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  quickItem: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: colors.border },
  quickEmoji: { fontSize: 22 },
  quickLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  reminderCard: { gap: 8 },
  reminderTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  reminderText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  checkinCard: { gap: 8 },
  checkinCardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  checkinCardText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  checkinBtn: { marginTop: 4 },
  doneCard: {},
  doneTitle: { fontSize: 17, fontWeight: '700', color: colors.success },
  doneText: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyCard: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  workoutCard: { marginBottom: 8 },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutName: { fontSize: 16, fontWeight: '700', color: colors.text },
  workoutMuscle: { color: colors.primary, fontSize: 13, marginTop: 2 },
  workoutArrow: { color: colors.primary, fontSize: 20 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  dayCol: { alignItems: 'center', gap: 6 },
  dayDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border + '60', alignItems: 'center', justifyContent: 'center' },
  dayDotActive: { backgroundColor: colors.primary },
  dayDotToday: { borderWidth: 2, borderColor: colors.accent },
  dayDotText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  dayLabel: { fontSize: 11, color: colors.textMuted },
  dayLabelToday: { color: colors.accent, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary },
});
