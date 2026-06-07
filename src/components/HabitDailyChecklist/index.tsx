import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, getFireLevel } from '../../utils/theme';

export interface HabitChecklistItem {
  id: number;
  name: string;
  icon_emoji: string;
  loggedToday: boolean;
  streak?: number;
}

interface Props {
  habits: HabitChecklistItem[];
  onToggle: (id: number) => void;
  onAdd?: () => void;
  compact?: boolean;
}

function formatToday() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function HabitDailyChecklist({ habits, onToggle, onAdd, compact }: Props) {
  const done = habits.filter(h => h.loggedToday).length;
  const total = habits.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  if (total === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyTitle}>Checklist de hoje</Text>
        <Text style={styles.emptyText}>Crie hábitos para montar sua rotina diária</Text>
        {onAdd && (
          <Button title="Criar hábito" variant="outline" size="sm" fullWidth={false} onPress={onAdd} style={styles.emptyBtn} />
        )}
      </Card>
    );
  }

  return (
    <Card variant="highlighted" style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Checklist de hoje</Text>
          <Text style={styles.date}>{formatToday()}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{done}/{total}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        {done === total ? '✅ Todos concluídos!' : `${done} de ${total} concluídos`}
      </Text>

      <View style={styles.list}>
        {habits.map(habit => {
          const fire = getFireLevel(habit.streak ?? 0);
          return (
            <TouchableOpacity
              key={habit.id}
              style={[styles.row, habit.loggedToday && styles.rowDone]}
              onPress={() => onToggle(habit.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.check, habit.loggedToday && styles.checkDone]}>
                <Text style={styles.checkText}>{habit.loggedToday ? '✓' : ''}</Text>
              </View>
              <Text style={styles.emoji}>{habit.icon_emoji}</Text>
              <View style={styles.info}>
                <Text style={[styles.name, habit.loggedToday && styles.nameDone]}>{habit.name}</Text>
                {!compact && (habit.streak ?? 0) > 0 && (
                  <Text style={styles.streak}>{fire.emoji} {habit.streak} dias seguidos</Text>
                )}
              </View>
              {habit.loggedToday ? (
                <Text style={styles.todayBadge}>Hoje</Text>
              ) : (
                <Text style={styles.pendingBadge}>Pendente</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  date: { color: colors.textSecondary, fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  badge: { backgroundColor: colors.primary + '25', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  progressTrack: { height: 8, backgroundColor: colors.border + '60', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 4 },
  progressLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  list: { gap: 8, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border + '80',
  },
  rowDone: { borderColor: colors.success + '50', backgroundColor: colors.success + '10' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  emoji: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  nameDone: { color: colors.success },
  streak: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  todayBadge: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingBadge: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  emptyBtn: { marginTop: 4 },
});
