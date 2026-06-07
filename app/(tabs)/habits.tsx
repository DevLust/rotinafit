import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/context/auth.context';
import { useHabitRepository } from '../../src/database/repositories/habitRepository';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { HabitDailyChecklist } from '../../src/components/HabitDailyChecklist';
import { colors, HABIT_EMOJIS, getFireLevel } from '../../src/utils/theme';
import { parseDbError } from '../../src/utils/errors';
import { validateHabitTargetDays } from '../../src/utils/habits';
import { IHabit, IHabitLog, IHabitStats } from '../../src/interfaces';

interface HabitWithLogs extends IHabit {
  logs: IHabitLog[];
  loggedToday: boolean;
  weekProgress: number;
  streak: number;
}

export default function Habits() {
  const { user } = useAuthContext();
  const { getHabitsByUser, createHabit, logHabit, getWeeklyHabitLogs, isLoggedToday, deleteHabit, getHabitStreak, getHabitStats } = useHabitRepository();

  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [habitStats, setHabitStats] = useState<IHabitStats | null>(null);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('✅');
  const [newHabitTarget, setNewHabitTarget] = useState('3');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [targetError, setTargetError] = useState('');

  const weekDays = getLast7Days();

  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [user])
  );

  async function loadHabits() {
    if (!user) return;
    const [list, stats] = await Promise.all([
      getHabitsByUser(user.id),
      getHabitStats(user.id),
    ]);
    const enriched = await Promise.all(
      list.map(async h => {
        const [logs, loggedToday, streak] = await Promise.all([
          getWeeklyHabitLogs(h.id),
          isLoggedToday(h.id),
          getHabitStreak(h.id),
        ]);
        const weekProgress = Math.min((logs.length / h.target_days_per_week) * 100, 100);
        return { ...h, logs, loggedToday, weekProgress, streak };
      })
    );
    setHabits(enriched);
    setHabitStats(stats);
  }

  async function handleToggleHabit(habitId: number) {
    await logHabit(habitId);
    await loadHabits();
  }

  async function handleAddHabit() {
    if (!user || !newHabitName.trim()) return;
    const targetValidation = validateHabitTargetDays(newHabitTarget);
    if (targetValidation) {
      setTargetError(targetValidation);
      return;
    }
    setTargetError('');
    setLoading(true);
    try {
      await createHabit(user.id, newHabitName.trim(), newHabitEmoji, parseInt(newHabitTarget, 10));
      setNewHabitName('');
      setNewHabitEmoji('✅');
      setNewHabitTarget('3');
      setShowAddHabit(false);
      await loadHabits();
    } catch (err: unknown) {
      Alert.alert('Erro ao criar hábito', parseDbError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteHabit(id: number, name: string) {
    setHabitToDelete({ id, name });
    setDeleteError('');
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteHabit() {
    if (!habitToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteHabit(habitToDelete.id);
      setShowDeleteConfirm(false);
      setHabitToDelete(null);
      await loadHabits();
    } catch (err: unknown) {
      setDeleteError(parseDbError(err));
    } finally {
      setDeleteLoading(false);
    }
  }

  const totalDone = habits.filter(h => h.loggedToday).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Meus Hábitos</Text>
            <Text style={styles.subtitle}>
              {habits.length > 0
                ? `${totalDone} de ${habits.length} feitos hoje`
                : 'Adicione hábitos para acompanhar'}
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddHabit(true)}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <HabitDailyChecklist
          habits={habits.map(h => ({
            id: h.id,
            name: h.name,
            icon_emoji: h.icon_emoji,
            loggedToday: h.loggedToday,
            streak: h.streak,
          }))}
          onToggle={handleToggleHabit}
          onAdd={() => setShowAddHabit(true)}
        />

        {habitStats && habitStats.total_habits > 0 && (
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
              <Text style={styles.statValue}>{habitStats.longest_streak}</Text>
              <Text style={styles.statLabel}>Maior sequência</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{habitStats.total_logs_30d}</Text>
              <Text style={styles.statLabel}>Últimos 30 dias</Text>
            </Card>
          </View>
        )}

        {habits.length > 0 && (
          <View style={styles.list}>
            <Text style={styles.sectionTitle}>Detalhes da semana</Text>
            {habits.map(habit => {
              const fire = getFireLevel(habit.streak);
              return (
              <Card key={habit.id} style={styles.habitCard}>
                <View style={styles.habitTop}>
                  <TouchableOpacity
                    style={[styles.checkCircle, habit.loggedToday && styles.checkCircleDone]}
                    onPress={() => handleToggleHabit(habit.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.checkEmoji}>
                      {habit.loggedToday ? '✓' : habit.icon_emoji}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.habitInfo}>
                    <View style={styles.habitNameRow}>
                      <Text style={styles.habitName}>{habit.name}</Text>
                      {habit.loggedToday && <Text style={styles.doneBadge}>Concluído</Text>}
                    </View>
                    <Text style={styles.habitTarget}>
                      Meta: {habit.target_days_per_week}x por semana
                      {habit.streak > 0 ? ` • ${fire.emoji} ${habit.streak} dias seguidos` : ''}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => handleDeleteHabit(habit.id, habit.name)} style={styles.deleteBtn}>
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.progressRow}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${habit.weekProgress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {habit.logs.length}/{habit.target_days_per_week} esta semana
                  </Text>
                </View>

                <View style={styles.weekDots}>
                  {weekDays.map(({ date, label }) => {
                    const done = habit.logs.some(l => l.log_date === date);
                    const isToday = date === today();
                    return (
                      <View key={date} style={styles.dayDotCol}>
                        <View style={[styles.dayDot, done && styles.dayDotDone, isToday && styles.dayDotToday]}>
                          <Text style={styles.dayDotText}>{done ? '✓' : ''}</Text>
                        </View>
                        <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            );
            })}
          </View>
        )}

        {habits.length > 0 && totalDone === habits.length && (
          <Card variant="highlighted" style={styles.allDoneCard}>
            <Text style={styles.allDoneEmoji}>🏆</Text>
            <Text style={styles.allDoneTitle}>Todos os hábitos de hoje!</Text>
            <Text style={styles.allDoneText}>Você está arrasando. Continue assim!</Text>
          </Card>
        )}
      </ScrollView>

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, styles.confirmModal]}>
            <Text style={styles.confirmEmoji}>🗑️</Text>
            <Text style={styles.modalTitle}>Remover hábito?</Text>
            <Text style={styles.confirmDesc}>
              {habitToDelete ? `Deseja remover "${habitToDelete.name}"?` : ''}
            </Text>
            {deleteError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️  {deleteError}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={() => { setShowDeleteConfirm(false); setHabitToDelete(null); setDeleteError(''); }}
              />
              <Button
                title="Remover"
                variant="danger"
                fullWidth={false}
                style={{ flex: 1 }}
                loading={deleteLoading}
                onPress={confirmDeleteHabit}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddHabit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Novo hábito</Text>

            <Input
              label="Nome do hábito"
              placeholder="Ex: Beber 2L de água"
              value={newHabitName}
              onChangeText={setNewHabitName}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Ícone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
              {HABIT_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiOption, newHabitEmoji === e && styles.emojiOptionActive]}
                  onPress={() => setNewHabitEmoji(e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Dias por semana (meta)"
              placeholder="Ex: 3"
              value={newHabitTarget}
              onChangeText={v => { setNewHabitTarget(v); setTargetError(''); }}
              keyboardType="number-pad"
              maxLength={2}
              error={targetError}
            />

            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="outline" fullWidth={false} style={{ flex: 1 }} onPress={() => setShowAddHabit(false)} />
              <Button title="Criar" variant="success" fullWidth={false} style={{ flex: 1 }} loading={loading} onPress={handleAddHabit} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function getLast7Days() {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split('T')[0],
      label: days[d.getDay()],
    };
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: colors.white, fontSize: 28, lineHeight: 32, fontWeight: '300' },
  emptyCard: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, width: '80%' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 16, gap: 4 },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.primary },
  statLabel: { color: colors.textSecondary, fontSize: 11, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  list: { gap: 14 },
  habitCard: { gap: 14 },
  habitTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkEmoji: { fontSize: 22, color: colors.white },
  habitInfo: { flex: 1 },
  habitNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  habitName: { fontSize: 16, fontWeight: '700', color: colors.text },
  doneBadge: { backgroundColor: colors.success + '25', color: colors.success, fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  habitTarget: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 18 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  progressText: { color: colors.textSecondary, fontSize: 12, minWidth: 70, textAlign: 'right' },
  weekDots: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDotCol: { alignItems: 'center', gap: 4 },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotDone: { backgroundColor: colors.success },
  dayDotToday: { borderWidth: 2, borderColor: colors.primary },
  dayDotText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  dayLabel: { fontSize: 10, color: colors.textMuted },
  dayLabelToday: { color: colors.primary, fontWeight: '700' },
  allDoneCard: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  allDoneEmoji: { fontSize: 48 },
  allDoneTitle: { fontSize: 18, fontWeight: '800', color: colors.success },
  allDoneText: { color: colors.textSecondary, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  emojiRow: { marginBottom: 8 },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  emojiOptionActive: { borderColor: colors.success, backgroundColor: colors.success + '20' },
  emojiText: { fontSize: 22 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  confirmModal: { borderRadius: 20, alignItems: 'center', paddingVertical: 32 },
  confirmEmoji: { fontSize: 48, marginBottom: 8 },
  confirmDesc: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  errorBanner: {
    backgroundColor: colors.error + '20',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.error + '60',
    width: '100%',
  },
  errorBannerText: { color: colors.error, fontSize: 14, lineHeight: 20 },
});
