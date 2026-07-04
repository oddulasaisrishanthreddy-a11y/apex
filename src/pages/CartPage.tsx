/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, updateCartQty, removeFromCart, applyCouponSuccess } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, Sparkles, Check, X, ShieldAlert } from 'lucide-react';
import { useCurrency } from '../utils';
import axios from 'axios';

export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const { formatPrice } = useCurrency();

  const { items: cartItems, coupon, shippingCharge } = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.auth);

  const [couponInput, setCouponInput] = useState(coupon ? coupon.code : '');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState(coupon ? 'Coupon Applied' : '');

  // Math totals calculation
  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  
  // Tax computed at standard 8%
  const tax = Number((subtotal * 0.08).toFixed(2));
  
  // Discount percentage extraction
  const discountVal = coupon ? Number((subtotal * (coupon.discountPercentage / 100)).toFixed(2)) : 0;
  
  // Shipping charge wavier boundary
  const currentShipping = subtotal > 2000 || coupon?.code === 'FREESHIP' ? 0 : shippingCharge;
  const finalTotal = Number((subtotal - discountVal + tax + currentShipping).toFixed(2));

  const handleUpdateQty = (itemId: string, currentQty: number, change: number) => {
    if (!user) return;
    const targetQty = currentQty + change;
    if (targetQty < 1) return;
    dispatch(updateCartQty(user.id, itemId, targetQty));
  };

  const handleRemoveItem = (itemId: string) => {
    if (!user) return;
    dispatch(removeFromCart(user.id, itemId));
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');

    if (!couponInput.trim()) return;

    try {
      const res = await axios.post('/api/coupons/validate', {
        code: couponInput,
        amount: subtotal
      });

      dispatch(applyCouponSuccess(res.data));
      setCouponSuccess(`Success! ${res.data.discountPercentage}% discount applied.`);
    } catch (err: any) {
      setCouponError(err.response?.data?.error || 'Invalid or expired coupon code.');
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(applyCouponSuccess(null));
    setCouponInput('');
    setCouponSuccess('');
    setCouponError('');
  };

  const proceedToCheckout = () => {
    navigate('/checkout');
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center font-sans">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mt-6">Shopping Cart Locked</h2>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed max-w-sm mx-auto">
          Please authenticate your session to add drops or checkout with premium goods.
        </p>
        <Link
          to="/auth"
          className="inline-block mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-colors-indigo-500 hover:bg-indigo-500 rounded-xl text-white font-bold text-xs"
        >
          Sign In / Create Account
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 font-sans bg-gray-50/20">
      <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 mb-8 flex items-center gap-2">
        <ShoppingBag className="w-8 h-8 text-indigo-600" />
        <span>Shopping Checkout Basket</span>
      </h1>

      {cartItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center shadow-sm">
          <p className="text-gray-400 text-sm font-medium">Your basket is currently empty.</p>
          <Link
            to="/"
            className="inline-block mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100"
          >
            Browse Premium Catalogs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cart Items list */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col sm:flex-row items-center gap-5 transition-all hover:border-gray-200"
              >
                {/* Thumb */}
                <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                  <img src={item.product.images?.[0] || undefined} alt="" className="w-full h-full object-cover" />
                </div>

                {/* Details */}
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <span className="text-[9px] font-bold uppercase text-indigo-600 font-mono tracking-wide">{item.product.category}</span>
                  <Link to={`/product/${item.product.id}`} className="block">
                    <h3 className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors truncate">{item.product.name}</h3>
                  </Link>
                  <p className="text-xs text-gray-400 mt-1 font-medium">{item.product.brand}</p>
                </div>

                {/* Adjuster */}
                <div className="flex items-center border border-gray-200 rounded-xl px-2 py-1 bg-gray-50/50">
                  <button
                    onClick={() => handleUpdateQty(item.id, item.quantity, -1)}
                    className="w-5 h-5 text-gray-500 hover:text-indigo-600 font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-xs font-mono text-gray-800">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQty(item.id, item.quantity, 1)}
                    className="w-5 h-5 text-gray-500 hover:text-indigo-600 font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Prices */}
                <div className="text-center sm:text-right font-mono">
                  <span className="text-xs text-gray-400">Total:</span>
                  <div className="text-sm font-extrabold text-gray-900">{formatPrice(item.product.price * item.quantity)}</div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-2 hover:bg-rose-50 text-gray-450 hover:text-rose-500 rounded-full transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Pricing totals, Coupons drawer panels */}
          <div className="space-y-6">
            
            {/* Promo coupon Apply Form */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-100 pb-3">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Apply Store Coupons</span>
              </h3>

              {!coupon ? (
                <form onSubmit={handleApplyCoupon} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter Coupon code..."
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 w-full px-3 py-1.5 border border-gray-100 rounded-xl text-xs bg-gray-50 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs rounded-xl transition-all"
                  >
                    Apply
                  </button>
                </form>
              ) : (
                <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between text-xs font-bold text-green-700">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Active: {coupon.code}</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="p-1 hover:bg-green-100 rounded-full text-green-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-rose-500 font-semibold mt-2 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {couponError}
                </p>
              )}

              {couponSuccess && (
                <p className="text-[11px] text-green-600 font-semibold mt-2">{couponSuccess}</p>
              )}

              {/* Display available promo codes */}
              <div className="mt-4 pt-4 border-t border-gray-100/50">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Available Codes</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg text-[9px] font-mono text-indigo-600 font-bold border border-indigo-100 cursor-pointer" onClick={() => setCouponInput('WELCOME10')}>WELCOME10 (10% Reduction)</span>
                  <span className="px-2 py-1 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg text-[9px] font-mono text-indigo-600 font-bold border border-indigo-100 cursor-pointer" onClick={() => setCouponInput('APEX20')}>APEX20 (20% Reduction)</span>
                  <span className="px-2 py-1 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg text-[9px] font-mono text-indigo-600 font-bold border border-indigo-100 cursor-pointer" onClick={() => setCouponInput('FREESHIP')}>FREESHIP (Waiver shipping)</span>
                </div>
              </div>
            </div>

            {/* Pricing Details List */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">
                Checkout Summary
              </h3>

              <div className="py-4 space-y-3 text-xs text-gray-500 font-medium">
                <div className="flex justify-between items-center">
                  <span>Cart Subtotal</span>
                  <span className="font-mono text-gray-900">{formatPrice(subtotal)}</span>
                </div>

                {coupon && (
                  <div className="flex justify-between items-center text-green-600 font-bold">
                    <span>Coupon Reduction ({coupon.discountPercentage}%)</span>
                    <span className="font-mono">-{formatPrice(discountVal)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Standard VAT (8%)</span>
                  <span className="font-mono text-gray-900">{formatPrice(tax)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Insured Transport Freight</span>
                  <span className="font-mono text-gray-900">
                    {currentShipping === 0 ? <span className="text-green-600 font-bold">FREE</span> : formatPrice(currentShipping)}
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-1">
                <div className="flex justify-between items-center text-sm font-extrabold text-gray-900">
                  <span>Final Balance</span>
                  <span className="font-mono text-lg text-indigo-600">{formatPrice(finalTotal)}</span>
                </div>

                {subtotal <= 2000 && !coupon && (
                  <span className="text-[10px] text-gray-450 font-semibold block mt-2 text-center">
                    Add {formatPrice(2000 - subtotal)} more for complimentary Insured Transport!
                  </span>
                )}

                <button
                  onClick={proceedToCheckout}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase"
                >
                  <span>Proceed to Delivery Desk</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
