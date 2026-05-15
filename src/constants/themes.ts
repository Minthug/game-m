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

export interface ThemeUI {
  headerBg: string;
  headerText: string;
  headerSubText: string;
  borderColor: string;
  inputAreaBg: string;
  inputBg: string;
  inputText: string;
  placeholderText: string;
  buttonBg: string;
  buttonDisabledBg: string;
  emptyTitle: string;
  emptySubtitle: string;
}

export interface BackgroundTheme {
  id: string;
  name: string;
  bg: string;
  dotColor: string;
  free: boolean;
  ui: ThemeUI;
}

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    id: 'default', name: '기본', bg: '#F0EDE6', dotColor: 'rgba(120,100,80,0.12)', free: true,
    ui: {
      headerBg:       '#FFFFFF',
      headerText:     '#1C1917',
      headerSubText:  '#78716C',
      borderColor:    '#E2DDD6',
      inputAreaBg:    '#FFFFFF',
      inputBg:        '#EDE9E3',
      inputText:      '#1C1917',
      placeholderText:'#A8A29E',
      buttonBg:       '#7C3AED',
      buttonDisabledBg:'#E2DDD6',
      emptyTitle:     '#4C4558',
      emptySubtitle:  '#8B85A0',
    },
  },
  {
    id: 'deep_sea', name: '심해', bg: '#020C1B', dotColor: 'rgba(0,180,255,0.50)', free: false,
    ui: {
      headerBg:       '#030F22',
      headerText:     '#D0EEFF',
      headerSubText:  '#4A9EBB',
      borderColor:    'rgba(0,160,220,0.18)',
      inputAreaBg:    '#030F22',
      inputBg:        '#071828',
      inputText:      '#C0E8FF',
      placeholderText:'#2A6A88',
      buttonBg:       '#0077BB',
      buttonDisabledBg:'#061525',
      emptyTitle:     '#5CC8F0',
      emptySubtitle:  '#2A6A88',
    },
  },
  {
    id: 'lava', name: '용암', bg: '#120100', dotColor: 'rgba(255,90,0,0.60)', free: false,
    ui: {
      headerBg:       '#180100',
      headerText:     '#FFD0A0',
      headerSubText:  '#AA4411',
      borderColor:    'rgba(255,90,0,0.20)',
      inputAreaBg:    '#180100',
      inputBg:        '#220200',
      inputText:      '#FFD0A0',
      placeholderText:'#773311',
      buttonBg:       '#CC3300',
      buttonDisabledBg:'#2A0500',
      emptyTitle:     '#FF7744',
      emptySubtitle:  '#773311',
    },
  },
  {
    id: 'storm', name: '폭풍', bg: '#060610', dotColor: 'rgba(130,150,255,0.45)', free: false,
    ui: {
      headerBg:       '#08081A',
      headerText:     '#C8D4FF',
      headerSubText:  '#6070BB',
      borderColor:    'rgba(120,140,255,0.18)',
      inputAreaBg:    '#08081A',
      inputBg:        '#0E0E28',
      inputText:      '#C8D4FF',
      placeholderText:'#404880',
      buttonBg:       '#4455CC',
      buttonDisabledBg:'#10102A',
      emptyTitle:     '#7788EE',
      emptySubtitle:  '#404880',
    },
  },
  {
    id: 'fog_forest', name: '안개숲', bg: '#0A1A0D', dotColor: 'rgba(0,200,80,0.38)', free: false,
    ui: {
      headerBg:       '#0A1A0D',
      headerText:     '#A8E6B4',
      headerSubText:  '#3D8A50',
      borderColor:    'rgba(0,180,70,0.18)',
      inputAreaBg:    '#0A1A0D',
      inputBg:        '#101E12',
      inputText:      '#A8E6B4',
      placeholderText:'#285C36',
      buttonBg:       '#1E7A35',
      buttonDisabledBg:'#122014',
      emptyTitle:     '#4ABB66',
      emptySubtitle:  '#285C36',
    },
  },
];

export const AD_GROUP_ID = 'YOUR_AD_GROUP_ID'; // TODO: 앱인토스 콘솔에서 발급
