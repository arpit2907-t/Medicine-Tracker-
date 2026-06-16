export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  specificTimes: string[]; // e.g. ["08:00", "20:00"]
  durationDays: number;
  totalQuantityToStart: number;
  currentStock: number;
  lowStockThreshold: number;
  instructions: string;
  category: string;
  createdAt: string;
  isActive: boolean;
  prescriptionImage?: string; // Optional reference thumbnail
}

export interface IntakeLog {
  id: string;
  medicineId: string;
  medicineName: string;
  dosageTaken: string;
  scheduledTime: string; // e.g. "08:00"
  takenAt: string; // ISO string
  status: "taken" | "skipped";
  notes?: string;
}

export interface ReminderConfig {
  enableSound: boolean;
  enableBrowserNotifications: boolean;
  restockAlertPercent: number; // e.g. 20 (leads to alerts when stock < 20% of start qty)
}

export interface ActiveNotification {
  id: string;
  medicine: Medicine;
  time: string;
  playedSound: boolean;
}
