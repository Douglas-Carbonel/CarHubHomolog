import { localOCRService, LicensePlateResult } from './local-ocr-service.js';

export class FreeOCRService {
  private apiKey: string;
  private baseUrl = 'https://api.ocr.space/parse/image';

  constructor() {
    this.apiKey = process.env.OCR_SPACE_API_KEY || '';
  }

  async readLicensePlate(base64Image: string): Promise<LicensePlateResult> {
    try {
      // Remove data URL prefix if present
      const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const formData = new FormData();
      formData.append('apikey', this.apiKey);
      formData.append('base64Image', `data:image/jpeg;base64,${base64Data}`);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'true');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');
      formData.append('isTable', 'false');
      formData.append('filetype', 'jpg');

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR.Space API error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('OCR.Space full response:', JSON.stringify(data, null, 2));
      
      if (!data.IsErroredOnProcessing && data.ParsedResults && data.ParsedResults.length > 0) {
        const extractedText = data.ParsedResults[0].ParsedText;
        console.log('OCR.Space extracted text:', extractedText);
        
        // Extract potential license plate from text
        const plateMatch = this.extractPlateFromText(extractedText);
        console.log('Extracted plate match:', plateMatch);
        
        if (plateMatch) {
          // Use local validation for the extracted plate
          const result = await localOCRService.readLicensePlateLocal(plateMatch);
          console.log('Final OCR result:', result);
          return result;
        }
      } else {
        console.log('OCR.Space processing failed or no results:', data);
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
      console.error('Error in Free OCR service:', error);
      throw new Error('Erro ao processar a imagem da placa');
    }
  }

  private extractPlateFromText(text: string): string | null {
    if (!text) return null;
    
    console.log('OCR Raw text received:', text);
    
    // Remove line breaks and normalize spaces, then convert to uppercase
    const normalizedText = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').toUpperCase();
    console.log('Normalized text:', normalizedText);
    
    // Extract all possible alphanumeric sequences
    const allMatches = normalizedText.match(/[A-Z0-9]+/g) || [];
    console.log('All alphanumeric matches:', allMatches);
    
    // Brazilian license plate patterns (more flexible)
    const patterns = [
      /([A-Z]{3}[0-9][A-Z][0-9]{2})/g, // Mercosul: ABC1D23 (prioritize Mercosul)
      /([A-Z]{3}[0-9]{4})/g,           // Old format: ABC1234
      /([A-Z]{3}\s*-?\s*[0-9][A-Z][0-9]{2})/g, // Mercosul with spaces/dash
      /([A-Z]{3}\s*-?\s*[0-9]{4})/g,   // Old format with spaces/dash
    ];

    // Try each pattern
    for (const pattern of patterns) {
      const matches = normalizedText.match(pattern);
      if (matches && matches.length > 0) {
        const plate = matches[0].replace(/[\s-]/g, '');
        console.log('Pattern matched:', pattern, 'Result:', plate);
        return plate;
      }
    }

    // Try to find sequences that could be plates in the individual matches
    for (const match of allMatches) {
      // Check if it could be a Mercosul plate (7 chars: 3 letters + 1 number + 1 letter + 2 numbers)
      if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(match)) {
        console.log('Found Mercosul plate in matches:', match);
        return match;
      }
      // Check if it could be an old format plate (7 chars: 3 letters + 4 numbers)
      if (/^[A-Z]{3}[0-9]{4}$/.test(match)) {
        console.log('Found old format plate in matches:', match);
        return match;
      }
    }

    console.log('No plate pattern found in text');
    return null;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const freeOCRService = new FreeOCRService();