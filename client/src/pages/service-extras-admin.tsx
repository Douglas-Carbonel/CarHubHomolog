
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceExtraSchema, type ServiceExtra } from "@shared/schema";
import { z } from "zod";

const serviceExtraFormSchema = insertServiceExtraSchema;

export default function ServiceExtrasAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<ServiceExtra | null>(null);

  const form = useForm<z.infer<typeof serviceExtraFormSchema>>({
    resolver: zodResolver(serviceExtraFormSchema),
    defaultValues: {
      descricao: "",
      valorPadrao: "0.00",
      isActive: true,
    },
  });

  const { data: serviceExtras = [], isLoading } = useQuery<ServiceExtra[]>({
    queryKey: ["/api/service-extras"],
    queryFn: async () => {
      const res = await fetch("/api/service-extras", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/service-extras", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-extras"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Adicional criado com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error creating service extra:", error);
      toast({ title: "Erro ao criar adicional", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/service-extras/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-extras"] });
      setIsDialogOpen(false);
      setEditingExtra(null);
      form.reset();
      toast({ title: "Adicional atualizado com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error updating service extra:", error);
      toast({ title: "Erro ao atualizar adicional", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/service-extras/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-extras"] });
      toast({ title: "Adicional desativado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao desativar adicional", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof serviceExtraFormSchema>) => {
    if (editingExtra) {
      updateMutation.mutate({ id: editingExtra.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (extra: ServiceExtra) => {
    setEditingExtra(extra);
    form.reset({
      descricao: extra.descricao,
      valorPadrao: extra.valorPadrao || "0.00",
      isActive: extra.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja desativar este adicional?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header 
          title="Adicionais de Serviço"
          subtitle="Gerencie os adicionais disponíveis para os serviços"
        />

        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
                Adicionais de Serviço
              </h1>
              <p className="text-teal-700 mt-2 font-medium">Cadastre e gerencie adicionais para complementar os serviços</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold px-6 py-3 rounded-lg"
                  onClick={() => {
                    setEditingExtra(null);
                    form.reset();
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Novo Adicional
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingExtra ? "Editar Adicional" : "Novo Adicional"}
                  </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Lavagem Simples" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valorPadrao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Padrão</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingExtra ? "Atualizar" : "Criar"} Adicional
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Service Extras Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse bg-white/80 backdrop-blur-sm border border-teal-200">
                  <CardHeader>
                    <div className="h-5 bg-teal-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-teal-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : serviceExtras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Card className="w-full max-w-md text-center bg-white/80 backdrop-blur-sm border border-teal-200">
                <CardContent className="pt-8 pb-6">
                  <Plus className="h-16 w-16 text-teal-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Nenhum adicional encontrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comece criando o primeiro adicional de serviço.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg"
                    onClick={() => {
                      setEditingExtra(null);
                      form.reset();
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Adicional
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {serviceExtras.map((extra) => (
                <Card key={extra.id} className="bg-white/90 backdrop-blur-sm border border-teal-200 hover:shadow-lg transition-all duration-300 hover:border-emerald-300">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-teal-800 mb-1">
                          {extra.descricao}
                        </CardTitle>
                        <div className="flex items-center text-sm font-semibold text-emerald-600">
                          <DollarSign className="h-4 w-4 mr-1" />
                          R$ {Number(extra.valorPadrao || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`${extra.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} font-medium`}>
                          {extra.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(extra)}
                          className="h-8 w-8 p-0 hover:bg-teal-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(extra.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
