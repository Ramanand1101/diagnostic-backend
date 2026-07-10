'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { FiMenu, FiX, FiUser, FiLogOut, FiPhone, FiShoppingCart, FiMail } from 'react-icons/fi';

const PHONE_NUMBER = '+91 70900 02002';
const EMAIL = 'info@healthontime.in';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { count: cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const userMenuRef = useRef(null);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); setUserOpen(false); router.push('/'); };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0 font-bold text-xl tracking-tight leading-none">
              <span style={{ color: '#1a2b6d' }}>Health</span>
              <span className="inline-flex items-center justify-center rounded-full border-[2.5px] mx-[1px]"
                style={{ color: '#2d8c3e', borderColor: '#2d8c3e', width: '1.15em', height: '1.15em', fontSize: '0.65em', marginTop: '1px' }}>
                ✓
              </span>
              <span style={{ color: '#2d8c3e' }}>N</span>
              <span style={{ color: '#1a2b6d' }}>Time</span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-5">
              <Link href="/labs" className="text-gray-600 hover:text-primary-600 font-medium text-sm whitespace-nowrap">
                Labs
              </Link>
              <Link href="/products" className="text-gray-600 hover:text-primary-600 font-medium text-sm whitespace-nowrap">
                Tests &amp; Packages
              </Link>
              <Link href="/about" className="text-gray-600 hover:text-primary-600 font-medium text-sm whitespace-nowrap">
                About Us
              </Link>
            </div>

            {/* Right: Phone + Auth */}
            <div className="hidden md:flex items-center gap-4 flex-shrink-0 ml-auto">
              <a
                href={`tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                <FiPhone className="text-base" />
                <span className="font-medium">{PHONE_NUMBER}</span>
              </a>

              <div className="w-px h-5 bg-gray-200" />

              <a
                href={`mailto:${EMAIL}`}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                <FiMail className="text-base" />
                <span className="font-medium">{EMAIL}</span>
              </a>

              <div className="w-px h-5 bg-gray-200" />

              <Link href="/cart" className="relative p-1.5 text-gray-600 hover:text-primary-600 transition-colors">
                <FiShoppingCart className="text-xl" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              <div className="w-px h-5 bg-gray-200" />

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserOpen((v) => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-600"
                    aria-expanded={userOpen}
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                      <FiUser />
                    </div>
                    {user.name?.split(' ')[0]}
                  </button>

                  {userOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      {isAdmin ? (
                        <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Admin Panel</Link>
                      ) : (
                        <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Dashboard</Link>
                      )}
                      <Link href="/dashboard/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Profile</Link>
                      <Link href="/dashboard/bookings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Bookings</Link>
                      <hr className="my-1" />
                      <button onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <FiLogOut /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-primary-600">Login</Link>
                  <Link href="/register" className="btn-primary text-sm py-1.5 px-4">Sign Up</Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button className="md:hidden ml-auto" onClick={() => setMenuOpen((v) => !v)}>
              {menuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <Link href="/labs" className="block text-gray-700 font-medium py-1" onClick={() => setMenuOpen(false)}>Labs</Link>
            <Link href="/products" className="block text-gray-700 font-medium py-1" onClick={() => setMenuOpen(false)}>Tests &amp; Packages</Link>
            <Link href="/about" className="block text-gray-700 font-medium py-1" onClick={() => setMenuOpen(false)}>About Us</Link>
            <a href={`tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`} className="flex items-center gap-2 text-gray-700 font-medium py-1">
              <FiPhone /> {PHONE_NUMBER}
            </a>
            <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 text-gray-700 font-medium py-1">
              <FiMail /> {EMAIL}
            </a>
            <div className="border-t border-gray-100 pt-3">
              {user ? (
                <>
                  <Link href={isAdmin ? '/admin' : '/dashboard'} className="block text-gray-700 font-medium py-1" onClick={() => setMenuOpen(false)}>
                    {isAdmin ? 'Admin Panel' : 'Dashboard'}
                  </Link>
                  <Link href="/dashboard/bookings" className="block text-gray-700 font-medium py-1" onClick={() => setMenuOpen(false)}>My Bookings</Link>
                  <button onClick={handleLogout} className="text-red-600 font-medium flex items-center gap-2 py-1"><FiLogOut /> Logout</button>
                </>
              ) : (
                <div className="flex gap-3">
                  <Link href="/login" className="btn-secondary flex-1 text-center text-sm" onClick={() => setMenuOpen(false)}>Login</Link>
                  <Link href="/register" className="btn-primary flex-1 text-center text-sm" onClick={() => setMenuOpen(false)}>Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        )}
    </nav>
  );
}
