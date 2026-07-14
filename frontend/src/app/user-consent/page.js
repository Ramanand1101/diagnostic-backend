import PolicyPage from '@/components/ui/PolicyPage';

export const metadata = { title: 'User Consent Policy — HealthONTime' };

const sections = [
  {
    heading: '1. Introduction',
    content: 'This User Consent Policy explains how HealthONTime obtains, manages, records, and processes your consent for the collection, use, storage, sharing, and processing of your personal information and healthcare-related data. This Policy applies to the HealthONTime website, mobile application, customer support channels, home sample collection services, and all healthcare services facilitated through our platform.',
  },
  {
    heading: '2. Purpose of Consent',
    content: 'HealthONTime requests your consent so that we can lawfully:',
    items: [
      'Create and manage your account',
      'Process diagnostic test bookings',
      'Schedule home sample collection',
      'Share necessary information with partner laboratories',
      'Process payments',
      'Deliver laboratory reports',
      'Send appointment reminders',
      'Provide customer support',
      'Improve our services',
      'Comply with applicable legal and regulatory requirements',
    ],
  },
  {
    heading: '3. What You Consent To',
    content: 'By using HealthONTime, you consent to the collection and processing of:',
    subsections: [
      {
        heading: 'Personal Information',
        items: ['Full Name', 'Date of Birth', 'Gender', 'Mobile Number', 'Email Address', 'Residential Address'],
      },
      {
        heading: 'Healthcare Information',
        items: ['Diagnostic test selections', 'Health package details', 'Uploaded prescriptions', 'Medical history voluntarily provided', 'Laboratory reports', 'Sample collection information'],
      },
      {
        heading: 'Technical Information',
        items: ['Device information', 'Browser details', 'IP address', 'Cookies', 'Mobile application identifiers', 'Usage analytics'],
      },
    ],
  },
  {
    heading: '4. Methods of Obtaining Consent',
    content: 'HealthONTime may obtain your consent through:',
    items: [
      'Website registration',
      'Mobile application registration',
      'Online booking forms',
      'Acceptance of Terms & Conditions and Privacy Policy',
      'Consent checkboxes',
      'OTP verification (where applicable)',
      'Email and WhatsApp confirmations (where applicable)',
    ],
  },
  {
    heading: '5. Healthcare Consent',
    content: 'By booking a diagnostic test or home sample collection through HealthONTime, you confirm that you voluntarily request the healthcare service, the information provided is accurate, you understand that diagnostic services are provided by independent partner laboratories, you have reviewed any preparation instructions, and you authorize the collection and processing of samples necessary to perform the requested diagnostic services.',
  },
  {
    heading: '6. Consent for Home Sample Collection',
    content: 'Where you request home sample collection, you additionally consent to a trained collection professional visiting the address provided by you, collection of biological samples for the requested diagnostic tests, and sharing of relevant booking information with the authorized collection personnel.',
  },
  {
    heading: '7. Consent for Communication',
    content: 'You agree that HealthONTime may contact you for appointment confirmations, sample collection updates, report availability notifications, payment confirmations, customer support, security alerts, and service announcements. You may opt out of marketing communications at any time; however, service-related communications may still be sent.',
  },
  {
    heading: '9. Withdrawal of Consent',
    content: 'You may withdraw your consent at any time by contacting info@healthontime.in or by using available account settings where applicable. Please note that withdrawing consent may affect HealthONTime\'s ability to provide certain services. Withdrawal will not affect processing that was lawfully carried out before your request.',
  },
  {
    heading: '11. Consent for Minors',
    content: 'If healthcare services are booked for a person who is legally unable to provide consent under applicable law, the booking must be made by a parent, legal guardian, or other authorized representative. The person providing consent confirms that they are legally authorized to do so.',
  },
  {
    heading: '13. Compliance with Applicable Law',
    content: 'HealthONTime seeks to process personal information in accordance with applicable Indian laws, including the Digital Personal Data Protection Act, 2023 (DPDP Act), and other relevant legal and regulatory requirements. Where additional consent is required by law for specific processing activities, HealthONTime will seek such consent before proceeding.',
  },
];

export default function UserConsentPage() {
  return (
    <PolicyPage
      title="User Consent Policy"
      version="1.0"
      effectiveDate="July 2026"
      sections={sections}
    />
  );
}
