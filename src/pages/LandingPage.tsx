/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, fetchProducts, fetchCategories, addToCart, toggleWishlistItem } from '../store';
import { Link, useSearchParams } from 'react-router-dom';
import { Laptop, Shirt, Smartphone, BookOpen, Coffee, Award, Star, Heart, CheckCircle2, ChevronRight, Filter, ChevronDown, ListFilter, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency } from '../utils';
import axios from 'axios';

export default function LandingPage() {
  const dispatch = useDispatch() as any;
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatPrice } = useCurrency();
  
  const { items: products, categories, loading, error } = useSelector((state: RootState) => state.products);
  const { user } = useSelector((state: RootState) => state.auth);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);

  const [banners, setBanners] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState(250000);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    setVisibleCount(24);
  }, [products, searchParams, sortBy]);

  useEffect(() => {
    // Sync URL search params
    const catParam = searchParams.get('category') || 'all';
    const searchParam = searchParams.get('search') || '';
    setSelectedCategory(catParam);
    setSearchQuery(searchParam);

    dispatch(fetchProducts({ category: catParam, search: searchParam, sortBy }));
    dispatch(fetchCategories());

    // Load dynamic banners
    axios.get('/api/banners').then(res => setBanners(res.data)).catch(console.error);
  }, [searchParams, sortBy]);

  // Slide carousel timer
  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners]);

  const handleFilterCategory = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSearchParams(categorySlug === 'all' ? {} : { category: categorySlug });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  const handleAddToCart = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please log in first to manage your shopping cart!');
      return;
    }
    dispatch(addToCart(user.id, productId, 1));
  };

  const handleToggleWishlist = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please log in first to manage your wishlist!');
      return;
    }
    dispatch(toggleWishlistItem(user.id, productId));
  };

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'electronics': return <Laptop className="h-5 w-5" />;
      case 'fashion': return <Shirt className="h-5 w-5" />;
      case 'mobiles': return <Smartphone className="h-5 w-5" />;
      case 'books': return <BookOpen className="h-5 w-5" />;
      case 'home': return <Coffee className="h-5 w-5" />;
      default: return <Award className="h-5 w-5" />;
    }
  };

  const isDealsOnly = searchParams.get('deals') === 'true';
  const isBestsellersOnly = searchParams.get('bestsellers') === 'true';

  const filteredProductsByPrice = products.filter(p => {
    if (p.price > priceRange) return false;
    if (isDealsOnly && (!p.discountPercentage || p.discountPercentage <= 0)) return false;
    if (isBestsellersOnly && !p.isBestSeller) return false;
    return true;
  });

  // Throttled Infinite Scroll logic
  useEffect(() => {
    let throttleTimeout: NodeJS.Timeout | null = null;
    
    const handleScroll = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
      }, 150);

      const threshold = 450; // Load more when 450px from bottom for perfect seamless flow
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;
      
      if (scrolledToBottom) {
        setVisibleCount(prev => {
          if (prev < filteredProductsByPrice.length) {
            return prev + 24;
          }
          return prev;
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [filteredProductsByPrice.length]);

  const displayedProducts = filteredProductsByPrice.slice(0, visibleCount);

  return (
    <div className="bg-gray-50/50 min-h-screen pb-16 font-sans">
      
      {/* 1. Hero Dynamic Promotional Banner Slider */}
      {banners.length > 0 && (
        <div className="relative h-[250px] sm:h-[400px] bg-gray-900 overflow-hidden shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 w-full h-full"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${banners[currentSlide].imageUrl})` }}
              >
                {/* Visual Glass Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/70 to-transparent"></div>
              </div>
              
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
                  <div className="max-w-md sm:max-w-lg">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/20 text-[10px] font-bold tracking-wider text-indigo-400 uppercase">
                      exclusive collection release
                    </span>
                    <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-white mt-3 sm:mt-5 leading-tight">
                      {banners[currentSlide].title}
                    </h1>
                    <p className="text-xs sm:text-base text-gray-300 mt-2 sm:mt-4 leading-relaxed font-light">
                      {banners[currentSlide].subtitle}
                    </p>
                    <div className="mt-4 sm:mt-8">
                      <Link
                        to={banners[currentSlide].link}
                        className="inline-flex items-center gap-2 px-6 py-2.5 sm:py-3 bg-indigo-600 hover:bg-colors-indigo-500 hover:bg-indigo-500 rounded-full text-xs sm:text-sm text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/30"
                      >
                        Explore Now
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots controller */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all ${currentSlide === idx ? 'w-6 bg-indigo-500' : 'bg-gray-600 hover:bg-gray-400'}`}
              ></button>
            ))}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT COLUMN: Clean sidebar filters (Desktop-only) */}
        <div className="hidden lg:block space-y-6">
          {/* Quick Categories list */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>Catalog Categories</span>
            </h3>
            <div className="mt-4 space-y-1.5">
              <button
                onClick={() => handleFilterCategory('all')}
                className={`w-full text-left px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Award className="h-4 w-4" />
                <span>All Catalogues</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleFilterCategory(cat.slug)}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-between ${
                    selectedCategory === cat.slug
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {getCategoryIcon(cat.slug)}
                    <span>{cat.name}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtering Slider by Price */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Price Range</h3>
            <div className="mt-4">
              <input
                type="range"
                min="100"
                max="60000"
                step="500"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-indigo-600 bg-gray-100 rounded-lg height-1.5 cursor-pointer"
              />
              <div className="flex justify-between items-center text-xs text-gray-500 mt-2 font-mono">
                <span>Min: {formatPrice(100)}</span>
                <span className="text-indigo-600 font-bold">Max: {formatPrice(priceRange)}</span>
              </div>
            </div>
          </div>

          {/* Guarantee stamp card */}
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-6 rounded-3xl text-white shadow-lg border border-indigo-950 shadow-indigo-100 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>
            <ShieldCheck className="h-8 w-8 text-indigo-400" />
            <h4 className="text-sm font-bold mt-4">100% Genuine Guarantee</h4>
            <p className="text-[11px] text-indigo-200 mt-2 leading-relaxed">
              Every item in the Apex catalog undergoes strict high-grade structural screening. Backed by full 2 year return covers.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Active dynamic catalog results */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Mobile Categories list (Horizontal scroll, shown on mobile) */}
          <div className="block lg:hidden overflow-x-auto whitespace-nowrap scrollbar-none pb-2 flex gap-2">
            <button
              onClick={() => handleFilterCategory('all')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold ${
                selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-100'
              }`}
            >
              All Drops
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleFilterCategory(cat.slug)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold ${
                  selectedCategory === cat.slug ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Results Summary header & sort Controls */}
          <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider font-mono">Catalog listings</span>
              <h2 className="text-lg font-extrabold text-gray-900 mt-0.5 flex flex-wrap items-center gap-2">
                <span>{selectedCategory === 'all' ? 'All Curated Releases' : categories.find(c => c.slug === selectedCategory)?.name}</span>
                {searchQuery && <span className="text-gray-500 font-normal text-sm">matching "{searchQuery}"</span>}
                {isDealsOnly && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-bold">
                    Today's Deals
                    <button onClick={() => setSearchParams({})} className="hover:bg-rose-100 text-rose-800 font-black rounded-full w-3.5 h-3.5 inline-flex items-center justify-center text-[8px] transition-all">✕</button>
                  </span>
                )}
                {isBestsellersOnly && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-bold">
                    Bestsellers
                    <button onClick={() => setSearchParams({})} className="hover:bg-amber-100 text-amber-800 font-black rounded-full w-3.5 h-3.5 inline-flex items-center justify-center text-[8px] transition-all">✕</button>
                  </span>
                )}
              </h2>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {/* Sorting */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="newest">Sort By: Newest</option>
                  <option value="price-low">Price: Low-High</option>
                  <option value="price-high">Price: High-Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>

              <span className="text-xs text-gray-400 font-medium">
                {filteredProductsByPrice.length} drops found
              </span>
            </div>
          </div>

          {/* Product Cards Matrix representation */}
          {loading ? (
            <div className="py-24 text-center">
              <span className="inline-flex w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-xs text-gray-400 mt-4 font-semibold font-mono uppercase tracking-wider">Syncing database grids...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-6 rounded-2xl text-center text-sm">
              {error}
            </div>
          ) : filteredProductsByPrice.length === 0 ? (
            <div className="bg-white p-16 rounded-3xl border border-gray-100 text-center shadow-sm">
              <p className="text-gray-400 text-sm font-medium">No results matched your precise listing bounds.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setPriceRange(1500);
                  setSearchParams({});
                }}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-colors-indigo-500 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all"
              >
                Reset Search Boundary
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayedProducts.map((product) => {
                const isWishlisted = wishlistItems.some(item => item.id === product.id);

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col group relative"
                  >
                    {/* Badge placeholders */}
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                      {product.isBestSeller && (
                        <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold uppercase rounded-md shadow-sm">
                          Best Seller
                        </span>
                      )}
                      {product.discountPercentage && product.discountPercentage > 0 ? (
                        <span className="px-2.5 py-0.5 bg-rose-500 text-white text-[9px] font-bold uppercase rounded-md shadow-sm">
                          -{product.discountPercentage}% Off
                        </span>
                      ) : null}
                    </div>

                    {/* Heart wishlist trigger */}
                    <button
                      onClick={(e) => handleToggleWishlist(e, product.id)}
                      className={`absolute top-4 right-4 z-10 p-1.5 hover:scale-110 rounded-full transition-all border ${
                        isWishlisted
                          ? 'bg-rose-50 border-rose-100 text-rose-500'
                          : 'bg-white/80 border-gray-200/50 text-gray-400 hover:text-rose-500 backdrop-blur-sm'
                      }`}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>

                    {/* Image anchor banner */}
                    <Link to={`/product/${product.id}`} className="block overflow-hidden relative aspect-square bg-gray-50">
                      <img
                        src={product.images?.[0] || undefined}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </Link>

                    {/* Body content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Meta lines */}
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold font-mono">
                            {product.category}
                          </span>
                          <span className="text-[11px] font-medium text-gray-400">
                            {product.brand}
                          </span>
                        </div>

                        {/* Title click */}
                        <Link to={`/product/${product.id}`} className="block mt-2">
                          <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {product.name}
                          </h4>
                        </Link>

                        {/* Stars assessment */}
                        <div className="flex items-center gap-1 mt-2">
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 fill-current ${
                                  i < Math.floor(product.rating) ? 'text-amber-400' : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 ml-1 font-mono">
                            {product.rating}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ({product.reviewsCount})
                          </span>
                        </div>
                      </div>

                      {/* Cash value & Action */}
                      <div className="flex items-center justify-between mt-6 pt-3 border-t border-gray-100/50">
                        <div className="flex flex-col">
                          {product.originalPrice && product.originalPrice > product.price ? (
                            <span className="text-[10px] text-gray-450 line-through font-mono">
                              {formatPrice(product.originalPrice)}
                            </span>
                          ) : null}
                          <span className="text-sm font-extrabold text-gray-900 font-mono">
                            {formatPrice(product.price)}
                          </span>
                        </div>

                        {product.stock === 0 ? (
                          <span className="text-[10px] font-bold text-rose-500 uppercase px-2 py-1 bg-rose-50 rounded-lg">
                            Out of Stock
                          </span>
                        ) : (
                          <button
                            onClick={(e) => handleAddToCart(e, product.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1 hover:shadow-indigo-500/20 cursor-pointer"
                          >
                            <span>Add to Cart</span>
                          </button>
                        )}
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {filteredProductsByPrice.length > visibleCount && (
            <div className="flex flex-col items-center justify-center mt-12 pb-12">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400 font-mono mt-3">Loading more exceptional drops...</p>
            </div>
          )}
          {filteredProductsByPrice.length <= visibleCount && filteredProductsByPrice.length > 0 && (
            <div className="flex items-center justify-center mt-14 pb-12">
              <div className="h-px bg-gray-200 w-16"></div>
              <span className="text-[10px] text-gray-400 font-bold font-mono uppercase tracking-widest px-4 text-center">
                Refreshed catalog (showing all {filteredProductsByPrice.length} items)
              </span>
              <div className="h-px bg-gray-200 w-16"></div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
