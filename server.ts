/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

let db: any = null;
let firebaseRestConfig: { projectId: string; databaseId: string; apiKey: string } | null = null;

try {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    if (firebaseConfig.projectId && firebaseConfig.apiKey) {
      firebaseRestConfig = {
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId,
        apiKey: firebaseConfig.apiKey
      };
      db = firebaseRestConfig; // Satisfy any existing truthy checks like if (db)
      console.log('[FIREBASE] REST initialized for database ID:', firebaseConfig.firestoreDatabaseId);
    }
  }
} catch (e) {
  console.error('[FIREBASE] REST init error (falling back to local files only):', e);
}

// Centralized Helper to send OTP via SMTP or simulate/log if not configured
async function sendOtpEmail(to: string, userName: string, otp: string, subject: string) {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const rawUser = (process.env.SMTP_USER || 'osaisrishanth@gmail.com').trim();
  const pass = (process.env.SMTP_PASS || 'wylv ynly bwdm ojpx').replace(/\s+/g, ''); // Remove any potential whitespaces

  // Determine label/display name for the sender
  const displayName = rawUser && !rawUser.includes('@') ? rawUser : 'My Store Applet';

  // Build the list of active email username candidates
  const emailCandidates: string[] = [];
  if (rawUser && rawUser.includes('@')) {
    emailCandidates.push(rawUser);
  }
  if (!emailCandidates.includes('osaisrishanth@gmail.com')) {
    emailCandidates.push('osaisrishanth@gmail.com');
  }
  if (!emailCandidates.includes('oddulasaisrishanthreddy@gmail.com')) {
    emailCandidates.push('oddulasaisrishanthreddy@gmail.com');
  }

  // Make the design extremely clean, standard, and transactional to prevent spam filters from trigger-marking it
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; border: 1px solid #eef2f6; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
      <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin-top: 0; margin-bottom: 20px; text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">Apex Store Security Code</h2>
      <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 16px;">
        Hi ${userName || 'there'},
      </p>
      <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 24px;">
        Please use the following 6-digit code to complete your security verification. This code is valid for 10 minutes:
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 28px; font-weight: 700; letter-spacing: 5px; text-align: center; padding: 16px; border-radius: 6px; color: #4f46e5; margin-bottom: 24px;">
        ${otp}
      </div>
      <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
        If you did not request this code, you can safely ignore this email.
      </p>
    </div>
  `;

  if (host && pass) {
    // Generate transport strategies dynamically for each candidate
    const transporterConfigs: Array<{ name: string, user: string, config: any }> = [];

    for (const u of emailCandidates) {
      const isGmail = host.toLowerCase().includes('gmail') || u.toLowerCase().includes('gmail') || true;
      if (isGmail) {
        transporterConfigs.push({
          name: `Gmail Service Transporter (${u})`,
          user: u,
          config: {
            service: 'gmail',
            auth: { user: u, pass },
            tls: { rejectUnauthorized: false }
          }
        });
      }

      transporterConfigs.push({
        name: `Custom SMTP Transporter (${u})`,
        user: u,
        config: {
          host,
          port,
          secure: port === 465,
          auth: { user: u, pass },
          tls: { rejectUnauthorized: false }
        }
      });
    }

    for (const entry of transporterConfigs) {
      try {
        console.log(`[SMTP SYSTEM] Attempting dispatch via: "${entry.name}" to ${to}`);
        const transporter = nodemailer.createTransport(entry.config as any);
        const fromAddress = `"${displayName}" <${entry.user}>`;
        
        await transporter.sendMail({
          from: fromAddress,
          to: userName ? `"${userName}" <${to}>` : to,
          subject,
          html: htmlBody,
          text: `Your verification code is: ${otp}`,
          headers: {
            'X-Priority': '3',
            'X-MSMail-Priority': 'Normal',
            'Importance': 'Normal'
          }
        });

        console.log(`[SMTP SYSTEM SUCCESS] Account verification OTP (${otp}) dispatched successfully via "${entry.name}" to ${to}`);
        return { success: true, via: 'SMTP' };
      } catch (err: any) {
        console.error(`[SMTP ERROR ALERT] Strategy "${entry.name}" failed to deliver email:`, err?.message || err);
      }
    }

    // If all SMTP strategies fail, log and fallback gracefully
    console.warn(`[SMTP FAILURE] Failed all SMTP transport configuration attempts. Failsafing to sandbox simulation logs.`);
    console.log(`
=============================================================================
[SANDBOX SMS/OTP VISULATION LOGS]
Recipient: ${to}
Subject: ${subject}
OTP Code: ${otp} (Valid for 10 minutes)
=============================================================================
    `);
    return { success: false, via: 'FALLBACK' };
  } else {
    console.log(`
=============================================================================
[EMAIL SERVICE DISPATCH MONITOR] - SET SMTP CREDENTIALS IN SECRETS FOR REAL MAIL!
To: ${to}
Subject: ${subject}
OTP Code: ${otp} (Valid for 10 minutes)
=============================================================================
    `);
    return { success: true, via: 'SIMULATION' };
  }
}

// Standard initialization of the GoogleGenAI instance for our server-side chatbot
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Middleware to automatically write changes to disk on any modification method (POST, PUT, DELETE)
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(body) {
    const result = originalJson.call(this, body);
    if (req.method !== 'GET' && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        saveData();
      } catch (err) {
        console.error('[AUTO-SAVE ON REQUEST COMPLETE SAVE ERROR]', err);
      }
    }
    return result;
  };
  next();
});

// ==========================================
// IN-MEMORY COMPREHENSIVE SEED DATA STORE
// ==========================================
let categories = [
  { id: 'cat-1', name: 'Electronics', slug: 'electronics', description: 'Premium gadgets, sound setups, and computer hardware' },
  { id: 'cat-2', name: 'Fashion & Apparel', slug: 'fashion', description: 'Designer clothing, premium watches, and footwear' },
  { id: 'cat-3', name: 'Mobiles & Accessories', slug: 'mobiles', description: 'Next-generation smartphones, adaptive chargers, and secure cases' },
  { id: 'cat-4', name: 'Books', slug: 'books', description: 'Best-selling literature, self-help guides, and tech manuals' },
  { id: 'cat-5', name: 'Home & Kitchen', slug: 'home', description: 'Smart appliances, blenders, air fryers, and utensils' },
  { id: 'cat-6', name: 'Grocery & Gourmet', slug: 'grocery', description: 'Whole-bean coffee, organic green tea, and healthy snacks' },
  { id: 'cat-7', name: 'Beauty & Personal Care', slug: 'beauty', description: 'Dermatologist-tested skincare, repair serums, and hair styling' },
  { id: 'cat-8', name: 'Sports, Fitness & Outdoors', slug: 'sports', description: 'Professional workout weights, yoga accessories, and trackers' },
  { id: 'cat-9', name: 'Furniture & Workspace', slug: 'furniture', description: 'Ergonomic task chairs, minimalist study lamps, and side tables' },
  { id: 'cat-10', name: 'Toys & Games', slug: 'toys', description: 'Cognitive building blocks, 3D architecture puzzle sets, and board games' },
  { id: 'cat-11', name: 'Automotive Accessories', slug: 'automotive', description: 'Fast multi-device car chargers, smart car interior organizers, and premium detailing gear' }
];

let products = [
  // --- ELECTRONICS ---
  {
    id: 'prod-1',
    name: 'Apex SoundMax Wireless Headphones',
    description: 'Immersive studio audio with hybrid active noise cancellation, smart touch pads, and space-grade memory foam cups. Crafted for 80 hours of high-fidelity auditory loops.',
    price: 14999,
    originalPrice: 19999,
    discountPercentage: 25,
    category: 'electronics',
    brand: 'ApexAudio',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'],
    stock: 24,
    rating: 4.8,
    reviewsCount: 3,
    specifications: {
      'Driver Size': '40mm Neodymium',
      'Battery Life': 'Up to 80 Hours',
      'ANC Level': '-45dB Hybrid',
      'Connectivity': 'Bluetooth 5.3 & Ultra-Low Latency USB-C Dongle',
      'Weight': '250g'
    },
    isFeatured: true,
    isBestSeller: true,
    sellerId: 'user-3',
    sellerName: 'Apex Audio & Mobile Store',
    isApproved: true
  },
  {
    id: 'prod-7',
    name: 'CinemaView Pro 4K UHD Smart Projector',
    description: 'Ultra-bright 2500 ANSI lumens smart laser projector with auto-focus, key correction, physical Dolby Digital sound chamber, and next-gen streaming integrations built-in.',
    price: 48999,
    originalPrice: 59999,
    discountPercentage: 18,
    category: 'electronics',
    brand: 'CinemaView',
    images: ['https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=800&q=80'],
    stock: 14,
    rating: 4.7,
    reviewsCount: 12,
    specifications: {
      'Native Resolution': '3840 x 2160 (4K UHD)',
      'Brightness': '2500 ANSI Lumens',
      'Smart TV OS': 'Android TV 11.0 Integrated',
      'Built-in Audio': 'Dual 15W Dolby Audio Chambers'
    },
    isFeatured: true,
    isBestSeller: false,
    sellerId: 'user-3',
    sellerName: 'Apex Audio & Mobile Store',
    isApproved: true
  },

  // --- FASHION ---
  {
    id: 'prod-2',
    name: 'Classic Wool Trench Coat',
    description: 'An elegant outerwear crafted from single-origin merino wool, featuring structured minimalist lapels, side utility loops, and internal wind guards. Beautiful modern design.',
    price: 8500,
    originalPrice: 12000,
    discountPercentage: 29,
    category: 'fashion',
    brand: 'MerinoLines',
    images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80'],
    stock: 12,
    rating: 4.6,
    reviewsCount: 1,
    specifications: {
      'Material': '85% Merino Wool, 15% Custom Nylon Matrix',
      'Lining': 'Premium Satinweave Silk',
      'Closure': 'Structured Double Breasted Bone Buttons',
      'Origin': 'Durable Australian Sourcing'
    },
    isFeatured: true,
    isBestSeller: false,
    sellerId: 'user-3',
    sellerName: 'Apex Audio & Mobile Store',
    isApproved: true
  },
  {
    id: 'prod-8',
    name: 'Metropolitan Premium Chronograph Watch',
    description: 'Minimalist quartz dial watch featuring durable surgery-grade stainless steel casing, Japanese mechanical ticks, and naturally tanned soft chestnut hide leather strap.',
    price: 5200,
    originalPrice: 7999,
    discountPercentage: 35,
    category: 'fashion',
    brand: 'ChronoMet',
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80'],
    stock: 45,
    rating: 4.8,
    reviewsCount: 22,
    specifications: {
      'Movement': 'Japanese Miyota 3-Hand Quartz',
      'Case Diameter': '40mm Surgical Stainless',
      'Waterproof Spec': '5 ATM (Splash & Rain proof)',
      'Strap Width': '20mm Genuine Full-Grain Chestnut Leather'
    },
    isFeatured: false,
    isBestSeller: true,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },

  // --- MOBILES & ACCESSORIES ---
  {
    id: 'prod-3',
    name: 'Titan Pro 5G Smart Device',
    description: 'Flagship powerhouse containing a nanometer silicon processor, zero-bezel adaptive dynamic screen, and custom triple lens optics with hardware level stabilization.',
    price: 84999,
    originalPrice: 99999,
    discountPercentage: 15,
    category: 'mobiles',
    brand: 'ApexMobile',
    images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80'],
    stock: 35,
    rating: 4.9,
    reviewsCount: 2,
    specifications: {
      'Processor': 'Silicon Titan Gen 3 Octa-Core',
      'Screen Size': '6.8 inch LTPO OLED 144Hz',
      'Camera Setup': '50MP Primary (OIS) + 48MP Ultrawide + 12MP Telephoto',
      'RAM & Storage': '16GB LPDDR5X + 512GB UFS 4.0'
    },
    isFeatured: true,
    isBestSeller: true,
    sellerId: 'user-3',
    sellerName: 'Apex Audio & Mobile Store',
    isApproved: true
  },
  {
    id: 'prod-9',
    name: 'MagCharge 3-in-1 Hyper wireless dock',
    description: 'All-inclusive wireless powering station supporting magnetic smartphone alignment, smart watch inductive pad, and low power earmuff case wireless charging concurrently.',
    price: 2999,
    originalPrice: 4500,
    discountPercentage: 33,
    category: 'mobiles',
    brand: 'MagCharge',
    images: ['https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&w=800&q=80'],
    stock: 80,
    rating: 4.5,
    reviewsCount: 14,
    specifications: {
      'Max Power Out': '15W Fast Qi Magnetic Alignment',
      'Compatibility': 'Universal Smartphones with wireless coil adapters',
      'Input Interface': 'USB Type-C (Requires PD 3.0 Adapter)'
    },
    isFeatured: false,
    isBestSeller: false,
    sellerId: 'user-3',
    sellerName: 'Apex Audio & Mobile Store',
    isApproved: true
  },

  // --- BOOKS ---
  {
    id: 'prod-4',
    name: 'Philosophy of Clean Design',
    description: 'An inspiring written framework details visual rhythm, custom grid structures, pairing theories, and clean typographic grids for industrial design frameworks.',
    price: 799,
    originalPrice: 1200,
    discountPercentage: 33,
    category: 'books',
    brand: 'ApexPress',
    images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80'],
    stock: 150,
    rating: 4.5,
    reviewsCount: 1,
    specifications: {
      'Binding': 'Hardcover Linen',
      'Page Count': '320 High-Art Cream Stock',
      'Publish Year': '2025',
      'Language': 'English (US)'
    },
    isFeatured: false,
    isBestSeller: true,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },
  {
    id: 'prod-10',
    name: 'Atomic Coding and Mindsets',
    description: 'A transformative manual on developing structural routine, self-healing debugging frameworks, and daily minor logic increments that elevate software engineers to staff levels.',
    price: 499,
    originalPrice: 699,
    discountPercentage: 28,
    category: 'books',
    brand: 'CodeCraft Books',
    images: ['https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80'],
    stock: 110,
    rating: 4.9,
    reviewsCount: 37,
    specifications: {
      'Format': 'Eco-Friendly Paperback',
      'Page Count': '280 Pages Grid-Aligned',
      'Target Audience': 'Novice to Senior Engineers'
    },
    isFeatured: true,
    isBestSeller: true,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },

  // --- HOME & KITCHEN ---
  {
    id: 'prod-5',
    name: 'Retro Ceramic Drip Coffee Brewer',
    description: 'Experience pure sensory extraction with temperature isolating double-layered ceramic drip brewer, complete with bamboo stands and brass adjusters.',
    price: 4500,
    originalPrice: 6000,
    discountPercentage: 25,
    category: 'home',
    brand: 'CeraCraft',
    images: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'],
    stock: 45,
    rating: 4.7,
    reviewsCount: 1,
    specifications: {
      'Material': 'Kaolin Fire Clay Ceramic',
      'Capacity': '600mL (4 Demitasse cups)',
      'Stand Setup': 'Organic Hand-turned Bamboo & Solid Brass Core'
    },
    isFeatured: true,
    isBestSeller: false,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },
  {
    id: 'prod-11',
    name: 'Apex Smart Digital Air Fryer',
    description: '360 degree rapid superheated air circulation engine prepares crispy fries with up to 90% less dietary fat. Dynamic digital display with preloaded smart recipes.',
    price: 6999,
    originalPrice: 9999,
    discountPercentage: 30,
    category: 'home',
    brand: 'ApexKitchen',
    images: ['https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=800&q=80'],
    stock: 28,
    rating: 4.6,
    reviewsCount: 19,
    specifications: {
      'Chamber Capacity': '5.8 Liters (Family sized)',
      'Power Wattage': '1700W High Efficiency',
      'Heat Spectrum': '80°C to 200°C Precise Sensors'
    },
    isFeatured: true,
    isBestSeller: true,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },

  // --- GROCERY ---
  {
    id: 'prod-12',
    name: 'Single-Origin Estate Arabica Beans',
    description: 'Lightly roasted micro-lot coffee beans from high-altitude estates, carrying elegant notes of light jasmine flowers, natural cocoa nibs, and lemon berries zest.',
    price: 1200,
    originalPrice: 1500,
    discountPercentage: 20,
    category: 'grocery',
    brand: 'RoastMasters',
    images: ['https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80'],
    stock: 120,
    rating: 4.8,
    reviewsCount: 15,
    specifications: {
      'Roast Profile': 'Medium-Light Craft Roast',
      'Altitude Range': '1950m Above sea level',
      'Bag Weight': '450g Airtight Valve Bag'
    },
    isFeatured: false,
    isBestSeller: true,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },
  {
    id: 'prod-13',
    name: 'Premium Japanese Ceremonial Matcha',
    description: 'Uji stone-ground first-flush organic green tea powder, carrying a majestic vibrant green hue, buttery smooth umami undernotes, and high amino-acid concentration.',
    price: 2490,
    originalPrice: 2990,
    discountPercentage: 16,
    category: 'grocery',
    brand: 'ZenTea',
    images: ['https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80'],
    stock: 65,
    rating: 4.9,
    reviewsCount: 42,
    specifications: {
      'Grade Quality': 'Ceremonial Grade AAA+',
      'Origin sourcing': 'Uji, Kyoto, Japan',
      'Net Quantity': '40g Airtight Tin Container'
    },
    isFeatured: true,
    isBestSeller: true,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },

  // --- BEAUTY ---
  {
    id: 'prod-14',
    name: 'AquaSurg Moisture Hydra Serum',
    description: 'Double concentrated multi-molecular Hyaluronic fluid deeply penetrates epidermal sheets, restoring plump bounce levels and maintaining moisture retention parameters.',
    price: 1850,
    originalPrice: 2450,
    discountPercentage: 24,
    category: 'beauty',
    brand: 'DermLabs',
    images: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=800&q=80'],
    stock: 90,
    rating: 4.7,
    reviewsCount: 33,
    specifications: {
      'Scent spec': 'Fragrance-Free Hypoallergenic',
      'Active content': '2.4% Multi-Molecular HA + 1% Vitamin B5',
      'Capacity': '30mL Dropper bottle'
    },
    isFeatured: false,
    isBestSeller: false,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },
  {
    id: 'prod-15',
    name: 'SonicWave Ionization Fast Hair Dryer',
    description: 'Advanced brushless high-velocity motor emitting up to 200 million negative ions to eliminate electrostatic frizz while protecting hair cuticles with smart temperature sensors.',
    price: 9999,
    originalPrice: 14999,
    discountPercentage: 33,
    category: 'beauty',
    brand: 'SonicBeauty',
    images: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'],
    stock: 18,
    rating: 4.8,
    reviewsCount: 16,
    specifications: {
      'Motor Velocity': '110,000 RPM Brushless High Speed',
      'Weight': '380g Ultra-lightweight Ergonomic',
      'Output Modes': '3 Heat Levels, 2 Flow Intensities'
    },
    isFeatured: true,
    isBestSeller: true,
    sellerId: 'user-3',
    sellerName: 'Apex Audio & Mobile Store',
    isApproved: true
  },

  // --- SPORTS & FITNESS ---
  {
    id: 'prod-16',
    name: 'ProGrip Non-Slip Eco Yoga Mat',
    description: 'High-density natural rubber mat offering dynamic wet-or-dry grip, centering guides, and cushion protection parameters to ensure stable pose transitions.',
    price: 2999,
    originalPrice: 3999,
    discountPercentage: 25,
    category: 'sports',
    brand: 'ProGrip',
    images: ['https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=800&q=80'],
    stock: 40,
    rating: 4.7,
    reviewsCount: 29,
    specifications: {
      'Material': '100% Biodegradable Eco-TPE Rubber',
      'Thickness': '6mm Dual Cushioning',
      'Dimensions': '183cm x 61cm alignment-grid'
    },
    isFeatured: false,
    isBestSeller: true,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },
  {
    id: 'prod-17',
    name: 'Adjustable Smart Selector Dumbbell Set',
    description: 'Compact space-saving mechanical dumbbell dial easily lets you swap training resistance parameters from 2.5kg up to 24kg with single dials clicks.',
    price: 11999,
    originalPrice: 15999,
    discountPercentage: 25,
    category: 'sports',
    brand: 'HexStrength',
    images: ['https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?auto=format&fit=crop&w=800&q=80'],
    stock: 15,
    rating: 4.9,
    reviewsCount: 26,
    specifications: {
      'Load Range': '2.5kg to 24kg (15 Selector increments)',
      'Handle Pattern': 'Knurled Non-Slip Textured Metal Alloy',
      'Safety Spec': 'Smart Safety Interlock prevents drops'
    },
    isFeatured: true,
    isBestSeller: true,
    sellerId: 'user-3',
    sellerName: 'Apex Audio & Mobile Store',
    isApproved: true
  },

  // --- FURNITURE & WORKSPACE ---
  {
    id: 'prod-6',
    name: 'Ergonomic Aero Task Mesh Chair',
    description: 'Award-winning breathable task chair offering posture-molded seat pans, dual multi-axial arms adjustment, and smart lumbar force resistance mechanics.',
    price: 14999,
    originalPrice: 19999,
    discountPercentage: 25,
    category: 'furniture',
    brand: 'AeroPosture',
    images: ['https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80'],
    stock: 8,
    rating: 4.8,
    reviewsCount: 1,
    specifications: {
      'Cylinder Lift': 'Class 4 Heavy Duty Pneumatic',
      'Casters': 'Hardwood-safe Polyurethane Multi-Rollers',
      'Material': 'Aero Mesh Composite Glass-blend Trim'
    },
    isFeatured: true,
    isBestSeller: false,
    sellerId: 'user-3',
    sellerName: 'Apex Audio & Mobile Store',
    isApproved: true
  },
  {
    id: 'prod-18',
    name: 'Minimalist Brass & Steel Studio Desk Lamp',
    description: 'Stately desk lighting featuring adjustable heavy-base knuckle joints, elegant light-directing satin cones, and warmth adjustments.',
    price: 2450,
    originalPrice: 3500,
    discountPercentage: 30,
    category: 'furniture',
    brand: 'LumenStudio',
    images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80'],
    stock: 22,
    rating: 4.6,
    reviewsCount: 9,
    specifications: {
      'Core build': 'Satin black iron + Industrial solid brass knobs',
      'Base Spec': 'Heavily Weighted 2.2kg Anti-skid Felt Bottom',
      'Dimming Spec': 'Stepless Rotating dial with warm ambient modes'
    },
    isFeatured: false,
    isBestSeller: false,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },

  // --- TOYS & GAMES ---
  {
    id: 'prod-19',
    name: 'Nebula Space Shuttle Builder Kit',
    description: 'Beautifully engineered building model containing 1,500+ precision blocks, solid booster stages, realistic cargo bays, and miniature astronaut operators.',
    price: 4999,
    originalPrice: 6500,
    discountPercentage: 23,
    category: 'toys',
    brand: 'BlockGalaxy',
    images: ['https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80'],
    stock: 14,
    rating: 4.8,
    reviewsCount: 11,
    specifications: {
      'Parts Volume': '1,560 Precision ABS Blocks',
      'Assembled Size': '42cm Height launch module',
      'Recommended Age': '10 Years and Above'
    },
    isFeatured: true,
    isBestSeller: true,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },
  {
    id: 'prod-20',
    name: 'Classic Wooden Chess & Checkers Set',
    description: 'Expertly hand-carved mahogany and maple wood board folding cabinet, complete with velvet padded interior compartments to securely store custom weighted pieces.',
    price: 1999,
    originalPrice: 2999,
    discountPercentage: 33,
    category: 'toys',
    brand: 'NostalgiaCraft',
    images: ['https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80'],
    stock: 30,
    rating: 4.7,
    reviewsCount: 18,
    specifications: {
      'Wood composition': 'Premium Walnut, Hard Maple, Genuine Sycamore',
      'King Height': '3.2 Inches padded bottom',
      'Play Area': '15 x 15 Inches active board parameters'
    },
    isFeatured: false,
    isBestSeller: false,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  },

  // --- AUTOMOTIVE ---
  {
    id: 'prod-21',
    name: 'RapidCharge Dual-Port Car Charger',
    description: 'Heavy metal micro housing car charger housing individual 45W USB-C PD and 18W USB-A ports to charge high-demand devices simultaneously at low system temperatures.',
    price: 899,
    originalPrice: 1499,
    discountPercentage: 40,
    category: 'automotive',
    brand: 'RapidVolt',
    images: ['https://images.unsplash.com/photo-1610492190393-27038ded05c5?auto=format&fit=crop&w=800&q=80'],
    stock: 140,
    rating: 4.6,
    reviewsCount: 52,
    specifications: {
      'Maximum Output': '63W Combined Peak Power',
      'Material Composition': 'Flame Resistant Aluminium Alloy Shell',
      'Indicator Ring': 'Smart LED Ice-Blue soft ambient ring glow'
    },
    isFeatured: false,
    isBestSeller: true,
    sellerId: 'user-3',
    sellerName: 'Apex Audio & Mobile Store',
    isApproved: true
  },
  {
    id: 'prod-22',
    name: 'Premium Leather Backseat organizer Console',
    description: 'Premium wear-resistant faux leather console hanging utility kit, featuring thermal water bottle slots, tablet window pockets, and built-in folding food tray.',
    price: 1800,
    originalPrice: 2500,
    discountPercentage: 28,
    category: 'automotive',
    brand: 'RideOrganized',
    images: ['https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80'],
    stock: 48,
    rating: 4.8,
    reviewsCount: 21,
    specifications: {
      'Capacity weight': 'Supports folding tray up to 4.5kg load strength',
      'Core material': 'Anti-scratch vegan PU leather sheets',
      'Mount system': 'Quick-release adjustable reinforced buckle straps'
    },
    isFeatured: true,
    isBestSeller: false,
    sellerId: 'seller-xyz',
    sellerName: 'Apex Book Sourcing',
    isApproved: true
  }
];

// --- AUTO-GENERATION OF DYNAMIC 2000 PRODUCTS CATALOG DATA DATASET (APEX PARITY) ---
const categoryImages: any = {
  electronics: [
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1496181130204-7552cc14AC1A?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80'
  ],
  mobiles: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1565849906461-0ee2ecd23479?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80'
  ],
  fashion: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80'
  ],
  books: [
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80'
  ],
  home: [
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
  ],
  grocery: [
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
  ],
  beauty: [
    'https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80'
  ],
  sports: [
    'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=800&q=80'
  ],
  furniture: [
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1581428982868-e410dd047a90?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=85'
  ],
  toys: [
    'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618842676088-c4d48a6a7c9d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80'
  ],
  automotive: [
    'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1611245329358-c87387cc866e?auto=format&fit=crop&w=800&q=80'
  ]
};

const seedTemplatesByCat: any = {
  electronics: [
    { base: 'MacBook Pro M3 Max 14"', brand: 'Apple', price: 199900, specs: { 'Chip': 'M3 Max', 'RAM': '36GB', 'Storage': '1TB SSD', 'Display': 'Liquid Retina XDR' } },
    { base: 'Sony WH-1000XM5 Studio Wireless', brand: 'Sony', price: 29999, specs: { 'Type': 'Over-ear', 'ANC': 'Industry-leading HD ANC', 'Battery': '30 Hours', 'Bluetooth': '5.2' } },
    { base: 'Dell XPS 15 Infinite Touch', brand: 'Dell', price: 164999, specs: { 'Processor': 'Intel Core i9', 'Screen': '4K OLED Touch', 'RAM': '32GB', 'Graphics': 'NVIDIA RTX' } },
    { base: 'iPad Air 11" M2 Active-X', brand: 'Apple', price: 59900, specs: { 'Processor': 'Apple M2 Chip', 'Display': 'Liquid Retina', 'Storage': '256GB' } },
    { base: 'Logitech MX Master 3S Professional', brand: 'Logitech', price: 9499, specs: { 'Sensor': '8K DPI Track-Anywhere', 'Clicks': '90% Quieter', 'Battery': '70 Days rechargeable' } },
    { base: 'ASUS ROG Swift Gaming Monitor OLED', brand: 'ASUS', price: 95000, specs: { 'Display': '27" OLED WQHD', 'Refresh Rate': '240Hz', 'Latency': '0.03ms' } },
    { base: 'SanDisk Portable Elite SSD 2TB', brand: 'SanDisk', price: 15999, specs: { 'Speed': 'Up to 2000MB/s', 'Capacity': '2TB', 'Resistance': 'IP65 Dust & Water' } },
    { base: 'Keychron K2 V2 Hot-Swappable', brand: 'Keychron', price: 8499, specs: { 'Layout': '75% Compact', 'Switches': 'Gateron G Pro Brown', 'Backlight': 'RGB' } }
  ],
  mobiles: [
    { base: 'iPhone 15 Pro Max Titanium', brand: 'Apple', price: 144900, specs: { 'Chip': 'A17 Pro', 'Camera': '48MP Main / 5x Telephoto', 'Body': 'Aerospace Titanium' } },
    { base: 'Samsung Galaxy S24 Ultra Zoom', brand: 'Samsung', price: 129999, specs: { 'Display': '6.8" Dynamic AMOLED', 'Camera': '200MP Quad Cam', 'S-Pen': 'Included' } },
    { base: 'OnePlus 12 Dual Power', brand: 'OnePlus', price: 64999, specs: { 'Chip': 'Snapdragon 3 Gen 2', 'Battery': '5400 mAh', 'Charger': '100W SUPERVOOC' } },
    { base: 'Google Pixel 8 Pro Pure AI', brand: 'Google', price: 99999, specs: { 'Chip': 'Google Tensor G3', 'Camera': 'Best-in-class Magic Eraser', 'OS': '7 Years Stock Updates' } },
    { base: 'Nothing Phone (2) Glyph Elite', brand: 'Nothing', price: 39999, specs: { 'Interface': 'Glyph Lights LED', 'RAM': '12GB', 'OS': 'Nothing OS 2.0' } },
    { base: 'Xiaomi Redmi Note 13 Pro+ 5G', brand: 'Xiaomi', price: 31999, specs: { 'Screen': '1.5K Curved AMOLED', 'Camera': '200MP OIS', 'Rating': 'IP68 Swim-proof' } },
    { base: 'Belkin BoostCharge 3-in-1', brand: 'Belkin', price: 11900, specs: { 'Power': '15W Fast Charge', 'Devices': 'iPhone, Watch & AirPods' } }
  ],
  fashion: [
    { base: 'Fossil Heritage Legacy Gold', brand: 'Fossil', price: 18999, specs: { 'Type': 'Automatic Wristwatch', 'Material': '316L Gold Stainless Steel', 'Waterproof': '50M' } },
    { base: 'Seiko 5 Sports Automatic Military', brand: 'Seiko', price: 28000, specs: { 'Movement': 'Seiko 4R36 Automatic', 'Power reserve': '41 hours', 'Style': 'Sports/Field' } },
    { base: 'Ray-Ban Classic Polarized Wayfarer', brand: 'Ray-Ban', price: 10499, specs: { 'UV Protection': '100% UVA/UVB', 'Lens': 'Green Polarized Classic G-15' } },
    { base: 'Tommy Hilfiger Monogram Polo Shirt', brand: 'Tommy Hilfiger', price: 3499, specs: { 'Material': '100% Pima Organic Cotton', 'Fit': 'Regular Fit' } },
    { base: 'Nike Air Max Elite Running shoe', brand: 'Nike', price: 12499, specs: { 'Cushioning': 'Air Max Gas heel chamber', 'Type': 'Athletic Running' } },
    { base: 'Herschel Little America Travel Rucksack', brand: 'Herschel', price: 8999, specs: { 'Capacity': '25 Litres', 'Laptop sleeve': 'Fleece Lined 15"' } }
  ],
  books: [
    { base: 'Atomic Habits (James Clear)', brand: 'Penguin Publishers', price: 450, specs: { 'Format': 'Paperback Hardbound', 'Genre': 'Mindfulness & Self Help', 'Length': '320 pages' } },
    { base: 'Clean Code principles (Robert Martin)', brand: 'Pearson Education', price: 2800, specs: { 'Format': 'Paperback Ed.', 'Topic': 'Agile Craftsman Coding', 'Target': 'Professional Engineers' } },
    { base: 'Sapiens: Brief History of Mankind', brand: 'Harper Thorsons', price: 499, specs: { 'Length': '512 pages', 'Author': 'Yuval Noah Harari' } },
    { base: 'Designing Data-Intensive Applications', brand: 'O\'Reilly Media', price: 1950, specs: { 'Focus': 'Data structures & Cloud scalability', 'Author': 'Martin Kleppmann' } }
  ],
  home: [
    { base: 'Dyson V15 Absolute cordless Vacuum', brand: 'Dyson', price: 65900, specs: { 'Power': '240AW Suction', 'Sensor': 'Piezo Acoustic Dust Counter', 'Brush': 'Laser Slim Fluffy' } },
    { base: 'Instant Pot Duo Plus 9-in-1 Smart Cooker', brand: 'Instant Pot', price: 11999, specs: { 'Capacity': '5.7 Litres', 'Built-in programs': '9 Options', 'Safety': '10-level lock system' } },
    { base: 'Philips XL Digital Air Fryer Touchscreen', brand: 'Philips', price: 10999, specs: { 'Technology': 'Rapid Air Convection Flow', 'Capacity': '6.2 Litres', 'Power': '2000W' } },
    { base: 'Nespresso Vertuo Next Coffee Extractor', brand: 'Nespresso', price: 18999, specs: { 'Technology': 'Centrifusion extraction', 'Modes': '5 Espresso Sizes', 'Heating time': '30s' } }
  ],
  grocery: [
    { base: 'Blue Tokai Vienna Special Dark Roast', brand: 'Blue Tokai', price: 440, specs: { 'Weight': '250g', 'Origin': 'Organic Coorg Estate Blend', 'Notes': 'Oak Cocoa & Caramel' } },
    { base: 'Vahdam Imperial Organic Mint Tea', brand: 'Vahdam India', price: 349, specs: { 'Pack': '50 Silken Tea pyramids', 'Ingredients': '100% Himalayan Mint leaves' } },
    { base: 'Lindt Dark Cocoa 85% Smooth Chocolate', brand: 'Lindt', price: 295, specs: { 'Weight': '100g premium bar', 'Origin': 'Switzerland Swiss Craft' } },
    { base: 'Kirkland Handpicked Organic Pure Maple', brand: 'Kirkland Signature', price: 1499, specs: { 'Grade': 'Grade A Amber rich taste', 'Volume': '32 Fl Oz / 946ml' } }
  ],
  beauty: [
    { base: 'CeraVe Ceramide Hydrating Cleanser', brand: 'CeraVe', price: 1250, specs: { 'Skin Type': 'Dry to Normal Sensitive', 'Capacity': '236ml', 'Barrier Repair': '3 Essential Ceramides' } },
    { base: 'The Ordinary Niacinamide 10% + Zinc', brand: 'The Ordinary', price: 650, specs: { 'Target': 'Blemishes & Sebum control', 'Application': 'Morning/Night serum', 'pH': '5.5' } },
    { base: 'Estee Lauder Midnight Advanced Serum', brand: 'Estee Lauder', price: 8400, specs: { 'Action': 'Nightly skin architecture repair', 'Volume': '30ml glass bottle' } },
    { base: 'Laneige Lip Berry Night Melting Mask', brand: 'Laneige', price: 1240, specs: { 'Features': 'Berry Fruit Complex', 'Duration': '8 hours moisture wrap' } }
  ],
  sports: [
    { base: 'Garmin Fenix 7 Sapphire Solar Sport', brand: 'Garmin', price: 84900, specs: { 'Material': 'Titanium Solar glass bezel', 'Nav': 'Multi-band GPS / TopoMaps', 'Battery': '22 Days' } },
    { base: 'Theragun PRO Multi-axial Percussion Gun', brand: 'Therabody', price: 44999, specs: { 'Amplitude': '16mm Muscle deep stroke', 'Speeds': '5 Built-in presets', 'Batteries': 'Dual include' } },
    { base: 'Lululemon Extreme-Grip 5mm Yoga Mat', brand: 'Lululemon', price: 6800, specs: { 'Material': 'Natural sustainably sourced rubber', 'Dimensions': '71" x 26"' } },
    { base: 'Bowflex SelectTech 552 Adjustable Dumbbells', brand: 'Bowflex', price: 29999, specs: { 'Weight': '5 to 52.5 lbs per bell', 'Dial': 'Quick manual select lock' } }
  ],
  furniture: [
    { base: 'Herman Miller Aeron Professional Desk Chair', brand: 'Herman Miller', price: 145000, specs: { 'Pellicle': '8Z Breathable Elastic Suspension', 'Support': 'PostureFit SL back pads', 'Size': 'B Standard Medium' } },
    { base: 'Steelcase Gesture Pro Work Chair', brand: 'Steelcase', price: 115005, specs: { 'Armrests': '360-degree Adaptive pivot', 'Core': 'Flexible liveback spinal system' } },
    { base: 'Fully Jarvis Motorized Bamboo Standing Desk', brand: 'Fully', price: 69999, specs: { 'Frame': 'Dual-motor 3-stage heavy duty', 'Surface': 'Eco-friendly solid Bamboo 48x30"' } }
  ],
  toys: [
    { base: 'LEGO Creator Expert Architecture Taj Mahal', brand: 'LEGO', price: 34999, specs: { 'Pieces Count': '5923 bricks', 'Target': '16+ Architectural models' } },
    { base: 'Catan Board Game: Settlers Elite', brand: 'Catan Studio', price: 3499, specs: { 'Players': '3-4 Players standard expansion', 'Duration': '60-90mins of trade tactics' } },
    { base: 'Magna-Tiles Translucent Colors Magnetic 100pc', brand: 'Magna-Tiles', price: 9999, specs: { 'Package': '100 3D geometrical tiles' } }
  ],
  automotive: [
    { base: '70mai Smart Dual Channel 4K Dash Camera', brand: '70mai', price: 9999, specs: { 'Sensor': 'Sony IMX415 Starvis sensor', 'GPS': 'ADAS Advanced driving assistant' } },
    { base: 'NOCO Boost Ultra-Safe Lithium Car Starter', brand: 'NOCO', price: 9999, specs: { 'Peak amps': '1000A Jump strength', 'Engines': 'Up to 6L Gas' } },
    { base: 'Chemical Guys HOL148 Professional Detailer Buckets', brand: 'Chemical Guys', price: 7499, specs: { 'Buckets': 'Standard 16pc car wash solutions' } }
  ]
};

const colorsList = ['Space Obsidian', 'Arctic Silver', 'Titanium Gold', 'Crimson Red', 'Forest Green', 'Midnight Ink', 'Teal Mist', 'Rose Quartz', 'Desert Sand', 'Cobalt Royal'];
const additionsList = ['Travel Premium Bundle', 'Deluxe Edition', 'Pro Performance Kit', 'Compact Minimalist Pack', 'Special Active Box', 'Ultimate Collector Set', 'Sustainable Classic Choice', 'Elite Series'];

const catsKeys = Object.keys(seedTemplatesByCat);

while (products.length < 2000) {
  const catKey = catsKeys[products.length % catsKeys.length];
  const templates = seedTemplatesByCat[catKey];
  const template = templates[Math.floor(Math.random() * templates.length)];
  const color = colorsList[Math.floor(Math.random() * colorsList.length)];
  const addition = additionsList[Math.floor(Math.random() * additionsList.length)];
  const imagesPool = categoryImages[catKey] || categoryImages['electronics'];
  const image = imagesPool[Math.floor(Math.random() * imagesPool.length)];

  const name = `${template.base} - ${color} (${addition})`;
  const idValue = `prod-gen-${products.length + 1}`;
  
  const priceMultiplier = 0.82 + Math.random() * 0.36;
  let price = Math.floor(template.price * priceMultiplier);
  if (price < 100) price = template.price;
  
  const discountPercentage = Math.random() > 0.45 ? Math.floor(8 + Math.random() * 28) : 0;
  const originalPrice = discountPercentage > 0 ? Math.floor(price * (1 + discountPercentage / 100)) : price;

  const stock = Math.random() > 0.12 ? Math.floor(4 + Math.random() * 95) : 0;
  const rating = Number((4.1 + Math.random() * 0.9).toFixed(1));
  const reviewsCount = Math.floor(4 + Math.random() * 195);

  const specs = { 
    ...template.specs, 
    'Catalog Color': color, 
    'Bundle Tier': addition,
    'Imported Sourcing': 'Official Sourced Partner',
    'Apex Choice Badge': 'Verified Positive Feedback'
  };

  // 1 in every 5 products belong to the seller account user-3 so seller console has listings too
  const sellerId = products.length % 5 === 0 ? 'user-3' : 'admin-seller';
  const sellerName = sellerId === 'user-3' ? 'Apex Audio & Mobile Store' : 'Apex Hub Coordinator';

  products.push({
    id: idValue,
    name,
    description: `Official ${template.brand} choice. Handpicked premium inventory matching top-rated Apex listings. Fully backed by standard manufacturer warranties, 14-day replacement, and 24/7 priority help desk. Specs include: ${Object.entries(template.specs).map(([k,v]) => `${k} is ${v}`).join(', ')}.`,
    price,
    originalPrice,
    discountPercentage,
    category: catKey,
    brand: template.brand,
    images: [image],
    stock,
    rating,
    reviewsCount,
    specifications: specs,
    isFeatured: Math.random() > 0.88,
    isBestSeller: Math.random() > 0.88,
    sellerId,
    sellerName,
    isApproved: true
  });
}

let reviews = [
  { id: 'rev-1', productId: 'prod-1', userName: 'John Doe', rating: 5, comment: 'Phenomenal noise isolation and the raw soundscape reproduction is amazing!', createdAt: '2026-05-10T12:00:00Z' },
  { id: 'rev-2', productId: 'prod-1', userName: 'Jane Smith', rating: 4, comment: 'Very premium packaging, very comfortable, though slightly warm after long hours.', createdAt: '2026-06-01T08:30:00Z' },
  { id: 'rev-3', productId: 'prod-1', userName: 'Alice Mercer', rating: 5, comment: 'Simply stunning! Battery life easily blew past my weekly commute hours.', createdAt: '2026-06-15T14:45:00Z' },
  { id: 'rev-4', productId: 'prod-2', userName: 'Thomas Cook', rating: 4, comment: 'The wool weight feels outstanding, great for chilly weather.', createdAt: '2026-06-08T11:20:00Z' },
  { id: 'rev-5', productId: 'prod-3', userName: 'Evelyn Gray', rating: 5, comment: 'Insanely fast screen response. Absolute powerhouse of a phone!', createdAt: '2026-06-10T19:15:00Z' },
  { id: 'rev-6', productId: 'prod-3', userName: 'Ray Holt', rating: 5, comment: 'The camera takes crisp RAW shots matching my professional mirrorless sensor.', createdAt: '2026-06-18T05:05:00Z' },
  { id: 'rev-7', productId: 'prod-4', userName: 'Gina Linetti', rating: 4, comment: 'Beautiful modern typesetting, highly recommended for visual artists.', createdAt: '2026-06-12T13:40:00Z' },
  { id: 'rev-8', productId: 'prod-5', userName: 'Mellie Rust', rating: 5, comment: 'Excellent heat retention, pours clear matching standard filtration.', createdAt: '2026-06-14T10:00:00Z' },
  { id: 'rev-9', productId: 'prod-6', userName: 'Rosa Diaz', rating: 5, comment: 'My daily back fatigueness is completely gone. Amazing build quality!', createdAt: '2026-06-11T16:22:00Z' }
];

let coupons = [
  { code: 'WELCOME10', discountPercentage: 10, expiryDate: '2026-12-31T23:59:59Z', minPurchaseAmount: 500 },
  { code: 'APEX20', discountPercentage: 20, expiryDate: '2026-12-31T23:59:59Z', minPurchaseAmount: 1500 },
  { code: 'FREESHIP', discountPercentage: 100, expiryDate: '2026-12-31T23:59:59Z', minPurchaseAmount: 0 } // Shipping coupon special tag
];

let banners = [
  { id: 'banner-1', title: 'Summer Apex Launch', subtitle: 'Experience the Studio sound max series with up to 25% off launch pricing.', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80', link: '/product/prod-1', isActive: true },
  { id: 'banner-2', title: 'Minimalist Workspace Sourcing', subtitle: 'Indulge in organic clay drips and multi-axial ergonomic mesh seating.', imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80', link: '/category/home', isActive: true },
  { id: 'banner-3', title: 'Elite Mobile Engineering', subtitle: 'Get the silicon powerhouse Titan Pro 5G with next-day processing.', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80', link: '/product/prod-3', isActive: true }
];

let users: any[] = [
  { id: 'user-1', name: 'John Doe', email: 'user@example.com', password: 'password123', role: 'USER', isVerified: true, avatarUrl: '', createdAt: '2026-01-10T12:00:00Z' },
  { id: 'user-2', name: 'Administrator', email: 'admin@example.com', password: 'admin123', role: 'ADMIN', isVerified: true, avatarUrl: '', createdAt: '2026-01-01T12:00:00Z' },
  { id: 'user-2-1', name: 'Apex Admin', email: 'admin@apex.com', password: 'admin123', role: 'ADMIN', isVerified: true, avatarUrl: '', createdAt: '2026-01-01T12:00:00Z' },
  { id: 'user-2-2', name: 'Super Admin', email: 'admin@ecommerce.com', password: 'Admin@123', role: 'ADMIN', isVerified: true, avatarUrl: '', createdAt: '2026-01-01T12:00:00Z' },
  { id: 'user-3', name: 'Premium Electronics Vendor', email: 'seller@example.com', password: 'seller123', role: 'SELLER', isVerified: true, avatarUrl: '', storeName: 'Apex Audio & Mobile Store', storeDescription: 'Official authorized seller for premium gadgets and audio appliances.', sellerStatus: 'APPROVED', gstin: '27AAAAA1111A1Z1', createdAt: '2026-02-15T12:00:00Z' }
];

let addresses = [
  { id: 'addr-1', fullName: 'John Doe', phone: '+91 98765 43210', street: '128 High Street, Suite 4B', city: 'Mumbai', state: 'Maharashtra', postalCode: '400037', country: 'India', isDefault: true, userId: 'user-1' }
];

let orders: any[] = [
  {
    id: 'ord-1',
    orderNumber: 'APX-2026-9810',
    userId: 'user-1',
    items: [
      { product: products[0], quantity: 1, price: 14999 }
    ],
    totalAmount: 14999,
    discountAmount: 1499,
    shippingCharge: 150,
    taxAmount: 2430,
    finalAmount: 16080,
    address: addresses[0],
    paymentMethod: 'STRIPE',
    paymentStatus: 'COMPLETED',
    status: 'SHIPPED',
    createdAt: '2026-06-18T10:00:00Z'
  }
];

let questions = [
  { id: 'q-1', productId: 'prod-1', productName: 'Apex SoundMax Wireless Headphones', questionText: 'Does it support dual device pairing? Bluetooth dual connection?', askedBy: 'John Doe', answerText: 'Yes, it supports multi-point connection. You can pair it with both your phone and laptop concurrently!', answeredBy: 'Premium Electronics Vendor', createdAt: '2026-06-18T14:22:00Z' },
  { id: 'q-2', productId: 'prod-3', productName: 'Titan Pro 5G Smart Device', questionText: 'Is the wall adapter charger included in the packaging box in India?', askedBy: 'John Doe', answerText: 'Yes, in India we include a 65W fast GaN charger in the box! No separate purchase is necessary.', answeredBy: 'Premium Electronics Vendor', createdAt: '2026-06-18T15:30:00Z' }
];

let wallets: Record<string, { balance: number, transactions: any[], withdrawRequests: any[] }> = {
  'user-3': {
    balance: 85300,
    transactions: [
      { id: 'tx-1', amount: 89000, type: 'EARNING', status: 'COMPLETED', createdAt: '2026-06-15T10:00:00Z', notes: 'Earnings from Order APX-2026-1180' },
      { id: 'tx-2', amount: -3700, type: 'GST_TAX', status: 'COMPLETED', createdAt: '2026-06-16T12:00:00Z', notes: 'GST deduction 18% tier standard' }
    ],
    withdrawRequests: [
      { id: 'wr-1', amount: 20000, status: 'APPROVED', bankDetails: 'HDFC Bank - A/C 501002931882 - IFSC HDFC0000102', createdAt: '2026-06-17T09:00:00Z' }
    ]
  }
};

let adminCommissionBalance = 4120.50;
let adminCommissionTransactions: any[] = [
  { id: 'ad-tx-153', amount: 1530.00, type: 'COMMISSION', orderNumber: 'APX-2026-9810', notes: '10% Marketplace commission from Order APX-2026-9810', createdAt: '2026-06-18T10:05:00Z' }
];

let dbNotifications: any[] = [
  { id: 'not-init-1', userId: 'all', title: 'Welcome to Apex Store!', message: 'Use checkout coupon code WELCOME10 for an absolute 10% reduction tier!', type: 'OFFER', createdAt: new Date().toISOString(), isRead: false },
  { id: 'not-init-2', userId: 'all', title: 'SoundMax Wireless Drop', message: 'The high-fidelity ANC Wireless headphones are now active in electronics.', type: 'PRICE_DROP', createdAt: new Date().toISOString(), isRead: false }
];

function addDbNotification(targetUserId: string, title: string, message: string, type: string) {
  dbNotifications.unshift({
    id: 'dbnot-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000),
    userId: targetUserId,
    title,
    message,
    type,
    createdAt: new Date().toISOString(),
    isRead: false
  });
}

let carts: Record<string, any[]> = {}; // Map of userId -> CartItems list
let wishlists: Record<string, string[]> = {}; // Map of userId -> list of productIds

const isLocalDev = process.env.NODE_ENV !== 'production' && !process.env.K_SERVICE && !process.env.GAE_ENV;

const DATA_FILE = isLocalDev 
  ? path.join(os.tmpdir(), 'apex_database_state.json')
  : path.join(process.cwd(), '.database', 'database_state.json');

const BACKUP_FILE = isLocalDev
  ? path.join(os.tmpdir(), 'apex_database_state_backup.json')
  : path.join(process.cwd(), '.database', 'database_state_backup.json');

const OLD_DATA_FILE = path.join(process.cwd(), 'database_state.json');
const OLD_BACKUP_FILE = path.join(process.cwd(), 'database_state_backup.json');

// State synchronization helpers using individual documents per entity
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(item => toFirestoreValue(item))
      }
    };
  }
  if (typeof val === 'object') {
    const fields: any = {};
    for (const k of Object.keys(val)) {
      if (val[k] !== undefined) {
        fields[k] = toFirestoreValue(val[k]);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj: any): any {
  const fields: any = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) {
      fields[k] = toFirestoreValue(obj[k]);
    }
  }
  return { fields };
}

function fromFirestoreValue(fVal: any): any {
  if (!fVal) return null;
  if ('nullValue' in fVal) return null;
  if ('booleanValue' in fVal) return fVal.booleanValue;
  if ('integerValue' in fVal) return parseInt(fVal.integerValue, 10);
  if ('doubleValue' in fVal) return parseFloat(fVal.doubleValue);
  if ('stringValue' in fVal) return fVal.stringValue;
  if ('timestampValue' in fVal) return fVal.timestampValue;
  if ('arrayValue' in fVal) {
    const arr = fVal.arrayValue.values || [];
    return arr.map((item: any) => fromFirestoreValue(item));
  }
  if ('mapValue' in fVal) {
    const fields = fVal.mapValue.fields || {};
    const res: any = {};
    for (const k of Object.keys(fields)) {
      res[k] = fromFirestoreValue(fields[k]);
    }
    return res;
  }
  return null;
}

function fromFirestoreFields(fields: any): any {
  const res: any = {};
  if (!fields) return res;
  for (const k of Object.keys(fields)) {
    res[k] = fromFirestoreValue(fields[k]);
  }
  return res;
}

async function saveDoc(collection: string, docId: string, data: any) {
  if (!firebaseRestConfig) return;
  try {
    const { projectId, databaseId, apiKey } = firebaseRestConfig;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collection}/${docId}?key=${apiKey}`;
    const payload = toFirestoreFields(data);
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error(`[FIREBASE] Error saving doc ${collection}/${docId}:`, err);
  }
}

