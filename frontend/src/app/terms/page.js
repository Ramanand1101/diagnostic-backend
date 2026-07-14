import PolicyPage from '@/components/ui/PolicyPage';

export const metadata = { title: 'Terms & Conditions — HealthONTime' };

const sections = [
  {
    heading: '1. Introduction',
    content: 'Welcome to HealthONTime. These Terms & Conditions ("Terms") govern your access to and use of the HealthONTime website (https://healthontime.in), mobile application, and all products, services, features, and content provided through our platform. By accessing or using our website, mobile application, or services, you acknowledge that you have read, understood, and agreed to be bound by these Terms & Conditions and our Privacy Policy.',
  },
  {
    heading: '2. About HealthONTime',
    content: 'HealthONTime is an online healthcare platform that enables users to book diagnostic tests online, schedule home sample collection, compare laboratory services, purchase preventive health packages, and access digital laboratory reports. HealthONTime acts as a technology facilitator between users and independent healthcare providers and does not itself perform diagnostic tests or provide medical treatment.',
  },
  {
    heading: '4. Eligibility',
    content: 'To use HealthONTime services, you must:',
    items: [
      'Be at least 18 years of age, or use the platform under supervision of a parent or legal guardian',
      'Have the legal capacity to enter into a binding agreement',
      'Provide accurate registration and booking information',
      'Not be prohibited by applicable law from using our services',
    ],
  },
  {
    heading: '7. User Responsibilities',
    content: 'When using HealthONTime, you agree to:',
    items: [
      'Provide truthful and accurate information',
      'Follow instructions provided for diagnostic tests (such as fasting requirements)',
      'Attend scheduled appointments or be available for home sample collection',
      'Respect healthcare professionals and collection personnel',
      'Make payments for services as applicable',
      'Use the platform in compliance with applicable laws',
    ],
  },
  {
    heading: '8. Prohibited Activities',
    content: 'You must not use the HealthONTime platform to:',
    items: [
      'Provide false or misleading information',
      'Impersonate another person or organization',
      'Upload fraudulent, forged, or misleading medical documents',
      'Interfere with the operation or security of the platform',
      'Attempt unauthorized access to systems, accounts, or data',
      'Use automated tools to scrape or copy content without authorization',
      'Engage in fraudulent payment activities',
    ],
  },
  {
    heading: '13. Partner Laboratories',
    content: 'HealthONTime collaborates with independent diagnostic laboratories and healthcare providers. Each partner laboratory is responsible for performing diagnostic tests, collecting and processing samples, preparing diagnostic reports, and maintaining applicable certifications. HealthONTime acts as a facilitator and does not control the internal operations or professional judgments of independent laboratories.',
  },
  {
    heading: '15. Pricing',
    content: 'Prices displayed on the HealthONTime platform are subject to change without prior notice. Pricing may vary depending on the laboratory selected, geographic location, home collection charges, promotional discounts, and applicable government taxes. The final payable amount will be displayed before payment confirmation.',
  },
  {
    heading: '17. Online Payments',
    content: 'HealthONTime supports secure online payments through authorized third-party payment gateways. Accepted payment methods may include UPI, Credit/Debit Cards, Net Banking, and Digital Wallets. HealthONTime does not store complete card numbers, CVV codes, UPI PINs, or internet banking credentials.',
  },
  {
    heading: '22. Cancellations by Users',
    content: 'Users may request cancellation of a booking through the HealthONTime website, mobile application, or customer support. Cancellation eligibility depends on whether a sample has already been collected, laboratory-specific policies, and the nature of the diagnostic service. Once a sample has been collected or processing has begun, cancellation may not be possible.',
  },
  {
    heading: '29. Medical Disclaimer',
    content: 'HealthONTime is a technology platform and does not provide medical diagnosis, treatment, or medical advice unless expressly stated. Users should consult qualified healthcare professionals regarding medical conditions, diagnosis, treatment decisions, and interpretation of laboratory results. In case of a medical emergency, contact emergency medical services or visit the nearest healthcare facility immediately.',
  },
  {
    heading: '34. Intellectual Property Rights',
    content: 'All intellectual property rights relating to the HealthONTime platform — including the website, mobile application, logos, trademarks, designs, graphics, source code, and other materials — are owned by or licensed to HealthONTime. Users are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the platform solely for personal, lawful, and non-commercial purposes.',
  },
  {
    heading: '39. Limitation of Liability',
    content: 'To the maximum extent permitted by applicable law, HealthONTime shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from delays in service delivery, acts or omissions of independent partner laboratories, temporary unavailability of the platform, internet connectivity issues, or third-party payment gateway failures.',
  },
  {
    heading: '43. Governing Law',
    content: 'These Terms & Conditions shall be governed by and construed in accordance with the laws of India. Unless otherwise required by law, disputes shall be subject to the exclusive jurisdiction of the competent courts located in Bengaluru, Karnataka, India.',
  },
  {
    heading: '48. Changes to These Terms',
    content: 'HealthONTime may revise or update these Terms & Conditions from time to time. The updated Terms will be published on the website and mobile application with a revised effective date. Continued use of the platform after the revised Terms become effective constitutes acceptance of those changes.',
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms & Conditions"
      version="1.0"
      effectiveDate="July 2026"
      sections={sections}
    />
  );
}
