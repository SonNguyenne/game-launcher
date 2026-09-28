import type { Player } from './engine';

/**
 * Giao thức với apps/party-server (giữ khớp với server.mjs).
 * Server chỉ chuyển tin: nhận trạng thái từ chủ phòng rồi phát cho cả phòng,
 * nhận hành động của khách rồi đưa cho chủ phòng.
 */
export type ClientMessage =
  | { t: 'create'; game: string; id: string; name: string }
  | { t: 'join'; code: string; game: string; id: string; name: string }
  | { t: 'state'; state: unknown }
  | { t: 'action'; action: unknown }
  | { t: 'leave' };

export type RoomError = 'no-room' | 'wrong-game' | 'full' | 'busy' | 'bad';

export type ServerMessage =
  | { t: 'joined'; code: string; hostId: string; members: Player[]; state: unknown }
  | { t: 'members'; hostId: string; members: Player[] }
  | { t: 'state'; state: unknown }
  | { t: 'action'; from: string; action: unknown }
  | { t: 'error'; code: RoomError };

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

/** Địa chỉ server phòng: mặc định cùng domain với app, đường dẫn /party. */
export function partyServerUrl() {
  const custom = import.meta.env.VITE_PARTY_URL as string | undefined;
  if (custom) return custom;
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/party`;
}

interface RoomClientOptions {
  url: string;
  /** Tin gửi mỗi lần kết nối (lại): tạo phòng lần đầu, về sau là vào lại phòng cũ. */
  hello: () => ClientMessage;
  onMessage: (m: ServerMessage) => void;
  onStatus: (s: ConnectionStatus) => void;
}

/** WebSocket tự nối lại khi rớt mạng (điện thoại khóa màn hình, đổi wifi sang 4G...). */
export class RoomClient {
  private ws: WebSocket | null = null;
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;

  constructor(private readonly opts: RoomClientOptions) {
    this.open();
  }

  private open() {
    this.opts.onStatus('connecting');
    const ws = new WebSocket(this.opts.url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.opts.onStatus('open');
      this.send(this.opts.hello());
    };
    ws.onmessage = (e) => {
      try {
        this.opts.onMessage(JSON.parse(String(e.data)) as ServerMessage);
      } catch {
        // Bỏ qua tin hỏng.
      }
    };
    ws.onclose = () => {
      if (this.stopped) return;
      this.opts.onStatus('connecting');
      this.timer = setTimeout(() => this.open(), Math.min(1000 * 2 ** this.retry++, 8000));
    };
  }

  send(m: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  close(leave = true) {
    if (this.stopped) return;
    if (leave) this.send({ t: 'leave' });
    this.stopped = true;
    clearTimeout(this.timer);
    this.ws?.close();
    this.opts.onStatus('closed');
  }
}
