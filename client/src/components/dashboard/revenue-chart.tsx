
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart, Bar, BarChart } from "recharts";
import { MoreHorizontal, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RevenueChart() {
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/revenue?days=7"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch("/api/dashboard/revenue?days=7", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Buscar todos os serviços para análise detalhada
  const { data: allServices } = useQuery({
    queryKey: ["/api/services"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch("/api/services", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Transform data for chart
  const chartData = revenueData?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('pt-BR', { weekday: 'short' }),
    fullDate: item.date,
    revenue: item.revenue,
  })) || [];

  // Calcular total de faturamento previsto
  const totalEstimatedRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);

  // Filtrar serviços dos últimos 7 dias (estimados + concluídos)
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  const last7DaysStr = last7Days.toISOString().split('T')[0];

  const recentServices = allServices?.filter((service: any) => 
    service.scheduledDate >= last7DaysStr
  ) || [];

  // Agrupar serviços por status
  const completedServices = recentServices.filter((service: any) => service.status === 'completed');
  const estimatedServices = recentServices.filter((service: any) => 
    service.status === 'scheduled' || service.status === 'in_progress'
  );

  // Debug: Log the chart data to console
  console.log('Revenue Chart Data:', chartData);
  console.log('Recent Services:', recentServices);
  console.log('Completed Services:', completedServices);
  console.log('Estimated Services:', estimatedServices);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Faturamento Previsto dos Últimos 7 Dias
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Receita estimada + realizada</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="hover:bg-gray-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Total Previsto */}
        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Total Previsto (7 dias)</p>
                <p className="text-2xl font-bold text-green-900">
                  R$ {totalEstimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-600">{recentServices.length} serviços</p>
              <p className="text-xs text-green-500">estimados</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Gráfico */}
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: '#6B7280', fontWeight: 500 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: '#6B7280', fontWeight: 500 }}
                tickFormatter={(value) => `R$ ${value.toLocaleString()}`}
                dx={-10}
              />
              <Tooltip 
                formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Faturamento Previsto']}
                labelFormatter={(label) => `${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              />
              <Bar
                dataKey="revenue"
                fill="#10B981"
                radius={[6, 6, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lista de Serviços Previstos */}
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
            Serviços Previstos Recentes
          </h4>
          
          {recentServices.length > 0 ? (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {recentServices.map((service: any) => {
                const serviceValue = service.finalValue ? Number(service.finalValue) : Number(service.estimatedValue || 0);
                const isCompleted = service.status === 'completed';
                return (
                  <div key={service.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    isCompleted 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{service.customerName}</p>
                        <span className="text-sm text-gray-500">•</span>
                        <p className="text-sm text-gray-600">{service.serviceTypeName}</p>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500">{service.vehiclePlate}</p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-500">
                          {new Date(service.scheduledDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isCompleted ? 'text-green-700' : 'text-yellow-700'}`}>
                        R$ {serviceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`text-xs ${isCompleted ? 'text-green-600' : 'text-yellow-600'}`}>
                        {isCompleted ? 'Concluído' : service.status === 'in_progress' ? 'Em andamento' : 'Agendado'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum serviço previsto nos últimos 7 dias</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
