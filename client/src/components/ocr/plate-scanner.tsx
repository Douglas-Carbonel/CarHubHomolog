import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Upload, CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CameraCapture from "@/components/camera/camera-capture";

interface LicensePlateResult {
  plate: string;
  confidence: number;
  country: string;
  state?: string;
  isValid: boolean;
  format: string;
}

interface PlateScannerProps {
  onPlateDetected: (plate: string) => void;
  trigger?: React.ReactNode;
}

export default function PlateScanner({ onPlateDetected, trigger }: PlateScannerProps) {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<LicensePlateResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImage(base64);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImage(base64);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ocr/read-plate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64Image: image }),
      });

      if (!response.ok) {
        throw new Error('Erro ao processar a imagem');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsProcessing(false);
    }
  };

  const usePlate = () => {
    if (result?.plate) {
      onPlateDetected(result.plate);
      setOpen(false);
      clearAll();
      toast({
        title: "Placa detectada!",
        description: `Placa ${result.plate} foi adicionada ao formulário`,
      });
    }
  };

  const clearAll = () => {
    setImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleCameraPhoto = (photoData: string) => {
    if (typeof photoData === 'string') {
      setImage(photoData);
      setResult(null);
      setError(null);
      setIsCameraOpen(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Camera className="h-4 w-4" />
      Escanear Placa
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Placa do Veículo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Capturar Imagem</CardTitle>
              <CardDescription>
                Faça upload ou tire uma foto da placa do veículo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <Button
                  onClick={() => setIsCameraOpen(true)}
                  className="flex-1"
                  variant="outline"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Câmera
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="camera"
                onChange={handleCameraCapture}
                className="hidden"
              />

              {image && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <img
                      src={image}
                      alt="Imagem da placa"
                      className="w-full h-48 object-contain rounded"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={processImage}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        'Processar Imagem'
                      )}
                    </Button>
                    <Button
                      onClick={clearAll}
                      variant="outline"
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          {(result || error) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result?.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : result ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <div className="h-5 w-5" />
                  )}
                  Resultado
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="mb-4">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {result && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Placa Identificada
                      </span>
                      <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                        {result.plate}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Confiança
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getConfidenceColor(result.confidence)}`}
                              style={{ width: `${result.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round(result.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Formato
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {result.format}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={result.isValid ? "default" : "destructive"}>
                        {result.isValid ? "Placa Válida" : "Placa Inválida"}
                      </Badge>
                      {result.confidence >= 0.8 && (
                        <Badge variant="secondary">Alta Confiança</Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={usePlate}
                        disabled={!result.isValid}
                        className="flex-1"
                      >
                        Usar Esta Placa
                      </Button>
                      <Button
                        onClick={clearAll}
                        variant="outline"
                      >
                        Tentar Novamente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoTaken={handleCameraPhoto}
        enableOCR={true}
      />
    </Dialog>
  );
}