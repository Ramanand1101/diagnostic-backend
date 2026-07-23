'use client';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/utils/helpers';
import { FiClock, FiDroplet, FiHome, FiAlertCircle, FiShoppingCart, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ProductDetailClient({ product }) {
  const { addItem, items } = useCart();
  const inCart = items.some((i) => i._id === product._id);
  const tm     = product.testMaster || {};

  const hasDiscount     = product.salePrice && product.salePrice < product.price;
  const reportTime      = tm.reportTime      || product.reportTime;
  const sampleType      = tm.sampleType      || product.sampleType;
  const homeCollection  = tm.homeCollection  ?? product.homeCollection;
  const fastingRequired = tm.fastingRequired ?? product.fastingRequired;
  const description     = tm.description     || product.description;

  const handleAddToCart = () => {
    addItem(product);
    toast.success(`${product.name} added to cart!`, { icon: '🛒' });
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary-600">Home</Link> &gt;{' '}
        <Link href="/products" className="hover:text-primary-600">Tests</Link> &gt;{' '}
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
              {reportTime      && <div className="flex items-center gap-1.5"><FiClock className="text-primary-500" /> Report in {reportTime}</div>}
              {sampleType      && <div className="flex items-center gap-1.5"><FiDroplet className="text-primary-500" /> Sample: {sampleType}</div>}
              {homeCollection  && <div className="flex items-center gap-1.5"><FiHome className="text-primary-500" /> Home Collection Available</div>}
              {fastingRequired && <div className="flex items-center gap-1.5"><FiAlertCircle className="text-gray-500" /> Fasting Required</div>}
            </div>
          </div>

          {description && (
            <div className="card">
              <h2 className="font-semibold mb-3">About this test</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
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

        <div className="lg:col-span-1">
          <div className="card sticky top-20">
            <div className="mb-4">
              {hasDiscount ? (
                <>
                  <div className="text-3xl font-bold text-primary-600">{formatCurrency(product.salePrice)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-400 line-through text-sm">{formatCurrency(product.price)}</span>
                    {product.discountPercent && <span className="text-green-600 text-sm font-medium">{product.discountPercent}% off</span>}
                  </div>
                </>
              ) : (
                <div className="text-3xl font-bold text-primary-600">{formatCurrency(product.price)}</div>
              )}
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-6">
              {homeCollection && <p className="flex items-center gap-2"><FiHome className="text-green-500" /> Home collection available</p>}
              {reportTime     && <p className="flex items-center gap-2"><FiClock className="text-primary-500" /> Report in {reportTime}</p>}
            </div>

            {inCart ? (
              <Link href="/cart" className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700">
                <FiCheck /> View Cart
              </Link>
            ) : (
              <button onClick={handleAddToCart} className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2">
                <FiShoppingCart /> Add to Cart
              </button>
            )}

            {inCart && (
              <p className="text-xs text-gray-400 text-center mt-2">
                Already in cart — <Link href="/cart" className="text-primary-600 hover:underline">complete booking</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
