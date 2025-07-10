
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, User } from "lucide-react";
import PhotoGallery from "@/components/photos/photo-gallery";
import type { Vehicle, Customer } from "@shared/schema";

export default function VehiclePhotosPage() {
  const [, setLocation] = useLocation();
  
  // Get parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = parseInt(urlParams.get('vehicleId') || '0');
  const vehiclePlate = decodeURIComponent(urlParams.get('vehiclePlate') || '');

  const { data: vehicle, isLoading: vehicleLoading } = useQuery<Vehicle & { customer: Customer }>({
    queryKey: [`/api/vehicles/${vehicleId}`],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: vehicleId > 0,
  });

  if (vehicleId === 0) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Fotos do Veículo" subtitle="Parâmetros inválidos" />
          <main className="flex-1 p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Erro: Veículo não encontrado</h1>
              <Button onClick={() => setLocation('/vehicles')}>
                Voltar para Veículos
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
          title="Fotos do Veículo"
          subtitle={`Galeria de fotos - ${vehiclePlate}`}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="space-y-6">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => setLocation('/vehicles')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Veículos
            </Button>

            {/* Vehicle Info */}
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
                        {vehicle.customer && (
                          <span className="text-sm text-gray-600 flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {vehicle.customer.name}
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
                vehicleId={vehicleId}
                title="Galeria de Fotos do Veículo"
                showAddButton={true}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
