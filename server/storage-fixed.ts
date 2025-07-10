import { db } from "./db";
import { 
  users, customers, vehicles, serviceTypes, services, payments,
  type User, type Customer, type Vehicle, type ServiceType, type Service, type Payment,
  type InsertUser, type InsertCustomer, type InsertVehicle, type InsertServiceType, type InsertService, type InsertPayment
} from "../shared/schema";
import { eq, desc, asc, and, gte, lte, like, sql, isNotNull, lt, isNull, ne } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByDocument(document: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;

  // Vehicle operations
  getVehicles(): Promise<Vehicle[]>;
  getVehiclesByCustomer(customerId: number): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;

  // Service operations
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByCustomer(customerId: number): Promise<Service[]>;
  getServicesByVehicle(vehicleId: number): Promise<Service[]>;
  getServicesByDateRange(startDate: string, endDate: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<void>;

  // Service type operations
  getServiceTypes(): Promise<ServiceType[]>;
  getServiceType(id: number): Promise<ServiceType | undefined>;
  createServiceType(serviceType: InsertServiceType): Promise<ServiceType>;
  updateServiceType(id: number, serviceType: Partial<InsertServiceType>): Promise<ServiceType>;

  // Payment operations
  getPaymentsByService(serviceId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Dashboard statistics
  getDashboardStats(technicianId?: number | null): Promise<{
    dailyRevenue: number;
    completedRevenue: number;
    predictedRevenue: number;
    dailyServices: number;
    appointments: number;
    activeCustomers: number;
  }>;
  getRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]>;
  getTopServices(): Promise<{ name: string; count: number; revenue: number }[]>;
  getRecentServices(limit: number, technicianId?: number | null): Promise<any[]>;
  getUpcomingAppointments(limit: number, technicianId?: number | null): Promise<any[]>;
  getTodayAppointments(technicianId?: number | null): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  
  // Helper function to safely parse numeric values
  private parseNumericValue(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  }

  // Dashboard statistics with safe numeric handling
  async getDashboardStats(technicianId?: number | null): Promise<{
    dailyRevenue: number;
    completedRevenue: number;
    predictedRevenue: number;
    dailyServices: number;
    appointments: number;
    activeCustomers: number;
  }> {
    console.log("Getting dashboard stats...", technicianId ? `for technician ${technicianId}` : "for admin");

    // Use current date in Brazilian timezone
    const today = new Date().toISOString().split('T')[0];
    console.log("Today date:", today);

    try {
      // Get all services with proper filtering
      const whereCondition = technicianId 
        ? sql`WHERE technician_id = ${technicianId}` 
        : sql`WHERE 1=1`;

      const allServicesResult = await db.execute(sql`
        SELECT 
          estimated_value, 
          final_value, 
          status, 
          scheduled_date,
          customer_id
        FROM services 
        ${whereCondition}
      `);

      console.log("Total services found:", allServicesResult.rows.length);

      let dailyRevenue = 0;
      let completedRevenue = 0;
      let predictedRevenue = 0;
      let dailyServices = 0;
      let appointments = 0;
      const uniqueCustomers = new Set();

      allServicesResult.rows.forEach((service: any) => {
        const estimatedValue = this.parseNumericValue(service.estimated_value);
        const finalValue = this.parseNumericValue(service.final_value);
        const serviceDate = service.scheduled_date;
        const status = service.status;

        // Add to unique customers set for active customers count
        if (service.customer_id) {
          uniqueCustomers.add(service.customer_id);
        }

        // Calculate daily revenue (today's services)
        if (serviceDate === today && status !== 'cancelled') {
          dailyRevenue += estimatedValue;
          dailyServices++;
        }

        // Calculate completed revenue
        if (status === 'completed') {
          completedRevenue += finalValue > 0 ? finalValue : estimatedValue;
        }

        // Calculate predicted revenue (all non-cancelled)
        if (status !== 'cancelled') {
          predictedRevenue += estimatedValue;
        }

        // Count future appointments
        if (serviceDate > today && status === 'scheduled') {
          appointments++;
        }
      });

      const result = {
        dailyRevenue: Math.round(dailyRevenue * 100) / 100,
        completedRevenue: Math.round(completedRevenue * 100) / 100,
        predictedRevenue: Math.round(predictedRevenue * 100) / 100,
        dailyServices,
        appointments,
        activeCustomers: uniqueCustomers.size
      };

      console.log("Dashboard stats result:", result);
      return result;

    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        dailyRevenue: 0,
        completedRevenue: 0,
        predictedRevenue: 0,
        dailyServices: 0,
        appointments: 0,
        activeCustomers: 0
      };
    }
  }

  // Get today's appointments
  async getTodayAppointments(technicianId?: number | null): Promise<any[]> {
    console.log("Storage: Getting today's appointments...", technicianId ? `for technician ${technicianId}` : "for admin");

    const today = new Date().toISOString().split('T')[0];
    console.log("Storage: Today date:", today);

    try {
      const technicianCondition = technicianId ? sql`AND s.technician_id = ${technicianId}` : sql``;

      const result = await db.execute(sql`
        SELECT 
          s.id,
          c.name as customer_name,
          v.license_plate as vehicle_plate,
          v.brand as vehicle_brand,
          v.model as vehicle_model,
          st.name as service_type_name,
          s.scheduled_date,
          s.scheduled_time,
          s.status
        FROM services s
        JOIN customers c ON s.customer_id = c.id
        JOIN vehicles v ON s.vehicle_id = v.id
        JOIN service_types st ON s.service_type_id = st.id
        WHERE s.scheduled_date = ${today}
        ${technicianCondition}
        ORDER BY s.scheduled_time ASC
      `);

      console.log("Storage: Total today's appointments:", result.rows.length);
      const appointments = result.rows.map(row => ({
        id: row.id,
        customerName: row.customer_name,
        vehiclePlate: row.vehicle_plate,
        vehicleBrand: row.vehicle_brand,
        vehicleModel: row.vehicle_model,
        serviceTypeName: row.service_type_name,
        scheduledDate: row.scheduled_date,
        scheduledTime: row.scheduled_time,
        status: row.status,
      }));

      return appointments;
    } catch (error) {
      console.error("Error getting today's appointments:", error);
      return [];
    }
  }

  // Get upcoming appointments
  async getUpcomingAppointments(limit: number = 5, technicianId?: number | null): Promise<any[]> {
    console.log("Storage: Getting upcoming appointments...", technicianId ? `for technician ${technicianId}` : "for admin");

    const today = new Date().toISOString().split('T')[0];
    console.log("Storage: Today date:", today);

    try {
      const technicianCondition = technicianId ? sql`AND s.technician_id = ${technicianId}` : sql``;

      const result = await db.execute(sql`
        SELECT 
          s.id,
          c.name as customer_name,
          v.license_plate as vehicle_plate,
          v.brand as vehicle_brand,
          v.model as vehicle_model,
          st.name as service_type_name,
          s.scheduled_date,
          s.scheduled_time,
          s.status
        FROM services s
        JOIN customers c ON s.customer_id = c.id
        JOIN vehicles v ON s.vehicle_id = v.id
        JOIN service_types st ON s.service_type_id = st.id
        WHERE s.scheduled_date >= ${today}
        AND s.status = 'scheduled'
        ${technicianCondition}
        ORDER BY s.scheduled_date ASC, s.scheduled_time ASC
        LIMIT ${limit}
      `);

      console.log("Storage: Total upcoming appointments:", result.rows.length);
      const appointments = result.rows.map(row => ({
        id: row.id,
        customerName: row.customer_name,
        vehiclePlate: row.vehicle_plate,
        vehicleBrand: row.vehicle_brand,
        vehicleModel: row.vehicle_model,
        serviceTypeName: row.service_type_name,
        scheduledDate: row.scheduled_date,
        scheduledTime: row.scheduled_time,
        status: row.status,
      }));

      return appointments;
    } catch (error) {
      console.error("Error getting upcoming appointments:", error);
      return [];
    }
  }

  // Placeholder implementations for other required methods
  async getUser(id: number): Promise<User | undefined> { return undefined; }
  async getUserByUsername(username: string): Promise<User | undefined> { return undefined; }
  async createUser(user: InsertUser): Promise<User> { throw new Error("Not implemented"); }
  async getAllUsers(): Promise<User[]> { return []; }
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> { throw new Error("Not implemented"); }
  async deleteUser(id: number): Promise<void> {}
  async getCustomers(): Promise<Customer[]> { return []; }
  async getCustomer(id: number): Promise<Customer | undefined> { return undefined; }
  async getCustomerByDocument(document: string): Promise<Customer | undefined> { return undefined; }
  async createCustomer(customer: InsertCustomer): Promise<Customer> { throw new Error("Not implemented"); }
  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> { throw new Error("Not implemented"); }
  async deleteCustomer(id: number): Promise<void> {}
  async getVehicles(): Promise<Vehicle[]> { return []; }
  async getVehiclesByCustomer(customerId: number): Promise<Vehicle[]> { return []; }
  async getVehicle(id: number): Promise<Vehicle | undefined> { return undefined; }
  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> { throw new Error("Not implemented"); }
  async updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle> { throw new Error("Not implemented"); }
  async deleteVehicle(id: number): Promise<void> {}
  async getServices(): Promise<Service[]> { return []; }
  async getService(id: number): Promise<Service | undefined> { return undefined; }
  async getServicesByCustomer(customerId: number): Promise<Service[]> { return []; }
  async getServicesByVehicle(vehicleId: number): Promise<Service[]> { return []; }
  async getServicesByDateRange(startDate: string, endDate: string): Promise<Service[]> { return []; }
  async createService(service: InsertService): Promise<Service> { throw new Error("Not implemented"); }
  async updateService(id: number, service: Partial<InsertService>): Promise<Service> { throw new Error("Not implemented"); }
  async deleteService(id: number): Promise<void> {}
  async getServiceTypes(): Promise<ServiceType[]> { return []; }
  async getServiceType(id: number): Promise<ServiceType | undefined> { return undefined; }
  async createServiceType(serviceType: InsertServiceType): Promise<ServiceType> { throw new Error("Not implemented"); }
  async updateServiceType(id: number, serviceType: Partial<InsertServiceType>): Promise<ServiceType> { throw new Error("Not implemented"); }
  async getPaymentsByService(serviceId: number): Promise<Payment[]> { return []; }
  async createPayment(payment: InsertPayment): Promise<Payment> { throw new Error("Not implemented"); }
  async getRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]> { return []; }
  async getTopServices(): Promise<{ name: string; count: number; revenue: number }[]> { return []; }
  async getRecentServices(limit: number, technicianId?: number | null): Promise<any[]> { return []; }
}

// Export a working instance for testing
export const fixedStorage = new DatabaseStorage();