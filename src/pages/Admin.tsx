import { useState, useEffect, useCallback } from "react";
import { Package, Upload, Download, RefreshCw, Shield, LogOut, CheckCircle, Clock, XCircle, Search, Database, BarChart3, Globe, ShieldCheck, Ban } from "lucide-react";

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
  { code: "IN", flag: "🇮🇳", name: "India" },
  { code: "US", flag: "🇺🇸", name: "USA" },
  { code: "UK", flag: "🇬🇧", name: "UK" },
  { code: "ET", flag: "🇪🇹", name: "Ethiopia" },
  { code: "AR", flag: "🇦🇷", name: "Argentina" },
];

interface Order {
  id: string;
  order_id: string;
  customer_id: string;
  username: string | null;
  country: string;
  account_type: string;
  quantity: number;
  currency: string;
  amount: number;
  status: string;
  delivery_file_path: string | null;
  delivered_at: string | null;
  created_at: string;
}

interface InventoryStats {
  [country: string]: {
    [type: string]: { available: number; total: number };
  };
}

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
  const [activeTab, setActiveTab] = useState<"orders" | "inventory">("orders");
  const [selectedUploadCountry, setSelectedUploadCountry] = useState("IN");
  const [selectedUploadType, setSelectedUploadType] = useState("regular");
  const [approvingOrder, setApprovingOrder] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const fetchOrders = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError("");
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/admin-api?action=orders&status=${statusFilter}`;
      const res = await fetch(url, {
        headers: { "x-admin-key": adminKey, "apikey": apiKey },
      });
      const result = await res.json();
      if (res.status === 401) {
        setIsAuth(false);
        setAdminKey("");
        localStorage.removeItem("admin_key");
        setError("Invalid admin password");
        return;
      }
      if (result.error) throw new Error(result.error);
      setOrders(result.orders || []);
      setIsAuth(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminKey, statusFilter]);

  const fetchInventory = useCallback(async () => {
    if (!adminKey) return;
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/upload-master?action=inventory`;
      const res = await fetch(url, {
        headers: { "x-admin-key": adminKey, "apikey": apiKey },
      });
      const result = await res.json();
      if (!result.error) setInventory(result.stats || null);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    }
  }, [adminKey]);

  useEffect(() => {
    if (adminKey) {
      fetchOrders();
      fetchInventory();
    }
  }, [fetchOrders, fetchInventory]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      setAdminKey(password.trim());
      localStorage.setItem("admin_key", password.trim());
      setPassword("");
    }
  };

  const handleLogout = () => {
    setAdminKey("");
    setIsAuth(false);
    localStorage.removeItem("admin_key");
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey, "apikey": apiKey },
        body: JSON.stringify({ action: "update_status", orderId, status }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const approvePayment = async (orderId: string) => {
    setApprovingOrder(orderId);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey, "apikey": apiKey },
        body: JSON.stringify({ action: "approve_payment", orderId }),
      });
      const result = await res.json();
      if (result.error === "insufficient_stock") {
        setError(`Not enough stock for ${orderId}! Available: ${result.available}, Requested: ${result.requested}`);
      } else if (result.error) {
        throw new Error(result.error);
      } else {
        setSuccessMsg(`✅ Order ${orderId} approved & delivered! (${result.delivered} accounts sent)`);
        fetchOrders();
        fetchInventory();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApprovingOrder(null);
    }
  };

  const handleFileUpload = async (orderId: string, file: File) => {
    setUploadingOrder(orderId);
    try {
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("file", file);
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-api`, {
        method: "POST",
        headers: { "x-admin-key": adminKey, "apikey": apiKey },
        body: formData,
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingOrder(null);
    }
  };

  const handleMasterUpload = async (file: File) => {
    const key = `${selectedUploadCountry}_${selectedUploadType}`;
    setUploadingMaster(key);
    setSuccessMsg("");
    try {
      const formData = new FormData();
      formData.append("accountType", selectedUploadType);
      formData.append("country", selectedUploadCountry);
      formData.append("file", file);
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/upload-master`, {
        method: "POST",
        headers: { "x-admin-key": adminKey, "apikey": apiKey },
        body: formData,
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setSuccessMsg(result.message || `Added ${result.added} accounts`);
      fetchInventory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingMaster(null);
    }
  };

  const getDownloadUrl = async (filePath: string) => {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey, "apikey": apiKey },
        body: JSON.stringify({ action: "get_download_url", filePath }),
      });
      const result = await res.json();
      if (result.url) window.open(result.url, "_blank");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getCountryInfo = (code: string) => COUNTRIES.find(c => c.code === code) || { code, flag: "🌍", name: code };

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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Package className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchOrders(); fetchInventory(); }} disabled={loading} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        {error && <p className="text-destructive text-sm mb-4 bg-destructive/10 px-4 py-2 rounded-lg">{error}</p>}
        {successMsg && (
          <p className="text-[hsl(var(--success))] text-sm mb-4 bg-[hsl(var(--success))]/10 px-4 py-2 rounded-lg">
            {successMsg}
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "orders" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Orders
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "inventory" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Database className="w-4 h-4" /> Inventory
          </button>
        </div>

        {/* INVENTORY TAB */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            {/* Inventory Stats by Country */}
            {inventory && COUNTRIES.map((country) => {
              const stats = inventory[country.code];
              if (!stats) return null;
              return (
                <div key={country.code} className="glass rounded-2xl p-5">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    {country.flag} {country.name}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-primary">{stats.regular?.available || 0}</div>
                      <div className="text-xs text-muted-foreground">Regular Available</div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-muted-foreground">{stats.regular?.total || 0}</div>
                      <div className="text-xs text-muted-foreground">Regular Total</div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-primary">{stats.aged?.available || 0}</div>
                      <div className="text-xs text-muted-foreground">Aged Available</div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-muted-foreground">{stats.aged?.total || 0}</div>
                      <div className="text-xs text-muted-foreground">Aged Total</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Upload Master ZIP */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Upload Accounts ZIP
              </h3>
              <div className="flex flex-wrap gap-3 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Country</label>
                  <select
                    value={selectedUploadCountry}
                    onChange={(e) => setSelectedUploadCountry(e.target.value)}
                    className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Account Type</label>
                  <select
                    value={selectedUploadType}
                    onChange={(e) => setSelectedUploadType(e.target.value)}
                    className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="regular">📦 Regular</option>
                    <option value="aged">👑 Aged</option>
                  </select>
                </div>
              </div>
              <label className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                uploadingMaster
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground"
              }`}>
                <Upload className="w-5 h-5" />
                {uploadingMaster ? "Extracting & uploading..." : `Upload ZIP (.session files)`}
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  disabled={uploadingMaster !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleMasterUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {/* How it works */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-3">🔄 How It Works:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>1. Select country + type, then upload a ZIP with .session files</li>
                <li>2. Files are extracted and stored per country in inventory</li>
                <li>3. Customer selects country → type → quantity → pays</li>
                <li>4. You see the order here — click <strong className="text-foreground">"Approve & Deliver"</strong></li>
                <li>5. System picks the right accounts from inventory, creates a ZIP, and sends to customer on Telegram</li>
              </ul>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <>
            {/* Status filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                  {s !== "all" && ` (${orders.filter(o => o.status === s).length})`}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Orders", value: orders.length, color: "text-foreground" },
                { label: "Pending Payment", value: orders.filter(o => o.status === "pending").length, color: "text-warning" },
                { label: "Awaiting Approval", value: orders.filter(o => o.status === "payment_received").length, color: "text-primary" },
                { label: "Delivered", value: orders.filter(o => o.status === "delivered").length, color: "text-[hsl(var(--success))]" },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Orders table */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Order ID</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Country</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Type</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Qty</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Amount</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
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
                              {STATUS_ICONS[order.status]}
                              {order.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Approve & Auto-deliver */}
                              {order.status === "payment_received" && (
                                <button
                                  onClick={() => approvePayment(order.order_id)}
                                  disabled={approvingOrder === order.order_id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/30 transition-colors text-xs font-medium disabled:opacity-50"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  {approvingOrder === order.order_id ? "Delivering..." : "Approve & Deliver"}
                                </button>
                              )}

                              {/* Manual upload ZIP */}
                              {(order.status === "payment_received" || order.status === "pending") && (
                                <label className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-xs font-medium">
                                  <Upload className="w-3.5 h-3.5" />
                                  {uploadingOrder === order.order_id ? "..." : "Manual ZIP"}
                                  <input
                                    type="file"
                                    accept=".zip,.rar,.7z"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileUpload(order.order_id, file);
                                    }}
                                  />
                                </label>
                              )}

                              {/* Download */}
                              {order.delivery_file_path && (
                                <button
                                  onClick={() => getDownloadUrl(order.delivery_file_path!)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/30 transition-colors text-xs font-medium"
                                >
                                  <Download className="w-3.5 h-3.5" /> Download
                                </button>
                              )}

                              {order.status === "pending" && (
                                <button
                                  onClick={() => updateStatus(order.order_id, "cancelled")}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors text-xs font-medium"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                          No orders found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
