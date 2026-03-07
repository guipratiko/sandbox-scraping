/**
 * Cliente Socket.io para integrar com o Backend principal.
 * Emite scraping-credits-updated para o frontend atualizar o saldo em tempo real.
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '../config/constants';

let socket: Socket | null = null;
let isConnected = false;
const pendingEvents: { event: string; data: unknown }[] = [];

export const connectSocket = (): void => {
  if (socket && isConnected) return;

  try {
    socket = io(SOCKET_CONFIG.URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 5000,
    });

    socket.on('connect', () => {
      isConnected = true;
      while (pendingEvents.length > 0) {
        const ev = pendingEvents.shift();
        if (ev && socket) socket.emit(ev.event, ev.data);
      }
    });

    socket.on('disconnect', () => {
      isConnected = false;
    });

    socket.on('connect_error', (err) => {
      console.warn('[Scraping-Flow] Socket.io:', err.message);
    });
  } catch (err) {
    console.error('[Scraping-Flow] Erro ao conectar Socket.io:', err);
  }
};

export const emitScrapingCreditsUpdate = (userId: string, credits: number): void => {
  const data = { userId, credits };

  if (!socket) connectSocket();

  if (socket && isConnected) {
    socket.emit('scraping-credits-updated', data);
  } else {
    pendingEvents.push({ event: 'scraping-credits-updated', data });
  }
};
