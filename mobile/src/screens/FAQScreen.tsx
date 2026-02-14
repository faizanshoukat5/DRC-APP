import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FAQ'>;

const faqCategories = [
  {
    title: 'General',
    icon: 'help-circle',
    colorClass: 'bg-primary/10',
    questions: [
      {
        q: 'What is Diabetic Retinopathy Detection and Stage Classification (RetinaAI)?',
        a:
          'Diabetic Retinopathy Detection and Stage Classification (RetinaAI) is an AI-powered diabetic retinopathy detection platform. It analyzes fundus (eye) images to detect signs of diabetic retinopathy, providing severity grades, confidence scores, and explainable heatmaps to help doctors and patients understand the results.',
      },
      {
        q: 'What is diabetic retinopathy?',
        a:
          'Diabetic retinopathy is an eye condition that can affect people with diabetes. High blood sugar levels can damage the blood vessels in the retina, potentially leading to vision loss if untreated. Early detection through regular screening is crucial.',
      },
      {
        q: 'How accurate is the AI analysis?',
        a:
          'Our AI model has been trained on thousands of clinically validated fundus images and achieves high accuracy in detecting diabetic retinopathy. However, all results should be reviewed by a qualified healthcare professional for final diagnosis and treatment decisions.',
      },
    ],
  },
  {
    title: 'For Patients',
    icon: 'person',
    colorClass: 'bg-emerald-100',
    questions: [
      {
        q: 'How do I get started as a patient?',
        a:
          "Simply create an account by selecting 'Patient' during signup, fill in your details, and once registered, you'll be prompted to select an approved doctor from our network. Your doctor will then be able to upload and share your fundus scan results with you.",
      },
      {
        q: 'Can I upload my own fundus images?',
        a:
          'Currently, fundus image uploads are handled by your assigned doctor to ensure image quality and proper clinical workflow. You can view all your scan results, download reports, and track your eye health history through your patient dashboard.',
      },
      {
        q: 'How do I view my scan results?',
        a:
          'After your doctor uploads and analyzes your fundus images, the results will appear in your Patient Dashboard. You can see the severity grade, AI confidence score, heatmap visualizations, and download PDF reports for your records.',
      },
      {
        q: 'Can I change my assigned doctor?',
        a:
          'Yes, you can change your assigned doctor through the Select Doctor page. This allows you to choose from other approved doctors in our network if needed.',
      },
    ],
  },
  {
    title: 'For Doctors',
    icon: 'medical',
    colorClass: 'bg-blue-100',
    questions: [
      {
        q: 'How do I register as a doctor?',
        a:
          "Select 'Doctor' during signup and provide your medical license number, specialty, and other required information. Your account will be reviewed by our admin team for verification. Once approved, you'll have full access to the doctor dashboard.",
      },
      {
        q: 'How long does doctor approval take?',
        a:
          "Doctor approval typically takes 1-3 business days. Our admin team verifies your credentials to ensure platform security and patient safety. You'll be notified once your account is approved.",
      },
      {
        q: 'How do I upload patient scans?',
        a:
          'From your Doctor Dashboard, select a patient from your assigned patients list, then use the upload feature to submit fundus images. The AI will analyze the images and generate results including severity grade, confidence score, and heatmaps within seconds.',
      },
      {
        q: 'Can I add notes to patient reports?',
        a:
          'Yes, you can add clinical notes and observations to each scan report. These notes are visible to both you and the patient, helping provide context and recommendations alongside the AI analysis.',
      },
    ],
  },
  {
    title: 'Technical & Security',
    icon: 'shield-checkmark',
    colorClass: 'bg-amber-100',
    questions: [
      {
        q: 'Is my data secure?',
        a:
          'Yes, we take data security seriously. All data is encrypted in transit and at rest. We use secure cloud infrastructure and follow healthcare data protection best practices. Patient data is only accessible to the assigned doctor and the patient themselves.',
      },
      {
        q: 'What image formats are supported?',
        a:
          'We support common image formats including JPEG, PNG, and TIFF. For best results, use high-resolution fundus images captured with standard fundus cameras. The AI model works best with clear, well-lit images.',
      },
      {
        q: 'How fast are the results?',
        a:
          'AI analysis typically completes in under 45 seconds. You\'ll see the severity grade, confidence score, and heatmap visualization as soon as processing is complete.',
      },
      {
        q: 'Can I download my reports?',
        a:
          'Yes, both patients and doctors can download PDF reports for each scan. These reports include the original image, AI analysis results, heatmaps, and any clinical notes added by the doctor.',
      },
    ],
  },
  {
    title: 'Understanding Results',
    icon: 'document-text',
    colorClass: 'bg-purple-100',
    questions: [
      {
        q: 'What do the severity grades mean?',
        a:
          'The AI provides severity grades from No DR (no diabetic retinopathy detected) to Severe (advanced diabetic retinopathy). Grades include: No DR, Mild, Moderate, and Severe. Higher grades indicate more advanced disease requiring urgent medical attention.',
      },
      {
        q: 'What is the confidence score?',
        a:
          'The confidence score (0-100%) indicates how certain the AI model is about its prediction. Higher scores suggest more reliable results. Lower confidence scores may indicate image quality issues or borderline cases that require careful clinical review.',
      },
      {
        q: 'What are heatmaps?',
        a:
          'Heatmaps are visual overlays on the fundus image that highlight areas the AI identified as important for its diagnosis. Red/warm areas indicate regions with potential abnormalities, helping doctors understand and verify the AI\'s analysis.',
      },
      {
        q: 'Should I rely solely on AI results?',
        a:
          'No. While our AI is a powerful screening tool, it should be used to assist—not replace—professional medical judgment. Always consult with your doctor for final diagnosis, treatment recommendations, and follow-up care.',
      },
    ],
  },
];

