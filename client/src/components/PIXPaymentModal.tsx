import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QrCode, Copy, Clock, CheckCircle, XCircle, CreditCard, Smartphone, AlertCircle, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PIXPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: number;
  defaultAmount?: number;
  customerData?: {
    name?: string;
    email?: string;
    document?: string;
  };
}

interface PIXPayment {
  id: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  pixCopyPaste: string;
  expirationDate: string;
  amount: number;
}

export function PIXPaymentModal({ 
  open, 
  onOpenChange, 
  serviceId, 
  defaultAmount = 0,
  customerData 
}: PIXPaymentModalProps) {
  const [amount, setAmount] = useState(
    defaultAmount > 0 ? defaultAmount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) : ""
  );
  
  const formatCurrency = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    
    // Converte para centavos e depois para reais
    const cents = parseInt(numbers);
    const reais = cents / 100;
    
    // Formata como moeda
    return reais.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatCurrency(value);
    setAmount(formatted);
  };

  const getNumericAmount = () => {
    return parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
  };
  const [description, setDescription] = useState("");
  const [customerEmail, setCustomerEmail] = useState(customerData?.email || "cliente@exemplo.com");
  const [customerName, setCustomerName] = useState(customerData?.name || "");
  const [customerDocument, setCustomerDocument] = useState(customerData?.document || "");
  const [pixPayment, setPixPayment] = useState<PIXPayment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [existingPIX, setExistingPIX] = useState<PIXPayment | null>(null);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Verificar PIX existente apenas na abertura do modal
  const checkExistingPIX = useQuery({
    queryKey: [`/api/mercadopago/service/${serviceId}/pix`],
    queryFn: async () => {
      console.log('PIX Modal - Fazendo query para verificar PIX existente, serviceId:', serviceId);
      const response = await fetch(`/api/mercadopago/service/${serviceId}/pix`);
      console.log('PIX Modal - Response status:', response.status);
      if (!response.ok) {
        console.error('PIX Modal - Erro na query:', response.status, response.statusText);
        throw new Error("Erro ao verificar PIX existente");
      }
      const data = await response.json();
      console.log('PIX Modal - Data received:', data);
      return data;
    },
    // Ativar query sempre que modal abrir e não houver PIX gerado
    enabled: open && serviceId > 0 && !pixPayment && !isGenerating,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Permitir refetch ao montar novamente
    refetchInterval: false,
    staleTime: 0, // Sempre buscar dados frescos
  });

  // Processar dados quando a query for bem-sucedida (sintaxe v5)
  useEffect(() => {
    console.log('PIX Modal - useEffect triggered, conditions:', {
      hasData: !!checkExistingPIX.data,
      isSuccess: checkExistingPIX.isSuccess,
      pixPayment: !!pixPayment,
      isGenerating,
      showConfirmOverwrite,
      open
    });
    
    if (checkExistingPIX.data && checkExistingPIX.isSuccess && open) {
      const data = checkExistingPIX.data;
      console.log('PIX Modal - Processing query success with data:', data);
      
      // NUNCA processar se há PIX gerado ou se está gerando
      if (pixPayment || isGenerating) {
        console.log('PIX Modal - Ignorando query result - PIX já existe ou gerando');
        return;
      }
      
      // Só processar se modal está aberto e não há confirmação já exibida
      if (data && data.length > 0 && !showConfirmOverwrite) {
        // Com a nova lógica, há apenas 1 registro por serviço
        const existingPIXRecord = data[0];
        
        // Sempre mostrar confirmação quando há PIX existente (qualquer status)
        console.log('PIX Modal - Found existing PIX for service:', serviceId, 'status:', existingPIXRecord.status);
        console.log('PIX Modal - Setting existing PIX and showing confirm overwrite');
        setExistingPIX({
          id: existingPIXRecord.mercado_pago_id,
          status: existingPIXRecord.status,
          qrCode: existingPIXRecord.qr_code_text,
          qrCodeBase64: existingPIXRecord.qr_code_base64,
          pixCopyPaste: existingPIXRecord.qr_code_text,
          expirationDate: existingPIXRecord.expires_at,
          amount: parseFloat(existingPIXRecord.amount)
        });
        setShowConfirmOverwrite(true);
        console.log('PIX Modal - showConfirmOverwrite set to TRUE');
      } else if (!data || data.length === 0) {
        console.log('PIX Modal - No PIX records found for service:', serviceId);
        setExistingPIX(null);
        setShowConfirmOverwrite(false);
        console.log('PIX Modal - showConfirmOverwrite set to FALSE (no records)');
      }
    }
    
    if (checkExistingPIX.isError) {
      console.error('PIX Modal - Error checking existing PIX:', checkExistingPIX.error);
    }
  }, [checkExistingPIX.data, checkExistingPIX.isSuccess, checkExistingPIX.isError, serviceId, pixPayment, isGenerating, showConfirmOverwrite, open]);

  // Limpar estado apenas quando modal fechar ou serviceId mudar
  useEffect(() => {
    // Quando modal fechar, limpar tudo
    if (!open) {
      console.log('PIX Modal - Modal closed, cleaning all states');
      setPixPayment(null);
      setExistingPIX(null);
      setShowConfirmOverwrite(false);
      console.log('PIX Modal - showConfirmOverwrite set to FALSE (modal closing)');
      setIsGenerating(false);
    }
  }, [open]);

  // Quando serviceId mudar, limpar apenas se necessário
  useEffect(() => {
    if (serviceId > 0) {
      console.log('PIX Modal - ServiceId changed, resetting only if needed');
      setPixPayment(null);
      setIsGenerating(false);
    }
  }, [serviceId]);

  // Invalidar cache quando modal abrir
  useEffect(() => {
    if (open && serviceId > 0) {
      console.log('PIX Modal - Modal opened, invalidating cache to fetch fresh data');
      queryClient.invalidateQueries({ queryKey: [`/api/mercadopago/service/${serviceId}/pix`] });
    }
  }, [open, serviceId, queryClient]);

  // Configurar dados iniciais apenas quando modal abrir pela primeira vez
  useEffect(() => {
    if (open && serviceId > 0 && !pixPayment) {
      setAmount(defaultAmount > 0 ? defaultAmount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "");
      setDescription("");
      setCustomerEmail(customerData?.email || "cliente@exemplo.com");
      setCustomerName(customerData?.name || "");
      setCustomerDocument(customerData?.document || "");
    }
  }, [open, serviceId]); // Não incluir customerData para evitar resets

  // Estado será limpo apenas quando necessário via onOpenChange

  // Remover query automática que causava problema - PIX só é buscado quando necessário

  // Criar PIX
  const createPIXMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/mercadopago/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar PIX");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('PIX created successfully:', data);
      // Definir estados imediatamente e de forma permanente
      setIsGenerating(false);
      setPixPayment(data);
      setExistingPIX(null);
      setShowConfirmOverwrite(false);
      
      console.log('PIX states set - should show QR code now');
      
      toast({
        title: "PIX gerado com sucesso!",
        description: "O QR Code e chave PIX foram criados.",
      });
    },
    onError: (error) => {
      console.error('PIX creation error:', error);
      setIsGenerating(false);
      toast({
        title: "Erro ao gerar PIX",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleGeneratePIX = () => {
    const numericAmount = getNumericAmount();
    if (!amount || numericAmount <= 0) {
      toast({
        title: "Erro",
        description: "Informe um valor válido",
        variant: "destructive",
      });
      return;
    }

    const finalEmail = customerEmail.trim() || "cliente@exemplo.com";
    if (!validateEmail(finalEmail)) {
      toast({
        title: "Erro",
        description: "Informe um email válido",
        variant: "destructive",
      });
      return;
    }

    // Iniciar geração do PIX diretamente
    setIsGenerating(true);
    setShowConfirmOverwrite(false); // Esconder modal de confirmação
    
    createPIXMutation.mutate({
      serviceId,
      amount: numericAmount,
      description: description || `Pagamento - Ordem de Serviço #${serviceId}`,
      customerEmail: finalEmail,
      customerName: customerName || "Cliente",
      customerDocument: customerDocument || "00000000000",
    });
  };

  const handleConfirmOverwrite = () => {
    // Fechar modal de confirmação e continuar com formulário
    setShowConfirmOverwrite(false);
    setExistingPIX(null); // Limpar PIX existente para permitir novo
  };

  const handleCancelOverwrite = () => {
    // Fechar o modal completamente
    onOpenChange(false);
  };

  const handleUseExistingPIX = () => {
    if (existingPIX) {
      setPixPayment(existingPIX);
      setShowConfirmOverwrite(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Chave PIX copiada para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar a chave PIX",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-600";
      case "pending":
        return "text-yellow-600";
      case "rejected":
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "rejected":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Pago";
      case "pending":
        return "Pendente";
      case "rejected":
        return "Rejeitado";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Pagamento PIX
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Serviço #{serviceId}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Instantâneo
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Modal de confirmação para PIX existente */}
          {showConfirmOverwrite && existingPIX && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-xl p-6 space-y-4">
              <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-orange-800 dark:text-orange-200 mb-2">
                    QR Code PIX já existe para este serviço!
                  </h3>
                  <p className="text-orange-600 dark:text-orange-300 text-sm">
                    Há um PIX de <strong>R$ {existingPIX.amount.toFixed(2)}</strong> em aberto para esta ordem de serviço.
                  </p>
                  <p className="text-orange-600 dark:text-orange-300 text-sm mt-2">
                    Status: <Badge variant="secondary" className="ml-1">{getStatusText(existingPIX.status)}</Badge>
                  </p>
                  
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg mt-4">
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      💡 <strong>Dica:</strong> Você pode usar o QR Code existente ou gerar um novo (o registro será atualizado).
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-orange-200 dark:bg-orange-700" />

              <div className="space-y-3">
                <p className="text-center text-orange-700 dark:text-orange-300 text-sm font-medium">
                  O que você deseja fazer?
                </p>
                
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleUseExistingPIX}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Mostrar PIX Existente
                  </Button>
                  
                  <Button
                    onClick={handleConfirmOverwrite}
                    variant="outline"
                    className="w-full border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar Novo PIX
                  </Button>
                  
                  <Button
                    onClick={handleCancelOverwrite}
                    variant="ghost"
                    className="w-full text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading durante geração - mostrado no lugar do formulário */}
          {isGenerating && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6 space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                    Gerando PIX...
                  </h3>
                  <p className="text-blue-600 dark:text-blue-300">
                    Aguarde enquanto criamos seu QR Code PIX
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Formulário de geração de novo PIX - só aparece quando não está carregando, não há PIX gerado e não está mostrando confirmação */}
          {!pixPayment && !isGenerating && !showConfirmOverwrite && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <QrCode className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Criar Novo PIX</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Valor (R$) *
                  </Label>
                  <Input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0,00"
                    className="text-lg font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email do Cliente
                  </Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome do Cliente
                  </Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerDocument" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    CPF/CNPJ
                  </Label>
                  <Input
                    id="customerDocument"
                    value={customerDocument}
                    onChange={(e) => setCustomerDocument(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição (opcional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do pagamento"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Separator />

              <Button 
                onClick={handleGeneratePIX} 
                disabled={isGenerating || !amount || createPIXMutation.isPending}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50"
              >
                {(isGenerating || createPIXMutation.isPending) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gerando PIX...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Gerar PIX
                  </div>
                )}
              </Button>
            </div>
          )}

          {/* PIX gerado - só aparece quando não está carregando, há PIX gerado e não está mostrando confirmação */}
          {pixPayment && !isGenerating && !showConfirmOverwrite && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl p-6 space-y-6">
              {/* Header de sucesso */}
              <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-1">
                    PIX Gerado com Sucesso!
                  </h3>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                    R$ {pixPayment.amount.toFixed(2)}
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    {getStatusText(pixPayment.status)}
                  </Badge>
                </div>
              </div>

              <Separator className="bg-green-200 dark:bg-green-700" />

              {/* QR Code Section */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* QR Code */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Escaneie o QR Code</h4>
                  </div>
                  

                  {pixPayment.qrCodeBase64 && pixPayment.qrCodeBase64.startsWith('data:image/') ? (
                    <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                      <img
                        src={pixPayment.qrCodeBase64}
                        alt="QR Code PIX"
                        className="w-full max-w-[250px] h-auto mx-auto"
                        style={{ 
                          imageRendering: "crisp-edges",
                          objectFit: "contain"
                        }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          const container = target.parentNode as HTMLElement;
                          
                          if (container && !container.querySelector('.qr-error')) {
                            target.style.display = 'none';
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'qr-error bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700';
                            errorDiv.innerHTML = `
                              <div class="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm font-medium mb-2">
                                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                </svg>
                                QR Code indisponível
                              </div>
                              <p class="text-orange-500 dark:text-orange-300 text-xs">Use a chave PIX abaixo para realizar o pagamento</p>
                            `;
                            container.appendChild(errorDiv);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm font-medium mb-2">
                        <AlertCircle className="h-4 w-4" />
                        QR Code indisponível
                      </div>
                      <p className="text-orange-500 dark:text-orange-300 text-xs">
                        Use a chave PIX ao lado para realizar o pagamento
                      </p>
                    </div>
                  )}
                </div>

                {/* Chave PIX e Informações */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">Chave PIX Copia e Cola</h4>
                    </div>
                    <div className="relative">
                      <Textarea
                        value={pixPayment.pixCopyPaste}
                        readOnly
                        className="font-mono text-xs resize-none h-20 pr-12 bg-gray-50 dark:bg-gray-800"
                      />
                      <Button
                        onClick={() => copyToClipboard(pixPayment.pixCopyPaste)}
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Informações do PIX */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Detalhes do Pagamento</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ID do PIX:</span>
                        <span className="font-mono text-xs text-gray-900 dark:text-gray-100">{pixPayment.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Expira em:</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {new Date(pixPayment.expirationDate).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <Badge variant={pixPayment.status === "pending" ? "secondary" : "default"} className="text-xs">
                          {getStatusText(pixPayment.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-green-200 dark:bg-green-700" />

              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    console.log('Clearing PIX payment to generate new one');
                    setPixPayment(null);
                    setIsGenerating(false);
                  }}
                  variant="outline"
                  className="flex-1 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  Gerar Novo PIX
                </Button>
                <Button
                  onClick={() => {
                    console.log('Closing PIX modal');
                    // Reset states when closing manually
                    setPixPayment(null);
                    setIsGenerating(false);
                    setAmount(defaultAmount > 0 ? defaultAmount.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }) : "");
                    setDescription("");
                    setCustomerEmail(customerData?.email || "cliente@exemplo.com");
                    setCustomerName(customerData?.name || "");
                    setCustomerDocument(customerData?.document || "");
                    onOpenChange(false);
                  }}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}