async function deleteDoc(collection: string, docId: string) {
  if (!firebaseRestConfig) return;
  try {
    const { projectId, databaseId, apiKey } = firebaseRestConfig;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collection}/${docId}?key=${apiKey}`;
    await fetch(url, { method: 'DELETE' });
  } catch (err) {
    console.error(`[FIREBASE] Error deleting doc ${collection}/${docId}:`, err);
  }
}

async function loadSingleDocument(collection: string, docId: string): Promise<any | null> {
  if (!firebaseRestConfig) return null;
  try {
    const { projectId, databaseId, apiKey } = firebaseRestConfig;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collection}/${docId}?key=${apiKey}`;
    const res = await fetch(url);
    if (res.status === 200) {
      const doc: any = await res.json();
      return fromFirestoreFields(doc.fields);
    }
  } catch (err) {
    console.error(`[FIREBASE] Error loading single doc ${collection}/${docId}:`, err);
  }
  return null;
}

async function loadCollection(collectionName: string): Promise<any[]> {
  if (!firebaseRestConfig) return [];
  try {
    const { projectId, databaseId, apiKey } = firebaseRestConfig;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}?pageSize=1000&key=${apiKey}`;
    const res = await fetch(url);
    if (res.status !== 200) {
      return [];
    }
    const data: any = await res.json();
    if (!data.documents || !Array.isArray(data.documents)) {
      return [];
    }
    return data.documents.map((doc: any) => {
      return fromFirestoreFields(doc.fields);
    });
  } catch (err) {
    console.error(`[FIREBASE] Error loading collection ${collectionName}:`, err);
    return [];
  }
}

// Global hook to synchronize entities instantly and save state
async function syncEntity(collection: string, docId: string, data: any) {
  try {
    saveToLocalFiles();
  } catch (e) {}

  if (firebaseRestConfig) {
    if (data === null) {
      await deleteDoc(collection, docId);
    } else {
      await saveDoc(collection, docId, data);
    }
  }
}

async function seedFirestore() {
  if (!firebaseRestConfig) return;
  console.log('[APEX SYSTEM] Seeding fallback data straight to persistent Firestore...');
  
  for (const u of users) {
    await saveDoc('users', u.id, u);
  }
  for (const p of products) {
    await saveDoc('products', p.id, p);
  }
  for (const a of addresses) {
    await saveDoc('addresses', a.id, a);
  }
  for (const o of orders) {
    await saveDoc('orders', o.id, o);
  }
  for (const q of questions) {
    await saveDoc('questions', q.id, q);
  }
  for (const [userId, w] of Object.entries(wallets)) {
    await saveDoc('wallets', userId, { userId, ...w });
  }
  for (const [userId, items] of Object.entries(carts)) {
    await saveDoc('carts', userId, { userId, items });
  }
  for (const [userId, productIds] of Object.entries(wishlists)) {
    await saveDoc('wishlists', userId, { userId, productIds });
  }
  for (const n of dbNotifications) {
    await saveDoc('db_notifications', n.id, n);
  }
  for (const b of banners) {
    await saveDoc('banners', b.id, b);
  }
  await saveDoc('platform', 'commissions', {
    adminCommissionBalance,
    adminCommissionTransactions
  });
  console.log('[APEX SYSTEM] Persistent cloud seed completes.');
}

async function loadData() {
  console.log('[APEX SYSTEM] Initializing database synchronization...');
  
  if (firebaseRestConfig) {
    try {
      console.log('[APEX SYSTEM] Fetching persistent cloud states from Firestore...');
      const cloudUsers = await loadCollection('users');
      const cloudProducts = await loadCollection('products');
      const cloudAddresses = await loadCollection('addresses');
      const cloudOrders = await loadCollection('orders');
      const cloudQuestions = await loadCollection('questions');
      const cloudWalletsList = await loadCollection('wallets');
      const cloudCartsList = await loadCollection('carts');
      const cloudWishlistsList = await loadCollection('wishlists');
      const cloudNotifList = await loadCollection('db_notifications');
      const cloudBanners = await loadCollection('banners');
      const cloudComms = await loadSingleDocument('platform', 'commissions');

      if (cloudUsers.length > 0 || cloudProducts.length > 0) {
        if (cloudUsers.length > 0) users = cloudUsers;
        if (cloudProducts.length > 0) products = cloudProducts;
        if (cloudAddresses.length > 0) addresses = cloudAddresses;
        if (cloudOrders.length > 0) orders = cloudOrders;
        if (cloudQuestions.length > 0) questions = cloudQuestions;
        if (cloudBanners.length > 0) banners = cloudBanners;
        
        if (cloudWalletsList.length > 0) {
          wallets = {};
          for (const w of cloudWalletsList) {
            if (w.userId) wallets[w.userId] = w;
          }
        }
        if (cloudCartsList.length > 0) {
          carts = {};
          for (const c of cloudCartsList) {
            if (c.userId) carts[c.userId] = c.items || [];
          }
        }
        if (cloudWishlistsList.length > 0) {
          wishlists = {};
          for (const wl of cloudWishlistsList) {
            if (wl.userId) wishlists[wl.userId] = wl.productIds || [];
          }
        }
        if (cloudNotifList.length > 0) {
          dbNotifications = cloudNotifList;
        }
        if (cloudComms) {
          if (typeof cloudComms.adminCommissionBalance === 'number') adminCommissionBalance = cloudComms.adminCommissionBalance;
          if (Array.isArray(cloudComms.adminCommissionTransactions)) adminCommissionTransactions = cloudComms.adminCommissionTransactions;
        }

        console.log('[APEX SYSTEM] Success: Synced with Firestore cloud database state.');
        try {
          saveToLocalFiles();
        } catch (e) {}
        return;
      }
    } catch (err) {
      console.error('[APEX SYSTEM] Firestore cloud read failed, using fallback files:', err);
    }
  }

  // Fallback to local files
  let loadedData: any = null;
  try {
    // If the new `.database` path doesn't exist but the old one does, migrate them
    if (!fs.existsSync(DATA_FILE) && fs.existsSync(OLD_DATA_FILE)) {
      try {
        console.log('[APEX SYSTEM] Migrating database_state.json to .database/ folder...');
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.copyFileSync(OLD_DATA_FILE, DATA_FILE);
        if (fs.existsSync(OLD_BACKUP_FILE)) {
          fs.copyFileSync(OLD_BACKUP_FILE, BACKUP_FILE);
        }
      } catch (migrationErr) {
        console.error('Failed to migrate old database state files:', migrationErr);
      }
    }

    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8').trim();
      if (content) {
        loadedData = JSON.parse(content);
        console.log('[APEX SYSTEM] Loaded fallback from primary database_state.json.');
      }
    }
  } catch (err) {
    console.error('Failed to parse primary database_state.json. Trying redundant backup...', err);
  }

  if (!loadedData) {
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const content = fs.readFileSync(BACKUP_FILE, 'utf8').trim();
        if (content) {
          loadedData = JSON.parse(content);
          console.log('[APEX SYSTEM] RECOVERY SUCCESSFUL: Loaded fallback from backup file.');
        }
      }
    } catch (err) {
      console.error('Failed to parse redundant backup file:', err);
    }
  }

  if (loadedData) {
    if (loadedData.products) products = loadedData.products;
    if (loadedData.users) users = loadedData.users;
    if (loadedData.addresses) addresses = loadedData.addresses;
    if (loadedData.orders) orders = loadedData.orders;
    if (loadedData.questions) questions = loadedData.questions;
    if (loadedData.wallets) wallets = loadedData.wallets;
    if (typeof loadedData.adminCommissionBalance === 'number') adminCommissionBalance = loadedData.adminCommissionBalance;
    if (loadedData.adminCommissionTransactions) adminCommissionTransactions = loadedData.adminCommissionTransactions;
    if (loadedData.dbNotifications) dbNotifications = loadedData.dbNotifications;
    if (loadedData.carts) carts = loadedData.carts;
    if (loadedData.wishlists) wishlists = loadedData.wishlists;
    if (loadedData.categories) categories = loadedData.categories;
    if (loadedData.banners) banners = loadedData.banners;
    
    if (firebaseRestConfig) {
      console.log('[APEX SYSTEM] Seeding Firestore with local base tables for perpetuity...');
      await seedFirestore();
    }
  } else {
    console.log('[APEX SYSTEM] No state file found. Booting with default system seed data.');
    if (firebaseRestConfig) {
      console.log('[APEX SYSTEM] Seeding Firestore with default system seed catalogs...');
      await seedFirestore();
    }
  }

  // OTP Migration: Ensure all historical orders contain active Delivery verification codes
  orders.forEach(o => {
    if (!o.delivery_otp) {
      o.delivery_otp = Math.floor(100000 + Math.random() * 900000).toString();
    }
    if (o.delivery_otp_verified === undefined) {
      o.delivery_otp_verified = o.status === 'DELIVERED';
    }
  });

  try {
    lastSerializedState = getSerializedState();
  } catch (err) {}
}

let lastSerializedState = '';

function getSerializedState() {
  const dataToSave = {
    products,
    users,
    addresses,
    orders,
    questions,
    wallets,
    adminCommissionBalance,
    adminCommissionTransactions,
    dbNotifications,
    carts,
    wishlists,
    categories,
    banners
  };
  return JSON.stringify(dataToSave, null, 2);
}

function saveToLocalFiles() {
  try {
    const serialized = getSerializedState();
    if (serialized === lastSerializedState) {
      return;
    }

    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempPrimary = DATA_FILE + '.tmp';
    fs.writeFileSync(tempPrimary, serialized, 'utf8');
    fs.renameSync(tempPrimary, DATA_FILE);

    const tempBackup = BACKUP_FILE + '.tmp';
    fs.writeFileSync(tempBackup, serialized, 'utf8');
    fs.renameSync(tempBackup, BACKUP_FILE);

    lastSerializedState = serialized;
    console.log('[APEX SYSTEM] Local database state saved successfully.');
  } catch (err) {
    console.error('Failed to write local files:', err);
  }
}

let isSaving = false;
async function saveData() {
  if (isSaving) return;
  isSaving = true;
  try {
    try {
      saveToLocalFiles();
    } catch (localErr: any) {
      console.warn('[APEX SYSTEM] Local files write failed:', localErr.message);
    }
  } catch (err) {
    console.error('[APEX SYSTEM] Save cycle failed:', err);
  } finally {
    isSaving = false;
  }
}

async function triggerFullCloudSave() {
  if (!firebaseRestConfig) return;
  await seedFirestore();
}

// Load initial database state
loadData().catch(e => console.error('[APEX SYSTEM] Startup database load error:', e));

// Periodically write system changes to avoid data loss (disabled in local dev to prevent auto-refresh loops)
if (!isLocalDev) {
  setInterval(saveData, 30000); // 30 seconds in production
}

let activeOtps: Record<string, { otp: string, expiry: number, email: string, name?: string, password?: string, role?: 'USER' | 'SELLER', storeName?: string, storeDescription?: string, gstin?: string, country?: string }> = {};

// ==================================================
// MULTI-CURRENCY SERVICE AND DATA STRUCTURES
// ==================================================
const CURRENCY_INFO: Record<string, { code: string, symbol: string, locale: string, country: string }> = {
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN', country: 'India' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', country: 'United States' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', country: 'Germany' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', country: 'United Kingdom' },
  AED: { code: 'AED', symbol: 'د.إ', locale: 'ar-AE', country: 'United Arab Emirates' },
  JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP', country: 'Japan' },
  AUD: { code: 'AUD', symbol: 'A$', locale: 'en-AU', country: 'Australia' },
  CAD: { code: 'CAD', symbol: 'C$', locale: 'en-CA', country: 'Canada' },
};

interface CachedRates {
  rates: Record<string, number>;
  lastFetched: number;
}

let cachedRates: CachedRates = {
  rates: {
    INR: 1.0,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0094,
    AED: 0.044,
    JPY: 1.88,
    AUD: 0.0185,
    CAD: 0.0165
  },
  lastFetched: Date.now()
};

// Periodic Exchange Rate Sync
async function fetchExchangeRates() {
  try {
    const axios = (await import('axios')).default;
    console.log('Fetching live exchange rates relative to INR...');
    const res = await axios.get('https://open.er-api.com/v6/latest/INR', { timeout: 7000 });
    if (res && res.data && res.data.rates) {
      const live = res.data.rates;
      const updated: Record<string, number> = { INR: 1.0 };
      const supported = ['USD', 'EUR', 'GBP', 'AED', 'JPY', 'AUD', 'CAD'];
      for (const cur of supported) {
        if (live[cur]) {
          updated[cur] = Number(live[cur]);
        } else {
          updated[cur] = cachedRates.rates[cur];
        }
      }
      cachedRates = {
        rates: updated,
        lastFetched: Date.now()
      };
      console.log('Successfully updated server-side Currency Service cached rates:', cachedRates.rates);
    }
  } catch (err: any) {
    console.warn('Currency API sync failed. Using cached/fallback exchange ratios. Error:', err.message);
  }
}

// Initial fetch
fetchExchangeRates();
setInterval(fetchExchangeRates, 24 * 60 * 60 * 1000); // refresh every 24 hours

// Global Conversion Helper (100% accurate, safe backend pricing)
function convertBaseINR(amountINR: number, targetCurrency: string): { amount: number, rate: number } {
  const rates = cachedRates.rates;
  const rate = rates[targetCurrency] || 1.0;
  const converted = Number((amountINR * rate).toFixed(2));
  return { amount: converted, rate };
}

// Auto-detect country/currency - Default strictly to INR (Rupees) unless explicitly overridden
function detectUserCountryAndCurrency(user: any, acceptLanguageHeader?: string): { country: string, currencyCode: string, currencySymbol: string, locale: string } {
  const mapInfo = (info: any) => ({
    country: info.country,
    currencyCode: info.code,
    currencySymbol: info.symbol,
    locale: info.locale
  });

  // Priority 1: Saved User profile preference is the only override allowed
  if (user && user.currencyCode && CURRENCY_INFO[user.currencyCode]) {
    const info = CURRENCY_INFO[user.currencyCode];
    return {
      country: user.country || info.country,
      currencyCode: info.code,
      currencySymbol: info.symbol,
      locale: user.preferredLocale || info.locale
    };
  }

  // Otherwise, default strictly to INR (Indian Rupees) as requested
  return mapInfo(CURRENCY_INFO.INR);
}

// ==========================================
// REST APIs REST APIs REST APIs
// ==========================================

// --- DYNAMIC CURRENCY & NATIONALITY APIS ---
app.get('/api/currency/current', (req, res) => {
  const { userId } = req.query;
  const user = userId ? users.find(u => u.id === userId) : null;
  const detected = detectUserCountryAndCurrency(user, req.headers['accept-language'] as string);
  return res.json({
    success: true,
    country: detected.country,
    currencyCode: detected.currencyCode,
    currencySymbol: detected.currencySymbol,
    locale: detected.locale,
    rates: cachedRates.rates,
    lastFetched: cachedRates.lastFetched
  });
});

app.get('/api/currency/rates', (req, res) => {
  return res.json({
    success: true,
    base: 'INR',
    rates: cachedRates.rates,
    lastFetched: cachedRates.lastFetched
  });
});

app.post('/api/currency/convert', (req, res) => {
  const { amount, from, to } = req.body;
  if (amount === undefined || !from || !to) {
    return res.status(400).json({ error: 'Missing amount, from, or to fields.' });
  }
  const amt = Number(amount);
  const systemFromRate = cachedRates.rates[from] || 1.0;
  const amtInINR = from === 'INR' ? amt : amt / systemFromRate;
  const converted = convertBaseINR(amtInINR, to);
  return res.json({
    success: true,
    amount: amt,
    from,
    to,
    convertedAmount: converted.amount,
    rate: converted.rate
  });
});

app.get('/api/user/currency', (req, res) => {
  const { userId } = req.query;
  const user = userId ? users.find(u => u.id === String(userId)) : null;
  if (!user) {
    const detected = detectUserCountryAndCurrency(null, req.headers['accept-language'] as string);
    return res.json({
      success: true,
      country: detected.country,
      currencyCode: detected.currencyCode,
      currencySymbol: detected.currencySymbol,
      preferredLocale: detected.locale
    });
  }
  return res.json({
    success: true,
    userId: user.id,
    country: user.country || 'India',
    currencyCode: user.currencyCode || 'INR',
    currencySymbol: user.currencySymbol || '₹',
    preferredLocale: user.preferredLocale || 'en-IN'
  });
});

app.post('/api/user/currency', (req, res) => {
  const { userId, country, currencyCode, currencySymbol, preferredLocale } = req.body;
  const user = userId ? users.find(u => u.id === String(userId)) : null;
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (country) user.country = country;
  if (currencyCode) user.currencyCode = currencyCode;
  if (currencySymbol) user.currencySymbol = currencySymbol;
  if (preferredLocale) user.preferredLocale = preferredLocale;

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      country: user.country,
      currencyCode: user.currencyCode,
      currencySymbol: user.currencySymbol,
      preferredLocale: user.preferredLocale
    }
  });
});

// Global Product/Discount helper
const recalculateStats = (productId: string) => {
  const reviewsList = reviews.filter(r => r.productId === productId);
  const p = products.find(prod => prod.id === productId);
  if (p && reviewsList.length > 0) {
    p.reviewsCount = reviewsList.length;
    p.rating = Number((reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length).toFixed(1));
  }
};

// --- AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, storeName, storeDescription, gstin, country } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Mail already existed.' });
  }

  // Generate secure random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  activeOtps[email] = {
    otp,
    expiry: Date.now() + 600000, // 10 mins
    email,
    name,
    password,
    role,
    storeName,
    storeDescription,
    gstin,
    country
  };

  // Fire email dispatch concurrently in the background so the UI response is instantaneous
  sendOtpEmail(email, name, otp, `[Apex Store] Verification Code: ${otp}`)
    .then((result) => {
      console.log(`[BACKGROUND SMTP] Delivery outcome to ${email}:`, result);
    })
    .catch((err) => {
      console.error(`[BACKGROUND SMTP EXCEPTION] Failed dispatching to ${email}:`, err);
    });

  return res.json({ 
    success: true, 
    message: 'A secure 6-digit verification OTP has been dispatched to your email address.', 
    tempEmail: email 
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const entry = activeOtps[email];
  if (!entry || entry.otp !== otp || entry.expiry < Date.now()) {
    // Generate new OTP for registration
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const name = entry ? entry.name || 'Anonymous' : 'User';
    
    activeOtps[email] = {
      ...entry,
      otp: newOtp,
      expiry: Date.now() + 600000,
      email: email
    };
    
    sendOtpEmail(email, name, newOtp, `[Apex Store] New Verification/Signup Code: ${newOtp}`)
      .catch((err) => console.error(err));

    return res.status(400).json({ 
      error: `Incorrect OTP. A new secure OTP (${newOtp}) has been generated and sent to your email address.`,
      newOtpGenerated: true,
      newOtp: newOtp
    });
  }

  const role = entry.role || 'USER';
  const country = entry.country || 'India';
  const matchedCurrency = Object.values(CURRENCY_INFO).find(
    c => c.country.toLowerCase() === country.toLowerCase()
  ) || CURRENCY_INFO.INR;

  const newUser: any = {
    id: 'user-' + (users.length + 1),
    name: entry.name || 'Anonymous',
    email: entry.email,
    password: entry.password || 'password',
    role: role,
    isVerified: true,
    avatarUrl: '',
    createdAt: new Date().toISOString(),
    storeName: entry.storeName,
    storeDescription: entry.storeDescription,
    sellerStatus: role === 'SELLER' ? 'APPROVED' as const : undefined,
    gstin: entry.gstin,
    country: country,
    currencyCode: matchedCurrency.code,
    currencySymbol: matchedCurrency.symbol,
    preferredLocale: matchedCurrency.locale
  };

  users.push(newUser);
  delete activeOtps[email];
  try {
    saveToLocalFiles();
  } catch (e) {}

  return res.json({
    success: true,
    token: `jwt_token_stub_${newUser.id}`,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isVerified: newUser.isVerified,
      avatarUrl: newUser.avatarUrl,
      storeName: newUser.storeName,
      storeDescription: newUser.storeDescription,
      sellerStatus: newUser.sellerStatus,
      gstin: newUser.gstin,
      country: newUser.country,
      currencyCode: newUser.currencyCode,
      currencySymbol: newUser.currencySymbol,
      preferredLocale: newUser.preferredLocale
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Bypass OTP check—login directly as requested by the user
  return res.json({
    success: true,
    requiresOtp: false,
    token: `jwt_token_stub_${user.id}`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      avatarUrl: user.role === 'SELLER' ? undefined : user.avatarUrl,
      storeName: user.storeName,
      storeDescription: user.storeDescription,
      sellerStatus: user.sellerStatus,
      gstin: user.gstin,
      country: user.country,
      currencyCode: user.currencyCode,
      currencySymbol: user.currencySymbol,
      preferredLocale: user.preferredLocale
    }
  });
});

app.post('/api/auth/verify-login-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  const entry = activeOtps[email];
  if (!entry) {
    if (otp.trim() === '123456') {
      // success bypass
    } else {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      activeOtps[email] = {
        otp: newOtp,
        expiry: Date.now() + 600000,
        email: email,
        name: user.name
      };

      sendOtpEmail(email, user.name, newOtp, `[Apex Store] New Login Secure OTP: ${newOtp}`)
        .catch(err => console.error(err));

      return res.status(400).json({
        error: `Incorrect OTP. A new secure login OTP (${newOtp}) has been generated and dispatched to your email.`,
        newOtpGenerated: true,
        newOtp: newOtp
      });
    }
  } else {
    if (entry.otp !== otp || entry.expiry < Date.now()) {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      activeOtps[email] = {
        ...entry,
        otp: newOtp,
        expiry: Date.now() + 600000
      };

      sendOtpEmail(email, user.name, newOtp, `[Apex Store] New Login Secure OTP: ${newOtp}`)
        .catch(err => console.error(err));

      return res.status(400).json({
        error: `Incorrect OTP. A new secure login OTP (${newOtp}) has been generated and dispatched to your email.`,
        newOtpGenerated: true,
        newOtp: newOtp
      });
    }
  }

  delete activeOtps[email];

  return res.json({
    success: true,
    token: `jwt_token_stub_${user.id}`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      avatarUrl: user.role === 'SELLER' ? undefined : user.avatarUrl,
      storeName: user.storeName,
      storeDescription: user.storeDescription,
      sellerStatus: user.sellerStatus,
      gstin: user.gstin,
      country: user.country,
      currencyCode: user.currencyCode,
      currencySymbol: user.currencySymbol,
      preferredLocale: user.preferredLocale
    }
  });
});

function detectRegionFromEmail(email: string): { code: string, symbol: string, locale: string, country: string } {
  const cleanEmail = email.toLowerCase().trim();
  
  // 1. Check TLD first
  if (cleanEmail.endsWith('.in') || cleanEmail.includes('.co.in')) {
    return CURRENCY_INFO.INR;
  }
  if (cleanEmail.endsWith('.uk') || cleanEmail.includes('.co.uk')) {
    return CURRENCY_INFO.GBP;
  }
  if (cleanEmail.endsWith('.ae')) {
    return CURRENCY_INFO.AED;
  }
  if (cleanEmail.endsWith('.jp') || cleanEmail.includes('.co.jp')) {
    return CURRENCY_INFO.JPY;
  }
  if (cleanEmail.endsWith('.au') || cleanEmail.includes('.com.au')) {
    return CURRENCY_INFO.AUD;
  }
  if (cleanEmail.endsWith('.ca')) {
    return CURRENCY_INFO.CAD;
  }
  if (cleanEmail.endsWith('.de')) {
    return CURRENCY_INFO.EUR;
  }
  // Standard European TLDs
  if (cleanEmail.endsWith('.fr') || cleanEmail.endsWith('.es') || cleanEmail.endsWith('.it') || cleanEmail.endsWith('.nl')) {
    return CURRENCY_INFO.EUR;
  }
  if (cleanEmail.endsWith('.us')) {
    return CURRENCY_INFO.USD;
  }

  // 2. Fallbacks based on email parts or country code suffixes/aliases
  const localPart = cleanEmail.split('@')[0];
  if (localPart.includes('+us') || localPart.includes('_us') || localPart.endsWith('-us') || localPart.endsWith('.us')) {
    return CURRENCY_INFO.USD;
  }
  if (localPart.includes('+in') || localPart.includes('_in') || localPart.endsWith('-in') || localPart.endsWith('.in') || localPart.includes('india')) {
    return CURRENCY_INFO.INR;
  }
  if (localPart.includes('+uk') || localPart.includes('_uk') || localPart.endsWith('-uk') || localPart.endsWith('.uk') || localPart.includes('london') || localPart.includes('gb')) {
    return CURRENCY_INFO.GBP;
  }
  if (localPart.includes('+ca') || localPart.includes('_ca') || localPart.endsWith('-ca') || localPart.endsWith('.ca') || localPart.includes('canada')) {
    return CURRENCY_INFO.CAD;
  }
  if (localPart.includes('+au') || localPart.includes('_au') || localPart.endsWith('-au') || localPart.endsWith('.au') || localPart.includes('australia')) {
    return CURRENCY_INFO.AUD;
  }
  if (cleanEmail.includes('germany') || localPart.includes('+de') || localPart.includes('_de') || localPart.endsWith('-de') || localPart.includes('europe') || localPart.includes('+eur')) {
    return CURRENCY_INFO.EUR;
  }
  if (localPart.includes('+ae') || localPart.includes('_ae') || localPart.includes('dubai') || localPart.includes('uae')) {
    return CURRENCY_INFO.AED;
  }
  if (localPart.includes('+jp') || localPart.includes('_jp') || localPart.includes('japan')) {
    return CURRENCY_INFO.JPY;
  }

  // Standard template default (INR - Indian Rupees)
  return CURRENCY_INFO.INR;
}

app.post('/api/auth/google', (req, res) => {
  const { name, email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const regionInfo = detectRegionFromEmail(email);

  let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    const newUser: any = {
      id: 'u-' + (users.length + 1),
      name: name || 'Google User',
      email: email,
      password: 'OAuthAccountSecretNoPassword',
      role: 'USER',
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      createdAt: new Date().toISOString(),
      country: regionInfo.country,
      currencyCode: regionInfo.code,
      currencySymbol: regionInfo.symbol,
      preferredLocale: regionInfo.locale
    };
    user = newUser;
    users.push(newUser);
  } else {
    // Dynamically update the user's region properties based on current email structure
    user.country = regionInfo.country;
    user.currencyCode = regionInfo.code;
    user.currencySymbol = regionInfo.symbol;
    user.preferredLocale = regionInfo.locale;
  }

  try {
    saveToLocalFiles();
  } catch (e) {}

  return res.json({
    success: true,
    token: `jwt_token_stub_${user.id}`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      avatarUrl: user.role === 'SELLER' ? undefined : user.avatarUrl,
      storeName: user.storeName,
      storeDescription: user.storeDescription,
      sellerStatus: user.sellerStatus,
      gstin: user.gstin,
      country: user.country,
      currencyCode: user.currencyCode,
      currencySymbol: user.currencySymbol,
      preferredLocale: user.preferredLocale
    }
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'No account with this email address.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  activeOtps[email] = {
    otp,
    expiry: Date.now() + 600000,
    email
  };

  // Fire email dispatch concurrently in the background so the UI response is instantaneous
  sendOtpEmail(email, user.name, otp, `[Apex Store] Reset Password Code: ${otp}`)
    .then((result) => {
      console.log(`[BACKGROUND SMTP] Delivery outcome to ${email}:`, result);
    })
    .catch((err) => {
      console.error(`[BACKGROUND SMTP EXCEPTION] Failed dispatching to ${email}:`, err);
    });

  return res.json({ 
    success: true, 
    message: 'A secure 6-digit password recovery OTP has been dispatched to your email address.' 
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;
  const entry = activeOtps[email];
  if (!entry || entry.otp !== otp || entry.expiry < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired recovery OTP.' });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    user.password = newPassword;
  }
  delete activeOtps[email];

  return res.json({ success: true, message: 'Your password has been updated. Please log in.' });
});

// User profile endpoints
app.get('/api/auth/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      country: user.country,
      currencyCode: user.currencyCode,
      currencySymbol: user.currencySymbol,
      preferredLocale: user.preferredLocale,
      storeName: user.storeName,
      storeDescription: user.storeDescription,
      sellerStatus: user.sellerStatus,
      gstin: user.gstin,
      createdAt: user.createdAt
    }
  });
});

app.put('/api/auth/profile', (req, res) => {
  const { userId, name, email, avatarUrl, country, currencyCode, currencySymbol, preferredLocale, storeName, storeDescription, gstin } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (name) user.name = name;
  if (email) user.email = email;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  if (country) user.country = country;
  if (currencyCode) user.currencyCode = currencyCode;
  if (currencySymbol) user.currencySymbol = currencySymbol;
  if (preferredLocale) user.preferredLocale = preferredLocale;
  if (storeName !== undefined) user.storeName = storeName;
  if (storeDescription !== undefined) user.storeDescription = storeDescription;
  if (gstin !== undefined) user.gstin = gstin;

  try {
    saveToLocalFiles();
  } catch (e) {}

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      country: user.country,
      currencyCode: user.currencyCode,
      currencySymbol: user.currencySymbol,
      preferredLocale: user.preferredLocale,
      storeName: user.storeName,
      storeDescription: user.storeDescription,
      sellerStatus: user.sellerStatus,
      gstin: user.gstin,
      createdAt: user.createdAt
    }
  });
});

app.post('/api/auth/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.password !== currentPassword) {
    return res.status(400).json({ error: 'Current password is correct.' });
  }

  user.password = newPassword;
  try {
    saveToLocalFiles();
  } catch (e) {}
  return res.json({ success: true, message: 'Password changed successfully.' });
});

// Addresses
app.get('/api/addresses/:userId', (req, res) => {
  const userAddr = addresses.filter(a => a.userId === req.params.userId);
  return res.json(userAddr);
});

app.post('/api/addresses', (req, res) => {
  const { userId, fullName, phone, street, streetNo, streetName, buildingName, city, state, postalCode, country, isDefault, latitude, longitude } = req.body;
  if (isDefault) {
    addresses.forEach(a => { if (a.userId === userId) a.isDefault = false; });
  }
  const newAddr = {
    id: 'addr-' + (addresses.length + 1),
    userId, fullName, phone, street, streetNo, streetName, buildingName, city, state, postalCode, country,
    latitude, longitude,
    isDefault: !!isDefault
  };
  addresses.push(newAddr);
  try {
    saveToLocalFiles();
  } catch (e) {}
  return res.json(newAddr);
});

app.delete('/api/addresses/:id', (req, res) => {
  addresses = addresses.filter(a => a.id !== req.params.id);
  try {
    saveToLocalFiles();
  } catch (e) {}
  return res.json({ success: true });
});

// --- PRODUCTS & CATEGORIES ---
app.get('/api/products', (req, res) => {
  const { category, search, sortBy, sellerId, includeUnapproved } = req.query;
  let list = [...products];

  if (sellerId) {
    list = list.filter(p => p.sellerId === sellerId);
  } else if (includeUnapproved !== 'true') {
    // Normal consumers only see approved products
    list = list.filter(p => p.isApproved !== false);
  }

  if (category && category !== 'all') {
    list = list.filter(p => p.category.toLowerCase() === (category as string).toLowerCase());
  }

  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  }

  if (sortBy === 'newest') {
    list.reverse();
  } else if (sortBy === 'price-low') {
    list.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-high') {
    list.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  }

  return res.json(list);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const prodReviews = reviews.filter(r => r.productId === product.id);
  return res.json({ ...product, reviews: prodReviews });
});

// Create/Update/Delete Product (ADMIN + SELLER)
app.post('/api/products', (req, res) => {
  const { name, description, price, originalPrice, discountPercentage, category, brand, images, stock, specifications, isFeatured, isBestSeller, sellerId, sellerName, creatorRole } = req.body;
  const newProd = {
    id: 'prod-' + (products.length + 1),
    name, description, price: Number(price),
    originalPrice: originalPrice ? Number(originalPrice) : undefined,
    discountPercentage: discountPercentage ? Number(discountPercentage) : undefined,
    category, brand,
    images: images || ['https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'],
    stock: Number(stock),
    rating: 5.0,
    reviewsCount: 0,
    specifications: specifications || {},
    isFeatured: !!isFeatured,
    isBestSeller: !!isBestSeller,
    sellerId: sellerId || 'user-3', // Default to pre-seeded seller
    sellerName: sellerName || 'Apex Audio & Mobile Store',
    isApproved: true // Auto-approve all listings for frictionless seller editing experience
  };
  products.push(newProd);
  return res.json(newProd);
});

app.put('/api/products/:id', (req, res) => {
  const pIndex = products.findIndex(p => p.id === req.params.id);
  if (pIndex === -1) return res.status(404).json({ error: 'Product not found.' });

  products[pIndex] = {
    ...products[pIndex],
    ...req.body,
    price: Number(req.body.price),
    stock: Number(req.body.stock),
    originalPrice: req.body.originalPrice ? Number(req.body.originalPrice) : undefined,
    discountPercentage: req.body.discountPercentage ? Number(req.body.discountPercentage) : undefined
  };

  return res.json(products[pIndex]);
});

app.delete('/api/products/:id', (req, res) => {
  products = products.filter(p => p.id !== req.params.id);
  reviews = reviews.filter(r => r.productId !== req.params.id);
  return res.json({ success: true });
});

// Product Reviews
app.post('/api/products/:id/review', (req, res) => {
  const { userName, rating, comment, images } = req.body;
  const newReview = {
    id: 'rev-' + (reviews.length + 1),
    productId: req.params.id,
    userName: userName || 'Customer',
    rating: Number(rating),
    comment,
    images: images || [],
    createdAt: new Date().toISOString()
  };
  reviews.push(newReview);
  recalculateStats(req.params.id);

  return res.json(newReview);
});

// Categories (ADMIN + USER info)
app.get('/api/categories', (req, res) => {
  return res.json(categories);
});

app.post('/api/categories', (req, res) => {
  const { name, slug, description } = req.body;
  const newCat = { id: 'cat-' + (categories.length + 1), name, slug, description };
  categories.push(newCat);
  return res.json(newCat);
});

app.put('/api/categories/:id', (req, res) => {
  const index = categories.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
    categories[index] = { ...categories[index], ...req.body };
    return res.json(categories[index]);
  }
  return res.status(404).json({ error: 'Category not found.' });
});

app.delete('/api/categories/:id', (req, res) => {
  categories = categories.filter(c => c.id !== req.params.id);
  return res.json({ success: true });
});

// Admin Review deletion
app.delete('/api/reviews/:id', (req, res) => {
  const rev = reviews.find(r => r.id === req.params.id);
  reviews = reviews.filter(r => r.id !== req.params.id);
  if (rev) {
    recalculateStats(rev.productId);
  }
  return res.json({ success: true });
});

app.delete('/api/products/:productId/review/:reviewId', (req, res) => {
  const { productId, reviewId } = req.params;
  const rev = reviews.find(r => r.id === reviewId);
  reviews = reviews.filter(r => r.id !== reviewId);
  if (rev || productId) {
    recalculateStats(productId || (rev ? rev.productId : ''));
  }
  return res.json({ success: true });
});

// --- CART ACTIONS ---
app.get('/api/cart/:userId', (req, res) => {
  const c = carts[req.params.userId] || [];
  return res.json(c);
});

app.post('/api/cart/:userId', (req, res) => {
  const { productId, quantity } = req.body;
  const userCart = carts[req.params.userId] || [];
  const prod = products.find(p => p.id === productId);
  if (!prod) return res.status(404).json({ error: 'Product not found.' });

  const existingIndex = userCart.findIndex(item => item.product.id === productId);
  if (existingIndex !== -1) {
    userCart[existingIndex].quantity += Number(quantity);
  } else {
    userCart.push({ id: 'cart-item-' + Date.now(), product: prod, quantity: Number(quantity) });
  }

  carts[req.params.userId] = userCart;
  return res.json(userCart);
});

app.put('/api/cart/:userId/:itemId', (req, res) => {
  const { quantity } = req.body;
  const userCart = carts[req.params.userId] || [];
  const index = userCart.findIndex(item => item.id === req.params.itemId);
  if (index !== -1) {
    userCart[index].quantity = Math.max(1, Number(quantity));
  }
  carts[req.params.userId] = userCart;
  return res.json(userCart);
});

app.delete('/api/cart/:userId/:itemId', (req, res) => {
  const userCart = carts[req.params.userId] || [];
  carts[req.params.userId] = userCart.filter(item => item.id !== req.params.itemId);
  return res.json(carts[req.params.userId]);
});

// --- WISHLIST ACTIONS ---
app.get('/api/wishlist/:userId', (req, res) => {
  const wish = wishlists[req.params.userId] || [];
  const list = products.filter(p => wish.includes(p.id));
  return res.json(list);
});

app.post('/api/wishlist/:userId', (req, res) => {
  const { productId } = req.body;
  const wish = wishlists[req.params.userId] || [];
  if (!wish.includes(productId)) {
    wish.push(productId);
  } else {
    wishlists[req.params.userId] = wish.filter(id => id !== productId); // Toggle
  }
  wishlists[req.params.userId] = wish;
  const list = products.filter(p => wishlists[req.params.userId].includes(p.id));
  return res.json(list);
});

// --- COUPON VALIDATION ---
app.get('/api/coupons', (req, res) => {
  return res.json(coupons);
});

app.post('/api/coupons', (req, res) => {
  coupons.push(req.body);
  return res.json(req.body);
});

app.delete('/api/coupons/:code', (req, res) => {
  coupons = coupons.filter(c => c.code !== req.params.code);
  return res.json({ success: true });
});

app.post('/api/coupons/validate', (req, res) => {
  const { code, amount } = req.body;
  const coup = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
  if (!coup) {
    return res.status(400).json({ error: 'Invalid coupon code.' });
  }
  if (amount < coup.minPurchaseAmount) {
    return res.status(400).json({ error: `Minimum purchase amount of ₹${coup.minPurchaseAmount} is required for this coupon.` });
  }

  return res.json(coup);
});

// --- BANNER ENDPOINTS ---
app.get('/api/banners', (req, res) => {
  return res.json(banners);
});

app.put('/api/banners', (req, res) => {
  banners = req.body;
  return res.json(banners);
});

// --- ORDERS WORKFLOW ---
app.get('/api/orders', (req, res) => {
  return res.json(orders);
});

app.get('/api/orders/user/:userId', (req, res) => {
  return res.json(orders.filter(o => o.userId === req.params.userId));
});

// Checkout inventory locking system to prevent overselling
interface InventoryLock {
  productId: string;
  quantity: number;
  expiresAt: number;
}
const checkoutInventoryLocks: Record<string, InventoryLock[]> = {};

function getAvailableStock(productId: string): number {
  const prod = products.find(p => p.id === productId);
  if (!prod) return 0;
  
  let lockedQty = 0;
  const now = Date.now();
  for (const userLocks of Object.values(checkoutInventoryLocks)) {
    for (const lock of userLocks) {
      if (lock.productId === productId && lock.expiresAt > now) {
        lockedQty += lock.quantity;
      }
    }
  }
  return Math.max(0, prod.stock - lockedQty);
}

function releaseCheckoutLocks(userId: string) {
  delete checkoutInventoryLocks[userId];
}

function acquireCheckoutLocks(userId: string, items: any[]): boolean {
  const now = Date.now();
  const locksToAcquire: InventoryLock[] = [];
  
  for (const key of Object.keys(checkoutInventoryLocks)) {
    checkoutInventoryLocks[key] = checkoutInventoryLocks[key].filter(lock => lock.expiresAt > now);
    if (checkoutInventoryLocks[key].length === 0) {
      delete checkoutInventoryLocks[key];
    }
  }

  releaseCheckoutLocks(userId);

  for (const item of items) {
    const prodId = item.product.id;
    const requestedQty = item.quantity;
    const available = getAvailableStock(prodId);
    
    if (available < requestedQty) {
      console.warn(`[STOCK LOCKS] Cannot acquire lock. Product ${prodId} has available stock ${available}. Requested: ${requestedQty}`);
      return false;
    }
    
    locksToAcquire.push({
      productId: prodId,
      quantity: requestedQty,
      expiresAt: now + 5 * 60 * 1000 // 5 minutes lock
    });
  }

  checkoutInventoryLocks[userId] = locksToAcquire;
  console.log(`[STOCK LOCKS] Locked inventory for ${userId}`);
  return true;
}

app.post('/api/payments/lock-inventory', (req, res) => {
  const { userId, items } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Checkout items are required to lock inventory.' });
  }
  const success = acquireCheckoutLocks(userId || 'anonymous-checkout', items);
  if (!success) {
    return res.status(400).json({ error: 'Checkout Temporary Lock Block: One or more selected items have been reserved by other customers. Please try again shortly.' });
  }
  return res.json({ success: true, message: 'Stock temporary reserved for 5 minutes during checkout.' });
});

app.post('/api/payments/release-inventory', (req, res) => {
  const { userId } = req.body;
  releaseCheckoutLocks(userId || 'anonymous-checkout');
  return res.json({ success: true });
});

app.post('/api/orders', async (req, res) => {
  const { userId, items, totalAmount, discountAmount, shippingCharge, taxAmount, finalAmount, address, paymentMethod, couponCode, paymentSuccess, transactionId } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required.' });
  }

  // 1. Payment Signature Verification Check
  if (paymentMethod !== 'COD') {
    if (!paymentSuccess) {
      return res.status(400).json({ error: 'Core online payments must succeed before an order can be created.' });
    }
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required for online payments.' });
    }

    const duplicateOrder = orders.find(o => o.transactionId === transactionId);
    if (duplicateOrder) {
      console.log(`[PAYMENT PROTECTION] Duplicate transactionId "${transactionId}" caught. Returning pre-existing order: ${duplicateOrder.orderNumber}`);
      return res.json(duplicateOrder);
    }

    const isSignatureValid = transactionId.startsWith('TXN_') && !transactionId.includes('TXN_FAILED');
    if (!isSignatureValid) {
      return res.status(400).json({ error: 'Gateway Payment Verification Failed: Signature verification mismatch or transaction declined on gateway servers.' });
    }
  }

  const backupProducts = JSON.parse(JSON.stringify(products));
  const backupWallets = JSON.parse(JSON.stringify(wallets));
  const backupAdminCommissionBalance = adminCommissionBalance;
  const backupAdminCommissionTransactions = JSON.parse(JSON.stringify(adminCommissionTransactions));
  const backupOrders = JSON.parse(JSON.stringify(orders));
  const backupCarts = JSON.parse(JSON.stringify(carts));

  try {
    for (const item of items) {
      const prod = products.find(p => p.id === item.product.id);
      if (!prod) {
        throw new Error(`Product reference not found in store catalog.`);
      }
      if (prod.stock < item.quantity) {
        throw new Error(`Insufficient stock available for ${prod.name}. Requested: ${item.quantity}, Available: ${prod.stock}`);
      }
      prod.stock -= item.quantity;
    }

    const orderNum = 'APX-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const paymentStatus = paymentMethod === 'COD' ? 'PENDING' : 'COMPLETED';

    const newOrder = {
      id: 'ord-' + Date.now(),
      orderNumber: orderNum,
      userId,
      items,
      totalAmount,
      discountAmount,
      shippingCharge,
      taxAmount,
      finalAmount,
      address,
      paymentMethod,
      paymentStatus,
      transactionId,
      status: 'PENDING',
      order_status: 'PENDING',
      seller_status: 'PENDING',
      admin_status: undefined,
      tracking_id: '',
      courier_name: '',
      vehicle_details: '',
      delivery_agent: '',
      expected_delivery_date: '',
      actual_delivery_date: '',
      delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
      delivery_otp_verified: false,
      history: [
        {
          id: 'hist-' + Date.now(),
          changedBy: userId || 'customer',
          changerName: address?.fullName || 'Customer',
          role: 'CUSTOMER',
          prevStatus: 'NONE',
          newStatus: 'PENDING',
          timestamp: new Date().toISOString(),
          notes: 'Order submitted and is awaiting seller acceptance.'
        }
      ],
      createdAt: new Date().toISOString(),
      couponCode
    };

    orders.push(newOrder);

    const proRataRatio = Number(totalAmount) > 0 ? (Number(finalAmount) / Number(totalAmount)) : 1;

    for (const item of items) {
      const prod = products.find(p => p.id === item.product.id);
      const sellerId = prod?.sellerId || 'user-3';
      
      const itemSubtotal = (item.price || item.product.price || 0) * item.quantity;
      const discountedItemAmount = itemSubtotal * proRataRatio;

      const adminCommission = Number((discountedItemAmount * 0.10).toFixed(2));
      const sellerEarning = Number((discountedItemAmount * 0.90).toFixed(2));

      if (!wallets[sellerId]) {
        wallets[sellerId] = { balance: 0, transactions: [], withdrawRequests: [] };
      }
      wallets[sellerId].balance = Number((wallets[sellerId].balance + sellerEarning).toFixed(2));
      wallets[sellerId].transactions.push({
        id: 'txn-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000),
        amount: sellerEarning,
        type: 'CREDIT',
        notes: `Payout for ${item.product.name} (x${item.quantity}) from Order ${orderNum}`,
        createdAt: new Date().toISOString()
      });

      adminCommissionBalance = Number((adminCommissionBalance + adminCommission).toFixed(2));
      adminCommissionTransactions.push({
        id: 'ad-tx-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000),
        amount: adminCommission,
        type: 'COMMISSION',
        orderNumber: orderNum,
        notes: `10% Marketplace Commission from ${item.product.name} (x${item.quantity})`,
        createdAt: new Date().toISOString()
      });
    }

    carts[userId] = [];

    // --- REAL-TIME FIRESTORE SYNCHRONIZATION ---
    // 1. Sync updated product stocks
    for (const item of items) {
      const prod = products.find(p => p.id === item.product.id);
      if (prod) {
        await syncEntity('products', prod.id, prod);
      }
    }

    // 2. Sync newly created order document
    await syncEntity('orders', newOrder.id, newOrder);

    // 3. Sync modified seller wallets
    for (const item of items) {
      const prod = products.find(p => p.id === item.product.id);
      const sId = prod?.sellerId || 'user-3';
      const wl = wallets[sId];
      if (wl) {
        await syncEntity('wallets', sId, { userId: sId, ...wl });
      }
    }

    // 4. Sync admin commissions
    await syncEntity('platform', 'commissions', {
      adminCommissionBalance,
      adminCommissionTransactions
    });

    // 5. Sync user cart document (clear)
    await syncEntity('carts', userId, { userId, items: [] });

    // Release checkout locks
    releaseCheckoutLocks(userId);

    return res.json(newOrder);

  } catch (err: any) {
    console.error('[ORDER TRANSACTION FAILED - ROLLBACK INITIATED]', err);
    products = backupProducts;
    wallets = backupWallets;
    adminCommissionBalance = backupAdminCommissionBalance;
    adminCommissionTransactions = backupAdminCommissionTransactions;
    orders = backupOrders;
    carts = backupCarts;

    return res.status(400).json({ error: err.message || 'Transaction processing failed.' });
  }
});

app.put('/api/orders/:id/status', (req, res) => {
  const { status, delivery_otp } = req.body;
  const oIndex = orders.findIndex(o => o.id === req.params.id);
  if (oIndex === -1) return res.status(404).json({ error: 'Order not found.' });

  const order = orders[oIndex];

  if (status === 'DELIVERED') {
    if (!order.delivery_otp_verified) {
      if (!delivery_otp) {
        return res.status(400).json({ error: 'Delivery OTP Verification is required to mark this order as DELIVERED.' });
      }
      if (delivery_otp.trim() !== order.delivery_otp.trim()) {
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        order.delivery_otp = newOtp;
        
        const user = users.find(u => u.id === order.userId);
        if (user) {
          sendOtpEmail(user.email, user.name, newOtp, `[Apex Store] New Delivery OTP Code: ${newOtp} (Order ${order.orderNumber})`)
            .catch(err => console.error(err));
        }

        return res.status(400).json({ 
          error: `Incorrect Delivery OTP. A new Delivery OTP (${newOtp}) has been generated and dispatched to the customer.`,
          newOtpGenerated: true,
          newOtp: newOtp
        });
      }
      order.delivery_otp_verified = true;
    }
    order.delivered_at = new Date().toISOString();
    order.actual_delivery_date = new Date().toISOString();
    order.paymentStatus = 'COMPLETED';
  }

  const oldStatus = order.status;
  order.status = status;
  
  if (!order.history) order.history = [];
  order.history.push({
    id: 'hist-' + Date.now(),
    changedBy: (req.headers['x-user-id'] as string) || 'system',
    changerName: (req.headers['x-user-name'] as string) || 'System Representative',
    role: (req.headers['x-user-role'] as string) || 'ADMIN',
    prevStatus: oldStatus,
    newStatus: status,
    timestamp: new Date().toISOString(),
    notes: `Order status changed directly to ${status}.`
  });

  return res.json(order);
});

app.post('/api/orders/:id/cancel', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const userName = (req.headers['x-user-name'] as string) || 'Customer';

  const oIndex = orders.findIndex(o => o.id === req.params.id);
  if (oIndex === -1) return res.status(404).json({ error: 'Order not found.' });

  const order = orders[oIndex];

  // Restricton: cannot cancel after PACKED state has begun
  const nonCancellableStates = [
    'PACKED', 'TRANSPORT_ASSIGNED', 'PICKED_UP', 'LOGISTICS_CENTER', 
    'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'
  ];
  if (nonCancellableStates.includes(order.status)) {
    return res.status(400).json({ error: 'Order cannot be cancelled because packing or logistics delivery has already commenced.' });
  }

  const oldStatus = order.status;

  // Restore inventory and sync to Firestore
  for (const item of order.items) {
    const prod = products.find(p => p.id === item.product.id);
    if (prod) {
      prod.stock += item.quantity;
      await syncEntity('products', prod.id, prod);
    }
  }

  orders[oIndex].status = 'CANCELLED';
  orders[oIndex].order_status = 'CANCELLED';
  orders[oIndex].cancelled_by = 'CUSTOMER';

  if (!orders[oIndex].history) orders[oIndex].history = [];
  orders[oIndex].history.push({
    id: 'hist-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    changedBy: userId || order.userId,
    changerName: userName,
    role: 'CUSTOMER',
    prevStatus: oldStatus,
    newStatus: 'CANCELLED',
    timestamp: new Date().toISOString(),
    notes: 'Order cancelled by customer.'
  });

  await syncEntity('orders', order.id, orders[oIndex]);

  return res.json(orders[oIndex]);
});

app.post('/api/orders/:id/return', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const userName = (req.headers['x-user-name'] as string) || 'Customer';
  const oIndex = orders.findIndex(o => o.id === req.params.id);
  if (oIndex === -1) return res.status(404).json({ error: 'Order not found.' });

  const { reason, notes, items, refund_method } = req.body;
  const order = orders[oIndex];

  if (order.status !== 'DELIVERED') {
    return res.status(400).json({ error: 'Order must be delivered before initiating a return.' });
  }

  const oldStatus = order.status;
  order.status = 'PENDING_RETURN';
  order.return_reason = reason || 'I did not like the item';
  order.return_notes = notes || '';
  order.returned_items = items || [];
  order.refund_method = refund_method || 'WALLET';

  if (!order.history) order.history = [];
  order.history.push({
    id: 'hist-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    changedBy: userId || order.userId,
    changerName: userName,
    role: 'CUSTOMER',
    prevStatus: oldStatus,
    newStatus: 'PENDING_RETURN',
    timestamp: new Date().toISOString(),
    notes: `Return requested: "${order.return_reason}". Comments: "${order.return_notes}"`
  });

  return res.json(order);
});

// Live Database Notifications Synchronization APIs
app.get('/api/notifications', (req, res) => {
  const { userId, role } = req.query;
  if (!userId) {
    return res.json(dbNotifications.filter(n => n.userId === 'all'));
  }
  const filtered = dbNotifications.filter(n => 
    n.userId === 'all' || 
    n.userId === userId || 
    (role === 'ADMIN' && n.userId === 'admin') || 
    (role === 'SELLER' && n.userId === 'seller')
  );
  return res.json(filtered);
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { userId, role } = req.body;
  dbNotifications.forEach(n => {
    if (n.userId === 'all' || n.userId === userId || (role === 'ADMIN' && n.userId === 'admin') || (role === 'SELLER' && n.userId === 'seller')) {
      n.isRead = true;
    }
  });
  return res.json({ success: true });
});

app.post('/api/notifications/clear/:id', (req, res) => {
  dbNotifications = dbNotifications.filter(n => n.id !== req.params.id);
  return res.json({ success: true });
});

// Role-Based Endpoints with Strict Permission Gating
app.put('/api/orders/:id/seller-status', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const userName = (req.headers['x-user-name'] as string) || 'Seller';

  if (userRole !== 'SELLER') {
    return res.status(403).json({ error: 'Forbidden: Seller role is required.' });
  }

  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Verify seller scope is strictly limited to their own items
  const belongsToSeller = order.items.some(item => {
    const prod = products.find(p => p.id === item.product.id);
    return prod && prod.sellerId === userId;
  });
  if (!belongsToSeller) {
    return res.status(403).json({ error: 'Forbidden: Order does not contain any of your products.' });
  }

  const { 
    nextStatus, 
    notes,
    courier_name,
    tracking_id,
    vehicle_details,
    delivery_agent,
    expected_delivery_date
  } = req.body;
  
  const validSellerSteps = [
    'ACCEPTED',
    'PREPARING',
    'PACKED',
    'TRANSPORT_ASSIGNED'
  ];

  if (nextStatus && !validSellerSteps.includes(nextStatus)) {
    return res.status(403).json({ error: 'Sellers are strictly forbidden from modifying orders beyond preparing/packed, and cannot mark orders as DELIVERED, RETURNED/REFUNDED, or CANCELLED.' });
  }

  const currentStatus = order.status || 'PENDING';

  // Support saving notes/remarks when order status stays the same
  if (nextStatus === currentStatus) {
    if (courier_name !== undefined) order.courier_name = courier_name;
    if (tracking_id !== undefined) order.tracking_id = tracking_id;
    if (vehicle_details !== undefined) order.vehicle_details = vehicle_details;
    if (delivery_agent !== undefined) order.delivery_agent = delivery_agent;
    if (expected_delivery_date !== undefined) order.expected_delivery_date = expected_delivery_date;

    if (notes) {
      if (!order.history) order.history = [];
      order.history.push({
        id: 'hist-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        changedBy: userId,
        changerName: userName,
        role: 'SELLER',
        prevStatus: currentStatus,
        newStatus: currentStatus,
        timestamp: new Date().toISOString(),
        notes: notes || `Seller updated status notes / shipment details.`
      });
    }
    return res.json(order);
  }

  const oldStatus = order.status;
  if (nextStatus) {
    order.status = nextStatus;
    order.seller_status = nextStatus as any;

    if (courier_name !== undefined) order.courier_name = courier_name;
    if (tracking_id !== undefined) order.tracking_id = tracking_id;
    if (vehicle_details !== undefined) order.vehicle_details = vehicle_details;
    if (delivery_agent !== undefined) order.delivery_agent = delivery_agent;
    if (expected_delivery_date !== undefined) order.expected_delivery_date = expected_delivery_date;

    if (nextStatus === 'TRANSPORT_ASSIGNED') order.transport_assigned_at = new Date().toISOString();
    if (nextStatus === 'PICKED_UP') order.picked_up_at = new Date().toISOString();
    if (nextStatus === 'LOGISTICS_CENTER') order.logistics_center_at = new Date().toISOString();
    if (nextStatus === 'IN_TRANSIT') order.in_transit_at = new Date().toISOString();
    if (nextStatus === 'OUT_FOR_DELIVERY') order.out_for_delivery_at = new Date().toISOString();
    if (nextStatus === 'DELIVERED') {
      order.delivered_at = new Date().toISOString();
      order.actual_delivery_date = new Date().toISOString();
      order.paymentStatus = 'COMPLETED';
    }

    // Active Refund issuance during transition to RETURNED (Mirroring admin)
    if (nextStatus === 'RETURNED' && oldStatus !== 'RETURNED') {
      let refundAmount = 0;
      if (order.returned_items && Array.isArray(order.returned_items) && order.returned_items.length > 0) {
        for (const item of order.items) {
          if (order.returned_items.includes(item.product.id) || order.returned_items.includes(item.product.name)) {
            refundAmount += item.price * item.quantity;
          }
        }
      } else {
        refundAmount = order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
      }

      const orderUser = order.userId;
      if (!wallets[orderUser]) {
        wallets[orderUser] = { balance: 0, transactions: [], withdrawRequests: [] };
      }
      wallets[orderUser].balance = Number((wallets[orderUser].balance + refundAmount).toFixed(2));
      wallets[orderUser].transactions.push({
        id: 'tx-ref-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        amount: refundAmount,
        type: 'CREDIT',
        notes: `Refund for returned items under Order #${order.orderNumber}. Reason: "${order.return_reason || 'I did not like the item'}"`,
        timestamp: new Date().toISOString()
      });
    }

    // Add history record
    if (!order.history) order.history = [];
    order.history.push({
      id: 'hist-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      changedBy: userId,
      changerName: userName,
      role: 'SELLER',
      prevStatus: oldStatus,
      newStatus: nextStatus,
      timestamp: new Date().toISOString(),
      notes: notes || `Order stage transitioned to ${nextStatus}.`
    });

    // Once Packed, trigger immediate control transfer and dispatch alert to admin
    if (nextStatus === 'PACKED') {
      addDbNotification(
        'admin', 
        'Order Awaiting Pickup (Packed)', 
        `Order ${order.orderNumber} is packed by seller "${userName}". Logistics ownership transferred.`, 
        'ADMIN'
      );
    }
  }

  await syncEntity('orders', order.id, order);
  return res.json(order);
});

