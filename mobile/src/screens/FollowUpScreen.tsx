import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import {
  getScan,
  updateScanFollowUp,
  type FollowUpInput,
  type Scan,
} from '../lib/api';
import { formatDate, getSeverityBadgeVariant } from '../lib/utils';
import { useAuthContext } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FollowUp'>;
type RouteProps = RouteProp<RootStackParamList, 'FollowUp'>;

export default function FollowUpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuthContext();
  const isDoctor = user?.role === 'doctor';

  const [scan, setScan] = useState<Scan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dueDate, setDueDate] = useState(''); // YYYY-MM-DD; canonical wire format
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<FollowUpInput['status']>('needed');

  useEffect(() => {
    const loadScan = async () => {
      try {
        const data = await getScan(route.params.scanId);
        setScan(data);
        setDueDate(data?.followUpDueDate ?? '');
        setNotes(data?.followUpNotes ?? '');
        setStatus(data?.followUpStatus ?? 'needed');
      } catch (error: any) {
        Alert.alert('Could not load follow-up', error.message || 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    loadScan();
  }, [route.params.scanId]);

  const handleSave = async () => {
    if (!scan || !isDoctor) return;
    setIsSaving(true);
    try {
      await updateScanFollowUp(scan.id, { dueDate, notes, status });
      Alert.alert('Follow-up saved', 'The follow-up recommendation has been updated.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Save failed', error.message || 'Could not update follow-up.');
    } finally {
      setIsSaving(false);
    }
  };

  // YYYY-MM-DD ↔ Date conversions. We use UTC noon to dodge timezone
  // boundary issues where toISOString() could roll back to the previous day
  // for users in negative offsets.
  const dueDateAsDate = (() => {
    if (!dueDate) return new Date();
    const parsed = new Date(`${dueDate}T12:00:00`);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  })();

  const formatDueDateLabel = (iso: string) => {
    if (!iso) return 'Pick a date';
    const d = new Date(`${iso}T12:00:00`);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android closes the picker on any event; iOS keeps it inline.
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (!selected) return;
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    setDueDate(`${yyyy}-${mm}-${dd}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  if (!scan) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text className="mt-3 text-center font-medium text-foreground">Report not found</Text>
          <Button className="mt-5" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="flex-row items-center px-4 pt-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4" hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Follow-up</Text>
            <Text className="text-sm text-muted-foreground">
              {formatDate(scan.createdAt)}
            </Text>
          </View>
        </View>

        <View className="mt-6 px-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <View className="flex-row items-center justify-between">
                <CardTitle>Report Summary</CardTitle>
                {scan.severity ? (
                  <Badge variant={getSeverityBadgeVariant(scan.severity)}>
                    {scan.severity}
                  </Badge>
                ) : null}
              </View>
            </CardHeader>
            <CardContent>
              <Text className="text-lg font-semibold text-foreground">
                {scan.diagnosis || 'Pending Analysis'}
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                Confidence {Math.round(scan.confidence || 0)}%
              </Text>
            </CardContent>
          </Card>
        </View>

        <View className="mt-6 px-4">
          <Card>
            <CardHeader>
              <CardTitle>{isDoctor ? 'Manage Recommendation' : 'Recommendation'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="mb-2 text-sm font-medium text-foreground">Status</Text>
              <View className="mb-4 flex-row">
                {(['needed', 'scheduled', 'completed'] as const).map((item) => {
                  const active = status === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => isDoctor && setStatus(item)}
                      disabled={!isDoctor}
                      className="mr-2 rounded-full border px-3 py-2"
                      style={{
                        backgroundColor: active ? '#0ea5e9' : '#ffffff',
                        borderColor: active ? '#0ea5e9' : '#e2e8f0',
                      }}
                    >
                      <Text
                        className="text-xs font-medium capitalize"
                        style={{ color: active ? '#ffffff' : '#475569' }}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="mb-2 text-sm font-medium text-foreground">Due date</Text>
              <View className="mb-4 flex-row items-center">
                <TouchableOpacity
                  onPress={() => isDoctor && !isSaving && setShowDatePicker(true)}
                  disabled={!isDoctor || isSaving}
                  className="flex-1 flex-row items-center justify-between rounded-lg border border-input bg-background px-3 py-3"
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={dueDate ? '#0f172a' : '#94a3b8'}
                    />
                    <Text
                      className="ml-2 text-base"
                      style={{ color: dueDate ? '#0f172a' : '#94a3b8' }}
                    >
                      {formatDueDateLabel(dueDate)}
                    </Text>
                  </View>
                  {isDoctor && !isSaving && (
                    <Ionicons name="chevron-down" size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
                {dueDate && isDoctor && !isSaving && (
                  <TouchableOpacity
                    onPress={() => setDueDate('')}
                    className="ml-2 rounded-lg p-2"
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={dueDateAsDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}

              {Platform.OS === 'ios' && showDatePicker && (
                <View className="mb-4 flex-row justify-end">
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    className="rounded-lg bg-primary px-4 py-2"
                  >
                    <Text className="font-medium text-white">Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text className="mb-2 text-sm font-medium text-foreground">Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                editable={isDoctor && !isSaving}
                placeholder="Recommended follow-up plan..."
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                maxLength={1000}
                className="rounded-lg border border-input bg-background px-3 py-3 text-foreground"
                style={{ minHeight: 120 }}
              />

              {isDoctor ? (
                <Button className="mt-4 w-full" onPress={handleSave} isLoading={isSaving}>
                  Save Follow-up
                </Button>
              ) : (
                <Text className="mt-4 text-sm text-muted-foreground">
                  Contact your doctor if you need to change this follow-up plan.
                </Text>
              )}
            </CardContent>
          </Card>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
