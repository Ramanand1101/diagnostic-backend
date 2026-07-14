import PolicyPage from '@/components/ui/PolicyPage';

export const metadata = { title: 'Medical Disclaimer — HealthONTime' };

const sections = [
  {
    heading: '1. Introduction',
    content: 'This Medical Disclaimer governs the use of the HealthONTime website (https://healthontime.in), mobile application, and all healthcare-related services offered through the platform. HealthONTime is a healthcare technology platform that facilitates access to diagnostic laboratories, home sample collection services, preventive health check-up packages, and related healthcare services through authorized partner laboratories and healthcare providers.',
  },
  {
    heading: '2. Nature of the Platform',
    content: 'HealthONTime is not a hospital, clinic, pathology laboratory, or medical practice, unless expressly stated. HealthONTime acts as a technology facilitator that connects users with independent, licensed, and authorized healthcare service providers. HealthONTime itself does not diagnose diseases, prescribe medicines, or provide medical treatment.',
    items: [
      'Book diagnostic tests',
      'Schedule home sample collection',
      'Purchase health packages',
      'Access laboratory reports (where available)',
      'Manage healthcare appointments',
      'Make secure online payments',
    ],
  },
  {
    heading: '3. No Doctor–Patient Relationship',
    content: 'Using the HealthONTime platform does not create a doctor–patient relationship, a hospital–patient relationship, or a laboratory–patient relationship with HealthONTime. Any professional healthcare relationship exists solely between the user and the relevant doctor, laboratory, or healthcare provider delivering the service.',
  },
  {
    heading: '4. No Medical Advice',
    content: 'The content available on HealthONTime — including articles, blogs, FAQs, health tips, test descriptions, package details, graphics, videos, and other informational material — is provided for general informational and educational purposes only. Such content should NOT be interpreted as medical advice, professional diagnosis, treatment recommendations, prescription guidance, or emergency medical assistance. Users should always seek advice from qualified healthcare professionals regarding medical conditions, symptoms, diagnosis, treatment, or medication.',
  },
  {
    heading: '5. Diagnostic Test Information',
    content: 'Descriptions of diagnostic tests and health packages are intended to help users understand the nature and purpose of the services offered. They should not be interpreted as a recommendation to undergo a particular test, a guarantee that a specific test is suitable for an individual, or a substitute for professional medical consultation. The selection of diagnostic tests should be made in consultation with a qualified healthcare professional whenever appropriate.',
  },
  {
    heading: '6. Laboratory Reports',
    content: 'Diagnostic reports are prepared and issued by the respective partner laboratories. HealthONTime does not interpret laboratory reports, verify the medical conclusions reached by laboratories, or guarantee that laboratory findings will identify every medical condition. Laboratory reports should always be reviewed by a qualified healthcare professional who can interpret the results in the context of the user\'s medical history and symptoms.',
  },
  {
    heading: '8. Emergency Medical Situations',
    content: 'HealthONTime is NOT an emergency medical service. If you experience chest pain, difficulty breathing, severe allergic reactions, stroke symptoms, uncontrolled bleeding, loss of consciousness, suicidal thoughts, or any other medical emergency — immediately contact your local emergency medical services or visit the nearest hospital. Do not rely on HealthONTime for emergency medical assistance.',
  },
  {
    heading: '12. Limitation of Liability',
    content: 'To the maximum extent permitted by applicable law, HealthONTime shall not be liable for any loss, injury, damage, claim, or expense arising from medical decisions made by users, interpretation of laboratory reports, delays in obtaining healthcare services, acts or omissions of independent healthcare providers, or reliance on informational content available on the platform. Nothing in this Disclaimer excludes liability where such exclusion is prohibited by law.',
  },
  {
    heading: '13. User Responsibilities',
    content: 'Users are responsible for:',
    items: [
      'Providing accurate personal and medical information where requested',
      'Following preparation instructions for diagnostic tests',
      'Consulting qualified healthcare professionals regarding medical concerns',
      'Reviewing laboratory reports with an appropriate healthcare provider',
      'Seeking emergency medical assistance when required',
    ],
  },
];

export default function MedicalDisclaimerPage() {
  return (
    <PolicyPage
      title="Medical Disclaimer"
      version="1.0"
      effectiveDate="July 2026"
      sections={sections}
    />
  );
}
