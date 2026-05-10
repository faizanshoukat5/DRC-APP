import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import {
  getDoctorDirectory,
  updateDoctorStatus,
  type DoctorDirectoryItem,
} from '../lib/api';
import { formatDate } from '../lib/utils';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminDoctorDirectory'>;
type Filter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminDoctorDirectoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getDoctorDirectory();
      setDoctors(data);
    } catch (error) {
      console.error('Failed to load doctor directory:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const filteredDoctors = useMemo(
    () => (filter === 'all' ? doctors : doctors.filter((doctor) => doctor.status === filter)),
    [doctors, filter],
  );

  const counts = useMemo(
    () => ({
      all: doctors.length,
      pending: doctors.filter((doctor) => doctor.status === 'pending').length,
      approved: doctors.filter((doctor) => doctor.status === 'approved').length,
      rejected: doctors.filter((doctor) => doctor.status === 'rejected').length,
    }),
    [doctors],
  );

  const handleStatusChange = (doctor: DoctorDirectoryItem, nextStatus: DoctorDirectoryItem['status']) => {
    Alert.alert(
      'Update Doctor Status',
      `Set Dr. ${doctor.name} to ${nextStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setProcessingId(doctor.id);
            try {
              await updateDoctorStatus(doctor.id, nextStatus);
              setDoctors((prev) =>
                prev.map((item) =>
                  item.id === doctor.id ? { ...item, status: nextStatus } : item,
                ),
              );
            } catch (error: any) {
              Alert.alert('Update failed', error.message || 'Could not update doctor status.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-row items-center px-4 pt-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4" hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Doctor Directory</Text>
            <Text className="text-sm text-muted-foreground">Manage all doctor accounts</Text>
          </View>
        </View>

        <View className="mt-6 px-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((item) => {
              const active = filter === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setFilter(item)}
                  className="mr-2 rounded-full border px-4 py-2"
                  style={{
                    backgroundColor: active ? '#0ea5e9' : '#ffffff',
                    borderColor: active ? '#0ea5e9' : '#e2e8f0',
                  }}
                >
                  <Text
                    className="text-sm font-medium capitalize"
                    style={{ color: active ? '#ffffff' : '#475569' }}
                  >
                    {item} ({counts[item]})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View className="mt-4 px-4">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="mb-3">
                <CardContent>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">Dr. {doctor.name}</Text>
                      <Text className="text-xs text-muted-foreground">{doctor.email}</Text>
                      <Text className="mt-2 text-sm text-muted-foreground">
                        License: {doctor.licenseNumber || 'Not set'}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        Specialty: {doctor.specialty || 'Not set'}
                      </Text>
                      <Text className="mt-1 text-xs text-muted-foreground">
                        Joined {formatDate(doctor.createdAt)}
                      </Text>
                    </View>
                    <Badge variant={statusVariant(doctor.status)}>{doctor.status}</Badge>
                  </View>

                  <View className="mt-4 flex-row">
                    {doctor.status !== 'approved' && (
                      <Button
                        className="mr-2 flex-1"
                        onPress={() => handleStatusChange(doctor, 'approved')}
                        isLoading={processingId === doctor.id}
                        disabled={processingId !== null}
                      >
                        Approve
                      </Button>
                    )}
                    {doctor.status !== 'rejected' && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onPress={() => handleStatusChange(doctor, 'rejected')}
                        isLoading={processingId === doctor.id}
                        disabled={processingId !== null}
                      >
                        <Text className="font-medium text-red-500">Reject</Text>
                      </Button>
                    )}
                  </View>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="items-center py-10">
                <Ionicons name="medical-outline" size={48} color="#94a3b8" />
                <Text className="mt-3 text-center text-muted-foreground">
                  No doctors match this filter.
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

function statusVariant(status: DoctorDirectoryItem['status']) {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  return 'destructive';
}
