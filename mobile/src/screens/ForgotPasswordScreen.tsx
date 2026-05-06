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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { requestPasswordReset } = useAuthContext();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 90 : (RNStatusBar.currentHeight ?? 0) + 20;

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Could not send reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="absolute left-6 top-4"
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={24} color="#6b7280" />
            </TouchableOpacity>

            <View className="mb-4 px-2 mt-8">
              <Text className="text-xs font-semibold text-muted-foreground">RECOVERY</Text>
              <Text className="text-2xl font-bold text-foreground">Reset password</Text>
            </View>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Forgot your password?</CardTitle>
                <CardDescription>
                  Enter the email associated with your account and we'll send you a reset link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sent ? (
                  <View className="rounded-lg bg-green-50 p-4">
                    <View className="flex-row items-center">
                      <Ionicons name="mail-outline" size={20} color="#15803d" />
                      <Text className="ml-2 font-medium text-green-800">Check your inbox</Text>
                    </View>
                    <Text className="mt-2 text-sm text-green-700">
                      If an account exists for {email}, you'll receive a password reset link
                      shortly. Open the link on this device to set a new password.
                    </Text>
                    <Button
                      className="mt-4 w-full rounded-xl"
                      onPress={() => navigation.goBack()}
                    >
                      Back to sign in
                    </Button>
                  </View>
                ) : (
                  <>
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

                    <Button
                      size="lg"
                      onPress={handleSubmit}
                      isLoading={isSubmitting}
                      className="w-full rounded-xl"
                    >
                      Send reset link
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
