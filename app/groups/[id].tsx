import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/context/auth.context';
import { useGroupRepository } from '../../src/database/repositories/groupRepository';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, getFireLevel } from '../../src/utils/theme';
import { parseDbError } from '../../src/utils/errors';
import { navigateBack } from '../../src/utils/navigation';
import { IGroup, IGroupMember, IGroupCheckin } from '../../src/interfaces';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthContext();
  const { getGroupById, getGroupMembers, doGroupCheckin, getGroupRecentCheckins, leaveGroup } = useGroupRepository();

  const [group, setGroup] = useState<IGroup | null>(null);
  const [members, setMembers] = useState<IGroupMember[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<IGroupCheckin[]>([]);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const checkedInToday = recentCheckins.some(c => c.user_id === user?.id && c.checkin_date === today);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    try {
      const [g, m, r] = await Promise.all([
        getGroupById(Number(id)),
        getGroupMembers(Number(id)),
        getGroupRecentCheckins(Number(id)),
      ]);
      setGroup(g);
      setMembers(m);
      setRecentCheckins(r);
    } catch (err: unknown) {
      Alert.alert('Erro ao carregar grupo', parseDbError(err));
    }
  }

  async function handleGroupCheckin() {
    if (!user || !group) return;
    setCheckinLoading(true);
    try {
      await doGroupCheckin(group.id, user.id);
      await loadData();
    } catch (err: unknown) {
      Alert.alert('Erro no check-in do grupo', parseDbError(err, 'checkin'));
    } finally {
      setCheckinLoading(false);
    }
  }

  async function handleShare() {
    if (!group) return;
    await Share.share({
      message: `Entre no meu grupo de treino "${group.name}" no RotinaFit! 🔥\nUse o código: ${group.invite_code}`,
    });
  }

  function handleLeave() {
    setLeaveError('');
    setShowLeaveConfirm(true);
  }

  async function confirmLeave() {
    if (!user || !group) return;
    setLeaveLoading(true);
    setLeaveError('');
    try {
      await leaveGroup(group.id, user.id);
      setShowLeaveConfirm(false);
      navigateBack('/(tabs)/groups');
    } catch (err: unknown) {
      setLeaveError(parseDbError(err));
    } finally {
      setLeaveLoading(false);
    }
  }

  const todayCheckins = recentCheckins.filter(c => c.checkin_date === today);

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><Text style={styles.loadingText}>Carregando...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigateBack('/(tabs)/groups')}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareText}>Convidar 📤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && <Text style={styles.groupDesc}>{group.description}</Text>}
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Código: </Text>
            <Text style={styles.codeValue}>{group.invite_code}</Text>
            <Text style={styles.memberCount}> • {group.member_count} membro{group.member_count !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {!checkedInToday ? (
          <Button
            title="Fazer check-in no grupo 🔥"
            onPress={handleGroupCheckin}
            loading={checkinLoading}
            size="lg"
          />
        ) : (
          <Card variant="highlighted" style={styles.checkedCard}>
            <Text style={styles.checkedText}>✅ Você fez check-in hoje!</Text>
          </Card>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check-ins hoje ({todayCheckins.length})</Text>
          {todayCheckins.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Ninguém fez check-in hoje ainda.</Text>
              <Text style={styles.emptyText}>Seja o primeiro! 💪</Text>
            </Card>
          ) : (
            <View style={styles.avatarRow}>
              {todayCheckins.map(c => (
                <View key={c.id} style={styles.checkinAvatar}>
                  <Text style={styles.checkinAvatarEmoji}>{c.user_avatar}</Text>
                  <Text style={styles.checkinAvatarName} numberOfLines={1}>{c.user_name?.split(' ')[0]}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membros ({members.length})</Text>
          {members.map(member => {
            const streak = member.streak_count ?? 0;
            const fire = getFireLevel(streak);
            const lastCheckin = member.last_checkin;
            const checkedToday = lastCheckin === today;
            return (
              <Card key={member.id} variant="surface" style={styles.memberCard}>
                <View style={styles.memberLeft}>
                  <View style={[styles.memberAvatar, checkedToday && styles.memberAvatarActive]}>
                    <Text style={styles.memberAvatarEmoji}>{member.user_avatar}</Text>
                  </View>
                  <View>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.user_name}</Text>
                      {member.user_id === user?.id && <Text style={styles.youBadge}>Você</Text>}
                    </View>
                    <Text style={styles.memberStreak}>
                      {streak > 0 ? `${fire.emoji} ${streak} dias seguidos` : 'Nenhuma sequência'}
                    </Text>
                  </View>
                </View>
                <View style={styles.memberRight}>
                  {checkedToday && <Text style={styles.todayCheck}>✅ Hoje</Text>}
                </View>
              </Card>
            );
          })}
        </View>

        {recentCheckins.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Atividade recente</Text>
            {recentCheckins.slice(0, 10).map(c => (
              <View key={c.id} style={styles.activityItem}>
                <Text style={styles.activityEmoji}>{c.user_avatar}</Text>
                <Text style={styles.activityText}>
                  <Text style={styles.activityName}>{c.user_name?.split(' ')[0]}</Text>
                  {' fez check-in'}
                </Text>
                <Text style={styles.activityDate}>{formatDate(c.checkin_date)}</Text>
              </View>
            ))}
          </View>
        )}

        <Button title="Sair do grupo" variant="danger" onPress={handleLeave} style={styles.leaveBtn} />
      </ScrollView>

      <Modal visible={showLeaveConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, styles.confirmModal]}>
            <Text style={styles.confirmEmoji}>🚪</Text>
            <Text style={styles.modalTitle}>Sair do grupo?</Text>
            <Text style={styles.confirmDesc}>
              {group ? `Deseja sair de "${group.name}"?` : ''}
            </Text>
            {leaveError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️  {leaveError}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={() => { setShowLeaveConfirm(false); setLeaveError(''); }}
              />
              <Button
                title="Sair"
                variant="danger"
                fullWidth={false}
                style={{ flex: 1 }}
                loading={leaveLoading}
                onPress={confirmLeave}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (dateStr === today) return 'Hoje';
  if (dateStr === yesterdayStr) return 'Ontem';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  back: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  shareText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  scroll: { padding: 20, gap: 20, paddingBottom: 60 },
  groupHeader: { gap: 6 },
  groupName: { fontSize: 26, fontWeight: '900', color: colors.text },
  groupDesc: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  codeLabel: { color: colors.textMuted, fontSize: 13 },
  codeValue: { color: colors.accent, fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  memberCount: { color: colors.textMuted, fontSize: 13 },
  checkedCard: { paddingVertical: 16 },
  checkedText: { color: colors.success, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptyCard: { alignItems: 'center', gap: 6, paddingVertical: 20 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  checkinAvatar: { alignItems: 'center', gap: 6 },
  checkinAvatarEmoji: { fontSize: 40, backgroundColor: colors.surface, borderRadius: 24, width: 48, height: 48, textAlign: 'center', lineHeight: 48 },
  checkinAvatarName: { color: colors.textSecondary, fontSize: 12, maxWidth: 48 },
  memberCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  memberLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  memberAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  memberAvatarActive: { borderColor: colors.success },
  memberAvatarEmoji: { fontSize: 26 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  youBadge: { backgroundColor: colors.primary + '20', color: colors.primary, fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  memberStreak: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  memberRight: {},
  todayCheck: { color: colors.success, fontSize: 13, fontWeight: '600' },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
  activityEmoji: { fontSize: 22 },
  activityText: { flex: 1, color: colors.textSecondary, fontSize: 14 },
  activityName: { color: colors.text, fontWeight: '600' },
  activityDate: { color: colors.textMuted, fontSize: 12 },
  leaveBtn: { marginTop: 8 },
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
