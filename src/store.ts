/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { configureStore, createSlice, PayloadAction, ThunkAction, Action } from '@reduxjs/toolkit';
import { User, Product, CartItem, Order, Coupon, Notification } from './types';
import axios from 'axios';

// --- CURRENCY STATE ---
interface CurrencyState {
  country: string;
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  rates: Record<string, number>;
  loading: boolean;
}

const initialCurrency: CurrencyState = {
  country: 'India',
  currencyCode: 'INR',
  currencySymbol: '₹',
  locale: 'en-IN',
  rates: {
    INR: 1.0,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0094,
    AED: 0.044,
    JPY: 1.88,
    AUD: 0.0185,
    CAD: 0.0165
  },
  loading: false
};

const currencySlice = createSlice({
  name: 'currency',
  initialState: initialCurrency,
  reducers: {
    setCurrencyStart: (state) => {
      state.loading = true;
    },
    setCurrencySuccess: (state, action: PayloadAction<{ country: string; currencyCode: string; currencySymbol: string; locale: string; rates: Record<string, number> }>) => {
      state.country = action.payload.country;
      state.currencyCode = action.payload.currencyCode;
      state.currencySymbol = action.payload.currencySymbol;
      state.locale = action.payload.locale;
      if (action.payload.rates) {
        state.rates = action.payload.rates;
      }
      state.loading = false;
    }
  }
});


// API Axios configuration referencing relative server paths
const API_URL = '/api';

// --- AUTH STATE ---
interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const getInitialUser = (): User | null => {
  try {
    const saved = localStorage.getItem('apex_user');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const initialAuth: AuthState = {
  user: getInitialUser(),
  token: localStorage.getItem('apex_token'),
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuth,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loading = false;
      localStorage.setItem('apex_token', action.payload.token);
      localStorage.setItem('apex_userId', action.payload.user.id);
      localStorage.setItem('apex_user', JSON.stringify(action.payload.user));
    },
    authFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('apex_token');
      localStorage.removeItem('apex_userId');
      localStorage.removeItem('apex_user');
    },
    updateUserSuccess: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('apex_user', JSON.stringify(action.payload));
    }
  }
});

// --- PRODUCTS STATE ---
interface ProductsState {
  items: Product[];
  categories: any[];
  currentProduct: (Product & { reviews: any[] }) | null;
  loading: boolean;
  error: string | null;
}

const initialProducts: ProductsState = {
  items: [],
  categories: [],
  currentProduct: null,
  loading: false,
  error: null
};

const productsSlice = createSlice({
  name: 'products',
  initialState: initialProducts,
  reducers: {
    startFetch: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchProductsSuccess: (state, action: PayloadAction<Product[]>) => {
      state.items = action.payload;
      state.loading = false;
    },
    fetchCategoriesSuccess: (state, action: PayloadAction<any[]>) => {
      state.categories = action.payload;
    },
    setCurrentProductSuccess: (state, action: PayloadAction<any>) => {
      state.currentProduct = action.payload;
      state.loading = false;
    },
    fetchFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    }
  }
});

// --- CART STATE ---
interface CartState {
  items: CartItem[];
  coupon: Coupon | null;
  shippingCharge: number;
  loading: boolean;
  error: string | null;
  lastAddedItem: { product: any; quantity: number } | null;
}

const initialCart: CartState = {
  items: [],
  coupon: null,
  shippingCharge: 15.00,
  loading: false,
  error: null,
  lastAddedItem: null
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: initialCart,
  reducers: {
    cartStart: (state) => {
      state.loading = true;
    },
    fetchCartSuccess: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      state.loading = false;
    },
    setLastAddedItem: (state, action: PayloadAction<{ product: any; quantity: number } | null>) => {
      state.lastAddedItem = action.payload;
    },
    applyCouponSuccess: (state, action: PayloadAction<Coupon | null>) => {
      state.coupon = action.payload;
      // If code is FREESHIP, waive shipping charge
      if (action.payload?.code === 'FREESHIP') {
        state.shippingCharge = 0;
      } else {
        state.shippingCharge = 15.00;
      }
    },
    cartFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearCartLocal: (state) => {
      state.items = [];
      state.coupon = null;
      state.shippingCharge = 15.00;
    }
  }
});

// --- WISHLIST STATE ---
interface WishlistState {
  items: Product[];
  loading: boolean;
}

