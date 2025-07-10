import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Car, User, Wrench, FileText, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type Vehicle, type Customer, type Photo } from "@shared/schema";
import { z } from "zod";
import { fuelTypes } from "@/lib/vehicle-data";
import { cn } from "@/lib/utils";
import VehicleAnalytics from "@/components/dashboard/vehicle-analytics";
import { BarChart3 } from "lucide-react";
import PhotoUpload from "@/components/photos/photo-upload";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

async function apiRequest(method: string, url: string, data?: any): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

const vehicleFormSchema = insertVehicleSchema;
type VehicleFormData = z.infer<typeof vehicleFormSchema>;

// Image compression utility
const compressImage = (file: File | string, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const newWidth = img.width * ratio;
      const newHeight = img.height * ratio;

      // Set canvas dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, newWidth, newHeight);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    if (typeof file === 'string') {
      img.src = file;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  });
};

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken: (photo: string, category: string, vehicleId?: number) => void;
  vehicleId?: number;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ isOpen, onClose, onPhotoTaken, vehicleId }) => {
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("vehicle");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const categoryOptions = [
    { value: "vehicle", label: "Veículo" },
    { value: "damage", label: "Dano" },
    { value: "before", label: "Antes" },
    { value: "after", label: "Depois" },
    { value: "other", label: "Outro" }
  ];

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
          };
        }
      } catch (error) {
        console.error("Erro ao acessar a câmera:", error);
        onClose();
      }
    };

    if (isOpen) {
      startCamera();
    } else {
      // Stop the camera stream when the modal is closed
      if (videoRef.current?.srcObject) {
        const mediaStream = videoRef.current.srcObject as MediaStream;
        mediaStream.getTracks().forEach(track => track.stop());
      }
      setIsCameraReady(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, onClose]);

  const takePhoto = async () => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      const dataUrl = canvas.toDataURL('image/png');

      // Comprimir a imagem antes de armazenar
      const compressedPhoto = await compressImage(dataUrl, 800, 0.8);
      setPhoto(compressedPhoto);
      setHasPhoto(true);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setHasPhoto(false);
  };

  const savePhoto = () => {
    if (photo) {
      onPhotoTaken(photo, selectedCategory, vehicleId);
      onClose();
      setPhoto(null);
      setHasPhoto(false);
      setSelectedCategory("vehicle"); // Reset to default
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Capturar Foto</DialogTitle>
        </DialogHeader>

        {/* Category Selection - Always visible at the top */}
        <div className="mb-4 space-y-2">
          <label className="text-sm font-medium text-gray-700">Categoria da Foto:</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hasPhoto ? (
          <>
            <video ref={videoRef} autoPlay className="w-full aspect-video rounded-md" style={{ display: isCameraReady ? 'block' : 'none' }} />
            {!isCameraReady && <p>Aguardando a câmera...</p>}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="flex justify-around mt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={takePhoto} disabled={!isCameraReady}>
                Tirar Foto
              </Button>
            </div>
          </>
        ) : (
          <>
            {photo && <img src={photo} alt="Captured" className="w-full rounded-md" />}

            <div className="flex justify-around mt-4">
              <Button type="button" variant="secondary" onClick={retakePhoto}>
                Retirar
              </Button>
              <Button type="button" onClick={savePhoto}>
                Salvar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default function VehiclesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [currentVehiclePhotos, setCurrentVehiclePhotos] = useState<Photo[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [temporaryPhotos, setTemporaryPhotos] = useState<{photo: string, category: string}[]>([]);
  const [isServiceWarningOpen, setIsServiceWarningOpen] = useState(false);
  const [vehicleForServiceWarning, setVehicleForServiceWarning] = useState<Vehicle | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<VehicleFormData | null>(null);
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

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      customerId: 0,
      licensePlate: "",
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      chassis: "",
      engine: "",
      fuelType: "gasoline",
      notes: "",
    },
  });

  // Track form changes for unsaved changes detection
  const currentFormValues = form.watch();
  const hasUnsavedChanges = formInitialValues && isModalOpen && JSON.stringify(currentFormValues) !== JSON.stringify(formInitialValues);

  const unsavedChanges = useUnsavedChanges({
    hasUnsavedChanges: !!hasUnsavedChanges || temporaryPhotos.length > 0,
    message: "Você tem alterações não salvas no cadastro do veículo. Deseja realmente sair?"
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/vehicles");
      return await res.json();
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customers");
      return await res.json();
    },
  });

  // Check URL parameters for customer filtering and auto-open modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('customerId');
    const openModal = urlParams.get('openModal');
    const action = urlParams.get('action');

    if (customerId) {
      setCustomerFilter(parseInt(customerId));

      // Auto-open modal if requested (from vehicle validation)
      if (openModal === 'true') {
        const timer = setTimeout(() => {
          setEditingVehicle(null);
          form.reset({
            customerId: parseInt(customerId),
            licensePlate: "",
            brand: "",
            model: "",
            year: new Date().getFullYear(),
            color: "",
            chassis: "",
            engine: "",
            fuelType: "gasoline",
            notes: "",
          });
          setTemporaryPhotos([]);
          setCurrentVehiclePhotos([]);
          setIsModalOpen(true);
        }, 500);

        return () => clearTimeout(timer);
      }
    } else {
      // Clear customer filter if no customerId in URL
      setCustomerFilter(null);
    }

    // Auto-open modal for new vehicle creation
    if (action === 'new' && !isModalOpen) {
      setEditingVehicle(null);
      setIsModalOpen(true);
      form.reset();
      setTemporaryPhotos([]);
      setCurrentVehiclePhotos([]);
      // Clean URL after opening modal
      window.history.replaceState({}, '', '/vehicles');
    }
  }, [customers, form, isModalOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      const response = await apiRequest("POST", "/api/vehicles", data);
      return response.json();
    },
    onSuccess: async (newVehicle) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });

      // Save temporary photos if any
      if (temporaryPhotos.length > 0) {
        let photosSaved = 0;
        for (const tempPhoto of temporaryPhotos) {
          try {
            const res = await fetch(`/api/vehicles/${newVehicle.id}/photos`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                photo: tempPhoto.photo, 
                category: tempPhoto.category,
                description: tempPhoto.category === 'vehicle' ? 'Veículo' : 
                            tempPhoto.category === 'damage' ? 'Dano' :
                            tempPhoto.category === 'before' ? 'Antes' :
                            tempPhoto.category === 'after' ? 'Depois' : 'Outro'
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

      toast({
        title: "Veículo cadastrado!",
        description: "O veículo foi cadastrado com sucesso.",
      });
      setIsModalOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cadastrar veículo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: VehicleFormData }) => {
      const response = await apiRequest("PUT", `/api/vehicles/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Veículo atualizado!",
        description: "O veículo foi atualizado com sucesso.",
      });
      // Only close modal on actual form submission, not photo operations
      setIsModalOpen(false);
      setEditingVehicle(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar veículo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Veículo removido!",
        description: "O veículo foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover veículo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fetchVehiclePhotos = async (vehicleId?: number) => {
    if (!vehicleId) return;
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/photos`, {
        credentials: 'include',
      });
      if (response.ok) {
        const photos = await response.json();
        setCurrentVehiclePhotos(photos);
      }
    } catch (error) {
      console.error('Error fetching vehicle photos:', error);
    }
  };

  const filteredVehicles = vehicles.filter((vehicle: Vehicle) => {
    const searchTerm_lower = searchTerm.toLowerCase();
    const matchesSearch = 
      vehicle.brand.toLowerCase().includes(searchTerm_lower) ||
      vehicle.model.toLowerCase().includes(searchTerm_lower) ||
      vehicle.licensePlate.toLowerCase().includes(searchTerm_lower) ||
      (vehicle.color || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCustomer = customerFilter ? vehicle.customerId === customerFilter : true;

    return matchesSearch && matchesCustomer;
  });

  const handlePhotoTaken = async (photo: string, category: string, vehicleId?: number) => {
    // Se não há ID do veículo (novo veículo), armazenar como foto temporária
    if (!vehicleId) {
      setTemporaryPhotos(prev => [...prev, { photo, category }]);
      toast({
        title: "Foto capturada!",
        description: "A foto será salva quando o veículo for cadastrado.",
      });
      return;
    }

    // Se há ID do veículo (editando veículo existente), salvar imediatamente
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          photo, 
          category,
          description: category === 'vehicle' ? 'Veículo' : 
                      category === 'damage' ? 'Dano' :
                      category === 'before' ? 'Antes' :
                      category === 'after' ? 'Depois' : 'Outro'
        }),
        credentials: 'include',
      });

      if (res.ok) {
        toast({
          title: "Foto salva!",
          description: "A foto foi salva com sucesso.",
        });
        fetchVehiclePhotos(vehicleId);
        // Refresh the main vehicles list in background to update photo counts
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
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
  };

  const onSubmit = (data: VehicleFormData) => {
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    const editValues = {
      ...vehicle,
      customerId: vehicle.customerId,
    };
    setFormInitialValues(editValues);
    form.reset(editValues);
    fetchVehiclePhotos(vehicle.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "Excluir Veículo",
      description: "Tem certeza que deseja remover este veículo? Esta ação não pode ser desfeita.",
      onConfirm: () => {
        deleteMutation.mutate(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className={cn("flex bg-gradient-to-br from-slate-100 via-white to-blue-50/30", isMobile ? "h-screen flex-col" : "h-screen")}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Veículos"
          subtitle={isMobile ? "Veículos" : "Gerencie a frota de veículos"}
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/80 via-blue-50/50 to-indigo-50/30 backdrop-blur-sm">
          <div className={cn(isMobile ? "p-2" : "p-8")}>
            <div className={cn(
              "flex justify-between items-center gap-2 mb-4",
              isMobile ? "flex-col space-y-3" : "flex-row gap-6 mb-8"
            )}>
              <div className={cn("flex items-center", isMobile ? "gap-2 w-full justify-between" : "gap-3")}>
                {!isMobile && (
                  <Button
                    onClick={() => setIsAnalyticsModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="bg-white/90 backdrop-blur-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-sm rounded-xl transition-all duration-200"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Relatórios
                  </Button>
                )}

                {/* Only show + Novo button if not showing customer-specific no vehicles message */}
                {!(filteredVehicles.length === 0 && customerFilter && !searchTerm) && (
                  <Dialog open={isModalOpen} onOpenChange={(open) => {
                    if (!open && (hasUnsavedChanges || temporaryPhotos.length > 0)) {
                      unsavedChanges.triggerConfirmation(() => {
                        setIsModalOpen(false);
                        setFormInitialValues(null);
                        setCurrentVehiclePhotos([]);
                        setTemporaryPhotos([]);
                        setEditingVehicle(null);
                        form.reset();

                        // Clear URL parameters to prevent reopening
                        const urlParams = new URLSearchParams(window.location.search);
                        if (urlParams.get('openModal')) {
                          const newUrl = new URL(window.location.href);
                          newUrl.searchParams.delete('openModal');
                          window.history.replaceState({}, '', newUrl.toString());
                        }
                      });
                    } else {
                      setIsModalOpen(open);
                      if (!open) {
                        setFormInitialValues(null);
                        setCurrentVehiclePhotos([]);
                        setTemporaryPhotos([]);
                        setEditingVehicle(null);
                        form.reset();

                        // Clear URL parameters to prevent reopening
                        const urlParams = new URLSearchParams(window.location.search);
                        if (urlParams.get('openModal')) {
                          const newUrl = new URL(window.location.href);
                          newUrl.searchParams.delete('openModal');
                          window.history.replaceState({}, '', newUrl.toString());
                        }
                      }
                    }
                  }}>
                    <DialogTrigger asChild>
                      <div style={{ display: 'none' }}>
                        <Button 
                          onClick={() => {
                            setEditingVehicle(null);
                            const defaultValues = {
                              customerId: customerFilter || 0,
                              licensePlate: "",
                              brand: "",
                              model: "",
                              year: new Date().getFullYear(),
                              color: "",
                              chassis: "",
                              engine: "",
                              fuelType: "gasoline",
                              notes: "",
                            };
                            form.reset(defaultValues);
                            setFormInitialValues(defaultValues);
                            setTemporaryPhotos([]);
                            setCurrentVehiclePhotos([]);
                          }}
                        >
                          Novo Veículo
                        </Button>
                      </div>
                    </DialogTrigger>
                  <DialogContent className={cn(
                    "bg-gradient-to-br from-slate-50 to-blue-50/30",
                    isMobile ? "max-w-[95vw] max-h-[90vh] overflow-y-auto" : "max-w-2xl"
                  )}>
                    <DialogHeader className="pb-6">
                      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                        {editingVehicle ? "Editar Veículo" : "Novo Veículo"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 bg-white/80 border-slate-200 rounded-lg">
                                      <SelectValue placeholder="Selecione o cliente" />
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
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                        control={form.control}
                        name="licensePlate"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                              <Car className="h-4 w-4 mr-2 text-teal-600" />
                              Placa
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="ABC-1234" 
                                className="h-11 bg-white/80 border-slate-200 rounded-lg uppercase"
                                maxLength={8}
                                {...field}
                                onChange={(e) => {
                                  let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                  if (value.length > 3) {
                                    value = value.slice(0, 3) + '-' + value.slice(3, 7);
                                  }
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-slate-700">Marca</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Digite a marca do veículo" 
                                className="h-11 bg-white/80 border-slate-200 rounded-lg"
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                          <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-slate-700">Modelo</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Digite o modelo do veículo" 
                                className="h-11 bg-white/80 border-slate-200 rounded-lg"
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="year"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-sm font-semibold text-slate-700">Ano</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="2024" 
                                    className="h-11 bg-white/80 border-slate-200 rounded-lg"{...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-sm font-semibold text-slate-700">Cor</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Preto" 
                                    className="h-11 bg-white/80 border-slate-200 rounded-lg"
                                    {...field} 
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="fuelType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Combustível</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o combustível" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {fuelTypes.map((fuel) => (
                                    <SelectItem key={fuel.value} value={fuel.value}>
                                      {fuel.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Photos Section */}
                        <div className="col-span-2 border-t pt-4">

<div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-700">Fotos</h4>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsCameraOpen(true);
                                  }}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <Camera className="h-4 w-4" />
                                  {isMobile ? "Foto" : "Câmera"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Trigger file upload
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.multiple = true;
                                    input.onchange = async (event) => {
                                      const files = (event.target as HTMLInputElement).files;
                                      if (files) {
                                        for (const file of Array.from(files)) {
                                          const reader = new FileReader();
                                          reader.onload = (e) => {
                                            const photo = e.target?.result as string;
                                            // Use vehicleId if editing, undefined if creating new
                                            handlePhotoTaken(photo, 'vehicle', editingVehicle?.id);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <Plus className="h-4 w-4" />
                                  +
                                </Button>
                              </div>
                            </div>

                            {/* Exibir fotos existentes do veículo em edição*/}
                            {editingVehicle && currentVehiclePhotos.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <h5 className="text-sm font-medium text-gray-600">Fotos do veículo:</h5>
                                <div className="grid grid-cols-3 gap-2">
                                  {currentVehiclePhotos.map((photo) => (
                                    <div key={photo.id} className="relative group">
                                      <img 
                                        src={photo.url} 
                                        alt={photo.description || 'Foto do veículo'}
                                        className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                      />
                                      <div className="absolute bottom-1 left-1 right-1">
                                        <span className="text-xs bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-center block">
                                          {photo.category === 'vehicle' ? 'Veículo' : 
                                           photo.category === 'damage' ? 'Dano' :
                                           photo.category === 'before' ? 'Antes' :
                                           photo.category === 'after' ? 'Depois' : 'Outro'}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!confirm('Tem certeza que deseja remover esta foto?')) return;

                                          try {
                                            const res = await fetch(`/api/photos/${photo.id}`, {
                                              method: 'DELETE',
                                              credentials: 'include',
                                            });

                                            if (res.ok) {
                                              toast({
                                                title: "Foto removida",
                                                description: "A foto foi removida com sucesso.",
                                              });
                                              fetchVehiclePhotos(editingVehicle.id);
                                            }
                                          } catch (error) {
                                            toast({
                                              title: "Erro",
                                              description: "Erro ao remover a foto.",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Mostrar fotos temporárias para novos veículos */}
                            {!editingVehicle && temporaryPhotos.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <h5 className="text-sm font-medium text-gray-600">Fotos capturadas (serão salvas após cadastrar o veículo):</h5>
                                <div className="grid grid-cols-3 gap-2">
                                  {temporaryPhotos.map((tempPhoto, index) => (
                                    <div key={index} className="relative group">
                                      <img 
                                        src={tempPhoto.photo} 
                                        alt={`Foto temporária ${index + 1}`}
                                        className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                      />
                                      <div className="absolute bottom-1 left-1 right-1">
                                        <span className="text-xs bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-center block">
                                          {tempPhoto.category === 'vehicle' ? 'Veículo' : 
                                           tempPhoto.category === 'damage' ? 'Dano' :
                                           tempPhoto.category === 'before' ? 'Antes' :
                                           tempPhoto.category === 'after' ? 'Depois' : 'Outro'}
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
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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

                        <div className="flex justify-end gap-4 pt-4">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              setIsModalOpen(false);
                              setCurrentVehiclePhotos([]);
                              setTemporaryPhotos([]);
                              setEditingVehicle(null);
                              form.reset();

                                // Clear URL parameters to prevent reopening
                                const urlParams = new URLSearchParams(window.location.search);
                                if (urlParams.get('openModal')) {
                                  const newUrl = new URL(window.location.href);
                                  newUrl.searchParams.delete('openModal');
                                  window.history.replaceState({}, '', newUrl.toString());
                                }
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                          >
                            {editingVehicle ? "Atualizar" : "Cadastrar"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* Camera Capture Modal */}
            <CameraCapture
              isOpen={isCameraOpen}
              onClose={() => setIsCameraOpen(false)}
              onPhotoTaken={handlePhotoTaken}
              vehicleId={editingVehicle?.id}
            />

            {/* Analytics Modal */}
            <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Relatório de Veículos
                  </DialogTitle>
                </DialogHeader>
                <VehicleAnalytics />
              </DialogContent>
            </Dialog>

            {vehiclesLoading ? (
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
            ) : filteredVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-gradient-to-br from-teal-100 to-emerald-100 p-6 rounded-full mb-6 w-24 h-24 flex items-center justify-center">
                  <Car className="h-12 w-12 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {customerFilter 
                    ? `${customers.find((c: Customer) => c.id === customerFilter)?.name || 'Cliente'} não possui veículos cadastrados`
                    : "Nenhum veículo encontrado"
                  }
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? 'Tente ajustar os termos de busca.' 
                    : customerFilter 
                      ? 'Deseja cadastrar um veículo para este cliente?'
                      : 'Comece adicionando seu primeiro veículo.'
                  }
                </p>
                {!searchTerm && (
                  <Dialog open={isModalOpen} onOpenChange={(open) => {
                    if (!open && (hasUnsavedChanges || temporaryPhotos.length > 0)) {
                      unsavedChanges.triggerConfirmation(() => {
                        setIsModalOpen(false);
                        setFormInitialValues(null);
                        setCurrentVehiclePhotos([]);
                        setTemporaryPhotos([]);
                        setEditingVehicle(null);
                        form.reset();

                        // Clear URL parameters to prevent reopening
                        const urlParams = new URLSearchParams(window.location.search);
                        if (urlParams.get('openModal')) {
                          const newUrl = new URL(window.location.href);
                          newUrl.searchParams.delete('openModal');
                          window.history.replaceState({}, '', newUrl.toString());
                        }
                      });
                    } else {
                      setIsModalOpen(open);
                      if (!open) {
                        setFormInitialValues(null);
                        setCurrentVehiclePhotos([]);
                        setTemporaryPhotos([]);
                        setEditingVehicle(null);
                        form.reset();

                        // Clear URL parameters to prevent reopening
                        const urlParams = new URLSearchParams(window.location.search);
                        if (urlParams.get('openModal')) {
                          const newUrl = new URL(window.location.href);
                          newUrl.searchParams.delete('openModal');
                          window.history.replaceState({}, '', newUrl.toString());
                        }
                      }
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        onClick={() => {
                          setEditingVehicle(null);
                          const defaultValues = {
                            customerId: customerFilter || 0,
                            licensePlate: "",
                            brand: "",
                            model: "",
                            year: new Date().getFullYear(),
                            color: "",
                            chassis: "",
                            engine: "",
                            fuelType: "gasoline",
                            notes: "",
                          };
                          form.reset(defaultValues);
                          setFormInitialValues(defaultValues);
                          setTemporaryPhotos([]);
                          setCurrentVehiclePhotos([]);
                        }}
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        {customerFilter 
                          ? `Cadastrar Veículo para ${customers.find(c => c.id === customerFilter)?.name || 'Cliente'}`
                          : "Adicionar Primeiro Veículo"
                        }
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={cn(
                      "bg-gradient-to-br from-slate-50 to-blue-50/30",
                      isMobile ? "max-w-[95vw] max-h-[90vh] overflow-y-auto" : "max-w-2xl"
                    )}>
                      <DialogHeader className="pb-6">
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                          {editingVehicle ? "Editar Veículo" : "Novo Veículo"}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                    <FormControl>
                                      <SelectTrigger className="h-11 bg-white/80 border-slate-200 rounded-lg">
                                        <SelectValue placeholder="Selecione o cliente" />
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
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                          control={form.control}
                          name="licensePlate"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                <Car className="h-4 w-4 mr-2 text-teal-600" />
                                Placa
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="ABC-1234" 
                                  className="h-11 bg-white/80 border-slate-200 rounded-lg uppercase"
                                  maxLength={8}
                                  {...field}
                                  onChange={(e) => {
                                    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                    if (value.length > 3) {
                                      value = value.slice(0, 3) + '-' + value.slice(3, 7);
                                    }
                                    field.onChange(value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                          control={form.control}
                          name="brand"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700">Marca</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Digite a marca do veículo" 
                                  className="h-11 bg-white/80 border-slate-200 rounded-lg"
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                            <FormField
                          control={form.control}
                          name="model"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700">Modelo</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Digite o modelo do veículo" 
                                  className="h-11 bg-white/80 border-slate-200 rounded-lg"
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="year"
                              render={({ field }) => (
                                <FormItem className="space-y-2">
                                  <FormLabel className="text-sm font-semibold text-slate-700">Ano</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="2024" 
                                      className="h-11 bg-white/80 border-slate-200 rounded-lg"{...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="color"
                              render={({ field }) => (
                                <FormItem className="space-y-2">
                                  <FormLabel className="text-sm font-semibold text-slate-700">Cor</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Preto" 
                                      className="h-11 bg-white/80 border-slate-200 rounded-lg"
                                      {...field} 
                                      value={field.value || ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="fuelType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Combustível</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o combustível" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {fuelTypes.map((fuel) => (
                                      <SelectItem key={fuel.value} value={fuel.value}>
                                        {fuel.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Photos Section */}
                          <div className="col-span-2 border-t pt-4">

  <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-700">Fotos</h4>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setIsCameraOpen(true);
                                    }}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <Camera className="h-4 w-4" />
                                    {isMobile ? "Foto" : "Câmera"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // Trigger file upload
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'image/*';
                                      input.multiple = true;
                                      input.onchange = async (event) => {
                                        const files = (event.target as HTMLInputElement).files;
                                        if (files) {
                                          for (const file of Array.from(files)) {
                                            const reader = new FileReader();
                                            reader.onload = (e) => {
                                              const photo = e.target?.result as string;
                                              // Use vehicleId if editing, undefined if creating new
                                              handlePhotoTaken(photo, 'vehicle', editingVehicle?.id);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }
                                      };
                                      input.click();
                                    }}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <Plus className="h-4 w-4" />
                                    +
                                  </Button>
                                </div>
                              </div>

                              {/* Exibir fotos existentes do veículo em edição */}
                              {editingVehicle && currentVehiclePhotos.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <h5 className="text-sm font-medium text-gray-600">Fotos do veículo:</h5>
                                  <div className="grid grid-cols-3 gap-2">
                                    {currentVehiclePhotos.map((photo) => (
                                      <div key={photo.id} className="relative group">
                                        <img 
                                          src={photo.url} 
                                          alt={photo.description || 'Foto do veículo'}
                                          className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                        />
                                        <div className="absolute bottom-1 left-1 right-1">
                                          <span className="text-xs bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-center block">
                                            {photo.category === 'vehicle' ? 'Veículo' : 
                                             photo.category === 'damage' ? 'Dano' :
                                             photo.category === 'before' ? 'Antes' :
                                             photo.category === 'after' ? 'Depois' : 'Outro'}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (!confirm('Tem certeza que deseja remover esta foto?')) return;

                                            try {
                                              const res = await fetch(`/api/photos/${photo.id}`, {
                                                method: 'DELETE',
                                                credentials: 'include',
                                              });

                                              if (res.ok) {
                                                toast({
                                                  title: "Foto removida",
                                                  description: "A foto foi removida com sucesso.",
                                                });
                                                fetchVehiclePhotos(editingVehicle.id);
                                              }
                                            } catch (error) {
                                              toast({
                                                title: "Erro",
                                                description: "Erro ao remover a foto.",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Mostrar fotos temporárias para novos veículos */}
                              {!editingVehicle && temporaryPhotos.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <h5 className="text-sm font-medium text-gray-600">Fotos capturadas (serão salvas após cadastrar o veículo):</h5>
                                  <div className="grid grid-cols-3 gap-2">
                                    {temporaryPhotos.map((tempPhoto, index) => (
                                      <div key={index} className="relative group">
                                        <img 
                                          src={tempPhoto.photo} 
                                          alt={`Foto temporária ${index + 1}`}
                                          className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                        />
                                        <div className="absolute bottom-1 left-1 right-1">
                                          <span className="text-xs bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-center block">
                                            {tempPhoto.category === 'vehicle' ? 'Veículo' : 
                                             tempPhoto.category === 'damage' ? 'Dano' :
                                             tempPhoto.category === 'before' ? 'Antes' :
                                             tempPhoto.category === 'after' ? 'Depois' : 'Outro'}
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
                                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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

                          <div className="flex justify-end gap-4 pt-4">
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => {
                                if (hasUnsavedChanges || temporaryPhotos.length > 0) {
                                  unsavedChanges.triggerConfirmation(() => {
                                    setIsModalOpen(false);
                                    setFormInitialValues(null);
                                    setCurrentVehiclePhotos([]);
                                    setTemporaryPhotos([]);
                                    setEditingVehicle(null);
                                    form.reset();

                                      // Clear URL parameters to prevent reopening
                                      const urlParams = new URLSearchParams(window.location.search);
                                      if (urlParams.get('openModal')) {
                                        const newUrl = new URL(window.location.href);
                                        newUrl.searchParams.delete('openModal');
                                        window.history.replaceState({}, '', newUrl.toString());
                                      }
                                  });
                                } else {
                                  setIsModalOpen(false);
                                  setFormInitialValues(null);
                                  setCurrentVehiclePhotos([]);
                                  setTemporaryPhotos([]);
                                  setEditingVehicle(null);
                                  form.reset();

                                    // Clear URL parameters to prevent reopening
                                    const urlParams = new URLSearchParams(window.location.search);
                                    if (urlParams.get('openModal')) {
                                      const newUrl = new URL(window.location.href);
                                      newUrl.searchParams.delete('openModal');
                                      window.history.replaceState({}, '', newUrl.toString());
                                    }
                                }
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createMutation.isPending || updateMutation.isPending}
                              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                            >
                              {editingVehicle ? "Atualizar" : "Cadastrar"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle: Vehicle) => {
                  const customer = customers.find((c: Customer) => c.id === vehicle.customerId);
                  return (
                    <Card 
                      key={vehicle.id}
                      className="bg-gradient-to-r from-white to-blue-50/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                              <Car className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                                {vehicle.brand} {vehicle.model}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {vehicle.year} • {vehicle.color}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-teal-100 text-teal-800 text-xs">
                            {vehicle.licensePlate}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <User className="h-4 w-4 mr-2 text-emerald-500" />
                            <span>{customer?.name}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="h-4 w-4 mr-2 text-purple-500">⛽</div>
                            <span className="capitalize">{fuelTypes.find(f => f.value === vehicle.fuelType)?.label || vehicle.fuelType}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setLocation(`/services?vehicleId=${vehicle.id}&vehiclePlate=${encodeURIComponent(vehicle.licensePlate)}`);
                            }}
                            className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                          >
                            <Wrench className="h-3 w-3 mr-1" />
                            Serviços
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(vehicle)}
                            className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Modal de aviso quando veículo não tem serviços */}
        <Dialog open={isServiceWarningOpen} onOpenChange={setIsServiceWarningOpen}>
          <DialogContent className="max-w-md bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
            <DialogHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Wrench className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold text-teal-900">
                Primeiro Serviço
              </DialogTitle>
            </DialogHeader>

            <div className="text-center space-y-4">
              <p className="text-gray-700">
                O veículo <strong>{vehicleForServiceWarning?.licensePlate}</strong> ({vehicleForServiceWarning?.brand} {vehicleForServiceWarning?.model}) ainda não possui serviços cadastrados.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-orange-800 text-sm font-medium">
                  Deseja criar o primeiro serviço para este veículo?
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsServiceWarningOpen(false);
                  setVehicleForServiceWarning(null);
                }}
                className="flex-1 border-teal-300 text-teal-700 hover:bg-teal-50"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (vehicleForServiceWarning) {
                    const customer = customers.find((c: Customer) => c.id === vehicleForServiceWarning.customerId);
                    setLocation(`/services?vehicleId=${vehicleForServiceWarning.id}&customerId=${vehicleForServiceWarning.customerId}&vehiclePlate=${encodeURIComponent(vehicleForServiceWarning.licensePlate)}&customerName=${encodeURIComponent(customer?.name || '')}&openModal=true`);
                  }
                  setIsServiceWarningOpen(false);
                  setVehicleForServiceWarning(null);
                }}
                className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white"
              >
                Criar Serviço
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Pesquisa */}
        <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
          <DialogContent className={cn(
            "bg-gradient-to-br from-slate-50 to-blue-50/30",
            isMobile ? "max-w-[95vw] max-h-[90vh] overflow-y-auto" : "max-w-5xl max-h-[90vh] overflow-y-auto"
          )}>
            <DialogHeader className="pb-6">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent flex items-center">
                <Search className="h-6 w-6 mr-3 text-teal-600" />
                Pesquisar Veículos
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por placa, marca, modelo ou cor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/90 backdrop-blur-sm border-gray-200/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-200 h-12"
                    autoFocus
                  />
                </div>

                {/* Customer Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <User className="h-4 w-4 mr-2 text-teal-600" />
                    Filtrar por Cliente
                  </label>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={customerFilter?.toString() || "all"} 
                      onValueChange={(value) => setCustomerFilter(value === "all" ? null : parseInt(value))}
                    >
                      <SelectTrigger className="bg-white/90 backdrop-blur-sm border-gray-200/50 rounded-lg h-11">
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os clientes</SelectItem>
                        {customers.map((customer: Customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {customerFilter && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomerFilter(null)}
                        className="px-2 h-11"
                      >
                        <span className="sr-only">Limpar filtro</span>
                        ×
                      </Button>
                    )}
                  </div>
                </div>

                {/* Resultados da pesquisa */}
                {(searchTerm || customerFilter) && (
                  <div className="bg-white/50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-4 flex items-center justify-between">
                      <span>
                        {filteredVehicles.length === 0 
                          ? "Nenhum veículo encontrado com os critérios de busca."
                          : `${filteredVehicles.length} veículo(s) encontrado(s).`
                        }
                      </span>
                      {filteredVehicles.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setCustomerFilter(null);
                          }}
                          className="text-xs"
                        >
                          Limpar filtros
                        </Button>
                      )}
                    </div>

                    {filteredVehicles.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                        {filteredVehicles.map((vehicle: Vehicle) => {
                          const customer = customers.find((c: Customer) => c.id === vehicle.customerId);
                          return (
                            <Card 
                              key={vehicle.id}
                              className="bg-gradient-to-r from-white to-blue-50/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                      <Car className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-gray-900 text-sm group-hover:text-teal-700 transition-colors">
                                        {vehicle.brand} {vehicle.model}
                                      </h3>
                                      <p className="text-xs text-gray-500">
                                        {vehicle.year} • {vehicle.color}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge className="bg-teal-100 text-teal-800 text-xs font-mono">
                                    {vehicle.licensePlate}
                                  </Badge>
                                </div>

                                <div className="space-y-2 mb-4">
                                  <div className="flex items-center text-xs text-gray-600">
                                    <User className="h-3 w-3 mr-2 text-emerald-500" />
                                    <span>{customer?.name}</span>
                                  </div>
                                  <div className="flex items-center text-xs text-gray-600">
                                    <div className="h-3 w-3 mr-2 text-purple-500">⛽</div>
                                    <span className="capitalize">{fuelTypes.find(f => f.value === vehicle.fuelType)?.label || vehicle.fuelType}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIsSearchModalOpen(false);
                                      setLocation(`/services?vehicleId=${vehicle.id}&vehiclePlate=${encodeURIComponent(vehicle.licensePlate)}`);
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
                                      setLocation(`/vehicle-history?vehicleId=${vehicle.id}&vehiclePlate=${encodeURIComponent(vehicle.licensePlate)}`);
                                    }}
                                    className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    Histórico
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIsSearchModalOpen(false);
                                      handleEdit(vehicle);
                                    }}
                                    className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIsSearchModalOpen(false);
                                      setLocation(`/vehicle-photos?vehicleId=${vehicle.id}&vehiclePlate=${encodeURIComponent(vehicle.licensePlate)}`);
                                    }}
                                    className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                                  >
                                    <Camera className="h-3 w-3 mr-1" />
                                    Fotos
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                          <Car className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Nenhum veículo encontrado</p>
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsSearchModalOpen(false);
                            setEditingVehicle(null);
                            const defaultValues = {
                              customerId: customerFilter || 0,
                              licensePlate: searchTerm.toUpperCase(),
                              brand: "",
                              model: "",
                              year: new Date().getFullYear(),
                              color: "",
                              chassis: "",
                              engine: "",
                              fuelType: "gasoline",
                              notes: "",
                            };
                            form.reset(defaultValues);
                            setFormInitialValues(defaultValues);
                            setTemporaryPhotos([]);
                            setCurrentVehiclePhotos([]);
                            setIsModalOpen(true);
                          }}
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Criar veículo
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setIsSearchModalOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Floating Action Buttons */}
        <Button
          className="fixed bottom-24 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 z-50 transform hover:scale-110"
          size="sm"
          onClick={() => setIsSearchModalOpen(true)}
          aria-label="Pesquisar veículos"
        >
          <Search className="h-7 w-7" />
        </Button>

        <Button
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 z-50 transform hover:scale-110"
          size="sm"
          onClick={() => {
            setEditingVehicle(null);
            const defaultValues = {
              customerId: customerFilter || 0,
              licensePlate: "",
              brand: "",
              model: "",
              year: new Date().getFullYear(),
              color: "",
              chassis: "",
              engine: "",
              fuelType: "gasoline",
              notes: "",
            };
            form.reset(defaultValues);
            setFormInitialValues(defaultValues);
            setTemporaryPhotos([]);
            setCurrentVehiclePhotos([]);
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