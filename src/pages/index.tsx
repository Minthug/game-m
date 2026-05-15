import { createRoute } from '@granite-js/react-native';
import { getAnonymousKey, Storage, eventLog, loadFullScreenAd, showFullScreenAd, requestNotificationAgreement } from '@apps-in-toss/framework';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  ScrollView,
} from 'react-native';
import { Slime, detectExpression, Expression } from '../components/Slime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EXPRESSION_COLORS: Record<Expression, string[]> = {
  angry:    ['#DC2626', '#B91C1C', '#EF4444', '#C53030'],
  sad:      ['#2563EB', '#1D4ED8', '#3B82F6', '#1E40AF'],
  surprised:['#9333EA', '#7C3AED', '#A855F7', '#6D28D9'],
  blank:    ['#6B7280', '#52525B', '#71717A', '#64748B'],
  happy:    ['#7C3AED', '#DB2777', '#D97706', '#0891B2'],
  fear:     ['#4F46E5', '#4338CA', '#6366F1', '#3730A3'],
  disgust:  ['#16A34A', '#15803D', '#22C55E', '#166534'],
  contempt: ['#64748B', '#475569', '#94A3B8', '#334155'],
};

interface BackgroundTheme {
  id: string;
  name: string;
  bg: string;
  dotColor: string;
  free: boolean;
}

const BACKGROUND_THEMES: BackgroundTheme[] = [
  { id: 'default',    name: '기본',   bg: '#F0EDE6', dotColor: 'rgba(120,100,80,0.12)',  free: true  },
  { id: 'deep_sea',   name: '심해',   bg: '#020C1B', dotColor: 'rgba(0,180,255,0.50)',   free: false },
  { id: 'lava',       name: '용암',   bg: '#120100', dotColor: 'rgba(255,90,0,0.60)',    free: false },
  { id: 'storm',      name: '폭풍',   bg: '#060610', dotColor: 'rgba(130,150,255,0.45)', free: false },
  { id: 'fog_forest', name: '안개숲', bg: '#0A1A0D', dotColor: 'rgba(0,200,80,0.38)',    free: false },
];

const AD_GROUP_ID = 'YOUR_AD_GROUP_ID'; // TODO: 앱인토스 콘솔에서 발급

