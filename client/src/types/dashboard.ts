export interface DashboardStats {
  dailyRevenue: number;
  completedRevenue: number;
  predictedRevenue: number;
  dailyServices: number;
  appointments: number;
  activeCustomers: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface ServiceData {
  id: number;
  customerName: string;
  vehiclePlate: string;
  serviceTypeName: string;
  scheduledDate: string;
  status: string;
  estimatedValue?: string;
  finalValue?: string;
}

export interface TopService {
  name: string;
  count: number;
  revenue: number;
}

export interface AppointmentData {
  id: number;
  customerName: string;
  vehiclePlate: string;
  serviceTypeName: string;
  scheduledDate: string;
  scheduledTime?: string;
  status: string;
}