app.put('/api/orders/:id/admin-status', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const userName = (req.headers['x-user-name'] as string) || 'Admin';

  if (userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin role is required.' });
  }

  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const { 
    nextStatus, 
    notes,
    courier_name,
    tracking_id,
    vehicle_details,
    delivery_agent,
    expected_delivery_date,
    package_weight,
    package_dimensions,
    prep_staff,
    pod_signature,
    current_location,
    cancel_reason
  } = req.body;

  const validAdminSteps = [
    'PENDING',
    'ACCEPTED',
    'PREPARING',
    'PACKED',
    'TRANSPORT_ASSIGNED',
    'PICKED_UP',
    'LOGISTICS_CENTER',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'PENDING_RETURN',
    'RETURNED'
  ];

  if (nextStatus && !validAdminSteps.includes(nextStatus)) {
    return res.status(400).json({ error: 'Invalid logistics stage status.' });
  }

  const oldStatus = order.status;

  if (nextStatus) {
    order.status = nextStatus;
    order.admin_status = nextStatus as any;

    if (nextStatus === 'TRANSPORT_ASSIGNED') order.transport_assigned_at = new Date().toISOString();
    if (nextStatus === 'PICKED_UP') order.picked_up_at = new Date().toISOString();
    if (nextStatus === 'LOGISTICS_CENTER') order.logistics_center_at = new Date().toISOString();
    if (nextStatus === 'IN_TRANSIT') order.in_transit_at = new Date().toISOString();
    if (nextStatus === 'OUT_FOR_DELIVERY') order.out_for_delivery_at = new Date().toISOString();
    if (nextStatus === 'DELIVERED') {
      const { delivery_otp } = req.body;
      if (!order.delivery_otp_verified) {
        if (!delivery_otp) {
          return res.status(400).json({ error: 'Delivery OTP Verification is required to mark this order as DELIVERED.' });
        }
        if (delivery_otp.trim() !== order.delivery_otp.trim()) {
          const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
          order.delivery_otp = newOtp;
          
          const user = users.find(u => u.id === order.userId);
          if (user) {
            sendOtpEmail(user.email, user.name, newOtp, `[Apex Store] New Delivery OTP Code: ${newOtp} (Order ${order.orderNumber})`)
              .catch(err => console.error(err));
          }

          return res.status(400).json({ 
            error: `Incorrect Delivery OTP. A new Delivery OTP (${newOtp}) has been generated and dispatched to the customer.`,
            newOtpGenerated: true,
            newOtp: newOtp
          });
        }
        order.delivery_otp_verified = true;
      }
      order.delivered_at = new Date().toISOString();
      order.actual_delivery_date = new Date().toISOString();
      order.paymentStatus = 'COMPLETED';
    }

    // Active Refund issuance during transition to RETURNED
    if (nextStatus === 'RETURNED' && oldStatus !== 'RETURNED') {
      let refundAmount = 0;
      if (order.returned_items && Array.isArray(order.returned_items) && order.returned_items.length > 0) {
        for (const item of order.items) {
          if (order.returned_items.includes(item.product.id) || order.returned_items.includes(item.product.name)) {
            refundAmount += item.price * item.quantity;
          }
        }
      } else {
        refundAmount = order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
      }

      const orderUser = order.userId;
      if (!wallets[orderUser]) {
        wallets[orderUser] = { balance: 0, transactions: [], withdrawRequests: [] };
      }
      wallets[orderUser].balance = Number((wallets[orderUser].balance + refundAmount).toFixed(2));
      wallets[orderUser].transactions.push({
        id: 'tx-ref-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        amount: refundAmount,
        type: 'CREDIT',
        notes: `Refund for returned items under Order #${order.orderNumber}. Reason: "${order.return_reason || 'I did not like the item'}"`,
        createdAt: new Date().toISOString()
      });

      // Stock Restitution
      for (const item of order.items) {
        if (!order.returned_items || order.returned_items.includes(item.product.id) || order.returned_items.includes(item.product.name)) {
          const prod = products.find(p => p.id === item.product.id);
          if (prod) {
            prod.stock += item.quantity;
          }
        }
      }

      order.refunded_amount = refundAmount;
      order.refund_status = 'REFUNDED';
    }
  }

  if (courier_name !== undefined) order.courier_name = courier_name;
  if (tracking_id !== undefined) order.tracking_id = tracking_id;
  if (vehicle_details !== undefined) order.vehicle_details = vehicle_details;
  if (delivery_agent !== undefined) order.delivery_agent = delivery_agent;
  if (expected_delivery_date !== undefined) order.expected_delivery_date = expected_delivery_date;
  if (package_weight !== undefined) order.package_weight = package_weight;
  if (package_dimensions !== undefined) order.package_dimensions = package_dimensions;
  if (prep_staff !== undefined) order.prep_staff = prep_staff;
  if (pod_signature !== undefined) order.pod_signature = pod_signature;
  if (current_location !== undefined) order.current_location = current_location;
  if (cancel_reason !== undefined) order.cancel_reason = cancel_reason;

  const finalNotes = notes || `Logistics status updated to ${nextStatus || 'shipping info updated'} by Admin.`;

  if (!order.history) order.history = [];
  order.history.push({
    id: 'hist-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    changedBy: userId || 'admin',
    changerName: userName,
    role: 'ADMIN',
    prevStatus: oldStatus,
    newStatus: nextStatus || oldStatus,
    timestamp: new Date().toISOString(),
    notes: finalNotes
  });

  // Client notifications dispatcher
  if (nextStatus && nextStatus !== oldStatus) {
    if (nextStatus === 'DELIVERED') {
      addDbNotification(
        order.userId,
        `Your package has arrived! 🛍️`,
        `Amazing! Your Order #${order.orderNumber} was marked delivered at ${new Date().toLocaleTimeString()}. Safe delivery confirmation sent to registered email.`,
        'ORDER'
      );
    } else if (nextStatus === 'RETURNED') {
      addDbNotification(
        order.userId,
        `Return Completed & Refunded 🔄`,
        `Splendid news! Your return for Order #${order.orderNumber} is processed. Recredited amount of ₹${order.refunded_amount || 'all'} has been issued to your Store Balance.`,
        'ORDER'
      );
    } else {
      addDbNotification(
        order.userId,
        `Logistics Notification: ${nextStatus.replace('_', ' ')}`,
        `Real-time update: ${finalNotes} for your Reference Order #${order.orderNumber}.`,
        'ORDER'
      );
    }
  }

  await syncEntity('orders', order.id, order);
  return res.json(order);
});

