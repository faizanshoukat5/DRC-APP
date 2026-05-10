import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/ui/AppHeader';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, PressableCard } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { getMyPatients, type PatientWithScans } from '../lib/api';
import { formatDate, getSeverityBadgeVariant } from '../lib/utils';
import { useAuthContext } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DoctorPatients'>;

export default function DoctorPatientsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();
  const [patients, setPatients] = useState<PatientWithScans[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getMyPatients(user.id);
      setPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

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

  const renderPatient: ListRenderItem<PatientWithScans> = ({ item }) => {
    const scans = item.scans || [];
    const latestScan = scans[0];

    return (
      <PressableCard
        className="mx-4 mb-3"
        onPress={() => navigation.navigate('DoctorPatientDetail', { patientId: item.id })}
      >
        <View className="flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Text className="text-lg font-bold text-primary">
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-semibold text-foreground">{item.name}</Text>
            <Text className="text-xs text-muted-foreground">{item.email}</Text>
            {item.phone ? (
              <Text className="text-xs text-muted-foreground">{item.phone}</Text>
            ) : null}
          </View>
          <View className="items-end">
            <Badge variant="secondary">{scans.length} scans</Badge>
            {latestScan ? (
              <Text className="mt-1 text-xs text-muted-foreground">
                Last {formatDate(latestScan.createdAt)}
              </Text>
            ) : (
              <Text className="mt-1 text-xs text-muted-foreground">No scans yet</Text>
            )}
          </View>
        </View>
        {latestScan ? (
          <View className="mt-3 flex-row items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">
                {latestScan.diagnosis || 'Pending Analysis'}
              </Text>
              <Text className="text-xs text-muted-foreground">
                Confidence {Math.round(latestScan.confidence || 0)}%
              </Text>
            </View>
            {latestScan.severity ? (
              <Badge variant={getSeverityBadgeVariant(latestScan.severity)}>
                {latestScan.severity}
              </Badge>
            ) : null}
          </View>
        ) : null}
      </PressableCard>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  const totalScans = patients.reduce((sum, patient) => sum + (patient.scans?.length || 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={patients}
        renderItem={renderPatient}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <AppHeader
              title="Patient Directory"
              subtitle="Review assigned patients and start new analyses."
              roleTag="DOCTOR"
              transition="fade"
            />
            <View className="mb-4 mt-4 flex-row px-4">
              <Card className="mr-3 flex-1 bg-blue-50 border-0">
                <CardContent className="items-center py-4">
                  <Text className="text-2xl font-bold text-foreground">{patients.length}</Text>
                  <Text className="text-xs text-muted-foreground">Patients</Text>
                </CardContent>
              </Card>
              <Card className="flex-1 bg-emerald-50 border-0">
                <CardContent className="items-center py-4">
                  <Text className="text-2xl font-bold text-foreground">{totalScans}</Text>
                  <Text className="text-xs text-muted-foreground">Reports</Text>
                </CardContent>
              </Card>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="px-4">
            <Card>
              <CardContent className="items-center py-10">
                <Ionicons name="people-outline" size={48} color="#94a3b8" />
                <Text className="mt-3 text-center font-medium text-foreground">
                  No assigned patients
                </Text>
                <Text className="mt-1 text-center text-sm text-muted-foreground">
                  Patients appear here after they select you as their doctor.
                </Text>
              </CardContent>
            </Card>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}
