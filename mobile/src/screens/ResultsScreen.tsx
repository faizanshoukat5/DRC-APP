import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { getScan, type Scan } from '../lib/api';
import { formatDateTime, getSeverityBadgeVariant } from '../lib/utils';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Results'>;
type ResultsRouteProp = RouteProp<RootStackParamList, 'Results'>;

export default function ResultsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResultsRouteProp>();
  const { scanId } = route.params;

  const [scan, setScan] = useState<Scan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadScan = async () => {
      try {
        const data = await getScan(scanId);
        setScan(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load scan results');
      } finally {
        setIsLoading(false);
      }
    };

    loadScan();
  }, [scanId]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="mt-4 text-muted-foreground">Loading results...</Text>
      </SafeAreaView>
    );
  }

  if (error || !scan) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text className="mt-4 text-center text-lg font-medium text-foreground">
            Failed to Load Results
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            {error || 'Scan not found'}
          </Text>
          <Button
            className="mt-6"
            onPress={() => navigation.goBack()}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const confidence = scan.confidence ? Math.round(scan.confidence * 100) : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Scan Results</Text>
            <Text className="text-sm text-muted-foreground">
              {formatDateTime(scan.createdAt)}
            </Text>
          </View>
        </View>

        {/* Image */}
        <View className="mt-6 px-4">
          {scan.imageUrl ? (
            <Image
              source={{ uri: scan.imageUrl }}
              className="h-64 w-full rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <View className="h-64 w-full items-center justify-center rounded-xl bg-muted">
              <Ionicons name="eye" size={64} color="#9ca3af" />
              <Text className="mt-2 text-muted-foreground">No image available</Text>
            </View>
          )}
        </View>

        {/* Diagnosis Card */}
        <View className="mt-6 px-4">
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <View className="flex-row items-center justify-between">
                <CardTitle>AI Diagnosis</CardTitle>
                {scan.severity && (
                  <Badge variant={getSeverityBadgeVariant(scan.severity)}>
                    {scan.severity}
                  </Badge>
                )}
              </View>
            </CardHeader>
            <CardContent>
              <Text className="text-2xl font-bold text-foreground">
                {scan.diagnosis || 'Pending Analysis'}
              </Text>
              
              {confidence !== null && (
                <View className="mt-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">Confidence</Text>
                    <Text className="font-medium text-foreground">{confidence}%</Text>
                  </View>
                  <View className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <View
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${confidence}%` }}
                    />
                  </View>
                </View>
              )}
            </CardContent>
          </Card>
        </View>

        {/* Details */}
        <View className="mt-6 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Details</CardTitle>
            </CardHeader>
            <CardContent>
              {scan.analysisDetails ? (
                <Text className="text-foreground">{scan.analysisDetails}</Text>
              ) : (
                <Text className="text-muted-foreground">
                  Detailed analysis will be available once the AI completes processing.
                </Text>
              )}
            </CardContent>
          </Card>
        </View>

        {/* Doctor Notes */}
        {scan.doctorNotes && (
          <View className="mt-6 px-4">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <View className="flex-row items-center">
                  <Ionicons name="medical" size={20} color="#22c55e" />
                  <CardTitle className="ml-2 text-green-800">Doctor's Notes</CardTitle>
                </View>
              </CardHeader>
              <CardContent>
                <Text className="text-green-900">{scan.doctorNotes}</Text>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Recommendations */}
        <View className="mt-6 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Based on your scan results</CardDescription>
            </CardHeader>
            <CardContent>
              {scan.severity === 'normal' || scan.severity === 'healthy' ? (
                <View className="space-y-3">
                  <RecommendationItem
                    icon="checkmark-circle"
                    color="#22c55e"
                    text="Your scan appears normal. Continue regular checkups."
                  />
                  <RecommendationItem
                    icon="calendar"
                    color="#0ea5e9"
                    text="Schedule your next screening in 12 months."
                  />
                </View>
              ) : (
                <View className="space-y-3">
                  <RecommendationItem
                    icon="medical"
                    color="#f97316"
                    text="Consult with an ophthalmologist for detailed evaluation."
                  />
                  <RecommendationItem
                    icon="calendar"
                    color="#0ea5e9"
                    text="Schedule a follow-up appointment within 2-4 weeks."
                  />
                  <RecommendationItem
                    icon="heart"
                    color="#ef4444"
                    text="Monitor blood sugar levels and maintain a healthy lifestyle."
                  />
                </View>
              )}
            </CardContent>
          </Card>
        </View>

        {/* Disclaimer */}
        <View className="mt-6 mb-8 px-4">
          <View className="rounded-lg bg-yellow-50 p-4">
            <View className="flex-row items-start">
              <Ionicons name="warning" size={20} color="#eab308" />
              <Text className="ml-2 flex-1 text-xs text-yellow-800">
                This AI analysis is for screening purposes only and does not constitute
                a medical diagnosis. Please consult with a qualified healthcare provider
                for proper diagnosis and treatment.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RecommendationItem({
  icon,
  color,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  text: string;
}) {
  return (
    <View className="mb-3 flex-row items-start">
      <Ionicons name={icon} size={20} color={color} />
      <Text className="ml-2 flex-1 text-foreground">{text}</Text>
    </View>
  );
}
