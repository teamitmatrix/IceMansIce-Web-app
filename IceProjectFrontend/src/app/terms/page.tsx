import Link from "next/link"

export const metadata = {
  title: "Terms of Service / EULA | Iceman's Ice Company LLC",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link href="/register" className="text-sm text-blue-600 hover:underline">
          ← Back to Register
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-6">End-User License Agreement (EULA) / Terms of Service</h1>
      <p className="text-sm text-gray-600 mb-8">Effective Date: Oct 1, 2025</p>

      <p className="mb-4">
        This Agreement is a legal contract between you (“User,” “Customer”) and Iceman's Ice Company LLC (“Company,” “we,” “our,” or “us”). By accessing or using our website and online ordering application (“Service”), you agree to the following terms:
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Use of Service</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>You may use our Service to browse products, place orders, and make payments.</li>
        <li>You agree to provide accurate and complete information when placing an order.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Orders and Payments</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>All orders are subject to acceptance and availability.</li>
        <li>Prices are displayed in dollars and may be updated at any time.</li>
        <li>Payment must be made through approved methods at checkout.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Delivery</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Delivery times are estimates and may vary.</li>
        <li>The Company is not responsible for delays caused by external factors (e.g., weather, traffic, third-party services).</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Restrictions</h2>
      <p className="mb-2">You agree not to:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Use the Service for unlawful purposes.</li>
        <li>Attempt to disrupt or gain unauthorized access to the system.</li>
        <li>Copy, distribute, or exploit the Service for commercial purposes beyond purchasing products.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Limitation of Liability</h2>
      <p className="mb-4">The Service and products are provided “as is” without warranties of any kind. To the fullest extent permitted by law, the Company shall not be liable for indirect, incidental, or consequential damages.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Termination</h2>
      <p className="mb-4">We may suspend or terminate your access to the Service if you violate this Agreement.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Governing Law</h2>
      <p className="mb-4">The laws of the State of Florida, United States, govern this Agreement.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">8. Contact Us</h2>
      <address className="not-italic mb-2">
        Iceman's Ice Company LLC
        <br />
        Email: <a className="text-blue-600 underline" href="mailto:moe@icemansice.com">moe@icemansice.com</a>
        <br />
        Address: 501 Florida Central Pkwy Unit 521952, Longwood, FL 32750-5153
      </address>
    </div>
  );
}
