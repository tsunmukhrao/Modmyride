-- Idempotent demo catalog. Apply after schema.sql and 202611040001_commerce_search.sql.
begin;

insert into public.categories(name, description, slug, sort_order) values
  ('Interior', 'Cabin comfort, protection, and organization.', 'interior', 1),
  ('Exterior', 'Body styling and practical exterior protection.', 'exterior', 2),
  ('Lighting', 'Road, cabin, and auxiliary lighting upgrades.', 'lighting', 3),
  ('Wheels & Tyres', 'Wheels, tyre care, and fitment essentials.', 'wheels-tyres', 4),
  ('Audio & Tech', 'Connected driving, sound, and camera systems.', 'audio-tech', 5),
  ('Safety & Maintenance', 'Service parts and essential roadside equipment.', 'safety-maintenance', 6),
  ('Car Care & Utility', 'Cleaning, storage, and everyday utility.', 'car-care-utility', 7),
  ('Performance', 'Handling, braking, and powertrain upgrades.', 'performance', 8)
on conflict (name) do update set description=excluded.description, slug=excluded.slug, sort_order=excluded.sort_order;

insert into public.brands(name, slug, description) values
  ('ModMyRide', 'modmyride', 'Curated fitment-first upgrades.'),
  ('Autofurnish', 'autofurnish', 'Vehicle-focused interior accessories.'),
  ('Philips', 'philips', 'Automotive lighting and electrical products.'),
  ('Bosch', 'bosch', 'Automotive components and maintenance.'),
  ('Blaupunkt', 'blaupunkt', 'In-car audio and connected technology.'),
  ('3M', '3m', 'Automotive films, finishes, and care.'),
  ('Michelin', 'michelin', 'Tyre and mobility accessories.'),
  ('K&N', 'kn', 'Performance filtration and intake systems.'),
  ('Ford', 'ford', 'Ford-focused demo accessories; confirm exact vehicle variant before ordering.')
on conflict (name) do update set slug=excluded.slug, description=excluded.description;

insert into public.vehicles(make, model, year_from, year_to, trim, source)
select make,model,year_from,year_to,trim,source from (values
  ('Honda', 'City', 2017, 2022, null, 'seed'),
  ('Honda', 'City', 2023, 2026, null, 'seed'),
  ('Hyundai', 'Creta', 2020, 2024, null, 'seed'),
  ('Maruti Suzuki', 'Swift', 2018, 2023, null, 'seed'),
  ('Tata', 'Nexon', 2020, 2024, null, 'seed'),
  ('Mahindra', 'Thar', 2020, 2025, null, 'seed'),
  ('Toyota', 'Innova Crysta', 2016, 2022, null, 'seed'),
  ('BMW', '3 Series', 2019, 2024, null, 'seed'),
  ('Ford', 'EcoSport', 2013, 2021, null, 'india-demo'),
  ('Ford', 'Figo', 2010, 2021, null, 'india-demo'),
  ('Ford', 'Aspire', 2015, 2021, null, 'india-demo'),
  ('Ford', 'Endeavour', 2003, 2021, null, 'india-demo'),
  ('Ford', 'Freestyle', 2018, 2021, null, 'india-demo'),
  ('Ford', 'Mustang', 2016, 2026, null, 'india-demo')
) as seed_vehicles(make,model,year_from,year_to,trim,source)
where not exists (
  select 1 from public.vehicles v where v.make=seed_vehicles.make and v.model=seed_vehicles.model
);

