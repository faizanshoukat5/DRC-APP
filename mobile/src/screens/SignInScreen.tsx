import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
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
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute left-6 top-4"
          >
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>

          {/* Logo */}
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Ionicons name="eye" size={32} color="white" />
            </View>
            <Text className="text-2xl font-bold text-foreground">Welcome Back</Text>
            <Text className="mt-1 text-muted-foreground">Sign in to your account</Text>
          </View>

          {/* Form */}
          <Card>
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
                onPress={handleSignIn}
                isLoading={isLoading}
                className="w-full"
              >
                Sign In
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
