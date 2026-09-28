import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Field, Icon, TextInput, cx } from '@bang/ui';
import type { BaseState, GameAction, Player } from './engine';
import { partyStrings as t } from './strings';
import type { Party } from './useParty';
import s from './Party.module.css';

export interface SettingsProps<S> {
  /** Cài đặt hiện tại (đã gộp mặc định). */
  value: Partial<S>;
  onChange: (patch: Partial<S>) => void;
  /** Chủ phòng / chơi 1 máy mới được chỉnh. */
  editable: boolean;
  online: boolean;
}

export interface GameInfo<S = BaseState> {
  title: string;
  /** Một câu giải thích cách chơi. */
  rule: string;
  /** Hình minh họa nhỏ của game ở màn đầu. */
  art: ReactNode;
  /** Cài đặt ván chơi, hiện ở phòng chờ và màn nhập người chơi (game cần có configOf). */
  settings?: (props: SettingsProps<S>) => ReactNode;
}

function LobbySettings<S extends BaseState, A extends GameAction>({ party, info }: { party: Party<S, A>; info: GameInfo<S> }) {
  if (!info.settings || !party.config) return null;
  return <>{info.settings({ value: party.config, onChange: party.setConfig, editable: party.isHost, online: party.mode === 'online' })}</>;
}

const initial = (name: string) => name.trim().normalize('NFC').charAt(0).toLocaleUpperCase('vi') || '?';

export function Avatar({ name, dim }: { name: string; dim?: boolean }) {
  return <span className={cx(s.avatar, dim && s.dim)} aria-hidden="true">{initial(name)}</span>;
}

interface ShellProps<S extends BaseState, A extends GameAction> {
  party: Party<S, A>;
  info: GameInfo<S>;
  /** Màn chơi, chỉ hiện khi ván đã bắt đầu. */
  children: ReactNode;
  /** Cả phòng chơi cùng lúc, không chia lượt: thanh trên cùng không hiện tên người tới lượt. */
  together?: boolean;
}

/** Khung chung: màn đầu, nhập người chơi, phòng chờ, thanh lượt chơi. Game chỉ lo phần giữa. */
export function PartyShell<S extends BaseState, A extends GameAction>({ party, info, children, together }: ShellProps<S, A>) {
  if (party.mode === 'start') return <Start party={party} info={info} />;
  if (party.mode === 'setup') return <LocalSetup party={party} info={info} />;
  if (party.mode === 'online' && (!party.room || !party.state)) return <Lobby party={party} info={info} />;
  return (
    <div className={s.stage}>
      <TurnBar party={party} together={together} />
      <div className={s.play}>{children}</div>
    </div>
  );
}

function Start<S extends BaseState, A extends GameAction>({ party, info }: { party: Party<S, A>; info: GameInfo<S> }) {
  const [name, setName] = useState(party.name);
  const [code, setCode] = useState(party.initialCode);
  const [needName, setNeedName] = useState(false);

  const withName = (go: (n: string) => void) => {
    const n = name.trim();
    if (!n) return setNeedName(true);
    go(n);
  };
  const join = (e: FormEvent) => {
    e.preventDefault();
    if (code.length === 4) withName((n) => party.joinRoom(n, code));
  };

  return (
    <div className={s.stage}>
      <div className={s.scroll}>
        <header className={s.hero}>
          <div className={s.art} aria-hidden="true">{info.art}</div>
          <h2 className={s.heroTitle}>{info.title}</h2>
          <p className={s.heroRule}>{info.rule}</p>
        </header>

        {party.error && <p className={s.error} role="alert">{t.errors[party.error]}</p>}

        <Field label={t.yourName} htmlFor="party-name" error={needName ? t.needName : null}>
          <TextInput
            id="party-name"
            value={name}
            maxLength={20}
            autoComplete="nickname"
            placeholder={t.namePlaceholder}
            invalid={needName}
            onChange={(e) => {
              setName(e.target.value);
              setNeedName(false);
            }}
          />
        </Field>

        <Button variant="primary" block onClick={() => withName(party.createRoom)}>
          <Icon name="plus" /> {t.createRoom}
        </Button>

        <form className={s.join} onSubmit={join}>
          <p className={s.or}>{t.or}</p>
          <div className={s.joinRow}>
            <TextInput
              className={s.codeInput}
              value={code}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder={t.codePlaceholder}
              aria-label={t.codeLabel}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            <Button type="submit" disabled={code.length !== 4}>{t.joinRoom}</Button>
          </div>
        </form>

        <button className={s.local} onClick={party.goSetup}>
          <Icon name="users" /> {t.playLocal}
        </button>
      </div>
    </div>
  );
}

