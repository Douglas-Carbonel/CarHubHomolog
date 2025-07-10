
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ServiceData {
  id?: number;
  customer: { name: string };
  vehicle: { brand: string; model: string; licensePlate: string };
  scheduledDate?: string;
  scheduledTime?: string;
  status: string;
  technician: { firstName: string; lastName: string };
  serviceExtras: Array<{
    serviceName: string;
    price: string;
    notes?: string;
  }>;
  totalValue: string;
  valorPago: string;
  notes?: string;
}

export const generateServicePDF = async (serviceData: ServiceData, isSchedule: boolean = false) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Cores do design
  const primaryGreen = [139, 195, 74]; // #8BC34A
  const darkGray = [66, 66, 66]; // #424242
  const lightGray = [245, 245, 245]; // #F5F5F5
  const mediumGray = [224, 224, 224]; // #E0E0E0

  // ===== CABEÇALHO COM LOGO E TÍTULO =====
  
  // Fundo cinza escuro no topo
  pdf.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.rect(0, 0, pageWidth, 50, 'F');

  // Logo CARHUB (texto estilizado)
  pdf.setFillColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('CARHUB', 20, 32);

  // Título principal simplificado
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Ordem de Serviço', pageWidth - 20, 25, { align: 'right' });

  // Data da ordem
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const currentDate = new Date().toLocaleDateString('pt-BR');
  pdf.text(`Data da Ordem: ${currentDate}`, pageWidth - 20, 38, { align: 'right' });

  // ===== FAIXA VERDE =====
  pdf.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  pdf.rect(0, 50, pageWidth, 8, 'F');

  // ===== NÚMERO DA ORDEM =====
  let yPosition = 70;
  
  // Fundo cinza claro para número da ordem
  pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.rect(20, yPosition - 5, 60, 15, 'F');
  pdf.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  pdf.rect(20, yPosition - 5, 60, 15);

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text('Nº da Ordem', 25, yPosition + 2);

  pdf.setFont('helvetica', 'normal');
  const orderNumber = serviceData.id ? `OS${String(serviceData.id).padStart(6, '0')}` : `OS${Date.now().toString().slice(-6)}`;
  pdf.text(orderNumber, 25, yPosition + 8);

  yPosition += 30;

  // ===== INFORMAÇÕES DO CLIENTE =====
  
  // Título da seção
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text('Informações do Cliente', 20, yPosition);
  
  // Linha verde sob o título
  pdf.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  pdf.setLineWidth(2);
  pdf.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
  
  yPosition += 15;

  // Fundo cinza claro para informações
  pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.rect(20, yPosition - 5, pageWidth - 40, 35, 'F');
  pdf.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  pdf.rect(20, yPosition - 5, pageWidth - 40, 35);

  // Informações do cliente em duas colunas
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  
  // Coluna esquerda
  pdf.text('Nome', 25, yPosition + 5);
  pdf.text('Telefone', 25, yPosition + 15);
  pdf.text('Endereço', 25, yPosition + 25);

  // Coluna direita
  pdf.text('E-mail', pageWidth/2 + 10, yPosition + 5);

  // Valores
  pdf.setFont('helvetica', 'normal');
  pdf.text(serviceData.customer.name, 60, yPosition + 5);
  pdf.text('(11) 0000-0000', 60, yPosition + 15);
  pdf.text('Endereço não informado', 60, yPosition + 25);
  pdf.text('cliente@email.com', pageWidth/2 + 40, yPosition + 5);

  yPosition += 50;

  // ===== DESCRIÇÃO DO VEÍCULO =====
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text('Descrição do Veículo', 20, yPosition);
  
  // Linha verde sob o título
  pdf.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  pdf.setLineWidth(2);
  pdf.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
  
  yPosition += 15;

  // ===== FAIXA VERDE PARA CABEÇALHO DA TABELA =====
  pdf.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  pdf.rect(20, yPosition - 5, pageWidth - 40, 12, 'F');

  // Cabeçalhos da tabela do veículo
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Ano', 25, yPosition + 2);
  pdf.text('Modelo', 80, yPosition + 2);
  pdf.text('Serviços', 130, yPosition + 2);

  yPosition += 12;

  // Calcula a altura necessária para o box baseado no número de serviços
  const numServices = Math.min(serviceData.serviceExtras.length, 5);
  const boxHeight = 60 + (numServices * 8); // Altura base + altura por serviço
  
  // Fundo cinza claro para dados do veículo
  pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.rect(20, yPosition, pageWidth - 40, boxHeight, 'F');
  pdf.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  pdf.rect(20, yPosition, pageWidth - 40, boxHeight);

  // Dados do veículo - Primeira linha
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  
  const currentYear = new Date().getFullYear();
  pdf.text(currentYear.toString(), 25, yPosition + 10);
  pdf.text(`${serviceData.vehicle.brand} ${serviceData.vehicle.model}`, 80, yPosition + 10);

  // Lista todos os serviços
  let serviceTypeY = yPosition + 10;
  const maxWidth = 60; // Largura máxima da coluna "Serviços"
  
  serviceData.serviceExtras.forEach((service, index) => {
    if (index < 5 && serviceTypeY < yPosition + boxHeight - 15) { // Máximo 5 serviços
      const serviceName = `& ${service.serviceName}`;
      
      // Quebra o texto se for muito longo para a coluna
      const textLines = pdf.splitTextToSize(serviceName, maxWidth);
      
      if (Array.isArray(textLines) && textLines.length > 0) {
        pdf.text(textLines[0], 130, serviceTypeY);
      } else {
        pdf.text(serviceName, 130, serviceTypeY);
      }
      
      serviceTypeY += 8;
    }
  });

  // Segunda linha - Cor e Quilometragem
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Cor', 25, yPosition + 25);
  pdf.text('Quilometragem', 80, yPosition + 25);

  pdf.setFont('helvetica', 'normal');
  pdf.text('Não informado', 25, yPosition + 35);
  pdf.text('000000', 80, yPosition + 35);

  // Terceira linha - Marca e Placa (dentro do box)
  pdf.setFont('helvetica', 'bold');
  pdf.text('Marca', 25, yPosition + 45);
  pdf.text('Placa', 80, yPosition + 45);

  pdf.setFont('helvetica', 'normal');
  pdf.text(serviceData.vehicle.brand, 25, yPosition + 52);
  pdf.text(serviceData.vehicle.licensePlate, 80, yPosition + 52);

  yPosition += boxHeight + 10;

  // ===== FAIXA VERDE PARA SEPARAÇÃO =====
  pdf.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  pdf.rect(0, yPosition, pageWidth, 8, 'F');
  
  yPosition += 20;

  // ===== OBSERVAÇÕES ADICIONAIS =====
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text('Observações Adicionais', 20, yPosition);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Comentários extras:', 20, yPosition + 10);
  
  yPosition += 20;

  // Caixa para observações
  pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.rect(20, yPosition, pageWidth - 40, 40, 'F');
  pdf.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  pdf.rect(20, yPosition, pageWidth - 40, 40);

  // Texto das observações
  const observationsText = serviceData.notes || 
    'Ao assinar abaixo, autorizo a Empresa a consertar ou substituir peças sobressalentes para que meu veículo volte à situação anterior ao dano. Concordo que a Empresa não é responsável por qualquer perda/dano ao meu veículo causada por incêndio, roubo ou qualquer outra causa fora de seu controle.';

  const splitText = pdf.splitTextToSize(observationsText, pageWidth - 50);
  pdf.text(splitText, 25, yPosition + 10);

  yPosition += 60;

  // ===== RESUMO FINANCEIRO =====
  
  if (serviceData.serviceExtras.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text('RESUMO FINANCEIRO', 20, yPosition);
    
    pdf.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    pdf.setLineWidth(2);
    pdf.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
    
    yPosition += 15;

    // Tabela de serviços
    serviceData.serviceExtras.forEach((service, index) => {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${index + 1}. ${service.serviceName}`, 25, yPosition);
      pdf.text(`R$ ${Number(service.price).toFixed(2)}`, pageWidth - 60, yPosition);
      yPosition += 8;
    });

    yPosition += 10;

    // Total
    pdf.setDrawColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.setLineWidth(1);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL:', 25, yPosition);
    pdf.text(`R$ ${Number(serviceData.totalValue).toFixed(2)}`, pageWidth - 60, yPosition);
    pdf.text('PAGO:', 25, yPosition + 10);
    pdf.text(`R$ ${Number(serviceData.valorPago).toFixed(2)}`, pageWidth - 60, yPosition + 10);
    
    const saldo = Number(serviceData.totalValue) - Number(serviceData.valorPago);
    pdf.text('SALDO:', 25, yPosition + 20);
    pdf.text(`R$ ${saldo.toFixed(2)}`, pageWidth - 60, yPosition + 20);

    yPosition += 40;
  }

  // Informações técnicas no final
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text(`Técnico responsável: ${serviceData.technician.firstName} ${serviceData.technician.lastName}`, 20, yPosition);
  pdf.text(`Data: ${serviceData.scheduledDate ? new Date(serviceData.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR') : currentDate}`, 20, yPosition + 8);
  if (serviceData.scheduledTime) {
    pdf.text(`Horário: ${serviceData.scheduledTime}`, 20, yPosition + 16);
  }

  // Rodapé com mais espaçamento
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, pageHeight - 25, { align: 'center' });

  // Salvar o PDF
  const filename = isSchedule 
    ? `agendamento-${serviceData.customer.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`
    : `ordem-servico-${serviceData.customer.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
    
  pdf.save(filename);
};
