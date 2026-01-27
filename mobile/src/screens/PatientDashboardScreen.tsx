import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { PressableCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { getScans, getMyDoctor, type Scan } from '../lib/api';
import { formatDate, getSeverityBadgeVariant } from '../lib/utils';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

export default function PatientDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();

  const [scans, setScans] = useState<Scan[]>([]);
  const [doctor, setDoctor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load doctor first, then scans only if doctor exists (matches web logic)
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const doctorData = await getMyDoctor(user.id);
      setDoctor(doctorData);

      if (!doctorData) {
        // mirror web behavior: redirect to select-doctor if no doctor assigned
        navigation.navigate('SelectDoctor');
        setScans([]);
        return;
      }

      const scansData = await getScans(user.id);
      setScans(scansData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, navigation]);

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

  // Patients are not allowed to upload/take photos; only doctors can perform analysis.

  const recentScans = scans.slice(0, 3);
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }
  // compute latest scan and summary values similar to web
  const latestScan = scans[0];
  const totalScans = scans.length;
  const latestConfidence = latestScan?.confidence ? Math.round(latestScan.confidence * 100) : null;

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
          <Text className="text-2xl font-bold text-foreground">Patient Dashboard</Text>
          <Text className="mt-1 text-muted-foreground">Track your diabetic retinopathy screening results</Text>
        </View>

        {/* Patients cannot upload images; analysis is performed by doctors only. */}

        {/* Doctor Card */}
        <View className="mt-6 px-6">
          {doctor ? (
            <Card className="p-4 bg-gradient-to-r from-primary/10 to-blue-50 border-0">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Ionicons name="medical" size={20} color="#0ea5e9" />
                  </View>
                  <View>
                    <Text className="text-xs text-muted-foreground uppercase">Your Doctor</Text>
                    <Text className="font-semibold text-foreground">Dr. {doctor.name}</Text>
                    {doctor.specialty && <Text className="text-xs text-muted-foreground">{doctor.specialty}</Text>}
                  </View>
                </View>
                <Button variant="ghost" size="sm" onPress={() => navigation.navigate('SelectDoctor') } className="gap-2">
                  Change
                </Button>
              </View>
            </Card>
          ) : (
            // mirror web redirect: this branch should be rare because we redirect earlier
            <Card>
              <CardContent>
                <Text className="text-sm text-muted-foreground">No doctor assigned.</Text>
                <Button variant="outline" onPress={() => navigation.navigate('SelectDoctor')} className="mt-3">Select Doctor</Button>
              </CardContent>
            </Card>
          )}
        </View>

        {/* Stats */}
        <View className="mt-6 px-6 grid grid-cols-2 gap-3 flex-row">
          <Card className="mr-3 flex-1 bg-gradient-to-br from-slate-50 to-slate-100 border-0">
            <CardContent className="flex-row items-center py-4">
              <View className="mr-3 h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Ionicons name="document-text" size={20} color="#0ea5e9" />
              </View>
              <View>
                <Text className="text-2xl font-bold text-foreground">{totalScans}</Text>
                <Text className="text-xs text-muted-foreground">Total Reports</Text>
              </View>
            </CardContent>
          </Card>

          <Card className="flex-1 bg-gradient-to-br from-emerald-50 to-teal-50 border-0">
            <CardContent className="flex-row items-center py-4">
              <View className="mr-3 h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Ionicons name="heart" size={20} color="#22c55e" />
              </View>
              <View>
                <Text className="text-2xl font-bold text-foreground">{latestConfidence ?? '--'}%</Text>
                <Text className="text-xs text-muted-foreground">Last Confidence</Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Latest Result Summary */}
        {latestScan && (
          <Card className="mt-6 mx-6 overflow-hidden border-0 shadow-lg">
            <View className="bg-gradient-to-r from-slate-900 to-slate-800 p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="eye" size={18} color="#0ea5e9" />
                  <Text className="text-sm font-medium text-white">Latest Screening</Text>
                </View>
                <Badge variant={getSeverityBadgeVariant(latestScan.severity)}>
                  {latestScan.severity}
                </Badge>
              </View>
              <Text className="text-xl font-bold text-white">{latestScan.diagnosis}</Text>
              <View className="flex-row gap-4 mt-2">
                <Text className="text-xs text-slate-300">{formatDate(latestScan.createdAt)}</Text>
              </View>
            </View>
            <View className="p-4 bg-white">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm text-slate-600">AI Confidence</Text>
                <Text className="text-sm font-semibold">{latestConfidence ?? '--'}%</Text>
              </View>
              <View className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <View style={{ width: `${latestConfidence ?? 0}%` }} className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full" />
              </View>
              <View className="flex-row gap-2 mt-4">
                <Button className="flex-1" onPress={() => navigation.navigate('Results', { scanId: latestScan.id })}>
                  View Details
                </Button>
                <Button variant="outline" onPress={() => navigation.navigate('Results', { scanId: latestScan.id })}>
                  Download
                </Button>
              </View>
            </View>
          </Card>
        )}

        {/* Report History */}
        <View className="mt-6 px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">Report History</Text>
            <Badge variant="secondary">{totalScans} reports</Badge>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#0ea5e9" />
          ) : scans && scans.length > 0 ? (
            scans.map((scan) => (
              <PressableCard key={scan.id} className="mb-3" onPress={() => navigation.navigate('Results', { scanId: scan.id })}>
                <View className="flex-row items-center gap-3">
                  {scan.imageUrl ? (
                    <Image source={{ uri: scan.imageUrl }} className="h-14 w-14 rounded-lg" resizeMode="cover" />
                  ) : (
                    <View className="h-14 w-14 rounded-xl bg-muted items-center justify-center">
                      <Ionicons name="eye" size={24} color="#6b7280" />
                    </View>
                  )}
                  <View className="flex-1 min-w-0">
                    <Text className="font-medium text-sm text-foreground truncate">{scan.diagnosis}</Text>
                    <View className="flex-row items-center gap-3 mt-0.5">
                      <Text className="text-xs text-muted-foreground">{formatDate(scan.createdAt)}</Text>
                      <Badge variant={getSeverityBadgeVariant(scan.severity)}>{scan.severity}</Badge>
                    </View>
                  </View>
                  <Button variant="ghost" size="sm" onPress={() => navigation.navigate('Results', { scanId: scan.id })}>View</Button>
                </View>
              </PressableCard>
            ))
          ) : (
            <Card className="p-8 text-center border-dashed border-2">
              <CardContent className="items-center">
                <Ionicons name="eye" size={48} color="#9ca3af" />
                <Text className="mt-2 text-center text-muted-foreground">No Reports Yet</Text>
                <Text className="text-sm text-muted-foreground max-w-xs mx-auto">Your diabetic retinopathy screening reports will appear here after your doctor uploads them.</Text>
              </CardContent>
            </Card>
          )}
        </View>

        {/* Quick Actions */}
        <View className="mt-6 mb-8 px-6">
          <Text className="mb-3 text-lg font-semibold text-foreground">Quick Actions</Text>
          <View className="flex-row flex-wrap">
            <QuickActionButton icon="help-circle-outline" label="FAQ" onPress={() => navigation.navigate('FAQ')} />
            <QuickActionButton icon="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableCard className="mr-3 mb-3 items-center p-4" onPress={onPress}>
      <Ionicons name={icon} size={24} color="#0ea5e9" />
      <Text className="mt-1 text-sm text-foreground">{label}</Text>
    </PressableCard>
  );
}
