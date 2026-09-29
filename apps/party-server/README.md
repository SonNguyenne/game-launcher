# party-server

Server phòng chơi cho các game nhóm (vòng quay phạt, chuyền bom, thật hay thách, đố nhanh).
Server chỉ chuyển tin giữa các máy trong phòng; luật chơi chạy trên máy chủ phòng.
Phòng lưu trong RAM: khởi động lại server là mất phòng đang mở.

## Chạy khi phát triển

```sh
pnpm dev   # chạy cùng lúc Vite và server phòng (cổng 8787, tự khởi động lại khi sửa server.mjs)
```

Vite chuyển `/party` sang cổng 8787. Nếu thấy `ws proxy error: ECONNREFUSED 127.0.0.1:8787`
là server phòng chưa chạy: dùng `pnpm dev` ở thư mục gốc, hoặc chạy riêng `pnpm party-server`.

## Deploy

Một process phục vụ cả web app đã build lẫn WebSocket:

```sh
pnpm install
pnpm build
PORT=8787 node apps/party-server/server.mjs
```

Biến môi trường: `PORT` (8787), `HOST` (0.0.0.0), `STATIC_DIR` (apps/launcher/dist),
`TRUST_PROXY=1` khi chạy sau Cloudflare/nginx (giới hạn kết nối theo IP thật).

Server tự nén brotli/gzip và giữ file build trong RAM, không cần proxy lo phần này.
Kiểm tra: `curl localhost:8787/healthz`.

Nếu đặt sau nginx, cần cho phép nâng cấp WebSocket ở `/party`:

```nginx
location /party {
  proxy_pass http://127.0.0.1:8787;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 1h;
}
location / {
  proxy_pass http://127.0.0.1:8787;
}
```

Web app dùng HTTPS thì WebSocket tự dùng `wss://` cùng domain.
Muốn đặt server phòng ở domain khác, build với `VITE_PARTY_URL=wss://phong.example.com/party`.
