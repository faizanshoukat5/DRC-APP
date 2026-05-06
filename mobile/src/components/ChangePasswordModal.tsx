import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../contexts/AuthContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const { updatePassword } = useAuthContext();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
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
      setError(err.message || 'Could not update password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 items-center justify-center bg-black/50 px-4"
      >
        <View className="w-full max-w-md rounded-2xl bg-background p-5">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Change password</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8} disabled={isSaving}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {success ? (
            <View>
              <View className="flex-row items-center rounded-lg bg-green-50 p-3">
                <Ionicons name="checkmark-circle" size={20} color="#15803d" />
                <Text className="ml-2 flex-1 text-sm text-green-800">
                  Password updated. Use your new password next time you sign in.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                className="mt-4 rounded-lg bg-primary px-4 py-3"
              >
                <Text className="text-center font-medium text-white">Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {error && (
                <View className="mb-3 rounded-lg bg-red-50 p-3">
                  <Text className="text-sm text-red-600">{error}</Text>
                </View>
              )}

              <Text className="mb-1 text-sm font-medium text-foreground">New password</Text>
              <View className="mb-3 flex-row items-center rounded-lg border border-input bg-background px-3">
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isSaving}
                  className="flex-1 py-2 text-foreground"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>

              <Text className="mb-1 text-sm font-medium text-foreground">Confirm new password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isSaving}
                className="mb-4 rounded-lg border border-input bg-background px-3 py-2 text-foreground"
              />

              <View className="flex-row justify-end">
                <TouchableOpacity
                  onPress={handleClose}
                  disabled={isSaving}
                  className="mr-3 rounded-lg px-4 py-2"
                >
                  <Text className="text-sm font-medium text-muted-foreground">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaving}
                  className="rounded-lg bg-primary px-4 py-2"
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-sm font-medium text-white">Update password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
