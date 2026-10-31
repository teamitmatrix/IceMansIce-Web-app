import { Metadata } from "next"
import Link from "next/link"
import { RegisterForm } from "@/components/auth/register-form"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Register",
  description: "Create a new account",
}

export default function RegisterPage() {
  return (
    <>
      {/* <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Register
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <RegisterForm />
        </div>
      </div> */}

      <div className="min-h-screen flex ">
        {/* Left Side: Image */}
        <div className="hidden md:flex w-1/2 bg-blue-50 relative">
          <img
            src="/iceman.jpg"
            alt="Iceman"
            className="object-fit w-full h-full"
          />
          <div className="absolute  inset-0 bg-black/30 flex items-center justify-center">
            <h2 className="text-white text-4xl font-bold text-center px-4 self-start mt-[50vh]">
              Register Your Account <br /> to continue
            </h2>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center w-full md:w-1/2 px-6 lg:px-16 py-12 bg-white">
          <div className="mx-auto w-full max-w-md">
            <h1 className="text-3xl font-extrabold text-gray-900 text-center">
              Register Your Account
            </h1>
            

            <div className="mt-8 bg-white shadow-xl rounded-2xl p-8">
              <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading…</div>}>
                <RegisterForm />
              </Suspense>
            </div>
          </div>
          {/* Footer with Privacy Policy link */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md text-center text-sm text-gray-600">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="text-blue-600 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy-policy" className="text-blue-600 hover:underline">
          Privacy Policy
        </Link>.
      </div>
        </div>
      </div>

      
    
   </>
  )
}