const initialWishlist: WishlistState = {
  items: [],
  loading: false
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: initialWishlist,
  reducers: {
    startWishlist: (state) => {
      state.loading = true;
    },
    fetchWishlistSuccess: (state, action: PayloadAction<Product[]>) => {
      state.items = action.payload;
      state.loading = false;
    }
  }
});

// --- NOTIFICATIONS & SYSTEM ANNOUNCEMENTS ---
interface NotificationState {
  items: Notification[];
}

const initialNotifications: NotificationState = {
  items: [
    { id: 'not-1', title: 'Welcome to Apex Store!', message: 'Use checkout coupon code WELCOME10 for an absolute 10% reduction tier!', type: 'OFFER', createdAt: new Date().toISOString(), isRead: false },
    { id: 'not-2', title: 'SoundMax Wireless Drop', message: 'The high-fidelity ANC Wireless headphones are now active in electronics.', type: 'PRICE_DROP', createdAt: new Date().toISOString(), isRead: false }
  ]
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: initialNotifications,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'createdAt' | 'isRead'>>) => {
      state.items.unshift({
        id: 'not-' + Date.now(),
        createdAt: new Date().toISOString(),
        isRead: false,
        ...action.payload
      });
    },
    markAllAsRead: (state) => {
      state.items.forEach(n => n.isRead = true);
    },
    clearNotification: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(n => n.id !== action.payload);
    }
  }
});

// ==========================================
// REDUX EXPORTS & HELPERS
// ==========================================
export const { authStart, authSuccess, authFailure, logout, updateUserSuccess } = authSlice.actions;
export const { startFetch, fetchProductsSuccess, fetchCategoriesSuccess, setCurrentProductSuccess, fetchFailure } = productsSlice.actions;
export const { cartStart, fetchCartSuccess, setLastAddedItem, applyCouponSuccess, cartFailure, clearCartLocal } = cartSlice.actions;
export const { startWishlist, fetchWishlistSuccess } = wishlistSlice.actions;
export const { addNotification, markAllAsRead, clearNotification } = notificationSlice.actions;
export const { setCurrencyStart, setCurrencySuccess } = currencySlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    products: productsSlice.reducer,
    cart: cartSlice.reducer,
    wishlist: wishlistSlice.reducer,
    notifications: notificationSlice.reducer,
    currency: currencySlice.reducer
  }
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Async Thunk Actions
export const fetchProducts = (query: { category?: string; search?: string; sortBy?: string } = {}): AppThunk => async (dispatch) => {
  try {
    dispatch(startFetch());
    const res = await axios.get(`${API_URL}/products`, { params: query });
    dispatch(fetchProductsSuccess(res.data));
  } catch (err: any) {
    dispatch(fetchFailure(err.response?.data?.error || 'Failed to fetch listings'));
  }
};

export const fetchCategories = (): AppThunk => async (dispatch) => {
  try {
    const res = await axios.get(`${API_URL}/categories`);
    dispatch(fetchCategoriesSuccess(res.data));
  } catch (err) {
    console.error('Error fetching categories:', err);
  }
};

export const loadProductDetails = (id: string): AppThunk => async (dispatch) => {
  try {
    dispatch(startFetch());
    const res = await axios.get(`${API_URL}/products/${id}`);
    dispatch(setCurrentProductSuccess(res.data));
  } catch (err: any) {
    dispatch(fetchFailure(err.response?.data?.error || 'Failed to load details'));
  }
};

export const fetchCart = (userId: string): AppThunk => async (dispatch) => {
  try {
    dispatch(cartStart());
    const res = await axios.get(`${API_URL}/cart/${userId}`);
    dispatch(fetchCartSuccess(res.data));
  } catch (err: any) {
    dispatch(cartFailure(err.response?.data?.error || 'Could not fetch cart'));
  }
};

export const addToCart = (userId: string, productId: string, qty: number): AppThunk => async (dispatch, getState) => {
  try {
    dispatch(cartStart());
    const res = await axios.post(`${API_URL}/cart/${userId}`, { productId, quantity: qty });
    dispatch(fetchCartSuccess(res.data));
    try {
      const state = getState();
      const product = state.products.items.find((p: any) => p.id === productId) || state.products.currentProduct;
      if (product) {
        dispatch(setLastAddedItem({ product, quantity: qty }));
      }
    } catch (e) {
      console.error('Error finding added product for popup:', e);
    }
    dispatch(addNotification({
      title: 'Item added to Cart',
      message: 'Product successfully staged in your shopping basket.',
      type: 'ORDER'
    }));
  } catch (err: any) {
    dispatch(cartFailure(err.response?.data?.error || 'Could not insert item'));
  }
};

