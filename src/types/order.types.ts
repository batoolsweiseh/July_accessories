export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  artistId?: string | null;
  parentOrderId?: string | null;
  totalPrice: number;
  shippingAddress: string;
  shippingCity: string;
  shippingPhone: string;
  shippingName: string;
  shippingFee: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  artist?: any;
  children?: Order[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  artworkId: string; // backward-compat alias
  price: number;
  quantity: number;
  product?: any;
  artwork?: any; // backward-compat alias
}
