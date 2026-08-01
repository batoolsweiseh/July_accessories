import { getSupabase } from '../config/supabase';
import { toArtworkPublicUrl } from './artwork-storage.service';
import { toProfileImagePublicUrl } from './profile-image-storage.service';
import { ProductCategory } from '../types/artwork.types';

// Keep ArtworkCategory as alias for backward-compat
export { ProductCategory as ArtworkCategory };

const createStatusError = (message: string, statusCode: number) => {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
};

export interface CreateArtworkData {
  // July product fields
  name?: string;
  title?: string; // backward-compat alias for name
  description?: string;
  category_slug?: string;
  category?: string; // backward-compat alias
  subcategory_id?: string | null;
  price: number;
  quantity?: number;
  in_stock?: boolean;
  is_featured?: boolean;
  image_url?: string | null;
  whatsapp_message?: string | null;
  images?: { filename: string; alt_text?: string; is_featured?: boolean }[];
}

export interface ArtworkQueryFilters {
  category?: string;
  artistId?: string;
  search?: string;
  searchBy?: 'artwork' | 'global';
  page?: number;
  limit?: number;
}

export interface ArtworkListResult {
  artworks: Record<string, unknown>[];
  totalCount: number;
  page: number;
  limit: number;
}

// Build a uniform product shape with backward-compat artwork aliases
export const attachArtworkImageUrls = <T extends Record<string, any> | null>(product: T): T => {
  if (!product) return product;

  // Handle image_url field
  const imageUrl = product.image_url
    ? (product.image_url.startsWith('http') ? product.image_url : toArtworkPublicUrl(product.image_url))
    : null;

  // Handle artist/users profile image
  const artistRecord = Array.isArray(product.users) ? product.users[0] : product.users;
  const usersWithProfileImage = artistRecord
    ? {
        ...artistRecord,
        profile_image: artistRecord.profile_image
          ? toProfileImagePublicUrl(artistRecord.profile_image)
          : null,
      }
    : product.users;

  // Build a fake artwork_images array for backward-compat if only image_url exists
  const artworkImages = product.artwork_images || (
    imageUrl ? [{ filename: imageUrl, url: imageUrl, is_featured: true, sort_order: 0 }] : []
  );

  return {
    ...product,
    // July fields
    name: product.name,
    image_url: imageUrl,
    // backward-compat aliases
    title: product.title || product.name,
    image: imageUrl,
    artwork_images: artworkImages,
    users: usersWithProfileImage,
  } as T;
};

export const createArtwork = async (artistId: string, artworkData: CreateArtworkData) => {
  const supabase = getSupabase();

  const name = artworkData.name || artworkData.title;
  const categorySlug = artworkData.category_slug || artworkData.category;

  if (!name) throw createStatusError('اسم المنتج مطلوب', 400);

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      name,
      description: artworkData.description || null,
      category_slug: categorySlug,
      subcategory_id: artworkData.subcategory_id || null,
      artist_id: artistId,
      price: artworkData.price,
      in_stock: artworkData.in_stock !== undefined ? artworkData.in_stock : true,
      is_featured: artworkData.is_featured || false,
      image_url: artworkData.image_url || (artworkData.images?.[0]?.filename
        ? (artworkData.images[0].filename.startsWith('http') ? artworkData.images[0].filename : toArtworkPublicUrl(artworkData.images[0].filename))
        : null),
    })
    .select(`
      *,
      users!products_artist_id_fkey (
        artist_name,
        first_name,
        last_name,
        profile_image,
        location,
        phone
      ),
      subcategories ( title_ar )
    `)
    .single();

  if (error) throw error;

  return attachArtworkImageUrls(product);
};

