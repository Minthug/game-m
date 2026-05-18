import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Animated, View, Text, TouchableOpacity, TextInput,
  StyleSheet, Dimensions, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { detectExpression } from './Slime';
import { EXPRESSION_COLORS } from '../constants/themes';
import { SlimeData, CANVAS_H } from '../hooks/useSlimePhysics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const QUESTIONS = [
  {
    text: '지금 마음이\n어때요?',
    choices: [
      { label: '우울해요',       bg: '#060E20' },
      { label: '기뻐요',         bg: '#1C0A00' },
      { label: '아무렇지않아요', bg: '#111116' },
    ],
  },
  {
    text: '요즘 자주\n드는 감정은요?',
    choices: [
      { label: '불안해요',    bg: '#0C0618' },
      { label: '설레요',      bg: '#1A0E00' },
      { label: '지쳐있어요', bg: '#0C0C12' },
    ],
  },
  {
    text: '요즘 가장\n힘든 건 뭐예요?',
    choices: [
      { label: '사람 때문에요', bg: '#180606' },
      { label: '나 자신이요',   bg: '#080816' },
      { label: '그냥 모든 게요', bg: '#101012' },
    ],
  },
];

const BLOB_LAYERS = [1.0, 0.70, 0.44, 0.24];

const SMOKE_BLOBS = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  x: SCREEN_WIDTH * (0.06 + i * 0.11),
  size: 90 + (i % 4) * 38,
  duration: 13000 + i * 1400,
  delay: i * 900,
}));

function SmokeBlob({ x, size, duration, delay }: {
  x: number; size: number; duration: number; delay: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      progress.setValue(0);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.22, duration: duration * 0.2, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.14, duration: duration * 0.6, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,    duration: duration * 0.2, useNativeDriver: true }),
        ]),
      ]).start(({ finished }) => { if (finished && !cancelled) run(); });
    };
    const t = setTimeout(run, delay);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(SCREEN_HEIGHT + size + 60)],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: SCREEN_HEIGHT + size / 2,
        width: size,
        height: size,
        opacity,
        transform: [{ translateY }],
      }}
    >
      {BLOB_LAYERS.map((scale, i) => {
        const s = size * scale;
        const off = (size - s) / 2;
        return (
          <View key={i} style={{
            position: 'absolute', left: off, top: off,
            width: s, height: s, borderRadius: s / 2,
            backgroundColor: 'rgba(210,210,228,1)',
          }} />
        );
      })}
    </Animated.View>
  );
}

interface Props {
  onComplete: (firstSlime: SlimeData | null) => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep]           = useState(0);
  const [bgColor, setBgColor]     = useState('#161618');
  const [prevBg, setPrevBg]       = useState('#161618');
  const [inputText, setInputText] = useState('');

  const bgFade      = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentFade, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, []);

  const transitionBg = useCallback((newBg: string, from: string) => {
    setPrevBg(from);
    setBgColor(newBg);
    bgFade.setValue(1);
    Animated.timing(bgFade, { toValue: 0, duration: 1500, useNativeDriver: true }).start();
  }, [bgFade]);

  const handleChoice = useCallback((choiceBg: string) => {
    transitionBg(choiceBg, bgColor);
    Animated.timing(contentFade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
      setStep(s => s + 1);
      Animated.timing(contentFade, { toValue: 1, duration: 520, useNativeDriver: true }).start();
    });
  }, [bgColor, transitionBg, contentFade]);

  const handleSubmit = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) { onComplete(null); return; }

    const expression = detectExpression(trimmed);
    const palette = EXPRESSION_COLORS[expression];
    const color = palette[Math.floor(Math.random() * palette.length)] ?? palette[0] ?? '#7C3AED';
    const size = Math.min(Math.max(48, 42 + trimmed.length * 1.1), 95);

    Keyboard.dismiss();
    onComplete({
      id: `onboarding-${Date.now()}`,
      color,
      size,
      x: SCREEN_WIDTH * 0.5 - size / 2,
      y: CANVAS_H * 0.45 - size / 2,
      text: trimmed,
      expression,
      createdAt: Date.now(),
    });
  }, [inputText, onComplete]);

  const q = step < 3 ? QUESTIONS[step] : null;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: prevBg, opacity: bgFade }]}
      />

      {SMOKE_BLOBS.map(b => <SmokeBlob key={b.id} {...b} />)}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.content, { opacity: contentFade }]}>

          {q !== null && (
            <>
              <Text style={styles.stepLabel}>{step + 1} / 3</Text>
              <Text style={styles.question}>{q.text}</Text>
              <View style={styles.choices}>
                {q.choices.map((c, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.choiceBtn}
                    onPress={() => handleChoice(c.bg)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.choiceBtnText}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.finalSub}>당신의 마음의 방이 거의 다 됐어요</Text>
              <Text style={styles.question}>지금 꼭 내뱉고{'\n'}싶은 말이 있다면요?</Text>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="여기에 털어놔요"
                placeholderTextColor="rgba(200,200,220,0.28)"
                multiline
                maxLength={200}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.submitBtn, !inputText.trim() && styles.submitBtnDim]}
                onPress={handleSubmit}
                activeOpacity={0.8}
                disabled={!inputText.trim()}
              >
                <Text style={styles.submitBtnText}>들어줄게요</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onComplete(null)} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>건너뛸게요</Text>
              </TouchableOpacity>
            </>
          )}

        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
    gap: 24,
  },
  stepLabel: {
    color: 'rgba(180,180,210,0.40)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  question: {
    color: 'rgba(232,228,255,0.92)',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 46,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  choices: { gap: 12, marginTop: 8 },
  choiceBtn: {
    borderWidth: 1,
    borderColor: 'rgba(200,200,235,0.16)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  choiceBtnText: {
    color: 'rgba(222,218,255,0.88)',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  finalSub: {
    color: 'rgba(180,175,220,0.50)',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(200,200,235,0.16)',
    borderRadius: 16,
    padding: 16,
    color: 'rgba(232,228,255,0.92)',
    fontSize: 16,
    minHeight: 100,
    maxHeight: 160,
    backgroundColor: 'rgba(255,255,255,0.05)',
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: 'rgba(155,135,255,0.80)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDim: {
    backgroundColor: 'rgba(100,100,145,0.30)',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipBtnText: { color: 'rgba(160,155,205,0.40)', fontSize: 14 },
});
