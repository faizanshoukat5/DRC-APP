import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { uploadScan } from '../lib/api';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Analysis'>;

export default function AnalysisScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !user?.id) return;

    setIsUploading(true);
    try {
      const scanResult = await uploadScan(user.id, selectedImage);
      navigation.replace('Results', { scanId: scanResult.id });
    } catch (error: any) {
      Alert.alert('Analysis Failed', error.message || 'Failed to analyze image');
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#6b7280" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground">New Analysis</Text>
          <Text className="text-sm text-muted-foreground">
            Upload a retinal scan for AI analysis
          </Text>
        </View>
      </View>

      <View className="flex-1 justify-center px-4">
        {selectedImage ? (
          <View>
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Selected Image</CardTitle>
                <CardDescription>Ready for analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <Image
                  source={{ uri: selectedImage }}
                  className="h-64 w-full rounded-lg"
                  resizeMode="cover"
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <View className="mt-6 space-y-3">
              <Button
                onPress={handleAnalyze}
                isLoading={isUploading}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="ml-2 font-medium text-white">Analyzing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="scan" size={20} color="white" />
                    <Text className="ml-2 font-medium text-white">Start Analysis</Text>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onPress={handleClear}
                disabled={isUploading}
                className="mt-3 w-full"
              >
                <Ionicons name="refresh" size={20} color="#0ea5e9" />
                <Text className="ml-2 font-medium text-primary">Choose Different Image</Text>
              </Button>
            </View>
          </View>
        ) : (
          <View>
            {/* Upload Options */}
            <Card className="mb-6">
              <CardHeader className="items-center">
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Ionicons name="cloud-upload" size={40} color="#0ea5e9" />
                </View>
                <CardTitle className="text-center">Upload Retinal Scan</CardTitle>
                <CardDescription className="text-center">
                  Select an image from your gallery or take a new photo
                </CardDescription>
              </CardHeader>
            </Card>

            <View className="space-y-3">
              <Button onPress={handleTakePhoto} className="w-full">
                <Ionicons name="camera" size={20} color="white" />
                <Text className="ml-2 font-medium text-white">Take Photo</Text>
              </Button>

              <Button variant="outline" onPress={handleSelectImage} className="mt-3 w-full">
                <Ionicons name="images" size={20} color="#0ea5e9" />
                <Text className="ml-2 font-medium text-primary">Choose from Gallery</Text>
              </Button>
            </View>

            {/* Tips */}
            <View className="mt-8 rounded-lg bg-muted/50 p-4">
              <Text className="mb-2 font-medium text-foreground">Tips for best results:</Text>
              <View className="space-y-1">
                <TipItem text="Use a clear, well-lit retinal image" />
                <TipItem text="Ensure the image is in focus" />
                <TipItem text="Center the retina in the frame" />
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <View className="mb-1 flex-row items-center">
      <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
      <Text className="ml-2 text-sm text-muted-foreground">{text}</Text>
    </View>
  );
}
