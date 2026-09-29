export const strings = {
  title: 'chuyền bom',
  rule: 'Bom đến tay ai, người đó bấm để chuyền đi. Không ai biết lần bấm nào bom sẽ nổ; nổ trên tay ai thì người đó dính phạt.',
  tapToPass: (name: string) => `bấm để chuyền cho ${name}`,
  holding: (name: string) => `bom đang ở tay ${name}`,
  passes: (n: number) => (n ? `đã chuyền ${n} lần` : 'chưa ai chuyền'),
  bomb: 'quả bom',
  table: 'thứ tự chuyền bom',
  boom: 'bùm!',
  blewOn: (name: string) => `nổ trên tay ${name}`,
  explode: 'bom nổ, dính phạt!',
  detail: (n: number) => `sau ${n} lần chuyền`,
} as const;
