require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Lab = require('../models/Lab');
const Product = require('../models/Product');
const Category = require('../models/Category');
const makeSlug = require('../utils/slug');

// ─── Categories ────────────────────────────────────────────────────────────────

const CATEGORY_DEFS = [
  { name: 'Blood Tests',               type: 'test',    seoTitle: 'Blood Tests',               seoDescription: 'Routine blood test panels' },
  { name: 'Diabetes & Thyroid',        type: 'test',    seoTitle: 'Diabetes & Thyroid Tests',  seoDescription: 'HbA1c, glucose and thyroid panels' },
  { name: 'Liver & Kidney Function',   type: 'test',    seoTitle: 'Liver & Kidney Tests',      seoDescription: 'LFT, KFT and related tests' },
  { name: 'Cardiac Health',            type: 'test',    seoTitle: 'Cardiac Health Tests',      seoDescription: 'Lipid profile and cardiac markers' },
  { name: 'Vitamins & Minerals',       type: 'test',    seoTitle: 'Vitamins & Minerals Tests', seoDescription: 'Vitamin D, B12 and mineral levels' },
  { name: 'Health Packages',           type: 'package', seoTitle: 'Health Checkup Packages',   seoDescription: 'Comprehensive diagnostic health packages' },
];

// ─── Product pool (20 templates, labs pick 4 each by index) ───────────────────

