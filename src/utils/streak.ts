export function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function yesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function prevDay(date: string): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function calcStreakFromDates(dates: string[]): { streak: number; lastDate: string | null } {
  const unique = [...new Set(dates)].sort();
  if (unique.length === 0) return { streak: 0, lastDate: null };

  const lastDate = unique[unique.length - 1];
  const today = todayDate();
  const yesterday = yesterdayDate();

  if (lastDate !== today && lastDate !== yesterday) {
    return { streak: 0, lastDate };
  }

  const set = new Set(unique);
  let streak = 1;
  let cursor = lastDate;

  while (set.has(prevDay(cursor))) {
    cursor = prevDay(cursor);
    streak++;
  }

  return { streak, lastDate };
}
