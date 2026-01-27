import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuthContext } from '../contexts/AuthContext';
import { Card, CardContent, PressableCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { getMyPatients, uploadScanForPatient, type PatientWithScans, type Scan } from '../lib/api';
import { formatDate, getSeverityBadgeVariant } from '../lib/utils';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

export default function DoctorDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();

  const [patients, setPatients] = useState<PatientWithScans[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithScans | null>(null);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate stats
  const totalPatients = patients.length;
  const totalScans = patients.reduce((acc, p) => acc + (p.scans?.length || 0), 0);

  // Get all recent scans from all patients
  const allScans: (Scan & { patientName: string })[] = patients
    .flatMap((p) => (p.scans || []).map((s) => ({ ...s, patientName: p.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSelectImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedPatient) {
      Alert.alert('Select Patient', 'Please select a patient first.');
      return;
    }
    if (!selectedImage) {
      Alert.alert('Select Image', 'Please select a retinal fundus image.');
      return;
    }

    setIsUploading(true);
    try {
      const scan = await uploadScanForPatient(selectedPatient.id, selectedImage);
      setSelectedImage(null);
      setSelectedPatient(null);
      navigation.navigate('Results', { scanId: scan.id });
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload scan');
    } finally {
      setIsUploading(false);
    }
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
        <View className="px-6 pt-6">
          <Text className="text-2xl font-bold text-foreground">Welcome, Doctor</Text>
          <Text className="mt-1 text-muted-foreground">
            Upload fundus images and review patient reports.
          </Text>
        </View>

        {/* Stats Cards */}
        <View className="mt-6 flex-row px-6">
          <Card className="mr-3 flex-1 bg-blue-50">
            <CardContent className="flex-row items-center py-4">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Ionicons name="people" size={20} color="#0ea5e9" />
              </View>
              <View>
                <Text className="text-2xl font-bold text-foreground">{totalPatients}</Text>
                <Text className="text-xs text-muted-foreground">My Patients</Text>
              </View>
            </CardContent>
          </Card>
          <Card className="flex-1 bg-green-50">
            <CardContent className="flex-row items-center py-4">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Ionicons name="document-text" size={20} color="#22c55e" />
              </View>
              <View>
                <Text className="text-2xl font-bold text-foreground">{totalScans}</Text>
                <Text className="text-xs text-muted-foreground">Total Reports</Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* New Analysis Card */}
        <View className="mt-6 px-6">
          <Card>
            <CardContent className="py-4">
              {/* Card Header */}
              <View className="mb-4 flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Ionicons name="cloud-upload" size={20} color="#0ea5e9" />
                </View>
                <View>
                  <Text className="text-lg font-semibold text-foreground">New Analysis</Text>
                  <Text className="text-sm text-muted-foreground">
                    Upload a retinal fundus image for DR detection
                  </Text>
                </View>
              </View>

              {/* Patient Selection */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-foreground">
                  Select Patient <Text className="text-red-500">*</Text>
                </Text>
                
                {patients.length > 0 ? (
                  <View>
                    <TouchableOpacity
                      onPress={() => setShowPatientPicker(!showPatientPicker)}
                      className="flex-row items-center justify-between rounded-lg border border-input bg-background px-4 py-3"
                    >
                      <Text className={selectedPatient ? 'text-foreground' : 'text-muted-foreground'}>
                        {selectedPatient?.name || 'Select a patient...'}
                      </Text>
                      <Ionicons 
                        name={showPatientPicker ? 'chevron-up' : 'chevron-down'} 
                        size={20} 
                        color="#6b7280" 
                      />
                    </TouchableOpacity>
                    
                    {showPatientPicker && (
                      <View className="mt-2 rounded-lg border border-input bg-background">
                        {patients.map((patient) => (
                          <TouchableOpacity
                            key={patient.id}
                            onPress={() => {
                              setSelectedPatient(patient);
                              setShowPatientPicker(false);
                            }}
                            className={`border-b border-input px-4 py-3 ${
                              selectedPatient?.id === patient.id ? 'bg-primary/10' : ''
                            }`}
                          >
                            <Text className="font-medium text-foreground">{patient.name}</Text>
                            <Text className="text-xs text-muted-foreground">{patient.email}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View className="rounded-lg bg-green-50 p-4">
                    <Text className="text-sm text-green-700">
                      No patients assigned yet. Patients need to select you as their doctor first.
                    </Text>
                  </View>
                )}
              </View>

              {/* Image Upload Area */}
              <TouchableOpacity
                onPress={handleSelectImage}
                className="mb-4 items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 py-10"
              >
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage }}
                    className="h-32 w-32 rounded-lg"
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <View className="mb-2 h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Ionicons name="image-outline" size={24} color="#0ea5e9" />
                    </View>
                    <Text className="text-sm font-medium text-foreground">Tap to select image</Text>
                    <Text className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 10MB</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Run Analysis Button */}
              <Button
                onPress={handleRunAnalysis}
                disabled={!selectedPatient || !selectedImage || isUploading}
                isLoading={isUploading}
                className="w-full bg-teal-500"
              >
                <Ionicons name="scan" size={18} color="white" />
                <Text className="ml-2 font-medium text-white">Run DR Analysis</Text>
              </Button>
            </CardContent>
          </Card>
        </View>

        {/* Recent Reports */}
        <View className="mt-6 px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">Recent Reports</Text>
            <Text className="text-sm text-muted-foreground">{totalScans} total</Text>
          </View>

          {allScans.length > 0 ? (
            allScans.slice(0, 5).map((scan) => (
              <PressableCard
                key={scan.id}
                className="mb-3"
                onPress={() => navigation.navigate('Results', { scanId: scan.id })}
              >
                <View className="flex-row items-center">
                  {scan.imageUrl ? (
                    <Image
                      source={{ uri: scan.imageUrl }}
                      className="h-14 w-14 rounded-lg"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-14 w-14 items-center justify-center rounded-lg bg-muted">
                      <Ionicons name="eye" size={24} color="#6b7280" />
                    </View>
                  )}
                  <View className="ml-4 flex-1">
                    <Text className="font-medium text-foreground">{scan.patientName}</Text>
                    <Text className="text-sm text-muted-foreground">
                      {scan.diagnosis || 'Pending Analysis'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatDate(scan.createdAt)}
                    </Text>
                  </View>
                  <View className="items-end">
                    {scan.severity && (
                      <Badge variant={getSeverityBadgeVariant(scan.severity)}>
                        {scan.severity}
                      </Badge>
                    )}
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color="#9ca3af" 
                      style={{ marginTop: 8 }} 
                    />
                  </View>
                </View>
              </PressableCard>
            ))
          ) : (
            <Card>
              <CardContent className="items-center py-8">
                <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
                <Text className="mt-2 text-center text-muted-foreground">
                  No reports yet. Upload a scan to get started.
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
