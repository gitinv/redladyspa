export interface Product {
  id: string;
  name: string;
  category: 'Polish' | 'Care' | 'Art' | 'Tools';
  price: number;
  description: string;
  image: string;
  stock: number;
  lowStockAlert: number;
}

export interface Technician {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  specialties: string[];
  availability: string[]; // Standard working days/hours or explicit slots
  timeOff?: string[]; // Array of scheduled off blocks
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceName: string;
  technicianId: string;
  technicianName: string;
  date: string;
  time: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  price: number;
  paymentStatus: 'Paid' | 'Unpaid';
  notes?: string;
  createdAt: string;
}

export interface Trend {
  id: string;
  title: string;
  description: string;
  image: string;
  rank: number;
  hearts: number;
}

export interface CreatorMonth {
  influencerName: string;
  avatar: string;
  packageName: string;
  packageDescription: string;
  packagePrice: number;
  itemsIncluded: string[];
  image: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  notes: string;
  visitsCount: number;
  totalSpend: number;
  createdAt: string;
  loyaltyPoints: number;
  redeemedRewards: Array<{
    id: string;
    rewardTitle: string;
    discountAmount: number;
    claimedCode: string;
    used: boolean;
    redeemedAt: string;
  }>;
  notificationPreferences: {
    confirmations: boolean;
    reminders: boolean;
    cancellations: boolean;
    promotions: boolean;
  };
}

export interface NotificationItem {
  id: string;
  clientPhone: string; // "ALL" or specific phone
  title: string;
  message: string;
  type: "confirmation" | "reminder_24h" | "reminder_1h" | "cancellation" | "promotion";
  isRead: boolean;
  timestamp: string;
}

export interface Transaction {
  id: string;
  appointmentId?: string;
  clientName: string;
  date: string;
  amount: number;
  items: string[];
  paymentMethod: 'Cash' | 'Card' | 'Tap';
  technicianName?: string;
}
