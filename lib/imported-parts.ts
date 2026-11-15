import { getDemoProductImage } from './demo-product-images';
import { indiaVehicles } from './india-vehicles';
import type { Product } from './catalog';

type ListingSeed = [name: string, category: string, price: number, sourceUrl: string, tags: string[], fitment?: string];

const universalSource = 'https://www.autofurnish.com/collections/universal-car-accessories';
const matsSource = 'https://www.autofurnish.com/collections/car-foot-mats';
const utilitySource = 'https://www.autofurnish.com/collections/all-car-accessories';

const universalSeeds: ListingSeed[] = [
  ['Universal Magnetic Phone Mount','Audio & Tech',599,universalSource,['phone mount','magnetic','dashboard']],
  ['Universal Vent-Clip Phone Holder','Audio & Tech',399,universalSource,['phone holder','vent mount']],
  ['Dual-Port USB-C Fast Car Charger','Audio & Tech',899,utilitySource,['charger','usb-c','fast charging']],
  ['Universal 12V USB Charging Adapter','Audio & Tech',499,utilitySource,['charger','12v','usb']],
  ['Universal Dashboard Anti-Slip Pad','Interior',299,universalSource,['dashboard','anti-slip','storage']],
  ['Universal PU Steering Wheel Cover','Interior',699,universalSource,['steering cover','grip']],
  ['Universal Seat-Gap Filler Pair','Interior',499,universalSource,['seat gap','organizer','pair']],
  ['Universal Neck-Rest Cushion Pair','Interior',799,universalSource,['neck rest','cushion','comfort']],
  ['Universal Lumbar Support Cushion','Interior',899,universalSource,['lumbar','back support','cushion']],
  ['Universal Back-Seat Organizer','Interior',699,utilitySource,['seat organizer','back seat','storage']],
  ['Universal Sun-Visor Tissue Holder','Interior',499,universalSource,['tissue holder','sun visor']],
  ['Universal Foldable Trunk Organizer','Car Care & Utility',799,utilitySource,['boot organizer','foldable','storage']],
  ['Universal Elastic Cargo Net','Car Care & Utility',599,utilitySource,['cargo net','boot','storage']],
  ['Universal Microfiber Drying Towel Set','Car Care & Utility',399,utilitySource,['microfiber','drying towel','cleaning']],
  ['Universal Car-Wash Shampoo Concentrate','Car Care & Utility',499,utilitySource,['car wash','shampoo','cleaning']],
  ['Universal Interior Detailing Brush Set','Car Care & Utility',349,utilitySource,['detailing brush','interior cleaning']],
  ['Universal Glass-Cleaning Cloth Pack','Car Care & Utility',249,utilitySource,['glass','microfiber','cleaning']],
  ['Universal Tyre-Pressure Gauge','Wheels & Tyres',399,utilitySource,['tyre pressure','gauge','safety']],
  ['Portable 12V Tyre Inflator','Wheels & Tyres',1999,utilitySource,['tyre inflator','12v','roadside']],
  ['Universal Puncture-Repair Emergency Kit','Safety & Maintenance',699,utilitySource,['puncture repair','emergency','tyre']],
  ['Universal Roadside Safety Kit','Safety & Maintenance',999,utilitySource,['roadside','safety','emergency kit']],
  ['Universal Blind-Spot Mirror Pair','Safety & Maintenance',249,utilitySource,['blind spot','mirror','visibility']],
  ['Universal Rain-Repellent Glass Treatment','Safety & Maintenance',599,utilitySource,['rain repellent','glass','visibility']],
  ['Universal Windshield Sun Shade','Exterior',499,universalSource,['sun shade','windshield','heat protection']],
  ['Universal Door-Edge Guard Strip Set','Exterior',299,universalSource,['door edge','paint protection','universal']],
];

