import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Droplets, Cog, SprayCan, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const serviceIcons: { [key: string]: any } = {
  "Troca de Óleo": Droplets,
  "Revisão Geral": Cog,
  "Lavagem Completa": SprayCan,
  "Balanceamento": Wrench,
};

const serviceIconColors: { [key: string]: string } = {
  "Troca de Óleo": "bg-gradient-to-r from-green-500 to-emerald-600",
  "Revisão Geral": "bg-gradient-to-r from-blue-500 to-cyan-600",
  "Lavagem Completa": "bg-gradient-to-r from-purple-500 to-indigo-600",
  "Balanceamento": "bg-gradient-to-r from-orange-500 to-amber-600",
};

interface TopService {
  name: string;
  count: string | number;
  revenue: string | number;
}

export default function TopServices() {
  const { user } = useAuth();
  const { data: topServices, isLoading, error } = useQuery<TopService[]>({
    queryKey: ["/api/dashboard/top-services"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: 1000,
    queryFn: async () => {
      const response = await fetch("/api/dashboard/top-services", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }
  });

  console.log('TopServices - isLoading:', isLoading, 'error:', error, 'data:', topServices);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3 border-b border-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Star className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">
              Serviços Mais Solicitados
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Ranking por popularidade</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {topServices?.map((service: any, index: number) => {
            const IconComponent = serviceIcons[service.name] || Wrench;
            const iconStyle = serviceIconColors[service.name] || "bg-gradient-to-r from-gray-500 to-gray-600";

            return (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl hover:bg-gray-100/80 transition-colors duration-200">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className={`w-12 h-12 ${iconStyle} rounded-xl flex items-center justify-center shadow-lg`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full border-2 border-gray-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600">#{index + 1}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-500">{Number(service.count)} serviços realizados</p>
                  </div>
                </div>
                <div className="text-right">
                  {user?.role === "admin" && (
                    <span className="text-lg font-bold text-gray-900">
                      R$ {Number(service.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  <p className="text-xs text-gray-500">faturamento</p>
                </div>
              </div>
            );
          })}

          {(!topServices || topServices.length === 0) && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Nenhum serviço encontrado</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}