
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Wrench, Calendar, Users } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const statsData = [
    {
      title: "Faturamento Hoje",
      value: stats ? `R$ ${stats.dailyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00",
      change: "+12% vs ontem",
      icon: DollarSign,
      gradient: "from-green-600 to-emerald-700",
      bgGradient: "from-green-50 to-emerald-50",
      iconBg: "bg-gradient-to-r from-green-600 to-emerald-700",
      textColor: "text-green-700",
    },
    {
      title: "Serviços Hoje",
      value: stats?.dailyServices || 0,
      change: "+5% vs ontem",
      icon: Wrench,
      gradient: "from-blue-600 to-blue-700",
      bgGradient: "from-blue-50 to-blue-100",
      iconBg: "bg-gradient-to-r from-blue-600 to-blue-700",
      textColor: "text-blue-700",
    },
    {
      title: "Agendamentos",
      value: stats?.appointments || 0,
      change: "Próximas 24h",
      icon: Calendar,
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-50 to-orange-50",
      iconBg: "bg-gradient-to-r from-amber-500 to-orange-600",
      textColor: "text-amber-700",
    },
    {
      title: "Clientes Ativos",
      value: stats?.activeCustomers || 0,
      change: "+3% este mês",
      icon: Users,
      gradient: "from-slate-600 to-slate-700",
      bgGradient: "from-slate-50 to-slate-100",
      iconBg: "bg-gradient-to-r from-slate-600 to-slate-700",
      textColor: "text-slate-700",
    },
  ];

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

  return (
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
                  <TrendingUp className={`h-4 w-4 mr-1 ${stat.textColor}`} />
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
  );
}
