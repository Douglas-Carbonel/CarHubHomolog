import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Copy, Clock, Smartphone, AlertCircle, QrCode, RefreshCw, CreditCard, Share2 } from "lucide-react";
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
  const [userConfirmedOverwrite, setUserConfirmedOverwrite] = useState(false);

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
      existingPIX: !!existingPIX,
      userConfirmedOverwrite,
      open
    });

    if (checkExistingPIX.data && checkExistingPIX.isSuccess && open) {
      const data = checkExistingPIX.data;
      console.log('PIX Modal - Processing query success with data:', data);

      // NUNCA processar se há PIX gerado, está gerando, já há PIX existente detectado, ou usuário confirmou sobrescrever
      if (pixPayment || isGenerating || existingPIX || userConfirmedOverwrite) {
        console.log('PIX Modal - Ignorando query result - PIX já existe, gerando, existingPIX definido, ou usuário confirmou sobrescrever');
        return;
      }

      // Só processar se modal está aberto e não há confirmação já exibida
      if (data && data.length > 0 && !showConfirmOverwrite) {
        // Com a nova lógica, há apenas 1 registro por serviço
        const existingPIXRecord = data[0];

        // Validação específica para pagamentos já aprovados
        if (existingPIXRecord.status === 'approved') {
          console.log('PIX Modal - Found APPROVED PIX for service:', serviceId, 'amount:', existingPIXRecord.amount);
          console.log('PIX Modal - Showing approved payment dialog');
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
        } else {
          // Para status pending, cancelled, rejected - mostrar confirmação normal
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
        }
        console.log('PIX Modal - showConfirmOverwrite set to TRUE');
      } else if (!data || data.length === 0) {
        console.log('PIX Modal - No PIX records found for service:', serviceId);
        // Só limpar se não há estados já definidos
        if (!existingPIX && !showConfirmOverwrite) {
          setExistingPIX(null);
          setShowConfirmOverwrite(false);
          console.log('PIX Modal - showConfirmOverwrite set to FALSE (no records)');
        }
      }
    }

    if (checkExistingPIX.isError) {
      console.error('PIX Modal - Error checking existing PIX:', checkExistingPIX.error);
    }
  }, [checkExistingPIX.data, checkExistingPIX.isSuccess, checkExistingPIX.isError, serviceId, pixPayment, isGenerating, showConfirmOverwrite, existingPIX, userConfirmedOverwrite, open]);

  // Limpar estado apenas quando modal fechar ou serviceId mudar
  useEffect(() => {
    // Quando modal fechar, limpar tudo
    if (!open) {
      console.log('PIX Modal - Modal closed, cleaning all states');
      setPixPayment(null);
      setExistingPIX(null);
      setShowConfirmOverwrite(false);
      setUserConfirmedOverwrite(false);
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
      setUserConfirmedOverwrite(false);
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
    // Fechar modal de confirmação e limpar completamente o estado
    console.log('PIX Modal - User confirmed overwrite, clearing all states and setting confirmed flag');
    setShowConfirmOverwrite(false);
    setExistingPIX(null);
    setPixPayment(null);
    setIsGenerating(false);
    setUserConfirmedOverwrite(true); // Marcar que usuário confirmou para evitar re-detecção

    // Limpar também o cache para evitar re-detecção
    queryClient.removeQueries({ queryKey: [`/api/mercadopago/service/${serviceId}/pix`] });
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

  const shareViaWhatsApp = (pixPayment: PIXPayment) => {
    const message = `🎯 *Pagamento PIX - Ordem de Serviço #${serviceId}*

💰 *Valor:* R$ ${pixPayment.amount.toFixed(2)}
📅 *Vencimento:* ${new Date(pixPayment.expirationDate).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })}

📱 *Chave PIX (Copia e Cola):*
${pixPayment.pixCopyPaste}

✅ *Como pagar:*
1. Abra seu app do banco
2. Escolha PIX > Pagar
3. Cole a chave acima
4. Confirme o pagamento

🔄 *Status:* ${getStatusText(pixPayment.status)}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaGeneric = async (pixPayment: PIXPayment) => {
    const message = `🎯 Pagamento PIX - Ordem de Serviço #${serviceId}

💰 Valor: R$ ${pixPayment.amount.toFixed(2)}
📅 Vencimento: ${new Date(pixPayment.expirationDate).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })}

📱 Chave PIX: ${pixPayment.pixCopyPaste}

Status: ${getStatusText(pixPayment.status)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pagamento PIX - Serviço #${serviceId}`,
          text: message,
        });
        toast({
          title: "Compartilhado!",
          description: "Informações do PIX compartilhadas com sucesso",
        });
      } catch (error) {
        // Se o usuário cancelar o compartilhamento, não mostrar erro
        if (error.name !== 'AbortError') {
          copyToClipboard(message);
        }
      }
    } else {
      // Fallback para navegadores que não suportam Web Share API
      copyToClipboard(message);
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

  const checkStatusMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await fetch(`/api/mercadopago/check-pix-status?paymentId=${paymentId}`);
      if (!response.ok) {
        throw new Error('Erro ao verificar o status do pagamento');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('PIX status check result:', data);
      
      // Atualizar o estado do pagamento com o novo status
      setPixPayment((prev) => {
        if (prev) {
          return { ...prev, status: data.status };
        }
        return prev;
      });

      // Só mostrar toast manual se não for polling automático
      if (data.status !== 'pending') {
        toast({
          title: "Status do PIX atualizado!",
          description: `O status do pagamento é: ${getStatusText(data.status)}`,
        });
      }
    },
    onError: (error: any) => {
      console.error('PIX status check error:', error);
      toast({
        title: "Erro ao verificar status do PIX",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckPaymentStatus = () => {
    if (pixPayment && pixPayment.id) {
      checkStatusMutation.mutate(pixPayment.id);
    } else {
      toast({
        title: "Erro",
        description: "ID do pagamento não encontrado.",
        variant: "destructive",
      });
    }
  };

  // Polling automático para verificar status do pagamento PIX
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    // Só ativar polling se há PIX gerado, está com status pending e modal está aberto
    if (pixPayment && pixPayment.status === 'pending' && open && !checkStatusMutation.isPending) {
      console.log(`Starting automatic PIX polling for payment ${pixPayment.id}`);
      
      interval = setInterval(() => {
        console.log(`Automatic PIX check for payment ${pixPayment.id}`);
        checkStatusMutation.mutate(pixPayment.id);
      }, 10000); // Verificar a cada 10 segundos
    }

    return () => {
      if (interval) {
        console.log('Clearing PIX polling interval');
        clearInterval(interval);
      }
    };
  }, [pixPayment?.id, pixPayment?.status, open, checkStatusMutation.isPending]);

  // Atualizar lista de serviços e fechar modal quando pagamento for aprovado
  useEffect(() => {
    if (pixPayment?.status === 'approved') {
      console.log('PIX payment approved! Updating services list and closing modal...');
      
      // Invalidar cache dos serviços para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      
      // Mostrar toast de sucesso
      toast({
        title: "🎉 Pagamento PIX Aprovado!",
        description: `Pagamento de R$ ${pixPayment.amount.toFixed(2)} foi processado com sucesso.`,
        duration: 5000,
      });

      // Fechar modal após 2 segundos
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    }
  }, [pixPayment?.status, queryClient, toast, onOpenChange]);

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
            <div className={`${
              existingPIX.status === 'approved' 
                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700' 
                : 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700'
            } rounded-xl p-6 space-y-4`}>
              <div className="text-center space-y-3">
                <div className={`mx-auto w-16 h-16 ${
                  existingPIX.status === 'approved' 
                    ? 'bg-green-100 dark:bg-green-900/50' 
                    : 'bg-orange-100 dark:bg-orange-900/50'
                } rounded-full flex items-center justify-center`}>
                  {existingPIX.status === 'approved' ? (
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div>
                  {existingPIX.status === 'approved' ? (
                    <>
                      <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                        ✅ Pagamento PIX já foi realizado!
                      </h3>
                      <p className="text-green-600 dark:text-green-300 text-sm">
                        Este serviço já recebeu um pagamento PIX de <strong>R$ {existingPIX.amount.toFixed(2)}</strong>.
                      </p>
                      <p className="text-green-600 dark:text-green-300 text-sm mt-2">
                        Status: <Badge variant="default" className="ml-1 bg-green-600 text-white">{getStatusText(existingPIX.status)}</Badge>
                      </p>
                      <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mt-4">
                        <p className="text-green-700 dark:text-green-300 text-xs">
                          <strong>💡 Deseja criar um novo PIX para um pagamento adicional?</strong>
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
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
                        <p className="text-orange-700 dark:text-orange-300 text-xs">
                          <strong>Expira em:</strong> {new Date(existingPIX.expirationDate).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                          })}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator className={
                existingPIX.status === 'approved' 
                  ? 'bg-green-200 dark:bg-green-700' 
                  : 'bg-orange-200 dark:bg-orange-700'
              } />

              <div className="space-y-3">
                <p className={`text-center ${
                  existingPIX.status === 'approved' 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-orange-700 dark:text-orange-300'
                } text-sm font-medium`}>
                  {existingPIX.status === 'approved' 
                    ? 'Escolha uma opção:' 
                    : 'O que você deseja fazer?'
                  }
                </p>

                <div className="flex flex-col gap-3">
                  {existingPIX.status !== 'approved' && (
                    <Button
                      onClick={handleUseExistingPIX}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Mostrar PIX Existente
                    </Button>
                  )}

                  <Button
                    onClick={handleConfirmOverwrite}
                    variant="outline"
                    className={`w-full ${
                      existingPIX.status === 'approved'
                        ? 'border-green-300 text-green-700 hover:bg-green-50'
                        : 'border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {existingPIX.status === 'approved' 
                      ? 'Criar Novo PIX (Pagamento Adicional)' 
                      : 'Gerar Novo PIX'
                    }
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
          {!pixPayment && !isGenerating && !showConfirmOverwrite && !existingPIX && (
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
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={pixPayment.status === "pending" ? "secondary" : "default"} className="text-xs">
                            {getStatusText(pixPayment.status)}
                          </Badge>
                          {pixPayment.status === "pending" && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <span className="text-xs text-blue-600 dark:text-blue-400">Verificando automaticamente...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-green-200 dark:bg-green-700" />

              {/* Botões de ação */}
              <div className="space-y-3">
                {/* Primeira linha - Compartilhamento */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => shareViaWhatsApp(pixPayment)}
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                    Compartilhar via WhatsApp
                  </Button>

                  <Button
                    onClick={() => shareViaGeneric(pixPayment)}
                    variant="outline"
                    className="flex-1 h-12 border-2 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                </div>

                {/* Segunda linha - Ações principais */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => copyToClipboard(pixPayment.pixCopyPaste)}
                    variant="outline"
                    className="flex-1 h-12 border-2 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Código PIX
                  </Button>

                  <Button
                    onClick={handleCheckPaymentStatus}
                    variant="outline"
                    disabled={checkStatusMutation.isPending}
                    className="flex-1 h-12 border-2 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  >
                    {checkStatusMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Verificando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Verificar Status
                      </>
                    )}
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}