const PRODUCT_POOL = [
  // 0
  { type:'test',    name:'Complete Blood Count CBC',        price:499,  salePrice:399,  sampleType:'Blood',  reportTime:'4 hours',  fastingRequired:false, homeCollection:true,  catName:'Blood Tests',             description:'Measures red cells, white cells, haemoglobin and platelets.',                             tags:['blood','cbc','routine','haemoglobin'] },
  // 1
  { type:'test',    name:'Thyroid Profile T3 T4 TSH',       price:799,  salePrice:649,  sampleType:'Blood',  reportTime:'24 hours', fastingRequired:false, homeCollection:true,  catName:'Diabetes & Thyroid',      description:'Evaluates thyroid gland function; detects hypo and hyperthyroidism.',                      tags:['thyroid','tsh','t3','t4','hormones'] },
  // 2
  { type:'test',    name:'HbA1c Glycosylated Haemoglobin',  price:599,  salePrice:499,  sampleType:'Blood',  reportTime:'24 hours', fastingRequired:false, homeCollection:true,  catName:'Diabetes & Thyroid',      description:'Reflects average blood sugar over the past 3 months.',                                    tags:['diabetes','sugar','hba1c','glycated'] },
  // 3
  { type:'test',    name:'Liver Function Test LFT',         price:699,  salePrice:549,  sampleType:'Blood',  reportTime:'12 hours', fastingRequired:false, homeCollection:true,  catName:'Liver & Kidney Function', description:'Assesses liver health via SGOT, SGPT, bilirubin and alkaline phosphatase.',              tags:['liver','lft','sgpt','bilirubin'] },
  // 4
  { type:'test',    name:'Kidney Function Test KFT',        price:699,  salePrice:549,  sampleType:'Blood',  reportTime:'12 hours', fastingRequired:false, homeCollection:true,  catName:'Liver & Kidney Function', description:'Measures creatinine, urea and electrolytes to assess kidney function.',                  tags:['kidney','kft','creatinine','urea'] },
  // 5
  { type:'test',    name:'Lipid Profile Cholesterol',       price:599,  salePrice:449,  sampleType:'Blood',  reportTime:'24 hours', fastingRequired:true,  homeCollection:true,  catName:'Cardiac Health',          description:'Measures total cholesterol, LDL, HDL and triglycerides.',                                tags:['cholesterol','lipid','cardiac','ldl','hdl'] },
  // 6
  { type:'test',    name:'Vitamin D 25 OH Total',           price:999,  salePrice:799,  sampleType:'Blood',  reportTime:'24 hours', fastingRequired:false, homeCollection:true,  catName:'Vitamins & Minerals',     description:'Detects vitamin D deficiency linked to bone loss and immunity.',                          tags:['vitamin-d','deficiency','bone','immunity'] },
  // 7
  { type:'test',    name:'Vitamin B12 Cobalamin',           price:799,  salePrice:649,  sampleType:'Blood',  reportTime:'24 hours', fastingRequired:false, homeCollection:true,  catName:'Vitamins & Minerals',     description:'Checks B12 levels; deficiency causes anaemia and nerve damage.',                          tags:['vitamin-b12','cobalamin','anaemia','nerves'] },
  // 8
  { type:'test',    name:'Urine Routine Microscopy',        price:299,  salePrice:249,  sampleType:'Urine',  reportTime:'4 hours',  fastingRequired:false, homeCollection:false, catName:'Blood Tests',             description:'Detects infections, kidney disease and metabolic conditions via urine.',                   tags:['urine','routine','microscopy','infection'] },
  // 9
  { type:'test',    name:'Blood Glucose Fasting',           price:249,  salePrice:199,  sampleType:'Blood',  reportTime:'2 hours',  fastingRequired:true,  homeCollection:true,  catName:'Diabetes & Thyroid',      description:'Measures fasting blood sugar to screen and monitor diabetes.',                            tags:['diabetes','glucose','fasting','sugar'] },
  // 10
  { type:'package', name:'Basic Health Checkup Package',    price:1499, salePrice:999,  sampleType:'Blood',  reportTime:'24 hours', fastingRequired:true,  homeCollection:true,  catName:'Health Packages',         description:'30-parameter panel covering CBC, lipids, liver, kidney, glucose and thyroid.',             tags:['package','basic','health','checkup'] },
  // 11
  { type:'package', name:'Full Body Checkup Comprehensive', price:2999, salePrice:1999, sampleType:'Blood',  reportTime:'24 hours', fastingRequired:true,  homeCollection:true,  catName:'Health Packages',         description:'80+ parameters: CBC, organ function, vitamins, hormones and urine analysis.',              tags:['package','full-body','comprehensive','wellness'] },
  // 12
  { type:'package', name:'Diabetes Management Package',     price:1999, salePrice:1499, sampleType:'Blood',  reportTime:'24 hours', fastingRequired:true,  homeCollection:true,  catName:'Health Packages',         description:'HbA1c, fasting glucose, kidney and lipid panel to manage diabetes comprehensively.',       tags:['package','diabetes','management','hba1c'] },
  // 13
  { type:'package', name:'Cardiac Risk Assessment Package', price:2499, salePrice:1799, sampleType:'Blood',  reportTime:'24 hours', fastingRequired:true,  homeCollection:true,  catName:'Health Packages',         description:'Lipids, cardiac enzymes, homocysteine and ECG markers for heart health.',                  tags:['package','cardiac','heart','risk','lipid'] },
  // 14
  { type:'package', name:'Women Wellness Package',          price:2199, salePrice:1599, sampleType:'Blood',  reportTime:'48 hours', fastingRequired:true,  homeCollection:true,  catName:'Health Packages',         description:'Hormones, thyroid, iron, vitamins and pap-smear panel tailored for women.',               tags:['package','women','wellness','hormones','iron'] },
  // 15
  { type:'package', name:'Senior Citizen Health Package',   price:3499, salePrice:2499, sampleType:'Blood',  reportTime:'48 hours', fastingRequired:true,  homeCollection:true,  catName:'Health Packages',         description:'100+ parameter panel for age-related risk monitoring: cardiac, bone, organ and vitamins.', tags:['package','senior','elderly','bone','heart'] },
  // 16
  { type:'package', name:'Thyroid and Diabetes Panel',      price:1799, salePrice:1299, sampleType:'Blood',  reportTime:'24 hours', fastingRequired:false, homeCollection:true,  catName:'Health Packages',         description:'Combined thyroid profile and diabetes screening in one package.',                          tags:['package','thyroid','diabetes','hormones','sugar'] },
  // 17
  { type:'package', name:'Pre Employment Health Package',   price:999,  salePrice:749,  sampleType:'Blood',  reportTime:'24 hours', fastingRequired:false, homeCollection:false, catName:'Health Packages',         description:'Standard pre-employment panel: CBC, glucose, LFT, KFT and urine.',                        tags:['package','employment','pre-employment','corporate'] },
  // 18
  { type:'package', name:'Liver Kidney Function Panel',     price:1299, salePrice:999,  sampleType:'Blood',  reportTime:'24 hours', fastingRequired:false, homeCollection:true,  catName:'Health Packages',         description:'Combined LFT and KFT panel to assess both liver and kidney health together.',             tags:['package','liver','kidney','lft','kft'] },
  // 19
  { type:'package', name:'Anemia Profile Panel',            price:1199, salePrice:899,  sampleType:'Blood',  reportTime:'24 hours', fastingRequired:false, homeCollection:true,  catName:'Health Packages',         description:'Iron studies, ferritin, B12, folate and CBC to diagnose anaemia type.',                   tags:['package','anemia','iron','ferritin','b12'] },
];

