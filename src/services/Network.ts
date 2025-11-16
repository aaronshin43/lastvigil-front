/**
 * Network.ts
 * WebSocket connection, Vultr AI data reception management
 */

export interface NetworkConfig {
  serverUrl: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export type MessageHandler = (data: any) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: Event) => void;

export class Network {
  private ws: WebSocket | null = null;
  private config: NetworkConfig;
  private reconnectAttempts: number = 0;
  private reconnectTimer: number | null = null;
  private isIntentionallyClosed: boolean = false;

  // Event handlers
  private onMessageHandler: MessageHandler | null = null;
  private onOpenHandler: ConnectionHandler | null = null;
  private onCloseHandler: ConnectionHandler | null = null;
  private onErrorHandler: ErrorHandler | null = null;

  constructor(config: NetworkConfig) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      ...config,
    };
  }

  /**
   * Connect WebSocket
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('⚠️ WebSocket is already connected.');
      return;
    }

    console.log(`🔌 Attempting WebSocket connection: ${this.config.serverUrl}`);
    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(this.config.serverUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ WebSocket creation failed:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ WebSocket connection successful!');
      this.reconnectAttempts = 0;
      if (this.onOpenHandler) {
        this.onOpenHandler();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessageHandler) {
          this.onMessageHandler(data);
        }
      } catch (error) {
        console.error('❌ Message parsing failed:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('🔥 WebSocket error:', error);
      if (this.onErrorHandler) {
        this.onErrorHandler(error);
      }
    };

    this.ws.onclose = () => {
      // console.log('🔌 WebSocket connection closed');
      if (this.onCloseHandler) {
        this.onCloseHandler();
      }

      // If not intentionally closed, attempt reconnection
      if (!this.isIntentionallyClosed) {
        this.attemptReconnect();
      }
    };
  }

  /**
   * Attempt reconnection
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('❌ Maximum reconnection attempts exceeded');
      return;
    }

    this.reconnectAttempts++;
    // console.log(
    //   `🔄 Reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} (after ${this.config.reconnectInterval}ms)`
    // );

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    // console.log('🔌 WebSocket connection terminated');
  }

  /**
   * Send data
   */
  send(data: string | ArrayBuffer | Blob): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket is not connected.');
      return;
    }

    try {
      this.ws.send(data);
    } catch (error) {
      console.error('❌ Data transmission failed:', error);
    }
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Return connection state
   */
  getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * Register message reception handler
   */
  onMessage(handler: MessageHandler): void {
    this.onMessageHandler = handler;
  }

  /**
   * Register connection success handler
   */
  onOpen(handler: ConnectionHandler): void {
    this.onOpenHandler = handler;
  }

  /**
   * Register connection close handler
   */
  onClose(handler: ConnectionHandler): void {
    this.onCloseHandler = handler;
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler): void {
    this.onErrorHandler = handler;
  }
}