export default function FAQScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [expanded, setExpanded] = useState<Record<string, number | null>>({});

  const toggle = (category: string, index: number) => {
    setExpanded((prev) => ({ ...prev, [category]: prev[category] === index ? null : index }));
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Frequently Asked Questions</Text>
            <Text className="text-sm text-muted-foreground">Find answers to common questions about Diabetic Retinopathy Detection and Stage Classification (RetinaAI)</Text>
          </View>
        </View>

        {/* Categories */}
        <View className="space-y-4 mt-6 px-4">
          {faqCategories.map((cat) => (
            <Card key={cat.title} className="p-4 border-slate-200/70 shadow-sm">
              <View className="flex-row items-center gap-3 mb-4">
                <View className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.colorClass}`}>
                  <Ionicons name={cat.icon as any} size={20} color="#0ea5e9" />
                </View>
                <Text className="text-lg font-semibold text-foreground">{cat.title}</Text>
              </View>

              {cat.questions.map((item, idx) => (
                <TouchableOpacity key={idx} onPress={() => toggle(cat.title, idx)}>
                  <Card className="mb-2">
                    <CardHeader>
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-4 text-sm font-medium text-foreground">{item.q}</Text>
                        <Ionicons name={expanded[cat.title] === idx ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
                      </View>
                    </CardHeader>
                    {expanded[cat.title] === idx && (
                      <CardContent>
                        <Text className="text-sm text-muted-foreground leading-relaxed">{item.a}</Text>
                      </CardContent>
                    )}
                  </Card>
                </TouchableOpacity>
              ))}
            </Card>
          ))}
        </View>

        {/* Contact Support */}
        <View className="mt-6 px-4 mb-8">
          <Card className="p-5 border-slate-200/70 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
            <View className="flex-row items-start gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Ionicons name="alert-circle" size={18} color="#0ea5e9" />
              </View>
              <View className="space-y-2">
                <Text className="font-semibold text-foreground">Still have questions?</Text>
                <Text className="text-sm text-muted-foreground leading-relaxed">If you couldn't find the answer you were looking for, please contact your healthcare provider or reach out to our support team for assistance.</Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
