import { t } from '@/i18n/vi';
import { isHttpUrl, withProtocol } from '@/lib/url';

export interface AppFormValues {
  name: string;
  url: string;
  color: import('@bang/ui').KeyColorId;
  group: string;
  hidden: boolean;
}

export type AppFormErrors = Partial<Record<'name' | 'url', string>>;

/** Hàm thuần, dễ viết test: trả về giá trị đã chuẩn hóa và lỗi (nếu có). */
export function validateAppForm(values: AppFormValues, requiresUrl: boolean) {
  const errors: AppFormErrors = {};
  const cleaned = { ...values, name: values.name.trim(), group: values.group.trim(), url: withProtocol(values.url) };

  if (!cleaned.name) errors.name = t.form.errors.nameRequired;
  if (requiresUrl) {
    if (!cleaned.url) errors.url = t.form.errors.urlRequired;
    else if (!isHttpUrl(cleaned.url)) errors.url = t.form.errors.urlInvalid;
  }
  return { cleaned, errors, valid: Object.keys(errors).length === 0 };
}