const vehicleSeeds: ListingSeed[] = [
  ['EcoSport Custom 7D Floor Mat Set','Interior',5390,matsSource,['Ford','EcoSport','floor mats','7D'],'Ford|EcoSport'],
  ['EcoSport 9D Premium Floor Mat Set','Interior',7990,matsSource,['Ford','EcoSport','floor mats','9D'],'Ford|EcoSport'],
  ['EcoSport Waterproof Body Cover','Exterior',1999,utilitySource,['Ford','EcoSport','body cover'],'Ford|EcoSport'],
  ['EcoSport Custom Boot Mat','Car Care & Utility',1590,utilitySource,['Ford','EcoSport','boot mat'],'Ford|EcoSport'],
  ['EcoSport Cabin Air Filter','Safety & Maintenance',899,utilitySource,['Ford','EcoSport','cabin filter'],'Ford|EcoSport'],
  ['Figo Custom Floor Mat Set','Interior',4290,matsSource,['Ford','Figo','floor mats'],'Ford|Figo'],
  ['Figo / Aspire Wiper Blade Pair','Safety & Maintenance',1499,utilitySource,['Ford','Figo','Aspire','wiper blades'],'Ford|Figo'],
  ['Figo Waterproof Body Cover','Exterior',1799,utilitySource,['Ford','Figo','body cover'],'Ford|Figo'],
  ['Endeavour 3-Row Floor Mat Set','Interior',6990,matsSource,['Ford','Endeavour','floor mats','3 row'],'Ford|Endeavour'],
  ['Endeavour Boot Cargo Liner','Car Care & Utility',4499,utilitySource,['Ford','Endeavour','cargo liner'],'Ford|Endeavour'],
  ['Mustang Premium Carpet Mat Set','Interior',5999,matsSource,['Ford','Mustang','floor mats'],'Ford|Mustang'],
  ['XUV 3XO Manual Custom Floor Mats','Interior',5390,matsSource,['Mahindra','XUV 3XO','manual','floor mats'],'Mahindra|XUV 3XO'],
  ['XUV 3XO Automatic Custom Floor Mats','Interior',5390,matsSource,['Mahindra','XUV 3XO','automatic','floor mats'],'Mahindra|XUV 3XO'],
  ['XUV 3XO Waterproof Body Cover','Exterior',1999,utilitySource,['Mahindra','XUV 3XO','body cover'],'Mahindra|XUV 3XO'],
  ['Thar 3-Door Custom Floor Mats','Interior',5390,matsSource,['Mahindra','Thar','floor mats'],'Mahindra|Thar'],
  ['Thar Waterproof Body Cover','Exterior',2199,utilitySource,['Mahindra','Thar','body cover'],'Mahindra|Thar'],
  ['Tata Nexon Custom 7D Floor Mats','Interior',5390,matsSource,['Tata','Nexon','floor mats','7D'],'Tata|Nexon'],
  ['Tata Nexon Custom Boot Mat','Car Care & Utility',1590,utilitySource,['Tata','Nexon','boot mat'],'Tata|Nexon'],
  ['Tata Punch EV Floor Mat Set','Interior',5390,matsSource,['Tata','Punch EV','floor mats','EV'],'Tata|Punch EV'],
  ['Hyundai Creta Custom Floor Mats','Interior',5390,matsSource,['Hyundai','Creta','floor mats'],'Hyundai|Creta'],
  ['Hyundai Creta Waterproof Body Cover','Exterior',1999,utilitySource,['Hyundai','Creta','body cover'],'Hyundai|Creta'],
  ['Maruti Swift Custom Floor Mat Set','Interior',4290,matsSource,['Maruti Suzuki','Swift','floor mats'],'Maruti Suzuki|Swift'],
  ['Maruti Baleno Waterproof Body Cover','Exterior',1795,utilitySource,['Maruti Suzuki','Baleno','body cover'],'Maruti Suzuki|Baleno'],
  ['Toyota Innova Crysta 3-Row Mat Set','Interior',6290,matsSource,['Toyota','Innova Crysta','floor mats','3 row'],'Toyota|Innova Crysta'],
  ['Kia Sonet Custom Floor Mat Set','Interior',5390,matsSource,['Kia','Sonet','floor mats'],'Kia|Sonet'],
];

const allIndiaVehicleNames = indiaVehicles.map(({ make, model }) => `${make} ${model}`);
const allSeeds = [...universalSeeds, ...vehicleSeeds];

export const additionalParts: Product[] = allSeeds.map(([name, category, price, sourceUrl, tags, fitment], index) => {
  const vehicleNames = fitment ? [fitment.replace('|', ' ')] : allIndiaVehicleNames;
  const sku = `MMR-AF-${String(index + 115).padStart(3, '0')}`;
  return {
    id: `import-autofurnish-${sku.toLowerCase()}`,
    sku,
    name,
    category,
    price,
    image: getDemoProductImage(category),
    description: fitment
      ? `Demo catalog reference based on AutoFurnish India-market accessory listings. The image is illustrative; verify exact generation, trim, and dimensions with the supplier. Price and stock are not synchronized.`
      : `Universal-fit demo catalog reference based on AutoFurnish accessory categories. The image is illustrative; confirm dimensions, installation, and vehicle suitability. Price and stock are not synchronized.`,
    tags: fitment ? tags : ['universal', ...tags],
    vehicles: vehicleNames,
    inStock: true,
    brand: 'AutoFurnish',
    popularity: Math.max(35, 88 - index),
    sourceUrl,
    sourceCheckedAt: '2026-11-13',
  };
});
