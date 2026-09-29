import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePersistentState, type MiniAppContext } from '@bang/sdk';
import { playerAt, runReduce, type BaseState, type CommonAction, type GameAction, type GameDef, type Player } from './engine';
import { RoomClient, partyServerUrl, type ConnectionStatus, type RoomError, type ServerMessage } from './net';
import { playTone, type Tone } from './sound';
import { useWakeLock } from './useWakeLock';

/** Dữ liệu mỗi game tự lưu. */
export interface PartyData {
  name?: string;
  players?: string[];
  muted?: boolean;
  /** Cài đặt lưu riêng của từng game dưới máy người chơi. */
  savedConfig?: Record<string, unknown>;
}

export type PartyMode = 'start' | 'setup' | 'local' | 'online';

interface Room {
  code: string;
  hostId: string;
  members: Player[];
}

/** Ở phòng chờ chưa có ván: chủ phòng gửi cài đặt nháp trong gói này thay cho trạng thái ván. */
const LOBBY_KEY = '__lobby';
type LobbyPacket<S> = { [LOBBY_KEY]: Partial<S> };
const isLobby = <S,>(v: unknown): v is LobbyPacket<S> => !!v && typeof v === 'object' && LOBBY_KEY in v;

const PROFILE_KEY = 'bang-party-profile';
// Key mới dài hơn thay cho 'bang-party-id' (10 ký tự Math.random) của bản cũ.
const ID_KEY = 'bang-party-key';

/** Tên và danh sách người chơi dùng chung giữa các game trên cùng máy, để khỏi nhập lại. */
function readProfile(): PartyData {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}') as PartyData;
  } catch {
    return {};
  }
}

function writeProfile(p: PartyData) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: p.name, players: p.players }));
  } catch {
    // Không lưu được thì thôi.
  }
}

/** Id bí mật của máy, dùng để vào lại đúng chỗ trong phòng. Không bao giờ hiện cho máy khác. */
function deviceKey() {
  const make = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  try {
    const saved = localStorage.getItem(ID_KEY);
    if (saved) return saved;
    const id = make();
    localStorage.setItem(ID_KEY, id);
    return id;
  } catch {
    return make();
  }
}

/** Mã phòng trong link mời: ?phong=1234 */
function codeFromUrl() {
  try {
    return new URLSearchParams(location.search).get('phong')?.replace(/\D/g, '').slice(0, 4) ?? '';
  } catch {
    return '';
  }
}

