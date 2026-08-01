import { getSupabaseClient, isSupabaseConfigured } from "./SupabaseClient.js";

/**
 * Supabase Storage Integration
 * Handles file uploads, downloads, and management with tenant isolation
 */
export class SupabaseStorage {
  constructor() {
    this.client = getSupabaseClient();
    this.configured = isSupabaseConfigured;
  }

  /**
   * Upload a file to a storage bucket
   */
  async uploadFile({
    bucket,
    path,
    file,
    options = {},
    tenantContext,
  }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    // Prefix path with tenant context for isolation
    const isolatedPath = this.isolatePath(path, tenantContext);

    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(isolatedPath, file, {
        cacheControl: options.cacheControl || '3600',
        upsert: options.upsert || false,
        contentType: options.contentType || file.type,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    return {
      path: isolatedPath,
      fullPath: data.path,
      bucket,
      metadata: data,
    };
  }

  /**
   * Download a file from storage
   */
  async downloadFile({ bucket, path, tenantContext }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const isolatedPath = this.isolatePath(path, tenantContext);

    const { data, error } = await this.client.storage
      .from(bucket)
      .download(isolatedPath);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return {
      file: data,
      path: isolatedPath,
      bucket,
    };
  }

  /**
   * Get a public URL for a file
   */
  async getPublicUrl({ bucket, path, tenantContext }) {
    void bucket;
    void path;
    void tenantContext;
    throw new Error("Public storage URLs are disabled. Use a short-lived signed URL.");
  }

  /**
   * Get a signed URL for a file (temporary access)
   */
  async getSignedUrl({ bucket, path, expiresIn = 60, tenantContext }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const isolatedPath = this.isolatePath(path, tenantContext);

    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(isolatedPath, expiresIn);

    if (error) {
      throw new Error(`Signed URL creation failed: ${error.message}`);
    }

    return {
      signedUrl: data.signedUrl,
      path: isolatedPath,
      bucket,
      expiresIn,
    };
  }

  /**
   * Delete a file from storage
   */
  async deleteFile({ bucket, path, tenantContext }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const isolatedPath = this.isolatePath(path, tenantContext);

    const { error } = await this.client.storage
      .from(bucket)
      .remove([isolatedPath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    return {
      success: true,
      path: isolatedPath,
      bucket,
    };
  }

  /**
   * List files in a bucket path
   */
  async listFiles({ bucket, path = "", tenantContext, options = {} }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const isolatedPath = this.isolatePath(path, tenantContext);

    const { data, error } = await this.client.storage
      .from(bucket)
      .list(isolatedPath, {
        limit: options.limit || 100,
        offset: options.offset || 0,
        sortBy: options.sortBy || { column: 'name', order: 'asc' },
      });

    if (error) {
      throw new Error(`List failed: ${error.message}`);
    }

    return {
      files: data,
      path: isolatedPath,
      bucket,
    };
  }

  /**
   * Create a storage bucket
   */
  async createBucket({ bucket, options = {} }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { data, error } = await this.client.storage.createBucket(bucket, {
      public: options.public || false,
      fileSizeLimit: options.fileSizeLimit || null,
      allowedMimeTypes: options.allowedMimeTypes || null,
    });

    if (error) {
      throw new Error(`Bucket creation failed: ${error.message}`);
    }

    return {
      bucket,
      metadata: data,
    };
  }

  /**
   * Delete a storage bucket
   */
  async deleteBucket({ bucket }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { error } = await this.client.storage.deleteBucket(bucket);

    if (error) {
      throw new Error(`Bucket deletion failed: ${error.message}`);
    }

    return {
      success: true,
      bucket,
    };
  }

  /**
   * Get bucket information
   */
  async getBucket({ bucket }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { data, error } = await this.client.storage.getBucket(bucket);

    if (error) {
      throw new Error(`Bucket retrieval failed: ${error.message}`);
    }

    return data;
  }

  /**
   * List all buckets
   */
  async listBuckets() {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { data, error } = await this.client.storage.listBuckets();

    if (error) {
      throw new Error(`Bucket list failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Update bucket configuration
   */
  async updateBucket({ bucket, options = {} }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { data, error } = await this.client.storage.updateBucket(bucket, {
      public: options.public,
      fileSizeLimit: options.fileSizeLimit,
      allowedMimeTypes: options.allowedMimeTypes,
    });

    if (error) {
      throw new Error(`Bucket update failed: ${error.message}`);
    }

    return {
      bucket,
      metadata: data,
    };
  }

  /**
   * Isolate file path with tenant context
   */
  isolatePath(path, tenantContext) {
    if (!tenantContext?.tenant_id || !tenantContext?.data_scope) throw new Error("Tenant and data scope are required for storage paths");

    const tenantPath = `${tenantContext.tenant_id}/${tenantContext.data_scope}`;

    // Remove leading slash if present
    const normalizedPath = String(path || '').replace(/^\/+/, '');
    if (!normalizedPath || normalizedPath.split('/').some((segment) => segment === '..' || segment === '.')) {
      throw new Error("A safe storage object path is required");
    }
    if (normalizedPath === tenantPath || normalizedPath.startsWith(`${tenantPath}/`)) return normalizedPath;

    // Combine tenant path with file path
    return `${tenantPath}/${normalizedPath}`;
  }

  /**
   * Extract tenant context from path
   */
  extractTenantContext(path) {
    const parts = path.split('/');
    if (parts.length >= 2) {
      return {
        tenant_id: parts[0],
        data_scope: parts[1],
      };
    }
    return null;
  }

  /**
   * Validate file type
   */
  validateFileType(file, allowedTypes) {
    if (!allowedTypes || allowedTypes.length === 0) {
      return true;
    }

    return allowedTypes.includes(file.type);
  }

  /**
   * Validate file size
   */
  validateFileSize(file, maxSizeMB) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
}

/**
 * Factory function to create Supabase storage instance
 */
export function createSupabaseStorage() {
  return new SupabaseStorage();
}

/**
 * Singleton instance
 */
let supabaseStorageInstance = null;

export function getSupabaseStorage() {
  if (!supabaseStorageInstance) {
    supabaseStorageInstance = createSupabaseStorage();
  }
  return supabaseStorageInstance;
}

/**
 * Predefined bucket names
 */
export const STORAGE_BUCKETS = {
  DOCUMENTS: 'documents',
  IMAGES: 'images',
  RECEIPTS: 'receipts',
  PROFILE_IMAGES: 'profile-images',
  CHIT_DOCUMENTS: 'chit-documents',
  AUDIT_LOGS: 'audit-logs',
  BACKUPS: 'backups',
};

/**
 * Allowed file types by bucket
 */
export const ALLOWED_FILE_TYPES = {
  [STORAGE_BUCKETS.DOCUMENTS]: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  [STORAGE_BUCKETS.IMAGES]: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  [STORAGE_BUCKETS.RECEIPTS]: [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ],
  [STORAGE_BUCKETS.PROFILE_IMAGES]: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  [STORAGE_BUCKETS.CHIT_DOCUMENTS]: [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ],
};

/**
 * File size limits by bucket (in MB)
 */
export const FILE_SIZE_LIMITS = {
  [STORAGE_BUCKETS.DOCUMENTS]: 10,
  [STORAGE_BUCKETS.IMAGES]: 5,
  [STORAGE_BUCKETS.RECEIPTS]: 5,
  [STORAGE_BUCKETS.PROFILE_IMAGES]: 2,
  [STORAGE_BUCKETS.CHIT_DOCUMENTS]: 10,
  [STORAGE_BUCKETS.AUDIT_LOGS]: 50,
  [STORAGE_BUCKETS.BACKUPS]: 100,
};
