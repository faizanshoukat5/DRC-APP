import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_MODEL,
  getAvailableModels,
  type ModelKey,
} from '../lib/mlApi';
import {
  getMyPatients,
  uploadScanForPatient,
  type PatientWithScans,
  type UploadPhase,
} from '../lib/api';
import { formatDate, getSeverityBadgeVariant } from '../lib/utils';
import { useAuthContext } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DoctorPatientDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'DoctorPatientDetail'>;

export default function DoctorPatientDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuthContext();

  const [patient, setPatient] = useState<PatientWithScans | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase | null>(null);
  const availableModels = useMemo(() => getAvailableModels(), []);
  const [selectedModel, setSelectedModel] = useState<ModelKey>(DEFAULT_MODEL);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const patients = await getMyPatients(user.id);
      setPatient(patients.find((item) => item.id === route.params.patientId) ?? null);
    } catch (error) {
      console.error('Failed to load patient:', error);
    } finally {
      setIsLoading(false);
    }
  }, [route.params.patientId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleSelectImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleRunAnalysis = async () => {
    if (!patient || !selectedImage) return;

    setIsUploading(true);
    setUploadPhase('uploading');
    try {
      const scan = await uploadScanForPatient(patient.id, selectedImage, {
        onPhase: setUploadPhase,
        doctorNotes,
        model: selectedModel,
      });
      setSelectedImage(null);
      setDoctorNotes('');
      navigation.navigate('Results', { scanId: scan.id });
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload scan');
    } finally {
      setIsUploading(false);
      setUploadPhase(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  if (!patient) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text className="mt-3 text-center font-medium text-foreground">Patient not found</Text>
          <Button className="mt-5" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const scans = patient.scans || [];
  const latestScan = scans[0];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <View className="flex-row items-center px-4 pt-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4" hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">{patient.name}</Text>
            <Text className="text-sm text-muted-foreground">Patient detail</Text>
          </View>
        </View>

        <View className="mt-6 px-4">
          <Card>
            <CardContent>
              <View className="flex-row items-center">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Text className="text-xl font-bold text-primary">
                    {patient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-foreground">{patient.name}</Text>
                  <Text className="text-sm text-muted-foreground">{patient.email}</Text>
                  <Text className="text-sm text-muted-foreground">{patient.phone || 'No phone set'}</Text>
                </View>
                <Badge variant="secondary">{scans.length} scans</Badge>
              </View>
            </CardContent>
          </Card>
        </View>

        {latestScan ? (
          <View className="mt-4 px-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle>Latest Report</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-foreground">
                      {latestScan.diagnosis || 'Pending Analysis'}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {formatDate(latestScan.createdAt)}
                    </Text>
                  </View>
                  {latestScan.severity ? (
                    <Badge variant={getSeverityBadgeVariant(latestScan.severity)}>
                      {latestScan.severity}
                    </Badge>
                  ) : null}
                </View>
                <Button
                  variant="outline"
                  className="mt-4"
                  onPress={() => navigation.navigate('Results', { scanId: latestScan.id })}
                >
                  View Latest Report
                </Button>
              </CardContent>
            </Card>
          </View>
        ) : null}

        <View className="mt-6 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Start New Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {availableModels.length > 1 && (
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-foreground">Analysis model</Text>
                  <View className="flex-row overflow-hidden rounded-lg border border-input bg-background">
                    {availableModels.map((model, index) => {
                      const active = selectedModel === model.key;
                      return (
                        <TouchableOpacity
                          key={model.key}
                          onPress={() => setSelectedModel(model.key)}
                          className={`flex-1 items-center justify-center py-3 ${
                            index < availableModels.length - 1 ? 'border-r border-input' : ''
                          }`}
                          style={{ backgroundColor: active ? '#e0f2fe' : 'transparent' }}
                        >
                          <Text
                            className="text-sm font-medium"
                            style={{ color: active ? '#0ea5e9' : '#64748b' }}
                          >
                            {model.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {selectedImage ? (
                <View className="mb-4">
                  <View className="overflow-hidden rounded-lg bg-black" style={{ height: 220 }}>
                    <Image
                      source={{ uri: selectedImage }}
                      style={{ height: '100%', width: '100%' }}
                      contentFit="contain"
                    />
                  </View>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onPress={() => setSelectedImage(null)}
                    disabled={isUploading}
                  >
                    Choose Different Image
                  </Button>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleSelectImage}
                  className="mb-4 items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 py-8"
                >
                  <Ionicons name="image-outline" size={28} color="#0ea5e9" />
                  <Text className="mt-2 font-medium text-foreground">Tap to select image</Text>
                  <Text className="text-xs text-muted-foreground">PNG or JPG up to 10MB</Text>
                </TouchableOpacity>
              )}

              <Text className="mb-2 text-sm font-medium text-foreground">
                Doctor's Notes <Text className="text-muted-foreground">(optional)</Text>
              </Text>
              <TextInput
                value={doctorNotes}
                onChangeText={setDoctorNotes}
                placeholder="Add clinical observations or recommendations..."
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                maxLength={1000}
                className="rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                style={{ minHeight: 92 }}
              />

              <Button
                className="mt-4 w-full"
                onPress={handleRunAnalysis}
                disabled={!selectedImage || isUploading}
                isLoading={isUploading}
              >
                {uploadPhase === 'uploading'
                  ? 'Uploading...'
                  : uploadPhase === 'analyzing'
                    ? 'Analyzing...'
                    : 'Run Analysis'}
              </Button>
            </CardContent>
          </Card>
        </View>

        <View className="mt-6 px-4">
          <Text className="mb-3 text-lg font-semibold text-foreground">Reports</Text>
          {scans.length > 0 ? (
            scans.map((scan) => (
              <TouchableOpacity
                key={scan.id}
                onPress={() => navigation.navigate('Results', { scanId: scan.id })}
                className="mb-3 rounded-xl border border-border bg-card p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">
                      {scan.diagnosis || 'Pending Analysis'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">{formatDate(scan.createdAt)}</Text>
                  </View>
                  {scan.severity ? (
                    <Badge variant={getSeverityBadgeVariant(scan.severity)}>
                      {scan.severity}
                    </Badge>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Card>
              <CardContent className="items-center py-8">
                <Ionicons name="document-text-outline" size={42} color="#94a3b8" />
                <Text className="mt-2 text-center text-muted-foreground">
                  No reports for this patient yet.
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
