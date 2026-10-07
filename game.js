const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const PADDLE_W = 12;
const PADDLE_H = 90;
const PADDLE_SPEED = 7;
const BALL_SIZE = 12;
const BALL_SPEED = 3.5;
const WIN_SCORE = 7;

// IA : plus lente que le joueur et imprécise, pour rester battable
const AI_SPEED = 4.5;
const AI_MAX_ERROR = PADDLE_H * 0.45;

// Thème impérial
const NAVY = "#14215a";
const GOLD = "#d4af37";
const GOLD_LIGHT = "#f3dc8a";
const BLEU = "#1f3c9c";
const BLANC = "#f4f1e6";
const ROUGE = "#b3202a";
const FONT = "Georgia, 'Times New Roman', serif";
const TRAIL_LENGTH = 12;

const left = { x: 20, y: H / 2 - PADDLE_H / 2, score: 0 };
const right = { x: W - 20 - PADDLE_W, y: H / 2 - PADDLE_H / 2, score: 0 };
const ball = { x: 0, y: 0, vx: 0, vy: 0 };
const trail = [];

const keys = {};
let mode = null; // null = menu, "ai" = contre l'IA, "pvp" = deux joueurs
let paused = false;
let winner = null;
let aiError = 0;

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;
  if (key === " " || key === "arrowup" || key === "arrowdown") e.preventDefault();

  if (!mode) {
    if (key === "1" || key === "&") start("ai");
    else if (key === "2" || key === "é") start("pvp");
    return;
  }
  if (key === "escape") {
    mode = null;
    paused = false;
  } else if (key === " ") {
    if (winner) restart();
    else paused = !paused;
  }
});
document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function start(newMode) {
  mode = newMode;
  paused = false;
  restart();
}

function newAiError() {
  aiError = (Math.random() * 2 - 1) * AI_MAX_ERROR;
}

function resetBall(direction) {
  ball.x = W / 2 - BALL_SIZE / 2;
  ball.y = H / 2 - BALL_SIZE / 2;
  const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6; // ±30°
  ball.vx = direction * BALL_SPEED * Math.cos(angle);
  ball.vy = BALL_SPEED * Math.sin(angle);
  trail.length = 0;
  newAiError();
}

function restart() {
  left.score = 0;
  right.score = 0;
  left.y = right.y = H / 2 - PADDLE_H / 2;
  winner = null;
  resetBall(Math.random() < 0.5 ? -1 : 1);
}

function clampPaddle(paddle) {
  paddle.y = Math.max(0, Math.min(H - PADDLE_H, paddle.y));
}

function movePaddle(paddle, upKeys, downKeys) {
  if (upKeys.some((k) => keys[k])) paddle.y -= PADDLE_SPEED;
  if (downKeys.some((k) => keys[k])) paddle.y += PADDLE_SPEED;
  clampPaddle(paddle);
}

function moveAI(paddle) {
  // Suit la balle quand elle arrive, sinon revient doucement au centre
  const comingToward = ball.vx > 0 && ball.x > W * 0.3;
  const target = comingToward ? ball.y + BALL_SIZE / 2 + aiError : H / 2;
  const diff = target - (paddle.y + PADDLE_H / 2);
  const speed = comingToward ? AI_SPEED : AI_SPEED / 2;
  paddle.y += Math.sign(diff) * Math.min(speed, Math.abs(diff));
  clampPaddle(paddle);
}

function bounceOffPaddle(paddle, direction) {
  // L'angle de renvoi dépend de l'endroit où la balle touche la raquette
  const hit = (ball.y + BALL_SIZE / 2 - (paddle.y + PADDLE_H / 2)) / (PADDLE_H / 2);
  const angle = hit * (Math.PI / 4); // max ±45°
  const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.05, 14);
  ball.vx = direction * speed * Math.cos(angle);
  ball.vy = speed * Math.sin(angle);
  newAiError();
}