with catalog(sku,name,category,brand,description,price,compare_at_price,tags,specifications,popularity) as (values
  ('MMR-INT-101','Honda City Tailored Seat Cover Set','Interior','Autofurnish','Breathable, tailored seat covers with reinforced seams and a factory-inspired fit.',8499,9999,array['seat covers','comfort','tailored'], '{"material":"Breathable jacquard","pieces":"Front and rear set"}'::jsonb,82),
  ('MMR-INT-102','All-Weather 3D Floor Mat Set','Interior','ModMyRide','Raised-edge mats trap water, dust, and road grime without sliding underfoot.',4299,4999,array['floor mats','waterproof','all weather'], '{"material":"TPE","pieces":"5-piece set"}'::jsonb,95),
  ('MMR-INT-103','Soft-Touch Steering Wheel Cover','Interior','Autofurnish','A non-slip, hand-stitched cover that adds grip without hiding the original wheel design.',1199,1499,array['steering','grip','interior'], '{"material":"Microfiber leather","fit":"Universal 14.5–15 inch"}'::jsonb,47),
  ('MMR-INT-104','Dual-Zone Ambient Cabin Light Kit','Interior','ModMyRide','App-controlled ambient lighting with dimmable multi-zone strips and a clean concealed install.',3899,4499,array['ambient','led','cabin'], '{"control":"App and inline","zones":"4"}'::jsonb,76),
  ('MMR-INT-105','Magnetic Side-Window Sun Shades','Interior','Autofurnish','Reduces glare and cabin heat while preserving outward visibility for rear passengers.',1699,1999,array['sun shade','heat','window'], '{"pieces":"4","installation":"Magnetic frame"}'::jsonb,38),
  ('MMR-INT-106','Memory-Foam Neck Support Pair','Interior','Autofurnish','Contoured headrest cushions ease long-drive fatigue with a washable cover.',1499,1799,array['neck pillow','comfort','travel'], '{"fill":"Memory foam","pieces":"2"}'::jsonb,33),
  ('MMR-INT-107','Modular Boot Organizer','Interior','ModMyRide','Fold-flat cargo organizer with adjustable dividers and a grippy base.',1899,2299,array['organizer','storage','boot'], '{"capacity":"45 L","material":"600D Oxford fabric"}'::jsonb,61),
  ('MMR-EXT-201','Carbon-Look Front Lip','Exterior','ModMyRide','A durable ABS front lip that sharpens the stance with a subtle motorsport profile.',6999,7999,array['front lip','aerodynamic','body kit'], '{"material":"ABS","finish":"Gloss carbon look"}'::jsonb,88),
  ('MMR-EXT-202','Paint-Matched Side Skirt Pair','Exterior','ModMyRide','Low-profile side skirts visually lower the car and protect the rocker panels.',8999,10999,array['side skirt','body kit','styling'], '{"material":"Automotive ABS","pieces":"Left and right"}'::jsonb,52),
  ('MMR-EXT-203','Ducktail Trunk Spoiler','Exterior','ModMyRide','A clean ducktail spoiler with automotive-grade adhesive and a paint-ready surface.',5499,6499,array['spoiler','rear','styling'], '{"material":"ABS","installation":"Automotive adhesive"}'::jsonb,70),
  ('MMR-EXT-204','Flexible Mud Flap Set','Exterior','Autofurnish','Flexible splash guards help protect paint and bodywork from stones and spray.',1299,1599,array['mud flap','protection','all weather'], '{"material":"Flexible polymer","pieces":"4"}'::jsonb,44),
  ('MMR-EXT-205','Satin Black Window Trim Wrap','Exterior','3M','Pre-cut satin film refreshes bright window trim with a durable, low-glare finish.',2799,3299,array['chrome delete','vinyl','trim'], '{"finish":"Satin black","cut":"Vehicle-specific kit"}'::jsonb,41),
  ('MMR-EXT-206','Clear Door-Edge Guard Kit','Exterior','3M','Nearly invisible impact film helps prevent chips and scratches along door edges.',899,1099,array['paint protection','door guard','clear film'], '{"film":"Self-healing TPU","pieces":"4 strips"}'::jsonb,29),
  ('MMR-EXT-207','Low-Profile Roof Rail Crossbars','Exterior','ModMyRide','Lockable aluminium crossbars expand carrying capacity while keeping wind noise low.',7999,9499,array['roof rack','crossbar','cargo'], '{"material":"Aluminium","load":"75 kg dynamic"}'::jsonb,56),
  ('MMR-LGT-301','Philips Ultinon Pro LED Headlight Pair','Lighting','Philips','Crisp white LED output improves road visibility with a compact, fan-cooled design.',6999,7999,array['led headlight','bright','visibility'], '{"colour":"6000 K","voltage":"12 V"}'::jsonb,92),
  ('MMR-LGT-302','Projector Fog Lamp Pair','Lighting','ModMyRide','Wide, controlled beam pattern improves visibility in rain and low-contrast conditions.',4599,5499,array['fog light','projector','visibility'], '{"lens":"Clear projector","pieces":"2"}'::jsonb,48),
  ('MMR-LGT-303','LED Cabin Bulb Conversion Kit','Lighting','Philips','Matched interior bulbs deliver even, low-draw white illumination throughout the cabin.',1299,1599,array['interior light','led','cabin'], '{"colour":"6000 K","pieces":"8 assorted bulbs"}'::jsonb,39),
  ('MMR-LGT-304','Sequential Mirror Indicator Pair','Lighting','ModMyRide','Smoked sequential indicators add a modern sweep while retaining a bright signal.',3299,3999,array['indicator','sequential','mirror'], '{"lens":"Light smoke","pieces":"Left and right"}'::jsonb,45),
  ('MMR-LGT-305','LED Reverse Light Upgrade','Lighting','Philips','High-output reverse lamps improve rearward visibility and make parking easier at night.',1499,1799,array['reverse light','led','parking'], '{"colour":"Cool white","voltage":"12 V"}'::jsonb,28),
  ('MMR-LGT-306','White DRL Accent Strip Kit','Lighting','ModMyRide','Flexible daytime running light strips with a clean white running mode and amber signal.',2399,2899,array['drl','daytime running light','signal'], '{"modes":"White DRL and amber turn","length":"60 cm each"}'::jsonb,34),
  ('MMR-LGT-307','Waterproof Auxiliary Light Relay Harness','Lighting','Bosch','Fused relay harness provides a safe, tidy power connection for auxiliary lamps.',1799,2199,array['relay','wiring','auxiliary light'], '{"protection":"Inline fuse","voltage":"12 V"}'::jsonb,31),
  ('MMR-WHL-401','18-Inch Flow-Formed Alloy Wheel','Wheels & Tyres','ModMyRide','Lightweight flow-formed wheel balances a clean multi-spoke look with everyday durability.',18999,21999,array['alloy wheel','18 inch','flow formed'], '{"diameter":"18 in","finish":"Satin graphite","price_unit":"per wheel"}'::jsonb,80),
  ('MMR-WHL-402','17-Inch Diamond-Cut Alloy Wheel','Wheels & Tyres','ModMyRide','Diamond-cut multi-spoke wheel with a protective clear coat and OEM-style offsets.',15999,18499,array['alloy wheel','17 inch','diamond cut'], '{"diameter":"17 in","finish":"Diamond cut","price_unit":"per wheel"}'::jsonb,64),
  ('MMR-WHL-403','Forged Aluminium Locking Lug Nut Set','Wheels & Tyres','ModMyRide','Lightweight lug nuts with a keyed lock set add a secure finishing detail to new wheels.',2499,2999,array['lug nuts','locking','forged'], '{"material":"Forged aluminium","pieces":"20 plus key"}'::jsonb,36),
  ('MMR-WHL-404','Wireless Tyre Pressure Monitor Kit','Wheels & Tyres','Bosch','Real-time pressure and temperature alerts help catch slow leaks before a long drive.',3899,4499,array['tpms','tyre pressure','safety'], '{"sensors":"4 external","display":"Solar and USB-C"}'::jsonb,73),
  ('MMR-WHL-405','Compact Digital Tyre Inflator','Wheels & Tyres','Michelin','Preset pressure and auto-stop keep tyre top-ups simple at home or on the roadside.',2799,3299,array['tyre inflator','compressor','portable'], '{"max_pressure":"150 PSI","power":"12 V socket"}'::jsonb,84),
  ('MMR-WHL-406','Low-Profile Rubber Wheel Chock Pair','Wheels & Tyres','ModMyRide','Textured chocks help keep a parked vehicle steady during tyre and garage work.',999,1199,array['wheel chock','garage','safety'], '{"material":"Oil-resistant rubber","pieces":"2"}'::jsonb,18),
  ('MMR-WHL-407','Alloy Wheel Cleaning Brush Set','Wheels & Tyres','3M','Soft, non-scratch brushes reach between spokes and around lug wells.',799,999,array['wheel brush','cleaning','detailing'], '{"pieces":"3 brushes","bristles":"Non-scratch synthetic"}'::jsonb,25),
  ('MMR-TEC-501','Dual-Channel 2K Dash Camera','Audio & Tech','Blaupunkt','Front and rear recording with GPS, parking mode, and a high-dynamic-range front sensor.',12999,14999,array['dash cam','recording','front rear'], '{"resolution":"2K front and 1080p rear","storage":"Up to 256 GB"}'::jsonb,97),
  ('MMR-TEC-502','9-Inch Wireless CarPlay Head Unit','Audio & Tech','Blaupunkt','A bright touchscreen brings wireless phone mirroring, navigation, and hands-free calls.',18999,21999,array['carplay','android auto','touchscreen'], '{"screen":"9 inch IPS","connectivity":"Wireless CarPlay and Android Auto"}'::jsonb,89),
  ('MMR-TEC-503','6.5-Inch Component Speaker Pair','Audio & Tech','Blaupunkt','Separate tweeters and a tuned crossover give vocals more clarity without harshness.',6999,8299,array['car audio','speakers','component'], '{"size":"6.5 inch","power":"60 W RMS per pair"}'::jsonb,55),
  ('MMR-TEC-504','Compact 4-Channel Class-D Amplifier','Audio & Tech','Blaupunkt','Efficient clean power for a speaker upgrade in a compact, easy-to-place chassis.',9999,11999,array['amplifier','audio','class d'], '{"channels":"4","power":"60 W RMS x 4"}'::jsonb,42),
  ('MMR-TEC-505','Wireless Phone-Mirroring Adapter','Audio & Tech','Blaupunkt','Converts supported wired smartphone projection to a quick wireless connection.',4999,5999,array['wireless carplay','adapter','connectivity'], '{"connection":"USB-A and USB-C","compatibility":"Supported OEM systems"}'::jsonb,60),
  ('MMR-TEC-506','Dual-Port 45W USB-C Car Charger','Audio & Tech','Bosch','Fast charging with USB-C Power Delivery and a second port for a passenger device.',1299,1599,array['charger','usb c','fast charging'], '{"output":"45 W USB-C PD","ports":"USB-C and USB-A"}'::jsonb,77),
  ('MMR-TEC-507','1080p AHD Reverse Camera','Audio & Tech','Blaupunkt','A wide-angle low-light camera makes reversing clearer on compatible displays.',2299,2799,array['reverse camera','backup camera','parking'], '{"resolution":"1080p AHD","view":"170 degree"}'::jsonb,51),
  ('MMR-SAF-601','Ceramic Brake Pad Set','Safety & Maintenance','Bosch','Low-dust ceramic compound delivers consistent everyday braking with reduced noise.',3999,4799,array['brake pads','ceramic','braking'], '{"compound":"Ceramic","axle":"Front set"}'::jsonb,86),
  ('MMR-SAF-602','Premium Beam Wiper Blade Pair','Safety & Maintenance','Bosch','Aerodynamic beam blades maintain even pressure across the windscreen in heavy rain.',1599,1899,array['wiper blades','rain','visibility'], '{"type":"Frameless beam","pieces":"2 assorted lengths"}'::jsonb,69),
  ('MMR-SAF-603','High-Flow Engine Air Filter','Safety & Maintenance','K&N','Washable replacement filter supports strong airflow while protecting the intake.',3499,4199,array['air filter','engine','washable'], '{"media":"Oiled cotton gauze","service":"Reusable"}'::jsonb,50),
  ('MMR-SAF-604','Activated-Carbon Cabin Filter','Safety & Maintenance','Bosch','Multi-layer cabin filter helps reduce dust, pollen, and traffic odours.',1299,1599,array['cabin filter','air quality','carbon'], '{"media":"Activated carbon","replacement":"Vehicle-specific"}'::jsonb,46),
  ('MMR-SAF-605','150 PSI Auto-Stop Air Compressor','Safety & Maintenance','Michelin','Digital preset and auto-stop inflation for cars, bicycles, and sports equipment.',3299,3899,array['air compressor','tyre','emergency'], '{"max_pressure":"150 PSI","power":"12 V socket"}'::jsonb,63),
  ('MMR-SAF-606','Roadside Emergency Essentials Kit','Safety & Maintenance','ModMyRide','Compact roadside kit with reflective warning triangle, vest, gloves, and first-aid basics.',2499,2999,array['emergency kit','roadside','safety'], '{"contents":"Warning triangle, vest, first aid and gloves","storage":"Zip case"}'::jsonb,35),
  ('MMR-SAF-607','Lithium Jump Starter with Work Light','Safety & Maintenance','Bosch','Portable jump pack with reverse-polarity protection, USB charging, and an LED work light.',6999,8299,array['jump starter','battery','emergency'], '{"capacity":"12000 mAh","engine":"Up to 4.0 L petrol"}'::jsonb,72),
  ('MMR-CARE-701','pH-Neutral Car Wash Concentrate','Car Care & Utility','3M','Concentrated wash lifts road film while remaining gentle on wax and ceramic coatings.',699,899,array['car shampoo','wash','pH neutral'], '{"volume":"500 ml","dilution":"1:500"}'::jsonb,58),
  ('MMR-CARE-702','SiO2 Ceramic Spray Sealant','Car Care & Utility','3M','Quick spray sealant adds gloss and water beading between full coating details.',1799,2199,array['ceramic coating','paint protection','gloss'], '{"volume":"500 ml","protection":"Up to 3 months"}'::jsonb,79),
  ('MMR-CARE-703','Plush Microfiber Detailing Towel Set','Car Care & Utility','3M','Edgeless high-pile towels safely dry paint and buff away product residue.',999,1299,array['microfiber','detailing','towel'], '{"gsm":"500 GSM","pieces":"4"}'::jsonb,66),
  ('MMR-CARE-704','Cordless Handheld Car Vacuum','Car Care & Utility','ModMyRide','Compact cordless vacuum with washable filter and crevice tools for the cabin.',3499,4199,array['car vacuum','cleaning','cordless'], '{"suction":"9000 Pa","charging":"USB-C"}'::jsonb,57),
  ('MMR-CARE-705','HEPA Cabin Air Purifier','Car Care & Utility','ModMyRide','A quiet portable purifier with a replaceable HEPA filter for fresher cabin air.',4299,4999,array['air purifier','hepa','cabin air'], '{"filter":"H13 HEPA","power":"USB-C"}'::jsonb,49),
  ('MMR-CARE-706','Waterproof Foldable Cargo Liner','Car Care & Utility','Autofurnish','Raised edges and a wipe-clean surface protect the boot from wet and muddy loads.',2399,2899,array['boot mat','cargo liner','waterproof'], '{"material":"TPE","fit":"Trim-to-fit"}'::jsonb,40),
  ('MMR-CARE-707','Scratch-Safe Interior Brush Trio','Car Care & Utility','3M','Three soft detailing brushes remove dust from vents, seams, and trim without scratching.',599,799,array['interior cleaning','detailing brush','dust'], '{"pieces":"3","bristle":"Soft synthetic"}'::jsonb,23),
  ('MMR-PERF-801','Cold-Air Intake System','Performance','K&N','Vehicle-specific intake with a heat shield and reusable filter for improved response.',14999,17499,array['cold air intake','performance','airflow'], '{"filter":"Reusable cotton gauze","includes":"Heat shield and intake tube"}'::jsonb,75),
  ('MMR-PERF-802','Stainless Cat-Back Exhaust System','Performance','ModMyRide','Mandrel-bent stainless system adds a deeper tone while retaining a refined cruise.',32999,37999,array['exhaust','cat back','stainless'], '{"material":"304 stainless steel","configuration":"Cat-back"}'::jsonb,67),
  ('MMR-PERF-803','Sport Brake Disc and Pad Kit','Performance','Bosch','Matched front discs and pads deliver dependable bite for spirited road driving.',11999,13999,array['brake kit','performance brakes','rotor'], '{"axle":"Front","disc":"Vented replacement"}'::jsonb,54),
  ('MMR-PERF-804','Progressive Lowering Spring Set','Performance','ModMyRide','Progressive springs reduce body roll and close the wheel gap without a harsh ride.',21999,24999,array['lowering springs','suspension','handling'], '{"drop":"25–35 mm","pieces":"4 springs"}'::jsonb,48),
  ('MMR-PERF-805','Front Strut Tower Brace','Performance','ModMyRide','A rigid aluminium brace helps sharpen front-end response through corners.',6499,7799,array['strut bar','chassis','handling'], '{"material":"Aluminium alloy","finish":"Powder-coated black"}'::jsonb,37),
  ('MMR-PERF-806','High-Efficiency Engine Oil Filter','Performance','K&N','A high-flow replacement filter with a durable housing for scheduled service.',899,1099,array['oil filter','engine maintenance','high flow'], '{"media":"Synthetic blend","replacement":"Vehicle-specific"}'::jsonb,43),
  ('MMR-PERF-807','Front-Mount Intercooler Upgrade','Performance','ModMyRide','Larger bar-and-plate core helps control intake temperatures on tuned turbo engines.',24999,28999,array['intercooler','turbo','charge air'], '{"core":"Bar-and-plate aluminium","fitment":"Vehicle-specific turbo models"}'::jsonb,32)
), upserted as (
  insert into public.products(sku,name,category_id,brand_id,description,price,compare_at_price,tags,specifications,popularity,status,in_stock,image)
  select c.sku,c.name,cat.id,b.id,c.description,c.price,c.compare_at_price,c.tags,c.specifications,c.popularity,'active',true,
    case c.category
      when 'Interior' then 'https://images.pexels.com/photos/17450517/pexels-photo-17450517.jpeg?auto=compress&cs=tinysrgb&w=1200'
      when 'Exterior' then 'https://images.pexels.com/photos/36903243/pexels-photo-36903243.jpeg?auto=compress&cs=tinysrgb&w=1200'
      when 'Lighting' then 'https://images.pexels.com/photos/2667773/pexels-photo-2667773.jpeg?auto=compress&cs=tinysrgb&w=1200'
      when 'Wheels & Tyres' then 'https://images.pexels.com/photos/10182859/pexels-photo-10182859.jpeg?auto=compress&cs=tinysrgb&w=1200'
      when 'Audio & Tech' then 'https://images.pexels.com/photos/6258908/pexels-photo-6258908.jpeg?auto=compress&cs=tinysrgb&w=1200'
      when 'Safety & Maintenance' then 'https://images.pexels.com/photos/34277923/pexels-photo-34277923.jpeg?auto=compress&cs=tinysrgb&w=1200'
      when 'Car Care & Utility' then 'https://images.pexels.com/photos/20051469/pexels-photo-20051469.jpeg?auto=compress&cs=tinysrgb&w=1200'
      else 'https://images.pexels.com/photos/13119000/pexels-photo-13119000.jpeg?auto=compress&cs=tinysrgb&w=1200'
    end
  from catalog c join public.categories cat on cat.slug=case c.category
    when 'Interior' then 'interior' when 'Exterior' then 'exterior' when 'Lighting' then 'lighting'
    when 'Wheels & Tyres' then 'wheels-tyres' when 'Audio & Tech' then 'audio-tech'
    when 'Safety & Maintenance' then 'safety-maintenance' when 'Car Care & Utility' then 'car-care-utility' else 'performance' end
  join public.brands b on b.name=c.brand
  on conflict (sku) do update set name=excluded.name,category_id=excluded.category_id,brand_id=excluded.brand_id,image=excluded.image,
    description=excluded.description,price=excluded.price,compare_at_price=excluded.compare_at_price,tags=excluded.tags,
    specifications=excluded.specifications,popularity=excluded.popularity,status='active',deleted_at=null
  returning id,sku,specifications
)
insert into public.inventory(product_id,quantity,low_stock_threshold)
select id, case when sku in ('MMR-LGT-301','MMR-SAF-601','MMR-PERF-802') then 0 else 12 end, 4 from upserted
on conflict (product_id) do update set low_stock_threshold=excluded.low_stock_threshold,updated_at=now();

