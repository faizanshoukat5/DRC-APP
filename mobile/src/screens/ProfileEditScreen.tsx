import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfileEdit'>;

export default function ProfileEditScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, updateProfile, isLoading } = useAuthContext();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [specialty, setSpecialty] = useState(user?.specialty ?? '');
  const [licenseNumber, setLicenseNumber] = useState(user?.licenseNumber ?? '');
  const [address, setAddress] = useState(user?.address ?? '');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your full name.');
      return;
    }

    try {
      await updateProfile({
        name,
        phone,
        address,
        ...(user?.role === 'doctor'
          ? {
              specialty,
              licenseNumber,
            }
          : {}),
      });
      Alert.alert('Profile updated', 'Your profile details have been saved.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Update failed', error.message || 'Could not update your profile.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="flex-row items-center px-4 pt-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4" hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Edit Profile</Text>
            <Text className="text-sm text-muted-foreground">Update account details</Text>
          </View>
        </View>

        <View className="mt-6 px-4">
          <Card>
            <CardContent>
              <Input
                label="Full name"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                containerClassName="mb-4"
              />
              <Input
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                containerClassName="mb-4"
              />
              <Input
                label="Address"
                value={address}
                onChangeText={setAddress}
                autoComplete="street-address"
                containerClassName="mb-4"
              />

              {user?.role === 'doctor' && (
                <>
                  <Input
                    label="License number"
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                    containerClassName="mb-4"
                  />
                  <Input
                    label="Specialty"
                    value={specialty}
                    onChangeText={setSpecialty}
                    containerClassName="mb-4"
                  />
                </>
              )}

              <Button onPress={handleSave} isLoading={isLoading} className="w-full">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
