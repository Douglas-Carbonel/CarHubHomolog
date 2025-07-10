
export interface LicensePlateResult {
  plate: string;
  confidence: number;
  country: string;
  state?: string;
  isValid: boolean;
  format: string;
}

export class PlateRecognizerService {
  private apiKey: string;
  private baseUrl = 'https://api.platerecognizer.com/v1/plate-reader/';

  constructor() {
    this.apiKey = process.env.PLATE_RECOGNIZER_API_KEY || '';
  }

  async readLicensePlate(base64Image: string): Promise<LicensePlateResult> {
    try {
      // Remove data URL prefix if present
      const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
      formData.append('upload', blob, 'image.jpg');
      formData.append('regions', 'br'); // Focus on Brazilian plates
      formData.append('camera_id', 'carhub-ocr');

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Plate Recognizer API error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Plate Recognizer full response:', JSON.stringify(data, null, 2));
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const plateText = result.plate.toUpperCase();
        const confidence = result.score || 0;
        
        console.log('Plate Recognizer extracted plate:', plateText, 'confidence:', confidence);
        
        // Validate Brazilian plate format
        const isValid = this.validateBrazilianPlate(plateText);
        const format = this.getPlateFormat(plateText);
        
        return {
          plate: plateText,
          confidence: confidence,
          country: 'Brasil',
          state: result.region?.code || '',
          isValid: isValid,
          format: format
        };
      }

      // If no plate found, return invalid result
      return {
        plate: '',
        confidence: 0,
        country: 'Brasil',
        isValid: false,
        format: 'Desconhecido'
      };

    } catch (error) {
      console.error('Error in Plate Recognizer service:', error);
      throw new Error('Erro ao processar a imagem da placa: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  private validateBrazilianPlate(plate: string): boolean {
    if (!plate || typeof plate !== 'string') return false;
    
    const cleanPlate = plate.replace(/[^A-Z0-9]/g, '');
    
    // Formato antigo: ABC1234
    const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
    
    // Formato Mercosul: ABC1D23
    const mercosulFormat = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
    
    return oldFormat.test(cleanPlate) || mercosulFormat.test(cleanPlate);
  }

  private getPlateFormat(plate: string): string {
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

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const plateRecognizerService = new PlateRecognizerService();
