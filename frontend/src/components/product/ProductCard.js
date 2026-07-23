'use client';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { MdOutlineScience, MdOutlineBloodtype, MdOutlineMedication } from 'react-icons/md';
import { TbHeartbeat } from 'react-icons/tb';
import { GiMicroscope } from 'react-icons/gi';
import { FiShoppingCart, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TYPE_STYLES = {
  test:     { grad: 'from-blue-500 to-indigo-600',    Icon: MdOutlineBloodtype },
  package:  { grad: 'from-purple-500 to-fuchsia-600', Icon: GiMicroscope       },
  medicine: { grad: 'from-teal-500 to-green-600',     Icon: MdOutlineMedication },
};

function pickStyle(name = '', type = '') {
  const base = TYPE_STYLES[type];
  if (base) return base;
  const grads = [
    { grad: 'from-sky-500 to-blue-600',      Icon: MdOutlineScience },
    { grad: 'from-rose-500 to-pink-600',     Icon: TbHeartbeat      },
    { grad: 'from-amber-500 to-orange-600',  Icon: MdOutlineBloodtype },
    { grad: 'from-emerald-500 to-teal-600',  Icon: GiMicroscope     },
  ];
  const idx = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % grads.length;
  return grads[idx];
}

export default function ProductCard({ product }) {
  const { addItem, items } = useCart();
  const inCart = items.some((i) => i._id === product._id);

  const price = product.salePrice || product.price;
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const features = (product.tags || []).slice(0, 4);
  const { grad, Icon } = pickStyle(product.name, product.type);

  const handleAddToCart = () => {
    addItem(product);
    toast.success(`${product.name} added to cart!`, { icon: '🛒' });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden flex flex-col">

      {/* Gradient header */}
      <Link href={`/products/${product.slug}`} className="block">
        <div className={`relative h-44 bg-gradient-to-br ${grad} flex items-center justify-center overflow-hidden`}>
          <Icon className="absolute -bottom-3 -right-3 text-[130px] text-white/15" />
          <Icon className="text-white text-5xl drop-shadow-lg" />
          <span className="absolute top-3 left-3 text-xs font-semibold capitalize bg-white/20 text-white px-2.5 py-0.5 rounded-full backdrop-blur-sm">
            {product.type}
          </span>
          {hasDiscount && (
            <span className="absolute top-3 right-3 text-xs font-bold bg-red-500 text-white px-2.5 py-0.5 rounded-full">
              Sale
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">

        {/* Name */}
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-bold text-primary-600 group-hover:text-primary-700 transition-colors text-lg leading-snug line-clamp-2 mb-1.5">
            {product.name}
          </h3>
        </Link>

        {/* Description */}
        {(product.testMaster?.description || product.description) && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">
            {product.testMaster?.description || product.description}
          </p>
        )}

        {/* Tags */}
        {features.length > 0 && (
          <div className="mb-4 flex-1">
            {features.map((tag, i) => (
              <div key={tag}>
                {i > 0 && <div className="h-px bg-gray-100" />}
                <p className="py-2 text-sm text-gray-600">{tag}</p>
              </div>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4 mt-auto">
          <span className="text-2xl font-extrabold text-green-600">₹{price?.toLocaleString('en-IN')}</span>
          <span className="text-sm text-gray-400">Only</span>
          {hasDiscount && (
            <span className="text-xs line-through text-gray-400 ml-1">₹{product.price?.toLocaleString('en-IN')}</span>
          )}
        </div>

        {/* Add to Cart */}
        {inCart ? (
          <Link
            href="/cart"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors shadow-sm"
          >
            <FiCheck /> View Cart
          </Link>
        ) : (
          <button
            onClick={handleAddToCart}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-sm transition-colors shadow-sm"
          >
            <FiShoppingCart /> Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}
