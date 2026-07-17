import Link from 'next/link';
import { FiMapPin, FiStar, FiHome, FiCheckCircle, FiClock } from 'react-icons/fi';
import { GiMicroscope } from 'react-icons/gi';

export default function LabCard({ lab, compareIds, onToggleCompare }) {
  const isSelected = compareIds?.includes(lab._id);

  return (
    <div className={`bg-white rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1 group overflow-hidden flex flex-col ${
      isSelected ? 'border-primary-400 ring-2 ring-primary-200' : 'border-gray-100'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-5 pt-10 pb-8 flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden bg-white border border-gray-100">
          {lab.brand?.logo ? (
            <img src={lab.brand.logo} alt={lab.brand.name} className="w-full h-full object-contain p-1.5" />
          ) : (
            <div className="w-full h-full bg-primary-600 flex items-center justify-center">
              <GiMicroscope className="text-white text-2xl" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/labs/${lab.slug}`}>
            <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1 text-lg leading-snug">
              {lab.name}
            </h3>
          </Link>
          {lab.brand?.name && (
            <p className="text-xs text-primary-600 font-medium mt-0.5">{lab.brand.name}</p>
          )}
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
            <FiMapPin className="flex-shrink-0 text-xs" />
            <span className="line-clamp-1">{lab.city}{lab.state ? `, ${lab.state}` : ''}</span>
          </div>
        </div>
        {lab.verificationStatus === 'verified' && (
          <FiCheckCircle className="text-secondary-500 text-xl flex-shrink-0 mt-0.5" title="Verified" />
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-8 flex flex-col flex-1 gap-5">
        {/* Rating */}
        {lab.ratingAvg > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-full">
              <FiStar className="text-yellow-400 fill-yellow-400 text-sm" />
              <span className="text-sm font-bold text-yellow-700">{lab.ratingAvg.toFixed(1)}</span>
            </div>
            <span className="text-sm text-gray-400">({lab.reviewCount} reviews)</span>
          </div>
        ) : (
          <div className="h-7" />
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {lab.homeCollection && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-secondary-50 text-secondary-700 rounded-full font-semibold border border-secondary-100">
              <FiHome className="text-xs" /> Home Collection
            </span>
          )}
          {lab.accreditation?.slice(0, 2).map((acc) => (
            <span key={acc} className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full font-semibold border border-purple-100">{acc}</span>
          ))}
          {lab.featured && (
            <span className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full font-semibold border border-yellow-100">Featured</span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 mt-auto pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            {lab.reportDeliveryTime && (
              <>
                <FiClock className="text-xs flex-shrink-0" />
                <span>Report in {lab.reportDeliveryTime}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onToggleCompare && (
              <button
                onClick={() => onToggleCompare(lab._id)}
                className={`text-xs px-3 py-2 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {isSelected ? '✓ Added' : '+ Compare'}
              </button>
            )}
            <Link
              href={`/labs/${lab.slug}`}
              className="text-sm font-bold px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm"
            >
              View Lab
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
