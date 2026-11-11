(() => {
const stage = document.querySelector('[data-scene-stage]');
const wrap = stage && stage.querySelector('[data-scene-wrap]');
if (!stage || !wrap) return;
const MAX = 100;
const settleAt = () => Number(window.getComputedStyle(stage).getPropertyValue('--settle')) || 68;
const SAMPLES = 30;
const SWIPE = 12;
const cfg = window.__sceneCfg || {};
const budget = cfg.budget ?? 8;
const frameLimit = cfg.frameLimit ?? 32;
const slowShare = 0.15;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let wipe = 42;
let live = true;
let touched = false;
let auto = false;
let autoRaf = 0;
let flashTimer = 0;
let sum = 0;
let styleRead = '';
let edge = '';
const durations = [];
const autoStats = { frames: 0, slow: 0, share: 0 };
const clamp = (v) => Math.min(MAX, Math.max(0, v));
function setAria() {
stage.setAttribute('aria-valuenow', String(Math.round(wipe)));
stage.setAttribute('aria-valuetext', `${Math.round(wipe)} % после`);
const next = wipe < 16 ? 'low' : wipe > 82 ? 'high' : '';
if (next !== edge) {
edge = next;
stage.dataset.edge = edge;
}
}
function flash() {
stage.classList.add('is-wiping');
window.clearTimeout(flashTimer);
flashTimer = window.setTimeout(() => {
stage.classList.remove('is-wiping');
setAria();
}, 180);
}
function rest(value) {
auto = false;
cancelAnimationFrame(autoRaf);
wipe = value;
stage.style.setProperty('--wipe', String(value));
stage.classList.remove('is-autowipe');
setAria();
}
function fallback(reason) {
live = false;
stage.classList.remove('is-wiping');
rest(settleAt());
stage.dataset.governor = reason;
}
function paint(value) {
wipe = clamp(value);
const t0 = performance.now();
stage.style.setProperty('--wipe', wipe.toFixed(2));
styleRead = window.getComputedStyle(wrap).transform;
const cost = performance.now() - t0;
if (live && styleRead) {
durations.push(cost);
sum += cost;
if (durations.length > SAMPLES) sum -= durations.shift();
if (durations.length === SAMPLES && sum / SAMPLES > budget) fallback('budget');
}
flash();
}
function interruptAuto() {
touched = true;
if (!auto) return;
const matrix = new window.DOMMatrix(window.getComputedStyle(wrap).transform);
const width = stage.getBoundingClientRect().width || 1;
rest(clamp(MAX - (matrix.m41 / width) * 100));
}
function finishAuto() {
if (!auto) return;
rest(settleAt());
flash();
}
['animationend', 'animationcancel'].forEach((type) =>
wrap.addEventListener(type, (event) => {
if (event.target === wrap) finishAuto();
}),
);
motion.addEventListener('change', () => {
if (motion.matches) finishAuto();
});
function runAuto() {
if (!live || touched || motion.matches) return;
auto = true;
let last = 0;
stage.classList.add('is-autowipe', 'is-wiping');
const tick = (now) => {
if (!auto) return;
if (last) {
autoStats.frames += 1;
if (autoStats.frames > 2 && now - last > frameLimit) autoStats.slow += 1;
autoStats.share = autoStats.slow / autoStats.frames;
if (autoStats.frames >= 10 && autoStats.share > slowShare) {
fallback('frames');
return;
}
}
last = now;
autoRaf = requestAnimationFrame(tick);
};
autoRaf = requestAnimationFrame(tick);
}
let pid = null;
let startX = 0;
let startY = 0;
let base = 0;
let width = 1;
let started = false;
let dead = false;
stage.addEventListener('pointerdown', (event) => {
if (!live || pid !== null) return;
if (event.pointerType === 'mouse' && event.button !== 0) return;
if (event.target.closest('a, button')) return;
pid = event.pointerId;
startX = event.clientX;
startY = event.clientY;
started = false;
dead = false;
});
stage.addEventListener('pointermove', (event) => {
if (event.pointerId !== pid || dead || !live) return;
if (!started) {
const dx = Math.abs(event.clientX - startX);
const dy = Math.abs(event.clientY - startY);
if (dx > SWIPE && dx > dy) {
started = true;
interruptAuto();
base = wipe;
startX = event.clientX;
width = stage.getBoundingClientRect().width || 1;
if (event.pointerType === 'mouse') stage.setPointerCapture(pid);
} else {
dead = dy > SWIPE;
return;
}
}
paint(base - ((event.clientX - startX) / width) * 100);
});
const release = (event) => {
if (event.pointerId !== pid) return;
pid = null;
started = false;
};
stage.addEventListener('pointerup', release);
stage.addEventListener('pointercancel', release);
stage.addEventListener('keydown', (event) => {
if (
!live ||
!['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].includes(event.key)
)
return;
event.preventDefault();
interruptAuto();
const moves = {
ArrowLeft: wipe + 5,
ArrowUp: wipe + 5,
ArrowRight: wipe - 5,
ArrowDown: wipe - 5,
Home: 0,
End: MAX,
};
paint(moves[event.key]);
setAria();
});
if (!motion.matches) {
const ready = (img) =>
img.decode
? img.decode().catch(() => {})
: new Promise((resolve) => {
if (img.complete) resolve();
else img.addEventListener('load', resolve, { once: true });
});
Promise.all([...stage.querySelectorAll('img')].map(ready)).then(() => {
window.setTimeout(runAuto, 300);
});
}
window.__scene = {
get wipe() {
return wipe;
},
get live() {
return live;
},
get auto() {
return auto;
},
autoStats: () => ({ ...autoStats }),
stats: () => {
const sorted = [...durations].sort((a, b) => a - b);
const mean = sorted.reduce((total, v) => total + v, 0) / (sorted.length || 1);
const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0;
return { n: sorted.length, mean, p95 };
},
update: paint,
};
})();