import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/context/auth.context';
import { useGroupRepository } from '../../src/database/repositories/groupRepository';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { colors } from '../../src/utils/theme';
import { parseDbError } from '../../src/utils/errors';
import { IGroup } from '../../src/interfaces';

export default function Groups() {
  const { user } = useAuthContext();
  const { getUserGroups, createGroup, joinGroupByCode } = useGroupRepository();

  const [groups, setGroups] = useState<IGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [user])
  );

  async function loadGroups() {
    if (!user) return;
    try {
      const data = await getUserGroups(user.id);
      setGroups(data);
    } catch (err: unknown) {
      Alert.alert('Erro ao carregar grupos', parseDbError(err));
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) {
      Alert.alert('Ops!', 'Informe o nome do grupo.');
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await createGroup(newGroupName.trim(), newGroupDesc.trim() || null, user.id);
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreate(false);
      await loadGroups();
    } catch (err: unknown) {
      Alert.alert('Erro ao criar grupo', parseDbError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinGroup() {
    if (!inviteCode.trim()) {
      setJoinError('Informe o código de convite.');
      return;
    }
    if (!user) return;
    setJoinError('');
    setJoinSuccess('');
    setLoading(true);
    try {
      const group = await joinGroupByCode(inviteCode.trim());
      if (!group) {
        setJoinError('Código inválido. Verifique e tente novamente.');
        return;
      }
      setInviteCode('');
      await loadGroups();
      setJoinSuccess(`Você entrou no grupo "${group.name}"!`);
      setTimeout(() => {
        setShowJoin(false);
        setJoinSuccess('');
      }, 1500);
    } catch (err: unknown) {
      setJoinError(parseDbError(err, 'group_join'));
    } finally {
      setLoading(false);
    }
  }

  async function handleShareCode(group: IGroup) {
    await Share.share({
      message: `Entre no meu grupo de treino "${group.name}" no RotinaFit! 🔥\nUse o código: ${group.invite_code}`,
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Grupos 👥</Text>
        <View style={styles.headerActions}>
          <Button title="Entrar" variant="outline" size="sm" fullWidth={false} onPress={() => { setJoinError(''); setJoinSuccess(''); setShowJoin(true); }} />
          <Button title="+ Criar" size="sm" fullWidth={false} onPress={() => setShowCreate(true)} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>Sem grupos ainda</Text>
            <Text style={styles.emptyText}>
              Crie um grupo e convide seus amigos para treinarem juntos!
            </Text>
            <View style={styles.emptyActions}>
              <Button title="Criar grupo" fullWidth={false} size="sm" onPress={() => setShowCreate(true)} />
              <Button title="Entrar com código" variant="outline" fullWidth={false} size="sm" onPress={() => { setJoinError(''); setJoinSuccess(''); setShowJoin(true); }} />
            </View>
          </View>
        ) : (
          groups.map(group => (
            <TouchableOpacity key={group.id} onPress={() => router.push(`/groups/${group.id}`)}>
              <Card style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <View style={styles.memberBadge}>
                    <Text style={styles.memberCount}>{group.member_count ?? 0}</Text>
                    <Text style={styles.memberIcon}>👤</Text>
                  </View>
                </View>
                {group.description && (
                  <Text style={styles.groupDesc} numberOfLines={2}>{group.description}</Text>
                )}
                <View style={styles.codeRow}>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>Código</Text>
                    <Text style={styles.codeValue}>{group.invite_code}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={(e) => { e.stopPropagation(); handleShareCode(group); }}
                  >
                    <Text style={styles.shareBtnText}>Compartilhar 📤</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Criar grupo</Text>
            <Input
              label="Nome do grupo"
              placeholder="Ex: Turma do treino"
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <Input
              label="Descrição (opcional)"
              placeholder="Sobre o grupo..."
              value={newGroupDesc}
              onChangeText={setNewGroupDesc}
              multiline
              numberOfLines={3}
              style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
            />
            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="outline" fullWidth={false} style={{ flex: 1 }} onPress={() => setShowCreate(false)} />
              <Button title="Criar" fullWidth={false} style={{ flex: 1 }} loading={loading} onPress={handleCreateGroup} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showJoin} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Entrar em grupo</Text>
            <Text style={styles.modalSubtitle}>Peça o código de convite para quem criou o grupo</Text>
            <Input
              label="Código de convite"
              placeholder="Ex: ABC123"
              value={inviteCode}
              onChangeText={v => { setInviteCode(v.toUpperCase()); setJoinError(''); setJoinSuccess(''); }}
              autoCapitalize="characters"
              maxLength={6}
              autoFocus
            />
            {joinError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️  {joinError}</Text>
              </View>
            ) : null}
            {joinSuccess ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>🎉  {joinSuccess}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="outline" fullWidth={false} style={{ flex: 1 }} onPress={() => { setShowJoin(false); setJoinError(''); setJoinSuccess(''); }} />
              <Button title="Entrar" fullWidth={false} style={{ flex: 1 }} loading={loading} onPress={handleJoinGroup} />
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
  headerActions: { flexDirection: 'row', gap: 8 },
  list: { padding: 20, gap: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  emptyActions: { flexDirection: 'row', gap: 10 },
  groupCard: {},
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  groupName: { fontSize: 17, fontWeight: '800', color: colors.text },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  memberCount: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  memberIcon: { fontSize: 14 },
  groupDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  codeBox: { gap: 2 },
  codeLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  codeValue: { color: colors.accent, fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  shareBtn: { backgroundColor: colors.primary + '20', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  shareBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  modalSubtitle: { color: colors.textSecondary, fontSize: 14, marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  errorBanner: {
    backgroundColor: colors.error + '20',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.error + '60',
  },
  errorBannerText: { color: colors.error, fontSize: 14, lineHeight: 20 },
  successBanner: {
    backgroundColor: colors.success + '20',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.success + '60',
  },
  successBannerText: { color: colors.success, fontSize: 14, lineHeight: 20 },
});
