"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import api from "@/lib/axios";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  balance: number;
  creditLimit: number;
  paymentTerms: string;
  taxExempt: boolean;
  isActive: boolean;
}

const paymentTermsOptions = [
  { value: "immediate", label: "Pay Immediately", description: "Payment required before delivery" },
  { value: "net15", label: "Net 15", description: "Payment due within 15 days" },
  { value: "net30", label: "Net 30", description: "Payment due within 30 days" },
  { value: "net60", label: "Net 60", description: "Payment due within 60 days" },
];

export default function PaymentTerms() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingCredit, setRequestingCredit] = useState(false);
  const [creditApplication, setCreditApplication] = useState({
    requestedLimit: "",
    requestedTerms: "net30",
    businessName: "",
    yearsInBusiness: "",
    annualRevenue: "",
    bankName: "",
    bankAccount: "",
    tradeReferences: [
      { company: "", contact: "", phone: "" },
      { company: "", contact: "", phone: "" },
      { company: "", contact: "", phone: "" },
    ],
    reason: "",
  });

  useEffect(() => {
    fetchCustomerProfile();
  }, []);

  const fetchCustomerProfile = async () => {
    try {
      const response = await api.get("/auth/me");
      if (response.data.user.role === "Customer") {
        // Get customer profile
        const customerResponse = await api.get(`/customers/profile`);
        setCustomer(customerResponse.data.customer);
      }
    } catch (error) {
      console.error("Failed to fetch customer profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreditApplication = async () => {
    setRequestingCredit(true);
    try {
      await api.post("/customers/credit-application", creditApplication);
      alert("Credit application submitted successfully! We'll review your application and contact you within 2-3 business days.");
    } catch (error: any) {
      console.error("Failed to submit credit application:", error);
      const message = error.response?.data?.message || "Failed to submit application. Please try again.";
      alert(message);
    } finally {
      setRequestingCredit(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPaymentTermsLabel = (terms: string) => {
    const option = paymentTermsOptions.find(opt => opt.value === terms);
    return option ? option.label : terms;
  };

  const getPaymentTermsDescription = (terms: string) => {
    const option = paymentTermsOptions.find(opt => opt.value === terms);
    return option ? option.description : "";
  };

  const updateTradeReference = (index: number, field: string, value: string) => {
    const newReferences = [...creditApplication.tradeReferences];
    newReferences[index] = { ...newReferences[index], [field]: value };
    setCreditApplication({ ...creditApplication, tradeReferences: newReferences });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Profile Not Found</h2>
          <p className="text-gray-600">Please contact support to set up your customer profile.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-2xl font-bold text-gray-900">Payment Terms</h2>
          <p className="text-gray-600 mt-1">Manage your payment preferences and credit terms</p>
        </div>

        {/* Current Payment Terms */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Payment Terms</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
                  <div className="mt-1">
                    <div className="text-lg font-semibold text-gray-900">
                      {getPaymentTermsLabel(customer.paymentTerms)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getPaymentTermsDescription(customer.paymentTerms)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Credit Limit</label>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(customer.creditLimit)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Balance</label>
                  <div className={`mt-1 text-lg font-semibold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(customer.balance)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Available Credit</label>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(Math.max(0, customer.creditLimit - customer.balance))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How Payment Terms Work</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>Pay Immediately:</strong> Payment required before or upon delivery</p>
                  <p><strong>Net 15/30/60:</strong> Payment due within the specified number of days from invoice date</p>
                  <p><strong>Credit Limit:</strong> Maximum amount you can owe at one time</p>
                  <p><strong>Available Credit:</strong> How much more you can purchase on credit</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Application */}
        {customer.paymentTerms === "immediate" && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Apply for Credit Terms</h3>
                <p className="text-gray-600 mt-1">Apply for extended payment terms to pay for orders later</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Processing Time</div>
                <div className="font-medium">2-3 Business Days</div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Credit Request</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requested Credit Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={creditApplication.requestedLimit}
                      onChange={(e) => setCreditApplication({...creditApplication, requestedLimit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requested Payment Terms
                    </label>
                    <select
                      value={creditApplication.requestedTerms}
                      onChange={(e) => setCreditApplication({...creditApplication, requestedTerms: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {paymentTermsOptions.filter(opt => opt.value !== "immediate").map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={creditApplication.businessName}
                      onChange={(e) => setCreditApplication({...creditApplication, businessName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Years in Business
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={creditApplication.yearsInBusiness}
                      onChange={(e) => setCreditApplication({...creditApplication, yearsInBusiness: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Annual Revenue
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={creditApplication.annualRevenue}
                      onChange={(e) => setCreditApplication({...creditApplication, annualRevenue: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="100000"
                    />
                  </div>
                </div>
              </div>

              {/* Banking Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Banking Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={creditApplication.bankName}
                      onChange={(e) => setCreditApplication({...creditApplication, bankName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number (Last 4 digits)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={creditApplication.bankAccount}
                      onChange={(e) => setCreditApplication({...creditApplication, bankAccount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1234"
                    />
                  </div>
                </div>
              </div>

              {/* Trade References */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Trade References</h4>
                <div className="space-y-4">
                  {creditApplication.tradeReferences.map((ref, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={ref.company}
                          onChange={(e) => updateTradeReference(index, 'company', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Person
                        </label>
                        <input
                          type="text"
                          value={ref.contact}
                          onChange={(e) => updateTradeReference(index, 'contact', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={ref.phone}
                          onChange={(e) => updateTradeReference(index, 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason for Credit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Credit Request
                </label>
                <textarea
                  rows={3}
                  value={creditApplication.reason}
                  onChange={(e) => setCreditApplication({...creditApplication, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please explain why you need credit terms and how you plan to use them..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreditApplication}
                  disabled={requestingCredit || !creditApplication.requestedLimit || !creditApplication.businessName}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {requestingCredit ? "Submitting..." : "Submit Credit Application"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Payment Methods</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Online Payments</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">💳</span>
                  </div>
                  <div>
                    <div className="font-medium">Credit/Debit Cards</div>
                    <div className="text-sm text-gray-600">Visa, Mastercard, American Express</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">🏦</span>
                  </div>
                  <div>
                    <div className="font-medium">ACH Bank Transfer</div>
                    <div className="text-sm text-gray-600">Direct from your bank account</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Other Payment Options</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">💵</span>
                  </div>
                  <div>
                    <div className="font-medium">Cash on Delivery</div>
                    <div className="text-sm text-gray-600">Pay when your order is delivered</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm">📄</span>
                  </div>
                  <div>
                    <div className="font-medium">Invoice Terms</div>
                    <div className="text-sm text-gray-600">Pay according to your credit terms</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Need Help?</h5>
            <p className="text-sm text-gray-600">
              Contact our billing department at <a href="mailto:billing@icemansice.com" className="text-blue-600 hover:underline">billing@icemansice.com</a> or 
              call <a href="tel:+1234567890" className="text-blue-600 hover:underline">(123) 456-7890</a> for assistance with payment terms or billing questions.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}