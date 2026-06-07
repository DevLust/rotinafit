import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/context/auth.context';
import { useCheckinRepository } from '../../src/database/repositories/checkinRepository';
import { useWorkoutRepository } from '../../src/database/repositories/workoutRepository';
import { useGroupRepository } from '../../src/database/repositories/groupRepository';
import { StreakDisplay } from '../../src/components/StreakDisplay';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, getFireLevel, DAY_NAMES } from '../../src/utils/theme';
import { parseDbError } from '../../src/utils/errors';
import { IWorkout, IGroup, ICheckin } from '../../src/interfaces';

export default function Checkin() {
  const { user } = useAuthContext();
  const { doCheckin, hasCheckinToday, getCurrentStreak, getCheckinsLast30Days } = useCheckinRepository();
  const { getWorkoutsByDay } = useWorkoutRepository();
  const { getUserGroups, doGroupCheckin } = useGroupRepository();

  const [checkedIn, setCheckedIn] = useState(false);
  const [streak, setStreak] = useState(0);
  const [selectedWorkout, setSelectedWorkout] = useState<IWorkout | null>(null);
  const [todayWorkouts, setTodayWorkouts] = useState<IWorkout[]>([]);
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<ICheckin[]>([]);
  const [loading, setLoading] = useState(false);

  const today = new Date().getDay();
  const todayDateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  async function loadData() {
    if (!user) return;
    try {
      const [isChecked, s, tw, g, recent] = await Promise.all([
        hasCheckinToday(user.id),
        getCurrentStreak(user.id),
        getWorkoutsByDay(user.id, today),
        getUserGroups(user.id),
        getCheckinsLast30Days(user.id),
      ]);
      setCheckedIn(isChecked);
      setStreak(s);
      setTodayWorkouts(tw);
      setGroups(g);
      setRecentCheckins(recent.slice(0, 7));
      if (tw.length === 1) setSelectedWorkout(tw[0]);
    } catch (err: unknown) {
      Alert.alert('Erro ao carregar', parseDbError(err));
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  async function handleCheckin() {
    if (!user || checkedIn) return;
    setLoading(true);
    try {
      const checkin = await doCheckin(user.id, selectedWorkout?.id ?? null);
      setCheckedIn(true);
      setStreak(checkin.streak_count);

      await Promise.allSettled(groups.map(g => doGroupCheckin(g.id, user.id)));

      await loadData();
    } catch (err: unknown) {
      Alert.alert('Erro no check-in', parseDbError(err, 'checkin'));
    } finally {
      setLoading(false);
    }
  }

  const fireLevel = getFireLevel(streak);
  const newStreakLevel = getFireLevel(streak + (checkedIn ? 0 : 1));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Check-in do dia 🔥</Text>
          <Text style={styles.date}>{todayDateStr}</Text>
        </View>

        {checkedIn ? (
          <View style={styles.successContainer}>
            <Text style={styles.successEmoji}>{fireLevel.emoji || '✅'}</Text>
            <Text style={styles.successTitle}>Check-in realizado!</Text>
            <Text style={styles.successSub}>
              {streak > 1 ? `Você está em uma sequência de ${streak} dias!` : 'Primeiro dia da sua sequência!'}
            </Text>
            <StreakDisplay streak={streak} />
            <Card style={styles.motivationCard}>
              <Text style={styles.motivationText}>{getMotivation(streak)}</Text>
            </Card>
          </View>
        ) : (
          <View style={styles.checkinContainer}>
            <Card variant="surface" style={styles.previewCard}>
              <Text style={styles.previewLabel}>Após o check-in:</Text>
              <View style={styles.previewStreak}>
                <Text style={styles.previewNumber}>{streak + 1}</Text>
                <Text style={styles.previewFire}>{newStreakLevel.emoji || '🔥'}</Text>
              </View>
              <Text style={[styles.previewLevel, { color: newStreakLevel.color || colors.primary }]}>
                {newStreakLevel.label}
              </Text>
            </Card>

            {todayWorkouts.length > 0 && (
              <View style={styles.workoutSelect}>
                <Text style={styles.selectLabel}>Qual treino você vai fazer?</Text>
                {todayWorkouts.map(w => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.workoutOption, selectedWorkout?.id === w.id && styles.workoutOptionActive]}
                    onPress={() => setSelectedWorkout(w)}
                  >
                    <View>
                      <Text style={styles.workoutOptionName}>{w.name}</Text>
                      <Text style={styles.workoutOptionMuscle}>{w.muscle_group}</Text>
                    </View>
                    {selectedWorkout?.id === w.id && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Button
              title={`Fazer check-in${todayWorkouts.length === 0 ? ' (sem treino específico)' : ''}`}
              onPress={handleCheckin}
              loading={loading}
              style={styles.checkinBtn}
              size="lg"
            />
          </View>
        )}

        {recentCheckins.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimos 7 dias</Text>
            <Card>
              <View style={styles.miniCalendar}>
                {[6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
                  const d = new Date();
                  d.setDate(d.getDate() - daysAgo);
                  const dateStr = d.toISOString().split('T')[0];
                  const hasCheckin = recentCheckins.some(c => c.checkin_date === dateStr);
                  const isToday = daysAgo === 0;
                  return (
                    <View key={daysAgo} style={styles.miniDay}>
                      <View style={[styles.miniDot, hasCheckin && styles.miniDotActive, isToday && styles.miniDotToday]}>
                        <Text style={styles.miniDotText}>{hasCheckin ? '✓' : ''}</Text>
                      </View>
                      <Text style={[styles.miniDayLabel, isToday && styles.miniDayLabelToday]}>
                        {isToday ? 'Hoje' : DAY_NAMES[d.getDay()]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          </View>
        )}

        {groups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seus grupos receberam seu check-in 👥</Text>
            {groups.map(g => (
              <Card key={g.id} variant="surface" style={styles.groupChip}>
                <Text style={styles.groupChipName}>{g.name}</Text>
                <Text style={styles.groupChipStatus}>{checkedIn ? '✅ Notificado' : '⏳ Aguardando'}</Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getMotivation(streak: number): string {
  if (streak >= 30) return '🏆 Você é uma lenda! 30+ dias sem parar. Inspiração pura!';
  if (streak >= 14) return '⚡ Duas semanas seguidas! Você está em outro nível!';
  if (streak >= 7) return '🔥 Uma semana completa! Você está construindo um hábito real!';
  if (streak >= 3) return '💪 Três dias seguidos! O ritmo está pegando, continue!';
  if (streak === 2) return '🚀 Dois dias seguidos! Você está no caminho certo!';
  return '✨ Primeiro dia marcado! Toda grande jornada começa assim!';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  date: { color: colors.textSecondary, fontSize: 14, textTransform: 'capitalize' },
  successContainer: { alignItems: 'center', gap: 16, paddingVertical: 12 },
  successEmoji: { fontSize: 80 },
  successTitle: { fontSize: 26, fontWeight: '900', color: colors.success },
  successSub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
  motivationCard: { width: '100%' },
  motivationText: { color: colors.text, fontSize: 15, lineHeight: 22, textAlign: 'center', fontStyle: 'italic' },
  checkinContainer: { gap: 16 },
  previewCard: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  previewLabel: { color: colors.textSecondary, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  previewStreak: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewNumber: { fontSize: 64, fontWeight: '900', color: colors.primary },
  previewFire: { fontSize: 48 },
  previewLevel: { fontSize: 16, fontWeight: '700' },
  workoutSelect: { gap: 10 },
  selectLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  workoutOption: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  workoutOptionName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  workoutOptionMuscle: { color: colors.primary, fontSize: 13, marginTop: 2 },
  checkmark: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  checkinBtn: {},
  section: { gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  miniCalendar: { flexDirection: 'row', justifyContent: 'space-between' },
  miniDay: { alignItems: 'center', gap: 6 },
  miniDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.border + '60', alignItems: 'center', justifyContent: 'center' },
  miniDotActive: { backgroundColor: colors.primary },
  miniDotToday: { borderWidth: 2, borderColor: colors.accent },
  miniDotText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  miniDayLabel: { fontSize: 11, color: colors.textMuted },
  miniDayLabelToday: { color: colors.accent, fontWeight: '700' },
  groupChip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  groupChipName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  groupChipStatus: { color: colors.textSecondary, fontSize: 13 },
});
