import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's get the exact IDs from subcategories first to make sure we have the correct mapping
  const { data: subcats, error: fetchError } = await supabase
    .from('subcategories')
    .select('*')
    .eq('category_slug', 'accessories');

  if (fetchError) {
    console.error("Error fetching subcategories:", fetchError);
    return;
  }

  console.log("Current accessories subcategories in DB:", subcats);

  const asawerRow = subcats.find(s => s.title_ar === 'أساور');
  const asawerSahbRow = subcats.find(s => s.title_ar === 'أساور سحب');
  const eswaraRow = subcats.find(s => s.title_ar === 'أسوارة');

  if (!eswaraRow) {
    console.error("Could not find 'أسوارة' row in database!");
    return;
  }

  const targetSubcategoryId = eswaraRow.id;

  // 1. Redirect any products referencing the ones to delete
  const idsToRedirect = [];
  if (asawerRow) idsToRedirect.push(asawerRow.id);
  if (asawerSahbRow) idsToRedirect.push(asawerSahbRow.id);

  if (idsToRedirect.length > 0) {
    console.log(`Redirecting products of subcategories ${idsToRedirect} to ${targetSubcategoryId} ('أسوارة')...`);
    const { data: updatedProducts, error: updateProductsError } = await supabase
      .from('products')
      .update({ subcategory_id: targetSubcategoryId })
      .in('subcategory_id', idsToRedirect)
      .select();

    if (updateProductsError) {
      console.error("Error redirecting products:", updateProductsError);
    } else {
      console.log(`Redirected ${updatedProducts?.length || 0} products.`, updatedProducts);
    }
  }

  // 2. Update 'أسوارة' to 'أساور'
  console.log(`Updating subcategory '${eswaraRow.title_ar}' (${targetSubcategoryId}) to 'أساور'...`);
  const { data: updatedSub, error: updateSubError } = await supabase
    .from('subcategories')
    .update({ title_ar: 'أساور' })
    .eq('id', targetSubcategoryId)
    .select();

  if (updateSubError) {
    console.error("Error updating 'أسوارة' subcategory:", updateSubError);
  } else {
    console.log("Updated subcategory successfully:", updatedSub);
  }

  // 3. Delete the old 'أساور' and 'أساور سحب' subcategories
  if (idsToRedirect.length > 0) {
    console.log(`Deleting old subcategories ${idsToRedirect}...`);
    const { error: deleteError } = await supabase
      .from('subcategories')
      .delete()
      .in('id', idsToRedirect);

    if (deleteError) {
      console.error("Error deleting old subcategories:", deleteError);
    } else {
      console.log("Successfully deleted old subcategories from database.");
    }
  }
}

run().catch(console.error);
