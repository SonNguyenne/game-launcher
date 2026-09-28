import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePersistentState, type MiniAppContext } from '@bang/sdk';
import { playerAt, runReduce, type BaseState, type CommonAction, type GameAction, type GameDef, type Player } from './engine';
import { RoomClient, partyServerUrl, type ConnectionStatus, type RoomError, type ServerMessage } from './net';
import { playTone, type Tone } from './sound';

/** Dữ liệu mỗi game tự lưu. */
export interface PartyData {
  name?: string;
  players?: string[];
  muted?: boolean;
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
const ID_KEY = 'bang-party-id';

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

function deviceId() {
  const make = () => Math.random().toString(36).slice(2, 12);
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
  /** Cài đặt nháp ở phòng chờ, áp vào lúc bắt đầu ván. */
  const [lobby, setLobby] = useState<Partial<S>>({});
  const defaults = useMemo(() => game.configOf?.(game.init([])) ?? null, [game]);
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('closed');
  const [error, setError] = useState<RoomError | null>(null);
  const me = useMemo(deviceId, []);
  const initialCode = useMemo(codeFromUrl, []);

  const localPlayers = useMemo<Player[]>(() => (data.players ?? []).map((name, i) => ({ id: `p${i}`, name })), [data.players]);
  const players = mode === 'online' ? (room?.members ?? []) : localPlayers;
  const isHost = mode !== 'online' || room?.hostId === me;
  const current = state ? playerAt(players, state.turn) : undefined;

  // Callback của WebSocket sống lâu hơn một lần render, nên đọc giá trị mới nhất qua ref.
  const live = useRef({ state, players, isHost, mode, lobby });
  live.current = { ...live.current, players, isHost, mode };
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

  const sendLobby = useCallback((next: Partial<S>) => {
    live.current.lobby = next;
    setLobby(next);
    if (live.current.mode === 'online') clientRef.current?.send({ t: 'state', state: { [LOBBY_KEY]: next } });
  }, []);

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
        if (host) apply(action, me, true);
        else clientRef.current?.send({ t: 'action', action });
      }
    },
    [apply, me],
  );

  const onMessage = useCallback(
    (m: ServerMessage) => {
      if (m.t === 'joined') {
        codeRef.current = m.code;
        setRoom({ code: m.code, hostId: m.hostId, members: m.members });
        receive(m.state);
        setError(null);
        // Chủ phòng vừa tạo phòng: đưa cài đặt đang có cho cả phòng thấy.
        if (m.hostId === me && m.state == null) sendLobby(live.current.lobby);
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
    [apply, receive, sendLobby, me],
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
            ? { t: 'join', code: codeRef.current, game: game.id, id: me, name }
            : { t: 'create', game: game.id, id: me, name },
        onMessage,
        onStatus: setStatus,
      });
    },
    [game.id, me, onMessage],
  );

  useEffect(() => () => clientRef.current?.close(), []);

  const leave = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    codeRef.current = null;
    setRoom(null);
    live.current.state = null;
    setState(null);
    setMode('start');
  }, []);

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
      if (game.configOf) first = game.reduce(first, { type: 'config', config: live.current.lobby } as unknown as A, { from: me, players: list, host: true });
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
