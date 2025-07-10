import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
import { Calendar, DollarSign, MoreHorizontal, Plus, Search, Edit, Trash2, Clock, User, Car, Wrench, CheckCircle, XCircle, Timer, BarChart3, FileText, Camera, Coins, Calculator, Smartphone, Banknote, CreditCard, Receipt, Bell, X, ChevronLeft, ChevronRight, Home, CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType, type Photo } from "@shared/schema";
import { z } from "zod";
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ServiceItems from "@/components/service/service-items";
import PaymentManager from "@/components/service/payment-manager";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

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
  reminderEnabled: z.boolean().optional(),
  reminderMinutes: z.number().optional(),
  serviceExtras: z.array(z.object({
    unifiedServiceId: z.number(),
    valor: z.string(),
    observacao: z.string().optional(),
  })).optional(),
});

export default function SchedulePageNew() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [serviceExtras, setServiceExtras] = useState<any[]>([]);
  const [temporaryPhotos, setTemporaryPhotos] = useState<Array<{ photo: string; category: string }>>([]);

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
      valorPago: "0",
    },
  });

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
    queryKey: ["/api/services"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: vehicles = [] } = useQuery<(Vehicle & { customer: Customer })[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
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

  const createServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema>) => {
      // Convert form data to API format
      const formattedData = {
        ...data,
        valorPago: parseCurrency(data.valorPago || "0"),
        serviceExtras: serviceExtras.map(extra => ({
          unifiedServiceId: extra.unifiedServiceId,
          valor: parseCurrency(extra.valor || "0"),
          observacao: extra.observacao || "",
        }))
      };

      const response = await apiRequest('/api/services', {
        method: 'POST',
        body: JSON.stringify(formattedData),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsAddModalOpen(false);
      form.reset();
      setServiceExtras([]);
      setTemporaryPhotos([]);
      toast({
        title: "Sucesso",
        description: "Ordem de serviço criada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar ordem de serviço",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof serviceFormSchema>) => {
    createServiceMutation.mutate(data);
  };

  if (servicesLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Top Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {format(currentDate, "dd MMM yyyy", { locale: ptBR })}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                {/* Period Filter Buttons */}
                <div className="flex bg-slate-800 rounded-full p-1">
                  {[
                    { key: "hoje", label: "Hoje" },
                    { key: "semana", label: "Semana" },
                    { key: "mes", label: "Mês" },
                    { key: "todos", label: "Todos" }
                  ].map(filter => (
                    <Button
                      key={filter.key}
                      variant={periodFilter === filter.key ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPeriodFilter(filter.key)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm",
                        periodFilter === filter.key 
                          ? "bg-green-600 text-white" 
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {filter.label}
                      {filter.key !== "todos" && (
                        <span className="ml-1 text-xs">
                          ({getFilterCount(filter.key)})
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          </div>

          {/* View Mode Selector */}
          <div className="flex bg-slate-800 rounded-full p-1 mb-6 w-fit">
            {['Month', 'Week', 'Day'].map(mode => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode(mode as any)}
                className={cn(
                  "rounded-full px-4 py-2",
                  viewMode === mode 
                    ? "bg-white text-slate-900" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                {mode}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Section */}
            <div className="lg:col-span-2">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevMonth}
                      className="text-slate-400 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextMonth}
                      className="text-slate-400 hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-slate-400 p-2">
                        {day}
                      </div>
                    ))}
                    {calendarDays.map((day, index) => (
                      <div
                        key={index}
                        onClick={() => handleDayClick(day.date)}
                        className={cn(
                          "relative p-2 text-center cursor-pointer rounded-lg transition-colors min-h-[40px] flex items-center justify-center",
                          day.isCurrentMonth 
                            ? "text-white hover:bg-slate-700" 
                            : "text-slate-600",
                          day.isToday && "bg-green-600 text-white",
                          day.services.length > 0 && !day.isToday && "bg-slate-700"
                        )}
                      >
                        <span className="text-sm">{format(day.date, "d")}</span>
                        {day.services.length > 0 && (
                          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                            {day.services.slice(0, 3).map((_, i) => (
                              <div key={i} className="w-1 h-1 bg-green-400 rounded-full" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Appointments List */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Agendamentos de {periodFilter === "hoje" ? "Hoje" : periodFilter === "semana" ? "Esta Semana" : periodFilter === "mes" ? "Este Mês" : "Todos"}
              </h2>
              
              {filteredServices.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6 text-center">
                    <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">Nenhum agendamento encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredServices.map(service => (
                    <Card 
                      key={service.id} 
                      className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/services?openModal=true&serviceId=${service.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-white">
                            {service.customer.firstName} {service.customer.lastName}
                          </h3>
                          <Badge 
                            className={cn(
                              "text-xs",
                              service.status === 'completed' && "bg-green-600",
                              service.status === 'in_progress' && "bg-blue-600",
                              service.status === 'scheduled' && "bg-yellow-600",
                              service.status === 'cancelled' && "bg-red-600"
                            )}
                          >
                            {translateStatus(service.status)}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-sm mb-1">
                          {service.scheduledTime || "Horário não definido"}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {service.vehicle.brand} {service.vehicle.model} - {service.vehicle.plate}
                        </p>
                        {service.serviceType && (
                          <p className="text-green-400 text-sm mt-1">
                            {service.serviceType.name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4 md:hidden">
            <div className="flex justify-around">
              <Button variant="ghost" className="text-slate-400">
                <Home className="h-6 w-6" />
              </Button>
              <Button variant="ghost" className="text-slate-400">
                <Plus className="h-6 w-6" />
              </Button>
              <Button variant="ghost" className="text-green-400">
                <CalendarIcon className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Multiple Appointments Modal */}
          <Dialog open={isDayAppointmentsModalOpen} onOpenChange={setIsDayAppointmentsModalOpen}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Agendamentos para {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedDayServices.map(service => (
                  <Card 
                    key={service.id} 
                    className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors cursor-pointer"
                    onClick={() => {
                      setIsDayAppointmentsModalOpen(false);
                      setLocation(`/services?openModal=true&serviceId=${service.id}`);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">
                          {service.customer.firstName} {service.customer.lastName}
                        </h3>
                        <Badge 
                          className={cn(
                            "text-xs",
                            service.status === 'completed' && "bg-green-600",
                            service.status === 'in_progress' && "bg-blue-600",
                            service.status === 'scheduled' && "bg-yellow-600",
                            service.status === 'cancelled' && "bg-red-600"
                          )}
                        >
                          {translateStatus(service.status)}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm mb-1">
                        {service.scheduledTime || "Horário não definido"}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {service.vehicle.brand} {service.vehicle.model} - {service.vehicle.plate}
                      </p>
                      {service.serviceType && (
                        <p className="text-green-400 text-sm mt-1">
                          {service.serviceType.name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Service Modal */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Nova Ordem de Serviço</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Cliente</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                <SelectValue placeholder="Selecione um cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id.toString()}>
                                  {customer.firstName} {customer.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Veículo</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                <SelectValue placeholder="Selecione um veículo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              {vehicles.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                  {vehicle.brand} {vehicle.model} - {vehicle.plate}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Data</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              className="bg-slate-700 border-slate-600 text-white"
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
                          <FormLabel className="text-white">Horário</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field} 
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="technicianId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Técnico</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                <SelectValue placeholder="Selecione um técnico" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.firstName} {user.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue="scheduled">
                            <FormControl>
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-700 border-slate-600">
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
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Observações</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Observações sobre o serviço"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Service Items */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Serviços</h3>
                    <ServiceItems 
                      serviceTypes={serviceTypes}
                      serviceExtras={serviceExtras}
                      setServiceExtras={setServiceExtras}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setIsAddModalOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createServiceMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {createServiceMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}