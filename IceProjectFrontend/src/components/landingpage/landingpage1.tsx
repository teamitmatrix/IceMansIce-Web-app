"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { OrderNowButton } from "@/components/ui/order-now-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Truck,
  Phone,
  Mail,
  MapPin,
  Snowflake,
  Droplets,
  Package,
  CheckCircle,
  Cuboid,
  Box,
  Zap,
  Users,
  HeartHandshake,
  Clock,
  GalleryHorizontal,
} from "lucide-react";

interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  emergencyPhone: string;
  hours: string;
}

interface CompanyInfo {
  name: string;
  tagline: string;
  description: string;
}

interface SiteSettings {
  contactInfo: ContactInfo;
  companyInfo: CompanyInfo;
}

/**
 * --- MOTION PRESETS (Refined) ---
 */

// Global fade up with slight blur (used for sections)
const sectionFade = {
  hidden: { opacity: 0, y: 50, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: "easeOut" as const,
      staggerChildren: 0.1
    }
  }
};

// Item pop-in with a subtle rotation (used for cards/features)
const itemPop = {
  hidden: { opacity: 0, scale: 0.9, y: 20, rotateX: 5 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: 0.6,
      type: "spring" as const,
      damping: 10,
      stiffness: 100
    }
  }
};

// Container for staggered children
const staggeredContainer = {
  visible: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function LandingPageNextLevel() {
  // State for dynamic settings
  const [settings, setSettings] = useState<SiteSettings>({
    contactInfo: {
      phone: "407-310-5007",
      email: "moe@icemansice.com",
      address: "501 Florida Central Pkwy Unit 521952, Longwood, FL 32750-5153",
      emergencyPhone: "407-310-5007",
      hours: "Mon-Fri: 6AM-8PM, Sat-Sun: 7AM-6PM",
    },
    companyInfo: {
      name: "IceMan's Ice",
      tagline: "❄️ Reliable Ice & Water Delivery You Can Count On",
      description: "Keep your operation running smoothly with pure, crystal-clear ice designed for high-demand environments. Our premium ice offers exceptional clarity, slow melting, and consistent supply—perfect for quality-focused businesses. We proudly serve: • Restaurants, cafés & bars • Offices & events • Construction & industrial sites 📞 Call 407-310-5007 to schedule delivery or request a custom quote today.",
    },
  });
  const [loading, setLoading] = useState(true);

  // Fetch settings from API
  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
                            process.env.NEXT_PUBLIC_API_BASE_URL || 
                            "https://icemans-ice.onrender.com";
        // Add cache busting to ensure fresh data
        const response = await fetch(`${API_BASE_URL}/settings?_=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        });
        if (response.ok && isMounted) {
          const data = await response.json();
          console.log("Fetched settings:", data); // Debug log
          setSettings(data);
        } else if (!isMounted) {
          // Component unmounted, skip state update
          return;
        } else {
          console.error("Failed to fetch settings, status:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        // Keep default settings if fetch fails
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();
    
    // Poll for settings updates every 30 seconds to catch admin changes
    const pollInterval = setInterval(() => {
      if (isMounted) {
        fetchSettings();
      }
    }, 30000); // 30 seconds

    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Define image data for the new gallery section
  const galleryImages = [
    { src: "/bottles1.jpg", alt: "Purified Water", label: "Purified Water" },
    { src: "/hall.jpg", alt: "We Provide Service to Restaurants", label: "We Provide Service to Restaurants" },
    { src: "/bottles2.jpg", alt: "We Deliver to Retailers", label: "We Deliver to Retailers" },
    { src: "/cap.jpg", alt: "We Provide Service to Construction Sites", label: "We Provide Service to Construction Sites" }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-50 text-gray-800">
      {/* --- Global Styles for Animations --- */}
      <style jsx global>{`
        /* Glacier Pulse */
        @keyframes glacierPulse {
          0% {
            opacity: 0.1;
            transform: scale(1);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.05);
          }
          100% {
            opacity: 0.1;
            transform: scale(1);
          }
        }
        .glacier-pulse {
          animation: glacierPulse 10s ease-in-out infinite;
        }

        /* Subtle Float */
        @keyframes floatSlow {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0px); }
        }
        .float-slow { animation: floatSlow 5s ease-in-out infinite; }
      `}</style>

      {/* --- BACKGROUND AND NAV --- */}

      {/* Background Gradient Base (Deep Ice Blue) */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/5 via-cyan-50/10 to-white/5 pointer-events-none" aria-hidden />

      {/* NAV (Sticky and Professional) */}
      <motion.nav
        className="bg-white/90 backdrop-blur-lg border-b border-blue-100 sticky top-0 z-50 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-3 group">
              {/* <Snowflake className="h-10 w-10 text-blue-600 transition-transform duration-500 group-hover:rotate-180" /> */}
              {/* Logo */}
               <Image src="/logo.jpg" className="rounded-full h-10 w-10" alt={`${settings.companyInfo.name} Logo`} width={40} height={40} />
              <span className="text-xl sm:text-2xl font-extrabold text-blue-800 tracking-tight">
                {settings.companyInfo.name}
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className=" cursor-pointer text-gray-700 hover:text-blue-600 font-medium  sm:inline-flex">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* --- HERO SECTION (High Impact) --- */}
      <motion.section
        // add background img no repeat cover
        style={{ backgroundImage: "url('/cubesbg.webp')", backgroundRepeat: "no-repeat", backgroundSize: "cover" }}
        className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden z-20"
        initial="hidden"
        animate="visible"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } }}
      >
        {/* Animated Background Blob/Glow */}
        <div className="absolute inset-0 bg-blue-900/90 opacity-90 pointer-events-none -z-10" aria-hidden>
          <div className="absolute top-0 left-0 w-full h-full bg-black/40" />
          <div className="absolute top-20 left-20 w-80 h-80 bg-cyan-300/20 rounded-full blur-3xl glacier-pulse" />
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl glacier-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* HERO CONTENT */}
        <div className="relative max-w-7xl mx-auto text-center text-white">
          <motion.h1
            className="text-6xl sm:text-7xl lg:text-8xl font-black mb-6 leading-tight drop-shadow-2xl"
            variants={{
              hidden: { opacity: 0, y: 40 },
              visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } }
            }}
          >
            {settings.companyInfo.tagline}
          </motion.h1>

          <motion.p
            className="text-xl sm:text-2xl text-white/90 mb-10 max-w-4xl mx-auto font-light drop-shadow-lg"
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2 } } }}
          >
            {settings.companyInfo.description}
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-5 justify-center"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.4 } } }}
          >
            <Button
            
              variant="outline"
              aria-label="Request a quote for bulk orders"
              onClick={() => {
                const orderSection = document.getElementById('order-forms');
                orderSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className=" cursor-pointer border-white/50 text-black hover:bg-white/20 px-10 py-3 text-xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.05] hover:border-white"
            >
              Get a Quote
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* --- ABOUT (Visual Storytelling) --- */}
      <motion.section
        className="relative py-20 px-4 sm:px-6 lg:px-8 bg-blue-50/50 overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionFade}
      >
        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              className="order-2 lg:order-1"
              variants={itemPop}
            >
              <h2 className="text-4xl sm:text-5xl font-extrabold text-blue-800 mb-6">
                Our Commitment to Purity
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6 border-l-4 border-cyan-500 pl-4">
                For over a decade, <b>{settings.companyInfo.name}</b> has been the trusted supplier of premium ice. We specialize in producing crystal-clear ice from multi-stage <b>filtered water</b>, ensuring every product exceeds the highest standards of purity and quality.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mb-10">
                From catering a small family gathering to supplying large corporate events and restaurants, we deliver fresh ice that keeps your brand cool and your guests satisfied.
              </p>

              <div className="flex flex-wrap gap-6">
                <Badge className="bg-blue-100 text-blue-800 text-base py-2 px-4 shadow-md">
                  <HeartHandshake className="h-5 w-5 mr-2" /> 10+ Years Trust
                </Badge>
                <Badge className="bg-cyan-100 text-cyan-800 text-base py-2 px-4 shadow-md">
                  <CheckCircle className="h-5 w-5 mr-2" /> FDA Approved Facility
                </Badge>
              </div>
            </motion.div>

            <motion.div
              className="order-1 lg:order-2 relative group transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]"
              variants={{ ...itemPop, hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8 } } }}
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-8 bg-gradient-to-br from-blue-50 to-cyan-100">
                <Image
                  src="/iceman.jpg" // Assuming this image is a high-quality ice block or production
                  alt="Crystal Clear Ice Block"
                  height={550}
                  width={550}
                  className="object-cover w-full h-auto rounded-2xl border-4 border-white shadow-xl group-hover:scale-[1.01] transition-transform duration-500"
                />
              </div>
              <Badge className="absolute top-8 left-8 bg-blue-600 text-white text-xl font-bold p-3 shadow-lg transform rotate-3 transition-transform duration-500 group-hover:rotate-0">
                #1 in Quality
              </Badge>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* --- VALUE PROPOSITION STRIP (Enhanced) --- */}
      <motion.div
        className="relative -mt-16 bg-white py-8 z-30 shadow-2xl"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggeredContainer}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200">
            {[
              { icon: Truck, title: "Rapid Delivery" },
              { icon: Droplets, title: "100% Pure" },
              { icon: CheckCircle, title: "Quality Approved" },
              { icon: Clock, title: "24/7 Support" }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="text-center p-4"
                variants={itemPop}
                custom={index * 0.1}
              >
                <item.icon className="h-8 w-8 text-cyan-600 mx-auto mb-2 transition-transform duration-500 hover:scale-110" />
                <p className="font-semibold text-sm sm:text-base text-gray-700">{item.title}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* --- PRODUCTS (Focused Showcase) --- */}
      <div className="bg-blue-50/50">
        <motion.section
          id="products"
          className="relative py-20 px-4 sm:px-6 lg:px-8 z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={sectionFade}
        >
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-5xl font-extrabold text-blue-800 mb-4">Our Ice Products</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Premium quality, crystal-clear ice solutions designed for maximum cooling and purity.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Product Card 1: Cubes */}
              <motion.div
                variants={itemPop}
                custom={0.1}
                className="group relative overflow-hidden rounded-3xl shadow-2xl bg-white/80 backdrop-blur-lg border border-blue-100 transition-all duration-500 hover:shadow-cyan-400/50 hover:scale-[1.01]"
              >
                <div className="p-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <Cuboid className="h-16 w-16 text-cyan-600 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" />
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <h3 className="text-3xl font-bold text-gray-900 mb-3">Gourmet Ice Cubes</h3>
                    <p className="text-gray-600 mb-4">
                      Perfect 2-inch cubes for high-end drinks, cocktails, and slow-melting refreshment.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
                      {["Clear & Pure", "Slow Melting", "Cocktail Ready"].map((feature, idx) => (
                        <Badge key={idx} className="bg-cyan-500/10 text-cyan-700 border border-cyan-300 font-medium">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <OrderNowButton
                      className="cursor-pointer w-full md:w-auto bg-blue-600 hover:bg-blue-700 transition-colors"
                      onClick={() => {
                        document.getElementById('order-forms')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      Order Cubes
                    </OrderNowButton>
                  </div>
                </div>
              </motion.div>

              {/* Product Card 2: Packaged */}
              <motion.div
                variants={itemPop}
                custom={0.2}
                className="group relative overflow-hidden rounded-3xl shadow-2xl bg-white/80 backdrop-blur-lg border border-blue-100 transition-all duration-500 hover:shadow-blue-400/50 hover:scale-[1.01]"
              >
                <div className="p-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <Box className="h-16 w-16 text-blue-600 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" />
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <h3 className="text-3xl font-bold text-gray-900 mb-3">Bulk Packaged Ice</h3>
                    <p className="text-gray-600 mb-4">
                      Convenient bags for large events, commercial use, and high-volume retail sales.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
                      {["Sealed Fresh", "Retail Ready", "Bulk Discount"].map((feature, idx) => (
                        <Badge key={idx} className="bg-blue-500/10 text-blue-700 border border-blue-300 font-medium">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <OrderNowButton
                      className="cursor-pointer w-full md:w-auto bg-cyan-600 hover:bg-cyan-700 transition-colors"
                      onClick={() => {
                        document.getElementById('order-forms')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      Order Bags
                    </OrderNowButton>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* --- NEW SECTION: VISUAL GALLERY (Showcase Images) --- */}
      <motion.section
        className="relative py-20 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionFade}
      >
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-blue-800 mb-4 flex items-center justify-center">
              <GalleryHorizontal className="h-10 w-10 text-cyan-600 mr-3" />
              Our Visual Gallery
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A look inside our facility and the premium quality of our finished products.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" >
            {galleryImages.map((img, index) => (
              <motion.div
                key={index}
                variants={itemPop}
                custom={index * 0.1}
                className="group relative overflow-hidden rounded-xl shadow-xl transition-transform duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-blue-300/50"
              >
                {/* Image */}
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={600}
                  height={400}
                  className="w-full h-full object-cover aspect-[4/3] group-hover:opacity-90 transition-opacity duration-300"
                />

                {/* Hover overlay for desktop - reduced font size to text-sm (14px) */}
                <div className="absolute inset-0 bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-center p-4">
                  <Badge className="bg-cyan-500 text-white font-semibold text-sm px-3 py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-lg max-w-full">
                    {img.label}
                  </Badge>
                </div>

                {/* Mobile: Always visible text below image */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-900/90 via-blue-900/70 to-transparent p-3">
                  <p className="text-white text-xs font-medium text-center leading-tight">
                    {img.label}
                  </p>
                </div>

              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>



      {/* --- WHY CHOOSE US (Dynamic Feature Grid) --- */}
      <motion.section
        className="relative py-20 px-4 sm:px-6 lg:px-8 bg-white z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={sectionFade}
      >
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-blue-800 mb-4">Why IceMan's is the Superior Choice</h2>
            <p className="text-xl text-gray-600">Unmatched service, purity, and reliability in every delivery.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8" >
            {[
              {
                icon: Droplets,
                title: "Crystal Purity",
                description: "Triple-filtered water for ice that's visually stunning and flavor-neutral."
              },
              {
                icon: Truck,
                title: "On-Demand Delivery",
                description: "Reliable, refrigerated transportation, ensuring your ice arrives frozen and on time."
              },
              {
                icon: Users,
                title: "Bulk Order Experts",
                description: "Capacity to handle massive volume orders for large festivals, construction, and events."
              },
              {
                icon: Zap,
                title: "Emergency Service",
                description: "24/7 support for urgent ice needs—we've got you covered when the unexpected happens."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={itemPop}
                custom={index * 0.15}
                className="flex gap-4 items-stretch"
              >
                <div className="text-center p-8 bg-blue-50/50 rounded-3xl shadow-xl border border-blue-100 transition-all duration-300 hover:shadow-2xl hover:ring-2 ring-cyan-400/50 transform hover:-translate-y-1">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-cyan-100/70">
                      <feature.icon className="h-10 w-10 text-cyan-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* --- ORDER FORMS SECTION --- */}
      <motion.section
        id="order-forms"
        className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-cyan-50 z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionFade}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 
              className="text-5xl font-black text-gray-900 mb-6 tracking-tight"
              variants={itemPop}
            >
              Place Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Order</span>
            </motion.h2>
            <p className="text-xl text-gray-600">Choose your order type and we'll get back to you right away.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Emergency Order Form */}
            <motion.div
              variants={itemPop}
              className="bg-white p-8 rounded-3xl shadow-xl border border-red-100"
            >
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-red-100">
                    <Zap className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Emergency/Event Delivery</h3>
                </div>
                <p className="text-gray-600">Need ice urgently? Fill out this form for immediate assistance.</p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
                  
                  // Collect product items
                  const products: Array<{type: string; quantity: number}> = [];
                  const productElements = e.currentTarget.querySelectorAll('[data-product-item]');
                  productElements.forEach((item: any) => {
                    const type = item.querySelector('[name^="productType_"]')?.value;
                    const quantity = item.querySelector('[name^="productQuantity_"]')?.value;
                    if (type && type !== '' && quantity && parseInt(quantity) > 0) {
                      products.push({ type, quantity: parseInt(quantity) });
                    }
                  });

                  // Validate that at least one product is selected
                  if (products.length === 0) {
                    alert('Please select at least one product with quantity');
                    return;
                  }

                  const data: any = {
                    companyName: formData.get('companyName'),
                    contactPerson: formData.get('contactPerson'),
                    phone: formData.get('phone'),
                    email: formData.get('email'),
                    street: formData.get('street'),
                    city: formData.get('city'),
                    state: formData.get('state'),
                    zip: formData.get('zip'),
                    dateOfRequest: formData.get('dateOfRequest'),
                    preferredDeliveryTime: formData.get('preferredDeliveryTime'),
                    products: products,
                    storageUnitNeeded: formData.get('storageUnitNeeded'),
                    specialInstructions: formData.get('specialInstructions')
                  };
                  
                  // Show loading state
                  if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="inline-flex items-center"><svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Submitting...</span>';
                  }
                  
                  try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-forms/emergency`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data)
                    });

                    if (response.ok) {
                      (e.target as HTMLFormElement).reset();
                      alert('Emergency order submitted successfully! We will contact you shortly.');
                    } else {
                      const error = await response.json();
                      alert(error.message || 'Failed to submit order');
                    }
                  } catch (error) {
                    alert('Failed to submit order. Please try again.');
                  } finally {
                    // Restore button state
                    if (submitButton) {
                      submitButton.disabled = false;
                      submitButton.innerHTML = 'Submit Emergency Order <svg class="inline-block ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
                    }
                  }
                }}
                className="space-y-4"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="companyName"
                    placeholder="Company Name *"
                    required
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    name="contactPerson"
                    placeholder="Contact Person *"
                    required
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number *"
                    required
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email (optional)"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <input
                  type="text"
                  name="street"
                  placeholder="Delivery Street Address *"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />

                <div className="grid md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    name="city"
                    placeholder="City *"
                    required
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    name="state"
                    placeholder="State *"
                    required
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    name="zip"
                    placeholder="ZIP Code *"
                    required
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="date"
                    name="dateOfRequest"
                    required
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <select
                    name="preferredDeliveryTime"
                    required
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Preferred Time *</option>
                    <option value="ASAP">ASAP</option>
                    <option value="Within 2 hours">Within 2 hours</option>
                    <option value="Same Day">Same Day</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Products Section with Dynamic Add/Remove */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Products Needed *</label>
                  <div id="emergency-products-container" className="space-y-3 overflow-hidden">
                    <div data-product-item className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <select
                        name="productType_0"
                        required
                        className="min-w-0 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="">Select Product *</option>
                        <option value="20lb Bagged Ice">20lb Bagged Ice</option>
                        <option value="7lb Ice Bagged ice">7lb Ice Bagged ice</option>
                        <option value="24 Pack 16.9Oz Purified water">24 Pack 16.9Oz Purified water</option>
                      </select>
                      <input
                        type="number"
                        name="productQuantity_0"
                        placeholder="Quantity *"
                        required
                        min="1"
                        className="min-w-0 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const container = document.getElementById('emergency-products-container');
                          const items = container?.querySelectorAll('[data-product-item]');
                          if (items && items.length > 1) {
                            e.currentTarget.parentElement?.remove();
                          } else {
                            alert('At least one product row is required');
                          }
                        }}
                        className="whitespace-nowrap px-4 py-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={(e) => {
                      const container = document.getElementById('emergency-products-container');
                      const itemCount = container?.querySelectorAll('[data-product-item]').length || 0;
                      const newItem = document.createElement('div');
                      newItem.setAttribute('data-product-item', '');
                      newItem.className = 'grid grid-cols-[1fr_1fr_auto] gap-3 items-end';
                      newItem.innerHTML = `
                        <select name="productType_${itemCount}" required class="min-w-0 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent">
                          <option value="">Select Product *</option>
                          <option value="20lb Bagged Ice">20lb Bagged Ice</option>
                          <option value="7lb Ice Bagged ice">7lb Ice Bagged ice</option>
                          <option value="24 Pack 16.9Oz Purified water">24 Pack 16.9Oz Purified water</option>
                        </select>
                        <input type="number" name="productQuantity_${itemCount}" placeholder="Quantity *" required min="1" class="min-w-0 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                        <button type="button" onclick="this.parentElement.remove()" class="whitespace-nowrap px-4 py-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors font-medium">Remove</button>
                      `;
                      container?.appendChild(newItem);
                    }}
                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 py-2 rounded-xl font-medium transition-colors"
                  >
                    + Add Another Product
                  </Button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Storage Unit Needed?</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center">
                      <input type="radio" name="storageUnitNeeded" value="No" className="mr-2" defaultChecked />
                      <span>No</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="storageUnitNeeded" value="Small Bin" className="mr-2" />
                      <span>Small Bin</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="storageUnitNeeded" value="Large Bin" className="mr-2" />
                      <span>Large Bin</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="storageUnitNeeded" value="Trailer" className="mr-2" />
                      <span>Trailer</span>
                    </label>
                  </div>
                </div>

                <textarea
                  name="specialInstructions"
                  placeholder="Special Instructions (optional)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all hover:shadow-xl"
                >
                  Submit Emergency Order <Zap className="inline-block ml-2 h-5 w-5" />
                </Button>
              </form>
            </motion.div>

            {/* Regular Customer Order Form */}
            <motion.div
              variants={itemPop}
              className="bg-white p-8 rounded-3xl shadow-xl border border-blue-100"
            >
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-blue-100">
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Regular Order</h3>
                </div>
                <p className="text-gray-600">Schedule your regular ice delivery with us.</p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
                  
                  // Collect product items
                  const products: Array<{type: string; quantity: number}> = [];
                  const productElements = e.currentTarget.querySelectorAll('[data-regular-product-item]');
                  productElements.forEach((item: any) => {
                    const type = item.querySelector('[name^="regularProductType_"]')?.value;
                    const quantity = item.querySelector('[name^="regularProductQuantity_"]')?.value;
                    if (type && type !== '' && quantity && parseInt(quantity) > 0) {
                      products.push({ type, quantity: parseInt(quantity) });
                    }
                  });

                  // Validate that at least one product is selected
                  if (products.length === 0) {
                    alert('Please select at least one product with quantity');
                    return;
                  }

                  const data: any = {
                    name: formData.get('name'),
                    address: formData.get('address'),
                    phone: formData.get('phone'),
                    email: formData.get('email'),
                    products: products,
                    requestedDeliveryDay: formData.get('requestedDeliveryDay'),
                    additionalNotes: formData.get('additionalNotes')
                  };
                  
                  // Show loading state
                  if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="inline-flex items-center"><svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Submitting...</span>';
                  }
                  
                  try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-forms/regular`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data)
                    });

                    if (response.ok) {
                      (e.target as HTMLFormElement).reset();
                      alert('Order submitted successfully! We will contact you shortly.');
                    } else {
                      const error = await response.json();
                      alert(error.message || 'Failed to submit order');
                    }
                  } catch (error) {
                    alert('Failed to submit order. Please try again.');
                  } finally {
                    // Restore button state
                    if (submitButton) {
                      submitButton.disabled = false;
                      submitButton.innerHTML = 'Submit Order <svg class="inline-block ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>';
                    }
                  }
                }}
                className="space-y-4"
              >
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name *"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <input
                  type="text"
                  name="address"
                  placeholder="Delivery Address *"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number *"
                    required
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email (optional)"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Products Section with Dynamic Add/Remove */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Products Needed *</label>
                  <div id="regular-products-container" className="space-y-3 overflow-hidden">
                    <div data-regular-product-item className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <select
                        name="regularProductType_0"
                        required
                        className="min-w-0 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Product *</option>
                        <option value="20lb Bagged Ice">20lb Bagged Ice</option>
                        <option value="7lb Ice Bagged ice">7lb Ice Bagged ice</option>
                        <option value="24 Pack 16.9Oz Purified water">24 Pack 16.9Oz Purified water</option>
                      </select>
                      <input
                        type="number"
                        name="regularProductQuantity_0"
                        placeholder="Quantity *"
                        required
                        min="1"
                        className="min-w-0 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const container = document.getElementById('regular-products-container');
                          const items = container?.querySelectorAll('[data-regular-product-item]');
                          if (items && items.length > 1) {
                            e.currentTarget.parentElement?.remove();
                          } else {
                            alert('At least one product row is required');
                          }
                        }}
                        className="whitespace-nowrap px-4 py-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={(e) => {
                      const container = document.getElementById('regular-products-container');
                      const itemCount = container?.querySelectorAll('[data-regular-product-item]').length || 0;
                      const newItem = document.createElement('div');
                      newItem.setAttribute('data-regular-product-item', '');
                      newItem.className = 'grid grid-cols-[1fr_1fr_auto] gap-3 items-end';
                      newItem.innerHTML = `
                        <select name="regularProductType_${itemCount}" required class="min-w-0 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="">Select Product *</option>
                          <option value="20lb Bagged Ice">20lb Bagged Ice</option>
                          <option value="7lb Ice Bagged ice">7lb Ice Bagged ice</option>
                          <option value="24 Pack 16.9Oz Purified water">24 Pack 16.9Oz Purified water</option>
                        </select>
                        <input type="number" name="regularProductQuantity_${itemCount}" placeholder="Quantity *" required min="1" class="min-w-0 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        <button type="button" onclick="this.parentElement.remove()" class="whitespace-nowrap px-4 py-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors font-medium">Remove</button>
                      `;
                      container?.appendChild(newItem);
                    }}
                    className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 py-2 rounded-xl font-medium transition-colors"
                  >
                    + Add Another Product
                  </Button>
                </div>

                <select
                  name="requestedDeliveryDay"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Requested Delivery Day *</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>

                <textarea
                  name="additionalNotes"
                  placeholder="Additional Notes (optional)"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all hover:shadow-xl"
                >
                  Submit Order <Package className="inline-block ml-2 h-5 w-5" />
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* --- CONTACT (Actionable and Clear) --- */}
      <motion.section
        id="contact"
        className="relative py-20 px-4 sm:px-6 lg:px-8 bg-blue-50/50 z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionFade}
      >
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-blue-800 mb-4">Need Ice Now? Get in Touch!</h2>
            <p className="text-xl text-gray-600">Fast service for your business and events.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12 items-stretch">

            {/* Contact Info (Left Column) */}
            <motion.div
              className="lg:col-span-1 p-8 bg-white rounded-3xl shadow-lg border border-blue-100"
              variants={itemPop}
              custom={0.1}
            >
              <h3 className="text-2xl font-bold text-blue-800 mb-6 border-b pb-3 border-blue-200">Connect with Us</h3>
              <div className="space-y-6">
                {[
                  { icon: Phone, title: "Phone (24/7)", detail: settings.contactInfo.phone, link: `tel:${settings.contactInfo.phone.replace(/\D/g, '')}` },
                  { icon: Mail, title: "Email", detail: settings.contactInfo.email, link: `mailto:${settings.contactInfo.email}` },
                  { icon: MapPin, title: "Headquarters", detail: settings.contactInfo.address, link: "#" },
                  { icon: Clock, title: "Business Hours", detail: settings.contactInfo.hours, link: "#" }
                ].map((item, index) => (
                  <Link
                    key={index}
                    href={item.link}
                    className="flex items-start space-x-4 p-4 -m-4 hover:bg-blue-50 rounded-xl transition-colors group"
                  >
                    <item.icon className="h-6 w-6 text-cyan-600 flex-shrink-0 transition-transform group-hover:scale-110" />
                    <div>
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      <p className="text-gray-600 transition-colors group-hover:text-blue-700">{item.detail}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Call to Action Card (Right Columns - Dominant) */}
            <motion.div
              className="lg:col-span-2 p-10 bg-gradient-to-br from-blue-700 to-cyan-700 rounded-3xl shadow-2xl text-white flex flex-col justify-between transform transition-all hover:scale-[1.01] duration-500"
              variants={itemPop}
              custom={0.2}
            >
              <div>
                <h4 className="font-extrabold text-4xl mb-4 leading-tight">
                  Place Your Order <span className="text-cyan-300">Instantly</span>
                </h4>
                <p className="text-blue-200 text-lg mb-8">
                  Tap below to call us and place your order.
                </p>
                <Button
                  asChild
                  aria-label="Call to start ice order"
                  className="cursor-pointer w-full bg-white text-blue-800 hover:bg-blue-100 font-black text-xl shadow-2xl transition-all hover:ring-4 ring-cyan-300/80 py-4"
                >
                  <a href={`tel:${settings.contactInfo.emergencyPhone.replace(/\D/g, '')}`}>
                    Start Ice Order <Zap className="inline-block ml-2 h-6 w-6" />
                  </a>
                </Button>
              </div>

              <div className="mt-10 pt-6 border-t border-blue-500/50">
                <h4 className="font-semibold text-2xl mb-2 text-cyan-200">Need Immediate Help?</h4>
                <p className="text-blue-100 text-lg mb-2">
                  Call our dedicated 24/7 line for emergency ice delivery service.
                </p>
                <p className="text-white font-black text-4xl tracking-wider">{settings.contactInfo.emergencyPhone}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* --- FOOTER (Dark & Solid) --- */}
      <footer className="relative bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8 z-20">
        <div className="relative max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-10 border-b border-gray-800 pb-10">
            {/* Branding/Social */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center space-x-3 mb-4">
                <Snowflake className="h-8 w-8 text-cyan-400" />
                <span className="text-2xl font-bold">{settings.companyInfo.name}</span>
              </Link>
              <p className="text-gray-400 mb-6 text-sm">
                {settings.companyInfo.description}
              </p>
              <div className="flex space-x-4">
                {/* Placeholder for social icons */}
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <span className="font-bold text-lg">f</span>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <span className="font-bold text-lg">t</span>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <span className="font-bold text-lg">i</span>
                </div>
              </div>
            </div>

            {/* Links */}
            {[
              {
                title: "Products",
                links: [
                  { label: "Ice Cubes", href: "#products" },
                  { label: "Packaged Ice", href: "#products" },
                ],
              },
              {
                title: "Services",
                links: [
                  { label: "Delivery" },
                  { label: "Bulk Orders" },
                  { label: "Emergency Service" },
                  { label: "Custom Solutions" },
                ],
              },
              {
                title: "Company",
                links: [
                  { label: "About Us", href: "#" },
                  { label: "Contact", href: "#contact" },
                  { label: "Privacy Policy" },
                  { label: "Terms of Service" },
                ],
              },
            ].map((col, index) => (
              <div key={index}>
                <h4 className="font-semibold mb-4 text-lg text-white">{col.title}</h4>
                <ul className="space-y-3 text-gray-400">
                  {col.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      {link.href ? (
                        <Link href={link.href} className="hover:text-cyan-400 transition-colors text-sm">
                          {link.label}
                        </Link>
                      ) : (
                        <span className="text-sm">{link.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-gray-500">
            <p className="text-sm">&copy; {new Date().getFullYear()} {settings.companyInfo.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}