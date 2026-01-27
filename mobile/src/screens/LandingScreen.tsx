import React from 'react';
import { View, Text, Image, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

export default function LandingScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="items-center px-6 pt-12">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary">
            <Ionicons name="eye" size={40} color="white" />
          </View>
          <Text className="text-3xl font-bold text-foreground">RetinaAI</Text>
          <Text className="mt-2 text-center text-muted-foreground">
            Advanced Diabetic Retinopathy Screening
          </Text>
        </View>

        {/* Hero Section */}
        <View className="mt-8 px-6">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent>
              <Text className="text-lg font-semibold text-foreground">
                AI-Powered Eye Health Analysis
              </Text>
              <Text className="mt-2 text-muted-foreground">
                Get instant diabetic retinopathy screening using advanced AI technology.
                Upload a retinal image and receive detailed analysis within seconds.
              </Text>
            </CardContent>
          </Card>
        </View>

        {/* Features */}
        <View className="mt-8 px-6">
          <Text className="mb-4 text-xl font-semibold text-foreground">Features</Text>
          
          <View className="space-y-3">
            <FeatureCard
              icon="scan"
              title="AI Analysis"
              description="Advanced deep learning models analyze retinal images"
            />
            <FeatureCard
              icon="time"
              title="Instant Results"
              description="Get screening results in seconds, not days"
            />
            <FeatureCard
              icon="medical"
              title="Doctor Review"
              description="Connect with certified ophthalmologists"
            />
            <FeatureCard
              icon="shield-checkmark"
              title="Secure & Private"
              description="Your health data is encrypted and protected"
            />
          </View>
        </View>

        {/* CTA Buttons */}
        <View className="mt-8 px-6 space-y-3">
          <Button
            onPress={() => navigation.navigate('SignUp')}
            className="w-full"
          >
            Get Started
          </Button>
          
          <Button
            variant="outline"
            onPress={() => navigation.navigate('SignIn')}
            className="w-full"
          >
            Sign In
          </Button>
        </View>

        {/* Footer */}
        <View className="mt-8 px-6">
          <Text className="text-center text-xs text-muted-foreground">
            RetinaAI is not a replacement for professional medical advice.
            Always consult with a qualified healthcare provider.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View className="mb-3 flex-row items-start rounded-lg bg-muted/50 p-4">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Ionicons name={icon} size={20} color="#0ea5e9" />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-foreground">{title}</Text>
        <Text className="mt-0.5 text-sm text-muted-foreground">{description}</Text>
      </View>
    </View>
  );
}