export const updateCartQty = (userId: string, itemId: string, qty: number): AppThunk => async (dispatch) => {
  try {
    const res = await axios.put(`${API_URL}/cart/${userId}/${itemId}`, { quantity: qty });
    dispatch(fetchCartSuccess(res.data));
  } catch (err: any) {
    dispatch(cartFailure(err.response?.data?.error || 'Could not update item'));
  }
};

export const removeFromCart = (userId: string, itemId: string): AppThunk => async (dispatch) => {
  try {
    const res = await axios.delete(`${API_URL}/cart/${userId}/${itemId}`);
    dispatch(fetchCartSuccess(res.data));
  } catch (err: any) {
    dispatch(cartFailure(err.response?.data?.error || 'Could not remove item'));
  }
};

export const fetchWishlist = (userId: string): AppThunk => async (dispatch) => {
  try {
    dispatch(startWishlist());
    const res = await axios.get(`${API_URL}/wishlist/${userId}`);
    dispatch(fetchWishlistSuccess(res.data));
  } catch (err) {
    console.error('Error loading wishlist:', err);
  }
};

export const toggleWishlistItem = (userId: string, productId: string): AppThunk => async (dispatch) => {
  try {
    const res = await axios.post(`${API_URL}/wishlist/${userId}`, { productId });
    dispatch(fetchWishlistSuccess(res.data));
  } catch (err) {
    console.error('Wishlist error:', err);
  }
};

export const fetchCurrencySystem = (userId?: string): AppThunk => async (dispatch) => {
  try {
    dispatch(setCurrencyStart());
    const res = await axios.get(`${API_URL}/currency/current`, { params: userId ? { userId } : {} });
    dispatch(setCurrencySuccess({
      country: res.data.country,
      currencyCode: res.data.currencyCode,
      currencySymbol: res.data.currencySymbol,
      locale: res.data.locale,
      rates: res.data.rates
    }));
  } catch (err) {
    console.error('Failed to load currency system:', err);
  }
};

export const updateCurrencySelection = (userId: string | null, currencyCode: string): AppThunk => async (dispatch) => {
  try {
    dispatch(setCurrencyStart());
    const CURRENCY_SYMBOLS: Record<string, string> = {
      INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', JPY: '¥', AUD: 'A$', CAD: 'C$'
    };
    const CURRENCY_LOCALES: Record<string, string> = {
      INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', AED: 'ar-AE', JPY: 'ja-JP', AUD: 'en-AU', CAD: 'en-CA'
    };
    const CURRENCY_COUNTRIES: Record<string, string> = {
      INR: 'India', USD: 'United States', EUR: 'Germany', GBP: 'United Kingdom', AED: 'United Arab Emirates', JPY: 'Japan', AUD: 'Australia', CAD: 'Canada'
    };

    const payload = {
      userId: userId || undefined,
      country: CURRENCY_COUNTRIES[currencyCode],
      currencyCode,
      currencySymbol: CURRENCY_SYMBOLS[currencyCode],
      preferredLocale: CURRENCY_LOCALES[currencyCode]
    };

    if (userId) {
      await axios.post(`${API_URL}/user/currency`, payload);
    }
    
    // Fetch updated current system to reflect rates and overrides
    const res = await axios.get(`${API_URL}/currency/current`, { params: userId ? { userId } : {} });
    dispatch(setCurrencySuccess({
      country: payload.country,
      currencyCode: payload.currencyCode,
      currencySymbol: payload.currencySymbol,
      locale: payload.preferredLocale,
      rates: res.data.rates
    }));
    
    dispatch(addNotification({
      title: 'Currency Switch Success',
      message: `Your view was updated successfully to ${currencyCode}`,
      type: 'OFFER'
    }));
  } catch (err) {
    console.error('Could not switch dynamic user currency:', err);
  }
};

export const refreshUserProfile = (userId: string): AppThunk => async (dispatch) => {
  try {
    const res = await axios.get(`${API_URL}/auth/profile/${userId}`);
    if (res.data && res.data.user) {
      dispatch(updateUserSuccess(res.data.user));
    }
  } catch (err: any) {
    console.info('Stale session or user profile not found on sync:', err.message || err);
    if (err.response?.status === 404) {
      dispatch(logout());
    }
  }
};

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
