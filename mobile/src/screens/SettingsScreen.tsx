import React from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut, isLoading } = useAuthContext();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-6">
          <Text className="text-2xl font-bold text-foreground">Settings</Text>
          <Text className="mt-1 text-muted-foreground">
            Manage your account and preferences
          </Text>
        </View>

        {/* Profile Card */}
        <View className="mt-6 px-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Text className="text-2xl font-bold text-primary">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-lg font-medium text-foreground">
                    {user?.name || 'User'}
                  </Text>
                  <Text className="text-sm text-muted-foreground">{user?.email}</Text>
                  <View className="mt-1 flex-row items-center">
                    <View className="rounded-full bg-primary/10 px-2 py-0.5">
                      <Text className="text-xs capitalize text-primary">{user?.role}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Account Details */}
        <View className="mt-6 px-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingRow label="Email" value={user?.email || ''} />
              <SettingRow label="Phone" value={user?.phone || 'Not set'} />
              {user?.role === 'doctor' && (
                <>
                  <SettingRow label="License #" value={user?.licenseNumber || 'Not set'} />
                  <SettingRow label="Specialty" value={user?.specialty || 'Not set'} />
                  <SettingRow
                    label="Status"
                    value={user?.status || 'Unknown'}
                    valueClassName={
                      user?.status === 'approved'
                        ? 'text-green-600'
                        : user?.status === 'pending'
                        ? 'text-orange-600'
                        : 'text-red-600'
                    }
                  />
                </>
              )}
            </CardContent>
          </Card>
        </View>

        {/* Quick Links */}
        <View className="mt-6 px-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingLink
                icon="help-circle-outline"
                label="FAQ"
                onPress={() => navigation.navigate('FAQ')}
              />
              {user?.role === 'patient' && (
                <SettingLink
                  icon="medical-outline"
                  label="Select Doctor"
                  onPress={() => navigation.navigate('SelectDoctor')}
                />
              )}
              <SettingLink
                icon="document-text-outline"
                label="Privacy Policy"
                onPress={() => Alert.alert('Info', 'Privacy policy coming soon.')}
              />
              <SettingLink
                icon="information-circle-outline"
                label="Terms of Service"
                onPress={() => Alert.alert('Info', 'Terms of service coming soon.')}
              />
            </CardContent>
          </Card>
        </View>

        {/* App Info */}
        <View className="mt-6 px-6">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="items-center">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
                  <Ionicons name="eye" size={24} color="white" />
                </View>
                <Text className="mt-2 font-medium text-foreground">Diabetic Retinopathy Detection and Stage Classification (RetinaAI)</Text>
                <Text className="text-sm text-muted-foreground">Version 1.0.0</Text>
                <Text className="mt-2 text-center text-xs text-muted-foreground">
                  Advanced Diabetic Retinopathy Screening powered by AI
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Sign Out */}
        <View className="mt-6 mb-8 px-6">
          <Button
            variant="destructive"
            onPress={handleSignOut}
            isLoading={isLoading}
            className="w-full"
          >
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text className="ml-2 font-medium text-white">Sign Out</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between border-b border-border pb-3 last:mb-0 last:border-0 last:pb-0">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className={`text-sm font-medium text-foreground ${valueClassName || ''}`}>
        {value}
      </Text>
    </View>
  );
}

function SettingLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-3 flex-row items-center justify-between border-b border-border pb-3 last:mb-0 last:border-0 last:pb-0"
    >
      <View className="flex-row items-center">
        <Ionicons name={icon} size={20} color="#6b7280" />
        <Text className="ml-3 text-foreground">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}
