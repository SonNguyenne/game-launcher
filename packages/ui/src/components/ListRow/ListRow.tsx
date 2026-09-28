import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { Icon, type IconName } from '../Icon';
import s from './ListRow.module.css';

interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  lead?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  danger?: boolean;
  dim?: boolean;
}

/**
 * Một dòng trong danh sách. Có onClick mà không có trailing: cả dòng là nút.
 * Có trailing (nút phụ): chỉ phần tiêu đề là nút, tránh lồng nút trong nút.
 */
export function ListRow({ title, subtitle, value, lead, trailing, onClick, chevron, danger, dim }: ListRowProps) {
  const body = (
    <>
      <span className={s.title}>{title}</span>
      {subtitle && <span className={s.sub}>{subtitle}</span>}
    </>
  );
  const className = cx(s.row, danger && s.danger, dim && s.dim);
  const tail = (
    <>
      {value && <span className={s.value}>{value}</span>}
      {chevron && <Icon name="next" size={16} />}
    </>
  );

  if (onClick && !trailing) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {lead && <span className={s.lead}>{lead}</span>}
        <span className={s.main}>{body}</span>
        {tail}
      </button>
    );
  }
  return (
    <div className={className}>
      {lead && <span className={s.lead}>{lead}</span>}
      {onClick ? (
        <button type="button" className={s.main} onClick={onClick}>{body}</button>
      ) : (
        <span className={s.main}>{body}</span>
      )}
      {tail}
      {trailing}
    </div>
  );
}

export function SectionHeader({ label, index }: { label: string; index?: string }) {
  return (
    <div className={s.section}>
      <span>{label}</span>
      {index && <span>{index}</span>}
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className={s.tag}>{children}</span>;
}

interface RowIconButtonProps {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function RowIconButton({ icon, label, onClick, disabled }: RowIconButtonProps) {
  return (
    <button type="button" className={s.iconButton} onClick={onClick} aria-label={label} disabled={disabled}>
      <Icon name={icon} />
    </button>
  );
}
