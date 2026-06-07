import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/context/auth.context';
import { useWorkoutRepository } from '../../src/database/repositories/workoutRepository';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, DAY_NAMES } from '../../src/utils/theme';
import { parseDbError } from '../../src/utils/errors';
import { IWorkout } from '../../src/interfaces';

export default function WorkoutList() {
  const { user } = useAuthContext();
  const { getWorkoutsByUser, deleteWorkout } = useWorkoutRepository();
  const [workouts, setWorkouts] = useState<IWorkout[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [user])
  );

  async function loadWorkouts() {
    if (!user) return;
    const data = await getWorkoutsByUser(user.id);
    setWorkouts(data);
  }

  function handleDelete(id: number, name: string) {
    setWorkoutToDelete({ id, name });
    setDeleteError('');
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!workoutToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteWorkout(workoutToDelete.id);
      setShowDeleteConfirm(false);
      setWorkoutToDelete(null);
      await loadWorkouts();
    } catch (err: unknown) {
      setDeleteError(parseDbError(err));
    } finally {
      setDeleteLoading(false);
    }
  }

  const filteredWorkouts = selectedDay !== null
    ? workouts.filter(w => w.day_of_week === selectedDay)
    : workouts;

  const today = new Date().getDay();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Meus Treinos 🏋️</Text>
        <Button
          title="+ Novo"
          variant="outline"
          size="sm"
          fullWidth={false}
          onPress={() => router.push('/workout/create')}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayFilter} contentContainerStyle={styles.dayFilterContent}>
        <TouchableOpacity
          style={[styles.dayChip, selectedDay === null && styles.dayChipActive]}
          onPress={() => setSelectedDay(null)}
        >
          <Text style={[styles.dayChipText, selectedDay === null && styles.dayChipTextActive]}>Todos</Text>
        </TouchableOpacity>
        {[0, 1, 2, 3, 4, 5, 6].map(day => {
          const hasWorkouts = workouts.some(w => w.day_of_week === day);
          const isToday = day === today;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayChip, selectedDay === day && styles.dayChipActive, isToday && styles.dayChipToday]}
              onPress={() => setSelectedDay(selectedDay === day ? null : day)}
            >
              <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>
                {DAY_NAMES[day]}
              </Text>
              {hasWorkouts && <View style={styles.dayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {filteredWorkouts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyTitle}>
              {workouts.length === 0 ? 'Nenhum treino cadastrado' : 'Nenhum treino neste dia'}
            </Text>
            <Text style={styles.emptyText}>
              {workouts.length === 0
                ? 'Crie seu primeiro treino e comece sua jornada!'
                : 'Que tal adicionar um treino para este dia?'}
            </Text>
            <Button
              title="Criar primeiro treino"
              variant="outline"
              fullWidth={false}
              size="sm"
              onPress={() => router.push('/workout/create')}
            />
          </View>
        ) : (
          filteredWorkouts.map(w => (
            <Card key={w.id} style={styles.workoutCard}>
              <View style={styles.cardHeader}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{DAY_NAMES[w.day_of_week]}</Text>
                  {w.day_of_week === today && <Text style={styles.todayBadge}>Hoje</Text>}
                </View>
                <TouchableOpacity onPress={() => handleDelete(w.id, w.name)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => router.push(`/workout/${w.id}`)} activeOpacity={0.8}>
                <Text style={styles.workoutName}>{w.name}</Text>
                <View style={styles.muscleTag}>
                  <Text style={styles.muscleTagText}>{w.muscle_group}</Text>
                </View>
                {w.description && (
                  <Text style={styles.workoutDesc} numberOfLines={2}>{w.description}</Text>
                )}
                <Text style={styles.viewMore}>Ver exercícios →</Text>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, styles.confirmModal]}>
            <Text style={styles.confirmEmoji}>🗑️</Text>
            <Text style={styles.modalTitle}>Remover treino?</Text>
            <Text style={styles.confirmDesc}>
              {workoutToDelete
                ? `Deseja remover "${workoutToDelete.name}"? Todos os exercícios serão removidos também.`
                : ''}
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
                onPress={() => { setShowDeleteConfirm(false); setWorkoutToDelete(null); setDeleteError(''); }}
              />
              <Button
                title="Remover"
                variant="danger"
                fullWidth={false}
                style={{ flex: 1 }}
                loading={deleteLoading}
                onPress={confirmDelete}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },
  dayFilter: { flexGrow: 0 },
  dayFilterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipToday: { borderColor: colors.accent },
  dayChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  dayChipTextActive: { color: colors.white },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 3 },
  list: { padding: 20, gap: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  workoutCard: {},
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayBadge: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dayBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  todayBadge: { backgroundColor: colors.accent + '20', color: colors.accent, fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 18 },
  workoutName: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  muscleTag: { backgroundColor: colors.primary + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  muscleTagText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  workoutDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  viewMore: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, gap: 12 },
  confirmModal: { alignItems: 'center', paddingVertical: 32 },
  confirmEmoji: { fontSize: 48, marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  confirmDesc: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  errorBanner: { backgroundColor: colors.error + '20', borderRadius: 10, padding: 14, width: '100%' },
  errorBannerText: { color: colors.error, fontSize: 14, lineHeight: 20 },
});