export function useParty<S extends BaseState, A extends GameAction>(game: GameDef<S, A>, ctx: MiniAppContext<PartyData>) {
  const [stored, setData] = usePersistentState<PartyData>(ctx, {});
  const data = useMemo(() => ({ ...readProfile(), ...stored }), [stored]);
  const [mode, setMode] = useState<PartyMode>('start');
  const [state, setState] = useState<S | null>(null);
  /** Cài đặt nháp ở phòng chờ, áp vào lúc bắt đầu ván (khởi tạo từ cài đặt đã lưu dưới máy). */
  const [lobby, setLobby] = useState<Partial<S>>(() => (stored.savedConfig as Partial<S>) ?? {});
  const defaults = useMemo(() => game.configOf?.(game.init([])) ?? null, [game]);
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('closed');
  const [error, setError] = useState<RoomError | null>(null);
  const key = useMemo(deviceKey, []);
  /** Id của máy này trong phòng (server cấp). Chơi 1 máy thì không dùng tới. */
  const [me, setMe] = useState('');
  const meRef = useRef(me);
  const initialCode = useMemo(codeFromUrl, []);

  const localPlayers = useMemo<Player[]>(() => (data.players ?? []).map((name, i) => ({ id: `p${i}`, name })), [data.players]);
  const players = mode === 'online' ? (room?.members ?? []) : localPlayers;
  const isHost = mode !== 'online' || room?.hostId === me;
  const current = state ? playerAt(players, state.turn) : undefined;

  // Callback của WebSocket sống lâu hơn một lần render, nên đọc giá trị mới nhất qua ref.
  const live = useRef({ state, players, isHost, mode, lobby: (stored.savedConfig as Partial<S>) ?? {} });
  live.current = { ...live.current, players, isHost, mode, lobby };
  const clientRef = useRef<RoomClient | null>(null);
  const codeRef = useRef<string | null>(null);

  const save = useCallback(
    (patch: PartyData) => {
      setData((d) => {
        const next = { ...readProfile(), ...d, ...patch };
        writeProfile(next);
        return next;
      });
    },
    [setData],
  );

  const sendLobby = useCallback(
    (next: Partial<S>) => {
      live.current.lobby = next;
      setLobby(next);
      save({ savedConfig: next as Record<string, unknown> });
      if (live.current.mode === 'online') clientRef.current?.send({ t: 'state', state: { [LOBBY_KEY]: next } });
    },
    [save],
  );

  /** Trạng thái nhận từ server: gói phòng chờ thì chỉ cập nhật cài đặt nháp. */
  const receive = useCallback((raw: unknown) => {
    if (isLobby<S>(raw)) {
      live.current.lobby = raw[LOBBY_KEY];
      setLobby(raw[LOBBY_KEY]);
      raw = null;
    }
    live.current.state = (raw as S | null) ?? null;
    setState(live.current.state);
  }, []);

  const commit = useCallback((next: S | null) => {
    live.current.state = next;
    setState(next);
    if (live.current.mode === 'online') clientRef.current?.send({ t: 'state', state: next });
  }, []);

  /** Chạy luật chơi; chỉ gọi trên máy giữ luật (chơi 1 máy hoặc chủ phòng). */
  const apply = useCallback(
    (action: A | CommonAction, from: string, host: boolean) => {
      const s = live.current.state;
      if (!s) return;
      const next = runReduce(game, s, action, { from, players: live.current.players, host });
      if (next !== s) commit(next);
    },
    [game, commit],
  );

  const dispatch = useCallback(
    (action: A | CommonAction) => {
      const { mode: m, isHost: host, state: s, players: list } = live.current;
      if (m === 'local') {
        const who = s ? playerAt(list, s.turn)?.id : undefined;
        if (who) apply(action, who, true);
      } else if (m === 'online') {
        if (host) apply(action, meRef.current, true);
        else clientRef.current?.send({ t: 'action', action });
      }
    },
    [apply],
  );

  const onMessage = useCallback(
    (m: ServerMessage) => {
      if (m.t === 'joined') {
        codeRef.current = m.code;
        meRef.current = m.you;
        setMe(m.you);
        setRoom({ code: m.code, hostId: m.hostId, members: m.members });
        receive(m.state);
        setError(null);
        // Chủ phòng vừa tạo phòng: đưa cài đặt đang có cho cả phòng thấy.
        if (m.hostId === m.you && m.state == null) sendLobby(live.current.lobby);
      } else if (m.t === 'members') {
        setRoom((r) => (r ? { ...r, hostId: m.hostId, members: m.members } : r));
      } else if (m.t === 'state') {
        receive(m.state);
      } else if (m.t === 'action') {
        if (live.current.isHost) apply(m.action as A | CommonAction, m.from, false);
      } else if (m.t === 'error') {
        setError(m.code);
        clientRef.current?.close(false);
        clientRef.current = null;
        setRoom(null);
        setMode('start');
      }
    },
    [apply, receive, sendLobby],
  );

  const connect = useCallback(
    (name: string, code: string | null) => {
      clientRef.current?.close();
      codeRef.current = code;
      // Vào phòng người khác: dùng cài đặt của chủ phòng đó.
      if (code) {
        live.current.lobby = {};
        setLobby({});
      }
      setError(null);
      setRoom(null);
      setState(null);
      live.current.state = null;
      live.current.mode = 'online';
      setMode('online');
      clientRef.current = new RoomClient({
        url: partyServerUrl(),
        hello: () =>
          codeRef.current
            ? { t: 'join', code: codeRef.current, game: game.id, id: key, name }
            : { t: 'create', game: game.id, id: key, name },
        onMessage,
        onStatus: setStatus,
      });
    },
    [game.id, key, onMessage],
  );

  useEffect(() => () => clientRef.current?.close(), []);

  // Đang có ván hoặc đang ở trong phòng: giữ màn hình sáng.
  useWakeLock(state !== null || mode === 'online');

  const leave = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    codeRef.current = null;
    meRef.current = '';
    setMe('');
    setRoom(null);
    live.current.state = null;
    setState(null);
    const restored = (stored.savedConfig as Partial<S>) ?? {};
    live.current.lobby = restored;
    setLobby(restored);
    setMode('start');
  }, [stored.savedConfig]);

  const muted = !!data.muted;
  const sfx = useCallback((tone: Tone) => !muted && playTone(tone), [muted]);

  return {
    game,
    mode,
    me,
    state,
    room,
    status,
    error,
    players,
    current,
    isHost,
    /** Máy này được bấm cho người đang tới lượt không. Chơi 1 máy: luôn được. */
    myTurn: mode === 'local' || current?.id === me,
    name: data.name ?? '',
    localNames: data.players ?? [],
    initialCode,
    muted,
    sfx,
    dispatch,
    nameOf: (id: string) => players.find((p) => p.id === id)?.name ?? '',
    toggleMute: () => save({ muted: !muted }),
    setLocalNames: (names: string[]) => save({ players: names }),
    goSetup: () => setMode('setup'),
    goStart: () => setMode('start'),
    createRoom: (name: string) => {
      save({ name });
      connect(name, null);
    },
    joinRoom: (name: string, code: string) => {
      save({ name });
      connect(name, code);
    },
    leave,
    /** Cài đặt đang chọn ở phòng chờ (đã gộp mặc định của game); null nếu game không có cài đặt. */
    config: defaults ? { ...defaults, ...lobby } : null,
    /** Chủ phòng / chơi 1 máy chỉnh cài đặt ở phòng chờ. */
    setConfig: (patch: Partial<S>) => {
      if (live.current.isHost) sendLobby({ ...live.current.lobby, ...patch });
    },
    /** Chủ phòng / chơi 1 máy: bắt đầu ván mới với danh sách người chơi hiện tại. */
    startGame: () => {
      const list = mode === 'setup' ? localPlayers : players;
      if (mode === 'setup') {
        live.current.mode = 'local';
        live.current.players = localPlayers;
        setMode('local');
      }
      let first = game.init(list);
      if (game.configOf) first = game.reduce(first, { type: 'config', config: live.current.lobby } as unknown as A, { from: meRef.current, players: list, host: true });
      commit(first);
    },
    endGame: () => {
      // Về phòng chờ, giữ cài đặt của ván vừa chơi cho ván sau.
      const s = live.current.state;
      live.current.state = null;
      setState(null);
      sendLobby(s && game.configOf ? game.configOf(s) : live.current.lobby);
      if (mode === 'local') setMode('setup');
    },
  };
}

export type Party<S extends BaseState = BaseState, A extends GameAction = GameAction> = ReturnType<typeof useParty<S, A>>;
