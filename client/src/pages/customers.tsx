import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Plus, Search, Edit, Trash2, User, Phone, Mail, FileText, MapPin, BarChart3, Car, Wrench, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Customer, type Photo } from "@shared/schema";
import { cn } from "@/lib/utils";
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ, applyCPFMask, applyCNPJMask, applyPhoneMask } from "@/lib/cpf-cnpj";
import CustomerAnalytics from "@/components/dashboard/customer-analytics";
import PhotoGallery from "@/components/photos/photo-gallery";
import { z } from "zod";
import { insertCustomerSchema } from "@shared/schema";
import PhotoUpload from "@/components/photos/photo-upload";
import CameraCapture from "@/components/camera/camera-capture";
import { useIsMobile } from "@/hooks/use-mobile";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

async function apiRequest(method: string, url: string, data?: any): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`API Response: ${method} ${url} - Status: ${res.status}`);

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`API Error: ${method} ${url} - ${res.status}: ${text}`);
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

const customerFormSchema = insertCustomerSchema.extend({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  document: z.string().optional().refine((doc) => {
    if (!doc || doc.trim() === '') return true;
    const cleanDoc = doc.replace(/\D/g, '');
    return cleanDoc.length === 11 ? validateCPF(cleanDoc) : validateCNPJ(cleanDoc);
  }, "CPF ou CNPJ inválido"),
}).transform((data) => ({
  ...data,
  document: data.document || "",
  email: data.email || null,
  phone: data.phone || null,
  address: data.address || null,
  observations: data.observations || null,
}));
type CustomerFormData = z.infer<typeof customerFormSchema>;

