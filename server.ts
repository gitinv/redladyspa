import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Product, Technician, Appointment, Trend, CreatorMonth, ClientProfile, Transaction, NotificationItem } from "./src/types.js";

// Database File Path
const DB_FILE = path.join(process.cwd(), "db.json");

// Default Data Schema
interface Database {
  products: Product[];
  technicians: Technician[];
  appointments: Appointment[];
  trends: Trend[];
  creatorMonth: CreatorMonth;
  clients: ClientProfile[];
  transactions: Transaction[];
  notifications: NotificationItem[];
}

const DEFAULT_DATA: Database = {
  products: [
    {
      id: "prod-1",
      name: "Aurora Velvet Chrome Polish",
      category: "Polish",
      price: 18.00,
      description: "Infused with ultra-fine magnetic pigment that shifts colors with a luxury magnetic wand.",
      image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80",
      stock: 45,
      lowStockAlert: 10
    },
    {
      id: "prod-2",
      name: "Japanese Pastels Soft-gel Set",
      category: "Art",
      price: 24.50,
      description: "Premium self-leveling pastel gel polishes with high opacity, used by our master trainers.",
      image: "https://images.unsplash.com/photo-1632345031435-8797b2d58045?w=400&q=80",
      stock: 8,
      lowStockAlert: 12
    },
    {
      id: "prod-3",
      name: "Organic Shea Butter Hand Mask",
      category: "Care",
      price: 15.00,
      description: "Ultra-hydrating paraben-free mask designed to restore elasticity and natural moisture.",
      image: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=400&q=80",
      stock: 30,
      lowStockAlert: 8
    },
    {
      id: "prod-4",
      name: "Japanese Precision Glass File",
      category: "Tools",
      price: 12.00,
      description: "Micro-etched glass file that seals the keratin edge of nails to prevent peeling and splitting.",
      image: "https://images.unsplash.com/photo-1500840244009-7e3c8a69a4c8?w=400&q=80",
      stock: 14,
      lowStockAlert: 5
    },
    {
      id: "prod-5",
      name: "Midnight Eclipse Caviar Charms",
      category: "Art",
      price: 9.00,
      description: "Microscopic dark metallic caviar beads for gorgeous starlight galaxy-themed 3D nail art.",
      image: "https://images.unsplash.com/photo-1595853035070-59a39fe84de3?w=400&q=80",
      stock: 3,
      lowStockAlert: 10
    },
    {
      id: "prod-6",
      name: "Vitamin E Nourishing Cuticle Oil",
      category: "Care",
      price: 10.50,
      description: "Cold-pressed almond and jojoba base with pure tocopherol for strong nail roots.",
      image: "https://images.unsplash.com/photo-1617897903246-719242758050?w=400&q=80",
      stock: 50,
      lowStockAlert: 15
    }
  ],
  technicians: [
    {
      id: "tech-1",
      name: "Chloe Kim",
      role: "Nail Art Queen",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80",
      rating: 4.9,
      specialties: ["3D Gel Art", "Hand-painted Lineage", "Cat-eye Shifts"],
      availability: ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"]
    },
    {
      id: "tech-2",
      name: "Sophia Martinez",
      role: "Sculpting master",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80",
      rating: 4.8,
      specialties: ["Structure Gel Extensions", "Acrylic Extensions", "Russian Manicure"],
      availability: ["10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"]
    },
    {
      id: "tech-3",
      name: "Marcus Chen",
      role: "Precision Minimalist",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
      rating: 4.9,
      specialties: ["Minimalist Linework", "Matte Overlay", "Chrome Accents"],
      availability: ["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"]
    },
    {
      id: "tech-4",
      name: "Yuki Tanaka",
      role: "Japanese Artistry Specialist",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
      rating: 5.0,
      specialties: ["Enamel Pastels", "3D Jelly Flowers", "Foil Overlay"],
      availability: ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"]
    }
  ],
  appointments: [
    {
      id: "app-1",
      clientName: "Eleanor Vance",
      clientPhone: "555-0144",
      clientEmail: "eleanor@example.com",
      serviceName: "Aurora Velvet Cat-eye Shellac",
      technicianId: "tech-1",
      technicianName: "Chloe Kim",
      date: "2026-06-03",
      time: "10:00 AM",
      status: "Confirmed",
      price: 85.00,
      paymentStatus: "Unpaid",
      createdAt: "2026-05-30T10:00:00Z"
    },
    {
      id: "app-2",
      clientName: "Gemma Ward",
      clientPhone: "415-555-0199",
      clientEmail: "gemma.ward@example.com",
      serviceName: "Builder Gel Overlay & Minimalist Matte",
      technicianId: "tech-3",
      technicianName: "Marcus Chen",
      date: "2026-06-04",
      time: "01:00 PM",
      status: "Confirmed",
      price: 95.00,
      paymentStatus: "Unpaid",
      createdAt: "2026-05-31T14:20:00Z"
    },
    {
      id: "app-3",
      clientName: "Sasha Grey",
      clientPhone: "555-0122",
      clientEmail: "sasha@example.com",
      serviceName: "Midnight Velvet Spark Package",
      technicianId: "tech-4",
      technicianName: "Yuki Tanaka",
      date: "2026-06-01",
      time: "11:00 AM",
      status: "Completed",
      price: 145.00,
      paymentStatus: "Paid",
      createdAt: "2026-05-31T09:00:00Z"
    }
  ],
  trends: [
    {
      id: "trend-1",
      title: "Magnetic Velvet Cat-Eye",
      description: "Dual-layer shifting magnetic pigments creating an ultra-lush, dimensional depth in rich emerald or deep rose quartz.",
      image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80",
      rank: 1,
      hearts: 342
    },
    {
      id: "trend-2",
      title: "Aurora Glass Chrome",
      description: "Mirrored, futuristic pearlescent powder buffed onto a clean neutral base to mimic floating Northern lights.",
      image: "https://images.unsplash.com/photo-1632345031435-8797b2d58045?w=600&q=80",
      rank: 2,
      hearts: 289
    },
    {
      id: "trend-3",
      title: "3D Jelly Flowers",
      description: "Translucent raised sculptural petals structured in Japanese builder gel with blush color droplets underneath.",
      image: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80",
      rank: 3,
      hearts: 201
    },
    {
      id: "trend-4",
      title: "Liquid Amber Tortoiseshell",
      description: "Multiple layered washes of sepia, rust, and molasses gold to obtain a realistic, gorgeous polished amber glaze.",
      image: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=600&q=80",
      rank: 4,
      hearts: 175
    },
    {
      id: "trend-5",
      title: "Lilac Aura Blush",
      description: "Soft airbrushed neon core that melts elegantly into pastel lavender edges for a dreamy celestial halo look.",
      image: "https://images.unsplash.com/photo-1617897903246-719242758050?w=600&q=80",
      rank: 5,
      hearts: 148
    }
  ],
  creatorMonth: {
    influencerName: "Aria Thorne (@aria_nails)",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&q=80",
    packageName: "Midnight Velvet Spark",
    packageDescription: "Created exclusively by digital artist Aria Thorne, this customized package merges the mesmerizing Aurora Velvet gel, starlight crystals, and a restoring wildrose paraffin hydration bath.",
    packagePrice: 145.00,
    itemsIncluded: [
      "Signature Hard Gel Strengthening Base",
      "Duochrome Velvet Shifting Polish (All fingers)",
      "6x Artisan Hand-Placed Charcoal Diamonds",
      "Hydrating Organic Cuticle Therapy",
      "Luxe Wildrose Warm Paraffin Care"
    ],
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80"
  },
  clients: [
    {
      id: "client-1",
      name: "Eleanor Vance",
      phone: "555-0144",
      email: "eleanor@example.com",
      password: "password123",
      notes: "Prefers round tips. Loves dark green themes.",
      visitsCount: 12,
      totalSpend: 780.00,
      createdAt: "2025-08-12T14:00:00Z",
      loyaltyPoints: 900,
      redeemedRewards: [],
      notificationPreferences: {
        confirmations: true,
        reminders: true,
        cancellations: true,
        promotions: true
      }
    },
    {
      id: "client-2",
      name: "Gemma Ward",
      phone: "415-555-0199",
      email: "gemma.ward@example.com",
      password: "password123",
      notes: "Has delicate cuticles. Strict preference for Japanese gels.",
      visitsCount: 4,
      totalSpend: 310.00,
      createdAt: "2026-02-19T10:15:00Z",
      loyaltyPoints: 350,
      redeemedRewards: [
        {
          id: "rew-1",
          rewardTitle: "$10 Spa Voucher",
          discountAmount: 10,
          claimedCode: "CLAIM-10-V8S",
          used: false,
          redeemedAt: "2026-05-31"
        }
      ],
      notificationPreferences: {
        confirmations: true,
        reminders: true,
        cancellations: false,
        promotions: true
      }
    },
    {
      id: "client-3",
      name: "Sasha Grey",
      phone: "555-0122",
      email: "sasha@example.com",
      password: "password123",
      notes: "Creator of beauty vlogs. Extremely supportive on Instagram.",
      visitsCount: 8,
      totalSpend: 920.00,
      createdAt: "2025-11-05T12:00:00Z",
      loyaltyPoints: 1000,
      redeemedRewards: [],
      notificationPreferences: {
        confirmations: true,
        reminders: true,
        cancellations: true,
        promotions: false
      }
    }
  ],
  transactions: [
    {
      id: "tx-1",
      appointmentId: "app-3",
      clientName: "Sasha Grey",
      date: "2026-06-01",
      amount: 145.00,
      items: ["Midnight Velvet Spark Package"],
      paymentMethod: "Card",
      technicianName: "Yuki Tanaka"
    },
    {
      id: "tx-2",
      clientName: "Walk-in Guest",
      date: "2026-05-31",
      amount: 45.00,
      items: ["Vitamin E Nourishing Cuticle Oil x2", "Precision Glass File x2"],
      paymentMethod: "Tap"
    }
  ],
  notifications: [
    {
      id: "notif-1",
      clientPhone: "ALL",
      title: "✨ Welcome to The Red Lady Spa!",
      message: "We are thrilled to present our luxurious, bespoke nail services and our new Red Lady Loyalty Lounge! Book your next appointment to start earning exclusive rewards.",
      type: "promotion",
      isRead: false,
      timestamp: "2026-06-01T00:00:00Z"
    },
    {
      id: "notif-2",
      clientPhone: "555-0144",
      title: "💅 Creator Package Promotion",
      message: "Check out Aria Thorne's customized Midnight Velvet Spark Package on the home page. Book it to receive bonus loyalty points!",
      type: "promotion",
      isRead: false,
      timestamp: "2026-05-31T15:30:00Z"
    }
  ]
};

