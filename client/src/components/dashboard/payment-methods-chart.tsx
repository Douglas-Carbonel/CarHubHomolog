
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Banknote, FileText, Smartphone } from "lucide-react";

const PAYMENT_COLORS = {
  pix: "#10B981", // Green
  dinheiro: "#3B82F6", // Blue  
  cartao: "#F59E0B", // Orange
  cheque: "#8B5CF6", // Purple
};

const PAYMENT_ICONS = {
  pix: Smartphone,
  dinheiro: Banknote,
  cartao: CreditCard,
  cheque: FileText,
};

const PAYMENT_LABELS = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  cheque: "Cheque",
};

interface PaymentMethodData {
  method: string;
  amount: number;
  count: number;
  color: string;
  percentage: number;
}

export default function PaymentMethodsChart() {
  const [viewType, setViewType] = useState<"value" | "count">("value");

  const { data: services, isLoading } = useQuery({
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
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!services || !Array.isArray(services)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Erro ao carregar dados</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate payment methods data
  const paymentMethods = {
    pix: { amount: 0, count: 0 },
    dinheiro: { amount: 0, count: 0 },
    cartao: { amount: 0, count: 0 },
    cheque: { amount: 0, count: 0 },
  };

  services.forEach((service: any) => {
    // Contabiliza cada pagamento recebido, independente do serviço
    // PIX
    const pixValue = parseFloat(service.pixPago || 0);
    if (pixValue > 0) {
      paymentMethods.pix.amount += pixValue;
      paymentMethods.pix.count += 1;
    }

    // Dinheiro
    const dinheiroValue = parseFloat(service.dinheiroPago || 0);
    if (dinheiroValue > 0) {
      paymentMethods.dinheiro.amount += dinheiroValue;
      paymentMethods.dinheiro.count += 1;
    }

    // Cartão
    const cartaoValue = parseFloat(service.cartaoPago || 0);
    if (cartaoValue > 0) {
      paymentMethods.cartao.amount += cartaoValue;
      paymentMethods.cartao.count += 1;
    }

    // Cheque
    const chequeValue = parseFloat(service.chequePago || 0);
    if (chequeValue > 0) {
      paymentMethods.cheque.amount += chequeValue;
      paymentMethods.cheque.count += 1;
    }
  });

  const totalAmount = Object.values(paymentMethods).reduce((sum, method) => sum + method.amount, 0);
  const totalCount = Object.values(paymentMethods).reduce((sum, method) => sum + method.count, 0);

  console.log("Payment methods calculation:", paymentMethods);
  console.log("Total amount:", totalAmount, "Total count:", totalCount);

  const chartData: PaymentMethodData[] = Object.entries(paymentMethods)
    .filter(([_, data]) => data.amount > 0 || data.count > 0)
    .map(([method, data]) => ({
      method: PAYMENT_LABELS[method as keyof typeof PAYMENT_LABELS],
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
      color: PAYMENT_COLORS[method as keyof typeof PAYMENT_COLORS],
      percentage: viewType === "value" 
        ? Math.round((data.amount / totalAmount) * 100)
        : Math.round((data.count / totalCount) * 100),
    }));

  console.log("Chart data:", chartData);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{data.method}</p>
          <p className="text-sm text-gray-600">
            Valor: R$ {data.amount.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">
            Transações: {data.count}
          </p>
          <p className="text-sm text-gray-600">
            {data.percentage}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{data.method}</p>
          <p className="text-sm text-gray-600">
            {viewType === "value" ? `R$ ${data.amount.toFixed(2)}` : `${data.count} transações`}
          </p>
          <p className="text-sm text-gray-600">
            {data.percentage}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            Nenhum pagamento registrado ainda
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Métodos de Pagamento</CardTitle>
          <div className="flex gap-2">
            <Badge
              variant={viewType === "value" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setViewType("value")}
            >
              Por Valor
            </Badge>
            <Badge
              variant={viewType === "count" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setViewType("count")}
            >
              Por Quantidade
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pie" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pie">Gráfico Pizza</TabsTrigger>
            <TabsTrigger value="bar">Gráfico Barras</TabsTrigger>
          </TabsList>

          <TabsContent value="pie">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey={viewType === "value" ? "amount" : "count"}
                    label={({ percentage }) => `${percentage}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="bar">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="method"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickFormatter={(value) => 
                      viewType === "value" ? `R$ ${value}` : `${value}`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey={viewType === "value" ? "amount" : "count"}
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {chartData.map((data) => {
            const methodKey = Object.keys(PAYMENT_LABELS).find(key => 
              PAYMENT_LABELS[key as keyof typeof PAYMENT_LABELS] === data.method
            ) as keyof typeof PAYMENT_ICONS;
            
            const Icon = PAYMENT_ICONS[methodKey];
            
            return (
              <div key={data.method} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <Icon className="h-4 w-4 mr-2" style={{ color: data.color }} />
                  <span className="text-sm font-medium">{data.method}</span>
                </div>
                <div className="text-lg font-bold">
                  R$ {data.amount.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {data.count} transações
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
