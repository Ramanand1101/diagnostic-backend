import './globals.css';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { CityProvider } from '@/context/CityContext';
import { CartProvider } from '@/context/CartContext';
import GoogleAuthProvider from '@/components/layout/GoogleAuthProvider';
import CookieConsent from '@/components/ui/CookieConsent';

export const metadata = {
  title: 'HealthOnTime - Book Lab Tests & Health Packages',
  description: 'Find and book diagnostic lab tests, health checkup packages near you.',
  icons: {
    icon: 'https://ramanand-s3-2026.s3.ap-southeast-2.amazonaws.com/public/favicon.png',
    shortcut: 'https://ramanand-s3-2026.s3.ap-southeast-2.amazonaws.com/public/favicon.png',
    apple: 'https://ramanand-s3-2026.s3.ap-southeast-2.amazonaws.com/public/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GoogleAuthProvider>
          <AuthProvider>
            <CityProvider>
              <CartProvider>
                {children}
                <Toaster position="top-right" toastOptions={{ duration: 4000 }}>
                  {(t) => (
                    <ToastBar toast={t}>
                      {({ icon, message }) => (
                        <>
                          {icon}
                          {message}
                          <button
                            onClick={() => toast.dismiss(t.id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#9ca3af', fontSize: '14px', lineHeight: 1,
                              padding: '0 2px 0 4px', flexShrink: 0,
                            }}
                            aria-label="Close"
                          >✕</button>
                        </>
                      )}
                    </ToastBar>
                  )}
                </Toaster>
                <CookieConsent />
              </CartProvider>
            </CityProvider>
          </AuthProvider>
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
