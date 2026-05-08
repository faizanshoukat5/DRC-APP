import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar as RNStatusBar,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

export default function SignInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signInWithPassword, isLoading, lastError } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 90 : (RNStatusBar.currentHeight ?? 0) + 20;

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password');
      return;
    }

    setLocalError(null);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to sign in');
    }
  };

  const error = localError || lastError;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="self-start py-2 -ml-1"
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={24} color="#475569" />
            </TouchableOpacity>

            {/* Brand */}
            <View className="items-center mt-6 mb-8">
              <View
                style={styles.logoBubble}
                className="bg-primary/10 items-center justify-center mb-3"
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logoImage}
                />
              </View>
              <Text className="text-2xl font-bold text-foreground tracking-tight">
                Welcome back
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">
                Sign in to continue to RetinaPilot
              </Text>
            </View>

            {/* Form */}
            <Card className="rounded-2xl">
              <CardContent className="py-5">
                {error && (
                  <View className="mb-4 flex-row items-start rounded-lg bg-red-50 p-3">
                    <Ionicons name="alert-circle" size={18} color="#dc2626" />
                    <Text className="ml-2 flex-1 text-sm text-red-700">{error}</Text>
                  </View>
                )}

                <Input
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  containerClassName="mb-4"
                />

                <View className="mb-2">
                  <Input
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9"
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  className="self-end py-2"
                  hitSlop={8}
                >
                  <Text className="text-sm font-medium text-primary">Forgot password?</Text>
                </TouchableOpacity>

                <Button
                  size="lg"
                  variant="default"
                  onPress={handleSignIn}
                  isLoading={isLoading}
                  className="mt-2 w-full rounded-xl"
                >
                  Sign in
                </Button>
              </CardContent>
            </Card>

            {/* Sign-up link */}
            <View className="mt-6 flex-row items-center justify-center">
              <Text className="text-sm text-muted-foreground">
                New to RetinaPilot?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')} hitSlop={6}>
                <Text className="text-sm font-semibold text-primary">Create account</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logoBubble: {
    width: 72,
    height: 72,
    borderRadius: 22,
  },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
});
