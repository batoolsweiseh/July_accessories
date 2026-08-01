export enum ProductCategory {
  ACCESSORIES = 'accessories',
  SETS = 'sets',
  BAGS = 'bags',
  WATCHES = 'watches',
}

// Keep backward compatibility alias
export const ArtworkCategory = ProductCategory;

export const OLD_ARTWORK_CATEGORIES = [
  'لوحات فنية',
  'تطريز فلسطيني',
  'خزف وفخار',
  'خط عربي',
  'تصوير فوتوغرافي',
  'نحت ومجسمات',
];

export const ARTWORK_CATEGORIES = [...Object.values(ProductCategory), ...OLD_ARTWORK_CATEGORIES];

export const isValidCategory = (value: string): value is ProductCategory => {
  return ARTWORK_CATEGORIES.includes(value);
};
