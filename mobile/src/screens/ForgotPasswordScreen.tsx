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
                Reset your password
              </Text>
              <Text className="text-sm text-muted-foreground mt-1 text-center">
                We'll email you a secure reset link
              </Text>
            </View>

            <Card className="rounded-2xl">
              <CardContent className="py-5">
                {sent ? (
                  <View>
                    <View className="items-center mb-2">
                      <View className="h-14 w-14 rounded-full bg-emerald-50 items-center justify-center mb-2">
                        <Ionicons name="mail" size={26} color="#10b981" />
                      </View>
                      <Text className="text-base font-semibold text-foreground">
                        Check your inbox
                      </Text>
                    </View>
                    <Text className="text-sm text-muted-foreground text-center mt-2 leading-relaxed">
                      If an account exists for{' '}
                      <Text className="font-medium text-foreground">{email}</Text>, you'll
                      receive a password reset link shortly. Open the link on this device to
                      set a new password.
                    </Text>
                    <Button
                      className="mt-5 w-full rounded-xl"
                      onPress={() => navigation.goBack()}
                    >
                      Back to sign in
                    </Button>
                  </View>
                ) : (
                  <>
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

            {!sent && (
              <View className="mt-6 flex-row items-center justify-center">
                <Text className="text-sm text-muted-foreground">Remembered it?{' '}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={6}>
                  <Text className="text-sm font-semibold text-primary">Sign in</Text>
                </TouchableOpacity>
              </View>
            )}
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
