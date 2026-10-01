import type { Player } from './engine';

/**
 * Giao thức với apps/party-server (giữ khớp với server.mjs).
 * Server chỉ chuyển tin: nhận trạng thái từ chủ phòng rồi phát cho cả phòng,
 * nhận hành động của khách rồi đưa cho chủ phòng.
 */
export type ClientMessage =
  /** `id`: id bí mật của máy, chỉ gửi lên server để vào lại đúng chỗ; không ai khác thấy. */
  | { t: 'create'; game: string; id: string; name: string }
  | { t: 'join'; code: string; game: string; id: string; name: string }
  | { t: 'state'; state: unknown }
  /** Chỉ các khóa cấp đầu đổi so với bản đã gửi trước đó (`del`: khóa bị xóa). */
  | { t: 'patch'; set: Record<string, unknown>; del: string[] }
  | { t: 'action'; action: unknown }
  /** Game thời gian thực: chủ phòng phát ảnh chụp thế giới, khách gửi điều khiển. Không lưu trên server. */
  | { t: 'tick'; data: unknown }
  | { t: 'input'; data: unknown }
  | { t: 'ping'; c: number }
  | { t: 'leave' };

export type RoomError = 'no-room' | 'wrong-game' | 'full' | 'busy' | 'bad';

export type ServerMessage =
  /** `you`: id công khai server cấp cho máy này (khác id bí mật máy gửi lên trong create/join). */
  | { t: 'joined'; code: string; you: string; hostId: string; members: Player[]; state: unknown }
  | { t: 'members'; hostId: string; members: Player[] }
  | { t: 'state'; state: unknown }
  | { t: 'patch'; set: Record<string, unknown>; del: string[] }
  /** Server không ghép được patch: chủ phòng gửi lại cả bản. */
  | { t: 'resync' }
  | { t: 'action'; from: string; action: unknown }
  | { t: 'tick'; data: unknown }
  | { t: 'input'; from: string; data: unknown }
  | { t: 'pong'; c: number; now: number }
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

/** Đo giờ server định kỳ; quá lâu không thấy pong thì coi như kết nối đã chết (đổi mạng, khóa màn hình). */
const PING_MS = 10_000;
const DEAD_MS = 25_000;
/** Vừa mở lại app: kết nối trả lời chậm hơn thế này thì nối lại luôn, khỏi chờ trình duyệt tự phát hiện. */
const WAKE_CHECK_MS = 4_000;
/** Hành động của khách gửi lúc đang mất kết nối: giữ lại để gửi khi vào lại phòng. */
const MAX_QUEUE = 30;

/** WebSocket tự nối lại khi rớt mạng (điện thoại khóa màn hình, đổi wifi sang 4G...). */
export class RoomClient {
  private ws: WebSocket | null = null;
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pinger: ReturnType<typeof setInterval> | undefined;
  private wakeTimer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  /** Đã vào phòng trên kết nối hiện tại (nhận 'joined'). */
  private inRoom = false;
  private queue: ClientMessage[] = [];
  private lastPong = 0;
  /** Lệch giữa giờ server và giờ máy này, lấy từ lần đo có độ trễ thấp nhất gần đây. */
  private offset = 0;
  private best = { rtt: Infinity, at: 0 };

  constructor(private readonly opts: RoomClientOptions) {
    this.open();
    document.addEventListener('visibilitychange', this.wake);
    window.addEventListener('online', this.wake);
  }

  /** Giờ chung của phòng (ms, theo giờ server). */
  now() {
    return Date.now() + this.offset;
  }

