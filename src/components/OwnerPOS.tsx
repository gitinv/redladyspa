import React, { useState, useEffect } from "react";
import { Product, Technician, Appointment, ClientProfile, Transaction, CreatorMonth } from "../types.js";
import { fetchProducts, fetchTechnicians, fetchAppointments, fetchClients, fetchTransactions, patchAppointment, patchProduct, patchTechnician, createClient, createTransaction, updateCreatorMonth } from "../services/api.js";
import { Calendar, User, Phone, Mail, FileText, CheckCircle, AlertTriangle, Play, Circle, Plus, TrendingUp, DollarSign, Users, Package, ShoppingBag, Search, Settings, Star, Layers, Scissors, Check, X, ShieldAlert, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OwnerPOSProps {
  key?: any;
  onRefreshWebData: () => void;
}

export default function OwnerPOS({ onRefreshWebData }: OwnerPOSProps) {
  // Navigation: "dashboard" | "appointments" | "inventory" | "clients" | "technicians" | "creator"
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "appointments" | "inventory" | "clients" | "technicians" | "creator">("dashboard");

  // Core Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creatorInfo, setCreatorInfo] = useState<CreatorMonth | null>(null);

  // Filter & Search states
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("All");
  
  const [prodSearch, setProdSearch] = useState("");
  const [prodCatFilter, setProdCatFilter] = useState<string>("All");

  const [clientSearch, setClientSearch] = useState("");

  // Modals / Form states
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const [showWalkinSaleModal, setShowWalkinSaleModal] = useState(false);
  const [walkinForm, setWalkinForm] = useState({
    clientName: "Walk-in Customer",
    selectedProductId: "",
    quantity: 1,
    paymentMethod: "Card" as "Cash" | "Card" | "Tap",
    technicianId: ""
  });

  // Edit stock/product states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editedStock, setEditedStock] = useState<number>(0);
  const [editedPrice, setEditedPrice] = useState<number>(0);

  // Edit technician availability schedule states
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [techSlotForm, setTechSlotForm] = useState<string>("");

  // Manage technician time-off states
  const [managingTimeOffTech, setManagingTimeOffTech] = useState<Technician | null>(null);
  const [timeOffDate, setTimeOffDate] = useState<string>("");
  const [timeOffSlot, setTimeOffSlot] = useState<string>("");

  // Edit Creator of month customized package states
  const [editCreatorForm, setEditCreatorForm] = useState({
    packageName: "",
    packageDescription: "",
    packagePrice: 0,
    influencerName: ""
  });

  const loadData = async () => {
    try {
      const [prods, techs, apps, custs, txs, creator] = await Promise.all([
        fetchProducts(),
        fetchTechnicians(),
        fetchAppointments(),
        fetchClients(),
        fetchTransactions(),
        fetch("/api/creator-month").then(r => r.json()).catch(() => null)
      ]);
      setProducts(prods);
      setTechnicians(techs);
      setAppointments(apps);
      setClients(custs);
      setTransactions(txs);
      if (creator) {
        setCreatorInfo(creator);
        setEditCreatorForm({
          packageName: creator.packageName,
          packageDescription: creator.packageDescription,
          packagePrice: creator.packagePrice,
          influencerName: creator.influencerName
        });
      }
    } catch (err) {
      console.error("Error fetching POS data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync back to web if called
  const handleDataModification = () => {
    loadData();
    onRefreshWebData();
  };

  // 1. Appointments Controller
  const handleUpdateAppStatus = async (id: string, nextStatus: "Confirmed" | "Completed" | "Cancelled", paymentMethod?: string) => {
    try {
      await patchAppointment(id, { status: nextStatus, paymentMethod: paymentMethod || "Card" });
      handleDataModification();
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Inventory Controller
  const handleUpdateStockPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await patchProduct(editingProduct.id, {
        stock: editedStock,
        price: editedPrice
      });
      setEditingProduct(null);
      handleDataModification();
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Register Client Controller
  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.name || !newClientForm.phone) return;
    try {
      await createClient(newClientForm);
      setShowNewClientModal(false);
      setNewClientForm({ name: "", phone: "", email: "", notes: "" });
      handleDataModification();
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Walk-in / Retail Transaction submission
  const handleWalkinSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === walkinForm.selectedProductId);
    if (!product) return;

    if (product.stock < walkinForm.quantity) {
      alert("Insufficient inventory stock remaining for this print.");
      return;
    }

    const totalAmount = product.price * walkinForm.quantity;
    const itemsList = Array(walkinForm.quantity).fill(product.name);
    const techObj = technicians.find(t => t.id === walkinForm.technicianId);

    try {
      await createTransaction({
        clientName: walkinForm.clientName,
        amount: totalAmount,
        items: itemsList,
        paymentMethod: walkinForm.paymentMethod,
        technicianName: techObj ? techObj.name : "Over-the-counter"
      });

      // Also patch the product stock decreased in database
      await patchProduct(product.id, {
        stock: product.stock - walkinForm.quantity
      });

      setShowWalkinSaleModal(false);
      setWalkinForm({
        clientName: "Walk-in Customer",
        selectedProductId: "",
        quantity: 1,
        paymentMethod: "Card",
        technicianId: ""
      });
      handleDataModification();
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Tech Schedule controller
  const handleAddTechSlot = async (techId: string) => {
    if (!techSlotForm) return;
    const tech = technicians.find(t => t.id === techId);
    if (!tech) return;

    const updatedAvailability = [...tech.availability, techSlotForm].sort();
    try {
      await patchTechnician(techId, { availability: updatedAvailability });
      setTechSlotForm("");
      // Refresh
      const updatedTechs = technicians.map(t => t.id === techId ? { ...t, availability: updatedAvailability } : t);
      setTechnicians(updatedTechs);
      setEditingTech({ ...tech, availability: updatedAvailability });
      handleDataModification();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTechSlot = async (techId: string, slotToRemove: string) => {
    const tech = technicians.find(t => t.id === techId);
    if (!tech) return;
    const updatedAvailability = tech.availability.filter(slot => slot !== slotToRemove);
    try {
      await patchTechnician(techId, { availability: updatedAvailability });
      const updatedTechs = technicians.map(t => t.id === techId ? { ...t, availability: updatedAvailability } : t);
      setTechnicians(updatedTechs);
      setEditingTech({ ...tech, availability: updatedAvailability });
      handleDataModification();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTimeOff = async (techId: string, timeOffStr: string) => {
    const tech = technicians.find(t => t.id === techId);
    if (!tech) return;
    const currentList = tech.timeOff || [];
    const updatedTimeOff = currentList.filter(item => item !== timeOffStr);
    try {
      await patchTechnician(techId, { timeOff: updatedTimeOff });
      const updatedTechs = technicians.map(t => t.id === techId ? { ...t, timeOff: updatedTimeOff } : t);
      setTechnicians(updatedTechs);
      onRefreshWebData();
      handleDataModification();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTimeOff = async (techId: string, date: string, slotSpec: string) => {
    const tech = technicians.find(t => t.id === techId);
    if (!tech) return;
    if (!date) return;
    
    const itemValue = slotSpec ? `${date} ${slotSpec}` : `${date} All Day`;
    const currentList = tech.timeOff || [];
    if (currentList.includes(itemValue)) return;
    
    const updatedTimeOff = [...currentList, itemValue].sort();
    try {
      await patchTechnician(techId, { timeOff: updatedTimeOff });
      const updatedTechs = technicians.map(t => t.id === techId ? { ...t, timeOff: updatedTimeOff } : t);
      setTechnicians(updatedTechs);
      onRefreshWebData();
      handleDataModification();
    } catch (err) {
      console.error(err);
    }
  };

  // 6. Update Creator Theme Custom Pack Info
  const handleUpdateCreatorPack = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/creator-month", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCreatorForm)
      });
      if (res.ok) {
        const data = await res.json();
        setCreatorInfo(data);
        handleDataModification();
        alert("Influencer customized package has been refreshed successfully on the public website.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics calculation
  const totalSalesVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const completedAppointments = appointments.filter(app => app.status === "Completed");
  const activeAppointments = appointments.filter(app => app.status === "Confirmed" || app.status === "Pending");
  const lowStockItems = products.filter(p => p.stock <= p.lowStockAlert);

  // Grouped sales by category for small mini visualization
  const categorySales = products.reduce((acc, prod) => {
    acc[prod.category] = 0;
    return acc;
  }, {} as Record<string, number>);

  transactions.forEach(tx => {
    tx.items.forEach(itemName => {
      const match = products.find(p => p.name === itemName);
      if (match) {
        categorySales[match.category] = (categorySales[match.category] || 0) + (tx.amount / tx.items.length);
      } else {
        // Assume service Category / Art
        categorySales["Art"] = (categorySales["Art"] || 0) + (tx.amount / tx.items.length);
      }
    });
  });

  return (
    <div className="bg-[#1A1A1A] text-stone-100 rounded-[32px] overflow-hidden border border-[#2e2621] shadow-2xl flex flex-col min-h-[750px]">
      
      {/* Outer POS Top Info / Header Row */}
      <header className="bg-[#131110] px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-b border-[#2e2621] gap-3">
        <div className="text-left space-y-0.5">
          <span className="text-[9px] font-mono uppercase bg-[#D4AF37] text-black font-semibold tracking-wider px-2.5 py-0.5 rounded-full">
            PC / Mac Client POS Terminal
          </span>
          <div className="flex items-center gap-2.5">
            <img
              src="/src/assets/images/judy_jetson_icon_1780276155507.png"
              alt="Judy Jetson Logo"
              className="w-7 h-7 rounded-full object-cover border border-[#D4AF37] shadow-sm"
            />
            <h2 className="font-serif italic text-white text-xl tracking-tight">Master Salon Control Hub</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowWalkinSaleModal(true)}
            className="bg-white hover:bg-stone-200 text-[#1A1A1A] font-bold flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[10px] uppercase tracking-wider transition duration-200 cursor-pointer shadow"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Walk-in Checkout</span>
          </button>
          <button
            onClick={() => setShowNewClientModal(true)}
            className="border border-[#3d322b] hover:border-[#D4AF37] text-stone-300 hover:text-white font-medium flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] uppercase tracking-wider transition duration-200 cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#D4AF37]" />
            <span>Add Client Profile</span>
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 items-stretch">
        
        {/* Left Side Navigation Rails */}
        <nav className="md:col-span-3 bg-[#0d0c0b] border-r border-[#2e2621] p-5 space-y-2">
          <div className="text-[10px] font-mono text-[#8C8279] uppercase px-3 tracking-[0.12em] font-bold mb-4">Salon Resources</div>
          
          <button
            onClick={() => setActiveMenu("dashboard")}
            className={`w-full text-left font-serif text-xs px-4 py-3 rounded-full flex items-center gap-2.5 transition ${
              activeMenu === "dashboard" ? "bg-[#2d2521] text-white border-l-2 border-[#D4AF37]" : "text-stone-400 hover:bg-[#1A1A1A]"
            }`}
          >
            <TrendingUp className="w-4.5 h-4.5 text-[#D4AF37]" />
            <span className="italic">Dashboard Stats</span>
          </button>

          <button
            onClick={() => setActiveMenu("appointments")}
            className={`w-full text-left font-serif text-xs px-4 py-3 rounded-full flex items-center gap-2.5 transition ${
              activeMenu === "appointments" ? "bg-[#2d2521] text-white border-l-2 border-[#D4AF37]" : "text-stone-400 hover:bg-[#1A1A1A]"
            }`}
          >
            <Calendar className="w-4.5 h-4.5 text-[#D4AF37]" />
            <div className="flex-1 flex justify-between items-center">
              <span className="italic">Appointment Desk</span>
              {activeAppointments.length > 0 && (
                <span className="bg-[#D4AF37] text-[10px] text-black px-2 py-0.5 rounded-full font-mono font-bold">
                  {activeAppointments.length}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveMenu("inventory")}
            className={`w-full text-left font-serif text-xs px-4 py-3 rounded-full flex items-center gap-2.5 transition ${
              activeMenu === "inventory" ? "bg-[#2d2521] text-white border-l-2 border-[#D4AF37]" : "text-stone-400 hover:bg-[#1A1A1A]"
            }`}
          >
            <Package className="w-4.5 h-4.5 text-[#D4AF37]" />
            <div className="flex-1 flex justify-between items-center">
              <span className="italic">Boutique Inventory</span>
              {lowStockItems.length > 0 && (
                <span className="bg-amber-600 text-[9px] text-white px-2 py-0.5 rounded font-mono font-bold">
                  {lowStockItems.length} Low
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveMenu("clients")}
            className={`w-full text-left font-serif text-xs px-4 py-3 rounded-full flex items-center gap-2.5 transition ${
              activeMenu === "clients" ? "bg-[#2d2521] text-white border-l-2 border-[#D4AF37]" : "text-stone-400 hover:bg-[#1A1A1A]"
            }`}
          >
            <Users className="w-4.5 h-4.5 text-[#D4AF37]" />
            <span className="italic">Clients Directory</span>
          </button>

          <button
            onClick={() => setActiveMenu("technicians")}
            className={`w-full text-left font-serif text-xs px-4 py-3 rounded-full flex items-center gap-2.5 transition ${
              activeMenu === "technicians" ? "bg-[#2d2521] text-white border-l-2 border-[#D4AF37]" : "text-stone-400 hover:bg-[#1A1A1A]"
            }`}
          >
            <Scissors className="w-4.5 h-4.5 text-[#D4AF37]" />
            <span className="italic">Specialists & Schedules</span>
          </button>

          <button
            onClick={() => setActiveMenu("creator")}
            className={`w-full text-left font-serif text-xs px-4 py-3 rounded-full flex items-center gap-2.5 transition ${
              activeMenu === "creator" ? "bg-[#2d2521] text-white border-l-2 border-[#D4AF37]" : "text-stone-400 hover:bg-[#1A1A1A]"
            }`}
          >
            <Settings className="w-4.5 h-4.5 text-[#D4AF37]" />
            <span className="italic">Creator Config</span>
          </button>

          {/* Quick System Diagnostics */}
          <div className="pt-8 border-t border-[#2e2621] space-y-2 mt-4 text-[10px] text-stone-500 font-mono px-3">
            <span className="block uppercase text-stone-605 font-bold tracking-wider">Device Connection</span>
            <p>Type: PC Terminal Client</p>
            <p>Database Path: /db.json</p>
            <p>Status: Local Sync Active</p>
          </div>
        </nav>

        {/* Core Screen View Panel */}
        <main className="md:col-span-9 bg-[#171514] p-6 overflow-y-auto max-h-[750px]">
          
          {activeMenu === "dashboard" && (
            <div className="space-y-6">
              
              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Revenue */}
                <div className="bg-[#1a1817] border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">Total Sales Revenue</span>
                    <h3 className="text-2xl font-black font-mono text-white">${totalSalesVolume.toFixed(2)}</h3>
                    <p className="text-[10px] text-emerald-500 flex items-center gap-1 leading-none font-bold">
                      <span>Live Website source</span>
                    </p>
                  </div>
                  <span className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                    <DollarSign className="w-6 h-6" />
                  </span>
                </div>

                {/* 2. Appointments */}
                <div className="bg-[#1a1817] border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">Completed Bookings</span>
                    <h3 className="text-2xl font-black font-mono text-white">{completedAppointments.length}</h3>
                    <p className="text-[10px] text-stone-500 leading-none">Visits finalized in-store</p>
                  </div>
                  <span className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                    <Calendar className="w-6 h-6" />
                  </span>
                </div>

                {/* 3. Clients Registered */}
                <div className="bg-[#1a1817] border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">Registered Profiles</span>
                    <h3 className="text-2xl font-black font-mono text-white">{clients.length}</h3>
                    <p className="text-[10px] text-stone-500 leading-none">Customers in database</p>
                  </div>
                  <span className="p-3 bg-[#a855f7]/10 text-[#a855f7] rounded-xl">
                    <Users className="w-6 h-6" />
                  </span>
                </div>

                {/* 4. Alert States */}
                <div className="bg-[#1a1817] border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">Low-stock Warnings</span>
                    <h3 className="text-2xl font-black font-mono text-white">{lowStockItems.length}</h3>
                    <p className="text-[10px] text-amber-500 font-bold leading-none">Requires replenishment</p>
                  </div>
                  <span className={`p-3 rounded-xl ${lowStockItems.length > 0 ? "bg-amber-500/15 text-amber-500 animate-pulse" : "bg-emerald-500/10 text-emerald-500"}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </span>
                </div>

              </div>

              {/* Dashboard Layout Grid: Chart and Recent Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Category Split Mini Chart */}
                <div className="lg:col-span-4 bg-[#1a1817] border border-stone-800 rounded-2xl p-4 space-y-4">
                  <h4 className="text-xs font-bold text-stone-350 tracking-wider text-left uppercase border-b border-stone-850 pb-2">Sales Allocation (by Spa Category)</h4>
                  
                  <div className="space-y-3 pt-2 text-left">
                    {["Polish", "Art", "Care", "Tools"].map((cat) => {
                      const amount = categorySales[cat] || 0;
                      const ratio = totalSalesVolume > 0 ? (amount / totalSalesVolume) * 100 : 0;
                      return (
                        <div key={cat} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-stone-400">{cat}</span>
                            <span className="font-mono text-stone-300">${amount.toFixed(2)} ({ratio.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 w-full bg-stone-900 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.max(ratio, 3)}%` }}
                              className={`h-full rounded-full ${
                                cat === "Polish" ? "bg-rose-500" : cat === "Art" ? "bg-blue-500" : cat === "Care" ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit Checklist Transaction Trail */}
                <div className="lg:col-span-8 bg-[#1a1817] border border-stone-800 rounded-2xl p-4 space-y-4 text-left">
                  <h4 className="text-xs font-bold text-stone-350 tracking-wider uppercase border-b border-[#292524] pb-2">Completed Transactions Ledger</h4>
                  
                  {transactions.length === 0 ? (
                    <p className="text-xs text-stone-500 p-4 text-center">No transactional audits registered yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto scrollbar-thin">
                      {transactions.slice().reverse().map((tx) => (
                        <div key={tx.id} className="p-3 bg-[#131110] rounded-xl border border-stone-850 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white truncate">{tx.clientName}</span>
                              <span className="font-mono text-[9px] text-stone-500">#{tx.id}</span>
                            </div>
                            <p className="text-[10px] text-stone-400 truncate">
                              Purchased: <strong>{tx.items.join(", ")}</strong>
                            </p>
                            <p className="text-[9px] text-stone-500">
                              Date: {tx.date} • Method: {tx.paymentMethod} {tx.technicianName && `• Staff: ${tx.technicianName}`}
                            </p>
                          </div>
                          <span className="text-base font-black text-rose-400 font-mono shrink-0">${tx.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
              
              {/* Security Warning Log */}
              {lowStockItems.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-900/50 rounded-2xl p-4 flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-xs font-bold text-stone-300">Active Inventory Replenishment Threshold Warning</span>
                    <p className="text-[11px] text-stone-400">
                      The spa warehouse metrics detect that {lowStockItems.length} core boutique models fell below active stock alerts.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeMenu === "appointments" && (
            <div className="space-y-6 text-left">
              <div className="border-b border-stone-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-display font-black text-white text-xl tracking-tight">IN-STORE APPOINTMENT DESK</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Control live clients reservations, checkout appointments, or adjust statuses.</p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <span className="absolute left-2.5 top-2 text-stone-550">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search Client..."
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="text-xs p-1.5 pl-8 rounded-lg bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 focus:outline-none w-full"
                    />
                  </div>

                  <select
                    value={appStatusFilter}
                    onChange={(e) => setAppStatusFilter(e.target.value)}
                    className="text-xs p-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              {/* Policy reminder box */}
              <div className="bg-rose-950/25 border border-rose-900/40 text-rose-200 p-3.5 rounded-xl text-[10px] sm:text-[10.5px] leading-relaxed mb-4 text-left">
                <strong className="text-rose-400 font-extrabold block mb-0.5">⚠️ Red Lady Spa 72-Hour Appointment Policy</strong>
                Clients are restricted from client-side cancellation if their booking is scheduled within less than 72 hours. From this POS/Technician screen, you hold absolute authority to process any overrides. Please remind clients that cancellations or no-shows inside this 72-hour window incur a standard <strong className="text-rose-300 font-black">$25 fee</strong> due to loss of revenue and time.
              </div>

              {/* Appointments Grid/List */}
              <div className="space-y-3">
                {appointments
                  .filter((app) => {
                    const matchText = app.clientName.toLowerCase().includes(appSearch.toLowerCase()) || app.serviceName.toLowerCase().includes(appSearch.toLowerCase());
                    const matchStatus = appStatusFilter === "All" || app.status === appStatusFilter;
                    return matchText && matchStatus;
                  })
                  .map((app) => (
                    <div key={app.id} className="bg-[#1a1817] border border-stone-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                      
                      {/* Left Block */}
                      <div className="space-y-1.5 text-left flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-bold text-white">{app.clientName}</h4>
                          <span className={`text-[8.5px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            app.status === "Completed"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25"
                              : app.status === "Cancelled"
                              ? "bg-stone-800 text-stone-500"
                              : app.status === "Confirmed"
                              ? "bg-blue-500/10 text-blue-500 border border-blue-500/25 animate-pulse"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/25"
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        
                        <p className="text-xs text-stone-300 font-medium">
                          💎 Service: <strong>{app.serviceName}</strong>
                        </p>

                        <div className="text-[10px] text-stone-500 grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-stone-850 pt-1.5 mt-2">
                          <div>
                            <span className="block uppercase text-stone-600 font-mono text-[8px] font-bold">Specialist</span>
                            <span className="text-stone-400 font-semibold">{app.technicianName}</span>
                          </div>
                          <div>
                            <span className="block uppercase text-stone-600 font-mono text-[8px] font-bold">Calendar Date</span>
                            <span className="text-stone-400 font-semibold">{app.date}</span>
                          </div>
                          <div>
                            <span className="block uppercase text-stone-600 font-mono text-[8px] font-bold">Reserved Time</span>
                            <span className="text-stone-400 font-semibold">{app.time}</span>
                          </div>
                          <div>
                            <span className="block uppercase text-stone-600 font-mono text-[8px] font-bold">Loyalty Records</span>
                            <span className="text-stone-400 font-semibold">{app.clientPhone}</span>
                          </div>
                        </div>

                        {app.notes && (
                          <p className="text-[10px] text-amber-500 italic mt-1.5 bg-[#141211] p-2 rounded-lg">
                            📝 Request: {app.notes}
                          </p>
                        )}
                      </div>

                      {/* Right Block pricing/action triggers */}
                      <div className="flex sm:flex-col items-end gap-3 justify-between w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-850">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-mono text-stone-500 block uppercase font-bold text-stone-600 leading-none">Gross Price</span>
                          <span className="text-lg font-black font-mono text-white">${app.price.toFixed(2)}</span>
                          <span className={`block text-[9px] font-mono uppercase font-bold leading-none mt-1 ${app.paymentStatus === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {app.paymentStatus === 'Paid' ? '✓ Paid' : '• Unpaid'}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {app.status === "Pending" && (
                            <button
                              onClick={() => handleUpdateAppStatus(app.id, "Confirmed")}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-1 px-3 rounded-lg text-[10px] uppercase cursor-pointer"
                            >
                              Confirm
                            </button>
                          )}
                          
                          {app.status !== "Completed" && app.status !== "Cancelled" && (
                            <>
                              <button
                                onClick={() => {
                                  const method = prompt("Choose Payment: 'Cash', 'Card', or 'Tap'?", "Card") || "Card";
                                  handleUpdateAppStatus(app.id, "Completed", method);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-none text-white font-bold p-1 px-3 rounded-lg text-[10px] uppercase cursor-pointer"
                              >
                                Checkout
                              </button>
                              <button
                                onClick={() => handleUpdateAppStatus(app.id, "Cancelled")}
                                className="bg-stone-800 hover:bg-stone-700 text-stone-400 font-bold p-1 px-2.5 rounded-lg text-[10px] uppercase cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeMenu === "inventory" && (
            <div className="space-y-6 text-left">
              <div className="border-b border-stone-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-display font-black text-white text-xl tracking-tight">MANAGE PRODUCTS & INVENTORY</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Edit store stock indices or boutique pricing directly. Updates website retail source of truth.</p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <span className="absolute left-2.5 top-2 text-stone-550">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                      className="text-xs p-1.5 pl-8 rounded-lg bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 focus:outline-none w-full"
                    />
                  </div>

                  <select
                    value={prodCatFilter}
                    onChange={(e) => setProdCatFilter(e.target.value)}
                    className="text-xs p-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    <option value="Polish">Polish</option>
                    <option value="Care">Care</option>
                    <option value="Art">Art</option>
                    <option value="Tools">Tools</option>
                  </select>
                </div>
              </div>

              {/* Inventory Table List */}
              <div className="bg-[#1a1817] border border-stone-800 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#131110] text-[#78716c] uppercase text-[9px] font-mono font-bold tracking-wider border-b border-stone-850">
                      <th className="p-4">SKU Code</th>
                      <th className="p-4">Boutique Item</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">In-Store Stock</th>
                      <th className="p-4">Retail Price</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850">
                    {products
                      .filter((p) => {
                        const mSearch = p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.description.toLowerCase().includes(prodSearch.toLowerCase());
                        const mCat = prodCatFilter === "All" || p.category === prodCatFilter;
                        return mSearch && mCat;
                      })
                      .map((prod) => (
                        <tr key={prod.id} className="hover:bg-[#1f1c1a]/50 transition">
                          <td className="p-4 font-mono font-bold text-stone-400">{prod.id}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={prod.image} className="w-10 h-10 object-cover rounded-lg" />
                              <div>
                                <span className="font-semibold text-white block">{prod.name}</span>
                                <span className="text-[10px] text-stone-500 block line-clamp-1 max-w-sm">{prod.description}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold uppercase text-[10px] text-rose-450">{prod.category}</td>
                          <td className="p-4 font-mono">
                            <span className={`font-bold px-2 py-1 rounded ${prod.stock <= prod.lowStockAlert ? 'bg-amber-500/10 text-amber-500 font-black relative' : 'text-stone-300'}`}>
                              {prod.stock} items left
                              {prod.stock <= prod.lowStockAlert && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-white">${prod.price.toFixed(2)}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                setEditingProduct(prod);
                                setEditedStock(prod.stock);
                                setEditedPrice(prod.price);
                              }}
                              className="text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider text-[10px] border border-amber-950 px-2.5 py-1 rounded-md hover:bg-amber-500/5 transition cursor-pointer"
                            >
                              Update Status
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Edit Stock Modal Form */}
              <AnimatePresence>
                {editingProduct && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-stone-900 border border-stone-850 rounded-2xl p-6 max-w-md w-full text-xs text-left text-stone-100 shadow-xl space-y-4"
                    >
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display border-b border-stone-800 pb-2">
                        Update {editingProduct.name} Stats
                      </h4>

                      <form onSubmit={handleUpdateStockPrice} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-stone-400 font-bold block uppercase">Core stock level</label>
                          <input
                            type="number"
                            value={editedStock}
                            onChange={(e) => setEditedStock(parseInt(e.target.value) || 0)}
                            className="bg-stone-950 border border-stone-800 text-white rounded-lg p-2 w-full font-mono font-bold"
                          />
                          <p className="text-[9px] text-stone-500">Alert threshold is set to {editingProduct.lowStockAlert} items.</p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-stone-400 font-bold block uppercase">Retail Boutique Price ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editedPrice}
                            onChange={(e) => setEditedPrice(parseFloat(e.target.value) || 0)}
                            className="bg-stone-950 border border-stone-800 text-white rounded-lg p-2 w-full font-mono font-bold"
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(null)}
                            className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold p-2 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold p-2 px-4 rounded-lg cursor-pointer"
                          >
                            Save Updates
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </div>
          )}

          {activeMenu === "clients" && (
            <div className="space-y-6 text-left">
              <div className="border-b border-stone-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-display font-black text-white text-xl tracking-tight">SALON CUSTOMER DIRECTORY</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Review client spend patterns, visits history, and individual allergy/styling requests.</p>
                </div>

                <div className="relative w-full sm:w-auto">
                  <span className="absolute left-2.5 top-2 text-stone-550">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search Client Profiles..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="text-xs p-1.5 pl-8 rounded-lg bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 focus:outline-none w-full sm:w-64"
                  />
                </div>
              </div>

              {/* Clients Directory List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients
                  .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch))
                  .map((customer) => {
                    const historicalAppCount = appointments.filter(a => a.clientPhone === customer.phone).length;
                    return (
                      <div key={customer.id} className="bg-[#1a1817] border border-stone-850 rounded-2xl p-4.5 space-y-3.5 hover:border-stone-800 transition">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5 text-left">
                            <span className="w-9 h-9 font-display font-bold text-sm text-stone-100 bg-[#3b82f6]/25 rounded-xl flex items-center justify-center">
                              {customer.name[0]}
                            </span>
                            <div>
                              <h4 className="font-bold text-white text-sm leading-tight">{customer.name}</h4>
                              <span className="text-[10px] text-stone-500 font-mono">{customer.phone}</span>
                            </div>
                          </div>
                          
                          <span className="text-[9px] font-mono uppercase bg-stone-800 text-stone-400 px-2 py-0.5 rounded font-bold">
                            Loyalty DB
                          </span>
                        </div>

                        <div className="space-y-1 text-xs border-y border-stone-850 py-2">
                          <p className="text-stone-400 flex justify-between">
                            <span>Total Visit Logs:</span>
                            <span className="font-mono text-white font-bold">{customer.visitsCount} visits</span>
                          </p>
                          <p className="text-stone-400 flex justify-between">
                            <span>Historical Spent:</span>
                            <span className="font-mono text-rose-450 font-black">${customer.totalSpend.toFixed(2)}</span>
                          </p>
                          <p className="text-stone-400 flex justify-between truncate">
                            <span>Loyalty Email:</span>
                            <span className="text-stone-300 font-mono text-[11px]">{customer.email || "No email"}</span>
                          </p>
                        </div>

                        {customer.notes ? (
                          <div className="text-[10px] text-stone-405 leading-relaxed bg-[#131110] p-2 rounded-lg italic">
                            🙋 <strong>Aesthetic pref:</strong> {customer.notes}
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-605 block italic">No client notes registered yet.</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {activeMenu === "technicians" && (
            <div className="space-y-6 text-left">
              <div className="border-b border-stone-800 pb-4">
                <h3 className="font-display font-black text-white text-xl tracking-tight">SPECIALISTS & SCHEDULE CALENDARS</h3>
                <p className="text-xs text-stone-500 mt-0.5">Maintain technicians shift hours. Blocking or unblocking hourly time slots directly feeds the public client wizard.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {technicians.map((tech) => (
                  <div key={tech.id} className="bg-[#1a1817] border border-stone-800 rounded-3xl p-5 space-y-4 text-left">
                    <div className="flex items-center gap-3.5">
                      <img src={tech.avatar} className="w-14 h-14 rounded-full object-cover border border-stone-800" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white">{tech.name}</h4>
                          <span className="flex items-center gap-0.5 text-[11px] font-bold font-mono text-amber-500 bg-amber-500/5 px-1.5 py-0.5 rounded">
                            ⭐ {tech.rating}
                          </span>
                        </div>
                        <p className="text-xs text-rose-450 font-mono font-bold uppercase">{tech.role}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono uppercase text-stone-500 block font-bold tracking-wider">Expert specialties</span>
                      <div className="flex flex-wrap gap-1.5">
                        {tech.specialties.map((sp) => (
                          <span key={sp} className="text-[10px] bg-[#1d1918] border border-stone-850 text-stone-300 px-2 py-0.5 rounded">
                            {sp}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-stone-850 pt-3">
                      <div className="flex justify-between items-center text-[10px] font-mono text-stone-500 block font-bold uppercase">
                        <span>Available Booking Slots ({tech.availability.length})</span>
                        <button
                          onClick={() => {
                            setEditingTech(tech);
                            setTechSlotForm("");
                          }}
                          className="text-rose-500 hover:text-rose-400 font-bold"
                        >
                          + Edit Shift Slots
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tech.availability.map((slot) => (
                          <span key={slot} className="bg-stone-900 text-stone-300 font-mono font-semibold text-[10px] px-2.5 py-1 rounded border border-stone-800">
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Time Off Section */}
                    <div className="space-y-2 border-t border-stone-850 pt-3">
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#D4AF37] block font-bold uppercase">
                        <span>Time Off & Out Of Office ({tech.timeOff?.length || 0})</span>
                        <button
                          onClick={() => {
                            setManagingTimeOffTech(tech);
                            setTimeOffDate("");
                            setTimeOffSlot("");
                          }}
                          className="text-[#D4AF37] hover:text-[#e4be4a] font-bold"
                        >
                          + Schedule Time Off
                        </button>
                      </div>

                      {tech.timeOff && tech.timeOff.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tech.timeOff.map((toStr) => {
                            const parts = toStr.split(" ");
                            const displayDate = parts[0];
                            const displayDesc = parts.slice(1).join(" ") || "All Day";
                            return (
                              <span key={toStr} className="bg-amber-950/25 text-[#D4AF37] border border-amber-900/30 font-mono font-semibold text-[10px] px-2.5 py-1 rounded flex items-center gap-1.5">
                                <span>{displayDate} ({displayDesc})</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTimeOff(tech.id, toStr)}
                                  className="text-stone-500 hover:text-rose-400 font-bold ml-1"
                                  title="Remove time off"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-stone-600 italic">No scheduled time off. Full availability active.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Tech Availability dialog modal */}
              <AnimatePresence>
                {editingTech && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-stone-900 border border-stone-850 text-xs text-left p-6 rounded-2xl max-w-md w-full text-stone-100 space-y-4"
                    >
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display border-b border-stone-800 pb-2">
                        Customize Shift Calendar for {editingTech.name}
                      </h4>

                      <div className="space-y-3">
                        <label className="text-[10px] font-mono uppercase text-stone-400 block font-bold">Remove Scheduled slots</label>
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 bg-stone-950 border border-stone-800 rounded-lg">
                          {editingTech.availability.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                handleRemoveTechSlot(editingTech.id, slot);
                              }}
                              className="bg-stone-900 hover:bg-rose-950/40 hover:text-rose-400 text-stone-300 font-mono px-2 py-1.5 rounded flex items-center gap-1.5 border border-stone-800 transition cursor-pointer font-bold"
                            >
                              <span>{slot}</span>
                              <X className="w-3 h-3 text-stone-500 hover:text-rose-450" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-stone-400 block font-bold">Register new hour Slot</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={techSlotForm}
                              onChange={(e) => setTechSlotForm(e.target.value)}
                              placeholder="e.g. 06:00 PM"
                              className="bg-stone-950 border border-stone-800 text-white p-2 text-xs rounded-lg flex-1 font-mono uppercase font-bold"
                            />
                            <button
                              onClick={() => handleAddTechSlot(editingTech.id)}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold p-2 px-4 rounded-lg cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-stone-800">
                          <button
                            type="button"
                            onClick={() => setEditingTech(null)}
                            className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold p-2 px-5 rounded-lg cursor-pointer"
                          >
                            Finish & Deploy Slots
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Manage Time Off Modal */}
              <AnimatePresence>
                {managingTimeOffTech && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-stone-900 border border-stone-850 text-xs text-left p-6 rounded-2xl max-w-md w-full text-stone-100 space-y-4"
                    >
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display border-b border-stone-800 pb-2">
                        Schedule Time Off for {managingTimeOffTech.name}
                      </h4>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-stone-405 text-stone-400 block font-bold">Select Date</label>
                          <input
                            type="date"
                            min="2026-06-01"
                            max="2026-06-30"
                            value={timeOffDate}
                            onChange={(e) => setTimeOffDate(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-stone-850 bg-stone-950 text-white font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-stone-405 text-stone-400 block font-bold">Time Frame</label>
                          <select
                            value={timeOffSlot}
                            onChange={(e) => setTimeOffSlot(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-stone-850 bg-stone-950 text-white font-mono"
                          >
                            <option value="">All Day (Out of Office)</option>
                            {managingTimeOffTech.availability.map(slot => (
                              <option key={slot} value={slot}>Specific hour: {slot}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-stone-800 font-sans">
                          <button
                            type="button"
                            onClick={() => setManagingTimeOffTech(null)}
                            className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold py-2 px-4 rounded-lg cursor-pointer text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!timeOffDate}
                            onClick={() => {
                              handleAddTimeOff(managingTimeOffTech.id, timeOffDate, timeOffSlot);
                              setManagingTimeOffTech(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg cursor-pointer text-xs"
                          >
                            Schedule Block
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </div>
          )}

          {activeMenu === "creator" && creatorInfo && (
            <div className="space-y-6 text-left">
              <div className="border-b border-stone-800 pb-4">
                <h3 className="font-display font-black text-white text-xl tracking-tight">💅 EDIT CREATOR OF THE MONTH SECTION</h3>
                <p className="text-xs text-stone-500 mt-0.5">Customize the featured beauty influencer's customized package. This updates the front page client booking app synchronously!</p>
              </div>

              <div className="bg-[#1a1817] border border-stone-800 rounded-3xl p-6 max-w-xl text-xs space-y-4">
                <form onSubmit={handleUpdateCreatorPack} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Influencer Handle Name</label>
                      <input
                        type="text"
                        value={editCreatorForm.influencerName}
                        onChange={(e) => setEditCreatorForm({ ...editCreatorForm, influencerName: e.target.value })}
                        className="bg-stone-950 border border-stone-800 rounded-lg p-2.5 w-full text-white font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Package Name</label>
                      <input
                        type="text"
                        value={editCreatorForm.packageName}
                        onChange={(e) => setEditCreatorForm({ ...editCreatorForm, packageName: e.target.value })}
                        className="bg-stone-950 border border-stone-800 rounded-lg p-2.5 w-full text-white font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Customized Package Price ($)</label>
                    <input
                      type="number"
                      value={editCreatorForm.packagePrice}
                      onChange={(e) => setEditCreatorForm({ ...editCreatorForm, packagePrice: parseFloat(e.target.value) || 0 })}
                      className="bg-stone-950 border border-stone-800 rounded-lg p-2.5 w-full text-white font-mono font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Package Custom Description</label>
                    <textarea
                      value={editCreatorForm.packageDescription}
                      onChange={(e) => setEditCreatorForm({ ...editCreatorForm, packageDescription: e.target.value })}
                      rows={3}
                      className="bg-stone-950 border border-stone-800 rounded-lg p-2.5 w-full text-white leading-relaxed"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-500 text-stone-100 font-semibold px-4.5 py-2.5 rounded-xl uppercase tracking-wider transition cursor-pointer w-full text-center"
                  >
                    Deploy New Customized Creator Package
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- MODALS AND WALK-IN FORMS --- */}

      {/* New Client Modal */}
      <AnimatePresence>
        {showNewClientModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-6 max-w-md w-full text-stone-100 text-xs text-left shadow-2xl space-y-4"
            >
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display border-b border-stone-850 pb-2">
                Register Customer Profile
              </h4>

              <form onSubmit={handleRegisterClient} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Client Name</label>
                  <input
                    type="text"
                    required
                    value={newClientForm.name}
                    onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                    className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-white w-full"
                    placeholder="e.g. Eleanor Vance"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-white w-full font-mono"
                    placeholder="e.g. 555-0144"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Email Address</label>
                  <input
                    type="email"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-white w-full font-mono"
                    placeholder="e.g. eleanor@example.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Cuticle, tips shape, or Allergy Notes</label>
                  <textarea
                    value={newClientForm.notes}
                    onChange={(e) => setNewClientForm({ ...newClientForm, notes: e.target.value })}
                    rows={2}
                    className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-white w-full"
                    placeholder="Round tips only, prefers Japanese pastels, allergic to lavender butter oil."
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setShowNewClientModal(false)}
                    className="bg-stone-800 hover:bg-stone-750 text-stone-300 font-bold p-2 px-3.5 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold p-2 px-4.5 rounded-lg cursor-pointer"
                  >
                    Register Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Walk-in Retail Sale Checkout Modal */}
      <AnimatePresence>
        {showWalkinSaleModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-900 border border-stone-800 text-xs text-left p-6 rounded-2xl max-w-md w-full text-stone-100 shadow-2xl space-y-4"
            >
              <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display border-b border-stone-850 pb-2">
                OVER-THE-COUNTER WALK-IN SALE
              </h3>

              <form onSubmit={handleWalkinSale} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Client / Walk-in Name</label>
                  <input
                    type="text"
                    required
                    value={walkinForm.clientName}
                    onChange={(e) => setWalkinForm({ ...walkinForm, clientName: e.target.value })}
                    className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-white w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Select Boutique Product</label>
                  <select
                    required
                    value={walkinForm.selectedProductId}
                    onChange={(e) => setWalkinForm({ ...walkinForm, selectedProductId: e.target.value })}
                    className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 w-full"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (${prod.price.toFixed(2)}) - [{prod.stock} in stock]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Quantity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={walkinForm.quantity}
                      onChange={(e) => setWalkinForm({ ...walkinForm, quantity: parseInt(e.target.value) || 1 })}
                      className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-white w-full font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Payment Method</label>
                    <select
                      value={walkinForm.paymentMethod}
                      onChange={(e) => setWalkinForm({ ...walkinForm, paymentMethod: e.target.value as any })}
                      className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 w-full font-bold"
                    >
                      <option value="Card">💳 Credit Card</option>
                      <option value="Cash">💵 Cash Money</option>
                      <option value="Tap">📱 Mobile Tap</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Credited Technician (Optional)</label>
                  <select
                    value={walkinForm.technicianId}
                    onChange={(e) => setWalkinForm({ ...walkinForm, technicianId: e.target.value })}
                    className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 w-full"
                  >
                    <option value="">No staff commission (House sale)</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setShowWalkinSaleModal(false)}
                    className="bg-stone-800 hover:bg-stone-750 text-stone-300 font-bold p-2 px-3.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold p-2 px-5"
                  >
                    Complete Checkout
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