const canvasTheme = {
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

interface SlimeData {
  id: string;
  color: string;
  size: number;
  x: number;
  y: number;
  text: string;
  expression: Expression;
  createdAt: number;
}

function pickColor(expr: Expression): string {
  const palette = EXPRESSION_COLORS[expr];
  return palette[Math.floor(Math.random() * palette.length)] ?? palette[0];
}

const CANVAS_H = SCREEN_HEIGHT * 0.72;

function clamp(x: number, y: number, size: number) {
  return {
    x: Math.max(8, Math.min(x, SCREEN_WIDTH - size - 8)),
    y: Math.max(8, Math.min(y, CANVAS_H - size - 8)),
  };
}

export const Route = createRoute('/', {
  component: Page,
});

const ATMO_COLORS: Record<Expression, string> = {
  angry:    'rgba(220, 38, 38, 0.09)',
  sad:      'rgba(37, 99, 235, 0.09)',
  fear:     'rgba(79, 70, 229, 0.09)',
  happy:    'rgba(219, 39, 119, 0.07)',
  disgust:  'rgba(22, 163, 74, 0.07)',
  surprised:'rgba(147, 51, 234, 0.09)',
  contempt: 'rgba(100, 116, 139, 0.07)',
  blank:    'rgba(107, 114, 128, 0.05)',
};

const ATMO_BLOBS = [
  { size: 380, left: SCREEN_WIDTH * 0.20 - 190, top: -20 },
  { size: 300, left: SCREEN_WIDTH * 0.78 - 150, top: -40 },
  { size: 340, left: SCREEN_WIDTH * 0.08 - 170, top: SCREEN_HEIGHT * 0.18 },
  { size: 320, left: SCREEN_WIDTH * 0.72 - 160, top: SCREEN_HEIGHT * 0.16 },
  { size: 270, left: SCREEN_WIDTH * 0.44 - 135, top: SCREEN_HEIGHT * 0.10 },
];

function EmotionAtmosphere({ expression }: { expression: Expression | null }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [activeColor, setActiveColor] = useState('transparent');
  const hasShownRef = useRef(false);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const blobOffsets = useRef(
    ATMO_BLOBS.map(() => ({ x: new Animated.Value(0), y: new Animated.Value(0) }))
  ).current;

  useEffect(() => {
    blobOffsets.forEach((offset, i) => {
      const drift = () => {
        Animated.parallel([
          Animated.timing(offset.x, { toValue: (Math.random() - 0.5) * 90, duration: 7000 + i * 900, useNativeDriver: true }),
          Animated.timing(offset.y, { toValue: (Math.random() - 0.5) * 55, duration: 7000 + i * 900, useNativeDriver: true }),
        ]).start(({ finished }) => { if (finished) drift(); });
      };
      setTimeout(() => drift(), i * 500);
    });
  }, []);

  useEffect(() => {
    if (animRef.current) animRef.current.stop();

    if (!expression) {
      animRef.current = Animated.timing(opacity, { toValue: 0, duration: 2000, useNativeDriver: true });
      animRef.current.start();
      return;
    }

    const newColor = ATMO_COLORS[expression];

    if (!hasShownRef.current) {
      hasShownRef.current = true;
      setActiveColor(newColor);
      animRef.current = Animated.timing(opacity, { toValue: 1, duration: 3500, useNativeDriver: true });
      animRef.current.start();
    } else {
      animRef.current = Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true });
      animRef.current.start(() => {
        setActiveColor(newColor);
        animRef.current = Animated.timing(opacity, { toValue: 1, duration: 3500, useNativeDriver: true });
        animRef.current.start();
      });
    }
  }, [expression]);

  return (
    <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, opacity }}>
      {ATMO_BLOBS.map((blob, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: blob.size,
            height: blob.size,
            borderRadius: blob.size / 2,
            backgroundColor: activeColor,
            left: blob.left,
            top: blob.top,
            transform: [{ translateX: blobOffsets[i]!.x }, { translateY: blobOffsets[i]!.y }],
          }}
        />
      ))}
    </Animated.View>
  );
}

function BackgroundDots({ dotColor }: { dotColor: string }) {
  const dots = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        size: 60 + Math.random() * 100,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * (SCREEN_HEIGHT * 0.65),
        opacity: 0.4 + Math.random() * 0.6,
      })),
    [],
  );

  return (
    <>
      {dots.map(dot => (
        <View
          key={dot.id}
          style={{
            position: 'absolute',
            width: dot.size,
            height: dot.size,
            borderRadius: dot.size / 2,
            backgroundColor: dotColor,
            left: dot.x - dot.size / 2,
            top: dot.y - dot.size / 2,
            opacity: dot.opacity,
          }}
        />
      ))}
    </>
  );
}

// 테마 카드 안에 들어가는 축소판 배경 점
const MINI_DOTS = [
  { size: 24, x: 10, y: 6,  opacity: 0.85 },
  { size: 16, x: 54, y: 10, opacity: 0.65 },
  { size: 20, x: 32, y: 30, opacity: 0.75 },
  { size: 13, x: 72, y: 4,  opacity: 0.55 },
  { size: 18, x: 62, y: 34, opacity: 0.60 },
];

function MiniDots({ dotColor }: { dotColor: string }) {
  return (
    <>
      {MINI_DOTS.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: d.size,
            height: d.size,
            borderRadius: d.size / 2,
            backgroundColor: dotColor,
            left: d.x,
            top: d.y,
            opacity: d.opacity,
          }}
        />
      ))}
    </>
  );
}

// --- 테마별 파티클 데이터 (모듈 레벨 - 한번만 계산) ---

