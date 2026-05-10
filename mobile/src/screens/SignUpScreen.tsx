import React, { useState } from 'react';
import {
  View,
  Text,
  Platform,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { UserRole, SignUpPayload } from '../hooks/useAuth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

export default function SignUpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signUpWithPassword, isLoading, lastError } = useAuthContext();

  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (role === 'doctor' && !licenseNumber.trim()) {
      setLocalError('License number is required for doctors');
      return;
    }

    setLocalError(null);

    const payload: SignUpPayload = {
      email: email.trim(),
      password,
      name: name.trim(),
      role,
      phone: phone.trim() || undefined,
      licenseNumber: licenseNumber.trim() || undefined,
      specialty: specialty.trim() || undefined,
    };

    try {
      await signUpWithPassword(payload);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to sign up');
    }
  };

  const error = localError || lastError;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        extraScrollHeight={Platform.OS === 'ios' ? 24 : 120}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="self-start py-2 -ml-1 mt-2"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>

        {/* Brand */}
        <View className="items-center mt-4 mb-6">
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
            Create your account
          </Text>
          <Text className="text-sm text-muted-foreground mt-1 text-center">
            Join AEYE — AI-guided retinal screening
          </Text>
        </View>

        {/* Role segmented control */}
        <View className="mb-5">
          <Text className="mb-2 text-sm font-medium text-foreground">I'm signing up as a</Text>
          <View className="flex-row rounded-xl bg-muted/40 p-1">
            <RoleTab
              icon="person"
              label="Patient"
              active={role === 'patient'}
              onPress={() => setRole('patient')}
            />
            <RoleTab
              icon="medical"
              label="Doctor"
              active={role === 'doctor'}
              onPress={() => setRole('doctor')}
            />
          </View>
          {role === 'doctor' && (
            <View key="doctor-approval-note" className="mt-2 flex-row items-start rounded-lg bg-amber-50 p-3">
              <Ionicons name="time-outline" size={16} color="#b45309" style={{ marginTop: 1 }} />
              <Text className="ml-2 flex-1 text-xs text-amber-800">
                Doctor accounts require admin approval before you can upload scans.
              </Text>
            </View>
          )}
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
              key="full-name"
              label="Full name *"
              placeholder="Jane Doe"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              containerClassName="mb-3"
            />

            <Input
              key="email"
              label="Email *"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              containerClassName="mb-3"
            />

            <Input
              key="phone"
              label="Phone"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              containerClassName="mb-3"
            />

            {role === 'doctor' && (
              <React.Fragment key="doctor-fields">
                <Input
                  key="license-number"
                  label="License number *"
                  placeholder="MED-12345"
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  containerClassName="mb-3"
                />

                <Input
                  key="specialty"
                  label="Specialty"
                  placeholder="Ophthalmology"
                  value={specialty}
                  onChangeText={setSpecialty}
                  containerClassName="mb-3"
                />
              </React.Fragment>
            )}

            <View key="password" className="relative mb-3">
              <Input
                label="Password *"
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
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
              key="confirm-password"
              label="Confirm password *"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              containerClassName="mb-4"
            />

            <Button
              key="submit"
              size="lg"
              variant="default"
              onPress={handleSignUp}
              isLoading={isLoading}
              className="w-full rounded-xl"
            >
              {role === 'doctor' ? 'Submit for approval' : 'Create account'}
            </Button>
          </CardContent>
        </Card>

        {/* Sign-in link */}
        <View className="mt-6 mb-4 flex-row items-center justify-center">
          <Text className="text-sm text-muted-foreground">Already have an account?{' '}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')} hitSlop={6}>
            <Text className="text-sm font-semibold text-primary">Sign in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function RoleTab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center rounded-lg py-3"
      style={active ? styles.roleTabActive : styles.roleTabInactive}
    >
      <Ionicons name={icon} size={18} color={active ? '#0ea5e9' : '#64748b'} />
      <Text
        className="ml-2 text-sm font-medium"
        style={active ? styles.roleTabTextActive : styles.roleTabTextInactive}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
  roleTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  roleTabInactive: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  roleTabTextActive: {
    color: '#0ea5e9',
  },
  roleTabTextInactive: {
    color: '#64748b',
  },
});
