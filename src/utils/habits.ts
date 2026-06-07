export function validateHabitTargetDays(value: string): string | null {
  const num = parseInt(value, 10);
  if (!value.trim() || Number.isNaN(num)) {
    return 'Informe quantos dias por semana.';
  }
  if (num < 1) {
    return 'Informe pelo menos 1 dia por semana.';
  }
  if (num > 7) {
    return 'O máximo é 7 dias por semana.';
  }
  return null;
}
