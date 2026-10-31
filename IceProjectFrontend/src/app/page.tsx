// "use client";

import LandingPage1 from "@/components/landingpage/landingpage1";
import LandingPage2 from "@/components/landingpage/landingpage2";
import { use } from "react";

// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { OrderNowButton } from "@/components/ui/order-now-button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Badge } from "@/components/ui/badge";
// import { 
//   Truck, 
//   Clock, 
//   Shield, 
//   Phone, 
//   Mail, 
//   MapPin, 
//   Star,
//   Snowflake,
//   Droplets,
//   Package,
//   Users,
//   CheckCircle
// } from "lucide-react";

// export default function LandingPage() {
//   return (
//     <div className="min-h-screen relative overflow-hidden">
//       {/* Iceberg Background Image */}
//       <div 
//         className="absolute inset-0 bg-cover bg-center bg-no-repeat"
//         style={{
//           backgroundImage: "url('/iceberg-bg.jpg')"
//         }}
//       ></div>
      
//       {/* Dark overlay for better text readability */}
//       <div className="absolute inset-0 bg-black/30"></div>
      
//       {/* Ice crystal pattern overlay for extra texture */}
//       <div className="absolute inset-0 opacity-20">
//         <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-xl"></div>
//         <div className="absolute top-32 right-20 w-24 h-24 bg-gradient-to-br from-cyan-200/30 to-transparent rounded-full blur-lg"></div>
//         <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-2xl"></div>
//         <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-gradient-to-br from-white/30 to-transparent rounded-full blur-lg"></div>
//         <div className="absolute top-1/2 left-10 w-36 h-36 bg-gradient-to-br from-cyan-100/40 to-transparent rounded-full blur-xl"></div>
//         <div className="absolute top-1/3 right-10 w-20 h-20 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-md"></div>
//       </div>
      
//       {/* Animated snowflake particles */}
//       <div className="absolute inset-0 pointer-events-none">
//         {[...Array(15)].map((_, i) => (
//           <div
//             key={i}
//             className="absolute text-white/30 animate-pulse"
//             style={{
//               left: `${Math.random() * 100}%`,
//               top: `${Math.random() * 100}%`,
//               animationDelay: `${Math.random() * 3}s`,
//               animationDuration: `${2 + Math.random() * 3}s`
//             }}
//           >
//             <Snowflake size={12 + Math.random() * 8} />
//           </div>
//         ))}
//       </div>
      
//       {/* Subtle ice texture overlay */}
//       <div 
//         className="absolute inset-0 opacity-10 pointer-events-none"
//         style={{
//           backgroundImage: `
//             radial-gradient(circle at 20% 80%, rgba(255,255,255,0.6) 1px, transparent 1px),
//             radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 1px, transparent 1px),
//             radial-gradient(circle at 40% 40%, rgba(255,255,255,0.3) 1px, transparent 1px)
//           `,
//           backgroundSize: '50px 50px, 80px 80px, 60px 60px'
//         }}
//       ></div>
//       {/* Navigation */}
//       <nav className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center h-16">
//             <div className="flex items-center space-x-2">
//               <Snowflake className="h-8 w-8 text-blue-600" />
//               <span className="text-2xl font-bold text-gray-900">IceMans Ice</span>
//             </div>
//             <div className="flex items-center space-x-4">
//               <Link href="/login">
//                 <Button variant="ghost" className="text-gray-700 hover:text-blue-600">
//                   Login
//                 </Button>
//               </Link>
//               <Link href="/register">
//                 <Button className="bg-blue-600 hover:bg-blue-700 text-white">
//                   Sign Up
//                 </Button>
//               </Link>
//             </div>
//           </div>
//         </div>
//       </nav>

