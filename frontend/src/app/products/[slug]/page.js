'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { PageLoader } from '@/components/ui/Spinner';
import { productApi, bookingApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, getErrorMessage } from '@/utils/helpers';
import { FiClock, FiDroplet, FiHome, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    slotDate: '', slotTime: '', visitType: 'lab', address: '',
    patientName: '', patientAge: '', patientGender: 'male',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    productApi.getBySlug(slug)
      .then((res) => setProduct(res.data.product || res.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleBook = async () => {
    if (!user) { router.push('/login'); return; }
    setBookingModal(true);
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        lab: product.lab?._id || product.lab,
        items: [{ product: product._id, name: product.name, qty: 1, price: product.salePrice || product.price }],
        patients: [{ name: bookingForm.patientName, age: +bookingForm.patientAge, gender: bookingForm.patientGender, relation: 'self' }],
        slotDate: bookingForm.slotDate,
        slotTime: bookingForm.slotTime,
        visitType: bookingForm.visitType,
        address: bookingForm.address,
        subtotal: product.salePrice || product.price,
        total: product.salePrice || product.price,
        paymentMethod: 'cash',
      };
      const res = await bookingApi.create(payload);
      toast.success('Booking created successfully!');
      setBookingModal(false);
      router.push(`/dashboard/bookings/${res.data.booking?._id || res.data._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <><Navbar /><PageLoader /><Footer /></>;
  if (!product) return <><Navbar /><div className="text-center py-20">Product not found</div><Footer /></>;

  const hasDiscount = product.salePrice && product.salePrice < product.price;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary-600">Home</Link> &gt;{' '}
          <Link href="/products" className="hover:text-primary-600">Tests</Link> &gt;{' '}
          <span className="text-gray-700">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-start justify-between mb-3">
                <span className={`badge text-xs ${product.type === 'test' ? 'bg-primary-50 text-primary-700' : product.type === 'package' ? 'bg-secondary-50 text-secondary-700' : 'bg-purple-50 text-purple-700'}`}>
                  {product.type}
                </span>
                {product.isFeatured && <span className="badge bg-yellow-50 text-yellow-700 text-xs">Featured</span>}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
              {product.lab?.name && (
                <p className="text-gray-500 text-sm mb-4">
                  By <Link href={`/labs/${product.lab.slug}`} className="text-primary-600 hover:underline">{product.lab.name}</Link>
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
                {product.reportTime && <div className="flex items-center gap-1.5"><FiClock className="text-primary-500" /> Report in {product.reportTime}</div>}
                {product.sampleType && <div className="flex items-center gap-1.5"><FiDroplet className="text-primary-500" /> Sample: {product.sampleType}</div>}
                {product.homeCollection && <div className="flex items-center gap-1.5"><FiHome className="text-primary-500" /> Home Collection Available</div>}
                {product.fastingRequired && <div className="flex items-center gap-1.5"><FiAlertCircle className="text-gray-500" /> Fasting Required</div>}
              </div>
            </div>

            {product.description && (
              <div className="card">
                <h2 className="font-semibold mb-3">About this test</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {product.tags?.length > 0 && (
              <div className="card">
                <h2 className="font-semibold mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span key={tag} className="badge bg-gray-100 text-gray-600 text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking card */}
          <div className="lg:col-span-1">
            <div className="card sticky top-20">
              <div className="mb-4">
                {hasDiscount ? (
                  <>
                    <div className="text-3xl font-bold text-primary-600">{formatCurrency(product.salePrice)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-400 line-through text-sm">{formatCurrency(product.price)}</span>
                      <span className="text-green-600 text-sm font-medium">{product.discountPercent}% off</span>
                    </div>
                  </>
                ) : (
                  <div className="text-3xl font-bold text-primary-600">{formatCurrency(product.price)}</div>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-6">
                {product.homeCollection && <p className="flex items-center gap-2"><FiHome className="text-green-500" /> Home collection available</p>}
                {product.reportTime && <p className="flex items-center gap-2"><FiClock className="text-primary-500" /> Report in {product.reportTime}</p>}
              </div>

              <button onClick={handleBook} className="btn-primary w-full py-3 text-base font-semibold">
                Book Now
              </button>

              {!user && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  <Link href="/login" className="text-primary-600">Login</Link> required to book
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Booking Modal */}
      <Modal open={bookingModal} onClose={() => setBookingModal(false)} title="Book Appointment" size="md">
        <form onSubmit={submitBooking} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
              <input required value={bookingForm.patientName} onChange={(e) => setBookingForm((f) => ({ ...f, patientName: e.target.value }))} className="input" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input required type="number" min="1" max="120" value={bookingForm.patientAge} onChange={(e) => setBookingForm((f) => ({ ...f, patientAge: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={bookingForm.patientGender} onChange={(e) => setBookingForm((f) => ({ ...f, patientGender: e.target.value }))} className="input">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type</label>
              <select value={bookingForm.visitType} onChange={(e) => setBookingForm((f) => ({ ...f, visitType: e.target.value }))} className="input">
                <option value="lab">Visit Lab</option>
                {product.homeCollection && <option value="home">Home Collection</option>}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
            <input required type="date" min={new Date().toISOString().split('T')[0]} value={bookingForm.slotDate} onChange={(e) => setBookingForm((f) => ({ ...f, slotDate: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
            <input required type="time" value={bookingForm.slotTime} onChange={(e) => setBookingForm((f) => ({ ...f, slotTime: e.target.value }))} className="input" />
          </div>
          {bookingForm.visitType === 'home' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collection Address</label>
              <textarea required value={bookingForm.address} onChange={(e) => setBookingForm((f) => ({ ...f, address: e.target.value }))} className="input" rows={2} placeholder="Full address" />
            </div>
          )}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-lg font-bold text-primary-600">{formatCurrency(product.salePrice || product.price)}</span>
            <button type="submit" disabled={submitting} className="btn-primary px-8">
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
