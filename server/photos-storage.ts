import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Photo {
  id: number;
  entity_type: string;
  entity_id: number;
  category: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  url: string;
  description?: string;
  uploaded_by?: number;
  created_at: Date;
}

export class PhotosStorage {
  async getPhotos(filters?: { customerId?: number; vehicleId?: number; serviceId?: number; category?: string }): Promise<Photo[]> {
    try {
      let query = 'SELECT * FROM photos WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      if (filters) {
        if (filters.customerId) {
          query += ` AND entity_type = 'customer' AND entity_id = $${paramIndex}`;
          values.push(filters.customerId);
          paramIndex++;
        }
        if (filters.vehicleId) {
          query += ` AND entity_type = 'vehicle' AND entity_id = $${paramIndex}`;
          values.push(filters.vehicleId);
          paramIndex++;
        }
        if (filters.serviceId) {
          query += ` AND entity_type = 'service' AND entity_id = $${paramIndex}`;
          values.push(filters.serviceId);
          paramIndex++;
        }
        if (filters.category) {
          query += ` AND category = $${paramIndex}`;
          values.push(filters.category);
          paramIndex++;
        }
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, values);
      
      // Converter o resultado para o formato esperado pelo frontend
      return result.rows.map(row => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        category: row.category,
        fileName: row.file_name,
        originalName: row.original_name,
        mimeType: row.mime_type,
        fileSize: row.file_size,
        url: row.url,
        description: row.description,
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error fetching photos:', error);
      return [];
    }
  }

  async createPhoto(entityType: string, entityId: number, photoData: {
    category: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    url: string;
    description?: string;
    uploadedBy?: number;
  }): Promise<Photo> {
    try {
      const query = `
        INSERT INTO photos (entity_type, entity_id, category, file_name, original_name, mime_type, file_size, url, description, uploaded_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *
      `;
      
      const values = [
        entityType,
        entityId || null, // Allow null for temporary photos
        photoData.category,
        photoData.fileName,
        photoData.originalName,
        photoData.mimeType,
        photoData.fileSize,
        photoData.url,
        photoData.description || null,
        photoData.uploadedBy || null
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating photo:', error);
      throw error;
    }
  }

  async deletePhoto(id: number): Promise<void> {
    try {
      await pool.query('DELETE FROM photos WHERE id = $1', [id]);
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  }
}

export const photosStorage = new PhotosStorage();