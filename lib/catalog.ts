import { getDemoProductImage } from './demo-product-images';
import { indiaVehicles } from './india-vehicles';
import { additionalParts } from './imported-parts';

export const ALL_PRODUCTS_PAGE_SIZE = 100;

export type Product = {
  id: string; sku: string; name: string; category: string; price: number; image: string;
  description: string; tags: string[]; vehicles: string[]; inStock: boolean;
  brand?: string; rating?: number; popularity?: number; createdAt?: string; compareAtPrice?: number;
  sourceUrl?: string; sourceCheckedAt?: string;
  variants?: ProductVariant[];
};

export type ProductVariant = { id: string; sku: string; options: Record<string, string>; price: number; inStock: boolean };

export const products: Product[] = [
  { id:'ford-ecosport-mats', sku:'MMR-FORD-001', name:'Ford EcoSport All-Weather Floor Mat Set', category:'Interior', price:3299, image:'/images/products/ford-ecosport-floor-mats.png', description:'Demo Ford EcoSport accessory listing. Verify generation and floor layout before purchase.', tags:['Ford','EcoSport','floor mats','all weather'], vehicles:['Ford EcoSport'], inStock:true, brand:'Ford', popularity:94 },
  { id:'ford-figo-aspire-wipers', sku:'MMR-FORD-002', name:'Ford Figo / Aspire Wiper Blade Pair', category:'Safety & Maintenance', price:1499, image:'/images/products/ford-wiper-blades.png', description:'Demo Ford Figo and Aspire listing. Confirm model year and blade lengths before purchase.', tags:['Ford','Figo','Aspire','wiper blades'], vehicles:['Ford Figo','Ford Aspire'], inStock:true, brand:'Ford', popularity:89 },
  { id:'ford-endeavour-liner', sku:'MMR-FORD-003', name:'Ford Endeavour Cargo Liner', category:'Car Care & Utility', price:4499, image:'/images/products/ford-endeavour-cargo-liner.png', description:'Demo Ford Endeavour accessory listing. Check generation and boot configuration before purchase.', tags:['Ford','Endeavour','cargo liner','boot mat'], vehicles:['Ford Endeavour'], inStock:true, brand:'Ford', popularity:86 },
  { id:'ford-ecosport-filter', sku:'MMR-FORD-004', name:'Ford EcoSport Cabin Filter', category:'Safety & Maintenance', price:1199, image:'/images/products/ford-cabin-filter.png', description:'Demo Ford EcoSport maintenance listing. Confirm engine, year, and filter dimensions before purchase.', tags:['Ford','EcoSport','cabin filter','maintenance'], vehicles:['Ford EcoSport'], inStock:true, brand:'Ford', popularity:80 },
  { id:'ford-mustang-mats', sku:'MMR-FORD-005', name:'Ford Mustang Premium Floor Mat Set', category:'Interior', price:5999, image:'/images/products/ford-mustang-floor-mats.png', description:'Demo Ford Mustang accessory listing. Confirm generation and cabin configuration before purchase.', tags:['Ford','Mustang','floor mats','interior'], vehicles:['Ford Mustang'], inStock:true, brand:'Ford', popularity:78 },
  { id:'import-ford-ecosport-mats', sku:'MMR-AF-101', name:'Ford EcoSport 2013–16 7D Custom Floor Mats', category:'Interior', price:4990, image:'/images/products/ford-ecosport-floor-mats.png', description:'Demo import based on an AutoFurnish listing. Illustrative project photo; this app does not sync the supplier’s price, stock, or fitment. Confirm the exact EcoSport generation before purchase.', tags:['Ford','EcoSport','7D mats','floor mats','Autofurnish'], vehicles:['Ford EcoSport'], inStock:true, brand:'AutoFurnish', popularity:96, sourceUrl:'https://www.autofurnish.com/products/7d-luxury-car-footmats-for-ford-ecosport2013-16-custom-designed-pu-leather-with-7-layer-depth-24mm-2-rows', sourceCheckedAt:'2026-11-13' },
  { id:'import-xuv3xo-mats-manual', sku:'MMR-AF-102', name:'Mahindra XUV 3XO Manual 7D Floor Mats', category:'Interior', price:5390, image:'/images/products/ford-ecosport-floor-mats.png', description:'Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Verify manual-transmission cabin fitment.', tags:['Mahindra','XUV 3XO','7D mats','floor mats','Autofurnish'], vehicles:['Mahindra XUV 3XO'], inStock:true, brand:'AutoFurnish', popularity:92, sourceUrl:'https://www.autofurnish.com/products/autofurnish-7d-luxury-custom-fitted-car-mats-for-mahindra-xuv-3xo-2024-manual', sourceCheckedAt:'2026-11-13' },
  { id:'import-xuv3xo-mats-auto', sku:'MMR-AF-103', name:'Mahindra XUV 3XO Automatic 7D Floor Mats', category:'Interior', price:5390, image:'/images/products/ford-ecosport-floor-mats.png', description:'Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Verify automatic-transmission cabin fitment.', tags:['Mahindra','XUV 3XO','automatic','7D mats','floor mats','Autofurnish'], vehicles:['Mahindra XUV 3XO'], inStock:true, brand:'AutoFurnish', popularity:91, sourceUrl:'https://www.autofurnish.com/products/autofurnish-7d-luxury-custom-fitted-car-mats-for-mahindra-xuv-3xo-2024', sourceCheckedAt:'2026-11-13' },
  { id:'import-xuv3xo-mats-9d', sku:'MMR-AF-104', name:'Mahindra XUV 3XO Automatic 9D Premium Mats', category:'Interior', price:7990, image:'/images/products/ford-ecosport-floor-mats.png', description:'Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Confirm model year and transmission.', tags:['Mahindra','XUV 3XO','automatic','9D premium mats','floor mats','Autofurnish'], vehicles:['Mahindra XUV 3XO'], inStock:true, brand:'AutoFurnish', popularity:90, sourceUrl:'https://www.autofurnish.com/products/mahindra-xuv-3xoautomatic2024-autofurnish-9d-premium-custom-fitted-car-mat', sourceCheckedAt:'2026-11-13' },
  { id:'import-tata-nexon-mats', sku:'MMR-AF-105', name:'Tata Nexon 2020 7D Luxury Floor Mats', category:'Interior', price:5390, image:'/images/products/ford-ecosport-floor-mats.png', description:'Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Check exact Nexon model year and cabin layout.', tags:['Tata','Nexon','7D mats','floor mats','Autofurnish'], vehicles:['Tata Nexon'], inStock:true, brand:'AutoFurnish', popularity:89, sourceUrl:'https://www.autofurnish.com/products/7d-luxury-car-footmats-for-tata-nexon2020-custom-designed-pu-leather-with-7-layer-depth-24mm-2-rows', sourceCheckedAt:'2026-11-13' },
  { id:'import-hyundai-creta-mats', sku:'MMR-AF-106', name:'Hyundai Creta 2024 7D Floor Mats', category:'Interior', price:5390, image:'/images/products/ford-ecosport-floor-mats.png', description:'Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Check exact Creta model year and variant.', tags:['Hyundai','Creta','7D mats','floor mats','Autofurnish'], vehicles:['Hyundai Creta'], inStock:true, brand:'AutoFurnish', popularity:87, sourceUrl:'https://www.autofurnish.com/products/7d-luxury-car-footmats-for-hyundai-creta-2024-custom-designed-pu-leather-with-7-layer-depth-24mm-2-rows', sourceCheckedAt:'2026-11-13' },
  { id:'import-innova-crysta-mats', sku:'MMR-AF-107', name:'Toyota Innova Crysta 2016–23 7D Mats', category:'Interior', price:6290, image:'/images/products/ford-ecosport-floor-mats.png', description:'Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Confirm the third-row configuration.', tags:['Toyota','Innova Crysta','7D mats','floor mats','Autofurnish'], vehicles:['Toyota Innova Crysta'], inStock:true, brand:'AutoFurnish', popularity:85, sourceUrl:'https://www.autofurnish.com/products/7d-luxury-car-footmats-for-toyota-innova-crysta-custom-designed-pu-leather-with-7-layer-depth-24mm-3-rows', sourceCheckedAt:'2026-11-13' },
  { id:'import-thar-mats', sku:'MMR-AF-108', name:'Mahindra Thar 2020 7D Luxury Floor Mats', category:'Interior', price:5390, image:'/images/products/ford-ecosport-floor-mats.png', description:'Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Verify Thar generation and body style.', tags:['Mahindra','Thar','7D mats','floor mats','Autofurnish'], vehicles:['Mahindra Thar'], inStock:true, brand:'AutoFurnish', popularity:84, sourceUrl:'https://www.autofurnish.com/collections/car-accessories', sourceCheckedAt:'2026-11-13' },
  { id:'import-punch-ev-mats', sku:'MMR-AF-109', name:'Tata Punch EV 2024 7D Custom Mats', category:'Interior', price:5390, image:'/images/products/ford-ecosport-floor-mats.png', description:'Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Verify EV-specific floor layout.', tags:['Tata','Punch EV','7D mats','floor mats','Autofurnish'], vehicles:['Tata Punch EV'], inStock:true, brand:'AutoFurnish', popularity:83, sourceUrl:'https://www.autofurnish.com/collections/car-foot-mats', sourceCheckedAt:'2026-11-13' },
  { id:'import-innova-boot-mat', sku:'MMR-AF-110', name:'Toyota Innova Crysta 7D Boot Mat', category:'Car Care & Utility', price:1590, image:'/images/products/ford-endeavour-cargo-liner.png', description:'Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Check the boot-floor and seat-fold configuration.', tags:['Toyota','Innova Crysta','boot mat','trunk liner','Autofurnish'], vehicles:['Toyota Innova Crysta'], inStock:true, brand:'AutoFurnish', popularity:78, sourceUrl:'https://www.autofurnish.com/collections/car-trunk-mats', sourceCheckedAt:'2026-11-13' },
  { id:'import-ecosport-cover', sku:'MMR-AF-111', name:'Ford EcoSport Triple-Stitched Body Cover', category:'Exterior', price:1495, image:getDemoProductImage('Exterior'), description:'Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Verify mirror-pocket and antenna configuration.', tags:['Ford','EcoSport','body cover','car cover','Autofurnish'], vehicles:['Ford EcoSport'], inStock:true, brand:'AutoFurnish', popularity:82, sourceUrl:'https://www.autofurnish.com/products/sporty-series-car-cover-for-ford-ecosport-triple-stitched-water-resistant-and-heat-resistant-with-mirror-pockets', sourceCheckedAt:'2026-11-13' },
  { id:'import-boot-organizer', sku:'MMR-AF-112', name:'Universal Collapsible Boot Organizer', category:'Car Care & Utility', price:499, image:getDemoProductImage('Car Care & Utility'), description:'Demo import based on an AutoFurnish universal-accessory listing. Illustrative project photo; confirm dimensions and supplier availability.', tags:['universal','boot organizer','trunk storage','Autofurnish'], vehicles:indiaVehicles.map(({ make, model }) => `${make} ${model}`), inStock:true, brand:'AutoFurnish', popularity:75, sourceUrl:'https://www.autofurnish.com/products/autofurnish-car-trunk-boot-dicky-organizer-all-cars-universal-collapsible-mesh-net-multi-pocket-storage-for-tools-bottles-clothes-toys-documents-for-suv-muv-hatchback-adjustable-buckle-car-accessories-interior', sourceCheckedAt:'2026-11-13' },
  { id:'import-neck-rest', sku:'MMR-AF-113', name:'Universal PU Leather Neck-Rest Pair', category:'Interior', price:499, image:getDemoProductImage('Interior'), description:'Demo import based on an AutoFurnish universal-accessory listing. Illustrative project photo; check dimensions and supplier availability.', tags:['universal','neck rest','headrest cushion','Autofurnish'], vehicles:indiaVehicles.map(({ make, model }) => `${make} ${model}`), inStock:true, brand:'AutoFurnish', popularity:73, sourceUrl:'https://www.autofurnish.com/products/crescent-car-pillow-neck-rest-pu-leather-with-ergonomic-support-and-pressure-absorbent-polly-fil-set-of-2', sourceCheckedAt:'2026-11-13' },
  { id:'import-windshield-cover', sku:'MMR-AF-114', name:'Universal Heat-Resistant Windshield Cover', category:'Exterior', price:649, image:getDemoProductImage('Exterior'), description:'Demo import based on an AutoFurnish universal-accessory listing. Illustrative project photo; measure the windscreen and confirm supplier availability.', tags:['universal','windshield cover','sunshade','Autofurnish'], vehicles:indiaVehicles.map(({ make, model }) => `${make} ${model}`), inStock:true, brand:'AutoFurnish', popularity:71, sourceUrl:'https://www.autofurnish.com/collections/universal-car-accessories', sourceCheckedAt:'2026-11-13' },
  ...additionalParts,
  { id:'p1', sku:'MMR-EXT-001', name:'Carbon Fiber Front Lip', category:'Exterior', price:18900, image:getDemoProductImage('Exterior'), description:'A sharp, lightweight carbon front lip for a more planted stance.', tags:['carbon fiber','aerodynamic','front'], vehicles:['Ford Mustang','Mahindra Thar','BMW M4'], inStock:true },
  { id:'p2', sku:'MMR-INT-002', name:'Ambient LED Cabin Kit', category:'Interior', price:7900, image:getDemoProductImage('Interior'), description:'Configurable cabin lighting with a premium OEM-style finish.', tags:['lighting','interior','comfort'], vehicles:['Maruti Suzuki Swift','Hyundai Creta','Tata Nexon','Ford EcoSport'], inStock:true },
  { id:'p3', sku:'MMR-WHL-003', name:'Forged Alloy Wheel Set', category:'Wheels', price:68500, image:getDemoProductImage('Wheels & Tyres'), description:'Lightweight forged wheels engineered for performance and presence.', tags:['wheels','forged','performance'], vehicles:['BMW M4','Audi RS5'], inStock:true },
  { id:'p4', sku:'MMR-LGT-004', name:'Matrix LED Headlight Pair', category:'Lighting', price:42900, image:getDemoProductImage('Lighting'), description:'Modern matrix-style lighting that transforms the front profile.', tags:['headlight','led','lighting'], vehicles:['Mercedes-Benz G-Class','Mahindra XUV700'], inStock:false },
];

