import Link from 'next/link';
import { FiMapPin, FiStar, FiCheckCircle, FiClock, FiArrowRight } from 'react-icons/fi';
import { GiMicroscope } from 'react-icons/gi';

export default function LabCard({ lab, compareIds, onToggleCompare }) {
  const isSelected = compareIds?.includes(lab._id);
  const topBadge = lab.accreditation?.[0] || (lab.homeCollection ? 'Home Collection' : lab.featured ? 'Featured' : null);

  return (
    <div className={`bg-white rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1 group overflow-hidden flex flex-col h-full ${
      isSelected ? 'border-primary-400 ring-2 ring-primary-200' : 'border-gray-100'
    }`}>
      {/* "Photo" hero — no real lab photography yet, so the brand logo sits inside a
          soft gradient frame styled the same way a hero image would be */}
      <div className="relative m-3 mb-0 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-100 via-primary-50 to-secondary-100 aspect-[4/3] flex items-center justify-center">
        {topBadge && (
          <span className="absolute top-3 left-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide px-2 sm:px-2.5 py-1 rounded-full bg-white/90 text-primary-700 shadow-sm">
            {topBadge}
          </span>
        )}
        <span className="absolute top-3 right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center" title={lab.verificationStatus === 'verified' ? 'Verified' : undefined}>
          {lab.verificationStatus === 'verified'
            ? <FiCheckCircle className="text-secondary-500 text-sm sm:text-base" />
            : <FiMapPin className="text-gray-400 text-xs sm:text-sm" />}
        </span>

        {lab.brand?.logo ? (
          <img src={lab.brand.logo} alt={lab.brand.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="w-28 h-28 rounded-2xl flex items-center justify-center shadow-md overflow-hidden bg-white">
            <div className="w-full h-full bg-primary-600 flex items-center justify-center">
              <GiMicroscope className="text-white text-3xl" />
            </div>
          </div>
        )}

        {typeof lab.distanceKm === 'number' && (
          <span className="absolute bottom-3 right-3 text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full bg-primary-600 text-white shadow-sm">
            {lab.distanceKm < 1 ? `${Math.round(lab.distanceKm * 1000)} m` : `${lab.distanceKm} km`}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-3 sm:px-4 pt-3 pb-4 flex flex-col flex-1 gap-3">
        <div>
          <Link href={`/labs/${lab.slug}`}>
            <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1 text-sm sm:text-base lg:text-lg leading-snug">
              {lab.name}
            </h3>
          </Link>
          {lab.brand?.name && (
            <p className="text-[11px] sm:text-xs text-primary-600 font-medium mt-0.5 line-clamp-1">{lab.brand.name}</p>
          )}
          <div className="flex items-center gap-1.5 text-gray-500 text-[11px] sm:text-xs mt-1">
            <FiMapPin className="flex-shrink-0 text-[10px] sm:text-[11px]" />
            <span className="line-clamp-1">{lab.city}{lab.state ? `, ${lab.state}` : ''}</span>
          </div>
        </div>

        {/* Stat row — same two-column icon+number layout as the price-card reference,
            swapped for lab-relevant facts (rating, report turnaround) */}
        <div className="flex items-center justify-between border-y border-gray-100 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
              <FiStar className="text-yellow-400 fill-yellow-400 text-[10px] sm:text-xs" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-[11px] sm:text-xs font-bold text-gray-800">{lab.ratingAvg > 0 ? lab.ratingAvg.toFixed(1) : 'New'}</p>
              <p className="text-[9px] sm:text-[10px] text-gray-400 truncate">{lab.ratingAvg > 0 ? `${lab.reviewCount} reviews` : 'No ratings yet'}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-100 shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
              <FiClock className="text-primary-500 text-[10px] sm:text-xs" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-[11px] sm:text-xs font-bold text-gray-800 truncate">{lab.reportDeliveryTime || 'Varies'}</p>
              <p className="text-[9px] sm:text-[10px] text-gray-400">Report Time</p>
            </div>
          </div>
        </div>

        {/* Actions — a real second action (Compare) when the caller supports it,
            otherwise a single full-width primary button rather than a fake duplicate */}
        <div className="flex items-center gap-2 mt-auto">
          {onToggleCompare && (
            <button
              onClick={() => onToggleCompare(lab._id)}
              className={`text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border transition-colors shrink-0 ${
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
            className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm"
          >
            View Lab <FiArrowRight className="text-xs" />
          </Link>
        </div>
      </div>
    </div>
  );
}
