
import React from "react";
import { useAuth } from "../hooks/useAuth";
import Sidebar from "../components/layout/sidebar";
import Header from "../components/layout/header";
import CustomerAnalytics from "../components/dashboard/customer-analytics";

export default function DashboardCustomers() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard - Clientes"
          subtitle={`Análise completa dos clientes, ${user?.firstName || user?.username}`}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <CustomerAnalytics />
          </div>
        </main>
      </div>
    </div>
  );
}
