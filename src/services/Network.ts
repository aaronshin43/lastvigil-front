/**
 * Network.ts
 * WebSocket 연결, Vultr AI 데이터 수신 관리
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

  // 이벤트 핸들러
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
   * WebSocket 연결
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('⚠️ WebSocket이 이미 연결되어 있습니다.');
      return;
    }

    console.log(`🔌 WebSocket 연결 시도: ${this.config.serverUrl}`);
    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(this.config.serverUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ WebSocket 생성 실패:', error);
      this.attemptReconnect();
    }
  }

  /**
   * WebSocket 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ WebSocket 연결 성공!');
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
        console.error('❌ 메시지 파싱 실패:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('🔥 WebSocket 오류:', error);
      if (this.onErrorHandler) {
        this.onErrorHandler(error);
      }
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket 연결 종료');
      if (this.onCloseHandler) {
        this.onCloseHandler();
      }

      // 의도적으로 종료하지 않았다면 재연결 시도
      if (!this.isIntentionallyClosed) {
        this.attemptReconnect();
      }
    };
  }

  /**
   * 재연결 시도
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('❌ 최대 재연결 시도 횟수 초과');
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `🔄 재연결 시도 ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} (${this.config.reconnectInterval}ms 후)`
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * WebSocket 연결 종료
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

    console.log('🔌 WebSocket 연결 종료됨');
  }

  /**
   * 데이터 전송
   */
  send(data: string | ArrayBuffer | Blob): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket이 연결되지 않았습니다.');
      return;
    }

    try {
      this.ws.send(data);
    } catch (error) {
      console.error('❌ 데이터 전송 실패:', error);
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 연결 상태 반환
   */
  getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * 메시지 수신 핸들러 등록
   */
  onMessage(handler: MessageHandler): void {
    this.onMessageHandler = handler;
  }

  /**
   * 연결 성공 핸들러 등록
   */
  onOpen(handler: ConnectionHandler): void {
    this.onOpenHandler = handler;
  }

  /**
   * 연결 종료 핸들러 등록
   */
  onClose(handler: ConnectionHandler): void {
    this.onCloseHandler = handler;
  }

  /**
   * 오류 핸들러 등록
   */
  onError(handler: ErrorHandler): void {
    this.onErrorHandler = handler;
  }
}
