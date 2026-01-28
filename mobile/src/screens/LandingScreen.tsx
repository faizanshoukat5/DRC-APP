import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StatusBar as RNStatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { useAuthContext } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/ui/Input';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

export default function LandingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const { lastError, signInWithPassword, isLoading } = useAuthContext();
  const [localError, setLocalError] = useState<string | null>(null);
  // Device-aware keyboard offset: iOS needs a larger offset for the header + notch,
  // Android can use the StatusBar height plus a small buffer.
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 90 : (RNStatusBar.currentHeight ?? 0) + 20;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={keyboardVerticalOffset}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView contentContainerClassName="pb-2" keyboardShouldPersistTaps="handled">
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-6 pt-6">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Ionicons name="camera" size={22} color="white" />
            </View>
            <Text className="ml-3 text-lg font-bold text-foreground">RetinaAI</Text>
          </View>
          <View />
        </View>

        {/* Hero */}
        <View className="px-6 mt-6">
          <Card className="rounded-2xl p-4">
            <CardHeader>
              <Text className="text-sm text-muted-foreground">RetinaAI</Text>
              <CardTitle>Diabetic Retinopathy, detected in seconds.</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-muted-foreground mb-3">Upload fundus images captured in-clinic or on your fundus camera; our ML model returns DR severity, confidence, and explainable heatmaps—every report stays synced for patients and doctors.</Text>

              <View className="flex-row gap-2">
                <Badge label="DR grade + heatmaps" />
                <Badge label="< 45 sec" />
                <Badge label="Fundus uploads" />
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Highlights */}
        <View className="px-6 mt-4 space-y-3">
          <SmallInfo icon="flash" title="Upload → AI" description="You upload fundus images; our ML model returns DR severity, confidence, and heatmaps." />
          <SmallInfo icon="people" title="Clinician-first" description="Explainable outputs doctors can trust, with clear severity and confidence." />
          <SmallInfo icon="cloud" title="Always synced" description="Secure storage for images and reports, accessible by patients and assigned doctors." />
        </View>

        {/* Patient & Doctor cards */}
        <View className="px-6 mt-6 space-y-3">
          <Card className="p-4">
            <CardHeader>
              <Text className="text-xs text-muted-foreground">FOR PATIENTS</Text>
            </CardHeader>
            <CardContent>
              <Text className="text-lg font-semibold text-foreground">Simple, guided flow</Text>
              <View className="mt-3">
                <Text className="text-sm text-muted-foreground">1. Create an account and pick your approved doctor.</Text>
                <Text className="text-sm text-muted-foreground">2. Upload or view fundus reports shared by your doctor.</Text>
                <Text className="text-sm text-muted-foreground">3. Track severity, AI confidence, and download PDFs anytime.</Text>
              </View>
            </CardContent>
          </Card>

          <Card className="p-4">
            <CardHeader>
              <Text className="text-xs text-muted-foreground">FOR DOCTORS</Text>
            </CardHeader>
            <CardContent>
              <Text className="text-lg font-semibold text-foreground">Built for clinics</Text>
              <View className="mt-3">
                <Text className="text-sm text-muted-foreground">1. Get approved, then see only your assigned patients.</Text>
                <Text className="text-sm text-muted-foreground">2. Upload fundus images; the model returns DR severity and heatmaps.</Text>
                <Text className="text-sm text-muted-foreground">3. Share results instantly; patients get notified and can download.</Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Sign-in panel */}
        <View className="px-6 mt-6">
          <Card className="p-4">
            <CardHeader>
              <Text className="text-xs text-muted-foreground">ACCESS</Text>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-semibold text-foreground">{activeTab === 'signin' ? 'Sign in' : 'Sign up'}</Text>
                <View className="flex-row items-center space-x-2">
                  <TouchableOpacity
                    onPress={() => setActiveTab('signin')}
                    className={`rounded-full px-3 py-1 ${activeTab === 'signin' ? 'border border-primary bg-primary/10' : 'border border-border bg-transparent'}`}
                  >
                    <Text className={`${activeTab === 'signin' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Sign in</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setActiveTab('signup')}
                    className={`rounded-full px-3 py-1 ${activeTab === 'signup' ? 'border border-primary bg-primary/10' : 'border border-border bg-transparent'}`}
                  >
                    <Text className={`${activeTab === 'signup' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Sign up</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {activeTab === 'signin' ? (
                <>
                  <Input label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
                  <View className="mt-3" />
                  <Input label="Password" value={password} onChangeText={setPassword} placeholder="●●●●●●●●" secureTextEntry />

                  {(localError || lastError) && (
                    <Text className="text-sm text-red-500 mt-3">{localError || lastError}</Text>
                  )}

                  <View className="mt-4">
                    <Button
                      onPress={async () => {
                        setLocalError(null);
                        if (!email.trim() || !password.trim()) return setLocalError('Please enter email and password');
                        try {
                          await signInWithPassword(email.trim(), password);
                        } catch (err: any) {
                          setLocalError(err.message || 'Sign in failed');
                        }
                      }}
                      isLoading={isLoading}
                      className="w-full rounded-xl py-4"
                    >
                      Sign in
                    </Button>
                  </View>

                  <View className="mt-4 items-center">
                    <Text className="text-sm text-muted-foreground">Don't have an account? <Text className="text-primary" onPress={() => setActiveTab('signup')}>Create one</Text></Text>
                  </View>
                </>
              ) : (
                <>
                  <Text className="text-sm text-muted-foreground mb-3">Create an account as a patient or doctor. Doctor accounts require admin approval.</Text>
                  <View className="mt-2">
                    <Button onPress={() => navigation.navigate('SignUp')} className="w-full rounded-xl py-4">Create account</Button>
                  </View>
                </>
              )}
            </CardContent>
          </Card>
        </View>
          </ScrollView>
          </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-muted/30 px-3 py-2">
      <Text className="text-xs text-foreground">{label}</Text>
    </View>
  );
}

function SmallInfo({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <Card className="p-3">
      <View className="flex-row items-start gap-3">
        <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
          <Ionicons name={icon as any} size={20} color="#0ea5e9" />
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-foreground">{title}</Text>
          <Text className="text-sm text-muted-foreground mt-1">{description}</Text>
        </View>
      </View>
    </Card>
  );
}