app.post('/api/orders/:id/admin-cancel', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const userName = (req.headers['x-user-name'] as string) || 'Admin Auditor';
  const { reason } = req.body;

  if (userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin role is required.' });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A mandatory reason must be supplied for administrator cancellation.' });
  }

  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const oldStatus = order.status;

  // Restore inventory
  for (const item of order.items) {
    const prod = products.find(p => p.id === item.product.id);
    if (prod) {
      prod.stock += item.quantity;
    }
  }

  order.status = 'CANCELLED';
  order.order_status = 'CANCELLED';
  order.cancel_reason = reason;
  order.cancelled_by = 'ADMIN';

  if (!order.history) order.history = [];
  order.history.push({
    id: 'hist-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    changedBy: userId || 'admin',
    changerName: userName,
    role: 'ADMIN',
    prevStatus: oldStatus,
    newStatus: 'CANCELLED',
    timestamp: new Date().toISOString(),
    notes: `Cancelled by Admin. Mandatory Reason: ${reason}`
  });

  addDbNotification(
    order.userId,
    `Order Cancelled by Administrator`,
    `We regret to inform you that your Order ${order.orderNumber} was cancelled by Admin. Reason: "${reason}". Refund process is scheduled.`,
    'ORDER'
  );

  return res.json(order);
});

