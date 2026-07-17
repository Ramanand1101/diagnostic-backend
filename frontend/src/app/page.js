import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import NewsletterSection from '@/components/home/NewsletterSection';
import FeaturedLabsSection from '@/components/home/FeaturedLabsSection';
import FeaturedProductsSection from '@/components/home/FeaturedProductsSection';
import {
  FiActivity, FiShield, FiClock, FiAward,
  FiSearch, FiCalendar, FiFileText, FiArrowRight,
  FiHeart, FiStar, FiDroplet, FiEye,
} from 'react-icons/fi';
import { MdOutlineBloodtype, MdOutlineScience } from 'react-icons/md';
import { TbHeartbeat, TbVirus } from 'react-icons/tb';

// Icon map for serialized icon names from CMS
const ICON_MAP = {
  FiShield, FiClock, FiActivity, FiAward, FiSearch, FiCalendar, FiFileText,
  FiHeart, FiStar, FiDroplet, FiEye,
};
const TEST_ICON_MAP = {
  cbc: { icon: MdOutlineBloodtype, color: 'text-red-500', bg: 'bg-red-50' },
  thyroid: { icon: TbHeartbeat, color: 'text-pink-500', bg: 'bg-pink-50' },
  'vitamin-d': { icon: MdOutlineScience, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  hba1c: { icon: TbVirus, color: 'text-purple-500', bg: 'bg-purple-50' },
  lipid: { icon: FiActivity, color: 'text-blue-500', bg: 'bg-blue-50' },
  liver: { icon: FiShield, color: 'text-green-500', bg: 'bg-green-50' },
  default: { icon: FiSearch, color: 'text-gray-500', bg: 'bg-gray-50' },
};

const DEFAULT_CONTENT = {
  stats: [
    { value: '2000+', label: 'Tests & Packages' },
    { value: '1000+', label: 'Partner Labs' },
    { value: '100+', label: 'Cities Covered' },
    { value: '30K+', label: 'Happy Patients' },
  ],
  whyUs: { title: 'Why HealthOnTime?', subtitle: 'Everything you need for hassle-free lab testing' },
  features: [
    { icon: 'FiShield', title: 'NABL Certified Labs', desc: 'All partner labs are NABL / CAP accredited and rigorously verified.', color: 'text-primary-600', bg: 'bg-primary-50' },
    { icon: 'FiClock', title: 'Fast Digital Reports', desc: 'Receive your test report digitally within hours, not days.', color: 'text-secondary-600', bg: 'bg-secondary-50' },
    { icon: 'FiActivity', title: 'Home Collection', desc: 'Our trained phlebotomists collect samples at your doorstep.', color: 'text-accent-600', bg: 'bg-accent-50' },
    { icon: 'FiAward', title: 'Best Prices', desc: 'Transparent pricing with no hidden fees and exclusive discounts.', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ],
  howItWorks: { title: 'How It Works', subtitle: 'Book your lab test in 3 simple steps' },
  steps: [
    { title: 'Search & Compare', desc: 'Browse 500+ tests and packages. Compare prices across certified labs in your city.' },
    { title: 'Book Your Slot', desc: 'Choose home collection or walk-in. Pick a time that fits your schedule.' },
    { title: 'Get Your Report', desc: 'Receive your digital report securely in your dashboard within hours.' },
  ],
  popularTests: [
    { name: 'CBC Test', slug: 'cbc' },
    { name: 'Thyroid Panel', slug: 'thyroid' },
    { name: 'Vitamin D', slug: 'vitamin-d' },
    { name: 'HbA1c', slug: 'hba1c' },
    { name: 'Lipid Profile', slug: 'lipid' },
    { name: 'Liver Function', slug: 'liver' },
  ],
  trustBanner: {
    title: "India's Most Trusted Lab Booking Platform",
    subtitle: 'We partner only with NABL & CAP certified labs to ensure accurate, reliable results every time.',
    btn1Text: 'Book a Test',
    btn1Href: '/products?type=test',
    btn2Text: 'Find a Lab',
    btn2Href: '/labs',
  },
};

const STEP_ICONS = [FiSearch, FiCalendar, FiFileText];

async function getHomeContent() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/home-content`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_CONTENT;
    return await res.json();
  } catch {
    return DEFAULT_CONTENT;
  }
}

async function getCategories() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories?limit=10`, {
      next: { revalidate: 600 },
    });
    const data = await res.json();
    return data.items || data.categories || [];
  } catch {
    return [];
  }
}