const DEEP_SEA_BUBBLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  x: (SCREEN_WIDTH / 10) * i + (SCREEN_WIDTH / 10) * 0.3,
  color: ['#00D4FF', '#00BFFF', '#7FE8FF', '#40C8E8'][i % 4] ?? '#00D4FF',
  size: 4 + (i % 5) * 2.2,
  duration: 9000 + i * 700,
  delay: i * 1100,
}));

const LAVA_EMBERS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: (SCREEN_WIDTH / 14) * i + (SCREEN_WIDTH / 14) * 0.4,
  color: ['#FF4500', '#FF6B00', '#FF8C00', '#FFB800', '#FF2200'][i % 5] ?? '#FF4500',
  size: 2 + (i % 4),
  duration: 4500 + i * 280,
  delay: i * 480,
}));

const STORM_RAIN = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: (SCREEN_WIDTH / 18) * i,
  color: ['rgba(200,215,255,0.65)', 'rgba(180,200,255,0.50)', 'rgba(220,230,255,0.55)'][i % 3] ?? 'rgba(200,215,255,0.6)',
  w: i % 4 === 0 ? 2 : 1,
  h: 45 + (i % 5) * 8,
  duration: 1300 + (i % 6) * 150,
  delay: i * 220,
}));

// --- 애니메이션 파티클 컴포넌트 ---

function RisingParticle({ x, color, size, duration, delay }: {
  x: number; color: string; size: number; duration: number; delay: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const animate = () => {
      if (cancelled) return;
      progress.setValue(0);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.9, duration: duration * 0.2, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: duration * 0.5, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: duration * 0.3, useNativeDriver: true }),
        ]),
      ]).start(({ finished }) => { if (finished && !cancelled) animate(); });
    };
    const t = setTimeout(animate, delay);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(SCREEN_HEIGHT + 80)],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: SCREEN_HEIGHT,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

function FallingStreak({ x, color, w, h, duration, delay }: {
  x: number; color: string; w: number; h: number; duration: number; delay: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const animate = () => {
      if (cancelled) return;
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true }).start(
        ({ finished }) => { if (finished && !cancelled) animate(); }
      );
    };
    const t = setTimeout(animate, delay);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-h, SCREEN_HEIGHT + h],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: w,
        height: h,
        borderRadius: w,
        backgroundColor: color,
        transform: [{ translateY }],
      }}
    />
  );
}

function PulsingOrb({ x, y, size, color, durationMs }: {
  x: number; y: number; size: number; color: string; durationMs: number;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1.0, duration: durationMs, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: durationMs, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) pulse(); });
    };
    pulse();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

function LightningFlash() {
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.55, duration: 55, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 90, useNativeDriver: true }),
          Animated.delay(130),
          Animated.timing(flashOpacity, { toValue: 0.35, duration: 45, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]).start(() => schedule());
      }, 3500 + Math.random() * 6000);
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#8899EE', opacity: flashOpacity }}
    />
  );
}

function ThemeBackground({ themeId, dotColor }: { themeId: string; dotColor: string }) {
  if (themeId === 'deep_sea') {
    return (
      <>
        <PulsingOrb x={-160} y={-50} size={360} color="rgba(0,140,255,0.09)" durationMs={5000} />
        <PulsingOrb x={SCREEN_WIDTH - 100} y={SCREEN_HEIGHT * 0.12} size={280} color="rgba(0,200,200,0.07)" durationMs={7200} />
        <PulsingOrb x={SCREEN_WIDTH * 0.38 - 150} y={-20} size={320} color="rgba(0,80,200,0.06)" durationMs={6000} />
        {DEEP_SEA_BUBBLES.map(p => <RisingParticle key={p.id} {...p} />)}
      </>
    );
  }

  if (themeId === 'lava') {
    return (
      <>
        <PulsingOrb x={-SCREEN_WIDTH * 0.15} y={SCREEN_HEIGHT * 0.4} size={SCREEN_WIDTH * 1.3} color="rgba(255,35,0,0.11)" durationMs={2500} />
        <PulsingOrb x={SCREEN_WIDTH * 0.15} y={SCREEN_HEIGHT * 0.5} size={SCREEN_WIDTH * 0.7} color="rgba(255,100,0,0.10)" durationMs={1800} />
        {LAVA_EMBERS.map(p => <RisingParticle key={p.id} {...p} />)}
      </>
    );
  }

  if (themeId === 'storm') {
    return (
      <>
        <PulsingOrb x={-160} y={-60} size={380} color="rgba(70,70,220,0.09)" durationMs={8000} />
        <PulsingOrb x={SCREEN_WIDTH * 0.55} y={SCREEN_HEIGHT * 0.06} size={300} color="rgba(100,60,255,0.07)" durationMs={6500} />
        <LightningFlash />
        {STORM_RAIN.map(p => <FallingStreak key={p.id} {...p} />)}
      </>
    );
  }

  return <BackgroundDots dotColor={dotColor} />;
}

