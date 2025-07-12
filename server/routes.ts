import express, { type Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { photosStorage } from "./photos-storage.js";
import { notificationService } from "./notification-service.js";
import { ocrService } from "./ocr-service.js";
import { localOCRService } from "./local-ocr-service.js";
import { plateRecognizerService } from "./plate-recognizer-service.js";
import { mercadoPagoService } from "./mercadopago-service.js";
import type { User } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { fileURLToPath } from "url";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File upload - mimetype:', file.mimetype, 'originalname:', file.originalname);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      console.error('Invalid file type:', file.mimetype);
      cb(new Error('Only image files are allowed'));
    }
  }
});
import { setupAuth, createInitialAdmin, hashPassword } from "./auth";
import { getFixedDashboardStats } from "./storage-dashboard-fix";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Function to ensure pix_payments table exists
async function ensurePixPaymentsTable() {
  try {
    console.log('Checking if pix_payments table exists...');

    // Check if table exists first
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pix_payments'
      )
    `);

    if (tableExists.rows[0]?.exists) {
      console.log('pix_payments table already exists - checking for missing fields...');
      
      // Verificar se o campo qr_code_base64 existe
      const qrCodeBase64Exists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'pix_payments'
          AND column_name = 'qr_code_base64'
        )
      `);

      if (!qrCodeBase64Exists.rows[0]?.exists) {
        console.log('Adding qr_code_base64 field to pix_payments table...');
        await db.execute(sql`
          ALTER TABLE pix_payments 
          ADD COLUMN qr_code_base64 TEXT;
        `);
        console.log('✅ qr_code_base64 field added successfully');
      }

      // Verificar se o campo external_reference existe
      const extRefExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'pix_payments'
          AND column_name = 'external_reference'
        )
      `);

      if (!extRefExists.rows[0]?.exists) {
        console.log('Adding external_reference field to pix_payments table...');
        await db.execute(sql`
          ALTER TABLE pix_payments 
          ADD COLUMN external_reference VARCHAR;
        `);
        console.log('✅ external_reference field added successfully');
      }

      return;
    }

    console.log('Creating pix_payments table...');

    // Create table only if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pix_payments (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id),
        mercadopago_id VARCHAR NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR DEFAULT 'pending',
        qr_code TEXT,
        qr_code_base64 TEXT,
        pix_copy_paste TEXT,
        expiration_date TIMESTAMP,
        approved_date TIMESTAMP,
        customer_email VARCHAR,
        customer_name VARCHAR,
        customer_document VARCHAR,
        external_reference VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes safely
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_pix_payments_service_id ON pix_payments(service_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_pix_payments_mercadopago_id ON pix_payments(mercadopago_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON pix_payments(status)
    `);

    console.log('pix_payments table created successfully');
  } catch (error) {
    console.error('Error ensuring pix_payments table:', error);
  }
}

// Function to ensure service_items table exists
async function ensureServiceItemsTable() {
  try {
    console.log('Checking if service_items table exists...');

    // Check if table exists first
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'service_items'
      )
    `);

    if (tableExists.rows[0]?.exists) {
      console.log('service_items table already exists - skipping creation');
      return;
    }

    console.log('Creating service_items table...');

    // Create table only if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS service_items (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        service_type_id INTEGER NOT NULL REFERENCES service_types(id),
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes safely
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_service_items_service_id ON service_items(service_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_service_items_service_type_id ON service_items(service_type_id)
    `);

    console.log('service_items table created successfully');
  } catch (error) {
    console.error('Error ensuring service_items table:', error);
  }
}

// Function to create initial service types
async function createInitialServiceTypes() {
  try {
    const existingTypes = await storage.getServiceTypes();

    // Lista completa de tipos de serviços (incluindo os novos)
    const allServiceTypes = [
      { 
        name: "Troca de Óleo", 
        description: "Troca de óleo do motor", 
        defaultPrice: "80.00",
        isRecurring: true,
        intervalMonths: 6,
        loyaltyPoints: 10
      },
      { 
        name: "Alinhamento", 
        description: "Alinhamento e balanceamento", 
        defaultPrice: "120.00",
        isRecurring: true,
        intervalMonths: 12,
        loyaltyPoints: 15
      },
      { 
        name: "Revisão Geral", 
        description: "Revisão completa do veículo", 
        defaultPrice: "300.00",
        isRecurring: true,
        intervalMonths: 12,
        loyaltyPoints: 30
      },
      { 
        name: "Troca de Pneus", 
        description: "Troca de pneus", 
        defaultPrice: "200.00",
        isRecurring: false,
        loyaltyPoints: 20
      },
      { 
        name: "Lavagem", 
        description: "Lavagem completa", 
        defaultPrice: "30.00",
        isRecurring: false,
        loyaltyPoints: 5
      },
      { 
        name: "Freios", 
        description: "Manutenção do sistema de freios", 
        defaultPrice: "150.00",
        isRecurring: true,
        intervalMonths: 18,
        loyaltyPoints: 18
      },
      { 
        name: "Higienização", 
        description: "Serviços de higienização e limpeza profunda", 
        defaultPrice: "100.00",
        isRecurring: true,
        intervalMonths: 1,
        loyaltyPoints: 8
      },
      { 
        name: "Reparo", 
        description: "Serviços de reparo e manutenção", 
        defaultPrice: "180.00",
        isRecurring: false,
        loyaltyPoints: 15
      },
      { 
        name: "Outros", 
        description: "Outros serviços não especificados", 
        defaultPrice: "50.00",
        isRecurring: false,
        loyaltyPoints: 5
      },
    ];

    // Verifica quais tipos já existem
    const existingNames = existingTypes.map(type => type.name);

    // Adiciona apenas os tipos que não existem
    for (const serviceType of allServiceTypes) {
      if (!existingNames.includes(serviceType.name)) {
        await storage.createServiceType(serviceType);
        console.log(`Tipo de serviço "${serviceType.name}" criado com sucesso`);
      }
    }

    if (existingTypes.length === 0) {
      console.log("Tipos de serviço iniciais criados com sucesso");
    } else {
      console.log("Novos tipos de serviço adicionados com sucesso");
    }
  } catch (error) {
    console.error("Erro ao criar tipos de serviço iniciais:", error);
  }
}
import { 
  insertCustomerSchema,
  insertVehicleSchema,
  insertServiceSchema,
  insertServiceTypeSchema,
  insertPaymentSchema,
  insertUserSchema
} from "@shared/schema";


// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // Set up authentication
  setupAuth(app);

  // Create initial admin user
  await createInitialAdmin();

  // Ensure service_items table exists
  await ensureServiceItemsTable();

  // Ensure pix_payments table exists
  await ensurePixPaymentsTable();

  // Create initial service types if they don't exist
  await createInitialServiceTypes();

  // Customer routes
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(parseInt(req.params.id));
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", requireAuth, async (req, res) => {
    try {
      console.log('POST /api/customers - Request body:', JSON.stringify(req.body, null, 2));
      console.log('POST /api/customers - User:', req.user?.username);

      const customerData = insertCustomerSchema.parse(req.body);
      console.log('POST /api/customers - Parsed data:', JSON.stringify(customerData, null, 2));

      // Check if document already exists (only if document is provided)
      if (customerData.document && customerData.document.trim() !== '') {
        const existingCustomer = await storage.getCustomerByDocument(customerData.document);
        if (existingCustomer) {
          console.log('POST /api/customers - Document already exists:', customerData.document);
          return res.status(400).json({ message: "Document already registered" });
        }
      }

      console.log('POST /api/customers - Creating customer...');
      const customer = await storage.createCustomer(customerData);
      console.log('POST /api/customers - Customer created successfully:', customer);
      res.status(201).json(customer);
    } catch (error: any) {
      console.error('POST /api/customers - Error:', error);
      if (error.name === 'ZodError') {
        console.error('POST /api/customers - Validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer", error: error.message });
    }
  });

  app.put("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(parseInt(req.params.id), customerData);
      res.json(customer);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCustomer(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Vehicle routes
  app.get("/api/vehicles", requireAuth, async (req, res) => {
    try {
      const { customerId } = req.query;
      let vehicles;

      if (customerId) {
        // Filter vehicles by customer ID
        const allVehicles = await storage.getVehicles();
        vehicles = allVehicles.filter(vehicle => vehicle.customerId === parseInt(customerId as string));
        console.log(`Retrieved ${vehicles.length} vehicles for customer ${customerId}`);
      } else {
        vehicles = await storage.getVehicles();
        console.log(`Retrieved ${vehicles.length} vehicles`);
      }

      res.json(vehicles);
    } catch (error) {
      console.error("Error getting vehicles:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/customers/:customerId/vehicles", requireAuth, async (req, res) => {
    try {
      const vehicles = await storage.getVehiclesByCustomer(parseInt(req.params.customerId));
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.post("/api/vehicles", requireAuth, async (req, res) => {
    try {
      const vehicleData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(vehicleData);
      res.status(201).json(vehicle);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.put("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
      const vehicleData = insertVehicleSchema.partial().parse(req.body);
      const vehicle = await storage.updateVehicle(parseInt(req.params.id), vehicleData);
      res.json(vehicle);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.delete("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteVehicle(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      if (error.message && error.message.includes('serviço(s) em aberto')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // Service routes
  app.get("/api/services", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { status } = req.query;

      // Use the existing getServices method that returns services with joined data
      let services;
      if (user.role === 'admin') {
        services = await storage.getServices();
      } else {
        services = await storage.getServices(user.id);
      }

      // Filter by status if provided
      if (status && typeof status === 'string') {
        services = services.filter(service => service.status === status);
      }

      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.post("/api/services", requireAuth, async (req, res) => {
    try {
      console.log('Received service data:', JSON.stringify(req.body, null, 2));

      // Extract reminder fields before validation
      const reminderEnabled = req.body.reminderEnabled;
      const reminderMinutes = req.body.reminderMinutes || 30;
      console.log('POST /api/services - reminderEnabled:', reminderEnabled);
      console.log('POST /api/services - reminderMinutes:', reminderMinutes);

      // Prepare the data for validation (without reminder fields)
      const cleanedData = {
        ...req.body,
        customerId: Number(req.body.customerId),
        vehicleId: Number(req.body.vehicleId),
        estimatedValue: req.body.estimatedValue && req.body.estimatedValue !== "" ? String(req.body.estimatedValue) : undefined,
        valorPago: req.body.valorPago && req.body.valorPago !== "" ? String(req.body.valorPago) : "0.00",
        notes: req.body.notes || undefined,
        scheduledTime: req.body.scheduledTime || undefined,
      };

      // Remove reminder fields from the data that goes to the database
      delete cleanedData.reminderEnabled;
      delete cleanedData.reminderMinutes;

      // Handle both serviceExtras (legacy) and serviceItems formats
      const serviceItems: any[] = [];

      // Handle serviceExtras format (from service creation form)
      if (req.body.serviceExtras && Array.isArray(req.body.serviceExtras)) {
        req.body.serviceExtras.forEach((extra: any) => {
          if (extra.serviceExtraId > 0 && Number(extra.valor) > 0) {
            serviceItems.push({
              serviceTypeId: Number(extra.serviceExtraId),
              quantity: 1,
              unitPrice: String(extra.valor),
              totalPrice: String(extra.valor),
              notes: extra.observacao || undefined,
            });
          }
        });
      }

      // Handle serviceItems format (from services page)
      if (req.body.serviceItems && Array.isArray(req.body.serviceItems)) {
        req.body.serviceItems.forEach((item: any) => {
          if (item.serviceTypeId > 0) {
            serviceItems.push({
              serviceTypeId: Number(item.serviceTypeId),
              quantity: Number(item.quantity) || 1,
              unitPrice: String(item.unitPrice || "0.00"),
              totalPrice: String(item.totalPrice || "0.00"),
              notes: item.notes || undefined,
            });
          }
        });
      }

      if (serviceItems.length === 0) {
        return res.status(400).json({ message: "É necessário selecionar pelo menos um serviço" });
      }

      cleanedData.serviceItems = serviceItems;

      const serviceData = insertServiceSchema.parse(cleanedData);
      console.log('Parsed service data:', JSON.stringify(serviceData, null, 2));

      // Se não foi informada data de agendamento, usar a data atual no timezone brasileiro
      if (!serviceData.scheduledDate || serviceData.scheduledDate === "") {
        const now = new Date();
        // Converter para timezone brasileiro usando Intl.DateTimeFormat
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        const parts = formatter.formatToParts(now);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        const hour = parts.find(p => p.type === 'hour')?.value;
        const minute = parts.find(p => p.type === 'minute')?.value;
        const second = parts.find(p => p.type === 'second')?.value;

        serviceData.scheduledDate = `${year}-${month}-${day}`;

        // Se não foi informada hora de agendamento, usar a hora atual no timezone brasileiro
        if (!serviceData.scheduledTime || serviceData.scheduledTime === "") {
          serviceData.scheduledTime = `${hour}:${minute}:${second}`;
        }
      } else if (!serviceData.scheduledTime || serviceData.scheduledTime === "") {
        // Se só a hora não foi informada, usar a hora atual no timezone brasileiro
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        const parts = formatter.formatToParts(now);
        const hour = parts.find(p => p.type === 'hour')?.value;
        const minute = parts.find(p => p.type === 'minute')?.value;
        const second = parts.find(p => p.type === 'second')?.value;

        serviceData.scheduledTime = `${hour}:${minute}:${second}`;
      }

      // IMPORTANTE: Todos os horários são interpretados como horário brasileiro (UTC-3)
      console.log(`Service scheduled for: ${serviceData.scheduledDate}T${serviceData.scheduledTime} (Brazil timezone UTC-3)`);
      console.log('Creating service with data:', JSON.stringify(serviceData, null, 2));
      const service = await storage.createService(serviceData);
      console.log('Service created successfully:', service);

      // Create reminder if enabled
      if (reminderEnabled && service.id) {
        console.log(`Creating reminder for service ${service.id} with ${reminderMinutes} minutes`);
        await notificationService.createServiceReminder(service.id, reminderMinutes);
        console.log(`Service reminder created for service ${service.id} - ${reminderMinutes} minutes before`);
      } else {
        console.log(`No reminder created - reminderEnabled: ${reminderEnabled}, serviceId: ${service.id}`);
      }



      res.status(201).json(service);
    } catch (error: any) {
      console.error('Error creating service:', error);
      if (error.name === 'ZodError') {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service", error: error.message });
    }
  });

  app.put("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      console.log('PUT /api/services/:id - Raw body:', JSON.stringify(req.body, null, 2));

      // Extract reminder fields before validation
      const reminderEnabled = req.body.reminderEnabled;
      const reminderMinutes = req.body.reminderMinutes || 30;
      console.log('PUT /api/services/:id - reminderEnabled:', reminderEnabled);
      console.log('PUT /api/services/:id - reminderMinutes:', reminderMinutes);

      // Remove reminder fields from the data that goes to the database
      const { reminderEnabled: _, reminderMinutes: __, ...serviceDataForDB } = req.body;

      const serviceData = insertServiceSchema.partial().parse(serviceDataForDB);
      const service = await storage.updateService(serviceId, serviceData);

      // Create reminder if enabled
      if (reminderEnabled && serviceId) {
        console.log(`Creating reminder for service ${serviceId} with ${reminderMinutes} minutes`);
        await notificationService.createServiceReminder(serviceId, reminderMinutes);
        console.log(`Service reminder created for service ${serviceId} - ${reminderMinutes} minutes before`);
      } else {
        console.log(`No reminder created - reminderEnabled: ${reminderEnabled}, serviceId: ${serviceId}`);
      }

      res.json(service);
    } catch (error: any) {
      console.error('Error updating service:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  // Get service reminders
  app.get("/api/services/:id/reminders", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const reminder = await db.execute(sql`
        SELECT * FROM service_reminders 
        WHERE service_id = ${serviceId} 
        AND notification_sent = false
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (reminder.rows.length > 0) {
        res.json({
          hasReminder: true,
          reminderMinutes: reminder.rows[0].reminder_minutes,
          scheduledFor: reminder.rows[0].scheduled_for
        });
      } else {
        res.json({
          hasReminder: false,
          reminderMinutes: 30
        });
      }
    } catch (error: any) {
      console.error('Error fetching service reminders:', error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  app.delete("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      console.log(`API: Attempting to delete service with ID: ${serviceId}`);

      await storage.deleteService(serviceId);
      console.log(`API: Successfully deleted service ${serviceId}`);

      res.status(204).send();
    } catch (error) {
      console.error(`API: Error deleting service ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to delete service",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Service items endpoint - returns items for a specific service
  app.get("/api/services/:serviceId/items", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      console.log('API: Getting service items for service:', serviceId);

      const result = await db.execute(sql`
        SELECT 
          si.id,
          si.service_id,
          si.service_type_id,
          si.quantity,
          si.unit_price,
          si.total_price,
          si.notes,
          si.created_at,
          st.name as service_type_name,
          st.description as service_type_description,
          st.default_price as service_type_default_price
        FROM service_items si
        INNER JOIN service_types st ON si.service_type_id = st.id
        WHERE si.service_id = ${serviceId}
        ORDER BY si.created_at ASC
      `);

      const serviceItems = result.rows.map((item: any) => ({
        id: item.id,
        serviceId: item.service_id,
        serviceTypeId: item.service_type_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        notes: item.notes,
        serviceTypeName: item.service_type_name,
        serviceTypeDescription: item.service_type_description,
        serviceTypeDefaultPrice: item.service_type_default_price,
        createdAt: item.created_at
      }));

      console.log('API: Found', serviceItems.length, 'service items');
      res.json(serviceItems);
    } catch (error) {
      console.error("Error fetching service items:", error);
      res.status(500).json({ message: "Failed to fetch service items" });
    }
  });

  // Service Type routes
  app.get("/api/service-types", requireAuth, async (req, res) => {
    try {
      const serviceTypes = await storage.getServiceTypes();
      console.log("Service types retornados para usuário autenticado:", serviceTypes.length, serviceTypes);
      res.json(serviceTypes);
    } catch (error) {
      console.error("Erro ao buscar tipos de serviço:", error);
      res.status(500).json({ message: "Failed to fetch service types" });
    }
  });

  // Service Type management routes
  app.get("/api/admin/service-types", requireAdmin, async (req, res) => {
    try {
      const serviceTypes = await storage.getServiceTypes();
      console.log("Service types retornados:", serviceTypes.length, serviceTypes);
      res.json(serviceTypes);
    } catch (error) {
      console.error("Erro ao buscar tipos de serviço:", error);
      res.status(500).json({ message: "Failed to fetch service types" });
    }
  });

  app.post("/api/service-types", requireAuth, async (req, res) => {
    try {
      const serviceTypeData = insertServiceTypeSchema.parse(req.body);
      const serviceType = await storage.createServiceType(serviceTypeData);
      res.status(201).json(serviceType);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service type" });
    }
  });

  // Payment routes
  app.get("/api/services/:serviceId/payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByService(parseInt(req.params.serviceId));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Dashboard stats com lógica correta
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const technicianId = user.role === 'admin' ? null : user.id;

      // Buscar todos os serviços
      const allServices = await storage.getServices();

      let receitaRealizada = 0;  // Serviços com valorPago > 0
      let receitaPendente = 0;   // Serviços com valorPago = 0
      let servicosConcluidos = 0; // Status = 'completed'
      let pagamentosPendentes = 0; // valorPago = 0
      let servicosComPagamentoParcial = 0; // 0 < valorPago < estimatedValue

      allServices.forEach((service: any) => {
        const estimatedValue = parseFloat(service.estimatedValue || 0);
        const valorPago = parseFloat(service.valorPago || 0);
        const status = service.status;

        // Receita realizada (serviços que receberam algum pagamento)
        if (valorPago > 0) {
          receitaRealizada += valorPago;
        }

        // Receita pendente (valor estimado menos o que foi pago)
        if (valorPago < estimatedValue) {
          receitaPendente += (estimatedValue - valorPago);
        }

        // Serviços concluídos
        if (status === 'completed') {
          servicosConcluidos++;
        }

        // Pagamentos pendentes (serviços sem nenhum pagamento)
        if (valorPago === 0) {
          pagamentosPendentes++;
        }

        // Pagamentos parciais
        if (valorPago > 0 && valorPago < estimatedValue) {
          servicosComPagamentoParcial++;
        }
      });

      const stats = {
        receitaRealizada: Math.round(receitaRealizada * 100) / 100,
        receitaPendente: Math.round(receitaPendente * 100) / 100,
        servicosConcluidos,
        pagamentosPendentes,
        servicosComPagamentoParcial,
        totalServicos: allServices.length,
        // Manter compatibilidade com cards antigos
        completedRevenue: Math.round(receitaRealizada * 100) / 100,
        predictedRevenue: Math.round((receitaRealizada + receitaPendente) * 100) / 100,
        activeCustomers: pagamentosPendentes,
        weeklyServices: servicosConcluidos
      };

      console.log("Dashboard stats (nova lógica):", stats);
      res.json(stats);
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      res.status(500).json({ message: "Failed to get dashboard stats", error: error.message });
    }
  });

  // Dashboard new analytics
  app.get("/api/dashboard/analytics", requireAuth, async (req, res) => {
    try {
      const analytics = await storage.getDashboardAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error getting dashboard analytics:", error);
      res.status(500).json({ message: "Failed to get dashboard analytics" });
    }
  });

  // Dashboard revenue data
  app.get("/api/dashboard/revenue", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      console.log(`API: Getting revenue data for ${days} days`);
      const revenueData = await storage.getRevenueByDays(days);
      console.log('Revenue data retrieved:', revenueData);
      res.json(revenueData);
    } catch (error) {
      console.error('API Error getting revenue data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Dashboard realized revenue data (serviços com pagamento)
  app.get("/api/dashboard/realized-revenue", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      console.log(`API: Getting realized revenue data for ${days} days (paid services only)`);

      // Buscar todos os serviços dos últimos X dias
      const allServices = await storage.getServices();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);

      const revenueByDate: Record<string, number> = {};

      // Inicializar todos os dias com 0
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        revenueByDate[dateStr] = 0;
      }

      // Calcular receita apenas de serviços com pagamento
      allServices.forEach((service: any) => {
        const serviceDate = service.scheduledDate;
        const valorPago = parseFloat(service.valorPago || 0);

        if (valorPago > 0 && serviceDate in revenueByDate) {
          revenueByDate[serviceDate] += valorPago;
        }
      });

      // Converter para formato esperado pelo gráfico
      const chartData = Object.entries(revenueByDate).map(([date, revenue]) => {
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

        return {
          date: dayName,
          fullDate: date,
          revenue: Math.round((revenue as number) * 100) / 100
        };
      });

      console.log('Realized revenue data (paid services):', chartData);
      res.json(chartData);
    } catch (error) {
      console.error('API Error getting realized revenue data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Top services - versão simplificada
  app.get("/api/dashboard/top-services", requireAuth, async (req, res) => {
    try {
      console.log("API: Getting top services...");
      const user = req.user!;

      // Buscar todos os serviços e calcular popularidade
      const allServices = await storage.getServices();
      const serviceTypeCount: Record<string, { count: number; revenue: number; name: string }> = {};

      allServices.forEach((service: any) => {
        const serviceTypeName = service.serviceType?.name || 'Sem categoria';
        const valorPago = parseFloat(service.valorPago || 0);

        if (!serviceTypeCount[serviceTypeName]) {
          serviceTypeCount[serviceTypeName] = { count: 0, revenue: 0, name: serviceTypeName };
        }

        serviceTypeCount[serviceTypeName].count += 1;
        serviceTypeCount[serviceTypeName].revenue += valorPago;
      });

      // Converter para array e ordenar
      const topServices = Object.values(serviceTypeCount)
        .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
        .slice(0, 5)
        .map(item => ({
          name: item.name,
          count: item.count,
          revenue: Math.round(item.revenue * 100) / 100
        }));

      console.log("API: Top services result:", topServices);
      res.json(topServices);
    } catch (error: any) {
      console.error("API Error getting top services:", error);
      res.status(500).json({ message: "Failed to get top services", error: error.message });
    }
  });

  // Recent services
  app.get("/api/dashboard/recent-services", requireAuth, async (req, res) => {
    try {
      console.log("API: Getting recent services...");
      const user = req.user!;
      const limit = parseInt(req.query.limit as string) || 5;
      const recentServices = await storage.getRecentServices(limit, user.role === 'admin' ? null : user.id);
      console.log("API: Recent services result:", recentServices.length, "services");
      res.json(recentServices);
    } catch (error) {
      console.error("API Error getting recent services:", error);
      res.status(500).json({ message: "Failed to get recent services", error: error.message });
    }
  });

  // Upcoming appointments
  app.get("/api/dashboard/upcoming-appointments", requireAuth, async (req, res) => {
    try {
      console.log("API: Getting upcoming appointments...");
      const user = req.user!;
      const limit = parseInt(req.query.limit as string) || 5;
      const appointments = await storage.getUpcomingAppointments(limit, user.role === 'admin' ? null : user.id);
      console.log("API: Upcoming appointments result:", appointments.length, "appointments");
      res.json(appointments);
    } catch (error) {
      console.error("API Error getting upcoming appointments:", error);
      res.status(500).json({ message: "Failed to get upcoming appointments", error: error.message });
    }
  });

  // Analytics routes - Admin only
  app.get("/api/analytics/services", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getServiceAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error getting service analytics:", error);
      res.status(500).json({ message: "Failed to get service analytics" });
    }
  });

  app.get("/api/analytics/customers", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getCustomerAnalytics();
      res.json(analytics);
    } catch (error: any) {
      console.error("Error getting customer analytics:", error);
      res.status(500).json({ message: "Failed to get customer analytics" });
    }
  });

app.get("/api/analytics/vehicles", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getVehicleAnalytics();
      res.json(analytics);
    } catch (error: any) {
      console.error("Error fetching vehicle analytics:", error);
      res.status(500).json({ 
        error: "Failed to fetch vehicle analytics",
        details: error.message 
      });
    }
  });

  // Schedule analytics
  app.get("/api/dashboard/schedule-stats", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const technicianId = user.role === 'admin' ? null : user.id;      const stats = await storage.getScheduleStats(technicianId);
      res.json(stats);
    } catch (error) {
      console.error('Error getting schedule stats:', error);
      res.status(500).json({ error: 'Failed to get schedule stats' });
    }
  });

  // Debug endpoint for today's services
  app.get("/api/debug/today-services", requireAuth, async (req, res) => {
    try {
      // Get current date in Brazilian timezone (UTC-3)
      const today = new Date();
      const brazilTime = new Date(today.getTime() - (3 * 60 * 60 * 1000));
      const todayStr = brazilTime.toISOString().split('T')[0];

      console.log("Debug: Brazilian date for today:", todayStr);

      const result = await db.execute(sql`
        SELECT 
          s.id,
          s.scheduled_date,
          s.status,
          s.estimated_value,
          c.name as customer_name,
          st.name as service_type_name
        FROM services s
        JOIN customers c ON s.customer_id = c.id
        LEFT JOIN service_types st ON s.service_type_id = st.id
        WHERE s.scheduled_date = ${todayStr}
        ORDER BY s.id
      `);

      console.log("Debug: Services found for today:", result.rows);

      res.json({
        todayDate: todayStr,
        servicesCount: result.rows.length,
        services: result.rows
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ error: 'Debug failed' });
    }
  });

  app.get("/api/dashboard/today-appointments", requireAuth, async (req, res) => {
    try {
      console.log("API: Getting today appointments...");
      const user = req.user!;
      const appointments = await storage.getTodayAppointments(user.role === 'admin' ? null : user.id);
      console.log("API: Today appointments result:", appointments.length, "appointments");
      res.json(appointments);
    } catch (error) {
      console.error("API Error getting today appointments:", error);
      res.status(500).json({ message: "Failed to get today appointments", error: error.message });
    }
  });

  // Admin user management routes
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Hash the password before storing
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid user data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      const user = await storage.updateUser(id, userData);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Service Types management routes
  app.get("/api/admin/service-types", requireAdmin, async (req, res) => {
    try {
      const serviceTypes = await storage.getServiceTypes();
      res.json(serviceTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service types" });
    }
  });

  app.post("/api/admin/service-types", requireAdmin, async (req, res) => {
    try {
      const serviceTypeData = insertServiceTypeSchema.parse(req.body);
      const serviceType = await storage.createServiceType(serviceTypeData);
      res.json(serviceType);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid service type data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create service type" });
      }
    }
  });

  app.put("/api/admin/service-types/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const serviceTypeData = insertServiceTypeSchema.partial().parse(req.body);
      const serviceType = await storage.updateServiceType(id, serviceTypeData);
      res.json(serviceType);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid service type data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update service type" });
      }
    }
  });

  app.delete("/api/admin/service-types/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteServiceType(id);
      res.json({ message: "Service type deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service type" });
    }
  });





  app.get("/api/login", (req, res) => {
    // Redirect to auth page when accessing login via GET
    res.redirect("/auth");
  });

  // Photo routes
  app.get("/api/photos", requireAuth, async (req, res) => {
    try {
      const { customerId, vehicleId, serviceId, category } = req.query;
      const filters: any = {};

      if (customerId) filters.customerId = parseInt(customerId as string);
      if (vehicleId) filters.vehicleId = parseInt(vehicleId as string);
      if (serviceId) filters.serviceId = parseInt(serviceId as string);
      if (category) filters.category = category as string;

      const photos = await photosStorage.getPhotos(filters);
      res.json(photos);
    } catch (error) {
      console.error("Error getting photos:", error);
      res.status(500).json({ message: "Failed to get photos" });
    }
  });

  app.get("/api/customers/:customerId/photos", requireAuth, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const photos = await photosStorage.getPhotos({ customerId });
      res.json(photos);
    } catch (error) {
      console.error("Error getting customer photos:", error);
      res.status(500).json({ message: "Failed to get customer photos" });
    }
  });

  app.post("/api/customers/:customerId/photos", requireAuth, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);

      // Check if it's a file upload or base64 data
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Handle file upload using multer middleware
        upload.single('photo')(req, res, async (err) => {
          if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ message: "File upload error" });
          }

          if (!req.file) {
            return res.status(400).json({ message: "No photo file provided" });
          }

          const { category, description } = req.body;

          try {
            // Compress and resize image
            const compressedFilename = `compressed_${req.file.filename}`;
            const compressedPath = path.join(uploadsDir, compressedFilename);

            await sharp(req.file.path)
              .resize(480, 480, { 
                fit: 'inside',
                withoutEnlargement: true 
              })
              .jpeg({ 
                quality: 70,
                progressive: true 
              })
              .toFile(compressedPath);

            // Remove original file
            fs.unlinkSync(req.file.path);

            // Get compressed file stats
            const compressedStats = fs.statSync(compressedPath);

            const photoData = {
              category: category || 'other',
              fileName: compressedFilename,
              originalName: req.file.originalname,
              mimeType: 'image/jpeg',
              fileSize: compressedStats.size,
              url: `/uploads/${compressedFilename}`,
              description: description || undefined,
              uploadedBy: req.user?.id || undefined,
            };

            const photo = await photosStorage.createPhoto('customer', customerId, photoData);
            res.status(201).json(photo);
          } catch (error) {
            console.error("Error processing uploaded photo:", error);
            res.status(500).json({ message: "Failed to process uploaded photo" });
          }
        });
      } else {
        // Handle base64 photo data (from camera)
        const { photo, category, description } = req.body;

        if (!photo) {
          return res.status(400).json({ message: "No photo data provided" });
        }

        // Convert base64 to buffer
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Create filename
        const filename = `camera_${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
        const filepath = path.join(uploadsDir, filename);

        // Process and save image
        await sharp(buffer)
          .resize(480, 480, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 70,
            progressive: true 
          })
          .toFile(filepath);

        // Get file stats
        const stats = fs.statSync(filepath);

        const photoData = {
          category: category || 'other',
          fileName: filename,
          originalName: `camera_capture_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          fileSize: stats.size,
          url: `/uploads/${filename}`,
          description: description || undefined,
          uploadedBy: req.user?.id || undefined,
        };

        const savedPhoto = await photosStorage.createPhoto('customer', customerId, photoData);
        res.status(201).json(savedPhoto);
      }
    } catch (error) {
      console.error("Error handling customer photo:", error);
      res.status(500).json({ message: "Failed to handle customer photo" });
    }
  });

  app.get("/api/photos/:id", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      const photo = await storage.getPhoto(photoId);

      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      res.json(photo);
    } catch (error) {
      console.error("Error getting photo:", error);
      res.status(500).json({ message: "Failed to get photo" });
    }
  });

  // Photo upload endpoint
  app.post('/api/photos/upload', upload.single('photo'), async (req, res) => {
    try {
      console.log('Photo upload request received');
      console.log('File:', req.file);
      console.log('Body:', req.body);

      if (!req.file) {
        console.log('No file provided in request');
        return res.status(400).json({ error: 'No photo file provided' });
      }

      const { customerId, vehicleId, serviceId, category = 'other', description } = req.body;
      console.log('Parsed parameters:', { customerId, vehicleId, serviceId, category, description });

      // Validate that at least one entity ID is provided
      if (!customerId && !vehicleId && !serviceId) {
        console.log('No entity ID provided');
        return res.status(400).json({ error: 'Entity ID is required (customerId, vehicleId, or serviceId)' });
      }

      let entityType = 'service';
      let entityId = serviceId ? serviceId : customerId ? customerId : vehicleId;
      if(serviceId){
        entityType = 'service';
      } else if(customerId){
        entityType = 'customer';
      } else if(vehicleId){
        entityType = 'vehicle';
      }

      // Compress and resize image
      const compressedFilename = `compressed_${req.file.filename}`;
      const compressedPath = path.join(uploadsDir, compressedFilename);

      await sharp(req.file.path)
        .resize(480, 480, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 70,
          progressive: true 
        })
        .toFile(compressedPath);

      // Remove original file
      fs.unlinkSync(req.file.path);

      // Get compressed file stats
      const compressedStats = fs.statSync(compressedPath);

      const photoData = {
        category: category || 'other',
        fileName: compressedFilename,
        originalName: req.file.originalname,
        mimeType: 'image/jpeg',
        fileSize: compressedStats.size,
        url: `/uploads/${compressedFilename}`,
        description: description || undefined,
        uploadedBy: req.user?.id || undefined,
      };

       // Create photo record in database
       const photo = await photosStorage.createPhoto(entityType, parseInt(entityId), photoData);

      console.log('Photo created in database:', photo);
      res.json(photo);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  app.put("/api/photos/:id", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      const updateData = req.body;

      const photo = await storage.updatePhoto(photoId, updateData);
      res.json(photo);
    } catch (error) {
      console.error("Error updating photo:", error);
      res.status(500).json({ message: "Failed to update photo" });
    }
  });

  app.delete("/api/photos/:id", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);

      // Delete photo from database and file system
      await photosStorage.deletePhoto(photoId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });



  // Vehicle photos routes
  app.get("/api/vehicles/:vehicleId/photos", requireAuth, async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      const photos = await photosStorage.getPhotos({ vehicleId });
      res.json(photos);
    } catch (error) {
      console.error("Error getting vehicle photos:", error);
      res.status(500).json({ message: "Failed to get vehicle photos" });
    }
  });

  app.post("/api/vehicles/:vehicleId/photos", requireAuth, async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);

      // Check if it's a file upload or base64 data
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Handle file upload using multer middleware
        upload.single('photo')(req, res, async (err) => {
          if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ message: "File upload error" });
          }

          if (!req.file) {
            return res.status(400).json({ message: "No photo file provided" });
          }

          const { category, description } = req.body;

          try {
            // Compress and resize image
            const compressedFilename = `compressed_${req.file.filename}`;
            const compressedPath = path.join(uploadsDir, compressedFilename);

            await sharp(req.file.path)
              .resize(480, 480, { 
                fit: 'inside',
                withoutEnlargement: true 
              })
              .jpeg({ 
                quality: 70,
                progressive: true 
              })
              .toFile(compressedPath);

            // Remove original file
            fs.unlinkSync(req.file.path);

            // Get compressed file stats
            const compressedStats = fs.statSync(compressedPath);

            const photoData = {
              category: category || 'vehicle',
              fileName: compressedFilename,
              originalName: req.file.originalname,
              mimeType: 'image/jpeg',
              fileSize: compressedStats.size,
              url: `/uploads/${compressedFilename}`,
              description: description || undefined,
              uploadedBy: req.user?.id || undefined,
            };

            const photo = await photosStorage.createPhoto('vehicle', vehicleId, photoData);
            res.status(201).json(photo);
          } catch (error) {
            console.error("Error processing uploaded photo:", error);
            res.status(500).json({ message: "Failed to process uploaded photo" });
          }
        });
      } else {
        // Handle base64 photo data (from camera)
        const { photo, category, description } = req.body;

        if (!photo) {
          return res.status(400).json({ message: "No photo data provided" });
        }

        // Convert base64 to buffer
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Create filename
        const filename = `camera_${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
        const filepath = path.join(uploadsDir, filename);

        // Process and save image
        await sharp(buffer)
          .resize(480, 480, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 70,
            progressive: true 
          })
          .toFile(filepath);

        // Get file stats
        const stats = fs.statSync(filepath);

        const photoData = {
          category: category || 'vehicle',
          fileName: filename,
          originalName: `camera_capture_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          fileSize: stats.size,
          url: `/uploads/${filename}`,
          description: description || undefined,
          uploadedBy: req.user?.id || undefined,
        };

        const savedPhoto = await photosStorage.createPhoto('vehicle', vehicleId, photoData);
        res.status(201).json(savedPhoto);
      }
    } catch (error) {
      console.error("Error handling vehicle photo:", error);
      res.status(500).json({ message: "Failed to handle vehicle photo" });
    }
  });

  // Push notification routes
  app.get("/api/notifications/vapid-key", requireAuth, (req, res) => {
    const vapidKey = notificationService.getVapidPublicKey();
    if (!vapidKey) {
      return res.status(500).json({ message: "VAPID keys not configured" });
    }
    res.json({ publicKey: vapidKey });
  });

