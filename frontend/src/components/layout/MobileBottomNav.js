'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { FiUser, FiShoppingCart, FiPhone } from 'react-icons/fi';
import { RiWhatsappLine } from 'react-icons/ri';
import { CONTACT_PHONE } from '@/config/contact';

// Admin/dashboard/auth routes already have their own navigation chrome (sidebar,
// stepper, etc) — the customer-facing bottom tab bar would just be visual clutter
// there, so it only renders on the public storefront pages.
const HIDDEN_PREFIXES = ['/admin', '/dashboard', '/login', '/register'];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { count: cartCount } = useCart();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const digits = CONTACT_PHONE.replace(/[^+\d]/g, '');

  return (
    <>
      {/* Spacer so the fixed bar below doesn't cover the last bit of page content */}
      <div className="h-16 md:hidden" />
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-4">
          <Link
            href={user ? '/dashboard/profile' : '/login'}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold ${pathname.startsWith('/dashboard/profile') ? 'text-primary-600' : 'text-gray-800'}`}
          >
            <FiUser className="text-xl" />
            Account
          </Link>

          <Link
            href="/cart"
            className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold ${pathname === '/cart' ? 'text-primary-600' : 'text-gray-800'}`}
          >
            <span className="relative">
              <FiShoppingCart className="text-xl" />
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            </span>
            Cart
          </Link>

          <a
            href={`https://wa.me/${digits.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold text-gray-800"
          >
            <span className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
              <RiWhatsappLine className="text-white text-lg" />
            </span>
            Chat
          </a>

          <a
            href={`tel:${digits}`}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold text-gray-800"
          >
            <FiPhone className="text-xl" />
            Call
          </a>
        </div>
      </nav>
    </>
  );
}
