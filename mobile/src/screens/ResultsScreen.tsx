import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  // `scan.confidence` is stored as INTEGER 0–100 in the `scans` table.
  const confidence =
    typeof scan.confidence === 'number' ? Math.round(scan.confidence) : null;
  const hasProbabilities =
    scan.probabilities && Object.keys(scan.probabilities).length > 0;
  const isLowConfidence = confidence !== null && confidence < 60;
  const isFailed = scan.inferenceMode === 'failed';

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

        {/* Failed-inference banner */}
        {isFailed && (
          <View className="mt-4 px-4">
            <View className="flex-row items-start rounded-lg border border-red-200 bg-red-50 p-3">
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
              <Text className="ml-2 flex-1 text-sm text-red-800">
                The AI model could not analyze this image. The fundus may be too
                blurry or unsuitable. Please retake the image with better focus
                and lighting.
              </Text>
            </View>
          </View>
        )}

        {/* Probability Distribution (only for real-ML rows) */}
        {hasProbabilities && (
          <View className="mt-6 px-4">
            <Card>
              <CardHeader>
                <CardTitle>Probability Distribution</CardTitle>
                <CardDescription>
                  Calibrated per-class confidence
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative'] as const).map(
                  (className) => {
                    const p = scan.probabilities?.[className] ?? 0;
                    return (
                      <View
                        key={className}
                        className="mb-3 flex-row items-center"
                      >
                        <Text className="w-24 text-sm text-foreground">
                          {className}
                        </Text>
                        <View className="mx-3 h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <View
                            className={`h-full rounded-full ${barColorClass(className)}`}
                            style={{ width: `${Math.max(0, Math.min(1, p)) * 100}%` }}
                          />
                        </View>
                        <Text className="w-14 text-right text-sm text-muted-foreground">
                          {(p * 100).toFixed(1)}%
                        </Text>
                      </View>
                    );
                  },
                )}
              </CardContent>
            </Card>
          </View>
        )}

        {/* Low-confidence warning */}
        {isLowConfidence && !isFailed && (
          <View className="mt-4 px-4">
            <View className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3">
              <View className="flex-row items-start">
                <Ionicons name="warning-outline" size={20} color="#d97706" />
                <Text className="ml-2 flex-1 text-sm text-amber-900">
                  Low confidence — strongly recommend specialist review.
                </Text>
              </View>
            </View>
          </View>
        )}

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

function barColorClass(className: string): string {
  switch (className) {
    case 'No DR':
      return 'bg-green-500';
    case 'Mild':
      return 'bg-yellow-500';
    case 'Moderate':
      return 'bg-orange-500';
    case 'Severe':
      return 'bg-red-500';
    case 'Proliferative':
      return 'bg-purple-500';
    default:
      return 'bg-primary';
  }
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
