import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
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
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingVertical: 32 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute left-6 top-4"
          >
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-4 px-2">
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-xs font-semibold text-muted-foreground">ACCESS</Text>
                <Text className="text-2xl font-bold text-foreground">Sign in</Text>
              </View>

              <View className="flex-row items-center space-x-2">
                <TouchableOpacity className="rounded-full px-3 py-1 border border-primary bg-primary/10">
                  <Text className="text-sm font-medium text-primary">Sign in</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')} className="rounded-full px-3 py-1 border border-border">
                  <Text className="text-sm text-muted-foreground">Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Form */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your credentials to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <View className="mb-4 rounded-lg bg-red-50 p-3">
                  <Text className="text-sm text-red-600">{error}</Text>
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

              <View className="mb-4">
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
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>

              <Button
                size="lg"
                variant="default"
                onPress={handleSignIn}
                isLoading={isLoading}
                className="w-full rounded-xl"
              >
                Sign in
              </Button>
            </CardContent>
          </Card>

          {/* Sign Up Link */}
          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-muted-foreground">Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text className="font-medium text-primary">Sign Up</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
