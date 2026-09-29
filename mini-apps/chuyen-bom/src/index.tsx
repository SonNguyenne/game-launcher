import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, PartyShell, ResultCard, SettingsCard, playerAt, useParty, vibrate, type Party, type PartyData } from '@bang/party';
import { Field, TextInput, cx, keyColors } from '@bang/ui';
import { bombGame, type BombAction, type BombState } from './game';
import { strings } from './strings';
import s from './Bomb.module.css';
import iconSvg from '../icon.svg?raw';

/** Ngòi nổ: đi từ nắp bom ra đầu ngòi. Đốm lửa chạy dọc đường này (CSS offset-path). */
const FUSE_PATH = 'M142 44 C 150 18, 178 30, 178 4';

/**
 * Phần ngòi còn lại (%), ngắn dần theo số lần chuyền. Không về 0 trước khi nổ,
 * và bom có thể nổ khi ngòi còn dài, nên nhìn ngòi không đoán được lúc nổ.
 */
const fuseLeft = (taps: number) => Math.max(12, 96 - taps * 5);

/** `from`: độ dài ngòi lúc vừa hiện, để ngòi cháy dần tới `left` thay vì nhảy thẳng. */
function BombShape({ left, from }: { left: number; from?: number }) {
  const [shown, setShown] = useState(from ?? left);
  useEffect(() => {
    // Hai khung hình để trình duyệt vẽ độ dài cũ trước, rồi mới chạy transition.
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setShown(left))));
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [left]);

  return (
    <svg viewBox="0 0 200 200" className={s.shape} style={bombColor} aria-hidden="true">
      {/* Bóng sơn lệch như chữ bảng hiệu: chỉ kiểu quán hiện. */}
      <circle cx="104" cy="120" r="72" className={s.paint} />
      <circle cx="96" cy="112" r="72" className={s.body} />
      <path d={FUSE_PATH} pathLength={100} className={s.fuseBurnt} />
      <path d={FUSE_PATH} pathLength={100} className={s.fuse} style={{ strokeDasharray: `${shown} 200` }} />
      <g className={s.flame} style={{ offsetPath: `path('${FUSE_PATH}')`, offsetDistance: `${shown}%` }}>
        {Array.from({ length: 5 }, (_, i) => (
          <circle key={i} r="2.4" className={s.ember} style={{ '--a': `${-160 + i * 35}deg`, '--d': `${i * 280}ms` } as CSSProperties} />
        ))}
        <circle r="13" className={s.glow} />
        <circle r="7" className={s.spark} />
      </g>
      <rect x="124" y="42" width="30" height="22" rx="4" transform="rotate(40 139 53)" className={s.cap} />
      <path d="M58 92 A 44 44 0 0 1 84 64" className={s.shine} />
    </svg>
  );
}

/** Bom luôn đen ở cả chế độ sáng lẫn tối. */
const bombColor = { '--bomb': keyColors.black.fill } as CSSProperties;

/**
 * Hướng bay của một lần chuyền, nhìn từ máy này:
 * - out: mình vừa ném đi (bom bay khỏi tay, không quay lại)
 * - in: mình vừa được chuyền tới (bom rơi xuống tay)
 * - pass: chơi 1 máy, bom bay sang người kế đang cầm máy
 */
type Toss = 'out' | 'in' | 'pass';
const FLIGHT_MS = 560;
/** Cho cả bàn thấy lúc nổ rồi mới kéo thẻ kết quả lên. */
const BOOM_MS = 1100;

/** Mảnh vụn khi nổ: góc và quãng bay cố định để lần nào cũng giống nhau. */
const debris = Array.from({ length: 14 }, (_, i) => ({ a: i * (360 / 14) + (i % 3) * 9, r: 110 + (i % 4) * 34, s: 8 + (i % 3) * 5 }));

