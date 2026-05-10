import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardContent } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../contexts/AuthContext';

export default function PendingDoctorScreen() {
  const { user, signOut } = useAuthContext();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View className="items-center mt-6 mb-8">
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
            You're almost in
          </Text>
          <Text className="text-sm text-muted-foreground mt-1 text-center">
            Welcome to AEYE, Dr. {user?.name?.split(' ')[0] || 'Doctor'}
          </Text>
        </View>

        {/* Status card */}
        <Card className="rounded-2xl border-amber-200 bg-amber-50">
          <CardContent className="py-5">
            <View className="flex-row items-start">
              <View className="h-12 w-12 rounded-full bg-amber-100 items-center justify-center">
                <Ionicons name="time" size={24} color="#d97706" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-amber-900">
                  Approval pending
                </Text>
                <Text className="text-sm text-amber-800 mt-1 leading-relaxed">
                  An administrator is reviewing your credentials. You'll be able to upload
                  scans and manage patients as soon as your account is approved.
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Account snapshot */}
        <View className="mt-4">
          <Text className="text-xs font-semibold text-muted-foreground tracking-wider mb-2 uppercase">
            Submitted details
          </Text>
          <Card className="rounded-2xl">
            <CardContent className="py-4">
              <DetailRow icon="person-outline" label="Name" value={`Dr. ${user?.name || '—'}`} />
              <DetailRow icon="mail-outline" label="Email" value={user?.email || '—'} />
              {user?.licenseNumber && (
                <DetailRow
                  icon="document-text-outline"
                  label="License"
                  value={user.licenseNumber}
                />
              )}
              {user?.specialty && (
                <DetailRow
                  icon="medical-outline"
                  label="Specialty"
                  value={user.specialty}
                  isLast
                />
              )}
            </CardContent>
          </Card>
        </View>

        {/* What happens next */}
        <View className="mt-6">
          <Text className="text-xs font-semibold text-muted-foreground tracking-wider mb-2 uppercase">
            What happens next
          </Text>
          <Card className="rounded-2xl">
            <CardContent className="py-4">
              <NextStep
                icon="checkmark-circle"
                color="#10b981"
                title="Account created"
                description="Your details are saved securely."
                done
              />
              <NextStep
                icon="hourglass"
                color="#d97706"
                title="Admin review"
                description="A AEYE admin verifies your license and credentials."
              />
              <NextStep
                icon="notifications-outline"
                color="#94a3b8"
                title="You're notified"
                description="Once approved, sign in again to access your dashboard."
                isLast
              />
            </CardContent>
          </Card>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="mt-8 mb-4 self-center py-3"
          hitSlop={8}
        >
          <Text className="text-sm font-medium text-muted-foreground">
            Sign out and use a different account
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center ${
        isLast ? '' : 'mb-3 border-b border-border pb-3'
      }`}
    >
      <Ionicons name={icon} size={18} color="#64748b" />
      <Text className="ml-2 text-sm text-muted-foreground flex-1">{label}</Text>
      <Text className="text-sm font-medium text-foreground">{value}</Text>
    </View>
  );
}

function NextStep({
  icon,
  color,
  title,
  description,
  done,
  isLast,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
  done?: boolean;
  isLast?: boolean;
}) {
  return (
    <View className={`flex-row items-start ${isLast ? '' : 'mb-3'}`}>
      <View
        className="h-9 w-9 rounded-full items-center justify-center"
        style={{ backgroundColor: done ? '#dcfce7' : `${color}15` }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View className="ml-3 flex-1">
        <Text
          className={`font-medium text-sm ${done ? 'text-foreground' : 'text-foreground'}`}
        >
          {title}
        </Text>
        <Text className="text-xs text-muted-foreground mt-0.5">{description}</Text>
      </View>
    </View>
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
});
