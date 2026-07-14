import PolicyPage from '@/components/ui/PolicyPage';

export const metadata = { title: 'Shipping & Service Delivery Policy — HealthONTime' };

const sections = [
  {
    heading: '1. Introduction',
    content: 'This Shipping & Service Delivery Policy explains how HealthONTime delivers healthcare services booked through its website (https://healthontime.in) and mobile application. Since HealthONTime provides diagnostic and healthcare services rather than physical goods, this Policy describes the delivery of healthcare services, including appointment scheduling, home sample collection, digital report delivery, and related customer communications.',
  },
  {
    heading: '3. Nature of Services',
    content: 'HealthONTime is a healthcare technology platform that connects users with authorized partner laboratories and healthcare providers. HealthONTime does not ship physical products as part of its standard services. Instead, services are delivered through:',
    items: [
      'Home sample collection',
      'Walk-in laboratory appointments',
      'Digital laboratory reports',
      'Appointment confirmations',
      'Customer support',
      'Electronic communications',
    ],
  },
  {
    heading: '4. Service Availability',
    content: 'Healthcare services are available only in locations where HealthONTime and its partner laboratories operate. Service availability depends on user location, partner laboratory coverage, availability of collection personnel, laboratory operating hours, public holidays, local regulations, and operational capacity. Some services may not be available in all cities or regions.',
  },
  {
    heading: '5. Booking Confirmation',
    content: 'After successful booking, users may receive confirmation through Email, SMS, WhatsApp (where available), and mobile application notifications. The confirmation may include Booking ID, appointment details, selected laboratory, scheduled collection time, payment status, and preparation instructions (if applicable).',
  },
  {
    heading: '6. Home Sample Collection',
    content: 'Where available, HealthONTime facilitates home sample collection through trained and authorized collection personnel. To ensure successful service delivery, users should:',
    items: [
      'Provide a complete and accurate address',
      'Share a reachable contact number',
      'Be available during the scheduled appointment window',
      'Follow all preparation instructions, including fasting requirements where applicable',
      'Ensure a safe and accessible environment for sample collection',
    ],
  },
  {
    heading: '8. Appointment Delays',
    content: 'Although HealthONTime strives to provide timely services, delays may occur due to traffic conditions, weather events, high appointment volumes, public holidays, laboratory workload, technical issues, or government restrictions. Users will be informed of significant delays where reasonably possible.',
  },
  {
    heading: '10. Digital Report Delivery',
    content: 'Diagnostic reports may be delivered through:',
    items: [
      'HealthONTime website',
      'Mobile application',
      'Registered email address',
      'WhatsApp (where supported)',
      'Partner laboratory portal (if applicable)',
    ],
  },
  {
    heading: '11. Estimated Report Timelines',
    content: 'Report delivery timelines vary based on the type of diagnostic test, laboratory processing requirements, quality assurance procedures, and additional medical review if required. Estimated timelines displayed during booking are indicative only and may change due to operational or medical requirements.',
  },
  {
    heading: '15. Force Majeure',
    content: 'HealthONTime shall not be responsible for delays or interruptions in service delivery caused by events beyond its reasonable control, including natural disasters, floods, earthquakes, fire, epidemics or pandemics, government restrictions, internet or power outages, transportation disruptions, civil unrest, or labor strikes. We will make reasonable efforts to restore services as soon as practicable.',
  },
];

export default function ShippingPolicyPage() {
  return (
    <PolicyPage
      title="Shipping & Service Delivery Policy"
      version="1.0"
      effectiveDate="July 2026"
      sections={sections}
    />
  );
}
