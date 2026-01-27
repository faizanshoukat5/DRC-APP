import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../contexts/AuthContext';
import { PressableCard } from '../components/ui/Card';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { getScans, type Scan } from '../lib/api';
import { formatDate, getSeverityBadgeVariant } from '../lib/utils';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();

  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const data = await getScans(user.id);
      setScans(data);
    } catch (error) {
      console.error('Failed to load scans:', error);
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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  // Group scans by month
  const groupedScans = scans.reduce((groups, scan) => {
    const date = new Date(scan.createdAt);
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(scan);
    return groups;
  }, {} as Record<string, Scan[]>);

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
          <Text className="text-2xl font-bold text-foreground">Scan History</Text>
          <Text className="mt-1 text-muted-foreground">
            {scans.length} total {scans.length === 1 ? 'scan' : 'scans'}
          </Text>
        </View>

        {/* Scans List */}
        <View className="mt-6 px-6">
          {Object.keys(groupedScans).length > 0 ? (
            Object.entries(groupedScans).map(([monthYear, monthScans]) => (
              <View key={monthYear} className="mb-6">
                <Text className="mb-3 text-sm font-medium text-muted-foreground">
                  {monthYear}
                </Text>
                {monthScans.map((scan) => (
                  <PressableCard
                    key={scan.id}
                    className="mb-3"
                    onPress={() => navigation.navigate('Results', { scanId: scan.id })}
                  >
                    <View className="flex-row items-center">
                      {scan.imageUrl ? (
                        <Image
                          source={{ uri: scan.imageUrl }}
                          className="h-16 w-16 rounded-lg"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-16 w-16 items-center justify-center rounded-lg bg-muted">
                          <Ionicons name="eye" size={28} color="#6b7280" />
                        </View>
                      )}
                      <View className="ml-4 flex-1">
                        <Text className="font-medium text-foreground">
                          {scan.diagnosis || 'Pending Analysis'}
                        </Text>
                        <Text className="mt-0.5 text-sm text-muted-foreground">
                          {formatDate(scan.createdAt)}
                        </Text>
                        {scan.confidence && (
                          <Text className="mt-0.5 text-xs text-muted-foreground">
                            Confidence: {Math.round(scan.confidence * 100)}%
                          </Text>
                        )}
                      </View>
                      <View className="items-end">
                        {scan.severity && (
                          <Badge variant={getSeverityBadgeVariant(scan.severity)}>
                            {scan.severity}
                          </Badge>
                        )}
                        {scan.doctorNotes && (
                          <View className="mt-2 flex-row items-center">
                            <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                            <Text className="ml-1 text-xs text-green-600">Reviewed</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </PressableCard>
                ))}
              </View>
            ))
          ) : (
            <Card>
              <CardContent className="items-center py-12">
                <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
                <Text className="mt-4 text-center text-lg font-medium text-foreground">
                  No Scans Yet
                </Text>
                <Text className="mt-2 text-center text-muted-foreground">
                  Upload your first retinal scan to get started with AI-powered analysis.
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
