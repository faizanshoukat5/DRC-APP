import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import {
  getDoctorDirectory,
  getMyDoctor,
  getMyPatients,
  getPendingDoctors,
  getScans,
  type Scan,
} from '../lib/api';
import { formatDate } from '../lib/utils';
import { useAuthContext } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  badge?: string;
  onPress?: () => void;
};

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const buildNotifications = useCallback(async () => {
    if (!user) return;

    const next: NotificationItem[] = [];

    if (user.role === 'patient') {
      const [doctor, scans] = await Promise.all([getMyDoctor(user.id), getScans(user.id)]);
      if (doctor) {
        next.push({
          id: 'doctor-assigned',
          title: 'Doctor assigned',
          body: `Dr. ${doctor.name} is your current ophthalmologist.`,
          icon: 'medical-outline',
          color: '#0ea5e9',
        });
      }
      scans.slice(0, 5).forEach((scan) => {
        next.push(scanNotification(scan, navigation));
        if (scan.followUpDueDate) {
          next.push({
            id: `followup-${scan.id}`,
            title: 'Follow-up recommended',
            body: `Follow up by ${scan.followUpDueDate}${scan.followUpNotes ? `: ${scan.followUpNotes}` : ''}`,
            createdAt: scan.createdAt,
            icon: 'calendar-outline',
            color: '#f97316',
            badge: scan.followUpStatus || 'needed',
            onPress: () => navigation.navigate('Results', { scanId: scan.id }),
          });
        }
      });
    }

    if (user.role === 'doctor') {
      const patients = await getMyPatients(user.id);
      next.push({
        id: 'assigned-patients',
        title: 'Assigned patients',
        body: `${patients.length} patients are currently assigned to you.`,
        icon: 'people-outline',
        color: '#0ea5e9',
        onPress: () => navigation.navigate('DoctorPatients'),
      });
      patients.forEach((patient) => {
        (patient.scans || []).slice(0, 3).forEach((scan) => {
          if (scan.inferenceMode === 'failed') {
            next.push({
              id: `failed-${scan.id}`,
              title: 'Analysis failed',
              body: `${patient.name}'s scan needs review or a retake.`,
              createdAt: scan.createdAt,
              icon: 'alert-circle-outline',
              color: '#ef4444',
              badge: 'failed',
              onPress: () => navigation.navigate('Results', { scanId: scan.id }),
            });
          }
          if (scan.severity === 'severe' || scan.severity === 'proliferative') {
            next.push({
              id: `urgent-${scan.id}`,
              title: 'Urgent DR finding',
              body: `${patient.name} has a ${scan.severity} result.`,
              createdAt: scan.createdAt,
              icon: 'warning-outline',
              color: '#ef4444',
              badge: scan.severity,
              onPress: () => navigation.navigate('Results', { scanId: scan.id }),
            });
          }
        });
      });
    }

    if (user.role === 'admin') {
      const [pendingDoctors, doctors] = await Promise.all([getPendingDoctors(), getDoctorDirectory()]);
      next.push({
        id: 'pending-doctors',
        title: 'Pending doctor approvals',
        body: `${pendingDoctors.length} doctors are waiting for review.`,
        icon: 'shield-checkmark-outline',
        color: '#f97316',
        badge: `${pendingDoctors.length}`,
        onPress: () => navigation.navigate('AdminDoctorDirectory'),
      });
      next.push({
        id: 'doctor-directory',
        title: 'Doctor directory',
        body: `${doctors.length} doctor accounts are registered.`,
        icon: 'medical-outline',
        color: '#0ea5e9',
        onPress: () => navigation.navigate('AdminDoctorDirectory'),
      });
    }

    setItems(next);
  }, [navigation, user]);

  const loadData = useCallback(async () => {
    try {
      await buildNotifications();
    } catch (error) {
      console.error('Failed to build notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [buildNotifications]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-row items-center px-4 pt-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4" hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Notifications</Text>
            <Text className="text-sm text-muted-foreground">Important in-app updates</Text>
          </View>
        </View>

        <View className="mt-6 px-4">
          {items.length > 0 ? (
            items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={item.onPress}
                disabled={!item.onPress}
                className="mb-3 rounded-xl border border-border bg-card p-4"
              >
                <View className="flex-row items-start">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${item.color}18` }}
                  >
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="flex-1 font-semibold text-foreground">{item.title}</Text>
                      {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
                    </View>
                    <Text className="mt-1 text-sm text-muted-foreground">{item.body}</Text>
                    {item.createdAt ? (
                      <Text className="mt-2 text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Card>
              <CardContent className="items-center py-10">
                <Ionicons name="notifications-outline" size={48} color="#94a3b8" />
                <Text className="mt-3 text-center font-medium text-foreground">
                  No notifications
                </Text>
                <Text className="mt-1 text-center text-sm text-muted-foreground">
                  Important updates will appear here.
                </Text>
              </CardContent>
            </Card>
          )}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

function scanNotification(scan: Scan, navigation: NavigationProp): NotificationItem {
  const urgent = scan.severity === 'severe' || scan.severity === 'proliferative';
  return {
    id: `scan-${scan.id}`,
    title: urgent ? 'Important report available' : 'New report available',
    body: `${scan.diagnosis || 'Scan result'} is ready to review.`,
    createdAt: scan.createdAt,
    icon: urgent ? 'warning-outline' : 'document-text-outline',
    color: urgent ? '#ef4444' : '#0ea5e9',
    badge: scan.severity,
    onPress: () => navigation.navigate('Results', { scanId: scan.id }),
  };
}
