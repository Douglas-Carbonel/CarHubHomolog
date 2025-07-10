
import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, X, RotateCcw, Check, Loader2, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LicensePlateResult {
  plate: string;
  confidence: number;
  country: string;
  state?: string;
  isValid: boolean;
  format: string;
}

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken: (photoData: {
    customerId?: number;
    vehicleId?: number;
    serviceId?: number;
    category: string;
    description?: string;
  } | string, category?: string) => void;
  customerId?: number;
  vehicleId?: number;
  serviceId?: number;
  enableOCR?: boolean;
}

export default function CameraCapture({
  isOpen,
  onClose,
  onPhotoTaken,
  customerId,
  vehicleId,
  serviceId,
  enableOCR = false
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [ocrResult, setOcrResult] = useState<LicensePlateResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreamActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Erro de câmera",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive",
      });
    }
  }, [facingMode, toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreamActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const processImageOCR = useCallback(async () => {
    if (!capturedImage || !enableOCR) return;
    
    setIsProcessing(true);
    setOcrError(null);
    
    try {
      const response = await fetch('/api/ocr/read-plate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64Image: capturedImage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 500 && errorData.message?.includes('quota')) {
          setOcrError('Limite de uso da API atingido. Use a entrada manual.');
        } else {
          throw new Error('Erro ao processar a imagem');
        }
        return;
      }

      const data = await response.json();
      setOcrResult(data);
      
      if (data.plate) {
        toast({
          title: "Placa detectada!",
          description: `Placa ${data.plate} foi identificada com ${Math.round(data.confidence * 100)}% de confiança`,
        });
      }
    } catch (err) {
      setOcrError('API temporariamente indisponível.');
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, enableOCR, toast]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setOcrResult(null);
    setOcrError(null);
    startCamera();
  }, [startCamera]);

  const switchCamera = useCallback(() => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (isStreamActive) {
      startCamera();
    }
  }, [facingMode, isStreamActive, startCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setDescription('');
    setCategory('other');
    setOcrResult(null);
    setOcrError(null);
    setIsProcessing(false);
    onClose();
  }, [stopCamera, onClose]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleSavePhoto = useCallback(async () => {
    if (!capturedImage) return;

    try {
      // For new services/vehicles without ID, store as temporary photo
      if (!serviceId && !vehicleId && !customerId) {
        onPhotoTaken(capturedImage, category);
        toast({
          title: "Foto capturada!",
          description: "A foto será salva quando o serviço for cadastrado.",
        });
        handleClose();
        return;
      }

      // For existing entities, upload directly
      // Convert data URL to blob with proper MIME type
      const byteCharacters = atob(capturedImage.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Create form data
      const formData = new FormData();
      formData.append('photo', blob, `camera_photo_${Date.now()}.jpg`);
      if (customerId) formData.append('customerId', customerId.toString());
      if (vehicleId) formData.append('vehicleId', vehicleId.toString());
      if (serviceId) formData.append('serviceId', serviceId.toString());
      formData.append('category', category);
      if (description) formData.append('description', description);

      // Upload photo
      const uploadResponse = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Failed to upload photo: ${uploadResponse.status}`);
      }

      const photo = await uploadResponse.json();
      
      onPhotoTaken({
        customerId,
        vehicleId,
        serviceId,
        category,
        description,
      });

      toast({
        title: "Foto salva",
        description: "A foto foi salva com sucesso.",
      });

      handleClose();
    } catch (error) {
      console.error('Error saving photo:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar a foto.",
        variant: "destructive",
      });
    }
  }, [capturedImage, customerId, vehicleId, serviceId, category, description, onPhotoTaken, toast, handleClose]);

  React.useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage, startCamera, stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden">
        <DialogHeader className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <DialogTitle className="flex items-center">
            <Camera className="h-5 w-5 mr-2" />
            Capturar Foto
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {!capturedImage ? (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {isStreamActive && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                    <Button
                      size="lg"
                      onClick={capturePhoto}
                      className="bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16"
                    >
                      <Camera className="h-8 w-8" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={switchCamera}
                      className="bg-white/80 text-black rounded-full"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* OCR Processing Section */}
              {enableOCR && (
                <div className="space-y-3">
                  {!ocrResult && !ocrError && !isProcessing && (
                    <Button
                      onClick={processImageOCR}
                      className="w-full"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Processar Placa (OCR)
                    </Button>
                  )}

                  {isProcessing && (
                    <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      <span>Processando imagem...</span>
                    </div>
                  )}

                  {ocrError && (
                    <Alert>
                      <X className="h-4 w-4" />
                      <AlertDescription>{ocrError}</AlertDescription>
                    </Alert>
                  )}

                  {ocrResult && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Placa Identificada
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setOcrResult(null)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                        {ocrResult.plate}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Confiança
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${getConfidenceColor(ocrResult.confidence)}`}
                                style={{ width: `${ocrResult.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {Math.round(ocrResult.confidence * 100)}%
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Formato
                          </label>
                          <p className="text-xs text-gray-900 dark:text-white mt-1">
                            {ocrResult.format}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={ocrResult.isValid ? "default" : "destructive"} className="text-xs">
                          {ocrResult.isValid ? "Válida" : "Inválida"}
                        </Badge>
                        {ocrResult.confidence >= 0.8 && (
                          <Badge variant="secondary" className="text-xs">Alta Confiança</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vehicle">Veículo</SelectItem>
                      <SelectItem value="service">Serviço</SelectItem>
                      <SelectItem value="damage">Dano</SelectItem>
                      <SelectItem value="before">Antes</SelectItem>
                      <SelectItem value="after">Depois</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva a foto..."
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Capturar Novamente
                </Button>
                <Button
                  onClick={handleSavePhoto}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
