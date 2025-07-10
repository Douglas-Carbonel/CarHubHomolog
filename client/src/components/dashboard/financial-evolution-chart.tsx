
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, Calendar } from "lucide-react";

interface FinancialData {
  date: string;
  servicosTotal: number;
  adicionaisVendidos: number;
  pagamentosRecebidos: number;
  displayDate: string;
}

export default function FinancialEvolutionChart() {
  const [period, setPeriod] = useState("7");

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

  const { data: serviceExtras } = useQuery({
    queryKey: ["/api/service-extras"],
    queryFn: async () => {
      const response = await fetch("/api/service-extras", {
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
          <CardTitle>Evolução Financeira</CardTitle>
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
          <CardTitle>Evolução Financeira</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Erro ao carregar dados</div>
        </CardContent>
      </Card>
    );
  }

  // Generate date range
  const days = parseInt(period);
  const dateRange: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dateRange.push(date.toISOString().split('T')[0]);
  }

  // Process financial data by date
  const financialData: FinancialData[] = dateRange.map(date => {
    const dateObj = new Date(date);
    const dayServices = services.filter((service: any) => 
      service.scheduledDate === date
    );

    // Count total services
    const servicosTotal = dayServices.length;

    // Count services with extras (adicionais)
    const adicionaisVendidos = dayServices.filter((service: any) => 
      service.serviceExtras && service.serviceExtras.length > 0
    ).length;

    // Calculate payments received (only from services with valorPago > 0)
    const pagamentosRecebidos = dayServices.reduce((total: number, service: any) => {
      const valorPago = parseFloat(service.valorPago || 0);
      return total + valorPago;
    }, 0);

    return {
      date,
      servicosTotal,
      adicionaisVendidos,
      pagamentosRecebidos: Math.round(pagamentosRecebidos * 100) / 100,
      displayDate: dateObj.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center mb-1">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm">
                {item.name}: {item.name === 'Pagamentos Recebidos' ? `R$ ${item.value}` : item.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Evolução Financeira
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="displayDate"
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <YAxis 
                yAxisId="count"
                orientation="left"
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <YAxis 
                yAxisId="money"
                orientation="right"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="servicosTotal"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Total de Serviços"
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="adicionaisVendidos"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Adicionais Vendidos"
              />
              <Line
                yAxisId="money"
                type="monotone"
                dataKey="pagamentosRecebidos"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Pagamentos Recebidos"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-sm font-medium text-blue-600">Serviços</span>
            </div>
            <div className="text-lg font-bold">
              {financialData.reduce((sum, day) => sum + day.servicosTotal, 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
              <span className="text-sm font-medium text-orange-600">Adicionais</span>
            </div>
            <div className="text-lg font-bold">
              {financialData.reduce((sum, day) => sum + day.adicionaisVendidos, 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <DollarSign className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm font-medium text-green-600">Recebido</span>
            </div>
            <div className="text-lg font-bold">
              R$ {financialData.reduce((sum, day) => sum + day.pagamentosRecebidos, 0).toFixed(2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
