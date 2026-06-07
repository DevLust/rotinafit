import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/context/auth.context';
import { useUserRepository } from '../../src/database/repositories/userRepository';

import { useCheckinRepository } from '../../src/database/repositories/checkinRepository';
import { useHabitRepository } from '../../src/database/repositories/habitRepository';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { StreakDisplay } from '../../src/components/StreakDisplay';
import { colors, FITNESS_GOALS, HABIT_EMOJIS } from '../../src/utils/theme';
import { parseDbError } from '../../src/utils/errors';
import { validateHabitTargetDays } from '../../src/utils/habits';
import { getPreferences, savePreferences, UserPreferences } from '../../src/utils/preferences';
import { IHabit } from '../../src/interfaces';

const AVATAR_OPTIONS = ['💪', '🏋️', '🔥', '⚡', '🦁', '🐺', '🚀', '🎯', '🏃', '🦅', '🐉', '⭐'];

export default function Profile() {
  const { user, signOut, refreshUser } = useAuthContext();
  const { update } = useUserRepository();
  const { getCurrentStreak } = useCheckinRepository();
  const { getHabitsByUser, createHabit, deleteHabit } = useHabitRepository();

  const [streak, setStreak] = useState(0);
  const [habits, setHabits] = useState<IHabit[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [showDeleteHabitConfirm, setShowDeleteHabitConfirm] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteHabitLoading, setDeleteHabitLoading] = useState(false);
  const [deleteHabitError, setDeleteHabitError] = useState('');
  const [targetError, setTargetError] = useState('');
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editGoal, setEditGoal] = useState(user?.fitness_goal ?? '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar_emoji ?? '💪');
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('✅');
  const [newHabitTarget, setNewHabitTarget] = useState('3');
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  async function loadData() {
    if (!user) return;
    const [s, h, p] = await Promise.all([
      getCurrentStreak(user.id),
      getHabitsByUser(user.id),
      getPreferences(user.id),
    ]);
    setStreak(s);
    setHabits(h);
    setPrefs(p);
  }

  async function updatePrefs(patch: Partial<UserPreferences>) {
    if (!user) return;
    const next = await savePreferences(user.id, patch);
    setPrefs(next);
  }

  async function handleSaveProfile() {
    if (!user || !editName.trim()) return;
    setLoading(true);
    try {
      await update(user.id, {
        name: editName.trim(),
        fitness_goal: editGoal || null,
        avatar_emoji: editAvatar,
      });
      await refreshUser();
      setShowEditProfile(false);
    } catch (err: unknown) {
      Alert.alert('Erro ao salvar', parseDbError(err));
    } finally {
      setLoading(false);
    }
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
      await loadData();
    } catch (err: unknown) {
      Alert.alert('Erro ao criar hábito', parseDbError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteHabit(id: number, name: string) {
    setHabitToDelete({ id, name });
    setDeleteHabitError('');
    setShowDeleteHabitConfirm(true);
  }

  async function confirmDeleteHabit() {
    if (!habitToDelete) return;
    setDeleteHabitLoading(true);
    setDeleteHabitError('');
    try {
      await deleteHabit(habitToDelete.id);
      setShowDeleteHabitConfirm(false);
      setHabitToDelete(null);
      await loadData();
    } catch (err: unknown) {
      setDeleteHabitError(parseDbError(err));
    } finally {
      setDeleteHabitLoading(false);
    }
  }

  async function confirmSignOut() {
    setSignOutLoading(true);
    try {
      await signOut();
    } catch {
      setSignOutLoading(false);
      setShowSignOutConfirm(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileHero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{user?.avatar_emoji}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.fitness_goal && (
            <View style={styles.goalBadge}>
              <Text style={styles.goalBadgeText}>🎯 {user.fitness_goal}</Text>
            </View>
          )}
          <Button
            title="Editar perfil"
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={() => {
              setEditName(user?.name ?? '');
              setEditGoal(user?.fitness_goal ?? '');
              setEditAvatar(user?.avatar_emoji ?? '💪');
              setShowEditProfile(true);
            }}
            style={styles.editBtn}
          />
        </View>

        <StreakDisplay streak={streak} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meus hábitos</Text>
            <TouchableOpacity onPress={() => setShowAddHabit(true)}>
              <Text style={styles.addLink}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>
          {habits.length === 0 ? (
            <Card style={styles.emptyHabits}>
              <Text style={styles.emptyText}>Nenhum hábito cadastrado ainda.</Text>
              <Text style={styles.emptyText}>Crie hábitos para acompanhar sua evolução!</Text>
            </Card>
          ) : (
            habits.map(habit => (
              <Card key={habit.id} style={styles.habitCard} variant="surface">
                <View style={styles.habitRow}>
                  <Text style={styles.habitEmoji}>{habit.icon_emoji}</Text>
                  <View style={styles.habitInfo}>
                    <Text style={styles.habitName}>{habit.name}</Text>
                    <Text style={styles.habitTarget}>{habit.target_days_per_week}x por semana</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteHabit(habit.id, habit.name)}>
                    <Text style={styles.deleteText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lembretes e metas</Text>
          <Card variant="surface" style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowNotifications(true)}>
              <Text style={styles.menuItemText}>🔔 Notificações e horários</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/habits')}>
              <Text style={styles.menuItemText}>📋 Checklist diário de hábitos</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <Card variant="surface" style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/stats')}>
              <Text style={styles.menuItemText}>📊 Ver estatísticas completas</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowSignOutConfirm(true)}>
              <Text style={[styles.menuItemText, styles.dangerText]}>🚪 Sair da conta</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>

      <Modal visible={showEditProfile} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Editar perfil</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Input label="Nome" value={editName} onChangeText={setEditName} placeholder="Seu nome" />
              <Text style={styles.fieldLabel}>Avatar</Text>
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.avatarOption, editAvatar === emoji && styles.avatarOptionActive]}
                    onPress={() => setEditAvatar(emoji)}
                  >
                    <Text style={styles.avatarOptionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Objetivo fitness</Text>
              <View style={styles.goalGrid}>
                {FITNESS_GOALS.map(goal => (
                  <TouchableOpacity
                    key={goal}
                    style={[styles.goalChip, editGoal === goal && styles.goalChipActive]}
                    onPress={() => setEditGoal(editGoal === goal ? '' : goal)}
                  >
                    <Text style={[styles.goalChipText, editGoal === goal && styles.goalChipTextActive]}>{goal}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="outline" fullWidth={false} style={{ flex: 1 }} onPress={() => setShowEditProfile(false)} />
              <Button title="Salvar" fullWidth={false} style={{ flex: 1 }} loading={loading} onPress={handleSaveProfile} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteHabitConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, styles.confirmModal]}>
            <Text style={styles.confirmEmoji}>🗑️</Text>
            <Text style={styles.modalTitle}>Remover hábito?</Text>
            <Text style={styles.confirmDesc}>
              {habitToDelete ? `Deseja remover "${habitToDelete.name}"?` : ''}
            </Text>
            {deleteHabitError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️  {deleteHabitError}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={() => { setShowDeleteHabitConfirm(false); setHabitToDelete(null); setDeleteHabitError(''); }}
              />
              <Button
                title="Remover"
                variant="danger"
                fullWidth={false}
                style={{ flex: 1 }}
                loading={deleteHabitLoading}
                onPress={confirmDeleteHabit}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSignOutConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, styles.confirmModal]}>
            <Text style={styles.confirmEmoji}>🚪</Text>
            <Text style={styles.modalTitle}>Sair da conta?</Text>
            <Text style={styles.confirmDesc}>Você precisará fazer login novamente para acessar o app.</Text>
            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={() => setShowSignOutConfirm(false)}
              />
              <Button
                title="Sair"
                variant="danger"
                fullWidth={false}
                style={{ flex: 1 }}
                loading={signOutLoading}
                onPress={confirmSignOut}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Lembretes</Text>
            {prefs && (
              <>
                <View style={styles.prefRow}>
                  <View style={styles.prefInfo}>
                    <Text style={styles.prefLabel}>Lembrete de treino</Text>
                    <Text style={styles.prefDesc}>Avisa no início quando ainda não fez check-in</Text>
                  </View>
                  <Switch
                    value={prefs.workoutReminder}
                    onValueChange={v => updatePrefs({ workoutReminder: v })}
                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                    thumbColor={prefs.workoutReminder ? colors.primary : colors.textMuted}
                  />
                </View>
                <Input
                  label="Horário do treino"
                  placeholder="07:00"
                  value={prefs.workoutTime}
                  onChangeText={v => updatePrefs({ workoutTime: v })}
                  keyboardType="numbers-and-punctuation"
                />
                <View style={styles.prefRow}>
                  <View style={styles.prefInfo}>
                    <Text style={styles.prefLabel}>Lembrete de hábitos</Text>
                    <Text style={styles.prefDesc}>Mostra alerta quando há itens pendentes no checklist</Text>
                  </View>
                  <Switch
                    value={prefs.habitReminder}
                    onValueChange={v => updatePrefs({ habitReminder: v })}
                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                    thumbColor={prefs.habitReminder ? colors.primary : colors.textMuted}
                  />
                </View>
              </>
            )}
            <Button title="Fechar" variant="outline" onPress={() => setShowNotifications(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showAddHabit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Novo hábito</Text>
            <Input label="Nome do hábito" placeholder="Ex: Beber 2L de água" value={newHabitName} onChangeText={setNewHabitName} autoFocus />
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
              label="Dias por semana"
              placeholder="Ex: 3"
              value={newHabitTarget}
              onChangeText={v => { setNewHabitTarget(v); setTargetError(''); }}
              keyboardType="number-pad"
              maxLength={2}
              error={targetError}
            />
            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="outline" fullWidth={false} style={{ flex: 1 }} onPress={() => setShowAddHabit(false)} />
              <Button title="Criar" fullWidth={false} style={{ flex: 1 }} loading={loading} onPress={handleAddHabit} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  profileHero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  avatarCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 48 },
  userName: { fontSize: 22, fontWeight: '900', color: colors.text },
  userEmail: { color: colors.textSecondary, fontSize: 14 },
  goalBadge: { backgroundColor: colors.primary + '20', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  goalBadgeText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  editBtn: { marginTop: 4 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  addLink: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  emptyHabits: { alignItems: 'center', gap: 6, paddingVertical: 16 },
  emptyText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  habitCard: { paddingVertical: 12 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitEmoji: { fontSize: 28 },
  habitInfo: { flex: 1 },
  habitName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  habitTarget: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  deleteText: { fontSize: 18 },
  menuCard: { gap: 0, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  menuItemText: { color: colors.text, fontSize: 15 },
  menuArrow: { color: colors.textMuted, fontSize: 18 },
  dangerText: { color: colors.error },
  divider: { height: 1, backgroundColor: colors.border },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, maxHeight: '85%' },
  modalScroll: { flexGrow: 0 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  avatarOption: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
  avatarOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  avatarOptionEmoji: { fontSize: 26 },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  goalChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  goalChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  goalChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  goalChipTextActive: { color: colors.primary, fontWeight: '700' },
  emojiRow: { marginBottom: 8 },
  emojiOption: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1.5, borderColor: colors.border },
  emojiOptionActive: { borderColor: colors.primary },
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
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  prefInfo: { flex: 1 },
  prefLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  prefDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 16 },
});