function LocalSetup<S extends BaseState, A extends GameAction>({ party, info }: { party: Party<S, A>; info: GameInfo<S> }) {
  const names = party.localNames;
  const [draft, setDraft] = useState('');

  const add = (e: FormEvent) => {
    e.preventDefault();
    const n = draft.trim();
    if (!n) return;
    party.setLocalNames([...names, n]);
    setDraft('');
  };

  return (
    <div className={s.stage}>
      <div className={s.scroll}>
        <div className={s.sectionHead}>
          <button className={s.iconButton} onClick={party.goStart} aria-label={t.back}><Icon name="back" size={20} /></button>
          <h2 className={s.sectionTitle}>{t.players}</h2>
          <span className={s.count}>{names.length}</span>
        </div>

        <ul className={s.people}>
          {names.map((n, i) => (
            <li key={`${i}-${n}`} className={s.person}>
              <Avatar name={n} />
              <span className={s.personName}>{n}</span>
              <button className={s.iconButton} onClick={() => party.setLocalNames(names.filter((_, j) => j !== i))} aria-label={t.removePlayer(n)}>
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>

        <form className={s.joinRow} onSubmit={add}>
          <TextInput value={draft} maxLength={20} placeholder={t.addPlaceholder} aria-label={t.addPlaceholder} onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" disabled={!draft.trim()}>{t.addPlayer}</Button>
        </form>
        <p className={s.hint}>{t.needTwo}</p>
        <LobbySettings party={party} info={info} />
      </div>
      <div className={s.footer}>
        <Button variant="primary" block disabled={names.length < 2} onClick={party.startGame}>{t.start}</Button>
      </div>
    </div>
  );
}

/** Chép chữ vào clipboard. Trên HTTP thường (mở qua IP mạng LAN) API clipboard bị chặn, nên có cách dự phòng. */
async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Thử cách dưới.
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

function Lobby<S extends BaseState, A extends GameAction>({ party, info }: { party: Party<S, A>; info: GameInfo<S> }) {
  const room = party.room;
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (copy !== 'copied') return;
    const id = setTimeout(() => setCopy('idle'), 2500);
    return () => clearTimeout(id);
  }, [copy]);

  const link = useMemo(() => {
    if (!room) return '';
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('phong', room.code);
    return url.toString();
  }, [room]);

  const invite = async () => {
    if (!room) return;
    const text = t.shareText(info.title, room.code);
    // Chia sẻ của hệ điều hành (điện thoại, HTTPS); không có thì chép link.
    if (navigator.share && window.isSecureContext) {
      try {
        await navigator.share({ title: info.title, text, url: link });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    setCopy((await copyText(`${text}: ${link}`)) ? 'copied' : 'failed');
  };

  return (
    <div className={s.stage}>
      <div className={s.scroll}>
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>{info.title}</h2>
          <Button onClick={party.leave}>{t.leave}</Button>
        </div>

        {!room ? (
          <p className={s.hint} role="status">{t.connecting}</p>
        ) : (
          <>
            <div className={s.codeCard}>
              <span className={s.codeLabel}>{t.roomCode}</span>
              <strong className={s.code}>{room.code}</strong>
              <Button onClick={invite}>{copy === 'copied' ? t.copied : t.share}</Button>
            </div>
            <div className={s.invite}>
              <input
                className={s.inviteLink}
                value={link}
                readOnly
                aria-label={t.inviteLink}
                onFocus={(e) => e.currentTarget.select()}
              />
              <p className={s.hint} role="status">
                {copy === 'failed' ? t.copyFailed : t.inviteHint}
              </p>
            </div>
            {party.status !== 'open' && <p className={s.hint} role="status">{t.connecting}</p>}

            <h3 className={s.listTitle}>{t.inRoom(room.members.length)}</h3>
            <MemberList party={party} members={room.members} hostId={room.hostId} />
            <LobbySettings party={party} info={info} />
          </>
        )}
      </div>
      {room && (
        <div className={s.footer}>
          {party.isHost ? (
            <>
              <Button variant="primary" block disabled={room.members.length < 2} onClick={party.startGame}>{t.start}</Button>
              {room.members.length < 2 && <p className={s.hint}>{t.waitMore}</p>}
            </>
          ) : (
            <p className={s.wait}>{t.waitHost}</p>
          )}
        </div>
      )}
    </div>
  );
}

function MemberList<S extends BaseState, A extends GameAction>({ party, members, hostId }: { party: Party<S, A>; members: Player[]; hostId: string }) {
  return (
    <ul className={s.people}>
      {members.map((m) => (
        <li key={m.id} className={cx(s.person, m.online === false && s.away)}>
          <Avatar name={m.name} dim={m.online === false} />
          <span className={s.personName}>{m.name}</span>
          {m.online === false && <span className={s.tag}>{t.offline}</span>}
          {m.id === party.me && <span className={s.tag}>{t.you}</span>}
          {m.id === hostId && <span className={cx(s.tag, s.tagHost)}>{t.host}</span>}
        </li>
      ))}
    </ul>
  );
}

function TurnBar<S extends BaseState, A extends GameAction>({ party, together }: { party: Party<S, A>; together?: boolean }) {
  const cur = party.current;
  const mine = party.myTurn && party.mode === 'online' && !together;
  const online = party.mode === 'online';
  const hostAway = online && party.room?.members.find((m) => m.id === party.room?.hostId)?.online === false;

  return (
    <>
      <div className={cx(s.turn, mine && s.turnMine)}>
        {together ? (
          <span className={s.avatar} aria-hidden="true"><Icon name="users" size={20} /></span>
        ) : (
          <Avatar name={cur?.name ?? '?'} />
        )}
        <div className={s.turnText} aria-live="polite">
          <small>{together ? t.together : mine ? t.yourTurn : t.turn}</small>
          <strong>{together ? t.togetherName(party.players.length) : cur?.name}</strong>
        </div>
        {online && party.room && <span className={s.roomChip}>{party.room.code}</span>}
        <button className={s.iconButton} onClick={party.toggleMute} aria-label={party.muted ? t.soundOn : t.soundOff}>
          <Icon name={party.muted ? 'soundOff' : 'sound'} size={20} />
        </button>
        {party.isHost ? (
          <button className={s.iconButton} onClick={party.endGame} aria-label={online ? t.endGame : t.endLocal}>
            <Icon name="users" size={20} />
          </button>
        ) : (
          <button className={s.iconButton} onClick={party.leave} aria-label={t.leave}>
            <Icon name="close" size={20} />
          </button>
        )}
      </div>
      {online && party.status !== 'open' && <p className={s.notice} role="status">{t.connecting}</p>}
      {hostAway && <p className={s.notice} role="status">{t.hostOffline}</p>}
      {online && party.isHost && !together && cur?.online === false && (
        <p className={s.notice} role="status">
          {t.playerOffline(cur.name)}
          <button className={s.noticeAction} onClick={() => party.dispatch({ type: 'skip' })}>{t.skip}</button>
        </p>
      )}
    </>
  );
}
