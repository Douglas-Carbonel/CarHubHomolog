import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface ServiceExtra {
  id: number;
  descricao: string;
  valorPadrao: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

const serviceExtraSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valorPadrao: z.string().optional(),
});

type ServiceExtraFormData = z.infer<typeof serviceExtraSchema>;

export default function ServiceExtrasManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServiceExtra, setEditingServiceExtra] = useState<ServiceExtra | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<ServiceExtraFormData>({
    descricao: "",
    valorPadrao: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {}
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: serviceExtras = [], isLoading } = useQuery({
    queryKey: ["/api/admin/service-extras"],
    queryFn: async () => {
      const response = await fetch("/api/admin/service-extras", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch service extras");
      return response.json() as Promise<ServiceExtra[]>;
    }
  });

  const createServiceExtraMutation = useMutation({
    mutationFn: async (data: ServiceExtraFormData) => {
      const response = await fetch("/api/admin/service-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to create service extra");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-extras"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Adicional criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar adicional",
        variant: "destructive",
      });
    }
  });

  const updateServiceExtraMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ServiceExtraFormData> }) => {
      const response = await fetch(`/api/admin/service-extras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to update service extra");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-extras"] });
      setIsDialogOpen(false);
      resetForm();
      setEditingServiceExtra(null);
      toast({
        title: "Sucesso",
        description: "Adicional atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar adicional",
        variant: "destructive",
      });
    }
  });

  const deleteServiceExtraMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/service-extras/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to delete service extra");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-extras"] });
      toast({
        title: "Sucesso",
        description: "Adicional excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir adicional",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      descricao: "",
      valorPadrao: "",
    });
    setErrors({});
    setEditingServiceExtra(null);
  };

  const handleEdit = (serviceExtra: ServiceExtra) => {
    setEditingServiceExtra(serviceExtra);
    setFormData({
      descricao: serviceExtra.descricao,
      valorPadrao: serviceExtra.valorPadrao || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number, descricao: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Confirmar Exclusão",
      description: `Tem certeza que deseja excluir o adicional "${descricao}"? Esta ação não pode ser desfeita.`,
      onConfirm: () => {
        deleteServiceExtraMutation.mutate(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Converter vírgula para ponto no valor antes de validar
      const formDataToSubmit = {
        ...formData,
        valorPadrao: formData.valorPadrao ? formData.valorPadrao.replace(',', '.') : undefined
      };
      
      const validatedData = serviceExtraSchema.parse(formDataToSubmit);
      setErrors({});

      if (editingServiceExtra) {
        updateServiceExtraMutation.mutate({ id: editingServiceExtra.id, data: validatedData });
      } else {
        createServiceExtraMutation.mutate(validatedData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  const filteredServiceExtras = serviceExtras.filter(serviceExtra =>
    serviceExtra.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-teal-200 rounded-lg w-64 animate-pulse mb-2"></div>
            <div className="h-4 bg-teal-100 rounded w-80 animate-pulse"></div>
          </div>
          <div className="h-10 bg-teal-200 rounded-lg w-32 animate-pulse"></div>
        </div>

        {/* Search Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-5 bg-teal-200 rounded w-20 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="h-10 bg-teal-100 rounded animate-pulse"></div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-5 bg-teal-200 rounded w-48 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                  <div className="h-4 bg-teal-100 rounded flex-1 animate-pulse"></div>
                  <div className="h-4 bg-teal-100 rounded w-24 animate-pulse"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 w-8 bg-teal-200 rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-red-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Adicionais de Serviços</h2>
          <p className="text-sm sm:text-base text-gray-600">Gerencie os adicionais disponíveis para os serviços</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 w-full sm:w-auto text-sm">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Novo Adicional</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingServiceExtra ? "Editar Adicional" : "Novo Adicional"}
              </DialogTitle>
              <DialogDescription>
                {editingServiceExtra ? "Edite as informações do adicional" : "Crie um novo adicional de serviço"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 px-1">
              <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className={errors.descricao ? "border-red-500" : ""}
                  placeholder="Ex: Lavagem adicional, Enceramento..."
                />
                {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao}</p>}
              </div>

              <div>
                <Label htmlFor="valorPadrao">Valor Padrão (R$)</Label>
                <Input
                  id="valorPadrao"
                  type="text"
                  value={formData.valorPadrao}
                  onChange={(e) => {
                    let value = e.target.value;
                    
                    // Remove tudo que não é número
                    value = value.replace(/[^\d]/g, '');
                    
                    // Se vazio, deixa vazio
                    if (value === '') {
                      setFormData(prev => ({ ...prev, valorPadrao: '' }));
                      return;
                    }
                    
                    // Converte para número e divide por 100 para ter centavos
                    const numValue = parseInt(value) / 100;
                    
                    // Formata com 2 casas decimais e vírgula
                    const formatted = numValue.toFixed(2).replace('.', ',');
                    
                    setFormData(prev => ({ ...prev, valorPadrao: formatted }));
                  }}
                  placeholder="0,00"
                />
              </div>



              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createServiceExtraMutation.isPending || updateServiceExtraMutation.isPending}
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                >
                  {editingServiceExtra ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Buscar</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Service Extras Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Adicionais ({filteredServiceExtras.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="block sm:hidden">
            <div className="space-y-3 p-4">
              {filteredServiceExtras.map((serviceExtra) => (
                <div key={serviceExtra.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{serviceExtra.descricao}</div>
                    <div className="text-xs text-teal-600 font-medium">
                      {serviceExtra.valorPadrao ? `R$ ${parseFloat(serviceExtra.valorPadrao).toFixed(2).replace('.', ',')}` : "-"}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-1 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(serviceExtra)}
                      className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                      title="Editar adicional"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(serviceExtra.id, serviceExtra.descricao)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Excluir adicional"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Descrição</TableHead>
                  <TableHead className="min-w-[120px]">Valor Padrão</TableHead>
                  <TableHead className="min-w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServiceExtras.map((serviceExtra) => (
                  <TableRow key={serviceExtra.id}>
                    <TableCell className="font-medium">{serviceExtra.descricao}</TableCell>
                    <TableCell>
                      {serviceExtra.valorPadrao ? `R$ ${parseFloat(serviceExtra.valorPadrao).toFixed(2).replace('.', ',')}` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(serviceExtra)}
                          className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                          title="Editar adicional"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(serviceExtra.id, serviceExtra.descricao)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Excluir adicional"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
  );
}