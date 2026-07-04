/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, loadProductDetails, addToCart, toggleWishlistItem } from '../store';
import { Star, Heart, ArrowLeft, ShieldCheck, Cpu, RefreshCw, Send, Trash2, Library, CheckCircle } from 'lucide-react';
import { useCurrency } from '../utils';
import axios from 'axios';

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const { formatPrice } = useCurrency();

  const { currentProduct, loading, error } = useSelector((state: RootState) => state.products);
  const { user } = useSelector((state: RootState) => state.auth);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);

  const [activeImage, setActiveImage] = useState('');
  const [zoomStyle, setZoomStyle] = useState({ display: 'none', backgroundPosition: '0% 0%' });
  const [quantity, setQuantity] = useState(1);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(loadProductDetails(id));
      setQuantity(1);
      setReviewSuccess(false);
      setCommentInput('');
    }
  }, [id]);

  useEffect(() => {
    if (currentProduct?.images?.[0]) {
      setActiveImage(currentProduct.images[0]);
    }
  }, [currentProduct]);

  if (loading) {
    return (
      <div className="py-32 text-center">
        <span className="inline-flex w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        <p className="text-xs text-gray-400 mt-4 font-semibold font-mono tracking-wider">Loading detailed specs...</p>
      </div>
    );
  }

  if (error || !currentProduct) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-rose-50 p-6 rounded-2xl text-rose-700">
          {error || 'The requested product data could not be parsed.'}
        </div>
        <Link to="/" className="inline-block mt-6 text-sm font-semibold text-indigo-600 hover:underline">
          Return to home storefront
        </Link>
      </div>
    );
  }

  // Related items list simulator
  const isWishlisted = wishlistItems.some(item => item.id === currentProduct.id);

  const handleAddToCart = () => {
    if (!user) {
      alert('You must log in to buy items!');
      navigate('/auth');
      return;
    }
    dispatch(addToCart(user.id, currentProduct.id, quantity));
  };

  const handleToggleWishlist = () => {
    if (!user) {
      alert('You must log in to buy items!');
      navigate('/auth');
      return;
    }
    dispatch(toggleWishlistItem(user.id, currentProduct.id));
  };

  const handleZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - window.scrollX - left) / width) * 100;
    const y = ((e.pageY - window.scrollY - top) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundPosition: `${x}% ${y}%`
    });
  };

  const handleZoomLeave = () => {
    setZoomStyle({ display: 'none', backgroundPosition: '0% 0%' });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    setIsSubmittingReview(true);
    try {
      await axios.post(`/api/products/${currentProduct.id}/review`, {
        userName: user?.name || 'Customer Feedback',
        rating: ratingInput,
        comment: commentInput
      });

      setReviewSuccess(true);
      setCommentInput('');
      // Reload details to sync rating score immediately
      dispatch(loadProductDetails(currentProduct.id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans bg-gray-50/20">
      
      {/* Back to Products */}
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-white border border-gray-100 px-4 py-2 rounded-full shadow-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Grid Catalog</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        
        {/* LEFT COMPONENT: Image Gallery Display */}
        <div className="space-y-4">
          <div
            className="w-full relative overflow-hidden aspect-square rounded-2xl bg-gray-50 border border-gray-100 cursor-zoom-in"
            onMouseMove={handleZoomMove}
            onMouseLeave={handleZoomLeave}
          >
            <img
              src={activeImage || undefined}
              alt=""
              className="w-full h-full object-cover rounded-2xl"
            />
            {/* Magnifying overlay block */}
            <div
              className="absolute inset-0 pointer-events-none bg-no-repeat bg-cover hidden rounded-2xl md:block"
              style={{
                ...zoomStyle,
                backgroundImage: `url(${activeImage})`,
                transform: 'scale(1.5)',
                transformOrigin: 'center'
              }}
            ></div>
          </div>

          {/* Multiple thumbnails */}
          {currentProduct.images.length > 1 && (
            <div className="flex gap-3">
              {currentProduct.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 rounded-xl border-2 transition-all ${activeImage === img ? 'border-indigo-600' : 'border-gray-100 hover:border-gray-300'}`}
                >
                  <img src={img || undefined} alt="" className="w-full h-full object-cover rounded-lg" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COMPONENT: Spec detail specs and purchasing tools */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-indigo-600 font-extrabold font-mono bg-indigo-50 px-3 py-1 rounded-full">
                {currentProduct.category}
              </span>
              <span className="text-xs text-gray-400 font-semibold">{currentProduct.brand}</span>
            </div>

            <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-4 leading-tight">
              {currentProduct.name}
            </h1>

            {/* Ratings Summary */}
            <div className="flex items-center gap-1.5 mt-3 border-b border-gray-100 pb-4">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4.5 h-4.5 fill-current ${
                      i < Math.floor(currentProduct.rating) ? 'text-amber-400' : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-gray-800 font-mono ml-1">
                {currentProduct.rating} Rating
              </span>
              <span className="text-xs text-gray-400">
                ({currentProduct.reviewsCount} customer critiques)
              </span>
            </div>

            {/* Pricing details */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-2xl font-extrabold text-gray-900 font-mono">
                {formatPrice(currentProduct.price)}
              </span>
              {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
                <>
                  <span className="text-sm text-gray-400 line-through font-mono">
                    {formatPrice(currentProduct.originalPrice)}
                  </span>
                  <span className="text-xs text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-lg">
                    {currentProduct.discountPercentage}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Description Text */}
            <p className="text-neutral-600 text-xs sm:text-sm mt-5 leading-relaxed">
              {currentProduct.description}
            </p>

            {/* Specifications Lists */}
            {Object.keys(currentProduct.specifications).length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <span>Hardware Specifications</span>
                </h4>
                <div className="mt-3 bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100/50 text-xs text-gray-700">
                  {Object.entries(currentProduct.specifications).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 p-3 font-medium">
                      <span className="text-gray-400 font-semibold">{key}</span>
                      <span className="col-span-2 text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            {/* Stock indicators */}
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold">
              <span className={`w-2.5 h-2.5 rounded-full ${currentProduct.stock > 5 ? 'bg-green-500 animate-pulse' : currentProduct.stock > 0 ? 'bg-amber-400' : 'bg-red-500'}`}></span>
              <span>
                {currentProduct.stock > 5 ? `In Stock (${currentProduct.stock} items remaining)` : currentProduct.stock > 0 ? `Hurry, only ${currentProduct.stock} left!` : 'Out of Stock'}
              </span>
            </div>

            {currentProduct.stock > 0 ? (
              <div className="flex flex-wrap items-center gap-4">
                {/* Quantity Adjuster */}
                <div className="flex items-center border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50/50">
                  <button
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="w-7 h-7 text-gray-500 hover:text-indigo-600 font-bold transition-colors"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-gray-800 font-mono">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(prev => Math.min(currentProduct.stock, prev + 1))}
                    className="w-7 h-7 text-gray-500 hover:text-indigo-600 font-bold transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Add to Basket */}
                <button
                  onClick={handleAddToCart}
                  className="flex-1 min-w-[200px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  Add to Shopping Cart
                </button>

                {/* Wishlist toggle */}
                <button
                  onClick={handleToggleWishlist}
                  className={`p-3 rounded-xl border transition-all hover:scale-105 ${
                    isWishlisted ? 'bg-rose-50 border-rose-100 text-rose-500 animate-pulse' : 'bg-white border-gray-200 text-gray-400 hover:text-rose-500'
                  }`}
                >
                  <Heart className="w-5 h-5 fill-current" />
                </button>
              </div>
            ) : (
              <button disabled className="w-full h-12 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs uppercase tracking-wider">
                Temporarily Sold Out
              </button>
            )}
          </div>

        </div>

      </div>

      {/* REVIEWS SEGMENT */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Write critique review form */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit">
          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Library className="w-4.5 h-4.5 text-indigo-600" />
            <span>Write a Product Review</span>
          </h3>

          {reviewSuccess ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 mx-auto flex items-center justify-center">
                <CheckCircle className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mt-4 animate-bounce">Review Added Successfully!</h4>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Thank you for contributing. Your rating directly updates our store catalog score instantly.
              </p>
              <button
                onClick={() => setReviewSuccess(false)}
                className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-colors-indigo-100 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all"
              >
                Write Another Review
              </button>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              {/* Rating stars */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Rating Selection</label>
                <div className="flex gap-1.5 mt-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRatingInput(val)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-6 h-6 fill-current ${val <= ratingInput ? 'text-amber-400' : 'text-gray-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Experience</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share details of this drop with other customers..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="w-full px-4 py-3 mt-2 border border-gray-100 rounded-2xl text-xs bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-2.5 rounded-xl text-white text-xs tracking-wide flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 hover:shadow-indigo-500/20 hover:shadow-md cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Score Critique</span>
              </button>
            </form>
          )}
        </div>

        {/* Existing reviews catalog list */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
            Customer Critiques ({currentProduct.reviews ? currentProduct.reviews.length : 0})
          </h3>

          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto pr-2">
            {!currentProduct.reviews || currentProduct.reviews.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs">
                No critiques loaded for this product. Be the very first to leave a feedback!
              </div>
            ) : (
              currentProduct.reviews.map((r: any) => (
                <div key={r.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900">{r.userName}</span>
                      <div className="flex text-amber-400 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 fill-current ${
                              i < r.rating ? 'text-amber-400' : 'text-gray-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed font-sans">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
