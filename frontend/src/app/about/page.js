import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

export const metadata = { title: 'About Us — HealthONTime' };

const OFFERINGS = [
  {
    icon: '🧪',
    title: 'Online Diagnostic Test Booking',
    desc: 'Browse and book thousands of laboratory tests from trusted diagnostic partners through a simple online booking process.',
  },
  {
    icon: '🏠',
    title: 'Home Sample Collection',
    desc: 'Skip the travel and long waiting times. Our partner laboratories offer safe and convenient home sample collection by trained professionals.',
  },
  {
    icon: '❤️',
    title: 'Preventive Health Check-up Packages',
    desc: 'Choose from carefully designed health packages that help detect potential health issues early and support preventive healthcare.',
  },
  {
    icon: '📄',
    title: 'Digital Reports',
    desc: 'Access your laboratory reports securely online, allowing you to review and share them whenever required.',
  },
  {
    icon: '💰',
    title: 'Transparent Pricing',
    desc: 'Compare diagnostic test prices and select the option that best suits your healthcare needs and budget.',
  },
  {
    icon: '🎧',
    title: 'Customer Support',
    desc: 'Our dedicated support team is available to assist you throughout your healthcare journey—from booking your test to receiving your reports.',
  },
];

const VALUES = [
  {
    icon: '👤',
    title: 'Patient First',
    desc: 'Every decision we make is focused on improving the healthcare experience for our users.',
  },
  {
    icon: '🤝',
    title: 'Trust',
    desc: 'We collaborate with trusted diagnostic partners and strive to maintain transparency in every interaction.',
  },
  {
    icon: '⭐',
    title: 'Quality',
    desc: 'We continuously work to improve service quality through technology, operational excellence, and customer feedback.',
  },
  {
    icon: '🌍',
    title: 'Accessibility',
    desc: 'Healthcare should be available to everyone, regardless of location or schedule.',
  },
  {
    icon: '💡',
    title: 'Innovation',
    desc: 'We leverage digital technology to simplify healthcare processes and create better experiences for patients and healthcare providers.',
  },
];

const WHY_CHOOSE = [
  'Trusted diagnostic laboratory partners',
  'Affordable pricing',
  'Convenient online booking',
  'Home sample collection',
  'Secure digital reports',
  'Easy appointment scheduling',
  'User-friendly website and mobile application',
  'Fast customer support',
  'Transparent booking process',
  'Continuous technology innovation',
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white">

        {/* ── Hero ── */}
        <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">About HealthONTime</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-5">
              Making Quality Healthcare<br className="hidden sm:block" /> Simple, Affordable &amp; Accessible
            </h1>
            <p className="text-primary-100 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              At HealthONTime, we believe that every individual deserves quick, reliable, and affordable access to quality
              diagnostic healthcare. Our mission is to simplify the way people book laboratory tests by connecting them
              with trusted diagnostic centres and professional home sample collection services through one easy-to-use
              digital platform.
            </p>
          </div>
        </section>

        {/* ── Who We Are ── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Who We Are</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                HealthONTime is an innovative healthcare technology platform based in <strong>New Delhi</strong>,
                dedicated to transforming the diagnostic healthcare experience across India.
              </p>
              <p className="text-gray-600 leading-relaxed mb-5">Our platform enables users to:</p>
              <ul className="space-y-2">
                {[
                  'Book laboratory tests online',
                  'Schedule home sample collection',
                  'Compare diagnostic test prices',
                  'Choose from trusted partner laboratories',
                  'Receive digital reports securely',
                  'Access preventive health packages',
                  'Manage healthcare bookings anytime, anywhere',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-primary-50 rounded-2xl p-8 border border-primary-100">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">🎯 Our Mission</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    To empower individuals and families with convenient access to trusted diagnostic services through
                    technology, transparency, and affordability. We strive to remove barriers to preventive healthcare
                    by making laboratory testing simple, fast, and available from the comfort of your home.
                  </p>
                </div>
                <div className="h-px bg-primary-100" />
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">🔭 Our Vision</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    To become India's most trusted digital diagnostic healthcare platform by creating a connected
                    ecosystem where patients, laboratories, and healthcare providers work together to deliver better
                    health outcomes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── What We Offer ── */}
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What We Offer</h2>
              <p className="text-gray-500 text-sm">
                A wide range of healthcare solutions designed to make diagnostic services easier and more accessible.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {OFFERINGS.map((o) => (
                <div key={o.title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-2xl mb-3 block">{o.icon}</span>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5">{o.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{o.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Choose Us ── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose HealthONTime?</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">
                We are committed to delivering a better healthcare experience by focusing on:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {WHY_CHOOSE.map((item) => (
                  <div key={item} className="flex items-center gap-2.5 bg-primary-50 rounded-lg px-3 py-2.5 border border-primary-100">
                    <span className="text-primary-600 font-bold text-xs">✓</span>
                    <span className="text-sm text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Values */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-5">Our Core Values</h2>
              <div className="space-y-4">
                {VALUES.map((v) => (
                  <div key={v.title} className="flex gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{v.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{v.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{v.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Commitment ── */}
        <section className="bg-primary-600 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Our Commitment</h2>
            <p className="text-primary-100 leading-relaxed mb-3">
              At HealthONTime, we are committed to making healthcare more convenient, reliable, and accessible.
              We continuously enhance our platform by introducing new features, improving user experience,
              expanding our network of diagnostic partners, and adopting secure technologies to protect user information.
            </p>
            <p className="text-primary-100 leading-relaxed mb-8">
              Our objective is to become a trusted healthcare companion for individuals, families, and organizations
              seeking dependable diagnostic services.
            </p>
            <Link
              href="/search"
              className="inline-block bg-white text-primary-700 font-bold px-8 py-3 rounded-xl hover:bg-primary-50 transition-colors text-sm"
            >
              Book a Test Now
            </Link>
          </div>
        </section>

        {/* ── Join Community ── */}
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Join the HealthONTime Community</h2>
          <p className="text-gray-500 leading-relaxed text-sm mb-8">
            Whether you're booking your first health check-up, scheduling a home sample collection for your family,
            or managing regular diagnostic testing, HealthONTime is here to support your healthcare journey.
            Together, let's build a healthier future through smarter, simpler, and more accessible healthcare.
          </p>

          {/* Contact block */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-left inline-block w-full max-w-md mx-auto">
            <h3 className="font-bold text-gray-900 mb-3">Contact Us</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <span>📍</span>
                808B, DLF Prime Tower, Pocket E, Okhla Phase I, Okhla Industrial Estate, New Delhi - 110020
              </p>
              <p className="flex items-center gap-2">
                <span>📞</span>
                <a href="tel:+917090002002" className="text-primary-600 hover:underline">+91 7090 002 002</a>
              </p>
              <p className="flex items-center gap-2">
                <span>✉️</span>
                <a href="mailto:info@healthontime.in" className="text-primary-600 hover:underline">info@healthontime.in</a>
              </p>
              <p className="flex items-center gap-2">
                <span>🌐</span>
                <a href="https://healthontime.in" className="text-primary-600 hover:underline">healthontime.in</a>
              </p>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
