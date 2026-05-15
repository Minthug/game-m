import { Expression } from '../components/Slime';

export const EXPRESSION_COLORS: Record<Expression, string[]> = {
  angry:    ['#DC2626', '#B91C1C', '#EF4444', '#C53030'],
  sad:      ['#2563EB', '#1D4ED8', '#3B82F6', '#1E40AF'],
  surprised:['#9333EA', '#7C3AED', '#A855F7', '#6D28D9'],
  blank:    ['#6B7280', '#52525B', '#71717A', '#64748B'],
  happy:    ['#7C3AED', '#DB2777', '#D97706', '#0891B2'],
  fear:     ['#4F46E5', '#4338CA', '#6366F1', '#3730A3'],
  disgust:  ['#16A34A', '#15803D', '#22C55E', '#166534'],
  contempt: ['#64748B', '#475569', '#94A3B8', '#334155'],
};

export interface BackgroundTheme {
  id: string;
  name: string;
  bg: string;
  dotColor: string;
  free: boolean;
}

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  { id: 'default',    name: '기본',   bg: '#F0EDE6', dotColor: 'rgba(120,100,80,0.12)',  free: true  },
  { id: 'deep_sea',   name: '심해',   bg: '#020C1B', dotColor: 'rgba(0,180,255,0.50)',   free: false },
  { id: 'lava',       name: '용암',   bg: '#120100', dotColor: 'rgba(255,90,0,0.60)',    free: false },
  { id: 'storm',      name: '폭풍',   bg: '#060610', dotColor: 'rgba(130,150,255,0.45)', free: false },
  { id: 'fog_forest', name: '안개숲', bg: '#0A1A0D', dotColor: 'rgba(0,200,80,0.38)',    free: false },
];

export const AD_GROUP_ID = 'YOUR_AD_GROUP_ID'; // TODO: 앱인토스 콘솔에서 발급

export const canvasTheme = {
  inputAreaBg: '#FFFFFF',
  borderColor: '#E2DDD6',
  inputBg: '#EDE9E3',
  inputText: '#1C1917',
  placeholderText: '#A8A29E',
  emptyTitle: '#4C4558',
  emptySubtitle: '#8B85A0',
  buttonDisabledBg: '#E2DDD6',
  headerBg: '#FFFFFF',
  headerText: '#1C1917',
  headerSubText: '#78716C',
};
