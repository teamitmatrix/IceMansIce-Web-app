// pages/login.tsx
import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

export default function LoginPage() {
  return (
    <div className="h-screen flex ">
      {/* Left Side: Image */}
      <div className="hidden md:flex w-1/2 bg-blue-50 relative">
        <img
          src="/iceman.jpg"
          alt="Iceman"
          className="object-fit w-full h-full"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <h2 className="text-white text-4xl font-bold text-center px-4">
            Welcome Back! <br /> Sign in to continue
          </h2>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center w-full md:w-1/2 px-6 lg:px-16 py-12 bg-white">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-3xl font-extrabold text-gray-900 text-center">
            Login to Your Account
          </h1>
          <p className="mt-2 text-gray-600 text-center">
            Enter your credentials to access your dashboard
          </p>

          <div className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-center">
            <p className="text-sm text-cyan-900">
              Looking to place an order? No login or registration needed — order
              directly from our{" "}
              <Link href="/" className="font-semibold text-cyan-700 underline hover:text-cyan-800">
                main page
              </Link>
              {" "}or call us.
            </p>
          </div>

          <div className="mt-6 bg-white shadow-xl rounded-2xl p-8">
            <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading…</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
