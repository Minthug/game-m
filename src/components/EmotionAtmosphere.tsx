import React, { useRef, useState, useEffect } from 'react';
import { Animated, StyleSheet, Dimensions } from 'react-native';
import { Expression } from './Slime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export function EmotionAtmosphere({ expression }: { expression: Expression | null }) {
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
