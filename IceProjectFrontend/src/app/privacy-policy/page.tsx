import Link from "next/link"

export const metadata = {
  title: "Privacy Policy | Iceman's Ice Company LLC",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link href="/register" className="text-sm text-blue-600 hover:underline">
          ← Back to Register
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-600 mb-8">Effective Date: Oct 1, 2025</p>

      <p className="mb-4">
        Iceman's Ice Company LLC (“Company,” “we,” “our,” or “us”) values your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use our website and online ordering application (the “Service”).
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
      <p className="mb-2">When you use our Service, we may collect:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>
          <strong>Personal Information:</strong> Name, email address, phone number, billing/shipping address, and payment details.
        </li>
        <li>
          <strong>Order Information:</strong> Details of the ice and water products you order, delivery preferences, and transaction history.
        </li>
        <li>
          <strong>Technical Data:</strong> IP address, browser type, device information, and usage data.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. How We Use Information</h2>
      <p className="mb-2">We use the information we collect to:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Process and deliver your orders.</li>
        <li>Communicate with you regarding your purchases, account, or support inquiries.</li>
        <li>Improve our website, products, and customer experience.</li>
        <li>Comply with legal and regulatory requirements.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Sharing of Information</h2>
      <p className="mb-2">We do not sell or rent your information. We may share your data only with:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Service providers assisting in payment processing, order delivery, and technical operations.</li>
        <li>Legal authorities, if required by law or to protect our rights.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Data Security</h2>
      <p className="mb-4">
        We implement reasonable technical and organizational safeguards to protect your data. However, no system is completely secure, and we cannot guarantee absolute security.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Your Rights</h2>
      <p className="mb-4">
        You may request access, correction, or deletion of your personal information by contacting us at the email address below.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Children’s Privacy</h2>
      <p className="mb-4">
        Our Service is not directed to children under 13. We do not knowingly collect personal data from children.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Changes</h2>
      <p className="mb-4">
        We may update this Privacy Policy periodically. Any changes will be posted on this page with the updated effective date.
      </p>

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
