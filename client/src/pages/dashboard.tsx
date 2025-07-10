
import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";
import Sidebar from "../components/layout/sidebar";
import Header from "../components/layout/header";
import TechnicianStatsCards from "../components/dashboard/technician-stats-cards";
import RevenueChart from "@/components/dashboard/revenue-chart";
import RealizedRevenueChart from "@/components/dashboard/realized-revenue-chart";
import TopServices from "@/components/dashboard/top-services";
import RecentServices from "../components/dashboard/recent-services";
import UpcomingAppointments from "../components/dashboard/upcoming-appointments";
import PaymentStatusOverview from "@/components/dashboard/payment-status-overview";
import ServiceStatusChart from "@/components/dashboard/service-status-chart";
import FinancialEvolutionChart from "@/components/dashboard/financial-evolution-chart";
import PaymentMethodsChart from "@/components/dashboard/payment-methods-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Car, 
  Wrench, 
  Calendar, 
  ArrowRight, 
  BarChart3,
  TrendingUp,
  Eye,
  Zap,
  Plus,
  Activity,
  ScanLine
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    return <div>Carregando...</div>;
  }

  const quickActions = [
    {
      title: "Novo Cliente",
      description: "Cadastrar novo cliente",
      icon: Users,
      route: "/customers?action=new"
    },
    {
      title: "Novo Veículo",
      description: "Cadastrar novo veículo",
      icon: Car,
      route: "/vehicles?action=new"
    },
    {
      title: "Nova Ordem de Serviço",
      description: "Criar nova ordem de serviço",
      icon: Wrench,
      route: "/services?action=new"
    },
    {
      title: "Leitor de Placas",
      description: "Reconhecimento automático de placas",
      icon: ScanLine,
      route: "/ocr-plate-reader"
    }
  ];

  const dashboardSections = [
    {
      title: "Clientes",
      description: "Análise detalhada de clientes e fidelização",
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      route: "/dashboard/customers",
      stats: "Ver análises"
    },
    {
      title: "Veículos", 
      description: "Estatísticas da frota e marcas",
      icon: Car,
      gradient: "from-emerald-500 to-emerald-600",
      route: "/dashboard/vehicles",
      stats: "Ver análises"
    },
    {
      title: "Serviços",
      description: "Performance e faturamento",
      icon: Wrench,
      gradient: "from-purple-500 to-purple-600",
      route: "/dashboard/services",
      stats: "Ver análises"
    },
    {
      title: "Agenda",
      description: "Gestão de agendamentos",
      icon: Calendar,
      gradient: "from-orange-500 to-orange-600",
      route: "/dashboard/schedule",
      stats: "Ver análises"
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard"
          subtitle={`Bem-vindo, ${user?.firstName || user?.username}!`}
        />

        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">

            {/* Header Section */}
            <div className="flex flex-col gap-4 lg:gap-6">
              <div className="flex items-center text-sm text-gray-500">
                <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              
              {/* Search and Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 sm:flex-none">
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                  <div className="absolute left-3 top-2.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      onClick={() => setLocation(action.route)}
                      className="bg-teal-600 hover:bg-teal-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 h-9 px-4 justify-center"
                      size="sm"
                    >
                      <action.icon className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{action.title}</span>
                      <span className="sm:hidden">{action.title.split(' ')[0]}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-6">
              <TechnicianStatsCards />
            </div>

            {/* Main Content Grid - Reorganizado com novos gráficos */}
            <div className="space-y-6">
              
              {/* First Row - Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ServiceStatusChart />
                <PaymentMethodsChart />
              </div>

              {/* Second Row - Financial Evolution */}
              <div className="grid grid-cols-1 gap-6">
                <FinancialEvolutionChart />
              </div>

              {/* Third Row - Existing Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column - Métricas Financeiras */}
                <div className="lg:col-span-4 space-y-6">
                  
                </div>

                {/* Center Column - Análises Financeiras Comparativas */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Receita Estimada vs Realizada */}
                  {user?.role === "admin" && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Receita Estimada vs Realizada</h3>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md">
                              Últimos 7 dias
                            </button>
                            <button className="px-3 py-1 text-gray-600 text-xs rounded-md hover:bg-gray-100">
                              30 dias
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <RevenueChart />
                      </div>
                    </div>
                  )}

                  {/* Receita Realizada - Movido para ficar ao lado da estimada */}
                  {user?.role === "admin" && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Receita Realizada (R$)</h3>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md">
                              Semanal
                            </button>
                            <button className="px-3 py-1 text-gray-600 text-xs rounded-md hover:bg-gray-100">
                              Mensal
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <RealizedRevenueChart />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Operações e Serviços */}
                <div className="lg:col-span-3 space-y-6">
                  
                  {/* Serviços Populares - Movido para a direita */}
                  {user?.role === "admin" && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">Serviços Populares</h3>
                      </div>
                      <div className="p-6">
                        <TopServices />
                      </div>
                    </div>
                  )}
                  
                  {/* Próximos Agendamentos */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Próximos Agendamentos</h3>
                        <button 
                          onClick={() => setLocation("/schedule")}
                          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                          Ver Todos
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <UpcomingAppointments />
                    </div>
                  </div>
                  
                  {/* Atividade Recente de Serviços */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Atividade Recente</h3>
                        <button 
                          onClick={() => setLocation("/services")}
                          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                          Ver Todos
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <RecentServices />
                    </div>
                  </div>
                </div>
              </div>
            </div>



          </div>
        </main>
      </div>
    </div>
  );
}
