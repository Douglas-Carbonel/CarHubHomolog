
import React from "react";
import { useAuth } from "../hooks/useAuth";
import Sidebar from "../components/layout/sidebar";
import Header from "../components/layout/header";
import ServiceAnalytics from "../components/dashboard/service-analytics";
import SimpleRevenueChart from "../components/dashboard/simple-revenue-chart";
import TopServices from "../components/dashboard/top-services";
import RecentServices from "../components/dashboard/recent-services";

export default function DashboardServices() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard - Serviços"
          subtitle={`Análise completa dos serviços, ${user?.firstName || user?.username}`}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Analytics de Serviços */}
            <ServiceAnalytics />

            {/* Gráfico de Faturamento e Top Serviços */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleRevenueChart />
              <TopServices />
            </div>

            {/* Serviços Recentes */}
            <RecentServices />

          </div>
        </main>
      </div>
    </div>
  );
}
