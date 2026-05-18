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
  ScrollView,
} from 'react-native';
import { Slime, detectExpression } from '../components/Slime';
import { generateHapticFeedback } from '@apps-in-toss/native-modules';
import { ThemeBackground, MiniDots } from '../components/ThemeBackground';
import { EmotionAtmosphere } from '../components/EmotionAtmosphere';
import { OnboardingScreen } from '../components/OnboardingScreen';
import { EXPRESSION_COLORS, BACKGROUND_THEMES, AD_GROUP_ID } from '../constants/themes';
import { useSlimePhysics, SlimeData, CANVAS_H } from '../hooks/useSlimePhysics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function pickColor(expression: SlimeData['expression']): string {
  const palette = EXPRESSION_COLORS[expression];
  return palette[Math.floor(Math.random() * palette.length)] ?? palette[0];
}

function clamp(x: number, y: number, size: number) {
  return {
    x: Math.max(8, Math.min(x, SCREEN_WIDTH - size - 8)),
    y: Math.max(8, Math.min(y, CANVAS_H - size - 8)),
  };
}

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const [userKey, setUserKey] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [slimes, setSlimes] = useState<SlimeData[]>([]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState('default');
  const [unlockedThemeIds, setUnlockedThemeIds] = useState<string[]>(['default']);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const pendingThemeIdRef = useRef<string | null>(null);
  const notifAskedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { draggingIdsRef, triggerShake } = useSlimePhysics(setSlimes);


  const activeTheme = BACKGROUND_THEMES.find(t => t.id === activeThemeId) ?? BACKGROUND_THEMES[0]!;
  const displayedTheme = BACKGROUND_THEMES.find(t => t.id === (previewThemeId ?? activeThemeId)) ?? BACKGROUND_THEMES[0]!;
  const theme = displayedTheme.ui;

  const dominantExpression = useMemo<SlimeData['expression'] | null>(() => {
    if (slimes.length === 0) return null;
    const counts: Partial<Record<SlimeData['expression'], number>> = {};
    for (const s of slimes) counts[s.expression] = (counts[s.expression] ?? 0) + 1;
    return (Object.entries(counts) as [SlimeData['expression'], number][])
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
    Storage.getItem('onboardingDone').then(done => {
      if (mounted && done !== 'true') setShowOnboarding(true);
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

  const reloadAd = useCallback(() => {
    if (!loadFullScreenAd.isSupported?.()) return;
    setAdLoaded(false);
    loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: () => setAdLoaded(true),
      onError: () => {},
    });
  }, []);

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

  const handleUnlock = useCallback((themeId: string) => {
    if (!adLoaded || !showFullScreenAd.isSupported?.()) return;
    pendingThemeIdRef.current = themeId;
    showFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event: any) => {
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

  const handleOnboardingComplete = useCallback((firstSlime: SlimeData | null) => {
    if (firstSlime) setSlimes([firstSlime]);
    setShowOnboarding(false);
    Storage.setItem('onboardingDone', 'true');
  }, []);

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
            onEvent: ({ type }: any) => {
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
    <View style={styles.container}>
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: displayedTheme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: theme.borderColor, backgroundColor: theme.headerBg }]}>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>들어줄게</Text>
        <Text style={[styles.headerSub, { color: theme.headerSubText }]}>
          {slimes.length > 0 ? `슬라임 ${slimes.length}마리` : '털어놔요'}
        </Text>
        <TouchableOpacity
          onPress={() => { generateHapticFeedback({ type: 'error' }); triggerShake(); }}
          style={styles.shakeBtn}
          activeOpacity={0.7}
          disabled={slimes.length === 0}
        >
          <Text style={styles.shakeBtnText}>🫨</Text>
        </TouchableOpacity>
        <View style={styles.themePickerBtn}>
          <TouchableOpacity
            onPress={() => { setShowThemePicker(v => !v); setPreviewThemeId(null); }}
            style={[styles.themeDot, { backgroundColor: theme.inputBg }]}
            activeOpacity={0.7}
          >
            <View style={[styles.themeDotInner, { backgroundColor: activeTheme.bg }]} />
          </TouchableOpacity>
        </View>
      </View>

      {showThemePicker && (
        <View style={[styles.themePanel, { backgroundColor: theme.inputAreaBg, borderBottomColor: theme.borderColor }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themePanelScroll}>
            {BACKGROUND_THEMES.map(t => {
              const unlocked = unlockedThemeIds.includes(t.id);
              const isActiveTheme = t.id === activeThemeId;
              const isPreviewing = t.id === previewThemeId;
              return (
                <TouchableOpacity key={t.id} onPress={() => handleThemeSelect(t.id)} activeOpacity={0.75} style={styles.themeCard}>
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
              <Text style={[styles.emptyTitle, { color: theme.emptyTitle }]}>지금 기분이 어때요?</Text>
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
                <Text style={styles.previewBannerLabel}>{previewingTheme.name} 미리보기</Text>
                <View style={styles.previewBannerBtns}>
                  <TouchableOpacity onPress={() => setPreviewThemeId(null)} style={styles.previewBannerClose} activeOpacity={0.7}>
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

      <View style={[styles.inputArea, { borderTopColor: theme.borderColor, backgroundColor: theme.inputAreaBg }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.borderColor }]}
          value={text}
          onChangeText={setText}
          placeholder="지금 어떤 기분이에요? 다 털어놔요"
          placeholderTextColor={theme.placeholderText}
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: text.trim() ? theme.buttonBg : theme.buttonDisabledBg }]}
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
    {showOnboarding && (
      <OnboardingScreen onComplete={handleOnboardingComplete} />
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontWeight: '500', flex: 1 },
  shakeBtn: { padding: 4 },
  shakeBtnText: { fontSize: 22 },
  themePickerBtn: { marginLeft: 4 },
  themeDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: 'rgba(128,128,128,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  themeDotInner: { width: 18, height: 18, borderRadius: 9 },
  themePanel: { borderBottomWidth: 1, paddingVertical: 12 },
  themePanelScroll: { paddingHorizontal: 16, gap: 12, flexDirection: 'row' },
  themeCard: { alignItems: 'center', gap: 6 },
  themeCardPreview: {
    width: 90, height: 60, borderRadius: 12,
    overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  themeCardActive: { borderColor: '#7C3AED', borderWidth: 2.5 },
  themeCardPreviewing: { borderColor: '#A78BFA', borderWidth: 2 },
  themeCardLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  themeCardLockIcon: { fontSize: 18 },
  themeCardAdBadge: {
    position: 'absolute', bottom: 4, right: 5,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  themeCardAdText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  themeCardName: { fontSize: 11, fontWeight: '500' },
  slimeArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  previewBanner: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  previewBannerInner: {
    backgroundColor: 'rgba(15,10,30,0.82)',
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, gap: 10,
  },
  previewBannerLabel: { color: '#E2D9F3', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  previewBannerBtns: { flexDirection: 'row', gap: 8 },
  previewBannerClose: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center',
  },
  previewBannerCloseText: { color: '#C4B5FD', fontSize: 14, fontWeight: '600' },
  previewBannerUnlock: { flex: 2, paddingVertical: 10, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center' },
  previewBannerUnlockDisabled: { backgroundColor: 'rgba(124,58,237,0.4)' },
  previewBannerUnlockText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  inputArea: { padding: 16, paddingBottom: 28, gap: 10, borderTopWidth: 1 },
  input: { borderRadius: 16, padding: 14, fontSize: 15, minHeight: 52, maxHeight: 110, borderWidth: 1.5, lineHeight: 22 },
  button: { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
});
