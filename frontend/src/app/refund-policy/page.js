import PolicyPage from '@/components/ui/PolicyPage';

export const metadata = { title: 'Refund & Cancellation Policy — HealthONTime' };

const sections = [
  {
    heading: '1. Introduction',
    content: 'This Refund & Cancellation Policy explains the terms governing the cancellation of bookings and refund of payments made through HealthONTime. By booking any service through HealthONTime, you agree to this Policy along with our Terms & Conditions and Privacy Policy.',
  },
  {
    heading: '2. Scope',
    content: 'This Policy applies to:',
    items: [
      'Website bookings',
      'Mobile application bookings',
      'Home sample collection',
      'Laboratory appointments',
      'Preventive health packages',
      'Online payments',
      'Promotional bookings',
      'Corporate bookings (unless governed by a separate agreement)',
    ],
  },
  {
    heading: '3. Booking Confirmation',
    content: 'A booking is considered confirmed only after successful payment (where prepaid), booking confirmation by HealthONTime, and confirmation from the partner laboratory (where applicable). Users are advised to review all booking details before confirming a reservation.',
  },
  {
    heading: '5. Cancellation Before Sample Collection',
    content: 'If a cancellation request is received before the sample has been collected and before the laboratory has started processing the booking, HealthONTime may approve the cancellation. Approved cancellations may be eligible for a refund after deducting any applicable charges, if disclosed during booking.',
  },
  {
    heading: '6. Cancellation After Sample Collection',
    content: 'Once the sample has been collected by the laboratory or authorized collection personnel, the booking is considered utilized and diagnostic processing may begin immediately. Cancellation requests may not be accepted, and users may not be eligible for a refund after sample collection has taken place.',
  },
  {
    heading: '9. Cancellation by HealthONTime',
    content: 'HealthONTime or the partner laboratory may cancel or reschedule a booking due to laboratory closure, equipment malfunction, collection staff unavailability, severe weather, government restrictions, public holidays, or non-serviceable locations. Where applicable, users may be offered rescheduling, alternative laboratory options, or a refund (subject to eligibility).',
  },
  {
    heading: '11. Non-Refundable Situations',
    content: 'Refunds may not be available where:',
    items: [
      'The sample has already been collected',
      'Laboratory testing has started',
      'Incorrect booking information was provided by the user',
      'The user fails to be available for home collection',
      'The appointment is missed without prior notice',
      'Services were purchased under a non-refundable promotional offer',
    ],
  },
  {
    heading: '12. Failed Payment Transactions',
    content: 'If payment is deducted but booking confirmation is not received, or the transaction fails due to technical issues, users should contact HealthONTime immediately. Verified failed transactions will be resolved in coordination with the payment gateway and banking partners.',
  },
  {
    heading: '14. Refund Processing Time',
    content: 'Once a refund is approved, HealthONTime will initiate the refund as soon as reasonably practicable. The time required for the amount to reflect in the user\'s account depends on the payment gateway, bank, card issuer, UPI provider, or financial institution. HealthONTime is not responsible for delays caused by external financial institutions after the refund has been initiated.',
  },
  {
    heading: '15. Mode of Refund',
    content: 'Approved refunds will generally be processed through the original payment method used during the booking. Where this is not possible due to technical or regulatory reasons, HealthONTime may offer an alternative lawful refund method after verifying the user\'s identity.',
  },
  {
    heading: '18. User Responsibilities',
    content: 'To avoid delays or cancellation issues, users should:',
    items: [
      'Provide accurate personal and contact information',
      'Follow preparation instructions, including fasting requirements where applicable',
      'Be available during the scheduled appointment window',
      'Inform HealthONTime promptly of any required changes',
      'Review booking details before confirming payment',
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <PolicyPage
      title="Refund & Cancellation Policy"
      version="1.0"
      effectiveDate="July 2026"
      sections={sections}
    />
  );
}
