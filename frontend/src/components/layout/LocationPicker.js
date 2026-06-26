'use client';
import { useState } from 'react';
import { FiMapPin, FiChevronDown } from 'react-icons/fi';
import { useCity } from '@/context/CityContext';
import CityPickerModal from './CityPickerModal';

export default function LocationPicker() {
  const { city } = useCity();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex flex-col items-start leading-none group"
        aria-haspopup="dialog"
      >
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-0.5">
          <FiMapPin className="text-amber-500 text-xs" />
          My Location
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">
          <span className={city ? 'text-gray-900' : 'text-gray-400'}>
            {city || 'Select City'}
          </span>
          <FiChevronDown className="text-gray-400 text-sm" />
        </span>
      </button>

      <CityPickerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