with ford_demo(sku,name,category,description,price,tags,popularity,image) as (values
  ('MMR-FORD-001','Ford EcoSport All-Weather Floor Mat Set','Interior','Project demo listing for Ford EcoSport owners. Verify generation and floor layout before purchase.',3299,array['Ford','EcoSport','floor mats','all weather'],94,'/images/products/ford-ecosport-floor-mats.png'),
  ('MMR-FORD-002','Ford Figo / Aspire Wiper Blade Pair','Safety & Maintenance','Project demo listing for Ford Figo and Aspire. Confirm model year and blade lengths before purchase.',1499,array['Ford','Figo','Aspire','wiper blades'],89,'/images/products/ford-wiper-blades.png'),
  ('MMR-FORD-003','Ford Endeavour Cargo Liner','Car Care & Utility','Project demo listing for Ford Endeavour. Check generation and boot configuration before purchase.',4499,array['Ford','Endeavour','cargo liner','boot mat'],86,'/images/products/ford-endeavour-cargo-liner.png'),
  ('MMR-FORD-004','Ford EcoSport Cabin Filter','Safety & Maintenance','Project demo listing for Ford EcoSport. Confirm engine, model year, and filter dimensions before purchase.',1199,array['Ford','EcoSport','cabin filter','maintenance'],80,'/images/products/ford-cabin-filter.png'),
  ('MMR-FORD-005','Ford Mustang Premium Floor Mat Set','Interior','Project demo listing for Ford Mustang. Confirm generation and left/right-hand-drive configuration before purchase.',5999,array['Ford','Mustang','floor mats','interior'],78,'/images/products/ford-mustang-floor-mats.png')
)
insert into public.products(sku,name,category_id,brand_id,description,price,tags,popularity,status,in_stock,image)
select d.sku,d.name,c.id,b.id,d.description,d.price,d.tags,d.popularity,'active',true,d.image
from ford_demo d
join public.categories c on c.name=d.category
join public.brands b on b.slug='ford'
on conflict(sku) do update set name=excluded.name,category_id=excluded.category_id,brand_id=excluded.brand_id,
  description=excluded.description,price=excluded.price,tags=excluded.tags,popularity=excluded.popularity,
  status='active',deleted_at=null,image=excluded.image;

