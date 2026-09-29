# bảng app

Launcher cá nhân dạng PWA: gom các web app tự làm vào một bảng phím, mở nhanh trên điện thoại.

## Chạy

```bash
pnpm install
pnpm dev          # http://localhost:5173 (và địa chỉ LAN để mở trên điện thoại)
pnpm build        # kiểm tra kiểu + build ra apps/launcher/dist
pnpm preview      # chạy thử bản build (có service worker)
pnpm test         # test luật chơi, chuẩn hóa dữ liệu, server phòng (vitest)
pnpm lint         # ESLint
pnpm check        # typecheck + lint + test, giống CI
```

Cần Node 20+ và pnpm 9 (`corepack enable` hoặc `npm i -g pnpm`).

## Cấu trúc

```
bang-app/
├─ apps/launcher/          Ứng dụng vỏ: bảng app, khung chứa, cài đặt
├─ packages/ui/            Design tokens + component dùng chung (@bang/ui)
├─ packages/sdk/           Hợp đồng giữa launcher và mini app (@bang/sdk)
├─ mini-apps/<id>/         Mỗi mini app một thư mục, launcher tự quét
└─ scripts/                Công cụ, ví dụ tạo mini app mới
```

Quan hệ phụ thuộc chỉ đi một chiều:

```
mini-apps/*  ──►  @bang/sdk, @bang/ui
launcher     ──►  @bang/sdk, @bang/ui, (tự quét) mini-apps/*
@bang/ui     ──►  không phụ thuộc gói nội bộ nào
```

Mini app không bao giờ import từ launcher. Mọi thứ nó cần (lưu dữ liệu, thông báo, đóng app) đi qua `ctx` do SDK định nghĩa.

### apps/launcher/src

| Thư mục | Vai trò |
|---|---|
| `config/app.ts` | Mọi hằng số hành vi: thời gian chờ, giới hạn, khóa lưu trữ |
| `i18n/vi.ts` | Toàn bộ chữ hiển thị. Component không chứa câu chữ cứng |
| `store/launcherStore.ts` | Dữ liệu người dùng (zustand + localStorage) và các action |
| `store/uiStore.ts` | Trạng thái giao diện tạm: sheet nào mở, hộp xác nhận, toast |
| `store/migrate.ts` | Chuẩn hóa dữ liệu từ mọi nguồn, đọc được cả bản HTML một file cũ |
| `registry/` | Quét `mini-apps/`, gộp với app link và lớp ghi đè thành một danh sách |
| `routes/` | Đường dẫn và kiểu dữ liệu điều hướng |
| `hooks/` | Hook dùng chung: điều hướng, nhấn giữ, đồng hồ, trạng thái mạng |
| `features/<tên>/` | Mỗi tính năng một thư mục: giao diện, logic (hook) và style đi cùng nhau |
| `ui/` | Lớp phủ toàn cục (SheetHost, GlobalLayers, ErrorBoundary) |
| `lib/` | Hàm thuần: xử lý chuỗi, URL, ngày, băm, file |

## Luồng chính

**Mở app:** bấm phím → `useAppNavigation.openApp` ghi "vừa dùng" và điều hướng tới `/app/:id` kèm vị trí phím → `RunnerPage` mở khung từ đúng vị trí đó → `CodeAppHost` tải code mini app (lazy) hoặc `LinkAppHost` nhúng iframe.

**Bảng luôn ở dưới:** `HomePage` là route cha, các màn khác (`/app/:id`, `/settings`, `/manage`) hiện đè qua `<Outlet />`. Quay về không mất vị trí cuộn, nút back của điện thoại luôn đúng.

**Bảng trượt (sheet):** gọi `useUiStore().openSheet({ kind: 'app-form', appId })` từ bất kỳ đâu. `SheetHost` quyết định hiển thị gì. Thêm loại sheet mới: thêm `kind` trong `uiStore.ts` và một `case` trong `SheetHost.tsx`.

**Dữ liệu:** app link lưu nguyên bản trong `links`. App code không lưu gì cho tới khi người dùng đổi tên/màu/nhóm; lúc đó chỉ phần thay đổi được ghi vào `overrides`. `buildAppList` gộp tất cả, một hàm thuần dễ test.

## Thêm mini app

```bash
pnpm new-app chi-tieu "sổ chi tiêu" "tiện ích"
pnpm install
pnpm dev
```

Script tạo sẵn:

```
mini-apps/chi-tieu/
├─ manifest.json          id, tên, nhóm, màu phím mặc định
├─ icon.svg               (tùy chọn) hình vẽ trên phím và màn đầu game
├─ package.json
└─ src/
   ├─ index.tsx           export default component nhận { ctx }
   ├─ config.ts           hằng số của app
   ├─ strings.ts          chữ hiển thị của app
   └─ ChiTieu.module.css
```

