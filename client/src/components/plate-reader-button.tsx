import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Scan, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CameraCapture from "@/components/camera/camera-capture";

interface LicensePlateResult {
  plate: string;
  confidence: number;
  country: string;
  state?: string;
  isValid: boolean;
  format: string;
}

interface PlateReaderButtonProps {
  onPlateDetected: (plate: string) => void;
  className?: string;
}

export default function PlateReaderButton({ onPlateDetected, className }: PlateReaderButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<LicensePlateResult | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImage(base64);
        processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraPhoto = (photoData: string) => {
    if (typeof photoData === 'string') {
      setImage(photoData);
      setIsCameraOpen(false);
      processImage(photoData);
    }
  };

  const processImage = async (base64Image: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/ocr/read-plate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64Image }),
      });

      if (!response.ok) {
        throw new Error('Erro ao processar a imagem');
      }

      const data = await response.json();
      setResult(data);
      
      if (data.isValid) {
        onPlateDetected(data.plate);
        setIsModalOpen(false);
        toast({
          title: "Placa detectada!",
          description: `Placa ${data.plate} inserida no campo`,
        });
      } else {
        toast({
          title: "Placa não reconhecida",
          description: "Não foi possível detectar uma placa válida na imagem",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erro no processamento",
        description: "Erro ao processar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setImage(null);
    setResult(null);
    setIsProcessing(false);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                resetModal();
                setIsModalOpen(true);
              }}
              className="h-8 w-8 p-0 text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scan className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ler placa com câmera</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-blue-600" />
              Leitor de Placas
            </DialogTitle>
            <DialogDescription>
              Capture ou faça upload de uma imagem da placa
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => document.getElementById('plate-upload')?.click()}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button
                onClick={() => setIsCameraOpen(true)}
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
                disabled={isProcessing}
              >
                <Camera className="h-4 w-4 mr-2" />
                Câmera
              </Button>
            </div>

            <input
              id="plate-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {image && (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <img
                  src={image}
                  alt="Imagem da placa"
                  className="w-full h-32 object-contain rounded"
                />
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">Processando imagem...</span>
              </div>
            )}

            {result && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold font-mono text-gray-900 mb-2">
                    {result.plate}
                  </div>
                  <div className="text-sm text-gray-600">
                    Confiança: {Math.round(result.confidence * 100)}% | {result.format}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoTaken={handleCameraPhoto}
        enableOCR={true}
      />
    </>
  );
}