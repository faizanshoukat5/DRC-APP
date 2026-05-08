import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

type HeaderTransition = 'slide' | 'fade' | 'scale';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  roleTag?: string;
  transition?: HeaderTransition;
  delay?: number;
}

export default function AppHeader({
  title = 'RetinaPilot',
  subtitle = 'AI-guided retinal screening',
  roleTag,
  transition = 'slide',
  delay = 0,
}: AppHeaderProps) {
  const isFocused = useIsFocused();
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(transition === 'slide' ? 14 : 0)).current;
  const cardScale = useRef(new Animated.Value(transition === 'scale' ? 0.95 : 1)).current;

  useEffect(() => {
    if (!isFocused) return;

    cardOpacity.setValue(0);
    cardTranslateY.setValue(transition === 'slide' ? 14 : 0);
    cardScale.setValue(transition === 'scale' ? 0.95 : 1);

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 260,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        damping: 15,
        stiffness: 160,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        damping: 14,
        stiffness: 165,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardScale, cardTranslateY, delay, isFocused, transition]);

  return (
    <View className="px-4 pt-3 pb-2 bg-background">
      <Animated.View
        className="rounded-2xl border border-[#e2e8f0] bg-white px-3 py-3 flex-row items-center"
        style={{
          opacity: cardOpacity,
          transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        <View className="ml-3 flex-1">
          <Text className="text-lg font-bold text-slate-900">{title}</Text>
          <Text className="text-xs text-slate-500 mt-0.5">{subtitle}</Text>
        </View>
        {roleTag ? (
          <View style={styles.tagWrap}>
            <Text style={styles.tagText}>{roleTag}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  tagWrap: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f1f5f9',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#334155',
  },
});