insert into public.inventory(product_id,quantity,low_stock_threshold)
select id,12,4 from public.products where sku like 'MMR-FORD-%'
on conflict(product_id) do update set low_stock_threshold=excluded.low_stock_threshold,updated_at=now();

update public.products p set in_stock=(i.quantity-i.reserved > 0)
from public.inventory i where i.product_id=p.id and p.sku like 'MMR-%';

insert into public.product_specs(product_id,name,value,sort_order)
select p.id, spec.key, spec.value, row_number() over(partition by p.id order by spec.key)::int
from public.products p cross join lateral jsonb_each_text(p.specifications) spec
where p.sku like 'MMR-%'
on conflict (product_id,name) do update set value=excluded.value,sort_order=excluded.sort_order;

insert into public.product_compatibility(product_id,vehicle_id,notes)
select p.id,v.id,fit.notes
from (values
  ('MMR-INT-101','Honda','City','2017–2022 tailored cut'),
  ('MMR-INT-102','Honda','City','Vehicle-shaped floor set'),
  ('MMR-INT-102','Hyundai','Creta','Vehicle-shaped floor set'),
  ('MMR-INT-102','Maruti Suzuki','Swift','Vehicle-shaped floor set'),
  ('MMR-INT-102','Tata','Nexon','Vehicle-shaped floor set'),
  ('MMR-FORD-001','Ford','EcoSport','Ford demo fitment — verify exact model year and floor layout'),
  ('MMR-FORD-002','Ford','Figo','Ford demo fitment — verify exact model year and blade lengths'),
  ('MMR-FORD-002','Ford','Aspire','Ford demo fitment — verify exact model year and blade lengths'),
  ('MMR-FORD-003','Ford','Endeavour','Ford demo fitment — verify generation and boot configuration'),
  ('MMR-FORD-004','Ford','EcoSport','Ford demo fitment — verify engine and filter dimensions'),
  ('MMR-FORD-005','Ford','Mustang','Ford demo fitment — verify generation and cabin configuration'),
  ('MMR-INT-107','Toyota','Innova Crysta','Boot organizer fits behind the third row'),
  ('MMR-EXT-207','Hyundai','Creta','Raised roof rail mounting points required'),
  ('MMR-EXT-207','Toyota','Innova Crysta','Raised roof rail mounting points required'),
  ('MMR-LGT-301','Ford','Mustang','Confirm bulb base and local road regulations before purchase'),
  ('MMR-TEC-501','Honda','City','Hardwire kit sold separately'),
  ('MMR-TEC-501','BMW','3 Series','Hardwire kit sold separately'),
  ('MMR-SAF-602','Honda','City','Check original blade length before ordering'),
  ('MMR-SAF-602','Maruti Suzuki','Swift','Check original blade length before ordering'),
  ('MMR-CARE-706','Mahindra','Thar','Trim-to-fit cargo liner'),
  ('MMR-PERF-801','BMW','3 Series','Engine variant and intake generation must be verified'),
  ('MMR-PERF-804','Ford','Mustang','Generation-specific fitment; verify axle and suspension variant')
) as fit(sku,make,model,notes)
join public.products p on p.sku=fit.sku
join public.vehicles v on v.make=fit.make and v.model=fit.model
on conflict (product_id,vehicle_id) do update set notes=excluded.notes;

