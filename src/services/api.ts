import { Product, Technician, Appointment, Trend, CreatorMonth, ClientProfile, Transaction } from "../types.js";

const BASE_URL = ""; // Relative paths since they share the same port 3000

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${BASE_URL}/api/products`);
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

export async function updateProducts(products: Product[]): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/products`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(products),
  });
  if (!res.ok) throw new Error("Failed to update products");
  const data = await res.json();
  return data.success;
}

export async function patchProduct(id: string, payload: Partial<Product>): Promise<Product> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to patch product");
  return res.json();
}

export async function fetchTechnicians(): Promise<Technician[]> {
  const res = await fetch(`${BASE_URL}/api/technicians`);
  if (!res.ok) throw new Error("Failed to load technicians");
  return res.json();
}

export async function patchTechnician(id: string, payload: Partial<Technician>): Promise<Technician> {
  const res = await fetch(`${BASE_URL}/api/technicians/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update technician schedule");
  return res.json();
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const res = await fetch(`${BASE_URL}/api/appointments`);
  if (!res.ok) throw new Error("Failed to load appointments");
  return res.json();
}

export async function bookAppointment(payload: {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceName: string;
  technicianId: string;
  date: string;
  time: string;
  price: number;
  notes?: string;
}): Promise<Appointment> {
  const res = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Selected slot is unavailable");
  }
  const data = await res.json();
  return data.appointment;
}

export async function patchAppointment(id: string, payload: Partial<Appointment> & { paymentMethod?: string }): Promise<Appointment> {
  const res = await fetch(`${BASE_URL}/api/appointments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update appointment");
  return res.json();
}

export async function fetchTrends(): Promise<Trend[]> {
  const res = await fetch(`${BASE_URL}/api/trends`);
  if (!res.ok) throw new Error("Failed to load trends");
  return res.json();
}

export async function voteTrend(id: string): Promise<Trend[]> {
  const res = await fetch(`${BASE_URL}/api/trends/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to register vote");
  return res.json();
}

export async function fetchCreatorMonth(): Promise<CreatorMonth> {
  const res = await fetch(`${BASE_URL}/api/creator-month`);
  if (!res.ok) throw new Error("Failed to load creator metadata");
  return res.json();
}

export async function updateCreatorMonth(payload: Partial<CreatorMonth>): Promise<CreatorMonth> {
  const res = await fetch(`${BASE_URL}/api/creator-month`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update creator metadata");
  return res.json();
}

export async function fetchClients(): Promise<ClientProfile[]> {
  const res = await fetch(`${BASE_URL}/api/clients`);
  if (!res.ok) throw new Error("Failed to load customers list");
  return res.json();
}

export async function createClient(payload: { name: string; phone: string; email?: string; notes?: string }): Promise<ClientProfile> {
  const res = await fetch(`${BASE_URL}/api/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to register profile");
  return res.json();
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${BASE_URL}/api/transactions`);
  if (!res.ok) throw new Error("Failed to load transaction recordings");
  return res.json();
}

export async function createTransaction(payload: {
  clientName: string;
  amount: number;
  items: string[];
  paymentMethod: "Cash" | "Card" | "Tap";
  technicianName?: string;
}): Promise<Transaction> {
  const res = await fetch(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to submit transaction recording");
  return res.json();
}
