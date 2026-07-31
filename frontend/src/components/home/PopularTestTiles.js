'use client';
import Link from 'next/link';
import { useCity } from '@/context/CityContext';
import { FiActivity, FiShield, FiSearch } from 'react-icons/fi';
import { MdOutlineBloodtype, MdOutlineScience } from 'react-icons/md';
import { TbHeartbeat, TbVirus } from 'react-icons/tb';

const TEST_ICON_MAP = {
  cbc: { icon: MdOutlineBloodtype, color: 'text-red-500', bg: 'bg-red-50' },
  thyroid: { icon: TbHeartbeat, color: 'text-pink-500', bg: 'bg-pink-50' },
  'vitamin-d': { icon: MdOutlineScience, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  hba1c: { icon: TbVirus, color: 'text-purple-500', bg: 'bg-purple-50' },
  lipid: { icon: FiActivity, color: 'text-blue-500', bg: 'bg-blue-50' },
  liver: { icon: FiShield, color: 'text-green-500', bg: 'bg-green-50' },
  default: { icon: FiSearch, color: 'text-gray-500', bg: 'bg-gray-50' },
};
// Slug from the CMS isn't guaranteed to exactly match the keys above (case,
// whitespace, or a differently-worded slug) — fall back to matching keywords
// in the slug/name before giving up and showing the generic search icon.
const TEST_ICON_KEYWORDS = [
  { keys: ['cbc', 'complete blood count', 'blood count'], key: 'cbc' },
  { keys: ['thyroid'], key: 'thyroid' },
  { keys: ['vitamin d', 'vitamin-d', 'vitamind'], key: 'vitamin-d' },
  { keys: ['hba1c', 'glycated'], key: 'hba1c' },
  { keys: ['lipid', 'cholesterol'], key: 'lipid' },
  { keys: ['liver'], key: 'liver' },
];
function getTestTileMeta(name, slug) {
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (TEST_ICON_MAP[normalizedSlug]) return TEST_ICON_MAP[normalizedSlug];
  const haystack = `${normalizedSlug} ${name || ''}`.toLowerCase();
  const match = TEST_ICON_KEYWORDS.find(({ keys }) => keys.some((k) => haystack.includes(k)));
  return (match && TEST_ICON_MAP[match.key]) || TEST_ICON_MAP.default;
}

export default function PopularTestTiles({ popularTests }) {
  const { city } = useCity();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {popularTests.map(({ name, slug }) => {
        const meta = getTestTileMeta(name, slug);
        const Icon = meta.icon;
        const href = `/search?q=${encodeURIComponent(name)}${city ? `&city=${encodeURIComponent(city)}` : ''}`;
        return (
          <Link
            key={slug}
            href={href}
            className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all text-center"
          >
            <div className={`w-12 h-12 ${meta.bg} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <Icon className={`text-2xl ${meta.color}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600 leading-tight">{name}</span>
          </Link>
        );
      })}
    </div>
  );
}
