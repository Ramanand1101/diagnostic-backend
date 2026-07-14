import PolicyPage from '@/components/ui/PolicyPage';

export const metadata = { title: 'Data Deletion Policy — HealthONTime' };

const sections = [
  {
    heading: '1. Introduction',
    content: 'This Data Deletion & Account Deletion Policy explains how HealthONTime manages requests for the deletion of personal information and user accounts. HealthONTime is committed to protecting your privacy while complying with applicable legal, regulatory, and healthcare record-retention requirements.',
  },
  {
    heading: '3. Account Deletion',
    content: 'Users may request permanent deletion of their HealthONTime account at any time through:',
    items: [
      'Website account settings (where available)',
      'Mobile application settings (where available)',
      'Email: info@healthontime.in',
      'Customer Support',
      'Written request',
    ],
  },
  {
    heading: '4. Identity Verification',
    content: 'Before deleting an account or personal information, HealthONTime may verify the identity of the requester through OTP verification, registered mobile/email verification, or government-issued ID if reasonably necessary. This helps prevent unauthorized deletion requests.',
  },
  {
    heading: '5. Information Eligible for Deletion',
    content: 'Subject to applicable laws and operational requirements, users may request deletion of:',
    items: [
      'User account',
      'Profile information',
      'Contact information',
      'Saved addresses',
      'Marketing preferences',
      'Saved payment preferences (excluding payment records required by law)',
      'Uploaded documents (where legally permissible)',
      'Customer support history (where applicable)',
    ],
  },
  {
    heading: '6. Information That May Be Retained',
    content: 'HealthONTime may retain certain information where required by law or for legitimate business purposes, including:',
    items: [
      'Financial transaction records',
      'Tax and accounting records',
      'Booking history',
      'Payment records',
      'Fraud prevention records',
      'Security and audit logs',
      'Legal compliance records',
      'Records required under applicable healthcare or regulatory obligations',
    ],
  },
  {
    heading: '7. Diagnostic Reports and Healthcare Records',
    content: 'Certain healthcare-related records (diagnostic reports, laboratory records, sample collection records, medical documentation, test history) may need to be retained for legal, regulatory, operational, or clinical reasons. Where deletion cannot be completed, HealthONTime will explain the reason, subject to applicable law.',
  },
  {
    heading: '9. Deletion Process',
    content: 'Upon receiving a valid deletion request, HealthONTime will verify the identity of the requester, review the request, determine whether legal retention obligations apply, delete or anonymize eligible information, and notify the user when the request has been completed or explain why certain information cannot be deleted.',
  },
  {
    heading: '10. Account Closure Effects',
    content: 'Once an account is deleted, users may lose access to:',
    items: [
      'Booking history',
      'Saved reports available through the platform',
      'Saved addresses',
      'Loyalty or reward points (if applicable)',
      'Preferences and settings',
      'Future access to account-specific services',
    ],
  },
  {
    heading: '14. Compliance with DPDP Act, 2023',
    content: 'HealthONTime is committed to processing deletion requests in accordance with applicable Indian data protection laws, including the Digital Personal Data Protection Act, 2023 (DPDP Act). Where required by law, HealthONTime will retain, delete, anonymize, or restrict the processing of personal information in line with statutory obligations.',
  },
];

export default function DataDeletionPage() {
  return (
    <PolicyPage
      title="Data Deletion & Account Deletion Policy"
      version="1.0"
      effectiveDate="July 2026"
      sections={sections}
    />
  );
}
