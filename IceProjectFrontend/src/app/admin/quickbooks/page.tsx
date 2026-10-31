"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Database,
  Users,
  FileText,
  Package,
} from "lucide-react";
import axios from "@/lib/axios";


interface QuickBooksConnection {
  id: string;
  companyName: string;
  companyId: string;
  realmId: string;
  environment: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncStatus: string;
  syncHistory: Array<{
    syncType: string;
    status: string;
    syncedAt: string;
    recordsCount: number;
    errorMessage?: string;
  }>;
  preferences: {
    autoSync: boolean;
    syncInterval: number;
    syncTypes: string[];
  };
  isTokenExpired: boolean;
  needsSync: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function QuickBooksPage() {
  const [connection, setConnection] = useState<QuickBooksConnection | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  type SyncType = "customers" | "invoices";
  const [syncing, setSyncing] = useState<Record<SyncType, boolean>>({
    customers: false,
    invoices: false,
  });
  const [pushingCustomers, setPushingCustomers] = useState(false);
  const [pushingInvoices, setPushingInvoices] = useState(false);
  const [forceImportCustomers, setForceImportCustomers] = useState(false);
  const [forceImportInvoices, setForceImportInvoices] = useState(false);
  const [forcePushCustomers, setForcePushCustomers] = useState(false);
  const [forcePushInvoices, setForcePushInvoices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Date range states
  const [customerStartDate, setCustomerStartDate] = useState("");
  const [customerEndDate, setCustomerEndDate] = useState("");
  const [invoiceStartDate, setInvoiceStartDate] = useState("");
  const [invoiceEndDate, setInvoiceEndDate] = useState("");

  useEffect(() => {
    checkAuthentication();
    fetchConnectionDetails();
  }, []);

  const checkAuthentication = async () => {
    try {
      // Check if user is authenticated by making a simple API call
      const response = await axios.get("/auth/me");
      console.log("Authentication check successful:", response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.log("User not authenticated:", error);
      setIsAuthenticated(false);
    }
  };

  const fetchConnectionDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/qbo/connection/details");
      setConnection(response.data.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setConnection(null);
      } else {
        setError("Failed to fetch connection details");
      }
    } finally {
      setLoading(false);
    }
  };

  const startOAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Starting OAuth flow...");
      console.log("Using axios instance:", axios.defaults.baseURL);
      const response = await axios.get("/qbo/oauth/start");

      console.log("OAuth response:", response.data);
      window.open(response.data.data.authUrl, "_blank");
    } catch (error: any) {
      console.error("OAuth start error:", error);

      if (error.response?.status === 401) {
        setError("Please log in to connect QuickBooks");
      } else if (error.response?.status === 400) {
        setError("Invalid request. Please try again.");
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Failed to start OAuth flow");
      }
    } finally {
      setLoading(false);
    }
  };

  const pollJob = async (id: string, type: SyncType) => {
    try {
      const res = await axios.get(`/qbo/sync/jobs/${id}`);
      const status = res.data?.data;
      if (!status) return;
      
      console.log(`Polling job ${id}:`, status); // Debug log
      
      if (status.status === "completed") {
        const r = status?.result || {};
        console.log(`Job completed with result:`, r); // Debug log
        
        if (type === "customers") {
          const msg = `Imported customers from QuickBooks: fetched ${r.fetched ?? 0}, created ${r.created ?? 0}, updated ${r.updated ?? 0}` +
            (typeof r.errors === "number" ? `, errors ${r.errors}` : "");
          setSuccess(r.message || msg);
        } else if (type === "invoices") {
          const msg = `Imported invoices from QuickBooks: fetched ${r.fetched ?? 0}, created ${r.created ?? 0}, updated ${r.updated ?? 0}` +
            (typeof r.errors === "number" ? `, errors ${r.errors}` : "");
          setSuccess(r.message || msg);
        } else {
          setSuccess(r.message || "Sync completed successfully");
        }
        setSyncing((prev) => ({ ...prev, [type]: false }));
        fetchConnectionDetails();
        return;
      }
      if (status.status === "failed") {
        setError(status?.failedReason || status?.result?.message || "Sync failed");
        setSyncing((prev) => ({ ...prev, [type]: false }));
        return;
      }
      // keep polling
      setTimeout(() => pollJob(id, type), 1500);
    } catch (e: any) {
      console.error(`Error polling job ${id}:`, e); // Debug log
      setError(e.response?.data?.message || e.message || "Failed to get job status");
      setSyncing((prev) => ({ ...prev, [type]: false }));
    }
  };

  const syncData = async (type: SyncType) => {
    try {
      setSyncing((prev) => ({ ...prev, [type]: true }));
      setError(null);
      setSuccess(null);
      
      // Prepare date range and force parameters
      let dateParams = "";
      if (type === "customers") {
        const params = new URLSearchParams();
        if (forceImportCustomers) params.set("force", "true");
        if (customerStartDate) params.set("startDate", customerStartDate);
        if (customerEndDate) params.set("endDate", customerEndDate);
        if (params.toString()) dateParams = "?" + params.toString();
      } else if (type === "invoices") {
        const params = new URLSearchParams();
        if (forceImportInvoices) params.set("force", "true");
        if (invoiceStartDate) params.set("startDate", invoiceStartDate);
        if (invoiceEndDate) params.set("endDate", invoiceEndDate);
        if (params.toString()) dateParams = "?" + params.toString();
      }
      
      // queue background job
      const response = await axios.post(`/qbo/sync/jobs${dateParams}`, { type });
      const data = response.data?.data;
      
      if (data) {
        // Check if it's an immediate result (direct sync)
        if (data.status === "completed" && data.result) {
          const r = data.result;
          if (type === "customers") {
            const msg = `Imported customers from QuickBooks: fetched ${r.fetched ?? 0}, created ${r.created ?? 0}, updated ${r.updated ?? 0}` +
              (typeof r.errors === "number" ? `, errors ${r.errors}` : "");
            setSuccess(r.message || msg);
          } else if (type === "invoices") {
            const msg = `Imported invoices from QuickBooks: fetched ${r.fetched ?? 0}, created ${r.created ?? 0}, updated ${r.updated ?? 0}` +
              (typeof r.errors === "number" ? `, errors ${r.errors}` : "");
            setSuccess(r.message || msg);
          }
          setSyncing((prev) => ({ ...prev, [type]: false }));
          fetchConnectionDetails();
        } else if (data.jobId) {
          // If it's a queued job, poll for status
          
          setTimeout(() => pollJob(data.jobId, type), 1000);
        } else {
          setError("Failed to queue sync job");
          setSyncing((prev) => ({ ...prev, [type]: false }));
        }
      } else {
        setError("Failed to queue sync job");
        setSyncing((prev) => ({ ...prev, [type]: false }));
      }
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to sync ${type}`);
      setSyncing((prev) => ({ ...prev, [type]: false }));
    }
  };

  const pushCustomersToQbo = async () => {
    // TODO: consider moving this to the queue-backed endpoint for consistency
    try {
      setPushingCustomers(true);
      setError(null);
      setSuccess(null);
      
      // Prepare date range parameters
      let dateParams = `direction=to${forcePushCustomers ? "&force=true" : ""}`;
      if (customerStartDate || customerEndDate) {
        if (customerStartDate) dateParams += `&startDate=${customerStartDate}`;
        if (customerEndDate) dateParams += `&endDate=${customerEndDate}`;
      }
      
      const response = await axios.post(`/qbo/sync/customers?${dateParams}`);
      const data = response.data?.data;
      if (data?.success) {
        const msg = `Pushed customers to QuickBooks: ${data.syncedCount ?? 0} synced` +
          (typeof data.errorCount === "number" ? `, ${data.errorCount} errors` : "");
        if (data.errorCount && Array.isArray(data.errorDetails) && data.errorDetails.length > 0) {
          const first = data.errorDetails[0];
          setError(`${msg}. Example error: ${first.name ? `${first.name} (${first.email ?? 'no email'}): ` : ''}${first.message}`);
        } else {
          setSuccess(msg);
        }
        await fetchConnectionDetails();
      } else {
        setError("Failed to push customers to QuickBooks");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to push customers to QuickBooks");
    } finally {
      setPushingCustomers(false);
    }
  };

  const updatePreferences = async (
    newPreferences: Partial<QuickBooksConnection["preferences"]>
  ) => {
    try {
      await axios.put("/qbo/connection/preferences", {
        preferences: {
          ...connection?.preferences,
          ...newPreferences,
        },
      });
      await fetchConnectionDetails();
      setSuccess("Preferences updated successfully");
    } catch (error) {
      setError("Failed to update preferences");
    }
  };

  const pushInvoicesToQbo = async () => {
    try {
      setPushingInvoices(true);
      setError(null);
      setSuccess(null);
      
      // Prepare date range parameters
      let dateParams = `direction=to${forcePushInvoices ? "&force=true" : ""}`;
      if (invoiceStartDate || invoiceEndDate) {
        if (invoiceStartDate) dateParams += `&startDate=${invoiceStartDate}`;
        if (invoiceEndDate) dateParams += `&endDate=${invoiceEndDate}`;
      }
      
      const response = await axios.post(`/qbo/sync/invoices?${dateParams}`);
      const data = response.data?.data;
      if (data?.success) {
        const msg = `Pushed invoices to QuickBooks: ${data.synced ?? data.syncedCount ?? 0} synced` +
          (typeof data.errors === "number" ? `, ${data.errors} errors` : "");
        if (data.errors && Array.isArray(data.errorDetails) && data.errorDetails.length > 0) {
          const first = data.errorDetails[0];
          setError(`${msg}. Example error: ${first.invoiceNumber ? `Invoice ${first.invoiceNumber}: ` : ""}${first.message}`);
        } else {
          setSuccess(msg);
        }
        await fetchConnectionDetails();
      } else {
        setError("Failed to push invoices to QuickBooks");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to push invoices to QuickBooks");
    } finally {
      setPushingInvoices(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "syncing":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <RefreshCw className="w-3 h-3 mr-1" />
            Syncing
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QuickBooks Integration</h1>
          <p className="text-muted-foreground">
            Connect and sync your data with QuickBooks Online
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {!connection ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect to QuickBooks</CardTitle>
            <CardDescription>
              Connect your QuickBooks Online account to sync customers,
              invoices, and products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isAuthenticated ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Please log in to connect QuickBooks
                </p>
                <Button
                  onClick={() => (window.location.href = "/login")}
                  className="w-full"
                >
                  Go to Login
                </Button>
              </div>
            ) : (
              <Button
                onClick={startOAuth}
                disabled={loading}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {loading ? "Starting OAuth..." : "Connect to QuickBooks"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sync">Sync Data</TabsTrigger>
             {/* <TabsTrigger value="settings">Settings</TabsTrigger> */}
            <TabsTrigger value="history">Sync History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Connection Status
                  </CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {connection.isActive ? "Connected" : "Disconnected"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {connection.companyName}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Last Sync
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {connection.lastSyncAt
                      ? formatDate(connection.lastSyncAt)
                      : "Never"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getStatusBadge(connection.syncStatus)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Environment
                  </CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">
                    {connection.environment}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {connection.isTokenExpired
                      ? "Token Expired"
                      : "Token Valid"}
                  </p>
                  {connection.isTokenExpired && (
                    <div className="mt-3">
                      <Button variant="destructive" onClick={startOAuth}>
                        Reconnect QuickBooks
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Connection Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Company Name</Label>
                    <p className="text-sm text-muted-foreground">
                      {connection.companyName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Company ID</Label>
                    <p className="text-sm text-muted-foreground">
                      {connection.companyId}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Realm ID</Label>
                    <p className="text-sm text-muted-foreground">
                      {connection.realmId}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Connected At</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(connection.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Data</CardTitle>
                <CardDescription>
                  Manually sync your data with QuickBooks Online
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="h-5 w-5" />
                        <h3 className="font-medium">Customers</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Sync customer data between systems
                      </p>
                      
                      {/* Date Range Section */}
                      <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Label className="text-sm font-medium">Date Range (Optional)</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="customerStartDate" className="text-xs">Start Date</Label>
                            <Input
                              id="customerStartDate"
                              type="date"
                              value={customerStartDate}
                              onChange={(e) => setCustomerStartDate(e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="customerEndDate" className="text-xs">End Date</Label>
                            <Input
                              id="customerEndDate"
                              type="date"
                              value={customerEndDate}
                              onChange={(e) => setCustomerEndDate(e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Filter by last modified date. Leave empty to sync all records.
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Import Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="forceImportCustomers" className="text-sm">Force import all</Label>
                            <Switch id="forceImportCustomers" checked={forceImportCustomers} onCheckedChange={setForceImportCustomers} />
                          </div>
                          <Button
                            onClick={() => syncData("customers")}
                            disabled={syncing.customers || connection.isTokenExpired}
                            className="w-full"
                          >
                            {syncing.customers ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Import from QuickBooks
                          </Button>
                        </div>
                        
                        {/* Push Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="forcePushCustomers" className="text-sm">Force push all</Label>
                            <Switch id="forcePushCustomers" checked={forcePushCustomers} onCheckedChange={setForcePushCustomers} />
                          </div>
                          <Button
                            variant="secondary"
                            onClick={pushCustomersToQbo}
                            disabled={pushingCustomers || connection.isTokenExpired}
                            className="w-full"
                          >
                            {pushingCustomers ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Push to QuickBooks
                          </Button>
                        </div>
                      </div>
                      {connection.isTokenExpired && (
                        <p className="text-xs text-red-600 mt-2">Token expired. Please reconnect above.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-5 w-5" />
                        <h3 className="font-medium">Invoices</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Sync invoice data between systems
                      </p>
                      
                      {/* Date Range Section */}
                      <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Label className="text-sm font-medium">Date Range (Optional)</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="invoiceStartDate" className="text-xs">Start Date</Label>
                            <Input
                              id="invoiceStartDate"
                              type="date"
                              value={invoiceStartDate}
                              onChange={(e) => setInvoiceStartDate(e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="invoiceEndDate" className="text-xs">End Date</Label>
                            <Input
                              id="invoiceEndDate"
                              type="date"
                              value={invoiceEndDate}
                              onChange={(e) => setInvoiceEndDate(e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Filter by transaction date. Leave empty to sync all records.
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Import Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="forceImportInvoices" className="text-sm">Force import all</Label>
                            <Switch id="forceImportInvoices" checked={forceImportInvoices} onCheckedChange={setForceImportInvoices} />
                          </div>
                          <Button
                            onClick={() => syncData("invoices")}
                            disabled={syncing.invoices || connection.isTokenExpired}
                            className="w-full"
                          >
                            {syncing.invoices ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Import from QuickBooks
                          </Button>
                        </div>
                        
                        {/* Push Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="forcePushInvoices" className="text-sm">Force push all</Label>
                            <Switch id="forcePushInvoices" checked={forcePushInvoices} onCheckedChange={setForcePushInvoices} />
                          </div>
                          <Button
                            variant="secondary"
                            onClick={pushInvoicesToQbo}
                            disabled={pushingInvoices || connection.isTokenExpired}
                            className="w-full"
                          >
                            {pushingInvoices ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Push to QuickBooks
                          </Button>
                        </div>
                      </div>
                      {connection.isTokenExpired && (
                        <p className="text-xs text-red-600 mt-2">Token expired. Please reconnect above.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Product syncing removed as requested */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Preferences</CardTitle>
                <CardDescription>
                  Configure automatic sync settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync data at regular intervals
                    </p>
                  </div>
                  <Switch
                    checked={connection.preferences.autoSync}
                    onCheckedChange={(checked) =>
                      updatePreferences({ autoSync: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Sync Interval (seconds)</Label>
                  <Input
                    type="number"
                    value={connection.preferences.syncInterval}
                    onChange={(e) =>
                      updatePreferences({
                        syncInterval: parseInt(e.target.value),
                      })
                    }
                    min="300"
                    max="86400"
                  />
                  <p className="text-sm text-muted-foreground">
                    Minimum: 5 minutes (300s), Maximum: 24 hours (86400s)
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Sync Types</Label>
                  <div className="space-y-2">
                    {["customers", "invoices"].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={type}
                          checked={connection.preferences.syncTypes.includes(
                            type
                          )}
                          onChange={(e) => {
                            const newTypes = e.target.checked
                              ? [...connection.preferences.syncTypes, type]
                              : connection.preferences.syncTypes.filter(
                                  (t) => t !== type
                                );
                            updatePreferences({ syncTypes: newTypes });
                          }}
                        />
                        <Label htmlFor={type} className="capitalize">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync History</CardTitle>
                <CardDescription>
                  View recent sync operations and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {connection.syncHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No sync history available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {connection.syncHistory.map((sync, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium capitalize">
                              {sync.syncType}
                            </span>
                            {getStatusBadge(sync.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(sync.syncedAt)} • {sync.recordsCount}{" "}
                            records
                          </p>
                          {sync.errorMessage && (
                            <p className="text-sm text-red-600">
                              {sync.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
