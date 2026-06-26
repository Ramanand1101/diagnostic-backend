import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-8xl font-black text-gray-100 mb-2">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-8 max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3">
          <Link href="/" className="btn-primary">Go Home</Link>
          <Link href="/search" className="btn-secondary">Search</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
