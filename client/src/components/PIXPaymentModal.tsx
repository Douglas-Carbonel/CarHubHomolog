import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QrCode, Copy, Clock, CheckCircle, XCircle } from "lucide-react";
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pagamento PIX - Serviço #{serviceId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* PIX existentes */}
          {existingPIX && existingPIX.length > 0 && (
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <h3 className="font-medium mb-3">PIX Criados</h3>
              <div className="space-y-2">
                {existingPIX.map((pix: any) => (
                  <div key={pix.id} className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(pix.status)}
                      <span className="font-medium">R$ {parseFloat(pix.amount).toFixed(2)}</span>
                      <span className={`text-sm ${getStatusColor(pix.status)}`}>
                        {getStatusText(pix.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(pix.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Geração de novo PIX */}
          {!pixPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email do Cliente</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Nome do Cliente</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="customerDocument">CPF/CNPJ</Label>
                  <Input
                    id="customerDocument"
                    value={customerDocument}
                    onChange={(e) => setCustomerDocument(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do pagamento"
                  rows={2}
                />
              </div>

              <Button 
                onClick={handleGeneratePIX} 
                disabled={isGenerating || !amount}
                className="w-full"
              >
                {isGenerating ? "Gerando PIX..." : "Gerar PIX"}
              </Button>
            </div>
          )}

          {/* PIX gerado */}
          {pixPayment && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">PIX Gerado com Sucesso!</h3>
                <p className="text-3xl font-bold text-green-600">
                  R$ {pixPayment.amount.toFixed(2)}
                </p>
              </div>

              {/* QR Code Debug Info */}
              <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded mb-4">
                <p>Debug Info:</p>
                <p>QR Code Base64 exists: {pixPayment.qrCodeBase64 ? 'Sim' : 'Não'}</p>
                <p>QR Code Base64 length: {pixPayment.qrCodeBase64?.length || 0}</p>
                <p>QR Code starts with data:image: {pixPayment.qrCodeBase64?.startsWith('data:image/') ? 'Sim' : 'Não'}</p>
                <p>QR Code text length: {pixPayment.qrCode?.length || 0}</p>
              </div>

              {/* QR Code */}
              {pixPayment.qrCodeBase64 && pixPayment.qrCodeBase64.length > 100 ? (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg inline-block border shadow-sm">
                    <img
                      src={pixPayment.qrCodeBase64}
                      alt="QR Code PIX"
                      className="mx-auto block"
                      style={{ 
                        width: "300px", 
                        height: "300px",
                        imageRendering: "crisp-edges",
                        objectFit: "contain"
                      }}
                      onError={(e) => {
                        console.error('Error loading QR code image');
                        console.error('QR Code data:', pixPayment.qrCodeBase64);
                        console.error('QR Code data length:', pixPayment.qrCodeBase64?.length || 0);
                        console.error('QR Code preview:', pixPayment.qrCodeBase64?.substring(0, 100) || 'empty');
                        
                        const target = e.currentTarget;
                        const container = target.parentNode as HTMLElement;
                        
                        if (container && !container.querySelector('.qr-error')) {
                          target.style.display = 'none';
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'qr-error bg-red-50 p-4 rounded border border-red-200';
                          errorDiv.innerHTML = `
                            <p class="text-red-600 text-sm font-medium mb-2">❌ QR Code não pôde ser carregado</p>
                            <p class="text-red-500 text-xs">Use a chave PIX Copia e Cola abaixo</p>
                            <p class="text-red-400 text-xs mt-2">Dados: ${pixPayment.qrCodeBase64?.length || 0} caracteres</p>
                          `;
                          container.appendChild(errorDiv);
                        }
                      }}
                      onLoad={() => {
                        console.log('QR code image loaded successfully');
                        console.log('Image source length:', pixPayment.qrCodeBase64?.length);
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    📱 Escaneie o QR Code com seu app de pagamento PIX
                  </p>
                </div>
              ) : pixPayment.qrCode && pixPayment.qrCode.length > 30 ? (
                <div className="text-center">
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-orange-600 text-sm font-medium mb-2">⚠️ QR Code visual não disponível</p>
                    <p className="text-orange-500 text-xs">Use a chave PIX Copia e Cola abaixo para realizar o pagamento</p>
                    <p className="text-orange-400 text-xs mt-2">Código PIX: {pixPayment.qrCode.length} caracteres</p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-red-600 text-sm font-medium mb-2">❌ Erro ao gerar PIX</p>
                    <p className="text-red-500 text-xs">Tente gerar um novo PIX</p>
                    <p className="text-red-400 text-xs mt-2">QR Base64: {pixPayment.qrCodeBase64?.length || 0} chars, QR Text: {pixPayment.qrCode?.length || 0} chars</p>
                  </div>
                </div>
              )}
              
              

              {/* Chave PIX */}
              <div>
                <Label>Chave PIX Copia e Cola</Label>
                <div className="flex gap-2">
                  <Input
                    value={pixPayment.pixCopyPaste}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    onClick={() => copyToClipboard(pixPayment.pixCopyPaste)}
                    variant="outline"
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Informações do pagamento */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium">{getStatusText(pixPayment.status)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ID:</span>
                    <span className="ml-2 font-mono">{pixPayment.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Expira em:</span>
                    <span className="ml-2">
                      {new Date(pixPayment.expirationDate).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setPixPayment(null)}
                  variant="outline"
                  className="flex-1"
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