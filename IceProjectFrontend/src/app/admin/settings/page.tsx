"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, Phone, Mail, MapPin, Building2 } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";


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

interface EmailSettings {
  orderFormsEmail: string;
}

interface SettingsData {
  contactInfo: ContactInfo;
  companyInfo: CompanyInfo;
  emailSettings: EmailSettings;
}

export default function SettingsPage() {
  // Invoice sequence state and handler
  const [invoiceSequence, setInvoiceSequence] = useState("");
  const [resettingSequence, setResettingSequence] = useState(false);

  const handleResetInvoiceSequence = async () => {
    if (!invoiceSequence) return;
    try {
      setResettingSequence(true);
      await api.post("/admin/invoice-sequence/reset", { sequence: Number(invoiceSequence) });
      toast.success("Invoice sequence reset successfully!");
      setInvoiceSequence("");
    } catch (error: any) {
      let message = "Failed to reset invoice sequence";
      if (error?.response?.data?.message) {
        message = error.response.data.message;
      }
      toast.error(message);
    } finally {
      setResettingSequence(false);
    }
  };
  const [settings, setSettings] = useState<SettingsData>({
    contactInfo: {
      phone: "",
      email: "",
      address: "",
      emergencyPhone: "",
      hours: "",
    },
    companyInfo: {
      name: "",
      tagline: "",
      description: "",
    },
    emailSettings: {
      orderFormsEmail: "",
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [settingsNotFound, setSettingsNotFound] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setSettingsNotFound(false);
      // Add cache busting to force fresh data
      const cacheBuster = forceRefresh ? `?_t=${Date.now()}` : '';
      const response = await api.get(`/settings/admin${cacheBuster}`);
      setSettings({
        contactInfo: response.data.contactInfo || settings.contactInfo,
        companyInfo: response.data.companyInfo || settings.companyInfo,
        emailSettings: response.data.emailSettings || settings.emailSettings,
      });
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      if (error.response?.status === 500) {
        setSettingsNotFound(true);
      }
      toast.error(error.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const initializeSettings = async () => {
    try {
      setInitializing(true);
      await api.post("/settings/initialize");
      toast.success("Settings initialized successfully!");
      await fetchSettings();
    } catch (error: any) {
      console.error("Error initializing settings:", error);
      toast.error(error.response?.data?.message || "Failed to initialize settings");
    } finally {
      setInitializing(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate email
    if (!settings.contactInfo.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(settings.contactInfo.email)) {
      errors.email = "Email is invalid";
    }

    // Validate phone
    if (!settings.contactInfo.phone.trim()) {
      errors.phone = "Phone number is required";
    }

    // Validate address
    if (!settings.contactInfo.address.trim()) {
      errors.address = "Address is required";
    }

    // Validate company name
    if (!settings.companyInfo.name.trim()) {
      errors.companyName = "Company name is required";
    }

    // Validate order forms email
    if (!settings.emailSettings.orderFormsEmail.trim()) {
      errors.orderFormsEmail = "Order forms email is required";
    } else if (!/\S+@\S+\.\S+/.test(settings.emailSettings.orderFormsEmail)) {
      errors.orderFormsEmail = "Order forms email is invalid";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    try {
      setSaving(true);
      const response = await api.put("/settings", settings);
      console.log("Save response:", response.data); // Debug log
      
      // Update local state with confirmed server data
      if (response.data.settings) {
        setSettings({
          contactInfo: response.data.settings.contactInfo,
          companyInfo: response.data.settings.companyInfo,
          emailSettings: response.data.settings.emailSettings,
        });
      }
      
      toast.success("Settings updated successfully! Changes will appear on the landing page.");
      
      // Force refetch with cache busting to ensure we have latest data
      setTimeout(() => fetchSettings(true), 500);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateContactInfo = (field: keyof ContactInfo, value: string) => {
    setSettings({
      ...settings,
      contactInfo: { ...settings.contactInfo, [field]: value },
    });
    // Clear error for this field
    if (formErrors[field]) {
      const newErrors = { ...formErrors };
      delete newErrors[field];
      setFormErrors(newErrors);
    }
  };

  const updateCompanyInfo = (field: keyof CompanyInfo, value: string) => {
    setSettings({
      ...settings,
      companyInfo: { ...settings.companyInfo, [field]: value },
    });
    if (formErrors[`company${field.charAt(0).toUpperCase() + field.slice(1)}`]) {
      const newErrors = { ...formErrors };
      delete newErrors[`company${field.charAt(0).toUpperCase() + field.slice(1)}`];
      setFormErrors(newErrors);
    }
  };

  const updateEmailSettings = (field: keyof EmailSettings, value: string) => {
    setSettings({
      ...settings,
      emailSettings: { ...settings.emailSettings, [field]: value },
    });
    // Clear error for this field
    if (formErrors[field]) {
      const newErrors = { ...formErrors };
      delete newErrors[field];
      setFormErrors(newErrors);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Site Settings</h1>
        </div>
        <Card className="p-6">
          <Button
            disabled={initializing}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {initializing ? "Initializing..." : "Initialize Settings"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Site Settings</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Contact Information */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Phone className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                placeholder="407-310-5007"
                value={settings.contactInfo.phone}
                onChange={(e) => updateContactInfo("phone", e.target.value)}
                className={formErrors.phone ? "border-red-500" : ""}
              />
              {formErrors.phone && (
                <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="emergencyPhone">Emergency Phone</Label>
              <Input
                id="emergencyPhone"
                placeholder="407-310-5007"
                value={settings.contactInfo.emergencyPhone}
                onChange={(e) => updateContactInfo("emergencyPhone", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="moe@icemansice.com"
                value={settings.contactInfo.email}
                onChange={(e) => updateContactInfo("email", e.target.value)}
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && (
                <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                placeholder="501 Florida Central Pkwy Unit 521952, Longwood, FL 32750-5153"
                value={settings.contactInfo.address}
                onChange={(e) => updateContactInfo("address", e.target.value)}
                rows={3}
                className={formErrors.address ? "border-red-500" : ""}
              />
              {formErrors.address && (
                <p className="text-red-500 text-sm mt-1">{formErrors.address}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="hours">Business Hours</Label>
              <Input
                id="hours"
                placeholder="Mon-Fri: 6AM-8PM, Sat-Sun: 7AM-6PM"
                value={settings.contactInfo.hours}
                onChange={(e) => updateContactInfo("hours", e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Company Information */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Company Information</h2>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="IceMan's Ice"
                value={settings.companyInfo.name}
                onChange={(e) => updateCompanyInfo("name", e.target.value)}
                className={formErrors.companyName ? "border-red-500" : ""}
              />
              {formErrors.companyName && (
                <p className="text-red-500 text-sm mt-1">{formErrors.companyName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                placeholder="Fresh Ice Delivered to Your Doorstep"
                value={settings.companyInfo.tagline}
                onChange={(e) => updateCompanyInfo("tagline", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">Company Description</Label>
              <Textarea
                id="description"
                placeholder="Pure, clean, and crystal-clear ice blocks and cubes..."
                value={settings.companyInfo.description}
                onChange={(e) => updateCompanyInfo("description", e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </Card>

        {/* Email Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Email Settings</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="orderFormsEmail">Order Forms Email *</Label>
              <Input
                id="orderFormsEmail"
                type="email"
                placeholder="moe@icemansice.com"
                value={settings.emailSettings.orderFormsEmail}
                onChange={(e) => updateEmailSettings("orderFormsEmail", e.target.value)}
                className={formErrors.orderFormsEmail ? "border-red-500" : ""}
              />
              {formErrors.orderFormsEmail && (
                <p className="text-red-500 text-sm mt-1">{formErrors.orderFormsEmail}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Order form submissions from the landing page will be sent to this email address.
              </p>
            </div>
          </div>
        </Card>

        {/* Invoice Sequence Reset Section (moved to bottom) */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Label htmlFor="invoiceSequence">Reset Invoice Sequence</Label>
          </div>
          <div className="flex gap-4 items-center">
            <Input
              id="invoiceSequence"
              type="number"
              min={1}
              placeholder="Enter new starting invoice number"
              value={invoiceSequence}
              onChange={e => setInvoiceSequence(e.target.value)}
              style={{ maxWidth: 180 }}
            />
            <Button
              variant="outline"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleResetInvoiceSequence}
              disabled={resettingSequence || !invoiceSequence}
            >
              {resettingSequence ? "Resetting..." : "Reset Sequence"}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Admin can reset the invoice sequence number. Use with caution.</p>
        </Card>

        {/* Save Button (Bottom) */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
