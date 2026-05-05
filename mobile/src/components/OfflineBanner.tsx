import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View className="flex-row items-center justify-center bg-red-600 px-3 py-2">
      <Ionicons name="cloud-offline" size={14} color="#fff" />
      <Text className="ml-2 text-xs font-medium text-white">
        No internet connection — uploads and analysis are paused
      </Text>
    </View>
  );
}