export const getArtworks = async (
  filters: ArtworkQueryFilters,
  showContactInfo: boolean = false
): Promise<ArtworkListResult> => {
  const supabase = getSupabase();
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const limit = Math.max(1, Math.min(100, Math.floor(filters.limit ?? 12)));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('products')
    .select(`
      *,
      users!products_artist_id_fkey (
        artist_name,
        first_name,
        last_name,
        profile_image,
        location,
        phone
      ),
      subcategories ( title_ar )
    `, { count: 'exact' });

  if (filters.category) {
    query = query.eq('category_slug', filters.category);
  }

  if (filters.artistId) {
    query = query.eq('artist_id', filters.artistId);
  }

  if (filters.search) {
    const sanitizedSearch = filters.search.trim();
    if (sanitizedSearch) {
      const searchPattern = `%${sanitizedSearch}%`;
      query = query.or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`);
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if ((error as any).code === 'PGRST103') {
      return { artworks: [], totalCount: 0, page, limit };
    }
    throw error;
  }

  return {
    artworks: (data || []).map((product) => {
      const shaped = attachArtworkImageUrls(product);
      if (!showContactInfo && shaped.users) {
        (shaped as any).users = { ...shaped.users, location: null, phone: null };
      }
      return shaped;
    }),
    totalCount: count ?? 0,
    page,
    limit,
  };
};

export const getArtworkById = async (id: string, showContactInfo: boolean = false) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      users!products_artist_id_fkey (
        artist_name,
        first_name,
        last_name,
        profile_image,
        location,
        phone
      ),
      subcategories ( title_ar )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  const shaped = attachArtworkImageUrls(data);
  if (!showContactInfo && shaped.users) {
    (shaped as any).users = { ...shaped.users, location: null, phone: null };
  }
  return shaped;
};

export const updateArtwork = async (id: string, artistId: string, updateData: Partial<CreateArtworkData>) => {
  const supabase = getSupabase();

  const { data: existingProduct, error: checkError } = await supabase
    .from('products')
    .select('artist_id')
    .eq('id', id)
    .single();

  if (checkError || !existingProduct) {
    throw createStatusError('المنتج غير موجود', 404);
  }

  if (existingProduct.artist_id !== artistId) {
    throw createStatusError('يمكنك تحديث منتجاتك فقط', 403);
  }

  const updateFields: any = {};
  if (updateData.name || updateData.title) updateFields.name = updateData.name || updateData.title;
  if (updateData.description !== undefined) updateFields.description = updateData.description;
  if (updateData.category_slug || updateData.category) updateFields.category_slug = updateData.category_slug || updateData.category;
  if (updateData.subcategory_id !== undefined) updateFields.subcategory_id = updateData.subcategory_id;
  if (updateData.price !== undefined) updateFields.price = updateData.price;
  if (updateData.in_stock !== undefined) updateFields.in_stock = updateData.in_stock;
  if (updateData.is_featured !== undefined) updateFields.is_featured = updateData.is_featured;
  if (updateData.image_url !== undefined) updateFields.image_url = updateData.image_url;
  if (updateData.whatsapp_message !== undefined) updateFields.whatsapp_message = updateData.whatsapp_message;

  // Handle image from images array (backward-compat)
  if (updateData.images && updateData.images.length > 0 && !updateFields.image_url) {
    const firstImage = updateData.images[0];
    if (firstImage && firstImage.filename) {
      updateFields.image_url = firstImage.filename.startsWith('http')
        ? firstImage.filename
        : toArtworkPublicUrl(firstImage.filename);
    }
  }

  const { data: product, error: updateError } = await supabase
    .from('products')
    .update(updateFields)
    .eq('id', id)
    .select(`
      *,
      users!products_artist_id_fkey (
        artist_name,
        first_name,
        last_name,
        profile_image,
        location,
        phone
      ),
      subcategories ( title_ar )
    `)
    .single();

  if (updateError) throw updateError;

  return {
    artwork: attachArtworkImageUrls(product),
    oldImageFilenames: [],
  };
};

export const deleteArtwork = async (id: string, artistId: string) => {
  const supabase = getSupabase();

  const { data: existingProduct, error: checkError } = await supabase
    .from('products')
    .select('artist_id, image_url')
    .eq('id', id)
    .single();

  if (checkError || !existingProduct) {
    throw createStatusError('المنتج غير موجود', 404);
  }

  if (existingProduct.artist_id !== artistId) {
    throw createStatusError('يمكنك حذف منتجاتك فقط', 403);
  }

  // Hard delete
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;

  const deletedImageFilenames = existingProduct.image_url ? [existingProduct.image_url] : [];

  return {
    message: 'تم حذف المنتج بنجاح',
    deletedImageFilenames,
  };
};

export const getMyArtworks = async (
  artistId: string,
  filters?: ArtworkQueryFilters
): Promise<ArtworkListResult> => {
  const supabase = getSupabase();
  const page = Math.max(1, Math.floor(filters?.page ?? 1));
  const limit = Math.max(1, Math.min(100, Math.floor(filters?.limit ?? 9)));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('products')
    .select(`
      *,
      subcategories ( title_ar )
    `, { count: 'exact' })
    .eq('artist_id', artistId);

  if (filters?.category) {
    query = query.eq('category_slug', filters.category);
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search.trim().replace(/[%_]/g, '')}%`;
    query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if ((error as any).code === 'PGRST103') {
      return { artworks: [], totalCount: 0, page, limit };
    }
    throw error;
  }

  return {
    artworks: (data || []).map((product) => attachArtworkImageUrls(product)),
    totalCount: count ?? 0,
    page,
    limit,
  };
};
