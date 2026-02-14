import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../contexts/AuthContext';

export default function PendingDoctorScreen() {
  const { user, signOut } = useAuthContext();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-orange-100">
              <Ionicons name="time" size={40} color="#f97316" />
            </View>
            <CardTitle className="text-center">Approval Pending</CardTitle>
            <CardDescription className="text-center">
              Your account is awaiting admin approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Text className="mb-4 text-center text-muted-foreground">
              Thank you for registering, Dr. {user?.name}. An administrator will review
              your credentials and approve your account shortly.
            </Text>

            <View className="mb-4 rounded-lg bg-muted/50 p-4">
              <View className="mb-2 flex-row items-center">
                <Ionicons name="mail-outline" size={16} color="#6b7280" />
                <Text className="ml-2 text-sm text-muted-foreground">{user?.email}</Text>
              </View>
              {user?.licenseNumber && (
                <View className="flex-row items-center">
                  <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                  <Text className="ml-2 text-sm text-muted-foreground">
                    License: {user.licenseNumber}
                  </Text>
                </View>
              )}
            </View>

            <Text className="text-center text-xs text-muted-foreground">
              You'll receive a notification once your account has been approved.
            </Text>
          </CardContent>
        </Card>

        <View className="mt-6">
          <Text
            className="text-center text-primary"
            onPress={signOut}
          >
            Sign out and try a different account
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
