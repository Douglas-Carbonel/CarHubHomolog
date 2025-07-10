import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ServiceType {
  id: number;
  name: string;
  description?: string;
  defaultPrice?: string;
  isActive?: boolean;
}

interface ServiceItemRow {
  id?: number;
  tempId: string;
  serviceTypeId: number;
  unitPrice: string;
  totalPrice: string;
  quantity: number;
  notes: string;
  serviceType?: {
    id: number;
    name: string;
    defaultPrice?: string;
  };
}

interface ServiceItemsProps {
  serviceId?: number;
  onChange?: (items: ServiceItemRow[]) => void;
  initialItems?: ServiceItemRow[];
}

// Format currency for display
const formatCurrency = (value: string) => {
  if (!value) return "";
  const numericValue = parseFloat(value.replace(/[^\d]/g, '')) / 100;
  return numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Parse currency input back to decimal
const parseCurrency = (value: string) => {
  const cleaned = value.replace(/[^\d]/g, '');
  const numericValue = parseFloat(cleaned) / 100;
  return numericValue.toFixed(2);
};

export default function ServiceItems({ serviceId, onChange, initialItems = [] }: ServiceItemsProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<ServiceItemRow[]>([]);
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [editingObservation, setEditingObservation] = useState<{ tempId: string; notes: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if mobile
  const isMobile = window.innerWidth < 768;

  // Load service types
  const { data: serviceTypes = [], isLoading: serviceTypesLoading } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
    queryFn: async () => {
      const res = await fetch("/api/service-types", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
  });

  // Effect to handle initial items changes
  useEffect(() => {
    console.log('ServiceItems - useEffect triggered with initialItems:', {
      length: initialItems.length,
      initialItems: initialItems,
      isInitialized: isInitialized,
      serviceId: serviceId
    });

    // Always update if we have initialItems, regardless of initialization state
    if (initialItems.length > 0) {
      console.log('ServiceItems - Setting items from initialItems:', initialItems);
      setItems(initialItems);
      setIsInitialized(true);
    } 
    // Only add empty row for new services (no serviceId) and only if not initialized
    else if (!isInitialized && !serviceId) {
      console.log('ServiceItems - New service - adding empty row');
      const emptyItem: ServiceItemRow = {
        tempId: `new_${Date.now()}_${Math.random()}`,
        serviceTypeId: 0,
        unitPrice: "0.00",
        totalPrice: "0.00",
        quantity: 1,
        notes: "",
      };
      setItems([emptyItem]);
      setIsInitialized(true);
    }
    // For existing services with no items, start empty
    else if (!isInitialized && serviceId && initialItems.length === 0) {
      console.log('ServiceItems - Existing service with no items - starting empty');
      setItems([]);
      setIsInitialized(true);
    }
  }, [initialItems, isInitialized, serviceId]);

  // Notify parent component of changes, but avoid onChange triggering re-renders
  useEffect(() => {
    if (onChange && isInitialized) {
      onChange(items);
    }
  }, [items]);

  const addItem = () => {
    const newItem: ServiceItemRow = {
      tempId: `new_${Date.now()}_${Math.random()}`,
      serviceTypeId: 0,
      unitPrice: "0.00",
      totalPrice: "0.00",
      quantity: 1,
      notes: "",
    };
    setItems([newItem, ...items]);
  };

  const removeItem = (tempId: string) => {
    setItems(items.filter(item => item.tempId !== tempId));
  };

  const updateItem = (tempId: string, field: keyof ServiceItemRow, value: any) => {
    const newItems = [...items];
    const index = newItems.findIndex(item => item.tempId === tempId);

    if (index === -1) return;

    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-update related fields based on changes
    if (field === 'serviceTypeId') {
      const selectedServiceType = serviceTypes.find(st => st.id === value);
      if (selectedServiceType && value > 0) {
        newItems[index].unitPrice = selectedServiceType.defaultPrice || "0.00";
        newItems[index].serviceType = {
          id: selectedServiceType.id,
          name: selectedServiceType.name,
          defaultPrice: selectedServiceType.defaultPrice
        };
        // Recalculate total price
        const quantity = newItems[index].quantity || 1;
        const unitPrice = parseFloat(selectedServiceType.defaultPrice || "0");
        newItems[index].totalPrice = (quantity * unitPrice).toFixed(2);
      } else if (value === 0) {
        newItems[index].unitPrice = "0.00";
        newItems[index].totalPrice = "0.00";
        newItems[index].serviceType = undefined;
      }
    }

    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : newItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? parseFloat(parseCurrency(value)) : parseFloat(newItems[index].unitPrice);
      newItems[index].totalPrice = (quantity * unitPrice).toFixed(2);
    }

    setItems(newItems);
  };

  const getAvailableServices = (currentTempId: string) => {
    const selectedServiceIds = items
      .filter(item => item.tempId !== currentTempId && item.serviceTypeId > 0)
      .map(item => item.serviceTypeId);

    return serviceTypes.filter(serviceType => 
      serviceType.isActive !== false && !selectedServiceIds.includes(serviceType.id)
    );
  };

  const openObservationModal = (tempId: string, currentNotes: string) => {
    setEditingObservation({ tempId, notes: currentNotes });
    setObservationModalOpen(true);
  };

  const saveObservation = () => {
    if (editingObservation) {
      updateItem(editingObservation.tempId, 'notes', editingObservation.notes);
      setObservationModalOpen(false);
      setEditingObservation(null);
    }
  };

  if (serviceTypesLoading) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-4"><LoadingSpinner /></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700">Serviços da Ordem</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Serviço
        </Button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Plus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nenhum serviço adicionado</p>
            <p className="text-xs">Use o botão "Adicionar Serviço" para incluir serviços na ordem</p>
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.tempId} className="border border-gray-200">
              <CardContent className={isMobile ? "p-3" : "p-4"}>
                {isMobile ? (
                  // Mobile compact layout
                  <div className="space-y-2">
                    {/* First line: Service selector + delete button */}
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Select
                          value={item.serviceTypeId > 0 ? item.serviceTypeId.toString() : ""}
                          onValueChange={(value) => updateItem(item.tempId, 'serviceTypeId', parseInt(value))}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableServices(item.tempId).map((serviceType) => (
                              <SelectItem key={serviceType.id} value={serviceType.id.toString()}>
                                {serviceType.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(item.tempId)}
                        className="px-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Second line: Quantity, price and observation button */}
                    <div className="flex gap-2 items-center">
                      <div className="w-16">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                          className="h-8 text-xs text-center"
                          placeholder="Qtd"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          value={formatCurrency(item.unitPrice)}
                          onChange={(e) => updateItem(item.tempId, 'unitPrice', e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Valor unitário"
                        />
                      </div>
                      <div className="w-20 text-xs text-center font-medium text-gray-700">
                        R$ {Number(item.totalPrice).toFixed(2)}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openObservationModal(item.tempId, item.notes)}
                        className={`px-2 ${item.notes ? 'bg-blue-50 border-blue-300' : ''}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Desktop layout
                  <div className="grid grid-cols-6 gap-4 items-center">
                    <div className="col-span-2">
                      <Select
                        value={item.serviceTypeId > 0 ? item.serviceTypeId.toString() : ""}
                        onValueChange={(value) => updateItem(item.tempId, 'serviceTypeId', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableServices(item.tempId).map((serviceType) => (
                            <SelectItem key={serviceType.id} value={serviceType.id.toString()}>
                              {serviceType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                        className="text-center"
                        placeholder="Qtd"
                      />
                    </div>
                    <div>
                      <Input
                        value={formatCurrency(item.unitPrice)}
                        onChange={(e) => updateItem(item.tempId, 'unitPrice', e.target.value)}
                        placeholder="Valor unitário"
                      />
                    </div>
                    <div className="text-center font-medium text-gray-700">
                      R$ {Number(item.totalPrice).toFixed(2)}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openObservationModal(item.tempId, item.notes)}
                        className={`px-2 ${item.notes ? 'bg-blue-50 border-blue-300' : ''}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(item.tempId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Observation Modal */}
      <Dialog open={observationModalOpen} onOpenChange={setObservationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observações do Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editingObservation?.notes || ""}
              onChange={(e) => setEditingObservation(prev => 
                prev ? { ...prev, notes: e.target.value } : null
              )}
              placeholder="Digite observações sobre este serviço..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setObservationModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={saveObservation}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}