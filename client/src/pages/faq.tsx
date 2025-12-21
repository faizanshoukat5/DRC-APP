import { motion } from "framer-motion";
import { MobileLayout } from "@/components/mobile-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { 
  HelpCircle, 
  ScanEye, 
  Shield, 
  Upload, 
  Users, 
  FileText,
  Clock,
  Lock,
  Stethoscope,
  UserRound,
  Building2,
  AlertCircle
} from "lucide-react";

const faqCategories = [
  {
    title: "General",
    icon: HelpCircle,
    color: "bg-primary/10 text-primary",
    questions: [
      {
        q: "What is RetinaAI?",
        a: "RetinaAI is an AI-powered diabetic retinopathy detection platform. It analyzes fundus (eye) images to detect signs of diabetic retinopathy, providing severity grades, confidence scores, and explainable heatmaps to help doctors and patients understand the results."
      },
      {
        q: "What is diabetic retinopathy?",
        a: "Diabetic retinopathy is an eye condition that can affect people with diabetes. High blood sugar levels can damage the blood vessels in the retina (the light-sensitive tissue at the back of the eye), potentially leading to vision loss if untreated. Early detection through regular screening is crucial."
      },
      {
        q: "How accurate is the AI analysis?",
        a: "Our AI model has been trained on thousands of clinically validated fundus images and achieves high accuracy in detecting diabetic retinopathy. However, all results should be reviewed by a qualified healthcare professional for final diagnosis and treatment decisions."
      },
    ]
  },
  {
    title: "For Patients",
    icon: UserRound,
    color: "bg-emerald-100 text-emerald-700",
    questions: [
      {
        q: "How do I get started as a patient?",
        a: "Simply create an account by selecting 'Patient' during signup, fill in your details, and once registered, you'll be prompted to select an approved doctor from our network. Your doctor will then be able to upload and share your fundus scan results with you."
      },
      {
        q: "Can I upload my own fundus images?",
        a: "Currently, fundus image uploads are handled by your assigned doctor to ensure image quality and proper clinical workflow. You can view all your scan results, download reports, and track your eye health history through your patient dashboard."
      },
      {
        q: "How do I view my scan results?",
        a: "After your doctor uploads and analyzes your fundus images, the results will appear in your Patient Dashboard. You can see the severity grade, AI confidence score, heatmap visualizations, and download PDF reports for your records."
      },
      {
        q: "Can I change my assigned doctor?",
        a: "Yes, you can change your assigned doctor through the Select Doctor page. This allows you to choose from other approved doctors in our network if needed."
      },
    ]
  },
  {
    title: "For Doctors",
    icon: Stethoscope,
    color: "bg-blue-100 text-blue-700",
    questions: [
      {
        q: "How do I register as a doctor?",
        a: "Select 'Doctor' during signup and provide your medical license number, specialty, and other required information. Your account will be reviewed by our admin team for verification. Once approved, you'll have full access to the doctor dashboard."
      },
      {
        q: "How long does doctor approval take?",
        a: "Doctor approval typically takes 1-3 business days. Our admin team verifies your credentials to ensure platform security and patient safety. You'll be notified once your account is approved."
      },
      {
        q: "How do I upload patient scans?",
        a: "From your Doctor Dashboard, select a patient from your assigned patients list, then use the upload feature to submit fundus images. The AI will analyze the images and generate results including severity grade, confidence score, and heatmaps within seconds."
      },
      {
        q: "Can I add notes to patient reports?",
        a: "Yes, you can add clinical notes and observations to each scan report. These notes are visible to both you and the patient, helping provide context and recommendations alongside the AI analysis."
      },
    ]
  },
  {
    title: "Technical & Security",
    icon: Shield,
    color: "bg-amber-100 text-amber-700",
    questions: [
      {
        q: "Is my data secure?",
        a: "Yes, we take data security seriously. All data is encrypted in transit and at rest. We use secure cloud infrastructure and follow healthcare data protection best practices. Patient data is only accessible to the assigned doctor and the patient themselves."
      },
      {
        q: "What image formats are supported?",
        a: "We support common image formats including JPEG, PNG, and TIFF. For best results, use high-resolution fundus images captured with standard fundus cameras. The AI model works best with clear, well-lit images."
      },
      {
        q: "How fast are the results?",
        a: "AI analysis typically completes in under 45 seconds. You'll see the severity grade, confidence score, and heatmap visualization as soon as processing is complete."
      },
      {
        q: "Can I download my reports?",
        a: "Yes, both patients and doctors can download PDF reports for each scan. These reports include the original image, AI analysis results, heatmaps, and any clinical notes added by the doctor."
      },
    ]
  },
  {
    title: "Understanding Results",
    icon: FileText,
    color: "bg-purple-100 text-purple-700",
    questions: [
      {
        q: "What do the severity grades mean?",
        a: "The AI provides severity grades from No DR (no diabetic retinopathy detected) to Severe (advanced diabetic retinopathy). Grades include: No DR, Mild, Moderate, and Severe. Higher grades indicate more advanced disease requiring urgent medical attention."
      },
      {
        q: "What is the confidence score?",
        a: "The confidence score (0-100%) indicates how certain the AI model is about its prediction. Higher scores suggest more reliable results. Lower confidence scores may indicate image quality issues or borderline cases that require careful clinical review."
      },
      {
        q: "What are heatmaps?",
        a: "Heatmaps are visual overlays on the fundus image that highlight areas the AI identified as important for its diagnosis. Red/warm areas indicate regions with potential abnormalities, helping doctors understand and verify the AI's analysis."
      },
      {
        q: "Should I rely solely on AI results?",
        a: "No. While our AI is a powerful screening tool, it should be used to assist—not replace—professional medical judgment. Always consult with your doctor for final diagnosis, treatment recommendations, and follow-up care."
      },
    ]
  },
];

export default function FAQPage() {
  return (
    <MobileLayout title="FAQ">
      <div className="min-h-full p-5 space-y-6 bg-slate-50 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Frequently Asked Questions
              </h1>
              <p className="text-sm text-slate-500">
                Find answers to common questions about RetinaAI
              </p>
            </div>
          </div>
        </motion.div>

        {/* FAQ Categories */}
        <div className="space-y-4">
          {faqCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.05 }}
            >
              <Card className="p-4 border-slate-200/70 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${category.color}`}>
                    <category.icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {category.title}
                  </h2>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`${category.title}-${index}`}
                      className="border-slate-200"
                    >
                      <AccordionTrigger className="text-left text-sm font-medium text-slate-800 hover:text-primary hover:no-underline py-3">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-slate-600 leading-relaxed pb-4">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5 border-slate-200/70 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">
                  Still have questions?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  If you couldn't find the answer you were looking for, please contact your healthcare provider or reach out to our support team for assistance.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