-- Option-aware Ford demo fitments (sample year ranges; verify before real sales).
insert into public.product_variants(product_id,sku,options,price,quantity)
select p.id,'MMR-FORD-001-2013-17','{"vehicle_year":"2013–2017"}'::jsonb,p.price,20 from public.products p where p.sku='MMR-FORD-001'
on conflict(sku) do update set product_id=excluded.product_id,options=excluded.options,price=excluded.price,quantity=excluded.quantity,active=true,updated_at=now();
insert into public.product_variants(product_id,sku,options,price,quantity)
select p.id,'MMR-FORD-001-2018-21','{"vehicle_year":"2018–2021"}'::jsonb,p.price,20 from public.products p where p.sku='MMR-FORD-001'
on conflict(sku) do update set product_id=excluded.product_id,options=excluded.options,price=excluded.price,quantity=excluded.quantity,active=true,updated_at=now();

insert into public.product_bundles(id,title,description,discount_percent,active)
select 'd16f9988-616a-4de4-8c0a-2a50ba85ac10','EcoSport cabin protection','A practical interior set for the India-market Ford EcoSport. Verify exact year and fitment before purchase.',0,true
where exists(select 1 from public.products where sku='MMR-FORD-001')
on conflict(id) do update set title=excluded.title,description=excluded.description,discount_percent=excluded.discount_percent,active=true;
insert into public.bundle_items(bundle_id,product_id,quantity)
select 'd16f9988-616a-4de4-8c0a-2a50ba85ac10',id,1 from public.products where sku in ('MMR-FORD-001','MMR-FORD-004')
on conflict(bundle_id,product_id) do update set quantity=excluded.quantity;

-- Keep the local demo storefront aligned with the 25 curated vehicle-specific SKUs.
-- Other rows remain in the database for reference, but are hidden from customers.
update public.products
set status='archived', source_url=null, updated_at=now()
where sku ~ '^MMR-(INT|EXT|LGT|WHL|TEC|SAF|CARE|PERF)-[0-9]+$'
   or sku ~ '^MMR-FORD-00[1-5]$';

commit;