//       {/* Hero Section */}
//       <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden z-10">
//         <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10"></div>
//         {/* Ice crystal formations */}
//         <div className="absolute inset-0 opacity-20">
//           <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-cyan-200/30 to-transparent rounded-full blur-3xl"></div>
//           <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-br from-blue-300/20 to-transparent rounded-full blur-2xl"></div>
//           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"></div>
//         </div>
//         <div className="relative max-w-7xl mx-auto">
//           <div className="text-center">
//             <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 drop-shadow-lg">
//               Fresh Ice Delivered to{" "}
//               <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 drop-shadow-lg">
//                 Your Doorstep
//               </span>
//             </h1>
//             <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto drop-shadow-md">
//               Pure, clean, and crystal-clear ice blocks and cubes for events, restaurants, and home. 
//               Made from filtered water and delivered fresh daily.
//             </p>
//             <div className="flex flex-col sm:flex-row gap-4 justify-center">
//               <OrderNowButton 
//                 size="lg" 
//                 className="bg-blue-600/90 hover:bg-blue-700 text-white px-8 py-3 text-lg backdrop-blur-sm shadow-lg"
//               >
//                 Order Now
//               </OrderNowButton>
//               <Button size="lg" variant="outline" className="border-white/50 text-gray-900 hover:bg-white/10 px-8 py-3 text-lg backdrop-blur-sm">
//                 Learn More
//               </Button>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* About Us Section */}
//       <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
//         {/* Frosted glass effect with iceberg visible */}
//         <div className="absolute inset-0 bg-white/70 backdrop-blur-md"></div>
//         {/* Ice crystal accents */}
//         <div className="absolute inset-0 opacity-20">
//           <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-cyan-200/40 to-transparent rounded-full blur-xl"></div>
//           <div className="absolute bottom-10 left-10 w-24 h-24 bg-gradient-to-br from-blue-200/30 to-transparent rounded-full blur-lg"></div>
//         </div>
//         <div className="relative max-w-7xl mx-auto">
//           <div className="grid lg:grid-cols-2 gap-12 items-center">
//             <div>
//               <h2 className="text-3xl font-bold text-gray-900 mb-6">About IceMans Ice</h2>
//               <p className="text-lg text-gray-600 mb-6">
//                 For over a decade, IceMans has been the trusted supplier of premium ice products 
//                 in the region. We specialize in producing crystal-clear ice from filtered water, 
//                 ensuring every cube and block meets the highest standards of purity and quality.
//               </p>
//               <p className="text-lg text-gray-600 mb-8">
//                 From small family gatherings to large corporate events, we deliver fresh ice 
//                 that keeps your drinks cold and your guests satisfied.
//               </p>
//               <div className="flex items-center space-x-6">
//                 <div className="flex items-center space-x-2">
//                   <CheckCircle className="h-5 w-5 text-green-600" />
//                   <span className="text-gray-700">FDA Approved</span>
//                 </div>
//                 <div className="flex items-center space-x-2">
//                   <CheckCircle className="h-5 w-5 text-green-600" />
//                   <span className="text-gray-700">Quality Guaranteed</span>
//                 </div>
//               </div>
//             </div>
//             <div className="relative">
//               <div className="aspect-w-4 aspect-h-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl p-8 flex items-center justify-center">
//                 <div className="text-center">
//                   {/* <Droplets className="h-24 w-24 text-blue-600 mx-auto mb-4" />
//                    */}
//                    <img src="/glass.png" alt="Ice Block" className="object-fill text-blue-600 mx-auto mb-4 rounded-md" />
//                   <h3 className="text-xl font-semibold text-gray-900">Pure Water Source</h3>
//                   <p className="text-gray-600">Filtered through advanced purification systems</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Products Section */}
//       <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
//         {/* Frosted glass effect with iceberg visible */}
//         <div className="absolute inset-0 bg-white/60 backdrop-blur-md"></div>
//         {/* Ice formations background */}
//         <div className="absolute inset-0 opacity-25">
//           <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-200/40 to-transparent"></div>
//           <div className="absolute bottom-0 right-0 w-full h-32 bg-gradient-to-t from-blue-200/40 to-transparent"></div>
//           <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-gradient-to-br from-white/30 to-transparent rounded-full blur-2xl"></div>
//           <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-cyan-100/40 to-transparent rounded-full blur-3xl"></div>
//         </div>
//         <div className="relative max-w-7xl mx-auto">
//           <div className="text-center mb-12">
//             <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Products</h2>
//             <p className="text-xl text-gray-600">Premium ice products for every need</p>
//           </div>
//           <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
//             {[
//               {
//                 title: "Ice Cubes",
//                 description: "Perfect 2-inch cubes for drinks and cocktails",
//                 icon: "🧊",
//                 features: ["Clear & Pure", "Slow Melting", "Food Safe"]
//               },
//               {
//                 title: "Packaged Ice",
//                 description: "Convenient bags for retail and events",
//                 icon: "📦",
//                 features: ["Easy Storage", "Portable", "Fresh Sealed"]
//               }
//             ].map((product, index) => (
//               <Card key={index} className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-shadow">
//                 <CardContent className="p-6 text-center">
//                   <div className="text-4xl mb-4">{product.icon}</div>
//                   <h3 className="text-xl font-semibold text-gray-900 mb-3">{product.title}</h3>
//                   <p className="text-gray-600 mb-4">{product.description}</p>
//                   <div className="space-y-2 mb-6">
//                     {product.features.map((feature, idx) => (
//                       <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-800">
//                         {feature}
//                       </Badge>
//                     ))}
//                   </div>
//                   <OrderNowButton className="w-full bg-blue-600 hover:bg-blue-700">
//                     Order Now
//                   </OrderNowButton>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Why Choose Us Section */}
//       <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
//         {/* Frosted ice effect with iceberg visible */}
//         <div className="absolute inset-0 bg-white/75 backdrop-blur-md"></div>
//         {/* Floating ice crystals */}
//         <div className="absolute inset-0 opacity-15">
//           <div className="absolute top-20 left-1/4 w-40 h-40 bg-gradient-to-br from-cyan-200/60 to-transparent rounded-full blur-2xl"></div>
//           <div className="absolute bottom-20 right-1/4 w-32 h-32 bg-gradient-to-br from-blue-200/50 to-transparent rounded-full blur-xl"></div>
//           <div className="absolute top-1/2 left-20 w-24 h-24 bg-gradient-to-br from-white/70 to-transparent rounded-full blur-lg"></div>
//         </div>
//         <div className="relative max-w-7xl mx-auto">
//           <div className="text-center mb-12">
//             <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose IceMans?</h2>
//             <p className="text-xl text-gray-600">What sets us apart from the competition</p>
//           </div>
//           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
//             {[
//               {
//                 icon: <Droplets className="h-12 w-12 text-blue-600" />,
//                 title: "100% Pure Water",
//                 description: "Filtered through advanced purification systems for crystal-clear ice"
//               },
//               {
//                 icon: <Truck className="h-12 w-12 text-blue-600" />,
//                 title: "On-Time Delivery",
//                 description: "Reliable delivery service that gets your ice when you need it"
//               },
//               {
//                 icon: <Package className="h-12 w-12 text-blue-600" />,
//                 title: "Bulk Orders Accepted",
//                 description: "From small orders to large events, we handle any quantity"
//               },
//               {
//                 icon: <Phone className="h-12 w-12 text-blue-600" />,
//                 title: "24/7 Support",
//                 description: "Round-the-clock customer service for all your ice needs"
//               }
//             ].map((feature, index) => (
//               <div key={index} className="text-center">
//                 <div className="flex justify-center mb-4">
//                   {feature.icon}
//                 </div>
//                 <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
//                 <p className="text-gray-600">{feature.description}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Testimonials Section */}
//       {/* <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
//         <div className="absolute inset-0 bg-white/65 backdrop-blur-md"></div>
//         <div className="absolute inset-0 opacity-20">
//           <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-white/40 to-transparent"></div>
//           <div className="absolute bottom-0 right-0 w-full h-40 bg-gradient-to-t from-cyan-200/40 to-transparent"></div>
//           <div className="absolute top-1/4 left-10 w-56 h-56 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full blur-3xl"></div>
//           <div className="absolute bottom-1/4 right-10 w-48 h-48 bg-gradient-to-br from-cyan-100/60 to-transparent rounded-full blur-2xl"></div>
//           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-white/30 to-transparent rounded-full blur-3xl"></div>
//         </div>
//         <div className="relative max-w-7xl mx-auto">
//           <div className="text-center mb-12">
//             <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
//             <p className="text-xl text-gray-600">Trusted by restaurants, events, and families</p>
//           </div>
//           <div className="grid md:grid-cols-3 gap-8">
//             {[
//               {
//                 name: "Sarah Johnson",
//                 role: "Restaurant Owner",
//                 content: "IceMans has been our go-to supplier for years. The ice quality is consistently excellent and delivery is always on time.",
//                 rating: 5
//               },
//               {
//                 name: "Mike Chen",
//                 role: "Event Planner",
//                 content: "Perfect for our corporate events. The large ice blocks create stunning displays and keep drinks cold all night.",
//                 rating: 5
//               },
//               {
//                 name: "Emily Rodriguez",
//                 role: "Home Chef",
//                 content: "Love the convenience of home delivery. The ice cubes are crystal clear and perfect for my cocktails.",
//                 rating: 5
//               }
//             ].map((testimonial, index) => (
//               <Card key={index} className="bg-white/80 backdrop-blur-sm border-blue-100">
//                 <CardContent className="p-6">
//                   <div className="flex mb-4">
//                     {[...Array(testimonial.rating)].map((_, i) => (
//                       <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
//                     ))}
//                   </div>
//                   <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
//                   <div>
//                     <p className="font-semibold text-gray-900">{testimonial.name}</p>
//                     <p className="text-sm text-gray-500">{testimonial.role}</p>
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       </section> */}

