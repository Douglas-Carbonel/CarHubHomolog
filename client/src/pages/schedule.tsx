import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, MoreHorizontal, Plus, Search, Edit, Trash2, Clock, User, Car, Wrench, CheckCircle, XCircle, Timer, BarChart3, FileText, Camera, Coins, Calculator, Smartphone, Banknote, CreditCard, Receipt, Bell, ChevronLeft, ChevronRight, MapPin, Phone, Star, TrendingUp, Activity, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType, type Photo } from "@shared/schema";
import { z } from "zod";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import ServiceItems from "@/components/service/service-items";
import PaymentManager from "@/components/service/payment-manager";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import PhotoUpload from "@/components/photos/photo-upload";
import CameraCapture from "@/components/camera/camera-capture";
import { generateServicePDF } from "@/lib/pdf-generator";

// Utility functions for currency formatting
const formatCurrency = (value: string): string => {
  if (!value) return '';

  // Remove tudo que não for número
  let numericValue = value.replace(/[^\d]/g, '');

  // Se for vazio, retorna vazio
  if (!numericValue) return '';

  // Converte para número e divide por 100 para ter centavos
  const numberValue = parseInt(numericValue) / 100;

  // Formata para moeda brasileira
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Utility function to translate status from English to Portuguese
const translateStatus = (status: string): string => {
  const statusTranslations: Record<string, string> = {
    'scheduled': 'Agendado',
    'in_progress': 'Em Andamento',
    'completed': 'Concluído',
    'cancelled': 'Cancelado'
  };

  return statusTranslations[status] || status;
};

const parseCurrency = (formattedValue: string): string => {
  if (!formattedValue) return '0.00';

  // Remove tudo que não for número
  const numericValue = formattedValue.replace(/[^\d]/g, '');

  if (!numericValue) return '0.00';

  // Converte para formato decimal americano
  const numberValue = parseInt(numericValue) / 100;

  return numberValue.toFixed(2);
};

interface PaymentMethods {
  pix: string;
  dinheiro: string;
  cheque: string;
  cartao: string;
}

const serviceFormSchema = insertServiceSchema.extend({
  customerId: z.number().min(1, "Cliente é obrigatório"),
  vehicleId: z.number().min(1, "Veículo é obrigatório"),
  serviceTypeId: z.number().optional(),
  technicianId: z.number().min(1, "Técnico é obrigatório"),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
  valorPago: z.string().optional(),
  pixPago: z.string().optional(),
  dinheiroPago: z.string().optional(),
  chequePago: z.string().optional(),
  cartaoPago: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderMinutes: z.number().optional(),
  serviceExtras: z.array(z.object({
    unifiedServiceId: z.number(),
    valor: z.string(),
    observacao: z.string().optional(),
  })).optional(),
});

export default function SchedulePage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day'>('Month');
  const [periodFilter, setPeriodFilter] = useState<string>("todos");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDayAppointmentsModalOpen, setIsDayAppointmentsModalOpen] = useState(false);
  const [selectedDayServices, setSelectedDayServices] = useState<any[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceExtras, setServiceExtras] = useState<any[]>([]);
  const [initialServiceExtras, setInitialServiceExtras] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState({
    pix: "",
    dinheiro: "",
    cheque: "",
    cartao: ""
  });
  const [temporaryPhotos, setTemporaryPhotos] = useState<Array<{ photo: string; category: string }>>([]);
  const [formInitialValues, setFormInitialValues] = useState<z.infer<typeof serviceFormSchema> | null>(null);
  const [currentServicePhotos, setCurrentServicePhotos] = useState<Photo[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: undefined,
      technicianId: 0,
      scheduledDate: "",
      scheduledTime: "",
      status: "scheduled",
      notes: "",
      valorPago: "0", // Valor pago inicializado como string "0"
      pixPago: "0.00",
      dinheiroPago: "0.00",
      chequePago: "0.00",
      cartaoPago: "0.00",
      reminderEnabled: false,
      reminderMinutes: 30,
    },
  });

  // Track form changes for unsaved changes detection
  const currentFormValues = form.watch();
  const hasFormChanges = formInitialValues && isAddModalOpen && JSON.stringify(currentFormValues) !== JSON.stringify(formInitialValues);
  const hasServiceExtrasChanges = JSON.stringify(serviceExtras) !== JSON.stringify(initialServiceExtras);
  const hasUnsavedChanges = hasFormChanges || temporaryPhotos.length > 0 || hasServiceExtrasChanges;

  const unsavedChanges = useUnsavedChanges({
    hasUnsavedChanges: !!hasUnsavedChanges,
    message: "Você tem alterações não salvas no cadastro do agendamento. Deseja realmente sair?"
  });

  // Fetch data
  const { data: services = [], isLoading: servicesLoading } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
    queryKey: ["/api/services"],
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<(Vehicle & { customer: Customer })[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
    queryFn: async () => {
      const res = await fetch("/api/service-types", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  const { data: users = [], isLoading: techniciansLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  // Filter services by period
  const getFilteredServices = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return services.filter(service => {
      if (!service.scheduledDate) return false;

      const serviceDate = parseISO(service.scheduledDate);

      switch (periodFilter) {
        case "hoje":
          return serviceDate >= startOfToday && serviceDate <= endOfToday;
        case "semana":
          const startWeek = startOfWeek(today, { weekStartsOn: 1 });
          const endWeek = endOfWeek(today, { weekStartsOn: 1 });
          return serviceDate >= startWeek && serviceDate <= endWeek;
        case "mes":
          const startMonth = startOfMonth(today);
          const endMonth = endOfMonth(today);
          return serviceDate >= startMonth && serviceDate <= endMonth;
        default:
          return true;
      }
    });
  };

  const filteredServices = getFilteredServices();

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    const startCalendar = startOfWeek(startDate, { weekStartsOn: 1 });
    const endCalendar = endOfWeek(endDate, { weekStartsOn: 1 });

    const days = [];
    let day = startCalendar;

    while (day <= endCalendar) {
      const dayServices = services.filter(service => 
        service.scheduledDate && isSameDay(parseISO(service.scheduledDate), day)
      );

      days.push({
        date: new Date(day),
        services: dayServices,
        isCurrentMonth: day.getMonth() === currentDate.getMonth(),
        isToday: isToday(day)
      });

      day = addDays(day, 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get services for selected date
  const getServicesForDate = (date: Date) => {
    return services.filter(service => 
      service.scheduledDate && isSameDay(parseISO(service.scheduledDate), date)
    );
  };

  // Handle day click
  const handleDayClick = (date: Date) => {
    const dayServices = getServicesForDate(date);
    if (dayServices.length > 1) {
      setSelectedDayServices(dayServices);
      setSelectedDate(date);
      setIsDayAppointmentsModalOpen(true);
    } else if (dayServices.length === 1) {
      setLocation(`/services?openModal=true&serviceId=${dayServices[0].id}`);
    }
    setSelectedDate(date);
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/services", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsAddModalOpen(false);
      form.reset();
      setTemporaryPhotos([]);
      setServiceExtras([]);
      setInitialServiceExtras([]);
      setPaymentMethods({
        pix: "",
        dinheiro: "",
        cheque: "",
        cartao: ""
      });
      toast({ title: "Agendamento criado com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error creating service:", error);
      toast({ title: "Erro ao criar agendamento", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsAddModalOpen(false);
      setEditingService(null);
      form.reset();
      setServiceExtras([]);
      setInitialServiceExtras([]);
      setPaymentMethods({
        pix: "",
        dinheiro: "",
        cheque: "",
        cartao: ""
      });
      toast({ title: "Agendamento atualizado com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error updating service:", error);
      toast({ title: "Erro ao atualizar agendamento", variant: "destructive" });
    },
  });

  // Fetch service photos
  const fetchServicePhotos = async (serviceId: number | undefined) => {
    if (!serviceId) {
      setCurrentServicePhotos([]);
      return;
    }

    try {
      console.log('Fetching photos for service ID:', serviceId);
      const res = await fetch(`/api/photos?serviceId=${serviceId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const photos = await res.json();
      console.log('Photos found for service:', photos.length);
      setCurrentServicePhotos(photos);
    } catch (error: any) {
      console.error('Error fetching service photos:', error);
      toast({
        title: "Erro ao carregar fotos do agendamento",
        description: error.message,
        variant: "destructive",
      });
      setCurrentServicePhotos([]);
    }
  };

  const fetchServiceExtras = async (serviceId: number) => {
    try {
      console.log('Fetching service items for service:', serviceId);

      // Buscar service_items do serviço
      const response = await fetch(`/api/services/${serviceId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const serviceData = await response.json();
        console.log('Loaded service data:', serviceData);
        // Map service items to ServiceItems format
        console.log('Service data received:', serviceData);
        console.log('Service items from API:', serviceData.serviceItems);

        if (serviceData.serviceItems && serviceData.serviceItems.length > 0) {
          const mappedExtras = serviceData.serviceItems.map((item: any, index: number) => ({
            tempId: `existing_${item.id || index}`,
            serviceTypeId: Number(item.serviceTypeId || item.service_type_id),
            unitPrice: String(item.unitPrice || item.unit_price || "0.00"),
            totalPrice: String(item.totalPrice || item.total_price || "0.00"),
            quantity: Number(item.quantity) || 1,
            notes: item.notes || "",
          }));

          console.log('Mapped service items to ServiceItems format:', mappedExtras);

          // Set service items immediately for editing
          setServiceExtras(mappedExtras);
          setInitialServiceExtras(mappedExtras);
        } else {
          console.log('No service items found for this service');
          // For services without items, set empty array immediately
          setServiceExtras([]);
          setInitialServiceExtras([]);
        }
      } else {
        console.error('Failed to fetch service data:', response.status);
        setServiceExtras([]);
        setInitialServiceExtras([]);
      }
    } catch (error) {
      console.error("Error fetching service items:", error);
      setServiceExtras([]);
      setInitialServiceExtras([]);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    const editValues = {
      customerId: service.customerId,
      vehicleId: service.vehicleId,
      serviceTypeId: service.serviceTypeId || undefined,
      technicianId: service.technicianId || 0,
      scheduledDate: service.scheduledDate || "",
      scheduledTime: service.scheduledTime || "",
      status: service.status || "scheduled",
      notes: service.notes || "",
      valorPago: service.valorPago || "0",
      pixPago: service.pixPago || "0.00",
      dinheiroPago: service.dinheiroPago || "0.00",
      chequePago: service.chequePago || "0.00",
      cartaoPago: service.cartaoPago || "0.00",
    };

    setFormInitialValues(editValues);
    form.reset(editValues);

    // Load existing payment methods from specific fields
    console.log('Loading service payment data:', {
      pixPago: service.pixPago,
      dinheiroPago: service.dinheiroPago, 
      chequePago: service.chequePago,
      cartaoPago: service.cartaoPago
    });

    setPaymentMethods({
      pix: service.pixPago || "0.00",
      dinheiro: service.dinheiroPago || "0.00",
      cheque: service.chequePago || "0.00",
      cartao: service.cartaoPago || "0.00"
    });

    // Load photos and service items - fetch service items first to ensure they load properly
    fetchServicePhotos(service.id);
    fetchServiceExtras(service.id);

    setIsAddModalOpen(true);
  };

  const handlePhotoTaken = async (photoUrl?: string, category?: string) => {
    // For new services (no ID yet), store as temporary photo
    if (!editingService?.id) {
      if (photoUrl && category) {
        setTemporaryPhotos(prev => [...prev, { photo: photoUrl, category }]);
        toast({
          title: "Foto capturada!",
          description: "A foto será salva quando o agendamento for cadastrado.",
        });
      }
      setIsCameraOpen(false);
      return;
    }

    // For existing services, fetch updated photos
    fetchServicePhotos(editingService.id);
    queryClient.invalidateQueries({ queryKey: ['/api/photos'] });
    toast({
      title: "Foto capturada",
      description: "Foto foi adicionada com sucesso.",
    });
    setIsCameraOpen(false);
  };

  // Calculate total value from services
  const calculateTotalValue = () => {
    let total = 0;

    // Add all selected services values
    serviceExtras.forEach(extra => {
      if (extra.totalPrice && !isNaN(Number(extra.totalPrice))) {
        total += Number(extra.totalPrice);
      } else if (extra.valor && !isNaN(Number(extra.valor))) {
        total += Number(extra.valor);
      }
    });

    return total.toFixed(2);
  };

  const onSubmit = async (data: z.infer<typeof serviceFormSchema>) => {
    // Calculate and add total value
    const totalValue = calculateTotalValue();

    // Calculate total from payment methods
    const totalFromPaymentMethods = (
      Number(paymentMethods.pix || 0) +
      Number(paymentMethods.dinheiro || 0) +
      Number(paymentMethods.cheque || 0) +
      Number(paymentMethods.cartao || 0)
    ).toFixed(2);

    // Convert serviceExtras to serviceItems format
    const serviceItemsData = serviceExtras.map((extra: any) => ({
      serviceTypeId: extra.serviceTypeId || extra.serviceExtra?.id,
      quantity: extra.quantity || 1,
      unitPrice: extra.unitPrice || extra.valor || "0.00",
      totalPrice: extra.totalPrice || extra.valor || "0.00",
      notes: extra.notes || extra.observacao || null,
    }));

    const serviceData = {
      ...data,
      estimatedValue: String(totalValue),
      valorPago: totalFromPaymentMethods,
      pixPago: paymentMethods.pix || "0.00",
      dinheiroPago: paymentMethods.dinheiro || "0.00",
      chequePago: paymentMethods.cheque || "0.00",
      cartaoPago: paymentMethods.cartao || "0.00",
      reminderEnabled: data.reminderEnabled || false,
      reminderMinutes: data.reminderMinutes || 30,
      serviceItems: serviceItemsData,
    };

    console.log('Service data being submitted:', serviceData);
    console.log('Service extras:', serviceExtras);

    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: serviceData });
    } else {
      try {
        const result = await createMutation.mutateAsync(serviceData);

        // Save temporary photos to the created service
        if (result && result.id && temporaryPhotos.length > 0) {
          console.log('Saving temporary photos to service:', result.id);

          let photosSaved = 0;
          for (const tempPhoto of temporaryPhotos) {
            try {
              // Convert base64 to blob for upload
              const base64Data = tempPhoto.photo.split(',')[1];
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'image/jpeg' });

              const formData = new FormData();
              formData.append('photo', blob, `service_${result.id}_photo_${Date.now()}.jpg`);
              formData.append('category', tempPhoto.category);
              formData.append('serviceId', result.id.toString());

              const photoResponse = await fetch('/api/photos/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include',
              });

              if (!photoResponse.ok) {
                const errorText = await photoResponse.text();
                console.error('Photo upload failed:', errorText);
                throw new Error(`Failed to upload photo: ${photoResponse.status}`);
              }

              const photoResult = await photoResponse.json();
              console.log('Photo saved successfully:', photoResult);
              photosSaved++;
            } catch (error) {
              console.error('Error saving temporary photo:', error);
            }
          }

          // Clear temporary photos
          setTemporaryPhotos([]);
          console.log(`${photosSaved} of ${temporaryPhotos.length} temporary photos processed`);

          // Show success message with photo count
          if (photosSaved > 0) {
            toast({
              title: "Agendamento criado com sucesso!",
              description: `${photosSaved} foto(s) salva(s) junto com o agendamento.`,
            });
          }
        } else {
          toast({
            title: "Agendamento criado com sucesso!",
          });
        }
      } catch (error) {
        console.error('Error creating service:', error);
        toast({
          title: "Erro ao criar agendamento",
          description: "Ocorreu um erro ao criar o agendamento.",
          variant: "destructive",
        });
      }
    }
  };

  // Get count for period filters
  const getFilterCount = (period: string) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return services.filter(service => {
      if (!service.scheduledDate) return false;

      const serviceDate = parseISO(service.scheduledDate);

      switch (period) {
        case "hoje":
          return serviceDate >= startOfToday && serviceDate <= endOfToday;
        case "semana":
          const startWeek = startOfWeek(today, { weekStartsOn: 1 });
          const endWeek = endOfWeek(today, { weekStartsOn: 1 });
          return serviceDate >= startWeek && serviceDate <= endWeek;
        case "mes":
          const startMonth = startOfMonth(today);
          const endMonth = endOfMonth(today);
          return serviceDate >= startMonth && serviceDate <= endMonth;
        default:
          return services.length;
      }
    }).length;
  };

  const handleGeneratePDF = async () => {
    try {
      const selectedCustomerId = form.watch("customerId");
      const selectedVehicleId = form.watch("vehicleId");
      const selectedTechnicianId = form.watch("technicianId");

      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      const selectedTechnician = users.find(u => u.id === selectedTechnicianId);

      if (!selectedCustomer || !selectedVehicle || !selectedTechnician) {
        toast({
          title: "Erro",
          description: "Dados incompletos para gerar o PDF. Verifique se cliente, veículo e técnico estão selecionados.",
          variant: "destructive",
        });
        return;
      }

      const serviceData = {
        id: editingService?.id, // Incluir o ID do serviço que está sendo editado
        customer: { name: selectedCustomer.name },
        vehicle: { 
          brand: selectedVehicle.brand, 
          model: selectedVehicle.model, 
          licensePlate: selectedVehicle.licensePlate 
        },
        scheduledDate: form.watch("scheduledDate"),
        scheduledTime: form.watch("scheduledTime"),
        status: form.watch("status") || "scheduled",
        technician: { 
          firstName: selectedTechnician.firstName, 
          lastName: selectedTechnician.lastName 
        },
        serviceExtras: serviceExtras.map((extra, index) => {
          const serviceType = serviceTypes.find(st => st.id === extra.serviceTypeId);
          return {
            serviceName: serviceType?.name || `Serviço ${index + 1}`,
            price: extra.totalPrice || extra.unitPrice || "0.00",
            notes: extra.notes || undefined,
          };
        }),
        totalValue: calculateTotalValue(),
        valorPago: form.watch("valorPago") || "0",
        notes: form.watch("notes") || undefined,
      };

      await generateServicePDF(serviceData, true); // true indica que é um agendamento

      toast({
        title: "PDF Gerado",
        description: "O PDF do agendamento foi gerado e baixado com sucesso!",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };



  if (servicesLoading || customersLoading || vehiclesLoading || techniciansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <LoadingSpinner size="lg" text="Carregando dados do sistema..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Agenda" />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Calendar Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-2 rounded-lg mr-3">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  Calendário
                </h2>
                {/* View Mode Selector */}
                <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                  {[
                    { key: 'Month', label: 'Mês' },
                    { key: 'Week', label: 'Semana' },
                    { key: 'Day', label: 'Dia' }
                  ].map(mode => (
                    <Button
                      key={mode.key}
                      variant={viewMode === mode.key ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode(mode.key as any)}
                      className={cn(
                        "rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200",
                        viewMode === mode.key 
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md hover:from-teal-600 hover:to-emerald-600" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-white"
                      )}
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Card className="bg-gradient-to-br from-white via-gray-50 to-blue-50/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100/50 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-t-lg">
                  <CardTitle className="text-gray-900 font-bold text-lg">
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevMonth}
                      className="text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-full h-9 w-9 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextMonth}
                      className="text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-full h-9 w-9 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {viewMode === 'Month' && (
                    <div className="grid grid-cols-7 gap-2">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                        <div key={`header-${index}`} className="text-center text-sm font-semibold text-gray-700 p-3 bg-gradient-to-r from-slate-100 to-blue-100/50 rounded-lg mb-2">
                          {day}
                        </div>
                      ))}
                                            {calendarDays.map((day, index) => (
                        <div
                          key={`day-${index}-${day.date.getTime()}`}
                          onClick={() => handleDayClick(day.date)}
                          className={cn(
                            "relative p-2 text-center cursor-pointer rounded-xl transition-all duration-200 min-h-[80px] flex flex-col justify-start hover:scale-105 hover:shadow-lg border-2",
                            day.isCurrentMonth 
                              ? "text-gray-900 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 border-gray-100" 
                              : "text-gray-400 hover:bg-gray-50 border-gray-100",
                            day.isToday && "bg-gradient-to-br from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-lg font-bold border-teal-300",
                            day.services.length > 0 && !day.isToday && "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-md"
                          )}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <span className="text-sm font-medium">{format(day.date, "d")}</span>
                            {day.services.length > 0 && (
                              <div className={cn(
                                "rounded-full px-1.5 py-0.5 text-xs font-bold min-w-[18px] h-[18px] flex items-center justify-center",
                                day.isToday ? "bg-white/20 text-white" : "bg-teal-500 text-white"
                              )}>
                                {day.services.length}
                              </div>
                            )}
                          </div>

                          {day.services.length > 0 && (
                            <div className="flex-1 w-full space-y-1">
                              {day.services.length <= 3 ? (
                                // Mostra até 3 agendamentos como barrinhas
                                day.services.map((service, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "w-full h-1.5 rounded-full shadow-sm",
                                      day.isToday ? "bg-white/30" : 
                                      service.status === "completed" ? "bg-green-500" :
                                      service.status === "in_progress" ? "bg-yellow-500" :
                                      service.status === "cancelled" ? "bg-red-500" :
                                      "bg-blue-500"
                                    )}
                                    title={`${service.customer.name} - ${service.scheduledTime || 'Sem horário'}`}
                                  />
                                ))
                              ) : (
                                // Para mais de 3 agendamentos, mostra 2 barrinhas + indicador
                                <>
                                  {day.services.slice(0, 2).map((service, i) => (
                                    <div
                                      key={i}
                                      className={cn(
                                        "w-full h-1.5 rounded-full shadow-sm",
                                        day.isToday ? "bg-white/30" : 
                                        service.status === "completed" ? "bg-green-500" :
                                        service.status === "in_progress" ? "bg-yellow-500" :
                                        service.status === "cancelled" ? "bg-red-500" :
                                        "bg-blue-500"
                                      )}
                                      title={`${service.customer.name} - ${service.scheduledTime || 'Sem horário'}`}
                                    />
                                  ))}
                                  <div className={cn(
                                    "w-full h-1.5 rounded-full flex items-center justify-center text-[9px] font-bold",
                                    day.isToday ? "bg-white/20 text-white" : "bg-gray-400 text-white"
                                  )}>
                                    +{day.services.length - 2}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {viewMode === 'Week' && (
                    <div className="space-y-4">
                      {/* Header da semana com navegação */}
                      <div className="flex items-center justify-between bg-gradient-to-r from-slate-100 to-blue-100/50 rounded-xl p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentDate(prev => addDays(prev, -7))}
                          className="text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-full h-9 w-9 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="text-lg font-bold text-gray-900">
                          Semana de {format(startOfWeek(currentDate, { weekStartsOn: 0 }), "dd/MM", { locale: ptBR })} a {format(endOfWeek(currentDate, { weekStartsOn: 0 }), "dd/MM/yyyy", { locale: ptBR })}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentDate(prev => addDays(prev, 7))}
                          className="text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-full h-9 w-9 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Layout da agenda semanal - um dia por linha */}
                      <div className="space-y-3">
                        {(() => {
                          const startWeekDay = startOfWeek(currentDate, { weekStartsOn: 0 });
                          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startWeekDay, i));
                          return weekDays.map((day, index) => {
                            const dayServices = services.filter(service => 
                              service.scheduledDate && isSameDay(parseISO(service.scheduledDate), day)
                            ).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

                            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

                            return (
                              <Card 
                                key={`week-day-${index}`}
                                className={cn(
                                  "border-2 transition-all duration-200 hover:shadow-lg",
                                  isToday(day) && "border-teal-300 bg-gradient-to-r from-teal-50 to-emerald-50 shadow-md",
                                  dayServices.length > 0 && !isToday(day) && "border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/30",
                                  !dayServices.length && !isToday(day) && "border-gray-200 bg-white"
                                )}
                              >
                                <CardContent className="p-4">
                                  {/* Header do dia */}
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                      <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold",
                                        isToday(day) 
                                          ? "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-lg" 
                                          : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700"
                                      )}>
                                        {format(day, "d")}
                                      </div>
                                      <div>
                                        <h4 className={cn(
                                          "text-lg font-bold",
                                          isToday(day) ? "text-teal-700" : "text-gray-900"
                                        )}>
                                          {dayNames[index]}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                          {format(day, "dd 'de' MMMM", { locale: ptBR })}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Contador de agendamentos */}
                                    <div className="flex items-center space-x-2">
                                      {dayServices.length > 0 ? (
                                        <Badge className={cn(
                                          "text-sm font-semibold px-3 py-1",
                                          isToday(day) 
                                            ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white" 
                                            : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                                        )}>
                                          {dayServices.length} agendamento{dayServices.length !== 1 ? 's' : ''}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-sm text-gray-500 border-gray-300">
                                          Sem agendamentos
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Lista de agendamentos */}
                                  {dayServices.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {dayServices.map((service, serviceIndex) => (
                                        <Card 
                                          key={service.id}
                                          className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                                          onClick={() => handleEdit(service)}
                                        >
                                          <CardContent className="p-3">
                                            <div className="flex items-start justify-between mb-2">
                                              <div className="flex-1">
                                                <h5 className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors text-sm">
                                                  {service.customer.name}
                                                </h5>
                                                <p className="text-xs text-gray-600 mt-1">
                                                  {service.vehicle.brand} {service.vehicle.model}
                                                </p>
                                              </div>
                                              <Badge 
                                                className={cn(
                                                  "text-xs font-medium ml-2",
                                                  service.status === 'completed' && "bg-green-100 text-green-700 border-green-200",
                                                  service.status === 'in_progress' && "bg-blue-100 text-blue-700 border-blue-200",
                                                  service.status === 'scheduled' && "bg-orange-100 text-orange-700 border-orange-200",
                                                  service.status === 'cancelled' && "bg-red-100 text-red-700 border-red-200"
                                                )}
                                                variant="outline"
                                              >
                                                {translateStatus(service.status)}
                                              </Badge>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-gray-600">
                                              <div className="flex items-center">
                                                <Clock className="h-3 w-3 mr-1 text-teal-500" />
                                                <span className="font-medium">
                                                  {service.scheduledTime ? service.scheduledTime.substring(0, 5) : 'Sem horário'}
                                                </span>
                                              </div>
                                              {service.estimatedValue && (
                                                <div className="flex items-center">
                                                  <span className="font-semibold text-green-600">
                                                    R$ {Number(service.estimatedValue).toFixed(2)}
                                                  </span>
                                                </div>
                                              )}
                                            </div>

                                            {service.serviceType && (
                                              <div className="mt-2 text-xs">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                  <Wrench className="h-3 w-3 mr-1" />
                                                  {service.serviceType.name}
                                                </span>
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-gray-500">
                                      <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                                        <Calendar className="h-8 w-8 text-gray-400" />
                                      </div>
                                      <p className="text-sm">Nenhum agendamento para este dia</p>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-2 text-xs"
                                        onClick={() => {
                                          const defaultValues = {
                                            customerId: 0,
                                            vehicleId: 0,
                                            serviceTypeId: undefined,
                                            technicianId: 0,
                                            scheduledDate: format(day, "yyyy-MM-dd"),
                                            scheduledTime: "",
                                            status: "scheduled" as "scheduled" | "in_progress" | "completed" | "cancelled",
                                            notes: "",
                                            valorPago: "0",
                                            pixPago: "0.00",
                                            dinheiroPago: "0.00",
                                            chequePago: "0.00",
                                            cartaoPago: "0.00",
                                            reminderEnabled: false,
                                            reminderMinutes: 30,
                                          };

                                          form.reset(defaultValues);
                                          setServiceExtras([]);
                                          setInitialServiceExtras([]);
                                          setFormInitialValues(defaultValues);
                                          setPaymentMethods({
                                            pix: "",
                                            dinheiro: "",
                                            cheque: "",
                                            cartao: ""
                                          });
                                          setIsAddModalOpen(true);
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Agendar
                                      </Button>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {viewMode === 'Day' && (
                    <div className="space-y-4">
                      <div className="text-center bg-gradient-to-r from-slate-100 to-blue-100/50 rounded-xl p-4">
                        <h3 className="text-lg font-bold text-gray-900">
                          {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {(() => {
                          const dayServices = services.filter(service => 
                            service.scheduledDate && isSameDay(parseISO(service.scheduledDate), currentDate)
                          ).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

                          if (dayServices.length === 0) {
                            return (
                              <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl">
                                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                                  <Calendar className="h-8 w-8 text-white mx-auto" />
                                </div>
                                <p className="text-gray-600 font-medium">Nenhum agendamento para este dia</p>
                              </div>
                            );
                          }

                          return dayServices.map(service => (
                            <Card 
                              key={service.id} 
                              className="bg-gradient-to-r from-white to-blue-50/30 border-0 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
                              onClick={() => handleEdit(service)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-bold text-gray-900">{service.customer.name}</h4>
                                  <Badge className={cn(
                                    "text-xs font-medium",
                                    service.status === 'completed' && "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
                                    service.status === 'in_progress' && "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
                                    service.status === 'scheduled' && "bg-gradient-to-r from-orange-500 to-yellow-500 text-white",
                                    service.status === 'cancelled' && "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                                  )}>
                                    {translateStatus(service.status)}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 text-sm mb-1 flex items-center">
                                  <Clock className="inline h-3 w-3 mr-2" />
                                  {service.scheduledTime || "Horário não definido"}
                                </p>
                                <p className="text-gray-600 text-sm flex items-center">
                                  <Car className="inline h-3 w-3 mr-2" />
                                  {service.vehicle.brand} {service.vehicle.model}
                                </p>
                              </CardContent>
                            </Card>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Appointments List Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-2 rounded-lg mr-3">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  Agendamentos
                </h2>
                {/* Period Filter Dropdown */}
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-44 bg-white border-2 border-gray-200 text-gray-900 shadow-md hover:shadow-lg transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="hoje">Hoje ({getFilterCount("hoje")})</SelectItem>
                    <SelectItem value="semana">Esta Semana ({getFilterCount("semana")})</SelectItem>
                    <SelectItem value="mes">Este Mês ({getFilterCount("mes")})</SelectItem>
                    <SelectItem value="todos">Todos ({services.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredServices.length === 0 ? (
                <Card className="bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 border-0 shadow-xl">
                  <CardContent className="p-12 text-center">
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-6 rounded-full w-20 h-20 mx-auto mb-6">
                      <Calendar className="h-8 w-8 text-white mx-auto" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-3">Nenhum agendamento</h3>
                    <p className="text-gray-500 mb-4">Não há agendamentos para o período selecionado</p>
                    <div className="flex justify-center">
                      <Button
                        onClick={() => {
                          const defaultValues = {
                            customerId: 0,
                            vehicleId: 0,
                            serviceTypeId: undefined,
                            technicianId: 0,
                            scheduledDate: "",
                            scheduledTime: "",
                            status: "scheduled" as "scheduled" | "in_progress" | "completed" | "cancelled",
                            notes: "",
                            valorPago: "0",
                            pixPago: "0.00",
                            dinheiroPago: "0.00",
                            chequePago: "0.00",
                            cartaoPago: "0.00",
                            reminderEnabled: false,
                            reminderMinutes: 30,
                          };

                          form.reset(defaultValues);
                          setServiceExtras([]);
                          setInitialServiceExtras([]);
                          setFormInitialValues(defaultValues);
                          setPaymentMethods({
                            pix: "",
                            dinheiro: "",
                            cheque: "",
                            cartao: ""
                          });
                          setIsAddModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Agendamento
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {filteredServices.map(service => (
                    <Card 
                      key={service.id} 
                      className="bg-gradient-to-r from-white via-blue-50/30 to-purple-50/20 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                      onClick={() => handleEdit(service)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors text-lg mb-1">
                              {service.customer.name}
                            </h3>
                            <div className="flex items-center text-gray-600 text-sm mb-1">
                              <Clock className="h-4 w-4 mr-2 text-teal-500" />
                              {service.scheduledTime || "Horário não definido"}
                            </div>
                          </div>
                          <Badge 
                            className={cn(
                              "text-xs font-semibold shadow-md",
                              service.status === 'completed' && "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
                              service.status === 'in_progress' && "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
                              service.status === 'scheduled' && "bg-gradient-to-r from-orange-500 to-yellow-500 text-white",
                              service.status === 'cancelled' && "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                            )}
                          >
                            {translateStatus(service.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center text-gray-600 text-sm">
                            <Car className="h-4 w-4 mr-2 text-indigo-500" />
                            <span className="font-medium">{service.vehicle.brand} {service.vehicle.model}</span>
                          </div>
                          <div className="flex items-center text-gray-600 text-sm">
                            <MapPin className="h-4 w-4 mr-2 text-purple-500" />
                            <span className="font-medium">{service.vehicle.licensePlate}</span>
                          </div>
                        </div>

                        {service.serviceType && (
                          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center text-teal-700 text-sm font-semibold">
                              <Wrench className="h-4 w-4 mr-2" />
                              {service.serviceType.name}
                            </div>
                          </div>
                        )}

                        {service.estimatedValue && (
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-gray-600 text-sm">Valor Estimado:</span>
                            <span className="font-bold text-green-600">
                              R$ {Number(service.estimatedValue).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Floating Action Button */}
          <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            if (!open && (hasUnsavedChanges || temporaryPhotos.length > 0 || serviceExtras.length > 0)) {
              unsavedChanges.triggerConfirmation(() => {
                setIsAddModalOpen(false);
                setFormInitialValues(null);
                setServiceExtras([]);
                form.reset();
                setTemporaryPhotos([]);
                setPaymentMethods({
                  pix: "",
                  dinheiro: "",
                  cheque: "",
                  cartao: ""
                });
                setEditingService(null);
              });
            } else {
              setIsAddModalOpen(open);
              if (!open) {
                setFormInitialValues(null);
                setServiceExtras([]);
                setInitialServiceExtras([]);
                form.reset();
                setTemporaryPhotos([]);
                setPaymentMethods({
                  pix: "",
                  dinheiro: "",
                  cheque: "",
                  cartao: ""
                });
                setEditingService(null);
              }
            }
          }}>
            {/* Botão de Pesquisa Flutuante */}
            <Button
              className="fixed bottom-24 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 z-50 transform hover:scale-110"
              size="sm"
              onClick={() => setIsSearchModalOpen(true)}
            >
              <Search className="h-7 w-7" />
            </Button>

            <DialogTrigger asChild>
              <Button
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 z-50 transform hover:scale-110"
                size="sm"
                onClick={() => {
                  setEditingService(null);
                  const defaultValues = {
                    customerId: 0,
                    vehicleId: 0,
                    serviceTypeId: undefined,
                    technicianId: 0,
                    scheduledDate: "",
                    scheduledTime: "",
                    status: "scheduled" as "scheduled" | "in_progress" | "completed" | "cancelled",
                    notes: "",
                    valorPago: "0",
                    pixPago: "0.00",
                    dinheiroPago: "0.00",
                    chequePago: "0.00",
                    cartaoPago: "0.00",
                    reminderEnabled: false,
                    reminderMinutes: 30,
                  };

                  // Reset form with correct values FIRST
                  form.reset(defaultValues);

                  // Clear service extras immediately for new service and reset the component
                  setServiceExtras([]);
                  setInitialServiceExtras([]);

                  // THEN set initial values for comparison
                  setFormInitialValues(defaultValues);

                  // Reset payment methods when creating new service
                  setPaymentMethods({
                    pix: "",
                    dinheiro: "",
                    cheque: "",
                    cartao: ""
                  });
                }}
              >
                <Plus className="h-7 w-7" />
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/30">
              <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                  {editingService ? "Editar Agendamento" : "Novo Agendamento"}
                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                            <User className="h-4 w-4 mr-2 text-teal-600" />
                            Cliente
                          </FormLabel>
                          {customersLoading ? (
                            <div className="py-8">
                              <LoadingSpinner size="md" text="Carregando clientes..." />
                            </div>
                          ) : (
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(Number(value));
                                form.setValue("vehicleId", 0); // Reset vehicle when customer changes
                              }} 
                              value={field.value > 0 ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                  <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customers.map((customer: Customer) => (
                                  <SelectItem key={customer.id} value={customer.id.toString()}>
                                    {customer.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleId"
                      render={({ field }) => {
                        const selectedCustomerId = form.watch("customerId");
                        const availableVehicles = vehicles.filter(vehicle => 
                          selectedCustomerId ? (vehicle.customerId === selectedCustomerId || vehicle.customer?.id === selectedCustomerId) : true
                        );

                        return (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                              <Car className="h-4 w-4 mr-2 text-teal-600" />
                              Veículo
                            </FormLabel>
                            {vehiclesLoading ? (
                              <div className="py-8">
                                <LoadingSpinner size="md" text="Carregando veículos..." />
                              </div>
                            ) : (
                              <Select 
                                onValueChange={(value) => field.onChange(Number(value))} 
                                value={field.value > 0 ? field.value.toString() : ""}
                                disabled={!selectedCustomerId}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md disabled:opacity-50">
                                    <SelectValue placeholder={selectedCustomerId ? "Selecione um veículo" : "Primeiro selecione um cliente"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableVehicles.map((vehicle) => (
                                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                      {vehicle.licensePlate} - {vehicle.brand} {vehicle.model}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="technicianId"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                          <User className="h-4 w-4 mr-2 text-teal-600" />
                          Técnico Responsável
                        </FormLabel>
                        {techniciansLoading ? (
                          <div className="py-8">
                            <LoadingSpinner size="md" text="Carregando técnicos..." />
                          </div>
                          ) : (
                          <Select 
                            onValueChange={(value) => field.onChange(Number(value))} 
                            value={field.value > 0 ? field.value.toString() : ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                <SelectValue placeholder="Selecione o técnico" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((technician: any) => (
                                <SelectItem key={technician.id} value={technician.id.toString()}>
                                  {technician.firstName} {technician.lastName} ({technician.username})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-semibold text-slate-700">Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="scheduled">Agendado</SelectItem>
                            <SelectItem value="in_progress">Em Andamento</SelectItem>
                            <SelectItem value="completed">Concluído</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-3")}>
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                              value={field.value || ""} 
                              className={cn(
                                "h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg bg-white transition-all duration-200",
                                isMobile && "text-base" // Prevent zoom on iOS
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduledTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="time" 
                              value={field.value || ""} 
                              className={cn(
                                "h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg bg-white transition-all duration-200",
                                isMobile && "text-base" // Prevent zoom on iOS
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Services Section - IGUAL À PÁGINA DE SERVIÇOS */}
                  <div className="col-span-2 border-t pt-4">
                    <h4 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                      <Wrench className="h-5 w-5 mr-2 text-teal-600" />
                      Serviços
                    </h4>
                    <ServiceItems
                      serviceId={editingService?.id}
                      onChange={(items) => {
                        console.log('Agenda page - Received items from ServiceItems:', items);
                        setServiceExtras(items);
                      }}
                      initialItems={serviceExtras}
                    />
                  </div>

                  {/* Service Budget Section - IGUAL À PÁGINA DE SERVIÇOS */}
                  <div className="col-span-2 border-t pt-6">
                    <div className="space-y-4">
                      {/* Budget Summary */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center">
                          <Calculator className="h-5 w-5 mr-2 text-slate-600" />
                          Valores do Agendamento
                        </h3>
                        <div className="space-y-3">
                          {/* Services Summary */}
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="text-sm font-bold text-slate-800 mb-3">Serviços:</div>
                            <div className="space-y-2">
                              {/* Serviços selecionados */}
                              {serviceExtras.length > 0 && serviceExtras.map((extra, index) => {
                                // Buscar o nome do tipo de serviço no array serviceTypes
                                const serviceType = serviceTypes.find(st => st.id === extra.serviceTypeId);
                                const serviceName = serviceType?.name || `Serviço ${index + 1}`;
                                const servicePrice = extra.totalPrice || extra.unitPrice || "0.00";

                                return (
                                  <div key={extra.tempId || index} className="flex justify-between items-center text-xs">
                                    <span className="text-emerald-700">{serviceName}:</span>
                                    <span className="font-medium text-emerald-800">R$ {Number(servicePrice).toFixed(2)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="border-t border-slate-300 pt-2 mt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-slate-800">Total do Agendamento:</span>
                              <span className="text-xl font-bold text-slate-700">
                                R$ {calculateTotalValue()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Control Section */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-emerald-800 mb-3 flex items-center">
                          <DollarSign className="h-5 w-5 mr-2 text-emerald-600" />
                          Pagamentos
                        </h3>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-xs text-slate-600 mb-1">Valor Total</div>
                            <div className="text-lg font-bold text-slate-700">R$ {calculateTotalValue()}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-600 mb-1">Valor Pago</div>
                            <div className="text-lg font-bold text-emerald-600">
                              R$ {Number(form.watch("valorPago") || 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-600 mb-1">Saldo</div>
                            <div className={`text-lg font-bold ${
                              (Number(calculateTotalValue()) - Number(form.watch("valorPago") || 0)) <= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              R$ {(Number(calculateTotalValue()) - Number(form.watch("valorPago") || 0)).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <PaymentManager
                          totalValue={Number(calculateTotalValue())}
                          currentPaidValue={Number(form.watch("valorPago") || 0)}
                          pixPago={Number(form.watch("pixPago") || 0)}
                          dinheiroPago={Number(form.watch("dinheiroPago") || 0)}
                          chequePago={Number(form.watch("chequePago") || 0)}
                          cartaoPago={Number(form.watch("cartaoPago") || 0)}
                          onPaymentChange={(pixPago, dinheiroPago, chequePago, cartaoPago) => {
                            form.setValue("pixPago", pixPago.toFixed(2));
                            form.setValue("dinheiroPago", dinheiroPago.toFixed(2));
                            form.setValue("chequePago", chequePago.toFixed(2));
                            form.setValue("cartaoPago", cartaoPago.toFixed(2));

                            const totalPago = pixPago + dinheiroPago + chequePago + cartaoPago;
                            form.setValue("valorPago", totalPago.toFixed(2));
                          }}
                        />
                        {/* Payment Input */}
                        <FormField
                          control={form.control}
                          name="valorPago"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-emerald-700">
                                Registrar Pagamento
                              </FormLabel>
                              <FormControl>
                                <div className="flex space-x-2">
                                  <div className="relative flex-1">
                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                                    <Input
                                      {...field}
                                      type="text"
                                      placeholder="0.00"
                                      className="pl-10 h-11 border-2 border-emerald-200 focus:border-emerald-400 rounded-lg bg-white"
                                      value={formatCurrency(field.value || "0.00")}
                                      onChange={(e) => {
                                        const formattedValue = formatCurrency(e.target.value);
                                        field.onChange(parseCurrency(formattedValue));
                                      }}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="h-11 px-4 border-2 border-emerald-200 hover:border-emerald-400 text-emerald-700 hover:text-emerald-800 transition-all duration-200"
                                  >
                                    <Coins className="h-4 w-4" />
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Reminder Section */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <Bell className="h-5 w-5 text-yellow-600 mr-2" />
                          <span className="font-medium text-yellow-800">Lembrete de Agendamento</span>
                        </div>

                        <FormField
                          control={form.control}
                          name="reminderEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-yellow-300 p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">
                                  Ativar lembrete de notificação
                                </FormLabel>
                                <div className="text-xs text-yellow-700">
                                  Receba uma notificação antes do horário do agendamento
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value || false}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {form.watch("reminderEnabled") && (
                          <FormField
                            control={form.control}
                            name="reminderMinutes"
                            render={({ field }) => (
                              <FormItem className="mt-3">
                                <FormLabel>Enviar lembrete (minutos antes)</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString() || "30"}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione quando enviar o lembrete" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="15">15 minutos antes</SelectItem>
                                    <SelectItem value="30">30 minutos antes</SelectItem>
                                    <SelectItem value="60">1 hora antes</SelectItem>
                                    <SelectItem value="120">2 horas antes</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsResumeModalOpen(true)}
                          className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400 font-medium px-4 py-2 text-sm transition-all duration-200"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Resumo Completo
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Photos Section - IGUAL À PÁGINA DE SERVIÇOS */}
                  <div className="col-span-2 border-t pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Fotos</h4>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCameraOpen(true)}
                            className="flex items-center gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            Tirar Foto
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('service-photo-upload')?.click()}
                            className="flex items-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Adicionar Fotos
                          </Button>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            id="service-photo-upload"
                            onChange={async (event) => {
                              const files = event.target.files;
                              if (!files || files.length === 0) return;

                              // For new services without ID, add to temporary photos
                              if (!editingService?.id) {
                                Array.from(files).forEach((file) => {
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    const photo = e.target?.result as string;
                                    setTemporaryPhotos(prev => [...prev, { photo, category: 'service' }]);
                                  };
                                  reader.readAsDataURL(file);
                                });

                                toast({
                                  title: "Fotos adicionadas!",
                                  description: "As fotos serão salvas quando o agendamento for cadastrado.",
                                });
                                return;
                              }

                              // For existing services, upload directly
                              try {
                                for (const file of Array.from(files)) {
                                  if (!file.type.startsWith('image/')) {
                                    toast({
                                      title: "Arquivo inválido",
                                      description: "Apenas imagens são permitidas.",
                                      variant: "destructive",
                                    });
                                    continue;
                                  }

                                  const formData = new FormData();
                                  formData.append('photo', file);
                                  formData.append('category', 'service');
                                  formData.append('serviceId', editingService.id.toString());

                                  const res = await fetch('/api/photos/upload', {
                                    method: 'POST',
                                    body: formData,
                                    credentials: 'include',
                                  });

                                  if (!res.ok) {
                                    throw new Error(`${res.status}: ${res.statusText}`);
                                  }
                                }

                                toast({
                                  title: "Fotos enviadas",
                                  description: "As fotos foram enviadas com sucesso.",
                                });

                                fetchServicePhotos(editingService.id);
                              } catch (error: any) {
                                toast({
                                  title: "Erro",
                                  description: error.message,
                                  variant: "destructive",
                                });
                              }

                              // Reset file input
                              event.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                      <PhotoUpload
                        photos={editingService?.id ? currentServicePhotos : []}
                        onPhotoUploaded={async () => {
                          if (editingService?.id) {
                            fetchServicePhotos(editingService.id);
                          }
                        }}
                        serviceId={editingService?.id}
                        maxPhotos={7}
                        hideUploadButton={true}
                      />

                      {/* Show temporary photos for new services */}
                      {!editingService?.id && temporaryPhotos.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Fotos adicionadas:</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {temporaryPhotos.map((tempPhoto, index) => (
                              <div key={index} className="relative group">
                                <img 
                                  src={tempPhoto.photo} 
                                  alt={`Foto ${index + 1}`}
                                  className="w-full h-20 object-cover rounded-lg border"
                                />
                                <button
                                  type="button"
                                  onClick={() => setTemporaryPhotos(prev => prev.filter((_, i) => i !== index))}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        if (hasUnsavedChanges || temporaryPhotos.length > 0 || serviceExtras.length > 0) {
                          unsavedChanges.triggerConfirmation(() => {
                            setIsAddModalOpen(false);
                            setFormInitialValues(null);
                            setServiceExtras([]);
                            form.reset();
                            setTemporaryPhotos([]);
                            setPaymentMethods({
                              pix: "",
                              dinheiro: "",
                              cheque: "",
                              cartao: ""
                            });
                            setEditingService(null);
                          });
                        } else {
                          setIsAddModalOpen(false);
                          setFormInitialValues(null);
                          setServiceExtras([]);
                          form.reset();
                          setTemporaryPhotos([]);
                          setPaymentMethods({
                            pix: "",
                            dinheiro: "",
                            cheque: "",
                            cartao: ""
                          });
                          setEditingService(null);
                        }
                      }}
                      className="px-6 py-2 font-medium"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 font-semibold"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingService ? "Atualizar Agendamento" : "Criar Agendamento"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Enhanced Multiple Appointments Modal */}
          <Dialog open={isDayAppointmentsModalOpen} onOpenChange={setIsDayAppointmentsModalOpen}>
            <DialogContent className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 border-0 shadow-2xl max-w-lg">
              <DialogHeader className="pb-4 border-b border-gray-100">
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent flex items-center">
                  <Calendar className="h-6 w-6 mr-3 text-teal-600" />
                  Agendamentos - {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                </DialogTitle>
                <p className="text-gray-600 text-sm mt-2">
                  {selectedDayServices.length} agendamento{selectedDayServices.length !== 1 ? 's' : ''} para este dia
                </p>
              </DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {selectedDayServices.map((service, index) => (
                  <Card 
                    key={service.id} 
                    className="bg-gradient-to-r from-white to-blue-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                    onClick={() => {
                      setIsDayAppointmentsModalOpen(false);
                      handleEdit(service);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors mb-1">
                            {service.customer.name}
                          </h3>
                          <div className="flex items-center text-gray-600 text-sm mb-1">
                            <Clock className="h-3 w-3 mr-2 text-teal-500" />
                            {service.scheduledTime || "Horário não definido"}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge 
                            className={cn(
                              "text-xs font-semibold",
                              service.status === 'completed' && "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
                              service.status === 'in_progress' && "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
                              service.status === 'scheduled' && "bg-gradient-to-r from-orange-500 to-yellow-500 text-white",
                              service.status === 'cancelled' && "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                            )}
                          >
                            {translateStatus(service.status)}
                          </Badge>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 mb-3">
                        <div className="flex items-center text-gray-600 text-sm">
                          <Car className="h-3 w-3 mr-2 text-indigo-500" />
                          <span className="font-medium">{service.vehicle.brand} {service.vehicle.model}</span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                          <MapPin className="h-3 w-3 mr-2 text-purple-500" />
                          <span className="font-medium">{service.vehicle.licensePlate}</span>
                        </div>
                      </div>

                      {service.serviceType && (
                        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-lg p-2">
                          <div className="flex items-center text-teal-700 text-xs font-semibold">
                            <Wrench className="h-3 w-3 mr-2" />
                            {service.serviceType.name}
                          </div>
                        </div>
                      )}

                      {service.estimatedValue && (
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
                          <span className="text-gray-600 text-xs">Valor:</span>
                          <span className="font-bold text-green-600 text-sm">
                            R$ {Number(service.estimatedValue).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="pt-4 border-t border-gray-100">
                <Button
                  onClick={() => setIsDayAppointmentsModalOpen(false)}
                  className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white"
                >
                  Fechar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Camera Capture Modal */}
          <CameraCapture
            isOpen={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            onPhotoTaken={handlePhotoTaken}
            serviceId={editingService?.id}
          />

          {/* Service Resume Modal */}
          <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center text-emerald-800">
                  <FileText className="h-5 w-5 mr-2" />
                  Resumo Completo do Agendamento
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Client and Vehicle Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <User className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-800">Cliente</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      {(() => {
                        const selectedCustomerId = form.watch("customerId");
                        const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
                        return selectedCustomer?.name || "Nenhum cliente selecionado";
                      })()}
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Car className="h-5 w-5 text-indigo-600 mr-2" />
                      <span className="font-medium text-indigo-800">Veículo</span>
                    </div>
                    <div className="text-sm text-indigo-700">
                      {(() => {
                        const selectedVehicleId = form.watch("vehicleId");
                        const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
                        return selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} - ${selectedVehicle.licensePlate}` : "Nenhum veículo selecionado";
                      })()}
                    </div>
                  </div>
                </div>

                {/* Service Details */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Calendar className="h-5 w-5 text-slate-600 mr-2" />
                    <span className="font-medium text-slate-800">Agendamento</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Data:</span>
                      <span className="ml-2 font-medium">{form.watch("scheduledDate") || "Não definida"}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Hora:</span>
                      <span className="ml-2 font-medium">{form.watch("scheduledTime") || "Não definida"}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Status:</span>
                      <span className="ml-2 font-medium">{translateStatus(form.watch("status") || "scheduled")}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Técnico:</span>
                      <span className="ml-2 font-medium">
                        {(() => {
                          const selectedTechnicianId = form.watch("technicianId");
                          const selectedTechnician = users.find(u => u.id === selectedTechnicianId);
                          return selectedTechnician ? `${selectedTechnician.firstName} ${selectedTechnician.lastName}` : "Não atribuído";
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Service Extras */}
                {serviceExtras.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Plus className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="font-medium text-purple-800">Serviços Inclusos</span>
                    </div>
                    <div className="space-y-2">
                      {serviceExtras.map((extra, index) => {
                        // Buscar o nome do tipo de serviço no array serviceTypes
                        const serviceType = serviceTypes.find(st => st.id === extra.serviceTypeId);
                        const serviceName = serviceType?.name || `Serviço ${index + 1}`;
                        const servicePrice = extra.totalPrice || extra.unitPrice || "0.00";

                        return (
                          <div key={extra.tempId || index} className="flex justify-between items-center text-sm">
                            <div className="flex-1">
                              <span className="text-purple-700 font-medium">{serviceName}</span>
                              {extra.notes && (
                                <div className="text-xs text-purple-600 mt-1">{extra.notes}</div>
                              )}
                            </div>
                            <span className="font-medium text-purple-800">R$ {Number(servicePrice).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <DollarSign className="h-5 w-5 text-emerald-600 mr-2" />
                    <span className="font-medium text-emerald-800">Resumo Financeiro</span>
                  </div>
                  <div className="space-y-2">
                    {/* Detalhamento dos serviços */}
                    {serviceExtras.length > 0 && (
                      <div className="bg-white border border-emerald-200 rounded-lg p-3 mb-3">
                        <div className="text-sm font-medium text-emerald-800 mb-2">Serviços:</div>
                        <div className="space-y-1">
                          {serviceExtras.map((extra, index) => {
                            const serviceType = serviceTypes.find(st => st.id === extra.serviceTypeId);
                            const serviceName = serviceType?.name || `Serviço ${index + 1}`;
                            const servicePrice = extra.totalPrice || extra.unitPrice || "0.00";

                            return (
                              <div key={extra.tempId || index} className="flex justify-between items-center text-xs">
                                <span className="text-emerald-700">{serviceName}:</span>
                                <span className="font-medium text-emerald-800">R$ {Number(servicePrice).toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-emerald-300 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-emerald-800">Total do Agendamento:</span>
                        <span className="text-xl font-bold text-emerald-700">R$ {calculateTotalValue()}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-700">Valor Pago:</span>
                      <span className="font-medium">R$ {Number(form.watch("valorPago") || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-700">Saldo:</span>
                      <span className={`font-medium ${
                        (Number(calculateTotalValue()) - Number(form.watch("valorPago") || 0)) <= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        R$ {(Number(calculateTotalValue()) - Number(form.watch("valorPago") || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {form.watch("notes") && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <FileText className="h-5 w-5 text-yellow-600 mr-2" />
                      <span className="font-medium text-yellow-800">Observações</span>
                    </div>
                    <div className="text-sm text-yellow-700">{form.watch("notes")}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePDF}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300 hover:border-red-400 font-medium px-6 py-2 text-sm transition-all duration-200"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResumeModalOpen(false)}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300 hover:border-gray-400 font-medium px-6 py-2 text-sm transition-all duration-200"
                >
                  Fechar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Payment Methods Modal */}
          <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center text-emerald-800">
                  <Coins className="h-5 w-5 mr-2" />
                  Formas de Pagamento
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* PIX */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">PIX</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      <Input
                        type="text"
                        placeholder="0.00"
                        value={formatCurrency(paymentMethods.pix)}
                        onChange={(e) => {
                          const formattedValue = formatCurrency(e.target.value);
                          setPaymentMethods(prev => ({ ...prev, pix: parseCurrency(formattedValue) }));
                        }}
                        className="pl-10 h-11 border-2 border-emerald-200 focus:border-emerald400 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Dinheiro */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Dinheiro</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      <Input
                        type="text"
                        placeholder="0.00"
                        value={formatCurrency(paymentMethods.dinheiro)}
                        onChange={(e) => {
                          const formattedValue = formatCurrency(e.target.value);
                          setPaymentMethods(prev => ({ ...prev, dinheiro: parseCurrency(formattedValue) }));
                        }}
                        className="pl-10 h-11 border-2 border-emerald-200 focus:border-emerald-400 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Cheque */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Cheque</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      <Input
                        type="text"
                        placeholder="0.00"
                        value={formatCurrency(paymentMethods.cheque)}
                        onChange={(e) => {
                          const formattedValue = formatCurrency(e.target.value);
                          setPaymentMethods(prev => ({ ...prev, cheque: parseCurrency(formattedValue) }));
                        }}
                        className="pl-10 h-11 border-2 border-emerald-200 focus:border-emerald-400 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Cartão */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Cartão</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      <Input
                        type="text"
                        placeholder="0.00"
                        value={formatCurrency(paymentMethods.cartao)}
                        onChange={(e) => {
                          const formattedValue = formatCurrency(e.target.value);
                          setPaymentMethods(prev => ({ ...prev, cartao: parseCurrency(formattedValue) }));
                        }}
                        className="pl-10 h-11 border-2 border-emerald-200 focus:border-emerald-400 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Total das formas de pagamento */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-emerald-700">Total:</span>
                    <span className="text-lg font-bold text-emerald-800">
                      R$ {(
                        Number(paymentMethods.pix || 0) +
                        Number(paymentMethods.dinheiro || 0) +
                        Number(paymentMethods.cheque || 0) +
                        Number(paymentMethods.cartao || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-6 py-2 font-medium"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 font-semibold"
                    onClick={() => {
                      const totalPayment = (
                        Number(paymentMethods.pix || 0) +
                        Number(paymentMethods.dinheiro || 0) +
                        Number(paymentMethods.cheque || 0) +
                        Number(paymentMethods.cartao || 0)
                      ).toFixed(2);
                      form.setValue("valorPago", totalPayment);
                      setIsPaymentModalOpen(false);
                    }}
                  >
                    Aplicar Pagamento
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          
          <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/30 border-0 shadow-2xl">
              <DialogHeader className="pb-4 border-b border-gray-100/50">
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent flex items-center">
                  <Search className="h-6 w-6 mr-3 text-teal-600" />
                  Pesquisar Agendamentos
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por cliente, veículo ou placa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 border-2 border-gray-200 focus:border-teal-400 rounded-xl shadow-sm bg-white transition-all duration-200"
                    autoFocus
                  />
                </div>

                {searchTerm && (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                    <div className="text-sm text-gray-600 mb-4 flex items-center justify-between">
                      <span>
                        {filteredServices.length === 0 
                          ? "Nenhum agendamento encontrado."
                          : `${filteredServices.length} agendamento(s) encontrado(s).`
                        }
                      </span>
                      {filteredServices.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setIsSearchModalOpen(false);
                          }}
                          className="text-xs"
                        >
                          Limpar busca
                        </Button>
                      )}
                    </div>

                    {filteredServices.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                        {filteredServices.map((service) => (
                          <Card 
                            key={service.id}
                            className="bg-gradient-to-r from-white to-blue-50/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    <Calendar className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-teal-700 transition-colors">
                                      {service.customer.name}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                      {service.vehicle.brand} {service.vehicle.model}
                                    </p>
                                  </div>
                                </div>
                                <Badge className={cn(
                                  "text-xs font-semibold",
                                  service.status === 'completed' && "bg-green-100 text-green-700 border-green-200",
                                  service.status === 'in_progress' && "bg-blue-100 text-blue-700 border-blue-200",
                                  service.status === 'scheduled' && "bg-orange-100 text-orange-700 border-orange-200",
                                  service.status === 'cancelled' && "bg-red-100 text-red-700 border-red-200"
                                )} variant="outline">
                                  {translateStatus(service.status)}
                                </Badge>
                              </div>

                              <div className="space-y-2 mb-4">
                                <div className="flex items-center text-xs text-gray-600">
                                  <Car className="h-3 w-3 mr-2 text-teal-500" />
                                  <span className="font-mono">{service.vehicle.licensePlate}</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-600">
                                  <Clock className="h-3 w-3 mr-2 text-teal-500" />
                                  <span>
                                    {service.scheduledDate && format(parseISO(service.scheduledDate), "dd/MM/yyyy", { locale: ptBR })} 
                                    {service.scheduledTime && ` às ${service.scheduledTime.substring(0, 5)}`}
                                  </span>
                                </div>
                                {service.estimatedValue && (
                                  <div className="flex items-center text-xs text-gray-600">
                                    <DollarSign className="h-3 w-3 mr-2 text-green-500" />
                                    <span className="font-semibold text-green-600">
                                      R$ {Number(service.estimatedValue).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setIsSearchModalOpen(false);
                                    handleEdit(service);
                                  }}
                                  className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    setIsSearchModalOpen(false);

                                    try {
                                      const selectedCustomer = customers.find(c => c.id === service.customerId);
                                      const selectedVehicle = vehicles.find(v => v.id === service.vehicleId);
                                      const selectedTechnician = users.find(u => u.id === service.technicianId);

                                      if (!selectedCustomer || !selectedVehicle || !selectedTechnician) {
                                        toast({
                                          title: "Erro",
                                          description: "Dados incompletos para gerar o PDF.",
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      const serviceData = {
                                        id: service.id,
                                        customer: { name: selectedCustomer.name },
                                        vehicle: { 
                                          brand: selectedVehicle.brand, 
                                          model: selectedVehicle.model, 
                                          licensePlate: selectedVehicle.licensePlate 
                                        },
                                        scheduledDate: service.scheduledDate,
                                        scheduledTime: service.scheduledTime,
                                        status: service.status,
                                        technician: { 
                                          firstName: selectedTechnician.firstName, 
                                          lastName: selectedTechnician.lastName 
                                        },
                                        serviceExtras: [],
                                        totalValue: service.estimatedValue || "0.00",
                                        valorPago: service.valorPago || "0",
                                        notes: service.notes,
                                      };

                                      await generateServicePDF(serviceData, true);

                                      toast({
                                        title: "PDF Gerado",
                                        description: "O PDF do agendamento foi gerado com sucesso!",
                                      });
                                    } catch (error) {
                                      console.error('Error generating PDF:', error);
                                      toast({
                                        title: "Erro ao gerar PDF",
                                        description: "Ocorreu um erro ao gerar o PDF.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Gerar PDF
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                          <Calendar className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Nenhum agendamento encontrado</p>
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsSearchModalOpen(false);
                            setEditingService(null);
                            const defaultValues = {
                              customerId: 0,
                              vehicleId: 0,
                              serviceTypeId: undefined,
                              technicianId: 0,
                              scheduledDate: "",
                              scheduledTime: "",
                              status: "scheduled" as "scheduled" | "in_progress" | "completed" | "cancelled",
                              notes: "",
                              valorPago: "0",
                              pixPago: "0.00",
                              dinheiroPago: "0.00",
                              chequePago: "0.00",
                              cartaoPago: "0.00",
                            };
                            form.reset(defaultValues);
                            setServiceExtras([]);
                            setInitialServiceExtras([]);
                            setFormInitialValues(defaultValues);
                            setPaymentMethods({
                              pix: "",
                              dinheiro: "",
                              cheque: "",
                              cartao: ""
                            });
                            setIsAddModalOpen(true);
                          }}
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Criar agendamento
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={() => setIsSearchModalOpen(false)}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog de confirmação de alterações não salvas */}
          <UnsavedChangesDialog
            isOpen={unsavedChanges.showConfirmDialog}
            onConfirm={unsavedChanges.confirmNavigation}
            onCancel={unsavedChanges.cancelNavigation}
            message={unsavedChanges.message}
          />
        </main>
      </div>
    </div>
  );
}