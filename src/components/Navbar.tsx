/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, logout, fetchProducts, fetchCategories, markAllAsRead, clearNotification, updateCurrencySelection } from '../store';
import { ShoppingBag, Heart, User, Search, Bell, Menu, X, LogOut, LayoutDashboard, ChevronDown, CheckCheck, Trash2, Truck, ChevronRight, Sparkles, ArrowLeft, Home, ShoppingCart, Package, MapPin, CreditCard, Percent, Phone, HelpCircle, Info, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatRupee } from '../utils';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)', flag: '🇮🇳' },
  { code: 'USD', symbol: '$', label: 'USD ($)', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)', flag: '🇬🇧' },
  { code: 'AED', symbol: 'د.إ', label: 'AED (د.إ)', flag: '🇦🇪' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)', flag: '🇯🇵' },
  { code: 'AUD', symbol: 'A$', label: 'AUD ($)', flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$', label: 'CAD ($)', flag: '🇨🇦' }
];

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const { user } = useSelector((state: RootState) => state.auth);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);
  const categories = useSelector((state: RootState) => state.products.categories);
  const products = useSelector((state: RootState) => state.products.items);
  const notifications = useSelector((state: RootState) => state.notifications.items);
  const currency = useSelector((state: RootState) => state.currency);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShopExpanded, setIsShopExpanded] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [seeAllCategories, setSeeAllCategories] = useState(false);
  const [seeAllPrograms, setSeeAllPrograms] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<{
    title: string;
    items: { label: string; action: () => void }[];
  } | null>(null);

  const suggestionRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Auto suggestions based on products loaded
  const suggestions = searchQuery.trim()
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  useEffect(() => {
    dispatch(fetchCategories());
    // Also fetch initial products so autocomplete and other lookups work globally on any router entry
    dispatch(fetchProducts());
    
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsSidebarOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isSidebarOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      dispatch(fetchProducts({ search: searchQuery }));
      navigate(`/?search=${searchQuery}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (prodId: string) => {
    setSearchQuery('');
    setShowSuggestions(false);
    navigate(`/product/${prodId}`);
  };

  const selectCategory = (categorySlug: string) => {
    dispatch(fetchProducts({ category: categorySlug }));
    setShowCategoryDropdown(false);
    navigate(`/?category=${categorySlug}`);
  };

  const selectSearch = (query: string) => {
    setIsSidebarOpen(false);
    setActiveSubMenu(null);
    setSearchQuery(query);
    dispatch(fetchProducts({ search: query }));
    navigate(`/?search=${encodeURIComponent(query)}`);
  };

  const openSubMenu = (id: string, title: string) => {
    let items: { label: string; action: () => void }[] = [];
    switch (id) {
      case 'echo':
        items = [
          { label: 'Echo Dot & Smart Speakers', action: () => selectSearch('speaker') },
          { label: 'Alexa Smart Home Devices', action: () => selectSearch('smart') },
          { label: 'Compatible Lighting & Plugs', action: () => selectSearch('plug') },
          { label: 'Echo Show Smart Displays', action: () => selectSearch('display') },
          { label: 'All Smart Assistants', action: () => selectCategory('electronics') }
        ];
        break;
      case 'firetv':
        items = [
          { label: 'Fire TV Stick 4K Ultra HD', action: () => selectSearch('4K TV Stick') },
          { label: 'Fire TV Cube Streaming Player', action: () => selectSearch('cube') },
          { label: 'Smart LED Televisions & Displays', action: () => selectCategory('electronics') },
          { label: 'Prime Stream Accessories', action: () => selectSearch('remote') }
        ];
        break;
      case 'kindle':
        items = [
          { label: 'Kindle Paperwhite Edition', action: () => selectSearch('Paperwhite') },
          { label: 'Kindle Oasis Premium E-Reader', action: () => selectSearch('Kindle Oasis') },
          { label: 'Kindle Unlimited eBooks Shelf', action: () => selectCategory('books') },
          { label: 'E-Reader Magnetic Covers & Sleeves', action: () => selectSearch('Kindle cover') }
        ];
        break;
      case 'audible':
        items = [
          { label: 'Bestselling Audiobooks Channel', action: () => selectCategory('books') },
          { label: 'New Release Audiobooks', action: () => selectSearch('Atomic Habits') },
          { label: 'Audible Membership Plans', action: () => { 
              if (user) {
                alert('⭐ Audible Membership is active! Complementary 30-day bonus credit applied.'); 
              } else {
                alert('Please sign in to manage your Audible membership plans.');
                navigate('/auth');
              }
              setIsSidebarOpen(false); 
            } 
          }
        ];
        break;
      case 'primevideo':
        items = [
          { label: 'Included with Prime Catalogue', action: () => { navigate('/?deals=true'); setIsSidebarOpen(false); } },
          { label: 'Rent or Buy Blockbuster Movies', action: () => alert('Launching Apex Premium video rental screen...') },
          { label: 'Prime Video Kids Channel', action: () => alert('Switching to child-safe family entertainment profiles...') }
        ];
        break;
      case 'music':
        items = [
          { label: 'Prime Music Curated Channels', action: () => alert('Connecting to your custom Prime playlist...') },
          { label: 'Apex Music Unlimited Account', action: () => alert('Enjoying high bit-rate Dolby Atmos streaming.') },
          { label: 'Premium Noise-Cancelling Headphones', action: () => selectSearch('Sony WH') }
        ];
        break;
      case 'recharge':
        items = [
          { label: 'Redeem Gift Cards & Vouchers', action: () => { 
              if (user) {
                alert('Enter your coupon key under Account Settings to redeem credit.'); 
                navigate('/profile'); 
              } else {
                alert('Please sign in to redeem gift cards & vouchers.');
                navigate('/auth');
              }
              setIsSidebarOpen(false); 
            } 
          },
          { label: 'Check Balance & Transaction Logs', action: () => { 
              if (user) {
                alert('Your active sandbox balance: ₹1,500.00 credits'); 
              } else {
                alert('Please sign in to check your wallet balance & transaction logs.');
                navigate('/auth');
              }
              setIsSidebarOpen(false); 
            } 
          },
          { label: 'Super-Fast Mobile Bill Recharge', action: () => alert('Fast mobile carrier top-up initialized!') }
        ];
        break;
      case 'mobiles_computers':
        items = [
          { label: 'All Smart Phones', action: () => selectCategory('mobiles') },
          { label: 'Laptops & Workstations', action: () => selectSearch('Macbook') },
          { label: 'Smart Watches & Activity Gear', action: () => selectSearch('Garmin') },
          { label: 'Cables, Adapters & Accessories', action: () => selectSearch('charger') }
        ];
        break;
      case 'tv_electronics':
        items = [
          { label: 'High-Res Television Units', action: () => selectSearch('TV') },
          { label: 'Studio Audio Speaker Systems', action: () => selectSearch('Sony WH') },
          { label: 'Home Smart Kitchen Systems', action: () => selectSearch('Dyson') },
          { label: 'Browse Electronics Department', action: () => selectCategory('electronics') }
        ];
        break;
      case 'mens_fashion':
        items = [
          { label: 'Automatics & Luxury Watches', action: () => selectSearch('Seiko') },
          { label: 'Polarized Protection Sunglasses', action: () => selectSearch('Ray-Ban') },
          { label: 'Men\'s Formal & Business Wear', action: () => selectCategory('fashion') }
        ];
        break;
      case 'womens_fashion':
        items = [
          { label: 'Gold Plated & Swarovski Crystals', action: () => selectSearch('crystal') },
          { label: 'Premium Skincare & Hydration', action: () => selectSearch('Laneige') },
          { label: 'Designer Bags & Luxury Apparel', action: () => selectCategory('fashion') }
        ];
        break;
      case 'books':
        items = [
          { label: 'Atomic Habits paperback', action: () => selectSearch('Atomic Habits') },
          { label: 'Pearson Code manuals', action: () => selectSearch('Pearson') },
          { label: 'Browse entire Books section', action: () => selectCategory('books') }
        ];
        break;
      case 'home':
        items = [
          { label: 'Dyson stick vacuums', action: () => selectSearch('Dyson') },
          { label: 'Philips XL Air fryers', action: () => selectSearch('Philips') },
          { label: 'Browse Home & Kitchen goods', action: () => selectCategory('home') }
        ];
        break;
      case 'grocery':
        items = [
          { label: 'Blue Tokai dark roasts', action: () => selectSearch('Blue Tokai') },
          { label: 'Vahdam leaf powders', action: () => selectSearch('Vahdam') },
          { label: 'Browse Gourmet Grocery', action: () => selectCategory('grocery') }
        ];
        break;
      case 'beauty':
        items = [
          { label: 'CeraVe Ceramide cleansers', action: () => selectSearch('CeraVe') },
          { label: 'Laneige Berry sleeping masks', action: () => selectSearch('Laneige') },
          { label: 'Browse Beauty & Cosmetics', action: () => selectCategory('beauty') }
        ];
        break;
      case 'sports':
        items = [
          { label: 'Garmin Sapphire GPS watch', action: () => selectSearch('Garmin') },
          { label: 'Theragun PRO deep massager', action: () => selectSearch('Theragun') },
          { label: 'Browse Sports & Outdoors', action: () => selectCategory('sports') }
        ];
        break;
      case 'furniture':
        items = [
          { label: 'Herman Miller Aeron chairs', action: () => selectSearch('Herman Miller') },
          { label: 'Motorized Bamboo standing desks', action: () => selectSearch('desk') },
          { label: 'Browse Elite Furniture', action: () => selectCategory('furniture') }
        ];
        break;
      case 'toys':
        items = [
          { label: 'LEGO Creator Taj Mahal model', action: () => selectSearch('LEGO') },
          { label: 'Settlers of Catan Boardgame', action: () => selectSearch('Catan') },
          { label: 'Browse Toys & Family Games', action: () => selectCategory('toys') }
        ];
        break;
      case 'automotive':
        items = [
          { label: '70mai smart dash cameras', action: () => selectSearch('70mai') },
          { label: 'NOCO Lithium heavy starters', action: () => selectSearch('NOCO') },
          { label: 'Browse Automotive supplies', action: () => selectCategory('automotive') }
        ];
        break;
    }
    setActiveSubMenu({ title, items });
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const getCatDetails = (slug: string) => {
    switch(slug) {
      case 'electronics': return 'M3 Macbook Pros, Sony WH Studio ANC';
      case 'mobiles': return 'iPhone 15 Titanium, Galaxy S24 Ultra Zoom';
      case 'fashion': return 'Seiko 5 Automatics, Ray-Ban polarized glasses';
      case 'books': return 'Atomic Habits paperback, Pearson Code manuals';
      case 'home': return 'Dyson absolute stick vacuums, Philips XL fryers';
      case 'grocery': return 'Blue Tokai dark roasts, Vahdam leaf powders';
      case 'beauty': return 'CeraVe Ceramide cleansers, Laneige Berry masks';
      case 'sports': return 'Garmin Sapphire sports, Theragun PRO massage';
      case 'furniture': return 'Herman Miller Aeron, Motorized Bamboo desks';
      case 'toys': return 'LEGO Creator Taj Mahal, Settlers of Catan';
      case 'automotive': return '70mai smart dash cameras, NOCO Lithium starters';
      default: return 'Handpicked official brand items';
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 border-b border-gray-100 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-mono text-lg font-bold shadow-md shadow-indigo-200">
                A
              </span>
              <span>Apex <span className="font-light text-gray-500">Store</span></span>
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          {user?.role !== 'SELLER' && user?.role !== 'ADMIN' && (
            <div className="hidden md:flex flex-1 max-w-lg mx-8 relative" ref={suggestionRef}>
              <form onSubmit={handleSearchSubmit} className="w-full relative">
                <input
                  type="text"
                  placeholder="Search premium products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
              </form>

              {/* Suggestions list */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-12 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-gray-50 animate-in fade-in duration-200">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSuggestionClick(item.id)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors text-sm"
                    >
                      <img src={item.images?.[0] || undefined} alt="" className="w-8 h-8 object-cover rounded-lg border border-gray-100" />
                      <div>
                        <div className="font-medium text-gray-800">{item.name}</div>
                        <div className="text-xs text-indigo-650 font-mono">{formatRupee(item.price)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Desktop Right navigation buttons */}
          <div className="hidden md:flex items-center space-x-6 text-gray-700">
            {user?.role !== 'SELLER' && user?.role !== 'ADMIN' && (
              <>
                {/* Categories Drawer Trigger */}
                <div className="relative" ref={categoryMenuRef}>
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="flex items-center gap-1.5 text-sm font-medium hover:text-indigo-600 transition-colors"
                  >
                    Categories
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>
                  {showCategoryDropdown && (
                    <div className="absolute top-10 left-[-100px] w-[560px] bg-white border border-gray-150 rounded-2xl shadow-2xl z-50 overflow-hidden p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3 px-1 select-none">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">
                          Apex Curated Departments
                        </span>
                        <button
                          onClick={() => selectCategory('all')}
                          className="text-[10px] font-bold text-indigo-650 hover:text-indigo-700 transition-colors cursor-pointer"
                        >
                          Browse Entire Catalog →
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => selectCategory(cat.slug)}
                            className="text-left p-2 rounded-xl hover:bg-indigo-50/40 group/cat transition-all cursor-pointer border border-transparent hover:border-indigo-150/35"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-800 group-hover/cat:text-indigo-600 transition-colors capitalize">
                                {cat.name}
                              </span>
                              <span className="text-[8px] bg-gray-100 group-hover/cat:bg-indigo-100 text-gray-400 group-hover/cat:text-indigo-700 font-bold px-1.5 py-0.25 rounded font-mono">
                                GO
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-450 group-hover/cat:text-gray-600 line-clamp-1 mt-0.5 font-normal">
                              {cat.description || 'Premium handpicked catalog'}
                            </p>
                            <p className="text-[9px] text-indigo-400 font-medium truncate mt-1">
                              ✨ {getCatDetails(cat.slug)}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Link to="/" className="text-sm font-medium hover:text-indigo-600 transition-colors">Home</Link>
                
                <Link to="/orders" className="text-sm font-medium hover:text-indigo-600 transition-colors flex items-center gap-1.5 bg-indigo-50/50 px-3 py-1 rounded-full border border-indigo-100/30">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  <span>Track Orders</span>
                </Link>
                
                {/* Wishlist Link */}
                <Link to="/profile?tab=wishlist" className="relative p-1.5 hover:bg-gray-50 rounded-full transition-colors font-sans">
                  <Heart className="h-5 w-5 hover:text-red-500 transition-colors" />
                  {wishlistItems.length > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none animate-bounce">
                      {wishlistItems.length}
                    </span>
                  )}
                </Link>

                {/* Shopping Cart Link */}
                <Link to="/cart" className="relative p-1.5 hover:bg-gray-50 rounded-full transition-colors font-sans">
                  <ShoppingBag className="h-5 w-5 hover:text-indigo-600" />
                  {cartItems.length > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center leading-none animate-pulse">
                      {cartItems.reduce((acc, current) => acc + current.quantity, 0)}
                    </span>
                  )}
                </Link>
              </>
            )}



            {/* Alerts & Notifications */}
            {user?.role !== 'SELLER' && user?.role !== 'ADMIN' && (
              <button
                onClick={() => setShowNotificationDrawer(true)}
                className="relative p-1.5 hover:bg-gray-50 rounded-full transition-all cursor-pointer font-sans"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                )}
              </button>
            )}

            {/* User Profile / Access Options */}
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 pr-2 border-r border-gray-100 hover:text-indigo-600 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors flex items-center justify-center overflow-hidden border border-indigo-200">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium max-w-[100px] truncate">{user.name}</span>
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className="p-1.5 hover:bg-purple-50 text-purple-700 hover:text-purple-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin
                  </Link>
                )}
                {user.role === 'SELLER' && (
                  <Link
                    to="/seller"
                    className="p-1.5 hover:bg-indigo-50 text-indigo-705 text-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Seller Console
                  </Link>
                )}
                <button
                  onClick={() => dispatch(logout())}
                  className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-1 py-1.5 px-4 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all font-sans shadow-md shadow-gray-200"
              >
                <User className="h-4.5 w-4.5" />
                Sign In
              </Link>
            )}
          </div>

          {/* Hamburger Menu - Mobile */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setShowNotificationDrawer(true)}
              className="relative p-1.5 hover:bg-gray-50 rounded-full transition-colors text-gray-700"
            >
              <Bell className="h-5 w-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500"></span>
              )}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 hover:bg-gray-50 rounded-full text-gray-700"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Sub-Navbar Horizontal Strip formatted beautifully in Apex themes */}
      {user?.role !== 'SELLER' && user?.role !== 'ADMIN' && (
        <div className="bg-gray-900 text-gray-200 text-xs py-2 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center gap-2.5 sm:gap-4 select-none">
              {/* All Sidebar Trigger Button */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center gap-1.5 font-bold hover:text-white transition-all py-1 px-2.5 rounded-lg hover:bg-white/10 active:scale-95"
              >
                <Menu className="w-3.5 h-3.5 text-indigo-400" />
                <span>All Menu</span>
              </button>

              <button
                onClick={() => { dispatch(fetchProducts({ category: 'grocery' })); navigate('/?category=grocery'); }}
                className="hover:text-white hover:bg-white/5 py-1 px-2.5 rounded-lg transition-colors font-medium text-gray-300 animate-in"
              >
                Fresh Pantry
              </button>
              <button
                onClick={() => { dispatch(fetchProducts({ category: 'mobiles' })); navigate('/?category=mobiles'); }}
                className="hover:text-white hover:bg-white/5 py-1 px-2.5 rounded-lg transition-colors font-medium text-gray-300"
              >
                Smart Mobiles & Tech
              </button>
              <button
                onClick={() => navigate('/?bestsellers=true')}
                className="hover:text-white hover:bg-white/5 py-1 px-2.5 rounded-lg transition-colors font-medium text-gray-300"
              >
                Apex Bestsellers
              </button>
              <button
                onClick={() => navigate('/?deals=true')}
                className="hover:text-white hover:bg-white/5 py-1 px-2.5 rounded-lg transition-colors font-bold text-rose-400 hover:text-rose-350"
              >
                Today's Deals
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-apex-chatbot'));
                }}
                className="hover:text-white hover:bg-white/5 py-1 px-2.5 rounded-lg transition-all font-medium flex items-center gap-1 text-indigo-300"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Support AI Desk
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  alert("⭐ Apex Elite Prime Membership Status: Active!\nEnjoy unlimited complementary hand-delivery covers and premium 2-year full structural damage warranties.");
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-tight px-3 py-1 rounded-full flex items-center gap-1 text-[10px] select-none hover:shadow-md animate-pulse shadow-indigo-650 cursor-pointer"
              >
                <span>⭐ Apex Elite Prime</span>
              </button>
            </div>
          </div>
        </div>
      )}
         {/* Left sliding-over All Categories & Features Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[9999] flex justify-start">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-black/60"
            />

            {/* Sidebar content container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
              className="relative w-[85vw] sm:w-[365px] bg-[#FFFFFF] h-[100vh] h-screen shadow-2xl flex flex-col overflow-hidden text-[#111111] z-[10000]"
            >
              {/* Drawer Header matching Apex style */}
              <div 
                className="h-[50px] bg-[#232F3E] text-[#FFFFFF] px-5 flex items-center justify-between shrink-0 select-none"
              >
                <div 
                  onClick={() => {
                    setIsSidebarOpen(false);
                    navigate(user ? '/profile' : '/auth');
                  }}
                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all text-white min-w-0"
                >
                  <User className="w-[18px] h-[18px] text-white shrink-0" />
                  <span className="font-bold text-[16px] tracking-tight truncate">
                    Hello, {user ? user.name : 'Sign in'}
                  </span>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 text-white hover:text-white/80 cursor-pointer transition-colors"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Viewport for navigation items scroll */}
              <div className="flex-1 overflow-y-auto py-2 scrollbar-thin select-none">
                
                {/* Section 1: Trending */}
                <div>
                  <h3 className="text-[20px] font-bold text-[#111111] mt-[24px] mb-[12px] px-5 tracking-tight select-none">
                    Trending
                  </h3>
                  <div className="flex flex-col">
                    <div 
                      onClick={() => {
                        setIsSidebarOpen(false);
                        navigate('/?bestsellers=true');
                      }}
                      className="h-11 flex items-center px-5 font-medium text-[15px] cursor-pointer text-[#111111] hover:bg-[#F2F2F2] transition-colors duration-200"
                    >
                      Bestsellers
                    </div>
                    <div 
                      onClick={() => {
                        setIsSidebarOpen(false);
                        navigate('/?sort=newest');
                      }}
                      className="h-11 flex items-center px-5 font-medium text-[15px] cursor-pointer text-[#111111] hover:bg-[#F2F2F2] transition-colors duration-200"
                    >
                      New Releases
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#EAEAEA] my-2" />

                {/* Section 2: Shop by Category */}
                <div>
                  <h3 className="text-[20px] font-bold text-[#111111] mt-[24px] mb-[12px] px-5 tracking-tight select-none">
                    Shop by Category
                  </h3>
                  <div className="flex flex-col">
                    {/* First row of categories displayed by default */}
                    {[
                      { name: 'Electronics', slug: 'electronics' },
                      { name: 'Fashion', slug: 'fashion' },
                      { name: 'Grocery', slug: 'grocery' },
                      { name: 'Home & Kitchen', slug: 'home' }
                    ].map((cat) => (
                      <div 
                        key={cat.name}
                        onClick={() => {
                          setIsSidebarOpen(false);
                          dispatch(fetchProducts({ category: cat.slug }));
                          navigate(`/?category=${cat.slug}`);
                        }}
                        className="h-11 flex items-center justify-between px-5 text-[15px] font-medium cursor-pointer text-[#111111] hover:bg-[#F2F2F2] transition-colors duration-200"
                      >
                        <span>{cat.name}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>
                    ))}

                    {/* Expandable Categories */}
                    {seeAllCategories && (
                      <div className="flex flex-col animate-in fade-in duration-200">
                        {[
                          { name: 'Beauty', slug: 'beauty' },
                          { name: 'Sports', slug: 'sports' },
                          { name: 'Mobiles', slug: 'electronics' },
                          { name: 'TV & Appliances', slug: 'tv_electronics' },
                          { name: 'Books', slug: 'books' }
                        ].map((cat) => (
                          <div 
                            key={cat.name}
                            onClick={() => {
                              setIsSidebarOpen(false);
                              dispatch(fetchProducts({ category: cat.slug }));
                              navigate(`/?category=${cat.slug}`);
                            }}
                            className="h-11 flex items-center justify-between px-5 text-[15px] font-medium cursor-pointer text-[#111111] hover:bg-[#F2F2F2] transition-colors duration-200"
                          >
                            <span>{cat.name}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* See All Category Button */}
                    <div 
                      onClick={() => setSeeAllCategories(!seeAllCategories)}
                      className="h-11 flex items-center justify-between px-5 text-[15px] font-semibold text-[#111111] hover:bg-[#F2F2F2] cursor-pointer transition-colors duration-200"
                    >
                      <span>{seeAllCategories ? 'See Less' : 'See All'}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ${seeAllCategories ? 'rotate-180' : ''}`} />
                    </div>

                  </div>
                </div>

                <div className="border-t border-[#EAEAEA] my-2" />

                {/* Section 3: Programs & Features */}
                <div>
                  <h3 className="text-[20px] font-bold text-[#111111] mt-[24px] mb-[12px] px-5 tracking-tight select-none">
                    Programs & Features
                  </h3>
                  <div className="flex flex-col">
                    <div 
                      onClick={() => {
                        setIsSidebarOpen(false);
                        navigate('/?deals=true');
                      }}
                      className="h-11 flex items-center px-5 font-medium text-[15px] cursor-pointer text-[#111111] hover:bg-[#F2F2F2] transition-colors duration-200"
                    >
                      Gift Cards
                    </div>
                    <div 
                      onClick={() => {
                        setIsSidebarOpen(false);
                        alert('💼 Apex Business Portal: Register corporate GST credentials to save up to 25% on your purchases.');
                      }}
                      className="h-11 flex items-center px-5 font-medium text-[15px] cursor-pointer text-[#111111] hover:bg-[#F2F2F2] transition-colors duration-200"
                    >
                      Apex Business
                    </div>
                    <div 
                      onClick={() => {
                        setIsSidebarOpen(false);
                        dispatch(fetchProducts({ category: 'fashion' }));
                        navigate('/?category=fashion');
                      }}
                      className="h-11 flex items-center justify-between px-5 font-medium text-[15px] cursor-pointer text-[#111111] hover:bg-[#F2F2F2] transition-colors duration-200"
                    >
                      <span>Handloom & Handicrafts</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>

                    {/* Expandable Programs */}
                    {seeAllPrograms && (
                      <div className="flex flex-col animate-in fade-in duration-200">
                        <div 
                          onClick={() => {
                            setIsSidebarOpen(false);
                            alert("⭐ complimentary Prime Status is Active! Enjoy free delivery protection and priority support.");
                          }}
                          className="h-11 flex items-center px-5 font-medium text-[15px] cursor-pointer text-indigo-600 hover:bg-[#F2F2F2] transition-colors duration-200"
                        >
                          Join Apex Elite Prime
                        </div>
                        <div 
                          onClick={() => {
                            setIsSidebarOpen(false);
                            if (user) {
                              navigate('/seller');
                            } else {
                              alert('Please sign in to access the Merchant Seller Desk.');
                              navigate('/auth');
                            }
                          }}
                          className="h-11 flex items-center px-5 font-medium text-[15px] cursor-pointer text-amber-600 hover:bg-[#F2F2F2] transition-colors duration-200"
                        >
                          Merchant Seller Desk
                        </div>
                      </div>
                    )}

                    {/* See All Programs Button */}
                    <div 
                      onClick={() => setSeeAllPrograms(!seeAllPrograms)}
                      className="h-11 flex items-center justify-between px-5 text-[15px] font-semibold text-[#111111] hover:bg-[#F2F2F2] cursor-pointer transition-colors duration-200"
                    >
                      <span>{seeAllPrograms ? 'See Less' : 'See All'}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ${seeAllPrograms ? 'rotate-180' : ''}`} />
                    </div>

                  </div>
                </div>

                <div className="border-t border-[#EAEAEA] my-2" />

                {/* Section 4: Help & Settings */}
                <div>
                  <h3 className="text-[20px] font-bold text-[#111111] mt-[24px] mb-[12px] px-5 tracking-tight select-none">
                    Help & Settings
                  </h3>
                  <div className="flex flex-col pb-8">
                    <div 
                      onClick={() => {
                        setIsSidebarOpen(false);
                        navigate(user ? '/profile' : '/auth');
                      }}
                      className="h-11 flex items-center px-5 font-medium text-[15px] cursor-pointer text-[#111111] hover:bg-[#F2F2F2] transition-colors duration-200"
                    >
                      Your Account
                    </div>
                    <div 
                      onClick={() => {
                        setIsSidebarOpen(false);
                        window.dispatchEvent(new CustomEvent('open-apex-chatbot'));
                      }}
                      className="h-11 flex items-center px-5 font-medium text-[15px] cursor-pointer text-[#111111] hover:bg-[#F2F2F2] transition-colors duration-200"
                    >
                      Customer Service
                    </div>
                    {user ? (
                      <div 
                        onClick={() => {
                          setIsSidebarOpen(false);
                          dispatch(logout());
                          navigate('/');
                        }}
                        className="h-11 flex items-center px-5 font-medium text-[15px] cursor-pointer text-rose-600 hover:bg-[#F2F2F2] transition-colors duration-200"
                      >
                        Sign Out
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setIsSidebarOpen(false);
                          navigate('/auth');
                        }}
                        className="h-11 flex items-center px-5 font-medium text-[15px] cursor-pointer text-indigo-650 hover:bg-[#F2F2F2] transition-colors duration-200"
                      >
                        Sign In
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100 bg-white"
          >
            <div className="px-4 pt-3 pb-6 space-y-4">
              {/* Mobile Search */}
              {(!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) && (
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Search premium products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none"
                  />
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                </form>
              )}

              {/* Navigation Links */}
              <div className="space-y-4 font-medium pt-2">
                {(!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) && (
                  <>
                    <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 text-gray-700 hover:text-indigo-600 font-bold">Home</Link>
                    <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className="py-2 px-3 bg-indigo-50/30 border border-indigo-100/50 rounded-xl text-indigo-700 hover:text-indigo-600 flex items-center gap-2 font-bold w-fit">
                      <Truck className="h-4.5 w-4.5" />
                      <span>Track My Orders</span>
                    </Link>
                    <Link to="/cart" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 text-gray-600 hover:text-indigo-600 flex justify-between pr-4 pt-2 border-t border-gray-50">
                      <span>Cart</span>
                      {cartItems.length > 0 && <span className="bg-indigo-600 text-white rounded-full px-2.5 py-0.5 text-xs">{cartItems.length}</span>}
                    </Link>
                    <Link to="/profile?tab=wishlist" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-gray-600 hover:text-indigo-600 flex justify-between">
                      <span>Wishlist</span>
                      {wishlistItems.length > 0 && <span className="bg-red-500 text-white rounded-full px-2.5 py-0.5 text-xs">{wishlistItems.length}</span>}
                    </Link>
                    {/* Always show My Account link */}
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (user) {
                          navigate('/profile');
                        } else {
                          alert('Please sign in to access Your Account services.');
                          navigate('/auth');
                        }
                      }}
                      className="w-full text-left py-2 text-gray-600 hover:text-indigo-600 flex items-center justify-between"
                    >
                      <span>My Account</span>
                    </button>
                  </>
                )}

                {/* Always show Seller Console link */}
                {(!user || user.role === 'SELLER') && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (user) {
                        navigate('/seller');
                      } else {
                        alert('Please sign in to access the Merchant Seller Desk.');
                        navigate('/auth');
                      }
                    }}
                    className="w-full text-left py-2 text-indigo-750 text-indigo-700 font-bold flex items-center justify-between"
                  >
                    <span>Seller Console</span>
                  </button>
                )}

                {/* Always show Admin Panel if user is ADMIN */}
                {user && user.role === 'ADMIN' && (
                  <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-purple-700 font-semibold animate-pulse">Admin Panel</Link>
                )}

                {/* Sign Out / Sign In buttons */}
                {user ? (
                  <button
                    onClick={() => {
                      dispatch(logout());
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2 text-red-650 text-red-600 flex items-center gap-1.5"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    Sign Out
                  </button>
                ) : (
                  <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-gray-900 font-bold border-t border-gray-100 pt-3 flex items-center gap-1.5">
                    <User className="h-4.5 w-4.5" />
                    Sign In to Account
                  </Link>
                )}
              </div>

              {/* Mobile Curated Departments list */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono mb-2 px-1">
                  Departments & Curated Channels
                </h4>
                <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        dispatch(fetchProducts({ category: cat.slug }));
                        navigate(`/?category=${cat.slug}`);
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-gray-50 flex flex-col transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-gray-800 capitalize">
                          {cat.name}
                        </span>
                        <span className="text-[8px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                          View Drops
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-[10px] text-gray-450 mt-0.5 font-normal leading-tight">
                          {cat.description}
                        </p>
                      )}
                      <p className="text-[9px] text-indigo-400 font-semibold mt-1">
                        ✨ {getCatDetails(cat.slug)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Right panel slider */}
      <AnimatePresence>
        {showNotificationDrawer && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotificationDrawer(false)}
              className="absolute inset-0 bg-black"
            ></motion.div>

            {/* Slide menu */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                  <Bell className="h-5 w-5 text-indigo-600 animate-pulse" />
                  <span>Alert Center</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => dispatch(markAllAsRead())}
                    className="h-8 px-2.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Read All
                  </button>
                  <button
                    onClick={() => setShowNotificationDrawer(false)}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Lists of Notifications */}
              <div className="p-4 divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 text-sm">
                    All clean. No active notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`py-4 flex gap-3 group transition-colors ${notif.isRead ? 'opacity-70' : 'bg-indigo-50/20'}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                            notif.type === 'OFFER' ? 'bg-orange-50 text-orange-600' :
                            notif.type === 'PRICE_DROP' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {notif.type}
                          </span>
                          <button
                            onClick={() => dispatch(clearNotification(notif.id))}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 mt-1">{notif.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 lines-clamp-3">{notif.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
}
