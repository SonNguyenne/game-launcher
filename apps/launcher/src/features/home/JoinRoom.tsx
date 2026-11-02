import { useState, type FormEvent } from 'react';
import { findRoomGame } from '@bang/party';
import { Button } from '@bang/ui';
import { t } from '@/i18n/vi';
import s from './PixelHome.module.css';

interface JoinRoomProps {
  /** Game có trên máy này không (phòng có thể là game của bản launcher khác). */
  hasApp: (id: string) => boolean;
  onJoin: (gameId: string, code: string) => void;
}

/** Ô vào phòng chung ở trang chủ: tra mã ra game rồi mở đúng game với mã đó. */
export function JoinRoom({ hasApp, onJoin }: JoinRoomProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 4 || busy) return;
    setBusy(true);
    const game = await findRoomGame(code);
    setBusy(false);
    if (!game) return setError(t.home.noRoom(code));
    if (!hasApp(game)) return setError(t.home.missingGame);
    onJoin(game, code);
  };

  return (
    <form className={s.join} onSubmit={submit}>
      <div className={s.joinRow}>
        <input
          className={s.code}
          value={code}
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder={t.home.codePlaceholder}
          aria-label={t.home.codeLabel}
          aria-invalid={!!error}
          aria-describedby={error ? 'join-error' : undefined}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
            setError(null);
          }}
        />
        <Button type="submit" variant="primary" disabled={code.length !== 4 || busy}>
          {busy ? t.home.joining : t.home.join}
        </Button>
      </div>
      {error && (
        <p id="join-error" className={s.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
