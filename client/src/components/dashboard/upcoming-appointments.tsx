import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Calendar, ArrowRight } from "lucide-react";

// Helper function to get time number from scheduled time
const getTimeNumber = (scheduledTime: string | null | undefined): string => {
  if (!scheduledTime) return "??";
  
  try {
    // If it's a full time string like "14:30:00", extract the hour
    const timeParts = scheduledTime.split(":");
    if (timeParts.length >= 2) {
      return timeParts[0]; // Return just the hour
    }
    
    // If it's already just a number, return it
    return scheduledTime.slice(0, 2);
  } catch (error) {
    console.warn("Error parsing time:", scheduledTime, error);
    return "??";
  }
};

export default function UpcomingAppointments() {
  const { data: upcomingAppointments, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/upcoming-appointments", { limit: 5 }],
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: 1000,
    queryFn: async () => {
      const response = await fetch("/api/dashboard/upcoming-appointments?limit=5", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }
  });

  console.log('UpcomingAppointments - isLoading:', isLoading, 'error:', error, 'data:', upcomingAppointments);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (time: string) => {
    if (!time) return "";
    return time.slice(0, 5); // HH:MM format
  };

  const getTimeNumber = (time: string) => {
    if (!time) return "00";
    return time.slice(0, 2); // Just the hour
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'in_progress':
        return 'Em Andamento';
      case 'scheduled':
        return 'Agendado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3 border-b border-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">
              Próximos Agendamentos
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Agenda das próximas horas</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {upcomingAppointments?.map((appointment: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl hover:bg-gray-100/80 transition-colors duration-200 group">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                  {getTimeNumber(appointment.scheduledTime)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{appointment.customerName}</p>
                  <p className="text-sm text-gray-600 font-medium">
                    {formatTime(appointment.scheduledTime)} - {appointment.serviceTypeName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {appointment.vehicleBrand} {appointment.vehicleModel} • {appointment.vehiclePlate}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">
                      {appointment.scheduledDate && 
                        new Date(appointment.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')
                      }
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl"
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {(!upcomingAppointments || upcomingAppointments.length === 0) && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Nenhum agendamento próximo</p>
            </div>
          )}
        </div>

        {upcomingAppointments && upcomingAppointments.length > 0 && (
          <Button 
            variant="ghost" 
            className="w-full mt-6 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-medium group"
          >
            Ver agenda completa
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}