// ─── Labs (20 entries) ─────────────────────────────────────────────────────────
// products: indices into PRODUCT_POOL (4 per lab)

const LABS = [
  {
    userIndex: 1,  name:'Apollo Diagnostics',         city:'Delhi',           state:'Delhi',           lat:28.6450, lng:77.2900,
    address:'21 Community Centre, Preet Vihar, Delhi',              pincode:'110092', phone:'011-29230000',
    email:'info@apollodelhi.in',         homeCollection:true,  featured:true,  ratingAvg:4.7, reviewCount:312,
    openingHours:'7:00 AM – 9:00 PM',   sampleCollectionTime:'6:00 AM – 8:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL','CAP'],        badges:['NABL Certified','Home Collection'],
    description:'ISO and NABL certified lab with 300+ tests. Home collection across Delhi NCR.',
    products:[0,1,10,2],
  },
  {
    userIndex: 2,  name:'Metropolis Healthcare',       city:'Mumbai',          state:'Maharashtra',     lat:19.0760, lng:72.8777,
    address:'250 Linking Road, Khar West, Mumbai',                  pincode:'400052', phone:'022-61426000',
    email:'info@metropolismumbai.in',    homeCollection:true,  featured:true,  ratingAvg:4.6, reviewCount:280,
    openingHours:'7:00 AM – 10:00 PM',  sampleCollectionTime:'6:00 AM – 9:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL'],              badges:['NABL Certified','24x7 Reports'],
    description:'One of India\'s leading diagnostic chains with 4000+ tests across Mumbai.',
    products:[0,3,11,4],
  },
  {
    userIndex: 3,  name:'SRL Diagnostics',             city:'Bangalore',       state:'Karnataka',       lat:12.9716, lng:77.5946,
    address:'54 Residency Road, MG Road, Bangalore',                pincode:'560025', phone:'080-41472800',
    email:'info@srlbangalore.in',        homeCollection:true,  featured:false, ratingAvg:4.5, reviewCount:198,
    openingHours:'7:30 AM – 9:00 PM',   sampleCollectionTime:'7:00 AM – 8:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL','ISO 9001'],   badges:['ISO Certified','Free Home Collection'],
    description:'Trusted diagnostic partner across Bangalore with state-of-the-art equipment.',
    products:[0,5,12,6],
  },
  {
    userIndex: 4,  name:'Dr Lal PathLabs',             city:'Chennai',         state:'Tamil Nadu',      lat:13.0827, lng:80.2707,
    address:'48 Anna Salai, Teynampet, Chennai',                    pincode:'600018', phone:'044-42000000',
    email:'info@lalpathchennai.in',      homeCollection:true,  featured:true,  ratingAvg:4.8, reviewCount:425,
    openingHours:'6:30 AM – 9:30 PM',   sampleCollectionTime:'6:00 AM – 9:00 PM', reportDeliveryTime:'Same day',
    accreditation:['NABL','CAP','WHO'],  badges:['NABL Certified','WHO Approved'],
    description:'India\'s largest diagnostic chain, trusted by 10 million patients annually.',
    products:[0,7,13,8],
  },
  {
    userIndex: 5,  name:'Thyrocare',                   city:'Hyderabad',       state:'Telangana',       lat:17.3850, lng:78.4867,
    address:'6-3-248 Road No 1, Banjara Hills, Hyderabad',          pincode:'500034', phone:'040-23540000',
    email:'info@thyrocarehyd.in',        homeCollection:true,  featured:false, ratingAvg:4.4, reviewCount:167,
    openingHours:'7:00 AM – 8:00 PM',   sampleCollectionTime:'6:00 AM – 7:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL'],              badges:['NABL Certified','Budget Friendly'],
    description:'Affordable thyroid, diabetes and preventive health packages across Hyderabad.',
    products:[1,2,14,9],
  },
  {
    userIndex: 6,  name:'Neuberg Diagnostics',         city:'Pune',            state:'Maharashtra',     lat:18.5204, lng:73.8567,
    address:'12 Baner Road, Shivajinagar, Pune',                    pincode:'411016', phone:'020-25530000',
    email:'info@neubergpune.in',         homeCollection:true,  featured:false, ratingAvg:4.3, reviewCount:143,
    openingHours:'7:00 AM – 9:00 PM',   sampleCollectionTime:'6:30 AM – 8:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL','ISO 15189'],  badges:['ISO 15189'],
    description:'Accredited pathology lab offering precision diagnostics in Pune and Pimpri.',
    products:[3,4,15,5],
  },
  {
    userIndex: 7,  name:'Medica Labs',                 city:'Kolkata',         state:'West Bengal',     lat:22.5726, lng:88.3639,
    address:'127 Rashbehari Avenue, Ballygunge, Kolkata',           pincode:'700029', phone:'033-40046000',
    email:'info@medicalabskolkata.in',   homeCollection:true,  featured:false, ratingAvg:4.2, reviewCount:119,
    openingHours:'7:00 AM – 8:30 PM',   sampleCollectionTime:'6:30 AM – 7:30 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL'],              badges:['NABL Certified'],
    description:'Kolkata-based NABL certified lab with over 500 diagnostic tests available.',
    products:[6,7,16,0],
  },
  {
    userIndex: 8,  name:'Sterling Accutest',           city:'Ahmedabad',       state:'Gujarat',         lat:23.0225, lng:72.5714,
    address:'10 Commerce Six Roads, Navrangpura, Ahmedabad',        pincode:'380009', phone:'079-26444000',
    email:'info@sterlingahmedabad.in',   homeCollection:false, featured:false, ratingAvg:4.4, reviewCount:98,
    openingHours:'8:00 AM – 8:00 PM',   sampleCollectionTime:'8:00 AM – 6:00 PM', reportDeliveryTime:'48 hours',
    accreditation:['NABL'],              badges:['NABL Certified'],
    description:'Leading Gujarat chain with multi-city presence and automated testing.',
    products:[8,9,17,1],
  },
  {
    userIndex: 9,  name:'Rajasthan Diagnostics',       city:'Jaipur',          state:'Rajasthan',       lat:26.9124, lng:75.7873,
    address:'C-11 Sardar Patel Marg, C Scheme, Jaipur',            pincode:'302001', phone:'0141-5100000',
    email:'info@rajdiagnostics.in',      homeCollection:true,  featured:false, ratingAvg:4.1, reviewCount:84,
    openingHours:'7:30 AM – 8:00 PM',   sampleCollectionTime:'7:00 AM – 7:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['ISO 9001'],          badges:['ISO Certified'],
    description:'Serving Jaipur and Pink City region with affordable and accurate diagnostics.',
    products:[2,5,18,3],
  },
  {
    userIndex: 10, name:'Paras Health Diagnostics',    city:'Chandigarh',      state:'Chandigarh',      lat:30.7333, lng:76.7794,
    address:'Sector 22-B, Chandigarh',                              pincode:'160022', phone:'0172-5090000',
    email:'info@paraschangigarh.in',     homeCollection:true,  featured:false, ratingAvg:4.5, reviewCount:155,
    openingHours:'7:00 AM – 9:00 PM',   sampleCollectionTime:'6:30 AM – 8:30 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL','CAP'],        badges:['NABL Certified','CAP Accredited'],
    description:'Chandigarh premier diagnostic center with advanced molecular testing.',
    products:[0,4,19,6],
  },
  {
    userIndex: 11, name:'Pathcare Labs',               city:'Lucknow',         state:'Uttar Pradesh',   lat:26.8467, lng:80.9462,
    address:'9 Shahnajaf Road, Hazratganj, Lucknow',               pincode:'226001', phone:'0522-4000000',
    email:'info@pathcarelucknow.in',     homeCollection:true,  featured:false, ratingAvg:4.3, reviewCount:122,
    openingHours:'7:00 AM – 8:00 PM',   sampleCollectionTime:'7:00 AM – 7:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL'],              badges:['NABL Certified','Home Collection'],
    description:'Trusted Lucknow diagnostic chain covering health tests and preventive packages.',
    products:[1,3,10,7],
  },
  {
    userIndex: 12, name:'MP Diagnostics',              city:'Bhopal',          state:'Madhya Pradesh',  lat:23.2599, lng:77.4126,
    address:'Zone I MP Nagar, Bhopal',                              pincode:'462011', phone:'0755-4200000',
    email:'info@mpdiagnosticsbhopal.in', homeCollection:false, featured:false, ratingAvg:4.0, reviewCount:67,
    openingHours:'8:00 AM – 7:00 PM',   sampleCollectionTime:'8:00 AM – 5:00 PM', reportDeliveryTime:'48 hours',
    accreditation:['ISO 9001'],          badges:['ISO Certified'],
    description:'Quality diagnostic services for Bhopal and central MP region.',
    products:[2,8,11,9],
  },
  {
    userIndex: 13, name:'Gujarat Diagnostics',         city:'Surat',           state:'Gujarat',         lat:21.1702, lng:72.8311,
    address:'Ring Road, Athwa Lines, Surat',                        pincode:'395007', phone:'0261-4000000',
    email:'info@gujaratdiagsurat.in',    homeCollection:true,  featured:false, ratingAvg:4.2, reviewCount:91,
    openingHours:'7:30 AM – 8:30 PM',   sampleCollectionTime:'7:00 AM – 7:30 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL'],              badges:['NABL Certified'],
    description:'Surat growing diagnostic chain with home collection and digital reports.',
    products:[4,6,12,0],
  },
  {
    userIndex: 14, name:'Oncquest Labs',               city:'Noida',           state:'Uttar Pradesh',   lat:28.5355, lng:77.3910,
    address:'A-14 Sector 18, Noida',                                pincode:'201301', phone:'0120-4300000',
    email:'info@oncquestnoida.in',       homeCollection:true,  featured:false, ratingAvg:4.4, reviewCount:178,
    openingHours:'7:00 AM – 9:00 PM',   sampleCollectionTime:'6:30 AM – 8:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL','CAP'],        badges:['NABL Certified','CAP Accredited'],
    description:'Specialised oncology and routine diagnostics serving Noida and Greater Noida.',
    products:[3,7,13,1],
  },
  {
    userIndex: 15, name:'Quest Diagnostics',           city:'Gurgaon',         state:'Haryana',         lat:28.4595, lng:77.0266,
    address:'DLF Cyber City, Phase III, Gurgaon',                   pincode:'122002', phone:'0124-4700000',
    email:'info@questgurgaon.in',        homeCollection:true,  featured:true,  ratingAvg:4.6, reviewCount:231,
    openingHours:'7:00 AM – 10:00 PM',  sampleCollectionTime:'6:00 AM – 9:00 PM', reportDeliveryTime:'Same day',
    accreditation:['NABL','CAP','WHO'],  badges:['NABL Certified','Same Day Report'],
    description:'Global diagnostic leader offering premium testing with same-day digital reports.',
    products:[5,9,14,2],
  },
  {
    userIndex: 16, name:'Kerala Clinical Labs',        city:'Kochi',           state:'Kerala',          lat:9.9312,  lng:76.2673,
    address:'MG Road, Ernakulam, Kochi',                            pincode:'682011', phone:'0484-4000000',
    email:'info@keralaclinical.in',      homeCollection:true,  featured:false, ratingAvg:4.3, reviewCount:104,
    openingHours:'7:00 AM – 8:00 PM',   sampleCollectionTime:'7:00 AM – 7:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL'],              badges:['NABL Certified'],
    description:'Leading clinical diagnostic lab across Kochi with digital report delivery.',
    products:[0,6,15,8],
  },
  {
    userIndex: 17, name:'Indore Diagnostics Center',   city:'Indore',          state:'Madhya Pradesh',  lat:22.7196, lng:75.8577,
    address:'Vijay Nagar Square, Indore',                           pincode:'452010', phone:'0731-4000000',
    email:'info@indorediagnostics.in',   homeCollection:true,  featured:false, ratingAvg:4.1, reviewCount:76,
    openingHours:'7:30 AM – 8:00 PM',   sampleCollectionTime:'7:00 AM – 7:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['ISO 9001'],          badges:['ISO Certified'],
    description:'Affordable and accurate diagnostic services across Indore city.',
    products:[1,4,16,3],
  },
  {
    userIndex: 18, name:'Central India Diagnostics',   city:'Nagpur',          state:'Maharashtra',     lat:21.1458, lng:79.0882,
    address:'Dharampeth, Wardha Road, Nagpur',                      pincode:'440010', phone:'0712-4000000',
    email:'info@centralnagpur.in',       homeCollection:false, featured:false, ratingAvg:4.2, reviewCount:88,
    openingHours:'8:00 AM – 8:00 PM',   sampleCollectionTime:'8:00 AM – 6:00 PM', reportDeliveryTime:'48 hours',
    accreditation:['NABL'],              badges:['NABL Certified'],
    description:'Nagpur-based NABL lab offering 200+ tests with fast turnaround.',
    products:[2,7,17,5],
  },
  {
    userIndex: 19, name:'Bihar Medical Labs',          city:'Patna',           state:'Bihar',           lat:25.5941, lng:85.1376,
    address:'Fraser Road, Bankipur, Patna',                         pincode:'800001', phone:'0612-4000000',
    email:'info@biharlabspatna.in',      homeCollection:false, featured:false, ratingAvg:3.9, reviewCount:52,
    openingHours:'8:00 AM – 7:00 PM',   sampleCollectionTime:'8:00 AM – 5:00 PM', reportDeliveryTime:'48 hours',
    accreditation:['ISO 9001'],          badges:['ISO Certified'],
    description:'Serving Patna and surrounding districts with essential diagnostic services.',
    products:[6,9,18,4],
  },
  {
    userIndex: 20, name:'Vizag Diagnostics Center',    city:'Visakhapatnam',   state:'Andhra Pradesh',  lat:17.6868, lng:83.2185,
    address:'Dwaraka Nagar, Beach Road, Visakhapatnam',             pincode:'530016', phone:'0891-4000000',
    email:'info@vizagdiagnostics.in',    homeCollection:true,  featured:false, ratingAvg:4.0, reviewCount:63,
    openingHours:'7:30 AM – 8:00 PM',   sampleCollectionTime:'7:00 AM – 7:00 PM', reportDeliveryTime:'24 hours',
    accreditation:['NABL'],              badges:['NABL Certified'],
    description:'Quality pathology services covering Vizag, Bheemunipatnam and Anakapalle.',
    products:[0,8,19,7],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  await connectDB();

  console.log('Clearing existing lab data...');
  await Lab.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({ role: 'lab' });

  // Upsert categories (keep existing if already seeded)
  console.log('Seeding categories...');
  const categoryMap = {};
  for (const def of CATEGORY_DEFS) {
    const slug = makeSlug(def.name);
    const cat = await Category.findOneAndUpdate(
      { slug },
      { ...def, slug },
      { upsert: true, new: true }
    );
    categoryMap[def.name] = cat._id;
  }

  console.log('Seeding 20 labs with users and products...');

  for (const labDef of LABS) {
    const idx = pad(labDef.userIndex);

    // 1. Create lab user
    const user = await User.create({
      name: labDef.name,
      email: `lab${idx}@example.com`,
      mobile: `900000${pad(labDef.userIndex)}`,
      password: 'Lab@1234',
      role: 'lab',
      verified: true,
      isActive: true,
      location: {
        lat: labDef.lat,
        lng: labDef.lng,
        address: labDef.address,
      },
    });

    // 2. Create lab
    const labSlug = makeSlug(labDef.name);
    const lab = await Lab.create({
      owner: user._id,
      name: labDef.name,
      slug: labSlug,
      description: labDef.description,
      address: labDef.address,
      city: labDef.city,
      state: labDef.state,
      pincode: labDef.pincode,
      phone: labDef.phone,
      email: labDef.email,
      lat: labDef.lat,
      lng: labDef.lng,
      homeCollection: labDef.homeCollection,
      openingHours: labDef.openingHours,
      sampleCollectionTime: labDef.sampleCollectionTime,
      reportDeliveryTime: labDef.reportDeliveryTime,
      accreditation: labDef.accreditation,
      badges: labDef.badges,
      ratingAvg: labDef.ratingAvg,
      reviewCount: labDef.reviewCount,
      featured: labDef.featured,
      approved: true,
      verificationStatus: 'verified',
      commissionPercent: 10,
      serviceAreas: [{ city: labDef.city, radiusKm: 15 }],
      seoTitle: `${labDef.name} | Diagnostics in ${labDef.city}`,
      seoDescription: labDef.description,
    });

    // 3. Create 4 products for this lab
    for (const productIdx of labDef.products) {
      const tpl = PRODUCT_POOL[productIdx];
      const productSlug = `${makeSlug(tpl.name)}-${labSlug}`;
      await Product.create({
        type: tpl.type,
        name: tpl.name,
        slug: productSlug,
        category: categoryMap[tpl.catName],
        lab: lab._id,
        description: tpl.description,
        price: tpl.price,
        salePrice: tpl.salePrice,
        sampleType: tpl.sampleType,
        reportTime: tpl.reportTime,
        fastingRequired: tpl.fastingRequired,
        homeCollection: tpl.homeCollection,
        tags: tpl.tags,
        isActive: true,
        isFeatured: labDef.featured,
        seoTitle: `${tpl.name} in ${labDef.city} | ${labDef.name}`,
        seoDescription: tpl.description,
      });
    }

    console.log(`  ✓ Lab ${idx}: ${labDef.name} (${labDef.city}) — 4 products`);
  }

  // ─── Algolia reindex (if configured) ───────────────────────────────────────
  const { hasAlgoliaConfig } = require('../config/algolia');
  const { syncObjects, setIndexSettings } = require('../services/algoliaSync');

  if (hasAlgoliaConfig()) {
    console.log('\nSyncing to Algolia...');

    const allLabs = await Lab.find().lean();
    await setIndexSettings('labs', {
      searchableAttributes: ['name', 'city', 'address', 'description', 'badges', 'accreditation'],
      attributesForFaceting: ['filterOnly(approved)', 'filterOnly(homeCollection)', 'filterOnly(featured)', 'searchable(city)'],
      customRanking: ['desc(ratingAvg)', 'desc(reviewCount)'],
    });
    await syncObjects('labs', allLabs.map((lab) => ({
      objectID: String(lab._id),
      name: lab.name, slug: lab.slug, city: lab.city, state: lab.state || '',
      address: lab.address || '', description: lab.description || '',
      ratingAvg: lab.ratingAvg || 0, reviewCount: lab.reviewCount || 0,
      homeCollection: !!lab.homeCollection, approved: !!lab.approved, featured: !!lab.featured,
      verificationStatus: lab.verificationStatus || 'pending',
      reportDeliveryTime: lab.reportDeliveryTime || '',
      accreditation: lab.accreditation || [], badges: lab.badges || [],
      _geoloc: (lab.lat && lab.lng) ? { lat: lab.lat, lng: lab.lng } : undefined,
    })));
    console.log(`  ✓ Labs indexed: ${allLabs.length}`);

    const allProducts = await Product.find().lean();
    await setIndexSettings('products', {
      searchableAttributes: ['name', 'description', 'tags', 'type', 'sampleType'],
      attributesForFaceting: ['filterOnly(type)', 'filterOnly(homeCollection)', 'filterOnly(fastingRequired)', 'filterOnly(isFeatured)'],
      customRanking: ['asc(price)'],
    });
    await syncObjects('products', allProducts.map((p) => ({
      objectID: String(p._id),
      name: p.name, slug: p.slug, type: p.type, description: p.description || '',
      price: p.price, salePrice: p.salePrice || null,
      reportTime: p.reportTime || '', sampleType: p.sampleType || '',
      homeCollection: !!p.homeCollection, fastingRequired: !!p.fastingRequired,
      tags: p.tags || [], lab: p.lab ? String(p.lab) : null,
      isFeatured: !!p.isFeatured, isActive: !!p.isActive,
    })));
    console.log(`  ✓ Products indexed: ${allProducts.length}`);
  } else {
    console.log('\nAlgolia not configured — search will use MongoDB fallback.');
  }

  console.log('\nSeed complete!');
  console.log('────────────────────────────────────');
  console.log('Lab login credentials:');
  console.log('  Email   : lab01@example.com … lab20@example.com');
  console.log('  Password: Lab@1234');
  console.log('  Mobile  : 9000000001 … 9000000020');
  console.log('────────────────────────────────────');
  process.exit(0);
})();
