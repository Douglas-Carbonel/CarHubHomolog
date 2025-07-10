import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, X, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Photo } from '@shared/schema';

interface PhotoUploadProps {
  photos: Photo[];
  onPhotoUploaded: () => void;
  customerId?: number;
  vehicleId?: number;
  serviceId?: number;
  maxPhotos?: number;
  hideUploadButton?: boolean;
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

// Function to compress image
const compressImage = (file: File, maxWidth: number = 480, quality: number = 0.7): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxWidth) {
          width = (width * maxWidth) / height;
          height = maxWidth;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

export default function PhotoUpload({
  photos,
  onPhotoUploaded,
  customerId,
  vehicleId,
  serviceId,
  maxPhotos = 7,
  hideUploadButton = false
}: PhotoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ category: '', description: '' });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if ((photos?.length || 0) + files.length > maxPhotos) {
      toast({
        title: "Limite de fotos excedido",
        description: `Máximo de ${maxPhotos} fotos permitidas.`,
        variant: "destructive",
      });
      return;
    }

    // Se não temos vehicleId (criando novo veículo), mostrar aviso
    if (!vehicleId && !customerId && !serviceId) {
      toast({
        title: "Salve o veículo primeiro",
        description: "É necessário salvar o veículo antes de adicionar fotos.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Arquivo inválido",
            description: "Apenas imagens são permitidas.",
            variant: "destructive",
          });
          continue;
        }

        // Compress image
        const compressedFile = await compressImage(file);

        const formData = new FormData();
        formData.append('photo', compressedFile);
        formData.append('category', 'vehicle');
        formData.append('description', '');

        // Use specific route based on entity type
        let uploadUrl = '/api/photos/upload';
        if (vehicleId) {
          uploadUrl = `/api/vehicles/${vehicleId}/photos`;
        } else if (customerId) {
          formData.append('customerId', customerId.toString());
        } else if (serviceId) {
          formData.append('serviceId', serviceId.toString());
        }

        const res = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`${res.status}: ${errorText}`);
        }
      }

      toast({
        title: "Fotos enviadas",
        description: "As fotos foram enviadas com sucesso.",
      });

      onPhotoUploaded();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleEditPhoto = (photo: Photo) => {
    setSelectedPhoto(photo);
    setEditForm({
      category: photo.category || 'other',
      description: photo.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPhoto) return;

    try {
      const res = await fetch(`/api/photos/${selectedPhoto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);

      toast({
        title: "Foto atualizada",
        description: "A foto foi atualizada com sucesso.",
      });

      setIsEditDialogOpen(false);
      setSelectedPhoto(null);
      onPhotoUploaded();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm('Tem certeza que deseja remover esta foto?')) return;

    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);

      toast({
        title: "Foto removida",
        description: "A foto foi removida com sucesso.",
      });

      onPhotoUploaded();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button - only show if we have a vehicleId or if explicitly allowed and not hidden */}
      {!hideUploadButton && (vehicleId || customerId || serviceId) && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('photo-upload-input')?.click()}
            disabled={uploading || (photos?.length || 0) >= maxPhotos}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Enviando...' : 'Adicionar Fotos'}
          </Button>
          <input
            id="photo-upload-input"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {(photos?.length || 0) === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {vehicleId || customerId || serviceId 
              ? "Nenhuma foto adicionada" 
              : "Salve o item primeiro para adicionar fotos"
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <Card className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                          <div className="relative aspect-square">
                            <img
                              src={photo.url}
                              alt={photo.description || 'Foto'}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex space-x-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditPhoto(photo);
                                  }}
                                  className="text-white bg-blue-600 hover:bg-blue-700 h-8 w-8 p-0"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeletePhoto(photo.id);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="p-2">
                            <Badge className={`${categoryColors[photo.category as keyof typeof categoryColors] || categoryColors.other} text-xs`}>
                              {categoryLabels[photo.category as keyof typeof categoryLabels] || 'Outro'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
        </div>
      )}

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
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    className="flex-1"
                  >
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