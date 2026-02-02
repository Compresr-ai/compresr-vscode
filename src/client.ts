/**
 * Compresr API Client
 * Handles communication with the Compresr API
 */

interface CompressData {
  compressed_context: string;
  original_tokens: number;
  compressed_tokens: number;
  actual_compression_ratio: number;
}

interface CompressResponse {
  success: boolean;
  message: string | null;
  data: CompressData;
}

interface ErrorResponse {
  error: string;
  message: string;
}

export interface CompressionModel {
  name: string;
  description?: string;
  max_context_length?: number;
  default_ratio?: number;
}

interface ModelsResponse {
  success: boolean;
  data: CompressionModel[];
}

interface ModelDetailsResponse {
  success: boolean;
  data: CompressionModel;
}

export interface CompressionResult {
  compressedContent: string;
  originalTokens: number;
  compressedTokens: number;
  actualRatio: number;
}

export interface CompressOptions {
  targetRatio?: number;
  modelName?: string;
}

export class CompresrClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.compresr.ai") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Get list of available compression models
   */
  async getModels(): Promise<CompressionModel[]> {
    const response = await fetch(`${this.baseUrl}/api/compress/models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as ErrorResponse;
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const result = await response.json() as { data?: CompressionModel[]; models?: CompressionModel[] } | CompressionModel[];
    
    // Handle different response structures
    if (Array.isArray(result)) {
      return result;
    } else if (result.data && Array.isArray(result.data)) {
      return result.data;
    } else if (result.models && Array.isArray(result.models)) {
      return result.models;
    }
    
    // Fallback
    return [{ name: "cmprsr_v1", description: "Default model" }];
  }

  /**
   * Get details for a specific compression model
   */
  async getModelDetails(modelName: string): Promise<CompressionModel> {
    const response = await fetch(`${this.baseUrl}/api/compress/models/${encodeURIComponent(modelName)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as ErrorResponse;
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const result = (await response.json()) as ModelDetailsResponse;
    return result.data;
  }

  /**
   * Compress content using the Compresr API
   */
  async compress(content: string, options: CompressOptions = {}): Promise<CompressionResult> {
    const { targetRatio = 0.3, modelName = "cmprsr_v1" } = options;

    const response = await fetch(`${this.baseUrl}/api/compress/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify({
        context: content,
        compression_model_name: modelName,
        target_compression_ratio: targetRatio,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as ErrorResponse;
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const result = (await response.json()) as CompressResponse;
    
    return {
      compressedContent: result.data.compressed_context,
      originalTokens: result.data.original_tokens,
      compressedTokens: result.data.compressed_tokens,
      actualRatio: result.data.actual_compression_ratio,
    };
  }
}
