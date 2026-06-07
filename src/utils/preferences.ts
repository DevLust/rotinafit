import { storage } from '../lib/supabase';

export interface UserPreferences {
  workoutReminder: boolean;
  workoutTime: string;
  habitReminder: boolean;
}

const DEFAULTS: UserPreferences = {
  workoutReminder: true,
  workoutTime: '07:00',
  habitReminder: true,
};

function key(userId: string) {
  return `rotinafit_prefs_${userId}`;
}

export async function getPreferences(userId: string): Promise<UserPreferences> {
  try {
    const raw = await storage.getItem(key(userId));
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function savePreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await getPreferences(userId);
  const next = { ...current, ...prefs };
  await storage.setItem(key(userId), JSON.stringify(next));
  return next;
}

export function isPastReminderTime(time: string): boolean {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const now = new Date();
  const reminder = new Date();
  reminder.setHours(h, m, 0, 0);
  return now >= reminder;
}
