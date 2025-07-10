export interface LicensePlateResult {
  plate: string;
  confidence: number;
  country: string;
  state?: string;
  isValid: boolean;
  format: string;
}

export class LocalOCRService {
  async validateBrazilianPlate(plate: string): Promise<boolean> {
    if (!plate || typeof plate !== 'string') return false;
    
    const cleanPlate = plate.replace(/[^A-Z0-9]/g, '');
    
    // Formato antigo: ABC1234
    const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
    
    // Formato Mercosul: ABC1D23
    const mercosulFormat = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
    
    return oldFormat.test(cleanPlate) || mercosulFormat.test(cleanPlate);
  }

  formatPlateDisplay(plate: string): string {
    if (!plate) return "";
    
    const cleanPlate = plate.replace(/[^A-Z0-9]/g, '');
    
    // Formato antigo: ABC-1234
    if (/^[A-Z]{3}[0-9]{4}$/.test(cleanPlate)) {
      return `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3)}`;
    }
    
    // Formato Mercosul: ABC1D23
    if (/^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/.test(cleanPlate)) {
      return `${cleanPlate.slice(0, 3)}${cleanPlate.slice(3, 4)}${cleanPlate.slice(4, 5)}${cleanPlate.slice(5)}`;
    }
    
    return cleanPlate;
  }

  getPlateFormat(plate: string): string {
    if (!plate) return "Desconhecido";
    
    const cleanPlate = plate.replace(/[^A-Z0-9]/g, '');
    
    if (/^[A-Z]{3}[0-9]{4}$/.test(cleanPlate)) {
      return "Antigo (ABC1234)";
    }
    
    if (/^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/.test(cleanPlate)) {
      return "Mercosul (ABC1D23)";
    }
    
    return "Formato inválido";
  }

  // Função simulada para OCR local (sem IA)
  async readLicensePlateLocal(input: string): Promise<LicensePlateResult> {
    // Para uso local, esperamos que o usuário digite a placa manualmente
    // Esta função pode ser expandida futuramente com bibliotecas de OCR locais
    
    const cleanPlate = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const isValid = await this.validateBrazilianPlate(cleanPlate);
    const format = this.getPlateFormat(cleanPlate);
    
    return {
      plate: cleanPlate,
      confidence: 1.0, // 100% de confiança para entrada manual
      country: "Brazil",
      state: "", // Não detectamos estado localmente
      isValid,
      format
    };
  }
}

export const localOCRService = new LocalOCRService();