  private open() {
    this.opts.onStatus('connecting');
    this.inRoom = false;
    const ws = new WebSocket(this.opts.url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.lastPong = Date.now();
      this.opts.onStatus('open');
      this.ping();
      this.raw(this.opts.hello());
      clearInterval(this.pinger);
      this.pinger = setInterval(() => {
        if (Date.now() - this.lastPong > DEAD_MS) this.restart();
        else this.ping();
      }, PING_MS);
    };
    ws.onmessage = (e) => {
      let m: ServerMessage;
      try {
        m = JSON.parse(String(e.data)) as ServerMessage;
      } catch {
        return; // Bỏ qua tin hỏng.
      }
      if (m.t === 'pong') return this.pong(m);
      // Đánh dấu trước khi chuyển tin, để lúc xử lý 'joined' chủ phòng gửi lại được trạng thái ngay.
      if (m.t === 'joined') this.inRoom = true;
      this.opts.onMessage(m);
      if (m.t === 'joined') {
        // Vài lần đo liền nhau lúc mới vào để đồng hồ chuẩn ngay từ đầu.
        setTimeout(() => this.ping(), 300);
        setTimeout(() => this.ping(), 900);
        const queued = this.queue;
        this.queue = [];
        queued.forEach((q) => this.send(q));
      }
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.stopped) return;
      this.scheduleOpen(Math.min(1000 * 2 ** this.retry++, 8000));
    };
  }

  private scheduleOpen(ms: number) {
    clearInterval(this.pinger);
    clearTimeout(this.timer);
    this.inRoom = false;
    this.opts.onStatus('connecting');
    this.timer = setTimeout(() => this.open(), ms);
  }

  /** Bỏ kết nối hiện tại (có thể đã chết mà trình duyệt chưa biết) và nối lại ngay. */
  private restart() {
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = null;
      try {
        ws.close();
      } catch {
        // Kết nối hỏng sẵn.
      }
    }
    this.retry = 0;
    this.scheduleOpen(0);
  }

  /** Mở lại app / có mạng lại: kiểm tra kết nối ngay thay vì chờ lần thử kế. */
  private wake = () => {
    if (this.stopped || document.visibilityState === 'hidden') return;
    if (this.ws?.readyState !== WebSocket.OPEN) return this.restart();
    const asked = Date.now();
    this.ping();
    clearTimeout(this.wakeTimer);
    this.wakeTimer = setTimeout(() => {
      if (this.lastPong < asked) this.restart();
    }, WAKE_CHECK_MS);
  };

  private ping() {
    this.raw({ t: 'ping', c: performance.now() });
  }

  private pong(m: { c: number; now: number }) {
    const t = performance.now();
    this.lastPong = Date.now();
    const rtt = t - m.c;
    if (rtt < 0 || rtt > 10_000) return;
    // Mạng lúc nhanh lúc chậm: tin vào lần đo nhanh nhất, nhưng mẫu cũ hơn 1 phút thì thay.
    if (rtt <= this.best.rtt || Date.now() - this.best.at > 60_000) {
      this.best = { rtt, at: Date.now() };
      this.offset = m.now + rtt / 2 - Date.now();
    }
  }

  private raw(m: ClientMessage) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(m));
    return true;
  }

  /**
   * Gửi tin trong phòng. Trả về false nếu chưa gửi được (đang mất kết nối).
   * Hành động của khách được giữ lại và gửi khi vào lại phòng; trạng thái thì không (chủ phòng tự gửi lại bản mới nhất).
   */
  send(m: ClientMessage) {
    if (this.inRoom && this.raw(m)) return true;
    if (m.t === 'action' && !this.stopped) {
      this.queue.push(m);
      if (this.queue.length > MAX_QUEUE) this.queue.shift();
    }
    return false;
  }

  close(leave = true) {
    if (this.stopped) return;
    if (leave) this.raw({ t: 'leave' });
    this.stopped = true;
    clearTimeout(this.timer);
    clearTimeout(this.wakeTimer);
    clearInterval(this.pinger);
    document.removeEventListener('visibilitychange', this.wake);
    window.removeEventListener('online', this.wake);
    this.queue = [];
    this.ws?.close();
    this.opts.onStatus('closed');
  }
}