function collides(paddle) {
  return (
    ball.x < paddle.x + PADDLE_W &&
    ball.x + BALL_SIZE > paddle.x &&
    ball.y < paddle.y + PADDLE_H &&
    ball.y + BALL_SIZE > paddle.y
  );
}

function update() {
  if (!mode || paused || winner) return;

  if (mode === "ai") {
    movePaddle(left, ["z", "arrowup"], ["s", "arrowdown"]);
    moveAI(right);
  } else {
    movePaddle(left, ["z"], ["s"]);
    movePaddle(right, ["arrowup"], ["arrowdown"]);
  }

  trail.push({ x: ball.x + BALL_SIZE / 2, y: ball.y + BALL_SIZE / 2 });
  if (trail.length > TRAIL_LENGTH) trail.shift();

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Rebonds haut / bas
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy *= -1;
  } else if (ball.y + BALL_SIZE >= H) {
    ball.y = H - BALL_SIZE;
    ball.vy *= -1;
  }

  // Rebonds sur les raquettes
  if (ball.vx < 0 && collides(left)) {
    ball.x = left.x + PADDLE_W;
    bounceOffPaddle(left, 1);
  } else if (ball.vx > 0 && collides(right)) {
    ball.x = right.x - BALL_SIZE;
    bounceOffPaddle(right, -1);
  }

  // Points
  if (ball.x + BALL_SIZE < 0) {
    right.score++;
    resetBall(-1);
  } else if (ball.x > W) {
    left.score++;
    resetBall(1);
  }

  if (left.score >= WIN_SCORE) {
    winner = mode === "ai" ? ["Austerlitz !", "Victoire de l'Empereur"] : ["Austerlitz !", "Napoléon gagne"];
  } else if (right.score >= WIN_SCORE) {
    winner = mode === "ai" ? ["Waterloo…", "Wellington (l'IA) l'emporte"] : ["Waterloo…", "Wellington gagne"];
  }
}

// ---------- Décor (dessiné une seule fois dans un canvas hors écran) ----------

function drawBee(c, x, y, s) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.beginPath(); // ailes
  c.ellipse(-5, -3, 6, 3.5, -0.6, 0, Math.PI * 2);
  c.ellipse(5, -3, 6, 3.5, 0.6, 0, Math.PI * 2);
  c.fill();
  c.beginPath(); // tête, corps, abdomen
  c.arc(0, -7, 2.2, 0, Math.PI * 2);
  c.ellipse(0, -2.5, 2.6, 3, 0, 0, Math.PI * 2);
  c.ellipse(0, 5, 3.4, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawLaurel(c, cx, cy, r) {
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      // de bas en haut le long de chaque moitié de la couronne
      const a = Math.PI / 2 + side * (0.25 + i * 0.22);
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      const tangent = a + side * (Math.PI / 2);
      for (const tilt of [-0.5, 0.5]) {
        c.beginPath();
        c.ellipse(
          x + Math.cos(tangent + tilt) * 7,
          y + Math.sin(tangent + tilt) * 7,
          9, 3.5, tangent + tilt, 0, Math.PI * 2
        );
        c.fill();
      }
    }
  }
}

