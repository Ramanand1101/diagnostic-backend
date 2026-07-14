import PolicyPage from '@/components/ui/PolicyPage';

export const metadata = { title: 'DPDP Compliance Policy — HealthONTime' };

const sections = [
  {
    heading: '1. Introduction',
    content: 'HealthONTime is committed to protecting the privacy and personal data of its users in accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and other applicable laws of India. This Policy explains how HealthONTime collects, processes, stores, secures, shares, retains, and deletes personal data while respecting the rights of individuals ("Data Principals") under applicable law.',
  },
  {
    heading: '2. Purpose',
    content: 'The objectives of this Policy are to:',
    items: [
      'Protect users\' personal data',
      'Promote transparency in data processing',
      'Ensure lawful and fair processing of personal data',
      'Explain users\' rights under applicable law',
      'Establish internal data governance practices',
      'Build trust with users and healthcare partners',
    ],
  },
  {
    heading: '3. Definitions',
    subsections: [
      { heading: 'Data Principal', content: 'The individual to whom the personal data relates.' },
      { heading: 'Personal Data', content: 'Any data about an individual who is identifiable by or in relation to such data.' },
      { heading: 'Processing', content: 'Any operation performed on personal data, including collection, storage, organization, use, sharing, disclosure, retrieval, deletion, or destruction.' },
      { heading: 'Consent', content: 'A freely given, specific, informed, unconditional, and unambiguous indication of the Data Principal\'s agreement to the processing of personal data for a specified purpose.' },
    ],
  },
  {
    heading: '5. Lawful Basis for Processing',
    content: 'HealthONTime processes personal data only where there is a valid legal basis, including:',
    items: [
      'Your consent',
      'Performance of services requested by you',
      'Compliance with legal obligations',
      'Protection against fraud and abuse',
      'Security and operational purposes',
      'Other lawful grounds recognized under applicable law',
    ],
  },
  {
    heading: '7. Consent Management',
    content: 'HealthONTime obtains user consent through website registration, mobile application registration, booking forms, consent checkboxes, OTP verification, electronic confirmations, and acceptance of Terms & Conditions and Privacy Policy. Users may withdraw consent where processing is based on consent.',
  },
  {
    heading: '9. Data Security',
    content: 'HealthONTime implements reasonable technical and organizational measures to safeguard personal data, including encryption during transmission, secure servers and cloud infrastructure, access controls, authentication mechanisms, security monitoring, regular software updates, employee confidentiality obligations, and periodic security reviews.',
  },
  {
    heading: '11. Rights of Data Principals',
    content: 'Subject to applicable law, users may request:',
    items: [
      'Confirmation regarding processing of their personal data',
      'Access to personal data',
      'Correction of inaccurate personal data',
      'Updating of personal information',
      'Withdrawal of consent (where applicable)',
      'Deletion of eligible personal data',
      'Information about grievance mechanisms',
      'Nomination of another individual to exercise rights in circumstances recognized by law',
    ],
  },
  {
    heading: '13. Data Breach Management',
    content: 'If HealthONTime becomes aware of a personal data breach that is likely to require action under applicable law, we will assess the nature and scope of the incident, take reasonable steps to contain and investigate the breach, mitigate potential harm where possible, notify relevant authorities or affected individuals where required by law, and review and strengthen security controls.',
  },
  {
    heading: '19. Governing Law',
    content: 'This Policy shall be governed by the laws of India. Any disputes relating to this Policy shall be subject to the jurisdiction of the competent courts located in Bengaluru, Karnataka, unless otherwise required by applicable law.',
  },
];

export default function DpdpCompliancePage() {
  return (
    <PolicyPage
      title="Digital Personal Data Protection (DPDP) Compliance Policy"
      version="1.0"
      effectiveDate="July 2026"
      sections={sections}
    />
  );
}