//       {/* Contact/Order Section */}
//       <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
//         {/* Frosted glass effect with iceberg visible */}
//         <div className="absolute inset-0 bg-white/80 backdrop-blur-md"></div>
//         <div className="absolute inset-0 opacity-15">
//           <div className="absolute top-16 right-16 w-40 h-40 bg-gradient-to-br from-cyan-200/70 to-transparent rounded-full blur-2xl"></div>
//           <div className="absolute bottom-16 left-16 w-32 h-32 bg-gradient-to-br from-blue-200/60 to-transparent rounded-full blur-xl"></div>
//           <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-gradient-to-br from-white/80 to-transparent rounded-full blur-lg"></div>
//         </div>
//         <div className="relative max-w-7xl mx-auto">
//           <div className="grid lg:grid-cols-2 gap-12">
//             {/* <div>
//               <h2 className="text-3xl font-bold text-gray-900 mb-6">Get Your Ice Today</h2>
//               <p className="text-lg text-gray-600 mb-8">
//                 Ready to place an order? Fill out the form below and we'll get back to you within 
//                 the hour with pricing and delivery options.
//               </p>
//               <form className="space-y-6">
//                 <div className="grid md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
//                     <Input placeholder="Your full name" />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
//                       <Input placeholder="407-310-5007" />
//                   </div>
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
//                   <Textarea placeholder="Delivery address" rows={3} />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Quantity & Type</label>
//                   <Textarea placeholder="e.g., 50 lbs of ice cubes for Saturday event" rows={3} />
//                 </div>
//                 <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3">
//                   Request Quote
//                 </Button>
//               </form>
//             </div> */}
//             <div>
//               <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h3>
//               <div className="space-y-6">
//                 <div className="flex items-center space-x-4">
//                   <Phone className="h-6 w-6 text-blue-600" />
//                   <div>
//                     <p className="font-semibold text-gray-900">Phone</p>
//                     <p className="text-gray-600">407-310-5007</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center space-x-4">
//                   <Mail className="h-6 w-6 text-blue-600" />
//                   <div>
//                     <p className="font-semibold text-gray-900">Email</p>
//                     <p className="text-gray-600">moe@icemansice.com</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center space-x-4">
//                   <MapPin className="h-6 w-6 text-blue-600" />
//                   <div>
//                     <p className="font-semibold text-gray-900">Location</p>
//                     <p className="text-gray-600">501 Florida Central Pkwy Unit 521952, Longwood, FL 32750-5153</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center space-x-4">
//                   <Clock className="h-6 w-6 text-blue-600" />
//                   <div>
//                     <p className="font-semibold text-gray-900">Hours</p>
//                     <p className="text-gray-600">Mon-Fri: 6AM-8PM<br />Sat-Sun: 7AM-6PM</p>
//                   </div>
//                 </div>
//               </div>
//               <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
//                 <h4 className="font-semibold text-gray-900 mb-2">Emergency Orders</h4>
//                 <p className="text-gray-600 text-sm">
//                   Need ice urgently? Call our 24/7 emergency line for same-day delivery.
//                 </p>
//                 <p className="text-blue-600 font-semibold mt-2">407-310-5007</p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Footer */}
      // <footer className="relative bg-gradient-to-br from-gray-900/95 via-blue-900/95 to-cyan-900/95 text-white py-12 px-4 sm:px-6 lg:px-8 z-10 backdrop-blur-sm">
      //   {/* Ice crystal patterns in footer */}
      //   <div className="absolute inset-0 opacity-15">
      //     <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-400/30 to-transparent"></div>
      //     <div className="absolute bottom-0 right-0 w-full h-32 bg-gradient-to-t from-blue-400/30 to-transparent"></div>
      //     <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-cyan-300/20 to-transparent rounded-full blur-3xl"></div>
      //     <div className="absolute bottom-1/2 right-1/4 w-48 h-48 bg-gradient-to-br from-blue-300/25 to-transparent rounded-full blur-2xl"></div>
      //   </div>
      //   <div className="relative max-w-7xl mx-auto">
      //     <div className="grid md:grid-cols-4 gap-8">
      //       <div>
      //         <div className="flex items-center space-x-2 mb-4">
      //           <Snowflake className="h-8 w-8 text-blue-400" />
      //           <span className="text-2xl font-bold">IceMans</span>
      //         </div>
      //         <p className="text-gray-400 mb-4">
      //           Your trusted source for premium ice products. Fresh, clean, and delivered to your doorstep.
      //         </p>
      //         <div className="flex space-x-4">
      //           <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
      //             <span className="text-sm font-bold">f</span>
      //           </div>
      //           <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
      //             <span className="text-sm font-bold">t</span>
      //           </div>
      //           <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
      //             <span className="text-sm font-bold">i</span>
      //           </div>
      //         </div>
      //       </div>
      //       <div>
      //         <h4 className="font-semibold mb-4">Products</h4>
      //         <ul className="space-y-2 text-gray-400">
      //           <li><Link href="#" className="hover:text-white">Ice Cubes</Link></li>
      //           <li><Link href="#" className="hover:text-white">Packaged Ice</Link></li>
      //         </ul>
      //       </div>
      //       <div>
      //         <h4 className="font-semibold mb-4">Services</h4>
      //         <ul className="space-y-2 text-gray-400">
      //           <li><Link href="#" className="hover:text-white">Delivery</Link></li>
      //           <li><Link href="#" className="hover:text-white">Bulk Orders</Link></li>
      //           <li><Link href="#" className="hover:text-white">Emergency Service</Link></li>
      //           <li><Link href="#" className="hover:text-white">Custom Solutions</Link></li>
      //         </ul>
      //       </div>
      //       <div>
      //         <h4 className="font-semibold mb-4">Company</h4>
      //         <ul className="space-y-2 text-gray-400">
      //           <li><Link href="/" className="hover:text-white">About Us</Link></li>
      //           <li><Link href="#" className="hover:text-white">Contact</Link></li>
      //           <li><Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
      //           <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
      //         </ul>
      //       </div>
      //     </div>
      //     <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
      //       <p>&copy; {new Date().getFullYear()} IceMans. All rights reserved.</p>
      //     </div>
      //   </div>
      // </footer>
//     </div>
//   );
// }

import React from 'react'

export default function page() {
  return (
    <>
    <LandingPage1/>
    {/* <LandingPage2/> */}
    </>
  )
}
