import PolicyPage from '@/components/ui/PolicyPage';

export const metadata = { title: 'Privacy Policy — HealthONTime' };

const sections = [
  {
    heading: '1. Introduction',
    content: 'Welcome to HealthONTime. We value your trust and are committed to protecting your privacy and personal information. This Privacy Policy explains how HealthONTime collects, uses, stores, shares, and protects your personal data when you access our website (https://healthontime.in), mobile application, or any services offered through our digital platforms.',
  },
  {
    heading: '2. About HealthONTime',
    content: 'HealthONTime is an online healthcare platform that enables users to conveniently access diagnostic and healthcare-related services from trusted partner laboratories and healthcare providers.',
    items: [
      'Online diagnostic test booking',
      'Home sample collection',
      'Health check-up packages',
      'Partner laboratory discovery & comparison',
      'Online appointment scheduling',
      'Digital report access',
      'Secure online payments',
      'Customer support services',
    ],
  },
  {
    heading: '6. Privacy Principles',
    content: 'HealthONTime follows the following privacy principles:',
    items: [
      'Transparency', 'Accountability', 'Lawful Processing', 'Purpose Limitation',
      'Data Minimization', 'Accuracy', 'Confidentiality', 'Security',
      'User Control', 'Responsible Data Governance',
    ],
  },
  {
    heading: '7. Information We Collect',
    content: 'HealthONTime collects information that enables us to provide secure, efficient, and personalized healthcare services. This includes information you directly provide, automatically collected information, information received from healthcare partners, and information obtained through lawful third-party integrations.',
    subsections: [
      {
        heading: 'Personal Information',
        items: ['Full Name', 'Mobile Number', 'Email Address', 'Residential Address', 'Date of Birth', 'Age', 'Gender'],
      },
      {
        heading: 'Health & Medical Information',
        content: 'Health information is treated as sensitive personal data and is processed only for legitimate healthcare purposes. HealthONTime does not sell, rent, or commercially exploit users\' medical information.',
        items: ['Prescriptions uploaded', 'Diagnostic test bookings', 'Laboratory reports', 'Medical history voluntarily provided'],
      },
      {
        heading: 'Technical Information',
        items: ['IP Address', 'Browser Type & Version', 'Device information', 'Usage analytics', 'Cookies'],
      },
    ],
  },
  {
    heading: '17. Cookies and Similar Technologies',
    content: 'HealthONTime uses cookies and similar tracking technologies to enhance your browsing experience, improve website performance, provide personalized healthcare recommendations, remember your preferences, and ensure platform security. Please see our Cookie Policy for details.',
  },
  {
    heading: '24. How We Use Your Information',
    content: 'HealthONTime uses your information responsibly and only for legitimate business and healthcare purposes.',
    items: [
      'Create and manage your account',
      'Process diagnostic bookings',
      'Schedule home sample collection',
      'Coordinate with partner laboratories',
      'Deliver laboratory reports',
      'Process online payments',
      'Send appointment reminders',
      'Detect fraudulent activities & maintain platform security',
      'Comply with applicable laws',
    ],
  },
  {
    heading: '27. Sharing of Personal Information',
    content: 'HealthONTime values your privacy and shares personal information only when necessary. We do not sell, rent, lease, or trade your personal or health information to third parties for their independent marketing purposes.',
    items: [
      'Partner laboratories (to complete your booking)',
      'Home sample collection personnel (limited info only)',
      'Payment gateway providers (transaction info only)',
      'Cloud hosting & technology service providers',
      'Legal & regulatory authorities where required by law',
    ],
  },
  {
    heading: '33. Data Security',
    content: 'HealthONTime implements appropriate technical, administrative, and organizational safeguards to protect personal information against unauthorized access, alteration, disclosure, loss, misuse, or destruction.',
    items: [
      'SSL/TLS encrypted communication',
      'Role-based access controls',
      'Password hashing and encryption',
      'Regular software updates & security monitoring',
      'Employee confidentiality obligations',
    ],
  },
  {
    heading: '36. Your Privacy Rights',
    content: 'Subject to applicable law, you may have the right to:',
    items: [
      'Access your personal information',
      'Correct inaccurate or incomplete information',
      'Request deletion of eligible personal information',
      'Withdraw consent where processing is based on consent',
      'Raise concerns regarding the handling of your personal information',
    ],
  },
  {
    heading: '37. Rights Under DPDP Act 2023 (India)',
    content: 'Where applicable, users may have rights under the Digital Personal Data Protection Act, 2023, including the right to clear information about processing, access, correction, erasure, and grievance redressal.',
  },
  {
    heading: '39. Account Deletion',
    content: 'HealthONTime respects your right to close your account and request deletion of eligible personal information. You may request account deletion by contacting us at info@healthontime.in or through the account settings in our website or mobile application (where available).',
  },
  {
    heading: '46. Changes to this Privacy Policy',
    content: 'HealthONTime may update or modify this Privacy Policy from time to time. The revised Privacy Policy will be published on our website and mobile application with an updated Effective Date.',
  },
  {
    heading: '49. Governing Law and Jurisdiction',
    content: 'This Privacy Policy shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the competent courts located in Bengaluru, Karnataka, unless otherwise required by applicable law.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      version="1.0"
      effectiveDate="July 2026"
      sections={sections}
    />
  );
}
