import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";

const statusColors = {
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  completed: "Concluído",
  in_progress: "Em Andamento",
  scheduled: "Agendado",
  cancelled: "Cancelado",
};

export default function RecentServices() {
  const { data: recentServices, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/recent-services?limit=5"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: 1000,
    queryFn: async () => {
      const response = await fetch("/api/dashboard/recent-services?limit=5", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }
  });

  console.log('RecentServices - isLoading:', isLoading, 'error:', error, 'data:', recentServices);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3 border-b border-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">
              Serviços Recentes
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Últimas atividades</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {recentServices?.map((service: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl hover:bg-gray-100/80 transition-colors duration-200 group">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white">
                    {getInitials(service.customerName)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{service.customerName}</p>
                  <p className="text-sm text-gray-500">
                    {service.vehicleBrand} {service.vehicleModel} • {service.vehiclePlate}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">{service.serviceTypeName}</p>
                </div>
              </div>
              <div className="text-right space-y-2">
                <Badge className={`${statusColors[service.status as keyof typeof statusColors]} border font-medium`}>
                  {statusLabels[service.status as keyof typeof statusLabels]}
                </Badge>
                <p className="text-sm font-bold text-gray-900">
                  R$ {(service.finalValue || service.estimatedValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}

          {(!recentServices || recentServices.length === 0) && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Nenhum serviço recente</p>
            </div>
          )}
        </div>

        {recentServices && recentServices.length > 0 && (
          <Button 
            variant="ghost" 
            className="w-full mt-6 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium group"
          >
            Ver todos os serviços
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}