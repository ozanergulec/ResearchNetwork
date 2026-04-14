import * as signalR from '@microsoft/signalr';
import { API_SERVER_URL } from './apiClient';

type EventCallback = (...args: any[]) => void;

/**
 * Singleton SignalR connection manager for real-time notifications and messages.
 * Replaces polling with WebSocket-based push events.
 */
class SignalRService {
    private connection: signalR.HubConnection | null = null;
    private listeners: Map<string, Set<EventCallback>> = new Map();
    private started = false;

    /**
     * Start the SignalR connection if not already connected.
     */
    async start(): Promise<void> {
        if (this.started && this.connection?.state === signalR.HubConnectionState.Connected) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_SERVER_URL}/hubs/notifications`, {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // retry intervals
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        // Re-register any existing listeners on the new connection
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(cb => {
                this.connection?.on(event, cb);
            });
        });

        // Connection lifecycle logging
        this.connection.onreconnecting(() => {
            console.log('[SignalR] Reconnecting...');
        });

        this.connection.onreconnected(() => {
            console.log('[SignalR] Reconnected.');
        });

        this.connection.onclose(() => {
            console.log('[SignalR] Connection closed.');
            this.started = false;
        });

        try {
            await this.connection.start();
            this.started = true;
            console.log('[SignalR] Connected.');
        } catch (err) {
            console.error('[SignalR] Connection failed:', err);
            this.started = false;
        }
    }

    /**
     * Stop the SignalR connection.
     */
    async stop(): Promise<void> {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
            this.started = false;
        }
    }

    /**
     * Register an event listener. If the connection exists, the listener is
     * registered immediately; otherwise it will be registered when start() is called.
     */
    on(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        if (this.connection) {
            this.connection.on(event, callback);
        }
    }

    /**
     * Unregister an event listener.
     */
    off(event: string, callback: EventCallback): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.listeners.delete(event);
            }
        }

        if (this.connection) {
            this.connection.off(event, callback);
        }
    }

    /**
     * Check if the connection is currently active.
     */
    get isConnected(): boolean {
        return this.connection?.state === signalR.HubConnectionState.Connected;
    }
}

// Singleton instance
const signalRService = new SignalRService();
export default signalRService;
