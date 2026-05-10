import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { getScan, getScans, updateScanDoctorNotes, getProfileName, type Scan } from '../lib/api';
import { getProgressionStatus } from '../lib/progression';
import { recolorFundus } from '../lib/mlApi';
import { useAuthContext } from '../contexts/AuthContext';
import { formatDateTime, getSeverityBadgeVariant } from '../lib/utils';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Results'>;
type ResultsRouteProp = RouteProp<RootStackParamList, 'Results'>;

export default function ResultsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResultsRouteProp>();
  const { scanId } = route.params;
  const { user } = useAuthContext();
  const isDoctor = user?.role === 'doctor';

  const [scan, setScan] = useState<Scan | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSharingReport, setIsSharingReport] = useState(false);
  const [imageView, setImageView] = useState<'original' | 'heatmap'>('original');
  const [selectedColormap, setSelectedColormap] = useState<string | null>(null);
  const [colormapCache, setColormapCache] = useState<Record<string, string>>({});
  const [colormapLoading, setColormapLoading] = useState(false);
  const [previousScan, setPreviousScan] = useState<Scan | null>(null);

  useEffect(() => {
    const loadScan = async () => {
      try {
        const data = await getScan(scanId);
        setScan(data);
        setNotesDraft(data?.doctorNotes ?? '');
        // Fetch the patient's display name for the report header + filename.
        // Done in parallel-ish (fire-and-forget non-blocking) so the screen
        // shows scan content immediately even if the profile fetch is slow
        // or fails (RLS denial → null, treated as "Patient" downstream).
        if (data?.patientId) {
          getProfileName(data.patientId)
            .then((name) => setPatientName(name))
            .catch(() => setPatientName(null));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load scan results');
      } finally {
        setIsLoading(false);
      }
    };

    loadScan();
  }, [scanId]);

  // After the main scan loads, fetch all scans for this patient to find the prior visit.
  useEffect(() => {
    if (!scan?.patientId) return;
    setPreviousScan(null);
    getScans(scan.patientId)
      .then((all) => {
        // all is ordered newest-first from the query
        const idx = all.findIndex((s) => s.id === scan.id);
        setPreviousScan(idx >= 0 ? (all[idx + 1] ?? null) : null);
      })
      .catch(() => {});
  }, [scan?.id, scan?.patientId]);

  const handleSaveNotes = async () => {
    if (!scan) return;
    setIsSavingNotes(true);
    try {
      await updateScanDoctorNotes(scan.id, notesDraft);
      setScan({ ...scan, doctorNotes: notesDraft.trim() });
      setIsEditingNotes(false);
    } catch (err: any) {
      Alert.alert('Could not save notes', err.message || 'Unknown error');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleShareReport = async () => {
    if (!scan) return;

    setIsSharingReport(true);
    try {
      // Render HTML through the OS's native PDF engine (PdfDocument on
      // Android, WKWebView print on iOS). Handles images, text wrapping,
      // page breaks correctly — manual byte-stuffing of PDFs from JS does
      // not, since String.length counts UTF-16 units, not bytes, and the
      // xref offsets end up wrong.
      const html = buildReportHtml(scan, confidence, patientName);
      const { uri: tempUri } = await Print.printToFileAsync({
        html,
        base64: false,
        // Letter-ish 612x792pt; sufficient for one-page report
        width: 612,
        height: 792,
      });

      // expo-print writes to <cacheDir>/Print/<uuid>.pdf — copy/rename it to
      // a human-readable filename so the share sheet and the receiving app
      // (Drive, Email, WhatsApp, etc.) all show something meaningful.
      const friendlyName = buildReportFilename(scan, patientName);
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      const renamedUri = dir ? `${dir}${friendlyName}` : tempUri;
      if (renamedUri !== tempUri) {
        try {
          // Remove a stale copy from a previous share so copyAsync doesn't error
          await FileSystem.deleteAsync(renamedUri, { idempotent: true });
          await FileSystem.copyAsync({ from: tempUri, to: renamedUri });
        } catch {
          // If rename fails for any reason, fall back to the temp file —
          // the share still works, just with the UUID name.
        }
      }
      const finalUri = renamedUri;

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          'Sharing not available',
          `Report saved to ${finalUri}. Sharing is not supported on this device.`,
        );
        return;
      }

      await Sharing.shareAsync(finalUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'AEYE report',
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      Alert.alert('Could not share report', err.message || 'Failed to create report PDF.');
    } finally {
      setIsSharingReport(false);
    }
  };

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
  const hasDistinctHeatmap = !!scan.heatmapUrl && scan.heatmapUrl !== scan.imageUrl;

  const progression = previousScan
    ? getProgressionStatus(
        scan.rawClassId,
        scan.severity ?? '',
        previousScan.rawClassId,
        previousScan.severity ?? '',
      )
    : null;

  // Build a colormap → URL map from pre-rendered storage URLs (Turbo + Inferno).
  const heatmapUrlMap: Record<string, string> = (() => {
    if (scan.heatmapUrls && Object.keys(scan.heatmapUrls).length > 0) return scan.heatmapUrls;
    if (scan.heatmapUrl) return { [scan.colormap || 'turbo']: scan.heatmapUrl };
    return {};
  })();

  const ALL_COLORMAPS = ['turbo', 'inferno', 'magma', 'viridis', 'jet'] as const;
  const COLORMAP_LABELS: Record<string, string> = {
    turbo: 'Turbo', inferno: 'Inferno', magma: 'Magma', viridis: 'Viridis', jet: 'Jet',
  };

  const defaultColormap = (scan.colormap && heatmapUrlMap[scan.colormap] ? scan.colormap : Object.keys(heatmapUrlMap)[0]) ?? 'turbo';
  const activeColormap =
    selectedColormap && (heatmapUrlMap[selectedColormap] || colormapCache[selectedColormap])
      ? selectedColormap
      : defaultColormap;
  const activeHeatmapUrl =
    colormapCache[activeColormap] ?? heatmapUrlMap[activeColormap] ?? scan.heatmapUrl;
  const showColormapToggle = imageView === 'heatmap' && hasDistinctHeatmap && scan.modelKey === 'rp_v1';

  const handleColormapChange = async (cm: string) => {
    setSelectedColormap(cm);
    if (heatmapUrlMap[cm] || colormapCache[cm]) return;
    setColormapLoading(true);
    try {
      const b64 = await recolorFundus(scan.imageUrl, cm);
      setColormapCache((prev) => ({ ...prev, [cm]: `data:image/png;base64,${b64}` }));
    } catch (err: any) {
      console.error('Recolor failed:', err);
    } finally {
      setColormapLoading(false);
    }
  };

  const displayUri =
    imageView === 'heatmap' && hasDistinctHeatmap ? activeHeatmapUrl : scan.imageUrl;

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

        {/* Image with optional Original/Heatmap toggle */}
        <View className="mt-6 px-4">
          {hasDistinctHeatmap && (
            <View className="mb-3 flex-row flex-wrap items-center gap-2">
              <View className="flex-row rounded-full bg-muted p-1">
                <TouchableOpacity
                  onPress={() => setImageView('original')}
                  className={`rounded-full px-4 py-1.5 ${
                    imageView === 'original' ? 'bg-primary/10' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      imageView === 'original' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Original
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setImageView('heatmap')}
                  className={`rounded-full px-4 py-1.5 ${
                    imageView === 'heatmap' ? 'bg-primary/10' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      imageView === 'heatmap' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Heatmap
                  </Text>
                </TouchableOpacity>
              </View>

              {showColormapToggle && (
                <View className="flex-row flex-wrap gap-1 rounded-full bg-muted p-1">
                  {ALL_COLORMAPS.map((cm) => {
                    const active = activeColormap === cm;
                    const isLoadingThis = colormapLoading && active && !heatmapUrlMap[cm] && !colormapCache[cm];
                    return (
                      <TouchableOpacity
                        key={cm}
                        onPress={() => handleColormapChange(cm)}
                        disabled={colormapLoading && !active}
                        className={`rounded-full px-3 py-1.5 ${active ? 'bg-primary/10' : ''}`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            active ? 'text-primary' : 'text-muted-foreground'
                          } ${colormapLoading && !active ? 'opacity-40' : ''}`}
                        >
                          {isLoadingThis ? '…' : COLORMAP_LABELS[cm]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {displayUri ? (
            <View className="relative h-64 w-full">
              <Image
                source={{ uri: displayUri }}
                className={`h-64 w-full rounded-xl ${colormapLoading ? 'opacity-40' : 'opacity-100'}`}
                resizeMode="cover"
              />
              {colormapLoading && (
                <View className="absolute inset-0 items-center justify-center">
                  <View className="rounded-full bg-black/60 px-4 py-2">
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View className="h-64 w-full items-center justify-center rounded-xl bg-muted">
              <Ionicons name="eye" size={64} color="#9ca3af" />
              <Text className="mt-2 text-muted-foreground">No image available</Text>
            </View>
          )}

          {hasDistinctHeatmap && imageView === 'heatmap' && (
            <Text className="mt-2 text-xs text-muted-foreground">
              Warm (red/yellow) areas show regions the AI focused on for this diagnosis.
            </Text>
          )}
        </View>

        {/* Progression alert */}
        {progression?.status === 'worsened' && (
          <View className="mt-4 px-4">
            <View className="flex-row items-start rounded-lg border border-red-200 bg-red-50 p-3">
              <Ionicons name="trending-up" size={20} color="#dc2626" />
              <View className="ml-2 flex-1">
                <Text className="text-sm font-semibold text-red-900">
                  DR Worsened: {progression.from} → {progression.to}
                </Text>
                <Text className="mt-0.5 text-xs text-red-700">
                  Increased by {progression.deltaSteps} class step{progression.deltaSteps > 1 ? 's' : ''} since last visit
                </Text>
              </View>
            </View>
          </View>
        )}
        {progression?.status === 'improved' && (
          <View className="mt-4 px-4">
            <View className="flex-row items-start rounded-lg border border-green-200 bg-green-50 p-3">
              <Ionicons name="trending-down" size={20} color="#16a34a" />
              <View className="ml-2 flex-1">
                <Text className="text-sm font-semibold text-green-900">
                  DR Improved: {progression.from} → {progression.to}
                </Text>
                <Text className="mt-0.5 text-xs text-green-700">
                  Decreased by {progression.deltaSteps} class step{progression.deltaSteps > 1 ? 's' : ''} since last visit
                </Text>
              </View>
            </View>
          </View>
        )}

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

              {scan.modelLabel && (
                <View className="mt-3 flex-row items-center">
                  <Ionicons name="hardware-chip-outline" size={14} color="#64748b" />
                  <Text className="ml-1.5 text-xs text-muted-foreground">
                    Analyzed by{' '}
                    <Text className="font-medium text-foreground">{scan.modelLabel}</Text>
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
          <Button
            variant="outline"
            className="mt-3 w-full"
            onPress={handleShareReport}
            isLoading={isSharingReport}
          >
            <Ionicons name="share-outline" size={18} color="#0ea5e9" />
            <Text className="ml-2 font-medium text-primary">Share PDF Report</Text>
          </Button>
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

        {/* Doctor Notes — read-only for patients, editable for doctors */}
        {(scan.doctorNotes || isDoctor) && (
          <View className="mt-6 px-4">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="medical" size={20} color="#22c55e" />
                    <CardTitle className="ml-2 text-green-800">Doctor's Notes</CardTitle>
                  </View>
                  {isDoctor && !isEditingNotes && (
                    <TouchableOpacity
                      onPress={() => {
                        setNotesDraft(scan.doctorNotes ?? '');
                        setIsEditingNotes(true);
                      }}
                      className="flex-row items-center"
                      hitSlop={8}
                    >
                      <Ionicons
                        name={scan.doctorNotes ? 'pencil' : 'add-circle-outline'}
                        size={18}
                        color="#15803d"
                      />
                      <Text className="ml-1 text-sm font-medium text-green-800">
                        {scan.doctorNotes ? 'Edit' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </CardHeader>
              <CardContent>
                {isEditingNotes ? (
                  <View>
                    <TextInput
                      value={notesDraft}
                      onChangeText={setNotesDraft}
                      placeholder="Add clinical observations or recommendations..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      textAlignVertical="top"
                      maxLength={1000}
                      editable={!isSavingNotes}
                      className="rounded-md border border-green-300 bg-white px-3 py-2 text-foreground"
                      style={{ minHeight: 96 }}
                    />
                    <Text className="mt-1 text-right text-xs text-green-700">
                      {notesDraft.length}/1000
                    </Text>
                    <View className="mt-3 flex-row justify-end">
                      <TouchableOpacity
                        onPress={() => {
                          setNotesDraft(scan.doctorNotes ?? '');
                          setIsEditingNotes(false);
                        }}
                        disabled={isSavingNotes}
                        className="mr-3 rounded-md px-4 py-2"
                      >
                        <Text className="text-sm font-medium text-muted-foreground">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveNotes}
                        disabled={isSavingNotes}
                        className="rounded-md bg-green-600 px-4 py-2"
                      >
                        {isSavingNotes ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text className="text-sm font-medium text-white">Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : scan.doctorNotes ? (
                  <Text className="text-green-900">{scan.doctorNotes}</Text>
                ) : (
                  <Text className="italic text-green-700">No notes yet — tap Add to record observations.</Text>
                )}
              </CardContent>
            </Card>
          </View>
        )}

        {/* Follow-up */}
        {(isDoctor || scan.followUpDueDate || scan.followUpNotes) && (
          <View className="mt-6 px-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={20} color="#0284c7" />
                    <CardTitle className="ml-2 text-blue-900">Follow-up</CardTitle>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('FollowUp', { scanId: scan.id })}
                    className="flex-row items-center"
                    hitSlop={8}
                  >
                    <Ionicons
                      name={isDoctor ? 'pencil' : 'open-outline'}
                      size={18}
                      color="#0369a1"
                    />
                    <Text className="ml-1 text-sm font-medium text-blue-900">
                      {isDoctor ? 'Manage' : 'View'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </CardHeader>
              <CardContent>
                {scan.followUpDueDate || scan.followUpNotes ? (
                  <View>
                    <Text className="text-sm text-blue-900">
                      Due date:{' '}
                      <Text className="font-semibold">
                        {scan.followUpDueDate || 'Not set'}
                      </Text>
                    </Text>
                    {scan.followUpStatus ? (
                      <Text className="mt-1 text-sm capitalize text-blue-900">
                        Status: {scan.followUpStatus}
                      </Text>
                    ) : null}
                    {scan.followUpNotes ? (
                      <Text className="mt-2 text-sm text-blue-900">{scan.followUpNotes}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text className="text-sm text-blue-900">
                    No follow-up has been recorded yet.
                  </Text>
                )}
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

function buildReportFilename(scan: Scan, patientName: string | null): string {
  // Format: AEYE_<PatientName>_<Diagnosis>_<YYYY-MM-DD>_<scanIdShort>.pdf
  // Example: AEYE_Jane-Doe_Mild-DR_2026-05-09_a1b2c3d4.pdf
  // Goal: short enough to fit on one line in share sheets, sortable by date
  // when downloaded into a folder, unique per scan so re-shares don't
  // collide, and immediately tells you whose report it is when archived.
  const sanitize = (s: string) =>
    s
      .normalize('NFKD')                    // strip accents to ASCII forms
      .replace(/[^a-zA-Z0-9]+/g, '-')       // collapse anything non-alphanumeric to a dash
      .replace(/^-+|-+$/g, '');             // trim leading/trailing dashes

  const date = new Date(scan.createdAt);
  const dateStr = isNaN(date.getTime())
    ? 'unknown-date'
    : date.toISOString().slice(0, 10);     // YYYY-MM-DD

  const namePart = patientName ? sanitize(patientName).slice(0, 32) : '';
  const diagnosis = sanitize(scan.diagnosis || scan.severity || 'report') || 'report';
  const idShort = String(scan.id).replace(/-/g, '').slice(0, 8);

  // Skip the patient segment cleanly if the profile fetch failed so we
  // don't end up with `AEYE__Mild-DR_...` (double underscore).
  const segments = ['AEYE', namePart, diagnosis, dateStr, idShort].filter(Boolean);
  return `${segments.join('_')}.pdf`;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function severityChip(severity: string | undefined): string {
  const palette: Record<string, { bg: string; fg: string }> = {
    normal:        { bg: '#dcfce7', fg: '#166534' },
    mild:          { bg: '#fef9c3', fg: '#854d0e' },
    moderate:      { bg: '#fed7aa', fg: '#9a3412' },
    severe:        { bg: '#fecaca', fg: '#991b1b' },
    proliferative: { bg: '#fbcfe8', fg: '#9d174d' },
    unknown:       { bg: '#e2e8f0', fg: '#334155' },
  };
  const key = (severity || 'unknown').toLowerCase();
  const c = palette[key] || palette.unknown;
  return `<span class="chip" style="background:${c.bg};color:${c.fg}">${escapeHtml(severity || 'unknown')}</span>`;
}

function probabilityRows(scan: Scan): string {
  if (!scan.probabilities || Object.keys(scan.probabilities).length === 0) return '';
  const order = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative'];
  const rows = order
    .map((cls) => {
      const p = scan.probabilities?.[cls] ?? scan.probabilities?.[`${cls} DR`] ?? 0;
      const pct = (p * 100).toFixed(1);
      return `
        <tr>
          <td class="prob-name">${escapeHtml(cls)}</td>
          <td class="prob-bar"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></td>
          <td class="prob-pct">${pct}%</td>
        </tr>`;
    })
    .join('');
  return `
    <h2>Probability distribution</h2>
    <table class="probs"><tbody>${rows}</tbody></table>`;
}

function buildReportHtml(
  scan: Scan,
  confidence: number | null,
  patientName: string | null,
): string {
  const date = escapeHtml(formatDateTime(scan.createdAt));
  const diagnosis = escapeHtml(scan.diagnosis || 'Pending Analysis');
  const confText = confidence !== null ? `${confidence}%` : 'Not available';
  const patientRow = patientName
    ? `<tr><th>Patient</th><td>${escapeHtml(patientName)}</td></tr>`
    : '';
  const modelRow = scan.modelLabel
    ? `<tr><th>Model</th><td>${escapeHtml(scan.modelLabel)}</td></tr>`
    : '';
  const notesBlock = scan.doctorNotes
    ? `<h2>Doctor's notes</h2><p class="notes">${escapeHtml(scan.doctorNotes)}</p>`
    : '';
  const followUpBlock = (scan.followUpDueDate || scan.followUpNotes)
    ? `<h2>Follow-up</h2>
       ${scan.followUpDueDate ? `<p><strong>Due:</strong> ${escapeHtml(scan.followUpDueDate)}</p>` : ''}
       ${scan.followUpNotes ? `<p>${escapeHtml(scan.followUpNotes)}</p>` : ''}`
    : '';

  const imageBlock = scan.imageUrl
    ? `<div class="img-row">
         <div class="img-cell">
           <div class="img-label">Original fundus</div>
           <img src="${escapeHtml(scan.imageUrl)}" />
         </div>
         ${scan.heatmapUrl && scan.heatmapUrl !== scan.imageUrl
           ? `<div class="img-cell">
                <div class="img-label">AI attention heatmap</div>
                <img src="${escapeHtml(scan.heatmapUrl)}" />
              </div>`
           : ''}
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 32px 36px;
    font-size: 12px;
    line-height: 1.45;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0ea5e9; padding-bottom: 12px; margin-bottom: 18px; }
  .brand { font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px; }
  .tagline { font-size: 11px; color: #64748b; margin-top: 2px; }
  .meta { font-size: 10px; color: #64748b; text-align: right; }
  h1 { font-size: 16px; margin: 16px 0 6px; color: #0f172a; }
  h2 { font-size: 13px; margin: 18px 0 6px; color: #0f172a; }
  table.kv { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.kv th { text-align: left; width: 130px; color: #64748b; font-weight: 500; padding: 4px 0; }
  table.kv td { padding: 4px 0; color: #0f172a; }
  .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
  .img-row { display: flex; gap: 12px; margin-top: 8px; }
  .img-cell { flex: 1; }
  .img-label { font-size: 10px; color: #64748b; margin-bottom: 4px; }
  img { width: 100%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0; }
  table.probs { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.probs td { padding: 5px 4px; vertical-align: middle; }
  .prob-name { width: 110px; font-weight: 500; }
  .prob-pct { width: 60px; text-align: right; color: #475569; }
  .bar-track { background: #f1f5f9; height: 8px; border-radius: 999px; overflow: hidden; }
  .bar-fill { background: #0ea5e9; height: 100%; border-radius: 999px; }
  .notes { background: #f0fdf4; border-left: 3px solid #10b981; padding: 8px 10px; border-radius: 4px; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; line-height: 1.5; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">AEYE</div>
      <div class="tagline">AI-guided diabetic retinopathy screening</div>
    </div>
    <div class="meta">
      Report ID: ${escapeHtml(scan.id)}<br/>
      ${date}
    </div>
  </div>

  <h1>Screening result</h1>
  <table class="kv">
    ${patientRow}
    <tr><th>Diagnosis</th><td><strong>${diagnosis}</strong></td></tr>
    <tr><th>Severity</th><td>${severityChip(scan.severity)}</td></tr>
    <tr><th>Confidence</th><td>${escapeHtml(confText)}</td></tr>
    ${modelRow}
  </table>

  ${imageBlock}
  ${probabilityRows(scan)}
  ${notesBlock}
  ${followUpBlock}

  <div class="footer">
    This report was generated by AEYE's AI screening system. The
    analysis is for screening purposes only and does not constitute a
    medical diagnosis. Please consult a qualified ophthalmologist for
    diagnosis and treatment decisions.
  </div>
</body>
</html>`;
}