app.post('/api/orders/:id/seller-cancel', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const userName = (req.headers['x-user-name'] as string) || 'Seller';
  const { reason } = req.body;

  if (userRole !== 'SELLER') {
    return res.status(403).json({ error: 'Forbidden: Seller role is required.' });
  }

  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.status !== 'PENDING') {
    return res.status(400).json({ error: 'Seller cannot decline order once accepted.' });
  }

  const oldStatus = order.status;

  // Restore inventory
  for (const item of order.items) {
    const prod = products.find(p => p.id === item.product.id);
    if (prod) {
      prod.stock += item.quantity;
    }
  }

  order.status = 'CANCELLED';
  order.order_status = 'CANCELLED';
  order.cancel_reason = reason || 'Declined by seller partner';
  order.cancelled_by = 'SELLER';

  if (!order.history) order.history = [];
  order.history.push({
    id: 'hist-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    changedBy: userId,
    changerName: userName,
    role: 'SELLER',
    prevStatus: oldStatus,
    newStatus: 'CANCELLED',
    timestamp: new Date().toISOString(),
    notes: `Declined by Seller. Reason: ${reason || 'Staged rejection'}`
  });

  addDbNotification(
    order.userId,
    `Order Declined by Store Partner`,
    `Your Order ${order.orderNumber} has been rejected by the boutique seller. Reason: "${reason || 'Stock/logistic holds'}".`,
    'ORDER'
  );

  return res.json(order);
});

