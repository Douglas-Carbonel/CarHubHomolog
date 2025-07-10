
import React from "react";
import { useAuth } from "../hooks/useAuth";
import Sidebar from "../components/layout/sidebar";
import Header from "../components/layout/header";
import UpcomingAppointments from "../components/dashboard/upcoming-appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, CheckCircle, AlertTriangle } from "lucide-react";

export default function DashboardSchedule() {
  const { user } = useAuth();

  const { data: scheduleStats } = useQuery({
    queryKey: ["/api/dashboard/schedule-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/schedule-stats", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ["/api/dashboard/today-appointments"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/today-appointments", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard - Agendamentos"
          subtitle={`Gestão completa da agenda, ${user?.firstName || user?.username}`}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Cards de estatísticas de agendamento */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Hoje</CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">
                    {scheduleStats?.today || 0}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Agendamentos</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Esta Semana</CardTitle>
                  <Clock className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900">
                    {scheduleStats?.thisWeek || 0}
                  </div>
                  <p className="text-xs text-green-600 mt-1">Agendamentos</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700">Concluídos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900">
                    {scheduleStats?.completed || 0}
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Esta semana</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">Atrasados</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">
                    {scheduleStats?.overdue || 0}
                  </div>
                  <p className="text-xs text-orange-600 mt-1">Precisam atenção</p>
                </CardContent>
              </Card>
            </div>

            {/* Próximos Agendamentos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UpcomingAppointments />
              
              {/* Agendamentos de Hoje */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Agendamentos de Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {todayAppointments?.map((appointment: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center font-bold">
                            {appointment.scheduledTime?.slice(0, 2) || '00'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{appointment.customerName}</p>
                            <p className="text-sm text-gray-600">{appointment.serviceTypeName}</p>
                            <p className="text-sm text-gray-500">{appointment.vehiclePlate}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium
                          ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            appointment.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'}`}>
                          {appointment.status === 'completed' ? 'Concluído' :
                           appointment.status === 'in_progress' ? 'Em Andamento' :
                           appointment.status === 'scheduled' ? 'Agendado' : 'Cancelado'}
                        </div>
                      </div>
                    ))}
                    
                    {(!todayAppointments || todayAppointments.length === 0) && (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Nenhum agendamento para hoje</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
