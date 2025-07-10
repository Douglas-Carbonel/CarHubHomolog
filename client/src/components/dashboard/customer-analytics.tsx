import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Calendar, Award, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerAnalytics() {
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ["/api/analytics/customers"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/customers", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Análise de Clientes</h2>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statsData = [
    {
      title: "Total de Clientes",
      value: analytics?.total || 0,
      change: "Cadastrados",
      icon: Users,
      gradient: "from-blue-600 to-cyan-700",
      bgGradient: "from-blue-50 to-cyan-50",
      iconBg: "bg-gradient-to-r from-blue-600 to-cyan-700",
      textColor: "text-blue-700",
    },
    {
      title: "Novos Esta Semana",
      value: analytics?.newThisWeek || 0,
      change: "Últimos 7 dias",
      icon: TrendingUp,
      gradient: "from-green-600 to-emerald-700",
      bgGradient: "from-green-50 to-emerald-50",
      iconBg: "bg-gradient-to-r from-green-600 to-emerald-700",
      textColor: "text-green-700",
    },
    {
      title: "Novos Este Mês",
      value: analytics?.newThisMonth || 0,
      change: "Últimos 30 dias",
      icon: Calendar,
      gradient: "from-purple-600 to-purple-700",
      bgGradient: "from-purple-50 to-purple-100",
      iconBg: "bg-gradient-to-r from-purple-600 to-purple-700",
      textColor: "text-purple-700",
    },
    {
      title: "Clientes Fiéis",
      value: analytics?.topCustomers?.length || 0,
      change: "Com mais serviços",
      icon: Award,
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-50 to-orange-50",
      iconBg: "bg-gradient-to-r from-amber-500 to-orange-600",
      textColor: "text-amber-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Análise de Clientes</h2>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>
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

      {analytics?.topCustomers && analytics.topCustomers.length > 0 && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Clientes com Mais Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topCustomers.map((customer: any, index: number) => (
                <div key={customer.customerId} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{customer.customerName}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    {customer.serviceCount} serviços
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