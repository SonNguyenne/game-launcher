export type TargetOpt = '12' | '16' | '20';

export const strings = {
  title: 'khai hoang',
  rule:
    'Bãi bồi 6×6 ô gồm ruộng (ra lúa), rừng tre (ra tre), đầm (ra cá) và bãi sét (ra đất). Đầu ván mỗi người chọn 2 ô làm đất gốc (đi xuôi rồi đi ngược) và nhận 1 sản vật của mỗi ô. ' +
    'Tới lượt, đổ 2 xúc xắc: xúc xắc vàng chọn hàng, xúc xắc trắng chọn cột. Mọi ô đã khai hoang nằm trên hàng hoặc cột đó cho chủ 1 sản vật (ô có nhà cho 2), ô giao nhau cho gấp đôi. ' +
    'Mùa đổi theo vòng: xuân lúa, hạ cá, thu tre, đông đất; loại đang vào mùa cho thêm 1. ' +
    'Đổ ra đôi là nước lũ: hàng và cột đó ô nào không có đê thì mất mùa, ô có đê được phù sa thêm 1. ' +
    'Sau khi đổ, dùng sản vật để: khai hoang ô kề đất mình (1 lúa + 1 tre, 1 điểm), dựng nhà (2 tre + 1 đất + 1 cá, thêm 2 điểm, ô cho gấp đôi), đắp đê ở ruộng hoặc đầm (2 đất + 1 tre, 1 điểm), cúng đình (mỗi loại 1, 1 điểm). ' +
    'Ở chợ đổi 3 sản vật cùng loại lấy 1 loại khác; mặt hàng đang được giá chỉ cần 2. Ai đạt đủ điểm mục tiêu trước thì thắng. 2–4 người.',
  targetLabel: 'điểm thắng',
  targetOptions: { '12': '12 điểm', '16': '16 điểm', '20': '20 điểm' } satisfies Record<TargetOpt, string>,
  res: ['lúa', 'tre', 'cá', 'đất'],
  resGlyph: ['🌾', '🎋', '🐟', '🧱'],
  terrain: ['ruộng', 'rừng tre', 'đầm', 'bãi sét'],
  seasons: ['xuân', 'hạ', 'thu', 'đông'],
  season: (name: string, res: string) => `mùa ${name}: ${res} được thêm`,
  round: (r: number) => `vòng ${r}`,
  roll: 'đổ xúc xắc',
  endTurn: 'xong lượt',
  setupPick: 'chọn một ô trống làm đất gốc',
  setupWait: (name: string) => `${name} đang chọn đất gốc`,
  yourTurn: 'tới lượt bạn',
  waiting: (name: string) => `${name} đang đi`,
  watching: 'bạn đang xem',
  flood: 'nước lũ!',
  victory: 'đạt đủ điểm',
  modeGlyph: { claim: '⚑', house: '⌂', dike: '≈' },
  hot: (res: string) => `chợ đang được giá: ${res} (2 đổi 1)`,
  modes: { claim: 'khai hoang', house: 'dựng nhà', dike: 'đắp đê' },
  costs: { claim: '1 lúa + 1 tre', house: '2 tre + 1 đất + 1 cá', dike: '2 đất + 1 tre', offer: 'mỗi loại 1' },
  offer: 'cúng đình',
  market: 'chợ',
  give: 'đưa',
  get: 'lấy',
  trade: (n: number, give: string, get: string) => `đổi ${n} ${give} lấy 1 ${get}`,
  pickTile: (mode: string) => `chạm ô sáng để ${mode}`,
  points: (n: number) => `${n} điểm`,
  target: (n: number) => `mục tiêu ${n}`,
  won: (name: string) => `${name} thắng`,
  newGame: 'ván mới',
  waitNewGame: 'chờ chủ phòng mở ván mới',
  cell: (row: number, col: number, terrain: string, owner: string) => `hàng ${row} cột ${col}, ${terrain}${owner ? `, của ${owner}` : ''}`,
  gained: (n: number) => `+${n}`,
  log: {
    pick: (name: string, t: string) => `${name} chọn ${t} làm đất gốc`,
    roll: (name: string, r: number, c: number) => `${name} đổ hàng ${r}, cột ${c}`,
    flood: (r: number) => `lũ tràn hàng ${r} và cột ${r}`,
    claim: (name: string, t: string) => `${name} khai hoang ${t}`,
    house: (name: string) => `${name} dựng nhà`,
    dike: (name: string) => `${name} đắp đê`,
    offer: (name: string) => `${name} cúng đình`,
    trade: (name: string, n: number, give: string, get: string) => `${name} đổi ${n} ${give} lấy ${get}`,
    win: (name: string) => `${name} đủ điểm`,
    cap: 'hết 30 vòng, ai nhiều điểm nhất thắng',
  },
};