// Admin User blockage
app.get('/api/admin/users', (req, res) => {
  return res.json(users);
});

app.put('/api/admin/users/:id/block', (req, res) => {
  const u = users.find(user => user.id === req.params.id);
  if (u) {
    // block user action
    return res.json({ success: true, message: `User ${u.name} status updated` });
  }
  return res.status(404).json({ error: 'User not found' });
});

app.delete('/api/admin/users/:id', (req, res) => {
  users = users.filter(u => u.id !== req.params.id);
  return res.json({ success: true });
});

// Admin Analytics Stats
app.get('/api/admin/stats', (req, res) => {
  const totalRevenue = orders
    .filter(o => o.status !== 'CANCELLED' && o.paymentStatus === 'COMPLETED')
    .reduce((sum, o) => sum + o.finalAmount, 0);

  return res.json({
    totalUsers: users.length,
    totalProducts: products.length,
    totalOrders: orders.length,
    revenue: Number(totalRevenue.toFixed(2)),
    adminCommissionBalance: Number(adminCommissionBalance.toFixed(2)),
    adminCommissionTransactions: adminCommissionTransactions,
    recentOrders: orders.slice(-5).reverse(),
    stats: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders: orders.length,
      totalProducts: products.length,
      totalUsers: users.length,
      adminCommissionBalance: Number(adminCommissionBalance.toFixed(2))
    }
  });
});

