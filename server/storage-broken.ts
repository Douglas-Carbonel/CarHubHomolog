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
      const result = await db.select().from(customers).orderBy(asc(customers.name));
      console.log('Successfully fetched customers:', result.length);
      return result;
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
    return await db.select().from(vehicles).orderBy(asc(vehicles.plate));
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
          gte(services.scheduledDate, startDate),
          lte(services.scheduledDate, endDate)
        )
      );
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
    dailyServices: number;
    appointments: number;
    activeCustomers: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Daily revenue from completed services
    const [dailyRevenueResult] = await db
      .select({ revenue: sum(services.finalValue) })
      .from(services)
      .where(
        and(
          eq(services.status, 'completed'),
          eq(services.scheduledDate, today)
        )
      );

    // Daily services count
    const [dailyServicesResult] = await db
      .select({ count: count() })
      .from(services)
      .where(eq(services.scheduledDate, today));

    // Appointments in next 24h
    const [appointmentsResult] = await db
      .select({ count: count() })
      .from(services)
      .where(
        and(
          eq(services.status, 'scheduled'),
          gte(services.scheduledDate, today),
          lte(services.scheduledDate, tomorrow)
        )
      );

    // Active customers (with services in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [activeCustomersResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${services.customerId})` })
      .from(services)
      .where(gte(services.scheduledDate, thirtyDaysAgo));

    return {
      dailyRevenue: Number(dailyRevenueResult?.revenue || 0),
      dailyServices: dailyServicesResult?.count || 0,
      appointments: appointmentsResult?.count || 0,
      activeCustomers: Number(activeCustomersResult?.count || 0),
    };
  }

  async getRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const results = await db
      .select({
        date: services.scheduledDate,
        revenue: sum(services.finalValue)
      })
      .from(services)
      .where(
        and(
          eq(services.status, 'completed'),
          gte(services.scheduledDate, startDate)
        )
      )
      .groupBy(services.scheduledDate)
      .orderBy(asc(services.scheduledDate));

    return results.map(r => ({
      date: r.date || '',
      revenue: Number(r.revenue || 0)
    }));
  }

  async getTopServices(): Promise<{ name: string; count: number; revenue: number }[]> {
    const results = await db
      .select({
        name: serviceTypes.name,
        count: count(),
        revenue: sum(services.finalValue)
      })
      .from(services)
      .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
      .where(eq(services.status, 'completed'))
      .groupBy(serviceTypes.id, serviceTypes.name)
      .orderBy(desc(count()))
      .limit(5);

    return results.map(r => ({
      name: r.name,
      count: r.count,
      revenue: Number(r.revenue || 0)
    }));
  }

  async getRecentServices(limit: number): Promise<any[]> {
    const results = await db
      .select({
        id: services.id,
        status: services.status,
        finalValue: services.finalValue,
        estimatedValue: services.estimatedValue,
        customerName: customers.name,
        vehicleBrand: vehicles.brand,
        vehicleModel: vehicles.model,
        vehiclePlate: vehicles.plate,
        serviceTypeName: serviceTypes.name,
        scheduledDate: services.scheduledDate,
      })
      .from(services)
      .innerJoin(customers, eq(services.customerId, customers.id))
      .innerJoin(vehicles, eq(services.vehicleId, vehicles.id))
      .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
      .orderBy(desc(services.createdAt))
      .limit(limit);

    return results;
  }

  async getUpcomingAppointments(limit: number): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];

    const results = await db
      .select({
        id: services.id,
        scheduledDate: services.scheduledDate,
        scheduledTime: services.scheduledTime,
        customerName: customers.name,
        vehicleBrand: vehicles.brand,
        vehicleModel: vehicles.model,
        vehiclePlate: vehicles.plate,
        serviceTypeName: serviceTypes.name,
      })
      .from(services)
      .innerJoin(customers, eq(services.customerId, customers.id))
      .innerJoin(vehicles, eq(services.vehicleId, vehicles.id))
      .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
      .where(
        and(
          eq(services.status, 'scheduled'),
          gte(services.scheduledDate, today)
        )
      )
      .orderBy(asc(services.scheduledDate), asc(services.scheduledTime))
      .limit(limit);

    return results;
  }
}

export const storage = new DatabaseStorage();