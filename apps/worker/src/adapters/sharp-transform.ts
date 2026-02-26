import sharp from 'sharp';
import type { ImageTransformer, ImageTransformOptions } from './image-transform';

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