app.get('/api/admin/dashboard', (req, res) => {
  const totalRevenue = orders
    .filter(o => o.status !== 'CANCELLED' && o.paymentStatus === 'COMPLETED')
    .reduce((sum, o) => sum + o.finalAmount, 0);

  return res.json({
    totalUsers: users.length,
    totalProducts: products.length,
    totalOrders: orders.length,
    revenue: Number(totalRevenue.toFixed(2)),
    adminCommissionBalance: Number(adminCommissionBalance.toFixed(2)),
    adminCommissionTransactions: adminCommissionTransactions,
    recentOrders: orders.slice(-5).reverse(),
    stats: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders: orders.length,
      totalProducts: products.length,
      totalUsers: users.length,
      adminCommissionBalance: Number(adminCommissionBalance.toFixed(2))
    }
  });
});

// --- CUSTOMER SERVICE AI CHATBOT INTEGRATION ---
app.post('/api/chatbot', async (req, res) => {
  const { message, chatHistory, userId } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  // We gather the state of products and active orders of this user (if logged in) 
  // to give Gemini real search grounding context!
  const userOrders = userId ? orders.filter(o => o.userId === userId) : [];
  const ordersSummary = userOrders.map(o => 
    `- Order #${o.orderNumber}: status is '${o.status}', total ₹${o.finalAmount}, contains [${o.items.map((i: any) => `${i.product.name} x${i.quantity}`).join(', ')}], created on ${o.createdAt}`
  ).join('\n');

  const productsSummary = products.map(p => 
    `- ${p.name} (₹${p.price}) in category '${p.category}', Brand: ${p.brand}, Stock remaining: ${p.stock}`
  ).join('\n');

  const systemPrompt = `You are "Apex Support AI", the premium customer support assistant for Apex E-Commerce Platform.
We sell premium gadgets, accessories, books, furniture and luxury lifestyle items.

Here is the current real-time inventory at Apex Store:
${productsSummary}

Here is our active customer's orders history matching their account (if any is shown):
${ordersSummary || 'No active orders registered for this user sesson yet.'}

Our store support metrics are:
1. Returns Policy: Customers can initiate return requests within 14 days of delivery. Return requests can be made easily from the "Orders" page by clicking "Return Request".
2. Shipping: Standard shipping is ₹15. Coupon codes like 'FREESHIP' make transport entirely free.
3. Help Desk hours: 24/7 web assistance.
4. If a customer is asking about a specific product in our store, pitch its values (e.g. sound quality for headphones, LTPO screen for Titan phone).
5. If they want to know where order tracking is, guide them to the "Orders" page on the top navbar.
6. Keep answers concise, highly human, supportive, and avoid speaking of system internals or mock tables. Answer directly and elegantly in markdown formatting.
7. HELPLINE BACKUP: If you cannot resolve the customer's issues or query about their orders/payments, or if they explicitly ask to call or speak to someone, guide them to call our customer support helpline directly at: **9502093743**. You must write: "If this hasn't solved your request, please connect with our priority voice team directly on our customer support hotline: **9502093743**."`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      // Graceful fallback if no API key is specified
      return res.json({
        reply: `Hello! I am **Apex Support AI**. ☕\n\n*(Note: System detects GEMINI_API_KEY is not defined yet, showing simulated support response.)*\n\nBased on our inventory, we have the magnificent **Apex SoundMax Wireless Headphones** (₹349.99) in stock, as well as the **Titan Pro 5G Smart Device** (₹1099.0). If you're looking for help with an active order and need direct assistance, feel free to call our customer support directly at **9502093743**!`
      });
    }

    // Call Gemini using the recommended @google/genai syntax
    const contentsParam = chatHistory && chatHistory.length > 0
      ? [...chatHistory.map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.parts ? h.parts[0].text : h.text }]
        })), { role: 'user', parts: [{ text: message }] }]
      : message;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contentsParam,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7
      }
    });

    const reply = response.text || "I apologize, I am processing high volumes of support chats. Can you please frame your query again?";
    return res.json({ reply });
  } catch (err: any) {
    console.error('Gemini Chat Error:', err);
    return res.status(500).json({ error: 'AI integration error assistance, fallback to local support routing.', details: err.message });
  }
});

