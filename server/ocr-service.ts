import OpenAI from "openai";
import { plateRecognizerService } from './plate-recognizer-service.js';
import { freeOCRService } from './free-ocr-service.js';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LicensePlateResult {
  plate: string;
  confidence: number;
  country: string;
  state?: string;
  isValid: boolean;
  format: string;
}

export class OCRService {
  async readLicensePlate(base64Image: string): Promise<LicensePlateResult> {
    // Try Plate Recognizer API first (best accuracy for license plates)
    if (plateRecognizerService.isConfigured()) {
      try {
        console.log('Using Plate Recognizer API for license plate recognition');
        const plateResult = await plateRecognizerService.readLicensePlate(base64Image);
        
        // If Plate Recognizer returned a valid result with good confidence, use it
        if (plateResult.isValid && plateResult.confidence >= 0.7) {
          console.log('Plate Recognizer returned valid result:', plateResult);
          return plateResult;
        } else {
          console.log('Plate Recognizer result has low confidence or invalid, trying fallback:', plateResult);
          // Fall through to backup services
        }
      } catch (error) {
        console.error('Plate Recognizer service failed, falling back:', error);
        // Fall through to backup services
      }
    }

    // Try free OCR.Space API as fallback
    if (freeOCRService.isConfigured()) {
      try {
        console.log('Using free OCR.Space API as fallback');
        const freeResult = await freeOCRService.readLicensePlate(base64Image);
        
        // If OCR.Space returned a valid result with good confidence, use it
        if (freeResult.isValid && freeResult.confidence >= 0.8) {
          console.log('OCR.Space returned valid result:', freeResult);
          return freeResult;
        } else {
          console.log('OCR.Space result has low confidence or invalid, trying OpenAI:', freeResult);
          // Fall through to OpenAI for better accuracy
        }
      } catch (error) {
        console.error('Free OCR service failed, falling back to OpenAI:', error);
        // Fall through to OpenAI if free service fails
      }
    }

    // Fallback to OpenAI if free service is not available or fails
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em reconhecimento de placas de veículos brasileiros. 
            Analise a imagem e extraia APENAS a placa do veículo. 
            Responda em JSON com este formato exato:
            {
              "plate": "ABC1234",
              "confidence": 0.95,
              "country": "Brazil",
              "state": "SP",
              "isValid": true,
              "format": "Mercosul"
            }
            
            Formatos brasileiros:
            - Antigo: ABC1234 (3 letras + 4 números)
            - Mercosul: ABC1D23 (3 letras + 1 número + 1 letra + 2 números)
            
            Se não conseguir identificar uma placa, retorne confidence: 0 e isValid: false.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identifique a placa do veículo nesta imagem e retorne apenas o JSON solicitado."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Validate and format the result
      return {
        plate: result.plate?.toUpperCase() || "",
        confidence: Math.max(0, Math.min(1, result.confidence || 0)),
        country: result.country || "Brazil",
        state: result.state || "",
        isValid: result.isValid || false,
        format: result.format || "Desconhecido"
      };
    } catch (error) {
      console.error("Error in OCR service:", error);
      throw new Error("Falha ao processar a imagem da placa: " + (error instanceof Error ? error.message : String(error)));
    }
  }

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
}

export const ocrService = new OCRService();