import { MercadoPagoConfig, Payment } from 'mercadopago';
import * as QRCode from 'qrcode';
import { BrazilTimezone } from './brazil-timezone';

export interface PIXPaymentData {
  amount: number;
  description: string;
  customerEmail?: string;
  customerName?: string;
  customerDocument?: string;
  externalReference?: string;
}

export interface PIXPaymentResult {
  id: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  pixCopyPaste: string;
  expirationDate: string;
  amount: number;
}

export class MercadoPagoService {
  private client: MercadoPagoConfig;
  private payment: Payment;

  constructor() {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (accessToken) {
      this.client = new MercadoPagoConfig({
        accessToken: accessToken,
        options: {
          timeout: 5000,
          idempotencyKey: 'abc'
        }
      });

      this.payment = new Payment(this.client);
    } else {
      console.warn('MercadoPago access token not configured. PIX functionality will be disabled.');
    }
  }

  async createPIXPayment(paymentData: PIXPaymentData): Promise<PIXPaymentResult> {
    if (!this.isConfigured()) {
      throw new Error('MercadoPago não configurado. Configure as credenciais para usar PIX.');
    }

    try {
      const paymentRequest = {
        transaction_amount: paymentData.amount,
        description: paymentData.description,
        payment_method_id: 'pix',
        external_reference: paymentData.externalReference,
        payer: {
          email: this.validateEmail(paymentData.customerEmail) || 'cliente@exemplo.com',
          first_name: paymentData.customerName || 'Cliente',
          identification: {
            type: 'CPF',
            number: paymentData.customerDocument || '11111111111'
          }
        },
        // notification_url removida temporariamente para evitar erro de validação
        date_of_expiration: this.getBrazilExpirationDate(30) // 30 minutos no fuso do Brasil
      };

      const response = await this.payment.create({ body: paymentRequest });

      if (!response.point_of_interaction?.transaction_data) {
        throw new Error('Failed to generate PIX payment');
      }

      // Gerar QR Code como base64 a partir do texto PIX
      const qrCodeText = response.point_of_interaction.transaction_data.qr_code || '';
      let qrCodeBase64 = '';
      
      console.log('PIX QR Code text received:', qrCodeText ? `${qrCodeText.length} characters` : 'empty');
      console.log('PIX QR Code text preview:', qrCodeText.substring(0, 100));
      console.log('PIX QR Code full text:', qrCodeText);
      
      if (qrCodeText && qrCodeText.length > 30) {
        try {
          console.log('Generating QR code for PIX text...');
          
          // Validar se o texto PIX está no formato correto
          if (!qrCodeText.startsWith('00020126') && !qrCodeText.startsWith('00020101')) {
            console.log('Warning: PIX code does not start with expected format, but proceeding...');
          }
          
          // Configuração otimizada de QR Code
          const qrOptions = {
            width: 300,
            margin: 2,
            errorCorrectionLevel: 'M' as const,
            type: 'image/png' as const,
            color: { 
              dark: '#000000', 
              light: '#FFFFFF' 
            }
          };

          try {
            console.log('Gerando QR code com configuração otimizada...');
            qrCodeBase64 = await QRCode.toDataURL(qrCodeText, qrOptions);
            
            if (qrCodeBase64 && qrCodeBase64.startsWith('data:image/png;base64,')) {
              console.log('QR code gerado com sucesso!');
              console.log('Tamanho do QR code:', qrCodeBase64.length, 'caracteres');
              console.log('Preview:', qrCodeBase64.substring(0, 50) + '...');
            } else {
              console.error('QR code gerado mas formato inválido:', qrCodeBase64?.substring(0, 100));
              qrCodeBase64 = '';
            }
          } catch (qrError) {
            console.error('Erro ao gerar QR code:', qrError);
            // Tentar com configuração mais simples
            try {
              console.log('Tentando configuração simplificada...');
              qrCodeBase64 = await QRCode.toDataURL(qrCodeText, { 
                width: 250, 
                margin: 1,
                errorCorrectionLevel: 'L' as const
              });
              console.log('QR code gerado com configuração simplificada');
            } catch (fallbackError) {
              console.error('Fallback QR generation também falhou:', fallbackError);
              qrCodeBase64 = '';
            }
          }
        } catch (error) {
          console.error('Error generating QR code:', error);
          qrCodeBase64 = '';
        }
      } else {
        console.error('Invalid or too short PIX QR code text received:', qrCodeText?.length || 0, 'characters');
        qrCodeBase64 = '';
      }

      return {
        id: response.id?.toString() || '',
        status: response.status || '',
        qrCode: qrCodeText,
        qrCodeBase64: qrCodeBase64,
        pixCopyPaste: qrCodeText,
        expirationDate: response.date_of_expiration || '',
        amount: response.transaction_amount || 0
      };
    } catch (error) {
      console.error('Error creating PIX payment:', error);
      throw new Error('Failed to create PIX payment');
    }
  }

  async getPaymentStatus(paymentId: string) {
    if (!this.isConfigured()) {
      throw new Error('MercadoPago não configurado. Configure as credenciais para usar PIX.');
    }

    try {
      const response = await this.payment.get({ id: paymentId });
      return {
        id: response.id,
        status: response.status,
        status_detail: response.status_detail,
        transaction_amount: response.transaction_amount,
        date_approved: response.date_approved,
        external_reference: response.external_reference
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw new Error('Failed to get payment status');
    }
  }

  isConfigured(): boolean {
    return !!process.env.MERCADOPAGO_ACCESS_TOKEN && !!this.payment;
  }

  getPublicKey(): string {
    return process.env.MERCADOPAGO_PUBLIC_KEY || '';
  }

  private validateEmail(email?: string): string | null {
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? email : null;
  }

  private getBrazilExpirationDate(minutesToAdd: number): string {
    // Criar data atual UTC
    const now = new Date();
    
    // Adicionar os minutos de expiração
    const expirationUTC = new Date(now.getTime() + minutesToAdd * 60 * 1000);
    
    // O MercadoPago espera formato ISO UTC
    return expirationUTC.toISOString();
  }
}

export const mercadoPagoService = new MercadoPagoService();