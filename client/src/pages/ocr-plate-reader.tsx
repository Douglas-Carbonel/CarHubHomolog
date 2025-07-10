import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, CheckCircle, XCircle, Loader2, Copy, ArrowLeft, Type } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import CameraCapture from "@/components/camera/camera-capture";

interface LicensePlateResult {
  plate: string;
  confidence: number;
  country: string;
  state?: string;
  isValid: boolean;
  format: string;
}

export default function OCRPlateReader() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<LicensePlateResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualPlate, setManualPlate] = useState("");
  const [isProcessingManual, setIsProcessingManual] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useLocation();
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
        const errorData = await response.json();
        if (response.status === 500 && errorData.message?.includes('quota')) {
          setError('Limite de uso da API atingido. Use a entrada manual abaixo.');
        } else {
          throw new Error('Erro ao processar a imagem');
        }
        return;
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('API temporariamente indisponível. Use a entrada manual abaixo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processManualPlate = async () => {
    if (!manualPlate.trim()) return;
    
    setIsProcessingManual(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ocr/read-plate-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plateText: manualPlate }),
      });

      if (!response.ok) {
        throw new Error('Erro ao processar a placa');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsProcessingManual(false);
    }
  };

  const handleCameraPhoto = (photoData: string) => {
    if (typeof photoData === 'string') {
      setImage(photoData);
      setResult(null);
      setError(null);
      setIsCameraOpen(false);
    }
  };

  const copyPlateToClipboard = () => {
    if (result?.plate) {
      navigator.clipboard.writeText(result.plate);
      toast({
        title: "Copiado!",
        description: "Placa copiada para a área de transferência",
      });
    }
  };

  const clearAll = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setManualPlate("");
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Leitor de Placas OCR
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Reconhecimento automático de placas de veículos
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Manual Entry Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Entrada Manual
              </CardTitle>
              <CardDescription>
                Digite a placa do veículo para validação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-plate">Placa do Veículo</Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-plate"
                    placeholder="Ex: ABC1234 ou ABC1D23"
                    value={manualPlate}
                    onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                    className="flex-1"
                    maxLength={7}
                  />
                  <Button
                    onClick={processManualPlate}
                    disabled={isProcessingManual || !manualPlate.trim()}
                  >
                    {isProcessingManual ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      'Validar'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Capturar Imagem (OCR Gratuito)
                </CardTitle>
                <CardDescription>
                  Faça upload ou tire uma foto - usando OCR.Space API gratuita (25.000 usos/mês)
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
                        Limpar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Section */}
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
                <CardDescription>
                  Informações extraídas da placa
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="mb-4">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {result ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Placa Identificada
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={copyPlateToClipboard}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
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

                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          País
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {result.country}
                        </p>
                      </div>

                      {result.state && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Estado
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {result.state}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={result.isValid ? "default" : "destructive"}>
                        {result.isValid ? "Placa Válida" : "Placa Inválida"}
                      </Badge>
                      {result.confidence >= 0.8 && (
                        <Badge variant="secondary">Alta Confiança</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Digite uma placa manualmente ou carregue uma imagem</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Como usar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">1. Entrada Manual</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Digite a placa diretamente para validação instantânea
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">2. Captura de Imagem</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Use a câmera ou faça upload para reconhecimento automático gratuito
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">3. Use o resultado</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Copie a placa identificada ou use nos cadastros do sistema
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Camera Capture Modal */}
        <CameraCapture
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onPhotoTaken={handleCameraPhoto}
          enableOCR={true}
        />
      </div>
    </div>
  );
}