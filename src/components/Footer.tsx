/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Check, CreditCard, ShieldCheck, Truck, HelpCircle } from 'lucide-react';

export default function Footer() {
  const [emailSub, setEmailSub] = useState('');
  const [isSubbed, setIsSubbed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailSub.trim()) {
      setIsSubbed(true);
      setEmailSub('');
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-400 font-sans mt-auto">
      {/* Upper pitch banner */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <Truck className="h-8 w-8 text-indigo-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-white">Insured Freight</h4>
              <p className="text-xs text-gray-500 mt-0.5">Complimentary for order codes over ₹2,000</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-indigo-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-white">2 Year Cover Guarantee</h4>
              <p className="text-xs text-gray-500 mt-0.5">Full coverage matching official warranty</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <CreditCard className="h-8 w-8 text-indigo-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-white">Ultra Secure Portals</h4>
              <p className="text-xs text-gray-500 mt-0.5">128-bit multi-gateway Stripe security</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <HelpCircle className="h-8 w-8 text-indigo-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-white">24/7 AI Smart Desk</h4>
              <p className="text-xs text-gray-500 mt-0.5">Instant refunds and order tracking chatbot</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand Pitch */}
        <div>
          <span className="text-lg font-bold text-white tracking-wider">
            APEX <span className="text-indigo-400 font-light font-mono">STORE</span>
          </span>
          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            Apex E-Commerce designs studio sound systems, flagship screens, wool trench coats, and custom Kaolin clay brewers. Emphasizing modern architectural design guidelines.
          </p>
          <div className="flex gap-2.5 mt-5">
            <span className="inline-flex w-5 h-5 rounded hover:bg-gray-800 border border-gray-800 items-center justify-center text-[10px] text-gray-500 hover:text-white cursor-pointer select-none transition-colors">FB</span>
            <span className="inline-flex w-5 h-5 rounded hover:bg-gray-800 border border-gray-800 items-center justify-center text-[10px] text-gray-500 hover:text-white cursor-pointer select-none transition-colors">IG</span>
            <span className="inline-flex w-5 h-5 rounded hover:bg-gray-800 border border-gray-800 items-center justify-center text-[10px] text-gray-500 hover:text-white cursor-pointer select-none transition-colors">X</span>
            <span className="inline-flex w-5 h-5 rounded hover:bg-gray-800 border border-gray-800 items-center justify-center text-[10px] text-gray-500 hover:text-white cursor-pointer select-none transition-colors">YT</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Store Catalogs</h4>
          <ul className="mt-4 space-y-2.5 text-xs text-gray-500 font-medium">
            <li><a href="/?category=electronics" className="hover:text-white transition-colors">Premium Electronics</a></li>
            <li><a href="/?category=fashion" className="hover:text-white transition-colors">Designer Fashion</a></li>
            <li><a href="/?category=mobiles" className="hover:text-white transition-colors">Mobiles & Powerhouses</a></li>
            <li><a href="/?category=home" className="hover:text-white transition-colors">Home & Living</a></li>
            <li><a href="/?category=furniture" className="hover:text-white transition-colors">Ergonomic Furniture</a></li>
          </ul>
        </div>

        {/* Support Helpdesk */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Help Desk</h4>
          <ul className="mt-4 space-y-2.5 text-xs text-gray-500 font-medium">
            <li><span className="cursor-pointer hover:text-white">Track Order status</span></li>
            <li><span className="cursor-pointer hover:text-white">File 14-day return request</span></li>
            <li><span className="cursor-pointer hover:text-white">Stripe payment safety guarantee</span></li>
            <li><span className="cursor-pointer hover:text-white">Custom corporate procurement</span></li>
            <li><span className="cursor-pointer hover:text-white">Helpline: support@apexstore.ai</span></li>
          </ul>
        </div>

        {/* Newsletter Subscription */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white text-left">Newsletter</h4>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Get instant drop announcements, exclusive member coupon tokens, and technical blueprint logs.
          </p>

          <form onSubmit={handleSubscribe} className="mt-4 flex max-w-md gap-2">
            <input
              type="email"
              required
              placeholder="Your email address..."
              value={emailSub}
              onChange={(e) => setEmailSub(e.target.value)}
              className="w-full min-w-0 flex-1 rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {isSubbed ? (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-green-600 px-3 text-white transition-colors h-8"
              >
                <Check className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 hover:bg-indigo-500 text-white font-semibold transition-all h-8 text-xs hover:shadow-indigo-900 hover:shadow-md"
              >
                <Mail className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

      </div>

      {/* Copy-rights & language / currency selection */}
      <div className="border-t border-gray-800 py-6 text-xs text-gray-600 text-center md:text-left bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            &copy; {new Date().getFullYear()} Apex Store Inc. All visual concepts and typographic structures adhere strictly to clean CSS.
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-700 bg-gray-800 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-700 hover:text-white transition-colors">INR (₹)</span>
              <span className="text-[10px] text-gray-700 bg-gray-800 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-700 hover:text-white transition-colors">EN (English)</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
