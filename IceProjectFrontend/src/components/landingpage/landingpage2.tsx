
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrderNowButton } from "@/components/ui/order-now-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // Kept for components/ui reference, though not used in final layout
import { Textarea } from "@/components/ui/textarea"; // Kept for components/ui reference, though not used in final layout
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  Truck,
  Clock,
  Shield,
  Phone,
  Mail,
  MapPin,
  Star,
  Snowflake,
  Droplets,
  Package,
  Users,
  CheckCircle,
  Cuboid,
  Box // New icon for Packaged Ice
} from "lucide-react";

export default function LandingPage2() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Iceberg Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/iceberg-bg.jpg')"
        }}
      ></div>

      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30"></div>

      {/* Ice crystal pattern overlay for extra texture (Kept for professional texture) */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-xl"></div>
        <div className="absolute top-32 right-20 w-24 h-24 bg-gradient-to-br from-cyan-200/30 to-transparent rounded-full blur-lg"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-2xl"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-gradient-to-br from-white/30 to-transparent rounded-full blur-lg"></div>
        <div className="absolute top-1/2 left-10 w-36 h-36 bg-gradient-to-br from-cyan-100/40 to-transparent rounded-full blur-xl"></div>
        <div className="absolute top-1/3 right-10 w-20 h-20 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-md"></div>
      </div>

      {/* Animated snowflake particles (Enhanced Animation) */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute text-white/50 opacity-0 animate-fade-in-slow" // Added custom animation
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`,
              animationIterationCount: 'infinite',
              opacity: `${0.2 + Math.random() * 0.4}`
            }}
          >
            <Snowflake size={12 + Math.random() * 8} className="animate-float" />
          </div>
        ))}
      </div>

      {/* Subtle ice texture overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(255,255,255,0.6) 1px, transparent 1px),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 1px, transparent 1px),
            radial-gradient(circle at 40% 40%, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px, 80px 80px, 60px 60px'
        }}
      ></div>

      {/* Custom Keyframes for floating and slow fade-in */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes fadeInSlow {
          0% { opacity: 0; transform: translateY(20px); }
          5% { opacity: 0; }
          10% { opacity: 1; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-fade-in-slow {
          animation: fadeInSlow 10s ease-out forwards;
        }
        .animate-pop-in {
            animation: popIn 0.5s ease-out forwards;
        }
        @keyframes popIn {
            0% { opacity: 0; transform: scale(0.9) translateY(20px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              {/* <Snowflake className="h-8 w-8 text-blue-600 animate-pulse" />  */}
              {/* Logo */}
              <Image src="/logo.jpg" className="rounded-full h-10 w-10" alt="IceMan's Ice Logo" width={40} height={40} />
              <span className="text-xl sm:text-2xl font-bold text-blue-600">IceMan's Ice</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white transition-all hover:shadow-lg"> {/* Added hover shadow */}
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10"></div>
        {/* Ice crystal formations */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-cyan-200/30 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-br from-blue-300/20 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 drop-shadow-lg animate-fade-in-slow"> {/* Added entrance animation */}
              ❄️ Reliable Ice & Water Delivery{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 drop-shadow-lg">
                You Can Count On
              </span>
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto drop-shadow-md animate-pop-in" style={{ animationDelay: '0.3s' }}> {/* Added entrance animation */}
              Keep your operation running smoothly with pure, crystal-clear ice designed for high-demand environments. Our premium ice offers exceptional clarity, slow melting, and consistent supply—perfect for quality-focused businesses. We proudly serve: • Restaurants, cafés & bars • Offices & events • Construction & industrial sites 📞 Call 407-310-5007 to schedule delivery or request a custom quote today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <OrderNowButton
                size="lg"
                className="bg-blue-600/90 hover:bg-blue-700 text-white px-8 py-3 text-lg backdrop-blur-sm shadow-lg transition-all hover:scale-105" // Added hover scale animation
              >
                Order Now
              </OrderNowButton>
              <Button size="lg" variant="outline" className="border-white/50 text-gray-900 hover:bg-white/10 px-8 py-3 text-lg backdrop-blur-sm transition-all hover:scale-105"> {/* Added hover scale animation */}
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>


      {/* About Us Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
        {/* Frosted glass effect with iceberg visible */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-md"></div>
        {/* Ice crystal accents */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-cyan-200/40 to-transparent rounded-full blur-xl"></div>
          <div className="absolute bottom-10 left-10 w-24 h-24 bg-gradient-to-br from-blue-200/30 to-transparent rounded-full blur-lg"></div>
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-pop-in">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">About IceMan's Ice</h2>
              <p className="text-lg text-gray-600 mb-6">
                For over a decade, IceMans has been the trusted supplier of premium ice products
                in the region. We specialize in producing crystal-clear ice from filtered water,
                ensuring every cube and block meets the highest standards of purity and quality.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                From small family gatherings to large corporate events, we deliver fresh ice
                that keeps your drinks cold and your guests satisfied.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-4 items-center">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">FDA Approved</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">Quality Guaranteed</span>
                </div>
              </div>
            </div>
            <div className="relative transform transition-all hover:scale-[1.02] duration-500"> {/* Added hover animation */}
              <div className="aspect-w-4 aspect-h-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl p-8 flex items-center justify-center shadow-xl">
                <div className="text-center">
                  {/* <img src="/iceman.jpg" loading="lazy" alt="Ice Block" className="lazy object-fill text-blue-600 mx-auto mb-4 rounded-md shadow-lg" /> */}
                  <Image
                    src="/iceman.jpg"
                    alt="Ice Block"
                    height={400}
                    width={400}
                    className="lazy object-fill text-blue-600 mx-auto mb-4 rounded-md shadow-lg"
                    />
                  <h3 className="text-xl font-semibold text-gray-900">Pure Water Source</h3>
                  <p className="text-gray-600">Filtered through advanced purification systems</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Gallery Section */}
<section className="relative py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50">
  <div className="max-w-7xl mx-auto text-center mb-10">
    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
      Our Ice in Action
    </h2>
    <p className="mt-3 text-gray-600 text-lg">
      Take a look at how our crystal-clear ice makes every moment cooler.
    </p>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
    {/* Image 1 */}
    <div className="overflow-hidden rounded-2xl shadow-lg group relative">
      <Image
        src="/bottles1.jpg"
        alt="Ice Production"
        width={400}
        height={400}
        className="object-cover w-full h-64 transition-transform duration-500 group-hover:scale-105"
      />
    </div>

    {/* Image 2 */}
    <div className="overflow-hidden rounded-2xl shadow-lg group relative">
      <Image
        src="/bottles2.jpg"
        alt="Ice Delivery"
        width={400}
        height={400}
        className="object-cover w-full h-64 transition-transform duration-500 group-hover:scale-105"
      />
    </div>

    {/* Image 3 */}
    <div className="overflow-hidden rounded-2xl shadow-lg group relative">
      <Image
        src="/hall.jpg"
        alt="Event Cooling"
        width={400}
        height={400}
        className="object-cover w-full h-64 transition-transform duration-500 group-hover:scale-105"
      />
    </div>

    {/* Image 4 */}
    <div className="overflow-hidden rounded-2xl shadow-lg group relative">
      <Image
        src="/cap.jpg"
        alt="Crystal Ice Cubes"
        width={400}
        height={400}
        className="object-cover w-full h-64 transition-transform duration-500 group-hover:scale-105"
      />
    </div>
  </div>
</section>


      {/* Products Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
        {/* Frosted glass effect with iceberg visible */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-md"></div>
        {/* Ice formations background */}
        <div className="absolute inset-0 opacity-25">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-200/40 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-full h-32 bg-gradient-to-t from-blue-200/40 to-transparent"></div>
          <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-gradient-to-br from-white/30 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-cyan-100/40 to-transparent rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-pop-in">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Products</h2>
            <p className="text-xl text-gray-600">Premium ice products for every need</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {[
              {
                title: "Ice Cubes",
                description: "Perfect 2-inch cubes for drinks and cocktails",
                icon: <Cuboid className="h-10 w-10 text-blue-600" />, // Replaced emoji with Cube icon
                features: ["Clear & Pure", "Slow Melting", "Food Safe"]
              },
              {
                title: "Packaged Ice",
                description: "Convenient bags for retail and events",
                icon: <Box className="h-10 w-10 text-blue-600" />, // Replaced emoji with Box icon
                features: ["Easy Storage", "Portable", "Fresh Sealed"]
              }
            ].map((product, index) => (
              <Card
                key={index}
                className="bg-white/80 backdrop-blur-sm border-blue-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]" // Enhanced hover effect
              >
                <CardContent className="p-8 text-center">
                  <div className="flex justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                    {product.icon}
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">{product.title}</h3>
                  <p className="text-gray-600 mb-4">{product.description}</p>
                  <div className="space-x-2 space-y-2 mb-6 flex justify-center flex-wrap">
                    {product.features.map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-800 border border-blue-200">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <OrderNowButton className="w-full bg-blue-600 hover:bg-blue-700 transition-colors">
                    Order Now
                  </OrderNowButton>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
        {/* Frosted ice effect with iceberg visible */}
        <div className="absolute inset-0 bg-white/75 backdrop-blur-md"></div>
        {/* Floating ice crystals */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-20 left-1/4 w-40 h-40 bg-gradient-to-br from-cyan-200/60 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 right-1/4 w-32 h-32 bg-gradient-to-br from-blue-200/50 to-transparent rounded-full blur-xl"></div>
          <div className="absolute top-1/2 left-20 w-24 h-24 bg-gradient-to-br from-white/70 to-transparent rounded-full blur-lg"></div>
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-pop-in">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose IceMans?</h2>
            <p className="text-xl text-gray-600">What sets us apart from the competition</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Droplets className="h-12 w-12 text-blue-600" />,
                title: "100% Pure Water",
                description: "Filtered through advanced purification systems for crystal-clear ice"
              },
              {
                icon: <Truck className="h-12 w-12 text-blue-600" />,
                title: "On-Time Delivery",
                description: "Reliable delivery service that gets your ice when you need it"
              },
              {
                icon: <Package className="h-12 w-12 text-blue-600" />,
                title: "Bulk Orders Accepted",
                description: "From small orders to large events, we handle any quantity"
              },
              {
                icon: <Phone className="h-12 w-12 text-blue-600" />,
                title: "24/7 Support",
                description: "Round-the-clock customer service for all your ice needs"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 bg-white/80 rounded-xl shadow-lg border border-blue-100 transition-all duration-300 hover:shadow-xl hover:bg-blue-50/70"
                style={{ animation: `popIn 0.5s ease-out forwards ${index * 0.1}s`, opacity: 0 }} // Staggered entrance animation
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-blue-100 transition-transform duration-300 hover:scale-110"> {/* Icon wrapper for animation */}
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Information Section (Combined and Cleaned up) */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
        {/* Frosted glass effect with iceberg visible */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-md"></div>
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-16 right-16 w-40 h-40 bg-gradient-to-br from-cyan-200/70 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-16 left-16 w-32 h-32 bg-gradient-to-br from-blue-200/60 to-transparent rounded-full blur-xl"></div>
          <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-gradient-to-br from-white/80 to-transparent rounded-full blur-lg"></div>
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Order? Contact Us!</h2>
            <p className="text-xl text-gray-600">We're here to keep your events chilled and your business running smoothly.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-start bg-white/90 p-8 rounded-xl shadow-2xl border border-blue-100">
            {/* The single column now focuses purely on contact info, making it clean and professional */}
            <div className="animate-pop-in">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4 p-3 hover:bg-blue-50/50 rounded-lg transition-colors">
                  <Phone className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Phone</p>
                    <p className="text-gray-600">407-310-5007</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-3 hover:bg-blue-50/50 rounded-lg transition-colors">
                  <Mail className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Email</p>
                    <p className="text-gray-600">moe@icemansice.com</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-3 hover:bg-blue-50/50 rounded-lg transition-colors">
                  <MapPin className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Location</p>
                    <p className="text-gray-600">501 Florida Central Pkwy Unit 521952, Longwood, FL 32750-5153</p>
                  </div>
                </div>
                {/* <div className="flex items-start space-x-4 p-3 hover:bg-blue-50/50 rounded-lg transition-colors">
                  <Clock className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Hours</p>
                    <p className="text-gray-600">Mon-Fri: 6AM-8PM<br />Sat-Sun: 7AM-6PM</p>
                  </div>
                </div> */}
              </div>
            </div>

            {/* Call to Action Card in the second column */}
            <div className="p-6 bg-gradient-to-br from-blue-600 to-cyan-700 rounded-lg shadow-xl text-white flex flex-col justify-between h-full transform transition-all hover:scale-[1.03] duration-500">
              <div>
                <h4 className="font-bold text-3xl mb-3">Place Your Order Now</h4>
                <p className="text-blue-200 mb-6">
                  Click below to begin your order, or use the contact information for custom and bulk requests.
                </p>
                <OrderNowButton size="lg" className="w-full bg-white text-blue-700 hover:bg-blue-100 font-bold text-lg shadow-xl transition-all hover:ring-4 ring-blue-300">
                  Start Ice Order
                </OrderNowButton>
              </div>
              <div className="mt-8 pt-4 border-t border-blue-400">
                <h4 className="font-semibold text-xl mb-2">Emergency Orders</h4>
                <p className="text-blue-100 text-base mb-2">
                  Need ice urgently? Call our 24/7 emergency line for immediate service.
                </p>
                <p className="text-white font-bold text-2xl tracking-wider">407-310-5007</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-gradient-to-br from-gray-900/95 via-blue-900/95 to-cyan-900/95 text-white py-12 px-4 sm:px-6 lg:px-8 z-10 backdrop-blur-sm">
        {/* Ice crystal patterns in footer */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-400/30 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-full h-32 bg-gradient-to-t from-blue-400/30 to-transparent"></div>
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-cyan-300/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/2 right-1/4 w-48 h-48 bg-gradient-to-br from-blue-300/25 to-transparent rounded-full blur-2xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Snowflake className="h-8 w-8 text-blue-400" />
                <span className="text-2xl font-bold">IceMan's Ice</span>
              </div>
              <p className="text-gray-400 mb-4">
                Your trusted source for premium ice products. Fresh, clean, and delivered to your doorstep.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
                  <span className="text-sm font-bold">f</span>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
                  <span className="text-sm font-bold">t</span>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
                  <span className="text-sm font-bold">i</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">Ice Cubes</Link></li>
                <li><Link href="#" className="hover:text-white">Packaged Ice</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">Delivery</Link></li>
                <li><Link href="#" className="hover:text-white">Bulk Orders</Link></li>
                <li><Link href="#" className="hover:text-white">Emergency Service</Link></li>
                <li><Link href="#" className="hover:text-white">Custom Solutions</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-white">About Us</Link></li>
                <li><Link href="#" className="hover:text-white">Contact</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} IceMans. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}