function BombGame({ party }: { party: Party<BombState, BombAction> }) {
  const state = party.state!;
  const exploded = !!state.result;
  const holder = party.current;
  const next = playerAt(party.players, state.turn + 1)?.name ?? '';
  const online = party.mode === 'online';
  // Căng dần theo số lần đã chuyền (không theo lúc nổ, nên không lộ).
  const heat = Math.min(state.taps / 14, 1);
  const left = fuseLeft(state.taps);
  // Độ dài ngòi của lần vẽ trước, để ngòi mới cháy tiếp từ đó.
  const prevLeft = useRef(left);
  useEffect(() => {
    prevLeft.current = left;
  }, [left]);

  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;
  const seen = useRef({ seq: state.seq, holderId: holder?.id });
  const [toss, setToss] = useState<{ kind: Toss; seq: number } | null>(null);
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    const prev = seen.current;
    if (state.seq === prev.seq) return;
    seen.current = { seq: state.seq, holderId: holder?.id };
    // Nổ hoặc sang ván mới: bỏ hiệu ứng bay của lần chuyền trước (nếu không, bom có thể
    // kẹt ở cuối hiệu ứng "ném đi", tức là vô hình, trên tay người cầm ván mới).
    if (state.result || state.taps === 0) {
      setToss(null);
      setFlying(false);
    }
    if (state.result) {
      sfxRef.current('buzz');
      vibrate([260, 60, 120, 60, 420]);
      return;
    }
    if (state.taps === 0) return;
    const kind: Toss = !online ? 'pass' : prev.holderId === party.me ? 'out' : holder?.id === party.me ? 'in' : 'pass';
    setToss({ kind, seq: state.seq });
    setFlying(true);
    sfxRef.current('tap');
    vibrate(kind === 'in' ? [30, 40, 60] : 18);
  }, [state.seq, state.result, state.taps, holder?.id, online, party.me]);

  // Đang bay thì chưa bấm được: chống bấm hai lần liền, và phải "bắt" được bom rồi mới chuyền tiếp.
  useEffect(() => {
    if (!toss) return;
    const id = setTimeout(() => setFlying(false), FLIGHT_MS);
    return () => clearTimeout(id);
  }, [toss]);

  // Thẻ kết quả chờ tiếng nổ xong. Vào lại phòng lúc đã có kết quả thì hiện ngay.
  const resultSeq = state.result?.seq;
  const [cardSeq, setCardSeq] = useState(resultSeq);
  useEffect(() => {
    if (!resultSeq || resultSeq === cardSeq) return;
    const id = setTimeout(() => setCardSeq(resultSeq), BOOM_MS);
    return () => clearTimeout(id);
  }, [resultSeq, cardSeq]);

  // Tích tắc nhanh dần như đồng hồ hẹn giờ.
  useEffect(() => {
    if (exploded) return;
    const id = setInterval(() => sfxRef.current('tick'), 1000 - heat * 680);
    return () => clearInterval(id);
  }, [exploded, heat]);

  // Chơi phòng: bom chỉ nằm giữa màn hình của người đang cầm. Máy khác thấy bom ở tay người đó.
  const inHand = !online || party.myTurn;
  const throwing = online && !inHand && flying && toss?.kind === 'out';
  const canTap = party.myTurn && !exploded && !flying;
  const caption = exploded ? strings.blewOn(holder?.name ?? '') : party.myTurn ? strings.tapToPass(next) : strings.holding(holder?.name ?? '');

  let stage;
  if (exploded) {
    stage = (
      <>
        <div className={s.debris} aria-hidden="true">
          {debris.map((d, i) => (
            <i key={i} style={{ '--a': `${d.a}deg`, '--r': `${d.r}px`, '--s': `${d.s}px` } as CSSProperties} />
          ))}
        </div>
        <div className={s.exploded} role="img" aria-label={strings.boom}>
          <span className={s.star} />
          <span className={s.boom}>{strings.boom}</span>
        </div>
      </>
    );
  } else if (inHand || throwing) {
    stage = (
      <>
        {/* Vòng sơn đứng yên dưới quả bom, đập nhanh dần theo độ nóng. */}
        <span className={s.target} aria-hidden="true" />
        <button
          key={toss?.seq ?? 'idle'}
          className={cx(s.bomb, toss && s[toss.kind])}
          disabled={!canTap}
          onClick={() => party.dispatch({ type: 'tap' })}
          aria-label={`${strings.bomb}. ${caption}`}
        >
          <span className={s.wobble}>
            <BombShape left={left} from={prevLeft.current} />
          </span>
        </button>
      </>
    );
  } else {
    stage = (
      <div key={holder?.id} className={s.elsewhere} role="img" aria-label={caption}>
        <span className={s.holderFace}>
          <Avatar name={holder?.name ?? '?'} dim={holder?.online === false} />
        </span>
        <span className={s.heldBomb}>
          <span className={s.wobble}>
            <BombShape left={left} from={prevLeft.current} />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className={s.game} style={{ '--heat': heat } as CSSProperties}>
      {exploded && <span className={s.flash} aria-hidden="true" />}
      <div className={cx(s.arena, exploded && s.shaking)}>{stage}</div>

      <div className={s.caption} aria-live="polite">
        <strong>{caption}</strong>
        <span>{strings.passes(state.taps)}</span>
      </div>

      {/* Cả bàn ngồi thành hàng; bom nhảy tới người đang cầm. */}
      <ol className={s.table} aria-label={strings.table}>
        {party.players.map((p) => {
          const holding = p.id === holder?.id;
          return (
            <li key={holding ? `${p.id}-${state.seq}` : p.id} className={cx(s.seat, holding && s.holding, p.id === party.me && online && s.me)}>
              {holding && (
                <span className={s.badge} aria-hidden="true">
                  <BombShape left={left} from={prevLeft.current} />
                </span>
              )}
              <Avatar name={p.name} dim={p.online === false} />
              <span className={s.seatName}>{p.name}</span>
            </li>
          );
        })}
      </ol>
      <ResultCard party={party} show={cardSeq === resultSeq} />
    </div>
  );
}
function BombSettings({
  value,
  onChange,
  editable,
}: {
  value: { penaltyText?: string };
  onChange: (c: { penaltyText?: string }) => void;
  editable: boolean;
}) {
  const current = value.penaltyText?.trim() || 'bom nổ, dính phạt!';
  const presets = ['bom nổ, dính phạt!', 'chống đẩy 10 cái', 'uống 1 ngụm đồ uống', 'hát 1 bài', 'kể 1 tật xấu'];
  return (
    <SettingsCard editable={editable}>
      <Field
        label="Hình phạt khi bom nổ"
        htmlFor="bomb-penalty"
        hint="Nội dung đọc to khi bom phát nổ trên tay (tự lưu trên máy)."
      >
        <TextInput
          id="bomb-penalty"
          value={value.penaltyText ?? ''}
          placeholder="bom nổ, dính phạt! (hoặc tự gõ)"
          maxLength={50}
          disabled={!editable}
          onChange={(e) => onChange({ penaltyText: e.target.value })}
        />
      </Field>
      {editable && (
        <div className={s.presetSection}>
          <span className={s.presetLabel}>Gợi ý nhanh:</span>
          <div className={s.presetChips}>
            {presets.map((preset) => {
              const active = current === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  className={cx(s.presetChip, active && s.presetChipActive)}
                  onClick={() => onChange({ penaltyText: preset })}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

export default function ChuyenBom({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(bombGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <BombSettings {...p} />,
      }}
    >
      {party.state && <BombGame party={party} />}
    </PartyShell>
  );
}
