import PolicyPage from '@/components/ui/PolicyPage';

export const metadata = { title: 'Grievance Redressal Policy — HealthONTime' };

const sections = [
  {
    heading: '1. Introduction',
    content: 'HealthONTime is committed to providing high-quality healthcare technology services while ensuring that every customer receives fair, transparent, and timely resolution of complaints, concerns, and grievances. This Policy explains how users can report concerns relating to diagnostic test bookings, home sample collection, laboratory services, online payments, refunds, privacy and data protection, customer support, website services, partner laboratory experience, and any other services offered through HealthONTime.',
  },
  {
    heading: '3. What Is a Grievance?',
    content: 'A grievance is any complaint, concern, objection, or dissatisfaction relating to HealthONTime\'s services, including:',
    items: [
      'Incorrect booking details',
      'Delay in appointment confirmation or home sample collection',
      'Delay in report delivery',
      'Incorrect billing or payment issues',
      'Refund requests',
      'Customer service concerns',
      'Technical problems with the website or mobile application',
      'Privacy-related concerns or data protection requests',
      'Unauthorized access to an account',
      'Complaints regarding partner laboratories or collection staff',
    ],
  },
  {
    heading: '4. How to Submit a Grievance',
    content: 'Users may submit a grievance through:',
    items: [
      'Email: info@healthontime.in',
      'Phone: +91 7090002002',
      'Website: https://healthontime.in (contact form or grievance section)',
      'Mobile Application (where this functionality is available)',
    ],
  },
  {
    heading: '5. Information to Include',
    content: 'To help us investigate your grievance efficiently, please provide:',
    items: [
      'Full Name',
      'Registered Mobile Number',
      'Registered Email Address',
      'Booking ID (if applicable)',
      'Transaction ID (if applicable)',
      'Date of Incident',
      'Description of the issue',
      'Supporting documents or screenshots, if available',
    ],
  },
  {
    heading: '6. Acknowledgement of Complaints',
    content: 'HealthONTime aims to acknowledge receipt of grievances within 2 business days of receiving a complete complaint. Acknowledgement confirms receipt of the grievance but does not imply acceptance of the claim.',
  },
  {
    heading: '8. Resolution Timeline',
    content: 'HealthONTime aims to resolve most grievances within 7 to 15 business days, depending on the nature of the complaint, complexity of the issue, availability of supporting information, third-party involvement, and legal or regulatory requirements. Some matters may require additional time.',
  },
  {
    heading: '12. Grievance Officer / Privacy Officer',
    content: 'HealthONTime has appointed a Privacy Officer to oversee privacy-related concerns and coordinate grievance handling where applicable.',
    items: [
      'Privacy Officer — HealthONTime',
      'Email: info@healthontime.in',
      'Phone: +91 7090002002',
    ],
  },
  {
    heading: '13. Escalation Process',
    content: 'If a user is not satisfied with the initial response, they may request that the matter be reviewed by HealthONTime\'s senior management or another authorized internal reviewer. HealthONTime will undertake a further review and communicate its final position after considering all relevant information. Nothing in this Policy limits a user\'s rights under applicable law.',
  },
  {
    heading: '18. Governing Law',
    content: 'This Policy shall be governed by the laws of India. Any disputes arising from this Policy shall be subject to the jurisdiction of the competent courts located in Bengaluru, Karnataka, unless otherwise required by applicable law.',
  },
];

export default function GrievancePage() {
  return (
    <PolicyPage
      title="Grievance Redressal Policy"
      version="1.0"
      effectiveDate="July 2026"
      sections={sections}
    />
  );
}
