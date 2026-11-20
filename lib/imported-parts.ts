import type { Product } from './catalog';

const vehicleProducts: Array<[string, string, number, string, string, string]> = [
  ['Ford EcoSport 2013–16 7D Custom Floor Mats', 'Interior', 4990, 'Ford EcoSport', 'floor mats', '2013–2016 EcoSport fitment. Check the vehicle year and trim before ordering.'],
  ['Mahindra XUV 3XO Manual 7D Floor Mats', 'Interior', 5390, 'Mahindra XUV 3XO', 'floor mats', 'Manual transmission fitment for the Mahindra XUV 3XO.'],
  ['Mahindra XUV 3XO Automatic 7D Floor Mats', 'Interior', 5390, 'Mahindra XUV 3XO', 'floor mats', 'Automatic transmission fitment for the Mahindra XUV 3XO.'],
  ['Mahindra XUV 3XO Automatic 9D Premium Mats', 'Interior', 7990, 'Mahindra XUV 3XO', 'floor mats', 'Premium 9D mat set for the automatic XUV 3XO.'],
  ['Tata Nexon 2020 7D Luxury Floor Mats', 'Interior', 5390, 'Tata Nexon', 'floor mats', '7D mat set for the 2020 Tata Nexon.'],
  ['Hyundai Creta 2024 7D Floor Mats', 'Interior', 5390, 'Hyundai Creta', 'floor mats', '7D mat set for the 2024 Hyundai Creta.'],
  ['Toyota Innova Crysta 2016–23 7D Mats', 'Interior', 6290, 'Toyota Innova Crysta', 'floor mats', 'Three-row mat set for the 2016–2023 Innova Crysta.'],
  ['Mahindra Thar 2020 7D Luxury Floor Mats', 'Interior', 5390, 'Mahindra Thar', 'floor mats', 'Mat set for the 2020 Mahindra Thar.'],
  ['Tata Punch EV 2024 7D Custom Mats', 'Interior', 5390, 'Tata Punch EV', 'floor mats', 'EV-specific mat set for the 2024 Tata Punch EV.'],
  ['Toyota Innova Crysta 7D Boot Mat', 'Car Care & Utility', 1590, 'Toyota Innova Crysta', 'boot mat', 'Boot liner for the Innova Crysta. Check seat-fold and boot-floor configuration.'],
  ['Ford EcoSport Triple-Stitched Body Cover', 'Exterior', 1495, 'Ford EcoSport', 'body cover', 'Vehicle cover sized for the Ford EcoSport.'],
  ['Ford EcoSport Custom 7D Floor Mat Set', 'Interior', 5390, 'Ford EcoSport', 'floor mats', 'Custom 7D mat set for the Ford EcoSport.'],
  ['Ford EcoSport 9D Premium Floor Mat Set', 'Interior', 7990, 'Ford EcoSport', 'floor mats', 'Premium 9D mat set for the Ford EcoSport.'],
  ['Ford EcoSport Waterproof Body Cover', 'Exterior', 1999, 'Ford EcoSport', 'body cover', 'Water-resistant cover sized for the Ford EcoSport.'],
  ['Ford EcoSport Custom Boot Mat', 'Car Care & Utility', 1590, 'Ford EcoSport', 'boot mat', 'Boot mat sized for the Ford EcoSport.'],
  ['Ford EcoSport Cabin Air Filter', 'Safety & Maintenance', 899, 'Ford EcoSport', 'cabin filter', 'Replacement cabin air filter for the Ford EcoSport.'],
  ['Ford Figo Custom Floor Mat Set', 'Interior', 4290, 'Ford Figo', 'floor mats', 'Custom-fit floor mats for the Ford Figo.'],
  ['Ford Figo / Aspire Wiper Blade Pair', 'Safety & Maintenance', 1499, 'Ford Figo', 'wiper blades', 'Front wiper blade pair for Ford Figo and Aspire.'],
  ['Ford Figo Waterproof Body Cover', 'Exterior', 1799, 'Ford Figo', 'body cover', 'Water-resistant cover sized for the Ford Figo.'],
  ['Ford Endeavour 3-Row Floor Mat Set', 'Interior', 6990, 'Ford Endeavour', 'floor mats', 'Three-row floor mat set for the Ford Endeavour.'],
  ['Ford Endeavour Boot Cargo Liner', 'Car Care & Utility', 4499, 'Ford Endeavour', 'cargo liner', 'Cargo liner sized for the Ford Endeavour boot.'],
  ['Ford Mustang Premium Carpet Mat Set', 'Interior', 5999, 'Ford Mustang', 'floor mats', 'Premium carpet floor mat set for the Ford Mustang.'],
  ['Mahindra XUV 3XO Manual Custom Floor Mats', 'Interior', 5390, 'Mahindra XUV 3XO', 'floor mats', 'Manual transmission custom-fit floor mats.'],
  ['Mahindra XUV 3XO Automatic Custom Floor Mats', 'Interior', 5390, 'Mahindra XUV 3XO', 'floor mats', 'Automatic transmission custom-fit floor mats.'],
  ['Mahindra XUV 3XO Waterproof Body Cover', 'Exterior', 1999, 'Mahindra XUV 3XO', 'body cover', 'Water-resistant body cover for the Mahindra XUV 3XO.'],
];

export const additionalParts: Product[] = vehicleProducts.map(([name, category, price, vehicle, productType, description], index) => {
  const sku = `MMR-AF-${String(index + 140).padStart(3, '0')}`;
  return {
    id: `import-${sku.toLowerCase()}`,
    sku,
    name,
    category,
    price,
    image: `/images/products/catalog/${sku.toLowerCase()}.svg`,
    description,
    tags: [vehicle.split(' ')[0], ...vehicle.split(' ').slice(1), productType],
    vehicles: [vehicle],
    inStock: false,
    brand: 'MODMYRIDE',
    popularity: Math.max(35, 90 - index),
  };
});