// Helper: Parse appointment date and time text into a JavaScript Date object
function parseAppointmentDateTime(dateStr: string, timeStr: string): Date {
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
}

// Database utility functions
function getDB(): Database {
  if (!fs.existsSync(DB_FILE)) {
    console.log("No database file found. Seeding database with premium spa defaults...");
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), "utf8");
    return DEFAULT_DATA;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data) as any;

    // Schema Migrations
    if (!parsed.notifications) {
      parsed.notifications = DEFAULT_DATA.notifications;
    }
    
    if (parsed.clients && Array.isArray(parsed.clients)) {
      parsed.clients.forEach((c: any) => {
        if (!c.password) {
          c.password = "password123";
        }
        if (c.loyaltyPoints === undefined) {
          if (c.phone === "555-0144") {
            c.loyaltyPoints = 900;
          } else if (c.phone === "415-555-0199") {
            c.loyaltyPoints = 350;
          } else if (c.phone === "555-0122") {
            c.loyaltyPoints = 1000;
          } else {
            c.loyaltyPoints = 0;
          }
        }
        if (!c.redeemedRewards) {
          if (c.phone === "415-555-0199") {
            c.redeemedRewards = [
              {
                id: "rew-1",
                rewardTitle: "$10 Spa Voucher",
                discountAmount: 10,
                claimedCode: "CLAIM-10-V8S",
                used: false,
                redeemedAt: "2026-05-31"
              }
            ];
          } else {
            c.redeemedRewards = [];
          }
        }
        if (!c.notificationPreferences) {
          c.notificationPreferences = {
            confirmations: true,
            reminders: true,
            cancellations: true,
            promotions: true
          };
        }
      });
    }

    return parsed;
  } catch (err) {
    console.error("Failed to parse database, resetting to default schema", err);
    return DEFAULT_DATA;
  }
}

