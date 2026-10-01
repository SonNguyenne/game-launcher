import { useEffect, useRef } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { PartyShell, useParty, type PartyData } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { iceBumperGame, skinOf, type SnowarParty } from './game';
import { MAPS } from './maps';
import { SnowarSettings } from './Settings';
import { HATS, SKIN_COLORS, saveSkin, savedSkin, type PenguinSkin } from './avatar';
import { drawPenguin, drawTag } from './render';
import { BODY_R } from './sim';
import { Arena } from './Arena';
import { strings } from './strings';
import s from './IceBumper.module.css';
import iconSvg from '../icon.svg?raw';

/** Hàng cánh cụt của cả phòng đứng trên tấm băng, mặc áo đang chọn. */
function Lineup({ party, meId }: { party: SnowarParty; meId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ party, meId });
  live.current = { party, meId };

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const { party: p, meId: me } = live.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const list = p.players;
      const zoom = Math.min(1.9, (w - 24) / Math.max(1, list.length) / (BODY_R * 3.4));
      const gap = w / Math.max(1, list.length);
      list.forEach((pl, i) => {
        const x = gap * (i + 0.5);
        const y = h * 0.66;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(zoom, zoom);
        drawPenguin(ctx, { x: 0, y: 0, face: Math.PI / 2 + Math.sin(t / 900 + i) * 0.35, ball: 0, skin: skinOf(p.state!, list, pl.id), bob: t + i * 400 });
        drawTag(ctx, 0, 0, pl.name, skinOf(p.state!, list, pl.id).color, pl.id === me, zoom);
        ctx.restore();
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className={s.lineup} aria-hidden="true" />;
}

/** Trước trận: mỗi người chọn màu áo và mũ, chủ phòng cho vào trận. */
function Garage({ party }: { party: SnowarParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const meId = local ? (party.players[0]?.id ?? '') : party.me;
  const mine = skinOf(st, party.players, meId);
  const { dispatch } = party;

  // Mặc lại áo đã chọn lần trước trên máy này.
  const hasSkin = !!st.skins[meId];
  useEffect(() => {
    const saved = savedSkin();
    if (meId && saved && !hasSkin) dispatch({ type: 'set_skin', skin: saved });
  }, [meId, hasSkin, dispatch]);

  const choose = (patch: Partial<PenguinSkin>) => {
    const next = { ...mine, ...patch };
    saveSkin(next);
    dispatch({ type: 'set_skin', skin: next });
  };
  const host = party.players.find((p) => p.id === party.room?.hostId)?.name ?? '';

  return (
    <div className={s.garage}>
      <div className={s.dock}>
        <Lineup party={party} meId={meId} />
      </div>

      <section className={s.picker} aria-label={strings.garageTitle}>
        <h2 className={s.garageTitle}>{strings.garageTitle}</h2>
        <p className={s.garageHint}>{local ? strings.practice : strings.garageHint}</p>
        <p className={s.arenaLine}>
          {strings.arena(st.map === 'random' ? strings.randomMaps : (MAPS[st.map]?.label ?? ''), st.scale, st.slip, strings.roundTimeValue(st.roundSeconds ?? 60))}
        </p>

        <div className={s.group} role="radiogroup" aria-label={strings.color}>
          <span className={s.groupLabel}>{strings.color}</span>
          <div className={s.swatches}>
            {SKIN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={mine.color === c}
                aria-label={c}
                className={cx(s.swatch, mine.color === c && s.swatchOn)}
                style={{ background: c }}
                onClick={() => choose({ color: c })}
              />
            ))}
          </div>
        </div>

        <div className={s.group} role="radiogroup" aria-label={strings.hat}>
          <span className={s.groupLabel}>{strings.hat}</span>
          <div className={s.hats}>
            {HATS.map((h) => (
              <button key={h.id} type="button" role="radio" aria-checked={mine.hat === h.id} className={cx(s.hatChip, mine.hat === h.id && s.hatOn)} onClick={() => choose({ hat: h.id })}>
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className={s.garageFoot}>
        {party.isHost ? (
          <Button variant="primary" block onClick={() => dispatch({ type: 'start' })}>
            {strings.start(party.players.length)}
          </Button>
        ) : (
          <p className={s.wait}>{strings.waitStart(host)}</p>
        )}
        {!local && <p className={s.keys}>{strings.keysHint}</p>}
      </div>
    </div>
  );
}

export default function IceBumper({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(iceBumperGame, ctx);
  const st = party.state;
  return (
    <PartyShell
      party={party}
      together
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <SnowarSettings {...p} />,
      }}
    >
      {st && (st.stage === 'garage' ? <Garage party={party} /> : <Arena party={party} />)}
    </PartyShell>
  );
}
