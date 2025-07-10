
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Wrench, FileText, User, Car, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Service, type Vehicle, type Customer } from "@shared/schema";

async function apiRequest(url: string): Promise<Response> {
  const res = await fetch(url, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res;
}

export default function VehicleHistoryPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState<string>("");

  // Get vehicle info from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('vehicleId');
    const plate = urlParams.get('vehiclePlate');
    
    if (id) {
      setVehicleId(parseInt(id));
    }
    if (plate) {
      setVehiclePlate(decodeURIComponent(plate));
    }
  }, []);

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${vehicleId}`],
    queryFn: async () => {
      const res = await apiRequest(`/api/vehicles/${vehicleId}`);
      return await res.json();
    },
    enabled: !!vehicleId,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await apiRequest("/api/services");
      return await res.json();
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("/api/customers");
      return await res.json();
    },
  });

  // Filter services for this specific vehicle
  const vehicleServices = services.filter(service => service.vehicleId === vehicleId);
  
  // Sort services by date (most recent first)
  const sortedServices = vehicleServices.sort((a, b) => 
    new Date(b.scheduledDate || b.createdAt || '').getTime() - 
    new Date(a.scheduledDate || a.createdAt || '').getTime()
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { 
        label: "Agendado", 
        className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
        icon: Calendar
      },
      in_progress: { 
        label: "Em Andamento", 
        className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        icon: Clock
      },
      completed: { 
        label: "Concluído", 
        className: "bg-green-100 text-green-800 hover:bg-green-200",
        icon: CheckCircle
      },
      cancelled: { 
        label: "Cancelado", 
        className: "bg-red-100 text-red-800 hover:bg-red-200",
        icon: XCircle
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-200",
      icon: AlertCircle
    };

    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const customer = customers.find(c => c.id === vehicle?.customerId);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Histórico do Veículo"
          subtitle={`Todas as movimentações de ${vehiclePlate || vehicle?.licensePlate || 'Veículo'}`}
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/80 via-blue-50/50 to-indigo-50/30 backdrop-blur-sm">
          <div className="p-8">
            {/* Header com informações do veículo */}
            <div className="mb-8">
              <Button
                variant="outline"
                onClick={() => setLocation('/vehicles')}
                className="mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Veículos
              </Button>

              {vehicle && (
                <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-3 rounded-xl text-white">
                        <Car className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-900">
                          {vehicle.brand} {vehicle.model}
                        </CardTitle>
                        <div className="flex items-center space-x-4 mt-2">
                          <Badge className="bg-teal-100 text-teal-800 border-teal-200">
                            {vehicle.licensePlate}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {vehicle.year} • {vehicle.color}
                          </span>
                          {customer && (
                            <span className="text-sm text-gray-600 flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {customer.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )}
            </div>

            {/* Estatísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total de Serviços</p>
                      <p className="text-2xl font-bold text-blue-900">{vehicleServices.length}</p>
                    </div>
                    <Wrench className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Concluídos</p>
                      <p className="text-2xl font-bold text-green-900">
                        {vehicleServices.filter(s => s.status === 'completed').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700">Em Andamento</p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {vehicleServices.filter(s => s.status === 'in_progress').length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Agendados</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {vehicleServices.filter(s => s.status === 'scheduled').length}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de serviços */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Serviços</h2>
              
              {sortedServices.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum serviço encontrado
                    </h3>
                    <p className="text-gray-600">
                      Este veículo ainda não possui histórico de serviços.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sortedServices.map((service) => (
                    <Card key={service.id} className="hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {service.serviceType?.name || 'Serviço'}
                              </h3>
                              {getStatusBadge(service.status)}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                              {service.scheduledDate && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                                  <span>
                                    {format(new Date(service.scheduledDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                  </span>
                                </div>
                              )}
                              
                              {service.scheduledTime && (
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2 text-green-500" />
                                  <span>{service.scheduledTime}</span>
                                </div>
                              )}
                              
                              {service.totalPrice && (
                                <div className="flex items-center">
                                  <span className="text-lg font-semibold text-emerald-600">
                                    R$ {parseFloat(service.totalPrice).toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {service.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700">{service.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