function buildBackground() {
  const bg = document.createElement("canvas");
  bg.width = W;
  bg.height = H;
  const c = bg.getContext("2d");

  const grad = c.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.65);
  grad.addColorStop(0, "#26398a");
  grad.addColorStop(1, "#0a1235");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  // Semis d'abeilles impériales
  c.fillStyle = GOLD;
  c.globalAlpha = 0.13;
  for (let row = 0, y = 35; y < H; y += 60, row++) {
    for (let x = row % 2 ? 70 : 30; x < W; x += 80) drawBee(c, x, y, 1.1);
  }

  // « N » couronné de laurier au centre
  c.globalAlpha = 0.22;
  drawLaurel(c, W / 2, H / 2, 85);
  c.font = `bold 110px ${FONT}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("N", W / 2, H / 2 + 6);

  // Double cadre doré
  c.globalAlpha = 1;
  c.strokeStyle = GOLD;
  c.lineWidth = 3;
  c.strokeRect(6, 6, W - 12, H - 12);
  c.lineWidth = 1;
  c.strokeRect(12, 12, W - 24, H - 24);
  return bg;
}

const background = buildBackground();

// ---------- Rendu ----------

function drawNapoleonPaddle(p) {
  // Bleu-blanc-rouge de haut en bas
  const third = PADDLE_H / 3;
  ctx.fillStyle = BLEU;
  ctx.fillRect(p.x, p.y, PADDLE_W, third);
  ctx.fillStyle = BLANC;
  ctx.fillRect(p.x, p.y + third, PADDLE_W, third);
  ctx.fillStyle = ROUGE;
  ctx.fillRect(p.x, p.y + 2 * third, PADDLE_W, third);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x, p.y, PADDLE_W, PADDLE_H);
}

function drawWellingtonPaddle(p) {
  // Tunique rouge et baudriers blancs croisés
  ctx.fillStyle = ROUGE;
  ctx.fillRect(p.x, p.y, PADDLE_W, PADDLE_H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x, p.y, PADDLE_W, PADDLE_H);
  ctx.clip();
  ctx.strokeStyle = BLANC;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + 25);
  ctx.lineTo(p.x + PADDLE_W, p.y + 65);
  ctx.moveTo(p.x + PADDLE_W, p.y + 25);
  ctx.lineTo(p.x, p.y + 65);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x, p.y, PADDLE_W, PADDLE_H);
}

function drawCannonball() {
  // Traînée de fumée
  trail.forEach((t, i) => {
    const k = (i + 1) / trail.length;
    ctx.fillStyle = `rgba(200, 200, 200, ${0.25 * k})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 3 + 4 * k, 0, Math.PI * 2);
    ctx.fill();
  });

  const r = BALL_SIZE / 2;
  const cx = ball.x + r;
  const cy = ball.y + r;
  const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, r + 1);
  grad.addColorStop(0, "#9a9a9a");
  grad.addColorStop(0.5, "#3a3a3a");
  grad.addColorStop(1, "#0d0d0d");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawScores() {
  ctx.fillStyle = GOLD_LIGHT;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `bold 48px ${FONT}`;
  ctx.fillText(left.score, W / 4, 70);
  ctx.fillText(right.score, (3 * W) / 4, 70);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = GOLD;
  ctx.fillText("NAPOLÉON", W / 4, 92);
  ctx.fillText(mode === "ai" ? "WELLINGTON (IA)" : "WELLINGTON", (3 * W) / 4, 92);
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = "rgba(10, 18, 53, 0.82)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText(title, W / 2, H / 2 - 30);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 140, H / 2 - 12);
  ctx.lineTo(W / 2 + 140, H / 2 - 12);
  ctx.stroke();
  ctx.fillStyle = BLANC;
  ctx.font = `20px ${FONT}`;
  subtitle.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 + 22 + i * 30));
}

function draw() {
  ctx.drawImage(background, 0, 0);

  // Filet doré
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.5;
  for (let y = 20; y < H - 20; y += 26) ctx.fillRect(W / 2 - 1.5, y, 3, 12);
  ctx.globalAlpha = 1;

  drawScores();
  drawNapoleonPaddle(left);
  drawWellingtonPaddle(right);
  if (mode) drawCannonball();

  if (!mode) {
    drawOverlay("Pong Impérial", ["1 : Napoléon contre l'IA", "2 : Napoléon contre Wellington, à deux"]);
  } else if (winner) {
    drawOverlay(winner[0], [winner[1], "Espace pour rejouer · Échap pour le menu"]);
  } else if (paused) {
    drawOverlay("Pause", ["Espace pour reprendre", "Échap pour le menu"]);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

restart();
loop();
