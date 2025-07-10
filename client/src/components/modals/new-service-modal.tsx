import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
import { z } from "zod";
import { User, Car, Wrench, Calendar, Clock } from "lucide-react";
import ServiceItems from "@/components/service/service-items";

interface NewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const serviceSchemaWithoutEstimated = insertServiceSchema.omit({ estimatedValue: true });

export default function NewServiceModal({ isOpen, onClose }: NewServiceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serviceExtras, setServiceExtras] = useState<any[]>([]);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const initialFormStateRef = useRef<any>(null);

  const form = useForm<z.infer<typeof serviceSchemaWithoutEstimated>>({
    resolver: zodResolver(serviceSchemaWithoutEstimated),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: 0,
      technicianId: 0,
      status: "scheduled",
      scheduledDate: "",
      scheduledTime: "",
      notes: "",
    },
  });

  // Watch all form values
  const formValues = form.watch();

  // Check for changes when form values change
  useEffect(() => {
    const initialState = initialFormStateRef.current;

    if (!isOpen || !initialState) {
      console.log('NewServiceModal - Skipping change check:', { isOpen, hasInitialState: !!initialState });
      return;
    }

    // Compare each field individually for better debugging
    const changes = {
      customerId: formValues.customerId !== initialState.customerId,
      vehicleId: formValues.vehicleId !== initialState.vehicleId,
      serviceTypeId: formValues.serviceTypeId !== initialState.serviceTypeId,
      technicianId: formValues.technicianId !== initialState.technicianId,
      status: formValues.status !== initialState.status,
      scheduledDate: formValues.scheduledDate !== initialState.scheduledDate,
      scheduledTime: formValues.scheduledTime !== initialState.scheduledTime,
      notes: formValues.notes !== initialState.notes,
    };

    const hasChanges = Object.values(changes).some(changed => changed);

    console.log('NewServiceModal - Detailed change check:', {
      hasChanges,
      changes,
      currentValues: formValues,
      initialValues: initialState
    });

    setHasFormChanges(hasChanges);
  }, [formValues, isOpen]);

  const hasUnsavedChanges = hasFormChanges || serviceExtras.length > 0;

  console.log('NewServiceModal - State:', {
    isOpen,
    hasFormChanges,
    serviceExtrasLength: serviceExtras.length,
    hasUnsavedChanges
  });

  const unsavedChanges = useUnsavedChanges({
    hasUnsavedChanges: !!hasUnsavedChanges,
    message: "Você tem alterações não salvas no cadastro do serviço. Deseja realmente sair?"
  });

  // Handle modal close with unsaved changes check
  const handleClose = () => {
    console.log('NewServiceModal - handleClose called, hasUnsavedChanges:', hasUnsavedChanges);

    if (hasUnsavedChanges) {
      console.log('NewServiceModal - Showing unsaved changes dialog');
      unsavedChanges.triggerConfirmation(() => {
        console.log('NewServiceModal - User confirmed exit, cleaning up...');
        resetModal();
        onClose();
      });
    } else {
      console.log('NewServiceModal - No unsaved changes, closing directly');
      resetModal();
      onClose();
    }
  };

  // Reset modal state
  const resetModal = () => {
    form.reset({
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: 0,
      technicianId: 0,
      status: "scheduled",
      scheduledDate: "",
      scheduledTime: "",
      notes: "",
    });
    setServiceExtras([]);
    setHasFormChanges(false);
    initialFormStateRef.current = null;
  };

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('NewServiceModal: Modal opened, initializing...');

      // Reset states
      setHasFormChanges(false);

      const defaultValues = {
        customerId: 0,
        vehicleId: 0,
        serviceTypeId: 0,
        technicianId: 0,
        status: "scheduled" as "scheduled" | "in_progress" | "completed" | "cancelled",
        scheduledDate: "",
        scheduledTime: "",
        notes: "",
      };

      // Check URL params
      const urlParams = new URLSearchParams(window.location.search);
      const customerIdFromUrl = urlParams.get('customerId');
      const vehicleIdFromUrl = urlParams.get('vehicleId');

      if (customerIdFromUrl) {
        const customerId = parseInt(customerIdFromUrl);
        console.log('NewServiceModal: Pre-selecting customer from URL:', customerId);
        defaultValues.customerId = customerId;
      }

      if (vehicleIdFromUrl) {
        const vehicleId = parseInt(vehicleIdFromUrl);
        console.log('NewServiceModal: Pre-selecting vehicle from URL:', vehicleId);
        defaultValues.vehicleId = vehicleId;
      }

      console.log('NewServiceModal: Setting form with values:', defaultValues);
      form.reset(defaultValues);
      setServiceExtras([]);

      // Set initial state in ref immediately
      initialFormStateRef.current = { ...defaultValues };
      console.log('NewServiceModal: Initial form state set in ref:', defaultValues);
    }
  }, [isOpen, form]);

  const { data: customers = [], isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch("/api/customers", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch("/api/vehicles", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
  });

  const { data: serviceTypes = [], isLoading: loadingServiceTypes } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch("/api/service-types", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const totalValue = calculateTotalValue();
      const serviceData = {
        ...data,
        estimatedValue: totalValue,
        notes: data.notes || undefined,
        scheduledTime: data.scheduledTime || undefined,
        scheduledDate: data.scheduledDate || new Date().toISOString().split('T')[0],
      };

      console.log('Creating service with data:', serviceData);
      await apiRequest("POST", "/api/services", serviceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/upcoming-appointments"] });
      toast({
        title: "Sucesso",
        description: "Serviço criado com sucesso!",
      });
      resetModal();
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao criar serviço",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof serviceSchemaWithoutEstimated>) => {
    console.log('New Service Modal - Submitting data:', data);
    console.log('Service extras:', serviceExtras);

    const submitData = {
      ...data,
      serviceExtras: serviceExtras
    };

    createMutation.mutate(submitData);
  };

  const getCustomerVehicles = (customerId: number) => {
    if (!customerId || !vehicles) return [];
    const customerVehicles = vehicles.filter((v: Vehicle) => v.customerId === customerId);
    return customerVehicles;
  };

  const selectedCustomerId = form.watch("customerId");
  const selectedServiceTypeId = form.watch("serviceTypeId");

  // Calculate total value
  const calculateTotalValue = () => {
    let total = 0;

    // Add service extras values (now all services)
    serviceExtras.forEach(extra => {
      if (extra.valor && !isNaN(Number(extra.valor))) {
        total += Number(extra.valor);
      }
    });

    return total.toFixed(2);
  };

  const selectedServiceType = serviceTypes?.find((st: ServiceType) => st.id === selectedServiceTypeId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/30">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
            Novo Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                        <User className="h-4 w-4 mr-2 text-teal-600" />
                        Cliente
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const numValue = parseInt(value);
                          field.onChange(numValue);
                          form.setValue("vehicleId", 0);
                        }}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingCustomers ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : customers && customers.length > 0 ? (
                            customers.map((customer: Customer) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="empty" disabled>Nenhum cliente encontrado</SelectItem>
                          )}
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                        <Car className="h-4 w-4 mr-2 text-teal-600" />
                        Veículo
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const numValue = parseInt(value);
                          field.onChange(numValue);
                        }}
                        value={field.value ? field.value.toString() : ""}
                        disabled={!selectedCustomerId}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md disabled:opacity-50">
                            <SelectValue placeholder={!selectedCustomerId ? "Selecione um cliente primeiro" : "Selecione um veículo"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!selectedCustomerId ? (
                            <SelectItem value="no-customer" disabled>Selecione um cliente primeiro</SelectItem>
                          ) : loadingVehicles ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : getCustomerVehicles(selectedCustomerId).length > 0 ? (
                            getCustomerVehicles(selectedCustomerId).map((vehicle: Vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                {vehicle.brand} {vehicle.model} - {vehicle.licensePlate}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="empty" disabled>Nenhum veículo encontrado para este cliente</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
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
                    <Select 
                      onValueChange={(value) => {
                        const numValue = parseInt(value);
                        field.onChange(numValue);
                      }}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                          <SelectValue placeholder="Selecione o técnico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingUsers ? (
                          <SelectItem value="loading" disabled>Carregando...</SelectItem>
                        ) : users && users.length > 0 ? (
                          users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName} ({user.username})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>Nenhum técnico encontrado</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-teal-600" />
                        Data Agendada
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date" 
                          value={field.value || ""}
                          className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md text-base"
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-teal-600" />
                        Horário
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="time" 
                          value={field.value || ""}
                          className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md text-base"
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
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-slate-700">Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        rows={3} 
                        placeholder="Observações sobre o serviço..." 
                        value={field.value || ""}
                        className="border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Services Section */}
              <div>
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-700">Serviços</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ServiceItems
                      onChange={(items) => {
                        setServiceExtras(items);
                      }}
                      initialItems={[]}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Service Summary */}
              {serviceExtras.length > 0 && (
                <Card className="border border-emerald-200 bg-emerald-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-emerald-800">Resumo do Serviço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-emerald-800 mb-1">Serviços Selecionados:</div>
                      {serviceExtras.map((extra, index) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <span className="text-emerald-700">{extra.serviceExtra?.name || extra.descricao}:</span>
                          <span className="font-medium text-emerald-700">
                            R$ {Number(extra.valor || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-emerald-400 mt-2 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-emerald-800">Valor Total:</span>
                          <span className="text-sm font-bold text-emerald-800">
                            R$ {calculateTotalValue()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={createMutation.isPending || serviceExtras.length === 0}
                >
                  {createMutation.isPending ? "Criando..." : "Criar Serviço"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>

      {/* Dialog de confirmação de alterações não salvas */}
      <UnsavedChangesDialog
        isOpen={unsavedChanges.showConfirmDialog}
        onConfirm={unsavedChanges.confirmNavigation}
        onCancel={unsavedChanges.cancelNavigation}
        message={unsavedChanges.message}
      />
    </Dialog>
  );
}