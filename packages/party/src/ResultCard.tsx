import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, cx } from '@bang/ui';
import { playerAt, type BaseState, type GameAction } from './engine';
import { partyStrings as t } from './strings';
import type { Party } from './useParty';
import s from './Party.module.css';

interface ResultCardProps<S extends BaseState, A extends GameAction> {
  party: Party<S, A>;
  show?: boolean;
  /** Chữ trên nút; mặc định "tới lượt {người kế}". */
  actionLabel?: string;
}

/** Thẻ kết quả trượt lên từ đáy. Máy nào trong phòng cũng bấm "tới lượt" được; bấm trùng sẽ bị bỏ qua. */
export function ResultCard<S extends BaseState, A extends GameAction>({ party, show = true, actionLabel }: ResultCardProps<S, A>) {
  const result = party.state?.result;
  const cardRef = useRef<HTMLDivElement>(null);
  const visible = !!result && show;

  useEffect(() => {
    if (visible) cardRef.current?.querySelector('button')?.focus();
  }, [visible, result?.seq]);

  if (!visible || !party.state) return null;
  const next = playerAt(party.players, party.state.turn + 1);

  return createPortal(
    <>
      <div className={s.scrim} />
      <div ref={cardRef} className={cx(s.result, result.safe && s.resultSafe)} role="alertdialog" aria-modal="true" aria-label={result.text}>
        <div className={s.resultHead}>
          <span className={s.resultWho}>{party.nameOf(result.playerId)}</span>
          <p className={s.resultText}>{result.text}</p>
          {result.detail && <p className={s.resultDetail}>{result.detail}</p>}
        </div>
        <Button variant="primary" block className={s.resultNext} onClick={() => party.dispatch({ type: 'next', seq: result.seq })}>
          {actionLabel ?? (next ? t.nextTurn(next.name) : t.safe)}
        </Button>
      </div>
    </>,
    document.body,
  );
}
