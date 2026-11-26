/**
 * Nepal delivery pricing — all 77 districts in 7 provinces.
 *
 * Rates are zone based, modelled on typical Nepali courier pricing for a
 * light parcel (clothing, under ~1 kg). Adjust ZONES to match your courier
 * contract; the frontend copy is regenerated with `npm run sync:shipping`.
 */

const ZONES = {
  1: { id: 1, name: 'Kathmandu Valley', fee: 100, eta: '1–2 days' },
  2: { id: 2, name: 'Major cities', fee: 150, eta: '2–3 days' },
  3: { id: 3, name: 'Terai & accessible hills', fee: 200, eta: '3–5 days' },
  4: { id: 4, name: 'Remote hills', fee: 300, eta: '5–7 days' },
  5: { id: 5, name: 'Himalayan & far-west', fee: 400, eta: '7–10 days' },
};

// Free delivery above this subtotal applies to these zones only.
const FREE_SHIPPING_THRESHOLD = Number(process.env.FREE_SHIPPING_THRESHOLD) || 5000;
const FREE_SHIPPING_ZONES = [1, 2, 3];

const PROVINCES = {
  'Koshi': {
    1: [],
    2: ['Morang', 'Sunsari', 'Jhapa'],
    3: ['Udayapur', 'Dhankuta', 'Ilam', 'Panchthar', 'Terhathum'],
    4: ['Okhaldhunga', 'Khotang', 'Bhojpur', 'Solukhumbu', 'Sankhuwasabha', 'Taplejung'],
  },
  'Madhesh': {
    2: ['Parsa', 'Dhanusha'],
    3: ['Bara', 'Rautahat', 'Sarlahi', 'Mahottari', 'Siraha', 'Saptari'],
  },
  'Bagmati': {
    1: ['Kathmandu', 'Lalitpur', 'Bhaktapur'],
    2: ['Chitwan', 'Makwanpur', 'Kavrepalanchok'],
    3: ['Dhading', 'Nuwakot', 'Sindhuli', 'Ramechhap', 'Sindhupalchok', 'Dolakha'],
    4: ['Rasuwa'],
  },
  'Gandaki': {
    2: ['Kaski', 'Nawalpur'],
    3: ['Tanahun', 'Syangja', 'Lamjung', 'Gorkha', 'Baglung', 'Parbat'],
    4: ['Myagdi'],
    5: ['Manang', 'Mustang'],
  },
  'Lumbini': {
    2: ['Rupandehi', 'Banke', 'Dang'],
    3: ['Kapilvastu', 'Parasi', 'Bardiya', 'Palpa', 'Gulmi', 'Arghakhanchi', 'Pyuthan'],
    4: ['Rolpa', 'Eastern Rukum'],
  },
  'Karnali': {
    2: ['Surkhet'],
    4: ['Western Rukum', 'Salyan', 'Dailekh', 'Jajarkot'],
    5: ['Dolpa', 'Humla', 'Jumla', 'Kalikot', 'Mugu'],
  },
  'Sudurpashchim': {
    2: ['Kailali'],
    3: ['Kanchanpur'],
    4: ['Achham', 'Doti', 'Dadeldhura', 'Baitadi'],
    5: ['Bajura', 'Bajhang', 'Darchula'],
  },
};

const DISTRICTS = {};
for (const [province, zones] of Object.entries(PROVINCES)) {
  for (const [zone, names] of Object.entries(zones)) {
    for (const name of names) DISTRICTS[name.toLowerCase()] = { name, province, zone: Number(zone) };
  }
}

const findDistrict = (name) => DISTRICTS[String(name || '').trim().toLowerCase()] || null;

/** Returns pricing for a district, or null when the district is unknown. */
const getShipping = (districtName, subtotal = 0) => {
  const district = findDistrict(districtName);
  if (!district) return null;
  const zone = ZONES[district.zone];
  const free = FREE_SHIPPING_ZONES.includes(zone.id) && subtotal >= FREE_SHIPPING_THRESHOLD;
  return { district: district.name, province: district.province, zone: zone.id, zoneName: zone.name, baseFee: zone.fee, fee: free ? 0 : zone.fee, eta: zone.eta, free };
};

/** Serializable table used by the storefront (provinces → districts → zone). */
const buildPublicTable = () => ({
  zones: Object.values(ZONES),
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  freeShippingZones: FREE_SHIPPING_ZONES,
  provinces: Object.entries(PROVINCES).map(([province, zones]) => ({
    name: province,
    districts: Object.entries(zones)
      .flatMap(([zone, names]) => names.map(name => ({ name, zone: Number(zone) })))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })),
});

module.exports = { ZONES, PROVINCES, FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_ZONES, findDistrict, getShipping, buildPublicTable };
