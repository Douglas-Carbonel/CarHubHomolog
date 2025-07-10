
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, TrendingUp, Calendar, DollarSign, Award } from "lucide-react";

export default function ServiceAnalytics() {
  const queryClient = useQueryClient();

  // Invalidate and refetch analytics data when component mounts
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/analytics/services"] });
  }, [queryClient]);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics/services"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/services", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Total de Serviços",
      value: analytics?.total || 0,
      change: "Realizados",
      icon: Wrench,
      gradient: "from-slate-600 to-slate-700",
      bgGradient: "from-slate-50 to-slate-100",
      iconBg: "bg-gradient-to-r from-slate-600 to-slate-700",
      textColor: "text-slate-700",
    },
    {
      title: "Esta Semana",
      value: analytics?.thisWeek || 0,
      change: "Últimos 7 dias",
      icon: TrendingUp,
      gradient: "from-green-600 to-emerald-700",
      bgGradient: "from-green-50 to-emerald-50",
      iconBg: "bg-gradient-to-r from-green-600 to-emerald-700",
      textColor: "text-green-700",
    },
    {
      title: "Este Mês",
      value: analytics?.thisMonth || 0,
      change: "Últimos 30 dias",
      icon: Calendar,
      gradient: "from-blue-600 to-blue-700",
      bgGradient: "from-blue-50 to-blue-100",
      iconBg: "bg-gradient-to-r from-blue-600 to-blue-700",
      textColor: "text-blue-700",
    },
    {
      title: "Ticket Médio",
      value: analytics?.averageValue ? `R$ ${analytics.averageValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00",
      change: "Por serviço",
      icon: DollarSign,
      gradient: "from-emerald-600 to-emerald-700",
      bgGradient: "from-emerald-50 to-emerald-100",
      iconBg: "bg-gradient-to-r from-emerald-600 to-emerald-700",
      textColor: "text-emerald-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <Card 
            key={index} 
            className={`border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur-sm hover:bg-white/90`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">{stat.title}</p>
                  <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
                  <div className="flex items-center text-sm">
                    <span className={`font-medium ${stat.textColor}`}>{stat.change}</span>
                  </div>
                </div>
                <div className={`w-16 h-16 ${stat.iconBg} rounded-3xl flex items-center justify-center shadow-lg border-2 border-white/30`}>
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {analytics?.topServiceTypes && analytics.topServiceTypes.length > 0 && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Serviços Mais Agendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topServiceTypes.map((serviceType: any, index: number) => (
                <div key={serviceType.serviceTypeId} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{serviceType.serviceTypeName}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-800 border-slate-200">
                    {serviceType.serviceCount} agendamentos
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
