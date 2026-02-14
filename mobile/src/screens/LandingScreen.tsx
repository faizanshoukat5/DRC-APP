import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StatusBar as RNStatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { useAuthContext } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import AppHeader from '../components/ui/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/ui/Input';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useVideoPlayer, VideoView } from 'expo-video';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

export default function LandingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const { lastError, signInWithPassword, isLoading } = useAuthContext();
  const [localError, setLocalError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const videoSource = require('../../assets/eye-opening.mp4');
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.play();
  });

  // Listen for playback end to dismiss the intro
  React.useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      setShowIntro(false);
    });
    return () => subscription.remove();
  }, [player]);
  // Device-aware keyboard offset: iOS needs a larger offset for the header + notch,
  // Android can use the StatusBar height plus a small buffer.
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 90 : (RNStatusBar.currentHeight ?? 0) + 20;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {showIntro && (
        <View style={styles.introOverlay}>
          <VideoView
            player={player}
            style={styles.introVideo}
            nativeControls={false}
          />
          <TouchableOpacity onPress={() => setShowIntro(false)} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <View style={styles.introCaption}>
            <Text style={styles.introTitle}>RetinaAI</Text>
            <Text style={styles.introSubtitle}>Diabetic Retinopathy Detection</Text>
          </View>
        </View>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={keyboardVerticalOffset}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}>
            {/* Header */}
            <AppHeader
              title="RetinaAI"
              subtitle="Diabetic Retinopathy Detection and Stage Classification"
              roleTag="WELCOME"
              transition="slide"
            />

            {/* Hero */}
            <View className="px-4 mt-4">
              <Card className="rounded-2xl p-4">
                <CardHeader>
                  <Text className="text-sm text-muted-foreground" numberOfLines={2}>
                    Diabetic Retinopathy Detection and Stage Classification (RetinaAI)
                  </Text>
                  <CardTitle>Diabetic Retinopathy, detected in seconds.</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text className="text-sm text-muted-foreground mb-3">Upload fundus images captured in-clinic or on your fundus camera; our ML model returns DR severity, confidence, and explainable heatmaps, and every report stays synced for patients and doctors.</Text>

                  <View className="flex-row gap-2">
                    <Badge label="DR grade + heatmaps" />
                    <Badge label="< 45 sec" />
                    <Badge label="Fundus uploads" />
                  </View>
                </CardContent>
              </Card>
            </View>

            {/* Highlights */}
            <View className="px-4 mt-4 space-y-3">
              <SmallInfo icon="flash" title="Upload to AI" description="You upload fundus images; our ML model returns DR severity, confidence, and heatmaps." />
              <SmallInfo icon="people" title="Clinician-first" description="Explainable outputs doctors can trust, with clear severity and confidence." />
              <SmallInfo icon="cloud" title="Always synced" description="Secure storage for images and reports, accessible by patients and assigned doctors." />
            </View>

            {/* Patient & Doctor cards */}
            <View className="px-4 mt-4 space-y-3">
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

            {/* FAQ Link */}
            <View className="px-4 mt-4">
              <TouchableOpacity
                onPress={() => navigation.navigate('FAQ')}
                className="flex-row items-center justify-between p-4 rounded-xl bg-muted/30"
              >
                <View className="flex-row items-center">
                  <Ionicons name="help-circle-outline" size={24} color="#0ea5e9" />
                  <Text className="ml-3 text-base font-medium text-foreground">Frequently Asked Questions</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Sign-in panel */}
            <View className="px-4 mt-4">
              <Card className="p-4">
                <CardHeader>
                  <Text className="text-xs text-muted-foreground">ACCESS</Text>
                </CardHeader>
                <CardContent>
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-lg font-semibold text-foreground">{activeTab === 'signin' ? 'Sign in' : 'Sign up'}</Text>
                    <View className="flex-row items-center space-x-2">
                      <Button
                        size="sm"
                        variant={activeTab === 'signin' ? 'default' : 'outline'}
                        onPress={() => setActiveTab('signin')}
                        className="rounded-full px-3"
                      >
                        Sign in
                      </Button>
                      <Button
                        size="sm"
                        variant={activeTab === 'signup' ? 'default' : 'outline'}
                        onPress={() => setActiveTab('signup')}
                        className="rounded-full px-3"
                      >
                        Sign up
                      </Button>
                    </View>
                  </View>

                  {activeTab === 'signin' ? (
                    <>
                      <Input label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
                      <View className="mt-3" />
                      <Input label="Password" value={password} onChangeText={setPassword} placeholder="********" secureTextEntry />

                      {(localError || lastError) && (
                        <Text className="text-sm text-red-500 mt-3">{localError || lastError}</Text>
                      )}

                      <View className="mt-4">
                        <Button
                          size="lg"
                          variant="default"
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
                          className="w-full rounded-xl"
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
                        <Button size="lg" variant="default" onPress={() => navigation.navigate('SignUp')} className="w-full rounded-xl">Create account</Button>
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

const styles = StyleSheet.create({
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: '#05070c',
  },
  introVideo: {
    width: '100%',
    height: '100%',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  introCaption: {
    position: 'absolute',
    bottom: 64,
    left: 24,
    right: 24,
  },
  introTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  introSubtitle: {
    color: '#e2e8f0',
    fontSize: 14,
    marginTop: 6,
  },
});
