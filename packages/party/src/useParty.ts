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
  const live = useRef({ state, players, isHost, mode });
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
        live.current.state = (m.state as S | null) ?? null;
        setState(live.current.state);
        setError(null);
      } else if (m.t === 'members') {
        setRoom((r) => (r ? { ...r, hostId: m.hostId, members: m.members } : r));
      } else if (m.t === 'state') {
        live.current.state = (m.state as S | null) ?? null;
        setState(live.current.state);
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
    [apply],
  );

  const connect = useCallback(
    (name: string, code: string | null) => {
      clientRef.current?.close();
      codeRef.current = code;
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
    /** Chủ phòng / chơi 1 máy: bắt đầu ván mới với danh sách người chơi hiện tại. */
    startGame: () => {
      if (mode === 'setup') {
        live.current.mode = 'local';
        live.current.players = localPlayers;
        setMode('local');
      }
      commit(game.init(mode === 'setup' ? localPlayers : players));
    },
    endGame: () => {
      commit(null);
      if (mode === 'local') setMode('setup');
    },
  };
}

export type Party<S extends BaseState = BaseState, A extends GameAction = GameAction> = ReturnType<typeof useParty<S, A>>;
