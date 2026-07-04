/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SELLER';
  avatarUrl?: string;
  createdAt: string;
  isVerified: boolean;
  // Seller exclusive fields
  storeName?: string;
  storeDescription?: string;
  sellerStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  gstin?: string;
  // Nationality and currency fields
  country?: string;
  currencyCode?: string;
  currencySymbol?: string;
  preferredLocale?: string;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  streetNo?: string;
  streetName?: string;
  buildingName?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  category: string;
  brand: string;
  images: string[];
  stock: number;
  rating: number;
  reviewsCount: number;
  specifications: Record<string, string>;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  sellerId?: string;
  sellerName?: string;
  isApproved?: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount: number;
  shippingCharge: number;
  taxAmount: number;
  finalAmount: number;
  address: Address;
  paymentMethod: 'STRIPE' | 'RAZORPAY' | 'COD';
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  status: 'PENDING' | 'PACKING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | string;
  createdAt: string;
  couponCode?: string;
  // Multi-currency tracking
  baseAmountINR?: number;
  displayCurrency?: string;
  displayAmount?: number;
  exchangeRate?: number;
  country?: string;
  
  // Advanced Role-Based Logistics Fields
  order_status?: string;
  seller_status?: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'PACKED';
  admin_status?: 'PACKED' | 'TRANSPORT_ASSIGNED' | 'PICKED_UP' | 'LOGISTICS_CENTER' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  tracking_id?: string;
  courier_name?: string;
  vehicle_details?: string;
  delivery_agent?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  transport_assigned_at?: string;
  picked_up_at?: string;
  logistics_center_at?: string;
  in_transit_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  cancel_reason?: string;
  cancelled_by?: string;
  history?: Array<{
    id: string;
    changedBy: string;
    changerName: string;
    role: string;
    prevStatus: string;
    newStatus: string;
    timestamp: string;
    notes?: string;
    ip?: string;
  }>;
}

export interface Coupon {
  code: string;
  discountPercentage: number;
  expiryDate: string;
  minPurchaseAmount: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'ORDER' | 'OFFER' | 'PRICE_DROP' | 'AUTH' | 'ADMIN';
  createdAt: string;
  isRead: boolean;
}

export interface Question {
  id: string;
  productId: string;
  productName: string;
  questionText: string;
  askedBy: string;
  answerText?: string;
  answeredBy?: string;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  transactions: {
    id: string;
    amount: number;
    type: 'EARNING' | 'WITHDRAW' | 'GST_TAX' | 'DELIVERY';
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    createdAt: string;
    notes?: string;
  }[];
  withdrawRequests: {
    id: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    bankDetails: string;
    createdAt: string;
  }[];
}
