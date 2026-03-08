import sharp from 'sharp';
import type { ImageTransformer, ImageTransformOptions, ImageAnalysis } from './image-transform';

export class SharpTransformer implements ImageTransformer {
  async transform(
    input: ReadableStream | ArrayBuffer,
    options: ImageTransformOptions,
    acceptHeader?: string
  ): Promise<{ body: ReadableStream; contentType: string }> {
    const buffer = input instanceof ArrayBuffer
      ? Buffer.from(input)
      : await streamToBuffer(input);

    let pipeline = sharp(buffer);

    // Resize
    if (options.width || options.height) {
      pipeline = pipeline.resize({
        width: options.width,
        height: options.height,
        fit: options.fit === 'scale-down' ? 'inside' : (options.fit as keyof sharp.FitEnum) || 'inside',
        withoutEnlargement: options.fit === 'scale-down',
      });
    }

    // Determine output format
    let format = options.format;
    if (format === 'auto') {
      format = acceptHeader?.includes('avif') ? 'avif'
             : acceptHeader?.includes('webp') ? 'webp'
             : 'jpeg';
    }

    const quality = options.quality || 80;

    if (format === 'webp') pipeline = pipeline.webp({ quality });
    else if (format === 'avif') pipeline = pipeline.avif({ quality });
    else if (format === 'png') pipeline = pipeline.png();
    else pipeline = pipeline.jpeg({ quality });

    const output = await pipeline.toBuffer();
    const contentType = format === 'png' ? 'image/png'
                      : format === 'webp' ? 'image/webp'
                      : format === 'avif' ? 'image/avif'
                      : 'image/jpeg';

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(output));
        controller.close();
      },
    });

    return { body: stream, contentType };
  }

  async analyze(input: ArrayBuffer): Promise<ImageAnalysis | null> {
    try {
      const buffer = Buffer.from(input);
      const [stats, meta] = await Promise.all([
        sharp(buffer).stats(),
        sharp(buffer).metadata(),
      ]);

      // Entropy (60% weight): average Shannon entropy across RGB channels, normalize 4-7.5 to 0-1
      const channelEntropies = stats.channels.slice(0, 3).map((ch) => ch.entropy);
      const averageEntropy = channelEntropies.reduce((a, b) => a + b, 0) / channelEntropies.length;
      const normalizedEntropy = Math.max(0, Math.min(1, (averageEntropy - 4) / (7.5 - 4)));

      const width = meta.width || 0;
      const height = meta.height || 0;
      const pixels = width * height;

      // Resolution (25% weight): log scale, cap at 12MP
      const resolutionScore = Math.min(1, pixels > 0 ? Math.log(pixels) / Math.log(12_000_000) : 0);

      // Aspect ratio (15% weight): prefer 1.0-2.0 range
      const ratio = Math.min(width, height) > 0 ? Math.max(width, height) / Math.min(width, height) : 1;
      const aspectScore = ratio <= 2 ? 1.0 : Math.max(0, 1 - (ratio - 2) / 3);

      const qualityScore = Math.max(0, Math.min(1,
        normalizedEntropy * 0.6 + resolutionScore * 0.25 + aspectScore * 0.15
      ));

      return { entropy: averageEntropy, resolution: pixels, qualityScore };
    } catch {
      return null;
    }
  }
}

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}
