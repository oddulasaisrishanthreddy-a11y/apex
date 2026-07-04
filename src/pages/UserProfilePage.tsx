/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, logout, updateUserSuccess, toggleWishlistItem, addToCart } from '../store';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { User, ShieldCheck, Heart, UserSquare2, Key, HelpCircle, LogOut, Loader2, Star, Eye } from 'lucide-react';
import OrdersHistoryPage from './OrdersHistoryPage';
import axios from 'axios';
import { useCurrency } from '../utils';

const COUNTRIES_LIST = [
  { country: 'India', code: 'INR', symbol: '₹', locale: 'en-IN' },
  { country: 'United States', code: 'USD', symbol: '$', locale: 'en-US' },
  { country: 'Germany', code: 'EUR', symbol: '€', locale: 'de-DE' },
  { country: 'United Kingdom', code: 'GBP', symbol: '£', locale: 'en-GB' },
  { country: 'United Arab Emirates', code: 'AED', symbol: 'د.إ', locale: 'ar-AE' },
  { country: 'Japan', code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  { country: 'Australia', code: 'AUD', symbol: 'A$', locale: 'en-AU' },
  { country: 'Canada', code: 'CAD', symbol: 'C$', locale: 'en-CA' }
];

export default function UserProfilePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatPrice } = useCurrency();

  const { user } = useSelector((state: RootState) => state.auth);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);

  const activeTab = searchParams.get('tab') || 'profile';

  // Forms states
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [avatarBase64, setAvatarBase64] = useState('');

  const [countryInput, setCountryInput] = useState('India');
  const [storeNameInput, setStoreNameInput] = useState('');
  const [storeDescInput, setStoreDescInput] = useState('');
  const [gstinInput, setGstinInput] = useState('');

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setNameInput(user.name);
    setEmailInput(user.email);
    setAvatarBase64(user.avatarUrl || '');
    setCountryInput(user.country || 'India');
    setStoreNameInput(user.storeName || '');
    setStoreDescInput(user.storeDescription || '');
    setGstinInput(user.gstin || '');
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim() || loading) return;

    setLoading(true);
    try {
      const chosenInfo = COUNTRIES_LIST.find(c => c.country === countryInput) || COUNTRIES_LIST[0];

      const res = await axios.put('/api/auth/profile', {
        userId: user?.id,
        name: nameInput,
        email: emailInput,
        avatarUrl: avatarBase64,
        country: countryInput,
        currencyCode: chosenInfo.code,
        currencySymbol: chosenInfo.symbol,
        preferredLocale: chosenInfo.locale,
        storeName: user?.role === 'SELLER' ? storeNameInput : undefined,
        storeDescription: user?.role === 'SELLER' ? storeDescInput : undefined,
        gstin: user?.role === 'SELLER' ? gstinInput : undefined
      });

      dispatch(updateUserSuccess(res.data.user));
      alert('Info updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Profile update error.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPass || !newPass) return;

    try {
      await axios.post('/api/auth/change-password', {
        userId: user?.id,
        currentPassword: currentPass,
        newPassword: newPass
      });

      setPassSuccess('Security credentials compiled successfully!');
      setCurrentPass('');
      setNewPass('');
    } catch (err: any) {
      setPassError(err.response?.data?.error || 'Invalid current password compilation.');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onloadend = () => {
        setAvatarBase64(r.result as string);
      };
      r.readAsDataURL(file);
    }
  };

  const handleRemoveWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (user) dispatch(toggleWishlistItem(user.id, id));
  };

  const setTab = (t: string) => {
    setSearchParams({ tab: t });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 font-sans bg-gray-50/20">
      
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* LEFT COMPONENT: Responsive tab selector sidebar */}
        <div className="w-full md:w-64 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-mono text-base font-black border border-indigo-200 overflow-hidden select-none">
              {avatarBase64 ? (
                <img src={avatarBase64} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">{user?.name}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono mt-0.5">{user?.role} Profile</p>
            </div>
          </div>

          <div className="border-t border-gray-105 border-gray-100 pt-4 space-y-1">
            <button
              onClick={() => setTab('profile')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 shadow-indigo-100' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <UserSquare2 className="w-4 h-4" />
              <span>Personal Profile</span>
            </button>

            <button
              onClick={() => setTab('orders')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Active Orders</span>
            </button>

            <button
              onClick={() => setTab('wishlist')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${activeTab === 'wishlist' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Heart className="w-4 h-4" />
              <span>Wishlisted Drops</span>
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={() => dispatch(logout())}
              className="w-full text-left px-3.5 py-2 text-xs font-semibold rounded-xl text-red-650 text-red-500 hover:bg-red-50 transition-all flex items-center gap-2.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Section</span>
            </button>
          </div>
        </div>

        {/* RIGHT COMPONENT: Active working sub-views */}
        <div className="flex-1">
          
          {/* VIEW A: Profile updates & password safety forms */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* Form 1: General update */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-3">Personal Metadata Details</h3>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  {/* Photo selector */}
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Bio Avatar Image</label>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                        {avatarBase64 ? (
                          <img src={avatarBase64} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserSquare2 className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="file" accept="image/*" id="avatarUpload" className="hidden"
                        onChange={handlePhotoUpload}
                      />
                      <label htmlFor="avatarUpload" className="px-3 py-1.5 border border-gray-150 border-gray-100 hover:bg-gray-50 text-xs font-semibold rounded-lg cursor-pointer transition-colors select-none">
                        Simulate Upload
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Visible Name</label>
                    <input
                      type="text" required placeholder="Full Name" value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full mt-1.5 px-3 py-1.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Verified Email Account</label>
                    <input
                      type="email" required placeholder="User Email" value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full mt-1.5 px-3 py-1.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Country / Base Region</label>
                    <select
                      value={countryInput}
                      onChange={(e) => setCountryInput(e.target.value)}
                      className="w-full mt-1.5 px-3 py-1.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none"
                    >
                      {COUNTRIES_LIST.map((item) => (
                        <option key={item.country} value={item.country}>
                          {item.country} ({item.code} - {item.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  {user?.role === 'SELLER' && (
                    <div className="space-y-4 border-t border-gray-100 pt-4 mt-4">
                      <h4 className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">Seller Shop Credentials</h4>
                      
                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Store Name</label>
                        <input
                          type="text" placeholder="e.g. My Phone Store" value={storeNameInput}
                          onChange={(e) => setStoreNameInput(e.target.value)}
                          className="w-full mt-1.5 px-3 py-1.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Store Description</label>
                        <textarea
                          placeholder="Type storefront info..." value={storeDescInput}
                          onChange={(e) => setStoreDescInput(e.target.value)}
                          className="w-full mt-1.5 px-3 py-1.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none h-16 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">GSTIN Identification</label>
                        <input
                          type="text" placeholder="e.g. 22AAAAA1111A1Z1" value={gstinInput}
                          onChange={(e) => setGstinInput(e.target.value)}
                          className="w-full mt-1.5 px-3 py-1.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 font-bold py-2.5 rounded-xl text-white text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-indigo-150 shadow shadow-md"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Personal Records</span>}
                  </button>
                </form>
              </div>

              {/* Form 2: Password safety */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 h-fit">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-3 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-600 animate-pulse" />
                  <span>Update Safety Password</span>
                </h3>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Current Password</label>
                    <input
                      type="password" required placeholder="••••••••" value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      className="w-full mt-1.5 px-3 py-1.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">New Password Core</label>
                    <input
                      type="password" required placeholder="••••••••" value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="w-full mt-1.5 px-3 py-1.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none font-mono"
                    />
                  </div>

                  {passError && <p className="text-[11px] font-semibold text-rose-500">{passError}</p>}
                  {passSuccess && <p className="text-[11px] font-semibold text-green-600">{passSuccess}</p>}

                  <button
                    type="submit"
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer hover:shadow-lg shadow shadow-sm hover:shadow-gray-200"
                  >
                    Save Alterations
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* VIEW B: Active Orders (Direct mounts orders history) */}
          {activeTab === 'orders' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <OrdersHistoryPage />
            </div>
          )}

          {/* VIEW C: Wishlisted Drops list items */}
          {activeTab === 'wishlist' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-3">Your Bookmarked Items</h3>

              {wishlistItems.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-xs">
                  Your bookmarked portfolio is empty. Add heart selections on homepage grids.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistItems.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* image */}
                        <div className="aspect-square bg-gray-50 overflow-hidden relative">
                          <img src={prod.images?.[0] || undefined} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={(e) => handleRemoveWishlist(prod.id, e)}
                            className="absolute top-3 right-3 p-1 rounded-full bg-white text-rose-500 hover:bg-rose-50 hover:scale-105 transition-all border border-rose-100"
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                        {/* Content */}
                        <div className="p-4">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase font-mono">{prod.category}</span>
                          <h4 className="text-xs font-bold text-gray-900 truncate mt-1">{prod.name}</h4>
                          <div className="flex text-amber-400 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 fill-current ${
                                  i < Math.floor(prod.rating) ? 'text-amber-400' : 'text-gray-100'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-gray-50 flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-gray-900">{formatPrice(prod.price)}</span>
                        <Link
                          to={`/product/${prod.id}`}
                          className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-[11px] font-bold text-white rounded-lg flex items-center gap-1 flex-shrink-0 transition-all font-sans"
                        >
                          <Eye className="w-3.5 h-3.5" /> Specs
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
