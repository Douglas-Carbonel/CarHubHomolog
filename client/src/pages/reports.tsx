
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Users,
  Car,
  Wrench,
  Calendar,
  DollarSign,
  Download,
  Shield,
  Activity,
  Clock,
  Target,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Eye,
  RefreshCw,
} from "lucide-react";

import Sidebar from "../components/layout/sidebar";
import Header from "../components/layout/header";
import { useAuth } from "@/hooks/useAuth";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function ReportsPage() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedView, setSelectedView] = useState("overview");

  // Bloquear acesso para usuários não-admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-red-100 rounded-full">
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Acesso Negado</h2>
                <p className="text-gray-600 max-w-md">
                  Você não tem permissão para acessar relatórios. Apenas administradores podem visualizar esta página.
                </p>
                <Button 
                  onClick={() => window.history.back()}
                  className="mt-4"
                >
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Queries para dados dos relatórios
  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", { credentials: "include" });
      return res.json();
    },
  });

  const { data: revenueData } = useQuery({
    queryKey: ["/api/dashboard/revenue"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/revenue", { credentials: "include" });
      return res.json();
    },
  });

  const { data: realizedRevenueData } = useQuery({
    queryKey: ["/api/dashboard/realized-revenue"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/realized-revenue", { credentials: "include" });
      return res.json();
    },
  });

  const { data: servicesData } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services", { credentials: "include" });
      return res.json();
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers", { credentials: "include" });
      return res.json();
    },
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles", { credentials: "include" });
      return res.json();
    },
  });

  // Processamento dos dados para os gráficos
  const processedData = React.useMemo(() => {
    if (!servicesData || !customersData || !vehiclesData) return null;

    // Análise de status dos serviços
    const servicesByStatus = servicesData.reduce((acc: any, service: any) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    }, {});

    const statusData = Object.entries(servicesByStatus).map(([status, count]) => ({
      name: status === 'scheduled' ? 'Agendado' : 
            status === 'in_progress' ? 'Em Andamento' :
            status === 'completed' ? 'Concluído' :
            status === 'cancelled' ? 'Cancelado' : status,
      value: count,
      color: status === 'completed' ? '#10B981' :
             status === 'in_progress' ? '#F59E0B' :
             status === 'scheduled' ? '#3B82F6' :
             status === 'cancelled' ? '#EF4444' : '#6B7280'
    }));

    // Análise de tipos de serviço
    const servicesByType = servicesData.reduce((acc: any, service: any) => {
      const typeName = service.serviceType?.name || 'Não definido';
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {});

    const serviceTypeData = Object.entries(servicesByType).map(([type, count]) => ({
      name: type,
      value: count
    }));

    // Análise de marcas de veículos
    const vehiclesByBrand = vehiclesData.reduce((acc: any, vehicle: any) => {
      acc[vehicle.brand] = (acc[vehicle.brand] || 0) + 1;
      return acc;
    }, {});

    const brandData = Object.entries(vehiclesByBrand).map(([brand, count]) => ({
      name: brand,
      value: count
    }));

    // Análise temporal dos serviços
    const servicesByMonth = servicesData.reduce((acc: any, service: any) => {
      const date = new Date(service.scheduledDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {});

    const monthlyData = Object.entries(servicesByMonth).map(([month, count]) => ({
      month,
      services: count
    }));

    // Análise de receita por cliente
    const revenueByCustomer = servicesData.reduce((acc: any, service: any) => {
      const customerName = service.customer?.name || 'Cliente não identificado';
      const value = parseFloat(service.estimatedValue || service.finalValue || 0);
      acc[customerName] = (acc[customerName] || 0) + value;
      return acc;
    }, {});

    const customerRevenueData = Object.entries(revenueByCustomer)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      statusData,
      serviceTypeData,
      brandData,
      monthlyData,
      customerRevenueData
    };
  }, [servicesData, customersData, vehiclesData]);

  // KPIs calculados
  const kpis = React.useMemo(() => {
    if (!servicesData || !dashboardStats) return null;

    const totalServices = servicesData.length;
    const completedServices = servicesData.filter((s: any) => s.status === 'completed').length;
    const inProgressServices = servicesData.filter((s: any) => s.status === 'in_progress').length;
    const cancelledServices = servicesData.filter((s: any) => s.status === 'cancelled').length;
    
    const completionRate = totalServices > 0 ? (completedServices / totalServices) * 100 : 0;
    const cancellationRate = totalServices > 0 ? (cancelledServices / totalServices) * 100 : 0;
    
    const totalRevenue = servicesData.reduce((acc: number, service: any) => {
      return acc + parseFloat(service.finalValue || service.estimatedValue || 0);
    }, 0);

    const avgServiceValue = totalServices > 0 ? totalRevenue / totalServices : 0;

    return {
      totalServices,
      completedServices,
      inProgressServices,
      cancelledServices,
      completionRate,
      cancellationRate,
      totalRevenue,
      avgServiceValue,
      activeCustomers: customersData?.length || 0,
      totalVehicles: vehiclesData?.length || 0
    };
  }, [servicesData, customersData, vehiclesData, dashboardStats]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Central de Comando - Relatórios Executivos"
          subtitle="Cockpit completo com visão 360° do negócio - Insights estratégicos em tempo real"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Controles Superiores */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Período de análise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="365">Último ano</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>

              <Button className="bg-gradient-to-r from-blue-600 to-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </div>

            {/* KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Serviços</p>
                      <p className="text-2xl font-bold text-blue-900">{kpis?.totalServices || 0}</p>
                    </div>
                    <Wrench className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Concluídos</p>
                      <p className="text-2xl font-bold text-green-900">{kpis?.completedServices || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Em Andamento</p>
                      <p className="text-2xl font-bold text-orange-900">{kpis?.inProgressServices || 0}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Taxa Conclusão</p>
                      <p className="text-2xl font-bold text-purple-900">{kpis?.completionRate?.toFixed(1) || 0}%</p>
                    </div>
                    <Target className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-600">Receita Total</p>
                      <p className="text-2xl font-bold text-emerald-900">R$ {kpis?.totalRevenue?.toFixed(0) || 0}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-cyan-600">Clientes Ativos</p>
                      <p className="text-2xl font-bold text-cyan-900">{kpis?.activeCustomers || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-cyan-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs de Análises */}
            <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="revenue">Financeiro</TabsTrigger>
                <TabsTrigger value="operations">Operacional</TabsTrigger>
                <TabsTrigger value="customers">Clientes</TabsTrigger>
              </TabsList>

              {/* Tab: Visão Geral */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Status dos Serviços */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="h-5 w-5 mr-2" />
                        Status dos Serviços
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={processedData?.statusData || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {processedData?.statusData?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Tipos de Serviço */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Wrench className="h-5 w-5 mr-2" />
                        Tipos de Serviço Mais Solicitados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={processedData?.serviceTypeData || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Evolução Temporal */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Evolução dos Serviços ao Longo do Tempo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={processedData?.monthlyData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="services" stroke="#3B82F6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Financeiro */}
              <TabsContent value="revenue" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Receita Projetada vs Realizada */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Receita Projetada vs Realizada
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={revenueData || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`R$ ${value}`, '']} />
                          <Area type="monotone" dataKey="revenue" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top Clientes por Receita */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Top Clientes por Receita
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={processedData?.customerRevenueData || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`R$ ${value}`, 'Receita']} />
                          <Bar dataKey="revenue" fill="#10B981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Métricas Financeiras */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardHeader>
                      <CardTitle className="text-green-700">Ticket Médio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-green-900">
                        R$ {kpis?.avgServiceValue?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-sm text-green-600 mt-2">Por serviço realizado</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
                    <CardHeader>
                      <CardTitle className="text-blue-700">Receita Diária</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-blue-900">
                        R$ {dashboardStats?.dailyRevenue || 0}
                      </p>
                      <p className="text-sm text-blue-600 mt-2">Estimativa hoje</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-violet-50">
                    <CardHeader>
                      <CardTitle className="text-purple-700">Receita Realizada</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-purple-900">
                        R$ {dashboardStats?.completedRevenue || 0}
                      </p>
                      <p className="text-sm text-purple-600 mt-2">Serviços concluídos</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab: Operacional */}
              <TabsContent value="operations" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Frota por Marca */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Car className="h-5 w-5 mr-2" />
                        Distribuição da Frota por Marca
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={processedData?.brandData || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {processedData?.brandData?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Indicadores de Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        Indicadores de Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium">Taxa de Conclusão</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {kpis?.completionRate?.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-sm font-medium">Taxa de Cancelamento</span>
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          {kpis?.cancellationRate?.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium">Serviços em Andamento</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {kpis?.inProgressServices}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                        <span className="text-sm font-medium">Agendamentos Futuros</span>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {dashboardStats?.appointments || 0}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab: Clientes */}
              <TabsContent value="customers" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Receita por Cliente */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Ranking de Clientes por Valor
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {processedData?.customerRevenueData?.slice(0, 5).map((customer: any, index: number) => (
                          <div key={customer.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                index === 0 ? 'bg-yellow-500' :
                                index === 1 ? 'bg-gray-400' :
                                index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                              }`}>
                                {index + 1}
                              </div>
                              <span className="font-medium">{customer.name}</span>
                            </div>
                            <span className="font-bold text-green-600">
                              R$ {customer.revenue.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Estatísticas de Clientes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Eye className="h-5 w-5 mr-2" />
                        Insights de Clientes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-900">{kpis?.activeCustomers}</p>
                          <p className="text-sm text-blue-600">Clientes Ativos</p>
                        </div>
                        
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-900">{kpis?.totalVehicles}</p>
                          <p className="text-sm text-green-600">Veículos Cadastrados</p>
                        </div>
                      </div>

                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-semibold text-purple-900 mb-2">Análise de Fidelidade</h4>
                        <p className="text-sm text-purple-700">
                          Clientes com múltiplos serviços representam maior valor de lifetime.
                          Continue investindo em programas de fidelidade.
                        </p>
                      </div>

                      <div className="p-4 bg-orange-50 rounded-lg">
                        <h4 className="font-semibold text-orange-900 mb-2">Oportunidades</h4>
                        <p className="text-sm text-orange-700">
                          Identifique clientes inativos e crie campanhas de reativação
                          para aumentar a base de clientes ativos.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Alertas e Recomendações */}
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Alertas e Recomendações Estratégicas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kpis?.cancellationRate && kpis.cancellationRate > 10 && (
                    <div className="p-4 bg-red-100 border border-red-200 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">⚠️ Alta Taxa de Cancelamento</h4>
                      <p className="text-sm text-red-700">
                        Taxa de {kpis.cancellationRate.toFixed(1)}% está acima do ideal. 
                        Revise processos de atendimento.
                      </p>
                    </div>
                  )}

                  {kpis?.completionRate && kpis.completionRate > 80 && (
                    <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">✅ Excelente Performance</h4>
                      <p className="text-sm text-green-700">
                        Taxa de conclusão de {kpis.completionRate.toFixed(1)}% está excelente. 
                        Continue mantendo esse padrão.
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-blue-100 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">💡 Oportunidade de Crescimento</h4>
                    <p className="text-sm text-blue-700">
                      Considere expandir serviços mais populares e investir em marketing digital.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
