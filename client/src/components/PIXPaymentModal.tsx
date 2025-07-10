import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QrCode, Copy, Clock, CheckCircle, XCircle, CreditCard, Smartphone, AlertCircle } from "lucide-react";
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

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar PIX existentes para este serviço
  const { data: existingPIX } = useQuery({
    queryKey: [`/api/mercadopago/service/${serviceId}/pix`],
    enabled: open && serviceId > 0,
  });

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
      setPixPayment(data);
      setIsGenerating(false);
      toast({
        title: "PIX gerado com sucesso!",
        description: "O QR Code e chave PIX foram criados.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/mercadopago/service/${serviceId}/pix`] });
    },
    onError: (error) => {
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

    setIsGenerating(true);
    createPIXMutation.mutate({
      serviceId,
      amount: numericAmount,
      description: description || `Pagamento - Ordem de Serviço #${serviceId}`,
      customerEmail: finalEmail,
      customerName: customerName || "Cliente",
      customerDocument: customerDocument || "00000000000",
    });
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
          {/* PIX existentes */}
          {existingPIX && existingPIX.length > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">PIX Recentes</h3>
              </div>
              <div className="space-y-3">
                {existingPIX.map((pix: any) => (
                  <div key={pix.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(pix.status)}
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          R$ {parseFloat(pix.amount).toFixed(2)}
                        </div>
                        <Badge 
                          variant={pix.status === "approved" ? "default" : pix.status === "pending" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {getStatusText(pix.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(pix.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Geração de novo PIX */}
          {!pixPayment && (
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
                disabled={isGenerating || !amount}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                {isGenerating ? (
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

          {/* PIX gerado */}
          {pixPayment && (
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
                  onClick={() => setPixPayment(null)}
                  variant="outline"
                  className="flex-1 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  Gerar Novo PIX
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
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