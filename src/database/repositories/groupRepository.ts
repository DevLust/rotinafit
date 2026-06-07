import { supabase } from '../../lib/supabase';
import { IGroup, IGroupMember, IGroupCheckin } from '../../interfaces';
import { calcStreakFromDates } from '../../utils/streak';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function useGroupRepository() {
  async function createGroup(name: string, description: string | null, userId: string): Promise<number> {
    let inviteCode = generateInviteCode();
    for (let attempts = 0; attempts < 10; attempts++) {
      const { data } = await supabase.from('groups').select('id').eq('invite_code', inviteCode).maybeSingle();
      if (!data) break;
      inviteCode = generateInviteCode();
    }

    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name, description, created_by_user_id: userId, invite_code: inviteCode })
      .select('id')
      .single();
    if (error) throw error;

    await supabase.from('group_members').insert({ group_id: group.id, user_id: userId });
    return group.id;
  }

  async function joinGroupByCode(inviteCode: string): Promise<IGroup | null> {
    const { data, error } = await supabase.rpc('join_group_by_invite_code', {
      p_invite_code: inviteCode.trim(),
    });
    if (error) throw error;
    if (!data) return null;
    return data as IGroup;
  }

  async function getUserGroups(userId: string): Promise<IGroup[]> {
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);
    if (!memberships || memberships.length === 0) return [];

    const groupIds = memberships.map(m => m.group_id);
    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false });

    if (!groups) return [];

    const result: IGroup[] = await Promise.all(
      groups.map(async g => {
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id);
        return { ...g, member_count: count ?? 0 };
      })
    );
    return result;
  }

  async function getGroupById(groupId: number): Promise<IGroup | null> {
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    if (!group) return null;
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);
    return { ...group, member_count: count ?? 0 };
  }

  async function getGroupMembers(groupId: number): Promise<IGroupMember[]> {
    const [{ data: members }, { data: groupCheckins }] = await Promise.all([
      supabase
        .from('group_members')
        .select('*, profiles(name, avatar_emoji)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('group_checkins')
        .select('user_id, checkin_date')
        .eq('group_id', groupId),
    ]);

    if (!members) return [];

    const datesByUser: Record<string, string[]> = {};
    for (const c of groupCheckins ?? []) {
      if (!datesByUser[c.user_id]) datesByUser[c.user_id] = [];
      datesByUser[c.user_id].push(c.checkin_date);
    }

    return members.map((m: any) => {
      const { streak, lastDate } = calcStreakFromDates(datesByUser[m.user_id] ?? []);
      return {
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        joined_at: m.joined_at,
        user_name: m.profiles?.name ?? 'Usuário',
        user_avatar: m.profiles?.avatar_emoji ?? '💪',
        streak_count: streak,
        last_checkin: lastDate ?? undefined,
      };
    });
  }

  async function doGroupCheckin(groupId: number, userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('group_checkins')
      .upsert({ group_id: groupId, user_id: userId, checkin_date: today });
  }

  async function getGroupTodayCheckins(groupId: number): Promise<IGroupCheckin[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('group_checkins')
      .select('*, profiles(name, avatar_emoji)')
      .eq('group_id', groupId)
      .eq('checkin_date', today)
      .order('created_at', { ascending: false });

    return (data ?? []).map((c: any) => ({
      ...c,
      user_name: c.profiles?.name ?? 'Usuário',
      user_avatar: c.profiles?.avatar_emoji ?? '💪',
    }));
  }

  async function getGroupRecentCheckins(groupId: number): Promise<IGroupCheckin[]> {
    const { data } = await supabase
      .from('group_checkins')
      .select('*, profiles(name, avatar_emoji)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(20);

    return (data ?? []).map((c: any) => ({
      ...c,
      user_name: c.profiles?.name ?? 'Usuário',
      user_avatar: c.profiles?.avatar_emoji ?? '💪',
    }));
  }

  async function leaveGroup(groupId: number, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  return {
    createGroup,
    joinGroupByCode,
    getUserGroups,
    getGroupById,
    getGroupMembers,
    doGroupCheckin,
    getGroupTodayCheckins,
    getGroupRecentCheckins,
    leaveGroup,
  };
}
