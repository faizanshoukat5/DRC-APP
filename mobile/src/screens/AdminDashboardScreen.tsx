import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/ui/AppHeader';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { getPendingDoctors, approveDoctor, rejectDoctor, type PendingDoctor } from '../lib/api';
import { formatDate } from '../lib/utils';

export default function AdminDashboardScreen() {
  const { user } = useAuthContext();

  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getPendingDoctors();
      setPendingDoctors(data);
    } catch (error) {
      console.error('Failed to load pending doctors:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApprove = async (doctor: PendingDoctor) => {
    Alert.alert(
      'Approve Doctor',
      `Are you sure you want to approve Dr. ${doctor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingId(doctor.id);
            try {
              await approveDoctor(doctor.id);
              setPendingDoctors((prev) => prev.filter((d) => d.id !== doctor.id));
              Alert.alert('Success', `Dr. ${doctor.name} has been approved.`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve doctor');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (doctor: PendingDoctor) => {
    Alert.alert(
      'Reject Doctor',
      `Are you sure you want to reject Dr. ${doctor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(doctor.id);
            try {
              await rejectDoctor(doctor.id);
              setPendingDoctors((prev) => prev.filter((d) => d.id !== doctor.id));
              Alert.alert('Success', `Dr. ${doctor.name} has been rejected.`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject doctor');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <AppHeader
          title="Admin Dashboard"
          subtitle="Manage doctors, approvals, and core system settings."
          roleTag="ADMIN"
          transition="slide"
        />

        {/* Stats */}
        <View className="mt-6 flex-row px-4">
          <Card className="mr-2 flex-1">
            <CardContent className="items-center py-4">
              <Ionicons name="shield-checkmark" size={32} color="#0ea5e9" />
              <Text className="mt-2 font-medium text-foreground">Admin</Text>
              <Text className="text-xs text-muted-foreground">{user?.email}</Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="items-center py-4">
              <Text className="text-3xl font-bold text-orange-500">
                {pendingDoctors.length}
              </Text>
              <Text className="text-sm text-muted-foreground">Pending Approvals</Text>
            </CardContent>
          </Card>
        </View>

        {/* Pending Doctors */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-lg font-semibold text-foreground">
            Pending Doctor Approvals
          </Text>

          {pendingDoctors.length > 0 ? (
            pendingDoctors.map((doctor) => (
              <Card key={doctor.id} className="mb-3">
                <CardHeader>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                          <Ionicons name="medical" size={20} color="#f97316" />
                        </View>
                        <View className="ml-3">
                          <CardTitle className="text-base">Dr. {doctor.name}</CardTitle>
                          <Text className="text-xs text-muted-foreground">
                            {doctor.email}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Badge variant="warning">Pending</Badge>
                  </View>
                </CardHeader>
                <CardContent>
                  <View className="mb-4 space-y-2">
                    <View className="mb-2 flex-row">
                      <Text className="w-28 text-sm text-muted-foreground">License #:</Text>
                      <Text className="flex-1 text-sm text-foreground">
                        {doctor.licenseNumber || 'N/A'}
                      </Text>
                    </View>
                    <View className="mb-2 flex-row">
                      <Text className="w-28 text-sm text-muted-foreground">Specialty:</Text>
                      <Text className="flex-1 text-sm text-foreground">
                        {doctor.specialty || 'N/A'}
                      </Text>
                    </View>
                    <View className="flex-row">
                      <Text className="w-28 text-sm text-muted-foreground">Applied:</Text>
                      <Text className="flex-1 text-sm text-foreground">
                        {formatDate(doctor.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row space-x-3">
                    <Button
                      variant="outline"
                      className="mr-2 flex-1"
                      onPress={() => handleReject(doctor)}
                      isLoading={processingId === doctor.id}
                      disabled={processingId !== null}
                    >
                      <Text className="font-medium text-red-500">Reject</Text>
                    </Button>
                    <Button
                      className="flex-1"
                      onPress={() => handleApprove(doctor)}
                      isLoading={processingId === doctor.id}
                      disabled={processingId !== null}
                    >
                      Approve
                    </Button>
                  </View>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="items-center py-8">
                <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                <Text className="mt-2 text-center font-medium text-foreground">
                  All Caught Up!
                </Text>
                <Text className="mt-1 text-center text-sm text-muted-foreground">
                  No pending doctor approvals at this time.
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
