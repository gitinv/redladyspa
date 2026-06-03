import React, { useState, useEffect } from "react";
import ClientPortal from "./components/ClientPortal.tsx";
import OwnerPOS from "./components/OwnerPOS.tsx";
import { Sparkles, Calendar, Smartphone, ShieldAlert, MonitorCheck, Compass, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Routing / Environment State based on window.location.pathname
  const [activeSpace, setActiveSpace] = useState<"client" | "owner">(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      if (path.includes("/spapos") || path === "spapos") {
        return "owner";
      }
    }
    return "client";
  });

  const [isDebug, setIsDebug] = useState(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      return search.includes("debug=true") || search.includes("preview=true") || isLocal;
    }
    return false;
  });

  const [refreshClientToken, setRefreshClientToken] = useState(0);
  const [refreshPOSToken, setRefreshPOSToken] = useState(0);

  // Synchronize routing state with browser history (back/forward keys)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes("/spapos") || path === "spapos") {
        setActiveSpace("owner");
      } else {
        setActiveSpace("client");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Update URL pathname on switching spaces manually in debug mode
  const handleSpaceChange = (space: "client" | "owner") => {
    setActiveSpace(space);
    if (typeof window !== "undefined") {
      const targetPath = space === "owner" ? "/spapos" : "/";
      window.history.pushState({}, "", targetPath);
    }
  };

  // Sync state triggers
  const triggerClientRefresh = () => {
    setRefreshClientToken(prev => prev + 1);
  };

  const triggerPOSRefresh = () => {
    setRefreshPOSToken(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#F9F6F2] text-[#1A1A1A] selection:bg-[#EAE3DC] flex flex-col font-sans transition duration-300">
      
      {/* Platform Master Navigation Rails shown only in debug/development mode */}
      {isDebug && (
        <nav className="border-b border-[#E5E0DA] bg-white/60 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            
            {/* Logo / Title Branding */}
            <div className="flex items-center gap-2.5 text-left leading-none">
              <span className="p-2 bg-red-50 text-red-900 rounded-full flex items-center justify-center border border-red-200">
                <Sparkles className="w-5 h-5 text-red-600 animate-spin" style={{ animationDuration: '8s' }} />
              </span>
              <div>
                <span className="font-serif font-semibold text-2xl italic tracking-tight text-red-950 block">The Red Lady Spa</span>
                <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-[#8C8279] mt-1">Unified Full-Stack Spa Solution (Debug)</p>
              </div>
            </div>

            {/* Active Space Segments */}
            <div className="flex bg-[#EAE3DC]/50 p-1 rounded-full border border-[#E5E0DA] shadow-inner">
              <button
                onClick={() => handleSpaceChange("client")}
                className={`px-5 py-2 rounded-full text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition duration-200 cursor-pointer select-none ${
                  activeSpace === "client"
                    ? "bg-[#1A1A1A] text-white shadow"
                    : "text-[#8C8279] hover:text-[#1A1A1A]"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>Customer Portal & Booking</span>
              </button>
              
              <button
                onClick={() => handleSpaceChange("owner")}
                className={`px-5 py-2 rounded-full text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition duration-200 cursor-pointer select-none ${
                  activeSpace === "owner"
                    ? "bg-[#1A1A1A] text-white shadow"
                    : "text-[#8C8279] hover:text-[#1A1A1A]"
                }`}
              >
                <MonitorCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Manager POS Terminal</span>
              </button>
            </div>

          </div>
        </nav>
      )}

      {/* Main Container Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dynamic Space Layout */}
        <AnimatePresence mode="wait">
          {activeSpace === "client" ? (
            <motion.div
              key="client-portal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 text-center"
            >
              {/* Informational Header - debug only */}
              {isDebug && (
                <div className="max-w-2xl mx-auto space-y-1.5 text-center">
                  <span className="sub-label">Interactive Experience</span>
                  <h2 className="text-3xl font-serif italic text-[#1A1A1A]">Client Space & Bespoke Catalog</h2>
                  <p className="text-xs text-[#8C8279] leading-relaxed">
                    Actions completed below (including scheduled reservation times, boutique favorites, and influencer reviews) seamlessly feed the secure Manager POS back-office terminal database instantly.
                  </p>
                </div>
              )}

              {/* Render Core Client Module */}
              <ClientPortal key={refreshClientToken} onRefreshPOSData={triggerPOSRefresh} />
            </motion.div>
          ) : (
            <motion.div
              key="owner-pos"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 text-center"
            >
              {/* Informational Header - debug only */}
              {isDebug && (
                <div className="max-w-2xl mx-auto space-y-1.5 text-center">
                  <span className="sub-label">Administrator Terminal</span>
                  <h2 className="text-3xl font-serif italic text-[#1A1A1A]">Back-office Operations & Analytics</h2>
                  <p className="text-xs text-[#8C8279] leading-relaxed">
                    Record counter checkout audits, replenish master boutique stock levels, manage specialist shift hours, or edit the live creator of the month campaign parameters dynamically.
                  </p>
                </div>
              )}

              {/* Render POS Terminal Module */}
              <OwnerPOS key={refreshPOSToken} onRefreshWebData={triggerClientRefresh} />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Brand Footer */}
      <footer className="border-t border-[#E5E0DA] bg-white/40 py-8 mt-12 text-[10px] text-[#8C8279] tracking-wider uppercase font-semibold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 The Red Lady Spa. {isDebug && "Real-time REST full-stack synchronization environment."}</p>
          {isDebug && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Container Network Interface: Port 3000 Ingress</span>
            </div>
          )}
        </div>
      </footer>

    </div>
  );
}
