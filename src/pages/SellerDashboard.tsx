/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, addNotification } from '../store';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, Landmark, HelpCircle, Plus, 
  Trash2, Edit3, ArrowUpRight, RefreshCw, Loader2, Coins, 
  BarChart3, Sparkles, Check, CheckCircle2, AlertCircle, Search, MessageSquare 
} from 'lucide-react';
import axios from 'axios';
import { useCurrency } from '../utils';

interface WalletTx {
  id: string;
  amount: number;
  type: 'EARNING' | 'WITHDRAW' | 'GST_TAX' | 'DELIVERY';
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: string;
  notes?: string;
}

interface WithdrawRequest {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bankDetails: string;
  createdAt: string;
}

interface SellerWallet {
  balance: number;
  transactions: WalletTx[];
  withdrawRequests: WithdrawRequest[];
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const { user } = useSelector((state: RootState) => state.auth);
  const { formatPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState<'inventory' | 'wallet' | 'qa' | 'orders'>('inventory');
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [wallet, setWallet] = useState<SellerWallet>({ balance: 0, transactions: [], withdrawRequests: [] });
  const [products, setProducts] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Search & Filter
  const [productQuery, setProductQuery] = useState('');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [orderSubFilter, setOrderSubFilter] = useState<'NEW' | 'PROCESSING' | 'PACKED' | 'COMPLETED'>('NEW');

  // Order Transition Action States
  const [actionNotes, setActionNotes] = useState('');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [showCancelPromptId, setShowCancelPromptId] = useState<string | null>(null);

  // Advanced Transit Console States matching Admin
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [tempCourierName, setTempCourierName] = useState('');
  const [tempTrackingId, setTempTrackingId] = useState('');
  const [tempVehicleDetails, setTempVehicleDetails] = useState('');
  const [tempDeliveryAgent, setTempDeliveryAgent] = useState('');
  const [tempExpectedDeliveryDate, setTempExpectedDeliveryDate] = useState('');
  
  // Modals & Form overlays
  const [showProductModal, setShowProductModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Product Form states
  const [pName, setPName] = useState('');
  const [pBrand, setPBrand] = useState('');
  const [pPrice, setPPrice] = useState<number>(0);
  const [pOrigPrice, setPOrigPrice] = useState<number>(0);
  const [pCategory, setPCategory] = useState('electronics');
  const [pStock, setPStock] = useState<number>(10);
  const [pDesc, setPDesc] = useState('');
  const [pImage, setPImage] = useState('');
  const [pSpecs, setPSpecs] = useState<Record<string, string>>({
    "Colors": "Cosmic Silver, Charcoal",
    "Warranty": "1 Year Manufacturer Warranty"
  });
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

  // Withdraw Form states
  const [wAmount, setWAmount] = useState<number>(0);
  const [wBankName, setWBankName] = useState('');
  const [wAccNumber, setWAccNumber] = useState('');
  const [wIfsc, setWIfsc] = useState('');

  // QA Replying state
  const [replyingQId, setReplyingQId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Double check authorization
  useEffect(() => {
    if (!user || user.role !== 'SELLER') {
      dispatch(addNotification({
        title: 'Unauthorized Access',
        message: 'Authenticate via a Seller role account to launch dashboards.',
        type: 'AUTH'
      }));
      navigate('/auth');
      return;
    }
    loadAllSellerData();
  }, [user]);

  const loadAllSellerData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Load Seller Wallet
      const walletRes = await axios.get(`/api/seller/wallet/${user.id}`);
      setWallet(walletRes.data);

      // 2. Load Seller Products (including unapproved)
      const prodRes = await axios.get(`/api/products?sellerId=${user.id}&includeUnapproved=true`);
      setProducts(prodRes.data);

      // 3. Load Questions asked on Seller's products
      const qaRes = await axios.get(`/api/seller/questions/${user.id}`);
      setQuestions(qaRes.data);

      // 4. Load Seller Orders
      const ordersRes = await axios.get('/api/orders');
      const filteredOrders = ordersRes.data.filter((o: any) =>
        o.items.some((item: any) => item.product.sellerId === user.id)
      );
      setOrders(filteredOrders.reverse());
    } catch (err) {
      console.error('Error loading Seller dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSellerStatusChange = async (
    orderId: string, 
    nextStatus: string,
    extraFields: {
      courier_name?: string;
      tracking_id?: string;
      vehicle_details?: string;
      delivery_agent?: string;
      expected_delivery_date?: string;
    } = {}
  ) => {
    try {
      setLoading(true);
      const headers = {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-user-name': user.storeName || user.name
      };
      await axios.put(`/api/orders/${orderId}/seller-status`, {
        nextStatus,
        notes: actionNotes,
        ...extraFields
      }, { headers });

      dispatch(addNotification({
        title: 'Fulfillment Sequence Shifted',
        message: `Successfully transitioned order sequence stage to ${nextStatus}!`,
        type: 'ORDER'
      }));
      setActionNotes('');
      // Refresh current registers
      await loadAllSellerData();
    } catch (err: any) {
      dispatch(addNotification({
        title: 'Action Staged Denied',
        message: err.response?.data?.error || 'Action sequence denied: Verify roles and exact sequence steps.',
        type: 'ORDER'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSellerLogistics = async (orderId: string, nextStatus?: string) => {
    const payload: any = {
      courier_name: tempCourierName,
      tracking_id: tempTrackingId,
      vehicle_details: tempVehicleDetails,
      delivery_agent: tempDeliveryAgent,
      expected_delivery_date: tempExpectedDeliveryDate
    };

    if (nextStatus) {
      payload.nextStatus = nextStatus;
    } else {
      const o = orders.find(ord => ord.id === orderId);
      if (o) payload.nextStatus = o.status;
    }

    try {
      setLoading(true);
      const headers = {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-user-name': user.storeName || user.name
      };

      await axios.put(`/api/orders/${orderId}/seller-status`, payload, { headers });

      dispatch(addNotification({
        title: 'Shipment Registry Updated',
        message: nextStatus 
          ? `Successfully transitioned stage to ${nextStatus}!`
          : 'Successfully saved shipment carrier details!',
        type: 'ORDER'
      }));

      setActionNotes('');
      await loadAllSellerData();
    } catch (err: any) {
      dispatch(addNotification({
        title: 'Logistical Sequence Refused',
        message: err.response?.data?.error || 'Failed to update transit records. Check permissions.',
        type: 'ORDER'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSellerDeclineOrder = async (orderId: string) => {
    if (!cancelReasonText.trim()) {
      dispatch(addNotification({
        title: 'Decline Failed',
        message: 'A mandatory decline reason must be written.',
        type: 'ORDER'
      }));
      return;
    }
    try {
      setLoading(true);
      const headers = {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-user-name': user.storeName || user.name
      };
      await axios.post(`/api/orders/${orderId}/seller-cancel`, {
        reason: cancelReasonText
      }, { headers });

      dispatch(addNotification({
        title: 'Customer Order Rejected',
        message: 'Order was successfully declined & cancelled.',
        type: 'ORDER'
      }));
      setCancelReasonText('');
      setShowCancelPromptId(null);
      await loadAllSellerData();
    } catch (err: any) {
      dispatch(addNotification({
        title: 'Refusal Failed',
        message: err.response?.data?.error || 'Failed to reject order candidate.',
        type: 'ORDER'
      }));
    } finally {
      setLoading(false);
    }
  };

  // Add Spec Helper
  const handleAddSpecField = () => {
    if (!newSpecKey.trim() || !newSpecValue.trim()) return;
    setPSpecs(prev => ({
      ...prev,
      [newSpecKey.trim()]: newSpecValue.trim()
    }));
    setNewSpecKey('');
    setNewSpecValue('');
  };

  // Remove Spec Helper
  const handleRemoveSpecField = (keyName: string) => {
    const updated = { ...pSpecs };
    delete updated[keyName];
    setPSpecs(updated);
  };

  // Product submission
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pPrice || !pImage) {
      alert('Please fill out Product Name, price, and image details.');
      return;
    }

    const payload = {
      name: pName,
      brand: pBrand || 'Generic Store Brand',
      price: Number(pPrice),
      originalPrice: Number(pOrigPrice || pPrice),
      category: pCategory,
      stock: Number(pStock),
      description: pDesc,
      images: [pImage],
      specifications: pSpecs,
      sellerId: user?.id,
      sellerName: user?.storeName || user?.name
    };

    try {
      if (editingId) {
        // UPDATE
        const res = await axios.put(`/api/products/${editingId}`, payload);
        dispatch(addNotification({
          title: 'Product Catalog Saved',
          message: `${pName} has been re-submitted for approval successfully.`,
          type: 'ADMIN'
        }));
      } else {
        // CREATE
        await axios.post('/api/products', payload);
        dispatch(addNotification({
          title: 'Product Staged for Approval',
          message: `${pName} is waiting admin verification before public listing.`,
          type: 'ADMIN'
        }));
      }
      
      setShowProductModal(false);
      resetProductForm();
      loadAllSellerData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Product operation failed.');
    }
  };

  const resetProductForm = () => {
    setEditingId(null);
    setPName('');
    setPBrand('');
    setPPrice(0);
    setPOrigPrice(0);
    setPCategory('electronics');
    setPStock(10);
    setPDesc('');
    setPImage('');
    setPSpecs({
      "Colors": "Cosmic Silver, Charcoal",
      "Warranty": "1 Year Manufacturer Warranty"
    });
  };

  // Open Edit Dialog
  const handleOpenEdit = (p: any) => {
    setEditingId(p.id);
    setPName(p.name);
    setPBrand(p.brand);
    setPPrice(p.price);
    setPOrigPrice(p.originalPrice || p.price);
    setPCategory(p.category);
    setPStock(p.stock);
    setPDesc(p.description);
    setPImage(p.images?.[0] || '');
    setPSpecs(p.specifications || {});
    setShowProductModal(true);
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete this listing permanently from the server?')) return;
    try {
      await axios.delete(`/api/products/${id}`);
      dispatch(addNotification({
        title: 'Listing Removed',
        message: 'Selected item deleted from your catalog records.',
        type: 'ADMIN'
      }));
      loadAllSellerData();
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Withdraw
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wAmount <= 0) {
      alert('Withdraw amount must be positive.');
      return;
    }
    if (wAmount > wallet.balance) {
      alert('Withdrawal request exceeds current active wallet balance.');
      return;
    }
    if (!wBankName || !wAccNumber || !wIfsc) {
      alert('All bank payout details are required.');
      return;
    }

    try {
      await axios.post(`/api/seller/withdraw/${user?.id}`, {
        amount: Number(wAmount),
        bankDetails: `${wBankName} - A/C ${wAccNumber} - IFSC ${wIfsc}`
      });

      dispatch(addNotification({
        title: 'Withdrawal Pending Approval',
        message: `Your disbursement of ₹${wAmount} is queued with safety audit.`,
        type: 'ORDER'
      }));

      setShowWithdrawModal(false);
      setWAmount(0);
      setWBankName('');
      setWAccNumber('');
      setWIfsc('');
      loadAllSellerData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Disbursement request failed.');
    }
  };

  // Answer Questions
  const handleAnswerSubmit = async (e: React.FormEvent, questionId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await axios.post('/api/seller/answers', {
        questionId,
        answerText: replyText.trim(),
        senderName: user?.storeName || user?.name
      });

      dispatch(addNotification({
        title: 'Shopper Question Replied',
        message: 'Your response publishes direct onto product listing desks.',
        type: 'OFFER'
      }));

      setReplyingQId(null);
      setReplyText('');
      loadAllSellerData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(productQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(productQuery.toLowerCase())
  );

  const pendingApprovalCount = products.filter(p => !p.isApproved).length;
  const activeProductsCount = products.filter(p => p.isApproved).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans bg-gray-50/10">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
        <div>
          <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wide bg-indigo-50 px-2.5 py-1 rounded-full">
            Verified Seller Console: {user?.gstin || 'RESTRICTED'}
          </span>
          <h1 className="text-xl font-black text-gray-900 mt-2 font-sans flex items-center gap-2">
            Storefront: <span className="text-indigo-605 text-indigo-650">{user?.storeName || 'My Outlet Store'}</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">{user?.storeDescription || 'Premium verified trading storefront dashboard.'}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={loadAllSellerData}
            className="p-2 border border-gray-100 hover:bg-gray-50 text-gray-500 rounded-xl transition-all cursor-pointer"
            title="Sync Records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => { resetProductForm(); setShowProductModal(true); }}
            className="px-4 py-2 bg-indigo-605 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            <span>Launch New Product</span>
          </button>
        </div>
      </div>

      {/* THREE BENTO ANALYTIC STATS BOARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        
        {/* Board 1: Live balance */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600">
            <Coins className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Disbursable Balance</span>
            <h3 className="text-lg font-black text-gray-900 mt-1 font-mono">{formatPrice(wallet.balance)}</h3>
            <button 
              onClick={() => setShowWithdrawModal(true)}
              disabled={wallet.balance <= 0}
              className="text-[10px] font-bold text-indigo-600 hover:underline mt-1 bg-transparent block"
            >
              Transfer to Bank &rarr;
            </button>
          </div>
        </div>

        {/* Board 2: Seller Products */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Total Staged Items</span>
            <h3 className="text-lg font-black text-gray-900 mt-1 font-mono">{products.length} Products</h3>
            <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
              <span className="text-emerald-600">{activeProductsCount} Live</span> &bull; <span className="text-amber-550 text-amber-600">{pendingApprovalCount} Pending</span>
            </span>
          </div>
        </div>

        {/* Board 3: Q&A Inquiries */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-sky-50 text-sky-600">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Shopper Questions</span>
            <h3 className="text-lg font-black text-gray-900 mt-1 font-mono">{questions.length} Inquiries</h3>
            <span className="text-[10px] text-rose-500 font-bold block mt-0.5 animate-pulse">
              {questions.filter(q => !q.answerText).length} Unanswered Desk Tickets
            </span>
          </div>
        </div>

        {/* Board 4: Status Monitor */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">KYC Compliance</span>
            <h3 className="text-xs font-black text-emerald-600 mt-1 bg-emerald-50 px-2 py-0.5 rounded-md w-fit flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>KYC APPROVED</span>
            </h3>
            <span className="text-[9px] text-gray-450 text-gray-400 block mt-1 leading-normal font-medium">Standard 18% GST tier automatically selected.</span>
          </div>
        </div>

      </div>

      {/* TABS CONTROLLER BAR */}
      <div className="flex border-b border-gray-100 mt-8 gap-6 overflow-x-auto whitespace-nowrap scrollbar-none font-sans">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-xs font-bold leading-none border-b-2 transition-all cursor-pointer ${activeTab === 'inventory' ? 'border-b-indigo-600 text-indigo-600' : 'border-b-transparent text-gray-400 hover:text-gray-700'}`}
        >
          My Inventory Desk ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          className={`pb-3 text-xs font-bold leading-none border-b-2 transition-all cursor-pointer ${activeTab === 'wallet' ? 'border-b-indigo-600 text-indigo-600' : 'border-b-transparent text-gray-400 hover:text-gray-700'}`}
        >
          Wallet Ledger ({wallet.transactions?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('qa')}
          className={`pb-3 text-xs font-bold leading-none border-b-2 transition-all cursor-pointer ${activeTab === 'qa' ? 'border-b-indigo-600 text-indigo-600' : 'border-b-transparent text-gray-400 hover:text-gray-700'}`}
        >
          Customer Service Q&A Desk ({questions.filter(q => !q.answerText).length} new)
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-xs font-bold leading-none border-b-2 transition-all cursor-pointer ${activeTab === 'orders' ? 'border-b-indigo-600 text-indigo-600' : 'border-b-transparent text-gray-400 hover:text-gray-700'}`}
        >
          My Seller Orders ({orders.length})
        </button>
      </div>

      {loading && (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-bold font-mono text-gray-400 mt-3 uppercase tracking-widest">Syncing Port 3000 Node ledgers...</p>
        </div>
      )}

      {/* VIEW TABS ROUTER ELEMENT */}
      {!loading && (
        <div className="mt-6">

          {/* TAB 1: INVENTORY DESK */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="Search my inventory catalog..."
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-100 bg-white text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider font-mono">
                  Displaying {filteredProducts.length} of {products.length} records
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="bg-white border border-gray-100 p-12 text-center rounded-3xl">
                  <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
                  <h3 className="text-sm font-bold text-gray-900 mt-4">No product listing matches found</h3>
                  <p className="text-xs text-gray-400 mt-1">Setup listings and publish parameters using the launch button.</p>
                  <button 
                    onClick={() => setShowProductModal(true)} 
                    className="mt-4 px-4 py-1.5 bg-indigo-650 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-lg transition-all"
                  >
                    Launch First Item Listings
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">
                        <tr>
                          <th className="p-4">Listing Detail</th>
                          <th className="p-4">Category</th>
                          <th className="p-4 text-right">Price</th>
                          <th className="p-4 text-center">Remaining Stock</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-all font-medium">
                            <td className="p-4 flex gap-3.5 items-center">
                              <img 
                                src={p.images?.[0] || 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=200'} 
                                alt={p.name} 
                                className="w-11 h-11 rounded-xl object-contain bg-neutral-50 p-1 border border-neutral-100 flex-shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <h4 className="font-bold text-gray-900 truncate hover:text-indigo-600 cursor-pointer" onClick={() => navigate(`/product/${p.id}`)}>{p.name}</h4>
                                <span className="text-[10px] text-gray-400 uppercase font-bold font-mono tracking-wider">{p.brand}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono">
                                {p.category}
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono text-gray-900 font-bold">
                              {formatPrice(p.price)}
                              {p.originalPrice > p.price && (
                                <span className="text-[10px] text-rose-500 line-through block font-normal mt-0.5">{formatPrice(p.originalPrice)}</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold ${p.stock < 5 ? 'bg-rose-50 text-rose-600 font-bold border border-rose-100/30' : 'bg-gray-50 text-gray-600'}`}>
                                {p.stock} units
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {p.isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold font-mono tracking-wider border border-emerald-100/30">
                                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                                  <span>APPROVED & LIVE</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold font-mono tracking-wider border border-amber-100/30">
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                                  <span>PENDING ADMIN</span>
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => handleOpenEdit(p)}
                                  className="p-1 text-gray-450 hover:text-indigo-650 hover:bg-indigo-50 p-1.5 rounded-lg transition-all"
                                  title="Edit Specs"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1 text-gray-450 hover:text-rose-550 hover:bg-rose-50 p-1.5 rounded-lg transition-all"
                                  title="Prune Product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WALLET LEDGER */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              
              {/* Wallet Summary Cards Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side: bank status */}
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Direct Bank Payout Porthole</h3>
                    <p className="text-[11px] text-gray-400 leading-normal mt-1">Disbursements sync directly with your registered Bank Accounts within 24 hours.</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 font-mono text-[11px] font-semibold text-gray-650">
                    <div className="flex justify-between">
                      <span className="text-gray-450 text-gray-400">Account Tier:</span>
                      <span className="text-indigo-650 text-indigo-600 font-bold">Standard Commerce Ledger</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-450 text-gray-400">Merchant GSTIN:</span>
                      <span>{user?.gstin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-450 text-gray-400">Payment Standard:</span>
                      <span>Stripe Connect Sandbox</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={wallet.balance <= 0}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                  >
                    Submit Withdrawal Payout
                  </button>
                </div>

                {/* Right side: Native interactive visual charts representing standard payment growth */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Simulated Ledger Growth Performance</h3>
                    <p className="text-xs text-indigo-500 font-medium">Earnings and deposits generated on port 3000 over the past 30 days.</p>
                  </div>

                  {/* SVG line chart */}
                  <div className="h-40 w-full relative mt-4">
                    <svg className="w-full h-full overflow-visible font-mono" viewBox="0 0 600 150" preserveAspectRatio="none">
                      {/* Grid overlays */}
                      <line x1="0" y1="20" x2="600" y2="20" stroke="#f9fafb" strokeWidth="1" />
                      <line x1="0" y1="75" x2="600" y2="75" stroke="#f3f4f6" strokeWidth="1" />
                      <line x1="0" y1="130" x2="600" y2="130" stroke="#f3f4f6" strokeWidth="1" />

                      <defs>
                        <linearGradient id="walletGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <path
                        d="M 50 120 L 150 100 L 250 110 L 350 50 L 450 70 L 550 25"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      <path
                        d="M 50 120 L 150 100 L 250 110 L 350 50 L 450 70 L 550 25 L 550 150 L 50 150 Z"
                        fill="url(#walletGlow)"
                      />

                      <circle cx="50" cy="120" r="4.5" fill="#10b981" stroke="white" strokeWidth="2.5" />
                      <circle cx="150" cy="100" r="4.5" fill="#10b981" stroke="white" strokeWidth="2.5" />
                      <circle cx="250" cy="110" r="4.5" fill="#10b981" stroke="white" strokeWidth="2.5" />
                      <circle cx="350" cy="50" r="4.5" fill="#10b981" stroke="white" strokeWidth="2.5" />
                      <circle cx="450" cy="70" r="4.5" fill="#10b981" stroke="white" strokeWidth="2.5" />
                      <circle cx="550" cy="25" r="4.5" fill="#10b981" stroke="white" strokeWidth="2.5" />
                    </svg>

                    <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase mt-2 px-6 font-mono">
                      <span>Day 1: ₹5,000</span>
                      <span>Day 10: ₹12,000</span>
                      <span>Day 20: ₹35,000</span>
                      <span>Day 30: ₹85,300</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Transactions list split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* 1. Wallet transactions list */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Wallet Statement ledger</h3>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded">All History</span>
                  </div>

                  {wallet.transactions?.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 font-medium">No payout transactions recorded yet.</div>
                  ) : (
                    <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                      {wallet.transactions?.map((tx) => (
                        <div key={tx.id} className="p-3 bg-gray-50 rounded-2xl flex justify-between items-start text-xs border border-gray-100/50">
                          <div>
                            <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded uppercase tracking-wide ${tx.type === 'EARNING' ? 'bg-emerald-50 text-emerald-700' : tx.type === 'GST_TAX' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                              {tx.type}
                            </span>
                            <p className="font-semibold text-gray-800 mt-1">{tx.notes || 'Commerce Sandbox Transfer'}</p>
                            <span className="text-[9px] text-gray-400 block font-mono mt-0.5">{new Date(tx.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-right font-mono font-bold">
                            <span className={tx.amount > 0 ? 'text-emerald-600' : 'text-gray-900'}>
                              {tx.amount > 0 ? '+' : ''}{formatPrice(tx.amount)}
                            </span>
                            <span className="text-[9px] text-emerald-650 text-emerald-600 block mt-0.5">{tx.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Bank withdrawal requests queue */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Disbursement Requests Queue</h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono font-bold px-2 py-0.5 rounded">Bank Payouts</span>
                  </div>

                  {wallet.withdrawRequests?.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 font-medium">No disbursement requests lodged yet.</div>
                  ) : (
                    <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                      {wallet.withdrawRequests?.map((wr) => (
                        <div key={wr.id} className="p-3 bg-gray-50 rounded-2xl flex justify-between items-start text-xs border border-gray-100/50">
                          <div>
                            <span className="font-bold text-gray-850 font-mono text-gray-800">Payout ID: {wr.id}</span>
                            <p className="text-[10px] text-gray-500 font-medium mt-1 leading-normal">
                              Bank: <span className="font-semibold font-mono text-gray-600">{wr.bankDetails}</span>
                            </p>
                            <span className="text-[9px] text-gray-400 block font-mono mt-0.5">{new Date(wr.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-gray-850 text-gray-800">{formatPrice(wr.amount)}</span>
                            <span className={`text-[10px] font-bold block mt-1 uppercase tracking-wider font-mono ${wr.status === 'APPROVED' ? 'text-emerald-600' : wr.status === 'PENDING' ? 'text-amber-500 animate-pulse' : 'text-rose-500'}`}>
                              {wr.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: CUSTOMER QA DESK */}
          {activeTab === 'qa' && (
            <div className="space-y-4">
              
              <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-4 flex gap-3 text-xs leading-normal text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-550 text-amber-500 flex-shrink-0" />
                <div>
                  <span className="font-bold">Expert Interaction Guideline:</span> Answer user questions directly. These answers sync instantly under the Product FAQ panel on Customer shopping product details pages, drastically driving up conversion metrics!
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto" />
                  <h3 className="text-sm font-bold text-gray-900 mt-4">Safe & Sound: Desk is Entirely Clear</h3>
                  <p className="text-xs text-gray-400 mt-1">Customers haven't submitted inquiries regarding your staged catalog listings yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-5 justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-gray-50 text-gray-500 px-2 py-0.5 rounded">
                            {q.productName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono font-bold">{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>

                        <h4 className="text-xs font-bold font-mono text-indigo-950 flex gap-1.5 items-start">
                          <span className="bg-indigo-50 text-indigo-650 px-1 py-0.5 rounded text-[10px] font-black font-sans leading-none flex-shrink-0">Q.</span>
                          <span>{q.questionText}</span>
                        </h4>

                        <span className="text-[10px] text-gray-400 block font-medium">Asked by verified buyer ID: <strong className="font-semibold">{q.askedBy}</strong></span>

                        {q.answerText ? (
                          <div className="bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100/20 text-xs text-gray-700 leading-normal mt-3 flex gap-2">
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black h-fit px-1.5 py-0.5 rounded leading-none flex-shrink-0">A.</span>
                            <div>
                              <p className="font-semibold">{q.answerText}</p>
                              <span className="text-[9px] text-gray-400 block font-bold font-mono mt-1">Answered by: {q.answeredBy || 'Verified merchant storefront'}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2">
                            {replyingQId === q.id ? (
                              <form onSubmit={(e) => handleAnswerSubmit(e, q.id)} className="space-y-3.5 max-w-xl">
                                <textarea
                                  required
                                  rows={3}
                                  placeholder="Formulate accurate commercial answer to help prospective buyers..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="w-full text-xs p-3 border border-gray-150 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <div className="flex justify-end gap-2 text-xs">
                                  <button
                                    type="button" onClick={() => { setReplyingQId(null); setReplyText(''); }}
                                    className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-650 text-gray-500 font-bold rounded-lg transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                                  >
                                    Publish Answer
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                onClick={() => setReplyingQId(q.id)}
                                className="px-4 py-1.5 border border-indigo-100 text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                              >
                                <span>Answer this Inquirer</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 4: SELLER ORDERS HUB */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              
              {/* Stat Cards row with dynamic indicators */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setOrderSubFilter('NEW')}
                  className={`p-4 rounded-3xl border text-left transition-all ${orderSubFilter === 'NEW' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100/50' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider font-mono">New Orders</div>
                  <div className="text-xl font-black font-mono mt-1">
                    {orders.filter(o => o.status === 'PENDING').length}
                  </div>
                </button>

                <button
                  onClick={() => setOrderSubFilter('PROCESSING')}
                  className={`p-4 rounded-3xl border text-left transition-all ${orderSubFilter === 'PROCESSING' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100/50' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider font-mono">Processing</div>
                  <div className="text-xl font-black font-mono mt-1">
                    {orders.filter(o => ['ACCEPTED', 'PREPARING'].includes(o.status)).length}
                  </div>
                </button>

                <button
                  onClick={() => setOrderSubFilter('PACKED')}
                  className={`p-4 rounded-3xl border text-left transition-all ${orderSubFilter === 'PACKED' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100/50' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider font-mono">Packed</div>
                  <div className="text-xl font-black font-mono mt-1">
                    {orders.filter(o => o.status === 'PACKED').length}
                  </div>
                </button>

                <button
                  onClick={() => setOrderSubFilter('COMPLETED')}
                  className={`p-4 rounded-3xl border text-left transition-all ${orderSubFilter === 'COMPLETED' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100/50' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider font-mono">Completed / Shipped</div>
                  <div className="text-xl font-black font-mono mt-1">
                    {orders.filter(o => !['PENDING', 'ACCEPTED', 'PREPARING', 'PACKED', 'CANCELLED'].includes(o.status)).length}
                  </div>
                </button>
              </div>

              {/* Filtering Controls */}
              <div className="bg-white p-4 rounded-3xl border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between font-sans">
                <div className="relative w-full md:w-80">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search Order Number, customer, product..."
                    value={ordersSearch}
                    onChange={(e) => setOrdersSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-150 rounded-2xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="text-[11px] text-gray-400 font-medium">
                  Showing matches for <strong className="font-extrabold text-indigo-600 uppercase font-mono">{orderSubFilter}</strong> filter
                </div>
              </div>

              {/* Core Order List */}
              {(() => {
                const subFiltered = orders.filter(o => {
                  if (orderSubFilter === 'NEW') return o.status === 'PENDING';
                  if (orderSubFilter === 'PROCESSING') return ['ACCEPTED', 'PREPARING'].includes(o.status);
                  if (orderSubFilter === 'PACKED') return o.status === 'PACKED';
                  if (orderSubFilter === 'COMPLETED') return !['PENDING', 'ACCEPTED', 'PREPARING', 'PACKED', 'CANCELLED'].includes(o.status);
                  return true;
                });

                const queryFiltered = subFiltered.filter(o => {
                  if (!ordersSearch.trim()) return true;
                  const term = ordersSearch.toLowerCase();
                  return (
                    o.orderNumber.toLowerCase().includes(term) ||
                    o.address?.fullName?.toLowerCase().includes(term) ||
                    o.items.some((item: any) => item.product.name.toLowerCase().includes(term))
                  );
                });

                if (queryFiltered.length === 0) {
                  return (
                    <div className="bg-white p-16 text-center rounded-3xl border border-gray-100 shadow-sm font-sans">
                      <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
                      <h3 className="text-sm font-bold text-gray-900 mt-4">No matching seller orders</h3>
                      <p className="text-xs text-gray-400 mt-1">There are no orders resting in the "{orderSubFilter}" category matching your search criteria.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 font-sans">
                    <div className={`${selectedOrderId ? 'xl:col-span-7' : 'xl:col-span-12'} space-y-5`}>
                      {queryFiltered.map((o: any) => {
                        const isLocked = ['CANCELLED', 'RETURNED'].includes(o.status);
                        
                        return (
                          <div key={o.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Top Heading strip */}
                            <div className="p-5 bg-gray-50/50 border-b border-gray-50 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-black text-indigo-950 uppercase tracking-wide">
                                    Order #{o.orderNumber}
                                  </span>
                                  <span className={`text-[9px] font-bold font-mono tracking-wider px-2 py-0.5 rounded uppercase ${o.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-750 text-indigo-700'}`}>
                                    {o.status}
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1.5 block font-mono">
                                  Date Submitted: {new Date(o.createdAt).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                {o.status !== 'CANCELLED' && o.status !== 'RETURNED' && (
                                  <button
                                    onClick={() => {
                                      setSelectedOrderId(o.id);
                                      setTempCourierName(o.courier_name || '');
                                      setTempTrackingId(o.tracking_id || '');
                                      setTempVehicleDetails(o.vehicle_details || '');
                                      setTempDeliveryAgent(o.delivery_agent || '');
                                      setTempExpectedDeliveryDate(o.expected_delivery_date || '');
                                    }}
                                    className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer text-[10px] uppercase font-mono shadow-sm"
                                  >
                                    Edit Logistics
                                  </button>
                                )}

                                <div className="text-right">
                                  <span className="text-[10px] text-gray-400 font-mono block">Order Split Total</span>
                                  <span className="text-sm font-black text-emerald-600 font-mono">
                                    {formatPrice(o.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0))}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Order Details Body */}
                            <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
                              
                              {/* Products column */}
                              <div className="md:col-span-5 space-y-3 md:border-r md:border-gray-50 md:pr-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Your Store Listings Bought</span>
                                <div className="space-y-2">
                                  {o.items.filter((item: any) => item.product.sellerId === user.id).map((item: any, sIdx: number) => (
                                    <div key={sIdx} className="flex gap-3 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-100/50">
                                      <img 
                                        src={item.product.image} 
                                        alt={item.product.name} 
                                        className="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-gray-100"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-900 truncate">{item.product.name}</h4>
                                        <span className="text-[10px] text-indigo-600 font-bold block mt-0.5 font-mono">
                                          Qty {item.quantity} &bull; {formatPrice(item.price)} each
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Consignee Address */}
                              <div className="md:col-span-3 space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Consignee Coordinates</span>
                                <div className="font-bold text-gray-900">{o.address?.fullName}</div>
                                <p className="text-gray-500 leading-relaxed font-normal">
                                  {o.address?.street}, {o.address?.city}, {o.address?.state} {o.address?.postalCode}, {o.address?.country}
                                </p>
                              </div>

                              {/* Sequential Action panel */}
                              <div className="md:col-span-4 space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Merchant Sequential Pipeline</span>
                                
                                {isLocked ? (
                                  <div className="text-center py-2 space-y-2">
                                    <span className="inline-block p-1.5 bg-gray-100 text-gray-500 rounded-full">
                                      <Check className="w-5 h-5" />
                                    </span>
                                    <p className="text-[10px] text-gray-400 leading-normal font-medium text-left">
                                      {o.status === 'CANCELLED' && `Cancelled. Rejection Source: ${o.cancelled_by}. Reason: "${o.cancel_reason || 'N/A'}"`}
                                      {o.status === 'PENDING_RETURN' && `Return requested by customer: "${o.return_reason}". Comments: "${o.return_notes || 'N/A'}"`}
                                      {o.status === 'RETURNED' && `Return complete: Customer balance refunded.`}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-3 text-xs">
                                    {/* Notes field */}
                                    <div className="space-y-1">
                                      <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Transit Status Notes</label>
                                      <input
                                        type="text"
                                        placeholder="Leave short update note..."
                                        value={actionNotes}
                                        onChange={(e) => setActionNotes(e.target.value)}
                                        className="w-full text-[11px] p-2 bg-white border border-gray-150 rounded-xl focus:outline-none"
                                      />
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 space-y-2">
                                      <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold block mb-1">Apply sequence shift:</span>
                                      
                                      {/* Action button triggers based on sequence constraints */}
                                      {o.status === 'PENDING' && (
                                        <div className="grid grid-cols-2 gap-2">
                                          <button
                                            onClick={() => handleSellerStatusChange(o.id, 'ACCEPTED')}
                                            className="w-full h-8 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer text-[10px] uppercase font-mono"
                                          >
                                            Accept Order
                                          </button>
                                          <button
                                            onClick={() => setShowCancelPromptId(o.id)}
                                            className="w-full h-8 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-all cursor-pointer text-[10px] uppercase font-mono"
                                          >
                                            Decline
                                          </button>
                                        </div>
                                      )}

                                      {o.status === 'ACCEPTED' && (
                                        <button
                                          onClick={() => handleSellerStatusChange(o.id, 'PREPARING')}
                                          className="w-full h-9 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer text-xs uppercase font-mono"
                                        >
                                          Start Preparing (Pick & Prep)
                                        </button>
                                      )}

                                      {o.status === 'PREPARING' && (
                                        <div className="space-y-2">
                                          <button
                                            onClick={() => handleSellerStatusChange(o.id, 'PACKED')}
                                            className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all cursor-pointer text-xs uppercase font-mono flex items-center justify-center gap-1.5"
                                          >
                                            <Check className="w-4 h-4" /> Mark Packed (Prepared)
                                          </button>
                                          <p className="text-[9px] text-amber-600 text-center font-medium leading-normal">⚠️ Completing this step alerts the logistics team. You will retain access until dispatched.</p>
                                        </div>
                                      )}

                                      {!['PENDING', 'ACCEPTED', 'PREPARING'].includes(o.status) && (
                                        <div className="space-y-2">
                                          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-2 text-emerald-800">
                                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div className="text-[10px] font-bold leading-normal">
                                              Current Stage: <span className="font-mono text-indigo-750 text-indigo-700">{o.status}</span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleSellerStatusChange(o.id, o.status)}
                                            className="w-full h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer text-xs uppercase font-mono flex items-center justify-center gap-1.5"
                                          >
                                            Save / Update Status Notes
                                          </button>
                                          <p className="text-[9px] text-gray-400 text-center font-medium leading-normal">Your logistics dashboard access is fully active. You can save/update status notes anytime.</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Rejection Overlay panel */}
                                {showCancelPromptId === o.id && (
                                  <div className="mt-3 bg-red-50 p-2.5 rounded-xl border border-red-100 text-[11px] space-y-2">
                                    <label className="font-bold text-rose-800">Please provide decline reason:</label>
                                    <input
                                      type="text"
                                      placeholder="Enter refusal reason..."
                                      value={cancelReasonText}
                                      onChange={(e) => setCancelReasonText(e.target.value)}
                                      className="w-full p-2 bg-white text-xs border border-red-100 rounded-lg text-gray-800 focus:outline-none"
                                    />
                                    <div className="flex justify-end gap-1.5 pt-1">
                                      <button
                                        onClick={() => { setShowCancelPromptId(null); setCancelReasonText(''); }}
                                        className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-500 font-bold rounded-md"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSellerDeclineOrder(o.id)}
                                        className="px-3 py-1 bg-rose-600 text-white hover:bg-rose-500 font-bold rounded-md"
                                      >
                                        Reject Order
                                      </button>
                                    </div>
                                  </div>
                                )}

                              </div>

                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Transit Master Console right panel */}
                    {selectedOrderId && (() => {
                      const o = orders.find(ord => ord.id === selectedOrderId);
                      if (!o) return null;

                      return (
                        <div className="xl:col-span-5 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4 h-fit sticky top-6">
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

                          {/* Inputs Collection */}
                          <form onSubmit={(e) => { e.preventDefault(); handleUpdateSellerLogistics(o.id); }} className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Carrier Partner</label>
                              <input
                                  type="text"
                                  placeholder="e.g. FedEx Logistics"
                                  value={tempCourierName}
                                  onChange={(e) => setTempCourierName(e.target.value)}
                                  className="w-full text-xs p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Waybill Code / Tracking ID</label>
                              <input
                                  type="text"
                                  placeholder="TRKXXXXXXXXXX"
                                  value={tempTrackingId}
                                  onChange={(e) => setTempTrackingId(e.target.value)}
                                  className="w-full text-xs p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none font-mono focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Vehicle Specifications</label>
                              <input
                                  type="text"
                                  placeholder="e.g. DL-11-AX-9941 (Truck)"
                                  value={tempVehicleDetails}
                                  onChange={(e) => setTempVehicleDetails(e.target.value)}
                                  className="w-full text-xs p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Delivery Executive Name</label>
                              <input
                                  type="text"
                                  placeholder="e.g. Rajesh Singh"
                                  value={tempDeliveryAgent}
                                  onChange={(e) => setTempDeliveryAgent(e.target.value)}
                                  className="w-full text-xs p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-extrabold block">Expected date arrival</label>
                              <input
                                  type="date"
                                  value={tempExpectedDeliveryDate ? tempExpectedDeliveryDate.split('T')[0] : ''}
                                  onChange={(e) => setTempExpectedDeliveryDate(new Date(e.target.value).toISOString())}
                                  className="w-full text-xs p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                              />
                            </div>

                            <div className="pt-2 border-t border-gray-50 flex gap-2 justify-end">
                              <button
                                  type="submit"
                                  className="h-8 px-4 bg-indigo-50/40 border border-indigo-150 text-indigo-650 text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                Save Details Only
                              </button>
                            </div>
                          </form>

                          {/* Active Return Request Details Card */}
                          {o.return_reason && (
                            <div className="bg-orange-50/40 border border-orange-100 p-3.5 rounded-2xl space-y-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-orange-900 font-bold uppercase tracking-wider font-mono">Customer Return Ticket</span>
                                <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-mono">
                                  {o.refund_method || 'WALLET'} refund
                                </span>
                              </div>
                              
                              <div className="space-y-1 mt-1 text-gray-750 text-left">
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
                              </div>
                            </div>
                          )}

                          {/* Sequence Shift buttons */}
                          <div className="pt-3 border-t border-gray-100 space-y-2">
                            <span className="text-[10px] text-indigo-950 font-bold uppercase tracking-wider block">Logistical Stage Shift</span>
                            <div className="grid grid-cols-1 gap-2">
                              {[
                                { key: 'PENDING', label: '1. Set to Pending / New Order', desc: 'Rollback order to newly submitted state' },
                                { key: 'ACCEPTED', label: '2. Accept Order', desc: 'Acknowledge and claim order as accepted' },
                                { key: 'PREPARING', label: '3. Start Preparing (Pick & Prep)', desc: 'Transition to picking and preparation phase' },
                                { key: 'PACKED', label: '4. Mark Packed / Prepared', desc: 'Complete packaging; ready to hand cover to logistics' },
                                { key: 'TRANSPORT_ASSIGNED', label: '5. Assign Transport & Carrier', desc: 'Designate lorry and carrier waybills' },
                                { key: 'PICKED_UP', label: '6. Mark Picked Up', desc: 'Shipment has departed vendor point' },
                                { key: 'LOGISTICS_CENTER', label: '7. Reached Logistics Hub', desc: 'Arrived at municipal terminal' },
                                { key: 'IN_TRANSIT', label: '8. Launch In Transit', desc: 'Long haul trailer highway dispatch' },
                                { key: 'OUT_FOR_DELIVERY', label: '9. Out For Delivery run', desc: 'Driver has package on final route' },
                                { key: 'DELIVERED', label: '10. Confirm Delivered drop', desc: 'Successfully received & completed' },
                                { key: 'PENDING_RETURN', label: 'Acknowledge Return Request', desc: 'Set status to pending return custody' },
                                { key: 'RETURNED', label: 'Approve Return & Refund Wallet', desc: 'Verify return reasons, restitute stock, and auto-issue wallet cash back' }
                              ].map((st) => {
                                const isCurrent = o.status === st.key;
                                return (
                                  <button
                                    key={st.key}
                                    onClick={() => handleUpdateSellerLogistics(o.id, st.key)}
                                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${isCurrent ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold shadow-sm' : 'bg-gray-50 border-gray-100 hover:bg-gray-100 text-gray-700'}`}
                                  >
                                    <div className="text-[10px] font-black uppercase font-mono tracking-wide">{st.label}</div>
                                    <p className="text-[9px] text-gray-400 mt-0.5 leading-normal font-medium">{st.desc}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

            </div>
          )}

        </div>
      )}

      {/* MODAL 1: ADD / EDIT PRODUCT INTERACTIVE BOX */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowProductModal(false)}></div>
          
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-gray-100 shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black text-gray-900 leading-none">
                  {editingId ? 'Edit Staged Product Specification' : 'Launch New Product Showcase'}
                </h3>
                <p className="text-[11px] text-gray-400 tracking-wider mt-1.5 font-medium">Sellers' products are pending approval by default before public listings.</p>
              </div>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-800 text-xs font-bold p-1">&times; Close</button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Product Display Name</label>
                  <input
                    type="text" required placeholder="SoundPro Premium Headphones" value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full text-xs p-2.5 mt-1 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Brand Name</label>
                  <input
                    type="text" required placeholder="Sony / SoundMax" value={pBrand}
                    onChange={(e) => setPBrand(e.target.value)}
                    className="w-full text-xs p-2.5 mt-1 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Selling Price (₹)</label>
                  <input
                    type="number" required placeholder="₹12000" min={0} value={pPrice || ''}
                    onChange={(e) => setPPrice(Number(e.target.value))}
                    className="w-full text-xs p-2.5 mt-1 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Original Price (₹)</label>
                  <input
                    type="number" placeholder="₹15000" min={0} value={pOrigPrice || ''}
                    onChange={(e) => setPOrigPrice(Number(e.target.value))}
                    className="w-full text-xs p-2.5 mt-1 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Initial Stock Units</label>
                  <input
                    type="number" required placeholder="25" min={1} value={pStock || ''}
                    onChange={(e) => setPStock(Number(e.target.value))}
                    className="w-full text-xs p-2.5 mt-1 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Category Category</label>
                  <select 
                    value={pCategory} 
                    onChange={(e) => setPCategory(e.target.value)}
                    className="w-full text-xs p-2.5 mt-1 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none font-mono font-bold"
                  >
                    <option value="electronics">electronics</option>
                    <option value="accessories">accessories</option>
                    <option value="clothing">clothing</option>
                    <option value="home">home</option>
                    <option value="books">books</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Product Image Setup 📸</label>
                  
                  {pImage ? (
                    /* Active Image Preview Container */
                    <div className="relative group border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50 p-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={pImage} 
                          alt="Product thumbnail preview"
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover border border-gray-150 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=250';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-gray-800 truncate max-w-[180px] sm:max-w-xs font-mono">
                            {pImage.startsWith('data:') ? 'Staged local file (Base64)' : pImage}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold mt-1">
                            ✔ Active Image Checked
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPImage('')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    /* Interactive Drag-and-Drop + Link Manager Box */
                    <div className="space-y-3 font-sans">
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith('image/')) {
                            const r = new FileReader();
                            r.onloadend = () => {
                              setPImage(r.result as string);
                            };
                            r.readAsDataURL(file);
                          }
                        }}
                        className="border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onloadend = () => {
                                setPImage(r.result as string);
                              };
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                        <div className="p-2.5 bg-indigo-50/50 rounded-xl text-indigo-600 mb-2 font-black">
                          📁
                        </div>
                        <p className="text-xs font-extrabold text-gray-800">Drag & Drop Image Asset here</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-medium">Or click to search your local files (JPEG, PNG, WEBP)</p>
                      </div>

                      <div className="relative flex items-center justify-center py-1">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-100"></div>
                        </div>
                        <span className="relative px-3 bg-white text-[9px] uppercase tracking-widest text-gray-450 text-gray-400 font-bold font-mono">
                          Or Enter Web Image Link
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="Paste an external image web URL (e.g., https://...)"
                          value={pImage}
                          onChange={(e) => setPImage(e.target.value)}
                          className="flex-1 text-xs p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide precise functional details, specs summary, box inclusions..."
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                  className="w-full text-xs p-2.5 mt-1 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              {/* Specifications Sub-Box */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <span className="text-[10px] text-indigo-700 font-extrabold uppercase font-mono tracking-wider block">Product Technical Specifications</span>
                
                {/* Active Specs List */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(pSpecs).map(([key, val]) => (
                    <span key={key} className="inline-flex items-center gap-1.5 text-[10px] font-mono leading-none bg-white py-1.5 px-3 rounded-lg border border-gray-200">
                      <strong className="text-gray-900">{key}:</strong>
                      <span className="text-gray-500 truncate max-w-[120px]">{val}</span>
                      <button 
                        type="button" onClick={() => handleRemoveSpecField(key)}
                        className="text-stone-400 hover:text-rose-500 font-black text-xs h-fit leading-none"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>

                {/* Spec fields inputs */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-200/50">
                  <input
                    type="text"
                    placeholder="Key (e.g. Battery)"
                    value={newSpecKey}
                    onChange={(e) => setNewSpecKey(e.target.value)}
                    className="text-[11px] p-2 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Value (e.g. 40 Hours)"
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      className="text-[11px] p-2 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                    />
                    <button
                      type="button" onClick={handleAddSpecField}
                      className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-50 flex justify-end gap-2 text-xs">
                <button
                  type="button" onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 hover:bg-gray-100 font-semibold rounded-xl text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-100"
                >
                  {editingId ? 'Save Parameter Changes' : 'Submit Listing For Approval'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TRANSFER BANK WITHDRAW DIALOG */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowWithdrawModal(false)}></div>

          <div className="bg-white rounded-3xl w-full max-w-sm border border-gray-100 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black text-gray-900 leading-none">Bank Account Disbursement</h3>
                <p className="text-[10px] text-gray-400 mt-1.5 font-medium">Safe Transfer with 24-Hour Settlement SLA.</p>
              </div>
              <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 text-sm font-bold">&times;</button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-5 space-y-4">
              
              <div className="p-3 bg-indigo-50/35 rounded-2xl border border-indigo-100/20 text-[11px] leading-normal text-indigo-900">
                <span className="font-bold">Active Wallet balance:</span> <strong className="font-mono text-xs">{formatPrice(wallet.balance || 0)}</strong>. Note: Indian bank gateway rules apply standard safety KYC logs.
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">Withdraw Amount (₹)</label>
                <input
                  type="number" required min={100} max={wallet.balance} placeholder="Amount to transfer (Min: ₹100)" value={wAmount || ''}
                  onChange={(e) => setWAmount(Number(e.target.value))}
                  className="w-full text-xs p-2.5 mt-1 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none font-mono font-bold"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider block">Beneficiary Bank Coordinates</label>
                
                <input
                  type="text" required placeholder="Bank Name (e.g. HDFC)" value={wBankName}
                  onChange={(e) => setWBankName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none"
                />

                <input
                  type="text" required placeholder="Account Number" value={wAccNumber}
                  onChange={(e) => setWAccNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-xs p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none font-mono"
                />

                <input
                  type="text" required placeholder="IFSC Code (11 alphanumeric characters)" value={wIfsc}
                  onChange={(e) => setWIfsc(e.target.value.toUpperCase().replace(/[^a-zA-Z0-9]/g, ''))}
                  className="w-full text-xs p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:outline-none font-mono font-bold"
                />
              </div>

              <div className="pt-3 border-t border-gray-50 flex justify-end gap-2 text-xs">
                <button
                  type="button" onClick={() => setShowWithdrawModal(false)}
                  className="px-3 py-1.5 text-gray-450 hover:bg-gray-50 text-gray-500 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                >
                  Submit Disburse Request
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
