import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/context/auth.context';
import { useWorkoutRepository } from '../../src/database/repositories/workoutRepository';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { colors, DAY_FULL_NAMES, MUSCLE_GROUPS } from '../../src/utils/theme';
import { parseDbError } from '../../src/utils/errors';
import { navigateBack } from '../../src/utils/navigation';

export default function CreateWorkout() {
  const { user } = useAuthContext();
  const { createWorkout } = useWorkoutRepository();

  const [name, setName] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Informe o nome do treino';
    if (!selectedMuscle) e.muscle = 'Selecione o grupo muscular';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !user) return;
    setLoading(true);
    try {
      const id = await createWorkout({
        user_id: user.id,
        name: name.trim(),
        day_of_week: selectedDay,
        muscle_group: selectedMuscle,
        description: description.trim() || null,
      });
      router.replace(`/workout/${id}`);
    } catch (err: unknown) {
      Alert.alert('Erro ao criar treino', parseDbError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigateBack('/(tabs)/workout')}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Novo treino</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input
          label="Nome do treino"
          placeholder="Ex: Treino A - Peito e Tríceps"
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoFocus
        />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Dia da semana</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayRow} contentContainerStyle={styles.dayRowContent}>
            {[0, 1, 2, 3, 4, 5, 6].map(day => (
              <TouchableOpacity
                key={day}
                style={[styles.dayChip, selectedDay === day && styles.dayChipActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>
                  {DAY_FULL_NAMES[day]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, errors.muscle && styles.fieldLabelError]}>
            Grupo muscular {errors.muscle && `— ${errors.muscle}`}
          </Text>
          <View style={styles.muscleGrid}>
            {MUSCLE_GROUPS.map(muscle => (
              <TouchableOpacity
                key={muscle}
                style={[styles.muscleChip, selectedMuscle === muscle && styles.muscleChipActive]}
                onPress={() => setSelectedMuscle(muscle)}
              >
                <Text style={[styles.muscleChipText, selectedMuscle === muscle && styles.muscleChipTextActive]}>
                  {muscle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label="Descrição (opcional)"
          placeholder="Detalhes sobre este treino..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
        />

        <Button title="Criar treino 💪" onPress={handleSave} loading={loading} style={styles.saveBtn} size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  back: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  pageTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  scroll: { padding: 20, paddingBottom: 60 },
  field: { marginBottom: 20 },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  fieldLabelError: { color: colors.error },
  dayRow: { flexGrow: 0 },
  dayRowContent: { gap: 8 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  dayChipTextActive: { color: colors.white, fontWeight: '700' },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muscleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  muscleChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  muscleChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  muscleChipTextActive: { color: colors.primary, fontWeight: '700' },
  saveBtn: { marginTop: 12 },
});
