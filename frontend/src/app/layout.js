import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { CityProvider } from '@/context/CityContext';

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
            {children}
            <Toaster position="top-right" />
          </CityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
