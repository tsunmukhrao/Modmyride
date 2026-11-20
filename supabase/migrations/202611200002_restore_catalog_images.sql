-- Restore the storefront's prior category photography for the curated 25.
-- These are category-level illustrative photos, matching the previous storefront behavior.
update public.products p
set image = case c.name
  when 'Interior' then 'https://images.pexels.com/photos/17450517/pexels-photo-17450517.jpeg?auto=compress&cs=tinysrgb&w=1200'
  when 'Exterior' then 'https://images.pexels.com/photos/36903243/pexels-photo-36903243.jpeg?auto=compress&cs=tinysrgb&w=1200'
  when 'Lighting' then 'https://images.pexels.com/photos/2667773/pexels-photo-2667773.jpeg?auto=compress&cs=tinysrgb&w=1200'
  when 'Wheels & Tyres' then 'https://images.pexels.com/photos/10182859/pexels-photo-10182859.jpeg?auto=compress&cs=tinysrgb&w=1200'
  when 'Audio & Tech' then 'https://images.pexels.com/photos/6258908/pexels-photo-6258908.jpeg?auto=compress&cs=tinysrgb&w=1200'
  when 'Safety & Maintenance' then 'https://images.pexels.com/photos/34277923/pexels-photo-34277923.jpeg?auto=compress&cs=tinysrgb&w=1200'
  when 'Car Care & Utility' then 'https://images.pexels.com/photos/20051469/pexels-photo-20051469.jpeg?auto=compress&cs=tinysrgb&w=1200'
  else 'https://images.pexels.com/photos/13119000/pexels-photo-13119000.jpeg?auto=compress&cs=tinysrgb&w=1200'
end
from public.categories c
where p.category_id = c.id
  and p.sku between 'MMR-AF-140' and 'MMR-AF-164';