export type SearchSuggestion = { label: string; query: string };

export function getSearchSuggestions(query: string, candidates: string[], popular: string[], limit = 5): SearchSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const terms = normalized.split(/\s+/).filter((term) => term.length > 1);
  const matches = candidates
    .filter((candidate, index) => candidates.indexOf(candidate) === index)
    .filter((candidate) => {
      const value = candidate.toLowerCase();
      return value.includes(normalized) || terms.some((term) => value.includes(term));
    })
    .slice(0, Math.max(0, limit - 1))
    .map((candidate) => ({ label: candidate, query: candidate }));

  const fallback = matches.length ? [] : popular.slice(0, Math.max(0, limit - 1)).map((item) => ({ label: item, query: item }));
  return [{ label: `Search all for “${query.trim()}”`, query: query.trim() }, ...matches, ...fallback].slice(0, limit);
}

export function searchProducts(query: string, filters: { category?: string; vehicle?: string; minPrice?: number; maxPrice?: number; inStock?: boolean } = {}) {
  const q = query.trim().toLowerCase();
  const detectedVehicle = indiaVehicles.find(({ make, model }) => q.includes(`${make} ${model}`.toLowerCase()));
  const vehicle = filters.vehicle?.split(' · ')[0] ?? (detectedVehicle ? `${detectedVehicle.make} ${detectedVehicle.model}` : undefined);
  return products
    .filter((p) => !filters.category || p.category === filters.category)
    .filter((p) => !vehicle || p.vehicles.some((name) => name.toLowerCase() === vehicle.toLowerCase()))
    .filter((p) => filters.minPrice === undefined || p.price >= filters.minPrice)
    .filter((p) => !filters.maxPrice || p.price <= filters.maxPrice)
    .filter((p) => filters.inStock === undefined || p.inStock === filters.inStock)
    .map((p) => ({ product: p, score: q ? [p.sku, p.name, p.category, p.description, ...p.tags, ...p.vehicles].join(' ').toLowerCase().includes(q) || q.split(/\s+/).some((token) => token.length > 3 && [p.sku, p.name, p.category, p.description, ...p.tags, ...p.vehicles].join(' ').toLowerCase().includes(token)) ? 2 : 0 : 1 }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}

export function buildKnowledgeText(product: Product) {
  return `${product.name} (${product.sku}). Category: ${product.category}. ${product.description} Compatible vehicles: ${product.vehicles.join(', ')}. Tags: ${product.tags.join(', ')}. Availability: ${product.inStock ? 'in stock' : 'out of stock'}.`;
}
