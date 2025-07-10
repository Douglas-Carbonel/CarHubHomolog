import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Wrench, Calendar, Users, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DashboardStats } from "@/types/dashboard";

export default function EnhancedStatsCards() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Erro ao carregar estatísticas do dashboard</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statsData = [
    {
      title: "Faturamento Hoje",
      value: `R$ ${(stats?.dailyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      iconBg: "bg-green-600",
      description: "Receita do dia atual"
    },
    {
      title: "Serviços Hoje",
      value: stats?.dailyServices || 0,
      icon: Wrench,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-600",
      description: "Total de serviços agendados"
    },
    {
      title: "Agendamentos",
      value: stats?.appointments || 0,
      icon: Calendar,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      iconBg: "bg-amber-600",
      description: "Próximos agendamentos"
    },
    {
      title: "Clientes Ativos",
      value: stats?.activeCustomers || 0,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      iconBg: "bg-purple-600",
      description: "Clientes com serviços recentes"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`w-8 h-8 ${stat.iconBg} rounded-full flex items-center justify-center`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}