function saveDB(data: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save database state to file", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTING SECTION ---

  // Get full mock DB
  app.get("/api/db", (req, res) => {
    res.json(getDB());
  });

  // 1. Products & Inventory
  app.get("/api/products", (req, res) => {
    res.json(getDB().products);
  });

  app.put("/api/products", (req, res) => {
    const dbData = getDB();
    const updatedProducts = req.body;
    if (Array.isArray(updatedProducts)) {
      dbData.products = updatedProducts;
      saveDB(dbData);
      return res.json({ success: true, products: dbData.products });
    }
    res.status(400).json({ error: "Invalid payload format. Expected list of products." });
  });

  app.patch("/api/products/:id", (req, res) => {
    const dbData = getDB();
    const { id } = req.params;
    const prodIndex = dbData.products.findIndex(p => p.id === id);
    if (prodIndex > -1) {
      dbData.products[prodIndex] = { ...dbData.products[prodIndex], ...req.body };
      saveDB(dbData);
      return res.json(dbData.products[prodIndex]);
    }
    res.status(404).json({ error: "Product not found" });
  });

  // 2. Technicians
  app.get("/api/technicians", (req, res) => {
    res.json(getDB().technicians);
  });

  app.patch("/api/technicians/:id", (req, res) => {
    const dbData = getDB();
    const { id } = req.params;
    const techIdx = dbData.technicians.findIndex(t => t.id === id);
    if (techIdx > -1) {
      dbData.technicians[techIdx] = { ...dbData.technicians[techIdx], ...req.body };
      saveDB(dbData);
      return res.json(dbData.technicians[techIdx]);
    }
    res.status(404).json({ error: "Technician not found" });
  });

  // 3. Bookings / Appointments
  app.get("/api/appointments", (req, res) => {
    res.json(getDB().appointments);
  });

  app.post("/api/appointments", (req, res) => {
    const dbData = getDB();
    const { clientName, clientPhone, clientEmail, serviceName, technicianId, date, time, price, notes } = req.body;

    if (!clientName || !clientPhone || !serviceName || !technicianId || !date || !time) {
      return res.status(400).json({ error: "Missing required fields for appointment" });
    }

    const technician = dbData.technicians.find(t => t.id === technicianId);
    if (!technician) {
      return res.status(400).json({ error: "Selected technician does not exist" });
    }

    // Quick booking slot validator (simple schedule validation)
    const activeConflicts = dbData.appointments.some(
      app => app.technicianId === technicianId && app.date === date && app.time === time && app.status !== "Cancelled"
    );

    if (activeConflicts) {
      return res.status(409).json({ error: "This specialist is booked for this particular time slot." });
    }

    const newAppointment: Appointment = {
      id: "app-" + Date.now(),
      clientName,
      clientPhone,
      clientEmail: clientEmail || `${clientName.toLowerCase().replace(/\s+/g, "")}@example.com`,
      serviceName,
      technicianId,
      technicianName: technician.name,
      date,
      time,
      status: "Pending",
      price: price || 80.00,
      paymentStatus: "Unpaid",
      notes: notes || "",
      createdAt: new Date().toISOString()
    };

    dbData.appointments.push(newAppointment);

    // Also double check if we need to register or update user profile
    let client = dbData.clients.find(c => c.phone === clientPhone);
    if (!client) {
      client = {
        id: "client-" + Date.now(),
        name: clientName,
        phone: clientPhone,
        email: clientEmail || `${clientName.toLowerCase().replace(/\s+/g, "")}@example.com`,
        notes: notes || "",
        visitsCount: 1,
        totalSpend: 0.00,
        createdAt: new Date().toISOString(),
        loyaltyPoints: 10, // Earn 10 points for booking
        redeemedRewards: [],
        notificationPreferences: {
          confirmations: true,
          reminders: true,
          cancellations: true,
          promotions: true
        }
      };
      dbData.clients.push(client);
    } else {
      client.visitsCount += 1;
      client.loyaltyPoints += 10; // Earn 10 points for booking!
    }

    // Capture Appointment Confirmation Notification
    if (client.notificationPreferences && client.notificationPreferences.confirmations) {
      const confirmNotif: NotificationItem = {
        id: "notif-conf-" + Date.now(),
        clientPhone: clientPhone,
        title: "✨ Reservation Confirmed",
        message: `Your booking for "${serviceName}" on ${date} at ${time} with ${technician.name} is secured. See you at The Red Lady Spa!`,
        type: "confirmation",
        isRead: false,
        timestamp: new Date().toISOString()
      };
      dbData.notifications.unshift(confirmNotif);
    }

    saveDB(dbData);
    res.status(201).json({ success: true, appointment: newAppointment });
  });

  app.patch("/api/appointments/:id", (req, res) => {
    const dbData = getDB();
    const { id } = req.params;
    const appIndex = dbData.appointments.findIndex(app => app.id === id);

    if (appIndex > -1) {
      const prevStatus = dbData.appointments[appIndex].status;
      const originalApp = dbData.appointments[appIndex];

      // Cancellation 72 hours validation for clients
      if (req.body.status === "Cancelled" && prevStatus !== "Cancelled") {
        if (req.body.cancelledBy === "client") {
          const appDateTime = parseAppointmentDateTime(originalApp.date, originalApp.time);
          const diffMs = appDateTime.getTime() - Date.now();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours < 72) {
            return res.status(400).json({
              error: "Cancellations within 72 hours of the appointment must be managed by our system administrators or salon technicians. Late cancellations/no-shows are subject to a $25 fee."
            });
          }
        }
      }

      dbData.appointments[appIndex] = { ...originalApp, ...req.body };

      // Handle custom POS trigger: If completed, let's create a sale and add/reduce inv, etc.
      // E.g., if status changed from confirmed to completed, record total spend loyalty increase
      if (req.body.status === "Completed" && prevStatus !== "Completed") {
        dbData.appointments[appIndex].paymentStatus = "Paid";
        const client = dbData.clients.find(c => c.phone === originalApp.clientPhone);
        if (client) {
          client.totalSpend += originalApp.price;
          // Earn 1 point per dollar spent on services
          client.loyaltyPoints += Math.floor(originalApp.price);
        }

        // Add auto transaction record
        const saleRecord: Transaction = {
          id: "tx-" + Date.now(),
          appointmentId: originalApp.id,
          clientName: originalApp.clientName,
          date: originalApp.date,
          amount: originalApp.price,
          items: [originalApp.serviceName],
          paymentMethod: req.body.paymentMethod || "Card",
          technicianName: originalApp.technicianName
        };
        dbData.transactions.push(saleRecord);

        // Add completed notification alert
        if (client && client.notificationPreferences && client.notificationPreferences.confirmations) {
          const finishedNotif: NotificationItem = {
            id: "notif-done-" + Date.now(),
            clientPhone: originalApp.clientPhone,
            title: "💎 Treatment Complete!",
            message: `Thank you for visiting The Red Lady Spa! You earned ${Math.floor(originalApp.price)} Loyalty Points for this service. Current Balance: ${client.loyaltyPoints} points.`,
            type: "confirmation",
            isRead: false,
            timestamp: new Date().toISOString()
          };
          dbData.notifications.unshift(finishedNotif);
        }
      }

      // Handle custom cancellation push trigger
      if (req.body.status === "Cancelled" && prevStatus !== "Cancelled") {
        const client = dbData.clients.find(c => c.phone === originalApp.clientPhone);
        if (client && client.notificationPreferences && client.notificationPreferences.cancellations) {
          const cancelNotif: NotificationItem = {
            id: "notif-cancel-" + Date.now(),
            clientPhone: originalApp.clientPhone,
            title: "❌ Reservation Cancelled",
            message: `Your appointment for "${originalApp.serviceName}" on ${originalApp.date} at ${originalApp.time} was cancelled. We hope to see you again soon at The Red Lady Spa.`,
            type: "cancellation",
            isRead: false,
            timestamp: new Date().toISOString()
          };
          dbData.notifications.unshift(cancelNotif);
        }
      }

      saveDB(dbData);
      return res.json(dbData.appointments[appIndex]);
    }
    res.status(404).json({ error: "Appointment booking not found" });
  });

  // 4. Trends
  app.get("/api/trends", (req, res) => {
    res.json(getDB().trends);
  });

  app.post("/api/trends/vote", (req, res) => {
    const dbData = getDB();
    const { id } = req.body;
    const trendIdx = dbData.trends.findIndex(t => t.id === id);
    if (trendIdx > -1) {
      dbData.trends[trendIdx].hearts += 1;
      // Re-rank based on hearts
      dbData.trends.sort((a, b) => b.hearts - a.hearts);
      dbData.trends.forEach((t, i) => {
        t.rank = i + 1;
      });
      saveDB(dbData);
      return res.json(dbData.trends);
    }
    res.status(404).json({ error: "Trend not found" });
  });

  // 5. Creator of the Month
  app.get("/api/creator-month", (req, res) => {
    res.json(getDB().creatorMonth);
  });

  app.patch("/api/creator-month", (req, res) => {
    const dbData = getDB();
    dbData.creatorMonth = { ...dbData.creatorMonth, ...req.body };
    saveDB(dbData);
    res.json(dbData.creatorMonth);
  });

  // 6. Client Databases
  app.get("/api/clients", (req, res) => {
    res.json(getDB().clients);
  });

  app.post("/api/clients/register", (req, res) => {
    const dbData = getDB();
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: "Name, phone, email, and password are required" });
    }
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    const existingEmail = dbData.clients.find(c => c.email.trim().toLowerCase() === cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: "An account with this email address already exists." });
    }

    const existingPhone = dbData.clients.find(c => c.phone.trim() === cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ error: "An account with this phone number already exists." });
    }

    const newClient: ClientProfile = {
      id: "client-" + Date.now(),
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      password: password.trim(),
      notes: "",
      visitsCount: 0,
      totalSpend: 0,
      createdAt: new Date().toISOString(),
      loyaltyPoints: 0,
      redeemedRewards: [],
      notificationPreferences: {
        confirmations: true,
        reminders: true,
        cancellations: true,
        promotions: true
      }
    };
    dbData.clients.push(newClient);
    saveDB(dbData);
    res.status(201).json(newClient);
  });

  app.post("/api/clients/login", (req, res) => {
    const dbData = getDB();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const client = dbData.clients.find(c => c.email.trim().toLowerCase() === cleanEmail);
    if (!client) {
      return res.status(404).json({ error: "No account found with this email address." });
    }

    const expectedPassword = client.password || "password123";
    if (expectedPassword !== cleanPassword) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    res.json(client);
  });

  app.post("/api/clients", (req, res) => {
    const dbData = getDB();
    const { name, phone, email, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required for creating profiles" });
    }
    const cleanPhone = phone.trim();
    let existingClient = dbData.clients.find(c => c.phone === cleanPhone);
    if (existingClient) {
      return res.json(existingClient);
    }
    const newClient: ClientProfile = {
      id: "client-" + Date.now(),
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : "",
      notes: notes || "",
      visitsCount: 0,
      totalSpend: 0,
      createdAt: new Date().toISOString(),
      loyaltyPoints: 0,
      redeemedRewards: [],
      notificationPreferences: {
        confirmations: true,
        reminders: true,
        cancellations: true,
        promotions: true
      }
    };
    dbData.clients.push(newClient);
    saveDB(dbData);
    res.status(201).json(newClient);
  });

  // Loyalty Point Redemption
  app.post("/api/clients/redeem", (req, res) => {
    const dbData = getDB();
    const { phone, rewardTitle, discountAmount, costPoints } = req.body;

    if (!phone || !rewardTitle || discountAmount === undefined || !costPoints) {
      return res.status(400).json({ error: "Missing required redemption parameters" });
    }

    const client = dbData.clients.find(c => c.phone === phone);
    if (!client) {
      return res.status(404).json({ error: "Client profile not found" });
    }

    if (client.loyaltyPoints < costPoints) {
      return res.status(400).json({ error: `Insufficient loyalty points. Have: ${client.loyaltyPoints}, need: ${costPoints}` });
    }

    // Deduct points
    client.loyaltyPoints -= costPoints;

    const code = "LADY-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const rewardItem = {
      id: "rew-" + Date.now(),
      rewardTitle,
      discountAmount,
      claimedCode: code,
      used: false,
      redeemedAt: new Date().toISOString().split("T")[0]
    };

    client.redeemedRewards.push(rewardItem);

    // Create a notification for the redemption
    if (client.notificationPreferences && client.notificationPreferences.confirmations) {
      const redeemNotif: NotificationItem = {
        id: "notif-rew-" + Date.now(),
        clientPhone: phone,
        title: "🎁 Points Redeemed successfully!",
        message: `You spent ${costPoints} points for "${rewardTitle}". Code: ${code}. You can apply this code on your next spa booking!`,
        type: "confirmation",
        isRead: false,
        timestamp: new Date().toISOString()
      };
      dbData.notifications.unshift(redeemNotif);
    }

    saveDB(dbData);
    res.json(client);
  });

  // Update Notification Preferences, consumed vouchers and manually adjusted points
  app.post("/api/clients/update-preferences", (req, res) => {
    const dbData = getDB();
    const { phone, preferences, usedVoucherCode, loyaltyPointsAdjustment } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Missing phone is required" });
    }

    const client = dbData.clients.find(c => c.phone === phone);
    if (!client) {
      return res.status(404).json({ error: "Client profile not found" });
    }

    if (preferences) {
      client.notificationPreferences = { ...client.notificationPreferences, ...preferences };
    }

    if (usedVoucherCode) {
      const reward = client.redeemedRewards?.find(r => r.claimedCode === usedVoucherCode);
      if (reward) {
        reward.used = true;
      }
    }

    if (loyaltyPointsAdjustment !== undefined) {
      client.loyaltyPoints = Math.max(0, (client.loyaltyPoints || 0) + loyaltyPointsAdjustment);
    }

    saveDB(dbData);
    res.json(client);
  });

  // 7. POS Direct Transactions
  app.get("/api/transactions", (req, res) => {
    res.json(getDB().transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const dbData = getDB();
    const { clientName, amount, items, paymentMethod, technicianName } = req.body;

    if (!clientName || !amount || !items || !paymentMethod) {
      return res.status(400).json({ error: "Missing sales transaction fields" });
    }

    const valAmount = parseFloat(amount);
    const newTx: Transaction = {
      id: "tx-" + Date.now(),
      clientName,
      date: new Date().toISOString().split("T")[0],
      amount: valAmount,
      items: Array.isArray(items) ? items : [items],
      paymentMethod,
      technicianName
    };

    dbData.transactions.push(newTx);

    // Reward points is linked by client name matching registered clients
    const client = dbData.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    if (client) {
      client.totalSpend += valAmount;
      client.loyaltyPoints += Math.floor(valAmount); // 1 point per dollar spent on products / checkouts!
    }

    // Adjust inventory if items matches product names
    if (Array.isArray(items)) {
      items.forEach(itemName => {
        const prod = dbData.products.find(p => p.name === itemName);
        if (prod && prod.stock > 0) {
          prod.stock = Math.max(0, prod.stock - 1);
        }
      });
    }

    saveDB(dbData);
    res.status(201).json(newTx);
  });

  // --- 8. NOTIFICATIONS ENDPOINTS ---
  app.get("/api/notifications", (req, res) => {
    const { phone } = req.query;
    const allNotifs = getDB().notifications || [];
    
    if (phone) {
      // Return alerts that belong to this phone OR are global "ALL" broadcasts
      const filtered = allNotifs.filter(
        n => n.clientPhone === "ALL" || n.clientPhone === phone
      );
      return res.json(filtered);
    }
    res.json(allNotifs);
  });

  // Mark notification(s) as read
  app.post("/api/notifications/read", (req, res) => {
    const dbData = getDB();
    const { id, phone } = req.body;

    if (id) {
      const idx = dbData.notifications.findIndex(n => n.id === id);
      if (idx > -1) {
        dbData.notifications[idx].isRead = true;
      }
    } else if (phone) {
      dbData.notifications.forEach(n => {
        if (n.clientPhone === phone || n.clientPhone === "ALL") {
          n.isRead = true;
        }
      });
    }

    saveDB(dbData);
    res.json({ success: true });
  });

  // Broadcast a new Brand Promotion Push Notification (Owner feature!)
  app.post("/api/notifications/broadcast", (req, res) => {
    const dbData = getDB();
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "Promotion title and message are required" });
    }

    const newPromotion: NotificationItem = {
      id: "notif-promo-" + Date.now(),
      clientPhone: "ALL",
      title: "📢 Promo: " + title,
      message,
      type: "promotion",
      isRead: false,
      timestamp: new Date().toISOString()
    };

    dbData.notifications.unshift(newPromotion);
    saveDB(dbData);
    res.status(201).json(newPromotion);
  });

  // Simulate pushing an artificial 24 Hours or 1 Hour reminder or cancellation manually
  app.post("/api/notifications/test-reminder", (req, res) => {
    const dbData = getDB();
    const { appointmentId, type } = req.body; // type: 'reminder_24h' | 'reminder_1h'

    if (!appointmentId || !type) {
      return res.status(400).json({ error: "Missing appointmentId or type" });
    }

    const app = dbData.appointments.find(a => a.id === appointmentId);
    if (!app) {
      return res.status(404).json({ error: "Appointment booking not found" });
    }

    const timeLabel = type === "reminder_24h" ? "24 Hours" : "1 Hour";
    const promptMessage = type === "reminder_24h" 
      ? `This is a reminder that you have an appointment booked for "${app.serviceName}" with ${app.technicianName} tomorrow on ${app.date} at ${app.time}. We look forward to pampering you!`
      : `Friendly reminder: Your session "${app.serviceName}" with ${app.technicianName} starts in 1 hour at ${app.time}. See you shortly!`;

    const newReminderNotification: NotificationItem = {
      id: `notif-${type}-${Date.now()}`,
      clientPhone: app.clientPhone,
      title: `⏰ Appointment Reminder (${timeLabel} Before)`,
      message: promptMessage,
      type: type,
      isRead: false,
      timestamp: new Date().toISOString()
    };

    dbData.notifications.unshift(newReminderNotification);
    saveDB(dbData);
    res.status(201).json(newReminderNotification);
  });

  // --- ADMINISTRATIVE UPDATE PORTAL FILE & CODE GENERATED CONTENT SYSTEM ---
  const CONTENT_ROOT = path.join(process.cwd(), "content");

  function ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  function seedDefaultMonthlyContent() {
    const currentYear = "2026";
    const currentMonth = "06"; // June 2026 based on user simulated clock
    
    const monthDir = path.join(CONTENT_ROOT, currentYear, currentMonth);
    const picturesDir = path.join(monthDir, "pictures");
    const bodyDir = path.join(monthDir, "body");
    const textDir = path.join(monthDir, "text");

    ensureDirectoryExists(CONTENT_ROOT);
    ensureDirectoryExists(picturesDir);
    ensureDirectoryExists(bodyDir);
    ensureDirectoryExists(textDir);

    const defaultFiles = [
      {
        dir: textDir,
        name: "hero-title.txt",
        content: "Sculpting Luxury At Your Fingertips"
      },
      {
        dir: textDir,
        name: "hero-subtitle.txt",
        content: "Experience medical-grade Russian manicures, handcrafted 3D gel overlays, and restorative paraffin care customized to your beauty profile."
      },
      {
        dir: textDir,
        name: "promo-title.txt",
        content: "The Midnight Velvet Salon Soiree"
      },
      {
        dir: textDir,
        name: "promo-tag.txt",
        content: "June Platinum Release"
      },
      {
        dir: bodyDir,
        name: "announcement.md",
        content: "### Welcome to our Starlight June Event!\n\nThis month, we are highlighting our **Aurora Velvet Magnetic Polish** and handcrafted **3D sculptural pieces** designed in-house by our master polishers. Enjoy an exclusive discount of **20% off** on your next weekend appointment.\n\n#### What's New:\n- Individualized structural nail builder base overlay.\n- Complimentary honey-citrus hot wrap therapy with every signature manicure.\n- Organic paraffin wax enriched with Moroccan oil."
      },
      {
        dir: bodyDir,
        name: "welcome-note.md",
        content: "#### Dear Red Lady Valued Guest,\n\nOur philosophy rests on the belief that nail therapy is a crucial facet of self-expression and personal styling. Every lacquer layer, every meticulous file edge is executed with medical-grade sterile tools and artisanal perfection."
      },
      {
        dir: picturesDir,
        name: "hero-bg.txt",
        content: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80"
      },
      {
        dir: picturesDir,
        name: "promo-banner.txt",
        content: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80"
      }
    ];

    defaultFiles.forEach(f => {
      const filePath = path.join(f.dir, f.name);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, f.content, "utf8");
      }
    });
  }

  function buildContentTree(dir: string, relativePath: string = ""): any {
    const absolutePath = path.join(dir, relativePath);
    if (!fs.existsSync(absolutePath)) return null;

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      const children = fs.readdirSync(absolutePath);
      const item: any = {
        name: relativePath ? path.basename(absolutePath) : "content",
        type: "directory",
        path: relativePath ? `content/${relativePath}`.replace(/\\/g, "/") : "content",
        children: []
      };
      
      children.forEach(child => {
        const childTree = buildContentTree(dir, relativePath ? path.join(relativePath, child) : child);
        if (childTree) {
          item.children.push(childTree);
        }
      });

      // Sort: folders first, then alphabetically, other attributes
      item.children.sort((a: any, b: any) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return b.name.localeCompare(a.name); // Prefer newer years and months first
      });
      return item;
    } else {
      return {
        name: path.basename(absolutePath),
        type: "file",
        path: `content/${relativePath}`.replace(/\\/g, "/"),
        size: stat.size
      };
    }
  }

  // Pre-seed default data at startup
  seedDefaultMonthlyContent();

  // 1. Get complete content tree structure
  app.get("/api/admin-content/tree", (req, res) => {
    try {
      ensureDirectoryExists(CONTENT_ROOT);
      seedDefaultMonthlyContent();
      const tree = buildContentTree(CONTENT_ROOT);
      res.json(tree);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Read single file content
  app.get("/api/admin-content/file", (req, res) => {
    const relativePath = req.query.path as string;
    if (!relativePath || !relativePath.startsWith("content/")) {
      return res.status(400).json({ error: "Invalid content path format" });
    }
    const safePath = path.normalize(relativePath).replace(/^content\//, "");
    if (safePath.includes("..")) {
      return res.status(403).json({ error: "Access Denied" });
    }
    const absolutePath = path.join(CONTENT_ROOT, safePath);
    if (!absolutePath.startsWith(CONTENT_ROOT)) {
      return res.status(403).json({ error: "Access Denied" });
    }
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    try {
      const content = fs.readFileSync(absolutePath, "utf8");
      res.json({ path: relativePath, content });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Write or save single file content
  app.post("/api/admin-content/file", (req, res) => {
    const { path: relativePath, content } = req.body;
    if (!relativePath || !relativePath.startsWith("content/")) {
      return res.status(400).json({ error: "Invalid content path format" });
    }
    const safePath = path.normalize(relativePath).replace(/^content\//, "");
    if (safePath.includes("..")) {
      return res.status(403).json({ error: "Access Denied" });
    }
    const absolutePath = path.join(CONTENT_ROOT, safePath);
    if (!absolutePath.startsWith(CONTENT_ROOT)) {
      return res.status(403).json({ error: "Access Denied" });
    }
    try {
      ensureDirectoryExists(path.dirname(absolutePath));
      fs.writeFileSync(absolutePath, content || "", "utf8");
      res.json({ success: true, path: relativePath });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Create new Year / Month organizational monthly content folder structure
  app.post("/api/admin-content/create-month", (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) {
      return res.status(400).json({ error: "Year and Month coordinates are required." });
    }
    
    const formattedMonth = String(month).padStart(2, "0");
    const monthDir = path.join(CONTENT_ROOT, String(year), formattedMonth);
    const picturesDir = path.join(monthDir, "pictures");
    const bodyDir = path.join(monthDir, "body");
    const textDir = path.join(monthDir, "text");

    try {
      ensureDirectoryExists(picturesDir);
      ensureDirectoryExists(bodyDir);
      ensureDirectoryExists(textDir);

      const defaults = [
        { d: textDir, n: "hero-title.txt", c: `Luxury Curations for ${year}/${formattedMonth}` },
        { d: textDir, n: "hero-subtitle.txt", c: "Enjoy bespoke nail treatments formulated and scheduled for this special season of the year." },
        { d: textDir, n: "promo-title.txt", c: `Seasonal Salon Special - ${year}/${formattedMonth}` },
        { d: textDir, n: "promo-tag.txt", c: `Active Limited-edition` },
        { d: bodyDir, n: "announcement.md", c: `### New Announcements for ${year}-${formattedMonth}!\n\nWe have initialized this month folder structure. Go ahead and replace this Markdown body content on the administration screen.` },
        { d: bodyDir, n: "welcome-note.md", c: `Welcome to our ${year}/${formattedMonth} catalog! Experience custom designs curated specifically for you.` },
        { d: picturesDir, n: "hero-bg.txt", c: "https://images.unsplash.com/photo-1632345031435-8797b2d58045?w=600&q=80" },
        { d: picturesDir, n: "promo-banner.txt", c: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&q=80" }
      ];

      defaults.forEach(f => {
        const filePath = path.join(f.d, f.n);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, f.c, "utf8");
        }
      });

      res.json({ success: true, message: `Created content folders content/${year}/${formattedMonth}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Delete single file
  app.post("/api/admin-content/delete-file", (req, res) => {
    const { path: relativePath } = req.body;
    if (!relativePath || !relativePath.startsWith("content/")) {
      return res.status(400).json({ error: "Invalid path format" });
    }
    const safePath = path.normalize(relativePath).replace(/^content\//, "");
    if (safePath.includes("..")) {
      return res.status(403).json({ error: "Access Denied" });
    }
    const absolutePath = path.join(CONTENT_ROOT, safePath);
    if (!absolutePath.startsWith(CONTENT_ROOT)) {
      return res.status(403).json({ error: "Access Denied" });
    }
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Delete a month folder entirely
  app.post("/api/admin-content/delete-month", (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) {
      return res.status(400).json({ error: "Year and Month are required" });
    }
    const formattedMonth = String(month).padStart(2, "0");
    const monthDir = path.join(CONTENT_ROOT, String(year), formattedMonth);
    if (!monthDir.startsWith(CONTENT_ROOT) || monthDir === CONTENT_ROOT) {
      return res.status(403).json({ error: "Invalid paths" });
    }
    try {
      if (fs.existsSync(monthDir)) {
        fs.rmSync(monthDir, { recursive: true, force: true });
        res.json({ success: true, message: `Successfully deleted monthly folder content/${year}/${formattedMonth}` });
      } else {
        res.status(404).json({ error: "Folder not found" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Get assembled content list for a month (Read by the entire application stack dynamically)
  app.get("/api/monthly-content", (req, res) => {
    const year = (req.query.year as string) || "2026";
    const month = (req.query.month as string) || "06";
    const formattedMonth = String(month).padStart(2, "0");
    
    const monthDir = path.join(CONTENT_ROOT, year, formattedMonth);
    if (!fs.existsSync(monthDir)) {
      return res.json({ year, month: formattedMonth, text: {}, body: {}, pictures: {}, found: false });
    }

    try {
      const text: Record<string, string> = {};
      const body: Record<string, string> = {};
      const pictures: Record<string, string> = {};

      const textDir = path.join(monthDir, "text");
      if (fs.existsSync(textDir)) {
        fs.readdirSync(textDir).forEach(file => {
          if (file.endsWith(".txt") || file.endsWith(".json")) {
            text[file] = fs.readFileSync(path.join(textDir, file), "utf8");
          }
        });
      }

      const bodyDir = path.join(monthDir, "body");
      if (fs.existsSync(bodyDir)) {
        fs.readdirSync(bodyDir).forEach(file => {
          if (file.endsWith(".md") || file.endsWith(".html") || file.endsWith(".txt")) {
            body[file] = fs.readFileSync(path.join(bodyDir, file), "utf8");
          }
        });
      }

      const picturesDir = path.join(monthDir, "pictures");
      if (fs.existsSync(picturesDir)) {
        fs.readdirSync(picturesDir).forEach(file => {
          if (file.endsWith(".txt") || file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".jpeg")) {
            pictures[file] = fs.readFileSync(path.join(picturesDir, file), "utf8");
          }
        });
      }

      res.json({
        year,
        month: formattedMonth,
        text,
        body,
        pictures,
        found: true
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE DEV / PROD SERVING ---

  // Express v4 app.get('*') covers all requests that didn't hit an api endpoint
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NailSpa Server] listening and running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
