import type { ImageTransformer, ImageTransformOptions } from './image-transform';

export class PassthroughTransformer implements ImageTransformer {
  async transform(
    input: ReadableStream | ArrayBuffer,
    _options: ImageTransformOptions,
    _acceptHeader?: string
  ): Promise<{ body: ReadableStream; contentType: string }> {
    if (input instanceof ArrayBuffer) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(input));
          controller.close();
        },
      });
      return { body: stream, contentType: 'application/octet-stream' };
    }
    return { body: input, contentType: 'application/octet-stream' };
  }
}
