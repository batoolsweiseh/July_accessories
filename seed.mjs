import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORIES = [
  { slug: 'accessories', title_ar: 'إكسسوارات', title_en: 'ACCESSORIES' },
  { slug: 'sets',        title_ar: 'أطقم إكسسوارات', title_en: 'ACCESSORIES SETS' },
  { slug: 'bags',        title_ar: 'شنط',             title_en: 'BAGS' },
  { slug: 'watches',     title_ar: 'ساعات',           title_en: 'WATCHES' },
];

const SUBCATEGORIES = [
  { category_slug: 'accessories', title_ar: 'أساور' },
  { category_slug: 'accessories', title_ar: 'خاتم شبيه ذهب' },
  { category_slug: 'accessories', title_ar: 'خاتم ماركة' },
  { category_slug: 'accessories', title_ar: 'سنسال' },
  { category_slug: 'accessories', title_ar: 'حلق كبس' },
  { category_slug: 'accessories', title_ar: 'حلق طويل' },
  { category_slug: 'accessories', title_ar: 'خلخال' },
  { category_slug: 'accessories', title_ar: 'دبل' },
  { category_slug: 'accessories', title_ar: 'أطقم أساور' },
  { category_slug: 'sets', title_ar: 'أطقم شبيه الذهب' },
  { category_slug: 'sets', title_ar: 'أطقم ماركات' },
  { category_slug: 'sets', title_ar: 'أطقم نواعم' },
  { category_slug: 'bags', title_ar: 'حقائب صغيرة' },
  { category_slug: 'bags', title_ar: 'حقائب متوسطة' },
  { category_slug: 'bags', title_ar: 'حقائب كبيرة' },
  { category_slug: 'watches', title_ar: 'ساعات ماركة ستاتي' },
  { category_slug: 'watches', title_ar: 'ساعات ماركة رجالي' },
  { category_slug: 'watches', title_ar: 'ساعات شبيه ماركة ستاتي' },
  { category_slug: 'watches', title_ar: 'ساعات شبيه ماركة رجالي' },
];

async function seed() {
  console.log('Seeding categories...');
  for (const cat of CATEGORIES) {
    const { error } = await supabase.from('categories').upsert(
      { slug: cat.slug, title_ar: cat.title_ar, title_en: cat.title_en }, 
      { onConflict: 'slug' }
    );
    if (error) console.error("Error inserting category", cat.slug, error);
  }
  
  console.log('Seeding subcategories...');
  for (const sub of SUBCATEGORIES) {
    const { data: existing } = await supabase.from('subcategories')
      .select('id')
      .eq('category_slug', sub.category_slug)
      .eq('title_ar', sub.title_ar)
      .single();
      
    if (!existing) {
      const { error } = await supabase.from('subcategories').insert({ category_slug: sub.category_slug, title_ar: sub.title_ar });
      if (error) console.error("Error inserting subcategory", sub.title_ar, error);
    }
  }
  console.log('Seeding completed!');
}

seed().catch(console.error);
