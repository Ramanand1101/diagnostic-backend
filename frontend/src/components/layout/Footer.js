import Link from 'next/link';
import { MdBiotech } from 'react-icons/md';
import { FiFacebook, FiTwitter, FiInstagram } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <MdBiotech className="text-xl text-primary-400" />
              DiagnosticHub
            </div>
            <p className="text-sm leading-relaxed">
              Your trusted platform for booking diagnostic lab tests and health checkup packages.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="hover:text-white transition-colors"><FiFacebook /></a>
              <a href="#" className="hover:text-white transition-colors"><FiTwitter /></a>
              <a href="#" className="hover:text-white transition-colors"><FiInstagram /></a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/labs" className="hover:text-white transition-colors">Find Labs</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">Tests & Packages</Link></li>
              <li><Link href="/blogs" className="hover:text-white transition-colors">Health Blog</Link></li>
              <li><Link href="/search" className="hover:text-white transition-colors">Search</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
              <li><Link href="/dashboard/bookings" className="hover:text-white transition-colors">My Bookings</Link></li>
              <li><Link href="/dashboard/reports" className="hover:text-white transition-colors">My Reports</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact & Support</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} DiagnosticHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
