/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, addNotification } from '../store';
import { Order } from '../types';
import { Truck, Printer, RefreshCw, XCircle, ChevronDown, CheckCircle, PackageOpen, AlertCircle, MapPin, Compass, Navigation, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../utils';
import axios from 'axios';

export default function OrdersHistoryPage() {
  const dispatch = useDispatch() as any;
  const { user } = useSelector((state: RootState) => state.auth);
  const { formatPrice } = useCurrency();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState('');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Invoice modal print
  const [activeInvoice, setActiveInvoice] = useState<Order | null>(null);
  const [cancelConfirmOrderId, setCancelConfirmOrderId] = useState<string | null>(null);

  // Return feedback modal parameters
  const [returnModalOrder, setReturnModalOrder] = useState<Order | null>(null);
  const [selectedReturnItems, setSelectedReturnItems] = useState<string[]>([]); // item product IDs or names
  const [returnReason, setReturnReason] = useState('I did not like the item');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnRefundMethod, setReturnRefundMethod] = useState<'WALLET' | 'ORIGINAL'>('WALLET');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  // Auto-open invoice immediately when matching newly completed order search parameter is detected
  useEffect(() => {
    if (orders.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      const autoInvoiceId = searchParams.get('newOrder');
      if (autoInvoiceId) {
        const foundOrder = orders.find(o => o.id === autoInvoiceId);
        if (foundOrder) {
          setActiveInvoice(foundOrder);
          setExpandedOrderId(autoInvoiceId);

          // Purge query parameter from location bar safely to prevent re-open on reload
          const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]newOrder=[^&]+/, '');
          window.history.replaceState({}, '', cleanUrl);
        }
      }
    }
  }, [orders]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/orders/user/${user?.id}`);
      // Sort orders newest first
      setOrders(res.data.reverse());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const headers = {
        'x-user-id': user?.id,
        'x-user-role': user?.role,
        'x-user-name': user?.name
      };
      await axios.post(`/api/orders/${orderId}/cancel`, {}, { headers });
      dispatch(addNotification({
        title: 'Order Cancelled',
        message: 'Your order was successfully cancelled and stock holds were released.',
        type: 'ORDER'
      }));
      setCancelConfirmOrderId(null);
      loadOrders();
    } catch (err) {
      console.error(err);
      dispatch(addNotification({
        title: 'Cancellation Failed',
        message: 'Could not cancel this order. Packing or shipping may have already started.',
        type: 'ORDER'
      }));
    }
  };

  const handleReturnRequest = (order: Order) => {
    setReturnModalOrder(order);
    // Auto-select all items inside the order initially for convenient selection
    const allProdIds = order.items.map((item: any) => item.product.id || item.product.name);
    setSelectedReturnItems(allProdIds);
    setReturnReason('I did not like the item');
    setReturnNotes('');
    setReturnRefundMethod('WALLET');
  };

  const handleConfirmReturnSubmit = async () => {
    if (!returnModalOrder) return;
    if (selectedReturnItems.length === 0) {
      dispatch(addNotification({
        title: 'Selection Required',
        message: 'Please choose at least one item to return.',
        type: 'ORDER'
      }));
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const headers = {
        'x-user-id': user?.id,
        'x-user-role': user?.role,
        'x-user-name': user?.name
      };

      await axios.post(`/api/orders/${returnModalOrder.id}/return`, {
        reason: returnReason,
        notes: returnNotes,
        items: selectedReturnItems,
        refund_method: returnRefundMethod
      }, { headers });

      dispatch(addNotification({
        title: 'Return Request Filed',
        message: 'Your return request was successfully received. Logistics will coordinate quick pick-up.',
        type: 'ORDER'
      }));

      setReturnModalOrder(null);
      loadOrders();
    } catch (err: any) {
      console.error(err);
      dispatch(addNotification({
        title: 'Lodgement Unsuccessful',
        message: err.response?.data?.error || 'Failed to lodge return request candidate.',
        type: 'ORDER'
      }));
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const checkIsIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  const triggerInvoicePrint = (order: Order) => {
    setActiveInvoice(order);
    setTimeout(() => {
      try {
        if (checkIsIframe()) {
          // Inside a sandboxed iframe context - avoid triggering native blocking print sheets which throw
          dispatch(addNotification({
            title: 'Invoice Tab Ready',
            message: 'To print or save as PDF, open the applet in a "New Tab / Window" and hit Print Invoice. You can also view the details on-screen below!',
            type: 'ORDER'
          }));
        } else {
          window.print();
        }
      } catch (err) {
        console.warn('Iframe print block:', err);
        dispatch(addNotification({
          title: 'Print Iframe Notice',
          message: 'If the system printer did not load, please open the app in a new window/tab to print directly, or enjoy the beautiful custom ledger on-screen!',
          type: 'ORDER'
        }));
      }
    }, 300);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PACKING': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SHIPPED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELIVERED': return 'bg-green-50 text-green-700 border-green-200';
      case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PENDING_RETURN': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <span className="inline-flex w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        <p className="text-xs text-gray-400 mt-3 font-semibold font-mono uppercase">Retrieving Orders Registers...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-16 text-center border border-dashed border-gray-200 rounded-3xl bg-white p-6 font-sans">
        <Truck className="w-10 h-10 text-gray-300 mx-auto animate-bounce mt-4" />
        <h4 className="text-sm font-bold text-gray-900 mt-4">Authentication Required</h4>
        <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto mb-5">Please register or sign in to your active shopper profile to track real-time orders.</p>
        <Link to="/auth" className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-100">
          Sign In / Register
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Printable Invoice stylesheet injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-invoice-modal, #print-invoice-modal * {
            visibility: visible;
          }
          #print-invoice-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            padding: 2rem;
            background: white !important;
          }
        }
      `}</style>

      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-sm font-extrabold text-gray-900">Your Logistics Orders</h2>
          <p className="text-xs text-gray-500 mt-1">Track physical parcel drops, downloads, and packing records.</p>
        </div>
        <button
          onClick={loadOrders}
          className="p-2 hover:bg-gray-100 text-gray-400 hover:text-indigo-650 rounded-full transition-colors"
          title="Reload registry"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabbed Filtering Interface */}
      {orders.length > 0 && (
        <div className="flex border-b border-gray-100 gap-2 overflow-x-auto pb-px">
          {[
            { id: 'ALL', label: 'All Orders', count: orders.length },
            { id: 'ACTIVE', label: 'Active', count: orders.filter(o => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status)).length },
            { id: 'COMPLETED', label: 'Completed', count: orders.filter(o => ['DELIVERED', 'RETURNED'].includes(o.status)).length },
            { id: 'CANCELLED', label: 'Cancelled', count: orders.filter(o => o.status === 'CANCELLED').length }
          ].map((tab) => {
            const isActive = orderFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setOrderFilter(tab.id as any)}
                className={`py-2 px-4 text-xs font-bold font-mono tracking-wide uppercase border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-white p-6">
          <Truck className="w-10 h-10 text-gray-300 mx-auto" />
          <h4 className="text-sm font-bold text-gray-900 mt-4">Order Ledger Empty</h4>
          <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">No transaction submissions are registered of this profile.</p>
        </div>
      ) : (() => {
        const filteredOrders = orders.filter((o) => {
          if (orderFilter === 'ALL') return true;
          if (orderFilter === 'ACTIVE') return !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status);
          if (orderFilter === 'COMPLETED') return ['DELIVERED', 'RETURNED'].includes(o.status);
          if (orderFilter === 'CANCELLED') return o.status === 'CANCELLED';
          return true;
        });

        if (filteredOrders.length === 0) {
          return (
            <div className="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-white p-6 font-sans">
              <Truck className="w-10 h-10 text-gray-300 mx-auto" />
              <h4 className="text-sm font-bold text-gray-900 mt-4">No Match Found</h4>
              <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">There are no orders matching your selected <span className="font-bold text-indigo-600">"{orderFilter}"</span> filter criteria.</p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {filteredOrders.map((o) => {
              const isExpanded = expandedOrderId === o.id;

              return (
                <div
                  key={o.id}
                  className="bg-white border rounded-3xl border-gray-100 shadow-sm overflow-hidden"
                >
                {/* Upper line Summary */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? '' : o.id)}
                  className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                  <div className="text-xs">
                    <span className="text-[10px] uppercase text-gray-400 font-bold font-mono tracking-wider">Order Reference</span>
                    <h3 className="font-extrabold text-gray-900 mt-0.5">{o.orderNumber}</h3>
                    <p className="text-[10px] text-gray-400 mt-1 font-mono">Date: {new Date(o.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${getStatusColor(o.status === 'ACCEPTED' ? 'PENDING' : o.status)}`}>
                      {o.status === 'ACCEPTED' ? 'PENDING' : o.status}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                      Amount: {formatPrice(o.finalAmount)}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded Details specs */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-50 bg-gray-50/10 divide-y divide-gray-150 divide-gray-100">
                    
                    {/* Multi-grid Layout for Logistics Hub */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-6 font-sans">
                      
                      {/* Left: 10-Step Core Logistic Progress Timeline */}
                      <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 font-mono flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" /> Core Logistics Pipeline
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">10 stages sequence</span>
                        </div>

                        {o.status === 'CANCELLED' ? (
                          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-xs space-y-2">
                            <div className="flex items-center gap-2 font-bold">
                              <XCircle className="w-5 h-5 text-rose-500" />
                              <span>Order Cancelled</span>
                            </div>
                            <p className="text-gray-600 font-medium">This delivery was cancelled. Stock allocations have been safely returned to active listings.</p>
                            {o.cancel_reason && (
                              <div className="text-[11px] bg-white/60 p-2.5 rounded-xl border border-rose-100/50 font-mono text-rose-800">
                                <strong>Assigned Cancel Reason:</strong> {o.cancel_reason}
                              </div>
                            )}
                          </div>
                        ) : (() => {
                          const steps = [
                            { key: 'PENDING', label: 'Order Submitted', desc: 'Order received and is pending acceptance.' },
                            { key: 'PREPARING', label: 'Preparing', desc: 'Items are undergoing picking & prep stages' },
                            { key: 'PACKED', label: 'Packed', desc: 'Enclosed pack is waiting transport carrier' },
                            { key: 'TRANSPORT_ASSIGNED', label: 'Transport Assigned', desc: 'Delivery partner and vehicle designated' },
                            { key: 'PICKED_UP', label: 'Picked Up', desc: 'Shipment handed over to logistics partner' },
                            { key: 'LOGISTICS_CENTER', label: 'Reached Logistics Center', desc: 'Parcel arrived at courier transit terminal' },
                            { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Parcel is travelling on long-haul transport' },
                            { key: 'OUT_FOR_DELIVERY', label: 'Out For Delivery', desc: 'Courier agent has started final address run' },
                            { key: 'DELIVERED', label: 'Delivered', desc: 'Safely completed drop-off transaction' }
                          ];

                          const normStatus = o.status === 'ACCEPTED' ? 'PENDING' : o.status;
                          const currentIdx = steps.findIndex(s => s.key === normStatus);

                          return (
                            <div className="space-y-3.5 relative pl-4 before:absolute before:left-6.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                              {steps.map((st, idx) => {
                                let state: 'completed' | 'current' | 'upcoming' = 'upcoming';
                                if (o.status === 'DELIVERED') {
                                  state = 'completed';
                                } else if (st.key === normStatus) {
                                  state = 'current';
                                } else if (currentIdx !== -1 && idx < currentIdx) {
                                  state = 'completed';
                                }

                                return (
                                  <div key={st.key} className="flex gap-4 relative items-start">
                                    <div className="z-10 flex-shrink-0 mt-0.5">
                                      {state === 'completed' && (
                                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-200">
                                          <CheckCircle className="w-3.5 h-3.5" />
                                        </div>
                                      )}
                                      {state === 'current' && (
                                        <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center animate-pulse shadow-sm shadow-orange-200">
                                          <span className="w-2 h-2 bg-white rounded-full"></span>
                                        </div>
                                      )}
                                      {state === 'upcoming' && (
                                        <div className="w-5 h-5 rounded-full bg-gray-150 bg-gray-200 text-gray-400 flex items-center justify-center border-2 border-white">
                                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className={`text-[11px] font-extrabold font-sans leading-tight ${state === 'completed' ? 'text-emerald-700' : state === 'current' ? 'text-orange-600' : 'text-gray-400'}`}>
                                        {st.label}
                                        {state === 'current' && <span className="ml-1.5 inline-block text-[9px] uppercase tracking-wide bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-mono font-bold">Active Station</span>}
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-0.5 font-medium leading-normal">{st.desc}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Right: Logistics details specifications & Courier Hub */}
                      <div className="lg:col-span-5 space-y-4">
                        
                        {/* Courier Partner Specs */}
                        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Logistics Allocation Hub</span>
                          
                          {o.tracking_id || o.courier_name ? (
                            <div className="space-y-3 font-sans text-xs">
                              {o.courier_name && (
                                <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                  <span className="text-gray-400">Carrier Partner:</span>
                                  <span className="font-extrabold text-gray-800 uppercase">{o.courier_name}</span>
                                </div>
                              )}
                              {o.tracking_id && (
                                <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                  <span className="text-gray-400">Logistics tracking:</span>
                                  <span className="font-mono font-black text-indigo-700">{o.tracking_id}</span>
                                </div>
                              )}
                              {o.vehicle_details && (
                                <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                  <span className="text-gray-400">Vehicle details:</span>
                                  <span className="font-mono text-gray-700 font-bold">{o.vehicle_details}</span>
                                </div>
                              )}
                              {o.delivery_agent && (
                                <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                  <span className="text-gray-400">Delivery Exec:</span>
                                  <span className="font-bold text-gray-800">{o.delivery_agent}</span>
                                </div>
                              )}
                              {o.expected_delivery_date && (
                                <div className="flex justify-between items-center bg-orange-50/50 p-2.5 rounded-xl border border-orange-100/30 text-orange-850">
                                  <span className="text-orange-700 font-bold">Estimated Arrival:</span>
                                  <span className="font-mono font-extrabold">{new Date(o.expected_delivery_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {o.actual_delivery_date && (
                                <div className="flex justify-between items-center bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/30 text-emerald-850">
                                  <span className="text-emerald-700 font-bold">Delivery timestamp:</span>
                                  <span className="font-mono font-extrabold">{new Date(o.actual_delivery_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-4 text-center border border-dashed border-gray-150 rounded-2xl bg-gray-50/30">
                              <AlertCircle className="w-5 h-5 text-gray-300 mx-auto" />
                              <p className="text-[10px] text-gray-400 font-medium mt-2">Logistics routing details will show once seller packs and hands over control to the logistics desks.</p>
                            </div>
                          )}

                          {o.status !== 'CANCELLED' && (
                            <div className="mt-4 p-3.5 bg-gradient-to-br from-indigo-50/30 to-amber-50/30 rounded-2xl border-l-[3px] border-l-indigo-600 border border-gray-100 flex flex-col items-center text-center space-y-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                              <span className="text-[9px] uppercase tracking-wider text-indigo-700 font-mono font-extrabold block">
                                Secure Delivery Verification PIN
                              </span>
                              {o.status === 'DELIVERED' || o.delivery_otp_verified ? (
                                <div className="space-y-1">
                                  <div className="text-emerald-700 font-extrabold flex items-center justify-center gap-1.5 text-xs">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Verified Handover Code: ******</span>
                                  </div>
                                  <p className="text-[9.5px] text-gray-500">
                                    OTP verified successfully by courier executive during package handover.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="text-sm tracking-widest font-mono font-black text-indigo-950 bg-white border border-indigo-100 px-4 py-1.5 rounded-xl shadow-sm select-all inline-block">
                                    {o.delivery_otp || '------'}
                                  </div>
                                  <p className="text-[9.5px] text-gray-500 leading-normal max-w-xs px-2 font-medium">
                                    Please share this 6-digit confirmation code with the delivery partner upon arrival to complete handover.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Live Delivery Destination Map Pin for Delivery Boy / Customer */}
                        {o.address && (
                          <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 font-mono block">Delivery Route & GPS Coordinates</span>
                              {o.address.latitude && o.address.longitude ? (
                                <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse">
                                  <span>GPS Locked</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                                  <span>City Level Fixed</span>
                                </span>
                              )}
                            </div>

                            {/* Info card */}
                            <div className="p-3 bg-indigo-50/20 border border-indigo-100/30 rounded-2xl space-y-1.5 text-xs text-indigo-950 font-sans">
                              <div>
                                <span className="text-gray-400 block text-[10px]">Consignee Address:</span>
                                <strong className="text-gray-800 text-[11px] font-black">{o.address.fullName}</strong>
                                <p className="text-[11.5px] mt-0.5 text-gray-600 font-semibold leading-relaxed">
                                  {o.address.buildingName && `${o.address.buildingName}, `}
                                  {o.address.streetNo && `No. ${o.address.streetNo}, `}
                                  {o.address.streetName || o.address.street}
                                </p>
                                <p className="text-[10.5px] text-gray-500 font-medium">
                                  {o.address.city}, {o.address.state} {o.address.postalCode}, {o.address.country}
                                </p>
                              </div>
                              <div className="pt-1.5 border-t border-indigo-100/35 flex items-center justify-between font-mono text-[10px]">
                                <span className="text-gray-400 font-medium">Coordinates:</span>
                                <span className="font-extrabold text-indigo-700">
                                  {o.address.latitude && o.address.longitude 
                                    ? `[${o.address.latitude.toFixed(6)}, ${o.address.longitude.toFixed(6)}]` 
                                    : 'Coordinates Empty'}
                                </span>
                              </div>
                            </div>

                            {/* Out For Delivery Special Status Notice */}
                            {o.status === 'OUT_FOR_DELIVERY' && (
                              <div className="bg-rose-50/75 border border-rose-200/50 rounded-2xl p-3.5 flex items-center gap-3 animate-pulse text-rose-950">
                                <span className="relative flex h-3 w-3 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                                </span>
                                <div className="text-[11.5px] font-sans font-semibold">
                                  <strong className="text-rose-900 block font-black uppercase text-[10px] tracking-wider">🔴 ACTIVE LIVE RUNNING DELIVERER ROUTE</strong>
                                  <p className="text-rose-800 text-[11px] leading-relaxed mt-0.5">
                                    Your logistic executive has departed from the warehouse. Click on the map below to launch Google Maps and track/navigate with your driver!
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Embed interactive map iframe with complete click redirection overlay */}
                            {(() => {
                              const q = o.address.latitude && o.address.longitude
                                ? `${o.address.latitude},${o.address.longitude}`
                                : encodeURIComponent(`${o.address.streetNo || ''} ${o.address.streetName || o.address.street || ''}, ${o.address.city}, ${o.address.state || ''}`);
                              const googleMapsLink = o.address.latitude && o.address.longitude 
                                ? `https://www.google.com/maps/search/?api=1&query=${o.address.latitude},${o.address.longitude}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address.streetNo || ''} ${o.address.streetName || o.address.street || ''}, ${o.address.city}, ${o.address.state || ''}`)}`;

                              return (
                                <div className="space-y-3">
                                  <a
                                    href={googleMapsLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="relative block w-full h-[180px] rounded-2xl overflow-hidden border border-gray-150 shadow-inner group cursor-pointer"
                                  >
                                    {/* Click intercept overlay */}
                                    <div className="absolute inset-0 bg-transparent group-hover:bg-indigo-950/5 transition-all duration-200 z-20 flex items-center justify-center">
                                      <div className="opacity-0 group-hover:opacity-100 bg-gray-900/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md transition-all duration-200 uppercase tracking-widest pointer-events-none">
                                        🗺️ Click to track in Google Maps
                                      </div>
                                    </div>
                                    <iframe
                                      title={`Map-${o.id}`}
                                      src={`https://maps.google.com/maps?q=${q}&z=16&output=embed`}
                                      className="absolute inset-0 w-full h-full border-0 rounded-2xl z-10 pointer-events-none"
                                      allowFullScreen={false}
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                    />
                                  </a>

                                  {/* Navigation trigger button */}
                                  <div className="pt-1">
                                    <a
                                      href={googleMapsLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-indigo-600/10 transition-all text-center uppercase tracking-wide cursor-pointer"
                                    >
                                      <Navigation className="w-3.5 h-3.5 fill-current" />
                                      {o.status === 'OUT_FOR_DELIVERY' ? 'Track Live Driver Routes' : 'Navigate in Google Maps app'}
                                      <ExternalLink className="w-3 h-3 ml-0.5" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Audit Log Trail inside Order expansion */}
                        {o.history && o.history.length > 0 && (
                          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block mb-3">Order History Trails (Read-Only)</span>
                            <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                              {o.history.map((hist) => (
                                <div key={hist.id} className="text-[10px] bg-neutral-50 p-2 rounded-xl border border-neutral-150 font-sans">
                                  <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-neutral-700">{hist.changerName} ({hist.role})</span>
                                    <span className="text-gray-400 font-mono">{new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="text-gray-500 mt-1 font-medium">{hist.notes}</p>
                                  <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px] text-gray-400">
                                    <span>Transitioned:</span>
                                    <span className="font-bold text-gray-600">{hist.prevStatus}</span>
                                    <span>→</span>
                                    <span className="font-bold text-indigo-600">{hist.newStatus}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Part 2: Order items list */}
                    <div className="py-4 space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">Purchased items</span>
                      {o.items.map((item: any, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-gray-700 font-medium font-sans">
                          <span className="truncate max-w-[280px]">{item.product.name} <span className="text-indigo-600">x{item.quantity}</span></span>
                          <span className="font-mono text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Part 3: Shipping specs address details */}
                    <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">Consignee Address</span>
                        <div className="font-bold text-gray-900 mt-1">{o.address.fullName}</div>
                        <div className="text-gray-500 mt-0.5 leading-relaxed">
                          {o.address.street}, {o.address.city}, {o.address.state} {o.address.postalCode}, {o.address.country}
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end justify-between self-end sm:self-auto">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Payment details</span>
                          <div className="font-bold text-gray-800 mt-1 uppercase font-mono">{o.paymentMethod} • {o.paymentStatus}</div>
                        </div>
                        
                        {/* Print Invoice trigger */}
                        <div className="flex items-center gap-2 mt-4 font-sans">
                          <button
                            onClick={() => triggerInvoicePrint(o)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs border border-gray-150 border-gray-100 hover:bg-gray-100 bg-white hover:text-indigo-600 rounded-xl transition-all font-bold cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Invoice PDF
                          </button>

                          {/* Cancellation checks - allowed only before Packing */}
                          {!['PACKED', 'TRANSPORT_ASSIGNED', 'PICKED_UP', 'LOGISTICS_CENTER', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(o.status) ? (
                            cancelConfirmOrderId === o.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 p-0.5 rounded-xl animate-in fade-in duration-200">
                                <span className="text-[10px] font-bold text-rose-800 px-2 font-mono">Cancel?</span>
                                <button
                                  onClick={() => handleCancelOrder(o.id)}
                                  className="h-7 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setCancelConfirmOrderId(null)}
                                  className="h-7 px-2.5 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setCancelConfirmOrderId(o.id)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 rounded-xl transition-all font-bold cursor-pointer"
                              >
                                Cancel Order
                              </button>
                            )
                          ) : o.status === 'CANCELLED' ? (
                            <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100/30">Cancelled</span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100/50" title="Packing or Shipping has already commenced">Locked (In Dispatch)</span>
                          )}

                          {o.status === 'DELIVERED' && (
                            <button
                              onClick={() => handleReturnRequest(o)}
                              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs bg-orange-50 border border-orange-100 hover:bg-orange-100 text-orange-700 rounded-xl transition-all font-sans font-bold cursor-pointer"
                            >
                              Return Request
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
        );
      })()}

      {/* DETACHED SIMULATED INVOICE MODAL FOR SCREEN DISPLAY AND PRINTING */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:relative print:inset-auto print:z-auto print:p-0">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={() => setActiveInvoice(null)}></div>
          
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-gray-150 z-10 animate-in zoom-in duration-200 p-6 sm:p-8 print:shadow-none print:border-none print:max-h-none print:p-0 print:overflow-visible">
            
            {/* Close action button */}
            <button
              onClick={() => setActiveInvoice(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 bg-gray-50 hover:bg-gray-105 p-2 rounded-full cursor-pointer print:hidden transition-colors"
              title="Close Invoice Panel"
            >
              <XCircle className="w-5 h-5" />
            </button>

            {/* Print trigger banner - hidden from prints */}
            <div className="mb-6 bg-indigo-50/50 border border-indigo-110 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden text-left">
              <div className="text-left">
                <span className="text-[10px] font-extrabold text-indigo-900 block uppercase tracking-wider font-mono">Invoice ready in sandbox</span>
                <p className="text-[11px] text-gray-500 mt-0.5 font-sans">Open on-screen, print, or save this commercial receipt as a PDF safely.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    try {
                      if (checkIsIframe()) {
                        dispatch(addNotification({
                          title: 'Sandbox Print Notice',
                          message: 'Print tools are optimized for full window sessions! Please click on the external window launcher icon in AI Studio above first, then print natively.',
                          type: 'ORDER'
                        }));
                      } else {
                        window.print();
                      }
                    } catch (err) {
                      console.warn('Iframe print block:', err);
                      dispatch(addNotification({
                        title: 'Print Blocked',
                        message: 'Printing is restricted inside the current sandboxed iframe. Please open the app in a new window/tab and try again!',
                        type: 'ORDER'
                      }));
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Area - starts here */}
            <div id="print-invoice-modal" className="text-slate-800 bg-white font-serif text-sm">
              <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6">
                <div>
                  <h1 className="text-2xl font-sans font-black tracking-widest text-slate-900 uppercase">APEX STORE INC</h1>
                  <p className="text-xs font-sans text-slate-500 mt-1">100 Silicon Valley Blvd, Palo Alto, CA 94301</p>
                  <p className="text-xs font-sans text-slate-500">VAT Registration No: AU-9821-44</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-sans font-bold text-slate-700">OFFICIAL COMMERCE INVOICE</h2>
                  <p className="text-xs mt-1 font-mono">Invoice ID: {activeInvoice.orderNumber}</p>
                  <p className="text-xs font-mono">Created: {new Date(activeInvoice.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 py-6 border-b border-dashed border-slate-200 text-left">
                <div>
                  <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest block">Customer Address</span>
                  <div className="font-bold text-slate-900 mt-1">{activeInvoice.address.fullName}</div>
                  <p className="text-xs leading-relaxed text-slate-600 mt-1">
                    {activeInvoice.address.street}, {activeInvoice.address.city}, {activeInvoice.address.state} {activeInvoice.address.postalCode}, {activeInvoice.address.country}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest block">Billing Gateway & Status</span>
                  <div className="font-bold text-slate-800 mt-1 uppercase font-mono">{activeInvoice.paymentMethod}</div>
                  <p className="text-xs text-slate-500 mt-1 font-mono">Gateway Status: {activeInvoice.paymentStatus}</p>
                </div>
              </div>

              <div className="py-6">
                <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest block mb-4 text-left">Items Specifications Checklist</span>
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-2">Description</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Unit Price</th>
                      <th className="pb-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvoice.items.map((item: any, idx) => (
                      <tr key={idx} className="border-b border-dashed border-slate-100 text-slate-700">
                        <td className="py-3 font-semibold text-left">{item.product.name}</td>
                        <td className="py-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-3 text-right font-mono">{formatPrice(item.price)}</td>
                        <td className="py-3 text-right font-mono">{formatPrice(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="py-6 flex justify-end font-sans">
                <div className="w-64 space-y-2 border-t border-slate-200 pt-4 text-xs font-medium text-slate-500">
                  <div className="flex justify-between">
                    <span>Subtotal amount</span>
                    <span className="font-mono text-slate-800">{formatPrice(activeInvoice.totalAmount)}</span>
                  </div>
                  {activeInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-green-700 font-bold">
                      <span>Promo Reduction</span>
                      <span className="font-mono">-{formatPrice(activeInvoice.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Vat sur tax (8%)</span>
                    <span className="font-mono text-slate-800">{formatPrice(activeInvoice.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Insured Transport Freight</span>
                    <span className="font-mono text-slate-800">{formatPrice(activeInvoice.shippingCharge)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-3">
                    <span>Total Settled</span>
                    <span className="font-mono text-indigo-700">{formatPrice(activeInvoice.finalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-slate-200 pt-6 text-center text-[10px] font-sans text-slate-400">
                Thank you for shopping at Apex Store. All digital warranty logs are archived under this reference code.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EXTREMELY POLISHED INTERACTIVE RETURN MODAL */}
      {returnModalOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-gray-700">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full border border-gray-100 overflow-hidden font-sans flex flex-col max-h-[90vh] transition-all transform scale-100 text-left">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-indigo-600 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-sans font-bold text-sm">Request Item Return</h3>
                <p className="text-[10px] opacity-85 mt-0.5 font-mono text-indigo-50">Order Ref: #{returnModalOrder.orderNumber}</p>
              </div>
              <button 
                onClick={() => setReturnModalOrder(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5 pointer-events-none" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans text-gray-500">
              <div className="bg-orange-50/50 border border-orange-100/60 p-3 rounded-2xl flex gap-2.5 items-start">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-orange-700 text-[10px] uppercase tracking-wider">14-Day Post-Delivery Guarantee</h4>
                  <p className="text-[10.5px] text-orange-600 mt-0.5 leading-relaxed">
                    If you did not like the item or it did not fit your expectations, select items to initiate automated reverse courier picking. Refund is processed back immediately once staged.
                  </p>
                </div>
              </div>

              {/* Step 1: Select Items */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono block mb-2">
                  Select Items to Return *
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-100 p-3 rounded-2xl bg-gray-50/50">
                  {returnModalOrder.items.map((item: any) => {
                    const itemId = item.product.id || item.product.name;
                    const isChecked = selectedReturnItems.includes(itemId);
                    return (
                      <div 
                        key={itemId} 
                        onClick={() => {
                          if (isChecked) {
                            setSelectedReturnItems(selectedReturnItems.filter(id => id !== itemId));
                          } else {
                            setSelectedReturnItems([...selectedReturnItems, itemId]);
                          }
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-gray-150 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-2 max-w-[85%]">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {}} // handled by click
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                          />
                          <span className="font-bold text-gray-800 truncate text-[11px]">{item.product.name}</span>
                        </div>
                        <span className="font-mono text-gray-500 shrink-0 text-[10.5px]">x{item.quantity} ({formatPrice(item.price)})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Choose Reason */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono block mb-1.5">
                  Reason for Return *
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 font-sans cursor-pointer focus:outline-none"
                >
                  <option value="I did not like the item">I did not like the item</option>
                  <option value="Product not as expected / didn't suit style">Product not as expected / didn't suit style</option>
                  <option value="Damaged / defective on delivery">Damaged / defective on delivery</option>
                  <option value="Incorrect product or size received">Incorrect product or size received</option>
                  <option value="No longer need / changed mind">No longer need / changed mind</option>
                  <option value="Other reasons">Other reasons</option>
                </select>
              </div>

              {/* Step 3: Notes Comments */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono block mb-1.5">
                  Describe what you disliked (Optional)
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Tell us what you did not like about the item so we can improve standard selections..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 h-16 resize-none text-gray-800 focus:outline-none"
                />
              </div>

              {/* Step 4: Refund Target Method */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono block mb-2">
                  Refund Settlement Destination
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setReturnRefundMethod('WALLET')}
                    className={`p-3 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all ${returnRefundMethod === 'WALLET' ? 'border-indigo-600 bg-indigo-50/10' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 text-[10.5px]">Refund to Wallet</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${returnRefundMethod === 'WALLET' ? 'border-indigo-600' : 'border-gray-300'}`}>
                        {returnRefundMethod === 'WALLET' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </div>
                    </div>
                    <span className="text-[9.5px] text-indigo-600 mt-1 font-medium font-sans">Payout within 2 hours</span>
                  </div>

                  <div 
                    onClick={() => setReturnRefundMethod('ORIGINAL')}
                    className={`p-3 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all ${returnRefundMethod === 'ORIGINAL' ? 'border-indigo-600 bg-indigo-50/10' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 text-[10.5px]">Original Source</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${returnRefundMethod === 'ORIGINAL' ? 'border-indigo-600' : 'border-gray-300'}`}>
                        {returnRefundMethod === 'ORIGINAL' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </div>
                    </div>
                    <span className="text-[9.5px] text-gray-400 mt-1 font-medium font-sans">3-5 standard bank business days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReturnModalOrder(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl transition-colors cursor-pointer font-sans"
                disabled={isSubmittingReturn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturnSubmit}
                disabled={isSubmittingReturn}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5 justify-center cursor-pointer font-sans disabled:opacity-50"
              >
                {isSubmittingReturn ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Filing Return...
                  </>
                ) : (
                  'File Return'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
