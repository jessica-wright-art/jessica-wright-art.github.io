/* page behaviour: animations, gallery, map, viewer. */

const HINT = {fire:"the fire flickers",glow:"the lights come on",twinkle:"the lights twinkle",glints:"the light catches the water",rain:"it starts to rain",notes:"the music plays",bubbles:"bubbles rise",stars:"the stars come out",wash:"colour washes in",sun:"the sun comes out",people:"people pass by",birds:"birds fly over",smoke:"smoke drifts by",balloon:"a balloon floats away",snow:"it starts to snow"};

/* ---------- life engine: only runs on hover (or tap on touch screens) ---------- */
const lives = new Set(); let raf = 0, lastT = 0;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
function tick(now) {
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  lives.forEach(l => l.draw(dt, now / 1000));
  raf = lives.size ? requestAnimationFrame(tick) : 0;
}
class Life {
  constructor(stage, fx) { this.stage = stage; this.fx = fx; this.on = false; this.img = stage.querySelector(".art"); }
  start() {
    if (this.on) return; this.on = true;
    this.sys = this.fx.map(f => SYS[f.t](f));
    const mk = cls => this.stage.querySelector("canvas." + cls) || this.stage.appendChild(Object.assign(document.createElement("canvas"), { className: cls, ariaHidden: "true" }));
    this.wcv = mk("fxw"); this.cv = mk("fxc");
    this.size(); lives.add(this);
    if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
  }
  size() { const r = this.stage.getBoundingClientRect(); this.d = Math.min(2, devicePixelRatio || 1);
    [this.cv, this.wcv].forEach(cv => { cv.width = Math.max(1, r.width * this.d | 0); cv.height = Math.max(1, r.height * this.d | 0); }); }
  stop() { if (!this.on) return; this.on = false; lives.delete(this); [this.cv, this.wcv].forEach(cv => cv.getContext("2d").clearRect(0, 0, cv.width, cv.height)); }
  draw(dt, t) {
    const c = this.cv.getContext("2d"), W = this.cv.width, H = this.cv.height; this.w = this.wcv.getContext("2d");
    c.clearRect(0, 0, W, H); this.w.clearRect(0, 0, W, H);
    this.sys.forEach(s => s(dt, t, c, W, H, this.d, this));
  }
}
window.addEventListener("resize", () => lives.forEach(l => { l.size(); l.sys = l.fx.map(f => SYS[f.t](f)); }));
function glow(c, x, y, r, rgb, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
const SYS = {
  /* watercolour colour washes blooming in over the pencil (drawn on a multiply layer, so the linework stays crisp) */
  wash(f) {
    const seeds = []; let tt = 0;
    return (dt, t, c, W, H, d, life) => {
      const w = life.w; tt += dt;
      while (seeds.length < 80 && seeds.length < tt * 30) {
        const z = pick(f.z), b = z.b;
        seeds.push({ x: rnd(b[0], b[2]) * W, y: rnd(b[1], b[3]) * H, r: rnd(.05, .13) * W, born: tt, col: z.c, a: rnd(.35, .55), sx: rnd(.7, 1.3) });
      }
      seeds.forEach(s => {
        const k = Math.min(1, (tt - s.born) / 1.4), e = 1 - Math.pow(1 - k, 3), r = s.r * e;
        if (r < 1) return;
        w.save(); w.translate(s.x, s.y); w.scale(s.sx, 1);
        const g = w.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, `rgba(${s.col},${s.a})`); g.addColorStop(.7, `rgba(${s.col},${s.a * .7})`); g.addColorStop(1, `rgba(${s.col},0)`);
        w.fillStyle = g; w.beginPath(); w.arc(0, 0, r, 0, 7); w.fill(); w.restore();
      });
    };
  },
  /* warm sunlight from one corner, with drifting dust in the light */
  sun(f) {
    const motes = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), vx: rnd(-.01, .01), vy: rnd(-.012, -.003), ph: rnd(0, 6.28) }));
    let tt = 0;
    return (dt, t, c, W, H, d, life) => {
      tt += dt; const up = Math.min(1, tt / 1.6), br = .92 + .08 * Math.sin(t * .8);
      const w = life.w, x = f.at[0] * W, y = f.at[1] * H, R = Math.max(W, H) * 1.25;
      const g = w.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, `rgba(255,196,120,${.5 * up * br})`); g.addColorStop(.45, `rgba(255,214,160,${.28 * up * br})`); g.addColorStop(1, "rgba(255,230,200,0)");
      w.fillStyle = g; w.fillRect(0, 0, W, H);
      motes.forEach(m => {
        m.x += m.vx * dt; m.y += m.vy * dt; if (m.y < 0) m.y = 1; if (m.x < 0) m.x = 1; if (m.x > 1) m.x = 0;
        const a = up * (.35 + .35 * Math.sin(t * 1.7 + m.ph));
        c.fillStyle = `rgba(255,236,190,${a})`; c.beginPath(); c.arc(m.x * W, m.y * H, 1.8 * d, 0, 7); c.fill();
      });
    };
  },
  /* little people walking across the street */
  people(f) {
    const coats = ["232,120,110", "110,150,210", "240,190,90", "150,190,140", "190,150,210", "90,90,110"];
    const [xa, xb] = f.x || [0, 1];
    const ps = Array.from({ length: f.n || 4 }, () => ({ x: rnd(xa, xb), dir: Math.random() < .5 ? -1 : 1, sp: rnd(.025, .05), ph: rnd(0, 6.28), sc: rnd(.85, 1.1), dy: rnd(-.012, .012), col: pick(coats), bag: Math.random() < .35 }));
    let tt = 0;
    return (dt, t, c, W, H, d) => {
      tt += dt; const up = Math.min(1, tt / .8);
      ps.sort((a, b) => a.dy - b.dy).forEach(p => {
        p.x += p.dir * p.sp * dt;
        if (p.x > xb + .05) p.x = xa - .05; if (p.x < xa - .05) p.x = xb + .05;
        const h = f.s * H * p.sc, x = p.x * W, y = (f.y + p.dy) * H, sw = Math.sin(t * 7 * p.sp / .035 + p.ph) * .45;
        const hip = y - h * .42, sh = y - h * .78;
        c.globalAlpha = up; c.lineCap = "round"; c.strokeStyle = "rgba(32,32,40,.9)"; c.lineWidth = Math.max(1.2 * d, h * .045);
        c.beginPath(); c.moveTo(x, hip); c.lineTo(x + Math.sin(sw) * h * .42, y); c.moveTo(x, hip); c.lineTo(x - Math.sin(sw) * h * .42, y); c.stroke();
        c.fillStyle = `rgb(${p.col})`; c.beginPath();
        c.moveTo(x - h * .11, sh); c.lineTo(x + h * .11, sh); c.lineTo(x + h * .13, hip + h * .06); c.lineTo(x - h * .13, hip + h * .06); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x, sh + h * .04); c.lineTo(x - Math.sin(sw) * h * .3, sh + h * .32); c.moveTo(x, sh + h * .04); c.lineTo(x + Math.sin(sw) * h * .3, sh + h * .32); c.stroke();
        if (p.bag) { c.fillStyle = "rgba(240,230,215,1)"; c.fillRect(x + Math.sin(sw) * h * .3 - h * .05, sh + h * .3, h * .1, h * .12); c.strokeRect(x + Math.sin(sw) * h * .3 - h * .05, sh + h * .3, h * .1, h * .12); }
        c.fillStyle = "rgba(250,236,222,1)"; c.beginPath(); c.arc(x, sh - h * .1, h * .085, 0, 7); c.fill(); c.stroke();
        c.globalAlpha = 1;
      });
    };
  },
  /* birds flapping across the sky */
  birds(f) {
    const bs = Array.from({ length: f.n || 5 }, (_, i) => ({ x: rnd(-.3, 1), y: rnd(f.band[0], f.band[1]), sp: rnd(.04, .08), ph: rnd(0, 6.28), s: rnd(5, 9), fl: rnd(7, 10) }));
    return (dt, t, c, W, H, d) => {
      c.strokeStyle = "rgba(30,30,38,.85)"; c.lineWidth = 1.5 * d; c.lineCap = "round";
      bs.forEach(b => {
        b.x += b.sp * dt; if (b.x > 1.08) { b.x = -.08; b.y = rnd(f.band[0], f.band[1]); }
        const x = b.x * W, y = (b.y + Math.sin(t * .9 + b.ph) * .008) * H, s = b.s * d, wv = Math.sin(t * b.fl + b.ph) * s * .55;
        c.beginPath(); c.moveTo(x - s, y - wv); c.quadraticCurveTo(x - s * .45, y - wv * .2 - s * .25, x, y); c.quadraticCurveTo(x + s * .45, y - wv * .2 - s * .25, x + s, y - wv); c.stroke();
      });
    };
  },
  /* soft smoke rising from chimneys, or drifting across a smoky sky */
  smoke(f) {
    const ps = []; let acc = 0;
    return (dt, t, c, W, H) => {
      acc += dt * (f.rate || 3);
      while (acc > 1) { acc--;
        if (f.from) { const e = pick(f.from); ps.push({ x: e[0], y: e[1], r: .012, age: 0, life: rnd(3, 4.5), vx: rnd(.004, .012), vy: rnd(.03, .05) }); }
        else ps.push({ x: rnd(-.1, .9), y: rnd(f.box[1], f.box[3]), r: rnd(.04, .09), age: 0, life: rnd(4, 6), vx: rnd(.015, .03), vy: rnd(.002, .01) });
      }
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.age += dt; if (p.age > p.life) { ps.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y -= p.vy * dt;
        const k = p.age / p.life, r = (p.r + k * (f.from ? .05 : .05)) * W, a = Math.sin(Math.PI * k) * (f.from ? .32 : .22);
        glow(c, p.x * W, p.y * H, r, "110,110,120", a);
      }
    };
  },
  /* a red balloon slipping away into the sky */
  balloon(f) {
    let b = null, wait = .2;
    return (dt, t, c, W, H, d) => {
      if (!b) { wait -= dt; if (wait <= 0) b = { x: f.at[0], y: f.at[1], age: 0 }; return; }
      b.age += dt; b.y -= .045 * dt; const x = (b.x + Math.sin(b.age * 1.3) * .012 + b.age * .004) * W, y = b.y * H, r = 9 * d;
      const a = Math.min(1, b.age * 2) * Math.min(1, b.y / .12);
      c.globalAlpha = a; c.strokeStyle = "rgba(40,40,46,.8)"; c.lineWidth = d;
      c.beginPath(); c.moveTo(x, y + r * 1.2); c.quadraticCurveTo(x - 5 * d, y + r * 2.6, x + 2 * d, y + r * 4); c.stroke();
      c.fillStyle = "rgb(228,82,72)"; c.beginPath(); c.ellipse(x, y, r * .85, r * 1.1, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.ellipse(x - r * .3, y - r * .4, r * .18, r * .3, -.4, 0, 7); c.fill();
      c.globalAlpha = 1;
      if (b.y < -.05) { b = null; wait = 1.5; }
    };
  },
  /* gentle falling snow */
  snow(f) {
    const fl = Array.from({ length: f.n || 70 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(1.2, 2.8), sp: rnd(.03, .07), ph: rnd(0, 6.28) }));
    return (dt, t, c, W, H, d) => {
      fl.forEach(p => {
        p.y += p.sp * dt; if (p.y > 1.02) { p.y = -.02; p.x = Math.random(); }
        const x = (p.x + Math.sin(t * .8 + p.ph) * .01) * W, y = p.y * H;
        c.fillStyle = "rgba(255,255,255,.95)"; c.strokeStyle = "rgba(120,130,150,.5)"; c.lineWidth = .6 * d;
        c.beginPath(); c.arc(x, y, p.r * d, 0, 7); c.fill(); c.stroke();
      });
    };
  },
  fire(f) {
    const ps = []; let acc = 0;
    return (dt, t, c, W, H, d) => {
      const fl = .78 + .14 * Math.sin(t * 9) + .08 * Math.sin(t * 23.3);
      glow(c, f.at[0] * W, f.at[1] * H, f.r * W * (1.2 + fl * .5), "255,150,40", .34 * fl);
      if (f.win) glow(c, f.win[0] * W, f.win[1] * H, f.r * .8 * W, "255,205,90", .26 + .07 * Math.sin(t * 2.3));
      acc += dt * 12;
      while (acc > 1) { acc--; ps.push({ x: f.at[0] + rnd(-.008, .008), y: f.at[1] - .01, vx: rnd(-.012, .012), sp: rnd(.05, .1), age: 0, life: rnd(1.2, 2.4) }); }
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.age += dt; if (p.age > p.life) { ps.splice(i, 1); continue; }
        p.x += (p.vx + Math.sin(p.age * 4) * .004) * dt; p.y -= p.sp * dt;
        c.fillStyle = `rgba(245,125,30,${(1 - p.age / p.life) * .95})`;
        c.beginPath(); c.arc(p.x * W, p.y * H, 1.5 * d, 0, 7); c.fill();
      }
    };
  },
  /* warm lamp or window light that fades up, with an optional gentle flicker */
  glow(f) {
    let t0 = 0;
    return (dt, t, c, W, H) => {
      t0 += dt; const up = Math.min(1, t0 / 1.4);
      if (f.dusk) {
        c.save(); c.fillStyle = `rgba(16,20,40,${f.dusk * up})`; c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = "destination-out";
        f.pts.forEach(p => glow(c, p[0] * W, p[1] * H, p[2] * W * 2.6, "0,0,0", 1));
        c.restore();
      }
      c.save(); c.globalCompositeOperation = "lighter";
      f.pts.forEach((p, i) => {
        const fl = f.flicker ? .85 + .1 * Math.sin(t * 7 + i * 2.1) + .05 * Math.sin(t * 17 + i) : .9 + .1 * Math.sin(t * 1.4 + i);
        glow(c, p[0] * W, p[1] * H, p[2] * W * 1.6, p[3], .38 * up * fl);
      });
      c.restore();
    };
  },
  /* fairy lights scattered through a tree */
  twinkle(f) {
    const pts = Array.from({ length: f.n }, () => ({ x: rnd(f.box[0], f.box[2]), y: rnd(f.box[1], f.box[3]), ph: rnd(0, 6.28), sp: rnd(1.5, 3.5), col: pick(["255,214,110", "255,160,90", "255,240,190"]) }));
    let t0 = 0;
    return (dt, t, c, W, H, d) => {
      t0 += dt; const up = Math.min(1, t0 / .8);
      if (f.dusk) { c.fillStyle = `rgba(16,20,40,${f.dusk * up})`; c.fillRect(0, 0, W, H); }
      pts.forEach(p => {
        const a = up * (.55 + .45 * Math.sin(t * p.sp + p.ph));
        c.save(); c.globalCompositeOperation = "lighter"; glow(c, p.x * W, p.y * H, (f.small ? 7 : 12) * d, p.col, .6 * a); c.restore();
        c.fillStyle = `rgba(${p.col},${a})`; c.beginPath(); c.arc(p.x * W, p.y * H, (f.small ? 1.8 : 2.8) * d, 0, 7); c.fill();
      });
    };
  },
  /* sunlight glinting off water */
  glints(f) {
    const ps = []; let acc = 0;
    return (dt, t, c, W, H, d) => {
      acc += dt * (f.rate || 20);
      while (acc > 1) { acc--; ps.push({ x: rnd(f.box[0], f.box[2]), y: rnd(f.box[1], f.box[3]), age: 0, life: rnd(.5, 1.2), w: rnd(6, 16) }); }
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.age += dt; if (p.age > p.life) { ps.splice(i, 1); continue; }
        const a = Math.sin(Math.PI * p.age / p.life), x = p.x * W, y = p.y * H;
        glow(c, x, y, p.w * d, "255,255,250", .5 * a);
        c.strokeStyle = `rgba(255,255,255,${a * .95})`; c.lineWidth = 1.6 * d;
        c.beginPath(); c.moveTo(x - p.w * d * .6, y); c.lineTo(x + p.w * d * .6, y); c.stroke();
      }
    };
  },
  bubbles(f) {
    const ps = []; let acc = 0;
    return (dt, t, c, W, H, d) => {
      acc += dt * (f.rate || 5);
      while (acc > 1) { acc--; const e = pick(f.from); ps.push({ x: e[0] + rnd(-.015, .015), y: e[1], r: rnd(1.5, 5), sp: rnd(.05, .11), ph: rnd(0, 6.28), age: 0 }); }
      c.lineWidth = d;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.age += dt; p.y -= p.sp * dt; if (p.y < .01) { ps.splice(i, 1); continue; }
        const x = (p.x + Math.sin(p.age * 3 + p.ph) * .006) * W, y = p.y * H, r = p.r * d * (1 + p.age * .08), a = Math.min(1, p.age * 2) * .75;
        c.strokeStyle = `rgba(30,40,50,${a})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
        c.fillStyle = `rgba(255,255,255,${a * .85})`; c.beginPath(); c.arc(x - r * .35, y - r * .35, r * .28, 0, 7); c.fill();
      }
    };
  },
  stars(f) {
    const ps = []; let acc = 0;
    return (dt, t, c, W, H, d) => {
      if (f.glow) { c.save(); c.globalCompositeOperation = "lighter";
        f.glow.forEach((g, i) => glow(c, g[0] * W, g[1] * H, g[2] * W, "255,228,120", .16 + .13 * Math.sin(t * 1.5 + i * 1.7))); c.restore(); }
      acc += dt * (f.rate || 6);
      while (acc > 1) { acc--; ps.push({ x: rnd(.03, .97), y: rnd(.03, f.maxY || .97), s: rnd(3, 8), age: 0, life: rnd(1, 2.2) }); }
      c.lineWidth = d;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.age += dt; if (p.age > p.life) { ps.splice(i, 1); continue; }
        const a = Math.sin(Math.PI * p.age / p.life), x = p.x * W, y = p.y * H, s = p.s * d * a;
        c.strokeStyle = `rgba(${f.color},${a * .95})`; c.beginPath();
        c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke();
      }
    };
  },
  notes(f) {
    const ns = []; let na = 1;
    return (dt, t, c, W, H, d) => {
      na += dt;
      if (na > .7) { na = 0; ns.push({ x: f.at[0] + rnd(-.07, .07), y: f.at[1] - .05, dx: rnd(-.04, .04), ch: pick(["♪", "♫", "♩"]), s: rnd(20, 30), age: 0 }); }
      for (let i = ns.length - 1; i >= 0; i--) {
        const n = ns[i]; n.age += dt; if (n.age > 3.4) { ns.splice(i, 1); continue; }
        c.font = `${n.s * d}px Georgia, serif`;
        c.fillStyle = `rgba(170,40,26,${Math.sin(Math.PI * n.age / 3.4) * .9})`;
        c.fillText(n.ch, (n.x + n.dx * n.age + Math.sin(n.age * 3) * .012) * W, (n.y - n.age * .07) * H);
      }
    };
  },
  rain() {
    const ds = [];
    return (dt, t, c, W, H, d) => {
      while (ds.length < 170) ds.push({ x: Math.random() * 1.1, y: Math.random(), l: rnd(.012, .028), sp: rnd(.45, .75) });
      c.strokeStyle = "rgba(55,68,88,.32)"; c.lineWidth = d; c.beginPath();
      ds.forEach(p => {
        p.y += p.sp * dt; p.x -= p.sp * dt * .12;
        if (p.y > 1) { p.y = -.03; p.x = Math.random() * 1.1; }
        const x = p.x * W, y = p.y * H; c.moveTo(x, y); c.lineTo(x - p.l * H * .12, y + p.l * H);
      });
      c.stroke();
    };
  }
};

/* ---------- build the page ---------- */
const $ = s => document.querySelector(s);
const ORDER = GROUPS.flatMap(g => g.items);
const groupOf = id => GROUPS.find(g => g.items.includes(id));
const canHover = matchMedia("(hover:hover) and (pointer:fine)").matches;
const calm = matchMedia("(prefers-reduced-motion:reduce)").matches;
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const hintFor = fx => { const hs = [...new Set(fx.map(f => HINT[f.t]))].slice(0, 2); return hs.length > 1 ? hs.join(" and ") : hs[0]; };

["#logoHero", "#logoNav"].forEach(s => $(s).src = LOGO);
$("#markLink").onclick = e => { e.preventDefault(); scrollTo({ top: 0 }); };

function hoverLife(target, stage, fx) {
  const life = new Life(stage, fx);
  if (canHover && !calm) {
    target.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") life.start(); });
    target.addEventListener("pointerleave", () => life.stop());
  }
  return life;
}
$("#heroArt").src = IMG.cabin.src; $("#heroArt").width = IMG.cabin.w; $("#heroArt").height = IMG.cabin.h;
hoverLife($("#heroStage").parentElement, $("#heroStage"), P.cabin.fx);
if (!canHover) $("#heroHint").textContent = "tap to open";

const main = $("#main"), nav = $("#navList");
function renderGroup(g) {
  nav.insertAdjacentHTML("beforeend", `<li><a href="#${g.id}" data-g="${g.id}" style="--tint:var(--${g.tint})">${g.name}</a></li>`);
  const sec = document.createElement("section");
  sec.className = "chapter" + (g.explore ? " explore" : ""); sec.id = g.id; sec.setAttribute("aria-labelledby", g.id + "-h"); sec.style.setProperty("--tint", `var(--${g.tint})`);
  sec.innerHTML = `<aside><h2 id="${g.id}-h">${g.name}</h2><p>${g.blurb}</p><span class="count">${g.items.length} pieces</span></aside><div class="gallery"></div>`;
  const gal = sec.querySelector(".gallery");
  g.items.forEach(id => {
    const p = P[id], im = IMG[id];
    const b = document.createElement("button");
    b.className = "work"; b.dataset.open = id;
    b.innerHTML = `<div class="frame"><div class="stage"><img class="art" loading="lazy" decoding="async" width="${im.w}" height="${im.h}" alt="${esc(p.title)}, ${esc(p.medium)}"></div></div><span class="cap"><span class="t">${esc(p.title)}</span><span class="p">${esc(p.place || "")}</span></span>`;
    b.querySelector("img").src = im.src;
    hoverLife(b, b.querySelector(".stage"), p.fx);
    gal.appendChild(b);
  });
  main.appendChild(sec);
}
GROUPS.filter(g => !g.explore).forEach(renderGroup);
nav.insertAdjacentHTML("beforeend", `<li><a href="#the-map" data-g="the-map" style="--tint:var(--sky)">the map</a></li>`);

/* map: a zoomable world map */
const mapSec = document.createElement("section");
mapSec.className = "chapter"; mapSec.id = "the-map"; mapSec.setAttribute("aria-labelledby", "map-h"); mapSec.style.setProperty("--tint", "var(--sky)");
mapSec.innerHTML = `<aside><h2 id="map-h">where they were drawn</h2><p>choose a place to read a little about it and see the drawings made there.</p></aside>
  <div class="area" id="area" aria-live="polite"></div>
  <div class="mapcol"><div class="mapwrap" id="mapwrap"><svg id="mapsvg" role="img" aria-label="world map showing where the drawings were made"><path d="${MAP.d}"/></svg><div class="pins" id="pins"></div>
  <div class="zoom"><button id="zIn" aria-label="zoom in">+</button><button id="zOut" aria-label="zoom out">−</button><button id="zAll">see everywhere</button></div></div>
  <p class="maptip" id="maptip"></p></div>`;
main.appendChild(mapSec);
$("#maptip").textContent = canHover ? "drag to move around, double click or use + and − to zoom." : "drag to move around, pinch or use + and − to zoom.";
const svgEl = $("#mapsvg"), wrap = $("#mapwrap"), pinsEl = $("#pins");
let vb = { x: 0, y: 0, w: MAP.w }, curArea = null, anim = 0;
const aspect = () => { const r = wrap.getBoundingClientRect(); return r.width ? r.height / r.width : .75; };
function clampVB(v) {
  v.w = Math.min(MAP.w * 1.05, Math.max(MAP.w / 70, v.w));
  const h = v.w * aspect();
  v.x = Math.min(MAP.w - v.w * .25, Math.max(-v.w * .75, v.x));
  v.y = Math.min(MAP.h - h * .25, Math.max(-h * .75, v.y));
  return v;
}
function renderMap() {
  const h = vb.w * aspect();
  svgEl.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${h}`);
  const r = wrap.getBoundingClientRect(), s = r.width / vb.w;
  const pts = Object.keys(AREAS).map(k => ({ k, x: (MAP.pins[k][0] - vb.x) * s, y: (MAP.pins[k][1] - vb.y) * s }))
    .filter(p => p.x > -30 && p.x < r.width + 30 && p.y > -30 && p.y < r.height + 30);
  const groups = [];
  pts.forEach(p => {
    const g = groups.find(g => Math.hypot(g.x - p.x, g.y - p.y) < 30);
    if (g) { g.m.push(p); g.x = g.m.reduce((a, q) => a + q.x, 0) / g.m.length; g.y = g.m.reduce((a, q) => a + q.y, 0) / g.m.length; }
    else groups.push({ x: p.x, y: p.y, m: [p] });
  });
  pinsEl.innerHTML = "";
  groups.forEach(g => {
    const b = document.createElement("button");
    b.style.left = g.x + "px"; b.style.top = g.y + "px";
    if (g.m.length === 1) {
      const k = g.m[0].k, a = AREAS[k];
      b.className = "pin" + (a.side === "left" ? " left" : ""); b.dataset.area = k; b.setAttribute("aria-pressed", k === curArea);
      b.innerHTML = `<i></i><span>${a.name}</span>`;
      if (a.side === "left") b.style.flexDirection = "row-reverse", b.style.transform = "translate(calc(-100% + .95rem),-50%)";
    } else {
      b.className = "cluster"; b.dataset.cluster = g.m.map(m => m.k).join(",");
      b.setAttribute("aria-label", `${g.m.length} places: ${g.m.map(m => AREAS[m.k].name).join(", ")}. zoom in to see them`);
      b.innerHTML = `<b>${g.m.length}</b>`;
    }
    pinsEl.appendChild(b);
  });
}
function animateTo(t) {
  cancelAnimationFrame(anim); clampVB(t);
  const from = { ...vb }, h0 = from.w * aspect(), h1 = t.w * aspect();
  const c0 = { x: from.x + from.w / 2, y: from.y + h0 / 2 }, c1 = { x: t.x + t.w / 2, y: t.y + h1 / 2 };
  const start = performance.now(), dur = calm ? 1 : 750;
  const stepA = now => {
    const k = Math.min(1, (now - start) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const w = Math.exp(Math.log(from.w) + (Math.log(t.w) - Math.log(from.w)) * e);
    const cx = c0.x + (c1.x - c0.x) * e, cy = c0.y + (c1.y - c0.y) * e;
    vb = { x: cx - w / 2, y: cy - w * aspect() / 2, w }; renderMap();
    if (k < 1) anim = requestAnimationFrame(stepA);
  };
  anim = requestAnimationFrame(stepA);
}
function fitKeys(keys, minW = MAP.w / 40) {
  const xs = keys.map(k => MAP.pins[k][0]), ys = keys.map(k => MAP.pins[k][1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = Math.max(minW, (x1 - x0) * 1.7, (y1 - y0) * 1.9 / aspect());
  animateTo({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - w * aspect() / 2, w });
}
function zoomBy(f, px, py) {
  const r = wrap.getBoundingClientRect(); px = px ?? r.width / 2; py = py ?? r.height / 2;
  const wx = vb.x + px / r.width * vb.w, wy = vb.y + py / r.width * vb.w, w = vb.w * f;
  animateTo({ x: wx - px / r.width * w, y: wy - py / r.width * w, w });
}
$("#zIn").onclick = () => zoomBy(.5);
$("#zOut").onclick = () => zoomBy(2);
$("#zAll").onclick = () => fitKeys(Object.keys(AREAS), 120);
/* drag and pinch */
const ptrs = new Map(); let moved = 0;
wrap.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; wrap.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; cancelAnimationFrame(anim); wrap.classList.add("dragging"); });
wrap.addEventListener("pointermove", e => {
  if (!ptrs.has(e.pointerId)) return;
  const r = wrap.getBoundingClientRect(), s = r.width / vb.w, prev = ptrs.get(e.pointerId);
  if (ptrs.size === 1) { vb.x -= (e.clientX - prev.x) / s; vb.y -= (e.clientY - prev.y) / s; moved += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y); }
  else if (ptrs.size === 2) {
    const other = [...ptrs.entries()].find(([id]) => id !== e.pointerId)[1];
    const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
    if (d0 > 0) { const f = d0 / d1, mx = (other.x + e.clientX) / 2 - r.left, my = (other.y + e.clientY) / 2 - r.top;
      const wx = vb.x + mx / s, wy = vb.y + my / s; vb.w *= f; const s2 = r.width / vb.w; vb.x = wx - mx / s2; vb.y = wy - my / s2; }
  }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); clampVB(vb); renderMap();
});
const endPtr = e => { ptrs.delete(e.pointerId); if (!ptrs.size) wrap.classList.remove("dragging"); };
wrap.addEventListener("pointerup", endPtr); wrap.addEventListener("pointercancel", endPtr);
wrap.addEventListener("dblclick", e => { if (e.target.closest("button")) return; const r = wrap.getBoundingClientRect(); zoomBy(.45, e.clientX - r.left, e.clientY - r.top); });
wrap.addEventListener("wheel", e => { if (!e.ctrlKey) return; e.preventDefault(); const r = wrap.getBoundingClientRect(); zoomBy(e.deltaY > 0 ? 1.25 : .8, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
new ResizeObserver(() => renderMap()).observe(wrap);
pinsEl.addEventListener("click", e => {
  const c = e.target.closest("[data-cluster]"); if (c) fitKeys(c.dataset.cluster.split(","), MAP.w / 55);
});
function showArea(key, zoom = true) {
  const a = AREAS[key], works = ORDER.filter(id => P[id].area === key); curArea = key;
  $("#area").innerHTML = `<h3>${a.name}</h3><ul>${a.facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul><div class="thumbs">${works.map(id => `<button data-open="${id}" aria-label="open ${esc(P[id].title)}"><img alt="" src="${IMG[id].src}"></button>`).join("")}</div>`;
  if (zoom) { const [x, y] = MAP.pins[key], w = MAP.w / 34; animateTo({ x: x - w / 2, y: y - w * aspect() / 2, w }); } else renderMap();
}
requestAnimationFrame(() => { const all = Object.keys(AREAS), xs = all.map(k => MAP.pins[k][0]), ys = all.map(k => MAP.pins[k][1]);
  const w = Math.max(120, (Math.max(...xs) - Math.min(...xs)) * 1.7); vb = clampVB({ x: (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 - w * aspect() / 2, w });
  showArea("oxford", false); });


GROUPS.filter(g => g.explore).forEach(renderGroup);
nav.querySelectorAll('[data-g="developing-and-exploring"]').forEach(a => { a.parentElement.remove(); });
nav.insertAdjacentHTML("beforeend", `<li class="sep" aria-hidden="true"></li><li><a href="#developing-and-exploring" data-g="developing-and-exploring">developing and exploring</a></li>`);
const links = [...nav.querySelectorAll("a")];
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.setAttribute("aria-current", a.dataset.g === e.target.id ? "true" : "false"));
}), { rootMargin: "-40% 0px -55% 0px" });
document.querySelectorAll(".chapter").forEach(s => io.observe(s));

