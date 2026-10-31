"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Eye, EyeClosed } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  // role field removed from the form; server decides user role
});

// use the schema INPUT type for react-hook-form generics to align with resolver
type LoginFormData = z.input<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [serverErrors, setServerErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get("message");
    if (message) {
      setSuccessMessage(message);
      // Clear the URL parameter after showing the message
      const url = new URL(window.location.href);
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setServerErrors({});
      clearErrors();

      // Build payload; role is omitted entirely, server decides based on stored role
      const payload: any = { email: data.email, password: data.password };
      const response = await api.post("/auth/login", payload);

      // Token storage is handled by axios interceptor
      if (response.data?.accessToken) {
        // Store user data in localStorage for layout components
        if (response.data?.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
          localStorage.setItem("accessToken", response.data.accessToken);
        }
        
        // Store refresh token if provided
        if (response.data?.refreshToken) {
          localStorage.setItem("refreshToken", response.data.refreshToken);
        }

        // Redirect based on server-returned user role (source of truth)
        const userRole = (response.data?.user?.role || "").toLowerCase();
        if (userRole) {
          toast.success(`Signed in as ${userRole}`);
        }
        // Route map
        switch (userRole) {
          case "driver":
            router.push("/driver");
            break;
          case "customer":
            router.push("/customer");
            break;
          case "admin":
            router.push("/admin");
            break;
          case "salesrep":
          case "accountant":
          default:
            // Fallback to customer portal by default
            router.push("/customer");
            break;
        }
      } else {
        setServerErrors({ general: "Login failed: No access token received" });
      }
    } catch (error: any) {
      console.error("Login failed:", error);

      if (!error.response || error.response.status === 0) {
        setServerErrors({
          general:
            "Cannot connect to the server. Please check your internet connection and try again.",
        });
        return;
      }

      if (error.response?.status === 401) {
        const code = error.response?.data?.code as string | undefined
        const errorMessage = (error.response?.data?.message || "").toLowerCase()

        // Prioritize explicit codes over fuzzy message matching
        if (code === 'INVALID_PASSWORD') {
          setServerErrors({ password: 'Password is incorrect. Please try again.' })
        } else if (code === 'USER_NOT_FOUND') {
          setServerErrors({ email: 'Email is not registered. Please sign up first.' })
        } else if (errorMessage.includes('user not found') || errorMessage.includes('email is not registered')) {
          setServerErrors({ email: 'Email is not registered. Please sign up first.' })
        } else if (errorMessage.includes('invalid email or password')) {
          // Ambiguous message without a specific code: show a generic credential error
            setServerErrors({ general: 'Invalid credentials. Please check your email and password.' })
        } else {
          setServerErrors({ general: error.response?.data?.message || 'Authentication failed' })
        }
      } else {
        setServerErrors({
          general: "An unexpected error occurred. Please try again later.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 ">
      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {serverErrors.general && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                {serverErrors.general}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <div className="mt-1">
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.email || serverErrors.email
                ? "border-red-300 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            disabled={isLoading}
          />
          {(errors.email || serverErrors.email) && (
            <p className="mt-2 text-sm text-red-600">
              {errors.email?.message || serverErrors.email}
            </p>
          )}
        </div>
      </div>

      {/* Account Type field removed; server-provided role is used */}

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <div className="mt-1 relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
            className={`appearance-none block w-full pr-10 px-3 py-2 border rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.password || serverErrors.password
                ? "border-red-300 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="cursor-pointer absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeClosed/>
            ) : (
              <Eye/>
            )}
          </button>
          {(errors.password || serverErrors.password) && (
            <p className="mt-2 text-sm text-red-600">
              {errors.password?.message || serverErrors.password}
            </p>
          )}
        </div>
        <div className="mt-2 text-right">
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500 font-medium">Forgot password?</Link>
        </div>
      </div>

      {/* Inline signed-in role message removed in favor of toast */}

      <div>
        <button
          type="submit"
          className="cursor-pointer w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </button>
      </div>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Need ice?</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Order from the main page
          </Link>
        </div>
      </div>
    </form>
  );
}
