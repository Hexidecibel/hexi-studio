declare module 'cloudflare:sockets' {
  interface SocketOptions {
    secureTransport?: 'on' | 'off' | 'starttls';
  }
  interface SocketAddress {
    hostname: string;
    port: number;
  }
  interface Socket {
    readonly readable: ReadableStream<Uint8Array>;
    readonly writable: WritableStream<Uint8Array>;
    startTls(): void;
    close(): void;
  }
  export function connect(address: SocketAddress, options?: SocketOptions): Socket;
}
