
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Fuel, Calendar, TrendingUp } from "lucide-react";
import { type Vehicle } from "@shared/schema";
import { fuelTypes } from "@/lib/vehicle-data";

async function apiRequest(url: string): Promise<Response> {
  const res = await fetch(url, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res;
}

export default function VehicleAnalytics() {
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await apiRequest("/api/vehicles");
      return await res.json();
    },
  });

  // Análise por marca
  const brandStats = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.brand] = (acc[vehicle.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Análise por combustível
  const fuelStats = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.fuelType] = (acc[vehicle.fuelType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Análise por ano
  const yearStats = vehicles.reduce((acc, vehicle) => {
    const decade = Math.floor(vehicle.year / 10) * 10;
    const range = `${decade}s`;
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const currentYear = new Date().getFullYear();
  const recentVehicles = vehicles.filter(v => currentYear - v.year <= 5).length;
  const vintageVehicles = vehicles.filter(v => currentYear - v.year > 20).length;

  return (
    <div className="space-y-6">
      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total de Veículos</CardTitle>
            <Car className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{vehicles.length}</div>
            <p className="text-xs text-blue-600 mt-1">
              {Object.keys(brandStats).length} marcas diferentes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Veículos Recentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{recentVehicles}</div>
            <p className="text-xs text-green-600 mt-1">
              Até 5 anos ({Math.round((recentVehicles / vehicles.length) * 100) || 0}%)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Veículos Vintage</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{vintageVehicles}</div>
            <p className="text-xs text-purple-600 mt-1">
              Mais de 20 anos ({Math.round((vintageVehicles / vehicles.length) * 100) || 0}%)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Tipos de Combustível</CardTitle>
            <Fuel className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{Object.keys(fuelStats).length}</div>
            <p className="text-xs text-orange-600 mt-1">
              Tipos diferentes em uso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de análise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top marcas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Top Marcas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(brandStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([brand, count], index) => {
                  const percentage = (count / vehicles.length) * 100;
                  const colors = [
                    'bg-gradient-to-r from-blue-500 to-cyan-500',
                    'bg-gradient-to-r from-green-500 to-emerald-500',
                    'bg-gradient-to-r from-purple-500 to-violet-500',
                    'bg-gradient-to-r from-orange-500 to-red-500',
                    'bg-gradient-to-r from-pink-500 to-rose-500'
                  ];
                  
                  return (
                    <div key={brand} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={`w-3 h-3 rounded-full ${colors[index]}`} />
                        <span className="font-medium text-gray-900">{brand}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${colors[index]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <Badge variant="secondary" className="min-w-12 justify-center">
                          {count}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por combustível */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Combustíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(fuelStats).map(([fuel, count]) => {
                const percentage = (count / vehicles.length) * 100;
                const fuelLabel = fuelTypes.find(f => f.value === fuel)?.label || fuel;
                const fuelColors = {
                  gasoline: 'bg-gradient-to-r from-blue-500 to-blue-600',
                  ethanol: 'bg-gradient-to-r from-green-500 to-green-600',
                  flex: 'bg-gradient-to-r from-purple-500 to-purple-600',
                  diesel: 'bg-gradient-to-r from-orange-500 to-orange-600',
                  electric: 'bg-gradient-to-r from-cyan-500 to-cyan-600',
                  hybrid: 'bg-gradient-to-r from-pink-500 to-pink-600'
                } as const;
                
                return (
                  <div key={fuel} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-3 h-3 rounded-full ${fuelColors[fuel as keyof typeof fuelColors] || 'bg-gray-400'}`} />
                      <span className="font-medium text-gray-900">{fuelLabel}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={fuelColors[fuel as keyof typeof fuelColors] || 'bg-gray-400'}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <Badge variant="secondary" className="min-w-12 justify-center">
                        {Math.round(percentage)}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por década */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Distribuição por Década</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(yearStats)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([decade, count]) => {
                  const percentage = (count / vehicles.length) * 100;
                  return (
                    <div key={decade} className="text-center">
                      <div className="bg-gradient-to-t from-teal-500 to-emerald-500 rounded-lg p-4 text-white">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm opacity-90">{decade}</div>
                        <div className="text-xs opacity-75">{Math.round(percentage)}%</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
