/**
 * ZENKAI — interface
 *
 * Renders the five tabs (Today, Train, Food, Stats, Coach), the bottom sheets, the guided-session
 * player, the setup questions, the week editor and the voice controls.
 *
 * How it is wired:
 *   - VIEWS lists the cards on each tab; each card is a function that returns HTML
 *   - every button has data-act="name", handled by ACT[name]
 *   - every input has data-chg="name", handled by CHG[name]
 *   - render() redraws the current tab; repaint() redraws single cards
 *
 * Author: Atharva Sail
 */
(function () {
  "use strict";
  var Z = window.SZ,
    D = Z.D,
    Coach = window.SZCoach;
  function $(s, r) {
    return (r || document).querySelector(s);
  }
  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }
  // Escape text for HTML.
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // A date key formatted for display.
  function fmt(s, o) {
    return Z.pd(s).toLocaleDateString("en-IN", o);
  }
  // Percentage for a progress bar, kept between 0 and 100.
  function pct(a, b) {
    return b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0;
  }
  // An inline icon.
  function svg(d) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      d +
      "</svg>"
    );
  }
  var IC = {
    today: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    train: svg('<path d="M3.5 9.5v5M6.5 6.5v11M17.5 6.5v11M20.5 9.5v5M6.5 12h11"/>'),
    food: svg('<path d="M4 11h16a8 8 0 0 1-16 0zM9 7.5c0-2 2-2 2-4M14 7.5c0-2 2-2 2-4"/>'),
    stats: svg('<path d="M3 20.5h18M6 17v-6M11 17V5M16 17V8M21 17v-3"/>'),
    coach: svg('<path d="M4.5 5h15v11h-9l-6 4z"/><path d="M9 10.5h6"/>'),
    left: svg('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
    right: svg('<path d="M9.5 5.5 16 12l-6.5 6.5"/>'),
    send: svg('<path d="M4 12 20 4l-5 16-3-7z"/>'),
    play: svg('<path d="M8 5.5v13l11-6.5z"/>')
  };
  var TABS = [
    ["today", "Today"],
    ["train", "Train"],
    ["food", "Food"],
    ["stats", "Stats"],
    ["coach", "Coach"]
  ];

  var cur = Z.today(),
    tab = "today",
    sheetKind = null,
    sheetMeal = "bf",
    selEx = null,
    busy = false,
    pending = null,
    lastToday = Z.today();

  /* ---------- shared bits ---------- */
  function datebar() {
    var td = Z.today();
    return (
      '<div class="datebar"><button class="ib" type="button" data-act="day" data-d="-1" aria-label="Previous day">' +
      IC.left +
      "</button>" +
      '<div class="d">' +
      (cur === td ? "Today, " : "") +
      esc(fmt(cur, { weekday: "short", day: "numeric", month: "short" })) +
      "</div>" +
      (cur !== td ? '<button class="btn sm" type="button" data-act="day" data-d="0">Today</button>' : "") +
      '<button class="ib" type="button" data-act="day" data-d="1"' +
      (cur >= td ? " disabled" : "") +
      ' aria-label="Next day">' +
      IC.right +
      "</button></div>"
    );
  }
  // Insight cards.
  function insHtml(list) {
    return list
      .map(function (i) {
        return (
          '<div class="ins ' +
          i.tone +
          '"><span class="tag">' +
          i.tag.charAt(0) +
          i.tag.slice(1).toLowerCase() +
          "</span><div><b>" +
          esc(i.title) +
          "</b><p>" +
          esc(i.text) +
          "</p></div></div>"
        );
      })
      .join("");
  }
  var MAPID = { obl: "obliques" },
    HL = { obliques: ["obl"], cuff: ["rdelts"] };
  // Front and back body diagram with the worked muscles lit.
  function bodyMap(m, tap) {
    function a(key) {
      return (
        ' class="m' +
        (m.indexOf(key) > -1 ? " on" : "") +
        '"' +
        (tap ? ' data-act="muscle" data-id="' + (MAPID[key] || key) + '"' : "")
      );
    }
    function el(key, cx, cy, rx, ry) {
      return "<ellipse" + a(key) + ' cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/>';
    }
    function rc(key, x, y, w, h, r) {
      return (
        "<rect" +
        a(key) +
        ' x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        w +
        '" height="' +
        h +
        '" rx="' +
        r +
        '"/>'
      );
    }
    function base(ox) {
      return (
        '<circle class="b" cx="' +
        (ox + 60) +
        '" cy="17" r="11"/><rect class="b" x="' +
        (ox + 38) +
        '" y="34" width="44" height="80" rx="14"/><rect class="b" x="' +
        (ox + 40) +
        '" y="106" width="40" height="20" rx="8"/><circle class="b" cx="' +
        (ox + 50) +
        '" cy="173" r="6"/><circle class="b" cx="' +
        (ox + 70) +
        '" cy="173" r="6"/>'
      );
    }
    var s =
      '<svg class="bodymap' +
      (tap ? " tap" : "") +
      '" viewBox="0 0 240 232" ' +
      (tap ? 'role="group" aria-label="Body map. Tap a muscle."' : 'aria-hidden="true"') +
      ">";
    s +=
      base(0) +
      rc("neck", 55, 26, 10, 9, 2) +
      el("delts", 35, 45, 9, 8) +
      el("delts", 85, 45, 9, 8) +
      el("chest", 50, 56, 11, 8.5) +
      el("chest", 70, 56, 11, 8.5);
    s += rc("abs", 51, 68, 18, 40, 5) + el("obl", 44, 86, 4, 13) + el("obl", 76, 86, 4, 13);
    s +=
      el("biceps", 28, 68, 6, 12) +
      el("biceps", 92, 68, 6, 12) +
      el("forearms", 25, 97, 5, 13) +
      el("forearms", 95, 97, 5, 13);
    s +=
      el("hipfl", 48, 118, 6, 6) +
      el("hipfl", 72, 118, 6, 6) +
      el("quads", 50, 148, 9, 21) +
      el("quads", 70, 148, 9, 21) +
      el("calves", 50, 198, 6, 17) +
      el("calves", 70, 198, 6, 17);
    s +=
      base(120) +
      rc("neck", 175, 26, 10, 9, 2) +
      "<path" +
      a("traps") +
      ' d="M180 33 L198 42 L180 64 L162 42 Z"/>' +
      el("rdelts", 155, 45, 9, 8) +
      el("rdelts", 205, 45, 9, 8);
    s +=
      el("lats", 167, 76, 8, 19) +
      el("lats", 193, 76, 8, 19) +
      rc("midback", 175, 62, 10, 22, 3) +
      rc("lowback", 172, 88, 16, 18, 4);
    s +=
      el("triceps", 148, 68, 6, 12) +
      el("triceps", 212, 68, 6, 12) +
      el("forearms", 145, 97, 5, 13) +
      el("forearms", 215, 97, 5, 13);
    s +=
      el("hipab", 161, 114, 4, 8) +
      el("hipab", 199, 114, 4, 8) +
      el("glutes", 171, 119, 10, 10) +
      el("glutes", 189, 119, 10, 10);
    s +=
      el("hams", 170, 148, 8, 21) +
      el("hams", 190, 148, 8, 21) +
      el("calves", 170, 196, 7, 16) +
      el("calves", 190, 196, 7, 16);
    return (
      s +
      '<text x="60" y="229" text-anchor="middle">Front</text><text x="180" y="229" text-anchor="middle">Back</text></svg>'
    );
  }
  // YouTube search link for an exercise.
  function ytLink(e) {
    return (
      "https://www.youtube.com/results?search_query=" + encodeURIComponent("how to " + e.q + " proper form")
    );
  }
  // The form video for an exercise, if one was chosen.
  function vidOf(id) {
    return (D.VID || {})[id] || null;
  }
  // Embed address for a form video.
  function vidUrl(id) {
    var v = vidOf(id);
    return v ? "https://www.youtube.com/watch?v=" + v[0] : ytLink(D.EX[id]);
  }
  // Two-photo moving demo of an exercise.
  function demoHtml(e) {
    var a = e.flip ? 1 : 0,
      b = e.flip ? 0 : 1;
    return (
      '<div class="ph" role="button" tabindex="0" data-act="phtoggle" aria-label="Start and end position photos. Tap to pause."><img src="img/ex/' +
      e.img +
      "_" +
      a +
      '.webp" alt="' +
      esc(e.n) +
      ' start position"><span class="tagp">Start</span><span class="lay"><img src="img/ex/' +
      e.img +
      "_" +
      b +
      '.webp" alt="' +
      esc(e.n) +
      ' end position"><span class="tagp">End</span></span></div>'
    );
  }
  // moving photo demo with a switch to the form video; the video plays in place wherever the host page allows it
  function mediaHtml(id) {
    var e = D.EX[id],
      inline = !!vidOf(id) && !Z.Net.blocked;
    return (
      '<div class="med" id="med" data-id="' +
      id +
      '">' +
      demoHtml(e) +
      '</div><div class="seg msw"><button type="button" class="on" id="med-d" data-act="meddemo">Photo demo</button>' +
      (inline
        ? '<button type="button" id="med-v" data-act="medvid">' + IC.play + "Form video</button>"
        : '<a id="med-v" href="' +
          vidUrl(id) +
          '" target="_blank" rel="noopener">' +
          IC.play +
          "Form video</a>") +
      '</div><p class="xs mut medcap" id="med-c"' +
      (inline ? " hidden>" : ">The video opens in YouTube.") +
      "</p>"
    );
  }
  // Form steps and common mistakes.
  function formHtml(e, open) {
    function li(arr, o) {
      return (
        "<" +
        o +
        ">" +
        arr
          .map(function (s) {
            return "<li>" + esc(s) + "</li>";
          })
          .join("") +
        "</" +
        o +
        ">"
      );
    }
    return (
      '<details class="gsform"' +
      (open ? " open" : "") +
      "><summary>How to do it</summary><div><p><b>Set up.</b> " +
      esc(e.start) +
      "</p><p><b>Posture.</b> " +
      esc(e.posture) +
      "</p>" +
      li(e.steps, "ol") +
      "<p><b>Breathing.</b> " +
      esc(e.breath) +
      "</p><p><b>Avoid</b></p>" +
      li(e.mistakes, "ul") +
      "</div></details>"
    );
  }

  /* ================= TODAY ================= */
  var DRIVE = ["Idle", "Warming up", "Warming up", "Rolling", "Pushing", "Pushing", "Almost there", "Zenkai"];
  // Today: day number, rank and progress.
  function bHero() {
    var p = Z.S.profile,
      k = Z.dk(cur),
      sp = D.SPLIT[k],
      n = Z.diff(p.start, cur),
      qs = Z.quests(cur),
      done = qs.filter(function (q) {
        return q.done;
      }).length,
      l = Z.level(),
      st = Z.streak(),
      rk = Z.rank(l.lv);
    var ex = Z.dayEx(cur),
      sets = ex.reduce(function (a, id) {
        return a + D.EX[id].sets;
      }, 0),
      cells = "";
    for (var i = 0; i < qs.length; i++) cells += "<i" + (i < done ? ' class="on"' : "") + "></i>";
    return (
      datebar() +
      '<div class="hero' +
      (done === qs.length ? " full" : "") +
      '"><div class="hrow"><div class="hday"><small>' +
      (n < 0 ? "Starts in" : "Day") +
      '</small><b class="num">' +
      Math.abs(n) +
      '</b></div><div class="hmid"><span class="hdow">' +
      esc(sp.name) +
      '</span><b class="hfoc">' +
      esc(Z.rest(cur) ? "Rest day" : Z.dayFocus(cur)) +
      '</b><span class="sm mut">' +
      (Z.rest(cur) ? "Walk, recover, prep" : ex.length + " exercises, " + sets + " sets") +
      '</span></div><div class="rank" aria-label="Rank ' +
      rk.r +
      '"><b>' +
      rk.r +
      "</b><small>Rank</small></div></div>" +
      '<div class="drive" role="img" aria-label="' +
      done +
      " of " +
      qs.length +
      ' daily goals done">' +
      cells +
      '</div><div class="dstat"><b>' +
      (done === qs.length ? "ZENKAI 全開" : DRIVE[done]) +
      '</b><span class="num">' +
      done +
      " / " +
      qs.length +
      " goals</span></div>" +
      '<div class="hlvl"><span>Level ' +
      l.lv +
      '</span><div class="bar"><i style="width:' +
      pct(l.into, l.need) +
      '%"></i></div><span class="num mut">' +
      l.into +
      " / " +
      l.need +
      " XP</span>" +
      (st ? '<span class="hstreak num">' + st + "-day streak</span>" : "") +
      "</div></div>"
    );
  }
  // Today: the targets.
  function bSys() {
    var list = Z.insights(cur);
    if (!list.length) return "";
    return (
      '<div class="card"><div class="lab"><span>Coach says</span><button type="button" data-act="tab" data-tab="coach">All ' +
      list.length +
      " ›</button></div>" +
      insHtml(list.slice(0, 2)) +
      "</div>"
    );
  }
  // Today: the daily goals.
  function bQuests() {
    return (
      '<div class="card"><div class="lab"><span>Daily goals</span><span class="num">' +
      Z.quests(cur).reduce(function (a, q) {
        return a + (q.done ? q.xp : 0);
      }, 0) +
      " / 140 XP</span></div>" +
      Z.quests(cur)
        .map(function (q) {
          return (
            '<button type="button" class="q' +
            (q.done ? " done" : "") +
            '" data-act="quest" data-id="' +
            q.id +
            '"><span class="box"></span><span class="t">' +
            esc(q.label) +
            "<small>" +
            esc(q.sub) +
            '</small></span><span class="xp">+' +
            q.xp +
            "</span></button>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  // Water glasses.
  function waterHtml() {
    var d = Z.gd(cur),
      p = Z.S.profile;
    return (
      '<div class="row sp sm"><span>Water</span><span class="num">' +
      Z.r1((d.water || 0) / 1000) +
      " / " +
      Z.r1(p.water / 1000) +
      ' L</span></div><div class="bar" style="margin-top:5px"><i style="width:' +
      pct(d.water || 0, p.water) +
      '%"></i></div>' +
      '<div class="row" style="margin-top:8px"><button class="btn sm" type="button" data-act="water" data-ml="250">+250 ml</button><button class="btn sm" type="button" data-act="water" data-ml="500">+500 ml</button><button class="btn sm" type="button" data-act="water" data-ml="-250" aria-label="Remove 250 ml">−250</button></div>'
    );
  }
  // One quick-log tile.
  function tile(f, label, val, unit, sub, p) {
    return (
      '<button type="button" class="tile' +
      (val != null ? " set" : "") +
      '" data-act="logf" data-f="' +
      f +
      '"><small>' +
      label +
      '</small><b class="num">' +
      (val != null ? val + "<i>" + unit + "</i>" : "<em>Tap to log</em>") +
      "</b><span>" +
      sub +
      '</span><div class="bar"><i style="width:' +
      p +
      '%"></i></div></button>'
    );
  }
  // The quick-log tiles.
  function tilesHtml(dt) {
    var d = Z.gd(dt),
      p = Z.S.profile;
    return (
      '<div class="tiles">' +
      tile(
        "w",
        "Weight",
        d.w != null ? (+d.w).toFixed(1) : null,
        " kg",
        "Goal " + p.goalW + " kg",
        d.w != null ? pct(p.startW - d.w, p.startW - p.goalW) : 0
      ) +
      tile("sleep", "Sleep", d.sleep, " h", "Target " + p.sleep + " h", pct(d.sleep || 0, p.sleep)) +
      tile(
        "steps",
        "Steps",
        d.steps != null ? Z.nf(d.steps) : null,
        "",
        "Target " + Z.nf(p.steps),
        pct(d.steps || 0, p.steps)
      ) +
      tile(
        "water",
        "Water",
        d.water ? Z.r1(d.water / 1000) : null,
        " L",
        "Target " + Z.r1(p.water / 1000) + " L",
        pct(d.water || 0, p.water)
      ) +
      "</div>"
    );
  }
  // Today: quick log, energy and note.
  function bQuick() {
    var d = Z.gd(cur);
    return (
      '<div class="card"><div class="lab"><span>' +
      (cur === Z.today() ? "Log today" : "Log this day") +
      '</span><span class="plain">tap a tile</span></div>' +
      tilesHtml(cur) +
      '<div style="margin-top:12px"><div class="sm mut" style="margin-bottom:5px">Energy today</div><div class="seg s5">' +
      ["Drained", "Low", "OK", "Good", "Great"]
        .map(function (t, i) {
          return (
            '<button type="button" class="' +
            (d.energy === i + 1 ? "on" : "") +
            '" data-act="energy" data-v="' +
            (i + 1) +
            '">' +
            t +
            "</button>"
          );
        })
        .join("") +
      "</div></div>" +
      '<label class="f" style="margin-top:12px">Note<textarea class="in" id="q-note" rows="2" data-chg="qlog" data-f="note" placeholder="Energy, soreness, cravings…">' +
      esc(d.note) +
      "</textarea></label></div>"
    );
  }
  var LOGF = {
    w: {
      t: "Weight",
      u: "kg",
      step: 0.1,
      dec: 1,
      min: 30,
      max: 250,
      hint: "In the morning: after the toilet, before food or water."
    },
    sleep: {
      t: "Sleep",
      u: "hours",
      step: 0.25,
      dec: 2,
      min: 0,
      max: 16,
      hint: "Hours you actually slept last night.",
      chips: [5, 5.5, 6, 6.5, 7, 7.5, 8]
    },
    steps: {
      t: "Steps",
      u: "steps",
      step: 500,
      dec: 0,
      min: 0,
      max: 80000,
      hint: "From your phone's step counter.",
      chips: [4000, 6000, 8000, 10000, 12000]
    }
  };
  // The water sheet.
  function waterSheetHtml() {
    var d = Z.gd(cur),
      p = Z.S.profile;
    return (
      '<div class="big num" style="text-align:center">' +
      Z.r1((d.water || 0) / 1000) +
      " <small>/ " +
      Z.r1(p.water / 1000) +
      ' L</small></div><div class="bar"><i style="width:' +
      pct(d.water || 0, p.water) +
      '%"></i></div>' +
      '<div class="g2"><button class="btn pri" type="button" data-act="waters" data-ml="250">+ 250 ml glass</button><button class="btn pri" type="button" data-act="waters" data-ml="500">+ 500 ml bottle</button><button class="btn" type="button" data-act="waters" data-ml="1000">+ 1 litre</button><button class="btn" type="button" data-act="waters" data-ml="-250">− 250 ml</button></div><button class="btn wide" type="button" data-act="closesheet">Done</button>'
    );
  }
  // The number sheet for weight, sleep or steps.
  function logSheet(f) {
    if (f === "water") {
      openSheet("log", "Water", waterSheetHtml());
      return;
    }
    var c = LOGF[f];
    if (!c) return;
    var d = Z.gd(cur),
      v = d[f];
    if (v == null && f === "w") {
      var ks = Object.keys(Z.S.days)
        .filter(function (k) {
          return k < cur && Z.S.days[k].w != null;
        })
        .sort();
      v = ks.length ? Z.S.days[ks[ks.length - 1]].w : Z.S.profile.startW;
    }
    if (v == null && f === "sleep") v = 6;
    if (v == null && f === "steps") v = 6000;
    openSheet(
      "log",
      c.t,
      '<p class="sm mut" style="text-align:center">' +
        esc(fmt(cur, { weekday: "long", day: "numeric", month: "short" })) +
        " · " +
        c.hint +
        "</p>" +
        '<div class="logv"><button class="stb" type="button" data-act="logstep" data-d="-1" aria-label="Less">−</button><div><input class="in num" id="lg-v" type="number" inputmode="decimal" step="' +
        c.step +
        '" min="' +
        c.min +
        '" max="' +
        c.max +
        '" value="' +
        v +
        '" data-f="' +
        f +
        '" aria-label="' +
        c.t +
        '"><small>' +
        c.u +
        '</small></div><button class="stb" type="button" data-act="logstep" data-d="1" aria-label="More">+</button></div>' +
        (c.chips
          ? '<div class="chips" style="justify-content:center">' +
            c.chips
              .map(function (x) {
                return (
                  '<button class="chip" type="button" data-act="logchip" data-v="' +
                  x +
                  '">' +
                  (f === "steps" ? Z.nf(x) : x) +
                  "</button>"
                );
              })
              .join("") +
            "</div>"
          : "") +
        '<button class="btn pri wide" type="button" data-act="logsave">Save</button>' +
        (d[f] != null
          ? '<button class="btn sm" type="button" data-act="logclear" style="justify-self:center">Clear this entry</button>'
          : "")
    );
  }
  // Today: calories and protein so far.
  function bFuel() {
    var t = Z.tot(cur),
      p = Z.S.profile;
    return (
      '<div class="card"><div class="lab"><span>Fuel</span><button type="button" data-act="tab" data-tab="food">Food log ›</button></div>' +
      '<div class="row sp sm"><span>Calories</span><span class="num">' +
      Z.nf(t.k) +
      " / " +
      Z.nf(p.kcal) +
      '</span></div><div class="bar' +
      (t.k > p.kcal + 150 ? " bad" : "") +
      '" style="margin:4px 0 10px"><i style="width:' +
      pct(t.k, p.kcal) +
      '%"></i></div>' +
      '<div class="row sp sm"><span>Protein</span><span class="num">' +
      Z.r0(t.p) +
      " / " +
      p.protein +
      ' g</span></div><div class="bar' +
      (t.p >= p.protein - 10 ? " good" : "") +
      '" style="margin-top:4px"><i style="width:' +
      pct(t.p, p.protein) +
      '%"></i></div></div>'
    );
  }
  // Today: tomorrow at a glance.
  function bNext() {
    if (cur !== Z.today()) return "";
    var now = new Date(),
      m = now.getHours() * 60 + now.getMinutes(),
      nx = null;
    D.TIMETABLE.forEach(function (r) {
      var a = r[0].split(":"),
        mm = +a[0] * 60 + +a[1];
      if (!nx && mm > m) nx = r;
    });
    if (!nx) nx = D.TIMETABLE[0];
    return (
      '<div class="card"><div class="lab"><span>Next on your timetable</span><button type="button" data-act="system" data-open="tt">Full day ›</button></div><ul class="tt"><li' +
      (nx[3] ? ' class="gym"' : "") +
      "><time>" +
      t12(nx[0]) +
      "</time><div><b>" +
      esc(nx[1]) +
      "</b><small>" +
      esc(nx[2]) +
      "</small></div></li></ul></div>"
    );
  }
  // HH:MM to a 12-hour clock.
  function t12(t) {
    var a = t.split(":"),
      h = +a[0];
    return ((h + 11) % 12) + 1 + ":" + a[1] + (h < 12 ? " AM" : " PM");
  }

  /* ================= TRAIN ================= */
  function tHead() {
    var k = Z.dk(cur),
      sp = D.SPLIT[k],
      d = Z.gd(cur);
    if (Z.rest(cur)) {
      return (
        datebar() +
        '<div class="card"><div class="sm mut">' +
        esc(sp.name) +
        '</div><h2 class="th2">Rest day</h2><p class="sm mut" style="margin:8px 0 12px">' +
        esc(sp.note) +
        "</p>" +
        '<ul class="cl"><li><div>Sleep a little longer<small>Recovery is when the training turns into results.</small></div></li><li><div>30–45 min easy walk<small>Outdoors if you can: daylight on your arms and face helps vitamin D.</small></div></li><li><div>Meal prep<small>Cook or portion your protein for the next few days and chop some vegetables.</small></div></li><li><div>Weekly check<small>Look at your weekly average in Stats. Measure your waist every two weeks.</small></div></li></ul>' +
        '<button class="btn wide ' +
        (d.walk ? "" : "pri") +
        '" style="margin-top:14px" type="button" data-act="walk">' +
        (d.walk ? "Walk done ✓ (tap to undo)" : "Mark the walk done · +40 XP") +
        "</button></div>"
      );
    }
    var ws = Z.woStats(cur),
      w0 = d.wo,
      clock =
        w0 && w0.t0
          ? '<div class="xs mut" style="margin-top:6px">Started ' +
            new Date(w0.t0).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) +
            " · " +
            Math.max(1, Math.round(((w0.fin && w0.t1 ? w0.t1 : Date.now()) - w0.t0) / 60000)) +
            " min" +
            (w0.fin ? "" : " so far") +
            "</div>"
          : "";
    return (
      datebar() +
      '<div class="card"><div class="row sp"><div><div class="sm mut">' +
      esc(sp.name) +
      '</div><h2 class="th2">' +
      esc(Z.dayFocus(cur)) +
      '</h2></div><div class="big num">' +
      ws.done +
      "<small> / " +
      ws.total +
      " sets</small></div></div>" +
      '<div class="bar" style="margin-top:10px"><i style="width:' +
      pct(ws.done, ws.total) +
      '%"></i></div>' +
      clock +
      (cur === Z.today() && !(w0 && w0.fin)
        ? '<button class="btn pri wide big" style="margin-top:14px" type="button" data-act="gsstart">' +
          (ws.done || (w0 && w0.warm) ? "Continue guided session" : "Start guided session") +
          '</button><p class="xs mut" style="margin-top:6px;text-align:center">Warm-up, every set, rests, finisher and cool-down, one screen at a time.</p>'
        : "") +
      '<p class="sm mut" style="margin-top:10px">' +
      esc(sp.note) +
      '</p><button class="btn sm" style="margin-top:10px" type="button" data-act="atlas">Muscle and injury guide</button><details class="fold"><summary>Muscles worked today (tap one)</summary>' +
      bodyMap(sp.muscles, true) +
      "</details></div>"
    );
  }
  // Train: the warm-up.
  function tWarm() {
    var k = Z.dk(cur);
    if (Z.rest(cur)) return "";
    var sp = D.SPLIT[k],
      w = Z.gd(cur).wo,
      done = !!(w && w.warm);
    return (
      '<div class="card"><div class="lab"><span>Warm-up, 8 min</span><button type="button" data-act="warm">' +
      (done ? "Done ✓" : "Mark done") +
      "</button></div>" +
      '<details class="fold" style="border:0;margin:0;padding:0"' +
      (done ? "" : " open") +
      "><summary>General, then " +
      esc(sp.focus.toLowerCase()) +
      '</summary><ul class="cl">' +
      D.WARM.map(function (r) {
        return "<li><div>" + esc(r[0]) + "<small>" + esc(r[1]) + "</small></div></li>";
      }).join("") +
      '</ul><div class="sm mut" style="margin:12px 0 6px">Then, for ' +
      esc(sp.focus.toLowerCase()) +
      '</div><ul class="cl">' +
      sp.warm
        .map(function (r) {
          return "<li><div>" + esc(r) + "</div></li>";
        })
        .join("") +
      '</ul><p class="sm mut" style="margin-top:10px">Ramp-up sets: before the first exercise do about 50% of your working weight × 10, then 75% × 5. These do not count.</p></details></div>'
    );
  }
  // Train: one exercise with its sets.
  function xcard(id, i) {
    var e = D.EX[id],
      sets = Z.viewSets(cur, id),
      all =
        sets.length &&
        sets.every(function (s) {
          return s.d;
        });
    var wo = Z.gd(cur).wo;
    if (wo && wo.skip && wo.skip[id])
      return (
        '<article class="xc skipd" id="x-' +
        id +
        '"><div class="row sp" style="padding:12px"><span><b class="xn">' +
        (i + 1) +
        " · " +
        esc(e.n) +
        '</b><span class="sm mut">Skipped today</span></span><button class="btn sm" type="button" data-act="skipex" data-ex="' +
        id +
        '">Undo</button></div></article>'
      );
    var w1 = Z.num(sets[0] && sets[0].w),
      ramp =
        i === 0 && w1 && !e.bw && e.unit !== "sec"
          ? "Ramp-up first: " + rnd(w1 * 0.5) + " kg × 10, then " + rnd(w1 * 0.75) + " kg × 5."
          : "";
    var pr = Z.isPR(id, cur),
      note = (Z.S.exnote || {})[id] || "";
    var rows = sets
      .map(function (s, j) {
        return (
          '<div class="setrow' +
          (s.d ? " done" : "") +
          '"><span class="sn">' +
          (j + 1) +
          "</span>" +
          '<input class="in num" id="w-' +
          id +
          "-" +
          j +
          '" type="number" inputmode="decimal" step="0.5" min="0" aria-label="' +
          esc(e.n) +
          " set " +
          (j + 1) +
          ' weight in kg" placeholder="' +
          (e.bw ? "BW" : "kg") +
          '" value="' +
          esc(s.w) +
          '" data-chg="setv" data-k="w" data-ex="' +
          id +
          '" data-i="' +
          j +
          '">' +
          '<span class="x">×</span><input class="in num" id="r-' +
          id +
          "-" +
          j +
          '" type="number" inputmode="numeric" step="1" min="0" aria-label="' +
          esc(e.n) +
          " set " +
          (j + 1) +
          (e.unit === "sec" ? " seconds" : " reps") +
          '" placeholder="' +
          e.lo +
          "–" +
          e.hi +
          (e.unit === "sec" ? " s" : "") +
          '" value="' +
          esc(s.r) +
          '" data-chg="setv" data-k="r" data-ex="' +
          id +
          '" data-i="' +
          j +
          '">' +
          '<button class="ck" type="button" data-act="setdone" data-ex="' +
          id +
          '" data-i="' +
          j +
          '" aria-pressed="' +
          (s.d ? "true" : "false") +
          '" aria-label="Set ' +
          (j + 1) +
          ' done"></button></div>'
        );
      })
      .join("");
    return (
      '<article class="xc' +
      (all ? " done" : "") +
      '" id="x-' +
      id +
      '"><button class="xh" type="button" data-act="guide" data-id="' +
      id +
      '"><span class="thumb"><img src="img/ex/' +
      e.img +
      "_" +
      (e.flip ? 1 : 0) +
      '.webp" alt="" loading="lazy"></span>' +
      '<span><b class="xn">' +
      (i + 1) +
      " · " +
      esc(e.n) +
      (pr ? ' <i class="prb">New best</i>' : "") +
      '</b><span class="sm mut">' +
      e.sets +
      " × " +
      Z.repTxt(e) +
      " · rest " +
      mmss(e.rest) +
      '</span></span><span class="go">Form ›</span></button>' +
      '<p class="hint">' +
      esc(Z.hint(id, cur)) +
      (ramp ? "<br>" + esc(ramp) : "") +
      '</p><div class="sets">' +
      rows +
      '</div><div class="xf"><button class="btn sm" type="button" data-act="addset" data-ex="' +
      id +
      '">+ Set</button>' +
      (Z.S.prog &&
      !sets.some(function (s) {
        return s.d;
      })
        ? '<button class="btn sm" type="button" data-act="swapex" data-ex="' + id + '">Swap</button>'
        : "") +
      "" +
      (sets.length > 1
        ? '<button class="btn sm" type="button" data-act="delset" data-ex="' + id + '">− Set</button>'
        : "") +
      '<a class="btn sm" href="' +
      ytLink(e) +
      '" target="_blank" rel="noopener">' +
      IC.play +
      ' Videos</a><button class="btn sm" type="button" data-act="skipex" data-ex="' +
      id +
      '">Skip</button></div><div class="xf" style="padding-top:0"><input class="in nin" placeholder="Your setting or note, e.g. seat 4, pin 6" aria-label="Note for ' +
      esc(e.n) +
      '" value="' +
      esc(note) +
      '" data-chg="exnote" data-ex="' +
      id +
      '"></div></article>'
    );
  }
  // Train: today's exercises.
  function tList() {
    var k = Z.dk(cur);
    if (Z.rest(cur)) return "";
    return Z.dayEx(cur).map(xcard).join('<div style="height:10px"></div>');
  }
  // Seconds as m:ss min or N s.
  function mmss(sec) {
    return sec >= 60 ? Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2) + " min" : sec + " s";
  }
  // Train: the finisher.
  function tFz() {
    var k = Z.dk(cur);
    if (Z.rest(cur)) return "";
    var f = D.FIN[D.SPLIT[k].fin];
    if (!f) return "";
    var w = Z.gd(cur).wo || {},
      total =
        f.rounds *
        f.steps.reduce(function (a, x) {
          return a + x[1];
        }, 0);
    return (
      '<div class="card"><div class="lab"><span>Finisher</span><button type="button" data-act="fz">' +
      (w.fz ? "Done ✓" : "Mark done") +
      '</button></div><b class="nt">' +
      esc(f.n) +
      '</b><p class="sm mut" style="margin:4px 0 10px">' +
      esc(f.text) +
      '</p><div class="chips">' +
      f.steps
        .map(function (x) {
          return '<span class="chip st">' + esc(x[0]) + " " + mmss(x[1]) + "</span>";
        })
        .join("") +
      '</div><p class="sm" style="margin-top:8px">' +
      (f.rounds > 1 ? f.rounds + " rounds, " : "") +
      Math.round(total / 60) +
      " minutes in all.</p>" +
      (cur === Z.today()
        ? '<button class="btn sm wide" style="margin-top:10px" type="button" data-act="gsstart" data-from="fin">Start the finisher timer</button>'
        : "") +
      "</div>"
    );
  }
  // Train: the cool-down.
  function tCool() {
    var k = Z.dk(cur);
    if (Z.rest(cur)) return "";
    var ids = D.SPLIT[k].cool || [];
    if (!ids.length) return "";
    var w = Z.gd(cur).wo || {};
    return (
      '<div class="card"><div class="lab"><span>Cool-down, 5 min</span><button type="button" data-act="cool">' +
      (w.cool ? "Done ✓" : "Mark done") +
      '</button></div><ul class="cl">' +
      ids
        .map(function (id) {
          var c = D.COOL[id];
          return (
            "<li><div>" +
            esc(c[0]) +
            ' <span class="mut">' +
            c[2] +
            " s" +
            (c[4] ? " each side" : "") +
            "</span><small>" +
            esc(c[1]) +
            "</small></div></li>"
          );
        })
        .join("") +
      "</ul>" +
      (cur === Z.today()
        ? '<button class="btn sm wide" style="margin-top:10px" type="button" data-act="gsstart" data-from="cool">Start the stretch timer</button>'
        : "") +
      '<p class="xs mut" style="margin-top:8px">Ease into each stretch and breathe out slowly. A pull is right; pain is not.</p></div>'
    );
  }

  /* ---------- guided session: one screen at a time ---------- */
  var GS = null;
  // Every step of a guided session: warm-up, sets, finisher, cool-down.
  function gsSteps(dt, from) {
    var k = Z.dk(dt),
      sp = D.SPLIT[k],
      w = Z.mwo(dt),
      out = [],
      f = D.FIN[sp.fin],
      r;
    if (!from && !w.warm) {
      D.WARM.forEach(function (x) {
        out.push({ k: "warm", t: x[0], d: x[1], img: x[2], sec: x[3] || 30 });
      });
      sp.warm.forEach(function (x) {
        out.push({ k: "warm", t: x, d: "For today's muscles", sec: 40 });
      });
    }
    if (!from)
      Z.dayEx(dt).forEach(function (id) {
        if ((w.skip || {})[id]) return;
        w.sets[id].forEach(function (x, i) {
          if (!x.d) out.push({ k: "set", ex: id, i: i });
        });
      });
    if (from !== "cool" && f && (!w.fz || from === "fin"))
      for (r = 1; r <= f.rounds; r++)
        f.steps.forEach(function (x) {
          out.push({
            k: "fin",
            t: x[0],
            d: f.n + (f.rounds > 1 ? ", round " + r + " of " + f.rounds : ""),
            sec: x[1]
          });
        });
    if (from !== "fin" && (!w.cool || from === "cool"))
      (sp.cool || []).forEach(function (id) {
        var c = D.COOL[id];
        (c[4] ? [" (left)", " (right)"] : [""]).forEach(function (side) {
          out.push({ k: "cool", t: c[0] + side, d: c[1], img: c[3], sec: c[2] });
        });
      });
    return out;
  }
  var GSK = { warm: "Warm-up", set: "Strength", fin: "Finisher", cool: "Cool-down" };
  // End the guided session.
  function gsStop() {
    if (!GS) return;
    clearInterval(GS.iv);
    GS = null;
    try {
      if (Z.NATIVE) window.SZNative.keepAwake(false);
    } catch (e) {}
  }
  // Seconds as m:ss.
  function gsClock(sec) {
    sec = Math.max(0, sec);
    return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2);
  }
  // Start a countdown.
  function gsArm(sec) {
    GS.end = Date.now() + sec * 1000;
    GS.left = sec;
    GS.paused = false;
  }
  // Draw the current step of the guided session.
  function gsShow() {
    GS.vp = false;
    gsSay();
    var st = GS.steps[GS.i],
      n = GS.steps.length,
      h = '<div class="gs"><div class="gsp"><i style="width:' + pct(GS.i, n) + '%"></i></div>';
    if (!st) {
      var td = Z.today(),
        w = Z.mwo(td),
        sm;
      if (!GS.part && !w.fin) {
        w.fin = true;
        w.t1 = Date.now();
      }
      sm = Z.sessionSummary(td);
      clearInterval(GS.iv);
      h +=
        '<div class="gsk">' +
        (GS.part ? "Done" : "Session complete") +
        '</div><div class="gsc">' +
        (GS.part ? "OK" : "+40 XP") +
        "</div>" +
        (GS.part
          ? ""
          : '<p class="gsd">' +
            sm.sets +
            " sets" +
            (sm.vol ? ", " + Z.nf(sm.vol) + " kg moved" : "") +
            (sm.change != null
              ? ", volume " + (sm.change >= 0 ? "up " : "down ") + Math.abs(Z.r0(sm.change)) + "%"
              : "") +
            "." +
            (sm.best.length ? " New best on " + esc(sm.best.slice(0, 2).join(" and ")) + "." : "") +
            '</p><p class="gsn">Breakfast within the hour: oats, milk and eggs.</p>') +
        '<button class="btn pri wide big" type="button" data-act="closesheet">Finish</button></div>';
      $("#sheet-b").innerHTML = h;
      $("#sheet-b").scrollTop = 0;
      buzz([80, 60, 160]);
      return;
    }
    h += '<div class="gsk">' + GSK[st.k] + ", step " + (GS.i + 1) + " of " + n + "</div>";
    if (GS.rest) {
      var nx = GS.steps[GS.i],
        e2 = nx.k === "set" ? D.EX[nx.ex] : null,
        pv = GS.steps[GS.i - 1],
        fresh = e2 && !(pv && pv.k === "set" && pv.ex === nx.ex);
      h +=
        '<h3 class="gst">Rest</h3><div class="gsc rest" id="gs-c">' +
        gsClock(GS.left) +
        '</div><p class="gsd">Next: ' +
        esc(e2 ? e2.n + ", set " + (nx.i + 1) + " of " + e2.sets : nx.t) +
        '</p><div class="g2"><button class="btn" type="button" data-act="gsmore">+ 30 s</button><button class="btn pri" type="button" data-act="gsnext">Skip rest</button></div>' +
        (fresh
          ? '<div class="gsup"><div class="gsk">Learn the next move</div>' +
            mediaHtml(nx.ex) +
            formHtml(e2, false) +
            "</div>"
          : "");
    } else if (st.k === "set") {
      var e = D.EX[st.ex],
        x = Z.mwo(Z.today()).sets[st.ex][st.i],
        wv = x.w === "" || x.w == null ? "" : x.w,
        rv = x.r === "" || x.r == null ? e.lo : x.r,
        newEx = !GS.steps.slice(0, GS.i).some(function (y) {
          return y.k === "set" && y.ex === st.ex;
        }),
        first =
          st.i === 0 &&
          +wv > 0 &&
          !GS.steps.slice(0, GS.i).some(function (y) {
            return y.k === "set";
          }) &&
          !Object.keys(Z.mwo(Z.today()).sets).some(function (id) {
            return Z.mwo(Z.today()).sets[id].some(function (y) {
              return y.d;
            });
          });
      h +=
        '<h3 class="gst">' +
        esc(e.n) +
        '</h3><p class="gsd">Set ' +
        (st.i + 1) +
        " of " +
        e.sets +
        ", target " +
        Z.repTxt(e) +
        "</p>" +
        mediaHtml(st.ex) +
        (first
          ? '<p class="gsn"><b>Ramp up first:</b> ' +
            Math.round((+wv * 0.5) / 2.5) * 2.5 +
            " kg × 8, then " +
            Math.round((+wv * 0.75) / 2.5) * 2.5 +
            " kg × 4. These do not count.</p>"
          : '<p class="gsn">' +
            esc(st.i === 0 ? Z.hint(st.ex, Z.today()) : e.steps[Math.min(st.i, e.steps.length - 1)]) +
            "</p>") +
        formHtml(e, newEx) +
        '<div class="gsin' +
        (e.bw ? " one" : "") +
        '">' +
        (e.bw
          ? ""
          : '<div class="gsf"><small>Weight, kg</small><div><button type="button" data-act="gsadj" data-f="w" data-d="-2.5" aria-label="Less weight">−</button><input class="in num" id="gs-w" type="number" inputmode="decimal" step="0.5" value="' +
            wv +
            '" placeholder="0" aria-label="Weight"><button type="button" data-act="gsadj" data-f="w" data-d="2.5" aria-label="More weight">+</button></div></div>') +
        '<div class="gsf"><small>' +
        (e.unit === "sec" ? "Seconds" : "Reps") +
        (e.each ? ", each side" : "") +
        '</small><div><button type="button" data-act="gsadj" data-f="r" data-d="-1" aria-label="Fewer">−</button><input class="in num" id="gs-r" type="number" inputmode="numeric" value="' +
        rv +
        '" aria-label="Reps"><button type="button" data-act="gsadj" data-f="r" data-d="1" aria-label="More">+</button></div></div></div>' +
        '<button class="btn pri wide big" type="button" data-act="gsdone">Set done</button><button class="btn sm wide" type="button" data-act="gsskip">Skip this exercise</button>';
    } else {
      h +=
        '<h3 class="gst">' +
        esc(st.t) +
        '</h3><p class="gsd">' +
        esc(st.d) +
        "</p>" +
        (st.img ? '<img class="gsimg" src="img/ex/' + st.img + '_0.webp" alt="">' : "") +
        '<div class="gsc" id="gs-c">' +
        gsClock(GS.left) +
        '</div><div class="g2"><button class="btn" type="button" data-act="gspause">' +
        (GS.paused ? "Resume" : "Pause") +
        '</button><button class="btn pri" type="button" data-act="gsnext">Done, next</button></div>';
    }
    $("#sheet-b").innerHTML = h + "</div>";
    $("#sheet-b").scrollTop = 0;
  }
  // marks a phase complete once its last step has been passed
  function gsPassed(st) {
    if (
      !st ||
      GS.steps.slice(GS.i).some(function (y) {
        return y.k === st.k;
      })
    )
      return;
    var w = Z.mwo(Z.today());
    if (st.k === "warm") w.warm = true;
    else if (st.k === "fin") w.fz = true;
    else if (st.k === "cool") w.cool = true;
  }
  // Start the current step.
  function gsGo() {
    GS.rest = false;
    var st = GS.steps[GS.i];
    if (st && st.k !== "set") gsArm(st.sec);
    else {
      GS.end = null;
      GS.paused = false;
    }
    gsShow();
  }
  // Move to the next step.
  function gsNext() {
    if (!GS) return;
    if (GS.rest) {
      gsGo();
      return;
    }
    var st = GS.steps[GS.i];
    GS.i++;
    gsPassed(st);
    gsGo();
  }
  // Countdown tick: buzz near the end, advance at zero.
  function gsTick() {
    if (!GS || GS.paused || !GS.end) return;
    var left = Math.ceil((GS.end - Date.now()) / 1000);
    if (left === GS.left) return;
    GS.left = left;
    var el = $("#gs-c");
    if (el) el.textContent = gsClock(left);
    if (left <= 3 && left > 0) buzz(30);
    if (left === 10 && cuesOn() && GS.rest) V.speak("10 seconds");
    if (left <= 0) {
      buzz([160, 80, 160]);
      beep();
      gsNext();
    }
  }
  // Open the guided session.
  function gsStart(from) {
    cur = Z.today();
    var w = Z.mwo(cur);
    if (!w.t0) w.t0 = Date.now();
    var steps = gsSteps(cur, from || null);
    openSheet("player", D.SPLIT[Z.dk(cur)].focus, "");
    GS = {
      steps: steps,
      i: 0,
      rest: false,
      paused: false,
      end: null,
      left: 0,
      part: !!from,
      iv: setInterval(gsTick, 250)
    };
    try {
      if (Z.NATIVE) window.SZNative.keepAwake(true);
    } catch (e) {}
    gsGo();
  }

  // Train: finish the session.
  function tFin() {
    var k = Z.dk(cur);
    if (Z.rest(cur)) return "";
    var w = Z.gd(cur).wo,
      ws = Z.woStats(cur);
    if (w && w.fin) {
      var mins = w.t0 && w.t1 ? Math.max(1, Math.round((w.t1 - w.t0) / 60000)) : null;
      var sm = Z.sessionSummary(cur),
        cmp =
          sm.change != null
            ? '<div class="sm" style="margin-top:6px">Volume ' +
              (Math.abs(sm.change) < 1
                ? "level with"
                : (sm.change > 0 ? "up " : "down ") + Math.abs(Z.r0(sm.change)) + "% on") +
              " your last " +
              esc(fmt(sm.prev, { weekday: "long" })) +
              " session.</div>"
            : "";
      if (sm.best.length)
        cmp +=
          '<div class="sm" style="margin-top:4px">New best on ' +
          esc(sm.best.slice(0, 3).join(", ")) +
          (sm.best.length > 3 ? " and " + (sm.best.length - 3) + " more" : "") +
          ".</div>";
      return (
        '<div class="okbox"><b>Session complete.</b> ' +
        ws.done +
        " sets" +
        (ws.vol ? ", " + Z.nf(ws.vol) + " kg total volume" : "") +
        (mins ? ", " + mins + " min" : "") +
        ". Eat a meal with protein within the next couple of hours." +
        cmp +
        '<div class="sm mut" style="margin:10px 0 5px">How hard was it?</div><div class="seg" style="grid-template-columns:repeat(3,1fr)">' +
        ["easy", "right", "hard"]
          .map(function (x) {
            return (
              '<button type="button" class="' +
              (w.effort === x ? "on" : "") +
              '" data-act="effort" data-v="' +
              x +
              '">' +
              { easy: "Too easy", right: "About right", hard: "Very hard" }[x] +
              "</button>"
            );
          })
          .join("") +
        '</div><div style="margin-top:8px"><button class="btn sm" type="button" data-act="unfinish">Reopen session</button></div></div>'
      );
    }
    return '<button class="btn pri wide" type="button" data-act="finish">Finish session · +40 XP</button>';
  }

  /* ================= FOOD ================= */
  function fSum() {
    var t = Z.tot(cur),
      p = Z.S.profile,
      remK = p.kcal - t.k,
      remP = p.protein - t.p,
      max = p.kcal * 1.25;
    function mac(n, v, g) {
      return (
        "<div><span>" +
        n +
        '</span><b class="num">' +
        Z.r0(v) +
        " / " +
        g +
        ' g</b><div class="bar"><i style="width:' +
        pct(v, g) +
        '%"></i></div></div>'
      );
    }
    return (
      datebar() +
      '<div class="card"><div class="big num">' +
      Z.nf(t.k) +
      " <small>/ " +
      Z.nf(p.kcal) +
      ' kcal</small></div><div class="sm mut" style="margin-top:4px">' +
      (remK >= 0 ? Z.nf(remK) + " kcal left" : Z.nf(-remK) + " kcal over") +
      " · " +
      (remP > 0 ? Z.r0(remP) + " g protein to go" : "protein target reached") +
      "</div>" +
      '<div class="bar' +
      (t.k > p.kcal + 150 ? " bad" : t.k >= p.kcal - 200 ? " good" : "") +
      '" style="margin-top:10px"><i style="width:' +
      pct(t.k, max) +
      '%"></i><u style="left:80%"></u></div>' +
      '<div class="mac">' +
      mac("Protein", t.p, p.protein) +
      mac("Carbs", t.c, p.carbs) +
      mac("Fat", t.f, p.fat) +
      mac("Fibre", t.fb, p.fibre) +
      "</div>" +
      mealBars() +
      "</div>"
    );
  }
  // Food: tool buttons.
  function fTools() {
    return '<div class="g2"><button class="btn sm" type="button" data-act="logfull">Log full plan</button><button class="btn sm" type="button" data-act="foodguide">How to eat</button><button class="btn sm" type="button" data-act="calc">Calculator</button><button class="btn sm" type="button" data-act="system" data-open="bud">Monthly groceries</button></div>';
  }
  // Food: water.
  function fWater() {
    return '<div class="card">' + waterHtml() + "</div>";
  }
  // Food: type what you ate.
  function fType() {
    var now = mealNow();
    return (
      '<div class="card"><div class="lab"><span>Type what you ate</span></div><textarea class="in" id="ty-food" rows="2" placeholder="e.g. 2 aloo paratha with dahi and a cup of chai"></textarea>' +
      '<div class="row" style="margin-top:8px"><select class="in grow" id="ty-meal" aria-label="Meal">' +
      D.MEALS.map(function (m) {
        return '<option value="' + m.id + '"' + (m.id === now ? " selected" : "") + ">" + m.n + "</option>";
      }).join("") +
      '</select><button class="btn pri" type="button" data-act="typefood">Find foods</button></div>' +
      '<p class="xs mut" style="margin-top:6px">Matched against ' +
      Z.allFoods().length +
      " foods. You check the list before anything is added.</p></div>"
    );
  }
  // The check-and-add list for typed food.
  function typedHtml() {
    var T = window.__szTyped;
    if (!T) return "";
    var k = 0,
      p = 0;
    T.items.forEach(function (x) {
      k += x.f.k * x.q;
      p += x.f.p * x.q;
    });
    var meal = D.MEALS.filter(function (m) {
      return m.id === T.meal;
    })[0];
    return (
      (T.items.length
        ? T.items
            .map(function (x, i) {
              return (
                '<div class="fi"><div class="n">' +
                esc(x.f.n) +
                "<small>" +
                x.q +
                " × " +
                esc(x.f.u) +
                " · " +
                Z.r0(x.f.k * x.q) +
                " kcal · " +
                Z.r1(x.f.p * x.q) +
                " g protein" +
                (x.note ? " · " + esc(x.note) : "") +
                '</small></div><div class="stp"><button type="button" data-act="tyq" data-i="' +
                i +
                '" data-d="-0.5" aria-label="Less">−</button><span class="num">' +
                x.q +
                '</span><button type="button" data-act="tyq" data-i="' +
                i +
                '" data-d="0.5" aria-label="More">+</button></div></div>'
              );
            })
            .join("") +
          '<div class="row sp" style="padding-top:6px"><b>Total</b><b class="num">' +
          Z.nf(k) +
          " kcal · " +
          Z.r0(p) +
          " g protein</b></div>"
        : '<p class="sm mut">None of that matched a food I know.</p>') +
      (T.miss.length
        ? '<div class="warnbox" style="margin-top:0"><b>No match for:</b> ' +
          T.miss.map(esc).join(", ") +
          '.<div class="row" style="margin-top:8px;flex-wrap:wrap">' +
          T.miss
            .slice(0, 3)
            .map(function (m) {
              return (
                '<button class="btn sm" type="button" data-act="findonline" data-q="' +
                esc(m) +
                '">Search “' +
                esc(m.slice(0, 18)) +
                "” online</button>"
              );
            })
            .join("") +
          "</div></div>"
        : "") +
      (T.items.length
        ? '<button class="btn pri wide" type="button" data-act="typedadd">Add ' +
          T.items.length +
          " item" +
          (T.items.length > 1 ? "s" : "") +
          " to " +
          esc(meal.n) +
          "</button>"
        : "") +
      '<p class="xs mut">Portions come from your words. Use − and + if a portion looks wrong.</p>'
    );
  }
  // Food: the meals with their planned dish.
  function fMeals() {
    var d = Z.gd(cur);
    return (
      '<div class="card">' +
      D.MEALS.map(function (m) {
        var items = d.food.filter(function (x) {
            return x.m === m.id;
          }),
          k = 0,
          p = 0,
          yn = Z.gd(Z.addDays(cur, -1)).food.filter(function (x) {
            return x.m === m.id;
          }).length;
        items.forEach(function (x) {
          k += x.k * x.q;
          p += x.p * x.q;
        });
        if (!m.plan.length && !items.length) return ""; // a meal slot this person's day does not use
        var plan = m.plan
          .map(function (it) {
            return P.amount(it[0], it[1]);
          })
          .join(", ");
        return (
          '<div class="meal"><div class="row sp"><div><h3>' +
          m.n +
          '</h3><span class="xs mut">' +
          m.t +
          (items.length ? " · " + Z.nf(k) + " kcal · " + Z.r0(p) + " g protein" : "") +
          '</span></div><div class="row" style="gap:6px">' +
          (m.plan.length
            ? '<button class="btn sm" type="button" data-act="logplan" data-m="' +
              m.id +
              '">Log plan</button>'
            : "") +
          '<button class="btn sm pri" type="button" data-act="addfood" data-m="' +
          m.id +
          '">+ Add</button></div></div>' +
          (items.length
            ? items
                .map(function (x) {
                  return (
                    '<div class="fi"><div class="n">' +
                    esc(x.n) +
                    (x.e ? '<span class="est">EST</span>' : "") +
                    "<small>" +
                    x.q +
                    " × " +
                    esc(x.u) +
                    " · " +
                    Z.r0(x.k * x.q) +
                    " kcal · " +
                    Z.r1(x.p * x.q) +
                    ' g protein</small></div><div class="stp"><button type="button" data-act="fq" data-id="' +
                    x.id +
                    '" data-d="-0.5" aria-label="Less">−</button><span class="num">' +
                    x.q +
                    '</span><button type="button" data-act="fq" data-id="' +
                    x.id +
                    '" data-d="0.5" aria-label="More">+</button></div></div>'
                  );
                })
                .join("") +
              '<button class="lk" type="button" data-act="savemeal" data-m="' +
              m.id +
              '">Save these as a meal</button>'
            : (m.plan.length
                ? '<p class="sm" style="margin-top:6px">' +
                  (m.dish ? "<b>" + esc(m.dish) + "</b><br>" : "") +
                  '<span class="mut">' +
                  esc(plan) +
                  "</span></p>" +
                  (m.tip ? '<p class="xs mut">' + esc(m.tip) + "</p>" : "") +
                  (m.opts && m.opts.length > 1
                    ? '<button class="lk" type="button" data-act="swapdish" data-m="' +
                      m.id +
                      '">Swap for another dish (' +
                      m.opts.length +
                      " options)</button>"
                    : "")
                : '<p class="sm mut" style="margin-top:6px">Nothing planned here. Add anything you eat.</p>') +
              (yn
                ? '<button class="btn sm" style="margin-top:6px" type="button" data-act="copymeal" data-m="' +
                  m.id +
                  '">Same as yesterday (' +
                  yn +
                  (yn > 1 ? " items)" : " item)") +
                  "</button>"
                : "")) +
          "</div>"
        );
      }).join("") +
      "</div>"
    );
  }
  // Food: ideas for what is left today.
  function fIdea() {
    var t = Z.tot(cur),
      p = Z.S.profile;
    if (cur !== Z.today() || !Z.gd(cur).food.length) return "";
    var list = Z.insights(cur)
      .filter(function (i) {
        return i.tag === "FUEL";
      })
      .slice(0, 1);
    return list.length
      ? '<div class="card"><div class="lab"><span>What to eat next</span></div>' + insHtml(list) + "</div>"
      : "";
  }
  // Saved meals.
  function savedHtml() {
    var L = Z.S.meals;
    if (!L.length) return "";
    return (
      '<details class="sec" open><summary>Your saved meals (' +
      L.length +
      ")</summary><div>" +
      L.map(function (m) {
        var t = Z.mealTot(m);
        return (
          '<div class="frow"><div>' +
          esc(m.n) +
          "<small>" +
          m.items.length +
          " item" +
          (m.items.length > 1 ? "s" : "") +
          ", " +
          Z.nf(t.k) +
          " kcal, " +
          Z.r0(t.p) +
          ' g protein</small></div><div class="row" style="gap:6px"><button class="btn sm pri" type="button" data-act="addsaved" data-id="' +
          m.id +
          '">Add</button><button class="btn sm" type="button" data-act="delsaved" data-id="' +
          m.id +
          '" aria-label="Delete ' +
          esc(m.n) +
          '">Delete</button></div></div>'
        );
      }).join("") +
      "</div></details>"
    );
  }
  // Search results in the add-food sheet.
  function foodRows(q) {
    q = (q || "").toLowerCase().trim();
    var list = Z.searchFoods(q);
    if (!list.length)
      return '<p class="sm mut" style="padding:10px 0">Not in the built-in list. Search online below, or add it as a custom food.</p>';
    return list
      .map(function (f) {
        return (
          '<div class="frow"><div>' +
          esc(f.n) +
          "<small>" +
          esc(f.u) +
          " · " +
          Z.r0(f.k) +
          " kcal · " +
          Z.r1(f.p) +
          ' g protein</small></div><button class="btn sm" type="button" data-act="pickfood" data-id="' +
          f.id +
          '">+ ' +
          f.q +
          "</button></div>"
        );
      })
      .join("");
  }

  /* ================= STATS ================= */
  function chartBars(vals, labels, o) {
    var W = 340,
      H = 118,
      l = 6,
      r = 6,
      t = 8,
      b = 18,
      n = vals.length,
      max = Math.max.apply(
        null,
        vals
          .map(function (v) {
            return v || 0;
          })
          .concat([o.target * 1.15])
      ),
      bw = (W - l - r) / n;
    function Y(v) {
      return t + (1 - v / max) * (H - t - b);
    }
    var s = '<svg class="ch" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.label) + '">';
    vals.forEach(function (v, i) {
      var x = l + i * bw + 2,
        ok = v != null && (o.ok ? o.ok(v) : v >= o.target);
      if (v != null && v > 0)
        s +=
          '<rect x="' +
          x.toFixed(1) +
          '" y="' +
          Y(v).toFixed(1) +
          '" width="' +
          (bw - 4).toFixed(1) +
          '" height="' +
          (H - b - Y(v)).toFixed(1) +
          '" rx="3" fill="' +
          (ok ? "var(--acc)" : "var(--line2)") +
          '"/>';
      else
        s +=
          '<rect x="' +
          x.toFixed(1) +
          '" y="' +
          (H - b - 2) +
          '" width="' +
          (bw - 4).toFixed(1) +
          '" height="2" fill="var(--line)"/>';
      if (i % 2 === (n - 1) % 2)
        s +=
          '<text x="' +
          (x + (bw - 4) / 2).toFixed(1) +
          '" y="' +
          (H - 5) +
          '" text-anchor="middle">' +
          labels[i] +
          "</text>";
    });
    s +=
      '<line x1="' +
      l +
      '" x2="' +
      (W - r) +
      '" y1="' +
      Y(o.target).toFixed(1) +
      '" y2="' +
      Y(o.target).toFixed(1) +
      '" stroke="var(--ink)" stroke-opacity=".55" stroke-dasharray="4 4"/><text x="' +
      (W - r) +
      '" y="' +
      (Y(o.target) - 4).toFixed(1) +
      '" text-anchor="end">' +
      esc(o.tlabel) +
      "</text></svg>";
    return s;
  }
  // Values for the last 14 days.
  function last14(fn) {
    var v = [],
      lb = [],
      td = Z.today();
    for (var i = 13; i >= 0; i--) {
      var dt = Z.addDays(td, -i),
        d = Z.S.days[dt];
      v.push(d ? fn(d, dt) : null);
      lb.push(Z.pd(dt).getDate());
    }
    return { v: v, lb: lb };
  }
  // Stats: weight chart.
  function sWeight() {
    var S = Z.S,
      p = S.profile,
      days = Object.keys(S.days)
        .filter(function (k) {
          return S.days[k].w != null;
        })
        .sort(),
      tr = Z.trend();
    var gk = Z.goalKind(),
      up = gk === "gain",
      lastW = tr.last != null ? tr.last : p.startW,
      lost = up ? lastW - p.startW : p.startW - lastW,
      togo = Math.max(0, up ? p.goalW - lastW : lastW - p.goalW),
      eta = "",
      pace = tr.rate == null ? null : up ? -tr.rate : tr.rate;
    if (gk !== "hold" && pace != null && pace >= (up ? 0.1 : 0.2) && togo > 0) {
      var wks = togo / pace;
      eta = fmt(Z.addDays(Z.today(), Math.round(wks * 7)), { month: "short", year: "numeric" });
    }
    var h =
      '<div class="card"><div class="lab"><span>Body weight</span></div><div class="kpis"><div class="kpi"><small>Weekly average</small><b class="num">' +
      Z.r1(lastW).toFixed(1) +
      '</b></div><div class="kpi"><small>' +
      (gk === "hold" ? "Change" : up ? "Gained so far" : "Lost so far") +
      '</small><b class="num">' +
      (gk === "hold"
        ? (lastW - p.startW >= 0 ? "+" : "−") + Math.abs(Z.r1(lastW - p.startW)).toFixed(1)
        : Z.r1(lost).toFixed(1)) +
      '</b></div><div class="kpi"><small>' +
      (gk === "hold" ? "Holding at" : "To " + p.goalW + " kg") +
      '</small><b class="num">' +
      (gk === "hold" ? Z.r1(p.startW).toFixed(1) : Z.r1(togo).toFixed(1)) +
      "</b></div></div>" +
      '<div class="row sp xs mut" style="margin-top:10px"><span>' +
      p.startW +
      " kg</span><span>" +
      (tr.rate != null
        ? (tr.rate > 0.04 ? "−" : tr.rate < -0.04 ? "+" : "") +
          Z.r1(Math.abs(tr.rate)) +
          " kg / week" +
          (eta ? " · goal around " + eta : "")
        : "trend needs 2+ weeks") +
      "</span><span>" +
      p.goalW +
      ' kg</span></div><div class="bar" style="margin-top:4px"><i style="width:' +
      (gk === "hold"
        ? Math.abs(lastW - p.startW) <= 1.5
          ? 100
          : 40
        : pct(lost, Math.abs(p.startW - p.goalW))) +
      '%"></i></div><div class="ms">' +
      Z.milestones()
        .map(function (m) {
          return '<span class="num' + (m.hit ? " hit" : "") + '">' + m.w + "</span>";
        })
        .join("") +
      "</div>";
    if (days.length) {
      var W = 340,
        H = 170,
        l = 30,
        r = 10,
        t = 12,
        b = 22,
        vals = days.map(function (k) {
          return S.days[k].w;
        }),
        mn = Math.floor(Math.min.apply(null, vals) - 1),
        mx = Math.ceil(Math.max.apply(null, vals) + 1);
      var d0 = Z.pd(days[0]).getTime(),
        d1 = Math.max(Z.pd(days[days.length - 1]).getTime(), d0 + 27 * 864e5);
      var X = function (k) {
          return l + ((Z.pd(k).getTime() - d0) / (d1 - d0)) * (W - l - r);
        },
        Y = function (v) {
          return t + ((mx - v) / (mx - mn)) * (H - t - b);
        };
      var s =
          '<svg class="ch" viewBox="0 0 ' +
          W +
          " " +
          H +
          '" role="img" aria-label="Weight chart" style="margin-top:12px">',
        step = Math.max(1, Math.ceil((mx - mn) / 5));
      for (var v = mn; v <= mx; v += step)
        s +=
          '<line x1="' +
          l +
          '" x2="' +
          (W - r) +
          '" y1="' +
          Y(v) +
          '" y2="' +
          Y(v) +
          '" stroke="var(--line)"/><text x="' +
          (l - 5) +
          '" y="' +
          (Y(v) + 3) +
          '" text-anchor="end">' +
          v +
          "</text>";
      if (p.goalW >= mn && p.goalW <= mx)
        s +=
          '<line x1="' +
          l +
          '" x2="' +
          (W - r) +
          '" y1="' +
          Y(p.goalW) +
          '" y2="' +
          Y(p.goalW) +
          '" stroke="var(--good)" stroke-dasharray="4 4"/>';
      var pts = [];
      days.forEach(function (k) {
        var a = [],
          w = S.days[k].w;
        for (var i = 0; i < 7; i++) {
          var q = S.days[Z.addDays(k, -i)];
          if (q && q.w != null) a.push(q.w);
        }
        pts.push([X(k), Y(Z.avg(a))]);
        s +=
          '<circle cx="' +
          X(k).toFixed(1) +
          '" cy="' +
          Y(w).toFixed(1) +
          '" r="2.6" fill="var(--muted)" opacity=".6"/>';
      });
      if (pts.length > 1)
        s +=
          '<path d="M' +
          pts[0][0].toFixed(1) +
          "," +
          (H - b) +
          " L" +
          pts
            .map(function (q) {
              return q[0].toFixed(1) + "," + q[1].toFixed(1);
            })
            .join(" L") +
          " L" +
          pts[pts.length - 1][0].toFixed(1) +
          "," +
          (H - b) +
          ' Z" fill="var(--acc)" opacity=".13"/>';
      if (pts.length > 1)
        s +=
          '<polyline fill="none" stroke="var(--acc)" stroke-width="2.6" stroke-linejoin="round" points="' +
          pts
            .map(function (q) {
              return q[0].toFixed(1) + "," + q[1].toFixed(1);
            })
            .join(" ") +
          '"/>';
      var e = pts[pts.length - 1];
      s +=
        '<circle cx="' +
        e[0].toFixed(1) +
        '" cy="' +
        e[1].toFixed(1) +
        '" r="5" fill="var(--acc)" stroke="var(--panel)" stroke-width="2"/>';
      s +=
        '<text x="' +
        l +
        '" y="' +
        (H - 6) +
        '">' +
        esc(fmt(days[0], { day: "numeric", month: "short" })) +
        '</text><text x="' +
        (W - r) +
        '" y="' +
        (H - 6) +
        '" text-anchor="end">' +
        esc(fmt(Z.ymd(new Date(d1)), { day: "numeric", month: "short" })) +
        "</text></svg>";
      h +=
        s +
        '<p class="xs mut">Dots are daily weigh-ins. The line is the 7-day average: judge progress by the line.</p>';
    }
    h += bodyHtml();
    return h;
  }
  // Stats: the month grid.
  function sGrid() {
    var td = Z.today(),
      end = Z.addDays(Z.monday(td), 6),
      cells = "";
    ["M", "T", "W", "T", "F", "S", "S"].forEach(function (x) {
      cells += "<b>" + x + "</b>";
    });
    for (var i = 34; i >= 0; i--) {
      var dt = Z.addDays(end, -i),
        n = dt > td ? -1 : Z.S.days[dt] ? Z.doneCount(dt) : 0,
        cls = n < 0 ? "" : n >= 7 ? "l4" : n >= 5 ? "l3" : n >= 3 ? "l2" : n >= 1 ? "l1" : "";
      cells +=
        '<i class="' +
        cls +
        (dt === td ? " td" : "") +
        '" title="' +
        dt +
        (n >= 0 ? ": " + n + " of 7" : "") +
        '"' +
        (n < 0 ? ' style="opacity:.3"' : "") +
        ">" +
        Z.pd(dt).getDate() +
        "</i>";
    }
    return (
      '<div class="card"><div class="lab"><span>Consistency · 5 weeks</span><span>' +
      Z.streak() +
      'D streak</span></div><div class="grid7">' +
      cells +
      '</div><p class="xs mut" style="margin-top:8px">Brighter means more of the 7 daily goals done.</p></div>'
    );
  }
  // Stats: calories and protein.
  function sFuel() {
    var p = Z.S.profile,
      a = last14(function (d, dt) {
        return d.food.length ? Z.tot(dt).k : null;
      }),
      b = last14(function (d, dt) {
        return d.food.length ? Z.tot(dt).p : null;
      });
    return (
      '<div class="card"><div class="lab"><span>Calories · 14 days</span></div>' +
      chartBars(a.v, a.lb, {
        target: p.kcal,
        tlabel: Z.nf(p.kcal) + " kcal",
        label: "Calories for the last 14 days",
        ok: function (v) {
          return v >= p.kcal - 200 && v <= p.kcal + 150;
        }
      }) +
      '<div class="lab" style="margin-top:14px"><span>Protein · 14 days</span></div>' +
      chartBars(b.v, b.lb, {
        target: p.protein,
        tlabel: p.protein + " g",
        label: "Protein for the last 14 days",
        ok: function (v) {
          return v >= p.protein - 10;
        }
      }) +
      "</div>"
    );
  }
  // Stats: recovery.
  function sRec() {
    var p = Z.S.profile,
      a = last14(function (d) {
        return d.sleep;
      }),
      b = last14(function (d) {
        return d.steps;
      });
    return (
      '<div class="card"><div class="lab"><span>Sleep · 14 days</span></div>' +
      chartBars(a.v, a.lb, { target: p.sleep, tlabel: p.sleep + " h", label: "Sleep for the last 14 days" }) +
      '<div class="lab" style="margin-top:14px"><span>Steps · 14 days</span></div>' +
      chartBars(b.v, b.lb, { target: p.steps, tlabel: Z.nf(p.steps), label: "Steps for the last 14 days" }) +
      "</div>"
    );
  }
  // Stats: strength.
  function sStr() {
    var ids = Object.keys(D.EX),
      withH = ids.filter(function (id) {
        return Z.exHistory(id).length;
      });
    if (!selEx || !D.EX[selEx])
      selEx =
        withH[0] ||
        D.SPLIT[Z.dk(Z.today())].ex[0] ||
        (function () {
          var ks = Object.keys(D.SPLIT),
            i;
          for (i = 0; i < ks.length; i++) if (D.SPLIT[ks[i]].ex.length) return D.SPLIT[ks[i]].ex[0];
          return "pu";
        })();
    var h = Z.exHistory(selEx),
      e = D.EX[selEx];
    var out =
      '<div class="card"><div class="lab"><span>Strength</span></div><select class="in" data-chg="selex" aria-label="Exercise">' +
      ids
        .map(function (id) {
          return (
            '<option value="' +
            id +
            '"' +
            (id === selEx ? " selected" : "") +
            ">" +
            esc(D.EX[id].n) +
            "</option>"
          );
        })
        .join("") +
      "</select>";
    if (!h.length)
      return (
        out +
        '<p class="sm mut" style="margin-top:10px">No sets logged for this exercise yet. Tick sets in Train and your progress shows here.</p></div>'
      );
    var W = 340,
      H = 130,
      l = 32,
      r = 10,
      t = 10,
      b = 20,
      vals = h.map(function (x) {
        return x.e1;
      }),
      mn = Math.min.apply(null, vals),
      mx = Math.max.apply(null, vals);
    if (mx === mn) {
      mx += 1;
      mn -= 1;
    }
    var X = function (i) {
        return h.length === 1 ? (l + W - r) / 2 : l + (i / (h.length - 1)) * (W - l - r);
      },
      Y = function (v) {
        return t + ((mx - v) / (mx - mn)) * (H - t - b);
      };
    var s =
      '<svg class="ch" viewBox="0 0 ' +
      W +
      " " +
      H +
      '" role="img" aria-label="Strength trend" style="margin-top:10px"><text x="' +
      (l - 5) +
      '" y="' +
      (Y(mx) + 3) +
      '" text-anchor="end">' +
      Z.r0(mx) +
      '</text><text x="' +
      (l - 5) +
      '" y="' +
      (Y(mn) + 3) +
      '" text-anchor="end">' +
      Z.r0(mn) +
      '</text><line x1="' +
      l +
      '" x2="' +
      (W - r) +
      '" y1="' +
      Y(mx) +
      '" y2="' +
      Y(mx) +
      '" stroke="var(--line)"/><line x1="' +
      l +
      '" x2="' +
      (W - r) +
      '" y1="' +
      Y(mn) +
      '" y2="' +
      Y(mn) +
      '" stroke="var(--line)"/>';
    if (h.length > 1)
      s +=
        '<polyline fill="none" stroke="var(--acc)" stroke-width="2.6" points="' +
        h
          .map(function (x, i) {
            return X(i).toFixed(1) + "," + Y(x.e1).toFixed(1);
          })
          .join(" ") +
        '"/>';
    h.forEach(function (x, i) {
      s +=
        '<circle cx="' +
        X(i).toFixed(1) +
        '" cy="' +
        Y(x.e1).toFixed(1) +
        '" r="' +
        (i === h.length - 1 ? 5 : 3) +
        '" fill="var(--acc)"/>';
    });
    s +=
      '<text x="' +
      l +
      '" y="' +
      (H - 5) +
      '">' +
      esc(fmt(h[0].dt, { day: "numeric", month: "short" })) +
      '</text><text x="' +
      (W - r) +
      '" y="' +
      (H - 5) +
      '" text-anchor="end">' +
      esc(fmt(h[h.length - 1].dt, { day: "numeric", month: "short" })) +
      "</text></svg>";
    var L = h[h.length - 1];
    return (
      out +
      s +
      '<p class="xs mut">' +
      (e.bw || e.unit === "sec"
        ? "Best set per session (" + (e.unit === "sec" ? "seconds" : "reps or estimated strength") + ")."
        : "Estimated one-rep max from your best set each session (Epley formula). It is a trend line, not a number to test.") +
      " Latest best set: " +
      (L.w ? L.w + " kg × " : "") +
      L.r +
      (e.unit === "sec" ? " s" : "") +
      ".</p></div>"
    );
  }
  // Stats: weekly summaries.
  function sWeeks() {
    var wk = Z.weeks().slice(-8).reverse();
    if (!wk.length) return "";
    function c(v, f) {
      return v == null ? "–" : f(v);
    }
    return (
      '<div class="card"><div class="lab"><span>Weekly report</span></div><div class="tw"><table><thead><tr><th>Week of</th><th class="n">Avg kg</th><th class="n">Δ</th><th class="n">kcal</th><th class="n">Protein</th><th class="n">Gym</th><th class="n">Sleep</th></tr></thead><tbody>' +
      wk
        .map(function (w, i) {
          var pv = wk[i + 1],
            ch = pv && pv.w != null && w.w != null ? w.w - pv.w : null;
          return (
            "<tr><td>" +
            esc(fmt(w.k, { day: "numeric", month: "short" })) +
            '</td><td class="n">' +
            c(w.w, function (v) {
              return v.toFixed(1);
            }) +
            '</td><td class="n" style="color:' +
            (ch == null ? "inherit" : ch <= -0.2 ? "var(--good)" : ch > 0.2 ? "var(--bad)" : "var(--muted)") +
            '">' +
            c(ch, function (v) {
              return (v > 0 ? "+" : "") + v.toFixed(1);
            }) +
            '</td><td class="n">' +
            c(w.kcal, Z.nf) +
            '</td><td class="n">' +
            c(w.p, function (v) {
              return Z.r0(v) + " g";
            }) +
            '</td><td class="n">' +
            w.sess +
            '/6</td><td class="n">' +
            c(w.sleep, function (v) {
              return v.toFixed(1);
            }) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div></div>"
    );
  }

  /* ================= COACH ================= */
  function md2(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  }
  // A button attached to a coach answer.
  function actHtml(a) {
    if (a.href)
      return (
        '<a class="btn sm" href="' + esc(a.href) + '" target="_blank" rel="noopener">' + esc(a.l) + "</a>"
      );
    var at = ' data-act="' + esc(a.a) + '"';
    ["tab", "open", "id", "q"].forEach(function (k) {
      if (a[k] != null) at += " data-" + k + '="' + esc(a[k]) + '"';
    });
    return '<button class="btn sm" type="button"' + at + ">" + esc(a.l) + "</button>";
  }
  // One chat message.
  function msgHtml(m, isLast) {
    if (m.role === "user") return '<div class="msg u">' + esc(m.content) + "</div>";
    var h = '<div class="msg a">' + md2(m.content);
    if (m.src && m.src.length)
      h +=
        '<div class="srcs"><span>Sources</span>' +
        m.src
          .map(function (x) {
            return '<a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.t) + "</a>";
          })
          .join("") +
        "</div>";
    if (m.acts && m.acts.length) h += '<div class="macts">' + m.acts.map(actHtml).join("") + "</div>";
    if (V.canSpeak()) h += '<button class="lk say" type="button" data-act="saymsg">Listen</button>';
    h += "</div>";
    if (isLast && !busy && m.chips && m.chips.length)
      h +=
        '<div class="chips fu">' +
        m.chips
          .map(function (c) {
            return '<button class="chip" type="button" data-act="chip">' + esc(c) + "</button>";
          })
          .join("") +
        "</div>";
    return h;
  }
  // Coach: the chat.
  function cChat() {
    var chat = Z.S.chat,
      on = Coach.canWeb(),
      webOff = Z.S.set.web === false;
    var h =
      '<div class="card"><div class="lab"><span>Coach</span>' +
      (chat.length ? '<button type="button" data-act="clearchat">Clear chat</button>' : "") +
      "</div>" +
      '<div class="cst' +
      (on ? " on" : "") +
      '"><b></b><span>' +
      (on
        ? "Online. I use your log, the built-in guide and the web."
        : Z.Net.blocked
          ? "Web lookup works in the Android app, not in this preview. I use your log and the built-in guide."
          : webOff
            ? "Web lookup is off. I use your log and the built-in guide."
            : "Offline. I use your log and the built-in guide.") +
      "</span>" +
      (Z.Net.blocked
        ? "<i></i>"
        : '<button type="button" data-act="webtoggle">' +
          (webOff ? "Turn web on" : "Turn web off") +
          "</button>") +
      "</div>";
    if (!chat.length && pending == null)
      h +=
        '<div class="hello"><b class="nt">Ask me anything about your training, food or progress.</b><p class="sm mut">I read your log on this phone, so the answers are about you. Tap a question or type your own.</p></div>';
    h +=
      '<div class="chat" id="chat">' +
      chat
        .map(function (m, i) {
          return msgHtml(m, i === chat.length - 1);
        })
        .join("") +
      (pending != null ? '<div class="msg a pend" id="pend">' + esc(pending) + "</div>" : "") +
      "</div>" +
      '<div class="chips scroll" style="margin-top:12px">' +
      Coach.chips
        .map(function (c) {
          return '<button class="chip" type="button" data-act="chip">' + esc(c) + "</button>";
        })
        .join("") +
      "</div>" +
      '<div class="ask" style="margin-top:10px"><textarea class="in" id="ask" rows="1" placeholder="Ask your coach…" style="min-height:44px" aria-label="Your question"></textarea><button class="btn pri" type="button" data-act="send" aria-label="Send"' +
      (busy ? " disabled" : "") +
      ">" +
      IC.send +
      "</button></div>" +
      '<p class="xs mut" style="margin-top:8px">A training guide, not a doctor. For pain or a medical worry, see one.</p></div>';
    return h;
  }

  /* ================= Shared cards: readiness, next step, weekly review ================= */
  function partBars(parts, two) {
    return (
      '<div class="rparts' +
      (two ? " two" : "") +
      '">' +
      parts
        .map(function (p) {
          return (
            "<div><span>" +
            p[0] +
            '</span><div class="bar"><i style="width:' +
            pct(p[1], p[2]) +
            '%"></i></div></div>'
          );
        })
        .join("") +
      "</div>"
    );
  }
  // A button for an action object.
  function actBtn(a) {
    var at =
      a.act === "tab"
        ? ' data-act="tab" data-tab="' + a.arg + '"'
        : a.act === "log"
          ? ' data-act="logf" data-f="' + a.arg + '"'
          : a.act === "logplan"
            ? ' data-act="logplan" data-m="' + a.arg + '"'
            : a.act === "water"
              ? ' data-act="water" data-ml="' + a.arg + '"'
              : a.act === "system"
                ? ' data-act="system" data-open="' + a.arg + '"'
                : ' data-act="' + a.act + '"';
    return '<button class="btn pri" type="button"' + at + ">" + esc(a.btn) + "</button>";
  }
  // Today: the next step.
  function bNextAct() {
    var a = Z.nextAction(cur);
    if (!a) return "";
    return (
      '<div class="card nexta"><div><div class="eyeb">Next step</div><b class="nt">' +
      esc(a.title) +
      '</b><p class="sm mut">' +
      esc(a.text) +
      "</p></div>" +
      actBtn(a) +
      "</div>"
    );
  }
  // Today: readiness.
  function bReady() {
    var r = Z.readiness(cur),
      C = 2 * Math.PI * 26,
      off = C * (1 - r.score / 100);
    return (
      '<div class="card"><div class="lab"><span>Readiness</span><span class="plain">estimate from your log</span></div><div class="rdy"><svg viewBox="0 0 64 64" class="rdyr" role="img" aria-label="Readiness ' +
      r.score +
      ' out of 100"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--line2)" stroke-width="7"/><circle cx="32" cy="32" r="26" fill="none" stroke="' +
      (r.score >= 58 ? "var(--acc)" : "var(--warn)") +
      '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' +
      C.toFixed(1) +
      '" stroke-dashoffset="' +
      off.toFixed(1) +
      '" transform="rotate(-90 32 32)"/><text x="32" y="38" text-anchor="middle" font-size="19">' +
      r.score +
      '</text></svg><div><b class="nt">' +
      esc(r.label) +
      '</b><p class="sm mut">' +
      esc(r.tip) +
      "</p></div></div>" +
      partBars(r.parts) +
      "</div>"
    );
  }
  // Stats: weekly score.
  function sScore() {
    var r = Z.weekReview(),
      t = r.score.total,
      g = t >= 85 ? "A" : t >= 70 ? "B" : t >= 50 ? "C" : "D";
    return (
      '<div class="card"><div class="lab"><span>This week</span><span>Grade ' +
      g +
      '</span></div><div class="rdy"><div class="big num">' +
      t +
      "<small> / 100</small></div>" +
      partBars(r.score.parts, true) +
      '</div><p class="xs mut" style="margin-top:8px">Training 35, protein 25, sleep 20, steps 20. Resets every Monday.</p></div>'
    );
  }
  // Stats: suggested calorie target.
  function sAdapt() {
    var a = Z.adaptive(),
      p = Z.S.profile,
      h =
        '<div class="card"><div class="lab"><span>Your real calorie burn</span><span class="plain">measured from your log</span></div>';
    if (!a.ok) {
      var need = [];
      if (a.weigh) need.push(a.weigh + " more weigh-in" + (a.weigh > 1 ? "s" : ""));
      if (a.food) need.push(a.food + " more day" + (a.food > 1 ? "s" : "") + " with meals logged");
      if (!need.length) need.push("weigh-ins spread over two full weeks");
      return (
        h +
        '<p class="sm">Formulas guess what you burn. With four weeks of food and weight in the log, this card measures it and corrects your calorie target.</p><div class="rparts two" style="margin-top:10px"><div><span>Weigh-ins ' +
        (8 - a.weigh) +
        ' of 8</span><div class="bar"><i style="width:' +
        pct(8 - a.weigh, 8) +
        '%"></i></div></div><div><span>Food days ' +
        (10 - a.food) +
        ' of 10</span><div class="bar"><i style="width:' +
        pct(10 - a.food, 10) +
        '%"></i></div></div></div><p class="xs mut" style="margin-top:8px">Still needed: ' +
        need.join(" and ") +
        ".</p></div>"
      );
    }
    h +=
      '<div class="kpis"><div class="kpi"><small>You eat</small><b class="num">' +
      Z.nf(a.intake) +
      '</b></div><div class="kpi"><small>Weight per week</small><b class="num">' +
      (a.rate >= 0 ? "−" : "+") +
      Z.r1(Math.abs(a.rate)).toFixed(1) +
      '</b></div><div class="kpi"><small>You burn</small><b class="num">' +
      Z.nf(a.burn) +
      "</b></div></div>";
    h +=
      Math.abs(a.delta) < 80
        ? '<div class="okbox" style="margin-top:10px"><b>Your ' +
          Z.nf(p.kcal) +
          " kcal target fits.</b> Change nothing.</div>"
        : '<p class="sm" style="margin-top:10px">' +
          (Z.goalKind() === "lose"
            ? "To lose at your planned pace"
            : Z.goalKind() === "gain"
              ? "To gain at your planned pace"
              : "To hold your weight") +
          ", eat <b>" +
          Z.nf(a.target) +
          " kcal</b>: " +
          Z.nf(Math.abs(a.delta)) +
          (a.delta > 0 ? " more" : " less") +
          ' than your current target.</p><button class="btn pri wide" style="margin-top:8px" type="button" data-act="adaptapply">Use ' +
          Z.nf(a.target) +
          " kcal as my target</button>";
    return (
      h +
      '<p class="xs mut" style="margin-top:8px">From ' +
      a.days +
      " logged food days and " +
      a.weighs +
      " weigh-ins in the last 28 days. Unlogged snacks and oil make the burn look lower than it is.</p></div>"
    );
  }
  // Stats: sets per muscle this week.
  function sVol() {
    var v = Z.weekSets(cur),
      max = 24,
      any = v.some(function (x) {
        return x.sets > 0;
      });
    return (
      '<div class="card"><div class="lab"><span>Hard sets this week</span><span class="plain">shaded zone is 10 to 20</span></div>' +
      (any
        ? ""
        : '<p class="sm mut" style="margin-bottom:8px">Tick sets in Train and each muscle group fills in here.</p>') +
      v
        .map(function (x) {
          return (
            '<div class="vol"><span>' +
            x.n +
            '</span><div class="vbar"><i style="width:' +
            pct(x.sets, max) +
            '%"' +
            (x.sets >= 10 && x.sets <= 20 ? ' class="ok"' : "") +
            '></i></div><b class="num">' +
            (x.sets % 1 ? x.sets.toFixed(1) : x.sets) +
            "</b></div>"
          );
        })
        .join("") +
      '<p class="xs mut" style="margin-top:8px">Most muscle growth happens between 10 and 20 hard sets per muscle a week. An exercise counts fully for its main muscle and half for the helpers.</p></div>'
    );
  }
  // Stats: badges.
  function sBadges() {
    var b = Z.badges(),
      got = b.filter(function (x) {
        return x.hit;
      }).length;
    return (
      '<div class="card"><div class="lab"><span>Badges</span><span class="num">' +
      got +
      " of " +
      b.length +
      '</span></div><div class="bdg">' +
      b
        .map(function (x) {
          return (
            '<button type="button" class="' +
            (x.hit ? "hit" : "") +
            '" data-act="badge" data-d="' +
            esc(x.d + (x.hit ? ". Earned." : ": " + x.have + " of " + x.need)) +
            '"><i>' +
            (x.hit ? svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>') : "") +
            "</i><span>" +
            esc(x.n) +
            "</span>" +
            (x.hit ? "" : '<small class="num">' + x.have + " / " + x.need + "</small>") +
            "</button>"
          );
        })
        .join("") +
      "</div></div>"
    );
  }
  var bfOpen = false;
  // Body measurements over time.
  function bodyStats() {
    var S = Z.S,
      h = Z.bodyfat(),
      a = h.length ? h[h.length - 1] : null,
      f = h.length > 1 ? h[0] : null,
      out = "";
    if (a)
      out +=
        '<div class="kpis" style="margin-top:10px"><div class="kpi"><small>Body fat</small><b class="num">' +
        a.bf.toFixed(1) +
        '%</b></div><div class="kpi"><small>Fat mass</small><b class="num">' +
        a.fat.toFixed(1) +
        '</b></div><div class="kpi"><small>Lean mass</small><b class="num">' +
        a.lean.toFixed(1) +
        "</b></div></div>" +
        (f
          ? '<p class="sm" style="margin-top:8px">Since ' +
            esc(fmt(f.dt, { day: "numeric", month: "short" })) +
            ": fat " +
            (a.fat <= f.fat ? "down " : "up ") +
            Math.abs(a.fat - f.fat).toFixed(1) +
            " kg, lean mass " +
            (a.lean >= f.lean ? "up " : "down ") +
            Math.abs(a.lean - f.lean).toFixed(1) +
            " kg.</p>"
          : "") +
        '<p class="xs mut" style="margin-top:6px">Tape estimate (U.S. Navy formula), usually within 3 to 4 points. Watch the direction, not the decimal.</p>';
    else
      out +=
        '<p class="sm mut" style="margin-top:8px">Enter ' +
        (S.profile.sex === "f" ? "all three" : "both") +
        " and a body-fat estimate appears here.</p>";
    return (
      out +
      Object.keys(S.days)
        .filter(function (k) {
          return S.days[k].waist != null;
        })
        .sort()
        .slice(-5)
        .map(function (k) {
          return (
            '<div class="row sp sm" style="margin-top:6px"><span class="mut">' +
            esc(fmt(k, { day: "numeric", month: "short" })) +
            '</span><span class="num">waist ' +
            S.days[k].waist +
            " cm</span></div>"
          );
        })
        .join("")
    );
  }
  // Stats: body measurements.
  function bodyHtml() {
    var d = Z.gd(cur);
    function inp(f2, label, v) {
      return (
        '<label class="f">' +
        label +
        '<input class="in num" type="number" inputmode="decimal" step="0.5" min="20" max="200" placeholder="cm" value="' +
        (v == null ? "" : v) +
        '" data-chg="' +
        f2 +
        '"></label>'
      );
    }
    var out =
      '<details class="fold"' +
      (bfOpen ? " open" : "") +
      '><summary>Body measurements and body fat</summary><p class="xs mut" style="margin-bottom:8px">Every two weeks, in the morning. Waist at the navel, breathing out. Neck at its narrowest point.' +
      (Z.S.profile.sex === "f" ? " Hips at the widest point." : "") +
      " Saved for " +
      esc(fmt(cur, { day: "numeric", month: "short" })) +
      '.</p><div class="' +
      (Z.S.profile.sex === "f" ? "g3" : "g2") +
      '">' +
      inp("waist", "Waist (cm)", d.waist) +
      inp("neck", "Neck (cm)", d.neck) +
      (Z.S.profile.sex === "f" ? inp("hip", "Hips (cm)", d.hip) : "") +
      "</div>";
    return out + '<div id="bfout">' + bodyStats() + "</div></details></div>";
  }
  // Stats: personal bests.
  function sPR() {
    var pr = Z.prs(),
      ids = Object.keys(pr);
    if (!ids.length) return "";
    return (
      '<div class="card"><div class="lab"><span>Personal bests</span><span>' +
      ids.length +
      "</span></div>" +
      ids
        .map(function (id) {
          var b = pr[id],
            e = D.EX[id];
          return (
            '<div class="row sp sm prow"><span>' +
            esc(e.n) +
            '</span><span class="num mut">' +
            (b.w ? b.w + " kg × " : "") +
            b.r +
            (e.unit === "sec" ? " s" : "") +
            " · " +
            esc(fmt(b.dt, { day: "numeric", month: "short" })) +
            "</span></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  // Coach: week summary.
  function cWeek() {
    var r = Z.weekReview(),
      l = Z.insights(Z.today());
    return (
      '<div class="card"><div class="lab"><span>Your week</span><span>' +
      r.score.total +
      ' / 100</span></div><div class="tip"><b>Focus next.</b> ' +
      esc(r.focus) +
      '</div><details class="fold"><summary>Weekly review and ' +
      l.length +
      " note" +
      (l.length === 1 ? "" : "s") +
      '</summary><ul class="cl">' +
      r.lines
        .map(function (x) {
          return "<li><div>" + esc(x) + "</div></li>";
        })
        .join("") +
      '</ul><div style="margin-top:12px">' +
      (l.length ? insHtml(l) : '<p class="sm mut">Log a few days and my notes appear here.</p>') +
      "</div></details></div>"
    );
  }
  // Calories per meal.
  function mealBars() {
    var d = Z.gd(cur);
    if (!d.food.length) return "";
    return (
      '<div class="eyeb" style="margin-top:14px">Protein by meal · aim for 25–40 g at main meals</div><div class="pm">' +
      D.MEALS.map(function (m) {
        var g = 0;
        d.food.forEach(function (x) {
          if (x.m === m.id) g += x.p * x.q;
        });
        return (
          '<div><div class="pmb"><i style="height:' +
          pct(g, 45) +
          '%"' +
          (g >= 25 ? ' class="ok"' : "") +
          '></i></div><b class="num">' +
          Z.r0(g) +
          "</b><span>" +
          m.n.replace("Pre-workout", "Pre") +
          "</span></div>"
        );
      }).join("") +
      "</div>"
    );
  }
  // Recently logged foods.
  function recentHtml() {
    var r = Z.recentFoods(8);
    window.__szRecent = r;
    if (!r.length) return "";
    return (
      '<div><div class="eyeb" style="margin-bottom:6px">Recent · tap to add again</div><div class="chips">' +
      r
        .map(function (x, i) {
          return (
            '<button class="chip" type="button" data-act="pickrecent" data-i="' +
            i +
            '">' +
            x.q +
            " × " +
            esc(x.n.split(",")[0]) +
            "</button>"
          );
        })
        .join("") +
      "</div></div>"
    );
  }
  // Round a weight to the nearest 2.5 kg.
  function rnd(x) {
    return x >= 20 ? Math.round(x / 2.5) * 2.5 : Math.round(x);
  }
  // the meal whose time has most recently come round on this person's day
  function mealNow() {
    var c = Z.clock(),
      best = null,
      used = D.MEALS.filter(function (m) {
        return m.plan.length;
      });
    (used.length ? used : D.MEALS).forEach(function (m) {
      var t = c.since(Z.mealMin(m));
      if (t <= c.up + 60 && (!best || t > best[0])) best = [t, m.id];
    });
    return best ? best[1] : (used[0] || D.MEALS[0]).id;
  }
  // The quick-log menu.
  function quickSheet() {
    cur = Z.today();
    openSheet(
      "quick",
      "Quick log · today",
      tilesHtml(cur) +
        '<div class="g2"><button class="btn pri" type="button" data-act="qgo" data-to="food">Add food</button><button class="btn pri" type="button" data-act="qgo" data-to="train">Log training</button><button class="btn" type="button" data-act="qgo" data-to="coach">Ask the coach</button><button class="btn" type="button" data-act="calc">Calculator</button></div>'
    );
  }
  // First-launch welcome.
  function welcomeSheet() {
    var p = Z.S.profile,
      steps = [
        [
          "Morning",
          "Log your weight and sleep on Today. The Next step card always tells you what to do now."
        ],
        [
          "Training",
          "Open Train and start the guided session, or tick each set yourself. The rest timer starts by itself, and the app tells you when to add weight."
        ],
        [
          "Meals",
          "Open Food and tap Log plan, or just type what you ate: “2 chapati, dal and a bowl of curd”."
        ],
        ["Evening", "Log steps and water. Seven daily goals earn XP and keep your streak alive."],
        [
          "Any time",
          "Ask the coach. It reads your log, and when you are online it also looks things up on the web."
        ]
      ];
    openSheet(
      "welcome",
      "Welcome to ZENKAI",
      "<p>Zenkai (全開) is Japanese for full throttle. This is your tracker for <b>" +
        esc(
          Z.S.prog
            ? P.goalLine(Z.S.prog.t, Z.S.prog.a)
            : p.goalW < p.startW
              ? "getting from " + p.startW + " kg to " + p.goalW + " kg"
              : "getting fitter and stronger"
        ) +
        '</b>.</p><ol class="rules">' +
        steps
          .map(function (x) {
            return "<li><b>" + x[0] + ".</b> " + x[1] + "</li>";
          })
          .join("") +
        '</ol><div class="tip"><b>Fastest way to log anything:</b> the round + button, bottom right.</div><button class="btn pri wide" type="button" data-act="seen">Start</button><p class="xs mut">You can reopen this from Menu → How ZENKAI works.</p>'
    );
  }
  // Apply dark or light mode and text size.
  function applyMode() {
    var m = Z.S.set.mode === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-mode", m);
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute("content", m === "light" ? "#eef5fb" : "#0a0f16");
    document.documentElement.setAttribute("data-text", Z.S.set.text === "l" ? "l" : "m");
    document.documentElement.setAttribute("data-acc", Z.S.set.acc || "sky");
    try {
      if (Z.NATIVE && window.SZNative.setBars) window.SZNative.setBars(m === "light");
    } catch (e) {}
  }

  var VIEWS = {
    today: [
      ["setupc", bSetup],
      ["start", bStart],
      ["hero", bHero],
      ["nextact", bNextAct],
      ["quick", bQuick],
      ["quests", bQuests],
      ["ready", bReady],
      ["fuel", bFuel],
      ["sys", bSys],
      ["next", bNext]
    ],
    train: [
      ["thead", tHead],
      ["tweek", tWeek],
      ["tlearn", tLearn],
      ["twarm", tWarm],
      ["tlist", tList],
      ["tfz", tFz],
      ["tcool", tCool],
      ["tfin", tFin]
    ],
    food: [
      ["fsum", fSum],
      ["ftype", fType],
      ["fmeals", fMeals],
      ["fidea", fIdea],
      ["fwater", fWater],
      ["ftools", fTools]
    ],
    stats: [
      ["sscore", sScore],
      ["sweight", sWeight],
      ["sadapt", sAdapt],
      ["sgrid", sGrid],
      ["sbadges", sBadges],
      ["svol", sVol],
      ["sfuel", sFuel],
      ["srec", sRec],
      ["sstr", sStr],
      ["spr", sPR],
      ["sweeks", sWeeks]
    ],
    coach: [
      ["cweek", cWeek],
      ["cchat", cChat]
    ]
  };
  // Redraw the current tab.
  function render() {
    $("#view").innerHTML = VIEWS[tab]
      .map(function (b) {
        return '<section class="blk" id="b-' + b[0] + '">' + b[1]() + "</section>";
      })
      .join("");
    $$("#nav button").forEach(function (b) {
      if (b.dataset.tab === tab) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    $("#fab").hidden = tab === "coach";
    status();
    afterPaint();
  }
  // Work to do after a redraw.
  function afterPaint() {
    var n = $(".needle[data-to]");
    if (!n) return;
    var to = n.dataset.to;
    n.removeAttribute("data-to");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        n.style.transform = "rotate(" + to + "deg)";
      });
    });
  }
  var lastDone = null;
  // Show newly earned badges.
  function celebrate() {
    var td = Z.today(),
      dn = Z.doneCount(td),
      fresh = Z.newBadges();
    if (lastDone != null && dn === 7 && lastDone < 7) {
      toast("Zenkai. All seven goals done.");
      buzz([60, 40, 120]);
    } else if (fresh.length)
      toast(fresh.length === 1 ? "Badge earned: " + fresh[0].n : fresh.length + " badges earned. See Stats.");
    lastDone = dn;
  }
  // Redraw some cards in place.
  function repaint(ids) {
    ids.forEach(function (id) {
      var el = $("#b-" + id);
      if (!el) return;
      for (var i = 0; i < VIEWS[tab].length; i++)
        if (VIEWS[tab][i][0] === id) el.innerHTML = VIEWS[tab][i][1]();
    });
    afterPaint();
  }
  // Switch tab.
  function go(t, keepScroll) {
    tab = t;
    render();
    if (!keepScroll) $("#view").scrollTop = 0;
    try {
      if (location.hash !== "#" + t) history.replaceState(null, "", "#" + t);
    } catch (e) {}
    if (Z.NATIVE) {
      try {
        window.SZNative.keepAwake(t === "train");
      } catch (e) {}
    }
  }
  // The coach status in the header.
  function status() {
    var el = $("#netstat"),
      on = Coach.canWeb();
    el.className = "stat" + (on ? " on" : "") + (busy ? " busy" : "");
    el.lastElementChild.textContent = busy ? "Thinking" : aname() + (on ? " online" : " offline");
  }

  /* ---------- toast, sheet ---------- */
  var toastT = null;
  // A short message at the bottom.
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      t.hidden = true;
    }, 2600);
  }
  // Open the bottom sheet.
  function openSheet(kind, title, html) {
    if (kind !== "player") gsStop();
    if (V.busy() && kind !== sheetKind) V.stop();
    var sb = $("#sheet-say");
    if (sb) sb.hidden = !V.canSpeak() || kind === "player" || kind === "setup";
    sheetKind = kind;
    $("#sheet-t").textContent = title;
    $("#sheet-b").innerHTML = html;
    $("#sheet").hidden = false;
    $("#scrim").hidden = false;
    $("#sheet-b").scrollTop = 0;
  }
  // Close the bottom sheet.
  function closeSheet() {
    if (!sheetKind) return;
    gsStop();
    if (V.busy()) V.stop();
    if (sheetKind === "welcome" && !Z.S.set.seen) {
      Z.S.set.seen = true;
      Z.touchCore();
    }
    if (sheetKind === "setup") SU = null;
    sheetKind = null;
    $("#sheet").hidden = true;
    $("#scrim").hidden = true;
    $("#sheet-b").innerHTML = "";
    render();
  }

  // Exercise guide.
  function guideSheet(id) {
    var e = D.EX[id];
    function li(arr, o) {
      return (
        "<" +
        o +
        ">" +
        arr
          .map(function (s) {
            return "<li>" + esc(s) + "</li>";
          })
          .join("") +
        "</" +
        o +
        ">"
      );
    }
    openSheet(
      "guide",
      e.n,
      mediaHtml(id) +
        '<div class="row sp"><div><div class="big num" style="font-size:1.8rem">' +
        e.sets +
        " × " +
        Z.repTxt(e) +
        '</div><div class="sm mut">Rest ' +
        mmss(e.rest) +
        " · " +
        esc(e.t) +
        '</div></div><a class="btn sm" href="' +
        ytLink(e) +
        '" target="_blank" rel="noopener">More videos</a></div>' +
        '<div class="chips">' +
        (D.EXM[id] || [])
          .map(function (mid) {
            var mm = muscleById(mid);
            return mm
              ? '<button class="chip" type="button" data-act="muscle" data-id="' +
                  mid +
                  '">' +
                  esc(mm.n) +
                  "</button>"
              : "";
          })
          .join("") +
        "</div>" +
        '<dl class="guide" style="margin:0"><dt>Start position</dt><dd>' +
        esc(e.start) +
        "</dd><dt>Body posture</dt><dd>" +
        esc(e.posture) +
        "</dd><dt>How to do it</dt><dd>" +
        li(e.steps, "ol") +
        "</dd><dt>Breathing</dt><dd>" +
        esc(e.breath) +
        "</dd><dt>Common mistakes</dt><dd>" +
        li(e.mistakes, "ul") +
        "</dd><dt>Alternatives</dt><dd>" +
        esc(e.alt) +
        "</dd></dl>" +
        '<button class="btn sm" type="button" data-act="askc" data-q="How do I progress on ' +
        esc(e.n.toLowerCase()) +
        '?">Ask the coach about this exercise ›</button>' +
        '<p class="xs mut">Photos: Free Exercise DB (public domain). The form video plays from YouTube and needs internet.</p>'
    );
  }
  // The add-food sheet.
  function addFoodSheet(m) {
    sheetMeal = m;
    var meal = D.MEALS.filter(function (x) {
      return x.id === m;
    })[0];
    openSheet(
      "food",
      "Add to " + meal.n,
      '<input class="in" id="fq" type="search" placeholder="Search: egg, roti, paneer, biryani…" autocomplete="off" aria-label="Search foods">' +
        savedHtml() +
        recentHtml() +
        '<div id="flist">' +
        foodRows("") +
        "</div>" +
        '<details class="sec" id="sec-online"><summary>Search packaged foods online</summary><div><p class="xs mut">Type a product or brand name in the box above (or the barcode number printed under the bars), then tap Search. Needs internet.</p><button class="btn sm" type="button" data-act="foodonline" id="fo-btn">Search online</button><div id="fonline"></div></div></details>' +
        '<details class="sec"><summary>Add a custom food</summary><div><label class="f">Name<input class="in" id="cf-n" placeholder="e.g. Pintola high-protein oats"></label><label class="f">Serving<input class="in" id="cf-u" placeholder="e.g. 50 g"></label><div class="g3"><label class="f">kcal<input class="in num" id="cf-k" type="number" inputmode="decimal" min="0"></label><label class="f">Protein g<input class="in num" id="cf-p" type="number" inputmode="decimal" min="0"></label><label class="f">Carbs g<input class="in num" id="cf-c" type="number" inputmode="decimal" min="0"></label></div><div class="g2"><label class="f">Fat g<input class="in num" id="cf-f" type="number" inputmode="decimal" min="0"></label><label class="f">Fibre g<input class="in num" id="cf-fb" type="number" inputmode="decimal" min="0"></label></div><p class="xs mut">Copy the numbers for one serving from the pack label. It is saved to your food list.</p><button class="btn pri" type="button" data-act="customfood">Add food</button></div></details>'
    );
  }
  // rough prices in rupees for one unit of each food in the table; only used for the monthly estimate
  var PRICE = Z.P.COST,
    HOMEFOOD =
      /^(chapati|ragiroti|rice|dal|rajma|sabzi|salad|oil|poha|upma|bhakri|sambar|khichdi|idli|dosa|thepla|dalia|curdrice|besanchilla|moongchilla|potato)$/;
  // Monthly groceries from the menu.
  function budgetHtml() {
    var S = Z.S,
      items = {},
      total = 0,
      known = true;
    D.MEALS.forEach(function (m) {
      m.plan.forEach(function (it) {
        items[it[0]] = (items[it[0]] || 0) + it[1];
      });
    });
    var rows = Object.keys(items)
      .map(function (id) {
        var f = Z.foodById(id),
          q = items[id] * 30,
          m = /^(\d+(?:\.\d+)?) (g|ml)\b/.exec(f.u),
          cost = PRICE[id] != null ? items[id] * 30 * PRICE[id] : null;
        var amt = m
          ? +m[1] * q >= 1000
            ? Z.r1((+m[1] * q) / 1000) + (m[2] === "g" ? " kg" : " L")
            : Z.r0(+m[1] * q) + " " + m[2]
          : Z.r0(q) + " × " + esc(f.u.replace(/^1 /, ""));
        if (cost == null) known = false;
        else if (!S.set.home || !HOMEFOOD.test(id)) total += cost;
        return (
          "<tr><td>" +
          esc(f.n.split(/[,(]/)[0]) +
          '</td><td class="n">' +
          amt +
          '</td><td class="n">' +
          (cost == null ? "–" : S.set.home && HOMEFOOD.test(id) ? "home" : "₹" + Z.nf(cost)) +
          "</td></tr>"
        );
      })
      .join("");
    var cap = S.prog && P.BUDCAP[S.prog.a.bud];
    return (
      '<p class="sm">What a month of the dishes you picked adds up to. Cooked dishes are counted as servings.</p><div class="big num">≈ ₹' +
      Z.nf(Math.round(total / 50) * 50) +
      " <small>/ month</small></div>" +
      (cap && total > cap * 1.05 && !S.set.home
        ? '<p class="sm">Above your budget of ₹' +
          Z.nf(cap) +
          ". Swap chicken, fish or paneer dishes on the Food tab for the soya, dal, egg or chana ones.</p>"
        : "") +
      '<label class="row sm"><input type="checkbox" data-chg="home"' +
      (S.set.home ? " checked" : "") +
      '> The family kitchen already covers roti, rice, dal, vegetables and oil</label><div class="tw"><table><thead><tr><th>Food</th><th class="n">Per month</th><th class="n">Cost</th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div><p class="xs mut">Costs use rough Indian prices and are only a guide' +
      (known ? "" : "; items marked – are not priced") +
      ". Yours will differ by city and season.</p>"
    );
  }
  // The menu: settings and guides.
  function systemSheet(open) {
    var S = Z.S,
      p = S.profile,
      pt = Z.planTotals();
    function sec(id, title, body) {
      return (
        '<details class="sec" id="sec-' +
        id +
        '"' +
        (open === id ? " open" : "") +
        "><summary>" +
        title +
        "</summary><div>" +
        body +
        "</div></details>"
      );
    }
    function pf(label, f, step) {
      return (
        '<label class="f">' +
        label +
        '<input class="in num" type="number" inputmode="decimal" step="' +
        (step || 1) +
        '" value="' +
        p[f] +
        '" data-chg="prof" data-f="' +
        f +
        '"></label>'
      );
    }
    var plan = D.MEALS.map(function (m) {
      return (
        '<tr><td colspan="3" style="font-family:var(--fd);font-weight:700;font-size:1.02rem;color:var(--acc-t)">' +
        m.n +
        ", " +
        m.t +
        "</td></tr>" +
        m.plan
          .map(function (it) {
            var f = Z.foodById(it[0]);
            return (
              "<tr><td>" +
              esc(f.n) +
              "<br><span class='xs mut'>" +
              it[1] +
              " × " +
              esc(f.u) +
              '</span></td><td class="n">' +
              Z.r0(f.k * it[1]) +
              '</td><td class="n">' +
              Z.r1(f.p * it[1]) +
              " g</td></tr>"
            );
          })
          .join("")
      );
    }).join("");
    var lib = Object.keys(D.SPLIT)
      .filter(function (k) {
        return !Z.restK(k);
      })
      .map(function (k) {
        return (
          '<div class="sm mut" style="margin-top:6px">' +
          D.SPLIT[k].name +
          ", " +
          D.SPLIT[k].focus.toLowerCase() +
          '</div><div class="chips">' +
          D.SPLIT[k].ex
            .map(function (id) {
              return (
                '<button class="chip" type="button" data-act="guide" data-id="' +
                id +
                '">' +
                esc(D.EX[id].n) +
                "</button>"
              );
            })
            .join("") +
          "</div>"
        );
      })
      .join("");
    openSheet(
      "system",
      "Menu",
      '<button class="btn pri wide" type="button" data-act="' +
        (S.prog ? "myplan" : "setup") +
        '">' +
        (S.prog ? "My plan and personal setup" : "Personal setup: build my plan") +
        '</button><div class="g2"><button class="btn sm" type="button" data-act="calc">Nutrition calculator</button><button class="btn sm" type="button" data-act="atlas">Muscle guide</button></div>' +
        sec(
          "look",
          "Display and sound",
          '<div class="sm mut">Theme</div><div class="seg" style="grid-template-columns:1fr 1fr"><button type="button" class="' +
            (S.set.mode !== "light" ? "on" : "") +
            '" data-act="mode" data-v="dark">Dark</button><button type="button" class="' +
            (S.set.mode === "light" ? "on" : "") +
            '" data-act="mode" data-v="light">Light</button></div>' +
            '<div class="sm mut">Accent colour</div><div class="accs">' +
            [
              ["sky", "Sky"],
              ["teal", "Teal"],
              ["violet", "Violet"],
              ["rose", "Rose"],
              ["gold", "Gold"]
            ]
              .map(function (a) {
                return (
                  '<button type="button" class="ac-' +
                  a[0] +
                  ((S.set.acc || "sky") === a[0] ? " on" : "") +
                  '" data-act="accent" data-v="' +
                  a[0] +
                  '" aria-label="' +
                  a[1] +
                  '"><i></i><span>' +
                  a[1] +
                  "</span></button>"
                );
              })
              .join("") +
            "</div>" +
            '<div class="sm mut">Text size</div><div class="seg" style="grid-template-columns:1fr 1fr"><button type="button" class="' +
            (S.set.text !== "l" ? "on" : "") +
            '" data-act="textsize" data-v="m">Normal</button><button type="button" class="' +
            (S.set.text === "l" ? "on" : "") +
            '" data-act="textsize" data-v="l">Large</button></div>' +
            '<div class="sm mut">Rest-timer beep</div><div class="seg" style="grid-template-columns:1fr 1fr"><button type="button" class="' +
            (S.set.sound !== false ? "on" : "") +
            '" data-act="sound" data-v="1">On</button><button type="button" class="' +
            (S.set.sound === false ? "on" : "") +
            '" data-act="sound" data-v="0">Off</button></div>'
        ) +
        sec("rem", "Reminders", '<div id="remlist" style="display:grid;gap:10px">' + remHtml() + "</div>") +
        sec("voice", "Voice and assistant", voiceSec()) +
        sec(
          "coach",
          "Coach and web lookup",
          '<p class="sm">The coach answers from three places: your log on this phone, the built-in training and nutrition guide, and live lookups on the web.</p><div class="seg" style="grid-template-columns:1fr 1fr"><button type="button" class="' +
            (S.set.web !== false ? "on" : "") +
            '" data-act="webset" data-v="1">Web lookup on</button><button type="button" class="' +
            (S.set.web === false ? "on" : "") +
            '" data-act="webset" data-v="0">Off</button></div><ul class="cl"><li><div><b>What is sent</b><small>Only the key words of your question, to Wikipedia, MedlinePlus (U.S. National Library of Medicine) or Open Food Facts. Your log, weight and name never leave the phone.</small></div></li><li><div><b>What it is not</b><small>Not a doctor. It quotes its sources so you can check them, and it tells you when a problem needs a medical opinion.</small></div></li></ul>'
        ) +
        sec(
          "help",
          "How ZENKAI works",
          '<p class="sm">Five habits, about three minutes a day in total.</p><button class="btn sm" type="button" data-act="welcome">Show the quick guide</button><ul class="cl"><li><div><b>XP and levels</b><small>Seven daily goals are worth 140 XP. Every 500 XP is a level. Four or more goals in a day keeps your streak.</small></div></li><li><div><b>Readiness</b><small>A 0–100 estimate from sleep, yesterday\'s food and energy. It tells you whether to push, train as planned, or go lighter.</small></div></li><li><div><b>Weekly score</b><small>Training 35, protein 25, sleep 20, steps 20. Resets every Monday.</small></div></li><li><div><b>EST tag on food</b><small>An item logged as a rough estimate. Treat its numbers as approximate.</small></div></li></ul>'
        ) +
        sec(
          "prof",
          "Profile and targets",
          '<div class="g2">' +
            pf("Start weight kg", "startW", 0.1) +
            pf("Goal weight kg", "goalW", 0.1) +
            pf("Calories", "kcal", 10) +
            pf("Protein g", "protein") +
            pf("Carbs g", "carbs") +
            pf("Fat g", "fat") +
            pf("Fibre g", "fibre") +
            pf("Water ml", "water", 50) +
            pf("Steps", "steps", 500) +
            pf("Sleep h", "sleep", 0.5) +
            '</div><label class="f">Day 0 (start date)<input class="in" type="date" value="' +
            p.start +
            '" data-chg="prof" data-f="start"></label><p class="xs mut">' +
            (S.prog
              ? esc(S.prog.t.why.join(" ")) +
                " These are estimates; your weekly average weight is the real check. To rebuild everything from new answers, use Personal setup at the top of this menu."
              : "These numbers are placeholders until you run Personal setup at the top of this menu. It works them out from your body, activity and goal.") +
            "</p>"
        ) +
        sec(
          "backup",
          "Backup and restore",
          '<p class="sm">Everything is saved on this device only. Export a backup now and then.</p><div class="row" style="flex-wrap:wrap"><button class="btn sm" type="button" data-act="export">Export backup</button><button class="btn sm" type="button" data-act="import">Import backup</button><button class="btn sm" type="button" data-act="exportcsv">Export spreadsheet</button><button class="btn sm" type="button" data-act="copyreport">Copy report</button></div><p class="xs mut">' +
            (S.set.lastBackup
              ? "Last backup: " +
                esc(fmt(S.set.lastBackup, { day: "numeric", month: "short", year: "numeric" })) +
                ". "
              : "No backup yet. ") +
            "A backup is one file with your whole log (the coach chat is left out). Import replaces what is on this device. The spreadsheet is one row per day, for Excel or Google Sheets. Copy report gives a 14-day text summary you can send to a doctor, physio or trainer.</p>"
        ) +
        sec(
          "planx",
          "Training plan",
          '<p class="sm">' +
            (S.prog
              ? "Your plan was built from your setup answers. The two ready-made plans run Monday to Saturday with Sunday off."
              : "Both ready-made plans run Monday to Saturday with Sunday off. Personal setup builds one around your own days.") +
            " Changing plan keeps every past session as it was logged.</p>" +
            (S.prog
              ? '<button type="button" class="plan' +
                (S.set.plan === "custom" ? " on" : "") +
                '" data-act="setplan" data-v="custom"><b>My plan' +
                (S.set.plan === "custom" ? " <i>current</i>" : "") +
                "</b><span>" +
                esc(S.prog.info.why) +
                "</span><small>" +
                S.prog.a.days
                  .map(function (k) {
                    return S.prog.split[k].focus;
                  })
                  .join(" / ") +
                "</small></button>"
              : "") +
            D.PLAN_INFO.map(function (pi) {
              var on = (S.set.plan || "shape") === pi[0],
                pl = D.PLANS[pi[0]];
              return (
                '<button type="button" class="plan' +
                (on ? " on" : "") +
                '" data-act="setplan" data-v="' +
                pi[0] +
                '"><b>' +
                pi[1] +
                (on ? " <i>current</i>" : "") +
                "</b><span>" +
                pi[2] +
                "</span><small>" +
                ["mon", "tue", "wed", "thu", "fri", "sat"]
                  .map(function (k) {
                    return pl[k].focus;
                  })
                  .join(" / ") +
                "</small></button>"
              );
            }).join("")
        ) +
        sec(
          "tt",
          "Daily timetable",
          '<div class="tip">' +
            (S.prog
              ? "<b>" +
                S.prog.hours +
                " hours of sleep.</b> Lights out at " +
                P.t12(S.prog.a.bed) +
                ", alarm at " +
                P.t12(S.prog.a.wake) +
                ". Change the times in Personal setup."
              : "<b>Seven hours.</b> Lights out at 10 PM, alarm at 5 AM. Run Personal setup to build this around your own day.") +
            '</div><ul class="tt">' +
            D.TIMETABLE.map(function (r) {
              return (
                "<li" +
                (r[3] ? ' class="gym"' : "") +
                "><time>" +
                t12(r[0]) +
                "</time><div><b>" +
                esc(r[1]) +
                "</b><small>" +
                esc(r[2]) +
                "</small></div></li>"
              );
            }).join("") +
            "</ul>"
        ) +
        sec(
          "plan",
          "Diet plan",
          '<p class="sm">One day of your menu: <b>' +
            Z.nf(pt.k) +
            " kcal · " +
            Z.r0(pt.p) +
            " g protein</b> · " +
            Z.r0(pt.c) +
            " g carbs · " +
            Z.r0(pt.f) +
            " g fat · " +
            Z.r0(pt.fb) +
            ' g fibre. Weights are raw or dry unless stated. Values are estimates.</p><div class="tw"><table><thead><tr><th>Food</th><th class="n">kcal</th><th class="n">Protein</th></tr></thead><tbody>' +
            plan +
            '</tbody></table></div><p class="sm"><b>Cravings:</b> eat your snack on time; swap chips for roasted makhana, roasted chana or home-popped popcorn; if you want the real thing, put one small pack on a plate, never eat from a big bag. One or two planned treats a week are fine: log them and move on.</p>'
        ) +
        sec(
          "bud",
          "Monthly groceries",
          '<div id="bud" style="display:grid;gap:10px">' + budgetHtml() + "</div>"
        ) +
        sec(
          "mic",
          "Vitamins and minerals",
          '<div class="tw"><table><thead><tr><th>Nutrient</th><th>Cheap sources</th><th>Notes</th></tr></thead><tbody>' +
            D.MICROS.map(function (r) {
              return (
                "<tr><td><b>" +
                esc(r[0]) +
                "</b></td><td>" +
                esc(r[1]) +
                "</td><td>" +
                esc(r[2]) +
                "</td></tr>"
              );
            }).join("") +
            "</tbody></table></div>"
        ) +
        sec("lib", "Exercise library", lib) +
        sec(
          "src",
          "Sources and credits",
          '<p class="sm">Every number and rule in your plan comes from the published research below, gathered from the web and checked against the original papers and guidelines. Nothing is made up by the app; your plan screen shows which source each rule comes from.</p>' +
            D.SOURCES.map(function (r) {
              return (
                '<p class="sm"><b>' +
                esc(r[0]) +
                ".</b> " +
                esc(r[1]) +
                (r[2] ? ' <a href="' + r[2] + '" target="_blank" rel="noopener">Open source ›</a>' : "") +
                "</p>"
              );
            }).join("") +
            '<p class="xs mut">Food values are estimates from standard food tables. Fonts: Barlow Condensed by Jeremy Tribby, Dela Gothic One by artakana, Hind by Indian Type Foundry (all SIL Open Font License).</p>'
        ) +
        sec(
          "reset",
          "Reset",
          '<p class="sm">Erase every log and your plan on this device and start again from the setup questions. Export a backup first if you might want it.</p><button class="btn sm" type="button" data-act="reset" style="border-color:var(--bad);color:var(--bad)">Erase all data</button>'
        ) +
        '<p class="about"><b>' +
        esc(D.APP.name) +
        "</b> " +
        esc(D.APP.ver) +
        "<br>Designed and built by " +
        esc(D.APP.by) +
        "<br><span>Zenkai (全開) is Japanese for full throttle.</span></p>"
    );
    if (open) {
      var el = $("#sec-" + open);
      if (el) el.scrollIntoView();
    }
  }

  /* ---------- reminders ---------- */
  function canRemind() {
    return !!(Z.NATIVE && window.SZNative.setReminders);
  }
  // Send the reminders to the phone.
  function syncReminders() {
    if (!canRemind()) return;
    try {
      window.SZNative.setReminders(
        JSON.stringify(
          Z.reminders()
            .filter(function (r) {
              return r.on;
            })
            .map(function (r) {
              var a = r.t.split(":");
              return { id: r.id, h: +a[0], m: +a[1], title: r.title, text: r.text };
            })
        )
      );
    } catch (e) {}
  }
  // The reminders list.
  function remHtml() {
    if (!canRemind())
      return '<p class="sm">Reminders are phone notifications, so they work in the Android app. Install ZENKAI on your phone to use them.</p>';
    var ok = true;
    try {
      ok = window.SZNative.canNotify();
    } catch (e) {}
    var L = Z.reminders(),
      on = L.filter(function (r) {
        return r.on;
      }).length;
    return (
      (ok
        ? ""
        : '<div class="warnbox" style="margin-top:0"><b>Notifications are blocked for ZENKAI.</b> Allow them and your reminders can show.<div style="margin-top:8px"><button class="btn sm" type="button" data-act="asknotify">Allow notifications</button></div></div>') +
      '<p class="sm mut">' +
      (on ? on + " on. " : "") +
      "Your phone shows these even when the app is closed. Times can be a few minutes late when the phone is saving battery.</p>" +
      L.map(function (r) {
        return (
          '<div class="rem' +
          (r.on ? " on" : "") +
          '"><div><b>' +
          esc(r.title) +
          "</b><small>" +
          esc(r.text) +
          '</small></div><input class="in num" type="time" value="' +
          r.t +
          '" data-chg="remt" data-id="' +
          r.id +
          '" aria-label="Time for ' +
          esc(r.title) +
          '"><label class="sw"><input type="checkbox" data-chg="remon" data-id="' +
          r.id +
          '"' +
          (r.on ? " checked" : "") +
          ' aria-label="' +
          esc(r.title) +
          ' reminder"><i></i></label></div>'
        );
      }).join("") +
      '<button class="btn sm" type="button" data-act="testnotify">Send a test notification</button>'
    );
  }

  /* ---------- muscle guide ---------- */
  function muscleById(id) {
    for (var i = 0; i < D.MUSCLES.length; i++) if (D.MUSCLES[i].id === id) return D.MUSCLES[i];
    return null;
  }
  // A plain list.
  function ulist(a) {
    return (
      "<ul>" +
      a
        .map(function (x) {
          return "<li>" + esc(x) + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }
  // The muscle and injury guide.
  function atlasSheet() {
    openSheet(
      "atlas",
      "Muscle guide",
      '<p class="sm mut">Tap a muscle on the body, or pick one from the list, to see what it does, how it gets hurt and how to protect it.</p>' +
        '<div style="max-width:300px;width:100%;margin:0 auto">' +
        bodyMap([], true) +
        "</div>" +
        '<div class="chips">' +
        D.MUSCLES.map(function (m) {
          return (
            '<button class="chip" type="button" data-act="muscle" data-id="' +
            m.id +
            '">' +
            esc(m.n) +
            "</button>"
          );
        }).join("") +
        "</div>" +
        '<details class="sec" open><summary>12 rules to train for decades</summary><div><ol class="rules">' +
        D.RULES.map(function (r) {
          return "<li><b>" + esc(r[0]) + ".</b> " + esc(r[1]) + "</li>";
        }).join("") +
        "</ol></div></details>" +
        '<details class="sec"><summary>Normal soreness or injury?</summary><div><div class="okbox"><b>Normal: keep training</b>' +
        ulist(D.PAIN.ok) +
        '</div><div class="alert"><b>Stop and get it checked</b>' +
        ulist(D.PAIN.stop) +
        '</div><p class="sm">' +
        esc(D.PAIN.aid) +
        "</p></div></details>" +
        '<details class="sec"><summary>Joint rules</summary><div><ul class="cl">' +
        D.JOINTS.map(function (r) {
          return "<li><div><b>" + esc(r[0]) + "</b><small>" + esc(r[1]) + "</small></div></li>";
        }).join("") +
        "</ul></div></details>" +
        '<p class="xs mut">General education to help you train safely. It cannot examine you: for pain that fits a warning sign, see a doctor or physiotherapist.</p>'
    );
  }
  // One muscle in the guide.
  function muscleSheet(id) {
    var m = muscleById(id);
    if (!m) return;
    var by = Object.keys(D.EXM).filter(function (e) {
      return D.EXM[e].indexOf(id) > -1;
    });
    openSheet(
      "muscle",
      m.n,
      '<button class="btn sm" type="button" data-act="atlas" style="justify-self:start">' +
        IC.left +
        " All muscles</button>" +
        '<div style="max-width:220px;width:100%;margin:0 auto">' +
        bodyMap(HL[id] || [id]) +
        '</div><p class="xs mut" style="text-align:center">' +
        esc(m.sci) +
        "</p>" +
        (m.you ? '<div class="warnbox"><b>For you.</b> ' + esc(m.you) + "</div>" : "") +
        '<dl class="guide" style="margin:0"><dt>What it does</dt><dd>' +
        esc(m.job) +
        "</dd><dt>Trained in your plan by</dt><dd>" +
        (by.length
          ? '<div class="chips">' +
            by
              .map(function (e) {
                return (
                  '<button class="chip" type="button" data-act="guide" data-id="' +
                  e +
                  '">' +
                  esc(D.EX[e].n) +
                  "</button>"
                );
              })
              .join("") +
            "</div>"
          : "No direct exercise in this plan" + (id === "quads" ? " yet." : ".")) +
        "</dd><dt>How it gets hurt</dt><dd>" +
        esc(m.hurt) +
        "</dd><dt>Protect it</dt><dd>" +
        ulist(m.protect) +
        "</dd><dt>Recovery</dt><dd>" +
        esc(m.rec) +
        '</dd></dl><div class="alert"><b>Warning signs.</b> ' +
        esc(m.warn) +
        '</div><button class="btn sm" type="button" data-act="askc" data-q="My ' +
        esc(m.n.split(":")[0].toLowerCase()) +
        ' hurts. Is it soreness or an injury?">Ask the coach about pain here ›</button>'
    );
  }

  /* ---------- nutrition calculator ---------- */
  function calcOut() {
    function v(id) {
      var e = $("#" + id);
      return e ? Z.num(e.value) : null;
    }
    var w = v("c-w"),
      h = v("c-h"),
      age = v("c-age"),
      sex = $("#c-sex").value,
      act = +$("#c-act").value,
      rate = v("c-rate") || 0,
      ppk = v("c-ppk") || 1.6,
      fpk = v("c-fpk") || 0.8;
    $("#c-rate-t").textContent =
      Math.abs(rate) < 0.01
        ? "hold weight"
        : (rate > 0 ? "lose " : "gain ") + Math.abs(rate).toFixed(2) + " kg per week";
    if (!w || !h || !age) return '<p class="sm mut">Enter weight, height and age.</p>';
    var bmr = 10 * w + 6.25 * h - 5 * age + (sex === "f" ? -161 : 5),
      tdee = bmr * act,
      def = (rate * 7700) / 7,
      raw = tdee - def,
      floor = Math.max(bmr, sex === "f" ? 1200 : 1500);
    var kcal = Math.round((rate > 0 ? Math.max(raw, floor) : raw) / 10) * 10,
      p = Math.round(ppk * w),
      f = Math.round(fpk * w),
      c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4)),
      fb = Math.round((14 * kcal) / 1000),
      water = Math.round((35 * w) / 250) * 250;
    var h2 = Math.pow(h / 100, 2),
      bmi = w / h2,
      goal = Z.S.profile.goalW,
      wks = (rate > 0 && w > goal) || (rate < 0 && w < goal) ? Math.round((w - goal) / rate) : null;
    window.__szCalc = {
      kcal: kcal,
      protein: p,
      carbs: c,
      fat: f,
      fibre: fb,
      water: water,
      calcW: w,
      height: h,
      age: age
    };
    function mac(n, g, k) {
      return (
        "<div><span>" +
        n +
        '</span><b class="num">' +
        g +
        " g</b><span>" +
        Math.round(((g * k) / kcal) * 100) +
        "% of kcal</span></div>"
      );
    }
    var warn = "";
    if (rate > 0 && raw < floor)
      warn +=
        '<div class="alert"><b>Too fast.</b> That pace needs fewer calories than your body burns at rest. The result is held at ' +
        Z.nf(kcal) +
        " kcal. Pick a slower pace.</div>";
    else if (rate > w * 0.01)
      warn +=
        '<div class="alert"><b>Aggressive.</b> More than 1% of body weight a week raises the risk of losing muscle and feeling weak in the gym.</div>';
    if (c < 130)
      warn +=
        '<div class="warnbox"><b>Low carbs.</b> Under about 130 g a day, gym performance usually drops. Lower the fat or protein figure a little, or slow the pace.</div>';
    if (fpk < 0.6)
      warn +=
        '<div class="warnbox"><b>Low fat.</b> Below about 0.6 g per kg, hormone health can suffer over time.</div>';
    return (
      '<div class="kpis"><div class="kpi"><small>Resting burn</small><b class="num">' +
      Z.nf(bmr) +
      '</b></div><div class="kpi"><small>Daily burn</small><b class="num">' +
      Z.nf(tdee) +
      '</b></div><div class="kpi"><small>' +
      (kcal > tdee + 5 ? "Daily surplus" : "Daily deficit") +
      '</small><b class="num">' +
      Z.nf(Math.abs(tdee - kcal)) +
      "</b></div></div>" +
      '<div class="big num" style="margin-top:4px">' +
      Z.nf(kcal) +
      ' <small>kcal a day</small></div><div class="mac" style="margin-top:0">' +
      mac("Protein", p, 4) +
      mac("Carbs", c, 4) +
      mac("Fat", f, 9) +
      '<div><span>Fibre</span><b class="num">' +
      fb +
      " g</b><span>minimum</span></div></div>" +
      warn +
      '<p class="sm">Water: about <b>' +
      Z.r1(water / 1000) +
      " L</b> a day, more in hot weather. BMI " +
      bmi.toFixed(1) +
      "; the healthy range for " +
      h +
      " cm is " +
      Math.round(18.5 * h2) +
      "–" +
      Math.round(24.9 * h2) +
      " kg." +
      (wks ? " At this pace, " + goal + " kg is about <b>" + wks + " weeks</b> away." : "") +
      "</p>" +
      '<button class="btn pri wide" type="button" data-act="calcapply">Use these as my daily targets</button>' +
      '<p class="xs mut">How it is worked out: resting burn from the Mifflin–St Jeor equation, times your activity level; about 7,700 kcal for each kg of body fat; fibre 14 g per 1,000 kcal; water about 35 ml per kg. These are estimates. Your weekly average weight is the real check, so recalculate every 4–5 kg of change.</p>'
    );
  }
  // Portion calculator output.
  function portionOut() {
    var f = Z.foodById($("#pc-f").value),
      q = Z.num($("#pc-q").value) || 0;
    if (!f) return "";
    return (
      '<p class="sm mut">' +
      q +
      " × " +
      esc(f.u) +
      '</p><div class="kpis"><div class="kpi"><small>Calories</small><b class="num">' +
      Z.r0(f.k * q) +
      '</b></div><div class="kpi"><small>Protein</small><b class="num">' +
      Z.r1(f.p * q) +
      ' g</b></div><div class="kpi"><small>Carbs</small><b class="num">' +
      Z.r1(f.c * q) +
      ' g</b></div><div class="kpi"><small>Fat</small><b class="num">' +
      Z.r1(f.f * q) +
      ' g</b></div><div class="kpi"><small>Fibre</small><b class="num">' +
      Z.r1(f.fb * q) +
      ' g</b></div><div class="kpi"><small>Protein per 100 kcal</small><b class="num">' +
      (f.k ? Z.r1((f.p / f.k) * 100) : 0) +
      " g</b></div></div>"
    );
  }
  // The portion calculator.
  function calcSheet() {
    var S0 = Z.S,
      p = S0.profile,
      tr = Z.trend(),
      w = tr.last != null ? Z.r1(tr.last) : p.startW;
    var acts = [
      [1.2, "Desk job, no exercise"],
      [1.375, "Light: 1–3 workouts a week"],
      [1.55, "Moderate: 4–6 workouts a week"],
      [1.725, "Very active: physical job + training"]
    ];
    var pf = S0.prog ? S0.prog.t.factor : 1.55,
      near = acts.slice().sort(function (x, y) {
        return Math.abs(x[0] - pf) - Math.abs(y[0] - pf);
      })[0][0],
      pace0 = S0.prog ? Math.max(-0.5, Math.min(1, -S0.prog.t.weekly)) : 0.5;
    openSheet(
      "calc",
      "Nutrition calculator",
      '<div class="g3"><label class="f">Weight kg<input class="in num" id="c-w" type="number" inputmode="decimal" step="0.1" value="' +
        w +
        '"></label><label class="f">Height cm<input class="in num" id="c-h" type="number" inputmode="decimal" value="' +
        p.height +
        '"></label><label class="f">Age<input class="in num" id="c-age" type="number" inputmode="numeric" value="' +
        p.age +
        '"></label></div>' +
        '<div class="g2"><label class="f">Sex<select class="in" id="c-sex"><option value="m">Male</option><option value="f"' +
        (p.sex === "f" ? " selected" : "") +
        '>Female</option></select></label><label class="f">Activity<select class="in" id="c-act">' +
        acts
          .map(function (a) {
            return (
              '<option value="' + a[0] + '"' + (a[0] === near ? " selected" : "") + ">" + a[1] + "</option>"
            );
          })
          .join("") +
        "</select></label></div>" +
        '<label class="f">Pace: <b style="color:var(--ink)"><span id="c-rate-t"></span></b><input id="c-rate" type="range" min="-0.5" max="1" step="0.05" value="' +
        Math.round(pace0 * 20) / 20 +
        '"></label><p class="xs mut" style="margin-top:-6px">Right of zero loses weight, left of zero gains.</p>' +
        '<div class="g2"><label class="f">Protein, g per kg<input class="in num" id="c-ppk" type="number" inputmode="decimal" step="0.1" min="1" max="2.4" value="1.6"></label><label class="f">Fat, g per kg<input class="in num" id="c-fpk" type="number" inputmode="decimal" step="0.1" min="0.4" max="1.2" value="0.8"></label></div>' +
        '<div id="calc-out" style="display:grid;gap:10px"></div>' +
        '<details class="sec"><summary>Food portion calculator</summary><div><label class="f">Food<select class="in" id="pc-f">' +
        Z.allFoods()
          .map(function (f) {
            return '<option value="' + f.id + '">' + esc(f.n) + " · " + esc(f.u) + "</option>";
          })
          .join("") +
        '</select></label><label class="f">How many servings<input class="in num" id="pc-q" type="number" inputmode="decimal" step="0.25" min="0" value="1"></label><div id="pc-out" style="display:grid;gap:8px"></div><p class="xs mut">Protein per 100 kcal shows how lean a protein source is: above 10 g is very good for fat loss.</p></div></details>'
    );
    $("#calc-out").innerHTML = calcOut();
    $("#pc-out").innerHTML = portionOut();
  }

  /* ---------- rest timer ---------- */
  var T = { end: 0, total: 0, iv: null };
  // Rest timer tick.
  function tick() {
    var left = Math.max(0, T.end - Date.now());
    $("#tm").textContent = mmss(Math.ceil(left / 1000));
    $("#tmb").style.width = pct(left, T.total * 1000) + "%";
    if (left <= 0) stopRest(true);
  }
  // Start the rest timer.
  function startRest(sec, label, kind) {
    T.kind = kind || "REST";
    T.total = sec;
    T.end = Date.now() + sec * 1000;
    $("#tmk").textContent = T.kind;
    $("#tml").textContent = label;
    $("#timer").hidden = false;
    clearInterval(T.iv);
    T.iv = setInterval(tick, 250);
    tick();
  }
  // Stop the rest timer.
  function stopRest(done) {
    clearInterval(T.iv);
    T.iv = null;
    $("#timer").hidden = true;
    if (done) {
      buzz([180, 90, 180]);
      beep();
      if (T.kind === "CARDIO") {
        var w = Z.mwo(Z.today());
        w.cardio = true;
        toast("Cardio done. Cool down and stretch.");
        if (tab === "train") repaint(["tcardio"]);
      } else toast("Rest over. Next set.");
    }
  }
  // Vibrate the phone.
  function buzz(p) {
    try {
      if (Z.NATIVE && window.SZNative.vibrate) window.SZNative.vibrate(Array.isArray(p) ? 400 : p);
      else if (navigator.vibrate) navigator.vibrate(p);
    } catch (e) {}
  }
  var actx = null;
  // Short beep.
  function beep() {
    if (!Z.S.set.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.22].forEach(function (at) {
        var o = actx.createOscillator(),
          g = actx.createGain();
        o.frequency.value = 880;
        o.connect(g);
        g.connect(actx.destination);
        g.gain.setValueAtTime(0.18, actx.currentTime + at);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + at + 0.18);
        o.start(actx.currentTime + at);
        o.stop(actx.currentTime + at + 0.2);
      });
    } catch (e) {}
  }

  /* ---------- copy, export, import ---------- */
  function copyText(text, msg) {
    function fallback() {
      openSheet(
        "copy",
        "Copy this text",
        '<p class="sm">Select all of the text and copy it.</p><textarea class="in" rows="12" readonly>' +
          esc(text) +
          "</textarea>"
      );
    }
    try {
      if (Z.NATIVE && window.SZNative.copy) {
        window.SZNative.copy(text);
        toast(msg);
        return;
      }
    } catch (e) {}
    try {
      navigator.clipboard.writeText(text).then(function () {
        toast(msg);
      }, fallback);
    } catch (e) {
      fallback();
    }
  }
  // Backup to a file.
  function exportData() {
    Z.S.set.lastBackup = Z.today();
    Z.touchCore();
    var o = JSON.parse(JSON.stringify(Z.S));
    o.chat = [];
    var name = "zenkai-backup-" + Z.today() + ".json",
      data = JSON.stringify(o, null, 1);
    if (Z.NATIVE) {
      try {
        window.SZNative.saveFile(name, data);
        return;
      } catch (e) {}
    }
    try {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("Backup saved to Downloads");
    } catch (e) {
      copyText(data, "Backup copied to the clipboard");
    }
  }
  // Spreadsheet export.
  function exportCsv() {
    var name = "zenkai-log-" + Z.today() + ".csv",
      data = Z.csv();
    if (Z.NATIVE) {
      try {
        if (window.SZNative.saveFileAs) window.SZNative.saveFileAs(name, data, "text/csv");
        else window.SZNative.saveFile(name, data);
        return;
      } catch (e) {}
    }
    try {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("Spreadsheet saved to Downloads");
    } catch (e) {
      copyText(data, "Spreadsheet copied to the clipboard");
    }
  }
  // Restore from a backup file.
  function importFile(file) {
    var r = new FileReader();
    r.onload = function () {
      var ok = false;
      try {
        ok = Z.replaceAll(JSON.parse(String(r.result)));
      } catch (e) {
        ok = false;
      }
      if (ok) {
        closeSheet();
        cur = Z.today();
        render();
        toast("Backup restored");
      } else toast("That file is not a ZENKAI backup");
    };
    r.readAsText(file);
  }

  /* ---------- coach chat ---------- */
  function reveal(text) {
    return new Promise(function (done) {
      var el = $("#pend"),
        calm = false;
      try {
        calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (e) {}
      if (!el || calm || tab !== "coach") {
        done();
        return;
      }
      var parts = text.split(/(\s+)/),
        i = 0,
        step = Math.max(2, Math.ceil(parts.length / 45));
      el.classList.remove("pend");
      var iv = setInterval(function () {
        i += step;
        var e2 = $("#pend");
        if (!e2 || i >= parts.length) {
          clearInterval(iv);
          done();
          return;
        }
        e2.innerHTML = md2(parts.slice(0, i).join(""));
        scrollChat();
      }, 24);
    });
  }
  async function sendChat(text) {
    text = String(text || "")
      .trim()
      .slice(0, 500);
    if (busy || !text) return;
    var S = Z.S,
      ans;
    S.chat.push({ role: "user", content: text });
    busy = true;
    pending = "Thinking…";
    status();
    repaint(["cchat"]);
    scrollChat();
    try {
      ans = await Coach.ask(text, function (st) {
        pending = st;
        var el = $("#pend");
        if (el) el.textContent = st;
      });
    } catch (e) {
      ans = {
        text: "Something went wrong while I worked on that. Please ask again.",
        src: [],
        chips: [],
        acts: []
      };
    }
    await reveal(ans.text);
    S.chat.push({ role: "assistant", content: ans.text, src: ans.src, acts: ans.acts, chips: ans.chips });
    if (S.chat.length > 60) S.chat.splice(0, S.chat.length - 60);
    busy = false;
    pending = null;
    Z.persist();
    status();
    if (tab === "coach") {
      repaint(["cchat"]);
      scrollChat();
    }
    if (VO.reply || Z.S.set.vauto) {
      VO.reply = false;
      V.speak(ans.text);
    }
  }
  // Scroll the chat to the end.
  function scrollChat() {
    var v = $("#view");
    v.scrollTop = v.scrollHeight;
  }
  // Open Food Facts results.
  function onlineRows() {
    var L = window.__szOnline || [];
    return (
      L.map(function (f, i) {
        return (
          '<div class="frow"><div>' +
          esc(f.n) +
          "<small>per 100 g · " +
          f.k +
          " kcal · " +
          f.p +
          " g protein · " +
          f.c +
          " g carbs · " +
          f.f +
          ' g fat</small></div><div class="row" style="gap:6px"><input class="in num og" id="og-' +
          i +
          '" type="number" inputmode="decimal" min="1" max="2000" value="' +
          (f.sv || 100) +
          '" aria-label="Grams eaten"><span class="xs mut">g</span><button class="btn sm pri" type="button" data-act="addonline" data-i="' +
          i +
          '">Add</button></div></div>'
        );
      }).join("") +
      '<p class="xs mut" style="margin-top:8px">From Open Food Facts, entered by volunteers. Compare with your pack before trusting it.</p>'
    );
  }
  var lastOnline = 0;
  // Search Open Food Facts.
  function searchOnlineUI() {
    var q = ($("#fq") || {}).value || "",
      out = $("#fonline"),
      btn = $("#fo-btn");
    q = q.trim();
    if (!out) return;
    if (q.length < 3) {
      out.innerHTML = '<p class="sm mut">Type at least 3 letters in the search box first.</p>';
      return;
    }
    if (!Z.Net.online()) {
      out.innerHTML =
        '<p class="sm mut">' +
        (Z.Net.blocked
          ? "Online search works in the Android app, not in this preview."
          : "You are offline. Connect to the internet and try again.") +
        "</p>";
      return;
    }
    if (Date.now() - lastOnline < 6500) {
      out.innerHTML = '<p class="sm mut">One search every few seconds, please. Try again in a moment.</p>';
      return;
    }
    lastOnline = Date.now();
    out.innerHTML = '<p class="sm mut">Searching Open Food Facts…</p>';
    if (btn) btn.disabled = true;
    Z.searchOnline(q)
      .then(
        function (list) {
          window.__szOnline = list;
          var o = $("#fonline");
          if (!o) return;
          o.innerHTML = list.length
            ? onlineRows()
            : '<p class="sm mut">No product found for “' +
              esc(q) +
              "”. Try the brand name, or add it as a custom food from the label.</p>";
        },
        function () {
          var o = $("#fonline");
          if (o)
            o.innerHTML =
              '<p class="sm mut">Could not reach the food database just now. Try again in a minute.</p>';
        }
      )
      .then(function () {
        var b = $("#fo-btn");
        if (b) b.disabled = false;
      });
  }

  /* ---------- actions ---------- */
  function recard(id) {
    var el = $("#x-" + id);
    if (!el) return;
    var k = Z.dk(cur),
      i = D.SPLIT[k].ex.indexOf(id),
      tmp = document.createElement("div");
    tmp.innerHTML = xcard(id, i);
    el.replaceWith(tmp.firstChild);
  }
  var ACT = {
    tab: function (b) {
      go(b.dataset.tab);
    },
    day: function (b) {
      var d = +b.dataset.d,
        td = Z.today();
      cur = d === 0 ? td : Z.addDays(cur, d);
      if (cur > td) cur = td;
      render();
    },
    closesheet: function () {
      closeSheet();
    },
    system: function (b) {
      systemSheet(b.dataset.open || null);
    },
    quest: function (b) {
      var id = b.dataset.id;
      if (id === "train") {
        if (Z.rest(cur)) {
          ACT.walk();
        } else go("train");
      } else if (id === "protein" || id === "kcal") go("food");
      else if (id === "water") ACT.water({ dataset: { ml: "250" } });
      else logSheet(id === "weigh" ? "w" : id);
    },
    walk: function () {
      var d = Z.md(cur);
      d.walk = !d.walk;
      if (d.walk) toast("+40 XP · rest day done right");
      render();
    },
    water: function (b) {
      var d = Z.md(cur);
      d.water = Math.max(0, (d.water || 0) + +b.dataset.ml);
      if (tab === "today") {
        repaint(["hero", "lvl", "nextact", "quick", "quests"]);
        toast("Water: " + Z.r1(d.water / 1000) + " L");
      } else repaint(["fwater"]);
    },
    energy: function (b) {
      var d = Z.md(cur),
        v = +b.dataset.v;
      d.energy = d.energy === v ? null : v;
      repaint(["ready", "quick"]);
    },
    logf: function (b) {
      logSheet(b.dataset.f);
    },
    logstep: function (b) {
      var el = $("#lg-v");
      if (!el) return;
      var c = LOGF[el.dataset.f],
        v = (Z.num(el.value) || 0) + c.step * +b.dataset.d;
      v = Math.max(c.min, Math.min(c.max, Math.round(v / c.step) * c.step));
      el.value = c.dec === 1 ? v.toFixed(1) : String(+v.toFixed(c.dec));
    },
    logchip: function (b) {
      var el = $("#lg-v");
      if (el) el.value = b.dataset.v;
    },
    logsave: function () {
      var el = $("#lg-v");
      if (!el) return;
      var f = el.dataset.f,
        c = LOGF[f],
        v = Z.num(el.value);
      if (v == null || v < c.min || v > c.max) {
        toast("Enter a number between " + c.min + " and " + Z.nf(c.max));
        return;
      }
      Z.md(cur)[f] = f === "steps" ? Math.round(v) : v;
      closeSheet();
      toast(c.t + " saved");
    },
    logclear: function () {
      var el = $("#lg-v");
      if (!el) return;
      Z.md(cur)[el.dataset.f] = null;
      closeSheet();
    },
    waters: function (b) {
      var d = Z.md(cur);
      d.water = Math.max(0, (d.water || 0) + +b.dataset.ml);
      $("#sheet-b").innerHTML = waterSheetHtml();
    },
    quick: function () {
      quickSheet();
    },
    qgo: function (b) {
      var to = b.dataset.to;
      cur = Z.today();
      closeSheet();
      go(to);
      if (to === "food") addFoodSheet(mealNow());
      if (to === "coach") {
        var a = $("#ask");
        if (a) a.focus();
      }
    },
    seen: function () {
      closeSheet();
    },
    setup: function () {
      setupSheet();
    },
    myplan: function () {
      planSheet();
    },
    nosetup: function () {
      Z.S.set.nosetup = true;
      Z.touchCore();
      render();
    },
    suopt: function (b) {
      suRead();
      var k = b.dataset.k,
        v = b.dataset.v,
        a = SU.a;
      a[k] = k === "mins" || k === "meals" ? +v : v;
      if (k === "sex" && v !== "f")
        a.health = a.health.filter(function (x) {
          return x !== "preg";
        });
      if (k === "goal") a.goalW = null;
      if (k === "diet" || k === "cui") a.eat = null;
      if (k === "style") a.order = null;
      SU.err = "";
      suShow(true);
    },
    voice: function () {
      voiceStart();
    },
    swapex: function (b) {
      var id = b.dataset.ex,
        e = D.EX[id],
        list = P.alts(id, Z.S.prog.a, Z.dayEx(cur));
      openSheet(
        "swap",
        "Swap " + e.n,
        '<p class="sm">Machine busy, no equipment, or a move that does not suit you? These work the same muscles.</p>' +
          (list.length
            ? list
                .map(function (x) {
                  var f = D.EX[x];
                  return (
                    '<div class="frow"><div><b>' +
                    esc(f.n) +
                    "</b><small>" +
                    esc(f.t || "") +
                    " · " +
                    f.sets +
                    " × " +
                    Z.repTxt(f) +
                    '</small></div><div class="row" style="gap:6px"><button class="btn sm" type="button" data-act="swapgo" data-from="' +
                    id +
                    '" data-to="' +
                    x +
                    '">Today</button><button class="btn sm" type="button" data-act="swapgo" data-all="1" data-from="' +
                    id +
                    '" data-to="' +
                    x +
                    '">Always</button></div></div>'
                  );
                })
                .join("")
            : '<p class="sm mut">No other exercise in the library does the same job with your equipment.</p>') +
          '<p class="xs mut">Today: only this session changes. Always: your plan uses it instead from now on, every time the old one would come up.</p>'
      );
    },
    swapgo: function (b) {
      if (Z.swapEx(cur, b.dataset.from, b.dataset.to, !!b.dataset.all)) {
        closeSheet();
        toast("Swapped to " + D.EX[b.dataset.to].n);
      } else toast("That exercise is already started or already in today's list");
    },
    vstop: function () {
      V.stop();
    },
    saysheet: function () {
      sayOrStop(sheetText());
    },
    saymsg: function (b) {
      var el = b.closest(".msg");
      if (!el) return;
      var c = el.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll("button, .srcs, .macts"), function (x) {
        x.remove();
      });
      sayOrStop(c.textContent);
    },
    readday: function () {
      sayOrStop(dayText());
    },
    saysession: function () {
      var sp = D.SPLIT[Z.dk(cur)];
      sayOrStop(
        sp.focus +
          ". " +
          (sp.note || "") +
          " " +
          Z.dayEx(cur)
            .map(function (id, i) {
              var e = D.EX[id];
              return i + 1 + ". " + e.n + ": " + e.sets + " sets of " + Z.repTxt(e) + ".";
            })
            .join(" ")
      );
    },
    vtest: function () {
      if (
        !V.speak(
          "Hi, I am " +
            aname() +
            ". I will read your plan, your sessions and the coach's answers whenever you want."
        )
      )
        toast("Reading aloud is not available on this device");
    },
    vrate: function (b) {
      Z.S.set.vrate = +b.dataset.v;
      V.setRate(Z.S.set.vrate);
      Z.touchCore();
      var sec = $("#sec-voice > div");
      if (sec) sec.innerHTML = voiceSec();
      V.speak("This is the new speed.");
    },
    vhelp: function () {
      openSheet("vhelp", "Voice", voiceHelp());
    },
    week: function () {
      weekSheet();
    },
    weday: function (b) {
      var i = +b.dataset.i;
      if (WE.sel < 0) WE.sel = i;
      else if (WE.sel === i) WE.sel = -1;
      else {
        var x = WE.order[WE.sel];
        WE.order[WE.sel] = WE.order[i];
        WE.order[i] = x;
        WE.sel = -1;
        buzz(20);
      }
      $("#sheet-b").innerHTML = weekHtml();
    },
    wereset: function () {
      WE = { order: P.orderOf(Z.S.prog), sel: -1 };
      $("#sheet-b").innerHTML = weekHtml();
    },
    weplan: function () {
      var i = 0;
      WE.order = WE.order.map(function (x) {
        return x < 0 ? -1 : i++;
      });
      WE.sel = -1;
      $("#sheet-b").innerHTML = weekHtml();
    },
    wesave: function () {
      var ng = Z.reorder(WE.order);
      if (!ng) {
        toast("That week could not be saved");
        return;
      }
      WE = null;
      closeSheet();
      toast("Week saved");
    },
    swapdish: function (b) {
      var m = D.MEALS.filter(function (x) {
        return x.id === b.dataset.m;
      })[0];
      if (!m || !m.opts || m.opts.length < 2) return;
      Z.pickDish(m.id, ((m.pick || 0) + 1) % m.opts.length);
      toast(
        m.n +
          ": " +
          D.MEALS.filter(function (x) {
            return x.id === b.dataset.m;
          })[0].dish
      );
      if (tab === "food") repaint(["fsum", "fmeals", "fidea"]);
      else render();
    },
    pickdish: function (b) {
      if (Z.pickDish(b.dataset.m, +b.dataset.i)) {
        toast("Menu updated");
        planSheet();
      }
    },
    foodguide: function () {
      foodGuideSheet();
      markStart("food");
    },
    basics: function () {
      basicsSheet();
      markStart("basics");
    },
    startgo: function (b) {
      var k = b.dataset.k;
      markStart(k);
      if (k === "plan") planSheet();
      else if (k === "moves") {
        cur = Z.today();
        go("train");
      } else if (k === "weigh") {
        go("today");
        logSheet("w");
      } else render();
    },
    nostart: function () {
      Z.S.set.nostart = true;
      Z.touchCore();
      render();
    },
    nolearn: function () {
      Z.S.set.nolearn = true;
      Z.applyPlan();
      Z.touchCore();
      toast("Back to the full number of sets");
      render();
    },
    sutog: function (b) {
      suRead();
      var k = b.dataset.k,
        v = b.dataset.v,
        arr = SU.a[k],
        i = arr ? arr.indexOf(v) : -1;
      if (k === "days") SU.a.order = null;
      if (k === "eat" && !arr) {
        arr = SU.a.eat = P.clean(SU.a).eat;
        i = arr.indexOf(v);
      }
      if (i >= 0) arr.splice(i, 1);
      else {
        if (k === "focus" && arr.length >= 3) {
          toast("Three areas is the most a plan can give extra work to.");
          return;
        }
        if (k === "days" && arr.length >= 6) {
          toast("Keep at least one full rest day a week.");
          return;
        }
        arr.push(v);
      }
      SU.err = "";
      suShow(true);
    },
    suunit: function (b) {
      suRead();
      SU[b.dataset.k] = b.dataset.v;
      suShow(true);
    },
    sunext: function () {
      suRead();
      var st = suSteps(),
        err = suCheck(st[SU.i]);
      if (err) {
        SU.err = err;
        suShow(true);
        return;
      }
      SU.err = "";
      SU.i = Math.min(st.length - 1, SU.i + 1);
      suShow();
    },
    suback: function () {
      suRead();
      SU.err = "";
      SU.i = Math.max(0, SU.i - 1);
      suShow();
    },
    suapply: function () {
      Z.setup(SU.a);
      cur = Z.today();
      syncReminders();
      closeSheet();
      go("today");
      toast("Your plan is ready");
      if (!Z.S.set.seen) welcomeSheet();
    },
    mode: function (b) {
      Z.S.set.mode = b.dataset.v;
      Z.touchCore();
      applyMode();
      systemSheet("look");
    },
    accent: function (b) {
      Z.S.set.acc = b.dataset.v;
      Z.touchCore();
      applyMode();
      systemSheet("look");
    },
    adaptapply: function () {
      var a = Z.adaptive(),
        p = Z.S.profile;
      if (!a.ok) return;
      p.kcal = a.target;
      p.carbs = Math.max(0, Math.round((a.target - p.protein * 4 - p.fat * 9) / 4));
      p.fibre = Math.round((14 * a.target) / 1000);
      p.calcW = Z.r1(a.w);
      Z.touchCore();
      toast("Target set to " + Z.nf(a.target) + " kcal");
      if (!sheetKind) render();
    },
    badge: function (b) {
      toast(b.dataset.d);
    },
    savemeal: function (b) {
      var m = D.MEALS.filter(function (x) {
        return x.id === b.dataset.m;
      })[0];
      openSheet(
        "savemeal",
        "Save meal",
        '<p class="sm mut">Saves what is logged under ' +
          esc(m.n) +
          ' so you can add it again in one tap.</p><label class="f">Name<input class="in" id="sm-n" maxlength="40" value="My usual ' +
          esc(m.n.toLowerCase()) +
          '"></label><button class="btn pri wide" type="button" data-act="savemealgo" data-m="' +
          m.id +
          '">Save meal</button>'
      );
      var i = $("#sm-n");
      if (i) i.select();
    },
    savemealgo: function (b) {
      var n = ($("#sm-n") || {}).value || "",
        m = Z.saveMeal(cur, b.dataset.m, n.trim() || "My meal");
      closeSheet();
      toast(m ? "Meal saved: " + m.n : "Nothing to save");
    },
    addsaved: function (b) {
      var n = Z.addSavedMeal(cur, sheetMeal, b.dataset.id);
      toast(n ? "Added " + n + " item" + (n > 1 ? "s" : "") : "That meal is gone");
    },
    delsaved: function (b) {
      if (!b.dataset.sure) {
        b.dataset.sure = "1";
        b.textContent = "Sure?";
        return;
      }
      var L = Z.S.meals,
        i = L.map(function (x) {
          return x.id;
        }).indexOf(b.dataset.id);
      if (i > -1) {
        L.splice(i, 1);
        Z.touchCore();
      }
      addFoodSheet(sheetMeal);
    },
    exportcsv: function () {
      exportCsv();
    },
    asknotify: function () {
      try {
        window.SZNative.askNotify();
      } catch (e) {}
    },
    testnotify: function () {
      try {
        window.SZNative.testNotify();
        toast("Sent. Check your notification bar.");
      } catch (e) {
        toast("Could not send a notification");
      }
    },
    textsize: function (b) {
      Z.S.set.text = b.dataset.v;
      Z.touchCore();
      applyMode();
      systemSheet("look");
    },
    sound: function (b) {
      Z.S.set.sound = b.dataset.v === "1";
      Z.touchCore();
      systemSheet("look");
      if (Z.S.set.sound) beep();
    },
    webset: function (b) {
      Z.S.set.web = b.dataset.v === "1";
      Z.touchCore();
      status();
      systemSheet("coach");
    },
    webtoggle: function () {
      Z.S.set.web = Z.S.set.web === false;
      Z.touchCore();
      status();
      repaintKeep("cchat", "ask");
    },
    askc: function (b) {
      var q = b.dataset.q;
      closeSheet();
      go("coach");
      sendChat(q);
    },
    coachadd: function (b) {
      var f = Z.foodById(b.dataset.id);
      if (!f) return;
      var q = +b.dataset.q || 1,
        m = mealNow();
      Z.addFood(Z.today(), m, f, q, false);
      toast(
        "Added " +
          q +
          " × " +
          f.n.split(",")[0] +
          " to " +
          D.MEALS.filter(function (x) {
            return x.id === m;
          })[0].n
      );
    },
    welcome: function () {
      welcomeSheet();
    },
    guide: function (b) {
      guideSheet(b.dataset.id);
    },
    atlas: function () {
      atlasSheet();
    },
    muscle: function (b) {
      muscleSheet(b.dataset.id);
    },
    calc: function () {
      calcSheet();
    },
    calcapply: function () {
      var c = window.__szCalc;
      if (!c) return;
      Object.assign(Z.S.profile, c);
      Z.touchCore();
      closeSheet();
      toast("Targets updated: " + Z.nf(c.kcal) + " kcal, " + c.protein + " g protein");
    },
    phtoggle: function (b) {
      if (!b.classList.contains("paused")) b.classList.add("paused");
      else if (!b.classList.contains("end")) b.classList.add("end");
      else b.classList.remove("paused", "end");
    },
    warm: function () {
      var w = Z.mwo(cur);
      w.warm = !w.warm;
      repaint(["twarm"]);
    },
    fz: function () {
      var w = Z.mwo(cur);
      w.fz = !w.fz;
      repaint(["tfz"]);
      if (w.fz) toast("Finisher done");
    },
    cool: function () {
      var w = Z.mwo(cur);
      w.cool = !w.cool;
      repaint(["tcool"]);
      if (w.cool) toast("Cool-down done");
    },
    setplan: function (b) {
      if (Z.setPlan(b.dataset.v)) {
        toast("Plan changed");
      }
      systemSheet("planx");
    },
    gsstart: function (b) {
      gsStart(b.dataset.from || null);
    },
    gsnext: function () {
      gsNext();
    },
    gsmore: function () {
      if (!GS) return;
      if (GS.paused) {
        GS.left += 30;
        var c = $("#gs-c");
        if (c) c.textContent = gsClock(GS.left);
      } else if (GS.end) {
        GS.end += 30000;
        gsTick();
      }
    },
    medvid: function () {
      var box = $("#med"),
        id = box && box.dataset.id,
        v = id && vidOf(id),
        cap = $("#med-c");
      if (!v || box.querySelector(".vf")) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        toast("The video needs internet. Photos and steps work offline.");
        return;
      }
      box.innerHTML =
        '<div class="vf"><iframe src="https://www.youtube-nocookie.com/embed/' +
        v[0] +
        '?playsinline=1&amp;rel=0&amp;modestbranding=1&amp;fs=0&amp;autoplay=1" title="' +
        esc(v[1]) +
        '" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
      $("#med-d").classList.remove("on");
      $("#med-v").classList.add("on");
      if (box.scrollIntoView) box.scrollIntoView({ block: "nearest" });
      if (GS && GS.rest && !GS.paused) {
        GS.paused = true;
        GS.vp = true;
      }
      if (cap) {
        cap.hidden = false;
        cap.innerHTML =
          esc(v[1]) +
          " · YouTube. " +
          (GS && GS.vp ? "Rest timer paused while the video is open. " : "") +
          '<a href="' +
          vidUrl(id) +
          '" target="_blank" rel="noopener">Not playing? Open it in YouTube</a>';
      }
    },
    meddemo: function () {
      var box = $("#med"),
        id = box && box.dataset.id,
        cap = $("#med-c");
      if (!id || !box.querySelector(".vf")) return;
      box.innerHTML = demoHtml(D.EX[id]);
      $("#med-v").classList.remove("on");
      $("#med-d").classList.add("on");
      if (box.scrollIntoView) box.scrollIntoView({ block: "nearest" });
      if (cap) {
        cap.hidden = true;
        cap.innerHTML = "";
      }
      if (GS && GS.vp) {
        GS.vp = false;
        gsArm(GS.left);
      }
    },
    gspause: function () {
      if (!GS) return;
      if (GS.paused) gsArm(GS.left);
      else {
        GS.paused = true;
      }
      gsShow();
    },
    gsadj: function (b) {
      var el = $("#gs-" + b.dataset.f);
      if (!el) return;
      var v = (Z.num(el.value) || 0) + +b.dataset.d;
      el.value = Math.max(0, Math.round(v * 2) / 2);
    },
    gsskip: function () {
      if (!GS) return;
      var st = GS.steps[GS.i];
      if (!st || st.k !== "set") return;
      while (GS.steps[GS.i] && GS.steps[GS.i].k === "set" && GS.steps[GS.i].ex === st.ex) GS.i++;
      gsGo();
    },
    gsdone: function () {
      if (!GS) return;
      var st = GS.steps[GS.i];
      if (!st || st.k !== "set") return;
      var e = D.EX[st.ex],
        w = Z.mwo(Z.today()),
        x = w.sets[st.ex][st.i],
        wv = e.bw ? x.w || "" : Z.num(($("#gs-w") || {}).value),
        rv = Z.num(($("#gs-r") || {}).value);
      if (!rv || rv <= 0) {
        toast("Enter the " + (e.unit === "sec" ? "seconds" : "reps") + " you did");
        return;
      }
      x.w = wv == null ? "" : wv;
      x.r = rv;
      x.d = true;
      w.sets[st.ex].forEach(function (y, j) {
        if (j > st.i && !y.d && (y.w === "" || y.w == null)) y.w = x.w;
      });
      if (Z.isPR(st.ex, Z.today())) toast("New best on " + e.n);
      GS.i++;
      if (!GS.steps[GS.i]) {
        gsGo();
        return;
      }
      GS.rest = true;
      gsArm(GS.steps[GS.i].k === "set" ? e.rest : 30);
      gsShow();
    },
    setdone: function (b) {
      var id = b.dataset.ex,
        i = +b.dataset.i,
        e = D.EX[id],
        w = Z.mwo(cur),
        s = w.sets[id][i],
        wi = $("#w-" + id + "-" + i),
        ri = $("#r-" + id + "-" + i);
      if (wi) s.w = wi.value;
      if (ri) s.r = ri.value;
      s.d = !s.d;
      if (s.d) {
        if (s.r === "" || s.r == null) {
          var L = Z.lastSession(id, cur),
            pv = L && L.sets[Math.min(i, L.sets.length - 1)];
          s.r = String(pv ? pv.r : e.lo);
        }
        if (!w.t0) w.t0 = Date.now();
        for (var j = i + 1; j < w.sets[id].length; j++)
          if (w.sets[id][j].w === "" && s.w !== "") w.sets[id][j].w = s.w;
        var ws = Z.woStats(cur);
        if (ws.done < ws.total) startRest(e.rest, "Next set of " + e.n);
        buzz(30);
        if (Z.isPR(id, cur)) toast("New personal best on " + e.n);
      }
      recard(id);
      repaint(["thead", "tfin"]);
    },
    addset: function (b) {
      var w = Z.mwo(cur),
        a = w.sets[b.dataset.ex],
        l = a[a.length - 1];
      a.push({ w: l ? l.w : "", r: "", d: false });
      recard(b.dataset.ex);
      repaint(["thead"]);
    },
    delset: function (b) {
      var w = Z.mwo(cur),
        a = w.sets[b.dataset.ex];
      if (a.length > 1) a.pop();
      recard(b.dataset.ex);
      repaint(["thead"]);
    },
    finish: function () {
      var ws = Z.woStats(cur);
      if (!ws.done) {
        toast("Tick at least one set first");
        return;
      }
      var w = Z.mwo(cur);
      w.fin = true;
      w.t1 = Date.now();
      stopRest(false);
      toast("+40 XP · session complete");
      repaint(["thead", "tfin"]);
    },
    skipex: function (b) {
      var w = Z.mwo(cur);
      if (!w.skip) w.skip = {};
      w.skip[b.dataset.ex] = !w.skip[b.dataset.ex];
      recard(b.dataset.ex);
      repaint(["thead", "tfin"]);
    },
    effort: function (b) {
      var w = Z.mwo(cur);
      w.effort = w.effort === b.dataset.v ? null : b.dataset.v;
      repaint(["tfin"]);
    },
    unfinish: function () {
      var w = Z.mwo(cur);
      w.fin = false;
      repaint(["thead", "tfin"]);
    },
    timeradd: function () {
      T.end += 15000;
      T.total += 15;
      tick();
    },
    timerskip: function () {
      stopRest(false);
    },
    addfood: function (b) {
      addFoodSheet(b.dataset.m);
    },
    pickfood: function (b) {
      var f = Z.foodById(b.dataset.id);
      if (!f) return;
      Z.addFood(cur, sheetMeal, f, f.q, false);
      toast("Added " + f.q + " × " + f.n.split(",")[0]);
    },
    customfood: function () {
      var n = $("#cf-n").value.trim(),
        k = Z.num($("#cf-k").value);
      if (!n || k == null) {
        toast("Enter a name and the calories");
        return;
      }
      var f = {
        id: "c_" + Z.uid(),
        n: n,
        u: $("#cf-u").value.trim() || "1 serving",
        q: 1,
        k: k,
        p: Z.num($("#cf-p").value) || 0,
        c: Z.num($("#cf-c").value) || 0,
        f: Z.num($("#cf-f").value) || 0,
        fb: Z.num($("#cf-fb").value) || 0
      };
      Z.S.foods.unshift(f);
      Z.touchCore();
      Z.addFood(cur, sheetMeal, f, 1, false);
      toast("Added " + n);
      closeSheet();
    },
    logplan: function (b) {
      var m = D.MEALS.filter(function (x) {
        return x.id === b.dataset.m;
      })[0];
      if (!m || !m.plan.length) return;
      m.plan.forEach(function (it) {
        Z.addFood(cur, m.id, Z.foodById(it[0]), it[1], false);
      });
      toast(m.n + " plan logged");
      if (tab === "food") repaint(["fsum", "fmeals", "fidea"]);
      else render();
    },
    logfull: function () {
      var d = Z.gd(cur),
        n = 0;
      D.MEALS.forEach(function (m) {
        if (
          d.food.some(function (x) {
            return x.m === m.id;
          })
        )
          return;
        m.plan.forEach(function (it) {
          Z.addFood(cur, m.id, Z.foodById(it[0]), it[1], false);
        });
        n++;
      });
      toast(
        n ? "Plan logged for " + n + " empty meal" + (n > 1 ? "s" : "") : "Every meal already has food logged"
      );
      repaint(["fsum", "fmeals", "fidea"]);
    },
    copymeal: function (b) {
      var n = Z.copyMeal(Z.addDays(cur, -1), cur, b.dataset.m);
      toast("Copied " + n + " item" + (n > 1 ? "s" : "") + " from yesterday");
      repaint(["fsum", "fmeals", "fidea"]);
    },
    pickrecent: function (b) {
      var x = (window.__szRecent || [])[+b.dataset.i];
      if (!x) return;
      Z.addFood(
        cur,
        sheetMeal,
        { id: x.fid, n: x.n, u: x.u, k: x.k, p: x.p, c: x.c, f: x.f, fb: x.fb },
        x.q,
        !!x.e
      );
      toast("Added " + x.q + " × " + x.n.split(",")[0]);
    },
    fq: function (b) {
      var d = Z.md(cur),
        x = d.food.filter(function (f) {
          return f.id === b.dataset.id;
        })[0];
      if (!x) return;
      x.q = Math.round((x.q + +b.dataset.d) * 100) / 100;
      if (x.q <= 0) d.food.splice(d.food.indexOf(x), 1);
      repaint(["fsum", "fmeals", "fidea"]);
    },
    typefood: function () {
      var ta = $("#ty-food"),
        text = ta ? ta.value.trim() : "",
        meal = ($("#ty-meal") || {}).value || mealNow();
      if (!text) {
        toast("Type what you ate first");
        return;
      }
      var r = Z.parseMeal(text);
      window.__szTyped = { items: r.items, miss: r.miss, meal: meal };
      openSheet("typed", "Check and add", typedHtml());
    },
    tyq: function (b) {
      var T = window.__szTyped;
      if (!T) return;
      var x = T.items[+b.dataset.i];
      if (!x) return;
      x.q = Math.round((x.q + +b.dataset.d) * 100) / 100;
      if (x.q <= 0) T.items.splice(+b.dataset.i, 1);
      $("#sheet-b").innerHTML = typedHtml();
    },
    typedadd: function () {
      var T = window.__szTyped;
      if (!T || !T.items.length) return;
      T.items.forEach(function (x) {
        Z.addFood(cur, T.meal, x.f, x.q, false);
      });
      var n = T.items.length;
      window.__szTyped = null;
      closeSheet();
      toast("Added " + n + " item" + (n > 1 ? "s" : ""));
    },
    findonline: function (b) {
      var T = window.__szTyped,
        q = b.dataset.q;
      addFoodSheet(T ? T.meal : mealNow());
      var i = $("#fq");
      if (i) {
        i.value = q;
        $("#flist").innerHTML = foodRows(q);
      }
      var d = $("#sec-online");
      if (d) {
        d.open = true;
        d.scrollIntoView();
      }
      searchOnlineUI();
    },
    foodonline: function () {
      searchOnlineUI();
    },
    addonline: function (b) {
      var f = (window.__szOnline || [])[+b.dataset.i];
      if (!f) return;
      var g = Z.num(($("#og-" + b.dataset.i) || {}).value);
      if (!g || g <= 0) {
        toast("Enter the grams you ate");
        return;
      }
      var keep = { id: f.id, n: f.n, u: f.u, q: 1, k: f.k, p: f.p, c: f.c, f: f.f, fb: f.fb };
      if (
        !Z.S.foods.some(function (x) {
          return x.id === f.id;
        })
      ) {
        Z.S.foods.unshift(keep);
        Z.touchCore();
      }
      Z.addFood(cur, sheetMeal, keep, Math.round(g) / 100, false);
      toast("Added " + Math.round(g) + " g of " + f.n.split("(")[0].trim());
    },
    send: function () {
      var a = $("#ask"),
        t = a ? a.value.trim() : "";
      if (!t) return;
      a.value = "";
      sendChat(t);
    },
    chip: function (b) {
      sendChat(b.textContent);
    },
    clearchat: function () {
      Z.S.chat.length = 0;
      Z.persist();
      repaint(["cchat"]);
    },
    copyreport: function () {
      copyText(Z.reportText(), "Report copied");
    },
    export: function () {
      exportData();
    },
    import: function () {
      $("#pickjson").value = "";
      $("#pickjson").click();
    },
    chk: function (b) {
      var s = Z.S.set;
      s.chk = Math.max(0, Math.min(7, s.chk + +b.dataset.d));
      Z.touchCore();
      $("#bud").innerHTML = budgetHtml();
    },
    reset: function (b) {
      if (b.dataset.sure) {
        Z.resetAll();
        cur = Z.today();
        closeSheet();
        go("today");
        toast("All data erased");
        setupSheet();
      } else {
        b.dataset.sure = "1";
        b.textContent = "Tap again to erase everything";
      }
    }
  };
  var CHG = {
    qlog: function (el) {
      var f = el.dataset.f,
        d = Z.md(cur);
      d[f] = f === "note" ? el.value : Z.num(el.value);
    },
    vname: function (el) {
      Z.S.set.aname = el.value.trim().slice(0, 20) || "Coach";
      Z.touchCore();
      status();
    },
    vset: function (el) {
      Z.S.set[el.dataset.f] = !!el.checked;
      Z.touchCore();
    },
    exnote: function (el) {
      var S = Z.S;
      if (!S.exnote) S.exnote = {};
      S.exnote[el.dataset.ex] = el.value.slice(0, 120);
      Z.touchCore();
    },
    setv: function (el) {
      var w = Z.mwo(cur);
      w.sets[el.dataset.ex][+el.dataset.i][el.dataset.k] = el.value;
    },
    cset: function (el) {
      var w = Z.mwo(cur);
      w[el.dataset.k] = el.dataset.k === "cmin" ? Z.num(el.value) || 0 : el.value;
    },
    waist: function (el) {
      Z.md(cur).waist = Z.num(el.value);
      bfOpen = true;
      var o = $("#bfout");
      if (o) o.innerHTML = bodyStats();
    },
    neck: function (el) {
      Z.md(cur).neck = Z.num(el.value);
      bfOpen = true;
      var o = $("#bfout");
      if (o) o.innerHTML = bodyStats();
    },
    hip: function (el) {
      Z.md(cur).hip = Z.num(el.value);
      bfOpen = true;
      var o = $("#bfout");
      if (o) o.innerHTML = bodyStats();
    },
    remon: function (el) {
      Z.setReminder(el.dataset.id, el.checked, null);
      syncReminders();
      var ok = true;
      try {
        ok = window.SZNative.canNotify();
      } catch (e) {}
      if (el.checked && !ok) {
        try {
          window.SZNative.askNotify();
        } catch (e) {}
      }
      var l = $("#remlist");
      if (l) l.innerHTML = remHtml();
    },
    remt: function (el) {
      if (!/^\d\d:\d\d$/.test(el.value)) return;
      var r = Z.reminders().filter(function (x) {
        return x.id === el.dataset.id;
      })[0];
      Z.setReminder(el.dataset.id, r ? r.on : false, el.value);
      syncReminders();
    },
    selex: function (el) {
      selEx = el.value;
      repaint(["sstr"]);
    },
    prof: function (el) {
      var f = el.dataset.f,
        v = f === "start" ? el.value : Z.num(el.value);
      if (v == null || v === "") return;
      Z.S.profile[f] = v;
      Z.touchCore();
    },
    home: function (el) {
      Z.S.set.home = el.checked;
      Z.touchCore();
      $("#bud").innerHTML = budgetHtml();
    }
  };

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act]");
    if (!b || b.disabled) return;
    var f = ACT[b.dataset.act];
    if (f) {
      f(b, ev);
      setTimeout(celebrate, 0);
    }
  });
  document.addEventListener("change", function (ev) {
    var el = ev.target;
    if (el.id === "pickjson") {
      var g = el.files && el.files[0];
      if (g) importFile(g);
      return;
    }
    var h = el.dataset && CHG[el.dataset.chg];
    if (h) {
      h(el);
      setTimeout(celebrate, 0);
    }
  });
  document.addEventListener("input", function (ev) {
    var id = ev.target.id || "";
    if (id === "fq") $("#flist").innerHTML = foodRows(ev.target.value);
    else if (id.indexOf("c-") === 0 && $("#calc-out")) $("#calc-out").innerHTML = calcOut();
    else if (id.indexOf("pc-") === 0 && $("#pc-out")) $("#pc-out").innerHTML = portionOut();
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && sheetKind) closeSheet();
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.classList && ev.target.classList.contains("ph")) {
      ev.preventDefault();
      ACT.phtoggle(ev.target);
    }
    if (ev.key === "Enter" && !ev.shiftKey && ev.target.id === "ask") {
      ev.preventDefault();
      ACT.send();
    }
    if (ev.key === "Enter" && ev.target.id === "lg-v") {
      ev.preventDefault();
      ACT.logsave();
    }
    if (ev.key === "Enter" && ev.target.id === "fq" && $("#sec-online") && $("#sec-online").open) {
      ev.preventDefault();
      searchOnlineUI();
    }
  });
  // Redraw a card but keep a text field's focus and caret.
  function repaintKeep(id, inputId) {
    var el = $("#" + inputId),
      v = el ? el.value : "";
    repaint([id]);
    var e2 = $("#" + inputId);
    if (e2) e2.value = v;
  }

  /* ================= PERSONAL SETUP ================= */
  // A dozen short screens of questions, then the plan built from the answers.
  var SU = null,
    P = Z.P;
  var SUSTEPS = [
    "you",
    "goal",
    "target",
    "day",
    "exp",
    "where",
    "style",
    "focus",
    "food",
    "foods",
    "routine",
    "health",
    "plan"
  ];
  var SUTITLE = {
    you: "About you",
    goal: "Your goal",
    target: "Your target",
    day: "Your day",
    exp: "Your training so far",
    where: "Where and when",
    style: "How you like to train",
    focus: "Anything to focus on?",
    food: "Your food",
    foods: "What you eat and spend",
    routine: "Your routine",
    health: "Health check",
    plan: "Your plan"
  };
  var PACEWORD = {
    lose: {
      slow: "Easiest to keep up; best when you have little to lose",
      mid: "The usual choice",
      fast: "Harder; only with plenty to lose and good sleep"
    },
    gain: { slow: "The leanest gains", mid: "The usual choice", fast: "Quickest, with more fat alongside" }
  };
  // The setup steps for these answers.
  function suSteps() {
    return SUSTEPS.filter(function (s) {
      return s !== "target" || SU.a.goal === "lose" || SU.a.goal === "gain";
    });
  }
  // Open the setup questions.
  function setupSheet() {
    SU = { i: 0, a: Z.setupDraft(), uh: "cm", uw: "kg", err: "" };
    suShow();
  }
  // Large option cards.
  function suCards(key, list, sel, sub) {
    return list
      .map(function (o) {
        return (
          '<button type="button" class="plan' +
          (sel === o[0] ? " on" : "") +
          '" aria-pressed="' +
          (sel === o[0]) +
          '" data-act="suopt" data-k="' +
          key +
          '" data-v="' +
          o[0] +
          '"><b>' +
          esc(o[1]) +
          "</b>" +
          (o[2] ? "<span>" + esc(o[2]) + "</span>" : "") +
          (sub && sub[o[0]] ? "<small>" + esc(sub[o[0]]) + "</small>" : "") +
          "</button>"
        );
      })
      .join("");
  }
  // Tick-many chips.
  function suChips(key, list, sel) {
    return (
      '<div class="chips">' +
      list
        .map(function (o) {
          var on = sel.indexOf(o[0]) >= 0;
          return (
            '<button type="button" class="chip' +
            (on ? " on" : "") +
            '" aria-pressed="' +
            on +
            '" data-act="sutog" data-k="' +
            key +
            '" data-v="' +
            o[0] +
            '">' +
            esc(o[1]) +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  // A segmented choice.
  function suSeg(act, key, list, sel) {
    return (
      '<div class="seg" style="grid-template-columns:repeat(' +
      list.length +
      ',1fr)">' +
      list
        .map(function (o) {
          return (
            '<button type="button" class="' +
            (String(sel) === String(o[0]) ? "on" : "") +
            '" data-act="' +
            act +
            '" data-k="' +
            key +
            '" data-v="' +
            o[0] +
            '">' +
            esc(o[1]) +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  // Weight field with kg or lb.
  function suW(kg) {
    return kg == null ? "" : SU.uw === "lb" ? Z.r1(kg * 2.20462) : kg;
  }
  // Read the typed setup fields.
  function suRead() {
    if (!SU) return;
    var a = SU.a;
    function v(id) {
      var el = $("#" + id);
      return el ? el.value : null;
    }
    function kg(x) {
      return x == null ? null : SU.uw === "lb" ? Math.round(x * 45.359237) / 100 : x;
    }
    if ($("#su-name")) a.name = v("su-name").trim();
    if ($("#su-age")) a.age = Z.num(v("su-age"));
    if ($("#su-h")) a.h = Z.num(v("su-h"));
    else if ($("#su-hf")) {
      var ft = Z.num(v("su-hf")) || 0,
        inch = Z.num(v("su-hi")) || 0;
      a.h = ft || inch ? Z.r1(ft * 30.48 + inch * 2.54) : null;
    }
    if ($("#su-w")) a.w = kg(Z.num(v("su-w")));
    if ($("#su-gw")) a.goalW = kg(Z.num(v("su-gw")));
    ["wake", "bed", "wt"].forEach(function (k) {
      var x = v("su-" + k);
      if (x && /^\d\d:\d\d/.test(x)) a[k] = x.slice(0, 5);
    });
  }
  // Check a setup step; returns a message when something is missing.
  function suCheck(step) {
    var a = SU.a;
    if (step === "you") {
      if (!(a.age >= 13 && a.age <= 90)) return "Enter your age. ZENKAI builds plans for ages 13 to 90.";
      if (!(a.h >= 120 && a.h <= 230))
        return "Enter your height. It should be between 120 and 230 cm (about 4 ft to 7 ft 6 in).";
      if (!(a.w >= 30 && a.w <= 300))
        return "Enter your weight. It should be between 30 and 300 kg (66 to 660 lb).";
    }
    if (step === "where" && a.days.length < 2)
      return "Pick at least two training days. Two sessions a week is the least that builds strength.";
    if (step === "foods" && a.eat) {
      if (
        !a.eat.some(function (k) {
          return P.EATPROTEIN.indexOf(k) >= 0;
        })
      )
        return "Tick at least one protein food you eat, such as dal, eggs, curd or peanuts.";
      if (
        !a.eat.some(function (k) {
          return P.EATSTAPLE.indexOf(k) >= 0;
        })
      )
        return "Tick at least one grain you eat, such as roti, rice or oats.";
    }
    return "";
  }
  // The body of a setup step.
  function suBody(step) {
    var a = SU.a,
      O = P.OPT,
      h = "";
    if (step === "you") {
      var ft = a.h ? Math.floor(a.h / 2.54 / 12) : "",
        inch = a.h ? Math.round(a.h / 2.54 - ft * 12) : "";
      if (inch === 12) {
        ft += 1;
        inch = 0;
      }
      h +=
        '<p class="sm mut">A few questions, about two minutes. The answers shape your calories, training, meals and daily routine, and they stay on this phone.</p>' +
        '<label class="f">Your name <span class="mut">(optional)</span><input class="in" id="su-name" type="text" maxlength="30" autocomplete="off" value="' +
        esc(a.name || "") +
        '"></label>' +
        '<div class="sm mut">Sex <span class="xs">used by the calorie and body-fat formulas</span></div>' +
        suSeg("suopt", "sex", O.sex, a.sex) +
        '<label class="f">Age<input class="in num" id="su-age" type="number" inputmode="numeric" min="13" max="90" value="' +
        (a.age || "") +
        '"></label>' +
        '<div class="row sp"><span class="sm mut">Height</span><div class="useg">' +
        suSeg(
          "suunit",
          "uh",
          [
            ["cm", "cm"],
            ["ft", "ft + in"]
          ],
          SU.uh
        ) +
        "</div></div>" +
        (SU.uh === "cm"
          ? '<input class="in num" id="su-h" type="number" inputmode="decimal" step="0.5" placeholder="cm" aria-label="Height in centimetres" value="' +
            (a.h || "") +
            '">'
          : '<div class="g2"><input class="in num" id="su-hf" type="number" inputmode="numeric" placeholder="feet" aria-label="Feet" value="' +
            ft +
            '"><input class="in num" id="su-hi" type="number" inputmode="numeric" placeholder="inches" aria-label="Inches" value="' +
            inch +
            '"></div>') +
        '<div class="row sp"><span class="sm mut">Weight now</span><div class="useg">' +
        suSeg(
          "suunit",
          "uw",
          [
            ["kg", "kg"],
            ["lb", "lb"]
          ],
          SU.uw
        ) +
        "</div></div>" +
        '<input class="in num" id="su-w" type="number" inputmode="decimal" step="0.1" placeholder="' +
        SU.uw +
        '" aria-label="Weight" value="' +
        suW(a.w) +
        '">';
    } else if (step === "goal") {
      var b = P.bmi(a.w, a.h),
        h2 = Math.pow(a.h / 100, 2);
      h +=
        '<p class="sm mut">Pick the one that matters most right now. You can change it later.</p>' +
        suCards("goal", O.goal, a.goal) +
        '<div class="tip">Your BMI is <b>' +
        b.toFixed(1) +
        "</b>, " +
        P.BANDWORD[P.band(b)] +
        ". For " +
        a.h +
        " cm the healthy range is " +
        Math.ceil(18.5 * h2) +
        "–" +
        Math.floor(24.9 * h2) +
        " kg." +
        (b >= 23 && b < 25
          ? " For people of South Asian origin, health risks start to rise from a BMI of 23."
          : "") +
        " BMI cannot tell muscle from fat, so treat it as a rough guide.</div>";
    } else if (step === "target") {
      var tg = P.targets(a),
        sub = {};
      O.pace.forEach(function (o) {
        var t = P.targets(Object.assign({}, a, { pace: o[0] }));
        sub[o[0]] = "About " + Z.r1(Math.abs(t.weekly)) + " kg a week · " + Z.nf(t.kcal) + " kcal a day";
      });
      if (tg.goal !== a.goal) h += '<div class="alert">' + esc(tg.warn[0]) + "</div>";
      else
        h +=
          '<label class="f">Goal weight (' +
          SU.uw +
          ')<input class="in num" id="su-gw" type="number" inputmode="decimal" step="0.5" value="' +
          suW(a.goalW != null && Math.abs(a.goalW - tg.goalW) < 0.06 ? a.goalW : tg.goalW) +
          '"></label><p class="xs mut">The healthy range for your height is ' +
          suW(tg.lo) +
          "–" +
          suW(tg.hi) +
          " " +
          SU.uw +
          ". Not sure? Leave the suggestion as it is.</p>" +
          '<div class="sm mut">How fast?</div>' +
          suCards(
            "pace",
            O.pace.map(function (o) {
              return [o[0], o[1], PACEWORD[a.goal][o[0]]];
            }),
            a.pace,
            sub
          );
    } else if (step === "day") {
      h +=
        '<p class="sm mut">Outside your workouts, what does a normal day look like?</p>' +
        suCards("act", O.act, a.act);
    } else if (step === "exp") {
      h +=
        '<p class="sm mut">How long have you trained with weights or bodyweight, without long breaks?</p>' +
        suCards("exp", O.exp, a.exp) +
        '<div class="sm mut" style="margin-top:6px">Any area to go easy on? <span class="xs">Leave empty if everything feels fine.</span></div>' +
        suChips("limits", O.limits, a.limits);
    } else if (step === "where") {
      h +=
        '<div class="sm mut">Where will you train?</div>' +
        suCards("place", O.place, a.place) +
        '<div class="sm mut" style="margin-top:6px">Which days? <span class="xs">' +
        a.days.length +
        " picked. Two to six, with at least one day off.</span></div>" +
        suChips(
          "days",
          P.DOWS.map(function (d) {
            return [d, P.DNAME[d].slice(0, 3)];
          }),
          a.days
        ) +
        '<div class="sm mut" style="margin-top:6px">How long is one session, warm-up included?</div>' +
        suSeg("suopt", "mins", O.mins, a.mins);
    } else if (step === "style") {
      var need = { ppl: 3, double: 3, single: 4 }[a.style];
      h +=
        '<p class="sm mut">You train ' +
        a.days.length +
        " days a week. Not sure? Let the app choose.</p>" +
        suCards("style", O.style, a.style) +
        (need && a.days.length < need
          ? '<div class="warnbox">' +
            esc(P.label("style", a.style)) +
            " needs at least " +
            need +
            " days. With " +
            a.days.length +
            ", the plan will use a split that trains each muscle often enough.</div>"
          : "") +
        (function () {
          var wn = P.weekNames(a);
          return (
            '<div class="tip"><b>Your week with this choice:</b> ' +
            a.days
              .map(function (d, i) {
                return esc(P.DNAME[d].slice(0, 3) + " " + wn.names[i]);
              })
              .join(" · ") +
            "</div>"
          );
        })() +
        '<p class="xs mut">Whatever you pick, the plan counts the sets each muscle gets in the week, biceps, triceps and abs included, and adds work wherever a muscle falls short. Studies find the split itself makes no difference when the weekly sets are the same, so choose the one you will enjoy.</p>';
    } else if (step === "focus") {
      h +=
        '<p class="sm mut">Pick up to three areas you want a little extra work on, or none. Every plan already trains the whole body.</p>' +
        suChips("focus", O.focus, a.focus);
    } else if (step === "food") {
      h +=
        '<div class="sm mut">What do you eat?</div>' +
        suCards("diet", O.diet, a.diet) +
        '<div class="sm mut" style="margin-top:6px">What kind of food do you eat most days?</div>' +
        suCards("cui", O.cui, a.cui) +
        '<div class="sm mut" style="margin-top:6px">Meals a day</div>' +
        suSeg("suopt", "meals", O.meals, a.meals) +
        '<div class="sm mut" style="margin-top:6px">Anything you cannot eat? <span class="xs">Allergy or choice.</span></div>' +
        suChips("avoid", O.avoid, a.avoid);
    } else if (step === "foods") {
      var eat = a.eat || P.clean(a).eat,
        ok = P.eatOptions(a);
      h +=
        '<p class="sm mut">Tick everything you eat in a normal week. The menu is built only from these, so it looks like your food. Ticks are already set for ' +
        esc(P.label("cui", a.cui).toLowerCase()) +
        " food; change anything.</p>" +
        '<div class="sm mut">Protein foods</div>' +
        suChips(
          "eat",
          ok.filter(function (o) {
            return P.EATPROTEIN.indexOf(o[0]) >= 0;
          }),
          eat
        ) +
        '<div class="sm mut" style="margin-top:6px">Grains and breakfast staples</div>' +
        suChips(
          "eat",
          ok.filter(function (o) {
            return P.EATSTAPLE.indexOf(o[0]) >= 0;
          }),
          eat
        ) +
        '<div class="sm mut" style="margin-top:10px">Where does most of your food come from?</div>' +
        suCards("src", O.src, a.src) +
        '<div class="sm mut" style="margin-top:6px">Your food budget for the month</div>' +
        suCards("bud", O.bud, a.bud) +
        '<p class="xs mut">Protein powder is never required. India\'s national dietary guidelines advise getting protein from food, and the app ranks the cheapest protein foods for you.</p>';
    } else if (step === "routine") {
      var hrs = Z.r1(((P.toMin(a.wake) - P.toMin(a.bed) + 1440) % 1440) / 60);
      function tin(id, label, v) {
        return (
          '<label class="f">' +
          label +
          '<input class="in num" id="su-' +
          id +
          '" type="time" value="' +
          v +
          '"></label>'
        );
      }
      h +=
        '<p class="sm mut">Your meal times, timetable and reminders are built around these three times.</p>' +
        tin("wake", "I wake up at", a.wake) +
        tin("wt", "I start training at", a.wt) +
        tin("bed", "I go to bed at", a.bed) +
        (hrs < 7
          ? '<div class="warnbox"><b>That is ' +
            hrs +
            " hours of sleep.</b> Under seven, fat loss, muscle gain and mood all suffer. If you can, move bedtime earlier before you change anything else.</div>"
          : '<p class="xs mut">That gives you ' + hrs + " hours of sleep.</p>");
    } else if (step === "health") {
      h +=
        '<p class="sm mut">Does any of this apply to you? Tap all that do. If none, just continue.</p>' +
        O.health
          .filter(function (o) {
            return o[0] !== "preg" || a.sex === "f";
          })
          .map(function (o) {
            var on = a.health.indexOf(o[0]) >= 0;
            return (
              '<button type="button" class="plan chk' +
              (on ? " on" : "") +
              '" aria-pressed="' +
              on +
              '" data-act="sutog" data-k="health" data-v="' +
              o[0] +
              '"><span>' +
              esc(o[1]) +
              "</span></button>"
            );
          })
          .join("") +
        '<p class="xs mut">These answers stay on this phone. They make the plan more careful; they do not replace a doctor.</p>';
    } else h += planHtml(P.build(a));
    return h;
  }
  // Draw the current setup step.
  function suShow(keep) {
    var st = suSteps(),
      step = st[SU.i],
      top = keep ? $("#sheet-b").scrollTop : 0,
      last = step === "plan";
    var h =
      '<div class="suw"><div class="row sp xs mut"><span>Step ' +
      (SU.i + 1) +
      " of " +
      st.length +
      "</span><span>" +
      (last ? "Built from your answers" : "") +
      '</span></div><div class="bar"><i style="width:' +
      pct(SU.i + 1, st.length) +
      '%"></i></div>' +
      suBody(step) +
      (SU.err ? '<div class="alert" role="alert">' + esc(SU.err) + "</div>" : "") +
      '<div class="g2 sunav">' +
      (SU.i ? '<button class="btn" type="button" data-act="suback">Back</button>' : "<span></span>") +
      (last
        ? '<button class="btn pri" type="button" data-act="suapply">' +
          (Z.S.prog ? "Use this plan" : "Start with this plan") +
          "</button>"
        : '<button class="btn pri" type="button" data-act="sunext">Next</button>') +
      "</div></div>";
    openSheet("setup", SUTITLE[step], h);
    $("#sheet-b").scrollTop = top;
  }
  // A portion as words.
  function amount(id, q) {
    return P.amount(id, q);
  }
  // The plan screen.
  function planHtml(g) {
    var t = g.t,
      a = g.a,
      h = "",
      moving = t.goal === "lose" || t.goal === "gain";
    h +=
      '<p class="sm">' +
      (a.name ? esc(a.name) + ", this" : "This") +
      " plan is built for <b>" +
      esc(P.goalLine(t, a)) +
      "</b>.</p>";
    t.warn.forEach(function (w, i) {
      h += '<div class="' + (i === 0 && t.goal !== t.asked ? "alert" : "warnbox") + '">' + esc(w) + "</div>";
    });
    h +=
      '<div class="kpis"><div class="kpi"><small>Calories a day</small><b class="num">' +
      Z.nf(t.kcal) +
      '</b></div><div class="kpi"><small>Protein</small><b class="num">' +
      t.protein +
      ' g</b></div><div class="kpi"><small>' +
      (moving ? "Per week" : "Sessions") +
      '</small><b class="num">' +
      (moving ? (t.weekly < 0 ? "−" : "+") + Z.r1(Math.abs(t.weekly)) + " kg" : a.days.length + " a week") +
      "</b></div></div>";
    h +=
      '<p class="sm">Carbs ' +
      t.carbs +
      " g · fat " +
      t.fat +
      " g · fibre " +
      t.fibre +
      " g · water " +
      Z.r1(t.water / 1000) +
      " L · " +
      Z.nf(t.steps) +
      " steps · " +
      t.sleep +
      "+ hours of sleep." +
      (t.weeks
        ? " At this pace " +
          t.goalW +
          " kg is about <b>" +
          t.weeks +
          " weeks</b> away, around " +
          esc(fmt(Z.addDays(Z.today(), t.weeks * 7), { month: "long", year: "numeric" })) +
          "."
        : "") +
      "</p>";
    h +=
      '<details class="fold"><summary>How these numbers were worked out</summary>' +
      t.why
        .map(function (w) {
          return '<p class="sm">' + esc(w) + "</p>";
        })
        .join("") +
      '<p class="xs mut">These are estimates from standard formulas. After four weeks of logging, Stats measures what you really burn and corrects the target.</p></details>';
    h +=
      '<h3 class="suh">Your training week</h3><p class="sm mut">' +
      esc(g.info.why) +
      '</p><ul class="suwk">' +
      P.DOWS.map(function (k) {
        var d = g.split[k],
          fin = d.fin && D.FIN[d.fin];
        return (
          "<li" +
          (d.ex.length ? "" : ' class="off"') +
          "><b>" +
          d.name.slice(0, 3) +
          "</b><div><span>" +
          esc(d.focus) +
          "</span>" +
          (d.ex.length
            ? "<small>" +
              d.ex
                .map(function (id) {
                  return esc(D.EX[id].n);
                })
                .join(", ") +
              (fin ? ", then " + esc(fin.n.toLowerCase()) : "") +
              " · about " +
              g.info.mins[k] +
              " min</small>"
            : "") +
          "</div></li>"
        );
      }).join("") +
      "</ul>" +
      coverHtml(g);
    g.info.notes.forEach(function (n) {
      h += '<p class="sm">' + esc(n) + "</p>";
    });
    h +=
      '<h3 class="suh">A day of eating</h3>' +
      g.meals
        .filter(function (m) {
          return m.plan.length;
        })
        .map(function (m) {
          var o = m.opts || [],
            pk = m.pick || 0,
            cur0 = o[pk];
          return (
            '<div class="sumeal"><b>' +
            esc(m.n) +
            '</b> <span class="mut">' +
            esc(m.t) +
            "</span>" +
            (cur0 ? '<div class="sm"><b>' + esc(cur0.n) + "</b></div>" : "") +
            "<small>" +
            m.plan
              .map(function (it) {
                return esc(amount(it[0], it[1]));
              })
              .join(", ") +
            (cur0 ? " · " + cur0.k + " kcal · " + cur0.p + " g protein" : "") +
            "</small>" +
            (o.length > 1
              ? '<div class="chips" style="margin-top:4px">' +
                o
                  .map(function (x, i) {
                    return i === pk
                      ? ""
                      : '<button type="button" class="chip" ' +
                          (g === Z.S.prog
                            ? 'data-act="pickdish" data-m="' + m.id + '" data-i="' + i + '"'
                            : "disabled") +
                          ">Or: " +
                          esc(x.n) +
                          "</button>";
                  })
                  .join("") +
                "</div>"
              : "") +
            "</div>"
          );
        })
        .join("") +
      '<p class="xs mut">About ' +
      Z.nf(g.mealTot.k) +
      " kcal and " +
      Z.r0(g.mealTot.p) +
      " g protein" +
      (g.food && g.food.money ? ", roughly ₹" + Z.nf(g.food.month) + " a month" : "") +
      ". Each meal has other dishes with about the same calories and protein; swap them any day on the Food tab.</p>" +
      (g.food
        ? '<details class="fold"><summary>How to eat: your food guide</summary>' + guideHtml(g) + "</details>"
        : "");
    h +=
      '<h3 class="suh">Your day</h3><p class="sm">Up at ' +
      P.t12(a.wake) +
      ", training at " +
      P.t12(a.wt) +
      ", lights out at " +
      P.t12(a.bed) +
      ": <b>" +
      g.hours +
      " hours</b> of sleep. Reminders follow these times; switch them on in Menu → Reminders.</p>" +
      (g.hours < 7
        ? '<div class="warnbox">Under seven hours of sleep makes every goal here harder. An earlier bedtime is the cheapest improvement you can make.</div>'
        : "");
    if (g.ev)
      h +=
        '<details class="fold"><summary>Why this plan: the research behind it</summary><p class="sm">Every rule in this plan comes from published research, listed here with a link to each source.</p>' +
        g.ev
          .map(function (e) {
            return (
              '<p class="sm">' +
              esc(e.text) +
              ' <span class="xs mut">Source: ' +
              esc(e.src) +
              '.</span> <a class="xs" href="' +
              e.url +
              '" target="_blank" rel="noopener">Open ›</a></p>'
            );
          })
          .join("") +
        "</details>";
    return h;
  }
  // which muscles the week trains, how many sets each gets, and on which days
  function coverHtml(g) {
    if (!g.info.cover) return "";
    var LV = { light: ["Light", "bad"], good: ["Good", "ok"], strong: ["Plenty", "ok"] };
    return (
      '<div class="tw"><table class="cov"><thead><tr><th>Muscle</th><th class="n">Sets a week</th><th>Trained on</th></tr></thead><tbody>' +
      g.info.cover
        .map(function (c) {
          return (
            "<tr><td>" +
            esc(c.n) +
            '</td><td class="n"><b>' +
            c.sets +
            '</b> <span class="lv ' +
            LV[c.level][1] +
            '">' +
            LV[c.level][0] +
            "</span></td><td>" +
            esc(c.days.join(", ") || "as a helper") +
            "</td></tr>"
          );
        })
        .join("") +
      '</tbody></table></div><p class="xs mut">Research points to at least 4 sets a week per muscle for visible growth and about 10 or more for the best results. A set where a muscle only helps (your triceps on a bench press) counts as half. Calves are optional.</p>'
    );
  }
  // The food guide.
  function guideHtml(g) {
    return (
      P.foodGuide(g)
        .map(function (sec) {
          return (
            '<h4 class="gh">' +
            esc(sec[0]) +
            '</h4><ul class="gl">' +
            sec[1]
              .map(function (l) {
                return "<li>" + esc(l) + "</li>";
              })
              .join("") +
            "</ul>"
          );
        })
        .join("") +
      '<p class="xs mut">Built from the ICMR-NIN Dietary Guidelines for Indians 2024 and the protein research in Menu → Sources and credits. Prices are rough city averages.</p>'
    );
  }
  // Open the food guide.
  function foodGuideSheet() {
    var g = Z.S.prog;
    if (!g || !g.food) {
      setupSheet();
      return;
    }
    openSheet(
      "foodguide",
      "How to eat",
      '<p class="sm">Written for <b>' +
        esc(P.goalLine(g.t, g.a)) +
        "</b>: " +
        Z.nf(g.t.kcal) +
        " kcal and " +
        g.t.protein +
        " g of protein a day.</p>" +
        guideHtml(g)
    );
  }
  // gym basics for someone who has never followed a plan
  var BASICS = [
    [
      "Your first session",
      [
        "Arrive with a water bottle, a small towel and shoes with a flat sole.",
        "Ask the staff to show you how to set the seat on each machine in today's plan; they do this every day.",
        "Machines first: they guide the movement, so they are the easiest place to learn. Free weights come as you get confident.",
        "Open the Train tab, tap an exercise, watch the form video, then do one practice set with no weight or the lightest setting."
      ]
    ],
    [
      "Picking a weight",
      [
        "Choose a weight you can lift for the top of the rep range with good form and 3 or 4 reps still in the tank. That is what “reps in reserve” means.",
        "Too easy: you could have done 5 or more extra reps. Go up one step next set.",
        "Too heavy: your form breaks, or you cannot reach the bottom of the range. Go down a step.",
        "In the first weeks you will guess wrong. That is normal; the log remembers what you lifted so the next session starts right."
      ]
    ],
    [
      "Getting stronger week by week",
      [
        "When you reach the top of the rep range on every set, add the smallest weight step next session and drop back to the bottom of the range.",
        "Then build the reps up again. This is called double progression, and the app tells you when it is time.",
        "Progress is not a straight line. A week where nothing goes up is fine; a month is a sign to sleep and eat better."
      ]
    ],
    [
      "During the session",
      [
        "Warm up first: five minutes of easy movement, then a light set of your first exercise.",
        "Rest a minute or two between sets; the timer starts by itself. Short rests do not burn more fat, they just mean less work done.",
        "Breathe out as you push or pull, breathe in as you lower. Do not hold your breath for a whole set.",
        "Lower the weight slowly, about two seconds. Control matters more than the number on the plate."
      ]
    ],
    [
      "Soreness and pain",
      [
        "Aching muscles one or two days after a new exercise is normal and fades within a couple of weeks.",
        "Sharp pain, pain in a joint, or pain that makes you change how you move means stop that exercise. Pick the alternative listed in its guide.",
        "Pain that lasts more than a few days, or swelling, needs a doctor or physiotherapist."
      ]
    ],
    [
      "Outside the gym",
      [
        "Sleep 7 hours or more: muscle is built while you recover, not while you lift.",
        "Walk every day. Your step target is part of the plan, not an extra.",
        "Protein at every meal; the food guide shows how much.",
        "Weigh yourself each morning but judge by the weekly average. Daily weight jumps with water and salt."
      ]
    ],
    [
      "Words you will hear",
      [
        "Rep: one lift. Set: a group of reps done without stopping.",
        "Compound exercise: works several muscles at once (squat, press, row). Isolation: one muscle (curl, lateral raise).",
        "Superset: two exercises back to back with no rest between.",
        "Progressive overload: doing a little more over time, by weight, reps or sets.",
        "Deload: an easier week to recover, usually after 6 to 8 hard weeks."
      ]
    ]
  ];
  // Open gym basics.
  function basicsSheet() {
    openSheet(
      "basics",
      "Gym basics",
      '<p class="sm">Everything a beginner needs to know before the first session. About five minutes to read.</p>' +
        BASICS.map(function (sec) {
          return (
            '<h4 class="gh">' +
            esc(sec[0]) +
            '</h4><ul class="gl">' +
            sec[1]
              .map(function (l) {
                return "<li>" + esc(l) + "</li>";
              })
              .join("") +
            "</ul>"
          );
        }).join("") +
        '<p class="xs mut">Based on the American College of Sports Medicine 2026 position stand, Behm et al. 2024 on starting small, Singer et al. 2024 on rest between sets and Robinson et al. 2024 on how hard to push a set. Links in Menu → Sources and credits.</p>'
    );
  }
  // the first two weeks: a short checklist that walks a newcomer through the app and the plan
  var START = [
    ["plan", "Read your plan", "What you train each day, what you eat, and why."],
    ["basics", "Gym basics", "Picking a weight, rest, soreness, the words people use."],
    ["moves", "Learn today's moves", "Watch each form video before you lift."],
    ["food", "How to eat", "The plate, protein per meal, portions without a scale."],
    ["weigh", "Weigh in each morning", "Ten seconds. The weekly average is what counts."]
  ];
  // Tick an item on the start-here list.
  function markStart(k) {
    var s = Z.S.set;
    s.start = s.start || {};
    if (!s.start[k]) {
      s.start[k] = 1;
      Z.touchCore();
    }
  }
  // Today: start-here list.
  function bStart() {
    var S = Z.S;
    if (!S.prog || S.set.nostart || Z.planAge() >= 14) return "";
    var done = S.set.start || {},
      n = START.filter(function (x) {
        return done[x[0]];
      }).length;
    if (n === START.length) return "";
    return (
      '<div class="card"><div class="lab"><span>Start here · ' +
      n +
      " of " +
      START.length +
      '</span><button type="button" data-act="nostart">Hide ›</button></div>' +
      (S.set.rebuilt
        ? '<p class="sm" style="margin:6px 0">Your plan has been rebuilt with the new rules from the same answers: every muscle, biceps, triceps and abs included, now gets its weekly sets, and your menu is built from foods you eat.</p>'
        : "") +
      '<ul class="cl">' +
      START.map(function (x) {
        return (
          '<li class="' +
          (done[x[0]] ? "done" : "") +
          '"><div><button type="button" class="lk" style="padding:0" data-act="' +
          (x[0] === "basics" ? "basics" : x[0] === "food" ? "foodguide" : "startgo") +
          '" data-k="' +
          x[0] +
          '">' +
          (done[x[0]] ? "✓ " : "") +
          esc(x[1]) +
          "</button><small>" +
          esc(x[2]) +
          "</small></div></li>"
        );
      }).join("") +
      "</ul></div>"
    );
  }
  // Train: learning-week note.
  function tLearn() {
    if (!Z.learning() || Z.rest(cur)) return "";
    var left = 14 - Z.planAge();
    return (
      '<div class="card"><div class="tip"><b>Learning week · ' +
      left +
      " day" +
      (left === 1 ? "" : "s") +
      " left.</b> Two sets of each exercise, a light weight, and stop each set with 3 or 4 reps still in the tank. Learn the movement first; the full plan starts after this.</div>" +
      '<div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap"><button class="btn sm" type="button" data-act="basics">Gym basics</button><button class="btn sm" type="button" data-act="nolearn">I already know the lifts</button></div></div>'
    );
  }
  /* ---------- voice ---------- */
  var V = window.SZVoice,
    VO = { reply: false };
  // The assistant's name.
  function aname() {
    return String(Z.S.set.aname || "Coach").trim() || "Coach";
  }
  // Whether spoken workout cues are on.
  function cuesOn() {
    return Z.S.set.vcues !== false && V.canSpeak();
  }
  // Speak the current guided-session step.
  function gsSay() {
    if (!GS || !cuesOn()) return;
    var st = GS.steps[GS.i],
      key = GS.i + (GS.rest ? "r" : "s");
    if (GS.said === key) return;
    GS.said = key;
    if (!st) {
      V.speak(GS.part ? "Done." : "Session complete. Well done.");
      return;
    }
    if (GS.rest) {
      var e2 = st.k === "set" ? D.EX[st.ex] : null;
      V.speak(
        "Rest " +
          GS.left +
          " seconds. Next: " +
          (e2 ? e2.n + ", set " + (st.i + 1) + " of " + e2.sets : st.t) +
          "."
      );
      return;
    }
    if (st.k === "set") {
      var e = D.EX[st.ex],
        x = Z.mwo(Z.today()).sets[st.ex][st.i],
        w = +x.w > 0 ? ", " + x.w + " kilos" : "";
      V.speak(
        e.n +
          ". Set " +
          (st.i + 1) +
          " of " +
          e.sets +
          ", " +
          Z.repTxt(e) +
          w +
          "." +
          (st.i === 0 ? " " + (e.steps || [])[0] : "")
      );
      return;
    }
    V.speak(st.t + ". " + Math.round(st.sec) + " seconds.");
  }
  // what is on today, in words that read well aloud
  function dayText() {
    var td = Z.today(),
      p = Z.S.profile,
      t = Z.tot(td),
      d = Z.gd(td),
      sp = D.SPLIT[Z.dk(td)],
      nm = String(p.name || "").split(" ")[0],
      hr = new Date().getHours();
    var out = [
      (hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening") +
        (nm ? ", " + nm : "") +
        ". Today is " +
        fmt(td, { weekday: "long" }) +
        "."
    ];
    if (Z.rest(td)) out.push("It is a rest day. " + (sp.note || ""));
    else {
      var ex = Z.dayEx(td).map(function (id) {
          return D.EX[id].n;
        }),
        wo = d.wo;
      out.push(
        "Training: " +
          sp.focus +
          ", " +
          ex.length +
          " exercises" +
          (Z.S.prog && Z.S.prog.info.mins[Z.dk(td)]
            ? ", about " + Z.S.prog.info.mins[Z.dk(td)] + " minutes"
            : "") +
          ": " +
          ex.join(", ") +
          "." +
          (wo && wo.fin ? " You have already finished it." : "")
      );
    }
    out.push(
      "Food: " +
        Z.nf(p.kcal) +
        " calories and " +
        p.protein +
        " grams of protein. So far today: " +
        Z.nf(t.k) +
        " calories and " +
        Z.r0(t.p) +
        " grams of protein."
    );
    var nx = D.MEALS.filter(function (m) {
      return m.id === mealNow();
    })[0];
    if (nx && nx.plan && nx.plan.length)
      out.push(
        "Next meal: " +
          nx.n +
          " at " +
          nx.t +
          ": " +
          (nx.dish || "") +
          ", " +
          nx.plan
            .map(function (it) {
              return P.amount(it[0], it[1]);
            })
            .join(", ") +
          "."
      );
    out.push(
      "Water: " +
        Z.r1((d.water || 0) / 1000) +
        " of " +
        Z.r1(p.water / 1000) +
        " litres. Steps target: " +
        Z.nf(p.steps) +
        "."
    );
    return out.join(" ");
  }
  // The open sheet as text to read aloud.
  function sheetText() {
    var b = $("#sheet-b");
    if (!b) return "";
    var c = b.cloneNode(true);
    Array.prototype.forEach.call(
      c.querySelectorAll("button, input, select, textarea, .chips, svg, img, iframe, .gsin, table.cov thead"),
      function (el) {
        el.remove();
      }
    );
    Array.prototype.forEach.call(c.querySelectorAll("details"), function (el) {
      if (!el.open) {
        var s0 = el.querySelector("summary");
        el.innerHTML = s0 ? s0.outerHTML : "";
      }
    });
    Array.prototype.forEach.call(c.querySelectorAll("tr"), function (el) {
      el.appendChild(document.createTextNode(". "));
    });
    Array.prototype.forEach.call(
      c.querySelectorAll("li, p, h3, h4, summary, .sumeal, .suwk li"),
      function (el) {
        el.appendChild(document.createTextNode(". "));
      }
    );
    return ($("#sheet-t").textContent || "") + ". " + (c.textContent || "");
  }
  // Read text aloud, or stop if already reading.
  function sayOrStop(text) {
    if (V.busy()) {
      V.stop();
      return;
    }
    if (!V.speak(text)) toast("Reading aloud is not available on this device");
  }
  var DAYW = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
    mon: 0,
    tue: 1,
    tues: 1,
    wed: 2,
    thu: 3,
    thur: 3,
    thurs: 3,
    fri: 4,
    sat: 5,
    sun: 6
  };
  // The weekday named in a sentence.
  function dayIn(t) {
    var m =
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues?|wed|thu(?:rs?)?|fri|sat|sun)\b/.exec(
        t
      );
    return m ? DAYW[m[1]] : -1;
  }
  // move a session (by its name or its day) to another weekday, by voice
  function voiceMove(t) {
    var g = Z.S.prog;
    if (!g) return "Run the setup first, then I can move your training days.";
    var o = P.orderOf(g),
      to = -1,
      from = -1,
      words = t.replace(/\b(day|session|workout|training)\b/g, " ");
    var tm = /\bto\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.exec(words);
    if (tm) to = DAYW[tm[1]];
    if (to < 0) return "Which day should it go to? Say, for example, move legs to Saturday.";
    P.DOWS.forEach(function (d, i) {
      if (from < 0 && o[i] >= 0 && i !== to) {
        var f = g.split[d].focus.toLowerCase();
        if (
          f.split(/[^a-z]+/).some(function (w) {
            return w.length > 2 && words.indexOf(w) >= 0 && !/^(and|abs)$/.test(w);
          })
        )
          from = i;
      }
    });
    if (from < 0) {
      var fd = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.exec(words.replace(tm[0], ""));
      if (fd) from = DAYW[fd[1]];
    }
    if (from < 0 || o[from] < 0)
      return "I could not tell which session to move. Say the session name, like legs or chest, and the day.";
    var x = o[from];
    o[from] = o[to];
    o[to] = x;
    var ng = Z.reorder(o);
    if (!ng) return "That move did not work. Try the Move training days screen.";
    var moved = ng.split[P.DOWS[to]].focus,
      other = ng.split[P.DOWS[from]].focus,
      warn = ng.info.notes.filter(function (n) {
        return /48 hours/.test(n);
      })[0];
    render();
    return (
      "Done. " +
      moved +
      " is now on " +
      P.DNAME[P.DOWS[to]] +
      ", and " +
      P.DNAME[P.DOWS[from]] +
      " is " +
      (other === "Rest" ? "a rest day" : other) +
      "." +
      (warn ? " " + warn : "")
    );
  }
  // Voice: make a day a rest day.
  function voiceRest(t) {
    var g = Z.S.prog;
    if (!g) return "Run the setup first, then I can move your rest days.";
    var o = P.orderOf(g),
      want = dayIn(t);
    if (want < 0) return "Which day do you want to rest? Say, for example, rest on Wednesday.";
    if (o[want] < 0) return P.DNAME[P.DOWS[want]] + " is already a rest day.";
    // the rest day nearest the end of the week takes the session
    var rests = [];
    o.forEach(function (x, i) {
      if (x < 0) rests.push(i);
    });
    if (!rests.length) return "You have no rest day to swap with.";
    var r = rests.filter(function (i) {
      return i === 6;
    })[0];
    if (r == null) r = rests[rests.length - 1];
    o[r] = o[want];
    o[want] = -1;
    var ng = Z.reorder(o);
    if (!ng) return "That change did not work. Try the Move training days screen.";
    render();
    return (
      "Done. " +
      P.DNAME[P.DOWS[want]] +
      " is now a rest day, and " +
      ng.split[P.DOWS[r]].focus +
      " moved to " +
      P.DNAME[P.DOWS[r]] +
      "."
    );
  }
  // spoken commands; anything else goes to the coach
  function voiceDo(alts) {
    var raw = alts[0],
      nm = aname()
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ""),
      t = raw
        .toLowerCase()
        .replace(/[^a-z0-9.,' ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (nm)
      t = t.replace(
        new RegExp("^(?:hey |ok |okay |hi |hello )?" + nm.replace(/[.*+?^${}()|[\]\\]/g, "") + "\\b[ ,]*"),
        ""
      );
    toast("“" + raw.slice(0, 60) + "”");
    var td = Z.today(),
      m,
      reply = null;
    function say(x) {
      reply = x;
    }
    if (/^(stop|quiet|be quiet|shut up|cancel|enough)\b/.test(t)) {
      V.stop();
      return;
    }
    if (
      (m = /\b(?:weight|weigh|weighed)\b\D{0,20}(\d{2,3}(?:[.,]\d)?)/.exec(t)) ||
      (m = /\b(\d{2,3}(?:[.,]\d)?)\s*(?:kg|kilo|kilos|kilograms)\b/.exec(t))
    ) {
      var w = +m[1].replace(",", ".");
      if (w >= 30 && w <= 250) {
        Z.md(td).w = w;
        say("Saved. " + w + " kilos for today.");
      } else say("That weight looks wrong. Say it again, like my weight is 82.5.");
    } else if (
      (m = /(\d+(?:\.\d+)?)\s*(ml|millilit\w*|litres?|liters?|l|glass(?:es)?|bottles?)\b/.exec(t)) &&
      /water|drank|drink|glass|bottle/.test(t)
    ) {
      var q = +m[1],
        u = m[2],
        ml = /^ml|^milli/.test(u) ? q : /^glass/.test(u) ? q * 250 : /^bottle/.test(u) ? q * 1000 : q * 1000;
      ml = Math.round(Math.min(ml, 4000));
      var d = Z.md(td);
      d.water = (d.water || 0) + ml;
      say("Added " + ml + " millilitres of water. " + Z.r1(d.water / 1000) + " litres today.");
    } else if ((m = /(\d[\d,]{2,})\s*steps/.exec(t))) {
      var n = +m[1].replace(/,/g, "");
      if (n > 0 && n < 100000) {
        Z.md(td).steps = n;
        say("Saved " + n + " steps for today.");
      }
    } else if (
      (m = /\bslept\b\D{0,10}(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/.exec(t)) ||
      (m = /\bsleep\b\D{0,10}(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/.exec(t))
    ) {
      var hrs = +m[1];
      if (hrs >= 0 && hrs <= 16) {
        Z.md(td).sleep = hrs;
        say("Saved " + hrs + " hours of sleep.");
      }
    } else if (/\b(move|shift|swap|change)\b.*\bto\b.*day\b/.test(t)) {
      say(voiceMove(t));
    } else if (
      /\b(rest|day off|off day|holiday|no gym|skip the gym)\b.*\b(mon|tues|wednes|thurs|fri|satur|sun)day\b|\bmake\b.*day\b.*\brest\b/.test(
        t
      )
    ) {
      say(voiceRest(t));
    } else if (
      (m = /^(?:i\s+)?(?:just\s+)?(?:ate|had|have had|eaten|log|add)\s+(.+)$/.exec(t)) &&
      !/water|steps|sleep|weight/.test(m[1])
    ) {
      var r = Z.parseMeal(m[1]);
      window.__szTyped = { items: r.items, miss: r.miss, meal: mealNow() };
      cur = td;
      openSheet("typed", "Check and add", typedHtml());
      say(
        r.items.length
          ? "I found " +
              r.items
                .map(function (x) {
                  return x.q + " " + x.f.n;
                })
                .join(", ") +
              ". Check it and tap Add."
          : "I could not match that to a food. You can search for it on this screen."
      );
    } else if (
      /\b(start|begin)\b.*\b(workout|session|training|exercise|gym)\b|^let'?s (go|start|train)/.test(t)
    ) {
      if (Z.rest(td)) say("Today is a rest day. A walk is the plan.");
      else {
        cur = td;
        go("train");
        gsStart();
      }
      if (reply) V.speak(reply);
      return;
    } else if (
      /\b(read|tell me|what'?s|what is)\b.*\b(my day|today|plan for today|schedule)\b|^brief me|^good morning/.test(
        t
      )
    ) {
      say(dayText());
    } else if (/\b(read|open|show)\b.*\bmy plan\b/.test(t)) {
      planSheet();
      setTimeout(function () {
        V.speak(sheetText());
      }, 50);
      return;
    } else if (/\bhow to eat|food guide\b/.test(t)) {
      foodGuideSheet();
      setTimeout(function () {
        V.speak(sheetText());
      }, 50);
      return;
    } else if (
      (m =
        /\b(open|show|go to)\b\s+(?:the\s+|my\s+)?(today|home|train\w*|workout|gym|food|diet|meals?|stats|progress|coach|week|menu|settings)/.exec(
          t
        ))
    ) {
      var k = m[2],
        to = /today|home/.test(k)
          ? "today"
          : /train|workout|gym/.test(k)
            ? "train"
            : /food|diet|meal/.test(k)
              ? "food"
              : /stat|progress/.test(k)
                ? "stats"
                : k === "coach"
                  ? "coach"
                  : null;
      if (k === "week") {
        weekSheet();
        return;
      }
      if (/menu|settings/.test(k)) {
        systemSheet(null);
        return;
      }
      if (to) {
        cur = td;
        go(to);
        say("Opened " + (to === "stats" ? "your progress" : to) + ".");
      }
    } else {
      VO.reply = true;
      go("coach");
      sendChat(raw);
      return;
    }
    render();
    if (sheetKind === "typed") {
      var sb = $("#sheet-b");
      if (sb) sb.innerHTML = typedHtml();
    }
    if (reply) {
      V.speak(reply);
      if (reply.length < 120) toast(reply);
    }
  }
  // Open voice input.
  function voiceStart() {
    if (!V.canListen()) {
      openSheet(
        "vhelp",
        "Voice",
        '<p class="sm">This phone has no voice-input app the app can open. Install or switch on the Google app (or another voice keyboard) and try again.</p>' +
          voiceHelp()
      );
      return;
    }
    V.listen(function (alts, err) {
      if (!alts) {
        if (err !== "aborted")
          toast(
            err === "none"
              ? "Voice input is not available here"
              : /not-allowed/.test(err || "")
                ? "The microphone is blocked here. Voice input works in the Android app."
                : "Did not catch that. Tap the microphone and try again."
          );
        return;
      }
      voiceDo(alts);
    }, aname() + " is listening");
  }
  // What you can say.
  function voiceHelp() {
    var n = aname();
    return (
      '<h4 class="gh">Things you can say to ' +
      esc(n) +
      '</h4><ul class="gl">' +
      [
        "“Read my day”",
        "“My weight is 88.4”",
        "“I drank 2 glasses of water”",
        "“I ate 2 eggs and 2 chapatis”",
        "“I slept 7 hours”",
        "“I walked 8,000 steps”",
        "“Start my workout”",
        "“Move legs to Saturday”",
        "“Rest on Wednesday”",
        "“Open food” or “Open my week”",
        "“How much protein do I need?” (any question goes to the coach)",
        "“Stop”"
      ]
        .map(function (x) {
          return "<li>" + esc(x) + "</li>";
        })
        .join("") +
      "</ul>" +
      '<p class="xs mut">Tap the microphone at the top of the screen first. The app does not listen all the time: that would drain the battery and is not something a phone app should do in the background. Your phone\'s voice-input app turns speech into text, which may need the internet.</p>'
    );
  }
  // Menu: voice settings.
  function voiceSec() {
    var S = Z.S,
      r = S.set.vrate || 1;
    return (
      '<label class="f">Your assistant\'s name<input class="in" id="v-name" maxlength="20" value="' +
      esc(S.set.aname || "Coach") +
      '" data-chg="vname" placeholder="Coach"></label>' +
      '<p class="xs mut">Used when it talks to you. You can start a command with it: “' +
      esc(aname()) +
      ", read my day”.</p>" +
      '<div class="sm mut" style="margin-top:8px">Reading speed</div><div class="seg s3">' +
      [
        [0.85, "Slower"],
        [1, "Normal"],
        [1.15, "Faster"]
      ]
        .map(function (x) {
          return (
            '<button type="button" class="' +
            (Math.abs(r - x[0]) < 0.01 ? "on" : "") +
            '" data-act="vrate" data-v="' +
            x[0] +
            '">' +
            x[1] +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<label class="row sm" style="margin-top:10px;gap:8px"><input type="checkbox" data-chg="vset" data-f="vcues"' +
      (S.set.vcues !== false ? " checked" : "") +
      "> Speak during guided sessions: each exercise, rest and countdown</label>" +
      '<label class="row sm" style="margin-top:6px;gap:8px"><input type="checkbox" data-chg="vset" data-f="vauto"' +
      (S.set.vauto ? " checked" : "") +
      "> Read every coach reply aloud</label>" +
      '<div class="g2" style="margin-top:10px"><button class="btn sm" type="button" data-act="vtest">Test the voice</button><button class="btn sm" type="button" data-act="readday">Read my day</button></div>' +
      (V.canSpeak()
        ? ""
        : '<p class="sm">Reading aloud is not available here. In the app it uses your phone\'s text-to-speech engine (Settings → Accessibility → Text-to-speech).</p>') +
      voiceHelp()
    );
  }

  /* ---------- the week: move sessions between days ---------- */
  var WE = null;
  // Name, length and muscle load of each session.
  function weekState() {
    var g = Z.S.prog,
      names = [],
      load = [],
      mins = [];
    P.DOWS.forEach(function (d) {
      var x = g.split[d],
        i = P.orderOf(g)[P.DOWS.indexOf(d)];
      if (i >= 0) {
        names[i] = x.focus;
        load[i] = P.dayLoad(x.ex, g.rx);
        mins[i] = g.info.mins[d];
      }
    });
    return { names: names, load: load, mins: mins };
  }
  // The week editor.
  function weekHtml() {
    var g = Z.S.prog,
      st = weekState(),
      base = P.orderOf(g),
      changed = WE.order.join() !== base.join();
    var warn = P.backToBack(WE.order, st.load, st.names);
    return (
      '<p class="sm">Tap a day, then tap the day to swap it with. Swap with a rest day to move a session there, or to rest on a different day. The sessions stay exactly the same.</p>' +
      '<ul class="wk">' +
      P.DOWS.map(function (d, i) {
        var x = WE.order[i],
          on = WE.sel === i,
          moved = x !== base[i];
        return (
          '<li><button type="button" class="' +
          (on ? "on " : "") +
          (x < 0 ? "rest " : "") +
          (moved ? "mv" : "") +
          '" data-act="weday" data-i="' +
          i +
          '"><b>' +
          P.DNAME[d].slice(0, 3) +
          "</b><span>" +
          (x < 0 ? "Rest" : esc(st.names[x])) +
          "</span><small>" +
          (x < 0 ? "" : "about " + st.mins[x] + " min") +
          "</small></button></li>"
        );
      }).join("") +
      "</ul>" +
      (warn.length
        ? '<div class="warnbox">' + warn.map(esc).join("<br>") + "</div>"
        : '<p class="xs mut">No muscle is trained hard two days in a row.</p>') +
      '<button class="btn pri wide" type="button" data-act="wesave"' +
      (changed ? "" : " disabled") +
      ">Save my week</button>" +
      '<div class="g2"><button class="btn sm" type="button" data-act="wereset"' +
      (changed ? "" : " disabled") +
      '>Undo changes</button><button class="btn sm" type="button" data-act="weplan">Plan order</button></div>' +
      '<p class="xs mut">Want to train more or fewer days? That changes the whole plan: <button class="lk" type="button" data-act="setup">redo the setup</button>.</p>'
    );
  }
  // Open the week editor.
  function weekSheet() {
    if (!Z.S.prog) {
      setupSheet();
      return;
    }
    WE = { order: P.orderOf(Z.S.prog), sel: -1 };
    openSheet("week", "Move training days", weekHtml());
  }
  // Train: the week strip.
  function tWeek() {
    var g = Z.S.prog;
    if (!g) return "";
    var td = Z.dk(Z.today());
    return (
      '<div class="card"><div class="lab"><span>Your week</span><button type="button" data-act="week">Move days ›</button></div><div class="wks">' +
      P.DOWS.map(function (d) {
        var x = g.split[d];
        return (
          '<span class="' +
          (d === td ? "now " : "") +
          (x.kind === "rest" ? "rest" : "") +
          '"><b>' +
          P.DNAME[d].slice(0, 1) +
          "</b>" +
          esc(x.kind === "rest" ? "Rest" : x.focus.replace(" + ", "+")).replace(
            /\b([A-Za-z]{4})([A-Za-z]{4,})\b/g,
            "$1&shy;$2"
          ) +
          "</span>"
        );
      }).join("") +
      "</div>" +
      (V.canSpeak() && !Z.rest(cur)
        ? '<button class="lk" type="button" data-act="saysession">Listen to this session</button>'
        : "") +
      "</div>"
    );
  }

  // Open My plan.
  function planSheet() {
    if (!Z.S.prog) {
      setupSheet();
      return;
    }
    openSheet(
      "myplan",
      "My plan",
      planHtml(Z.S.prog) +
        '<button class="btn wide" type="button" data-act="week">Move training days</button><button class="btn pri wide" type="button" data-act="setup">Change my answers</button><p class="xs mut">Built on ' +
        esc(fmt(Z.S.prog.at || Z.today(), { day: "numeric", month: "long", year: "numeric" })) +
        ". Redo the setup when your weight, schedule or goal changes. Your log is kept.</p>"
    );
  }
  // Today: set up your plan.
  function bSetup() {
    var S = Z.S;
    if (S.prog || S.set.nosetup) return "";
    return S.set.fresh
      ? '<div class="card setupc"><h2 class="th2">Set up your plan</h2><p class="sm" style="margin:8px 0 12px">Answer a few questions about your body, goal and routine. ZENKAI then builds your calories, training week, meals and daily timetable.</p><button class="btn pri wide big" type="button" data-act="setup">Start, 2 minutes</button></div>'
      : '<div class="card setupc"><div class="lab"><span>New</span><button type="button" data-act="nosetup">Not now ›</button></div><h2 class="th2">A plan built for you</h2><p class="sm" style="margin:8px 0 12px">Answer a few questions and the app rebuilds your calories, training week, meals and timetable around your goal, your schedule and how you like to train. Your log stays as it is.</p><button class="btn pri wide" type="button" data-act="setup">Personal setup</button></div>';
  }

  /* ---------- boot ---------- */
  $("#nav").innerHTML = TABS.map(function (t) {
    return (
      '<button type="button" data-act="tab" data-tab="' +
      t[0] +
      '">' +
      IC[t[0]] +
      "<span>" +
      t[1] +
      "</span></button>"
    );
  }).join("");
  var h0 = (location.hash || "").replace("#", "");
  if (VIEWS[h0]) tab = h0;
  applyMode();
  go(tab);
  if (Z.S.set.fresh && !Z.S.prog) setupSheet();
  else if (!Z.S.set.seen) welcomeSheet();
  window.addEventListener("hashchange", function () {
    var h = (location.hash || "").replace("#", "");
    if (VIEWS[h] && h !== tab) go(h);
  });
  window.SZ_back = function () {
    if (sheetKind === "setup" && SU && SU.i > 0) {
      ACT.suback();
      return true;
    }
    if (sheetKind) {
      closeSheet();
      return true;
    }
    if (tab !== "today") {
      go("today");
      return true;
    }
    return false;
  };
  window.SZ_saved = function (ok) {
    toast(ok ? "File saved" : "The file was not saved");
  };
  window.SZ_notify = function (ok) {
    toast(ok ? "Notifications allowed" : "Notifications are blocked. Allow them in your phone's settings.");
    var l = $("#remlist");
    if (l) l.innerHTML = remHtml();
  };
  // app-icon shortcuts and reminder taps land here
  window.SZ_open = function (what) {
    if (sheetKind) closeSheet();
    cur = Z.today();
    if (what === "voice") {
      go("today");
      setTimeout(voiceStart, 300);
      return;
    }
    if (what === "weight") {
      go("today");
      logSheet("w");
    } else if (what === "food") {
      go("food");
      addFoodSheet(mealNow());
    } else if (what === "coach") {
      go("coach");
      var a = $("#ask");
      if (a) a.focus();
    } else if (what === "train") go("train");
    else go("today");
  };
  V.setRate(Z.S.set.vrate || 1);
  V.on(function (st) {
    var vb = $("#vbtn"),
      vs = $("#vstop");
    if (vb) vb.classList.toggle("on", st === "listen");
    if (vs) vs.hidden = st !== "speak";
    if (st === "fail")
      toast(
        "This phone has no working text-to-speech voice. Check Settings → Accessibility → Text-to-speech."
      );
  });
  syncReminders();
  lastDone = Z.doneCount(Z.today());
  try {
    var lt = Z.NATIVE && window.SZNative.launchTarget ? window.SZNative.launchTarget() : "";
    if (lt)
      setTimeout(function () {
        window.SZ_open(lt);
      }, 60);
  } catch (e) {}
  // Online or offline changed.
  function netChange() {
    status();
    if (tab === "coach" && !busy && !sheetKind) repaintKeep("cchat", "ask");
  }
  window.addEventListener("online", netChange);
  window.addEventListener("offline", netChange);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      Z.persist();
      return;
    }
    var rl = $("#remlist");
    if (rl) rl.innerHTML = remHtml();
    var td = Z.today();
    if (td !== lastToday) {
      if (cur === lastToday) cur = td;
      lastToday = td;
      if (!sheetKind) render();
    }
  });
  window.addEventListener("pagehide", function () {
    Z.persist();
  });
})();
