export interface Cart {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  artworkId: string; // backward-compat alias
  quantity: number;
  product?: any;
  artwork?: any; // backward-compat alias
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartInput {
  productId?: string;
  artworkId?: string; // backward-compat alias
  quantity?: number;
}
