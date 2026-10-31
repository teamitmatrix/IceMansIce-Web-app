"use client";
import { useState } from "react";
import axios from "@/lib/axios";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setLoading(true);
      const res = await axios.post("/auth/forgot-password", { email });
      setSuccess(
        res.data?.message ||
          "If an account exists for that email, a password reset link has been sent."
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Unable to send reset email. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6 border border-gray-200">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-600 text-sm">
            Enter your account email and we&apos;ll send you a reset link.
          </p>
        </div>
        {success && (
          <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md border border-green-200">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <button
            disabled={loading}
            type="submit"
            className="w-full flex justify-center py-2 px-4 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full text-sm text-gray-600 hover:text-gray-800 mt-2"
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
}
