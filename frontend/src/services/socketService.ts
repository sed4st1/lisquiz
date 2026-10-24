type EventCallback = (data: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private currentRoomCode: string | null = null;
  private currentToken: string | null = null;
  private isExplicitDisconnect: boolean = false;
  private lastSyncState: any = null;

  public getLastSyncState(): any {
    return this.lastSyncState;
  }

  public getRoomCode(): string | null {
    return this.currentRoomCode;
  }

  public connect(roomCode: string, token: string): Promise<void> {
    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      this.currentRoomCode === roomCode &&
      this.currentToken === token
    ) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.disconnect();
      this.isExplicitDisconnect = false;
      this.currentRoomCode = roomCode;
      this.currentToken = token;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/rooms/${roomCode}?token=${token}`;

      try {
        const socket = new WebSocket(wsUrl);
        this.ws = socket;

        socket.onopen = () => {
          this.startHeartbeat();
          resolve();
        };

        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const { event: eventName, data } = parsed;
            if (eventName === 'SYNC_STATE') {
              this.lastSyncState = data;
            }
            if (eventName) {
              this.dispatch(eventName, data);
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', event.data, e);
          }
        };

        socket.onerror = (err) => {
          console.error('WebSocket error:', err);
          reject(err);
        };

        socket.onclose = (event) => {
          this.stopHeartbeat();
          this.dispatch('DISCONNECT', { code: event.code, reason: event.reason });

          if (!this.isExplicitDisconnect && event.code !== 4001 && event.code !== 4004) {
            // Attempt auto-reconnect after 2 seconds
            this.reconnectTimeout = window.setTimeout(() => {
              if (this.currentRoomCode && this.currentToken) {
                this.connect(this.currentRoomCode, this.currentToken).catch(() => {});
              }
            }, 2000);
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  public disconnect(): void {
    this.isExplicitDisconnect = true;
    this.lastSyncState = null;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.currentRoomCode = null;
    this.currentToken = null;
  }

  public send(event: string, data: any = {}): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    } else {
      console.warn('Cannot send WebSocket message: socket not open', event, data);
    }
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private dispatch(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in listener for event ${event}:`, e);
        }
      });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      this.send('PING', { timestamp: Date.now() });
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const socketService = new SocketService();
