import s from './Switch.module.css';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={s.switch} onClick={() => onChange(!checked)} />
  );
}

export function SwitchRow(props: SwitchProps) {
  return (
    <div className={s.row}>
      <span>{props.label}</span>
      <Switch {...props} />
    </div>
  );
}