function SectionHeader({ title, subtitle, href, linkLabel = 'View all' }) {
  return (
    <div className="flex items-end justify-between mb-7">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 group"
        >
          {linkLabel}
          <FiArrowRight className="text-sm group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [content, categories] = await Promise.all([
    getHomeContent(),
    getCategories(),
  ]);

  const stats = content.stats || DEFAULT_CONTENT.stats;
  const features = content.features || DEFAULT_CONTENT.features;
  const steps = content.steps || DEFAULT_CONTENT.steps;
  const popularTests = content.popularTests || DEFAULT_CONTENT.popularTests;
  const trustBanner = content.trustBanner || DEFAULT_CONTENT.trustBanner;
  const whyUs = content.whyUs || DEFAULT_CONTENT.whyUs;
  const howItWorks = content.howItWorks || DEFAULT_CONTENT.howItWorks;

  return (
    <>
      <Navbar />
      <main>
        <Hero />

        {/* Stats cards */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {stats.map(({ value, label }) => (
                <div key={label}
                  className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-purple-400 via-indigo-400 to-blue-300 shadow-md">
                  <div className="rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 px-6 py-8 text-center h-full">
                    <p className="text-3xl md:text-4xl font-extrabold text-indigo-900 leading-none">{value}</p>
                    <p className="text-sm text-slate-500 mt-2 font-medium">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top Labs (city-aware client component) */}
        <FeaturedLabsSection />

        {/* Why choose us / Features */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900">{whyUs.title}</h2>
              <p className="text-sm text-gray-500 mt-2">{whyUs.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map(({ icon, title, desc, color, bg }) => {
                const Icon = ICON_MAP[icon] || FiShield;
                return (
                  <div key={title} className="group p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all">
                    <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className={`text-xl ${color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-gray-900">{howItWorks.title}</h2>
              <p className="text-sm text-gray-500 mt-2">{howItWorks.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-0.5 bg-primary-100 z-0" />
              {steps.map(({ title, desc }, idx) => {
                const Icon = STEP_ICONS[idx] || FiSearch;
                const num = String(idx + 1).padStart(2, '0');
                return (
                  <div key={num} className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-200 mb-5 relative">
                      <Icon className="text-2xl" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Popular tests */}
        <section className="py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title="Popular Health Tests"
              subtitle="Most-booked tests — quick access to what patients search for"
              href="/products?type=test"
              linkLabel="All tests"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {popularTests.map(({ name, slug }) => {
                const meta = TEST_ICON_MAP[slug] || TEST_ICON_MAP.default;
                const Icon = meta.icon;
                return (
                  <Link
                    key={slug}
                    href={`/search?q=${encodeURIComponent(name)}`}
                    className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all text-center"
                  >
                    <div className={`w-12 h-12 ${meta.bg} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`text-2xl ${meta.color}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600 leading-tight">{name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Browse by category (from DB) */}
        {categories.length > 0 && (
          <section className="py-14 bg-[#F8FAFC]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader
                title="Browse by Category"
                subtitle="Explore tests and packages by health category"
                href="/products"
              />
              <div className="flex flex-wrap gap-3">
                {categories.map((cat) => (
                  <Link
                    key={cat._id}
                    href={`/products?category=${cat._id}`}
                    className="bg-white border border-gray-200 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 px-5 py-2.5 rounded-full text-sm font-medium text-gray-700 shadow-sm transition-all"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured Products (city-aware client component) */}
        <FeaturedProductsSection />

        {/* Trust banner */}
        <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-14">
          <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{trustBanner.title}</h2>
            <p className="text-primary-200 mb-8 text-base">{trustBanner.subtitle}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href={trustBanner.btn1Href || '/products?type=test'} className="bg-white text-primary-700 font-semibold px-7 py-3 rounded-xl hover:bg-primary-50 transition-colors shadow-lg">
                {trustBanner.btn1Text}
              </Link>
              <Link href={trustBanner.btn2Href || '/labs'} className="border-2 border-white/40 text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/10 transition-colors">
                {trustBanner.btn2Text}
              </Link>
            </div>
          </div>
        </section>

        <NewsletterSection />
      </main>
      <Footer />
    </>
  );
}
