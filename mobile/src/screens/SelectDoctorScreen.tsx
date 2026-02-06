import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { PressableCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { getApprovedDoctors, selectDoctor, getMyDoctor, type ApprovedDoctor } from '../lib/api';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectDoctor'>;

export default function SelectDoctorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();

  const [doctors, setDoctors] = useState<ApprovedDoctor[]>([]);
  const [currentDoctor, setCurrentDoctor] = useState<ApprovedDoctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const [doctorsData, myDoctor] = await Promise.all([
        getApprovedDoctors(),
        getMyDoctor(user.id),
      ]);
      setDoctors(doctorsData);
      setCurrentDoctor(myDoctor);
    } catch (error) {
      console.error('Failed to load doctors:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

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

  const handleSelectDoctor = async (doctor: ApprovedDoctor) => {
    if (currentDoctor?.id === doctor.id) return;

    Alert.alert(
      'Select Doctor',
      `Would you like Dr. ${doctor.name} to be your primary ophthalmologist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select',
          onPress: async () => {
            setSelectingId(doctor.id);
            try {
              await selectDoctor(user!.id, doctor.id);
              setCurrentDoctor(doctor);
              Alert.alert('Success', `Dr. ${doctor.name} is now your doctor.`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to select doctor');
            } finally {
              setSelectingId(null);
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
        <View className="flex-row items-center px-4 pt-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Select Doctor</Text>
            <Text className="text-sm text-muted-foreground">
              Choose your ophthalmologist
            </Text>
          </View>
        </View>

        {/* Current Doctor */}
        {currentDoctor && (
          <View className="mt-6 px-4">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Current Doctor
            </Text>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent>
                <View className="flex-row items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <Ionicons name="medical" size={24} color="#0ea5e9" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="font-medium text-foreground">
                      Dr. {currentDoctor.name}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {currentDoctor.specialty || 'Ophthalmologist'}
                    </Text>
                  </View>
                  <Badge variant="success">Selected</Badge>
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Available Doctors */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-lg font-semibold text-foreground">
            Available Doctors
          </Text>

          {doctors.length > 0 ? (
            doctors.map((doctor) => {
              const isSelected = currentDoctor?.id === doctor.id;
              const isSelecting = selectingId === doctor.id;

              return (
                <PressableCard
                  key={doctor.id}
                  className={`mb-3 ${isSelected ? 'border-primary/30 bg-primary/5' : ''}`}
                  onPress={() => handleSelectDoctor(doctor)}
                  disabled={isSelecting || isSelected}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`h-12 w-12 items-center justify-center rounded-full ${
                        isSelected ? 'bg-primary/20' : 'bg-muted'
                      }`}
                    >
                      <Ionicons
                        name="medical"
                        size={24}
                        color={isSelected ? '#0ea5e9' : '#6b7280'}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="font-medium text-foreground">
                        Dr. {doctor.name}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {doctor.specialty || 'Ophthalmologist'}
                      </Text>
                      {doctor.email && (
                        <Text className="text-xs text-muted-foreground">
                          {doctor.email}
                        </Text>
                      )}
                    </View>
                    {isSelecting ? (
                      <ActivityIndicator size="small" color="#0ea5e9" />
                    ) : isSelected ? (
                      <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    )}
                  </View>
                </PressableCard>
              );
            })
          ) : (
            <Card>
              <CardContent className="items-center py-8">
                <Ionicons name="medical-outline" size={48} color="#9ca3af" />
                <Text className="mt-2 text-center text-muted-foreground">
                  No doctors available at this time.
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
