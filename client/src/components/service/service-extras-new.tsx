import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface ServiceType {
  id: number;
  name: string;
  description?: string;
  defaultPrice?: string;
  isActive?: boolean;
}

interface ServiceExtraRow {
  id?: number;
  tempId: string;
  serviceExtraId: number;
  valor: string;
  observacao: string;
  serviceExtra?: {
    id: number;
    descricao: string;
    defaultPrice?: string;
  };
}

interface ServiceExtrasProps {
  serviceId?: number;
  onChange?: (extras: ServiceExtraRow[]) => void;
  initialExtras?: ServiceExtraRow[];
}

export default function ServiceExtras({ serviceId, onChange, initialExtras = [] }: ServiceExtrasProps) {
  const [extras, setExtras] = useState<ServiceExtraRow[]>([]);

  // Load service types to use as available extras
  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ['/api/service-types'],
  });

  // Initialize extras from props
  useEffect(() => {
    if (initialExtras.length > 0) {
      const formattedExtras = initialExtras.map((extra, index) => ({
        ...extra,
        tempId: extra.tempId || `existing_${extra.id || index}_${Date.now()}`,
      }));
      setExtras(formattedExtras);
    }
  }, [initialExtras]);

  // Notify parent component of changes
  useEffect(() => {
    if (onChange) {
      onChange(extras);
    }
  }, [extras, onChange]);

  const formatCurrency = (value: string) => {
    if (!value) return "";
    const numericValue = parseFloat(value.replace(/[^\d]/g, '')) / 100;
    return numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseCurrency = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    const numericValue = parseFloat(cleaned) / 100;
    return numericValue.toFixed(2);
  };

  const addExtra = () => {
    const newExtra: ServiceExtraRow = {
      tempId: `new_${Date.now()}_${Math.random()}`,
      serviceExtraId: 0,
      valor: "0.00",
      observacao: "",
    };
    setExtras([newExtra, ...extras]);
  };

  const removeExtra = (tempId: string) => {
    const newExtras = extras.filter(e => e.tempId !== tempId);
    setExtras(newExtras);
  };

  const updateExtra = (tempId: string, field: keyof ServiceExtraRow, value: any) => {
    const newExtras = [...extras];
    const index = newExtras.findIndex(e => e.tempId === tempId);
    
    if (index === -1) return;
    
    newExtras[index] = { ...newExtras[index], [field]: value };

    // If changing service type, update default price
    if (field === 'serviceExtraId') {
      const selectedServiceType = serviceTypes.find(st => st.id === value);
      if (selectedServiceType && value > 0) {
        newExtras[index].valor = selectedServiceType.defaultPrice || "0.00";
        newExtras[index].serviceExtra = {
          id: selectedServiceType.id,
          descricao: selectedServiceType.name,
          defaultPrice: selectedServiceType.defaultPrice || undefined,
        };
      }
    }

    setExtras(newExtras);
  };

  // Filter available services (excluding already selected ones)
  const getAvailableServicesForDropdown = (currentTempId: string) => {
    const selectedServiceIds = extras
      .filter(e => e.tempId !== currentTempId && e.serviceExtraId > 0)
      .map(e => e.serviceExtraId);
    
    return serviceTypes
      .filter(st => st.isActive !== false && !selectedServiceIds.includes(st.id))
      .map(st => ({
        id: st.id,
        descricao: st.name,
      }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Serviços Adicionais</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addExtra}
          className="h-10 px-4 text-base font-medium bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Serviço
        </Button>
      </div>

      {extras.map((extra) => (
        <Card key={extra.tempId} className="border-l-4 border-l-blue-400 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <Label className="text-sm text-gray-600 font-medium">Serviço</Label>
                <Select
                  value={extra.serviceExtraId > 0 ? extra.serviceExtraId.toString() : ""}
                  onValueChange={(value) => updateExtra(extra.tempId, 'serviceExtraId', parseInt(value))}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableServicesForDropdown(extra.tempId).map((availableService) => (
                      <SelectItem key={availableService.id} value={availableService.id.toString()}>
                        {availableService.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <Label className="text-sm text-gray-600 font-medium">Valor (R$)</Label>
                <Input
                  type="text"
                  placeholder="0,00"
                  value={formatCurrency(extra.valor)}
                  onChange={(e) => {
                    const rawValue = parseCurrency(e.target.value);
                    updateExtra(extra.tempId, 'valor', rawValue);
                  }}
                  className="h-12 text-lg font-bold text-center bg-green-50 border-2 border-green-200 focus:border-green-400 rounded-lg"
                />
              </div>

              <div className="md:col-span-4">
                <Label className="text-sm text-gray-600 font-medium">Observação</Label>
                <Textarea
                  placeholder="Observações sobre este adicional..."
                  value={extra.observacao}
                  onChange={(e) => updateExtra(extra.tempId, 'observacao', e.target.value)}
                  className="h-12 min-h-[48px] resize-none text-base"
                  rows={1}
                />
              </div>

              <div className="md:col-span-1 flex gap-2 justify-center md:justify-end mt-2 md:mt-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeExtra(extra.tempId)}
                  className="h-12 px-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {extras.length === 0 && (
        <Card className="border border-dashed border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Plus className="h-8 w-8 mb-2 text-gray-400" />
            <p className="text-base text-center">
              Nenhum serviço adicional adicionado
            </p>
            <p className="text-sm text-center mt-1">
              Clique em "Adicionar Serviço" para incluir serviços extras
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}