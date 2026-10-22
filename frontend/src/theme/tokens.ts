export const colors = {
  // Core palette
  bgPrimary: '#0D1322',
  bgSecondary: '#111827',
  cardSurface: '#18243E',
  cardSurfaceHover: '#1F2F52',
  cardBorder: '#283A60',

  // Brand
  foxOrange: '#FF7A00',
  foxOrangeHover: '#E06D00',
  foxOrangeLight: 'rgba(255, 122, 0, 0.15)',
  emeraldGreen: '#10B981',
  emeraldGreenLight: 'rgba(16, 185, 129, 0.15)',

  // Answer buttons
  answerRed: '#EF4444',
  answerBlue: '#3B82F6',
  answerYellow: '#F59E0B',
  answerGreen: '#22C55E',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#E2E8F0',
  textMuted: '#94A3B8',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.65)',
  glassCard: '#18243E',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const shadows = {
  card: '0 4px 0 #131C30',
  cardHover: '0 6px 0 #131C30',
  duoBtnOrange: '0 4px 0 #B85000',
  duoBtnGreen: '0 4px 0 #0D694B',
  glow: (color: string) => `0 0 20px ${color}40`,
  answerButton: '0 4px 0',
} as const;

export const fonts = {
  primary: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'SF Mono', 'Fira Code', monospace",
} as const;

export const transitions = {
  fast: '0.15s ease',
  normal: '0.25s ease',
  slow: '0.4s ease',
  spring: { type: 'spring', stiffness: 300, damping: 25 },
  springBouncy: { type: 'spring', stiffness: 400, damping: 15 },
} as const;

// Student avatar options
export const studentAvatars = [
  { id: 'hedgehog', name: 'Ёжик', src: '/assets/avatars/students/hedgehog.png' },
  { id: 'raccoon', name: 'Енот', src: '/assets/avatars/students/raccoon.png' },
  { id: 'bear', name: 'Медвежонок', src: '/assets/avatars/students/bear.png' },
  { id: 'owl', name: 'Совёнок', src: '/assets/avatars/students/owl.png' },
  { id: 'bunny', name: 'Зайка', src: '/assets/avatars/students/bunny.png' },
  { id: 'squirrel', name: 'Белочка', src: '/assets/avatars/students/squirrel.png' },
] as const;

export const teacherAvatars = [
  { id: 'badger', name: 'Барсук', src: '/assets/avatars/teachers/badger.png' },
  { id: 'owl', name: 'Сова', src: '/assets/avatars/teachers/owl.png' },
  { id: 'deer', name: 'Олень', src: '/assets/avatars/teachers/deer.png' },
  { id: 'bear', name: 'Медведь', src: '/assets/avatars/teachers/bear.png' },
  { id: 'cat', name: 'Кот', src: '/assets/avatars/teachers/cat.png' },
  { id: 'fox', name: 'Лиса', src: '/assets/avatars/teachers/fox.png' },
] as const;