/* ---------- viewer ---------- */
const dlg = $("#viewer"), vStage = $("#vStage"), vArt = $("#vArt");
let cur = null, vLife = null;
function openPiece(id, fromHash) {
  if (!P[id]) return;
  if (vLife) vLife.stop();
  cur = id; const p = P[id], im = IMG[id];
  vArt.src = im.src; vArt.width = im.w; vArt.height = im.h; vArt.alt = `${p.title}, ${p.medium}`;
  vLife = new Life(vStage, p.fx);
  $("#vGroup").textContent = groupOf(id).name; $("#vGroup").style.setProperty("--tint", `var(--${groupOf(id).tint})`);
  $("#vTitle").textContent = p.title;
  $("#vMeta").innerHTML = [p.place, [p.medium, p.when].filter(Boolean).join(", ")].filter(Boolean).map(esc).join("<br>");
  $("#vPoem").innerHTML = p.poem.map((l, i) => `<li style="--i:${i}">${esc(l)}</li>`).join("");
  let html = "";
  if (p.story) html += `<div class="block story"><h3>a short story</h3>${p.story.map(s => `<p>${esc(s)}</p>`).join("")}</div>`;
  if (p.fact) html += `<div class="block"><h3>about the place</h3><p>${esc(p.fact)}</p></div>`;
  if (p.area) html += `<div class="block"><button class="toarea" data-goarea="${p.area}">more about ${esc(AREAS[p.area].name)} on the map</button></div>`;
  $("#vBlocks").innerHTML = html;
  $("#vHint").textContent = (canHover ? "hover over the drawing: " : "tap the drawing: ") + hintFor(p.fx);
  if (!dlg.open) { dlg.showModal(); document.documentElement.classList.add("locked"); $("#vPanel").focus({ preventScroll: true }); }
  $(".v").scrollTop = 0; $("#vPanel").scrollTop = 0;
  if (!fromHash) history.replaceState(null, "", "#" + id);
}
const artWrap = vStage.parentElement;
artWrap.addEventListener("pointerenter", e => { if (e.pointerType === "mouse" && vLife) vLife.start(); });
artWrap.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && vLife) vLife.stop(); });
artWrap.addEventListener("click", () => { if (!canHover && vLife) vLife.on ? vLife.stop() : vLife.start(); });
function step(n) { openPiece(ORDER[(ORDER.indexOf(cur) + n + ORDER.length) % ORDER.length]); }
dlg.addEventListener("close", () => {
  if (vLife) vLife.stop();
  document.documentElement.classList.remove("locked");
  history.replaceState(null, "", location.pathname + location.search);
});
$("#vClose").onclick = () => dlg.close();
$("#vPrev").onclick = () => step(-1);
$("#vNext").onclick = () => step(1);
document.addEventListener("keydown", e => { if (!dlg.open) return; if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); });
document.addEventListener("click", e => {
  const ga = e.target.closest("[data-goarea]");
  if (ga) { dlg.close(); showArea(ga.dataset.goarea); $("#the-map").scrollIntoView(); return; }
  const ar = e.target.closest("[data-area]"); if (ar) { showArea(ar.dataset.area); return; }
  const o = e.target.closest("[data-open]"); if (o) openPiece(o.dataset.open);
});
let sx = null, sy = null;
$("#vArtWrap").addEventListener("pointerdown", e => { sx = e.clientX; sy = e.clientY; });
$("#vArtWrap").addEventListener("pointerup", e => {
  if (sx === null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
});
function fromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (P[id]) openPiece(id, true); else if (dlg.open && !id) dlg.close();
}
window.addEventListener("hashchange", fromHash);
fromHash();
