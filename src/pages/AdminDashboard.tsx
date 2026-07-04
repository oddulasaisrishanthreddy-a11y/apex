/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, addNotification } from '../store';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Percent, BookOpen, Ban, Trash2, Edit3, Plus, RefreshCw, BarChart3, Coins, Loader2, Sparkles, Check, ChevronDown, CheckCircle, Truck, Printer, XCircle, AlertCircle, Search, MapPin, Compass, Navigation, ExternalLink, Archive, Package, ClipboardList, RotateCcw, FileText, Eye } from 'lucide-react';
import { formatRupee } from '../utils';
import axios from 'axios';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeSubView, setActiveSubView] = useState<'stats' | 'products' | 'coupons' | 'reviews' | 'sellers' | 'approvals' | 'orders'>('stats');
  
  const [statsData, setStatsData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Administrative order management states
  const [orders, setOrders] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [adminOrderFilter, setAdminOrderFilter] = useState<string | null>(null);
  
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [tempCourierName, setTempCourierName] = useState('');
  const [tempTrackingId, setTempTrackingId] = useState('');
  const [tempVehicleDetails, setTempVehicleDetails] = useState('');
  const [tempDeliveryAgent, setTempDeliveryAgent] = useState('');
  const [tempExpectedDeliveryDate, setTempExpectedDeliveryDate] = useState('');
  const [tempPackageWeight, setTempPackageWeight] = useState('');
  const [tempPackageDimensions, setTempPackageDimensions] = useState('');
  const [tempPrepStaff, setTempPrepStaff] = useState('');
  const [tempPodSignature, setTempPodSignature] = useState('');
  const [tempCurrentLocation, setTempCurrentLocation] = useState('');
  const [enforceStrictFlow, setEnforceStrictFlow] = useState(true);
  const [adminCancelReason, setAdminCancelReason] = useState('');
  const [showAdminCancelOrderId, setShowAdminCancelOrderId] = useState<string | null>(null);
  const [adminOrdersSearch, setAdminOrdersSearch] = useState('');
  const [historyModalOrderId, setHistoryModalOrderId] = useState<string | null>(null);
  const [tempDeliveryOtp, setTempDeliveryOtp] = useState('');

  // Premium Enterprise Logistics States
  const [showAdvanceFilters, setShowAdvanceFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterSeller, setFilterSeller] = useState('');
  const [internalAdminNote, setInternalAdminNote] = useState('');
  const [activeInternalNoteOrderId, setActiveInternalNoteOrderId] = useState<string | null>(null);

  // Modal displays
  const [activeLabelOrderId, setActiveLabelOrderId] = useState<string | null>(null);
  const [activePodOrderId, setActivePodOrderId] = useState<string | null>(null);
  const [activeInvoiceOrderId, setActiveInvoiceOrderId] = useState<string | null>(null);
  const [assignLorryOrderId, setAssignLorryOrderId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // Multi-Vendor approvals & requests
  const [sellers, setSellers] = useState<any[]>([]);
  const [sellerLoadingId, setSellerLoadingId] = useState<string | null>(null);
  const [approvalLoadingId, setApprovalLoadingId] = useState<string | null>(null);

  // Editing state for products
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('Apex Designs');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodOrigPrice, setProdOrigPrice] = useState(0);
  const [prodCategory, setProdCategory] = useState('electronics');
  const [prodStock, setProdStock] = useState(10);
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500');
  const [specsText, setSpecsText] = useState('{"Colors":"Cosmic Black, Slate Gray","Warranty":"2 Years Core Cover"}');

  // New Coupon Form
  const [couponCode, setCouponCode] = useState('');
  const [couponPercent, setCouponPercent] = useState(10);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      alert('Access forbidden! Only Admin profiles can view dashboard portals.');
      navigate('/');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Stats
      const statsRes = await axios.get('/api/admin/dashboard');
      setStatsData(statsRes.data);

      // 2. All products straight
      const prodRes = await axios.get('/api/products?includeUnapproved=true');
      setProducts(prodRes.data);

      // 3. Coupons
      const couponRes = await axios.get('/api/coupons');
      setCoupons(couponRes.data);

      // 4. Sellers
      const sellersRes = await axios.get('/api/admin/sellers');
      setSellers(sellersRes.data);

      // 5. Orders
      const orderRes = await axios.get('/api/orders');
      setOrders(orderRes.data.reverse());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdminLogistics = async (orderId: string, nextStatus?: string, customPayload?: any) => {
    try {
      setLoading(true);
      const headers = {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-user-name': user.name
      };

      const payload: any = { ...customPayload };
      if (nextStatus) payload.nextStatus = nextStatus;
      
      // Always bind the active draft input values so they are directly saved/assigned
      if (payload.courier_name === undefined) payload.courier_name = tempCourierName;
      if (payload.tracking_id === undefined) payload.tracking_id = tempTrackingId;
      if (payload.vehicle_details === undefined) payload.vehicle_details = tempVehicleDetails;
      if (payload.delivery_agent === undefined) payload.delivery_agent = tempDeliveryAgent;
      if (payload.expected_delivery_date === undefined) payload.expected_delivery_date = tempExpectedDeliveryDate;
      if (payload.package_weight === undefined) payload.package_weight = tempPackageWeight;
      if (payload.package_dimensions === undefined) payload.package_dimensions = tempPackageDimensions;
      if (payload.prep_staff === undefined) payload.prep_staff = tempPrepStaff;
      if (payload.pod_signature === undefined) payload.pod_signature = tempPodSignature;
      if (payload.current_location === undefined) payload.current_location = tempCurrentLocation;

      await axios.put(`/api/orders/${orderId}/admin-status`, payload, { headers });

      dispatch(addNotification({
        title: 'Order Status Upgraded',
        message: `Order status changed successfully! Status: ${nextStatus || 'Info updated'}`,
        type: 'ADMIN'
      }));

      await loadData();
      setTempDeliveryOtp('');
      
      // Clear temporary drafts if we've switched or closed order editing
      if (selectedOrderId !== orderId) {
        setTempCourierName('');
        setTempTrackingId('');
        setTempVehicleDetails('');
        setTempDeliveryAgent('');
        setTempExpectedDeliveryDate('');
        setTempPackageWeight('');
        setTempPackageDimensions('');
        setTempPrepStaff('');
        setTempPodSignature('');
        setTempCurrentLocation('');
      }
      setInternalAdminNote('');
      setActiveInternalNoteOrderId(null);
    } catch (err: any) {
      dispatch(addNotification({
        title: 'Logistics Shift Failed',
        message: err.response?.data?.error || 'Logistics update failed.',
        type: 'ADMIN'
      }));
      // Auto-reload data so any regenerated delivery OTP is reflected instantly in the admin view
      try {
        await loadData();
      } catch (loadErr) {
        console.error('Failed reloading admin data:', loadErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminCancelOrder = async (orderId: string) => {
    if (!adminCancelReason.trim()) {
      dispatch(addNotification({
        title: 'Invalid Cancellation',
        message: 'A mandatory reason is required to perform administrator cancellation.',
        type: 'ADMIN'
      }));
      return;
    }
    try {
      setLoading(true);
      const headers = {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-user-name': user.name
      };

      await axios.post(`/api/orders/${orderId}/admin-cancel`, {
        reason: adminCancelReason
      }, { headers });

      dispatch(addNotification({
        title: 'Cancellation Decided',
        message: 'Order has been cancelled by administrative action. Refund process and notifications dispatched.',
        type: 'ADMIN'
      }));

      setAdminCancelReason('');
      setShowAdminCancelOrderId(null);
      await loadData();
    } catch (err: any) {
      dispatch(addNotification({
        title: 'Cancellation Unsuccessful',
        message: err.response?.data?.error || 'Failed to execute administration cancellation.',
        type: 'ADMIN'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProduct = async (id: string) => {
    setApprovalLoadingId(id);
    try {
      await axios.post(`/api/admin/products/${id}/approve`);
      dispatch(addNotification({
        title: 'Product Approved',
        message: 'The seller-submitted item is now live and listed in stores!',
        type: 'ADMIN'
      }));
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setApprovalLoadingId(null);
    }
  };

  const handleUpdateSellerStatus = async (id: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => {
    setSellerLoadingId(id);
    try {
      await axios.post(`/api/admin/sellers/${id}/status`, { status });
      dispatch(addNotification({
        title: 'Merchant Profile Saved',
        message: `The merchant registration is updated to ${status}.`,
        type: 'ADMIN'
      }));
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSellerLoadingId(null);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product permanently from listings?')) return;
    try {
      await axios.delete(`/api/products/${id}`);
      setProducts(products.filter(p => p.id !== id));
      dispatch(addNotification({
        title: 'Product Deleted',
        message: 'The item was deleted from stores successfully.',
        type: 'ADMIN'
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    let specObj = {};
    try {
      specObj = JSON.parse(specsText);
    } catch (err) {
      alert('Specifications must be valid JSON styling format!');
      return;
    }

    const payload = {
      name: prodName,
      brand: prodBrand,
      price: Number(prodPrice),
      originalPrice: Number(prodOrigPrice),
      category: prodCategory,
      stock: Number(prodStock),
      description: prodDesc,
      images: [prodImage],
      specifications: specObj
    };

    try {
      if (editingProdId) {
        // UPDATE
        const res = await axios.put(`/api/products/${editingProdId}`, payload);
        setProducts(products.map(p => p.id === editingProdId ? res.data : p));
        setEditingProdId(null);
      } else {
        // CREATE NEW
        const res = await axios.post('/api/products', payload);
        setProducts([...products, res.data]);
      }

      setShowProductForm(false);
      // Reset
      setProdName(''); setProdPrice(0); setProdOrigPrice(0); setProdDesc('');
      dispatch(addNotification({
        title: 'Inventory Syncing Complete',
        message: 'Product specs published on databases.',
        type: 'ADMIN'
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const openEditProduct = (prod: any) => {
    setEditingProdId(prod.id);
    setProdName(prod.name);
    setProdBrand(prod.brand);
    setProdPrice(prod.price);
    setProdOrigPrice(prod.originalPrice || prod.price);
    setProdCategory(prod.category);
    setProdStock(prod.stock);
    setProdDesc(prod.description);
    setProdImage(prod.images[0]);
    setSpecsText(JSON.stringify(prod.specifications));
    setShowProductForm(true);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      const res = await axios.post('/api/coupons', {
        code: couponCode.trim().toUpperCase(),
        discountPercentage: Number(couponPercent)
      });

      setCoupons([...coupons, res.data]);
      setCouponCode('');
      dispatch(addNotification({
        title: 'Coupon Staged',
        message: `Members can now trigger reductions using ${res.data.code}.`,
        type: 'ADMIN'
      }));
    } catch (err) {
      alert('Coupon creation compiled error.');
    }
  };

  const handleDeleteReview = async (productId: string, reviewId: string) => {
    if (!window.confirm('Delete this user critique review?')) return;
    try {
      await axios.delete(`/api/products/${productId}/review/${reviewId}`);
      loadData(); // reload stats and product tree
      dispatch(addNotification({
        title: 'Spam Feedback Cleaned',
        message: 'Customer review pruned from stores ledger.',
        type: 'ADMIN'
      }));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !statsData) {
    return (
      <div className="py-20 text-center">
        <span className="inline-flex w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        <p className="text-xs text-gray-400 mt-4 font-semibold font-mono tracking-wider">Syncing Admin database registers...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 font-sans bg-gray-50/20">
      
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COMPONENT: Sidebar Selection */}
        <div className="w-full lg:w-64 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit space-y-6 flex-shrink-0">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">System Command Center</span>
            <h1 className="text-sm font-extrabold text-gray-900 mt-0.5 uppercase tracking-wide">Apex Dashboard</h1>
          </div>

          <div className="border-t border-gray-110 border-gray-100 pt-4 space-y-1">
            <button
              onClick={() => setActiveSubView('stats')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${activeSubView === 'stats' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-650 text-gray-650 text-gray-650 text-gray-500 hover:text-gray-800'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Statistics Bento</span>
            </button>

            <button
              onClick={() => setActiveSubView('products')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${activeSubView === 'products' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Catalog Manager</span>
            </button>

            <button
              onClick={() => setActiveSubView('coupons')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${activeSubView === 'coupons' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Percent className="w-4 h-4" />
              <span>Coupon Tokens</span>
            </button>

            <button
              onClick={() => setActiveSubView('reviews')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${activeSubView === 'reviews' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Feedback Audit</span>
            </button>

            <button
              onClick={() => setActiveSubView('sellers')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${activeSubView === 'sellers' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Merchant Registry</span>
              {sellers.filter(s => s.sellerStatus === 'PENDING').length > 0 && (
                <span className="ml-auto w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveSubView('approvals')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${activeSubView === 'approvals' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Product Approvals</span>
              {products.filter(p => !p.isApproved).length > 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-indigo-150 bg-indigo-50 text-[9px] font-bold text-indigo-700">
                  {products.filter(p => !p.isApproved).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubView('orders')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2.5 ${activeSubView === 'orders' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Truck className="w-4 h-4" />
              <span>Logistics Order Desk</span>
              {orders.filter(o => o.status === 'PACKED').length > 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-orange-500 text-[9px] font-bold text-white animate-pulse">
                  {orders.filter(o => o.status === 'PACKED').length} new
                </span>
              )}
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <button onClick={loadData} className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-400 hover:text-indigo-600 flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4" />
              <span>Force Refresh Records</span>
            </button>
          </div>
        </div>

        {/* RIGHT COMPONENT: Sub-views Displays */}
        <div className="flex-1">
          
          {/* A: STATISTICS BENTO BOARDS */}
          {activeSubView === 'stats' && statsData && (
            <div className="space-y-8">
              {/* Numeric grids */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Board 1 */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 h-24">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                    <Coins className="w-5 h-5 animate-pulse text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block truncate">Gross revenue</span>
                    <h3 className="text-base font-extrabold text-gray-900 mt-1 font-mono truncate">{formatRupee(statsData.stats.totalRevenue)}</h3>
                  </div>
                </div>

                {/* Board 2 */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 h-24">
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 flex-shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block truncate">Paid orders</span>
                    <h3 className="text-base font-extrabold text-gray-900 mt-1 font-mono truncate">{statsData.stats.totalOrders}</h3>
                  </div>
                </div>

                {/* Board 3 */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 h-24">
                  <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 flex-shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block truncate">Catalog stock</span>
                    <h3 className="text-base font-extrabold text-gray-900 mt-1 font-mono truncate">{statsData.stats.totalProducts}</h3>
                  </div>
                </div>

                {/* Board 4 */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 h-24">
                  <div className="p-3 rounded-2xl bg-green-50 text-green-600 flex-shrink-0">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block truncate">Total customers</span>
                    <h3 className="text-base font-extrabold text-gray-900 mt-1 font-mono truncate">{statsData.stats.totalUsers}</h3>
                  </div>
                </div>

                {/* Board 5 */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 h-24">
                  <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 flex-shrink-0">
                    <Coins className="w-5 h-5 text-purple-600 animate-spin-slow" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-purple-600 font-mono tracking-wider block truncate">Platform Commissions</span>
                    <h3 className="text-base font-extrabold text-purple-850 text-purple-800 mt-1 font-mono truncate">{formatRupee(statsData.adminCommissionBalance || 0)}</h3>
                  </div>
                </div>

              </div>

              {/* Graphic Chart SVG line chart */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Gross Monthly Payout metrics</h3>
                  <p className="text-xs text-gray-400 mt-1 font-medium">Real-time graphic chart sync of port 3000 databases.</p>
                </div>

                {/* Elegant Native SVG line chart representing data visualization guidelines */}
                <div className="mt-8 h-48 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                    {/* Grids background lines */}
                    <line x1="0" y1="20" x2="600" y2="20" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="0" y1="80" x2="600" y2="80" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="0" y1="140" x2="600" y2="140" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="0" y1="200" x2="600" y2="200" stroke="#f3f4f6" strokeWidth="2" />

                    {/* Chart Gradient fill */}
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Polyline Path dynamic calculations */}
                    {/* Data indices: Jan: $2000 (y ~ 140), Feb: $4500 (y ~ 100), Mar: $8500 (y ~ 50), Apr: $12000 (y ~ 20) */}
                    <path
                      d="M 50 160 L 200 130 L 350 70 L 550 30"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    <path
                      d="M 50 160 L 200 130 L 350 70 L 550 30 L 550 200 L 50 200 Z"
                      fill="url(#chartGlow)"
                    />

                    {/* Interactive dots spots */}
                    <circle cx="50" cy="160" r="5" fill="#4f46e5" stroke="white" strokeWidth="2" />
                    <circle cx="200" cy="130" r="5" fill="#4f46e5" stroke="white" strokeWidth="2" />
                    <circle cx="350" cy="70" r="5" fill="#4f46e5" stroke="white" strokeWidth="2" />
                    <circle cx="550" cy="30" r="5" fill="#4f46e5" stroke="white" strokeWidth="2" />
                  </svg>

                  {/* Horizontal months labels */}
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-gray-400 mt-4 leading-relaxed px-6">
                    <span>JAN ({formatRupee(150000)})</span>
                    <span>FEB ({formatRupee(320000)})</span>
                    <span>MAR ({formatRupee(640000)})</span>
                    <span>APR (ACTIVE: {formatRupee(statsData.stats.totalRevenue)})</span>
                  </div>
                </div>
              </div>

              {/* Commission splits transaction logs */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mt-6">
                <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">Platform Commission Split Ledger (10%)</h3>
                    <p className="text-xs text-gray-400 mt-1 font-medium">Automatic platform splits processed instantly on purchases.</p>
                  </div>
                  <Coins className="w-5 h-5 text-indigo-500 animate-pulse" />
                </div>

                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5">TX ID</th>
                        <th className="py-2.5">Order Number</th>
                        <th className="py-2.5 pl-6">Breakdown Notes</th>
                        <th className="py-2.5 text-right pr-6">Applied Split Cut</th>
                        <th className="py-2.5 text-right">Settlement Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-650">
                      {statsData.adminCommissionTransactions && statsData.adminCommissionTransactions.length > 0 ? (
                        statsData.adminCommissionTransactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-gray-50/40 transition-colors">
                            <td className="py-3 font-mono font-bold text-[10px] text-indigo-600">{tx.id}</td>
                            <td className="py-3 font-mono font-semibold text-gray-900">{tx.orderNumber}</td>
                            <td className="py-3 text-gray-500 pl-6">{tx.notes}</td>
                            <td className="py-3 text-right pr-6 font-mono font-extrabold text-emerald-600">
                              +{formatRupee(tx.amount)}
                            </td>
                            <td className="py-3 text-right text-[10px] text-gray-400 font-mono font-semibold">
                              {new Date(tx.createdAt || tx.date).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-gray-400 font-semibold text-xs">
                            No split entries found yet. Submit mock checkout transactions to trigger ledger updates!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* B: PRODUCTS MANAGEMENT LISTS & CRUD DRAWER */}
          {activeSubView === 'products' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Publish & Manage Catalog Items</h3>
                <button
                  onClick={() => {
                    setEditingProdId(null);
                    setProdName('');
                    setSpecsText('{"Colors":"Cosmic Black, Slate Gray","Warranty":"2 Years Core Cover"}');
                    setShowProductForm(!showProductForm);
                  }}
                  className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1 transition-all"
                >
                  <Plus className="w-4 h-4" /> publish Item
                </button>
              </div>

              {/* CRUD Drawer Form Toggle */}
              {showProductForm && (
                <form onSubmit={handleCreateOrUpdateProduct} className="p-5 border border-indigo-100 bg-indigo-50/5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 col-span-2">
                    {editingProdId ? 'Modify Store Specs details' : 'Draft New Catalog Drop'}
                  </h4>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">Model Title Name</label>
                    <input
                      type="text" required placeholder="Sony Noise Cancelling headphones" value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-150 border-gray-100 bg-white text-xs rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">Manufacturer / Brand</label>
                    <input
                      type="text" required placeholder="Sony Corp" value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-100 bg-white text-xs rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">List Price</label>
                      <input
                        type="number" required placeholder="299" value={prodPrice}
                        onChange={(e) => setProdPrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-100 bg-white text-xs rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">Original Price</label>
                      <input
                        type="number" required placeholder="399" value={prodOrigPrice}
                        onChange={(e) => setProdOrigPrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-100 bg-white text-xs rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">Stock Units</label>
                      <input
                        type="number" required placeholder="20" value={prodStock}
                        onChange={(e) => setProdStock(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-100 bg-white text-xs rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">Catalog Category Selector</label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-100 bg-white text-xs rounded-xl focus:outline-none h-[34px]"
                    >
                      <option value="electronics">electronics</option>
                      <option value="fashion">fashion</option>
                      <option value="mobiles">mobiles</option>
                      <option value="books">books</option>
                      <option value="home">home</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">Cover Image link URL / Local Upload 📸</label>
                    <div className="flex gap-2">
                      <input
                        type="text" required placeholder="https://unsplash... or base64 data" value={prodImage}
                        onChange={(e) => setProdImage(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-100 bg-white text-xs rounded-xl focus:outline-none"
                      />
                      <label className="h-[34px] px-3.5 border border-indigo-150 bg-indigo-50/20 hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors select-none text-center">
                        <span>Select File 📁</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onloadend = () => {
                                setProdImage(r.result as string);
                              };
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">Specification specs JSON metadata</label>
                    <input
                      type="text" required placeholder='{"Processor": "Intel Core M5", "RAM": "16 GB"}' value={specsText}
                      onChange={(e) => setSpecsText(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-100 bg-white text-xs rounded-xl focus:outline-none font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">Narrative copy description text</label>
                    <textarea
                      rows={3} required placeholder="State product materials and performance parameters..." value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-100 bg-white text-xs rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2 flex justify-end gap-2.5 pt-2">
                    <button type="button" onClick={() => setShowProductForm(false)} className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button type="submit" className="text-xs font-bold px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">
                      {editingProdId ? 'Save Core Specs' : 'Publish to Catalog'}
                    </button>
                  </div>
                </form>
              )}

              {/* Items Table lists representation */}
              <div className="overflow-x-auto select-none rounded-2xl border border-gray-100">
                <table className="w-full text-left text-xs divide-y divide-gray-100">
                  <thead className="bg-gray-50 text-gray-450 font-bold text-[10px] uppercase tracking-wider font-mono">
                    <tr>
                      <th className="p-3.5">Details</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Pricing</th>
                      <th className="p-3.5">Units Left</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="p-3.5 max-w-[200px]">
                          <div className="flex items-center gap-3">
                            <img src={p.images?.[0] || undefined} alt="" className="w-8 h-8 rounded-lg object-cover bg-gray-100 border border-gray-100" />
                            <div className="min-w-0">
                              <h4 className="font-bold text-gray-900 truncate">{p.name}</h4>
                              <p className="text-[10px] text-gray-450">{p.brand}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 uppercase tracking-wide font-mono font-bold text-indigo-600 text-[10px]">{p.category}</td>
                        <td className="p-3.5 font-bold font-mono text-gray-800">{formatRupee(p.price)}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.stock > 5 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                            {p.stock} units
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button onClick={() => openEditProduct(p)} className="p-1.5 hover:bg-gray-150 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-gray-400 transition-colors" title="Edit specifications">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-gray-400 transition-colors" title="Delete listing">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* C: DYNAMIC COUPON TOKEN CREATOR */}
          {activeSubView === 'coupons' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
              
              {/* Form trigger panel */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-3 flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-600 animate-bounce" />
                  <span>Log New Coupon Token</span>
                </h3>

                <form onSubmit={handleCreateCoupon} className="space-y-4 mt-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Coupon Key Code</label>
                    <input
                      type="text" required placeholder="SUPERCODE50" value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full mt-1.5 px-3 py-1.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Discount Percentage</label>
                    <input
                      type="number" required min="5" max="95" value={couponPercent}
                      onChange={(e) => setCouponPercent(Number(e.target.value))}
                      className="w-full mt-1.5 px-3 py-1.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs rounded-xl transition-all shadow-md shadow-indigo-100"
                  >
                    Publish Token
                  </button>
                </form>
              </div>

              {/* Coupons list */}
              <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm select-none">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-3">
                  Active Coupons Tokens Registry
                </h3>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                  {coupons.map((c, idx) => (
                    <div key={idx} className="p-4 border border-gray-100 rounded-3xl flex items-center justify-between">
                      <div>
                        <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded border border-indigo-100">{c.code}</span>
                        <div className="text-[10px] text-gray-450 mt-1 font-semibold">{c.discountPercentage}% Discount core</div>
                      </div>
                      <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* D: CUSTOMER FEEDBACK CRITIQUES MODERATOR AUDIT */}
          {activeSubView === 'reviews' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6 select-none font-sans">
              <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-50 pb-4 uppercase tracking-wider">Spam Reviews audit desk</h3>

              <div className="divide-y divide-gray-50 max-h-[450px] overflow-y-auto">
                {products.every(p => !p.reviews || p.reviews.length === 0) ? (
                  <div className="py-16 text-center text-gray-405 text-gray-400 text-xs">
                    No active comments are logged across product specs listings.
                  </div>
                ) : (
                  products.flatMap((prod) => 
                    (prod.reviews || []).map((rev: any) => ({
                      ...rev,
                      productName: prod.name,
                      productId: prod.id
                    }))
                  ).map((r: any) => (
                    <div key={r.id} className="py-4 flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wide">Review on: {r.productName}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <h4 className="text-xs font-bold text-gray-900">{r.userName}</h4>
                          <span className="text-[10px] text-gray-400 font-mono">({r.rating} stars)</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 leading-relaxed">{r.comment}</p>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteReview(r.productId, r.id)}
                        className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-full transition-colors flex-shrink-0"
                        title="Delete critique spam"
                      >
                        <Ban className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* E: MERCHANT SETUPS & APPROVAL STATUSES */}
          {activeSubView === 'sellers' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-950 text-gray-900 uppercase tracking-wide">Merchant & Partner Registries</h3>
                  <p className="text-xs text-gray-400 mt-1">Review applicant businesses, GSTIN verifications, and suspend/approve operations.</p>
                </div>
                <button onClick={loadData} className="p-1 text-gray-450 hover:text-indigo-600 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-left text-xs divide-y divide-gray-100">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px] font-mono">
                    <tr>
                      <th className="p-3.5">Merchant Store</th>
                      <th className="p-3.5">Representative</th>
                      <th className="p-3.5">GSTIN / Tax ID</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {sellers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-450">
                          No merchants are currently logged in the workspace.
                        </td>
                      </tr>
                    ) : (
                      sellers.map((sel: any) => (
                        <tr key={sel.id} className="hover:bg-gray-50/50">
                          <td className="p-3.5">
                            <div className="font-bold text-gray-900">{sel.storeName || 'Apex Affiliate Partner'}</div>
                            <div className="text-[10px] text-gray-400 truncate max-w-[200px]">{sel.storeDescription || 'Digital drop shipper'}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-medium text-gray-800">{sel.name}</div>
                            <div className="text-[10px] text-gray-450">{sel.email}</div>
                          </td>
                          <td className="p-3.5 font-mono font-medium text-gray-605 text-gray-600">
                            {sel.gstin || 'GSTIN_NOT_ESTABLISHED'}
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              sel.sellerStatus === 'APPROVED' ? 'bg-green-50 text-green-700' :
                              sel.sellerStatus === 'REJECTED' ? 'bg-rose-50 text-rose-705 text-rose-700' :
                              'bg-amber-50 text-amber-700 animate-pulse'
                            }`}>
                              {sel.sellerStatus || 'PENDING'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            {sel.sellerStatus !== 'APPROVED' && (
                              <button
                                onClick={() => handleUpdateSellerStatus(sel.id, 'APPROVED')}
                                disabled={sellerLoadingId === sel.id}
                                className="px-2.5 py-1 text-[10px] font-bold bg-green-600 hover:bg-green-550 hover:bg-green-700 text-white rounded-lg transition-colors inline-flex items-center gap-1"
                              >
                                {sellerLoadingId === sel.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                Approve
                              </button>
                            )}
                            {sel.sellerStatus !== 'SUSPENDED' && sel.sellerStatus !== 'REJECTED' && (
                              <button
                                onClick={() => handleUpdateSellerStatus(sel.id, 'REJECTED')}
                                disabled={sellerLoadingId === sel.id}
                                className="px-2.5 py-1 text-[10px] font-semibold bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-700 rounded-lg transition-colors inline-flex items-center gap-1"
                              >
                                {sellerLoadingId === sel.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* F: PRODUCT APPROVALS QUEUE */}
          {activeSubView === 'approvals' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Multi-Vendor Products Queue</h3>
                  <p className="text-xs text-gray-400 mt-1">Audit merchant stock submissions before launching them visible parameters live.</p>
                </div>
                <button onClick={loadData} className="p-1 text-gray-400 hover:text-indigo-600 transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-left text-xs divide-y divide-gray-100">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px] font-mono">
                    <tr>
                      <th className="p-3.5">Product details</th>
                      <th className="p-3.5">Merchant Seller</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Price</th>
                      <th className="p-3.5 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-55 divide-gray-50 bg-white">
                    {products.filter(p => !p.isApproved).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-gray-400 select-none">
                          All submitted items are approved and active. The queue is empty!
                        </td>
                      </tr>
                    ) : (
                      products.filter(p => !p.isApproved).map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="p-3.5 max-w-[200px]">
                            <div className="flex items-center gap-2.5">
                              <img src={p.images?.[0] || undefined} alt="" className="w-9 h-9 rounded-lg object-cover bg-gray-50 border border-gray-100" />
                              <div className="min-w-0">
                                <h4 className="font-bold text-gray-900 truncate">{p.name}</h4>
                                <p className="text-[10px] text-gray-400 truncate">{p.brand}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-gray-700">{p.sellerName || 'Apex Merchant'}</span>
                            <div className="text-[9px] font-mono text-gray-400">ID: {p.sellerId || 'N/A'}</div>
                          </td>
                          <td className="p-3.5 uppercase font-bold text-[10px] text-indigo-600 font-mono">{p.category}</td>
                          <td className="p-3.5 font-bold font-mono text-gray-850 text-gray-800">{formatRupee(p.price)}</td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleApproveProduct(p.id)}
                              disabled={approvalLoadingId === p.id}
                              className="px-3.5 py-1.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-550 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md shadow-indigo-50 inline-flex items-center gap-1.5"
                            >
                              {approvalLoadingId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Publish Live
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* G: GLOBAL LOGISTICS ORDER DESK */}
          {activeSubView === 'orders' && (
            <div className="space-y-6">
              
              {/* Live Count Statistics Cards (Auto-update and clickable status selectors) */}
              <div className="space-y-2">
                <span className="text-[10px] text-gray-450 font-extrabold uppercase tracking-widest font-mono">Live Custody Pipeline Stats</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {[
                    { key: null, label: 'All Staged', desc: 'Complete range', count: orders.length, bg: 'bg-indigo-50 border-indigo-150', text: 'text-indigo-805 text-indigo-700' },
                    { key: 'PENDING', label: 'New Submitted', desc: 'Awaiting Claim', count: orders.filter(o => o.status === 'PENDING').length, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
                    { key: 'ACCEPTED', label: 'Accepted', desc: 'Claimed orders', count: orders.filter(o => o.status === 'ACCEPTED').length, bg: 'bg-indigo-50 border-indigo-150', text: 'text-indigo-700' },
                    { key: 'PREPARING', label: 'Preparing', desc: 'Picker prep queue', count: orders.filter(o => o.status === 'PREPARING').length, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
                    { key: 'PACKED', label: 'Packed & Ready', desc: 'Awaiting courier', count: orders.filter(o => o.status === 'PACKED').length, bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800' },
                    { key: 'TRANSPORT_ASSIGNED', label: 'Lorry Bound', desc: 'Carrier Tagged', count: orders.filter(o => o.status === 'TRANSPORT_ASSIGNED').length, bg: 'bg-sky-50 border-sky-200', text: 'text-sky-800' },
                    { key: 'PICKED_UP', label: 'Picked Up', desc: 'Left Warehouse', count: orders.filter(o => o.status === 'PICKED_UP').length, bg: 'bg-teal-50 border-teal-200', text: 'text-teal-800' },
                    { key: 'LOGISTICS_CENTER', label: 'Reached Hub', desc: 'Sorting center', count: orders.filter(o => o.status === 'LOGISTICS_CENTER').length, bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800' },
                    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Highway trailer', count: orders.filter(o => o.status === 'IN_TRANSIT').length, bg: 'bg-amber-50/60 border-amber-100', text: 'text-amber-700' },
                    { key: 'OUT_FOR_DELIVERY', label: 'Out of Delivery', desc: 'Runner route', count: orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length, bg: 'bg-pink-50 border-pink-200', text: 'text-pink-800' },
                    { key: 'DELIVERED', label: 'Delivered Drop', desc: 'Drop complete', count: orders.filter(o => o.status === 'DELIVERED').length, bg: 'bg-green-50 border-green-200', text: 'text-green-800' },
                    { key: 'PENDING_RETURN', label: 'Return Claims', desc: 'Custody Return', count: orders.filter(o => o.status === 'PENDING_RETURN').length, bg: 'bg-orange-50 border-orange-200', text: 'text-orange-900' },
                    { key: 'RETURNED', label: 'Returned Status', desc: 'Refunded', count: orders.filter(o => o.status === 'RETURNED').length, bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800' },
                    { key: 'REFUNDED', label: 'Refunded Settled', desc: 'Wallet credit', count: orders.filter(o => o.refund_status === 'REFUNDED' || o.status === 'RETURNED').length, bg: 'bg-neutral-50/80 border-neutral-200', text: 'text-gray-700' },
                    { key: 'CANCELLED', label: 'Void/Cancelled', desc: 'Admin Refused', count: orders.filter(o => o.status === 'CANCELLED').length, bg: 'bg-slate-50 border-slate-200', text: 'text-slate-800' }
                  ].map((st) => {
                    const isSelected = adminOrderFilter === st.key;
                    return (
                      <button
                        key={String(st.key)}
                        onClick={() => {
                          setAdminOrderFilter(st.key);
                          setSelectedOrderId(null);
                          if (st.key === null) {
                            setAdminTab('ALL');
                          } else if (['DELIVERED', 'RETURNED'].includes(st.key)) {
                            setAdminTab('COMPLETED');
                          } else if (st.key === 'CANCELLED') {
                            setAdminTab('CANCELLED');
                          } else {
                            setAdminTab('ACTIVE');
                          }
                        }}
                        className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                            : `${st.bg} hover:shadow-xs`
                        }`}
                      >
                        <div className="min-w-0">
                          <span className={`text-[8.5px] block font-extrabold truncate uppercase tracking-wider font-mono ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>{st.label}</span>
                          <span className={`text-[8px] block mt-0.5 truncate leading-none opacity-60 ${isSelected ? 'text-white' : 'text-gray-400'}`}>{st.desc}</span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-dashed border-gray-200/20">
                          <span className={`text-sm font-black font-mono leading-none ${isSelected ? 'text-white' : st.text}`}>{st.count}</span>
                          {st.key !== null && st.key !== 'REFUNDED' && (
                            <span className="text-[7.5px] font-mono text-gray-400 font-bold">
                              {orders.length > 0 ? `${((st.count / orders.length) * 100).toFixed(0)}%` : '0%'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Search & Filtering Console */}
              <div className="space-y-3 bg-white p-4 rounded-3xl border border-gray-150 shadow-sm font-sans text-left">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between font-sans">
                  <div className="relative w-full md:flex-1 font-sans">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      className="w-full text-xs pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                      placeholder="Search Order #, Code, Customer, Tracking Waybill, Phone, Email, Destination City, State..."
                      value={adminOrdersSearch}
                      onChange={(e) => setAdminOrdersSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto self-stretch md:self-auto justify-between md:justify-start">
                    <button
                      onClick={() => setShowAdvanceFilters(!showAdvanceFilters)}
                      className={`px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        showAdvanceFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>Filters Menu</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanceFilters ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {(filterStartDate || filterEndDate || filterPaymentMethod || filterWarehouse || filterSeller || adminOrdersSearch) && (
                      <button
                        onClick={() => {
                          setFilterStartDate('');
                          setFilterEndDate('');
                          setFilterPaymentMethod('');
                          setFilterWarehouse('');
                          setFilterSeller('');
                          setAdminOrdersSearch('');
                          setAdminOrderFilter(null);
                          setAdminTab('ALL');
                        }}
                        className="px-3.5 py-2 text-[10px] font-bold font-mono text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-100 transition-all cursor-pointer"
                      >
                        ✕ Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                {showAdvanceFilters && (
                  <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 text-xs animate-in slide-in-from-top-2 duration-150 font-sans">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono block">From Date</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono block">To Date</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono block">Payment Type</label>
                      <select
                        value={filterPaymentMethod}
                        onChange={(e) => setFilterPaymentMethod(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium font-semibold"
                      >
                        <option value="">All Payment Types</option>
                        <option value="STRIPE">Stripe Credit Cards</option>
                        <option value="RAZORPAY">Razorpay (UPI / QR Code)</option>
                        <option value="COD">Cash on Delivery (COD)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono block">Warehouse Hub Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Pune City"
                        value={filterWarehouse}
                        onChange={(e) => setFilterWarehouse(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono block">Seller / Vendor partner</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Electronics"
                        value={filterSeller}
                        onChange={(e) => setFilterSeller(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Core Orders Layout (Side-by-Side: order list on left, logistics console on right when selected) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 font-sans">
                
                {/* List portion */}
                <div className={`${selectedOrderId ? 'xl:col-span-7' : 'xl:col-span-12'} space-y-4`}>
                  {(() => {
                    const statusFiltered = orders.filter((o) => {
                      if (adminTab === 'ACTIVE') {
                        if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status)) return false;
                      } else if (adminTab === 'COMPLETED') {
                        if (!['DELIVERED', 'RETURNED'].includes(o.status)) return false;
                      } else if (adminTab === 'CANCELLED') {
                        if (o.status !== 'CANCELLED') return false;
                      }

                      if (adminOrderFilter) {
                        return o.status === adminOrderFilter;
                      }
                      return true;
                    });
                    const queryFiltered = statusFiltered.filter(o => {
                      // Date range filters
                      if (filterStartDate) {
                        const start = new Date(filterStartDate);
                        start.setHours(0, 0, 0, 0);
                        if (new Date(o.createdAt) < start) return false;
                      }
                      if (filterEndDate) {
                        const end = new Date(filterEndDate);
                        end.setHours(23, 59, 59, 999);
                        if (new Date(o.createdAt) > end) return false;
                      }

                      // Payment Method filter
                      if (filterPaymentMethod) {
                        if (o.paymentMethod !== filterPaymentMethod) return false;
                      }

                      // Warehouse City Hub filter
                      if (filterWarehouse) {
                        const w = filterWarehouse.toLowerCase();
                        const locationMatches = (o.current_location && o.current_location.toLowerCase().includes(w)) || 
                                                (o.logistics_hub && o.logistics_hub.toLowerCase().includes(w)) || 
                                                (o.address?.city && o.address.city.toLowerCase().includes(w));
                        if (!locationMatches) return false;
                      }

                      // Seller / Vendor filter
                      if (filterSeller) {
                        const s = filterSeller.toLowerCase();
                        const sellerMatches = (o.seller_name && o.seller_name.toLowerCase().includes(s)) || 
                                              (o.items && o.items.some(i => (i as any).seller_name && (i as any).seller_name.toLowerCase().includes(s))) ||
                                              (o.items && o.items.some(i => i.name && i.name.toLowerCase().includes(s)));
                        if (!sellerMatches) return false;
                      }

                      // Text search filter
                      if (adminOrdersSearch.trim()) {
                        const q = adminOrdersSearch.toLowerCase();
                        const textMatches = 
                          o.orderNumber.toLowerCase().includes(q) ||
                          o.id.toLowerCase().includes(q) ||
                          (o.address?.fullName && o.address.fullName.toLowerCase().includes(q)) ||
                          (o.address?.city && o.address.city.toLowerCase().includes(q)) ||
                          (o.address?.state && o.address.state.toLowerCase().includes(q)) ||
                          (o.address?.phone && o.address.phone.toLowerCase().includes(q)) ||
                          (o.address?.email && o.address.email.toLowerCase().includes(q)) ||
                          (o.courier_name && o.courier_name.toLowerCase().includes(q)) ||
                          (o.tracking_id && o.tracking_id.toLowerCase().includes(q)) ||
                          (o.items && o.items.some(i => i.name && i.name.toLowerCase().includes(q)));
                        if (!textMatches) return false;
                      }

                      return true;
                    });

                    if (queryFiltered.length === 0) {
                      return (
                        <div className="bg-white p-16 text-center rounded-3xl border border-gray-100 shadow-sm">
                          <Truck className="w-10 h-10 text-gray-300 mx-auto" />
                          <h3 className="text-sm font-bold text-gray-900 mt-4 font-sans">No matching deliveries</h3>
                          <p className="text-xs text-gray-400 mt-1">There are no custody records matching "{adminOrderFilter || adminTab}" status criteria.</p>
                        </div>
                      );
                    }

                    return queryFiltered.map((o) => (
                      <div key={o.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4 hover:border-indigo-150 transition-all">
                        
                        {/* Summary strip */}
                        <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                          <div>
                            <div className="flex items-center gap-1.5 font-mono text-xs font-black text-indigo-950 uppercase">
                              <span>Order #{o.orderNumber}</span>
                              <span className="text-[10px] text-gray-400 font-normal">({new Date(o.createdAt).toLocaleDateString()})</span>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 block">Consignee: <strong>{o.address?.fullName}</strong> &bull; Location: <strong>{o.address?.city}, {o.address?.country}</strong></span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setHistoryModalOrderId(historyModalOrderId === o.id ? null : o.id)}
                              className="h-7 px-2.5 text-[10px] font-bold border border-gray-100 hover:bg-gray-50 text-indigo-600 bg-indigo-50/20 rounded-lg transition-all"
                            >
                              Audit Log
                            </button>
                            
                            {o.status !== 'CANCELLED' && (
                              <button
                                onClick={() => {
                                  setSelectedOrderId(o.id);
                                  // Populate edit states
                                  setTempCourierName(o.courier_name || '');
                                  setTempTrackingId(o.tracking_id || '');
                                  setTempVehicleDetails(o.vehicle_details || '');
                                  setTempDeliveryAgent(o.delivery_agent || '');
                                  setTempExpectedDeliveryDate(o.expected_delivery_date || '');
                                  setTempPackageWeight(o.package_weight || '');
                                  setTempPackageDimensions(o.package_dimensions || '');
                                  setTempPrepStaff(o.prep_staff || '');
                                  setTempPodSignature(o.pod_signature || '');
                                  setTempCurrentLocation(o.current_location || '');
                                }}
                                className="h-7 px-2.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
                              >
                                Edit Logistics
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Items detail list */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 font-mono block">Package Manifest</span>
                            <div className="space-y-1">
                              {o.items.map((item: any, iIdx) => (
                                <div key={iIdx} className="flex justify-between text-neutral-600">
                                  <span className="truncate max-w-[200px]">{item.product.name} <strong className="text-indigo-600">x{item.quantity}</strong></span>
                                  <span className="text-gray-400 text-[10px]">({item.product.sellerName || 'Partner Seller'})</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1 bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-100">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 font-mono block">Logistics Credentials</span>
                            <div className="space-y-0.5 text-[10px] font-mono leading-relaxed text-neutral-600 font-medium font-semibold">
                              <div>Carrier: <span className="font-extrabold uppercase text-gray-800">{o.courier_name || 'Unassigned'}</span></div>
                              {o.tracking_id && <div>Waybill Code: <span className="font-bold text-indigo-700">{o.tracking_id}</span></div>}
                              {o.delivery_agent && <div>Agent Courier: <span className="font-bold text-gray-700">{o.delivery_agent}</span></div>}
                              {o.vehicle_details && <div>License Plate: <span className="text-gray-750">{o.vehicle_details}</span></div>}
                            </div>
                          </div>

                          <div className="space-y-1.5 bg-indigo-50/20 p-2.5 rounded-xl border border-indigo-100/30">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-700 font-mono flex items-center justify-between">
                              <span>Customer Shipping Pin</span>
                              {o.address?.latitude && o.address?.longitude ? (
                                <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded font-bold">GPS Map</span>
                              ) : (
                                <span className="text-[8px] bg-gray-50 text-gray-500 px-1 py-0.2 rounded font-bold">City Map</span>
                              )}
                            </span>
                            <div className="text-[10px] text-gray-600 leading-normal">
                              <p className="font-bold text-gray-850 truncate">{o.address?.fullName} ({o.address?.phone})</p>
                              <p className="truncate mt-0.5">
                                {o.address?.buildingName ? `${o.address.buildingName}, ` : ''}
                                {o.address?.streetNo ? `${o.address.streetNo} ` : ''}
                                {o.address?.streetName || o.address?.street}
                              </p>
                              <p className="text-[9px] text-gray-400 mt-0.5 font-mono">
                                Coordinates: {o.address?.latitude && o.address?.longitude 
                                  ? `[${o.address.latitude.toFixed(5)}, ${o.address.longitude.toFixed(5)}]` 
                                  : 'Not Logged'}
                              </p>
                              <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t border-indigo-100/30">
                                {o.address?.latitude && o.address?.longitude ? (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${o.address.latitude},${o.address.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-[9px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2 py-1 rounded-lg transition-all"
                                  >
                                    <MapPin className="w-2.5 h-2.5 text-indigo-600" />
                                    <span>Track Route GPS</span>
                                    <ExternalLink className="w-2 h-2 text-indigo-400" />
                                  </a>
                                ) : (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address?.street}, ${o.address?.city}`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-[9px] font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-2 py-1 rounded-lg transition-all"
                                  >
                                    <Compass className="w-2.5 h-2.5" />
                                    <span>Verify Address Map</span>
                                    <ExternalLink className="w-2 h-2 text-gray-400" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Audit Log expandable panel */}
                        {historyModalOrderId === o.id && o.history && (
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-3 space-y-2.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-950 font-mono block">Audit Logs</span>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                              {o.history.map((hist: any) => (
                                <div key={hist.id} className="text-[10px] bg-white p-2.5 rounded-xl border border-slate-200">
                                  <div className="flex justify-between items-center text-indigo-950 font-bold">
                                    <span>{hist.changerName} ({hist.role})</span>
                                    <span className="text-gray-400 font-mono font-normal">{new Date(hist.timestamp).toLocaleString()}</span>
                                  </div>
                                  <p className="text-gray-500 font-medium mt-1">{hist.notes}</p>
                                  <p className="text-[9px] font-mono text-indigo-650 text-indigo-600 mt-1 font-bold">Transitioned: "{hist.prevStatus}" &rarr; "{hist.newStatus}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Absolute Cancellation section */}
                        {o.status !== 'CANCELLED' && (
                          <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                            <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100">🛡️ Admin Override Active</span>
                            
                            {showAdminCancelOrderId === o.id ? (
                              <div className="flex-1 max-w-md ml-4 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="Enter cancellation reason..."
                                  value={adminCancelReason}
                                  onChange={(e) => setAdminCancelReason(e.target.value)}
                                  className="flex-1 text-[11px] p-1.5 border border-rose-200 rounded-lg bg-white outline-none"
                                />
                                <button
                                  onClick={() => handleAdminCancelOrder(o.id)}
                                  className="h-7 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-extrabold font-mono uppercase"
                                >
                                  Refuse Package
                                </button>
                                <button
                                  onClick={() => { setShowAdminCancelOrderId(null); setAdminCancelReason(''); }}
                                  className="h-7 px-2 text-[10px] text-gray-500 hover:bg-gray-100 rounded-lg"
                                >
                                  Close
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowAdminCancelOrderId(o.id)}
                                className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-100 transition-all cursor-pointer"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        )}

                      </div>
                    ));
                  })()}
                </div>

                {/* Right Edit Admin Console */}
                {selectedOrderId && (() => {
                  const o = orders.find(ord => ord.id === selectedOrderId);
                  if (!o) return null;

                  return (
                    <div className="xl:col-span-5 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4 h-fit animate-in slide-in-from-right-10 duration-200">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                        <div>
                          <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">Transit Master Console</h4>
                          <p className="font-mono text-[10px] text-gray-400 mt-0.5">Editing Order #{o.orderNumber}</p>
                        </div>
                        <button
                          onClick={() => setSelectedOrderId(null)}
                          className="p-1 hover:bg-gray-50 text-gray-400 hover:text-gray-700 rounded-lg transition-all"
                        >
                          ✕
                        </button>
                      </div>

                       {/* Enforce Strict PROGRESS Flow Mode toggle */}
                      <div className="bg-indigo-50/40 p-3 rounded-2xl flex items-center justify-between border border-indigo-150">
                        <div className="text-left">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-950 font-mono flex items-center gap-1">
                            {enforceStrictFlow ? '🔒 Strict progress workflow' : '⚙️ Manual override mode'}
                          </span>
                          <p className="text-[9px] text-gray-400 mt-0.5 leading-normal">
                            {enforceStrictFlow ? 'Enforces realistic step-by-step progress' : 'Allows arbitrary jumping for debug'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={enforceStrictFlow} 
                            onChange={(e) => setEnforceStrictFlow(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* Section: ACTIVE TARGETED WIZARD ACTION PANEL */}
                      {enforceStrictFlow && (
                        <div className="bg-slate-50/50 p-4 rounded-3xl border border-gray-150 space-y-3.5 text-left">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 font-mono block">🎯 Current Stage Operations</span>
                          
                          {/* STAGE: PENDING */}
                          {o.status === 'PENDING' && (
                            <div className="space-y-3">
                              <p className="text-[10px] text-gray-500 leading-normal">
                                Order #{o.orderNumber} is newly submitted. Accept order to allocate stocks, or reject with a reason to cancel.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAdminLogistics(o.id, 'ACCEPTED', { notes: 'Order acknowledged and accepted into active shipping pool.' })}
                                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                                >
                                  Accept Order ✔
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const r = prompt("Please enter the rejection / cancellation reason:");
                                    if (r) {
                                      handleUpdateAdminLogistics(o.id, 'CANCELLED', { notes: `Order rejected by administrator. Reason: ${r}`, cancel_reason: r });
                                    }
                                  }}
                                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Reject Order ✕
                                </button>
                              </div>
                            </div>
                          )}

                          {/* STAGE: ACCEPTED */}
                          {o.status === 'ACCEPTED' && (
                            <div className="space-y-3 font-sans">
                              <p className="text-[10px] text-gray-500 leading-normal">
                                Order accepted. Assign warehouse picking employee to start prep stages:
                              </p>
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold block">Assigned Prep Staff</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Michael Scott (Row 4 Pick)"
                                  value={tempPrepStaff}
                                  onChange={(e) => setTempPrepStaff(e.target.value)}
                                  className="w-full text-xs p-2.5 bg-white border border-gray-150 rounded-xl focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateAdminLogistics(o.id, 'PREPARING', { prep_staff: tempPrepStaff || 'Staff A-H Depot', notes: `Picking & prepping team initialized under: ${tempPrepStaff || 'Depot Hub'}` })}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Start Preparing Order ⚙
                              </button>
                            </div>
                          )}

                          {/* STAGE: PREPARING */}
                          {o.status === 'PREPARING' && (
                            <div className="space-y-3 font-sans">
                              {o.prep_staff && (
                                <p className="text-[9px] font-mono font-extrabold text-indigo-700">Currently picking under staff: {o.prep_staff}</p>
                              )}
                              <p className="text-[10px] text-gray-500 leading-normal">
                                Items are currently being prepared. To complete packing, enter parcels attributes:
                              </p>
                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                  <label className="text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold block">Package Weight</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 2.4 kg"
                                    value={tempPackageWeight}
                                    onChange={(e) => setTempPackageWeight(e.target.value)}
                                    className="w-full text-xs p-2 bg-white border border-gray-150 rounded-xl focus:outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold block">Dimensions (LxWxH)</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 30x20x10 cm"
                                    value={tempPackageDimensions}
                                    onChange={(e) => setTempPackageDimensions(e.target.value)}
                                    className="w-full text-xs p-2 bg-white border border-gray-150 rounded-xl focus:outline-none"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateAdminLogistics(o.id, 'PACKED', { 
                                  package_weight: tempPackageWeight || '1.0 kg', 
                                  package_dimensions: tempPackageDimensions || 'Standard Box',
                                  notes: `Package enclosed successfully. Weight: ${tempPackageWeight || '1.0 kg'}, Size: ${tempPackageDimensions || 'Standard'}`
                                })}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Mark Packed & Secured 📦
                              </button>
                            </div>
                          )}

                          {/* STAGE: PACKED */}
                          {o.status === 'PACKED' && (
                            <div className="space-y-3 font-sans">
                              <p className="text-[10px] text-gray-500 leading-normal">
                                Boxed & packed. Designate logistics partner vehicle, and generate a waybill code:
                              </p>
                              
                              <div className="space-y-2 text-xs">
                                <div className="space-y-1">
                                  <label className="text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold block">Courier Partner</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Delhivery, Bluedart"
                                    value={tempCourierName}
                                    onChange={(e) => setTempCourierName(e.target.value)}
                                    className="w-full text-xs p-2 bg-white border border-gray-150 rounded-xl focus:outline-none"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold">Waybill / Tracking ID</label>
                                    <button
                                      type="button"
                                      onClick={() => setTempTrackingId('APX-TRK-' + Math.floor(10000000 + Math.random() * 90000000))}
                                      className="text-[9px] text-indigo-600 font-extrabold hover:underline"
                                    >
                                      Generate Waybill ID ⚡
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="APX-TRK-XXXXXXXX"
                                    value={tempTrackingId}
                                    onChange={(e) => setTempTrackingId(e.target.value)}
                                    className="w-full text-xs p-2 bg-white border border-gray-150 rounded-xl focus:outline-none font-mono"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold block">Vehicle Details</label>
                                    <input
                                      type="text"
                                      placeholder="DL-11-AA-2342"
                                      value={tempVehicleDetails}
                                      onChange={(e) => setTempVehicleDetails(e.target.value)}
                                      className="w-full text-xs p-2 bg-white border border-gray-150 rounded-xl focus:outline-none"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold block">Consignee Exec</label>
                                    <input
                                      type="text"
                                      placeholder="Rohan (Driver)"
                                      value={tempDeliveryAgent}
                                      onChange={(e) => setTempDeliveryAgent(e.target.value)}
                                      className="w-full text-xs p-2 bg-white border border-gray-150 rounded-xl focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleUpdateAdminLogistics(o.id, 'TRANSPORT_ASSIGNED', {
                                  courier_name: tempCourierName || 'Standard Express',
                                  tracking_id: tempTrackingId || ('APX-TRK-' + Math.floor(10000000 + Math.random() * 90000000)),
                                  vehicle_details: tempVehicleDetails || 'Lorry MH-12',
                                  delivery_agent: tempDeliveryAgent || 'Fleet Courier',
                                  expected_delivery_date: tempExpectedDeliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                                  notes: `Logistics assigned. Partner: ${tempCourierName || 'Standard Express'}, Waybill: ${tempTrackingId || 'APX-Waybill'}`
                                })}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md"
                              >
                                Assign Carrier & Ready Shipment 🚀
                              </button>
                            </div>
                          )}

                          {/* STAGE: TRANSPORT_ASSIGNED */}
                          {o.status === 'TRANSPORT_ASSIGNED' && (
                            <div className="space-y-3 font-sans">
                              <p className="text-[10px] text-gray-500 leading-normal">
                                Shipments ready with Waybill **{o.tracking_id}** and Courier **{o.courier_name}**. Confirm pickup from warehouse.
                              </p>
                              
                              <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 space-y-1 text-[11px] font-mono">
                                <div><strong>Courier:</strong> {o.courier_name}</div>
                                <div><strong>Tracking:</strong> {o.tracking_id}</div>
                                <div><strong>Driver:</strong> {o.delivery_agent} ({o.vehicle_details})</div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleUpdateAdminLogistics(o.id, 'PICKED_UP', { notes: 'Carrier vehicle arrived, waybill code scanned and dispatch handed over.' })}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Handover to Courier (Mark Picked Up) 🚚
                              </button>
                            </div>
                          )}

                          {/* STAGE: PICKED_UP */}
                          {o.status === 'PICKED_UP' && (
                            <div className="space-y-3 font-sans">
                              <p className="text-[10px] text-gray-500" >
                                Package left the vendor warehouse. Enter target sorting depot once it arrives:
                              </p>
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold block">Reached Logistics Hub</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Bangalore Outer Sorting Depot"
                                  value={tempCurrentLocation}
                                  onChange={(e) => setTempCurrentLocation(e.target.value)}
                                  className="w-full text-xs p-2.5 bg-white border border-gray-150 rounded-xl focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateAdminLogistics(o.id, 'LOGISTICS_CENTER', { 
                                  current_location: tempCurrentLocation || 'National Sorting Center',
                                  notes: `Parcel successfully arrived at municipal hub: ${tempCurrentLocation || 'National Sorting Center'}.`
                                })}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Mark Reached Logistics Hub 🏢
                              </button>
                            </div>
                          )}

                          {/* STAGE: LOGISTICS_CENTER */}
                          {o.status === 'LOGISTICS_CENTER' && (
                            <div className="space-y-3 font-sans">
                              <p className="text-[10px] text-gray-500">
                                Package reached logistics terminal: **{o.current_location || 'Central Sorting Hub'}**. Dispatch for highway transport.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleUpdateAdminLogistics(o.id, 'IN_TRANSIT', { notes: 'Shipment cleared municipal sorting, loaded into highway logistics trailer.' })}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Launch In Highway Transit 🛣
                              </button>
                            </div>
                          )}

                          {/* STAGE: IN_TRANSIT */}
                          {o.status === 'IN_TRANSIT' && (
                            <div className="space-y-3 font-sans">
                              <p className="text-[10px] text-gray-500 leading-normal">
                                Trailer is active on state highways. You can either update current location checkpoint or hand off to final-mile delivery partner.
                              </p>
                              <div className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-150">
                                <label className="text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold block">Current Checkpoint Location</label>
                                <div className="flex gap-1.5 mt-1">
                                  <input
                                    type="text"
                                    placeholder="e.g. Pune Highway Gate #4"
                                    value={tempCurrentLocation}
                                    onChange={(e) => setTempCurrentLocation(e.target.value)}
                                    className="flex-1 text-xs p-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!tempCurrentLocation) return;
                                      handleUpdateAdminLogistics(o.id, 'IN_TRANSIT', { 
                                        current_location: tempCurrentLocation,
                                        notes: `Transit check-in: Parcel reached ${tempCurrentLocation}.`
                                      });
                                    }}
                                    className="p-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-[10px] tracking-wide"
                                  >
                                    Update
                                  </button>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateAdminLogistics(o.id, 'OUT_FOR_DELIVERY', { notes: 'Arrived at destination city cluster. Package assigned to final mile delivery executive.' })}
                                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Mark Out For Final Delivery 🚴...
                              </button>
                            </div>
                          )}

                          {/* STAGE: OUT_FOR_DELIVERY */}
                          {o.status === 'OUT_FOR_DELIVERY' && (
                            <div className="space-y-3 font-sans">
                              <p className="text-[10px] text-gray-500 leading-normal">
                                Delivering to client address. Confirm successful drop-off with customer verification / Proof of Delivery (POD) comment:
                              </p>
                              <div className="p-3 bg-amber-50/65 border border-amber-100 rounded-2xl space-y-2">
                                <label className="text-[10px] uppercase tracking-wider text-amber-800 font-mono font-bold block mb-1">
                                  Customer Verification OTP * (Retrieve from Buyer)
                                </label>
                                <input
                                  type="text"
                                  maxLength={6}
                                  placeholder="Enter 6-digit OTP code (e.g. 529184)"
                                  value={tempDeliveryOtp}
                                  onChange={(e) => setTempDeliveryOtp(e.target.value)}
                                  className="w-full text-xs p-2.5 rounded-xl bg-white border border-amber-200 focus:outline-none font-mono font-bold text-center tracking-widest text-amber-950"
                                />
                                <p className="text-[9px] text-amber-600 leading-tight">
                                  Please ask the buyer for their 6-digit secure verification PIN. The delivery cannot be completed without a matching OTP.
                                </p>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold block">POD Sign / Proof Detail</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Handed to John Doe (OTP Verified)"
                                  value={tempPodSignature}
                                  onChange={(e) => setTempPodSignature(e.target.value)}
                                  className="w-full text-xs p-2 rounded-xl bg-white border border-gray-150 focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateAdminLogistics(o.id, 'DELIVERED', { 
                                  pod_signature: tempPodSignature || 'Verified Signature',
                                  delivery_otp: tempDeliveryOtp,
                                  notes: `Transaction completed successfully. Drop off confirmed: ${tempPodSignature || 'Verified Signature'}.`
                                })}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Mark Order Delivered successfully ✔
                              </button>
                            </div>
                          )}

                          {/* STAGE: DELIVERED */}
                          {o.status === 'DELIVERED' && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-[11px] leading-relaxed space-y-1">
                              <strong>✔ Order drop-off fully verified:</strong>
                              <p className="text-gray-600">Product delivered. Shipping cycle closed. Waiting for user actions or return tickets, if any.</p>
                              {o.pod_signature && (
                                <div className="text-[10px] bg-white/60 p-1.5 rounded-lg font-mono font-bold text-emerald-800 mt-1">
                                  POD: {o.pod_signature}
                                </div>
                              )}
                            </div>
                          )}

                          {/* STAGE: PENDING_RETURN */}
                          {o.status === 'PENDING_RETURN' && (
                            <div className="space-y-3 font-sans">
                              <div className="bg-amber-50 p-2.5 rounded-xl text-amber-900 text-[10.5px] border border-amber-100 leading-normal">
                                <strong>⚠️ Return Request initiated:</strong>
                                <p className="text-gray-650 font-medium">Reason given: "{o.return_reason || 'Product quality did not meet expectation'}"</p>
                              </div>
                              <p className="text-[10.5px] text-gray-500 leading-normal">
                                Approving the return request will instantly restock the active database inventories and issue full wallet cash refund back to the customer instantly.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAdminLogistics(o.id, 'RETURNED', { notes: 'Return request verified and approved. Credit balance auto-refunded and stock returned.' })}
                                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                                >
                                  Approve & Auto-Refund ✔
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const r = prompt("Please enter the reason for rejecting this return ticket:");
                                    if (r) {
                                      handleUpdateAdminLogistics(o.id, 'DELIVERED', { notes: `Return ticket rejected by Admin: ${r}` });
                                    }
                                  }}
                                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer"
                                >
                                  Reject Ticket ✕
                                </button>
                              </div>
                            </div>
                          )}

                          {/* STAGE: RETURNED */}
                          {o.status === 'RETURNED' && (
                            <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-2xl text-indigo-850 text-[10.5px] space-y-1 leading-normal">
                              <strong>📦 Return & Refund Settled:</strong>
                              <p className="text-gray-650">Approved. Wallet refund fully executed and products safely returned into active inventory stock pools.</p>
                            </div>
                          )}

                          {/* STAGE: CANCELLED */}
                          {o.status === 'CANCELLED' && (
                            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-[10.5px] leading-normal space-y-2">
                              <strong>✕ Shipment Cancelled:</strong>
                              <p className="text-gray-600">This order is cancelled and archived.</p>
                              
                              <button
                                type="button"
                                onClick={() => handleUpdateAdminLogistics(o.id, 'PENDING', { notes: 'Order reopened by Admin. Shipping pipeline reset and restarted.' })}
                                className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-[9px] uppercase tracking-wider cursor-pointer"
                              >
                                Reopen & Restore Order ↺
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Manual overriding segment (displayed if enforceStrictFlow === false) */}
                      {(!enforceStrictFlow) && (
                        <div className="pt-3 border-t border-gray-100 space-y-2 text-left bg-orange-50/20 p-4 rounded-3xl border border-dashed border-orange-200">
                          <span className="text-[10px] text-amber-850 font-black uppercase tracking-wider flex items-center gap-1 font-mono block">
                            ⚠️ Admin Manual Stage Override
                          </span>
                          <p className="text-[9px] text-gray-500 leading-normal">
                            Direct state modification without safety sequence validations. Best for manual override.
                          </p>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {[
                              { key: 'PENDING', label: '1. Submitted' },
                              { key: 'ACCEPTED', label: '2. Accepted' },
                              { key: 'PREPARING', label: '3. Preparing' },
                              { key: 'PACKED', label: '4. Packed' },
                              { key: 'TRANSPORT_ASSIGNED', label: '5. Bound Lorry' },
                              { key: 'PICKED_UP', label: '6. Picked Up' },
                              { key: 'LOGISTICS_CENTER', label: '7. Reached Depot' },
                              { key: 'IN_TRANSIT', label: '8. Highways' },
                              { key: 'OUT_FOR_DELIVERY', label: '9. Courier Out' },
                              { key: 'DELIVERED', label: '10. Completed drop' },
                              { key: 'PENDING_RETURN', label: '🔄 Claim Return' },
                              { key: 'RETURNED', label: '✔ Settled Return' }
                            ].map((st) => {
                              const isCurrent = o.status === st.key;
                              return (
                                <button
                                  key={st.key}
                                  type="button"
                                  onClick={() => handleUpdateAdminLogistics(o.id, st.key)}
                                  className={`text-center py-2.5 px-2 rounded-xl border transition-all cursor-pointer ${isCurrent ? 'bg-amber-650 bg-amber-600 border-amber-500 text-white font-black' : 'bg-white border-gray-150 hover:bg-gray-50 text-gray-700 text-[10.5px] font-bold'}`}
                                >
                                  <div className="text-[10px] uppercase font-mono tracking-wide">{st.label}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Active Return Request Details Card (Customer Context Info) */}
                      {o.return_reason && (
                        <div className="bg-orange-50/40 border border-orange-100 p-3.5 rounded-2xl space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-orange-900 font-bold uppercase tracking-wider font-mono">Customer Return Ticket</span>
                            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-mono">
                              {o.refund_method || 'WALLET'} refund
                            </span>
                          </div>
                          
                          <div className="space-y-1 mt-1 text-gray-700 text-left">
                            <div>
                              <strong className="text-gray-400 font-mono text-[9px] uppercase block">Reason:</strong>
                              <span className="font-semibold text-gray-900">{o.return_reason}</span>
                            </div>

                            {o.return_notes && (
                              <div className="mt-1">
                                <strong className="text-gray-400 font-mono text-[9px] uppercase block">Client Notes:</strong>
                                <p className="italic text-gray-500 bg-white/60 p-2 rounded-lg border border-gray-100/50 mt-0.5 whitespace-pre-wrap leading-normal">
                                  "{o.return_notes}"
                                </p>
                              </div>
                            )}

                            {o.returned_items && Array.isArray(o.returned_items) && o.returned_items.length > 0 && (
                              <div className="mt-1.5">
                                <strong className="text-gray-400 font-mono text-[9px] uppercase block">Returned Items:</strong>
                                <div className="space-y-1 mt-0.5">
                                  {o.items.filter((it: any) => o.returned_items.includes(it.product.id) || o.returned_items.includes(it.product.name)).map((it: any, iIdx: number) => (
                                    <div key={iIdx} className="bg-white/40 p-1 px-2 border border-gray-100 rounded-lg text-[10.5px] flex justify-between">
                                      <span className="truncate max-w-[70%] font-medium">{it.product.name}</span>
                                      <span className="font-mono text-gray-400 font-bold">x{it.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {o.refunded_amount && (
                              <div className="pt-2 border-t border-orange-100/40 flex justify-between text-[11px] items-center">
                                <span className="font-bold text-gray-600">Settled Refund:</span>
                                <span className="font-mono font-black text-indigo-700">{formatRupee(o.refunded_amount)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Always-visible Logistics Carrier, Lorry, & Waybill Assignment Panel */}
                      <div className="border border-gray-150 rounded-2xl bg-indigo-50/15 p-4 space-y-4">
                        <div className="flex items-center gap-1.5 text-indigo-950">
                          <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <h5 className="text-[11px] font-black uppercase tracking-wider">
                              🚛 Carrier Partner & Lorry Allocation
                            </h5>
                            <p className="text-[9.5px] text-gray-500 leading-normal mt-0.5">
                              Allocate tracking WAYBILLs, transport CARRIER partners, LORRY vehicle plate numbers, and delivery executives for logistics state syncing.
                            </p>
                          </div>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); handleUpdateAdminLogistics(o.id); }} className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9.5px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Carrier / Courier Partner</label>
                            <input
                              type="text"
                              placeholder="e.g. Delhivery, Bluedart, FedEx"
                              value={tempCourierName}
                              onChange={(e) => setTempCourierName(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white border border-gray-150 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[9.5px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Waybill / Track Code</label>
                                <button
                                  type="button"
                                  onClick={() => setTempTrackingId('APX-TRK-' + Math.floor(10000000 + Math.random() * 90000000))}
                                  className="text-[8px] text-indigo-650 font-black hover:underline uppercase tracking-wider"
                                >
                                  Generate ⚡
                                </button>
                              </div>
                              <input
                                type="text"
                                placeholder="APX-TRK-XXXXXXXX"
                                value={tempTrackingId}
                                onChange={(e) => setTempTrackingId(e.target.value)}
                                className="w-full text-xs p-2.5 bg-white border border-gray-150 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9.5px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Lorry No / Vehicle Plate</label>
                              <input
                                type="text"
                                placeholder="e.g. MH-12-PQ-9080 (Lorry)"
                                value={tempVehicleDetails}
                                onChange={(e) => setTempVehicleDetails(e.target.value)}
                                className="w-full text-xs p-2.5 bg-white border border-gray-150 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">consignee / driver Agent</label>
                            <input
                              type="text"
                              placeholder="e.g. Ramesh Kumar (Primary Driver)"
                              value={tempDeliveryAgent}
                              onChange={(e) => setTempDeliveryAgent(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white border border-gray-150 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <label className="text-[9.5px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Package weight</label>
                              <input
                                type="text"
                                placeholder="e.g. 4.8 kg"
                                value={tempPackageWeight}
                                onChange={(e) => setTempPackageWeight(e.target.value)}
                                className="w-full text-xs p-2.5 bg-white border border-gray-150 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9.5px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Dimensions (LxWxH)</label>
                              <input
                                type="text"
                                placeholder="e.g. 30x20x15 cm"
                                value={tempPackageDimensions}
                                onChange={(e) => setTempPackageDimensions(e.target.value)}
                                className="w-full text-xs p-2.5 bg-white border border-gray-150 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Expected date arrival</label>
                            <input
                              type="date"
                              value={tempExpectedDeliveryDate ? tempExpectedDeliveryDate.split('T')[0] : ''}
                              onChange={(e) => setTempExpectedDeliveryDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                              className="w-full text-xs p-2.5 bg-white border border-gray-150 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                            />
                          </div>

                          <div className="pt-2 flex gap-2">
                            <button
                              type="submit"
                              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Save Logistics & Vehicle Details</span>
                            </button>
                          </div>
                        </form>
                      </div>

                    </div>
                  );
                })()}

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
