import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Copy, 
  ArrowLeft, 
  Type,
  Plus,
  Search,
  Car,
  User,
  Scan
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import CameraCapture from "@/components/camera/camera-capture";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";

interface LicensePlateResult {
  plate: string;
  confidence: number;
  country: string;
  state?: string;
  isValid: boolean;
  format: string;
}

interface Vehicle {
  id: number;
  customerId: number;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  chassis?: string;
  engine?: string;
  fuelType: string;
  notes?: string;
}

interface Customer {
  id: number;
  name: string;
  document: string;
  phone: string;
  email: string;
}

export default function OCRPlateReader() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<LicensePlateResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualPlate, setManualPlate] = useState("");
  const [isProcessingManual, setIsProcessingManual] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isCheckingPlate, setIsCheckingPlate] = useState(false);
  const [plateExists, setPlateExists] = useState<Vehicle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImage(base64);
        setResult(null);
        setError(null);
        setShowActions(false);
        setPlateExists(null);
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
        setShowActions(false);
        setPlateExists(null);
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
      
      // Se a placa foi identificada com sucesso, mostrar ações
      if (data.isValid) {
        setShowActions(true);
      }
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
      
      // Se a placa foi validada com sucesso, mostrar ações
      if (data.isValid) {
        setShowActions(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsProcessingManual(false);
    }
  };

  const checkPlateInSystem = async (plate: string) => {
    setIsCheckingPlate(true);
    try {
      console.log('Checking plate in system:', plate);
      const response = await fetch('/api/vehicles');
      if (!response.ok) throw new Error('Erro ao buscar veículos');
      
      const vehicles = await response.json();
      console.log('All vehicles:', vehicles.length);
      
      const found = vehicles.find((v: Vehicle) => {
        const vehiclePlate = v.licensePlate.replace(/[^A-Z0-9]/g, '').toUpperCase();
        const searchPlate = plate.replace(/[^A-Z0-9]/g, '').toUpperCase();
        console.log('Comparing:', vehiclePlate, 'vs', searchPlate);
        return vehiclePlate === searchPlate;
      });
      
      console.log('Found vehicle:', found);
      
      if (found) {
        setPlateExists(found);
        toast({
          title: "Placa encontrada!",
          description: `Veículo ${found.brand} ${found.model} encontrado no sistema`,
        });
      } else {
        setPlateExists(null);
        toast({
          title: "Placa não encontrada",
          description: "Esta placa não está cadastrada no sistema",
        });
      }
    } catch (err) {
      console.error('Error checking plate:', err);
      toast({
        title: "Erro ao verificar placa",
        description: "Não foi possível verificar se a placa existe no sistema",
        variant: "destructive",
      });
      setPlateExists(null);
    } finally {
      setIsCheckingPlate(false);
    }
  };

  const handleNewVehicle = () => {
    if (result?.plate) {
      // Trigger event to open vehicle modal with pre-filled plate
      const event = new CustomEvent('openVehicleModal', {
        detail: { plate: result.plate }
      });
      window.dispatchEvent(event);
      
      // Also update URL for fallback
      setLocation(`/vehicles?plate=${encodeURIComponent(result.plate)}`);
    }
  };

  const handleViewExistingVehicle = () => {
    if (plateExists) {
      setLocation(`/vehicles?vehicleId=${plateExists.id}`);
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

  if (!user) {
    return null;
  }

  return (
    <div className="flex bg-gradient-to-br from-slate-100 via-white to-blue-50/30 h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Leitor de Placas OCR"
          subtitle="Reconhecimento automático de placas de veículos"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">

            

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <Scan className="h-5 w-5 text-emerald-600" />
                    Capturar Imagem
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Upload ou capture uma foto da placa do veículo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    <Button
                      onClick={() => setIsCameraOpen(true)}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
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
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/50">
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
                          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
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
                          className="border-gray-200 hover:bg-gray-50"
                        >
                          Limpar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Results Section */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    {result?.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : result ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <div className="h-5 w-5" />
                    )}
                    Resultado
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Informações extraídas da placa
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {error && (
                    <Alert className="mb-4 border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-red-700">{error}</AlertDescription>
                    </Alert>
                  )}

                  {result ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            Placa Identificada
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={copyPlateToClipboard}
                            className="hover:bg-gray-200"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-2xl font-bold font-mono text-gray-900">
                          {result.plate}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            Confiança
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
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
                          <label className="text-sm font-medium text-gray-600">
                            Formato
                          </label>
                          <p className="text-sm text-gray-900 mt-1">
                            {result.format}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            País
                          </label>
                          <p className="text-sm text-gray-900 mt-1">
                            {result.country}
                          </p>
                        </div>

                        {result.state && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Estado
                            </label>
                            <p className="text-sm text-gray-900 mt-1">
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

                      {/* Ações após processamento */}
                      {showActions && result.isValid && (
                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-medium text-gray-800">Próximas Ações</h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                console.log('Quick verify clicked for plate:', result.plate);
                                checkPlateInSystem(result.plate);
                              }}
                              disabled={isCheckingPlate || !result.plate}
                              className="text-blue-600 hover:text-blue-800"
                              title="Verificar se esta placa existe no sistema"
                            >
                              {isCheckingPlate ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            <Button
                              onClick={() => {
                                console.log('Cadastrar Novo Veículo clicked for plate:', result.plate);
                                handleNewVehicle();
                                toast({
                                  title: "Redirecionando...",
                                  description: `Abrindo formulário de cadastro com a placa ${result.plate}`,
                                });
                              }}
                              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Cadastrar Novo Veículo
                            </Button>
                            
                            <Button
                              onClick={() => {
                                console.log('Verificar no Sistema clicked for plate:', result.plate);
                                checkPlateInSystem(result.plate);
                              }}
                              variant="outline"
                              disabled={isCheckingPlate || !result.plate}
                              className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              {isCheckingPlate ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Verificando...
                                </>
                              ) : (
                                <>
                                  <Search className="h-4 w-4 mr-2" />
                                  Verificar no Sistema
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Digite uma placa manualmente ou carregue uma imagem</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Instructions */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Scan className="h-5 w-5 text-blue-400" />
                  Como usar o sistema
                </CardTitle>
                <CardDescription className="text-slate-200">
                  Siga os passos abaixo para processar placas de veículos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 bg-gradient-to-br from-slate-50 to-blue-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        1
                      </div>
                      <h4 className="font-semibold text-slate-800">Capturar Imagem</h4>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Use a câmera para fotografar ou faça upload de uma imagem da placa do veículo para reconhecimento automático
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        2
                      </div>
                      <h4 className="font-semibold text-slate-800">Processar e Usar</h4>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Após o processamento, cadastre um novo veículo ou verifique se a placa já existe no sistema
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Type className="h-4 w-4" />
                    <span className="font-medium text-sm">Dica:</span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Para melhores resultados, fotografe a placa em boa iluminação e mantenha a câmera estável
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Camera Capture Modal */}
        <CameraCapture
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onPhotoTaken={handleCameraPhoto}
          enableOCR={true}
        />

        {/* Modal de Placa Existente */}
        <Dialog open={!!plateExists} onOpenChange={() => setPlateExists(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-600" />
                Placa Encontrada no Sistema
              </DialogTitle>
              <DialogDescription>
                A placa {result?.plate} já está cadastrada no sistema.
              </DialogDescription>
            </DialogHeader>
            
            {plateExists && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Veículo:</span>
                      <p className="text-gray-900">{plateExists.brand} {plateExists.model}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Ano:</span>
                      <p className="text-gray-900">{plateExists.year}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Cor:</span>
                      <p className="text-gray-900">{plateExists.color}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Cliente:</span>
                      <p className="text-gray-900">
                        {customers.find(c => c.id === plateExists.customerId)?.name || 'Não encontrado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPlateExists(null)}
                className="border-gray-200 hover:bg-gray-50"
              >
                Fechar
              </Button>
              <Button
                onClick={handleViewExistingVehicle}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              >
                <User className="h-4 w-4 mr-2" />
                Ver Veículo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}