import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package, Upload, Download, RefreshCw, Shield, LogOut, CheckCircle, Clock, XCircle,
  Search, Database, BarChart3, Globe, ShieldCheck, Ban, TrendingUp, IndianRupee,
  CalendarDays, Users, DollarSign, Megaphone, Trash2, Eye, Send, Edit3, Save, Plus, X, Wallet, ToggleLeft, ToggleRight, Copy
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, PieChart, Pie, Cell } from "recharts";

const STATUS_OPTIONS = ["all", "pending", "payment_received", "delivered", "rejected", "cancelled"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  payment_received: "bg-primary/20 text-primary",
  approved: "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]",
  delivered: "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]",
  rejected: "bg-destructive/20 text-destructive",
  cancelled: "bg-destructive/20 text-destructive",
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  payment_received: <Search className="w-3.5 h-3.5" />,
  approved: <ShieldCheck className="w-3.5 h-3.5" />,
  delivered: <CheckCircle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  rejected: <Ban className="w-3.5 h-3.5" />,
};

const COUNTRIES = [
  { code: "IN", flag: "🇮🇳", name: "India" }, { code: "US", flag: "🇺🇸", name: "USA" },
  { code: "UK", flag: "🇬🇧", name: "UK" }, { code: "ET", flag: "🇪🇹", name: "Ethiopia" },
  { code: "AR", flag: "🇦🇷", name: "Argentina" }, { code: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "DE", flag: "🇩🇪", name: "Germany" }, { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria" }, { code: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa" }, { code: "AE", flag: "🇦🇪", name: "UAE" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia" }, { code: "TR", flag: "🇹🇷", name: "Turkey" },
  { code: "CA", flag: "🇨🇦", name: "Canada" }, { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "JP", flag: "🇯🇵", name: "Japan" }, { code: "RU", flag: "🇷🇺", name: "Russia" },
  { code: "TM", flag: "🇹🇲", name: "Turkmenistan" }, { code: "MG", flag: "🇲🇬", name: "Madagascar" },
];

const PIE_COLORS = ["hsl(175, 80%, 50%)", "hsl(270, 60%, 60%)", "hsl(145, 70%, 45%)", "hsl(40, 90%, 55%)", "hsl(0, 72%, 55%)", "hsl(200, 70%, 50%)", "hsl(320, 60%, 50%)", "hsl(60, 80%, 45%)"];

interface Order { id: string; order_id: string; customer_id: string; username: string | null; country: string; account_type: string; quantity: number; currency: string; amount: number; status: string; delivery_file_path: string | null; delivered_at: string | null; created_at: string; }
interface Customer { id: string; telegram_id: string; username: string | null; first_name: string | null; country: string | null; referral_code: string | null; created_at: string; }
interface PricingRow { id: string; country_code: string; country_name: string; flag: string; regular_price: number; aged_price: number; regular_price_usdt: number; aged_price_usdt: number; }
interface InventoryItem { id: string; file_name: string; file_path: string; account_type: string; country: string; status: string; order_id: string | null; created_at: string; }
interface DashboardData { totalRevenue: number; todayRevenue: number; weekRevenue: number; monthRevenue: number; totalOrders: number; todayOrders: number; weekOrders: number; monthOrders: number; deliveredCount: number; pendingCount: number; totalCustomers: number; topCountries: { country: string; revenue: number }[]; stockLevels: Record<string, { regular: number; aged: number }>; }
interface InventoryStats { [country: string]: { [type: string]: { available: number; total: number } } }

interface CryptoWallet { id: string; coin_name: string; coin_symbol: string; network: string; wallet_address: string; is_active: boolean; created_at: string; updated_at: string; }

type TabType = "dashboard" | "orders" | "inventory" | "customers" | "pricing" | "crypto" | "broadcast";

const Admin = () => {
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("admin_key") || "");
  const [isAuth, setIsAuth] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadingOrder, setUploadingOrder] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [inventory, setInventory] = useState<InventoryStats | null>(null);
  const [uploadingMaster, setUploadingMaster] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [selectedUploadCountry, setSelectedUploadCountry] = useState("IN");
  const [selectedUploadType, setSelectedUploadType] = useState("regular");
  const [approvingOrder, setApprovingOrder] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);

  // New states
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerStats, setCustomerStats] = useState<Record<string, { total_orders: number; total_spent: number; delivered: number }>>({});
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [editingPricing, setEditingPricing] = useState<Record<string, { regular: number; aged: number; regular_usdt: number; aged_usdt: number }>>({});
  const [savingPricing, setSavingPricing] = useState(false);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [invFilterCountry, setInvFilterCountry] = useState("all");
  const [invFilterType, setInvFilterType] = useState("all");
  const [invFilterStatus, setInvFilterStatus] = useState("available");
  const [selectedInvIds, setSelectedInvIds] = useState<Set<string>>(new Set());
  const [deletingInv, setDeletingInv] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [viewingCustomerOrders, setViewingCustomerOrders] = useState<string | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [newCountry, setNewCountry] = useState({ code: "", name: "", flag: "🌍", regular: 50, aged: 100, regular_usdt: 0, aged_usdt: 0 });
  const [addingCountry, setAddingCountry] = useState(false);
  const [removingCountry, setRemovingCountry] = useState<string | null>(null);
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWallet, setNewWallet] = useState({ coin_name: "", coin_symbol: "", network: "", wallet_address: "" });
  const [addingWallet, setAddingWallet] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editingWalletAddress, setEditingWalletAddress] = useState("");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  const apiFetch = useCallback(async (endpoint: string, options?: RequestInit) => {
    const res = await fetch(endpoint, {
      ...options,
      headers: { "x-admin-key": adminKey, "apikey": apiKey, ...(options?.headers || {}) },
    });
    if (res.status === 401) {
      setIsAuth(false); setAdminKey(""); localStorage.removeItem("admin_key"); setError("Invalid admin password");
      throw new Error("Unauthorized");
    }
    return res.json();
  }, [adminKey, apiKey, baseUrl]);

  const fetchOrders = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true); setError("");
    try {
      const result = await apiFetch(`${baseUrl}/admin-api?action=orders&status=${statusFilter}`);
      if (result.error) throw new Error(result.error);
      setOrders(result.orders || []); setIsAuth(true);
    } catch (err: any) { if (err.message !== "Unauthorized") setError(err.message); }
    finally { setLoading(false); }
  }, [adminKey, statusFilter, apiFetch, baseUrl]);

  const fetchInventory = useCallback(async () => {
    if (!adminKey) return;
    try {
      const result = await apiFetch(`${baseUrl}/upload-master?action=inventory`);
      if (!result.error) setInventory(result.stats || null);
    } catch {}
  }, [adminKey, apiFetch, baseUrl]);

  const fetchDashboard = useCallback(async () => {
    if (!adminKey) return;
    try {
      const result = await apiFetch(`${baseUrl}/admin-api?action=dashboard`);
      if (!result.error) setDashboard(result);
    } catch {}
  }, [adminKey, apiFetch, baseUrl]);

  const fetchCustomers = useCallback(async () => {
    if (!adminKey) return;
    try {
      const result = await apiFetch(`${baseUrl}/admin-api?action=customers`);
      if (!result.error) { setCustomers(result.customers || []); setCustomerStats(result.customerStats || {}); }
    } catch {}
  }, [adminKey, apiFetch, baseUrl]);

  const fetchPricing = useCallback(async () => {
    if (!adminKey) return;
    try {
      const result = await apiFetch(`${baseUrl}/admin-api?action=pricing`);
      if (!result.error) setPricing(result.pricing || []);
    } catch {}
  }, [adminKey, apiFetch, baseUrl]);

  const fetchInventoryList = useCallback(async () => {
    if (!adminKey) return;
    try {
      const result = await apiFetch(`${baseUrl}/admin-api?action=inventory_list&country=${invFilterCountry}&type=${invFilterType}&inv_status=${invFilterStatus}`);
      if (!result.error) setInventoryList(result.inventory || []);
    } catch {}
  }, [adminKey, apiFetch, baseUrl, invFilterCountry, invFilterType, invFilterStatus]);

  const fetchCryptoWallets = useCallback(async () => {
    if (!adminKey) return;
    try {
      const result = await apiFetch(`${baseUrl}/admin-api?action=crypto_wallets`);
      if (!result.error) setCryptoWallets(result.wallets || []);
    } catch {}
  }, [adminKey, apiFetch, baseUrl]);

  useEffect(() => {
    if (adminKey) { fetchOrders(); fetchInventory(); fetchDashboard(); fetchPricing(); }
  }, [fetchOrders, fetchInventory, fetchDashboard, fetchPricing]);

  useEffect(() => { if (adminKey && activeTab === "customers") fetchCustomers(); }, [activeTab, fetchCustomers, adminKey]);
  useEffect(() => { if (adminKey && activeTab === "pricing") fetchPricing(); }, [activeTab, fetchPricing, adminKey]);
  useEffect(() => { if (adminKey && activeTab === "crypto") fetchCryptoWallets(); }, [activeTab, fetchCryptoWallets, adminKey]);
  useEffect(() => { if (adminKey && activeTab === "inventory") fetchInventoryList(); }, [activeTab, fetchInventoryList, adminKey]);

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (password.trim()) { setAdminKey(password.trim()); localStorage.setItem("admin_key", password.trim()); setPassword(""); } };
  const handleLogout = () => { setAdminKey(""); setIsAuth(false); localStorage.removeItem("admin_key"); };

  const approvePayment = async (orderId: string) => {
    setApprovingOrder(orderId); setError(""); setSuccessMsg("");
    try {
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve_payment", orderId }) });
      if (result.error === "insufficient_stock") setError(`Not enough stock for ${orderId}! Available: ${result.available}, Requested: ${result.requested}`);
      else if (result.error) throw new Error(result.error);
      else { setSuccessMsg(`✅ Order ${orderId} approved & delivered! (${result.delivered} accounts sent)`); fetchOrders(); fetchInventory(); fetchDashboard(); }
    } catch (err: any) { setError(err.message); } finally { setApprovingOrder(null); }
  };

  const rejectPayment = async (orderId: string) => {
    const reason = prompt("Enter rejection reason (optional):"); if (reason === null) return;
    setRejectingOrder(orderId); setError(""); setSuccessMsg("");
    try {
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject_payment", orderId, reason: reason || "" }) });
      if (result.error) throw new Error(result.error);
      setSuccessMsg(`❌ Order ${orderId} rejected. Customer notified.`); fetchOrders();
    } catch (err: any) { setError(err.message); } finally { setRejectingOrder(null); }
  };

  const handleFileUpload = async (orderId: string, file: File) => {
    setUploadingOrder(orderId);
    try {
      const formData = new FormData(); formData.append("orderId", orderId); formData.append("file", file);
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", body: formData });
      if (result.error) throw new Error(result.error); fetchOrders();
    } catch (err: any) { setError(err.message); } finally { setUploadingOrder(null); }
  };

  const handleMasterUpload = async (file: File) => {
    const key = `${selectedUploadCountry}_${selectedUploadType}`; setUploadingMaster(key); setSuccessMsg("");
    try {
      const formData = new FormData(); formData.append("accountType", selectedUploadType); formData.append("country", selectedUploadCountry); formData.append("file", file);
      const result = await apiFetch(`${baseUrl}/upload-master`, { method: "POST", body: formData });
      if (result.error) throw new Error(result.error);
      setSuccessMsg(result.message || `Added ${result.added} accounts`); fetchInventory(); fetchInventoryList(); fetchDashboard();
    } catch (err: any) { setError(err.message); } finally { setUploadingMaster(null); }
  };

  const getDownloadUrl = async (filePath: string) => {
    try {
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_download_url", filePath }) });
      if (result.url) window.open(result.url, "_blank");
    } catch (err: any) { setError(err.message); }
  };

  const savePricing = async () => {
    setSavingPricing(true); setError(""); setSuccessMsg("");
    try {
      const updates = Object.entries(editingPricing).map(([code, p]) => ({ country_code: code, regular_price: p.regular, aged_price: p.aged }));
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_pricing", pricing: updates }) });
      if (result.error) throw new Error(result.error);
      setSuccessMsg("✅ Pricing updated successfully!"); setEditingPricing({}); fetchPricing();
    } catch (err: any) { setError(err.message); } finally { setSavingPricing(false); }
  };

  const deleteSelectedInventory = async () => {
    if (selectedInvIds.size === 0) return;
    if (!confirm(`Delete ${selectedInvIds.size} inventory items? This cannot be undone.`)) return;
    setDeletingInv(true); setError(""); setSuccessMsg("");
    try {
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_inventory", ids: Array.from(selectedInvIds) }) });
      if (result.error) throw new Error(result.error);
      setSuccessMsg(`✅ Deleted ${result.deleted} items`); setSelectedInvIds(new Set()); fetchInventoryList(); fetchInventory(); fetchDashboard();
    } catch (err: any) { setError(err.message); } finally { setDeletingInv(false); }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    if (!confirm("Send this message to ALL customers?")) return;
    setBroadcasting(true); setError(""); setSuccessMsg("");
    try {
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "broadcast", message: broadcastMsg }) });
      if (result.error) throw new Error(result.error);
      setSuccessMsg(`✅ Broadcast sent! ${result.sent} delivered, ${result.failed} failed.`); setBroadcastMsg("");
    } catch (err: any) { setError(err.message); } finally { setBroadcasting(false); }
  };

  const viewCustomerOrders = async (customerId: string) => {
    setViewingCustomerOrders(customerId);
    try {
      const result = await apiFetch(`${baseUrl}/admin-api?action=customer_orders&customer_id=${customerId}`);
      setCustomerOrders(result.orders || []);
    } catch {}
  };

  const getCountryInfo = (code: string) => {
    const fromPricing = pricing.find(p => p.country_code === code);
    if (fromPricing) return { code: fromPricing.country_code, flag: fromPricing.flag, name: fromPricing.country_name };
    return COUNTRIES.find(c => c.code === code) || { code, flag: "🌍", name: code };
  };

  // Derive dynamic country list from pricing (DB) + fallback COUNTRIES
  const dynamicCountries = useMemo(() => {
    if (pricing.length > 0) return pricing.map(p => ({ code: p.country_code, flag: p.flag, name: p.country_name }));
    return COUNTRIES;
  }, [pricing]);

  const addCountry = async () => {
    if (!newCountry.code || !newCountry.name) return;
    setAddingCountry(true); setError(""); setSuccessMsg("");
    try {
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_country", country_code: newCountry.code.toUpperCase(), country_name: newCountry.name, flag: newCountry.flag, regular_price: newCountry.regular, aged_price: newCountry.aged, regular_price_usdt: newCountry.regular_usdt, aged_price_usdt: newCountry.aged_usdt }) });
      if (result.error) throw new Error(result.error);
      setSuccessMsg(`✅ Country ${newCountry.name} added!`); setNewCountry({ code: "", name: "", flag: "🌍", regular: 50, aged: 100, regular_usdt: 0, aged_usdt: 0 }); setShowAddCountry(false); fetchPricing();
    } catch (err: any) { setError(err.message); } finally { setAddingCountry(false); }
  };

  const removeCountry = async (countryCode: string) => {
    const country = pricing.find(p => p.country_code === countryCode);
    if (!confirm(`Remove ${country?.country_name || countryCode}? This cannot be undone.`)) return;
    setRemovingCountry(countryCode); setError(""); setSuccessMsg("");
    try {
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove_country", country_code: countryCode }) });
      if (result.error) throw new Error(result.error);
      setSuccessMsg(`✅ Country ${countryCode} removed!`); fetchPricing();
    } catch (err: any) { setError(err.message); } finally { setRemovingCountry(null); }
  };

  const dailyStats = useMemo(() => {
    const statsMap: Record<string, { orders: number; delivered: number; revenue: number; rejected: number; countries: Record<string, number> }> = {};
    orders.forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString("en-CA");
      if (!statsMap[day]) statsMap[day] = { orders: 0, delivered: 0, revenue: 0, rejected: 0, countries: {} };
      statsMap[day].orders++;
      if (o.status === "delivered") { statsMap[day].delivered++; statsMap[day].revenue += o.amount; }
      if (o.status === "rejected") statsMap[day].rejected++;
      statsMap[day].countries[o.country] = (statsMap[day].countries[o.country] || 0) + 1;
    });
    return Object.entries(statsMap).sort(([a], [b]) => b.localeCompare(a)).map(([date, data]) => ({ date, ...data }));
  }, [orders]);

  const addCryptoWallet = async () => {
    if (!newWallet.coin_name || !newWallet.coin_symbol || !newWallet.wallet_address) return;
    setAddingWallet(true); setError(""); setSuccessMsg("");
    try {
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_crypto_wallet", ...newWallet, coin_symbol: newWallet.coin_symbol.toUpperCase() }) });
      if (result.error) throw new Error(result.error);
      setSuccessMsg(`✅ ${newWallet.coin_symbol.toUpperCase()} wallet added!`); setNewWallet({ coin_name: "", coin_symbol: "", network: "", wallet_address: "" }); setShowAddWallet(false); fetchCryptoWallets();
    } catch (err: any) { setError(err.message); } finally { setAddingWallet(false); }
  };

  const updateCryptoWallet = async (id: string, data: any) => {
    setError(""); setSuccessMsg("");
    try {
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_crypto_wallet", id, ...data }) });
      if (result.error) throw new Error(result.error);
      setSuccessMsg("✅ Wallet updated!"); setEditingWalletId(null); fetchCryptoWallets();
    } catch (err: any) { setError(err.message); }
  };

  const deleteCryptoWallet = async (id: string, symbol: string) => {
    if (!confirm(`Delete ${symbol} wallet? This cannot be undone.`)) return;
    setError(""); setSuccessMsg("");
    try {
      const result = await apiFetch(`${baseUrl}/admin-api`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_crypto_wallet", id }) });
      if (result.error) throw new Error(result.error);
      setSuccessMsg(`✅ ${symbol} wallet removed!`); fetchCryptoWallets();
    } catch (err: any) { setError(err.message); }
  };

  const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "orders", label: "Orders", icon: <Package className="w-4 h-4" /> },
    { key: "inventory", label: "Inventory", icon: <Database className="w-4 h-4" /> },
    { key: "customers", label: "Customers", icon: <Users className="w-4 h-4" /> },
    { key: "pricing", label: "Pricing", icon: <DollarSign className="w-4 h-4" /> },
    { key: "crypto", label: "Crypto", icon: <Wallet className="w-4 h-4" /> },
    { key: "broadcast", label: "Broadcast", icon: <Megaphone className="w-4 h-4" /> },
  ];

  // Login screen
  if (!isAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 w-full max-w-sm neon-border">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          {error && <p className="text-destructive text-sm mb-4 text-center">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-7 h-7 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchOrders(); fetchInventory(); fetchDashboard(); }} disabled={loading} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        {error && <p className="text-destructive text-sm mb-4 bg-destructive/10 px-4 py-2 rounded-lg">{error}</p>}
        {successMsg && <p className="text-[hsl(var(--success))] text-sm mb-4 bg-[hsl(var(--success))]/10 px-4 py-2 rounded-lg">{successMsg}</p>}

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ==================== DASHBOARD TAB ==================== */}
        {activeTab === "dashboard" && dashboard && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Revenue", value: `₹${dashboard.totalRevenue.toLocaleString()}`, icon: <IndianRupee className="w-5 h-5" />, color: "text-primary" },
                { label: "Today's Revenue", value: `₹${dashboard.todayRevenue.toLocaleString()}`, icon: <CalendarDays className="w-5 h-5" />, color: "text-[hsl(var(--success))]" },
                { label: "This Week", value: `₹${dashboard.weekRevenue.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: "text-accent" },
                { label: "This Month", value: `₹${dashboard.monthRevenue.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: "text-warning" },
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-4 text-center">
                  <div className={`${s.color} mx-auto mb-2`}>{s.icon}</div>
                  <div className={`text-lg md:text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Orders", value: dashboard.totalOrders, color: "text-foreground" },
                { label: "Today's Orders", value: dashboard.todayOrders, color: "text-primary" },
                { label: "Pending", value: dashboard.pendingCount, color: "text-warning" },
                { label: "Total Customers", value: dashboard.totalCustomers, color: "text-accent" },
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-4 text-center">
                  <div className={`text-lg md:text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Top Countries + Stock Levels */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Countries by Revenue */}
              {dashboard.topCountries.length > 0 && (
                <div className="glass rounded-2xl p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Top Countries by Revenue</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dashboard.topCountries.map(c => ({ name: getCountryInfo(c.country).flag + " " + getCountryInfo(c.country).name, value: c.revenue }))}
                          cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {dashboard.topCountries.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Stock Levels */}
              <div className="glass rounded-2xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Database className="w-4 h-4 text-primary" /> Stock Levels</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(dashboard.stockLevels).map(([code, levels]) => {
                    const ci = getCountryInfo(code);
                    const total = levels.regular + levels.aged;
                    return (
                      <div key={code} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                        <span className="text-sm">{ci.flag} {ci.name}</span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-primary">📦 {levels.regular}</span>
                          <span className="text-accent">👑 {levels.aged}</span>
                          <span className={`font-bold ${total < 10 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>{total} total</span>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(dashboard.stockLevels).length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No stock available</p>}
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            {dailyStats.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h3 className="font-semibold flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-primary" /> Revenue & Orders Trend</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={[...dailyStats].reverse()} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} tickFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                      <YAxis yAxisId="revenue" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                      <YAxis yAxisId="count" orientation="right" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 15% 18%)", borderRadius: "0.75rem", fontSize: 12, color: "hsl(200 20% 95%)" }}
                        formatter={(value: number, name: string) => { if (name === "revenue") return [`₹${value.toLocaleString()}`, "Revenue"]; return [value, name.charAt(0).toUpperCase() + name.slice(1)]; }} />
                      <Bar yAxisId="revenue" dataKey="revenue" fill="hsl(175 80% 50%)" radius={[4, 4, 0, 0]} opacity={0.8} />
                      <Line yAxisId="count" type="monotone" dataKey="orders" stroke="hsl(270 60% 60%)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="count" type="monotone" dataKey="delivered" stroke="hsl(145 70% 45%)" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ORDERS TAB ==================== */}
        {activeTab === "orders" && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                  {s !== "all" && ` (${orders.filter(o => o.status === s).length})`}
                </button>
              ))}
            </div>

            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    {["Order ID", "Country", "Type", "Qty", "Amount", "Status", "Date", "Actions"].map(h => <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {orders.filter(o => statusFilter === "all" || o.status === statusFilter).map((order) => {
                      const ci = getCountryInfo(order.country);
                      return (
                        <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-primary">{order.order_id}</td>
                          <td className="px-4 py-3">{ci.flag} {ci.name}</td>
                          <td className="px-4 py-3">{order.account_type}</td>
                          <td className="px-4 py-3">{order.quantity}</td>
                          <td className="px-4 py-3 font-medium">₹{order.amount.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || "bg-secondary text-muted-foreground"}`}>
                              {STATUS_ICONS[order.status]} {order.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(order.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {order.status === "payment_received" && (
                                <>
                                  <button onClick={() => approvePayment(order.order_id)} disabled={approvingOrder === order.order_id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/30 text-xs font-medium disabled:opacity-50">
                                    <ShieldCheck className="w-3.5 h-3.5" /> {approvingOrder === order.order_id ? "..." : "Approve"}
                                  </button>
                                  <button onClick={() => rejectPayment(order.order_id)} disabled={rejectingOrder === order.order_id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 text-xs font-medium disabled:opacity-50">
                                    <Ban className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </>
                              )}
                              {(order.status === "payment_received" || order.status === "pending") && (
                                <label className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs font-medium">
                                  <Upload className="w-3.5 h-3.5" /> {uploadingOrder === order.order_id ? "..." : "ZIP"}
                                  <input type="file" accept=".zip" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(order.order_id, f); }} />
                                </label>
                              )}
                              {order.delivery_file_path && (
                                <button onClick={() => getDownloadUrl(order.delivery_file_path!)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] text-xs font-medium">
                                  <Download className="w-3.5 h-3.5" /> DL
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {orders.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No orders found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================== INVENTORY TAB ==================== */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-primary" /> Upload Accounts ZIP</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Country</label>
                  <select value={selectedUploadCountry} onChange={(e) => setSelectedUploadCountry(e.target.value)}
                    className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {dynamicCountries.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Type</label>
                  <select value={selectedUploadType} onChange={(e) => setSelectedUploadType(e.target.value)}
                    className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    <option value="regular">📦 Regular</option>
                    <option value="aged">👑 Aged</option>
                  </select>
                </div>
              </div>
              <label className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${uploadingMaster ? "border-primary/50 bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-muted-foreground"}`}>
                <Upload className="w-5 h-5" />
                {uploadingMaster ? "Extracting & uploading..." : "Upload ZIP (.session files)"}
                <input type="file" accept=".zip" className="hidden" disabled={uploadingMaster !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMasterUpload(f); e.target.value = ""; }} />
              </label>
            </div>

            {/* Stock Overview */}
            {inventory && (
              <div className="glass rounded-2xl p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Database className="w-4 h-4 text-primary" /> Stock Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dynamicCountries.map(c => {
                    const stats = inventory[c.code];
                    if (!stats) return null;
                    const total = (stats.regular?.available || 0) + (stats.aged?.available || 0);
                    if (total === 0) return null;
                    return (
                      <div key={c.code} className="bg-secondary/50 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-sm">{c.flag} {c.name}</span>
                        <div className="flex gap-2 text-xs">
                          <span className="text-primary">📦{stats.regular?.available || 0}</span>
                          <span className="text-accent">👑{stats.aged?.available || 0}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inventory List with Filters */}
            <div className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Database className="w-4 h-4 text-primary" /> Inventory Items</h3>
                <select value={invFilterCountry} onChange={(e) => setInvFilterCountry(e.target.value)} className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground">
                  <option value="all">All Countries</option>
                  {dynamicCountries.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
                <select value={invFilterType} onChange={(e) => setInvFilterType(e.target.value)} className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground">
                  <option value="all">All Types</option>
                  <option value="regular">Regular</option>
                  <option value="aged">Aged</option>
                </select>
                <select value={invFilterStatus} onChange={(e) => setInvFilterStatus(e.target.value)} className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground">
                  <option value="available">Available</option>
                  <option value="allocated">Allocated</option>
                  <option value="all">All</option>
                </select>
                {selectedInvIds.size > 0 && (
                  <button onClick={deleteSelectedInventory} disabled={deletingInv}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 text-xs font-medium ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> {deletingInv ? "Deleting..." : `Delete ${selectedInvIds.size} selected`}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border">
                    <th className="px-2 py-2"><input type="checkbox" onChange={(e) => { if (e.target.checked) setSelectedInvIds(new Set(inventoryList.map(i => i.id))); else setSelectedInvIds(new Set()); }} /></th>
                    {["File", "Country", "Type", "Status", "Order", "Date"].map(h => <th key={h} className="text-left px-2 py-2 text-muted-foreground">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {inventoryList.map(item => (
                      <tr key={item.id} className="border-b border-border/30 hover:bg-secondary/20">
                        <td className="px-2 py-1.5"><input type="checkbox" checked={selectedInvIds.has(item.id)} onChange={(e) => { const s = new Set(selectedInvIds); if (e.target.checked) s.add(item.id); else s.delete(item.id); setSelectedInvIds(s); }} /></td>
                        <td className="px-2 py-1.5 font-mono truncate max-w-[200px]">{item.file_name}</td>
                        <td className="px-2 py-1.5">{getCountryInfo(item.country).flag}</td>
                        <td className="px-2 py-1.5">{item.account_type}</td>
                        <td className="px-2 py-1.5"><span className={`px-1.5 py-0.5 rounded-full text-[10px] ${item.status === "available" ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" : "bg-warning/20 text-warning"}`}>{item.status}</span></td>
                        <td className="px-2 py-1.5 text-muted-foreground">{item.order_id || "-"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {inventoryList.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No items found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== CUSTOMERS TAB ==================== */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            {viewingCustomerOrders ? (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Orders for {viewingCustomerOrders}</h3>
                  <button onClick={() => setViewingCustomerOrders(null)} className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground">← Back</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      {["Order ID", "Country", "Type", "Qty", "Amount", "Status", "Date"].map(h => <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium text-xs">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {customerOrders.map(o => (
                        <tr key={o.id} className="border-b border-border/30">
                          <td className="px-3 py-2 font-mono text-xs text-primary">{o.order_id}</td>
                          <td className="px-3 py-2">{getCountryInfo(o.country).flag}</td>
                          <td className="px-3 py-2 text-xs">{o.account_type}</td>
                          <td className="px-3 py-2">{o.quantity}</td>
                          <td className="px-3 py-2">₹{o.amount}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[o.status] || "bg-secondary"}`}>{o.status}</span></td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> All Customers ({customers.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      {["Username", "Name", "Telegram ID", "Orders", "Delivered", "Total Spent", "Joined", "Actions"].map(h => <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {customers.map(c => {
                        const stats = customerStats[c.telegram_id] || { total_orders: 0, total_spent: 0, delivered: 0 };
                        return (
                          <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                            <td className="px-4 py-3 text-primary">@{c.username || "—"}</td>
                            <td className="px-4 py-3">{c.first_name || "—"}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.telegram_id}</td>
                            <td className="px-4 py-3">{stats.total_orders}</td>
                            <td className="px-4 py-3 text-[hsl(var(--success))]">{stats.delivered}</td>
                            <td className="px-4 py-3 font-medium">₹{stats.total_spent.toLocaleString()}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => viewCustomerOrders(c.telegram_id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs">
                                <Eye className="w-3.5 h-3.5" /> Orders
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {customers.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No customers found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== PRICING TAB ==================== */}
        {activeTab === "pricing" && (
          <div className="space-y-6">
            {/* Add Country */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Manage Countries ({pricing.length})</h3>
                <button onClick={() => setShowAddCountry(!showAddCountry)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-sm font-medium">
                  <Plus className="w-4 h-4" /> Add Country
                </button>
              </div>
              {showAddCountry && (
                <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Code (e.g. PK)</label>
                      <input type="text" maxLength={3} value={newCountry.code} onChange={(e) => setNewCountry(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="PK" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Name</label>
                      <input type="text" value={newCountry.name} onChange={(e) => setNewCountry(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="Pakistan" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Flag Emoji</label>
                      <input type="text" value={newCountry.flag} onChange={(e) => setNewCountry(p => ({ ...p, flag: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="🇵🇰" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Regular ₹</label>
                      <input type="number" value={newCountry.regular} onChange={(e) => setNewCountry(p => ({ ...p, regular: Number(e.target.value) }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Aged ₹</label>
                      <input type="number" value={newCountry.aged} onChange={(e) => setNewCountry(p => ({ ...p, aged: Number(e.target.value) }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addCountry} disabled={addingCountry || !newCountry.code || !newCountry.name}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                      <Plus className="w-4 h-4" /> {addingCountry ? "Adding..." : "Add Country"}
                    </button>
                    <button onClick={() => setShowAddCountry(false)} className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Editor */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Dynamic Pricing Editor</h3>
                {Object.keys(editingPricing).length > 0 && (
                  <button onClick={savePricing} disabled={savingPricing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/30 text-sm font-medium">
                    <Save className="w-4 h-4" /> {savingPricing ? "Saving..." : `Save ${Object.keys(editingPricing).length} changes`}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">Edit prices below. Changes apply immediately to the Telegram bot after saving.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pricing.map(p => {
                  const isEditing = !!editingPricing[p.country_code];
                  const current = editingPricing[p.country_code] || { regular: p.regular_price, aged: p.aged_price, regular_usdt: p.regular_price_usdt, aged_usdt: p.aged_price_usdt };
                  return (
                    <div key={p.country_code} className={`bg-secondary/50 rounded-xl p-4 ${isEditing ? "ring-1 ring-primary/50" : ""}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">{p.flag} {p.country_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{p.country_code}</span>
                          <button onClick={() => removeCountry(p.country_code)} disabled={removingCountry === p.country_code}
                            className="p-1 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" title="Remove country">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">📦 Regular (₹)</label>
                          <input type="number" value={current.regular}
                            onChange={(e) => setEditingPricing(prev => ({ ...prev, [p.country_code]: { ...current, regular: Number(e.target.value) } }))}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">👑 Aged (₹)</label>
                          <input type="number" value={current.aged}
                            onChange={(e) => setEditingPricing(prev => ({ ...prev, [p.country_code]: { ...current, aged: Number(e.target.value) } }))}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">📦 Regular (USDT)</label>
                          <input type="number" step="0.01" value={current.regular_usdt}
                            onChange={(e) => setEditingPricing(prev => ({ ...prev, [p.country_code]: { ...current, regular_usdt: Number(e.target.value) } }))}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">👑 Aged (USDT)</label>
                          <input type="number" step="0.01" value={current.aged_usdt}
                            onChange={(e) => setEditingPricing(prev => ({ ...prev, [p.country_code]: { ...current, aged_usdt: Number(e.target.value) } }))}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== CRYPTO TAB ==================== */}
        {activeTab === "crypto" && (
          <div className="space-y-6">
            {/* Add Wallet */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Crypto Wallets ({cryptoWallets.length})</h3>
                <button onClick={() => setShowAddWallet(!showAddWallet)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-sm font-medium">
                  <Plus className="w-4 h-4" /> Add Wallet
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Manage crypto payment addresses. Active wallets appear as payment options in the customer bot.</p>

              {showAddWallet && (
                <div className="bg-secondary/50 rounded-xl p-4 space-y-3 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Symbol (e.g. BTC)</label>
                      <input type="text" maxLength={10} value={newWallet.coin_symbol} onChange={(e) => setNewWallet(p => ({ ...p, coin_symbol: e.target.value.toUpperCase() }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="USDT" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Coin Name</label>
                      <input type="text" value={newWallet.coin_name} onChange={(e) => setNewWallet(p => ({ ...p, coin_name: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="Tether" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Network</label>
                      <input type="text" value={newWallet.network} onChange={(e) => setNewWallet(p => ({ ...p, network: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="TRC20" />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-xs text-muted-foreground block mb-1">Wallet Address</label>
                      <input type="text" value={newWallet.wallet_address} onChange={(e) => setNewWallet(p => ({ ...p, wallet_address: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="TYourWalletAddress..." />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addCryptoWallet} disabled={addingWallet || !newWallet.coin_symbol || !newWallet.coin_name || !newWallet.wallet_address}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                      <Plus className="w-4 h-4" /> {addingWallet ? "Adding..." : "Add Wallet"}
                    </button>
                    <button onClick={() => setShowAddWallet(false)} className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {/* Wallet List */}
              <div className="space-y-3">
                {cryptoWallets.map(w => (
                  <div key={w.id} className={`bg-secondary/50 rounded-xl p-4 ${w.is_active ? "" : "opacity-60"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">{w.coin_symbol}</span>
                        <span className="text-sm text-muted-foreground">{w.coin_name}</span>
                        {w.network && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">{w.network}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateCryptoWallet(w.id, { is_active: !w.is_active })}
                          className={`p-1.5 rounded-md transition-colors ${w.is_active ? "text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/20" : "text-muted-foreground hover:bg-secondary"}`}
                          title={w.is_active ? "Disable" : "Enable"}>
                          {w.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => { setEditingWalletId(w.id); setEditingWalletAddress(w.wallet_address); }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/20 transition-colors" title="Edit address">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteCryptoWallet(w.id, w.coin_symbol)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/20 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {editingWalletId === w.id ? (
                      <div className="flex gap-2 mt-2">
                        <input type="text" value={editingWalletAddress} onChange={(e) => setEditingWalletAddress(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono" />
                        <button onClick={() => updateCryptoWallet(w.id, { wallet_address: editingWalletAddress })}
                          className="px-3 py-2 rounded-lg bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] text-xs font-medium">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingWalletId(null)} className="px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-xs">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs font-mono text-foreground/80 bg-background/50 px-2 py-1 rounded break-all">{w.wallet_address}</code>
                        <button onClick={() => navigator.clipboard.writeText(w.wallet_address)} className="p-1 text-muted-foreground hover:text-primary" title="Copy">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{w.is_active ? "🟢 Active" : "🔴 Inactive"}</span>
                      <span>•</span>
                      <span>Added {new Date(w.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {cryptoWallets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No crypto wallets configured</p>
                    <p className="text-xs mt-1">Add your first wallet to enable crypto payments</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== BROADCAST TAB ==================== */}
        {activeTab === "broadcast" && (
          <div className="glass rounded-2xl p-6 max-w-2xl">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /> Broadcast Message</h3>
            <p className="text-xs text-muted-foreground mb-4">Send a message to ALL customers via Telegram. Supports Markdown formatting.</p>
            <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} rows={6} placeholder="Type your announcement here...&#10;&#10;Supports *bold*, _italic_, `code`, etc."
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none mb-4" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{customers.length || "?"} customers will receive this</span>
              <button onClick={sendBroadcast} disabled={broadcasting || !broadcastMsg.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all disabled:opacity-50">
                <Send className="w-4 h-4" /> {broadcasting ? "Sending..." : "Send Broadcast"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
