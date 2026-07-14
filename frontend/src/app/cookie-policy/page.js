import PolicyPage from '@/components/ui/PolicyPage';

export const metadata = { title: 'Cookie Policy — HealthONTime' };

const sections = [
  {
    heading: '1. Introduction',
    content: 'This Cookie Policy explains how HealthONTime uses cookies and similar technologies on our website (https://healthontime.in) and mobile application. By continuing to use our website or mobile application, you consent to the use of cookies as described in this Policy, unless you disable them through your browser or device settings where applicable.',
  },
  {
    heading: '2. What Are Cookies?',
    content: 'Cookies are small text files stored on your device when you visit a website. They help websites recognize returning users, improve performance, remember preferences, enhance security, analyze traffic, and personalize your experience.',
  },
  {
    heading: '3. Why HealthONTime Uses Cookies',
    content: 'We use cookies to:',
    items: [
      'Ensure the website functions correctly',
      'Keep users signed in securely',
      'Remember user preferences',
      'Improve website speed and performance',
      'Understand visitor behavior and analyze usage',
      'Improve healthcare booking experience',
      'Prevent fraud and unauthorized access',
      'Measure marketing effectiveness',
    ],
  },
  {
    heading: '4. Types of Cookies We Use',
    subsections: [
      {
        heading: '4.1 Essential Cookies',
        content: 'Necessary for the operation of our website and mobile application. These enable core functions such as user login, account authentication, session management, security verification, appointment booking, and payment processing. Without these cookies, certain services may not function properly.',
      },
      {
        heading: '4.2 Performance Cookies',
        content: 'Help us understand how visitors use our platform — including number of visitors, pages visited, time spent, navigation patterns, error reports, and website performance metrics. This information helps us improve our services.',
      },
      {
        heading: '4.3 Functional Cookies',
        content: 'Remember your preferences such as preferred language, city or location, recently searched tests, login preferences, and user interface settings.',
      },
      {
        heading: '4.4 Analytics Cookies',
        content: 'HealthONTime may use tools including Google Analytics, Google Tag Manager, Microsoft Clarity, and Firebase Analytics. These may collect device information, browser type, pages viewed, session duration, referral sources, and general geographic region. Analytics data is generally aggregated and used for statistical purposes.',
      },
      {
        heading: '4.5 Advertising Cookies',
        content: 'Where applicable, HealthONTime may use Meta (Facebook) Pixel, Google Ads Conversion Tracking, Google Remarketing, and similar technologies to measure and improve marketing campaigns. HealthONTime does not sell your personal information for advertising purposes.',
      },
    ],
  },
  {
    heading: '5. Third-Party Cookies',
    content: 'Some cookies are placed by trusted third-party service providers who support our platform, including payment gateway providers, analytics providers, cloud hosting providers, and social media integrations. These third parties operate under their own privacy policies.',
  },
  {
    heading: '6. Cookies Used During Online Payments',
    content: 'When users make online payments, our payment gateway providers may place cookies or similar technologies to verify payment sessions, prevent fraud, authenticate transactions, and improve payment security. HealthONTime does not store sensitive payment credentials such as card numbers, CVV codes, banking passwords, or UPI PINs.',
  },
  {
    heading: '8. Managing Cookies',
    content: 'Most web browsers allow users to view, delete, block, and restrict cookies. Please note that disabling certain cookies may affect the functionality of the HealthONTime website or mobile application.',
  },
  {
    heading: '10. Do Not Track Signals',
    content: 'Currently, there is no universally accepted standard for responding to DNT signals. HealthONTime may not respond differently to such signals but will continue to protect user information in accordance with our Privacy Policy.',
  },
  {
    heading: '11. Data Security',
    content: 'Information collected through cookies is protected using reasonable technical and organizational security measures. HealthONTime regularly reviews its security practices to help safeguard user information against unauthorized access, misuse, or disclosure.',
  },
  {
    heading: '13. Changes to this Cookie Policy',
    content: 'HealthONTime may update this Cookie Policy from time to time to reflect changes in technology, legal requirements, business practices, and analytics tools. The updated version will be published on our website and mobile application with a revised effective date.',
  },
];

export default function CookiePolicyPage() {
  return (
    <PolicyPage
      title="Cookie Policy"
      version="1.0"
      effectiveDate="July 2026"
      sections={sections}
    />
  );
}
