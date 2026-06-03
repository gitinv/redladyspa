import React, { useState, useEffect } from "react";
import { Product, Technician, Appointment, Trend, CreatorMonth, ClientProfile } from "../types.js";
import { fetchProducts, fetchTechnicians, bookAppointment, patchAppointment, fetchTrends, voteTrend, fetchCreatorMonth, fetchClients } from "../services/api.js";
import { Sparkles, Calendar, User, Phone, Mail, FileText, CheckCircle, Heart, Star, ShoppingBag, ArrowRight, Layers, PhoneCall, Smartphone, Home, LogIn, LogOut, Check, ChevronRight, ChevronLeft, Bell, Award, Tag, Settings, Eye, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Loyalty Rewards Shop Offerings
export const REWARDS_SHOP = [
  { id: "reward-10", title: "$10 Spa Voucher", desc: "Redeem 100 points for a $10 discount code", discount: 10, pointsCost: 100 },
  { id: "reward-25", title: "$25 Premium Voucher", desc: "Redeem 230 points for a $25 deep discount code", discount: 25, pointsCost: 230 },
  { id: "reward-mask", title: "Free Organic Shea Hand Mask", desc: "Redeem 150 points for a free organic shea hand mask package custom treatment add-on", discount: 15, pointsCost: 150 },
  { id: "reward-oil", title: "Free Vitamin E Cuticle Oil", desc: "Redeem 110 points for a nourishing cuticle oil bottle to take home", discount: 10.5, pointsCost: 110 },
];

interface ClientPortalProps {
  key?: any;
  onRefreshPOSData: () => void;
}

export default function ClientPortal({ onRefreshPOSData }: ClientPortalProps) {
  // Device Preview State
  // "iphone" | "android" | "tablet" | "web"
  const [viewport, setViewport] = useState<"iphone" | "android" | "tablet" | "web">(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      const isTablet = /ipad|tablet|(android(?!.*mobile))|playbook|silk/i.test(ua);
      const isMobile = /mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua);
      
      if (isTablet) {
        return "tablet";
      }
      if (isMobile) {
        if (/iphone|ipod/.test(ua)) {
          return "iphone";
        }
        if (/android/.test(ua)) {
          return "android";
        }
        return "iphone"; // default mobile fallback
      }
    }
    return "web";
  });

  // Client session persistence
  const [currentUser, setCurrentUser] = useState<{ name: string; phone: string; email: string } | null>(() => {
    const saved = localStorage.getItem("nailspa_client_session");
    return saved ? JSON.parse(saved) : null;
  });

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [creatorPackage, setCreatorPackage] = useState<CreatorMonth | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);

  // Push Notifications, Loyalty & Voucher states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; message: string; type: string } | null>(null);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  
  const [appliedVoucher, setAppliedVoucher] = useState<{ id: string; code: string; discountAmount: number; title: string } | null>(null);
  const [redemptionSuccess, setRedemptionSuccess] = useState<string | null>(null);
  const [redemptionError, setRedemptionError] = useState<string | null>(null);
  const [prefSaveMessage, setPrefSaveMessage] = useState<string | null>(null);

  // Preference status toggles form state
  const [prefConfirmations, setPrefConfirmations] = useState(true);
  const [prefReminders, setPrefReminders] = useState(true);
  const [prefCancellations, setPrefCancellations] = useState(true);
  const [prefPromotions, setPrefPromotions] = useState(true);

  // Navigation: "home" | "products" | "book" | "my-profile" | "services"
  const [activeTab, setActiveTab] = useState<"home" | "products" | "book" | "my-profile" | "services">("home");
  const [activeServiceCategory, setActiveServiceCategory] = useState<string>("Mani Bar");
  const [wizardCategory, setWizardCategory] = useState<string>("Mani Bar");
  const [activeTrendIndex, setActiveTrendIndex] = useState(0);

  // Client sign-in form state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [signInName, setSignInName] = useState("");
  const [signInPhone, setSignInPhone] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");

  // Booking Wizard States
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [selectedService, setSelectedService] = useState<{ name: string; price: number } | null>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);

  // Function to handle choosing multiple services with business logic limits
  const handleServiceClick = (srv: any) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.name === srv.name);
      
      // If it's an "Add Aura" item, we toggle its selection (any number can be selected)
      if (srv.category === "Add Aura") {
        if (isSelected) {
          return prev.filter(s => s.name !== srv.name);
        } else {
          return [...prev, srv];
        }
      }
      
      // For Mani Bar, Pedi Bar, and Nails Bar, we allow EXACTLY one of each category.
      // If we click an item that is already selected, we deselect it.
      // If it's not selected, we replace any existing item of that category with the new one.
      const listWithoutSameCategory = prev.filter(s => s.category !== srv.category || srv.category === "Add Aura");
      if (isSelected) {
        return listWithoutSameCategory;
      } else {
        return [...listWithoutSameCategory, srv];
      }
    });
  };

  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");

  // Input fields for non-signed-in guests in wizard
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestNotes, setGuestNotes] = useState("");

  // Booking result/feedback
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState("");

  // Available services list modeled on The Red Lady Spa categories
  const services = [
    // MANI BAR (Mani should be first)
    { category: "Mani Bar", name: "The Red Lady Classic Manicure", price: 25.00, duration: "30 mins", desc: "Rejuvenating hand treatment including vitamin soak, professional shape, meticulous cuticle trim, hydrating massage, hot towels, and flawless regular polish." },
    { category: "Mani Bar", name: "The Red Lady Deluxe Manicure", price: 35.00, duration: "45 mins", desc: "Spa scrub, botanical deep hydration mask, paraffin soothing wrap, intensive massage, hot towels, and nourishing cream care." },
    { category: "Mani Bar", name: "Gel (Shellac) Manicure", price: 45.00, duration: "45 mins", desc: "Classic detailing with choice of long-lasting, high-gleam LED-cured gel hybrid brand polishes. Keeps hands beautiful chip-free for up to 3 weeks." },
    { category: "Mani Bar", name: "Collagen Spa Manicure", price: 55.00, duration: "50 mins", desc: "Features intensive youth collagen gloves, nourishing hot oil seal, neck, and shoulder tension release rub." },

    // PEDI BAR
    { category: "Pedi Bar", name: "The Red Lady Classic Pedicure", price: 35.00, duration: "45 mins", desc: "Our comforting pedicure featuring a warm soak, precision shaping, cuticle care, gentle exfoliation, safe massage, hot towel overlay, and perfect color finish." },
    { category: "Pedi Bar", name: "Organic Lavender Pedicure", price: 45.00, duration: "60 mins", desc: "Infused with pure organic lavender extract. Includes lavender sea salt exfoliation, intense mask, hot towels, and extensive stone thermal massage." },
    { category: "Pedi Bar", name: "Milk & Honey Pedicure", price: 55.00, duration: "65 mins", desc: "A luxurious soak in real warm milk, honey sugar crystals wash, nourishing paraffin treatment, and smooth stone massage to soothe muscle fatigue." },
    { category: "Pedi Bar", name: "The Red Lady Signature Detox Pedicure", price: 70.00, duration: "75 mins", desc: "Ultimate deep bubbling collagen activation. Features botanical scrub, collagen tissue mask, premium hot stone therapy, and warming paraffin envelope." },

    // NAILS BAR - COMBINATIONS OF MANI & PEDI with a $5 discount
    { category: "Nails Bar", name: "Classic Mani & Pedi Combo", price: 55.00, duration: "75 mins", desc: "Our comforting signature Classic Manicure paired with the Classic Pedicure. Includes a built-in $5 combination discount." },
    { category: "Nails Bar", name: "Deluxe Lavender Mani & Pedi Combo", price: 75.00, duration: "105 mins", desc: "The ultimate skin-softening combo: Organic Lavender Pedicure and Deluxe Manicure. Includes a built-in $5 combination discount." },
    { category: "Nails Bar", name: "The Red Lady Signature Detox & Spa Combo", price: 120.00, duration: "125 mins", desc: "Premium collagen-infused hand & foot therapy featuring botanical scrubs, hot stone heat, and relaxing massage. Includes a built-in $5 combination discount." },

    // NAILS BAR - STANDARD SERVICES
    { category: "Nails Bar", name: "Acrylic Full Set", price: 50.00, duration: "75 mins", desc: "Classic extension with standard high-strength compound liquid acrylic and custom extensions." },
    { category: "Nails Bar", name: "Acrylic Fill", price: 40.00, duration: "50 mins", desc: "Meticulous growth space fill and re-balancing of existing nail enhancements." },
    { category: "Nails Bar", name: "Gel Powder Full Set", price: 60.00, duration: "80 mins", desc: "Resilient powder overlay finished with a glorious high-shine UV gel topcoat seal." },
    { category: "Nails Bar", name: "Gel Powder Fill", price: 45.00, duration: "60 mins", desc: "Perfect inflowing refresh for growing gel powder extensions." },
    { category: "Nails Bar", name: "Dipping Powder (Dip Nails)", price: 50.00, duration: "60 mins", desc: "Organic, lightweight, and durable vitamin-fortified powder system. Great alternative to traditional acrylics." },
    { category: "Nails Bar", name: "Ombré Full Set", price: 65.00, duration: "90 mins", desc: "Gorgeous custom-shaded double color blend with premium seamless horizontal transitions." },

    // ADD AURA
    { category: "Add Aura", name: "Nail Art (2 Accent Fingers)", price: 10.00, duration: "15 mins", desc: "Sleek hand-painted miniature detailing, stickers, marble effects, or chrome accents." },
    { category: "Add Aura", name: "Paraffin Booties / Mittens Treatment", price: 12.00, duration: "15 mins", desc: "Deep thermal hydration mask using warm cosmetic-grade paraffin wax envelopes." },
    { category: "Add Aura", name: "Nail Extension Repair", price: 8.00, duration: "10 mins", desc: "Safely fix a broken extender tip or split natural plate overlays." },
    { category: "Add Aura", name: "Gel Polish Change", price: 25.00, duration: "25 mins", desc: "Quick shellac old color buff-off and brand new premium LED-cured layer application." },
    { category: "Add Aura", name: "French Tip Design", price: 10.00, duration: "15 mins", desc: "Our signature crisp white tips, deep arches, or customized highlight colors." },
    { category: "Add Aura", name: "Gel Polish Professional Removal", price: 10.00, duration: "15 mins", desc: "Gentle acetone foil soak-off protecting natural keratin plates from scratching." },
    
    // Compatibility: Creator Customized Pack
    { category: "Add Aura", name: "Creator Customized Pack: Midnight Velvet Spark", price: 145.00, duration: "100 mins", desc: "Designed by Aria Thorne. Shifting velvet polish, custom crystals, hot stone, and paraffin treatment." }
  ];

  // Sync category tabs when services are selected
  useEffect(() => {
    if (selectedServices.length > 0) {
      const lastService = selectedServices[selectedServices.length - 1];
      if (lastService && lastService.category) {
        setWizardCategory(lastService.category);
        setActiveServiceCategory(lastService.category);
      }
    }
  }, [selectedServices]);

  // Sync virtual selectedService state with selectedServices list (incorporating combination discounts)
  useEffect(() => {
    if (selectedServices.length === 0) {
      setSelectedService(null);
    } else {
      const name = selectedServices.map(s => s.name).join(" + ");
      const hasMani = selectedServices.some(s => s.category === "Mani Bar");
      const hasPedi = selectedServices.some(s => s.category === "Pedi Bar");
      let basePrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
      if (hasMani && hasPedi) {
        basePrice -= 5.00;
      }
      setSelectedService({
        name,
        price: basePrice
      });
    }
  }, [selectedServices]);

  const [cancelStatusMsg, setCancelStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmingAppId, setConfirmingAppId] = useState<string | null>(null);

  // Helper: Parse appointment date/time text into a browser Date
  const parseAppDateTime = (dateStr: string, timeStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    let hour = 12;
    let minute = 0;
    if (match) {
      hour = parseInt(match[1], 10);
      minute = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
    }
    return new Date(year, month - 1, day, hour, minute);
  };

  const isCancelRestricted = (dateStr: string, timeStr: string): boolean => {
    const appDate = parseAppDateTime(dateStr, timeStr);
    const diffMs = appDate.getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 72; // both within 72 hours of appointment, or in the past
  };

  const handleClientCancel = async (appId: string) => {
    try {
      setCancelStatusMsg(null);
      await patchAppointment(appId, { status: "Cancelled", cancelledBy: "client" } as any);
      
      // Update local appointments list or refresh from server
      const freshApps = await fetch("/api/appointments").then(r => r.json());
      setAppointments(freshApps);
      onRefreshPOSData(); // Refreshes the POS's state too
      
      setCancelStatusMsg({
        type: "success",
        text: "Your reservation has been cancelled successfully."
      });
      // Clear after 5 seconds
      setTimeout(() => setCancelStatusMsg(null), 5000);
    } catch (err: any) {
      setCancelStatusMsg({
        type: "error",
        text: err.message || "Could not complete cancellation at this time."
      });
      setTimeout(() => setCancelStatusMsg(null), 8000);
    }
  };

  // Load Data from website backend
  const loadData = async () => {
    try {
      const [prodsData, techsData, trendsData, creatorData, clientsData] = await Promise.all([
        fetchProducts(),
        fetchTechnicians(),
        fetchTrends(),
        fetchCreatorMonth(),
        fetchClients()
      ]);
      setProducts(prodsData);
      setTechnicians(techsData);
      setTrends(trendsData);
      setCreatorPackage(creatorData);
      setClients(clientsData);
    } catch (err) {
      console.error("Error fetching web app data:", err);
    }
  };

  useEffect(() => {
    loadData();
    // Poll appointments if we want live booking verification
    fetch("/api/appointments")
      .then(res => res.json())
      .then(data => setAppointments(data))
      .catch(e => console.error(e));
  }, []);

  // Synchronize client preference states
  const userProfileInDB = currentUser
    ? clients.find(c => c.phone === currentUser.phone)
    : null;

  useEffect(() => {
    if (userProfileInDB) {
      const prefs = userProfileInDB.notificationPreferences || {
        confirmations: true,
        reminders: true,
        cancellations: true,
        promotions: true
      };
      setPrefConfirmations(prefs.confirmations ?? true);
      setPrefReminders(prefs.reminders ?? true);
      setPrefCancellations(prefs.cancellations ?? true);
      setPrefPromotions(prefs.promotions ?? true);
    }
  }, [userProfileInDB]);

  // Notifications live sync
  const fetchClientNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications?phone=${currentUser.phone}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error("Error sync notifications:", e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchClientNotifications();
      const interval = setInterval(fetchClientNotifications, 4000); // Poll for real-time simulate push triggers!
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [currentUser]);

  // Monitor incoming to pop up real-time slide push alert layout
  useEffect(() => {
    if (notifications.length > 0) {
      const newest = notifications[0];
      if (!newest.isRead && newest.id !== lastNotificationId) {
        setLastNotificationId(newest.id);
        setActiveToast({
          id: newest.id,
          title: newest.title,
          message: newest.message,
          type: newest.type
        });
        const timer = setTimeout(() => {
          setActiveToast(null);
        }, 7000);
        return () => clearTimeout(timer);
      }
    }
  }, [notifications, lastNotificationId]);

  // Claim brand new point voucher
  const handleRedeemReward = async (pointsCost: number, title: string, discount: number) => {
    if (!currentUser) return;
    setRedemptionError(null);
    setRedemptionSuccess(null);

    try {
      const payload = {
        phone: currentUser.phone,
        rewardTitle: title,
        discountAmount: discount,
        costPoints: pointsCost
      };

      const res = await fetch("/api/clients/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to redeem code.");
      }

      setRedemptionSuccess(`Voucher for "${title}" successfully claimed!`);
      // Refresh
      await loadData();
      onRefreshPOSData();
    } catch (err: any) {
      setRedemptionError(err.message);
    }
  };

  // Save changes to notification preferences via backend API
  const handleSavePreferences = async () => {
    if (!currentUser) return;
    setPrefSaveMessage(null);
    try {
      const payload = {
        phone: currentUser.phone,
        preferences: {
          confirmations: prefConfirmations,
          reminders: prefReminders,
          cancellations: prefCancellations,
          promotions: prefPromotions
        }
      };

      const res = await fetch("/api/clients/update-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save settings");

      setPrefSaveMessage("Notification settings successfully updated!");
      await loadData();
      setTimeout(() => setPrefSaveMessage(null), 4505);
    } catch (err: any) {
      setPrefSaveMessage("Error updating preferences.");
    }
  };

  const handleMarkNotificationsAsRead = async () => {
    if (!currentUser) return;
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone })
      });
      fetchClientNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  // Update wizard details if user session changes
  useEffect(() => {
    if (currentUser) {
      setGuestName(currentUser.name);
      setGuestPhone(currentUser.phone);
      setGuestEmail(currentUser.email);
    }
  }, [currentUser]);

  // Handle Client Registration
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInName.trim() || !signInPhone.trim() || !signInEmail.trim() || !signInPassword.trim()) {
      setSignInError("Name, phone, email, and password are required.");
      return;
    }
    setIsAuthSubmitting(true);
    setSignInError("");
    try {
      const resp = await fetch("/api/clients/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signInName.trim(),
          phone: signInPhone.trim(),
          email: signInEmail.trim(),
          password: signInPassword.trim()
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSignInError(data.error || "An error occurred during registration.");
        setIsAuthSubmitting(false);
        return;
      }
      const userSession = {
        name: data.name,
        phone: data.phone,
        email: data.email
      };
      localStorage.setItem("nailspa_client_session", JSON.stringify(userSession));
      setCurrentUser(userSession);
      setSignInError("");
      setSignInPassword("");
      setSignInName("");
      setSignInPhone("");
      setSignInEmail("");
      await loadData();
    } catch (err: any) {
      console.error(err);
      setSignInError("Connection failed. Please check your service connection and try again.");
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // Handle Client Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !signInPassword.trim()) {
      setSignInError("Email address and password are required.");
      return;
    }
    setIsAuthSubmitting(true);
    setSignInError("");
    try {
      const resp = await fetch("/api/clients/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signInEmail.trim(),
          password: signInPassword.trim()
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSignInError(data.error || "An error occurred during authentication.");
        setIsAuthSubmitting(false);
        return;
      }
      const userSession = {
        name: data.name,
        phone: data.phone,
        email: data.email
      };
      localStorage.setItem("nailspa_client_session", JSON.stringify(userSession));
      setCurrentUser(userSession);
      setSignInError("");
      setSignInName("");
      setSignInPhone("");
      setSignInEmail("");
      setSignInPassword("");
      await loadData();
    } catch (err: any) {
      console.error(err);
      setSignInError("Connection failed. Please check your service and try again.");
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // Handle Client Sign Out
  const handleSignOut = () => {
    localStorage.removeItem("nailspa_client_session");
    setCurrentUser(null);
    setGuestName("");
    setGuestPhone("");
    setGuestEmail("");
  };

  // Handle Trend Voting
  const handleVoteTrend = async (id: string) => {
    try {
      const updated = await voteTrend(id);
      setTrends(updated);
      onRefreshPOSData(); // Notify POS of hot trend updates!
    } catch (err) {
      console.error(err);
    }
  };

  // Check slot availability for chosen technician on chosen date and time
  const isTimeSlotBooked = (techId: string, date: string, time: string) => {
    const isReserved = appointments.some(
      app => app.technicianId === techId && app.date === date && app.time === time && app.status !== "Cancelled"
    );
    const tech = technicians.find(t => t.id === techId);
    if (!tech) return isReserved;
    const hasTimeOff = tech.timeOff && tech.timeOff.some(to => to === date || to === `${date} All Day` || to === `${date} ${time}`);
    return isReserved || !!hasTimeOff;
  };

  // Handle Appointment Booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError("");
    setBookingSuccess(null);

    if (!selectedService) {
      setBookingError("Please select a service before continuing.");
      return;
    }
    if (!selectedTech) {
      setBookingError("Please pick your aesthetic nail specialist.");
      return;
    }
    if (!selectedDate) {
      setBookingError("Please pick a preferred booking date.");
      return;
    }
    if (!selectedTimeSlot) {
      setBookingError("Please pick an available time slot.");
      return;
    }
    if (!guestName.trim() || !guestPhone.trim()) {
      setBookingError("Your Name and Phone Number are required to secure the reservation.");
      return;
    }

    try {
      const finalPrice = Math.max(0, selectedService.price - (appliedVoucher ? appliedVoucher.discountAmount : 0));
      const payload = {
        clientName: guestName,
        clientPhone: guestPhone,
        clientEmail: guestEmail,
        serviceName: selectedService.name,
        technicianId: selectedTech.id,
        date: selectedDate,
        time: selectedTimeSlot,
        price: finalPrice,
        notes: guestNotes
      };

      const result = await bookAppointment(payload);
      setBookingSuccess(`Successfully booked appointment on ${result.date} at ${result.time}!`);

      // Update consumed coupon status in DB
      if (appliedVoucher && currentUser) {
        await fetch("/api/clients/update-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: currentUser.phone,
            usedVoucherCode: appliedVoucher.code
          })
        });
        setAppliedVoucher(null);
      }

      // Reset wizard
      setSelectedService(null);
      setSelectedServices([]);
      setSelectedTech(null);
      setSelectedDate("");
      setSelectedTimeSlot("");
      setGuestNotes("");
      setBookingStep(1);

      // Refresh appointments and update main dashboard
      loadData();
      onRefreshPOSData();

      // Fetch fresh list
      const freshApps = await fetch("/api/appointments").then(r => r.json());
      setAppointments(freshApps);

      // Stagger state back to home or profile
      setTimeout(() => {
        setBookingSuccess(null);
        setActiveTab("home");
      }, 5000);
    } catch (err: any) {
      setBookingError(err.message || "An issue occurred while queuing your reservation.");
    }
  };

  // Helper: Get user's appointments if signed in
  const userAppointments = currentUser
    ? appointments.filter(app => app.clientPhone === currentUser.phone)
    : [];

  // Render the core portal views
  const renderClientContent = () => {
    const isMobileSim = viewport === "iphone" || viewport === "android";
    switch (activeTab) {
      case "products":
        return (
          <div className="space-y-6">
            <div className="border-b border-stone-200 pb-4">
              <h2 className="text-2xl font-bold font-display text-stone-800 tracking-tight">The Red Lady Shop</h2>
              <p className="text-xs text-stone-500 mt-1">
                The official spa database is our source of truth. All shop items below can be bought in-store.
              </p>
            </div>

            <div className={isMobileSim ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"}>
              {products.map((prod) => (
                <div key={prod.id} className="relative bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-xs hover:shadow-md transition duration-300">
                  <div className="h-44 w-full overflow-hidden relative bg-stone-100">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover select-none"
                    />
                    <span className="absolute top-3 right-3 text-[10px] font-mono tracking-wider font-semibold uppercase bg-white/90 text-stone-700 px-2.5 py-1 rounded-full backdrop-blur-xs">
                      {prod.category}
                    </span>
                    {prod.stock <= prod.lowStockAlert && (
                      <span className="absolute top-3 left-3 text-[9px] font-bold uppercase bg-amber-500 text-white px-2.5 py-1 rounded-full">
                        Low Stock
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-1">
                      <h3 className="text-base font-semibold text-stone-800 leading-tight">{prod.name}</h3>
                      <span className="text-sm font-bold text-stone-900 shrink-0 font-mono">${prod.price.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{prod.description}</p>
                    <div className="pt-2 border-t border-stone-50 flex items-center justify-between text-[11px] text-stone-400 font-mono">
                      <span>Ref ID: {prod.id}</span>
                      <span>Stock: {prod.stock > 0 ? `${prod.stock} left` : "Out of Stock"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "book":
        return (
          <div className="space-y-6 text-left">
            {bookingSuccess && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle className="w-5 h-5 text-emerald-600 animate-bounce" />
                  <span>Your Booking is Secured!</span>
                </div>
                <p className="text-xs text-emerald-700 font-mono">{bookingSuccess}</p>
              </div>
            )}

            {bookingError && (
              <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-xl text-xs font-mono">
                {bookingError}
              </div>
            )}

            {/* Breadcrumb Steps Bar */}
            <div className="border border-stone-200/85 bg-stone-50/50 rounded-2xl p-4 flex justify-between items-center text-xs w-full max-w-full">
              <div className="flex items-center gap-2 font-semibold">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  bookingStep === 1 ? "bg-[#1A1A1A] text-white" : bookingStep > 1 ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-500"
                }`}>1</span>
                <span className={bookingStep === 1 ? "text-[#1A1A1A]" : "text-stone-400"}>Treatments</span>
              </div>
              <div className="h-[1px] bg-stone-200 flex-1 mx-3"></div>
              <div className="flex items-center gap-2 font-semibold">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  bookingStep === 2 ? "bg-[#1A1A1A] text-white" : bookingStep > 2 ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-500"
                }`}>2</span>
                <span className={bookingStep === 2 ? "text-[#1A1A1A]" : "text-stone-400"}>Artist & Date</span>
              </div>
              <div className="h-[1px] bg-stone-200 flex-1 mx-3"></div>
              <div className="flex items-center gap-2 font-semibold">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  bookingStep === 3 ? "bg-[#1A1A1A] text-white" : "bg-stone-200 text-stone-500"
                }`}>3</span>
                <span className={bookingStep === 3 ? "text-[#1A1A1A]" : "text-stone-400"}>Checkout Details</span>
              </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-6 w-full text-left">
              {/* Wizard Steps */}
              <div className="space-y-6 w-full">
                
                {/* 1. SELECT SERVICE (Step 1) */}
                {bookingStep === 1 && (
                  <div className="bg-white rounded-2xl border border-stone-100 p-3.5 sm:p-5 space-y-4 animate-fade-in text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-stone-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">1</span>
                        <h3 className="font-semibold text-stone-800 tracking-tight">Select Spa Service</h3>
                      </div>
                      {/* Display selected services label */}
                      {selectedServices.length > 0 && (
                        <div className="text-[10px] sm:text-[11px] font-medium bg-rose-50/80 text-rose-700 px-2.5 py-1.5 rounded-lg border border-rose-100 max-w-full sm:max-w-md">
                          <span className="font-bold border-r border-rose-200/50 pr-1.5 mr-1.5">Selected:</span>
                          {selectedServices.map(s => s.name).join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Wizard Category Button Picker */}
                    <div className="flex flex-wrap gap-1.5 p-1 bg-stone-50 rounded-xl border border-stone-150">
                      {["Mani Bar", "Pedi Bar", "Nails Bar", "Add Aura"].map((cat) => {
                        const isSel = wizardCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setWizardCategory(cat)}
                            className={`flex-1 text-center font-bold uppercase tracking-wider text-[9px] py-2 px-1.5 rounded-lg transition-all ${
                              isSel
                                ? "bg-[#1A1A1A] text-white shadow-xs"
                                : "text-stone-500 hover:text-[#1A1A1A] hover:bg-stone-200/50"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className={isMobileSim ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-3"}>
                      {services
                        .filter((s) => s.category === wizardCategory || !s.category)
                        .map((srv, idx) => {
                          const isChosen = selectedServices.some(s => s.name === srv.name);
                          const isCreator = srv.name.includes("Creator Customized");
                          return (
                            <div
                              key={idx}
                              onClick={() => handleServiceClick(srv)}
                              className={`p-3.5 rounded-xl border transition cursor-pointer text-left space-y-1 relative h-full flex flex-col justify-between ${
                                isChosen
                                  ? isCreator
                                    ? "border-amber-500 bg-amber-50/40 shadow-sm ring-1 ring-amber-500/20"
                                    : "border-rose-500 bg-rose-50/50 shadow-sm"
                                  : isCreator
                                    ? "border-amber-200 bg-amber-50/15 hover:border-amber-400 hover:bg-amber-50/25 shadow-xs"
                                    : "border-stone-150 bg-white hover:border-stone-300"
                              }`}
                            >
                              <div>
                                {isCreator && (
                                  <div className="inline-flex items-center gap-0.5 text-[8px] text-amber-700 font-bold uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50 mb-1">
                                    <span>✨ Creator Curated</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-start gap-1">
                                  <span className="text-xs font-bold text-stone-880 leading-snug">{srv.name}</span>
                                  <span className={`text-xs font-bold shrink-0 font-mono ${isCreator ? "text-amber-700" : "text-rose-600"}`}>${srv.price}</span>
                                </div>
                                <p className="text-[10px] text-stone-500 leading-relaxed line-clamp-2 mt-0.5">{srv.desc}</p>
                              </div>
                              <div className="text-[9px] font-mono text-stone-400 mt-2.5 flex items-center justify-between pt-1 border-t border-stone-50">
                                <span>Duration: {srv.duration}</span>
                                {isChosen && (
                                  <span className={`flex items-center gap-0.5 font-bold uppercase tracking-wider text-[8px] ${isCreator ? "text-amber-700" : "text-rose-600"}`}>
                                    Selected <Check className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 2. SELECT SPECIALIST & CALENDAR (Step 2) */}
                {bookingStep === 2 && (
                  <div className="space-y-6 text-left animate-fade-in text-left">
                    <div className="bg-white rounded-2xl border border-stone-100 p-3.5 sm:p-5 space-y-3">
                      <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                        <span className="bg-stone-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">2</span>
                        <h3 className="font-semibold text-stone-800 tracking-tight">Select Nail Artist</h3>
                      </div>

                      <div className={isMobileSim ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-3"}>
                        {technicians.map((tech) => (
                          <div
                            key={tech.id}
                            onClick={() => {
                              setSelectedTech(tech);
                              setSelectedTimeSlot(""); // Reset slot because technician availability differs
                            }}
                            className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 text-left ${
                              selectedTech?.id === tech.id
                                ? "border-rose-500 bg-rose-50/50"
                                : "border-stone-150 bg-white hover:border-stone-300"
                            }`}
                          >
                            <img
                              src={tech.avatar}
                              alt={tech.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-full object-cover border border-stone-200"
                            />
                            <div className="flex-1 min-w-0 space-y-0.5 text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-stone-880 leading-snug truncate">{tech.name}</span>
                                <span className="flex items-center gap-0.5 text-[10px] text-amber-500 shrink-0 font-mono font-bold">
                                  <Star className="w-3.5 h-3.5 fill-amber-500 shrink-0" />
                                  {tech.rating}
                                </span>
                              </div>
                              <p className="text-[10px] text-stone-400 truncate">{tech.role}</p>
                              <div className="flex flex-wrap gap-1 mt-1 text-left">
                                {tech.specialties.slice(0, 2).map((sp, idx) => (
                                  <span key={idx} className="text-[8px] px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
                                    {sp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-stone-100 p-3.5 sm:p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                        <span className="bg-stone-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">3</span>
                        <h3 className="font-semibold text-stone-800 tracking-tight">Availability Calendar</h3>
                      </div>

                      <div className="space-y-4 text-left">
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-stone-400 mb-1.5 font-bold">Select Date</label>
                          <input
                            type="date"
                            min="2026-06-01"
                            max="2026-06-30"
                            value={selectedDate}
                            onChange={(e) => {
                              setSelectedDate(e.target.value);
                              setSelectedTimeSlot("");
                            }}
                            className="w-full text-xs p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-stone-50"
                          />
                        </div>

                        {selectedTech && selectedDate ? (
                          <div className="space-y-2 text-left">
                            {/* Check if technician has scheduled time off for specific date */}
                            {selectedTech.timeOff && selectedTech.timeOff.some(to => to === selectedDate || to === `${selectedDate} All Day`) ? (
                              <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 text-center text-amber-800 text-xs font-medium space-y-1">
                                <p className="font-extrabold text-amber-900 block text-xs">⚠️ specialist on scheduled time off</p>
                                <p className="text-[11px] text-stone-600 leading-relaxed font-mono">
                                  {selectedTech.name} has scheduled time off on {selectedDate}. Please select another date or nail specialist!
                                </p>
                              </div>
                            ) : (
                              <>
                                <label className="block text-[11px] font-mono uppercase text-[#1A1A1A] font-extrabold">
                                  Available Times for {selectedTech.name}
                                </label>
                                <div className={isMobileSim ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"}>
                                  {selectedTech.availability.map((slot) => {
                                    const isBooked = isTimeSlotBooked(selectedTech.id, selectedDate, slot);
                                    return (
                                      <button
                                        key={slot}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={() => setSelectedTimeSlot(slot)}
                                        className={`p-2 rounded-lg text-[10px] font-mono font-bold transition flex flex-col items-center justify-center border ${
                                          isBooked
                                            ? "bg-stone-50 text-stone-350 border-stone-200 cursor-not-allowed line-through"
                                            : selectedTimeSlot === slot
                                            ? "bg-stone-900 border-stone-900 text-white shadow-xs"
                                            : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                                        }`}
                                      >
                                        <span>{slot}</span>
                                        <span className={`text-[8px] uppercase mt-0.5 ${isBooked ? "text-stone-300" : selectedTimeSlot === slot ? "text-rose-300" : "text-stone-400"}`}>
                                          {isBooked ? "Unavailable" : "Available"}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-stone-404 italic bg-stone-50 p-3 rounded-lg text-center">
                            {!selectedTech ? "👉 Select a nail specialist first" : "👉 Choose a reservation date next"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3. Your Details (Step 3) */}
                {bookingStep === 3 && (
                  <div className="bg-white rounded-2xl border border-stone-100 p-3.5 sm:p-5 space-y-4 animate-fade-in text-left">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                      <span className="bg-stone-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">4</span>
                      <h3 className="font-semibold text-stone-800 tracking-tight">Your Details</h3>
                    </div>

                    {!currentUser && (
                      <div className="bg-rose-50 text-rose-800 p-3 rounded-lg text-[10px] leading-relaxed">
                        💡 <strong>Friendly tip:</strong> You are checking out as a guest. To view your rewards, save your profile, or tracking visits, click <strong>"User Session"</strong> in the top menu to register persistently!
                      </div>
                    )}

                    <div className={isMobileSim ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-stone-400 font-bold block">First & Last Name</label>
                        <input
                          type="text"
                          required
                          disabled={!!currentUser}
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="e.g. Maria Sanders"
                          className="w-full text-xs p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-stone-50 disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-stone-400 font-bold block">Phone Number</label>
                        <input
                          type="tel"
                          required
                          disabled={!!currentUser}
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="e.g. 555-0144"
                          className="w-full text-xs p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-stone-50 disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-mono uppercase text-stone-400 font-bold block">Email (Optional)</label>
                        <input
                          type="email"
                          disabled={!!currentUser}
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="e.g. maria@example.com"
                          className="w-full text-xs p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-stone-50 disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-mono uppercase text-[#A44322] font-semibold block">Special Styling Requests or Nail Care Notes (Optional)</label>
                        <textarea
                          value={guestNotes}
                          onChange={(e) => setGuestNotes(e.target.value)}
                          rows={2}
                          placeholder="e.g. Prefer almond shape, extra shiny top-coat, or allergic to almond wax."
                          className="w-full text-xs p-2.5 rounded-lg border border-stone-250 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-stone-50"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 1 CONTROLS: Shows selected services while picking */}
              {bookingStep === 1 && (
                <div className={`sticky ${isMobileSim ? "bottom-20" : "bottom-0"} z-40 bg-stone-900 text-white rounded-2xl p-3.5 shadow-xl border border-stone-850 flex items-center justify-between w-full mt-4 text-left font-sans`}>
                  <div className="text-left space-y-0.5">
                    <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider block font-bold">Additive Services ({selectedServices.length})</span>
                    {selectedServices.length === 0 ? (
                      <span className="text-xs text-stone-450 italic font-medium">No treatments selected</span>
                    ) : (
                      <div className="text-xs font-bold text-rose-300 truncate max-w-[170px] sm:max-w-md">
                        {selectedServices.map(s => s.name).join(" + ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedServices.length > 0 && (
                      <span className="text-sm font-mono font-bold text-stone-100 hidden sm:inline-block">
                        Total: ${selectedService ? selectedService.price.toFixed(2) : "0.00"}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={selectedServices.length === 0}
                      onClick={() => setBookingStep(2)}
                      className="bg-rose-600 hover:bg-rose-500 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition duration-200 cursor-pointer text-center flex items-center gap-1.5 shadow-md"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5 text-stone-100" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 CONTROLS: Artist details & calendar */}
              {bookingStep === 2 && (
                <div className={`sticky ${isMobileSim ? "bottom-20" : "bottom-0"} z-40 bg-stone-900 text-white rounded-2xl p-3.5 shadow-xl border border-stone-850 flex items-center justify-between w-full mt-4 font-sans text-left`}>
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className="bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider transition duration-200 cursor-pointer"
                  >
                    Back
                  </button>
                  <div className="text-right hidden sm:block">
                    {selectedTech && selectedDate && selectedTimeSlot ? (
                      <span className="text-[10px] text-stone-300 font-mono font-bold">
                        {selectedTech.name} | {selectedDate} @ {selectedTimeSlot}
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-amber-500 font-bold italic">
                        Please select specialist & time slot
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!selectedTech || !selectedDate || !selectedTimeSlot}
                    onClick={() => setBookingStep(3)}
                    className="bg-rose-600 hover:bg-rose-500 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition duration-200 cursor-pointer text-center flex items-center gap-1.5 shadow-md"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-100" />
                  </button>
                </div>
              )}

              {/* STEP 3 CONTROLS: Booking Blueprint Summary & Review Checkout Details */}
              {bookingStep === 3 && (
                <div className={`sticky ${isMobileSim ? "bottom-20" : "bottom-0"} z-40 bg-stone-900 text-stone-100 rounded-2xl p-3 sm:p-4 sm:px-5 shadow-xl border border-stone-800 relative overflow-hidden w-full mt-4 text-left`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl"></div>
                  
                  <div className="flex flex-col gap-3 relative z-10 text-left">
                    {/* Left block: Title & Details */}
                    <div className="space-y-1.5 flex-1 text-left">
                      <div className="flex items-center gap-1.5 border-b border-stone-800 pb-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <h3 className="font-bold text-white text-[11px] sm:text-xs uppercase tracking-wider font-display">Booking Blueprint Summary</h3>
                      </div>
                      
                      <div className="flex flex-col divide-y divide-stone-800 border-t border-b border-stone-850/60 py-0.5">
                        <div className="py-1 text-[11px]">
                          <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider block mb-1 font-bold">Chosen Treatments</span>
                          {selectedServices.length === 0 ? (
                            <span className="font-medium text-stone-400 italic">None selected</span>
                          ) : (
                            <div className="space-y-1.5 pl-2 border-l border-rose-500/60 max-h-[85px] overflow-y-auto scrollbar-thin">
                              {selectedServices.map((s, idx) => (
                                <div key={idx} className="flex justify-between items-center text-stone-200">
                                  <span className="font-medium truncate max-w-[75%]">{s.name}</span>
                                  <span className="font-mono text-[10px] text-stone-400">${s.price.toFixed(2)}</span>
                                </div>
                              ))}
                              {selectedServices.some(s => s.category === "Mani Bar") && selectedServices.some(s => s.category === "Pedi Bar") && (
                                <div className="flex justify-between items-center text-emerald-450 text-[10px] font-bold">
                                  <span>🎁 Mani + Pedi Combo discount</span>
                                  <span className="font-mono">-$5.00</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1 text-[11px]">
                          <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider">Specialist</span>
                          <span className="font-medium text-stone-200 text-[11px] text-right line-clamp-1">{selectedTech ? `${selectedTech.name}` : "None selected"}</span>
                        </div>

                        <div className="flex items-center justify-between py-1 text-[11px]">
                          <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider">Date</span>
                          <span className="font-medium text-[#D4AF37] text-[11px]">{selectedDate || "None selected"}</span>
                        </div>

                        <div className="flex items-center justify-between py-1 text-[11px]">
                          <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider">Time Slot</span>
                          <span className="font-medium text-[#D4AF37] text-[11px]">{selectedTimeSlot || "None selected"}</span>
                        </div>
                      </div>
                      
                      {/* Cancellation and No-Show policy notice */}
                      <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-2.5 text-[9.5px] text-stone-300 leading-snug my-1 mt-2 text-left">
                        <span className="text-amber-500 font-bold block mb-0.5">⚠️ Cancellation & No-Show Policy</span>
                        Schedules can be cancelled self-service up to 72 hours prior to the appointment. Cancellations within 72 hours require staff interaction and incur a <strong className="text-rose-400 font-bold">$25 fee</strong> due to loss of revenue and time.
                      </div>
                    </div>

                    {/* Bottom: Pricing structure and Action buttons (stacked on mobile, inline on sm+) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-800 pt-2.5">
                      <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3 text-left">
                        <div>
                          <span className="text-[9px] font-mono text-stone-400 block uppercase tracking-wider pb-0.5">Grand Total</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-rose-400 font-mono font-bold text-xl sm:text-2xl">
                              ${selectedService ? selectedService.price.toFixed(2) : "0.00"}
                            </span>
                            {appliedVoucher && (
                              <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                                (-${appliedVoucher.discountAmount.toFixed(2)} Voucher)
                              </span>
                            )}
                          </div>
                        </div>
                        {appliedVoucher && (
                          <button
                            type="button"
                            onClick={() => setAppliedVoucher(null)}
                            className="text-[9px] text-stone-400 hover:text-stone-300 uppercase tracking-widest underline block shrink-0"
                          >
                            Remove Voucher
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto font-sans">
                        <button
                          type="button"
                          onClick={() => setBookingStep(2)}
                          className="flex-1 sm:flex-none bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold py-2 px-5 rounded-xl text-[10px] sm:text-xs transition duration-200 uppercase tracking-wider cursor-pointer text-center"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="flex-2 sm:flex-none bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-bold py-3 px-6 rounded-xl text-[10px] sm:text-xs transition duration-200 uppercase tracking-wider cursor-pointer select-none text-center shadow-md hover:shadow-rose-900/15"
                        >
                          Confirm Booking
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        );

      case "my-profile":
        return (
          <div className="space-y-6">


            {!currentUser ? (
              <div className="max-w-md mx-auto bg-white border border-stone-150 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="text-center space-y-1">
                  <span className="inline-flex p-3 bg-[#F9F6F2] text-[#8C8279] rounded-full border border-stone-200">
                    <User className="w-6 h-6" />
                  </span>
                  <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight">Access Your Account</h3>
                  <p className="text-xs text-stone-500">Log in to view notifications, edit reminders, and claim rewards.</p>
                </div>

                {/* Tab select between Log In and Register */}
                <div className="flex border-b border-stone-100 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setSignInError("");
                      setSignInPassword("");
                    }}
                    className={`flex-1 text-center pb-2.5 text-xs uppercase font-bold tracking-wider transition duration-150 cursor-pointer ${
                      authMode === "login"
                        ? "text-rose-600 border-b-2 border-rose-600"
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setSignInError("");
                      setSignInPassword("");
                    }}
                    className={`flex-1 text-center pb-2.5 text-xs uppercase font-bold tracking-wider transition duration-150 cursor-pointer ${
                      authMode === "register"
                        ? "text-rose-600 border-b-2 border-rose-600"
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {signInError && (
                  <p className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-lg font-mono text-center">{signInError}</p>
                )}

                {authMode === "login" ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-mono text-stone-400 uppercase font-bold">Email Address</label>
                      <input
                        type="email"
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                        placeholder="e.g. eleanor@example.com"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-mono text-stone-400 uppercase font-bold">Password</label>
                      <input
                        type="password"
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isAuthSubmitting}
                      className="w-full bg-[#1A1A1A] hover:bg-stone-800 disabled:bg-stone-400 text-stone-100 font-semibold py-2.5 rounded-xl text-xs transition duration-200 uppercase tracking-wider cursor-pointer"
                    >
                      {isAuthSubmitting ? "Logging in..." : "Log In Securely"}
                    </button>
                    <p className="text-[10px] text-stone-400 text-center">
                      Existing tester accounts (e.g., <span className="font-mono">eleanor@example.com</span>) can use default password <span className="font-mono">password123</span>.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-mono text-stone-400 uppercase font-bold">Full Name</label>
                      <input
                        type="text"
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                        placeholder="e.g. Eleanor Vance"
                        value={signInName}
                        onChange={(e) => setSignInName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-mono text-stone-400 uppercase font-bold">Phone Number</label>
                      <input
                        type="tel"
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                        placeholder="e.g. 555-0144"
                        value={signInPhone}
                        onChange={(e) => setSignInPhone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-mono text-stone-400 uppercase font-bold">Email Address</label>
                      <input
                        type="email"
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                        placeholder="e.g. eleanor@example.com"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-mono text-stone-400 uppercase font-bold">Choose Password</label>
                      <input
                        type="password"
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                        placeholder="Minimum 6 characters recommended"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isAuthSubmitting}
                      className="w-full bg-[#1A1A1A] hover:bg-stone-800 disabled:bg-stone-400 text-stone-100 font-semibold py-2.5 rounded-xl text-xs transition duration-200 uppercase tracking-wider cursor-pointer"
                    >
                      {isAuthSubmitting ? "Creating account..." : "Create Account & Sign In"}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-6 text-left">
                <div className={isMobileSim ? "flex flex-col gap-6" : "grid grid-cols-1 md:grid-cols-3 gap-6"}>
                  
                  {/* Profile Card & Info */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-stone-150 p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-50 text-red-700 border border-red-200 rounded-full flex items-center justify-center font-bold text-lg font-display">
                          {currentUser.name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-stone-800 text-sm leading-tight">{currentUser.name}</h3>
                          <p className="text-[11px] text-stone-400">{currentUser.phone}</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-xs pt-1 border-t border-stone-100">
                        <p className="flex justify-between">
                          <span className="text-stone-400">Email:</span>
                          <span className="text-stone-700 font-mono text-[11px]">{currentUser.email || "N/A"}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-stone-400">Visits Count (Spa DB):</span>
                          <span className="font-bold text-stone-900 font-mono">{userProfileInDB?.visitsCount || 1}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-stone-400">Total Spa Spend:</span>
                          <span className="font-bold text-stone-950 font-mono">${(userProfileInDB?.totalSpend || 0.00).toFixed(2)}</span>
                        </p>
                        <p className="flex justify-between items-center text-xs">
                          <span className="text-stone-400">Current Loyalty Level:</span>
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-150 px-2 py-0.5 rounded-full uppercase">
                            {(() => {
                              const pts = userProfileInDB?.loyaltyPoints || 0;
                              if (pts >= 1000) return "Platinum VIP";
                              if (pts >= 500) return "Gold Member";
                              if (pts >= 200) return "Silver Member";
                              return "Bronze Member";
                            })()}
                          </span>
                        </p>
                      </div>

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-1.5 border border-red-200 text-red-700 hover:bg-red-50 py-2 rounded-xl text-[10px] sm:text-[11px] transition font-semibold tracking-wider uppercase mt-4 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out / Delete Session
                      </button>
                    </div>

                    {/* RED LADY VIP LOUNGE CARD */}
                    <div className="bg-red-950 text-red-50 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center bg-red-900/40 p-2 border border-red-800 rounded-lg">
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4 text-amber-400 animate-pulse" />
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-red-200 text-left">The Red Lady VIP Lounge</span>
                          </div>
                        </div>

                        <div className="pt-2 text-center">
                          <span className="text-xs text-red-200 uppercase font-mono block">Your Loyalty Balance</span>
                          <span className="text-3xl font-bold font-mono tracking-tight text-white">{userProfileInDB?.loyaltyPoints ?? 0}</span>
                          <span className="text-[9px] text-red-300 block -mt-1 uppercase tracking-widest font-bold">Redeemable Rewards Points</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[9px] text-red-300 font-mono">
                          <span>Next Tier Progress</span>
                          <span>
                            {(() => {
                              const pts = userProfileInDB?.loyaltyPoints || 0;
                              if (pts >= 1000) return "Maxed Platinum!";
                              if (pts >= 500) return `${pts}/1000 pts (Platinum)`;
                              if (pts >= 200) return `${pts}/500 pts (Gold)`;
                              return `${pts}/200 pts (Silver)`;
                            })()}
                          </span>
                        </div>
                        <div className="w-full bg-red-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${(() => {
                                const pts = userProfileInDB?.loyaltyPoints || 0;
                                if (pts >= 1000) return 100;
                                if (pts >= 500) return ((pts - 500) / 500) * 100;
                                if (pts >= 200) return ((pts - 200) / 300) * 100;
                                return (pts / 200) * 100;
                              })()}%`
                            }}
                          ></div>
                        </div>
                        <p className="text-[8px] text-red-200 italic leading-snug mt-1">
                          Points system: Earn 10 points per appointment booked + 1 point per $1 spent on products and treatments!
                        </p>
                      </div>
                    </div>

                    {/* Notification preferences checkbox toggler card */}
                    <div className="bg-white rounded-2xl border border-stone-150 p-5 space-y-4">
                      <h4 className="font-bold text-stone-850 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-stone-100 pb-2">
                        <Settings className="w-4 h-4 text-stone-500" />
                        Settings: Alerts Preference
                      </h4>
                      {prefSaveMessage && (
                        <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded-lg font-medium text-center font-mono">
                          {prefSaveMessage}
                        </p>
                      )}
                      
                      <div className="space-y-3 pt-1">
                        <label className="flex items-start gap-2.5 cursor-pointer text-stone-700 hover:text-[#1A1A1A] transition">
                          <input
                            type="checkbox"
                            checked={prefConfirmations}
                            onChange={(e) => setPrefConfirmations(e.target.checked)}
                            className="rounded text-red-700 focus:ring-red-650 border-stone-300 mt-1 cursor-pointer"
                          />
                          <div className="text-left">
                            <span className="text-[11px] font-semibold block leading-tight">Confirmations</span>
                            <span className="text-[9px] text-stone-400 block mt-0.5 leading-none">Instant confirmations on newly secured bookings</span>
                          </div>
                        </label>
                        <label className="flex items-start gap-2.5 cursor-pointer text-stone-700 hover:text-[#1A1A1A] transition">
                          <input
                            type="checkbox"
                            checked={prefReminders}
                            onChange={(e) => setPrefReminders(e.target.checked)}
                            className="rounded text-red-700 focus:ring-red-650 border-stone-300 mt-1 cursor-pointer"
                          />
                          <div className="text-left">
                            <span className="text-[11px] font-semibold block leading-tight">Reminders</span>
                            <span className="text-[9px] text-stone-400 block mt-0.5 leading-none">Push reminders simulated 24-hours & 1-hour before sessions</span>
                          </div>
                        </label>
                        <label className="flex items-start gap-2.5 cursor-pointer text-stone-700 hover:text-[#1A1A1A] transition">
                          <input
                            type="checkbox"
                            checked={prefCancellations}
                            onChange={(e) => setPrefCancellations(e.target.checked)}
                            className="rounded text-red-700 focus:ring-red-650 border-stone-300 mt-1 cursor-pointer"
                          />
                          <div className="text-left">
                            <span className="text-[11px] font-semibold block leading-tight">Cancellations</span>
                            <span className="text-[9px] text-stone-400 block mt-0.5 leading-none">Cancellations alerts when bookings are adjusted</span>
                          </div>
                        </label>
                        <label className="flex items-start gap-2.5 cursor-pointer text-stone-700 hover:text-[#1A1A1A] transition">
                          <input
                            type="checkbox"
                            checked={prefPromotions}
                            onChange={(e) => setPrefPromotions(e.target.checked)}
                            className="rounded text-red-700 focus:ring-red-650 border-stone-300 mt-1 cursor-pointer"
                          />
                          <div className="text-left">
                            <span className="text-[11px] font-semibold block leading-tight">Exclusive Promotions</span>
                            <span className="text-[9px] text-stone-400 block mt-0.5 leading-none">Special offers and monthly giveaways from management</span>
                          </div>
                        </label>
                      </div>

                      <button
                        onClick={handleSavePreferences}
                        className="w-full bg-[#1A1A1A] hover:bg-stone-800 text-white font-semibold py-2 rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
                      >
                        Update Alert Preferences
                      </button>
                    </div>
                  </div>

                  {/* Right side: Points shop and redemption list */}
                  <div className={isMobileSim ? "space-y-6 w-full" : "md:col-span-2 space-y-6"}>
                    {/* VIP Loyalty Rewards Shop */}
                    <div className="bg-white rounded-2xl border border-stone-150 p-5 space-y-4 text-left">
                      <div className="flex justify-between items-center border-b border-stone-100 pb-2.5">
                        <h3 className="font-bold text-stone-850 text-base tracking-tight font-display flex items-center gap-1.5">
                          <Tag className="w-5 h-5 text-red-700 shrink-0" />
                          The Red Lady Rewards Shop
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">Spend Points</span>
                      </div>

                      {redemptionSuccess && (
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3 rounded-xl text-xs font-mono">
                          {redemptionSuccess}
                        </div>
                      )}

                      {redemptionError && (
                        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 rounded-xl text-xs font-mono">
                          {redemptionError}
                        </div>
                      )}

                      <div className={isMobileSim ? "flex flex-col gap-3.5" : "grid grid-cols-1 sm:grid-cols-2 gap-3.5"}>
                        {REWARDS_SHOP.map(rew => {
                          const balance = userProfileInDB?.loyaltyPoints || 0;
                          const canAfford = balance >= rew.pointsCost;
                          return (
                            <div key={rew.id} className="p-3.5 bg-stone-50 rounded-xl border border-stone-100 flex flex-col justify-between space-y-2 text-left">
                              <div className="space-y-1">
                                <div className="flex justify-between items-start gap-1">
                                  <span className="font-bold text-xs text-stone-800">{rew.title}</span>
                                  <span className="text-[9.5px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-mono whitespace-nowrap shrink-0">{rew.pointsCost} pts</span>
                                </div>
                                <p className="text-[10px] text-stone-500 leading-snug">{rew.desc}</p>
                              </div>
                              
                              <button
                                disabled={!canAfford}
                                onClick={() => handleRedeemReward(rew.pointsCost, rew.title, rew.discount)}
                                className={`w-full mt-2 font-semibold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wider transition ${
                                  canAfford
                                    ? "bg-red-950 text-white hover:bg-red-900 cursor-pointer"
                                    : "bg-stone-100 text-stone-300 cursor-not-allowed"
                                }`}
                              >
                                {canAfford ? "Claim Prize Voucher" : "Requires More Points"}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Claimed vouchers panel */}
                      {userProfileInDB?.redeemedRewards && userProfileInDB.redeemedRewards.length > 0 && (
                        <div className="pt-4 border-t border-stone-100 space-y-2">
                          <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Your Claimed Reward Vouchers ({userProfileInDB.redeemedRewards.filter(r => !r.used).length} Active)</h4>
                          <div className={isMobileSim ? "flex flex-col gap-2.5" : "grid grid-cols-1 sm:grid-cols-2 gap-2.5"}>
                            {userProfileInDB.redeemedRewards.map((reward: any) => (
                              <div key={reward.id} className={`p-3 rounded-xl border flex justify-between items-center text-left ${reward.used ? "bg-stone-50 border-stone-150 opacity-55" : "bg-emerald-50/50 border-emerald-200"}`}>
                                <div>
                                  <span className="text-xs font-bold block text-stone-800">{reward.rewardTitle}</span>
                                  <span className="text-[9px] font-mono text-stone-400 block">Redeemed: {reward.redeemedAt}</span>
                                  {!reward.used && (
                                    <span className="inline-block mt-1 font-mono text-[10px] bg-white border border-emerald-300 font-bold text-emerald-800 px-1.5 py-0.5 rounded select-all cursor-pointer">
                                      CODE: {reward.claimedCode}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right whitespace-nowrap shrink-0">
                                  {reward.used ? (
                                    <span className="text-[9px] uppercase font-bold text-stone-400 font-mono">Spent</span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setAppliedVoucher({
                                          id: reward.id,
                                          code: reward.claimedCode,
                                          discountAmount: reward.discountAmount,
                                          title: reward.rewardTitle
                                        });
                                        setActiveTab("book");
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer uppercase transition"
                                    >
                                      Use Code
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Booking History */}
                    <div className="bg-white rounded-2xl border border-stone-150 p-5 space-y-4">
                      <h3 className="font-bold text-stone-850 text-base tracking-tight font-display mb-2">My Visit Logs & History</h3>
                      
                      {cancelStatusMsg && (
                        <div className={`p-3 rounded-xl text-xs font-semibold ${
                          cancelStatusMsg.type === "success" 
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                            : "bg-rose-50 text-rose-800 border border-rose-250"
                        }`}>
                          {cancelStatusMsg.text}
                        </div>
                      )}

                      {userAppointments.length > 0 && (
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex gap-2.5 text-left text-[11.5px] text-amber-800 leading-snug">
                          <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-semibold block text-amber-900 mb-0.5">Cancellation Policy & Fee Warning</strong>
                            Schedules can be cancelled self-service up to 72 hours beforehand. Within 72 hours, cancellations must be handled exclusively by POS system operators/staff or technicians, and are subject to a <strong className="text-amber-950 font-bold">$25 fee</strong> due to loss of revenue and time.
                          </div>
                        </div>
                      )}

                      {userAppointments.length === 0 ? (
                        <div className="text-center p-8 bg-stone-50 rounded-xl space-y-2">
                          <Calendar className="w-8 h-8 text-stone-300 mx-auto" />
                          <p className="text-xs text-stone-500 font-medium">No bookings logged for {currentUser.phone}</p>
                          <button
                            type="button"
                            onClick={() => setActiveTab("book")}
                            className="text-[11px] bg-[#1A1A1A] hover:bg-stone-800 text-white font-medium px-3.5 py-1.5 rounded-lg uppercase transition cursor-pointer"
                          >
                            Book First Treatment
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3.5 divide-y divide-stone-100 max-h-96 overflow-y-auto pr-1">
                          {userAppointments.map((app) => (
                            <div key={app.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center gap-3 text-left">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-stone-800">{app.serviceName}</span>
                                  <span className={`text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                                    app.status === "Completed"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : app.status === "Cancelled"
                                      ? "bg-stone-200 text-stone-600"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}>
                                    {app.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span>Specialist: <strong>{app.technicianName}</strong></span>
                                  <span>•</span>
                                  <span>Date: <strong>{app.date}</strong></span>
                                  <span>•</span>
                                  <span>Time: <strong>{app.time}</strong></span>
                                </p>
                              </div>
                              
                              {/* Price and Cancellation Action */}
                              <div className="flex items-center sm:items-end justify-between sm:flex-col gap-2 shrink-0 ml-auto text-right">
                                <span className="text-xs font-bold text-stone-900 font-mono block">
                                  ${app.price.toFixed(2)}
                                </span>

                                {app.status !== "Completed" && app.status !== "Cancelled" && (
                                  <div className="text-right mt-1">
                                    {isCancelRestricted(app.date, app.time) ? (
                                      <div className="text-right flex flex-col items-end">
                                        <span className="text-[9px] font-bold text-rose-600 block">
                                          🔒 Staff Only
                                        </span>
                                        <span className="text-[7.5px] text-stone-400 font-medium font-mono">Under 72h ($25 policy)</span>
                                      </div>
                                    ) : (
                                      <div>
                                        {confirmingAppId === app.id ? (
                                          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleClientCancel(app.id);
                                                setConfirmingAppId(null);
                                              }}
                                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[8px] py-1 px-2 rounded-md uppercase cursor-pointer"
                                            >
                                              Confirm
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setConfirmingAppId(null)}
                                              className="bg-stone-300 hover:bg-stone-400 text-stone-800 font-semibold text-[8px] py-1 px-2 rounded-md uppercase cursor-pointer"
                                            >
                                              No
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setConfirmingAppId(app.id)}
                                            className="bg-white hover:bg-rose-50 text-stone-600 hover:text-rose-600 font-bold text-[9px] px-2.5 py-1 rounded-lg border border-stone-200 hover:border-rose-200 transition cursor-pointer uppercase tracking-wider"
                                          >
                                            Cancel
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        );

      case "services":
        return (
          <div className="space-y-6">
            <div className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row justify-between sm:items-end gap-3">
              <div>
                <h2 className="text-2xl font-bold font-display text-stone-800 tracking-tight">The Red Lady inspired Services</h2>
                <p className="text-xs text-stone-500 mt-1">
                  Discover our curated luxury menu with transparent pricing, handcrafted techniques, and modern enhancements.
                </p>
              </div>
              {selectedService && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-1.5 flex items-center gap-2 self-start sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-[10px] text-stone-700 font-medium">Selected: <strong className="text-rose-600">{selectedService.name}</strong></span>
                </div>
              )}
            </div>

            {/* The Red Lady button-based Category Picker */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-stone-100/80 rounded-2xl border border-stone-200/50">
              {["Mani Bar", "Pedi Bar", "Nails Bar", "Add Aura"].map((cat) => {
                const isActive = activeServiceCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveServiceCategory(cat)}
                    className={`flex-1 min-w-[90px] text-center font-bold font-display uppercase tracking-wider text-[10px] py-3 px-2 rounded-xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-stone-900 text-white shadow-md scale-102"
                        : "bg-transparent text-stone-600 hover:text-stone-900 hover:bg-white/45"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Services Grid/List */}
            <div className={isMobileSim ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
              {services
                .filter((s) => s.category === activeServiceCategory)
                .map((srv, idx) => {
                  const isCurSelected = selectedServices.some(s => s.name === srv.name);
                  const isCreator = srv.name.includes("Creator Customized");
                  return (
                    <div
                      key={idx}
                      className={`relative rounded-2xl border p-4.5 transition duration-300 flex flex-col justify-between ${
                        isCurSelected
                          ? isCreator
                            ? "border-amber-400 bg-amber-50/25 shadow-xs ring-1 ring-amber-400/40"
                            : "border-rose-400 bg-rose-50/20 shadow-xs ring-1 ring-rose-400/30"
                          : isCreator
                            ? "border-amber-250 bg-amber-50/10 hover:border-amber-400 hover:bg-amber-50/20 hover:shadow-xs"
                            : "border-stone-150 bg-white hover:border-stone-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="space-y-2">
                        {isCreator && (
                          <div className="inline-flex items-center gap-0.5 text-[8px] text-amber-700 font-bold uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                            <span>✨ Creator Curated</span>
                          </div>
                        )}
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-semibold text-stone-800 text-xs sm:text-sm font-display leading-snug">
                            {srv.name}
                          </h3>
                          <div className="text-right shrink-0">
                            <span className={`font-mono font-bold text-sm sm:text-base ${isCreator ? "text-amber-700" : "text-rose-600"}`}>
                              ${srv.price.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] sm:text-xs text-stone-500 leading-relaxed min-h-[40px]">
                          {srv.desc}
                        </p>

                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-stone-400">
                          <span className="bg-stone-100 px-2 py-0.5 rounded-sm">Duration: {srv.duration}</span>
                          <span className="bg-stone-100 px-2 py-0.5 rounded-sm uppercase">{srv.category}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-stone-100/60 flex items-center justify-between gap-2">
                        <span className="text-[9px] text-stone-400 italic">
                          {isCurSelected ? "Ready for booking draft" : "Professional nail therapy"}
                        </span>
                        
                        <div className="flex gap-2">
                          {isCurSelected ? (
                            <div className="flex gap-1.5 items-center">
                              {/* Option to deselect in Services catalog */}
                              <button
                                type="button"
                                onClick={() => handleServiceClick(srv)}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-605 font-medium py-2 px-2.5 rounded-xl text-[9px] sm:text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                                title="Remove selection"
                              >
                                Remove
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setWizardCategory(srv.category || "Mani Bar");
                                  setActiveTab("book");
                                }}
                                className="bg-stone-900 hover:bg-stone-800 text-white font-bold py-2 px-3.5 rounded-xl text-[9px] sm:text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <span>Book Draft Now</span>
                                <ArrowRight className="w-3 h-3 text-rose-500" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                handleServiceClick(srv);
                                setWizardCategory(srv.category || "Mani Bar");
                                setActiveTab("book");
                              }}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3.5 rounded-xl text-[9px] sm:text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs hover:shadow-rose-600/10"
                            >
                              <span>+ Select</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );

      case "home":
      default:
        return (
          <div className="space-y-10">
            {/* Elegant Spa Hero Banner */}
            <div className="relative bg-[#EAE3DC] rounded-[32px] p-6 sm:p-8 md:p-12 h-auto md:h-[350px] flex md:flex-row flex-col justify-between items-center overflow-hidden border border-[#DCD5CD] gap-6">
              {/* Gold pill shape floating behind */}
              <div className="absolute right-[-40px] bottom-[-60px] w-[280px] h-[400px] bg-[#D4AF37] pill-mask rotate-12 opacity-30 mix-blend-multiply pointer-events-none"></div>
              
              <div className="z-10 flex flex-col justify-between h-full space-y-4 md:space-y-6 text-left max-w-sm sm:max-w-md md:w-1/2">
                <div className="space-y-2">
                  <span className="px-3 py-1 bg-[#1A1A1A] text-white text-[9px] uppercase tracking-widest rounded-full w-max block font-bold">Bespoke Experience</span>
                  <h1 className="font-serif text-2xl sm:text-3xl md:text-5xl leading-tight text-[#1A1A1A] mt-2">Sculpting <span className="italic">Luxury</span> <br />At Your Fingertips</h1>
                </div>
                <div className="space-y-4">
                  <p className="text-[11px] sm:text-xs leading-relaxed text-[#8C8279] italic max-w-sm">
                    Experience medical-grade Russian manicures, handcrafted 3D gel overlays, and restorative paraffin care customized to your beauty profile.
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2.5">
                    <button
                      onClick={() => setActiveTab("book")}
                      className="bg-[#1A1A1A] text-stone-100 hover:bg-stone-800 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-[9px] sm:text-[10px] tracking-wider uppercase font-bold transition duration-200 flex items-center gap-1.5 cursor-pointer select-none"
                    >
                      <span>Reserve Slot Now</span>
                      <ArrowRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    </button>
                    <button
                      onClick={() => setActiveTab("products")}
                      className="border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-[9px] sm:text-[10px] tracking-wider uppercase font-bold transition duration-200 cursor-pointer select-none"
                    >
                      Shop
                    </button>
                  </div>
                </div>
              </div>

              {/* Right decorative pill image frame - Enabled and formatted for both Desktop and Mobile */}
              <div className="flex justify-center md:justify-end items-center md:pr-4 relative z-10 w-full md:w-1/2 mt-2 md:mt-0">
                <div className="w-36 h-48 sm:w-44 sm:h-56 md:w-48 md:h-64 bg-gray-400 pill-mask border-[4px] border-white shadow-2xl overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80"
                    alt="Luxury Model"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-[9px] sm:text-[10px] tracking-wider uppercase font-bold font-serif italic whitespace-nowrap bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-md">Bespoke Polish</span>
                </div>
              </div>
            </div>

            {/* Creator of the Month Customizable Package (Prompt requirement!) */}
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-[#E5E0DA] pb-2 text-left">
                <div>
                  <span className="sub-label">EXCLUSIVE CAMPAIGN</span>
                  <h2 className="text-2xl font-serif italic text-[#1A1A1A] mt-1">Creator of the Month Package</h2>
                  <p className="text-xs text-[#8C8279]">Every month, one beauty influencer designs a custom-tailored luxury nail template.</p>
                </div>
                <span className="text-[10px] font-mono uppercase bg-[#EAE3DC] text-[#1A1A1A] px-3.5 py-1.5 rounded-full font-bold border border-[#DCD5CD]">
                  June Special
                </span>
              </div>

              {creatorPackage && (
                <div className="bg-white border border-[#E5E0DA] rounded-[32px] overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 gap-0">
                  <div className="md:col-span-5 h-64 md:h-full min-h-[300px] relative overflow-hidden bg-[#F9F6F2]">
                    <img
                      src={creatorPackage.image}
                      alt={creatorPackage.packageName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover select-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131110] via-transparent to-transparent"></div>
                    <div className="absolute bottom-5 left-5 flex items-center gap-3">
                      <img
                        src={creatorPackage.avatar}
                        alt={creatorPackage.influencerName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full border-2 border-white object-cover"
                      />
                      <div className="text-left text-white leading-none shadow-xs">
                        <p className="text-[9px] text-[#D4AF37] tracking-[0.12em] uppercase font-bold">Specialist Designer</p>
                        <span className="text-xs sm:text-sm md:text-base font-serif italic leading-none whitespace-nowrap block mt-1">{creatorPackage.influencerName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-7 p-8 space-y-6 flex flex-col justify-between text-left">
                    <div className="space-y-3 text-left">
                      <span className="text-[9px] tracking-[0.15em] uppercase font-bold text-[#8C8279]">Curated Edition</span>
                      <h3 className="text-2xl font-serif italic text-[#1A1A1A] leading-tight">{creatorPackage.packageName} Collection</h3>
                      <p className="text-xs text-[#8C8279] leading-relaxed text-justify">{creatorPackage.packageDescription}</p>

                      <div className="pt-2 text-left space-y-2">
                        <span className="text-[9px] tracking-[0.12em] uppercase text-[#8C8279] block font-bold">Services & Treatments Included:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {creatorPackage.itemsIncluded.map((item, id) => (
                            <div key={id} className="flex items-center gap-2 text-stone-605 text-[10.5px]">
                              <Check className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                              <span className="truncate">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-[#E5E0DA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-[10px] text-[#8C8279] uppercase tracking-wider font-bold block">Custom Curated Package Price</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-bold text-[#1A1A1A] font-mono">${creatorPackage.packagePrice.toFixed(2)}</span>
                          <span className="text-xs text-[#8C8279] font-mono line-through">$190.00 value</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const matchingService = services.find(s => s.name.includes("Creator Customized"));
                          setSelectedService(matchingService || { name: `Creator Customized Pack: ${creatorPackage.packageName}`, price: creatorPackage.packagePrice });
                          setActiveTab("book");
                        }}
                        className="bg-[#1A1A1A] hover:bg-stone-850 text-white font-semibold px-6 py-3 rounded-full text-[10px] uppercase tracking-widest transition flex items-center gap-1.5 cursor-pointer select-none"
                      >
                        Book Customized Package
                        <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top 5 Monthly Trends (Prompt requirement!) */}
            <div className="space-y-4">
              <div className="border-b border-[#E5E0DA] pb-2 flex justify-between items-end text-left">
                <div>
                  <span className="sub-label">POPULAR INSPIRATION</span>
                  <h2 className="text-2xl font-serif italic text-[#1A1A1A] mt-1">Top 5 Monthly Nail Trends</h2>
                  <p className="text-xs text-[#8C8279]">Live studio statistics. Tap heart to up-vote a trend.</p>
                </div>
                <span className="text-[9px] tracking-wider uppercase font-bold text-[#8C8279]">Ranked by Hearts</span>
              </div>

              {(() => {
                const activeTrends = trends.slice(0, 5);
                if (activeTrends.length === 0) return null;

                const isMobileSim = viewport === "iphone" || viewport === "android";
                const currentTrend = activeTrends[activeTrendIndex % activeTrends.length] || activeTrends[0];

                const nextTrend = () => {
                  setActiveTrendIndex((prev) => (prev + 1) % activeTrends.length);
                };

                const prevTrend = () => {
                  setActiveTrendIndex((prev) => (prev - 1 + activeTrends.length) % activeTrends.length);
                };

                return (
                  <>
                    {/* Grid view showing for desktop/tablet viewports, unless it's the iPhone/Android simulators */}
                    <div className={`${isMobileSim ? "hidden" : "hidden sm:grid"} lg:grid-cols-5 sm:grid-cols-2 gap-4`}>
                      {activeTrends.map((trend) => (
                        <div key={trend.id} className="bg-white border border-[#E5E0DA] rounded-[24px] overflow-hidden shadow-xs hover:shadow-sm transition duration-300 flex flex-col justify-between">
                          <div className="h-32 relative bg-[#F9F6F2] overflow-hidden">
                            <img
                              src={trend.image}
                              alt={trend.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover select-none"
                            />
                            <span className="absolute top-3 left-3 bg-[#1A1A1A] text-white font-serif italic text-xs w-6 h-6 flex items-center justify-center rounded-full shadow-md">
                              {trend.rank}
                            </span>
                          </div>

                          <div className="p-4 text-left space-y-2.5 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-[#1A1A1A] tracking-wider uppercase line-clamp-1">{trend.title}</h4>
                              <p className="text-[10px] text-[#8C8279] leading-relaxed line-clamp-3 mt-1 text-justify">{trend.description}</p>
                            </div>

                            <div className="pt-2 border-t border-[#E5E0DA] flex items-center justify-between">
                              <button
                                onClick={() => handleVoteTrend(trend.id)}
                                className="flex items-center gap-1.5 bg-[#F9F6F2] border border-[#E5E0DA] text-[#1A1A1A] hover:bg-[#EAE3DC] px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition select-none cursor-pointer"
                              >
                                <Heart className="w-3.5 h-3.5 fill-[#1A1A1A] shrink-0 text-[#1A1A1A]" />
                                <span>{trend.hearts}</span>
                              </button>
                              <span className="text-[8px] uppercase tracking-wider font-bold text-[#8C8279]">Upvote</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Elegant Sliding Page for Mobile viewports & Simulators */}
                    <div className={`${isMobileSim ? "block" : "block sm:hidden"} w-full`}>
                      <div className="relative bg-white border border-[#E5E0DA] rounded-[24px] overflow-hidden shadow-sm p-4 flex flex-col justify-between">
                        {/* Slide image container with float navigation */}
                        <div className="h-44 relative bg-[#F9F6F2] rounded-2xl overflow-hidden mb-4">
                          <AnimatePresence mode="wait">
                            <motion.img
                              key={currentTrend.id}
                              src={currentTrend.image}
                              alt={currentTrend.title}
                              referrerPolicy="no-referrer"
                              initial={{ opacity: 0, x: 80 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -80 }}
                              transition={{ duration: 0.35, ease: "easeInOut" }}
                              className="w-full h-full object-cover select-none absolute inset-0"
                            />
                          </AnimatePresence>

                          {/* Quick overlays */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>

                          {/* Rank badge */}
                          <span className="absolute top-3 left-3 bg-[#1A1A1A] text-white font-serif italic text-xs w-7 h-7 flex items-center justify-center rounded-full shadow-lg z-10">
                            #{currentTrend.rank}
                          </span>

                          {/* Swipe overlay arrow indicators */}
                          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between px-1 z-10">
                            <button
                              onClick={prevTrend}
                              className="w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center text-stone-800 hover:bg-white active:scale-95 transition cursor-pointer"
                              aria-label="Previous Trend"
                            >
                              <ChevronLeft className="w-5 h-5 text-stone-800" />
                            </button>
                            <button
                              onClick={nextTrend}
                              className="w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center text-stone-800 hover:bg-white active:scale-95 transition cursor-pointer"
                              aria-label="Next Trend"
                            >
                              <ChevronRight className="w-5 h-5 text-stone-800" />
                            </button>
                          </div>
                        </div>

                        {/* Slide metadata and descriptions */}
                        <div className="space-y-3 min-h-[120px] flex flex-col justify-between text-left">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={currentTrend.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.25 }}
                              className="space-y-1"
                            >
                              <h4 className="text-sm font-bold text-[#1A1A1A] tracking-wider uppercase">{currentTrend.title}</h4>
                              <p className="text-xs text-[#8C8279] leading-relaxed text-justify mt-1.5">{currentTrend.description}</p>
                            </motion.div>
                          </AnimatePresence>

                          <div className="pt-3 border-t border-[#E5E0DA] flex items-center justify-between">
                            <button
                              onClick={() => handleVoteTrend(currentTrend.id)}
                              className="flex items-center gap-1.5 bg-[#F9F6F2] border border-[#E5E0DA] text-[#1A1A1A] hover:bg-[#EAE3DC] px-3 py-1.5 rounded-full text-xs font-mono font-bold transition select-none cursor-pointer active:scale-95"
                            >
                              <Heart className="w-4 h-4 fill-[#1A1A1A] shrink-0 text-[#1A1A1A]" />
                              <span>{currentTrend.hearts}</span>
                            </button>
                            
                            {/* Slide Pagination dots */}
                            <div className="flex gap-1.5">
                              {activeTrends.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setActiveTrendIndex(idx)}
                                  className={`w-2 h-2 rounded-full transition-all duration-300 ${activeTrendIndex === idx ? "bg-red-700 w-4" : "bg-stone-300"}`}
                                  aria-label={`Go to slide ${idx + 1}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        );
    }
  };

  // Switch wrapper markup to simulate different viewports nicely
  const renderViewportWrapper = () => {
    switch (viewport) {
      case "iphone":
        return (
          <div className="mx-auto max-w-[390px] min-h-[750px] bg-stone-900 p-3 rounded-[40px] shadow-2xl border-4 border-stone-950 relative">
            {/* iPhone Top Speaker / Notch */}
            <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-stone-950 rounded-full z-50 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-900 border border-stone-950"></span>
              <span className="w-12 h-1 bg-stone-800 rounded-full ml-1"></span>
            </div>
            
            <div className="bg-stone-50 rounded-[32px] overflow-y-auto max-h-[740px] min-h-[710px] py-6 px-3 text-left scrollbar-thin">
              {/* Phone Status Bar */}
              <div className="flex justify-between items-center text-[10px] font-mono text-stone-600 px-3 mb-2 pt-1 font-bold">
                <span>09:41 AM</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <Smartphone className="w-3 h-3 text-stone-700" />
                </div>
              </div>

              {/* In-app Tiny Navigation Headers */}
              <header className="flex justify-between items-center bg-white rounded-2xl border border-stone-100 p-3 shadow-xs mb-4">
                <span className="font-serif italic font-bold text-red-950 text-base xs:text-lg tracking-tight flex items-center gap-1.5">
                  <img
                    src="/src/assets/images/judy_jetson_icon_1780276155507.png"
                    alt="The Red Lady Spa Icon"
                    className="w-6.5 h-6.5 rounded-full object-cover shadow-xs border border-rose-300"
                    referrerPolicy="no-referrer"
                  />
                  The Red Lady Spa
                </span>
                
                {currentUser ? (
                  <span className="text-[10px] text-stone-600 font-mono flex items-center gap-1 truncate max-w-[140px]">
                    <User className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    Hi, {currentUser.name.split(" ")[0]}
                  </span>
                ) : (
                  <button
                    onClick={() => setActiveTab("my-profile")}
                    className="text-[9px] bg-rose-600 text-white font-bold px-2 py-1 rounded-sm uppercase tracking-wide cursor-pointer"
                  >
                    Login
                  </button>
                )}
              </header>

              {/* Main Content Area */}
              <div className="pb-16">{renderClientContent()}</div>

              {/* Floating Bottom Nav for Mobile viewports */}
              <nav className="absolute bottom-5 left-4 right-4 bg-stone-900 border border-stone-800 text-stone-100 py-1.5 px-3 rounded-full flex justify-between items-center shadow-lg z-50 gap-1">
                <button
                  onClick={() => setActiveTab("home")}
                  className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "home" ? "text-rose-400" : "text-stone-400"}`}
                >
                  <Home className="w-4 h-4" />
                  <span className="text-[7.5px] uppercase tracking-wide font-mono mt-0.5">Home</span>
                </button>
                <button
                  onClick={() => setActiveTab("services")}
                  className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "services" ? "text-rose-400" : "text-stone-400"}`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[7.5px] uppercase tracking-wide font-mono mt-0.5">Services</span>
                </button>
                <button
                  onClick={() => setActiveTab("products")}
                  className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "products" ? "text-rose-400" : "text-stone-400"}`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-[7.5px] uppercase tracking-wide font-mono mt-0.5">Shop</span>
                </button>
                <button
                  onClick={() => setActiveTab("book")}
                  className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "book" ? "text-rose-400" : "text-stone-400"}`}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-[7.5px] uppercase tracking-wide font-mono mt-0.5">Book</span>
                </button>
                <button
                  onClick={() => setActiveTab("my-profile")}
                  className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "my-profile" ? "text-rose-400" : "text-stone-400"}`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-[7.5px] uppercase tracking-wide font-mono mt-0.5">Account</span>
                </button>
              </nav>
            </div>
          </div>
        );

      case "android":
        return (
          <div className="mx-auto max-w-[390px] min-h-[750px] bg-neutral-900 p-3 rounded-[32px] shadow-2xl border-4 border-stone-800 relative">
            {/* Android Camera Hole */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-black rounded-full z-50"></div>
            
            <div className="bg-neutral-50 rounded-[24px] overflow-y-auto max-h-[740px] min-h-[710px] py-6 px-3 text-left">
              {/* Android Status Bar */}
              <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 px-3 mb-2 pt-1 font-semibold">
                <span>09:41</span>
                <span>📶 🔕 🔋 98%</span>
              </div>

              {/* App Tiny Header */}
              <header className="flex justify-between items-center bg-white rounded-lg border border-neutral-200 p-3 shadow-xs mb-4">
                <span className="font-serif italic font-bold text-red-950 text-base xs:text-lg tracking-tight flex items-center gap-1.5">
                  <img
                    src="/src/assets/images/judy_jetson_icon_1780276155507.png"
                    alt="The Red Lady Spa Icon"
                    className="w-6.5 h-6.5 rounded-full object-cover shadow-xs border border-rose-300"
                    referrerPolicy="no-referrer"
                  />
                  The Red Lady Spa
                </span>
                {currentUser && (
                  <span className="text-[10px] font-mono text-neutral-600 truncate max-w-[140px]">
                    {currentUser.name}
                  </span>
                )}
              </header>

              {/* Main Content Area */}
              <div className="pb-16">{renderClientContent()}</div>

              {/* Bottom Nav */}
              <nav className="absolute bottom-5 left-4 right-4 bg-neutral-950 text-stone-100 py-2 px-3 rounded-xl flex justify-between items-center shadow-lg z-50 gap-1">
                <button onClick={() => setActiveTab("home")} className={`flex flex-col items-center ${activeTab === "home" ? "text-rose-400" : "text-neutral-400"}`}>
                  <Home className="w-4 h-4" />
                  <span className="text-[7.5px] uppercase tracking-wide font-mono mt-0.5">Home</span>
                </button>
                <button onClick={() => setActiveTab("services")} className={`flex flex-col items-center ${activeTab === "services" ? "text-rose-400" : "text-neutral-400"}`}>
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[7.5px] uppercase tracking-wide font-mono mt-0.5">Services</span>
                </button>
                <button onClick={() => setActiveTab("products")} className={`flex flex-col items-center ${activeTab === "products" ? "text-rose-400" : "text-neutral-400"}`}>
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-[7.5px] uppercase tracking-wide font-mono mt-0.5">Shop</span>
                </button>
                <button onClick={() => setActiveTab("book")} className={`flex flex-col items-center ${activeTab === "book" ? "text-rose-400" : "text-neutral-400"}`}>
                  <Calendar className="w-4 h-4" />
                  <span className="text-[7.5px] uppercase tracking-wide font-mono mt-0.5">Book</span>
                </button>
                <button onClick={() => setActiveTab("my-profile")} className={`flex flex-col items-center ${activeTab === "my-profile" ? "text-rose-400" : "text-neutral-400"}`}>
                  <User className="w-4 h-4" />
                  <span className="text-[7.5px] uppercase tracking-wide font-mono mt-0.5">Profile</span>
                </button>
              </nav>
            </div>
          </div>
        );

      case "tablet":
        return (
          <div className="mx-auto max-w-[768px] min-h-[850px] bg-stone-900 p-4 rounded-[28px] shadow-2xl border-4 border-stone-950 relative">
            <div className="bg-stone-50 rounded-[20px] overflow-y-auto max-h-[830px] min-h-[810px] p-6 text-left">
              
              {/* Tablet Header */}
              <header className="flex justify-between items-center bg-white rounded-2xl border border-stone-200 py-4 px-6 shadow-xs mb-6">
                <div onClick={() => setActiveTab("home")} className="cursor-pointer">
                  <span className="font-serif italic font-bold text-red-950 text-2xl sm:text-3xl tracking-tight flex items-center gap-2">
                    <img
                      src="/src/assets/images/judy_jetson_icon_1780276155507.png"
                      alt="The Red Lady Spa Icon"
                      className="w-8.5 h-8.5 rounded-full object-cover border border-[#D4AF37]"
                      referrerPolicy="no-referrer"
                    />
                    The Red Lady Spa
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTab("home")} className={`text-xs font-semibold ${activeTab === "home" ? "text-rose-600" : "text-stone-550"}`}>Home</button>
                  <button onClick={() => setActiveTab("services")} className={`text-xs font-semibold ${activeTab === "services" ? "text-rose-600" : "text-stone-550"}`}>Services</button>
                  <button onClick={() => setActiveTab("products")} className={`text-xs font-semibold ${activeTab === "products" ? "text-rose-600" : "text-stone-550"}`}>Products</button>
                  <button onClick={() => setActiveTab("book")} className={`text-xs font-semibold ${activeTab === "book" ? "text-rose-600" : "text-stone-550"}`}>Book Session</button>
                  <span className="text-stone-300">|</span>

                  {currentUser ? (
                    <div onClick={() => setActiveTab("my-profile")} className="flex items-center gap-1.5 cursor-pointer">
                      <User className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold text-stone-800">{currentUser.name}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveTab("my-profile")}
                      className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4.5 py-1.5 rounded-lg uppercase tracking-wide shadow-xs cursor-pointer"
                    >
                      Sign In / Register
                    </button>
                  )}
                </div>
              </header>

              <div>{renderClientContent()}</div>
            </div>
          </div>
        );

      case "web":
      default:
        // Full Desktop Website View
        return (
          <div className="bg-white rounded-[32px] border border-[#E5E0DA] shadow-sm p-8 text-left min-h-[700px]">
            {/* Website Web Navigation */}
            <header className="flex justify-between items-center border-b border-[#E5E0DA] pb-5 mb-8">
              <div onClick={() => setActiveTab("home")} className="cursor-pointer space-y-1">
                <span className="font-serif text-4xl sm:text-5xl italic font-bold tracking-tight text-red-950 flex items-center gap-2.5">
                  <img
                    src="/src/assets/images/judy_jetson_icon_1780276155507.png"
                    alt="The Red Lady Spa Icon"
                    className="w-10 h-10 rounded-full border border-[#D4AF37] object-cover shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  The Red Lady Spa
                </span>
                <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#8C8279] mt-1">Luxe Spa Portal & Online Reservations</p>
              </div>

              <div className="flex items-center gap-6">
                <button onClick={() => setActiveTab("home")} className={`text-[10px] font-bold uppercase tracking-widest transition duration-150 ${activeTab === "home" ? "text-[#1A1A1A] border-b-2 border-[#1A1A1A] pb-1" : "text-[#8C8279] hover:text-[#1A1A1A]"}`}>Trends & Design</button>
                <button onClick={() => setActiveTab("services")} className={`text-[10px] font-bold uppercase tracking-widest transition duration-150 ${activeTab === "services" ? "text-[#1A1A1A] border-b-2 border-[#1A1A1A] pb-1" : "text-[#8C8279] hover:text-[#1A1A1A]"}`}>Services Menu</button>
                <button onClick={() => setActiveTab("products")} className={`text-[10px] font-bold uppercase tracking-widest transition duration-150 ${activeTab === "products" ? "text-[#1A1A1A] border-b-2 border-[#1A1A1A] pb-1" : "text-[#8C8279] hover:text-[#1A1A1A]"}`}>SPA Products</button>
                <button onClick={() => setActiveTab("book")} className={`text-[10px] font-bold uppercase tracking-widest transition duration-150 ${activeTab === "book" ? "text-[#1A1A1A] border-b-2 border-[#1A1A1A] pb-1" : "text-[#8C8279] hover:text-[#1A1A1A]"}`}>Book Appointment</button>
                <span className="text-stone-300">|</span>

                {currentUser && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowNotificationCenter(prev => !prev);
                        if (!showNotificationCenter) {
                          handleMarkNotificationsAsRead();
                        }
                      }}
                      className="relative p-2 bg-red-50 text-red-700 hover:bg-rose-100 rounded-full transition border border-red-150 cursor-pointer flex items-center justify-center select-none"
                    >
                      <Bell className="w-4 h-4" />
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white font-mono font-bold text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white animate-bounce">
                          {notifications.filter(n => !n.isRead).length}
                        </span>
                      )}
                    </button>

                    {/* Popover Alerts List Box */}
                    {showNotificationCenter && (
                      <div className="absolute right-0 mt-3 w-80 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 p-4 text-left divide-y divide-stone-100 font-sans">
                        <div className="flex justify-between items-center pb-2.5">
                          <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-stone-400">Push Notifications</span>
                          <button
                            onClick={() => {
                              handleMarkNotificationsAsRead();
                              setShowNotificationCenter(false);
                            }}
                            className="text-[9px] font-bold text-red-650 hover:text-red-800 uppercase tracking-wider cursor-pointer"
                          >
                            Mark all read
                          </button>
                        </div>
                        <div className="max-h-56 overflow-y-auto pt-2 space-y-2 scrollbar-thin">
                          {notifications.length === 0 ? (
                            <p className="text-[11px] text-stone-400 italic text-center py-6">Your inbox is empty.</p>
                          ) : (
                            notifications.map(n => (
                              <div key={n.id} className={`p-2 rounded-xl text-left text-xs transition duration-150 ${n.isRead ? "bg-stone-50/50" : "bg-red-50/40 border-l-2 border-red-600 pl-1.5"}`}>
                                <div className="flex justify-between items-start gap-1">
                                  <span className="font-bold text-[#1A1A1A] leading-tight text-[10.5px]">{n.title}</span>
                                  <span className="text-[7px] font-mono text-stone-400 shrink-0">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-[10px] text-stone-500 mt-1 leading-normal">{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-[8px] text-stone-400 text-center pt-2.5 font-mono">The Red Lady Spa Live Notifications Engine</p>
                      </div>
                    )}
                  </div>
                )}

                {currentUser ? (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <div onClick={() => setActiveTab("my-profile")} className="flex items-center gap-1.5 cursor-pointer bg-[#F9F6F2] border border-[#E5E0DA] px-4.5 py-2 rounded-full hover:bg-[#EAE3DC] transition">
                      <User className="w-3.5 h-3.5 text-[#8C8279]" />
                      <span className="text-xs font-bold text-[#1A1A1A]">{currentUser.name}</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveTab("my-profile")}
                    className="px-6 py-2 border border-[#1A1A1A] rounded-full text-[10px] uppercase font-bold hover:bg-[#1A1A1A] hover:text-white transition-colors duration-300 cursor-pointer"
                  >
                    Login
                  </button>
                )}
              </div>
            </header>

            <div>{renderClientContent()}</div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 relative border-t border-stone-100/50 pt-2">
      {/* Real-time Push Notification Simulator Slide down Banner */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm bg-stone-950 text-stone-100 rounded-2xl shadow-2xl border border-rose-500/40 p-4 flex gap-3 text-left overflow-hidden font-sans"
          >
            <div className="absolute top-0 left-0 w-1 bg-red-600 h-full"></div>
            <div className="bg-red-500/10 text-rose-500 p-2.5 rounded-full shrink-0 flex items-center justify-center">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs leading-none flex items-center gap-1.5 font-sans">
                <span>{activeToast.title}</span>
                <span className="text-[8.5px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">SIM PUSH ACTIVE</span>
              </h4>
              <p className="text-[11px] text-stone-300 mt-1 leading-snug font-sans">{activeToast.message}</p>
              <p className="text-[8px] font-mono text-stone-500 mt-2">The Red Lady Spa Live In-App System Dispatcher</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Target Viewport Selector Control Bar */}
      <div className="bg-stone-100 border border-stone-200 rounded-2xl p-3 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="text-left">
          <span className="text-[10px] font-mono text-stone-450 uppercase block font-bold">Multi-Device Preview Simulator</span>
          <p className="text-xs text-stone-600 font-medium">Render the Spa Client experience in responsive viewports:</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewport("web")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              viewport === "web" ? "bg-stone-900 text-white shadow-xs" : "bg-white text-stone-700 hover:bg-stone-200"
            }`}
          >
            <span>💻 Desktop Website</span>
          </button>
          <button
            onClick={() => setViewport("tablet")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              viewport === "tablet" ? "bg-stone-900 text-white shadow-xs" : "bg-white text-stone-700 hover:bg-stone-200"
            }`}
          >
            <span>📟 Tablet Friendly</span>
          </button>
          <button
            onClick={() => setViewport("iphone")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              viewport === "iphone" ? "bg-stone-900 text-white shadow-xs" : "bg-white text-stone-700 hover:bg-stone-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>🍎 iOS App Mock</span>
          </button>
          <button
            onClick={() => setViewport("android")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              viewport === "android" ? "bg-stone-900 text-white shadow-xs" : "bg-white text-stone-700 hover:bg-stone-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>🤖 Android App Mock</span>
          </button>
        </div>
      </div>

      {/* Render selected device frame simulator */}
      <div>{renderViewportWrapper()}</div>
    </div>
  );
}
