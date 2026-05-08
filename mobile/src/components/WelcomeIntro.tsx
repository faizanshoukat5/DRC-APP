import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onDismiss: () => void;
};

/**
 * Animated welcome screen that replaces the eye-opening.mp4 video.
 *
 * Storyboard:
 *   0.0s  fade-in dark gradient background
 *   0.1s  logo bubble springs in (scale 0 → 1)
 *   0.2s  two concentric scan rings start a slow continuous pulse
 *   0.7s  "RetinaPilot" wordmark slides up + fades in
 *   1.1s  tagline fades in
 *   1.7s  CTA pill fades in
 *
 * The user can tap Skip or the CTA to dismiss at any time.
 */
export default function WelcomeIntro({ onDismiss }: Props) {
  // Animated values (refs so they survive re-renders)
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(18)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    // Background fade-in
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 12,
        stiffness: 140,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous scan rings (staggered loops)
    const startRing = (val: Animated.Value, delay: number) => {
      val.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };
    startRing(ringA, 200);
    startRing(ringB, 1400);

    // Title slide-up
    Animated.sequence([
      Animated.delay(650),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Subtitle
    Animated.sequence([
      Animated.delay(1050),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // CTA pill
    Animated.sequence([
      Animated.delay(1650),
      Animated.parallel([
        Animated.timing(ctaOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(ctaY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const ringStyle = (val: Animated.Value) => ({
    transform: [
      {
        scale: val.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 3.6],
        }),
      },
    ],
    opacity: val.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [0, 0.55, 0],
    }),
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: bgOpacity }]}>
      {/* Subtle radial glow behind the logo (a single big translucent circle) */}
      <View style={styles.glow} pointerEvents="none" />

      {/* Skip in the corner */}
      <TouchableOpacity onPress={onDismiss} style={styles.skipButton} hitSlop={12}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.center}>
        {/* Pulsing scan rings */}
        <Animated.View style={[styles.ring, ringStyle(ringA)]} />
        <Animated.View style={[styles.ring, ringStyle(ringB)]} />

        {/* Logo bubble */}
        <Animated.View
          style={[
            styles.logoBubble,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
          />
        </Animated.View>

        {/* Wordmark */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleY }],
            alignItems: 'center',
            marginTop: 28,
          }}
        >
          <Text style={styles.wordmark}>RetinaPilot</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={{
            opacity: subtitleOpacity,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={styles.tagline}>AI-guided retinal screening</Text>
        </Animated.View>
      </View>

      {/* CTA pill near the bottom */}
      <Animated.View
        style={[
          styles.ctaWrap,
          {
            opacity: ctaOpacity,
            transform: [{ translateY: ctaY }],
          },
        ]}
      >
        <TouchableOpacity onPress={onDismiss} style={styles.cta} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Get started</Text>
          <Ionicons name="arrow-forward" size={18} color="#0f172a" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          For screening only — not a substitute for clinical diagnosis.
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0b1220',
    zIndex: 10,
  },
  glow: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: '#0ea5e9',
    opacity: 0.08,
    top: '20%',
    alignSelf: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : (RNStatusBar.currentHeight ?? 0) + 20,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    zIndex: 5,
  },
  skipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  logoBubble: {
    width: 120,
    height: 120,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.32)',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },
  wordmark: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    color: '#94a3b8',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  ctaWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 56 : 44,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: 14,
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
  },
});
