import {
  users,
  customers,
  vehicles,
  services,
  serviceTypes,
  payments,
  type User,
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type Vehicle,
  type InsertVehicle,
  type Service,
  type InsertService,
  type ServiceType,
  type InsertServiceType,
  type Payment,
  type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, count, sum, sql } from "drizzle-orm";

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
  getDashboardStats(): Promise<{
    dailyRevenue: number;
    dailyServices: number;
    appointments: number;
    activeCustomers: number;
  }>;
  getRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]>;
  getTopServices(): Promise<{ name: string; count: number; revenue: number }[]>;
  getRecentServices(limit: number): Promise<any[]>;
  getUpcomingAppointments(limit: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.createdAt));
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    try {
      const result = await db.execute(sql`SELECT * FROM customers ORDER BY name ASC`);
      return result.rows as Customer[];
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByDocument(document: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.document, document));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Vehicle operations
  async getVehicles(): Promise<Vehicle[]> {
    try {
      const result = await db.execute(sql`SELECT * FROM vehicles ORDER BY plate ASC`);
      return result.rows as Vehicle[];
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }

  async getVehiclesByCustomer(customerId: number): Promise<Vehicle[]> {
    return await db.select().from(vehicles).where(eq(vehicles.customerId, customerId));
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db.insert(vehicles).values(vehicle).returning();
    return newVehicle;
  }

  async updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle> {
    const [updatedVehicle] = await db
      .update(vehicles)
      .set({ ...vehicle, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return updatedVehicle;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Service operations
  async getServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(desc(services.createdAt));
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async getServicesByCustomer(customerId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.customerId, customerId));
  }

  async getServicesByVehicle(vehicleId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.vehicleId, vehicleId));
  }

  async getServicesByDateRange(startDate: string, endDate: string): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(
        and(
          gte(services.scheduledDate, new Date(startDate)),
          lte(services.scheduledDate, new Date(endDate))
        )
      )
      .orderBy(desc(services.scheduledDate));
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service> {
    const [updatedService] = await db
      .update(services)
      .set({ ...service, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // Service type operations
  async getServiceTypes(): Promise<ServiceType[]> {
    return await db.select().from(serviceTypes).orderBy(asc(serviceTypes.name));
  }

  async getServiceType(id: number): Promise<ServiceType | undefined> {
    const [serviceType] = await db.select().from(serviceTypes).where(eq(serviceTypes.id, id));
    return serviceType;
  }

  async createServiceType(serviceType: InsertServiceType): Promise<ServiceType> {
    const [newServiceType] = await db.insert(serviceTypes).values(serviceType).returning();
    return newServiceType;
  }

  async updateServiceType(id: number, serviceType: Partial<InsertServiceType>): Promise<ServiceType> {
    const [updatedServiceType] = await db
      .update(serviceTypes)
      .set(serviceType)
      .where(eq(serviceTypes.id, id))
      .returning();
    return updatedServiceType;
  }

  // Payment operations
  async getPaymentsByService(serviceId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.serviceId, serviceId));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    dailyRevenue: number;
    dailyServices: number;
    appointments: number;
    activeCustomers: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      return {
        dailyRevenue: 0,
        dailyServices: 0,
        appointments: 0,
        activeCustomers: 0,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        dailyRevenue: 0,
        dailyServices: 0,
        appointments: 0,
        activeCustomers: 0,
      };
    }
  }

  async getRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const result = await db
      .select({
        date: sql<string>`date(${services.completedDate})`,
        revenue: sum(services.finalValue),
      })
      .from(services)
      .where(
        and(
          gte(services.completedDate, startDate),
          eq(services.status, 'completed')
        )
      )
      .groupBy(sql`date(${services.completedDate})`)
      .orderBy(sql`date(${services.completedDate})`);

    return result.map(row => ({
      date: row.date,
      revenue: Number(row.revenue || 0),
    }));
  }

  async getTopServices(): Promise<{ name: string; count: number; revenue: number }[]> {
    const result = await db
      .select({
        name: serviceTypes.name,
        count: count(),
        revenue: sum(services.finalValue),
      })
      .from(services)
      .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
      .where(eq(services.status, 'completed'))
      .groupBy(serviceTypes.id, serviceTypes.name)
      .orderBy(desc(count()))
      .limit(5);

    return result.map(row => ({
      name: row.name,
      count: Number(row.count),
      revenue: Number(row.revenue || 0),
    }));
  }

  async getRecentServices(limit: number): Promise<any[]> {
    return await db
      .select({
        id: services.id,
        customerName: customers.name,
        vehiclePlate: vehicles.plate,
        serviceType: serviceTypes.name,
        status: services.status,
        scheduledDate: services.scheduledDate,
        finalValue: services.finalValue,
      })
      .from(services)
      .innerJoin(customers, eq(services.customerId, customers.id))
      .innerJoin(vehicles, eq(services.vehicleId, vehicles.id))
      .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
      .orderBy(desc(services.createdAt))
      .limit(limit);
  }

  async getUpcomingAppointments(limit: number): Promise<any[]> {
    const today = new Date();
    
    return await db
      .select({
        id: services.id,
        customerName: customers.name,
        vehiclePlate: vehicles.plate,
        serviceType: serviceTypes.name,
        scheduledDate: services.scheduledDate,
        estimatedValue: services.estimatedValue,
      })
      .from(services)
      .innerJoin(customers, eq(services.customerId, customers.id))
      .innerJoin(vehicles, eq(services.vehicleId, vehicles.id))
      .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
      .where(
        and(
          gte(services.scheduledDate, today),
          eq(services.status, 'scheduled')
        )
      )
      .orderBy(asc(services.scheduledDate))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();