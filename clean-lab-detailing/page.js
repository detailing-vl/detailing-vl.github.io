(() => {
const root = document.documentElement;
const { body } = document;
const bar = document.querySelector('[data-sticky-bar]');
const hero = document.querySelector('[data-hero]');
const barSend = bar && bar.querySelector('.is-primary');
const barLabel = barSend && barSend.querySelector('span');
const barText = barLabel && barLabel.textContent;
let heroGone = false;
let sendShown = false;
const syncBar = () => bar.classList.toggle('is-visible', heroGone && !sendShown);
if (bar && hero && 'IntersectionObserver' in window) {
new IntersectionObserver(([entry]) => {
heroGone = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
syncBar();
}).observe(hero);
const pickerSend = document.querySelector('.picker_actions');
if (pickerSend) {
new IntersectionObserver(
([entry]) => {
sendShown = entry.isIntersecting;
syncBar();
},
{ rootMargin: '0px 0px -80px 0px' },
).observe(pickerSend);
}
}
let tick = 0;
const onScroll = () => {
tick = 0;
root.classList.toggle('is-scrolled', window.scrollY > 120);
};
window.addEventListener(
'scroll',
() => {
if (!tick) tick = requestAnimationFrame(onScroll);
},
{ passive: true },
);
onScroll();
const now = () => (window.__now ? new Date(window.__now) : new Date());
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const local = () => {
const parts = {};
new Intl.DateTimeFormat('en-US', {
timeZone: body.dataset.tz || undefined,
weekday: 'short',
month: 'numeric',
hour: '2-digit',
minute: '2-digit',
hourCycle: 'h23',
})
.formatToParts(now())
.forEach((part) => {
parts[part.type] = part.value;
});
return {
day: DAYS.indexOf(parts.weekday),
mins: Number(parts.hour) * 60 + Number(parts.minute),
month: Number(parts.month),
};
};
const marks = [...document.querySelectorAll('[data-status]')];
if (marks.length && body.dataset.week) {
const week = JSON.parse(body.dataset.week);
const UNTIL = [
'понедельника',
'вторника',
'среды',
'четверга',
'пятницы',
'субботы',
'воскресенья',
];
const mins = (clock) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
const status = () => {
const { day, mins: t } = local();
const today = week[day];
const before = week[(day + 6) % 7];
if (before && mins(before[1]) < mins(before[0]) && t < mins(before[1])) {
return [`Открыто до ${before[1]}`, true];
}
if (today) {
const from = mins(today[0]);
const to = mins(today[1]);
if (!from && to === 1440) return ['Открыто круглосуточно', true];
if (t >= from && (to < from || t < to)) return [`Открыто до ${today[1]}`, true];
if (t < from) return [`Закрыто, откроемся в ${today[0]}`, false];
}
for (let i = 1; i <= 7; i += 1) {
const next = (day + i) % 7;
if (week[next]) {
return [
i === 1
? `Закрыто, откроемся завтра в ${week[next][0]}`
: `Закрыто до ${UNTIL[next]} ${week[next][0]}`,
false,
];
}
}
return null;
};
const paint = () => {
let state;
try {
state = status();
} catch {
return;
}
if (!state) return;
const [text, open] = state;
marks.forEach((mark) => {
mark.textContent = text;
mark.classList.toggle('is-open', open);
mark.hidden = false;
});
};
paint();
window.setInterval(paint, 60000);
}
const picker = document.querySelector('[data-picker]');
let pick = null;
if (picker) {
const all = (selector) => [...picker.querySelectorAll(selector)];
const one = (selector) => picker.querySelector(selector);
const chips = all('[data-problem]');
const classes = all('[data-class]');
const rows = all('[data-svc]');
const zones = all('.zone');
const list = one('[data-picker-rows]');
const stage = one('.picker_stage');
const wait = one('[data-picker-wait]');
const bubble = one('[data-picker-message]');
const send = one('[data-picker-send]');
const sendLabel = one('[data-picker-send-label]');
const copy = one('[data-picker-copy]');
const classNames = [...document.querySelectorAll('[data-class-name]')];
const noClass = classNames.map((el) => el.textContent);
const hint = bubble.textContent;
const plainLabel = sendLabel.innerHTML;
const chosen = [];
let cls = null;
let message = '';
let parts = [];
all('[data-picker-ui]').forEach((el) => {
el.hidden = false;
});
one('[data-picker-nojs]').hidden = true;
const render = (lamp) => {
const key = cls ? cls.dataset.class : '';
document.querySelectorAll('[data-price]').forEach((el) => {
const byClass = el.dataset.prices ? JSON.parse(el.dataset.prices) : {};
el.textContent = byClass[key] || el.dataset.price;
});
classNames.forEach((el, i) => {
el.textContent = cls ? cls.dataset.say : noClass[i];
});
const scored = rows
.map((row, i) => {
const solves = row.dataset.solves.split(' ');
return { row, i, hits: chosen.filter((k) => solves.includes(k)) };
})
.filter((x) => x.hits.length)
.sort(
(a, b) =>
b.hits.length - a.hits.length ||
chosen.indexOf(a.hits[0]) - chosen.indexOf(b.hits[0]) ||
a.i - b.i,
);
const [main, ...rest] = scored;
const open = main ? chosen.filter((k) => !main.hits.includes(k)) : [];
const alt = rest.find((x) => x.hits.some((k) => open.includes(k))) || rest[0];
const shown = [main, alt].filter(Boolean);
rows.forEach((row) => {
if (!shown.some((x) => x.row === row)) row.hidden = true;
});
shown.forEach(({ row, hits }, n) => {
const reason = (n && hits.find((k) => open.includes(k))) || hits[0];
row.querySelector('[data-advice-num]').textContent = n + 1;
row.querySelector('[data-advice-kind]').textContent = n
? 'Ещё вариант'
: 'Скорее всего подойдёт';
row.querySelector('[data-advice-why]').textContent = JSON.parse(row.dataset.why)[reason];
row.classList.toggle('is-main', !n);
row.classList.toggle('is-in', row.hidden);
row.hidden = false;
list.append(row);
});
wait.hidden = shown.length > 0;
list.hidden = !shown.length;
zones.forEach((zone) => {
const n = shown.findIndex((x) => x.row.dataset.zone === zone.dataset.zone);
zone.classList.toggle('is-lit', n >= 0);
zone.classList.toggle('is-dim', chosen.length > 0 && n < 0);
zone.querySelector('[data-zone-num]').textContent = n < 0 ? '' : n + 1;
});
if (lamp) {
stage.classList.remove('is-lamp');
stage.getBoundingClientRect();
stage.classList.add('is-lamp');
}
const next = [];
if (chosen.length || cls) {
next.push('Здравствуйте!');
if (cls) next.push(`Машина: ${cls.dataset.say}.`);
const say = [];
chosen.forEach((k) => {
const { own, say: phrase } = chips.find((chip) => chip.dataset.problem === k).dataset;
if (own) next.push(`${own}.`);
else say.push(phrase);
});
if (say.length) next.push(`Беспокоит: ${say.join(', ')}.`);
if (shown.length) {
next.push(
`На сайте увидел: ${shown.map((x) => x.row.dataset.say).join(', ')}.`,
'Что посоветуете и сколько это будет стоить?',
'Могу прислать фото.',
);
} else {
next.push('Хочу записаться, подскажите по услугам и цене.');
}
}
message = next.join(' ');
bubble.classList.toggle('is-empty', !message);
bubble.textContent = message ? '' : hint;
next.forEach((text) => {
const span = document.createElement('span');
span.className = parts.includes(text) ? 'picker_part' : 'picker_part is-in';
span.textContent = text;
bubble.append(span, ' ');
});
parts = next;
send.href =
message && send.dataset.base
? send.dataset.base + encodeURIComponent(message)
: send.dataset.plain;
if (message) sendLabel.textContent = send.dataset.labelSend;
else sendLabel.innerHTML = plainLabel;
if (barSend && send.dataset.base) {
barSend.href = send.href;
barLabel.textContent = message ? 'Отправить' : barText;
}
if (copy) copy.hidden = !message;
};
const toggle = (chip, on) => {
const key = chip.dataset.problem;
const at = chosen.indexOf(key);
if (on && at < 0) chosen.push(key);
if (!on && at >= 0) chosen.splice(at, 1);
chip.setAttribute('aria-pressed', String(on));
render(on);
};
chips.forEach((chip) => {
chip.addEventListener('click', () => toggle(chip, !chosen.includes(chip.dataset.problem)));
});
const choose = (item) => {
cls = item;
classes.forEach((other) => {
other.setAttribute('aria-checked', String(other === item));
other.tabIndex = other === item ? 0 : -1;
});
render(false);
};
classes.forEach((item, i) => {
item.tabIndex = i ? -1 : 0;
item.addEventListener('click', () => choose(item));
item.addEventListener('keydown', (event) => {
const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
if (!step) return;
event.preventDefault();
const next = classes[(i + step + classes.length) % classes.length];
next.focus();
choose(next);
});
});
if (copy) {
const note = one('[data-picker-copy-status]');
const select = () => {
const range = document.createRange();
range.selectNodeContents(bubble);
const selection = window.getSelection();
selection.removeAllRanges();
selection.addRange(range);
note.textContent = 'Не получилось скопировать. Текст выделен, скопируйте вручную.';
};
copy.addEventListener('click', () => {
const done = () => {
copy.textContent = 'Скопировано';
note.textContent = 'Сообщение скопировано';
window.setTimeout(() => {
copy.textContent = 'Скопировать';
note.textContent = '';
}, 2000);
};
if (window.navigator.clipboard) {
window.navigator.clipboard.writeText(message).then(done, select);
} else select();
});
}
pick = (key) => {
const chip = chips.find((item) => item.dataset.problem === key);
if (chip && !chosen.includes(key)) toggle(chip, true);
};
}
document.addEventListener('click', (event) => {
const link = event.target.closest('a[data-pick]');
if (link && pick) pick(link.dataset.pick);
});
const season = document.querySelector('[data-season]');
if (season) {
const MONTHS = [
'Январь',
'Февраль',
'Март',
'Апрель',
'Май',
'Июнь',
'Июль',
'Август',
'Сентябрь',
'Октябрь',
'Ноябрь',
'Декабрь',
];
let month = 0;
try {
({ month } = local());
} catch {
month = 0;
}
const item = [...season.querySelectorAll('[data-months]')].find((el) =>
el.dataset.months.split(',').includes(String(month)),
);
if (item) {
const title = season.querySelector('[data-season-title]');
const box = season.querySelector('[data-season-now]');
const chipList = item.querySelector('.season_chips');
title.textContent = `${MONTHS[month - 1]} ${title.dataset.prep}`;
box.querySelector('[data-season-text]').textContent =
item.querySelector('[data-season-line]').textContent;
if (chipList) box.append(chipList.cloneNode(true));
box.hidden = false;
item.classList.add('is-now');
season.querySelector('[data-season-year]').open = false;
}
}
document.querySelectorAll('[data-compare]').forEach((box) => {
const handle = box.querySelector('[data-compare-handle]');
if (!handle) return;
let pos = 50;
let dragging = false;
const set = (value) => {
pos = Math.min(100, Math.max(0, value));
const shown = Math.round(pos);
box.style.setProperty('--pos', pos.toFixed(2));
handle.setAttribute('aria-valuenow', String(shown));
handle.setAttribute('aria-valuetext', `${shown}% до, ${100 - shown}% после`);
};
const fromPointer = (event) => {
const rect = box.getBoundingClientRect();
set(((event.clientX - rect.left) / rect.width) * 100);
};
box.addEventListener('pointerdown', (event) => {
dragging = true;
box.setPointerCapture(event.pointerId);
fromPointer(event);
});
box.addEventListener('pointermove', (event) => {
if (dragging) fromPointer(event);
});
const stop = () => {
dragging = false;
};
box.addEventListener('pointerup', stop);
box.addEventListener('pointercancel', stop);
handle.addEventListener('keydown', (event) => {
const step = event.shiftKey ? 10 : 5;
const moves = {
ArrowLeft: pos - step,
ArrowDown: pos - step,
ArrowRight: pos + step,
ArrowUp: pos + step,
PageDown: pos - 10,
PageUp: pos + 10,
Home: 0,
End: 100,
};
if (!(event.key in moves)) return;
event.preventDefault();
set(moves[event.key]);
});
});
})();