
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

const COLORS = {
  scheduled: "#3B82F6", // Blue
  in_progress: "#F59E0B", // Orange
  completed: "#10B981", // Green
  cancelled: "#EF4444", // Red
};

const STATUS_LABELS = {
  scheduled: "Agendados",
  in_progress: "Em Andamento", 
  completed: "Concluídos",
  cancelled: "Cancelados",
};

interface ServiceStatusData {
  name: string;
  value: number;
  color: string;
  status: string;
}

export default function ServiceStatusChart() {
  const [, setLocation] = useLocation();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
          <CardTitle>Status dos Serviços</CardTitle>
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
          <CardTitle>Status dos Serviços</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Erro ao carregar dados</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate service status distribution
  const statusCounts = services.reduce((acc: Record<string, number>, service: any) => {
    const status = service.status || 'scheduled';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const chartData: ServiceStatusData[] = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
    value: count as number,
    color: COLORS[status as keyof typeof COLORS] || "#6B7280",
    status: status,
  }));

  const handlePieClick = (data: ServiceStatusData) => {
    // Navigate to services page with status filter
    setLocation(`/services?status=${data.status}`);
  };

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">{data.value} serviços</p>
          <p className="text-xs text-gray-500">Clique para filtrar</p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload?.map((entry: any, index: number) => (
          <div
            key={index}
            className="flex items-center cursor-pointer hover:opacity-80 hover:bg-gray-50 rounded-lg p-2 transition-all duration-200"
            onClick={() => handlePieClick(entry.payload)}
          >
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm font-medium">{entry.value}</span>
            <Badge variant="outline" className="ml-2">
              {entry.payload.value}
            </Badge>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="cursor-pointer">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Status dos Serviços</span>
          <Badge variant="outline">{services.length} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                dataKey="value"
                onClick={handlePieClick}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={activeIndex === index ? "#374151" : "none"}
                    strokeWidth={activeIndex === index ? 2 : 0}
                    style={{
                      filter: activeIndex === index ? "brightness(1.1)" : "none",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center text-xs text-gray-500 mt-2">
          Clique em qualquer fatia para filtrar os serviços
        </div>
      </CardContent>
    </Card>
  );
}
