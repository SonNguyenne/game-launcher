import { useEffect, useRef, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { config } from './config';
import { strings } from './strings';
import s from './Notes.module.css';
import iconSvg from '../icon.svg?raw';

interface NotesData {
  text: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export default function Notes({ ctx }: MiniAppProps<NotesData>) {
  const [text, setText] = useState(() => ctx.storage.get()?.text ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const latest = useRef(text);
  latest.current = text;

  useEffect(() => {
    if (status !== 'saving') return;
    const t = setTimeout(() => {
      ctx.storage.set({ text: latest.current });
      setStatus('saved');
    }, config.saveDelayMs);
    return () => clearTimeout(t);
  }, [text, status, ctx]);

  // Lưu ngay khi đóng app, không đợi hết thời gian chờ.
  useEffect(() => () => ctx.storage.set({ text: latest.current }), [ctx]);

  return (
    <div className={s.notes}>
      <label className="sr-only" htmlFor="notes-area">{strings.label}</label>
      <div className={s.pad}>
        <textarea
          id="notes-area"
          className={s.area}
          value={text}
          placeholder={strings.placeholder}
          onChange={(e) => {
            setText(e.target.value);
            setStatus('saving');
          }}
        />
        {!text && <span className={s.art} aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconSvg }} />}
      </div>
      <div className={s.meta}>
        <span>{strings.words(countWords(text))}</span>
        <span className={s.status} data-status={status}>{strings[status]}</span>
      </div>
    </div>
  );
}
