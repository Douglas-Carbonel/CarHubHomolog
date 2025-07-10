
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wrench, User, Car, Calendar } from "lucide-react";
import PhotoGallery from "@/components/photos/photo-gallery";
import type { Service, Customer, Vehicle, ServiceType } from "@shared/schema";

export default function ServicePhotosPage() {
  const [, setLocation] = useLocation();
  
  // Get parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const serviceId = parseInt(urlParams.get('serviceId') || '0');

  const { data: service, isLoading: serviceLoading } = useQuery<Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType }>({
    queryKey: [`/api/services/${serviceId}`],
    queryFn: async () => {
      const res = await fetch(`/api/services/${serviceId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: serviceId > 0,
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      scheduled: "Agendado",
      in_progress: "Em Andamento",
      completed: "Concluído",
      cancelled: "Cancelado",
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (serviceId === 0) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Fotos do Serviço" subtitle="Parâmetros inválidos" />
          <main className="flex-1 p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Erro: Serviço não encontrado</h1>
              <Button onClick={() => setLocation('/services')}>
                Voltar para Serviços
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header 
          title="Fotos do Serviço"
          subtitle="Galeria de fotos do serviço"
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="space-y-6">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => setLocation('/services')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Serviços
            </Button>

            {/* Service Info */}
            {service && (
              <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-3 rounded-xl text-white">
                      <Wrench className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl text-gray-900">
                        {service.serviceType?.name || 'Tipo não especificado'}
                      </CardTitle>
                      <div className="flex items-center space-x-4 mt-2 flex-wrap gap-2">
                        <Badge className={`${getStatusBadge(service.status || 'scheduled')} font-medium`}>
                          {getStatusLabel(service.status || 'scheduled')}
                        </Badge>
                        {service.customer && (
                          <span className="text-sm text-gray-600 flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {service.customer.name}
                          </span>
                        )}
                        {service.vehicle && (
                          <span className="text-sm text-gray-600 flex items-center">
                            <Car className="h-3 w-3 mr-1" />
                            {service.vehicle.licensePlate} - {service.vehicle.brand} {service.vehicle.model}
                          </span>
                        )}
                        {service.scheduledDate && (
                          <span className="text-sm text-gray-600 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(service.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {service.scheduledTime && ` às ${service.scheduledTime.slice(0, 5)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Photos Gallery */}
            <div className="bg-white rounded-lg border border-teal-200 p-6">
              <PhotoGallery
                serviceId={serviceId}
                title="Galeria de Fotos do Serviço"
                showAddButton={true}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
