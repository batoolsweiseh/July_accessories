import { getSupabase } from '../config/supabase';
import { toProfileImagePublicUrl } from './profile-image-storage.service';

export const getAllArtists = async () => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, artist_name, bio, location, role, artist_since, profile_image')
    .eq('role', 'artist')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((artist: any) => ({
    ...artist,
    profile_image: artist.profile_image ? toProfileImagePublicUrl(artist.profile_image) : null,
  }));
};

export const getArtistProfile = async (artistId: string) => {
  const supabase = getSupabase();

  const { data: artist, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, artist_name, bio, location, phone, social_media, role, artist_since, profile_image')
    .eq('id', artistId)
    .eq('role', 'artist')
    .single();

  if (error || !artist) {
    const err = new Error('Artist not found');
    (err as any).statusCode = 404;
    throw err;
  }

  return {
    ...artist,
    profile_image: artist.profile_image ? toProfileImagePublicUrl(artist.profile_image) : null,
  };
};

export const getArtistArtworks = async (artistId: string, filters: { category?: string; page?: number; limit?: number }) => {
  const supabase = getSupabase();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // تحقق إن البائع/الفنان موجود
  const { data: artist, error: artistError } = await supabase
    .from('users')
    .select('id')
    .eq('id', artistId)
    .eq('role', 'artist')
    .single();

  if (artistError || !artist) {
    const err = new Error('Artist not found');
    (err as any).statusCode = 404;
    throw err;
  }

  let query = supabase
    .from('products')
    .select('*, subcategories(title_ar)', { count: 'exact' })
    .eq('artist_id', artistId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.category) query = query.eq('category_slug', filters.category);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const productsWithUrls = (data ?? []).map((product: any) => ({
    ...product,
    // backward-compat aliases
    title: product.name,
    image: product.image_url,
    artwork_images: product.image_url
      ? [{ filename: product.image_url, url: product.image_url, is_featured: true, sort_order: 0 }]
      : [],
  }));

  return { artworks: productsWithUrls, totalCount: count ?? 0, page, limit };
};