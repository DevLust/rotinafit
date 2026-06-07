import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getFireLevel, colors } from '../../utils/theme';

interface Props {
  streak: number;
  size?: 'sm' | 'lg';
}

export function StreakDisplay({ streak, size = 'lg' }: Props) {
  const level = getFireLevel(streak);
  const isSmall = size === 'sm';

  if (streak === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyEmoji, isSmall && styles.smallEmoji]}>💤</Text>
        <Text style={styles.emptyText}>Sem sequência</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: level.color + '40' }]}>
      <Text style={[styles.fireEmoji, isSmall && styles.smallEmoji]}>{level.emoji}</Text>
      <View style={styles.info}>
        <Text style={[styles.count, { color: level.color }, isSmall && styles.smallCount]}>
          {streak}
        </Text>
        <Text style={styles.label}>dias seguidos</Text>
        {!isSmall && (
          <Text style={[styles.badge, { backgroundColor: level.color + '20', color: level.color }]}>
            {level.label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 4,
  },
  fireEmoji: {
    fontSize: 40,
  },
  smallEmoji: {
    fontSize: 24,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  info: {
    gap: 2,
  },
  count: {
    fontSize: 36,
    fontWeight: '800',
  },
  smallCount: {
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
