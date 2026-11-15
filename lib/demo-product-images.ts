const pexelsPhoto = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

const categoryPhotos: Record<string, string> = {
  Interior: pexelsPhoto(17450517),
  Exterior: pexelsPhoto(36903243),
  Lighting: pexelsPhoto(2667773),
  'Wheels & Tyres': pexelsPhoto(10182859),
  Wheels: pexelsPhoto(10182859),
  'Audio & Tech': pexelsPhoto(6258908),
  'Safety & Maintenance': pexelsPhoto(34277923),
  'Car Care & Utility': pexelsPhoto(20051469),
  Performance: pexelsPhoto(13119000),
};

export function getDemoProductImage(category: string) {
  return categoryPhotos[category] ?? pexelsPhoto(36903243);
}
