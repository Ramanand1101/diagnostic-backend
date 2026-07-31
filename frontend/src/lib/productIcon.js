import { MdOutlineBloodtype, MdOutlinePregnantWoman, MdOutlineVaccines } from 'react-icons/md';
import { TbHeartbeat } from 'react-icons/tb';
import {
  GiLiver, GiKidneys, GiHeartOrgan, GiLungs, GiSkeleton, GiCancer, GiMale,
  GiVirus, GiChemicalDrop, GiBrain, GiStomach, GiEyeball, GiFruitBowl, GiTestTubes,
} from 'react-icons/gi';

// Keyword → icon rules, checked in order against "category name + product name" — the
// first match wins, so put more specific organs/conditions before generic ones.
export const ICON_RULES = [
  { keys: ['liver', 'hepat'], icon: GiLiver, color: 'text-green-600', bg: 'bg-green-50' },
  { keys: ['kidney', 'renal'], icon: GiKidneys, color: 'text-orange-600', bg: 'bg-orange-50' },
  { keys: ['thyroid'], icon: TbHeartbeat, color: 'text-pink-600', bg: 'bg-pink-50' },
  { keys: ['cardiac', 'heart', 'lipid', 'cholesterol'], icon: GiHeartOrgan, color: 'text-red-600', bg: 'bg-red-50' },
  { keys: ['diabet', 'glucose', 'sugar', 'hba1c', 'insulin'], icon: MdOutlineBloodtype, color: 'text-purple-600', bg: 'bg-purple-50' },
  { keys: ['vitamin', 'mineral', 'nutrition'], icon: GiFruitBowl, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { keys: ['lung', 'respiratory', 'pulmonary'], icon: GiLungs, color: 'text-sky-600', bg: 'bg-sky-50' },
  { keys: ['bone', 'joint', 'ortho', 'calcium', 'arthrit'], icon: GiSkeleton, color: 'text-slate-600', bg: 'bg-slate-100' },
  { keys: ['cancer', 'tumor', 'tumour', 'marker', 'oncology'], icon: GiCancer, color: 'text-rose-600', bg: 'bg-rose-50' },
  { keys: ['women', 'pregnan', 'fertility', 'prenatal', 'gynae'], icon: MdOutlinePregnantWoman, color: 'text-pink-500', bg: 'bg-pink-50' },
  { keys: ['men', 'prostate', 'testosterone'], icon: GiMale, color: 'text-blue-600', bg: 'bg-blue-50' },
  { keys: ['infect', 'fever', 'viral', 'covid', 'dengue', 'malaria', 'typhoid'], icon: GiVirus, color: 'text-purple-600', bg: 'bg-purple-50' },
  { keys: ['allerg'], icon: GiChemicalDrop, color: 'text-amber-600', bg: 'bg-amber-50' },
  { keys: ['brain', 'neuro'], icon: GiBrain, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { keys: ['stomach', 'gastro', 'digest', 'abdomen'], icon: GiStomach, color: 'text-orange-600', bg: 'bg-orange-50' },
  { keys: ['eye', 'vision', 'ophthal'], icon: GiEyeball, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { keys: ['vaccine', 'immun'], icon: MdOutlineVaccines, color: 'text-teal-600', bg: 'bg-teal-50' },
  { keys: ['blood', 'cbc', 'hematology', 'anemia', 'haemoglobin', 'hemoglobin'], icon: MdOutlineBloodtype, color: 'text-red-500', bg: 'bg-red-50' },
];
export const DEFAULT_ICON = { icon: GiTestTubes, color: 'text-primary-600', bg: 'bg-primary-50' };

export function getProductIcon(product) {
  const haystack = `${product.testMaster?.category?.name || ''} ${product.name || ''}`.toLowerCase();
  return ICON_RULES.find((rule) => rule.keys.some((k) => haystack.includes(k))) || DEFAULT_ICON;
}