function Page() {
  const theme = canvasTheme;

  const [userKey, setUserKey] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [slimes, setSlimes] = useState<SlimeData[]>([]);

  const [activeThemeId, setActiveThemeId] = useState('default');
  const [unlockedThemeIds, setUnlockedThemeIds] = useState<string[]>(['default']);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const pendingThemeIdRef = useRef<string | null>(null);
  const notifAskedRef = useRef(false);
  const draggingIdsRef = useRef<Set<string>>(new Set());
  const velocitiesRef = useRef<Map<string, { vx: number; vy: number }>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTheme = BACKGROUND_THEMES.find(t => t.id === activeThemeId) ?? BACKGROUND_THEMES[0]!;
  const displayedTheme = BACKGROUND_THEMES.find(t => t.id === (previewThemeId ?? activeThemeId)) ?? BACKGROUND_THEMES[0]!;

  const dominantExpression = useMemo<Expression | null>(() => {
    if (slimes.length === 0) return null;
    const counts: Partial<Record<Expression, number>> = {};
    for (const s of slimes) counts[s.expression] = (counts[s.expression] ?? 0) + 1;
    return (Object.entries(counts) as [Expression, number][])
      .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }, [slimes]);

  useEffect(() => {
    let mounted = true;

    Storage.getItem('slimes').then(saved => {
      if (mounted && saved) {
        const loaded = JSON.parse(saved) as SlimeData[];
        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const alive = loaded.filter(s => {
          if (!s.createdAt) return true;
          const d = new Date(s.createdAt);
          const dayAge = Math.floor((todayMidnight - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
          return dayAge < 7;
        });
        setSlimes(alive.map(s => ({ ...s, ...clamp(s.x, s.y, s.size) })));
      }
    });
    Storage.getItem('unlockedThemes').then(saved => {
      if (mounted && saved) setUnlockedThemeIds(JSON.parse(saved));
    });
    Storage.getItem('activeThemeId').then(saved => {
      if (mounted && saved) setActiveThemeId(saved);
    });
    Storage.getItem('notifAsked').then(saved => {
      if (mounted && saved === 'true') notifAskedRef.current = true;
    });
    getAnonymousKey().then(result => {
      if (mounted && result && result !== 'INVALID_CATEGORY' && result !== 'ERROR') {
        setUserKey(result.hash);
      }
    });

    eventLog({ log_name: 'screen_view', log_type: 'screen', params: { screen: 'main' } });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!loadFullScreenAd.isSupported?.()) return;
    const cleanup = loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: () => setAdLoaded(true),
      onError: () => setAdLoaded(false),
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      Storage.setItem('slimes', JSON.stringify(slimes));
    }, 2000);
  }, [slimes]);

  // 자율 이동 + 군집 물리
  useEffect(() => {
    const physicsCanvasH = CANVAS_H;
    const MAX_SPEED = 1.4;
    const DAMPING = 0.95;
    const DRIFT = 0.03;
    const COHESION = 0.012;

    const intervalId = setInterval(() => {
      setSlimes(prev => {
        if (prev.length === 0) return prev;

        const vels = velocitiesRef.current;
        const dragging = draggingIdsRef.current;

        for (const s of prev) {
          if (!vels.has(s.id)) {
            vels.set(s.id, {
              vx: (Math.random() - 0.5) * 0.4,
              vy: (Math.random() - 0.5) * 0.4,
            });
          }
        }
        const activeIds = new Set(prev.map(s => s.id));
        for (const k of vels.keys()) {
          if (!activeIds.has(k)) vels.delete(k);
        }

        let changed = false;
        const next = prev.map(slime => {
          if (dragging.has(slime.id)) return slime;

          let { vx, vy } = vels.get(slime.id)!;

          // 무작위 표류
          vx += (Math.random() - 0.5) * DRIFT;
          vy += (Math.random() - 0.5) * DRIFT;

          // 같은 감정끼리 군집 (겹치지 않는 거리 밖에서만 끌어당김)
          const peers = prev.filter(s => s.id !== slime.id && s.expression === slime.expression);
          if (peers.length > 0) {
            const cx = peers.reduce((acc, p) => acc + p.x + p.size * 0.41, 0) / peers.length;
            const cy = peers.reduce((acc, p) => acc + p.y + p.size * 0.5, 0) / peers.length;
            const dx = cx - (slime.x + slime.size * 0.41);
            const dy = cy - (slime.y + slime.size * 0.5);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const avgMinDist = peers.reduce((acc, p) => acc + (slime.size + p.size) * 0.42, 0) / peers.length;
            if (dist > avgMinDist && dist < 320) {
              const force = Math.min((dist - avgMinDist) / 120, 1) * COHESION;
              vx += (dx / dist) * force;
              vy += (dy / dist) * force;
            }
          }

          // 충돌 바운스 (모든 슬라임)
          for (const other of prev) {
            if (other.id === slime.id) continue;
            const dx = (slime.x + slime.size * 0.41) - (other.x + other.size * 0.41);
            const dy = (slime.y + slime.size * 0.5) - (other.y + other.size * 0.5);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const touchDist = (slime.size + other.size) * 0.42;
            if (dist < touchDist && dist > 0.5) {
              const nx = dx / dist;
              const ny = dy / dist;
              const relVel = vx * nx + vy * ny;
              if (relVel < 0) {
                // 탄성 반사 + 다른 감정이면 횡방향 랜덤 흘림으로 블로킹 탈출
                vx -= 1.8 * relVel * nx;
                vy -= 1.8 * relVel * ny;
                if (other.expression !== slime.expression) {
                  const side = Math.random() > 0.5 ? 1 : -1;
                  vx += side * ny * 0.4;
                  vy += -side * nx * 0.4;
                }
              } else if (dist < touchDist * 0.4) {
                vx += nx * 0.4;
                vy += ny * 0.4;
              }
            }
          }

          vx *= DAMPING;
          vy *= DAMPING;

          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed > MAX_SPEED) {
            vx = (vx / speed) * MAX_SPEED;
            vy = (vy / speed) * MAX_SPEED;
          }

          let newX = slime.x + vx;
          let newY = slime.y + vy;

          const maxX = SCREEN_WIDTH - slime.size * 0.82 - 8;
          const maxY = physicsCanvasH - slime.size - 8;
          if (newX < 8) { vx = Math.abs(vx) * 0.5; newX = 8; }
          else if (newX > maxX) { vx = -Math.abs(vx) * 0.5; newX = maxX; }
          if (newY < 8) { vy = Math.abs(vy) * 0.5; newY = 8; }
          else if (newY > maxY) { vy = -Math.abs(vy) * 0.5; newY = maxY; }

          vels.set(slime.id, { vx, vy });

          if (Math.abs(newX - slime.x) > 0.05 || Math.abs(newY - slime.y) > 0.05) {
            changed = true;
            return { ...slime, x: newX, y: newY };
          }
          return slime;
        });

        return changed ? next : prev;
      });
    }, 50); // 20fps

    return () => clearInterval(intervalId);
  }, []);

  const reloadAd = useCallback(() => {
    if (!loadFullScreenAd.isSupported?.()) return;
    setAdLoaded(false);
    loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: () => setAdLoaded(true),
      onError: () => {},
    });
  }, []);

  // 잠긴 테마는 미리보기 먼저, 잠금 해제된 테마는 바로 적용
  const handleThemeSelect = useCallback((themeId: string) => {
    if (unlockedThemeIds.includes(themeId)) {
      setActiveThemeId(themeId);
      Storage.setItem('activeThemeId', themeId);
      setShowThemePicker(false);
      setPreviewThemeId(null);
      return;
    }
    setPreviewThemeId(themeId);
  }, [unlockedThemeIds]);

  // 미리보기 상태에서 광고 보고 잠금해제
  const handleUnlock = useCallback((themeId: string) => {
    if (!adLoaded || !showFullScreenAd.isSupported?.()) return;
    pendingThemeIdRef.current = themeId;
    showFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === 'userEarnedReward') {
          const id = pendingThemeIdRef.current;
          if (!id) return;
          setUnlockedThemeIds(prev => {
            const next = [...prev, id];
            Storage.setItem('unlockedThemes', JSON.stringify(next));
            return next;
          });
          setActiveThemeId(id);
          Storage.setItem('activeThemeId', id);
          setShowThemePicker(false);
          setPreviewThemeId(null);
          eventLog({ log_name: 'theme_unlocked', log_type: 'event', params: { theme_id: id } });
          reloadAd();
        }
      },
      onError: () => {},
    });
  }, [adLoaded, reloadAd]);

  const handleDelete = useCallback((id: string) => {
    setSlimes(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleMove = useCallback((id: string, newX: number, newY: number) => {
    setSlimes(prev => {
      const moved = prev.find(s => s.id === id);
      if (!moved) return prev;

      const movedCX = newX + moved.size * 0.41;
      const movedCY = newY + moved.size * 0.5;
      const target = prev.find(s => {
        if (s.id === id) return false;
        const cx = s.x + s.size * 0.41;
        const cy = s.y + s.size * 0.5;
        const dist = Math.sqrt(Math.pow(movedCX - cx, 2) + Math.pow(movedCY - cy, 2));
        return dist < (moved.size + s.size) * 0.28;
      });

      if (target) {
        const mergedSize = Math.min(moved.size + target.size * 0.55, 130);
        eventLog({ log_name: 'slime_merged', log_type: 'event', params: { size: String(Math.round(mergedSize)) } });
        const mergedPos = clamp((newX + target.x) / 2, (newY + target.y) / 2, mergedSize);
        return [
          ...prev.filter(s => s.id !== id && s.id !== target.id),
          {
            id: `merged-${Date.now()}`,
            color: target.size >= moved.size ? target.color : moved.color,
            expression: target.size >= moved.size ? target.expression : moved.expression,
            size: mergedSize,
            x: mergedPos.x,
            y: mergedPos.y,
            text: target.text || moved.text || '',
            createdAt: Date.now(),
          },
        ];
      }

      const clamped = clamp(newX, newY, moved.size);
      return prev.map(s => s.id === id ? { ...s, x: clamped.x, y: clamped.y } : s);
    });
  }, []);

  const handleSplit = useCallback((id: string, sx: number, sy: number, origSize: number) => {
    const newSize = Math.max(38, Math.floor(origSize * 0.55));
    const offset = newSize * 0.65;
    eventLog({ log_name: 'slime_split', log_type: 'event', params: { size: String(origSize) } });
    setSlimes(prev => {
      const original = prev.find(s => s.id === id);
      if (!original) return prev;
      const palette = EXPRESSION_COLORS[original.expression ?? 'blank'];
      const colorL = palette[Math.floor(Math.random() * palette.length)] ?? original.color;
      const rest = palette.filter(c => c !== colorL);
      const colorR = (rest.length > 0 ? rest : palette)[Math.floor(Math.random() * (rest.length || palette.length))] ?? colorL;
      return [
        ...prev.filter(s => s.id !== id),
        { ...original, id: `split-L-${Date.now()}`, color: colorL, size: newSize, ...clamp(sx - offset, sy, newSize), createdAt: Date.now() },
        { ...original, id: `split-R-${Date.now()}`, color: colorR, size: newSize, ...clamp(sx + offset, sy, newSize), createdAt: Date.now() },
      ];
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const size = Math.min(Math.max(48, 42 + trimmed.length * 1.1), 95);
    const expression = detectExpression(trimmed);
    const color = pickColor(expression);
    const x = Math.random() * (SCREEN_WIDTH - size - 32) + 16;
    const y = Math.random() * (CANVAS_H - size - 32) + 16;

    eventLog({ log_name: 'slime_created', log_type: 'event', params: { expression, text_length: String(trimmed.length) } });

    setSlimes(prev => {
      const isFirst = prev.length === 0;
      const next = [...prev, { id: `${userKey ?? 'anon'}-${Date.now()}`, color, size, x, y, text: trimmed, expression, createdAt: Date.now() }];

      if (isFirst && !notifAskedRef.current) {
        notifAskedRef.current = true;
        Storage.setItem('notifAsked', 'true');
        setTimeout(() => {
          const cleanup = requestNotificationAgreement({
            options: { templateCode: 'DAILY_EVENING_REMINDER' }, // TODO: 콘솔에서 발급받은 코드로 교체
            onEvent: ({ type }) => {
              eventLog({ log_name: 'notif_agreement', log_type: 'event', params: { result: type } });
              cleanup();
            },
            onError: () => { cleanup(); },
          });
        }, 1500);
      }

      return next;
    });
    setText('');
    Keyboard.dismiss();
  }, [text, userKey]);

  const previewingTheme = previewThemeId ? BACKGROUND_THEMES.find(t => t.id === previewThemeId) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: displayedTheme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: theme.borderColor, backgroundColor: theme.headerBg }]}>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>들어줄게</Text>
        <Text style={[styles.headerSub, { color: theme.headerSubText }]}>
          {slimes.length > 0 ? `슬라임 ${slimes.length}마리` : '털어놔요'}
        </Text>
        <View style={styles.themePickerBtn}>
          <TouchableOpacity
            onPress={() => {
              setShowThemePicker(v => !v);
              setPreviewThemeId(null);
            }}
            style={styles.themeDot}
            activeOpacity={0.7}
          >
            <View style={[styles.themeDotInner, { backgroundColor: activeTheme.bg }]} />
          </TouchableOpacity>
        </View>
      </View>

      {showThemePicker && (
        <View style={[styles.themePanel, { backgroundColor: theme.inputAreaBg, borderBottomColor: theme.borderColor }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themePanelScroll}
          >
            {BACKGROUND_THEMES.map(t => {
              const unlocked = unlockedThemeIds.includes(t.id);
              const isActiveTheme = t.id === activeThemeId;
              const isPreviewing = t.id === previewThemeId;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => handleThemeSelect(t.id)}
                  activeOpacity={0.75}
                  style={styles.themeCard}
                >
                  <View style={[
                    styles.themeCardPreview,
                    { backgroundColor: t.bg },
                    isActiveTheme && styles.themeCardActive,
                    isPreviewing && !isActiveTheme && styles.themeCardPreviewing,
                  ]}>
                    <MiniDots dotColor={t.dotColor} />
                    {!unlocked && (
                      <View style={styles.themeCardLockOverlay}>
                        <Text style={styles.themeCardLockIcon}>🔒</Text>
                      </View>
                    )}
                    {!unlocked && (
                      <View style={styles.themeCardAdBadge}>
                        <Text style={styles.themeCardAdText}>광고</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.themeCardName, { color: theme.headerSubText }]}>{t.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowThemePicker(false); setPreviewThemeId(null); }}>
        <View style={[styles.slimeArea, { backgroundColor: displayedTheme.bg }]}>
          <ThemeBackground themeId={displayedTheme.id} dotColor={displayedTheme.dotColor} />
          <EmotionAtmosphere expression={dominantExpression} />
          {slimes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🫧</Text>
              <Text style={[styles.emptyTitle, { color: theme.emptyTitle }]}>
                지금 기분이 어때요?
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.emptySubtitle }]}>
                못된 감정을 털어놓으면{'\n'}슬라임이 될 거예요
              </Text>
            </View>
          ) : (
            slimes.map(slime => (
              <Slime
                key={slime.id}
                {...slime}
                onDelete={() => handleDelete(slime.id)}
                onMove={(nx, ny) => handleMove(slime.id, nx, ny)}
                onSplit={(sx, sy, sz) => handleSplit(slime.id, sx, sy, sz)}
                onDragStart={() => draggingIdsRef.current.add(slime.id)}
                onDragEnd={() => draggingIdsRef.current.delete(slime.id)}
              />
            ))
          )}

          {previewingTheme && (
            <View style={styles.previewBanner} pointerEvents="box-none">
              <View style={styles.previewBannerInner}>
                <Text style={styles.previewBannerLabel}>
                  {previewingTheme.name} 미리보기
                </Text>
                <View style={styles.previewBannerBtns}>
                  <TouchableOpacity
                    onPress={() => setPreviewThemeId(null)}
                    style={styles.previewBannerClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.previewBannerCloseText}>닫기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleUnlock(previewThemeId!)}
                    style={[styles.previewBannerUnlock, !adLoaded && styles.previewBannerUnlockDisabled]}
                    disabled={!adLoaded}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.previewBannerUnlockText}>
                      {adLoaded ? '광고 보고 잠금해제' : '광고 준비 중...'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.inputArea,
          { borderTopColor: theme.borderColor, backgroundColor: theme.inputAreaBg },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              color: theme.inputText,
              borderColor: theme.borderColor,
            },
          ]}
          value={text}
          onChangeText={setText}
          placeholder="지금 어떤 기분이에요? 다 털어놔요"
          placeholderTextColor={theme.placeholderText}
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.button, !text.trim() && { backgroundColor: theme.buttonDisabledBg }]}
          onPress={handleSubmit}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, !text.trim() && { color: theme.placeholderText }]}>
            털어내기 🫠
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  themePickerBtn: {
    marginLeft: 'auto',
  },
  themeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0EDE6',
  },
  themeDotInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  themePanel: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  themePanelScroll: {
    paddingHorizontal: 16,
    gap: 12,
    flexDirection: 'row',
  },
  themeCard: {
    alignItems: 'center',
    gap: 6,
  },
  themeCardPreview: {
    width: 90,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  themeCardActive: {
    borderColor: '#7C3AED',
    borderWidth: 2.5,
  },
  themeCardPreviewing: {
    borderColor: '#A78BFA',
    borderWidth: 2,
  },
  themeCardLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCardLockIcon: {
    fontSize: 18,
  },
  themeCardAdBadge: {
    position: 'absolute',
    bottom: 4,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  themeCardAdText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  themeCardName: {
    fontSize: 11,
    fontWeight: '500',
  },
  slimeArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 40,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  previewBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  previewBannerInner: {
    backgroundColor: 'rgba(15,10,30,0.82)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  previewBannerLabel: {
    color: '#E2D9F3',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewBannerBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  previewBannerClose: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  previewBannerCloseText: {
    color: '#C4B5FD',
    fontSize: 14,
    fontWeight: '600',
  },
  previewBannerUnlock: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  previewBannerUnlockDisabled: {
    backgroundColor: 'rgba(124,58,237,0.4)',
  },
  previewBannerUnlockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  inputArea: {
    padding: 16,
    paddingBottom: 28,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    minHeight: 52,
    maxHeight: 110,
    borderWidth: 1.5,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
