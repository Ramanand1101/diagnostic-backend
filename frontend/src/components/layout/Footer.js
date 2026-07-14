import Link from 'next/link';
import { FiFacebook, FiTwitter, FiInstagram } from 'react-icons/fi';
import HealthOnTimeLogo from '@/components/layout/HealthOnTimeLogo';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Logo + social — always full width, centered, separate from columns ── */}
        <div className="flex flex-col items-center text-center mb-10 pb-8 border-b border-gray-800">
          <div className="mb-4">
            <HealthOnTimeLogo dark size="text-xl" showTagline />
          </div>
          <div className="flex gap-5 text-lg">
            <a href="#" className="hover:text-white transition-colors"><FiFacebook /></a>
            <a href="#" className="hover:text-white transition-colors"><FiTwitter /></a>
            <a href="#" className="hover:text-white transition-colors"><FiInstagram /></a>
          </div>
        </div>

        {/* ── 4 link columns — tight, no mixing ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/labs" className="hover:text-white transition-colors">Find Labs</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">Tests & Packages</Link></li>
              <li><Link href="/blogs" className="hover:text-white transition-colors">Health Blog</Link></li>
              <li><Link href="/search" className="hover:text-white transition-colors">Search</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Account</h4>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
              <li><Link href="/dashboard/bookings" className="hover:text-white transition-colors">My Bookings</Link></li>
              <li><Link href="/dashboard/reports" className="hover:text-white transition-colors">My Reports</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Support</h4>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact & Support</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/grievance" className="hover:text-white transition-colors">Grievance Redressal</Link></li>
              <li><Link href="/medical-disclaimer" className="hover:text-white transition-colors">Medical Disclaimer</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Legal</h4>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white transition-colors">Refund & Cancellation</Link></li>
              <li><Link href="/shipping-policy" className="hover:text-white transition-colors">Service Delivery</Link></li>
              <li><Link href="/data-deletion" className="hover:text-white transition-colors">Data Deletion</Link></li>
              <li><Link href="/dpdp-compliance" className="hover:text-white transition-colors">DPDP Compliance</Link></li>
              <li><Link href="/user-consent" className="hover:text-white transition-colors">User Consent</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} HealthOnTime. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