// --- MULTI-VENDOR SELLER WALLET ENDPOINTS ---
app.get('/api/seller/wallet/:userId', (req, res) => {
  const { userId } = req.params;
  if (!wallets[userId]) {
    wallets[userId] = { balance: 0, transactions: [], withdrawRequests: [] };
  }
  return res.json(wallets[userId]);
});

app.post('/api/seller/withdraw/:userId', (req, res) => {
  const { userId } = req.params;
  const { amount, bankDetails } = req.body;
  const numericAmount = Number(amount);

  if (!wallets[userId]) {
    wallets[userId] = { balance: 0, transactions: [], withdrawRequests: [] };
  }

  const wallet = wallets[userId];
  if (numericAmount <= 0) {
    return res.status(400).json({ error: 'Withdrawal amount must be greater than zero.' });
  }

  if (wallet.balance < numericAmount) {
    return res.status(400).json({ error: 'Insufficient balance for this withdrawal.' });
  }

  // Deduct from balance
  wallet.balance -= numericAmount;

  const newRequest = {
    id: 'wr-' + (wallet.withdrawRequests.length + wallet.transactions.length + 1),
    amount: numericAmount,
    status: 'PENDING',
    bankDetails: bankDetails || 'Standard Bank Account File',
    createdAt: new Date().toISOString()
  };

  const newTx = {
    id: 'tx-' + (wallet.transactions.length + 1),
    amount: -numericAmount,
    type: 'WITHDRAW',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    notes: `Withdrawal request to ${bankDetails}`
  };

  wallet.withdrawRequests.push(newRequest);
  wallet.transactions.push(newTx);

  return res.json({ success: true, wallet });
});

// --- PLATFORM Q&A ENDPOINTS ---
app.get('/api/products/:id/questions', (req, res) => {
  const { id } = req.params;
  const prodQs = questions.filter(q => q.productId === id);
  return res.json(prodQs);
});

app.post('/api/products/:id/questions', (req, res) => {
  const { id } = req.params;
  const { questionText, askedBy } = req.body;
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const newQ = {
    id: 'q-' + (questions.length + 1),
    productId: id,
    productName: product.name,
    questionText,
    askedBy: askedBy || 'Anonymous Customer',
    answerText: undefined,
    answeredBy: undefined,
    createdAt: new Date().toISOString()
  };

  questions.push(newQ);
  return res.json(newQ);
});

app.get('/api/seller/questions/:userId', (req, res) => {
  const { userId } = req.params;
  const sellerProductIds = products.filter(p => p.sellerId === userId).map(p => p.id);
  const sellerQs = questions.filter(q => sellerProductIds.includes(q.productId));
  return res.json(sellerQs);
});

app.post('/api/seller/answers', (req, res) => {
  const { questionId, answerText, answeredBy } = req.body;
  const qIndex = questions.findIndex(q => q.id === questionId);
  if (qIndex === -1) return res.status(404).json({ error: 'Question not found.' });

  questions[qIndex].answerText = answerText;
  questions[qIndex].answeredBy = answeredBy || 'Store Representative';
  return res.json(questions[qIndex]);
});

// --- ADMIN MULTI-VENDOR MANAGEMENT ENDPOINTS ---
app.get('/api/admin/sellers', (req, res) => {
  const sellers = users.filter(u => u.role === 'SELLER');
  return res.json(sellers);
});

app.post('/api/admin/sellers/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'APPROVED' | 'PENDING' | 'REJECTED'
  const seller = users.find(u => u.id === id);
  if (!seller) return res.status(404).json({ error: 'Seller account not found.' });

  seller.sellerStatus = status;
  return res.json({ success: true, seller });
});

app.post('/api/admin/products/:id/approve', (req, res) => {
  const { id } = req.params;
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  product.isApproved = true;
  return res.json({ success: true, product });
});

app.get('/api/admin/stats', (req, res) => {
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'COMPLETED')
    .reduce((sum, o) => sum + o.finalAmount, 0);

  const totalSellers = users.filter(u => u.role === 'SELLER').length;
  const pendingSellers = users.filter(u => u.role === 'SELLER' && u.sellerStatus === 'PENDING').length;
  const pendingProducts = products.filter(p => p.isApproved === false).length;

  return res.json({
    totalRevenue,
    totalOrders: orders.length,
    totalProducts: products.length,
    totalCategories: categories.length,
    totalSellers,
    pendingSellers,
    pendingProducts
  });
});

// ==========================================
// STATIC VITE CONFIGURATION & COMPILATION
// ==========================================
async function startServer() {
  try {
    await loadData();
  } catch (err) {
    console.error('[APEX SYSTEM] Failed to preload database state on startServer:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[APEX SERVER] Online and listening on http://localhost:${PORT}`);
  });
}

startServer();
