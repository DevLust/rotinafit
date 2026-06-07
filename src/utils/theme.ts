export const colors = {
  background: '#0d1535',
  surface: '#152240',
  card: '#1a2d58',
  border: '#1e3570',
  primary: '#ff6600',
  primaryDark: '#cc5200',
  secondary: '#4d9fff',
  accent: '#ffa500',
  success: '#2ecc71',
  successLight: '#1a4d30',
  warning: '#ff9800',
  error: '#e74c3c',
  white: '#ffffff',
  text: '#ffffff',
  textSecondary: '#8fa3c0',
  textMuted: '#4a6080',
  overlay: 'rgba(0,0,0,0.75)',
};

export const FIRE_LEVELS = [
  { min: 0, max: 0, emoji: '', label: 'Comece agora!', color: colors.textMuted },
  { min: 1, max: 2, emoji: '🔥', label: 'Iniciando', color: '#ff9800' },
  { min: 3, max: 6, emoji: '🔥🔥', label: 'Pegando ritmo', color: '#ff6600' },
  { min: 7, max: 13, emoji: '🔥🔥🔥', label: 'Em chamas!', color: '#ff4400' },
  { min: 14, max: 29, emoji: '🔥🔥🔥🔥', label: 'Imparável!', color: '#e74c3c' },
  { min: 30, max: Infinity, emoji: '🔥🔥🔥🔥🔥', label: 'Lenda!', color: '#8e24aa' },
];

export function getFireLevel(streak: number) {
  return FIRE_LEVELS.find(l => streak >= l.min && streak <= l.max) ?? FIRE_LEVELS[0];
}

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DAY_FULL_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps',
  'Pernas', 'Glúteos', 'Abdômen', 'Panturrilha', 'Corpo inteiro', 'Cardio',
];

export const FITNESS_GOALS = [
  'Hipertrofia muscular',
  'Perda de peso',
  'Resistência física',
  'Condicionamento geral',
  'Força e potência',
  'Saúde e bem-estar',
];

export const HABIT_EMOJIS = ['💧', '🏃', '🧘', '😴', '🥗', '📖', '🚴', '🏊', '🧗', '🎯', '✅', '⚡'];
