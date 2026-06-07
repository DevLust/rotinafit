import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/context/auth.context';
import { useWorkoutRepository } from '../../src/database/repositories/workoutRepository';
import { useSessionRepository } from '../../src/database/repositories/sessionRepository';
import { useCheckinRepository } from '../../src/database/repositories/checkinRepository';
import { useGroupRepository } from '../../src/database/repositories/groupRepository';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { colors, DAY_FULL_NAMES } from '../../src/utils/theme';
import { parseDbError } from '../../src/utils/errors';
import { navigateBack } from '../../src/utils/navigation';
import { getExerciseSuggestions } from '../../src/utils/exerciseSuggestions';
import { IWorkout, IExercise } from '../../src/interfaces';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthContext();
  const { getWorkoutById, getExercisesByWorkout, createExercise, updateExercise, deleteExercise } = useWorkoutRepository();
  const { completeWorkoutSession, hasSessionToday } = useSessionRepository();
  const { doCheckin, hasCheckinToday } = useCheckinRepository();
  const { getUserGroups, doGroupCheckin } = useGroupRepository();

  const [workout, setWorkout] = useState<IWorkout | null>(null);
  const [exercises, setExercises] = useState<IExercise[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('3');
  const [exReps, setExReps] = useState('10');
  const [exRest, setExRest] = useState('60');
  const [exNotes, setExNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<IExercise | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [finishLoading, setFinishLoading] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [showFinishSuccess, setShowFinishSuccess] = useState(false);
  const [finishError, setFinishError] = useState('');

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    try {
      const w = await getWorkoutById(Number(id));
      setWorkout(w);
      if (w) {
        const [exList, done] = await Promise.all([
          getExercisesByWorkout(w.id),
          user ? hasSessionToday(user.id, w.id) : Promise.resolve(false),
        ]);
        setExercises(exList);
        setSessionDone(done);
      }
    } catch (err: unknown) {
      Alert.alert('Erro ao carregar treino', parseDbError(err));
    }
  }

  function openAddModal(exercise?: IExercise) {
    if (exercise) {
      setEditingId(exercise.id);
      setExName(exercise.name);
      setExSets(String(exercise.sets));
      setExReps(String(exercise.reps));
      setExRest(String(exercise.rest_seconds));
      setExNotes(exercise.notes ?? '');
    } else {
      setEditingId(null);
      setExName('');
      setExSets('3');
      setExReps('10');
      setExRest('60');
      setExNotes('');
    }
    setShowAddExercise(true);
  }

  async function handleSaveExercise() {
    if (!exName.trim() || !workout) return;
    setLoading(true);
    try {
      if (editingId) {
        await updateExercise(editingId, {
          name: exName.trim(),
          sets: parseInt(exSets) || 3,
          reps: parseInt(exReps) || 10,
          rest_seconds: parseInt(exRest) || 60,
          notes: exNotes.trim() || null,
        });
      } else {
        await createExercise({
          workout_id: workout.id,
          name: exName.trim(),
          sets: parseInt(exSets) || 3,
          reps: parseInt(exReps) || 10,
          rest_seconds: parseInt(exRest) || 60,
          notes: exNotes.trim() || null,
        });
      }
      setShowAddExercise(false);
      await loadData();
    } catch (err: unknown) {
      Alert.alert('Erro ao salvar exercício', parseDbError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteExercise(ex: IExercise) {
    setExerciseToDelete(ex);
    setDeleteError('');
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteExercise() {
    if (!exerciseToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteExercise(exerciseToDelete.id);
      setShowDeleteConfirm(false);
      setExerciseToDelete(null);
      await loadData();
    } catch (err: unknown) {
      setDeleteError(parseDbError(err));
    } finally {
      setDeleteLoading(false);
    }
  }

  function toggleComplete(id: number) {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFinishWorkout() {
    if (!user || !workout) return;
    setFinishLoading(true);
    setFinishError('');
    try {
      const completed = Array.from(completedIds);
      await completeWorkoutSession(user.id, workout.id, completed);

      const alreadyChecked = await hasCheckinToday(user.id);
      if (!alreadyChecked) {
        await doCheckin(user.id, workout.id);
        const groups = await getUserGroups(user.id);
        await Promise.allSettled(groups.map(g => doGroupCheckin(g.id, user.id)));
      }

      setSessionDone(true);
      setShowFinishSuccess(true);
    } catch (err: unknown) {
      setFinishError(parseDbError(err));
    } finally {
      setFinishLoading(false);
    }
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const completedCount = completedIds.size;
  const totalCount = exercises.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const suggestions = getExerciseSuggestions(
    workout.muscle_group,
    exercises.filter(e => e.id !== editingId).map(e => e.name),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigateBack('/(tabs)/workout')}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <Button title="+ Exercício" size="sm" fullWidth={false} variant="outline" onPress={() => openAddModal()} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.workoutHeader}>
          <View style={styles.dayTag}>
            <Text style={styles.dayTagText}>{DAY_FULL_NAMES[workout.day_of_week]}</Text>
          </View>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <View style={styles.muscleTag}>
            <Text style={styles.muscleTagText}>{workout.muscle_group}</Text>
          </View>
          {workout.description && (
            <Text style={styles.workoutDesc}>{workout.description}</Text>
          )}
        </View>

        {exercises.length > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>{completedCount}/{totalCount} exercícios</Text>
              {completedCount === totalCount && totalCount > 0 && (
                <Text style={styles.allDone}>🏆 Treino completo!</Text>
              )}
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        )}

        {exercises.length === 0 ? (
          <View style={styles.emptyExercises}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyText}>Nenhum exercício ainda</Text>
            <Text style={styles.emptySubText}>Adicione exercícios para montar seu treino</Text>
            <Button title="Adicionar exercício" variant="outline" fullWidth={false} size="sm" onPress={() => openAddModal()} />
          </View>
        ) : (
          exercises.map((ex, index) => {
            const done = completedIds.has(ex.id);
            return (
              <Card key={ex.id} style={[styles.exerciseCard, done && styles.exerciseCardDone]}>
                <View style={styles.exerciseHeader}>
                  <TouchableOpacity onPress={() => toggleComplete(ex.id)} style={styles.exerciseLeft} activeOpacity={0.8}>
                    <View style={[styles.exerciseNumber, done && styles.exerciseNumberDone]}>
                      <Text style={styles.exerciseNumberText}>{done ? '✓' : index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.exerciseName, done && styles.exerciseNameDone]}>{ex.name}</Text>
                      <View style={styles.exerciseTags}>
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>{ex.sets} séries</Text>
                        </View>
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>{ex.reps} reps</Text>
                        </View>
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>{ex.rest_seconds}s desc.</Text>
                        </View>
                      </View>
                      {ex.notes && <Text style={styles.exerciseNotes}>{ex.notes}</Text>}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity onPress={() => openAddModal(ex)} style={styles.actionBtn}>
                      <Text>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteExercise(ex)} style={styles.actionBtn}>
                      <Text>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        )}

        {exercises.length > 0 && (
          <View style={styles.finishSection}>
            {finishError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️  {finishError}</Text>
              </View>
            ) : null}
            {sessionDone ? (
              <Card variant="highlighted">
                <Text style={styles.finishDone}>✅ Treino registrado no histórico!</Text>
              </Card>
            ) : (
              <Button
                title={completedCount === totalCount ? 'Finalizar treino 🏆' : 'Finalizar treino'}
                variant={completedCount === totalCount ? 'success' : 'primary'}
                onPress={handleFinishWorkout}
                loading={finishLoading}
                size="lg"
              />
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showFinishSuccess} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={[styles.deleteModal, styles.confirmModal]}>
            <Text style={styles.confirmEmoji}>🏆</Text>
            <Text style={styles.modalTitle}>Treino concluído!</Text>
            <Text style={styles.confirmDesc}>
              {completedCount}/{totalCount} exercícios registrados no histórico e check-in do dia realizado.
            </Text>
            <View style={styles.modalActions}>
              <Button title="Ver estatísticas" variant="outline" fullWidth={false} style={{ flex: 1 }} onPress={() => { setShowFinishSuccess(false); router.push('/(tabs)/stats'); }} />
              <Button title="OK" fullWidth={false} style={{ flex: 1 }} onPress={() => setShowFinishSuccess(false)} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={[styles.deleteModal, styles.confirmModal]}>
            <Text style={styles.confirmEmoji}>🗑️</Text>
            <Text style={styles.modalTitle}>Remover exercício?</Text>
            <Text style={styles.confirmDesc}>
              {exerciseToDelete ? `Deseja remover "${exerciseToDelete.name}"?` : ''}
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
                onPress={() => { setShowDeleteConfirm(false); setExerciseToDelete(null); setDeleteError(''); }}
              />
              <Button
                title="Remover"
                variant="danger"
                fullWidth={false}
                style={{ flex: 1 }}
                loading={deleteLoading}
                onPress={confirmDeleteExercise}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddExercise} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar exercício' : 'Novo exercício'}</Text>
              <Input label="Nome do exercício" placeholder="Ex: Supino reto" value={exName} onChangeText={setExName} autoFocus />
              {suggestions.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <Text style={styles.suggestionsLabel}>
                    Sugestões para {workout.muscle_group}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
                    {suggestions.map(name => (
                      <TouchableOpacity
                        key={name}
                        style={[styles.suggestionChip, exName === name && styles.suggestionChipActive]}
                        onPress={() => setExName(name)}
                      >
                        <Text style={[styles.suggestionText, exName === name && styles.suggestionTextActive]}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              <View style={styles.inlineFields}>
                <View style={styles.inlineField}>
                  <Input label="Séries" placeholder="3" value={exSets} onChangeText={setExSets} keyboardType="number-pad" />
                </View>
                <View style={styles.inlineField}>
                  <Input label="Repetições" placeholder="10" value={exReps} onChangeText={setExReps} keyboardType="number-pad" />
                </View>
                <View style={styles.inlineField}>
                  <Input label="Descanso (s)" placeholder="60" value={exRest} onChangeText={setExRest} keyboardType="number-pad" />
                </View>
              </View>
              <Input label="Observações (opcional)" placeholder="Forma, variação, carga..." value={exNotes} onChangeText={setExNotes} multiline numberOfLines={2} style={{ height: 60, textAlignVertical: 'top', paddingTop: 10 }} />
              <View style={styles.modalActions}>
                <Button title="Cancelar" variant="outline" fullWidth={false} style={{ flex: 1 }} onPress={() => setShowAddExercise(false)} />
                <Button title={editingId ? 'Salvar' : 'Adicionar'} fullWidth={false} style={{ flex: 1 }} loading={loading} onPress={handleSaveExercise} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  back: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary },
  scroll: { padding: 20, gap: 16, paddingBottom: 60 },
  workoutHeader: { gap: 8 },
  dayTag: { alignSelf: 'flex-start' },
  dayTagText: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  workoutName: { fontSize: 26, fontWeight: '900', color: colors.text },
  muscleTag: { backgroundColor: colors.primary + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  muscleTagText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  workoutDesc: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  progressSection: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  allDone: { color: colors.success, fontSize: 14, fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: colors.border + '60', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  emptyExercises: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptySubText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  exerciseCard: { marginBottom: 4 },
  exerciseCardDone: { opacity: 0.6, borderColor: colors.success + '40' },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exerciseLeft: { flexDirection: 'row', gap: 14, flex: 1 },
  exerciseNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.primary, marginTop: 2 },
  exerciseNumberDone: { backgroundColor: colors.success, borderColor: colors.success },
  exerciseNumberText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  exerciseName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  exerciseNameDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  exerciseTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  exerciseNotes: { color: colors.textMuted, fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  exerciseActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  inlineFields: { flexDirection: 'row', gap: 10 },
  inlineField: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  suggestionsSection: { marginBottom: 4 },
  suggestionsLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  suggestionsRow: { marginBottom: 4 },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 8,
  },
  suggestionChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  suggestionText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  suggestionTextActive: { color: colors.primary, fontWeight: '700' },
  deleteOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
  deleteModal: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, gap: 12 },
  confirmModal: { alignItems: 'center', paddingVertical: 32 },
  confirmEmoji: { fontSize: 48, marginBottom: 8 },
  confirmDesc: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorBanner: { backgroundColor: colors.error + '20', borderRadius: 10, padding: 14, width: '100%' },
  errorBannerText: { color: colors.error, fontSize: 14, lineHeight: 20 },
  finishSection: { gap: 10, marginTop: 8 },
  finishDone: { color: colors.success, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
