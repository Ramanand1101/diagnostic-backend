import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { CityProvider } from '@/context/CityContext';
import { CartProvider } from '@/context/CartContext';

export const metadata = {
  title: 'DiagnosticHub - Book Lab Tests & Health Packages',
  description: 'Find and book diagnostic lab tests, health checkup packages near you.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CityProvider>
            <CartProvider>
              {children}
              <Toaster position="top-right" />
            </CartProvider>
          </CityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
