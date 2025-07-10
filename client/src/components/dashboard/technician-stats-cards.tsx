import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, Activity, CreditCard } from "lucide-react";

interface DashboardStats {
  receitaRealizada: number;
  receitaPendente: number;
  servicosConcluidos: number;
  pagamentosPendentes: number;
  servicosComPagamentoParcial: number;
  totalServicos: number;
  // Compatibilidade
  completedRevenue: number;
  predictedRevenue: number;
  activeCustomers: number;
  weeklyServices: number;
}

export default function TechnicianStatsCards() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      console.log("TechnicianStatsCards: Fetching dashboard stats...");
      const res = await fetch("/api/dashboard/stats", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const data = await res.json();
      console.log("TechnicianStatsCards: Data received:", data);

      // Debug endpoint call
      try {
        const debugRes = await fetch("/api/debug/today-services", {
          credentials: "include",
        });
        if (debugRes.ok) {
          const debugData = await debugRes.json();
          console.log("Debug - Today's services:", debugData);
        }
      } catch (debugError) {
        console.log("Debug endpoint failed:", debugError);
      }

      return data;
    },
  });

  // Query for services to calculate payment status
  const { data: services } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 30000,
    retry: 3,
  });

  console.log('TechnicianStatsCards - isLoading:', isLoading, 'error:', error, 'stats:', stats);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-12"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 text-sm">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculatePercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100);
  };

  // Mock previous values for percentage calculation (in real scenario, fetch from API)
  const previousStats = {
    receitaRealizada: stats?.receitaRealizada * 0.85 || 0,
    receitaPendente: stats?.receitaPendente * 1.15 || 0,
  };

  // Calculate payment status from services
  const paymentStatus = services?.reduce((acc: any, service: any) => {
    const estimatedValue = parseFloat(service.estimatedValue || 0);
    const paidValue = parseFloat(service.valorPago || 0);
    
    if (paidValue === 0) {
      acc.pending++;
    } else if (paidValue >= estimatedValue) {
      acc.paid++;
    } else {
      acc.partial++;
    }
    
    return acc;
  }, { paid: 0, pending: 0, partial: 0 }) || { paid: 0, pending: 0, partial: 0 };

  const cards = [
    {
      title: "Receita Realizada",
      value: formatCurrency(stats?.receitaRealizada || 0),
      change: calculatePercentage(stats?.receitaRealizada || 0, previousStats.receitaRealizada),
      subtitle: "Pagamentos recebidos",
      icon: DollarSign,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Receita Pendente", 
      value: formatCurrency(stats?.receitaPendente || 0),
      change: calculatePercentage(stats?.receitaPendente || 0, previousStats.receitaPendente),
      subtitle: "Aguardando pagamento",
      icon: TrendingUp,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      title: "Status de Pagamentos",
      value: `${paymentStatus.paid}/${paymentStatus.pending}/${paymentStatus.partial}`,
      change: 0, // No percentage for this card
      subtitle: "Pagos/Pendentes/Parciais",
      icon: CreditCard,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      isPaymentStatus: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-sm transition-shadow">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600">{card.title}</h3>
            <div className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
          </div>
          
          {/* Value */}
          <div className="mb-2">
            {card.isPaymentStatus ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Pagos</span>
                  <span className="text-base sm:text-lg font-semibold text-green-700">{paymentStatus.paid}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-600">Pendentes</span>
                  <span className="text-base sm:text-lg font-semibold text-orange-700">{paymentStatus.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-600">Parciais</span>
                  <span className="text-base sm:text-lg font-semibold text-yellow-700">{paymentStatus.partial}</span>
                </div>
              </div>
            ) : (
              <span className="text-xl sm:text-2xl font-semibold text-gray-900">
                {card.value}
              </span>
            )}
          </div>
          
          {/* Subtitle */}
          {!card.isPaymentStatus && (
            <div className="flex items-center">
              <span className="text-xs sm:text-sm text-gray-500">
                {card.subtitle}
              </span>
              {card.change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500 ml-2" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 ml-2" />
              )}
              <span className={`text-xs font-medium ml-1 ${card.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {card.change >= 0 ? '+' : ''}{card.change.toFixed(1)}%
              </span>
            </div>
          )}
          
          {card.isPaymentStatus && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">
                Total de serviços: {paymentStatus.paid + paymentStatus.pending + paymentStatus.partial}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}