export default function CustomersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [selectedCustomerForPhotos, setSelectedCustomerForPhotos] = useState<Customer | null>(null);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [currentCustomerPhotos, setCurrentCustomerPhotos] = useState<any[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const [temporaryPhotos, setTemporaryPhotos] = useState<{photo: string, category: string}[]>([]);
  const [isVehicleWarningOpen, setIsVehicleWarningOpen] = useState(false);
  const [customerForVehicleWarning, setCustomerForVehicleWarning] = useState<Customer | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<CustomerFormData | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      code: "",
      name: "",
      email: "",
      phone: "",
      document: "",
      documentType: "cpf",
      address: "",
      observations: "",
    },
  });

  // Track form changes for unsaved changes detection
  const currentFormValues = form.watch();
  const hasUnsavedChanges = formInitialValues && isModalOpen && JSON.stringify(currentFormValues) !== JSON.stringify(formInitialValues);
  
  console.log('Customers - hasUnsavedChanges:', hasUnsavedChanges);
  console.log('Customers - formInitialValues:', formInitialValues);
  console.log('Customers - currentFormValues:', currentFormValues);
  console.log('Customers - temporaryPhotos:', temporaryPhotos.length);
  console.log('Customers - isModalOpen:', isModalOpen);

  const unsavedChanges = useUnsavedChanges({
    hasUnsavedChanges: !!hasUnsavedChanges || temporaryPhotos.length > 0,
    message: "Você tem alterações não salvas no cadastro do cliente. Deseja realmente sair?"
  });

  // Check URL parameters to auto-open modal for new customer creation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action === 'new' && !isModalOpen) {
      setEditingCustomer(null);
      setIsModalOpen(true);
      form.reset();
      // Clean URL after opening modal
      window.history.replaceState({}, '', '/customers');
    }
  }, [form, isModalOpen]);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customers");
      return await res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      console.log('Creating customer with data:', data);
      const res = await apiRequest("POST", "/api/customers", data);
      return await res.json();
    },
    onSuccess: async (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/customers"] });
      
      // Save temporary photos if any
      if (temporaryPhotos.length > 0) {
        let photosSaved = 0;
        for (const tempPhoto of temporaryPhotos) {
          try {
            const res = await fetch(`/api/customers/${newCustomer.id}/photos`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                photo: tempPhoto.photo, 
                category: 'other',
                description: tempPhoto.category === 'other' ? 'Cliente' : 'Documento'
              }),
              credentials: 'include',
            });

            if (res.ok) {
              photosSaved++;
              console.log('Temporary photo saved successfully');
            }
          } catch (error) {
            console.error('Error saving temporary photo:', error);
          }
        }
        console.log(`${photosSaved} of ${temporaryPhotos.length} temporary photos processed`);
        setTemporaryPhotos([]); // Clear temporary photos after saving
      }

      setIsModalOpen(false);
      setEditingCustomer(null);
      form.reset();
      setCurrentCustomerPhotos([]);
      toast({
        title: "Cliente criado",
        description: "Cliente foi criado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating customer:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar cliente",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CustomerFormData }) => {
      console.log('Updating customer with data:', data);
      const res = await apiRequest("PUT", `/api/customers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/customers"] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      form.reset();
      setCurrentCustomerPhotos([]);
      setTemporaryPhotos([]);
      toast({
        title: "Cliente atualizado",
        description: "Cliente foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Error updating customer:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar cliente",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/customers"] });
      toast({
        title: "Cliente removido",
        description: "Cliente foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateCustomerCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${timestamp}${random}`;
  };

  const onSubmit = (data: CustomerFormData) => {
    console.log('Form submitted with data:', data);

    try {
      // Auto-generate code for new customers if not provided
      if (!editingCustomer && !data.code) {
        data.code = generateCustomerCode();
      }

      if (editingCustomer) {
        updateMutation.mutate({ id: editingCustomer.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar formulário",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    const editValues = {
      code: customer.code,
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      document: customer.document || "",
      documentType: (customer.documentType as "cpf" | "cnpj") || "cpf",
      address: customer.address || "",
      observations: customer.observations || "",
    };
    setFormInitialValues(editValues);
    form.reset(editValues);
    setIsModalOpen(true);
    fetchCustomerPhotos(customer.id);
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "Excluir Cliente",
      description: "Tem certeza que deseja remover este cliente? Esta ação não pode ser desfeita.",
      onConfirm: () => {
        deleteMutation.mutate(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleViewPhotos = (customer: Customer) => {
    setSelectedCustomerForPhotos(customer);
    setIsPhotosModalOpen(true);
  };

  const fetchCustomerPhotos = async (customerId: number | undefined) => {
    if (!customerId) {
      setCurrentCustomerPhotos([]);
      return;
    }

    try {
      const res = await apiRequest("GET", `/api/customers/${customerId}/photos`);
      const photos = await res.json();
      setCurrentCustomerPhotos(photos);
    } catch (error) {
      console.error("Failed to fetch customer photos:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar fotos do cliente",
        variant: "destructive",
      });
      setCurrentCustomerPhotos([]);
    }
  };

  const handlePhotoTaken = async (photoData: any, category?: string) => {
    let photo: string;
    let photoCategory: string;
    let customerId: number | undefined;

    // Handle different input formats from CameraCapture
    if (typeof photoData === 'string') {
      photo = photoData;
      photoCategory = category || 'other';
      customerId = editingCustomer?.id;
    } else {
      // photoData is an object with customerId, category, etc.
      photo = photoData.photo || photoData;
      photoCategory = photoData.category || category || 'other';
      customerId = photoData.customerId || editingCustomer?.id;
    }

    // If no customer ID (new customer), store as temporary photo
    if (!customerId) {
      setTemporaryPhotos(prev => [...prev, { photo, category: photoCategory }]);
      toast({
        title: "Foto capturada!",
        description: "A foto será salva quando o cliente for cadastrado.",
      });
      setIsCameraOpen(false);
      return;
    }

    // If customer ID exists (editing existing customer), save immediately
    try {
      const res = await fetch(`/api/customers/${customerId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          photo, 
          category: 'other',
          description: photoCategory === 'other' ? 'Cliente' : 'Documento'
        }),
        credentials: 'include',
      });

      if (res.ok) {
        toast({
          title: "Foto salva!",
          description: "A foto foi salva com sucesso.",
        });
        fetchCustomerPhotos(customerId);
        // Refresh the main customers list in background
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
        }, 500);
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      toast({
        title: "Erro ao salvar foto",
        description: "Erro ao salvar a foto.",
        variant: "destructive",
      });
    }
    setIsCameraOpen(false);
  };

  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.document && customer.document.includes(searchTerm)) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Clientes"
          subtitle="Gerencie seus clientes e suas informações"
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/80 via-blue-50/50 to-indigo-50/30 backdrop-blur-sm">
          <div className="p-4 sm:p-6 md:p-8">
            <div className={cn(
              "flex justify-between items-center gap-2 mb-4",
              isMobile ? "flex-col space-y-3" : "flex-row gap-6 mb-8"
            )}>
              <div className={cn("flex items-center gap-2", isMobile ? "w-full justify-between" : "gap-4")}>
                <Button
                  variant="outline"
                  onClick={() => setIsAnalyticsModalOpen(true)}
                  className={cn(
                    "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                    isMobile ? "text-xs px-2 h-8" : ""
                  )}
                >
                  📊 {isMobile ? "Relatórios" : "Ver Relatórios"}
                </Button>
                <div className={cn(
                  "bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg shadow-md",
                  isMobile ? "px-2 py-1" : "px-4 py-2"
                )}>
                  <span className={cn("font-semibold", isMobile ? "text-sm" : "")}>{filteredCustomers.length}</span>
                  <span className={cn("ml-1", isMobile ? "text-xs" : "text-sm")}>clientes</span>
                </div>
              </div>

              <Dialog open={isModalOpen} onOpenChange={(open) => {
                if (!open && (hasUnsavedChanges || temporaryPhotos.length > 0)) {
                  unsavedChanges.triggerConfirmation(() => {
                    setIsModalOpen(false);
                    setFormInitialValues(null);
                    setCurrentCustomerPhotos([]);
                    setTemporaryPhotos([]);
                    setEditingCustomer(null);
                    form.reset();
                  });
                } else {
                  setIsModalOpen(open);
                  if (!open) {
                    setFormInitialValues(null);
                    setCurrentCustomerPhotos([]);
                    setTemporaryPhotos([]);
                    setEditingCustomer(null);
                    form.reset();
                  }
                }
              }}>
                <DialogTrigger asChild>
                  <div style={{ display: 'none' }}>
                    <Button 
                      onClick={() => {
                        setEditingCustomer(null);
                        const defaultValues = {
                          code: "",
                          name: "",
                          email: "",
                          phone: "",
                          document: "",
                          documentType: "cpf" as const,
                          address: "",
                          observations: "",
                        };
                        setFormInitialValues(defaultValues);
                        form.reset(defaultValues);
                        setCurrentCustomerPhotos([]);
                        setTemporaryPhotos([]);
                      }}
                    >
                      Novo Cliente
                    </Button>
                  </div>
                </DialogTrigger>
                <DialogContent className={cn(
                  "bg-gradient-to-br from-slate-50 to-blue-50/30",
                  isMobile ? "max-w-[95vw] max-h-[95vh] overflow-y-auto" : "max-w-2xl"
                )}>
                  <DialogHeader className={cn(isMobile ? "pb-3" : "pb-6")}>
                    <DialogTitle className={cn(
                      "bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent font-bold",
                      isMobile ? "text-lg" : "text-2xl"
                    )}>
                      {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                      console.log('Form validation errors:', errors);
                      toast({
                        title: "Erro de validação",
                        description: "Por favor, verifique os campos obrigatórios",
                        variant: "destructive",
                      });
                    })} className={cn(isMobile ? "space-y-4" : "space-y-6")}>
                      <div className={cn(
                        "grid gap-4",
                        isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 gap-6"
                      )}>
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className={cn(isMobile ? "space-y-1" : "space-y-2")}>
                              <FormLabel className={cn(
                                "font-semibold text-slate-700 flex items-center",
                                isMobile ? "text-xs" : "text-sm"
                              )}>
                                <User className={cn(isMobile ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2")} />
                                Nome <span className="text-red-500 ml-1">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Nome completo" 
                                  {...field} 
                                  required 
                                  className={cn(
                                    "border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
                                    isMobile ? "h-9 text-sm" : "h-11"
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className={cn(isMobile ? "space-y-1" : "space-y-2")}>
                              <FormLabel className={cn(
                                "font-semibold text-slate-700 flex items-center",
                                isMobile ? "text-xs" : "text-sm"
                              )}>
                                <Mail className={cn(isMobile ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2")} />
                                Email
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="email@exemplo.com" 
                                  type="email" 
                                  {...field}
                                  value={field.value || ""}
                                  className={cn(
                                    "border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
                                    isMobile ? "h-9 text-sm" : "h-11"
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem className={cn(isMobile ? "space-y-1" : "space-y-2")}>
                              <FormLabel className={cn(
                                "font-semibold text-slate-700 flex items-center",
                                isMobile ? "text-xs" : "text-sm"
                              )}>
                                <Phone className={cn(isMobile ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2")} />
                                Telefone <span className="text-red-500 ml-1">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="(11) 99999-9999" 
                                  {...field}
                                  required
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    field.onChange(applyPhoneMask(e.target.value));
                                  }}
                                  className={cn(
                                    "border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
                                    isMobile ? "h-9 text-sm" : "h-11"
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="documentType"
                          render={({ field }) => (
                            <FormItem className={cn(isMobile ? "space-y-1" : "space-y-2")}>
                              <FormLabel className={cn(
                                "font-semibold text-slate-700",
                                isMobile ? "text-xs" : "text-sm"
                              )}>Tipo de Documento</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value as string || "cpf"}>
                                <FormControl>
                                  <SelectTrigger className={cn(
                                    "border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
                                    isMobile ? "h-9 text-sm" : "h-11"
                                  )}>
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cpf">CPF</SelectItem>
                                  <SelectItem value="cnpj">CNPJ</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="document"
                          render={({ field }) => (
                            <FormItem className={cn(isMobile ? "space-y-1" : "space-y-2")}>
                              <FormLabel className={cn(
                                "font-semibold text-slate-700",
                                isMobile ? "text-xs" : "text-sm"
                              )}>Documento</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={form.watch("documentType") === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const documentType = form.watch("documentType");
                                    if (documentType === "cpf") {
                                      field.onChange(applyCPFMask(value));
                                    } else {
                                      field.onChange(applyCNPJMask(value));
                                    }
                                  }}
                                  className={cn(
                                    "border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
                                    isMobile ? "h-9 text-sm" : "h-11"
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className={cn(
                              isMobile ? "space-y-1" : "col-span-2 space-y-2"
                            )}>
                              <FormLabel className={cn(
                                "font-semibold text-slate-700",
                                isMobile ? "text-xs" : "text-sm"
                              )}>Endereço</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Endereço completo" 
                                  {...field} 
                                  value={field.value || ""}
                                  className={cn(
                                    "border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
                                    isMobile ? "h-9 text-sm" : "h-11"
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="observations"
                          render={({ field }) => (
                            <FormItem className={cn(
                              isMobile ? "space-y-1" : "col-span-2 space-y-2"
                            )}>
                              <FormLabel className={cn(
                                "font-semibold text-slate-700",
                                isMobile ? "text-xs" : "text-sm"
                              )}>Observações</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Observações adicionais sobre o cliente..." 
                                  {...field} 
                                  value={field.value || ""}
                                  className={cn(
                                    "border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md resize-none",
                                    isMobile ? "min-h-[60px] text-sm" : "min-h-[80px]"
                                  )}
                                  rows={isMobile ? 2 : 3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Photos Section - Responsive */}
                      <div className={cn(
                        "border-t pt-4",
                        isMobile ? "col-span-1" : "col-span-2"
                      )}>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className={cn(
                              "font-medium text-gray-700",
                              isMobile ? "text-xs" : "text-sm"
                            )}>Fotos</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCameraOpen(true)}
                                className={cn(
                                  "flex items-center gap-2",
                                  isMobile ? "h-8 px-3 text-xs" : ""
                                )}
                              >
                                <Camera className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
                                {isMobile ? "Foto" : "Tirar Foto"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('customer-photo-upload')?.click()}
                                className={cn(
                                  "flex items-center gap-2",
                                  isMobile ? "h-8 px-3 text-xs" : ""
                                )}
                              >
                                <svg className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {isMobile ? "+ Fotos" : "+ Adicionar Fotos"}
                              </Button>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                id="customer-photo-upload"
                                onChange={async (e) => {
                                  const files = e.target.files;
                                  if (!files) return;

                                  for (const file of Array.from(files)) {
                                    if (!file.type.startsWith('image/')) continue;
                                    
                                    // Convert to base64 for preview
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      const photoData = event.target?.result as string;
                                      handlePhotoTaken(photoData, 'customer');
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                  
                                  // Clear the input
                                  e.target.value = '';
                                }}
                              />
                            </div>
                          </div>
                          <PhotoUpload
                            photos={currentCustomerPhotos}
                            onPhotoUploaded={() => fetchCustomerPhotos(editingCustomer?.id)}
                            customerId={editingCustomer?.id}
                            maxPhotos={7}
                          />

                          {/* Mostrar fotos temporárias para novos clientes */}
                          {!editingCustomer && temporaryPhotos.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <h5 className={cn(
                                "font-medium text-gray-600",
                                isMobile ? "text-xs" : "text-sm"
                              )}>Fotos capturadas (serão salvas após cadastrar o cliente):</h5>
                              <div className={cn(
                                "grid gap-2",
                                isMobile ? "grid-cols-2" : "grid-cols-3"
                              )}>
                                {temporaryPhotos.map((tempPhoto, index) => (
                                  <div key={index} className="relative group">
                                    <img 
                                      src={tempPhoto.photo} 
                                      alt={`Foto temporária ${index + 1}`}
                                      className={cn(
                                        "w-full object-cover rounded-lg border border-gray-200",
                                        isMobile ? "h-16" : "h-20"
                                      )}
                                    />
                                    <div className="absolute bottom-1 left-1 right-1">
                                      <span className={cn(
                                        "bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-center block",
                                        isMobile ? "text-xs" : "text-xs"
                                      )}>
                                        {tempPhoto.category === 'other' ? 'Cliente' : 'Documento'}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTemporaryPhotos(prev => prev.filter((_, i) => i !== index));
                                        toast({
                                          title: "Foto removida",
                                          description: "A foto temporária foi removida.",
                                        });
                                      }}
                                      className={cn(
                                        "absolute bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity",
                                        isMobile ? "-top-1 -right-1 w-5 h-5" : "-top-2 -right-2 w-6 h-6"
                                      )}
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

                      <div className={cn(
                        "flex gap-2 border-t border-slate-200",
                        isMobile ? "flex-col pt-3 mt-3" : "justify-end gap-4 pt-6 mt-6"
                      )}>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsModalOpen(false);
                              setCurrentCustomerPhotos([]);
                              setTemporaryPhotos([]);
                              setEditingCustomer(null);
                              form.reset();
                            }}
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className={cn(
                              "border-2 border-slate-300 hover:border-slate-400 rounded-lg font-semibold transition-all duration-200",
                              isMobile ? "h-9 text-sm" : "h-11 px-6"
                            )}
                          >
                            Cancelar
                          </Button>
                        <Button 
                          type="submit" 
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className={cn(
                            "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl rounded-lg font-semibold transition-all duration-200",
                            isMobile ? "h-9 text-sm" : "h-11 px-6"
                          )}
                        >
                          {createMutation.isPending || updateMutation.isPending 
                            ? "Processando..." 
                            : (editingCustomer ? "Atualizar Cliente" : "Criar Cliente")
                          }
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-gradient-to-br from-teal-100 to-emerald-100 p-6 rounded-full mb-6 w-24 h-24 flex items-center justify-center">
                  <User className="h-12 w-12 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Nenhum cliente encontrado
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece adicionando seu primeiro cliente.'}
                </p>
                {!searchTerm && (
                  <Button
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => {
                      setEditingCustomer(null);
                      form.reset();
                      setIsModalOpen(true);
                      setCurrentCustomerPhotos([]);
                      setTemporaryPhotos([]);
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Primeiro Cliente
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCustomers.map((customer: Customer) => (
                  <div key={customer.id} className={cn(
                      "group relative bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-teal-200 overflow-hidden",
                      isMobile ? "rounded-lg" : "rounded-2xl"
                    )}>
                      {/* Background gradient sutil */}
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/30 to-emerald-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Header colorido */}
                      <div className={cn(
                        "relative bg-gradient-to-r from-teal-500 to-emerald-600 flex items-center justify-between",
                        isMobile ? "h-16 p-3" : "h-20 p-4"
                      )}>
                        <div className={cn("flex items-center", isMobile ? "space-x-2" : "space-x-3")}>
                          <div className={cn(
                            "bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold border border-white/30",
                            isMobile ? "w-10 h-10 text-sm" : "w-12 h-12 text-lg"
                          )}>
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className={cn(
                              "text-white font-semibold truncate",
                              isMobile ? "max-w-24 text-sm" : "max-w-32"
                            )}>
                              {customer.name}
                            </h3>

                          </div>
                        </div>

                        {/* Actions no header */}
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(customer)}
                            className="h-8 w-8 p-0 text-white hover:bg-white/20 border-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(customer.id)}
                            className="h-8 w-8 p-0 text-white hover:bg-red-500/20 border-0"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <div className={cn("relative", isMobile ? "p-3" : "p-5")}>
                        {/* Tipo de documento */}
                        <div className={cn(isMobile ? "mb-2" : "mb-4")}>
                          <span className={cn(
                            "inline-flex items-center rounded-full font-medium bg-emerald-100 text-emerald-800",
                            isMobile ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs"
                          )}>
                            {customer.documentType?.toUpperCase()}
                          </span>
                        </div>

                        {/* Informações essenciais */}
                        <div className={cn("space-y-2", isMobile ? "mb-3" : "space-y-3 mb-6")}>
                          <div className="flex items-center text-sm">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                              <User className="h-3 w-3 text-gray-500" />
                            </div>
                            <span className="text-gray-900 text-xs font-mono">
                              {customer.document ? (customer.documentType === 'cpf' ? formatCPF(customer.document) : formatCNPJ(customer.document)) : 'N/A'}
                            </span>
                          </div>

                          {customer.email && (
                            <div className="flex items-center text-sm">
                              <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                                <span className="text-gray-500 text-xs">@</span>
                              </div>
                              <span className="text-gray-700 text-xs truncate" title={customer.email}>
                                {customer.email}
                              </span>
                            </div>
                          )}

                          {customer.phone && (
                            <div className="flex items-center text-sm">
                              <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                                <span className="text-gray-500 text-xs">📱</span>
                              </div>
                              <span className="text-gray-700 text-xs font-mono">
                                {customer.phone}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className={cn(isMobile ? "space-y-2" : "space-y-2")}>
                          <Button
                            onClick={() => {
                              // Navegação instantânea com informação contextual
                              // A página de veículos já tem toda a lógica necessária para lidar com ambos cenários
                              setLocation(`/vehicles?customerId=${customer.id}`);
                              
                              // Opcional: Fazer pré-cache em background para melhorar UX futura
                              setTimeout(() => {
                                fetch(`/api/vehicles?customerId=${customer.id}`, {
                                  credentials: 'include',
                                }).catch(() => {
                                  // Ignorar erros de pré-cache - não afeta a funcionalidade
                                });
                              }, 100);
                            }}
                            className={cn(
                              "w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm rounded-xl",
                              isMobile ? "h-8 text-xs" : "h-10"
                            )}
                            size="sm"
                          >
                            <Car className={cn(isMobile ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2")} />
                            Veículos
                          </Button>

                          <div className={cn("grid gap-1", isMobile ? "grid-cols-3 gap-1" : "grid-cols-3 gap-2")}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  // Verificar se o cliente tem veículos cadastrados
                                  const res = await fetch("/api/customers/" + customer.id + "/vehicles", {
                                    credentials: 'include',
                                  });

                                  if (!res.ok) {
                                    throw new Error('Erro ao verificar veículos do cliente');
                                  }

                                  const customerVehicles = await res.json();

                                  // Se o cliente não tem veículos cadastrados
                                  if (!customerVehicles || customerVehicles.length === 0) {
                                    setCustomerForVehicleWarning(customer);
                                    setIsVehicleWarningOpen(true);
                                    return;
                                  }

                                  // Cliente tem veículos, pode navegar para serviços
                                  setLocation("/services?customerId=" + customer.id);

                                } catch (error) {
                                  console.error('Erro ao verificar veículos:', error);
                                  toast({
                                    title: "Erro",
                                    description: "Erro ao verificar veículos do cliente. Tente novamente.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className={cn(
                                "border-green-200 text-green-700 hover:bg-green-50 rounded-xl",
                                isMobile ? "h-7 px-1" : "h-9"
                              )}
                            >
                              <Wrench className={cn(isMobile ? "h-2.5 w-2.5" : "h-3 w-3 mr-1")} />
                              {!isMobile && <span className="text-xs">Serviços</span>}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                                                            onClick={() => handleViewPhotos(customer)}
                              className={cn(
                                "border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl",
                                isMobile ? "h-7 px-1" : "h-9"
                              )}
                            >
                              <Camera className={cn(isMobile ? "h-2.5 w-2.5" : "h-3 w-3 mr-1")} />
                              {!isMobile && <span className="text-xs">Fotos</span>}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(customer)}
                              className={cn(
                                "border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl",
                                isMobile ? "h-7 px-1" : "h-9"
                              )}
                            >
                              <Edit className={cn(isMobile ? "h-2.5 w-2.5" : "h-3 w-3 mr-1")} />
                              {!isMobile && <span className="text-xs">Editar</span>}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            )}

            {/* Search Modal */}
            <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/30 border-0 shadow-2xl">
                <DialogHeader className="pb-4 border-b border-gray-100/50">
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent flex items-center">
                    <Search className="h-6 w-6 mr-3 text-teal-600" />
                    Pesquisar Clientes
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Digite o nome, documento, email ou código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 border-2 border-gray-200 focus:border-teal-400 rounded-xl shadow-sm bg-white transition-all duration-200"
                      autoFocus
                    />
                  </div>
                  
                  {searchTerm && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                      <div className="text-sm text-gray-600 mb-4 flex items-center justify-between">
                        <span>{filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} encontrado{filteredCustomers.length !== 1 ? 's' : ''}</span>
                        {filteredCustomers.length > 0 && (
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
                      
                      {filteredCustomers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                          {filteredCustomers.map((customer) => (
                            <Card 
                              key={customer.id}
                              className="bg-gradient-to-r from-white to-blue-50/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                      {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-gray-900 text-sm group-hover:text-teal-700 transition-colors">
                                        {customer.name}
                                      </h3>
                                      <p className="text-xs text-gray-500">
                                        Código: {customer.code}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                                    {customer.documentType?.toUpperCase()}
                                  </Badge>
                                </div>

                                <div className="space-y-2 mb-4">
                                  {customer.document && (
                                    <div className="flex items-center text-xs text-gray-600">
                                      <User className="h-3 w-3 mr-2 text-teal-500" />
                                      <span className="font-mono">{customer.documentType === 'cpf' ? formatCPF(customer.document) : formatCNPJ(customer.document)}</span>
                                    </div>
                                  )}
                                  {customer.phone && (
                                    <div className="flex items-center text-xs text-gray-600">
                                      <Phone className="h-3 w-3 mr-2 text-teal-500" />
                                      <span className="font-mono">{customer.phone}</span>
                                    </div>
                                  )}
                                  {customer.email && (
                                    <div className="flex items-center text-xs text-gray-600">
                                      <Mail className="h-3 w-3 mr-2 text-teal-500" />
                                      <span className="truncate">{customer.email}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIsSearchModalOpen(false);
                                      setLocation(`/vehicles?customerId=${customer.id}`);
                                    }}
                                    className="text-xs border-teal-200 text-teal-700 hover:bg-teal-50"
                                  >
                                    <Car className="h-3 w-3 mr-1" />
                                    Veículos
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch("/api/customers/" + customer.id + "/vehicles", {
                                          credentials: 'include',
                                        });
                                        if (res.ok) {
                                          const customerVehicles = await res.json();
                                          if (customerVehicles && customerVehicles.length > 0) {
                                            setIsSearchModalOpen(false);
                                            setLocation("/services?customerId=" + customer.id);
                                          } else {
                                            setCustomerForVehicleWarning(customer);
                                            setIsVehicleWarningOpen(true);
                                            setIsSearchModalOpen(false);
                                          }
                                        }
                                      } catch (error) {
                                        toast({
                                          title: "Erro",
                                          description: "Erro ao verificar veículos do cliente.",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                                  >
                                    <Wrench className="h-3 w-3 mr-1" />
                                    Serviços
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIsSearchModalOpen(false);
                                      handleEdit(customer);
                                    }}
                                    className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIsSearchModalOpen(false);
                                      handleViewPhotos(customer);
                                    }}
                                    className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                                  >
                                    <Camera className="h-3 w-3 mr-1" />
                                    Fotos
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500 mb-4">Nenhum cliente encontrado</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setIsSearchModalOpen(false);
                              setEditingCustomer(null);
                              const defaultValues = {
                                code: "",
                                name: searchTerm, // Pre-fill with search term
                                email: "",
                                phone: "",
                                document: "",
                                documentType: "cpf" as const,
                                address: "",
                                observations: "",
                              };
                              setFormInitialValues(defaultValues);
                              form.reset(defaultValues);
                              setCurrentCustomerPhotos([]);
                              setTemporaryPhotos([]);
                              setIsModalOpen(true);
                            }}
                            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Criar cliente "{searchTerm}"
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setIsSearchModalOpen(false);
                      }}
                      className="flex-1"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Analytics Modal */}
            <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Relatório de Clientes
                  </DialogTitle>
                </DialogHeader>
                <CustomerAnalytics />
              </DialogContent>
            </Dialog>

            {/* Photos Modal */}
            <Dialog open={isPhotosModalOpen} onOpenChange={setIsPhotosModalOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Camera className="h-5 w-5 mr-2" />
                    Fotos - {selectedCustomerForPhotos?.name}
                  </DialogTitle>
                </DialogHeader>
                {selectedCustomerForPhotos && (
                  <PhotoGallery 
                    customerId={selectedCustomerForPhotos.id}
                    title="Fotos do Cliente"
                    showAddButton={true}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Camera Capture Modal */}
            <CameraCapture
              isOpen={isCameraOpen}
              onClose={() => setIsCameraOpen(false)}
              onPhotoTaken={handlePhotoTaken}
              customerId={editingCustomer?.id}
            />

            {/* Vehicle Warning Modal */}
            <Dialog open={isVehicleWarningOpen} onOpenChange={setIsVehicleWarningOpen}>
              <DialogContent className="max-w-md bg-gradient-to-br from-teal-50/50 to-emerald-50/30 border-2 border-teal-200/50">
                <DialogHeader>
                  <DialogTitle className="flex items-center text-teal-800 font-bold text-lg">
                    <Car className="h-6 w-6 mr-3 text-teal-600" />
                    Veículos Necessários
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-2">
                  <div className="text-center">
                    <div className="bg-gradient-to-br from-teal-100 to-emerald-100 p-6 rounded-full mb-4 w-20 h-20 flex items-center justify-center mx-auto border-2 border-teal-200 shadow-lg">
                      <Car className="h-10 w-10 text-teal-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">
                      {customerForVehicleWarning?.name} não possui veículos cadastrados
                    </h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-orange-800 text-sm font-medium">
                        ⚠️ Não é possível criar serviços sem um veículo cadastrado
                      </p>
                    </div>
                    <p className="text-gray-700 font-medium">
                      Deseja cadastrar o primeiro veículo para este cliente?
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsVehicleWarningOpen(false);
                        setCustomerForVehicleWarning(null);
                      }}
                      className="flex-1 border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-all duration-200"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (customerForVehicleWarning) {
                          setLocation("/vehicles?customerId=" + customerForVehicleWarning.id + "&openModal=true");
                        }
                        setIsVehicleWarningOpen(false);
                        setCustomerForVehicleWarning(null);
                      }}
                      className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Car className="h-4 w-4 mr-2" />
                      Cadastrar Veículo
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>

        {/* Floating Action Buttons */}
        <Button
          className="fixed bottom-24 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 z-50 transform hover:scale-110"
          size="sm"
          onClick={() => setIsSearchModalOpen(true)}
          aria-label="Pesquisar clientes"
        >
          <Search className="h-7 w-7" />
        </Button>

        <Button
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 z-50 transform hover:scale-110"
          size="sm"
          onClick={() => {
            setEditingCustomer(null);
            const defaultValues = {
              code: "",
              name: "",
              email: "",
              phone: "",
              document: "",
              documentType: "cpf" as const,
              address: "",
              observations: "",
            };
            setFormInitialValues(defaultValues);
            form.reset(defaultValues);
            setCurrentCustomerPhotos([]);
            setTemporaryPhotos([]);
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-8 w-8" />
        </Button>
        
        {/* Dialog de confirmação de alterações não salvas */}
        <UnsavedChangesDialog
          isOpen={unsavedChanges.showConfirmDialog}
          onConfirm={unsavedChanges.confirmNavigation}
          onCancel={unsavedChanges.cancelNavigation}
          message={unsavedChanges.message}
        />

        {/* Dialog de confirmação para exclusões */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="destructive"
        />
      </div>
    </div>
  );
}