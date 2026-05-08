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
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

export default function ResetPasswordScreen() {
  const { updatePassword, signOut } = useAuthContext();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 90 : (RNStatusBar.currentHeight ?? 0) + 20;

  const handleSubmit = async () => {
    setError(null);
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSaving(true);
    try {
      await updatePassword(newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Could not update password.');
    } finally {
      setIsSaving(false);
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
            {/* Brand */}
            <View className="items-center mt-12 mb-8">
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
                {success ? 'Password updated' : 'Set a new password'}
              </Text>
              <Text className="text-sm text-muted-foreground mt-1 text-center">
                {success
                  ? 'You can now sign in with your new password.'
                  : 'Choose a strong password to secure your RetinaPilot account.'}
              </Text>
            </View>

            <Card className="rounded-2xl">
              <CardContent className="py-5">
                {success ? (
                  <View className="items-center">
                    <View className="h-14 w-14 rounded-full bg-emerald-50 items-center justify-center mb-3">
                      <Ionicons name="checkmark" size={28} color="#10b981" />
                    </View>
                    <Text className="text-sm text-muted-foreground text-center mb-5">
                      Your password was changed successfully. For security, please sign in
                      again with the new password.
                    </Text>
                    <Button className="w-full rounded-xl" onPress={signOut}>
                      Continue to sign in
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

                    <View className="relative mb-3">
                      <Input
                        label="New password"
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        autoComplete="new-password"
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

                    <Input
                      label="Confirm new password"
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      containerClassName="mb-4"
                    />

                    <Button
                      size="lg"
                      onPress={handleSubmit}
                      isLoading={isSaving}
                      className="w-full rounded-xl"
                    >
                      Update password
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {!success && (
              <TouchableOpacity onPress={signOut} className="mt-6 self-center py-3" hitSlop={8}>
                <Text className="text-sm font-medium text-muted-foreground">
                  Cancel and sign in instead
                </Text>
              </TouchableOpacity>
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
