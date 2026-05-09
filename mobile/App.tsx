import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import './global.css';

const APP_BACKGROUND = '#f8fafc';

export default function App() {
 return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: APP_BACKGROUND }}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={APP_BACKGROUND}
          translucent={false}
          hidden={false}
        />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
