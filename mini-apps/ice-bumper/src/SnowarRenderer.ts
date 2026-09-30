import type { PlayerVehicle, Snowball } from './game';

/**
 * Vẽ chiếc xe ủi tuyết (Snow Bulldozer) có chú chim cánh cụt lái bên trên theo phong cách Snowar.io
 */
export function drawVehicle(
  ctx: CanvasRenderingContext2D,
  v: PlayerVehicle,
  isMe: boolean,
) {
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);

  // 1. Bóng đổ dưới gầm xe
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 32, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Hai bánh xích (Tank tracks) màu đen/xám kim loại
  ctx.fillStyle = '#334155';
  // Bánh xích trái
  ctx.fillRect(-24, -20, 44, 9);
  // Bánh xích phải
  ctx.fillRect(-24, 11, 44, 9);

  // Chi tiết rãnh xích
  ctx.fillStyle = '#1e293b';
  for (let i = -20; i <= 16; i += 6) {
    ctx.fillRect(i, -20, 2, 9);
    ctx.fillRect(i, 11, 2, 9);
  }

  // 3. Thân xe ủi chính (Màu theo skin xe)
  ctx.fillStyle = v.skin.color;
  if (ctx.roundRect) {
    ctx.roundRect(-20, -12, 38, 24, 6);
  } else {
    ctx.rect(-20, -12, 38, 24);
  }
  ctx.fill();

  // Động cơ & Ống khói phía sau xe
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-22, -6, 6, 12);
  // Ống xả khói
  ctx.fillStyle = '#475569';
  ctx.fillRect(-18, -10, 4, 4);

  // 4. Lưỡi gạt tuyết trước xe (Snow plow blade)
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(18, -22);
  ctx.lineTo(26, -18);
  ctx.lineTo(26, 18);
  ctx.lineTo(18, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cần thủy lực nối lưỡi gạt vào thân xe
  ctx.fillStyle = '#475569';
  ctx.fillRect(10, -16, 10, 4);
  ctx.fillRect(10, 12, 10, 4);

  // 5. Chú chim cánh cụt ngồi lái
  // Thân đen
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-2, 0, 9, 0, Math.PI * 2);
  ctx.fill();

  // Bụng trắng
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(1, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  // Mỏ vàng nhô về phía trước
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(4, -3);
  ctx.lineTo(9, 0);
  ctx.lineTo(4, 3);
  ctx.closePath();
  ctx.fill();

  // Hai mắt
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
  ctx.arc(3, 2, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Mũ đội đầu của chim cánh cụt
  if (v.skin.hat === 'beanie') {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-5, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    // Chóp bông nón len
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-9, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (v.skin.hat === 'crown') {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(-2, -3);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-2, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
  } else if (v.skin.hat === 'viking') {
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(-4, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    // 2 sừng trắng
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-5, -9, 3, 4);
    ctx.fillRect(-5, 5, 3, 4);
  }

  // 6. Quả cầu tuyết đang ủi trước mũi xe
  if (v.snowballRadius > 2) {
    const ballDist = 26 + v.snowballRadius * 0.85;
    ctx.save();
    ctx.translate(ballDist, 0);

    // Bóng đổ quả bóng tuyết
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 3, v.snowballRadius, v.snowballRadius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân quả cầu tuyết trắng muốt
    const grad = ctx.createRadialGradient(
      -v.snowballRadius * 0.3,
      -v.snowballRadius * 0.3,
      v.snowballRadius * 0.1,
      0,
      0,
      v.snowballRadius,
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.8, '#e0f2fe');
    grad.addColorStop(1, '#bae6fd');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, v.snowballRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();

  // 7. Bảng tên & Mũi tên chỉ người chơi mình
  ctx.save();
  ctx.translate(v.x, v.y);

  if (isMe) {
    // Tam giác chỉ dấu "TÔI"
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(-6, -46);
    ctx.lineTo(6, -46);
    ctx.closePath();
    ctx.fill();
  }

  // Khung tên
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textW = ctx.measureText(v.name).width;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  if (ctx.roundRect) {
    ctx.roundRect(-textW / 2 - 6, -34, textW + 12, 18, 9);
  } else {
    ctx.fillRect(-textW / 2 - 6, -34, textW + 12, 18);
  }
  ctx.fill();

  ctx.fillStyle = isMe ? '#fef08a' : '#ffffff';
  ctx.fillText(v.name, 0, -25);

  ctx.restore();
}

/**
 * Vẽ bóng tuyết đang bay trên mặt biển/đảo sau khi được người chơi thả bắn đi
 */
export function drawFlyingSnowball(ctx: CanvasRenderingContext2D, ball: Snowball) {
  ctx.save();
  ctx.translate(ball.x, ball.y);

  // Vệt tuyết bay phía sau
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(-ball.vx * 1.5, -ball.vy * 1.5, ball.radius * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Bóng đổ
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 4, ball.radius, ball.radius * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Quả bóng tuyết bay
  const grad = ctx.createRadialGradient(
    -ball.radius * 0.3,
    -ball.radius * 0.3,
    ball.radius * 0.1,
    0,
    0,
    ball.radius,
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.8, '#e0f2fe');
  grad.addColorStop(1, '#7dd3fc');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Vẽ tảng băng nổi và hiệu ứng nứt băng co hẹp giữa biển nước
 */
export function drawIceArena(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
) {
  // 1. Thành băng chìm dưới nước (Chiều sâu 3D của tảng băng)
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 32, radius * 1.02, radius * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Viền bọt biển trắng vỗ quanh mép băng
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, radius + 8, radius * 0.6 + 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Mặt trên của đảo băng nổi (Mặt phẳng thi đấu tuyết trắng)
  const iceGrad = ctx.createRadialGradient(cx, cy - 20, radius * 0.2, cx, cy, radius);
  iceGrad.addColorStop(0, '#ffffff');
  iceGrad.addColorStop(0.6, '#f0f9ff');
  iceGrad.addColorStop(1, '#bae6fd');

  ctx.fillStyle = iceGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius, radius * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Các vết rạn nứt băng (Cracks)
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Vết nứt 1
  ctx.moveTo(cx - radius * 0.6, cy - radius * 0.1);
  ctx.lineTo(cx - radius * 0.2, cy + radius * 0.1);
  ctx.lineTo(cx, cy + radius * 0.35);
  // Vết nứt 2
  ctx.moveTo(cx + radius * 0.5, cy - radius * 0.2);
  ctx.lineTo(cx + radius * 0.2, cy);
  ctx.lineTo(cx + radius * 0.3, cy + radius * 0.3);
  ctx.stroke();

  // Vũng nước tan chảy nhỏ trên mặt băng
  ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx + radius * 0.3, cy - radius * 0.15, 24, 14, 0.2, 0, Math.PI * 2);
  ctx.fill();
}
