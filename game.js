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

const left = { x: 20, y: H / 2 - PADDLE_H / 2, score: 0 };
const right = { x: W - 20 - PADDLE_W, y: H / 2 - PADDLE_H / 2, score: 0 };
const ball = { x: 0, y: 0, vx: 0, vy: 0 };

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

  if (left.score >= WIN_SCORE) winner = mode === "ai" ? "Tu gagnes !" : "Joueur 1 gagne !";
  else if (right.score >= WIN_SCORE) winner = mode === "ai" ? "L'IA gagne !" : "Joueur 2 gagne !";
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#eee";
  ctx.textAlign = "center";
  ctx.font = "36px monospace";
  ctx.fillText(title, W / 2, H / 2 - 20);
  ctx.font = "18px monospace";
  subtitle.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 + 25 + i * 28));
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Filet
  ctx.fillStyle = "#444";
  for (let y = 0; y < H; y += 30) ctx.fillRect(W / 2 - 2, y, 4, 15);

  // Raquettes et balle
  ctx.fillStyle = "#eee";
  ctx.fillRect(left.x, left.y, PADDLE_W, PADDLE_H);
  ctx.fillRect(right.x, right.y, PADDLE_W, PADDLE_H);
  ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);

  // Score
  ctx.font = "48px monospace";
  ctx.textAlign = "center";
  ctx.fillText(left.score, W / 4, 60);
  ctx.fillText(right.score, (3 * W) / 4, 60);

  if (!mode) {
    drawOverlay("PONG", ["1 : jouer contre l'IA", "2 : jouer à deux"]);
  } else if (winner) {
    drawOverlay(winner, ["Espace pour rejouer", "Échap pour le menu"]);
  } else if (paused) {
    drawOverlay("PAUSE", ["Espace pour reprendre", "Échap pour le menu"]);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

restart();
loop();