Không cần đăng ký ở đâu cả: launcher tự tìm mọi thư mục có `manifest.json` và `src/index.tsx`. Mỗi mini app thành một file JS riêng, chỉ tải khi mở.

`icon.svg` (viewBox `0 0 96 96`, nền trong suốt) chỉ được tô bằng 3 biến để tự đổi theo màu phím: `style="fill:var(--art-ink,#1D1A14)"`, `var(--art-paper,#FBF3E4)`, `var(--art-pop,#F2B124)`. Không có file này thì phím hiện chữ cái đầu.

Trong mini app:

```tsx
import { usePersistentState, type MiniAppProps } from '@bang/sdk';

export default function ChiTieu({ ctx }: MiniAppProps<Data>) {
  const [data, setData] = usePersistentState(ctx, initialData); // tự lưu
  ctx.notify('đã lưu');   // toast của launcher
  ctx.close();            // về bảng
}
```

Logic phức tạp nên tách ra hook riêng như `mini-apps/pomodoro/src/usePomodoro.ts`.

## Design tokens

Mọi mã màu, font, khoảng cách, z-index, thời gian chuyển động nằm trong `packages/ui/src/tokens/` và được chuyển thành biến CSS (`--bg`, `--ink`, `--space-7`, `--fs-md`...) lúc khởi động. Component và mini app chỉ dùng biến, không viết mã hex.

- Kiểu hiển thị (`looks.ts`): `quan` (mặc định: biển sơn nhiều màu, chữ bảng hiệu, nhấn lún), `readable` (chữ to), `board` (cổ điển, mono). CSS riêng cho một kiểu viết `:global(:root[data-look="quan"]) .x { … }` ngay trong module của component. Bối cảnh thiết kế ở `.impeccable.md`.
- Đổi màu giao diện: sửa `colors.ts` (bảng `palette`, `signPaint`, rồi `lightColors` / `darkColors`) và khối màu của từng kiểu trong `looks.ts`. Bốn màu sơn `--paint-red/yellow/green/blue` cùng `--paint-ink`/`--paint-paper` có ở mọi kiểu, dùng cho game và hình vẽ.
- Thêm màu phím cho người dùng chọn: thêm vào `keyColors`.
- Font: `--font-ui` (Be Vietnam Pro), `--font-display` (Vina Sans, chữ bảng hiệu cho số và tiêu đề lớn), `--font-hand` (Sriracha, chỉ cho nhãn viết tay ngắn). Đổi font: sửa `fontFamily` trong `typography.ts`/`looks.ts` và các import `@fontsource/*` trong `packages/ui/src/styles/fonts.ts` (font tự host để chạy offline).
- Hình vẽ màn trống/lỗi/mất mạng: `packages/ui/src/components/Illustration/art/*.svg`, cùng quy ước 3 biến `--art-*`.
- Icon PWA: vẽ ở `apps/launcher/public/icons/icon.svg`, các file PNG (192, 512, maskable, apple-touch 180) xuất từ file này.

## Component dùng chung (@bang/ui)

`Button`, `Key`, `KeyGrid`, `TopBar`, `Sheet`, `Dialog`, `Field`, `TextInput`, `Switch`, `Segmented`, `Swatches`, `ListRow`, `SectionHeader`, `Menu`, `Toast`, `EmptyState`, `Banner`, `Icon`, `Illustration`. Mỗi component một thư mục với file `.tsx`, `.module.css` và `index.ts`. Icon mới: thêm vào `components/Icon/icons.ts`.

## Deploy

Một image Docker chạy `apps/party-server/server.mjs`, phục vụ cả web app đã build lẫn WebSocket `/party` (game nhóm), nên không deploy được lên host tĩnh như Vercel/Cloudflare Pages.

```bash
# Máy build: build image linux/amd64 rồi đẩy lên Docker Hub
docker compose build && docker compose push

# Server: kéo bản mới và chạy lại
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

- Cổng mặc định 8787 (đổi bằng `APP_PORT` trong `.env`), kiểm tra bằng `curl localhost:8787/healthz`.
- `TRUST_PROXY=1` (đã bật trong `docker-compose.prod.yml`) khi chạy sau Cloudflare/nginx, để giới hạn kết nối theo IP thật của người chơi.
- Server phòng ở domain khác: build với `VITE_PARTY_URL=wss://.../party` (xem `.env.example`).
- Sau khi deploy, service worker tự áp bản mới lúc người dùng quay về bảng app.

## Chuyển dữ liệu từ bản HTML cũ

Trong bản cũ vào Cài đặt → xuất dữ liệu. Trong bản mới vào Cài đặt → nhập dữ liệu. Nếu chạy cùng tên miền, bản mới tự đọc dữ liệu cũ trong trình duyệt mà không cần làm gì.
