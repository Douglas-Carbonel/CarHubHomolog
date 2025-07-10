import { useQuery } from "@tanstack/react-query";

interface PaymentStatus {
  paid: number;
  pending: number;
  partial: number;
}

export default function PaymentStatusOverview() {
  const { data: services, isLoading, error } = useQuery({
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
              <div className="h-4 bg-gray-300 rounded w-20"></div>
            </div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !services || !Array.isArray(services)) {
    return (
      <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg">
        Erro ao carregar status dos pagamentos
      </div>
    );
  }

  // Calculate payment status based on real data
  const paymentStatus = services.reduce((acc: PaymentStatus, service: any) => {
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
  }, { paid: 0, pending: 0, partial: 0 });

  const statusItems = [
    {
      label: "Pagos",
      count: paymentStatus.paid,
      color: "green",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      dotColor: "bg-green-500"
    },
    {
      label: "Pendentes",
      count: paymentStatus.pending,
      color: "orange",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      dotColor: "bg-orange-500"
    },
    {
      label: "Parciais",
      count: paymentStatus.partial,
      color: "yellow",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      dotColor: "bg-yellow-500"
    }
  ];

  return (
    <div className="space-y-4">
      {statusItems.map((item, index) => (
        <div key={index} className={`flex items-center justify-between p-3 ${item.bgColor} rounded-lg`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 ${item.dotColor} rounded-full mr-3`}></div>
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </div>
          <span className={`text-sm font-semibold ${item.textColor}`}>
            {item.count} serviços
          </span>
        </div>
      ))}
    </div>
  );
}