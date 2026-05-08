import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import WelcomeIntro from '../components/WelcomeIntro';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

export default function LandingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [showIntro, setShowIntro] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {showIntro && <WelcomeIntro onDismiss={() => setShowIntro(false)} />}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Hero */}
        <View className="px-6 pt-8 pb-6 items-center">
          <View
            style={styles.logoBubble}
            className="bg-primary/10 items-center justify-center mb-4"
          >
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
            />
          </View>
          <Text className="text-3xl font-bold text-foreground tracking-tight">RetinaPilot</Text>
          <Text className="text-sm text-muted-foreground mt-1 text-center">
            AI-guided diabetic retinopathy screening
          </Text>
        </View>

        {/* Pitch */}
        <View className="px-4">
          <Card className="rounded-2xl border-0 bg-gradient-to-br from-sky-50 to-blue-50">
            <CardContent className="py-6 px-5">
              <Text className="text-2xl font-bold text-slate-900 leading-tight">
                Diabetic retinopathy,{'\n'}detected in seconds.
              </Text>
              <Text className="text-sm text-slate-600 mt-3 leading-relaxed">
                Upload a retinal fundus image and get DR severity, calibrated confidence,
                and an AI heatmap showing exactly what the model focused on.
              </Text>

              <View className="flex-row flex-wrap mt-4 -mx-1">
                <Pill label="5-class grading" />
                <Pill label="Grad-CAM heatmap" />
                <Pill label="< 45 sec" />
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Primary CTAs */}
        <View className="px-4 mt-6">
          <Button
            size="lg"
            onPress={() => navigation.navigate('SignUp')}
            className="w-full rounded-xl"
          >
            Get started
          </Button>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignIn')}
            className="mt-3 py-3"
          >
            <Text className="text-center text-sm font-medium text-primary">
              I already have an account →
            </Text>
          </TouchableOpacity>
        </View>

        {/* What you get */}
        <View className="px-4 mt-8">
          <Text className="text-xs font-semibold text-muted-foreground tracking-wider mb-3 uppercase">
            What you get
          </Text>
          <FeatureRow
            icon="flash"
            title="Instant analysis"
            description="EfficientNet-B4 returns severity, confidence, and per-class probabilities."
          />
          <FeatureRow
            icon="eye"
            title="Explainable AI"
            description="Grad-CAM heatmaps show exactly which retinal regions drove the diagnosis."
          />
          <FeatureRow
            icon="cloud-done"
            title="Always synced"
            description="Reports stay accessible to patients and assigned doctors anywhere."
          />
        </View>

        {/* Role explainers */}
        <View className="px-4 mt-8">
          <Text className="text-xs font-semibold text-muted-foreground tracking-wider mb-3 uppercase">
            Built for
          </Text>

          <Card className="mb-3">
            <CardContent className="py-4 px-4">
              <View className="flex-row items-start">
                <View className="h-10 w-10 rounded-lg bg-blue-50 items-center justify-center">
                  <Ionicons name="person" size={20} color="#0ea5e9" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-foreground">Patients</Text>
                  <Text className="text-sm text-muted-foreground mt-1">
                    Pick an approved doctor, view your screening reports, and track results over time.
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4 px-4">
              <View className="flex-row items-start">
                <View className="h-10 w-10 rounded-lg bg-emerald-50 items-center justify-center">
                  <Ionicons name="medical" size={20} color="#10b981" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-foreground">Doctors</Text>
                  <Text className="text-sm text-muted-foreground mt-1">
                    Upload fundus images for assigned patients, review AI grading, add clinical notes.
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* FAQ */}
        <View className="px-4 mt-6">
          <TouchableOpacity
            onPress={() => navigation.navigate('FAQ')}
            className="flex-row items-center justify-between py-3 px-4 rounded-xl bg-muted/40"
          >
            <View className="flex-row items-center">
              <Ionicons name="help-circle-outline" size={20} color="#64748b" />
              <Text className="ml-2 text-sm font-medium text-foreground">
                Frequently Asked Questions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Footer disclaimer */}
        <View className="px-4 mt-8">
          <Text className="text-xs text-center text-muted-foreground leading-relaxed">
            RetinaPilot is a screening assistant. Results do not replace
            clinical diagnosis by a qualified ophthalmologist.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-white/60 border border-sky-200 px-3 py-1.5 mr-2 mb-2">
      <Text className="text-xs font-medium text-sky-700">{label}</Text>
    </View>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row items-start mb-4">
      <View className="h-10 w-10 rounded-lg bg-primary/10 items-center justify-center">
        <Ionicons name={icon} size={20} color="#0ea5e9" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoBubble: {
    width: 80,
    height: 80,
    borderRadius: 24,
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
});
