
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Plus, Trash2, Edit3, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CameraCapture from '@/components/camera/camera-capture';
import type { Photo } from '@shared/schema';

interface PhotoGalleryProps {
  customerId?: number;
  vehicleId?: number;
  serviceId?: number;
  title?: string;
  showAddButton?: boolean;
}

const categoryLabels = {
  vehicle: 'Veículo',
  service: 'Serviço', 
  damage: 'Dano',
  before: 'Antes',
  after: 'Depois',
  other: 'Outro'
};

const categoryColors = {
  vehicle: 'bg-blue-100 text-blue-800',
  service: 'bg-green-100 text-green-800',
  damage: 'bg-red-100 text-red-800',
  before: 'bg-yellow-100 text-yellow-800',
  after: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800'
};

export default function PhotoGallery({
  customerId,
  vehicleId,
  serviceId,
  title = "Fotos",
  showAddButton = true
}: PhotoGalleryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState({ category: '', description: '' });

  // Build query params
  const queryParams = new URLSearchParams();
  if (customerId) queryParams.append('customerId', customerId.toString());
  if (vehicleId) queryParams.append('vehicleId', vehicleId.toString());
  if (serviceId) queryParams.append('serviceId', serviceId.toString());

  const { data: photos = [], isLoading, refetch } = useQuery<Photo[]>({
    queryKey: ['/api/photos', queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/photos?${queryParams.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/photos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      refetch();
      toast({
        title: "Foto removida",
        description: "A foto foi removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/photos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/photos'] });
      setIsEditDialogOpen(false);
      setSelectedPhoto(null);
      toast({
        title: "Foto atualizada",
        description: "A foto foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoTaken = () => {
    refetch();
    setIsCameraOpen(false);
  };

  const handleEditPhoto = (photo: Photo) => {
    setSelectedPhoto(photo);
    setEditForm({
      category: photo.category || 'other',
      description: photo.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedPhoto) return;
    updateMutation.mutate({
      id: selectedPhoto.id,
      data: editForm
    });
  };

  const handleDeletePhoto = (photoId: number) => {
    if (confirm('Tem certeza que deseja remover esta foto?')) {
      deleteMutation.mutate(photoId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {showAddButton && (
          <Button
            onClick={() => setIsCameraOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <Camera className="h-4 w-4 mr-2" />
            Tirar Foto
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <Camera className="h-12 w-12 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma foto</h4>
          <p className="text-gray-600 mb-4">
            {showAddButton ? 'Comece tirando sua primeira foto.' : 'Nenhuma foto encontrada.'}
          </p>
          {showAddButton && (
            <Button
              onClick={() => setIsCameraOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              <Camera className="h-4 w-4 mr-2" />
              Tirar Primeira Foto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <img
                    src={photo.url}
                    alt={photo.description || 'Foto'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditPhoto(photo)}
                        className="text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePhoto(photo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={categoryColors[photo.category as keyof typeof categoryColors] || categoryColors.other}>
                      {categoryLabels[photo.category as keyof typeof categoryLabels] || 'Outro'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                  {photo.description && (
                    <p className="text-sm text-gray-600 truncate" title={photo.description}>
                      {photo.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoTaken={handlePhotoTaken}
        customerId={customerId}
        vehicleId={vehicleId}
        serviceId={serviceId}
      />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPhoto && (
              <>
                <div className="aspect-square rounded-lg overflow-hidden">
                  <img
                    src={selectedPhoto.url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Select
                    value={editForm.category}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Input
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva a foto..."
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
