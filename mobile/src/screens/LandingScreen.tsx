import React, { useState, FormEvent } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../hooks/useAuth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

export default function LandingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signInWithPassword, signUpWithPassword, isLoading, lastError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    licenseNumber: '',
    specialty: '',
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFeedback(null);

    try {
      if (mode === 'signin') {
        await signInWithPassword(formState.email, formState.password);
      } else {
        await signUpWithPassword({
          email: formState.email,
          password: formState.password,
          role,
          name: formState.name,
          phone: formState.phone || undefined,
          dateOfBirth: formState.dateOfBirth || undefined,
          gender: formState.gender || undefined,
          address: formState.address || undefined,
          licenseNumber: role === 'doctor' ? formState.licenseNumber : undefined,
          specialty: role === 'doctor' ? formState.specialty : undefined,
        });
        setFeedback(
          role === 'doctor'
            ? 'Doctor account created. Await admin approval.'
            : 'Account created. You are signed in.'
        );
      }
    } catch (error) {
      console.error('Authentication error', error);
    }
  };

  const isSubmitDisabled =
    !formState.email ||
    !formState.password ||
    (mode === 'signup' &&
      (!formState.name ||
        (role === 'doctor' && (!formState.licenseNumber || !formState.specialty))));

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5 py-6">
        {/* Hero */}
        <Card className="rounded-3xl bg-white border-slate-200 shadow-sm p-6 mb-6">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
              <Ionicons name="scan" size={24} color="#0ea5e9" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-500">RetinaAI</Text>
              <Text className="text-2xl font-bold text-slate-900">
                Diabetic Retinopathy, detected in seconds.
              </Text>
            </View>
          </View>
          <Text className="text-sm text-slate-600 leading-relaxed mb-4">
            Upload fundus images captured in-clinic or on your fundus camera; our ML model
            returns DR severity, confidence, and explainable heatmaps—every report stays synced
            for patients and doctors.
          </Text>
          <View className="flex-row gap-3">
            {[
              { label: 'Outputs', value: 'DR grade + heatmaps' },
              { label: 'Turnaround', value: '< 45 sec' },
              { label: 'Input', value: 'Fundus uploads' },
            ].map((item) => (
              <View
                key={item.label}
                className="flex-1 rounded-2xl bg-slate-100 border-slate-200 px-3 py-2"
              >
                <Text className="text-[11px] uppercase tracking-wide text-slate-500">
                  {item.label}
                </Text>
                <Text className="font-semibold text-slate-900 text-xs">{item.value}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Features */}
        <View className="gap-3 mb-6">
          {[
            {
              icon: 'flash',
              title: 'Upload → AI',
              desc:
                'You upload fundus images; our ML model returns DR severity, confidence, and heatmaps.',
              bg: 'bg-amber-50',
              border: 'border-amber-100',
              text: 'text-amber-700',
            },
            {
              icon: 'shield-checkmark',
              title: 'Clinician-first',
              desc:
                'Explainable outputs doctors can trust, with clear severity and confidence.',
              bg: 'bg-emerald-50',
              border: 'border-emerald-100',
              text: 'text-emerald-700',
            },
            {
              icon: 'server',
              title: 'Always synced',
              desc:
                'Secure storage for images and reports, accessible by patients and assigned doctors.',
              bg: 'bg-sky-50',
              border: 'border-sky-100',
              text: 'text-sky-700',
            },
          ].map((item) => (
            <Card
              key={item.title}
              className={`p-4 flex-row items-start gap-3 border shadow-sm ${item.bg} ${item.border}`}
            >
              <View className="w-10 h-10 rounded-xl bg-white/70 items-center justify-center border">
                <Ionicons name={item.icon as any} size={20} color="#0ea5e9" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-slate-900">{item.title}</Text>
                <Text className="text-sm text-slate-700 leading-snug">{item.desc}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Flows */}
        <View className="gap-3 mb-6">
          <Card className="p-4 border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
                <Ionicons name="person" size={16} color="#0ea5e9" />
              </View>
              <View>
                <Text className="text-xs uppercase tracking-wide text-slate-500">
                  For patients
                </Text>
                <Text className="font-semibold text-slate-900">Simple, guided flow</Text>
              </View>
            </View>
            <Text className="text-sm text-slate-700 leading-relaxed">
              1. Create an account and pick your approved doctor.{'\n'}
              2. Upload or view fundus reports shared by your doctor.{'\n'}
              3. Track severity, AI confidence, and download PDFs anytime.
            </Text>
          </Card>

          <Card className="p-4 border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center">
                <Ionicons name="medical" size={16} color="#1e40af" />
              </View>
              <View>
                <Text className="text-xs uppercase tracking-wide text-slate-500">
                  For doctors
                </Text>
                <Text className="font-semibold text-slate-900">Built for clinics</Text>
              </View>
            </View>
            <Text className="text-sm text-slate-700 leading-relaxed">
              1. Get approved, then see only your assigned patients.{'\n'}
              2. Upload fundus images; the model returns DR severity/confidence with heatmaps,
              then auto-generate reports.{'\n'}
              3. Share results instantly; patients get notified and can download.
            </Text>
          </Card>
        </View>

        {/* Auth Form */}
        <Card className="rounded-3xl bg-white border-slate-200 shadow-lg p-5 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-xs uppercase tracking-wide text-slate-500">Access</Text>
              <Text className="text-xl font-semibold text-slate-900">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            </View>
            <View className="flex-row rounded-full bg-slate-100 p-1">
              {['signin', 'signup'].map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m as 'signin' | 'signup')}
                  className={`px-3 py-1 rounded-full ${
                    mode === m ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      mode === m ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {m === 'signin' ? 'Sign in' : 'Sign up'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <View>
              <Text className="text-sm font-medium text-slate-700 mb-2">Email address</Text>
              <Input
                placeholder="you@example.com"
                value={formState.email}
                onChangeText={(text) => setFormState((prev) => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {mode === 'signup' && (
              <>
                <View>
                  <Text className="text-sm font-medium text-slate-700 mb-2">Full name</Text>
                  <Input
                    placeholder="Dr. Ada Lovelace"
                    value={formState.name}
                    onChangeText={(text) => setFormState((prev) => ({ ...prev, name: text }))}
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-slate-700 mb-2">Role</Text>
                  <View className="flex-row gap-2">
                    {[
                      { value: 'patient', label: 'Patient', icon: 'person' },
                      { value: 'doctor', label: 'Doctor', icon: 'medical' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setRole(option.value as 'patient' | 'doctor')}
                        className={`flex-1 flex-row items-center gap-2 rounded-lg border p-3 ${
                          role === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200'
                        }`}
                      >
                        <Ionicons name={option.icon as any} size={16} color="#0ea5e9" />
                        <Text className="text-sm font-medium">{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-medium text-slate-700 mb-2">Phone</Text>
                  <Input
                    placeholder="+1 555 123 4567"
                    value={formState.phone}
                    onChangeText={(text) => setFormState((prev) => ({ ...prev, phone: text }))}
                    keyboardType="phone-pad"
                  />
                </View>

                {role === 'patient' && (
                  <>
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-slate-700 mb-2">
                          Date of birth
                        </Text>
                        <Input
                          placeholder="YYYY-MM-DD"
                          value={formState.dateOfBirth}
                          onChangeText={(text) =>
                            setFormState((prev) => ({ ...prev, dateOfBirth: text }))
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-slate-700 mb-2">Gender</Text>
                        <Input
                          placeholder="F / M / Other"
                          value={formState.gender}
                          onChangeText={(text) =>
                            setFormState((prev) => ({ ...prev, gender: text }))
                          }
                        />
                      </View>
                    </View>
                    <View>
                      <Text className="text-sm font-medium text-slate-700 mb-2">Address</Text>
                      <Input
                        placeholder="123 Retina Lane"
                        value={formState.address}
                        onChangeText={(text) =>
                          setFormState((prev) => ({ ...prev, address: text }))
                        }
                      />
                    </View>
                  </>
                )}

                {role === 'doctor' && (
                  <>
                    <View>
                      <Text className="text-sm font-medium text-slate-700 mb-2">
                        License number
                      </Text>
                      <Input
                        placeholder="MED-12345"
                        value={formState.licenseNumber}
                        onChangeText={(text) =>
                          setFormState((prev) => ({ ...prev, licenseNumber: text }))
                        }
                      />
                    </View>
                    <View>
                      <Text className="text-sm font-medium text-slate-700 mb-2">Specialty</Text>
                      <Input
                        placeholder="Ophthalmology"
                        value={formState.specialty}
                        onChangeText={(text) =>
                          setFormState((prev) => ({ ...prev, specialty: text }))
                        }
                      />
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="business" size={16} color="#64748b" />
                      <Text className="text-xs text-slate-500 flex-1">
                        Doctor accounts require admin approval before accessing diagnostics.
                      </Text>
                    </View>
                  </>
                )}
              </>
            )}

            <View>
              <Text className="text-sm font-medium text-slate-700 mb-2">Password</Text>
              <Input
                placeholder="••••••••"
                value={formState.password}
                onChangeText={(text) => setFormState((prev) => ({ ...prev, password: text }))}
                secureTextEntry
              />
            </View>

            {(lastError || feedback) && (
              <Text
                className={`text-sm text-center ${
                  lastError ? 'text-red-500' : 'text-emerald-600'
                }`}
              >
                {lastError || feedback}
              </Text>
            )}

            <Button
              onPress={handleSubmit}
              disabled={isLoading || isSubmitDisabled}
              className="w-full"
            >
              <Text className="text-base font-medium text-white">
                {isLoading ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            </Button>
          </View>
        </Card>

        {/* Toggle Auth Mode */}
        <View className="items-center mb-6">
          <Text className="text-sm text-slate-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already registered? '}
            <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              <Text className="text-primary underline">
                {mode === 'signin' ? 'Create one' : 'Sign in instead'}
              </Text>
            </TouchableOpacity>
          </Text>
        </View>

        {/* FAQ Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('FAQ')}
          className="flex-row items-center justify-center gap-2 mb-6"
        >
          <Ionicons name="help-circle" size={16} color="#64748b" />
          <Text className="text-sm text-slate-500">Have questions? Check our FAQ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
