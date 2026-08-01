import { getSupabaseStorage, STORAGE_BUCKETS, ALLOWED_FILE_TYPES, FILE_SIZE_LIMITS } from "./SupabaseStorage.js";
import { requireTenantScope } from "./SupabaseRepository.js";

/**
 * Storage Adapter for Document Uploads
 * Handles document uploads with validation, tenant isolation, and error handling
 */
export class StorageAdapter {
  constructor(options = {}) {
    this.storage = getSupabaseStorage();
    this.tenantContext = options.tenantContext;
    this.uploadLog = [];
  }

  /**
   * Upload a document with validation
   */
  async uploadDocument({
    file,
    bucket = STORAGE_BUCKETS.DOCUMENTS,
    path,
    options = {},
  }) {
    const scope = requireTenantScope(this.tenantContext);

    // Validate file type
    if (!this.storage.validateFileType(file, ALLOWED_FILE_TYPES[bucket])) {
      throw new Error(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES[bucket].join(', ')}`);
    }

    // Validate file size
    if (!this.storage.validateFileSize(file, FILE_SIZE_LIMITS[bucket])) {
      throw new Error(`File size exceeds limit of ${FILE_SIZE_LIMITS[bucket]}MB`);
    }

    // Generate path if not provided
    const uploadPath = path || this.generateFilePath(file, bucket);

    try {
      const result = await this.storage.uploadFile({
        bucket,
        path: uploadPath,
        file,
        options,
        tenantContext: scope,
      });

      this.logUpload({
        action: 'upload',
        bucket,
        path: result.path,
        fileSize: file.size,
        fileType: file.type,
        success: true,
      });

      return result;
    } catch (error) {
      this.logUpload({
        action: 'upload',
        bucket,
        path: uploadPath,
        fileSize: file.size,
        fileType: file.type,
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Upload multiple documents
   */
  async uploadDocuments({ files, bucket = STORAGE_BUCKETS.DOCUMENTS, options = {} }) {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.uploadDocument({
          file,
          bucket,
          options,
        });
        results.push({ success: true, file: file.name, result });
      } catch (error) {
        results.push({ success: false, file: file.name, error: error.message });
      }
    }

    return results;
  }

  /**
   * Download a document
   */
  async downloadDocument({ bucket, path }) {
    const scope = requireTenantScope(this.tenantContext);

    return await this.storage.downloadFile({
      bucket,
      path,
      tenantContext: scope,
    });
  }

  /**
   * Get public URL for a document
   */
  async getDocumentUrl({ bucket, path, signed = true, expiresIn = 60 }) {
    const scope = requireTenantScope(this.tenantContext);

    if (signed) {
      return await this.storage.getSignedUrl({
        bucket,
        path,
        expiresIn,
        tenantContext: scope,
      });
    }

    throw new Error("Private storage does not expose public URLs. Request a signed URL instead.");
  }

  /**
   * Delete a document
   */
  async deleteDocument({ bucket, path }) {
    const scope = requireTenantScope(this.tenantContext);

    try {
      const result = await this.storage.deleteFile({
        bucket,
        path,
        tenantContext: scope,
      });

      this.logUpload({
        action: 'delete',
        bucket,
        path,
        success: true,
      });

      return result;
    } catch (error) {
      this.logUpload({
        action: 'delete',
        bucket,
        path,
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * List documents in a bucket
   */
  async listDocuments({ bucket, path = "", options = {} }) {
    const scope = requireTenantScope(this.tenantContext);

    return await this.storage.listFiles({
      bucket,
      path,
      tenantContext: scope,
      options,
    });
  }

  /**
   * Upload a receipt image
   */
  async uploadReceipt({ file, path, options = {} }) {
    return await this.uploadDocument({
      file,
      bucket: STORAGE_BUCKETS.RECEIPTS,
      path,
      options,
    });
  }

  /**
   * Upload a profile image
   */
  async uploadProfileImage({ file, path, options = {} }) {
    return await this.uploadDocument({
      file,
      bucket: STORAGE_BUCKETS.PROFILE_IMAGES,
      path,
      options,
    });
  }

  /**
   * Upload a chit document
   */
  async uploadChitDocument({ file, path, options = {} }) {
    return await this.uploadDocument({
      file,
      bucket: STORAGE_BUCKETS.CHIT_DOCUMENTS,
      path,
      options,
    });
  }

  /**
   * Generate a unique file path
   */
  generateFilePath(file, bucket) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const baseName = file.name.replace(`.${extension}`, '').replace(/[^a-zA-Z0-9-_]/g, '_');

    return `${bucket}/${timestamp}-${randomId}-${baseName}.${extension}`;
  }

  /**
   * Get upload log
   */
  getUploadLog() {
    return this.uploadLog;
  }

  /**
   * Clear upload log
   */
  clearUploadLog() {
    this.uploadLog = [];
  }

  /**
   * Log upload operation
   */
  logUpload(logEntry) {
    this.uploadLog.push({
      ...logEntry,
      timestamp: new Date().toISOString(),
      tenantId: this.tenantContext?.tenant_id,
      dataScope: this.tenantContext?.data_scope,
    });
  }

  /**
   * Get upload statistics
   */
  getUploadStats() {
    const stats = {
      total: this.uploadLog.length,
      successful: 0,
      failed: 0,
      byBucket: {},
      byAction: {},
    };

    for (const log of this.uploadLog) {
      if (log.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }

      stats.byBucket[log.bucket] = (stats.byBucket[log.bucket] || 0) + 1;
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    }

    return stats;
  }
}

/**
 * Factory function to create storage adapter
 */
export function createStorageAdapter(tenantContext) {
  return new StorageAdapter({ tenantContext });
}

/**
 * Quick upload utility
 */
export async function quickUpload({ file, bucket, tenantContext }) {
  const adapter = createStorageAdapter(tenantContext);
  return await adapter.uploadDocument({ file, bucket });
}

/**
 * Batch upload utility
 */
export async function batchUpload({ files, bucket, tenantContext }) {
  const adapter = createStorageAdapter(tenantContext);
  return await adapter.uploadDocuments({ files, bucket });
}
