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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4 py-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mb-4"
          >
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-4 px-2">
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-xs font-semibold text-muted-foreground">ACCESS</Text>
                <Text className="text-2xl font-bold text-foreground">Create account</Text>
              </View>

              <View className="flex-row items-center space-x-2">
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')} className="rounded-full px-3 py-1 border border-border">
                  <Text className="text-sm text-muted-foreground">Sign in</Text>
                </TouchableOpacity>
                <TouchableOpacity className="rounded-full px-3 py-1 border border-primary bg-primary/10">
                  <Text className="text-sm font-medium text-primary">Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Role Selection */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-foreground">I am a...</Text>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setRole('patient')}
                className={`mr-2 flex-1 items-center rounded-lg border-2 p-4 ${
                  role === 'patient' ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                <Ionicons
                  name="person"
                  size={24}
                  color={role === 'patient' ? '#0ea5e9' : '#6b7280'}
                />
                <Text
                  className={`mt-1 font-medium ${
                    role === 'patient' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Patient
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRole('doctor')}
                className={`flex-1 items-center rounded-lg border-2 p-4 ${
                  role === 'doctor' ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                <Ionicons
                  name="medical"
                  size={24}
                  color={role === 'doctor' ? '#0ea5e9' : '#6b7280'}
                />
                <Text
                  className={`mt-1 font-medium ${
                    role === 'doctor' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Doctor
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <CardDescription>
                {role === 'doctor'
                  ? 'Doctor accounts require admin approval'
                  : 'Fill in your details to get started'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <View className="mb-4 rounded-lg bg-red-50 p-3">
                  <Text className="text-sm text-red-600">{error}</Text>
                </View>
              )}

              <Input
                label="Full Name *"
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                containerClassName="mb-3"
              />

              <Input
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
                label="Phone"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                containerClassName="mb-3"
              />

              {role === 'doctor' && (
                <>
                  <Input
                    label="License Number *"
                    placeholder="MED-12345"
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                    containerClassName="mb-3"
                  />

                  <Input
                    label="Specialty"
                    placeholder="Ophthalmology"
                    value={specialty}
                    onChangeText={setSpecialty}
                    containerClassName="mb-3"
                  />
                </>
              )}

              <View className="relative mb-3">
                <Input
                  label="Password *"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
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

              <Input
                label="Confirm Password *"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                containerClassName="mb-4"
              />

              <Button
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

          {/* Sign In Link */}
          <View className="mb-8 mt-6 flex-row items-center justify-center">
            <Text className="text-muted-foreground">Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text className="font-medium text-primary">Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
