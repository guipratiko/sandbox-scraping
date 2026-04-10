/**
 * Cliente Socket.io para integrar com o Backend principal.
 * Emite scraping-credits-updated para o frontend atualizar o saldo em tempo real.
 *
 * Em Node (Docker/PaaS), WebSocket puro costuma falhar antes do polling (proxy/TLS).
 * Por isso polling vem primeiro; ver https://socket.io/docs/v4/client-options/#transports
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '../config/constants';

let socket: Socket | null = null;
const pendingEvents: { event: string; data: unknown }[] = [];

const SOCKET_TIMEOUT_MS = parseInt(process.env.SOCKET_IO_TIMEOUT_MS || '20000', 10);
const SOCKET_RECONNECT_ATTEMPTS = parseInt(process.env.SOCKET_IO_RECONNECT_ATTEMPTS || '10', 10);

let lastConnectErrorLog = 0;
const CONNECT_ERROR_LOG_INTERVAL_MS = 60_000;

export const connectSocket = (): void => {
  // Uma única instância; reconexão é feita pelo socket.io-client
  if (socket) {
    return;
  }

  try {
    socket = io(SOCKET_CONFIG.URL, {
      // Polling primeiro: evita "websocket error" em servidor→servidor atrás de reverse proxy
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
      reconnectionAttempts: SOCKET_RECONNECT_ATTEMPTS,
      timeout: SOCKET_TIMEOUT_MS,
      path: process.env.SOCKET_IO_PATH || '/socket.io/',
    });

    socket.on('connect', () => {
      console.log('[Scraping-Flow] Socket.io conectado ao backend');
      while (pendingEvents.length > 0) {
        const ev = pendingEvents.shift();
        if (ev && socket) socket.emit(ev.event, ev.data);
      }
    });

    socket.on('connect_error', (err) => {
      const now = Date.now();
      if (now - lastConnectErrorLog >= CONNECT_ERROR_LOG_INTERVAL_MS) {
        lastConnectErrorLog = now;
        console.warn(
          `[Scraping-Flow] Socket.io: ${err.message} (backend: ${SOCKET_CONFIG.URL} — confira BACKEND_SOCKET_URL/https e se o Backend aceita conexões deste host)`
        );
      }
    });
  } catch (err) {
    console.error('[Scraping-Flow] Erro ao iniciar Socket.io:', err);
  }
};

export const emitScrapingCreditsUpdate = (userId: string, credits: number): void => {
  const data = { userId, credits };

  if (!socket) connectSocket();

  if (socket?.connected) {
    socket.emit('scraping-credits-updated', data);
  } else {
    pendingEvents.push({ event: 'scraping-credits-updated', data });
  }
};
