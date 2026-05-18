import React, { useRef, useEffect, useMemo } from 'react';
import { Animated, View, Dimensions, StyleSheet } from 'react-native';

const BLOB_LAYERS = [1.0, 0.70, 0.44, 0.24];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- 배경 점 ---

export function BackgroundDots({ dotColor }: { dotColor: string }) {
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

// --- 테마 카드 미니 점 ---

const MINI_DOTS = [
  { size: 24, x: 10, y: 6,  opacity: 0.85 },
  { size: 16, x: 54, y: 10, opacity: 0.65 },
  { size: 20, x: 32, y: 30, opacity: 0.75 },
  { size: 13, x: 72, y: 4,  opacity: 0.55 },
  { size: 18, x: 62, y: 34, opacity: 0.60 },
];

export function MiniDots({ dotColor }: { dotColor: string }) {
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

// --- 파티클 데이터 ---

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

// --- 파티클 컴포넌트 ---

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
      style={{ position: 'absolute', left: x, top: y, width: size, height: size, opacity }}
    >
      {BLOB_LAYERS.map((scale, i) => {
        const s = size * scale;
        const off = (size - s) / 2;
        return (
          <View key={i} style={{
            position: 'absolute', left: off, top: off,
            width: s, height: s, borderRadius: s / 2,
            backgroundColor: color,
          }} />
        );
      })}
    </Animated.View>
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
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#8899EE', opacity: flashOpacity }}
    />
  );
}

// --- 테마 배경 진입점 ---

export function ThemeBackground({ themeId, dotColor }: { themeId: string; dotColor: string }) {
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