app.post("/api/notifications/subscribe", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { endpoint, p256dh, auth } = req.body;

      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      const subscription = {
        endpoint,
        p256dh,
        auth,
      };

      const success = await notificationService.subscribe(userId, subscription);

      if (success) {
        res.json({ message: "Successfully subscribed to push notifications" });
      } else {
        res.status(500).json({ message: "Failed to subscribe to push notifications" });
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      res.status(500).json({ message: "Failed to subscribe to push notifications" });
    }
  });

  app.post("/api/notifications/unsubscribe", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const success = await notificationService.unsubscribe(userId);

      if (success) {
        res.json({ message: "Successfully unsubscribed from push notifications" });
      } else {
        res.status(500).json({ message: "Failed to unsubscribe from push notifications" });
      }
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      res.status(500).json({ message: "Failed to unsubscribe from push notifications" });
    }
  });

  app.post("/api/notifications/test", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { title, body } = req.body;

      const success = await notificationService.sendNotificationToUser(userId, {        title: title || "Teste de Notificação",
        body: body || "Esta é uma notificação de teste do CarHub!",
        data: { type: "test" }
      });

      if (success) {
        res.json({ message: "Test notification sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test notification" });
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  // OCR routes for license plate reading
  app.post("/api/ocr/read-plate", requireAuth, async (req, res) => {
    try {
      const { base64Image } = req.body;

      if (!base64Image) {
        return res.status(400).json({ message: "Imagem é obrigatória" });
      }

      // Remove data URL prefix if present
      const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

      //const result = await ocrService.readLicensePlate(imageData);
      const result = await plateRecognizerService.readLicensePlate(imageData);
      res.json(result);
    } catch (error) {
      console.error("Error reading license plate:", error);
      res.status(500).json({ 
        message: "Erro ao processar a imagem", 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.post("/api/ocr/validate-plate", requireAuth, async (req, res) => {
    try {
      const { plate } = req.body;

      if (!plate) {
        return res.status(400).json({ message: "Placa é obrigatória" });
      }

      const isValid = await localOCRService.validateBrazilianPlate(plate);
      const formattedPlate = localOCRService.formatPlateDisplay(plate);

      res.json({
        isValid,
        formattedPlate,
        plate: plate.toUpperCase()
      });
    } catch (error) {
      console.error("Error validating license plate:", error);
      res.status(500).json({ 
        message: "Erro ao validar a placa", 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Local OCR route for manual plate entry (fallback when OpenAI is not available)
  app.post("/api/ocr/read-plate-local", requireAuth, async (req, res) => {
    try {
      const { plateText } = req.body;

      if (!plateText) {
        return res.status(400).json({ message: "Texto da placa é obrigatório" });
      }

      const result = await localOCRService.readLicensePlateLocal(plateText);
      res.json(result);
    } catch (error) {
      console.error("Error processing local plate:", error);
      res.status(500).json({ 
        message: "Erro ao processar a placa", 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // MercadoPago PIX routes
  app.post("/api/mercadopago/create-pix", requireAuth, async (req, res) => {
    try {
      const { serviceId, amount, description, customerEmail, customerName, customerDocument } = req.body;

      if (!serviceId || !amount) {
        return res.status(400).json({ message: "Service ID e valor são obrigatórios" });
      }

      // Verificar se o serviço existe
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Verificar se já existe PIX para este serviço
      const existingPix = await db.execute(sql`
        SELECT id, mercado_pago_id, amount, status FROM pix_payments WHERE service_id = ${serviceId}
      `);

      const paymentData = {
        amount: parseFloat(amount),
        description: description || `Pagamento - Ordem de Serviço #${serviceId}`,
        customerEmail,
        customerName,
        customerDocument,
        externalReference: `SERVICE_${serviceId}_${Date.now()}`
      };

      console.log('Creating PIX payment for service:', serviceId, 'with data:', {
        amount: paymentData.amount,
        description: paymentData.description,
        customerEmail: paymentData.customerEmail
      });
      
      const pixPayment = await mercadoPagoService.createPIXPayment(paymentData);
      
      console.log('PIX payment created successfully:', {
        id: pixPayment.id,
        status: pixPayment.status,
        hasQrCode: !!pixPayment.qrCode,
        hasQrCodeBase64: !!pixPayment.qrCodeBase64,
        qrCodeLength: pixPayment.qrCodeBase64?.length || 0,
        qrCodePreview: pixPayment.qrCodeBase64?.substring(0, 50) || 'N/A',
        qrCodeStartsWithData: pixPayment.qrCodeBase64?.startsWith('data:image/') || false
      });

      // Salvar ou atualizar PIX no banco - apenas 1 registro por serviço
      console.log('Saving PIX to database:', {
        serviceId,
        mercadoPagoId: pixPayment.id,
        amount,
        status: pixPayment.status,
        existingRecords: existingPix.length,
        qrCodeLength: pixPayment.qrCode?.length || 0,
        qrCodeBase64Length: pixPayment.qrCodeBase64?.length || 0
      });
      
      if (existingPix.length > 0) {
        // UPDATE do registro existente
        console.log('Updating existing PIX record for service:', serviceId);
        await db.execute(sql`
          UPDATE pix_payments SET
            mercado_pago_id = ${pixPayment.id},
            amount = ${amount},
            status = ${pixPayment.status},
            qr_code_text = ${pixPayment.qrCode},
            qr_code_base64 = ${pixPayment.qrCodeBase64},
            expires_at = ${pixPayment.expirationDate},
            external_reference = ${paymentData.externalReference},
            created_at = NOW()
          WHERE service_id = ${serviceId}
        `);
        console.log('PIX record updated successfully');
      } else {
        // INSERT de novo registro
        console.log('Inserting new PIX record for service:', serviceId);
        await db.execute(sql`
          INSERT INTO pix_payments (
            service_id, mercado_pago_id, amount, status, 
            qr_code_text, qr_code_base64, expires_at, external_reference, created_at
          ) VALUES (
            ${serviceId}, ${pixPayment.id}, ${amount}, ${pixPayment.status},
            ${pixPayment.qrCode}, ${pixPayment.qrCodeBase64}, ${pixPayment.expirationDate}, ${paymentData.externalReference}, NOW()
          )
        `);
        console.log('PIX record inserted successfully');
      }

      res.json(pixPayment);
    } catch (error) {
      console.error("Error creating PIX payment:", error);
      res.status(500).json({ 
        message: "Erro ao criar pagamento PIX",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.get("/api/mercadopago/payment/:paymentId", requireAuth, async (req, res) => {
    try {
      const { paymentId } = req.params;

      const paymentStatus = await mercadoPagoService.getPaymentStatus(paymentId);

      // Atualizar status no banco
      await db.execute(sql`
        UPDATE pix_payments 
        SET status = ${paymentStatus.status}, 
            paid_at = ${paymentStatus.date_approved},
            updated_at = NOW()
        WHERE mercado_pago_id = ${paymentId}
      `);

      res.json(paymentStatus);
    } catch (error) {
      console.error("Error getting payment status:", error);
      res.status(500).json({ 
        message: "Erro ao consultar status do pagamento",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.get("/api/mercadopago/service/:serviceId/pix", requireAuth, async (req, res) => {
    try {
      const { serviceId } = req.params;

      const pixPayments = await db.execute(sql`
        SELECT * FROM pix_payments 
        WHERE service_id = ${parseInt(serviceId)}
        ORDER BY created_at DESC
      `);

      res.json(pixPayments.rows);
    } catch (error) {
      console.error("Error getting service PIX payments:", error);
      res.status(500).json({ 
        message: "Erro ao buscar pagamentos PIX do serviço",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Webhook do MercadoPago para notificações de pagamento
  app.post("/api/mercadopago/webhook", async (req, res) => {
    try {
      console.log("MercadoPago webhook received:", req.body);

      const { type, data } = req.body;

      if (type === 'payment') {
        const paymentId = data.id;

        try {
          const paymentStatus = await mercadoPagoService.getPaymentStatus(paymentId);

          // Atualizar status no banco
          await db.execute(sql`
            UPDATE pix_payments 
            SET status = ${paymentStatus.status}, 
                paid_at = ${paymentStatus.date_approved},
                updated_at = NOW()
            WHERE mercado_pago_id = ${paymentId}
          `);

          // Se o pagamento foi aprovado, atualizar o serviço
          if (paymentStatus.status === 'approved') {
            const pixPayment = await db.execute(sql`
              SELECT service_id, amount FROM pix_payments 
              WHERE mercado_pago_id = ${paymentId}
            `);

            if (pixPayment.rows.length > 0) {
              const serviceId = pixPayment.rows[0].service_id;
              const amount = parseFloat(pixPayment.rows[0].amount);

              // Atualizar valor pago via PIX no serviço
              await db.execute(sql`
                UPDATE services 
                SET pix_pago = pix_pago + ${amount},
                    valor_pago = valor_pago + ${amount},
                    updated_at = NOW()
                WHERE id = ${serviceId}
              `);
            }
          }

          console.log(`Payment ${paymentId} status updated to: ${paymentStatus.status}`);
        } catch (error) {
          console.error("Error processing payment webhook:", error);
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error("Error processing MercadoPago webhook:", error);
      res.status(500).send('Error');
    }
  });

  app.get("/api/mercadopago/config", requireAuth, (req, res) => {
    res.json({
      publicKey: mercadoPagoService.getPublicKey(),
      isConfigured: mercadoPagoService.isConfigured()
    });
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  const httpServer = createServer(app);
  return httpServer;
}