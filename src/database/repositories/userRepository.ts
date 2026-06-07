import { supabase } from '../../lib/supabase';
import { IProfile } from '../../interfaces';

export function useUserRepository() {
  async function findById(id: string): Promise<IProfile | null> {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    return data ?? null;
  }

  async function update(id: string, data: Partial<Pick<IProfile, 'name' | 'fitness_goal' | 'avatar_emoji'>>) {
    await supabase
      .from('profiles')
      .update(data)
      .eq('id', id);
  }

  return { findById, update };
}
