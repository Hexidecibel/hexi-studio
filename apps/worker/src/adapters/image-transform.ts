export interface ImageAnalysis {
  entropy: number;
  resolution: number;
  qualityScore: number;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' | 'scale-down';
}

export interface ImageTransformer {
  transform(
    input: ReadableStream | ArrayBuffer,
    options: ImageTransformOptions,
    acceptHeader?: string
  ): Promise<{ body: ReadableStream; contentType: string }>;

  analyze?(input: ArrayBuffer): Promise<ImageAnalysis | null>;
}
