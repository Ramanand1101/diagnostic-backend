'use client';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { FiShoppingCart, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getProductIcon } from '@/lib/productIcon';

export default function ProductCard({ product }) {
  const { addItem, items } = useCart();
  const inCart = items.some((i) => i._id === product._id);

  const mrp = product.price || 0;
  const sale = product.salePrice && product.salePrice < mrp ? product.salePrice : mrp;
  const hasDiscount = sale < mrp;
  const discountPercent = product.discountPercent || (hasDiscount ? Math.round((1 - sale / mrp) * 100) : 0);
  const { icon: Icon, color, bg } = getProductIcon(product);

  const handleAddToCart = () => {
    addItem(product);
    toast.success(`${product.name} added to cart!`, { icon: '🛒' });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-lg transition-all p-3 sm:p-7 flex flex-col text-center">
      <Link href={`/products/${product.slug}`} className="flex flex-col items-center flex-1">
        <div className={`w-16 h-16 sm:w-28 sm:h-28 ${bg} rounded-full flex items-center justify-center mb-2 sm:mb-4`}>
          <Icon className={`text-2xl sm:text-5xl ${color}`} />
        </div>
        <h3 className="font-semibold text-gray-900 text-xs sm:text-base leading-snug line-clamp-2 mb-2 sm:mb-3 min-h-[2rem] sm:min-h-[2.75rem]">
          {product.name}
        </h3>
        <div className="flex items-baseline justify-center gap-1 sm:gap-2 flex-wrap mb-1">
          {hasDiscount && <span className="text-[11px] sm:text-sm line-through text-gray-400">₹{mrp.toLocaleString('en-IN')}</span>}
          <span className="text-sm sm:text-xl font-extrabold text-primary-700">₹{sale.toLocaleString('en-IN')}</span>
          {discountPercent > 0 && (
            <span className="text-[9px] sm:text-xs font-bold bg-secondary-100 text-secondary-700 px-1.5 sm:px-2 py-0.5 rounded-full">
              {discountPercent}% off
            </span>
          )}
        </div>
      </Link>

      {inCart ? (
        <Link
          href="/cart"
          className="mt-2 sm:mt-4 flex items-center justify-center gap-1.5 sm:gap-2 w-full py-2 sm:py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-[11px] sm:text-sm transition-colors shadow-sm"
        >
          <FiCheck /> View Cart
        </Link>
      ) : (
        <button
          onClick={handleAddToCart}
          className="mt-2 sm:mt-4 flex items-center justify-center gap-1.5 sm:gap-2 w-full py-2 sm:py-3 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-[11px] sm:text-sm transition-colors shadow-sm"
        >
          <FiShoppingCart /> Add to Cart
        </button>
      )}
    </div>
  );
}
