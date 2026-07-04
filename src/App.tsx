/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState, fetchCart, fetchWishlist, clearNotification, fetchCurrencySystem, setLastAddedItem, refreshUserProfile } from './store';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Sparkles, Bell, Check, ArrowRight } from 'lucide-react';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';

// Pages
import LandingPage from './pages/LandingPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import UserProfilePage from './pages/UserProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import AuthPages from './pages/AuthPages';
import SellerDashboard from './pages/SellerDashboard';
import OrdersHistoryPage from './pages/OrdersHistoryPage';
import AdminLoginPortal from './pages/AdminLoginPortal';

// Route Guards to isolate Buyer, Seller and Admin roles
function SellerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useSelector((state: RootState) => state.auth);
  if (!user || user.role !== 'SELLER') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useSelector((state: RootState) => state.auth);
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

function CustomerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useSelector((state: RootState) => state.auth);
  if (user && user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  if (user && user.role === 'SELLER') {
    return <Navigate to="/seller" replace />;
  }
  return <>{children}</>;
}

// Synchronizer helper to load cart / wishlist on session boot
function AppBootstrap() {
  const dispatch = useDispatch() as any;
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const savedUserId = localStorage.getItem('apex_userId');
    if (savedUserId) {
      dispatch(refreshUserProfile(savedUserId));
    }
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCurrencySystem(user?.id));
    if (user) {
      dispatch(fetchCart(user.id));
      dispatch(fetchWishlist(user.id));
    }
  }, [user, dispatch]);

  return null;
}

// Global active toast list manager
function LiveNotificationToasts() {
  const dispatch = useDispatch();
  const alerts = useSelector((state: RootState) => state.notifications.items);

  return (
    <div className="fixed top-24 right-6 z-50 w-80 space-y-3 font-sans">
      <AnimatePresence>
        {alerts.map((al) => (
          <motion.div
            key={al.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="p-4 bg-white border border-gray-100 rounded-2xl shadow-2xl flex gap-3 items-start border-l-4 border-l-indigo-600"
          >
            <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 mt-0.5">
              <Sparkles className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-gray-900 truncate">{al.title}</h4>
              <p className="text-[11px] text-gray-550 leading-relaxed text-gray-500 mt-0.5">{al.message}</p>
            </div>
            <button
              onClick={() => dispatch(clearNotification(al.id))}
              className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Added to Cart popup modal
function AddedToCartPopup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const lastAdded = useSelector((state: RootState) => state.cart.lastAddedItem);

  return (
    <AnimatePresence>
      {lastAdded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-gray-100 p-6 overflow-hidden text-center"
          >
            {/* Glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Check icon */}
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5 border border-emerald-100">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>

            <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Item Added to Cart!</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Product successfully added to your shopping cart.</p>

            {/* Product details */}
            <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-3 flex gap-3 items-center my-4 text-left">
              <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl overflow-hidden p-1 shrink-0 flex items-center justify-center">
                <img 
                  src={lastAdded.product.imageUrl} 
                  alt={lastAdded.product.title} 
                  className="w-full h-full object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[11px] font-bold text-gray-800 line-clamp-1 leading-snug">{lastAdded.product.title}</h4>
                <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                  <span className="text-gray-400">Qty: <strong className="text-gray-700">{lastAdded.quantity}</strong></span>
                  <span className="text-gray-300">•</span>
                  <span className="text-indigo-650 font-bold text-indigo-600">
                    {lastAdded.product.currencySymbol || '₹'}{((lastAdded.product.discountPrice || lastAdded.product.price) * lastAdded.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Button Actions */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => dispatch(setLastAddedItem(null))}
                className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-[10.5px] font-bold text-gray-600 transition-colors"
              >
                Keep Shopping
              </button>
              <button
                onClick={() => {
                  dispatch(setLastAddedItem(null));
                  navigate('/cart');
                }}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[10.5px] font-bold text-white shadow-md shadow-indigo-600/10 transition-all flex items-center justify-center gap-1"
              >
                View Cart
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Scroll to top helper on route swap
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50/20">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<CustomerRoute><LandingPage /></CustomerRoute>} />
          <Route path="/product/:id" element={<CustomerRoute><ProductDetailsPage /></CustomerRoute>} />
          <Route path="/cart" element={<CustomerRoute><CartPage /></CustomerRoute>} />
          <Route path="/checkout" element={<CustomerRoute><CheckoutPage /></CustomerRoute>} />
          <Route path="/profile" element={<UserProfilePage />} />
          <Route path="/admin/login" element={<AdminLoginPortal />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/auth" element={<AuthPages />} />
          <Route path="/seller" element={<SellerRoute><SellerDashboard /></SellerRoute>} />
          <Route path="/orders" element={
            <CustomerRoute>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <OrdersHistoryPage />
                </div>
              </div>
            </CustomerRoute>
          } />
        </Routes>
      </div>
      <Footer />
      <Chatbot />
      <AppBootstrap />
      <ScrollToTop />
      <AddedToCartPopup />
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </Provider>
  );
}
