/**
 * ZENKAI — core
 *
 * Owns the user's log and everything derived from it:
 *   - state and storage     one JSON object in localStorage, migrated on load
 *   - the active plan       applyPlan() swaps the built plan into SZD for the rest of the app
 *   - daily numbers         totals, goals, XP, streaks, readiness, trends, real calorie burn
 *   - plan changes          setup(), reorder() for moved days, swapEx() for swapped exercises
 *   - food matching         parseMeal() turns "2 eggs and a chapati" into food entries
 *   - network helper        the only way the page reaches the web (through the Android bridge)
 *
 * Exposed as window.SZ.
 *
 * Author: Atharva Sail
 */
window.SZ = (function () {
  "use strict";
  var D = window.SZD,
    P = window.SZP;
  var NATIVE = !!window.SZNative;
  var KEY = "systemzero.v1";

  /* ---------- small helpers ---------- */
  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  // Date object to a local YYYY-MM-DD key.
  function ymd(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  // YYYY-MM-DD key to a local Date at midnight.
  function pd(s) {
    var a = s.split("-");
    return new Date(+a[0], +a[1] - 1, +a[2]);
  }
  // The date key n days after (or before) s.
  function addDays(s, n) {
    var d = pd(s);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  // Today's date key in local time.
  function today() {
    return ymd(new Date());
  }
  // Whole days from date a to date b.
  function diff(a, b) {
    return Math.round((pd(b).getTime() - pd(a).getTime()) / 864e5);
  }
  // Weekday key (mon … sun) for a date.
  function dk(s) {
    return D.DOW[pd(s).getDay()];
  }
  // The Monday that starts the week of a date.
  function monday(s) {
    var d = pd(s);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return ymd(d);
  }
  // Average of a list, or null when empty.
  function avg(a) {
    return a.length
      ? a.reduce(function (x, y) {
          return x + y;
        }, 0) / a.length
      : null;
  }
  // Round to a whole number.
  function r0(x) {
    return Math.round(x);
  }
  // Round to one decimal place.
  function r1(x) {
    return Math.round(x * 10) / 10;
  }
  // Whole number with Indian digit grouping (1,23,456).
  function nf(x) {
    return Math.round(x).toLocaleString("en-IN");
  }
  // Short random id for log entries.
  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }
  // Deep copy of plain JSON data.
  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }
  // Parse a typed number; empty or invalid gives null.
  function num(v) {
    if (v === "" || v == null) return null;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  /* ---------- state ---------- */
  function blank() {
    return {
      u: 0,
      w: null,
      waist: null,
      neck: null,
      hip: null,
      sleep: null,
      steps: null,
      water: 0,
      food: [],
      wo: null,
      energy: null,
      walk: false,
      note: ""
    };
  }
  var BLANK = Object.freeze({
    u: 0,
    w: null,
    waist: null,
    neck: null,
    hip: null,
    sleep: null,
    steps: null,
    water: 0,
    food: Object.freeze([]),
    wo: null,
    energy: null,
    walk: false,
    note: ""
  });
  // A fresh log for a first launch.
  function defaults() {
    return {
      v: 1,
      u: 0,
      profile: {
        name: "",
        sex: "m",
        goal: "fit",
        start: today(),
        startW: 70,
        goalW: 70,
        height: 170,
        age: 25,
        kcal: 2200,
        protein: 110,
        carbs: 275,
        fat: 60,
        fibre: 30,
        water: 2500,
        steps: 8000,
        sleep: 7,
        calcW: 70
      },
      prog: null,
      days: {},
      foods: [],
      meals: [],
      rem: {},
      chat: [],
      exnote: {},
      set: {
        sound: true,
        chk: 4,
        home: false,
        mode: "dark",
        acc: "sky",
        plan: "shape",
        text: "m",
        web: true,
        seen: false,
        fresh: false,
        v: 3,
        lastBackup: null,
        badges: []
      }
    };
  }
  // Validate and migrate a saved log into the current shape, filling anything missing.
  function adopt(raw) {
    var d = defaults();
    if (raw && typeof raw === "object" && raw.profile) {
      d.u = raw.u || 0;
      Object.assign(d.profile, raw.profile || {});
      // logs from before the personal setup carry no goal: read it from the weights
      if (!(raw.profile || {}).goal)
        d.profile.goal =
          d.profile.goalW < d.profile.startW - 0.4
            ? "lose"
            : d.profile.goalW > d.profile.startW + 0.4
              ? "gain"
              : "fit";
      d.prog =
        raw.prog &&
        typeof raw.prog === "object" &&
        raw.prog.split &&
        raw.prog.t &&
        raw.prog.a &&
        Array.isArray(raw.prog.meals)
          ? raw.prog
          : null;
      // a plan made by an older version is rebuilt from the same answers with the current rules; the log is untouched
      if (d.prog && (d.prog.v || 1) < 2) {
        try {
          var old = d.prog,
            ng = P.build(old.a),
            pf = d.profile;
          ng.at = old.at;
          d.prog = ng;
          d.set.rebuilt = true;
          if (pf)
            ["kcal", "protein", "carbs", "fat", "fibre", "water", "steps", "sleep"].forEach(function (k) {
              pf[k] = ng.t[k];
            });
        } catch (e) {
          d.prog = null;
        }
      }
      d.days = raw.days && typeof raw.days === "object" ? raw.days : {};
      Object.keys(d.days).forEach(function (k) {
        d.days[k] = Object.assign(blank(), d.days[k]);
        if (!Array.isArray(d.days[k].food)) d.days[k].food = [];
      });
      d.foods = Array.isArray(raw.foods) ? raw.foods : [];
      d.meals = Array.isArray(raw.meals) ? raw.meals : [];
      d.rem = raw.rem && typeof raw.rem === "object" ? raw.rem : {};
      d.chat = Array.isArray(raw.chat) ? raw.chat : [];
      d.exnote = raw.exnote && typeof raw.exnote === "object" ? raw.exnote : {};
      Object.assign(d.set, raw.set || {});
      delete d.set.apiKey;
      delete d.set.model;
      if ((raw.set || {}).v !== 3) {
        d.chat = [];
        d.set.v = 3;
      }
      d.chat = d.chat.filter(function (m) {
        return m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant");
      });
      if (!Array.isArray(d.set.badges)) d.set.badges = [];
      return d;
    }
    return null;
  }
  // Read the log from storage, falling back to a fresh one.
  function load() {
    var raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(KEY) || "null");
    } catch (e) {
      raw = null;
    }
    var d = adopt(raw);
    if (!d) {
      d = defaults();
      d.set.fresh = true;
      d.u = 1;
    } // nothing saved yet: the app opens on the setup questions
    return d;
  }
  var S = load();
  // The built-in day plan, routine and warm-up are the fallback; a personal plan replaces them.
  var BASE = { meals: D.MEALS, tt: D.TIMETABLE, rem: D.REM, warm: D.WARM, ex: {} };
  // Make the active plan (built or ready-made) the one the rest of the app reads from SZD.
  function applyPlan() {
    var g = S.prog,
      id;
    for (id in BASE.ex) Object.assign(D.EX[id], BASE.ex[id]);
    BASE.ex = {};
    if (g) {
      D.PLANS.custom = g.split;
      for (id in g.rx)
        if (D.EX[id]) {
          BASE.ex[id] = { sets: D.EX[id].sets, lo: D.EX[id].lo, hi: D.EX[id].hi, rest: D.EX[id].rest };
          Object.assign(D.EX[id], g.rx[id]);
        }
      // learning weeks: a beginner's first two weeks use two sets of everything
      if (learning())
        Object.keys(D.EX).forEach(function (k) {
          if (!BASE.ex[k])
            BASE.ex[k] = { sets: D.EX[k].sets, lo: D.EX[k].lo, hi: D.EX[k].hi, rest: D.EX[k].rest };
          D.EX[k].sets = Math.min(D.EX[k].sets, 2);
        });
      g.meals.forEach(function (m) {
        if (m.opts && m.opts.length) {
          m.pick = Math.min(m.pick || 0, m.opts.length - 1);
          m.plan = m.opts[m.pick].plan;
          m.dish = m.opts[m.pick].n;
          m.tip = m.opts[m.pick].tip;
        }
      });
    } else delete D.PLANS.custom;
    D.MEALS = g ? g.meals : BASE.meals;
    D.TIMETABLE = g ? g.tt : BASE.tt;
    D.REM = g ? g.rem : BASE.rem;
    D.WARM = g && g.warm ? g.warm : BASE.warm;
    D.SPLIT = D.PLANS[S.set.plan] || (g ? g.split : D.PLANS.shape);
  }
  // days since the plan was made, and whether a beginner is still in the two learning weeks
  function planAge() {
    var g = S.prog;
    if (!g || !g.at) return 99;
    return Math.round((new Date(today() + "T12:00:00") - new Date(g.at + "T12:00:00")) / 864e5);
  }
  // True during a beginner's first two weeks, when every exercise uses two sets.
  function learning() {
    return !!S.prog && S.prog.a.exp === "new" && planAge() < 14 && !S.set.nolearn;
  }
  // move sessions to other weekdays; the sessions themselves, the meals picked and the start date stay the same
  function reorder(order) {
    var g = S.prog;
    if (!g) return null;
    var a = JSON.parse(JSON.stringify(g.a));
    a.order = order.slice();
    a.days = P.DOWS.filter(function (d, i) {
      return order[i] >= 0;
    });
    var ng = P.build(a);
    if (!ng.a.order && order.join() !== P.orderOf(ng).join()) return null;
    return rebuilt(g, ng);
  }
  // put a rebuilt plan in place: same start date, same dishes picked, today's untouched session refreshed
  function rebuilt(g, ng) {
    ng.at = g.at;
    ng.meals.forEach(function (m) {
      var old = g.meals.filter(function (x) {
        return x.id === m.id;
      })[0];
      if (old && old.opts && m.opts) {
        var n = old.opts[old.pick || 0] && old.opts[old.pick || 0].n;
        m.opts.forEach(function (o, i) {
          if (o.n === n) m.pick = i;
        });
      }
    });
    S.prog = ng;
    applyPlan();
    var d = gd(today());
    if (
      d.wo &&
      !d.wo.fin &&
      !Object.keys(d.wo.sets || {}).some(function (k) {
        return d.wo.sets[k].some(function (x) {
          return x.d;
        });
      })
    )
      md(today()).wo = null;
    touchCore();
    return ng;
  }
  // swap one exercise for another: just for this day, or in the plan from now on
  function swapEx(dt, from, to, always) {
    if (!D.EX[to]) return false;
    var w = mwo(dt),
      i = w.ex.indexOf(from);
    if (i < 0 || w.ex.indexOf(to) >= 0) return false;
    if (
      (w.sets[from] || []).some(function (x) {
        return x.d;
      })
    )
      return false;
    w.ex[i] = to;
    delete w.sets[from];
    w.sets[to] = freshSets(to, dt);
    if (always && S.prog) {
      var a = JSON.parse(JSON.stringify(S.prog.a)),
        keep = JSON.parse(JSON.stringify(w));
      a.swaps = a.swaps || {};
      Object.keys(a.swaps).forEach(function (k) {
        if (a.swaps[k] === from) a.swaps[k] = to;
      }); // a swap of a swap points at the newest choice
      a.swaps[from] = to;
      rebuilt(S.prog, P.build(a));
      md(dt).wo = keep;
    }
    touchCore();
    return true;
  }
  // switch a meal to another of its dishes
  function pickDish(mid, i) {
    var g = S.prog;
    if (!g) return false;
    var m = g.meals.filter(function (x) {
      return x.id === mid;
    })[0];
    if (!m || !m.opts || !m.opts[i]) return false;
    m.pick = i;
    applyPlan();
    touchCore();
    return true;
  }
  applyPlan();
  /* ---------- the person and their week ---------- */
  function restK(k) {
    return !D.SPLIT[k].ex.length;
  }
  // a day with a logged session was a training day whatever the plan says now
  function rest(dt) {
    var d = S.days[dt];
    if (d && d.wo && d.wo.ex && d.wo.ex.length) return false;
    if (d && d.wo && d.wo.sets && Object.keys(d.wo.sets).length) return false;
    return restK(dk(dt));
  }
  // Training days a week in the active split.
  function planDays() {
    return Math.max(
      1,
      Object.keys(D.SPLIT).filter(function (k) {
        return !restK(k);
      }).length
    );
  }
  // lose, gain or hold, from the profile goal.
  function goalKind() {
    var g = S.profile.goal;
    return g === "lose" ? "lose" : g === "gain" ? "gain" : "hold";
  }
  // The user's day in minutes: wake, bed, training time, now.
  function clock() {
    var a = S.prog && S.prog.a,
      wake = a ? P.toMin(a.wake) : 300,
      bed = a ? P.toMin(a.bed) : 1320,
      wt = a ? P.toMin(a.wt) : 330,
      n = new Date(),
      now = n.getHours() * 60 + n.getMinutes();
    function since(m) {
      return (m - wake + 1440) % 1440;
    }
    return {
      wake: wake,
      bed: bed,
      wt: wt,
      now: now,
      up: since(now),
      awake: since(bed) || 960,
      train: since(wt),
      since: since
    };
  }
  // A meal's time in minutes after midnight.
  function mealMin(m) {
    if (m.h != null) return m.h;
    var x = /^(\d+):(\d\d) (AM|PM)$/.exec(m.t || "");
    return x ? ((+x[1] % 12) + (x[3] === "PM" ? 12 : 0)) * 60 + +x[2] : 720;
  }
  // answers for the setup screens, filled from whatever is already known
  function setupDraft() {
    if (S.prog) return P.clean(S.prog.a);
    var p = S.profile,
      a = P.blank(),
      tr = trend(),
      has = !S.set.fresh;
    if (has) {
      a.name = p.name || "";
      a.sex = p.sex || "m";
      a.age = p.age;
      a.h = p.height;
      a.w = tr.last != null ? r1(tr.last) : p.startW;
      a.goal = p.goal || "lose";
      a.goalW = p.goalW;
      a.days = Object.keys(D.SPLIT).filter(function (k) {
        return !restK(k);
      });
      a.wake = "05:00";
      a.bed = "22:00";
      a.wt = "05:30";
      a.meals = 5;
    }
    return a;
  }
  // build the plan from the answers and make it the active one
  function setup(answers) {
    var g = P.build(answers),
      p = S.profile,
      t = g.t,
      td = today(),
      was = goalKind();
    var used = Object.keys(S.days).some(function (k) {
      var d = S.days[k];
      return d.food.length || d.wo || d.w != null;
    });
    p.name = g.a.name;
    p.sex = g.a.sex;
    p.age = g.a.age;
    p.height = g.a.h;
    p.goal = t.goal;
    if (!used) p.start = td;
    if (!used || goalKind() !== was) p.startW = g.a.w; // a new direction starts from today's weight
    p.goalW = t.goalW;
    p.calcW = g.a.w;
    ["kcal", "protein", "carbs", "fat", "fibre", "water", "steps", "sleep"].forEach(function (k) {
      p[k] = t[k];
    });
    g.at = td;
    S.prog = g;
    S.set.plan = "custom";
    S.set.fresh = false;
    var d = md(td);
    if (d.w == null) d.w = g.a.w;
    Object.keys(S.rem).forEach(function (id) {
      if (S.rem[id]) S.rem[id].t = null;
    }); // reminder times follow the new routine; on and off stay
    applyPlan();
    if (
      d.wo &&
      !d.wo.fin &&
      !Object.keys(d.wo.sets).some(function (k) {
        return d.wo.sets[k].some(function (x) {
          return x.d;
        });
      })
    )
      d.wo = null;
    touchCore();
    return g;
  }
  var saveT = null,
    gen = 0,
    cache = {};
  // results of the heavier sums are kept until the next change to the log
  function memo(k, fn) {
    var key = k + "|" + today(),
      c = cache[key];
    if (c && c.g === gen) return c.v;
    var v = fn();
    cache[key] = { g: gen, v: v };
    return v;
  }
  // Write the log to storage now.
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      /* storage may be unavailable */
    }
  }
  // Mark the log changed and write it shortly after.
  function save() {
    gen++;
    clearTimeout(saveT);
    saveT = setTimeout(persist, 120);
  }
  // A day for reading (never creates it).
  function gd(dt) {
    return S.days[dt] || BLANK;
  }
  // A day for writing (creates it if needed).
  function md(dt) {
    var d = S.days[dt];
    if (!d) d = S.days[dt] = blank();
    d.u = Date.now();
    save();
    return d;
  }
  // Mark the log changed after editing something outside a day.
  function touchCore() {
    S.u = Date.now();
    save();
  }
  // Replace the whole log, as when restoring a backup.
  function replaceAll(raw) {
    var d = adopt(raw);
    if (!d) return false;
    d.u = Date.now();
    S = d;
    gen++;
    applyPlan();
    persist();
    return true;
  }
  // Erase the log.
  function resetAll() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
    S = load();
    S.u = Date.now();
    gen++;
    applyPlan();
    persist();
  }
  // Whether a food idea suits the user's diet and avoid list.
  function okIdea(text) {
    var a = S.prog && S.prog.a;
    if (!a) return true;
    var t = text.toLowerCase(),
      no = [];
    if (a.diet !== "nonveg") no.push("chicken", "fish");
    if (a.diet === "veg" || a.diet === "vegan") no.push("egg");
    if (a.diet === "vegan" || a.avoid.indexOf("dairy") >= 0) no.push("milk", "dahi", "paneer");
    if (a.avoid.indexOf("soy") >= 0) no.push("soya", "tofu");
    if (a.avoid.indexOf("nuts") >= 0) no.push("peanut", "almond");
    if (a.avoid.indexOf("gluten") >= 0) no.push("chapati", "oats", "bread");
    return !no.some(function (w) {
      return t.indexOf(w) >= 0;
    });
  }

  /* ---------- food ---------- */
  function allFoods() {
    return S.foods.concat(D.FOODS);
  }
  // Find a food by id in the user's foods or the built-in table.
  function foodById(id) {
    var a = allFoods();
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  }
  // Calories and macros eaten on a date.
  function tot(dt) {
    var t = { k: 0, p: 0, c: 0, f: 0, fb: 0 };
    gd(dt).food.forEach(function (x) {
      t.k += x.k * x.q;
      t.p += x.p * x.q;
      t.c += x.c * x.q;
      t.f += x.f * x.q;
      t.fb += (x.fb || 0) * x.q;
    });
    return t;
  }
  // Log a food on a date.
  function addFood(dt, meal, f, q, est) {
    md(dt).food.push({
      id: uid(),
      fid: f.id || null,
      n: f.n,
      u: f.u,
      q: q,
      k: +f.k || 0,
      p: +f.p || 0,
      c: +f.c || 0,
      f: +f.f || 0,
      fb: +f.fb || 0,
      m: meal,
      e: est ? 1 : 0
    });
  }
  // Calories and macros of the planned day of eating.
  function planTotals() {
    var t = { k: 0, p: 0, c: 0, f: 0, fb: 0 };
    D.MEALS.forEach(function (m) {
      m.plan.forEach(function (it) {
        var f = foodById(it[0]);
        t.k += f.k * it[1];
        t.p += f.p * it[1];
        t.c += f.c * it[1];
        t.f += f.f * it[1];
        t.fb += f.fb * it[1];
      });
    });
    return t;
  }
  // Food ideas that fit the calories and protein left today.
  function suggest(remK, remP) {
    var cap = Math.max(remK + 120, 200);
    return D.IDEAS.filter(function (i) {
      return i[1] <= cap && i[2] <= remP + 15 && okIdea(i[0]);
    })
      .sort(function (a, b) {
        return b[2] / b[1] - a[2] / a[1];
      })
      .slice(0, 2)
      .map(function (i) {
        return i[0] + " (~" + i[1] + " kcal, " + i[2] + " g protein)";
      });
  }

  /* ---------- training ---------- */
  function lastSession(ex, dt) {
    var keys = Object.keys(S.days)
      .filter(function (k) {
        return k < dt;
      })
      .sort()
      .reverse();
    for (var i = 0; i < keys.length; i++) {
      var w = S.days[keys[i]].wo;
      if (w && w.sets && w.sets[ex]) {
        var done = w.sets[ex].filter(function (s) {
          return s.d;
        });
        if (done.length) return { date: keys[i], sets: done };
      }
    }
    return null;
  }
  // Empty sets for an exercise, prefilled from the last session.
  function freshSets(id, dt) {
    var L = lastSession(id, dt),
      e = D.EX[id],
      arr = [];
    for (var i = 0; i < e.sets; i++) {
      var prev = L && L.sets[Math.min(i, L.sets.length - 1)];
      arr.push({ w: prev && prev.w !== "" && prev.w != null ? prev.w : "", r: "", d: false });
    }
    return arr;
  }
  // The workout record for a date, created on first use.
  function mwo(dt) {
    var d = md(dt);
    // each session remembers the plan it was done on, so old logs stay right after a plan change
    if (!d.wo)
      d.wo = {
        k: dk(dt),
        plan: S.set.plan,
        focus: D.SPLIT[dk(dt)].focus,
        ex: D.SPLIT[dk(dt)].ex.slice(),
        fz0: D.SPLIT[dk(dt)].fin || null,
        sets: {},
        warm: false,
        fz: false,
        cool: false,
        fin: false,
        t0: null,
        t1: null
      };
    dayEx(dt).forEach(function (id) {
      if (!d.wo.sets[id]) d.wo.sets[id] = freshSets(id, dt);
    });
    return d.wo;
  }
  // Exercises for a date: the logged session if there is one, otherwise the plan.
  function dayEx(dt) {
    var w = (S.days[dt] || {}).wo;
    if (w && w.ex) return w.ex;
    if (w && w.sets && Object.keys(w.sets).length)
      return Object.keys(w.sets).filter(function (id) {
        return D.EX[id];
      });
    return D.SPLIT[dk(dt)].ex;
  }
  // Name of the session on a date.
  function dayFocus(dt) {
    var w = (S.days[dt] || {}).wo;
    return (w && w.focus) || D.SPLIT[dk(dt)].focus;
  }
  // Switch to a ready-made plan.
  function setPlan(id) {
    if (!D.PLANS[id] || id === S.set.plan) return false;
    S.set.plan = id;
    applyPlan();
    var td = today(),
      d = S.days[td];
    if (
      d &&
      d.wo &&
      !d.wo.fin &&
      !Object.keys(d.wo.sets).some(function (k) {
        return d.wo.sets[k].some(function (x) {
          return x.d;
        });
      })
    )
      d.wo = null;
    touchCore();
    return true;
  }
  // Sets to show for an exercise on a date.
  function viewSets(dt, id) {
    var w = gd(dt).wo;
    return w && w.sets && w.sets[id] ? w.sets[id] : freshSets(id, dt);
  }
  // Target reps as text, e.g. 8–12 or 30–45 sec.
  function repTxt(e) {
    return e.lo + "–" + e.hi + (e.unit === "sec" ? " sec" : "") + (e.each ? " each " + e.each : "");
  }
  // One-line suggestion for today's weight and reps, from the last session.
  function hint(id, dt) {
    var e = D.EX[id],
      L = lastSession(id, dt);
    if (!L)
      return (
        "First time here: choose a weight you could lift for " +
        (e.hi + 3) +
        " reps and stop at " +
        e.lo +
        "–" +
        e.hi +
        ". Light is right this week."
      );
    var top =
      L.sets.length >= e.sets &&
      L.sets.every(function (s) {
        return +s.r >= e.hi;
      });
    var w = Math.max.apply(
      null,
      L.sets.map(function (s) {
        return +s.w || 0;
      })
    );
    var was = L.sets
      .map(function (s) {
        return (s.w !== "" && s.w != null ? s.w + "×" : "") + s.r;
      })
      .join(", ");
    var when = diff(L.date, dt) + " d ago";
    if (e.unit === "sec")
      return (
        "Last (" +
        when +
        "): " +
        was +
        " sec. " +
        (top ? "All holds hit " + e.hi + " s: add 5 seconds." : "Match it, then add a few seconds.")
      );
    if (top)
      return (
        "Last (" +
        when +
        "): " +
        was +
        ". All sets hit " +
        e.hi +
        " reps. " +
        (w
          ? "Go up by the smallest step (about " +
            r1(w + 2.5) +
            " kg or the next dumbbell) and drop back to " +
            e.lo +
            " reps."
          : "Add a 2-second pause at the top, or hold a light dumbbell.")
      );
    return "Last (" + when + "): " + was + ". Same weight today; beat it by 1 rep on any set.";
  }
  // Sets done, total sets and volume moved on a date.
  function woStats(dt) {
    var done = 0,
      total = 0,
      vol = 0,
      k = dk(dt);
    dayEx(dt).forEach(function (id) {
      if (((gd(dt).wo || {}).skip || {})[id]) return;
      var sets = viewSets(dt, id);
      total += sets.length;
      sets.forEach(function (s) {
        if (s.d) {
          done++;
          vol += (+s.w || 0) * (+s.r || 0);
        }
      });
    });
    return { done: done, total: total, vol: vol };
  }
  // Every logged session of an exercise, oldest first.
  function exHistory(id) {
    var out = [];
    Object.keys(S.days)
      .sort()
      .forEach(function (dt) {
        var w = S.days[dt].wo;
        if (!w || !w.sets || !w.sets[id]) return;
        var done = w.sets[id].filter(function (s) {
          return s.d && +s.r > 0;
        });
        if (!done.length) return;
        var best = 0,
          bw = 0,
          br = 0,
          vol = 0;
        done.forEach(function (s) {
          var ww = +s.w || 0,
            rr = +s.r || 0,
            e = ww > 0 ? ww * (1 + rr / 30) : rr;
          vol += ww * rr;
          if (e > best) {
            best = e;
            bw = ww;
            br = rr;
          }
        });
        out.push({ dt: dt, e1: best, w: bw, r: br, vol: vol, sets: done.length });
      });
    return out;
  }

  /* ---------- quests, xp, streak ---------- */
  function quests(dt) {
    var p = S.profile,
      d = gd(dt),
      t = tot(dt),
      k = dk(dt),
      sun = rest(dt),
      ws = sun ? null : woStats(dt);
    return [
      sun
        ? {
            id: "train",
            label: "Rest day: 30-minute easy walk",
            sub: d.walk ? "Done" : "Outdoors if you can",
            done: !!d.walk,
            xp: 40
          }
        : {
            id: "train",
            label: "Training: " + dayFocus(dt),
            sub: d.wo && d.wo.fin ? "Session complete" : ws.done + " / " + ws.total + " sets logged",
            done: !!(d.wo && d.wo.fin),
            xp: 40
          },
      {
        id: "protein",
        label: "Protein " + (p.protein - 10) + " g or more",
        sub: r0(t.p) + " / " + p.protein + " g",
        done: t.p >= p.protein - 10,
        xp: 25
      },
      {
        id: "kcal",
        label: "Calories " + nf(p.kcal - 200) + "–" + nf(p.kcal + 150),
        sub: nf(t.k) + " kcal logged",
        done: t.k >= p.kcal - 200 && t.k <= p.kcal + 150,
        xp: 20
      },
      {
        id: "steps",
        label: nf(p.steps) + " steps",
        sub: d.steps != null ? nf(d.steps) + " steps" : "Not logged",
        done: d.steps != null && d.steps >= p.steps,
        xp: 15
      },
      {
        id: "water",
        label: r1(p.water / 1000) + " L water",
        sub: r1((d.water || 0) / 1000) + " L so far",
        done: (d.water || 0) >= p.water,
        xp: 10
      },
      {
        id: "sleep",
        label: p.sleep + " hours of sleep",
        sub: d.sleep != null ? d.sleep + " h last night" : "Not logged",
        done: d.sleep != null && d.sleep >= p.sleep,
        xp: 20
      },
      {
        id: "weigh",
        label: "Morning weigh-in",
        sub: d.w != null ? d.w + " kg" : "Not logged",
        done: d.w != null,
        xp: 10
      }
    ];
  }
  // How many daily goals are done on a date.
  function doneCount(dt) {
    return quests(dt).filter(function (q) {
      return q.done;
    }).length;
  }
  // XP earned on a date.
  function dayXP(dt) {
    return quests(dt).reduce(function (a, q) {
      return a + (q.done ? q.xp : 0);
    }, 0);
  }
  var RANKS = [
    [25, "S"],
    [15, "A"],
    [10, "B"],
    [6, "C"],
    [3, "D"],
    [1, "E"]
  ];
  // Rank letter for a level.
  function rank(lv) {
    for (var i = 0; i < RANKS.length; i++)
      if (lv >= RANKS[i][0]) return { r: RANKS[i][1], next: i ? RANKS[i - 1][0] : null };
    return { r: "E", next: 3 };
  }
  // Current level and XP (cached).
  function level() {
    return memo("lv", level0);
  }
  // Level and XP from every day in the log.
  function level0() {
    var xp = 0;
    Object.keys(S.days).forEach(function (k) {
      xp += dayXP(k);
    });
    var lv = Math.floor(xp / 500) + 1;
    var title = lv >= 21 ? "ROOT" : lv >= 11 ? "ADMIN" : lv >= 6 ? "OPERATOR" : lv >= 3 ? "USER" : "BOOT";
    return { lv: lv, xp: xp, into: xp % 500, need: 500, title: title };
  }
  // Days in a row with at least four goals done (cached).
  function streak() {
    return memo("st", streak0);
  }
  // Counts the streak.
  function streak0() {
    var n = 0,
      dt = today();
    if (doneCount(dt) < 4) dt = addDays(dt, -1);
    while (S.days[dt] && doneCount(dt) >= 4) {
      n++;
      dt = addDays(dt, -1);
    }
    return n;
  }

  /* ---------- weeks and trend ---------- */
  function weeks() {
    return memo("wk", weeks0);
  }
  // Builds the weekly summaries.
  function weeks0() {
    var g = {};
    Object.keys(S.days)
      .sort()
      .forEach(function (dt) {
        var d = S.days[dt],
          k = monday(dt),
          w = g[k] || (g[k] = { ws: [], kc: [], pr: [], sl: [], st: [], sess: 0 });
        if (d.w != null) w.ws.push(d.w);
        if (d.food.length) {
          var t = tot(dt);
          w.kc.push(t.k);
          w.pr.push(t.p);
        }
        if (d.sleep != null) w.sl.push(d.sleep);
        if (d.steps != null) w.st.push(d.steps);
        if (d.wo && d.wo.fin) w.sess++;
      });
    return Object.keys(g)
      .sort()
      .map(function (k) {
        var w = g[k];
        return {
          k: k,
          n: w.ws.length,
          w: avg(w.ws),
          kcal: avg(w.kc),
          p: avg(w.pr),
          sleep: avg(w.sl),
          steps: avg(w.st),
          sess: w.sess
        };
      });
  }
  // Weekly-average weight trend (cached).
  function trend() {
    return memo("tr", trend0);
  }
  // Computes the weight trend from weekly averages.
  function trend0() {
    var wk = weeks().filter(function (w) {
      return w.w != null;
    });
    if (!wk.length) return { n: 0, rate: null, last: null, solid: false };
    var a = wk[wk.length - 1];
    if (wk.length < 2) return { n: 1, rate: null, last: a.w, solid: false };
    var b = wk[Math.max(0, wk.length - 3)],
      span = diff(b.k, a.k) / 7;
    return { n: wk.length, rate: span > 0 ? (b.w - a.w) / span : null, last: a.w, solid: wk.length >= 3 };
  }
  // The last n values of something, one per day.
  function lastN(n, fn, dt) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var k = addDays(dt, -i),
        v = S.days[k] ? fn(S.days[k], k) : null;
      if (v != null) out.push(v);
    }
    return out;
  }

  /* ---------- Readiness, next step, personal bests, weekly review ---------- */
  function readiness(dt) {
    var p = S.profile,
      d = gd(dt),
      yk = addDays(dt, -1),
      y = S.days[yk];
    var sp = d.sleep == null ? 27 : Math.max(0, Math.min(1, d.sleep / p.sleep)) * 45;
    var fu = 15;
    if (y && y.food.length) {
      var t = tot(yk);
      fu = Math.min(1, t.p / p.protein) * 15 + (t.k >= p.kcal - 450 ? 10 : 4);
    }
    var en = d.energy == null ? 18 : [0, 6, 12, 18, 24, 30][d.energy];
    var score = Math.round(sp + fu + en),
      known = (d.sleep != null ? 1 : 0) + (d.energy != null ? 1 : 0),
      label,
      tip;
    if (!known) {
      label = "Log to sharpen this";
      tip = "Add last night's sleep and your energy below. The score uses them.";
    } else if (score >= 78) {
      label = "Ready to push";
      tip = "Well recovered. Go for one more rep, or the next weight, on your first exercise.";
    } else if (score >= 58) {
      label = "Train as planned";
      tip = "Normal session. Leave 1–3 reps in the tank on every set.";
    } else {
      label = "Go lighter today";
      tip = "Short on recovery. Use about 10% less weight, stop 3 reps before failure, and get to bed early.";
    }
    return {
      score: score,
      label: label,
      tip: tip,
      known: known,
      parts: [
        ["Sleep", sp, 45],
        ["Fuel", fu, 25],
        ["Energy", en, 30]
      ]
    };
  }
  // The single most useful thing to do now, given the time of day and what is already logged.
  function nextAction(dt) {
    if (dt !== today()) return null;
    var p = S.profile,
      d = gd(dt),
      k = dk(dt),
      c = clock(),
      off = rest(dt),
      i;
    if (d.w == null && c.up < 420)
      return {
        title: "Step on the scale",
        text: "Morning weigh-in: after the toilet, before food.",
        btn: "Log weight",
        act: "log",
        arg: "w"
      };
    if (d.sleep == null)
      return {
        title: "Log last night's sleep",
        text: "It drives today's readiness score.",
        btn: "Log sleep",
        act: "log",
        arg: "sleep"
      };
    if (!off && !(d.wo && d.wo.fin) && c.up >= c.train - 60 && c.up < c.train + 240) {
      var ws = woStats(dt);
      return {
        title: (ws.done ? "Continue your " : "Start your ") + dayFocus(dt).toLowerCase() + " session",
        text: ws.done + " of " + ws.total + " sets logged.",
        btn: "Open training",
        act: "tab",
        arg: "train"
      };
    }
    if (off && !d.walk && c.up >= 120)
      return {
        title: "Rest-day walk",
        text: "30 minutes at an easy pace.",
        btn: "Mark it done",
        act: "walk"
      };
    var due = D.MEALS.filter(function (m) {
      return m.plan.length;
    })
      .map(function (m) {
        return [m.id, c.since(mealMin(m)), m.n.toLowerCase()];
      })
      .sort(function (x, y) {
        return x[1] - y[1];
      });
    for (i = 0; i < due.length; i++)
      if (
        c.up >= due[i][1] - 15 &&
        !d.food.some(function (x) {
          return x.m === due[i][0];
        })
      )
        return {
          title: "Log " + due[i][2],
          text:
            "One tap adds your planned " + due[i][2] + ". Change the amounts after if you ate differently.",
          btn: "Log plan",
          act: "logplan",
          arg: due[i][0]
        };
    var expect = p.water * Math.max(0, Math.min(1, (c.up - 30) / Math.max(300, c.awake - 120)));
    if ((d.water || 0) < expect - 400)
      return {
        title: "Drink water",
        text: r1((p.water - (d.water || 0)) / 1000) + " L still to go today.",
        btn: "+250 ml",
        act: "water",
        arg: "250"
      };
    if (!off && !(d.wo && d.wo.fin) && c.up >= c.train - 60)
      return {
        title: "Log today's training",
        text: "If you trained, tick your sets. If you missed it, carry on with the plan tomorrow.",
        btn: "Open training",
        act: "tab",
        arg: "train"
      };
    if (d.steps == null && c.up >= c.awake - 180)
      return {
        title: "Log your steps",
        text: "Check your phone's step counter.",
        btn: "Log steps",
        act: "log",
        arg: "steps"
      };
    if (c.up >= c.awake - 60)
      return {
        title: "Wind down",
        text:
          "Screens away. Lights out at " +
          P.t12(P.hhmm(c.bed)) +
          " gives you " +
          r1((1440 - c.awake) / 60) +
          " hours of sleep.",
        btn: "Timetable",
        act: "system",
        arg: "tt"
      };
    return {
      title: "All caught up",
      text: "Nothing pending right now.",
      btn: "See progress",
      act: "tab",
      arg: "stats"
    };
  }
  // Best set per exercise (cached).
  function prs() {
    return memo("pr", prs0);
  }
  // Finds the best set per exercise.
  function prs0() {
    var out = {};
    Object.keys(D.EX).forEach(function (id) {
      var h = exHistory(id);
      if (!h.length) return;
      var b = h[0];
      h.forEach(function (x) {
        if (x.e1 > b.e1) b = x;
      });
      out[id] = b;
    });
    return out;
  }
  // True when a date holds a new best for an exercise.
  function isPR(id, dt) {
    var cur = null,
      prev = 0;
    exHistory(id).forEach(function (x) {
      if (x.dt === dt) cur = x;
      else if (x.dt < dt && x.e1 > prev) prev = x.e1;
    });
    return !!(cur && prev > 0 && cur.e1 > prev + 0.01);
  }
  // Score out of 100 for a week: training, protein, sleep, steps.
  function weekScore(w) {
    var p = S.profile,
      a = Math.min(1, w.sess / planDays()) * 35,
      b = w.p != null ? Math.min(1, w.p / p.protein) * 25 : 0,
      c = w.sleep != null ? Math.min(1, w.sleep / p.sleep) * 20 : 0,
      e = w.steps != null ? Math.min(1, w.steps / p.steps) * 20 : 0;
    return {
      total: Math.round(a + b + c + e),
      parts: [
        ["Training", a, 35],
        ["Protein", b, 25],
        ["Sleep", c, 20],
        ["Steps", e, 20]
      ]
    };
  }
  // This week compared with the last.
  function weekReview() {
    var wk = weeks(),
      mk = monday(today()),
      cur = null,
      prev = null,
      p = S.profile,
      L = [];
    wk.forEach(function (w) {
      if (w.k === mk) cur = w;
      if (w.k === addDays(mk, -7)) prev = w;
    });
    if (!cur) cur = { k: mk, n: 0, w: null, kcal: null, p: null, sleep: null, steps: null, sess: 0 };
    var sc = weekScore(cur);
    L.push("Training: " + cur.sess + " of " + planDays() + " sessions done.");
    if (cur.w != null && prev && prev.w != null) {
      var ch = cur.w - prev.w;
      L.push(
        "Weight: weekly average " +
          r1(cur.w) +
          " kg, " +
          (Math.abs(ch) < 0.05
            ? "level with"
            : ch < 0
              ? "down " + r1(-ch) + " kg on"
              : "up " + r1(ch) + " kg on") +
          " last week."
      );
    } else if (cur.w != null)
      L.push(
        "Weight: weekly average " +
          r1(cur.w) +
          " kg from " +
          cur.n +
          " weigh-in" +
          (cur.n > 1 ? "s" : "") +
          "."
      );
    else L.push("Weight: no weigh-ins yet this week.");
    L.push(
      cur.kcal != null
        ? "Fuel: " +
            nf(cur.kcal) +
            " kcal and " +
            r0(cur.p) +
            " g protein a day on logged days (targets " +
            nf(p.kcal) +
            " and " +
            p.protein +
            ")."
        : "Fuel: no meals logged yet this week."
    );
    L.push(
      cur.sleep != null
        ? "Sleep: " + r1(cur.sleep) + " h average (target " + p.sleep + ")."
        : "Sleep: not logged yet this week."
    );
    L.push(
      cur.steps != null
        ? "Steps: " + nf(cur.steps) + " a day (target " + nf(p.steps) + ")."
        : "Steps: not logged yet this week."
    );
    var weak = sc.parts.slice().sort(function (x, y) {
      return x[1] / x[2] - y[1] / y[2];
    })[0][0];
    var focus = {
      Training: "get every session in, even a short one. Consistency beats intensity.",
      Protein: "eat the protein on your plate first at every meal, and log it.",
      Sleep: "bring bedtime forward by 30 minutes. It is your biggest free gain.",
      Steps: "add a 15-minute walk after dinner."
    }[weak];
    return { score: sc, lines: L, focus: weak + ": " + focus, week: cur };
  }
  // Foods logged recently, newest first.
  function recentFoods(n) {
    var seen = {},
      out = [],
      keys = Object.keys(S.days).sort().reverse();
    for (var i = 0; i < keys.length; i++) {
      var f = S.days[keys[i]].food;
      for (var j = f.length - 1; j >= 0; j--) {
        var key = f[j].n + "|" + f[j].u;
        if (!seen[key]) {
          seen[key] = 1;
          out.push(f[j]);
          if (out.length >= n) return out;
        }
      }
    }
    return out;
  }
  // Copy a meal from one date to another.
  function copyMeal(from, to, meal) {
    var src = gd(from).food.filter(function (x) {
      return x.m === meal;
    });
    src.forEach(function (x) {
      addFood(to, meal, { id: x.fid, n: x.n, u: x.u, k: x.k, p: x.p, c: x.c, f: x.f, fb: x.fb }, x.q, !!x.e);
    });
    return src.length;
  }
  // Weight milestones between the start and the goal.
  function milestones() {
    var p = S.profile,
      tr = trend(),
      cur = tr.last != null ? tr.last : p.startW,
      out = [],
      w;
    if (p.goalW < p.startW - 0.4) {
      for (w = p.startW - 3; w > p.goalW + 0.5; w -= 3)
        out.push({ w: Math.round(w * 10) / 10, hit: cur <= w });
      out.push({ w: p.goalW, hit: cur <= p.goalW });
    } else if (p.goalW > p.startW + 0.4) {
      for (w = p.startW + 2; w < p.goalW - 0.5; w += 2)
        out.push({ w: Math.round(w * 10) / 10, hit: cur >= w });
      out.push({ w: p.goalW, hit: cur >= p.goalW });
    }
    return out;
  }

  /* ---------- offline coach ---------- */
  function insights(dt) {
    var out = [],
      p = S.profile,
      d = gd(dt),
      t = tot(dt),
      isToday = dt === today(),
      k = dk(dt);
    var sl = lastN(
        7,
        function (x) {
          return x.sleep;
        },
        dt
      ),
      sa = avg(sl);
    if (sl.length >= 2 && sa < 6)
      out.push({
        tone: "bad",
        tag: "SLEEP",
        title: "Averaging " + r1(sa) + " h of sleep",
        text:
          (goalKind() === "lose"
            ? "On a calorie cut, short sleep moves weight loss away from fat and towards muscle. "
            : "Short sleep slows recovery and makes training feel harder. ") +
          "Bring bedtime forward by 30 minutes this week."
      });
    else if (sl.length >= 2 && sa < p.sleep)
      out.push({
        tone: "warn",
        tag: "SLEEP",
        title: "Averaging " + r1(sa) + " h of sleep",
        text: "Close, but still under " + p.sleep + " h. Screens away half an hour before bed."
      });
    else if (sl.length >= 3)
      out.push({
        tone: "good",
        tag: "SLEEP",
        title: "Sleep on target: " + r1(sa) + " h average",
        text: "This protects muscle and keeps hunger down."
      });
    else if (isToday && d.sleep == null)
      out.push({
        tone: "info",
        tag: "LOG",
        title: "Log last night's sleep",
        text: "Sleep drives recovery, hunger and today's readiness score. Tracking it is step one."
      });

    var tr = trend();
    if (tr.rate == null)
      out.push({
        tone: "info",
        tag: "WEIGHT",
        title: "Building your baseline",
        text: "Weigh every morning after the toilet. After 2–3 weeks the weekly average shows the real trend; single days jump with water and salt."
      });
    else {
      var gk = goalKind(),
        up = -tr.rate,
        fast = Math.max(0.5, tr.last * 0.01),
        mv = (up >= 0 ? "+" : "−") + r1(Math.abs(up)) + " kg per week";
      if (gk === "lose") {
        if (tr.rate > fast)
          out.push({
            tone: "bad",
            tag: "WEIGHT",
            title: "Losing too fast: " + r1(tr.rate) + " kg per week",
            text: "More than 1% of your weight a week risks muscle. Add 150–200 kcal a day and keep protein up."
          });
        else if (tr.rate >= 0.2)
          out.push({
            tone: "good",
            tag: "WEIGHT",
            title: "On track: " + r1(tr.rate) + " kg per week",
            text: "Weekly average is " + r1(tr.last) + " kg. Change nothing."
          });
        else if (tr.solid)
          out.push({
            tone: "warn",
            tag: "WEIGHT",
            title: "Weight is flat (" + mv + ")",
            text:
              "First check the log is honest: cooking oil, snacks, weekends, and your " +
              nf(p.steps) +
              " steps. If all true for 2 more weeks, drop about 150–200 kcal a day."
          });
        else
          out.push({
            tone: "info",
            tag: "WEIGHT",
            title: "Early trend: " + mv,
            text: "Two weeks of data is not enough to change the plan. Keep logging."
          });
      } else if (gk === "gain") {
        if (up > Math.max(0.4, tr.last * 0.006))
          out.push({
            tone: "warn",
            tag: "WEIGHT",
            title: "Gaining fast: " + r1(up) + " kg per week",
            text: "Beyond about half a percent of your weight a week, most of the extra is fat. Take 150–200 kcal a day off."
          });
        else if (up >= 0.1)
          out.push({
            tone: "good",
            tag: "WEIGHT",
            title: "On track: +" + r1(up) + " kg per week",
            text: "Weekly average is " + r1(tr.last) + " kg. Keep eating and keep adding weight to the bar."
          });
        else if (tr.solid)
          out.push({
            tone: "warn",
            tag: "WEIGHT",
            title: "Weight is not moving (" + mv + ")",
            text: "To grow you have to eat above what you burn. Add about 200 kcal a day: a glass of milk and a banana, or an extra roti with ghee."
          });
        else
          out.push({
            tone: "info",
            tag: "WEIGHT",
            title: "Early trend: " + mv,
            text: "Two weeks of data is not enough to change the plan. Keep logging."
          });
      } else {
        if (Math.abs(up) <= 0.25)
          out.push({
            tone: "good",
            tag: "WEIGHT",
            title: "Weight is steady: " + r1(tr.last) + " kg",
            text: "That is the aim. Let the training and protein do the reshaping."
          });
        else if (tr.solid)
          out.push({
            tone: "warn",
            tag: "WEIGHT",
            title: "Weight is drifting " + (up > 0 ? "up" : "down") + " (" + mv + ")",
            text:
              (up > 0 ? "Trim" : "Add") +
              " about 150 kcal a day to hold steady, or change your goal in Menu → Personal setup if this is what you want."
          });
        else
          out.push({
            tone: "info",
            tag: "WEIGHT",
            title: "Early trend: " + mv,
            text: "Two weeks of data is not enough to change the plan. Keep logging."
          });
      }
    }

    if (isToday) {
      var remP = p.protein - t.p,
        remK = p.kcal - t.k;
      if (!d.food.length) {
        if (clock().up >= 180)
          out.push({
            tone: "info",
            tag: "FUEL",
            title: "No food logged yet today",
            text: "Open Food and tap Log plan under a meal, or type what you ate."
          });
      } else if (t.k > p.kcal + 150)
        out.push({
          tone: "warn",
          tag: "FUEL",
          title: nf(t.k - p.kcal) + " kcal over target",
          text: "No need to punish yourself tomorrow. Keep the next meal to protein and vegetables and carry on."
        });
      else if (remP > 15) {
        var s = suggest(remK, remP);
        out.push({
          tone: clock().up >= clock().awake - 240 ? "warn" : "info",
          tag: "FUEL",
          title: r0(remP) + " g protein still to go",
          text:
            (remK > 0 ? nf(remK) + " kcal left. " : "Calories are used up, so pick lean protein. ") +
            (s.length ? "Try " + s.join(", or ") + "." : "")
        });
      } else
        out.push({
          tone: "good",
          tag: "FUEL",
          title: "Protein target reached",
          text: nf(t.k) + " kcal and " + r0(t.p) + " g protein logged."
        });
      if (!rest(dt) && !(d.wo && d.wo.fin) && clock().up >= clock().train + 150 && woStats(dt).done === 0)
        out.push({
          tone: "warn",
          tag: "TRAIN",
          title: "Today's " + dayFocus(dt).toLowerCase() + " session is not logged",
          text: "If you trained, log it in Train. If you missed it, do not double up tomorrow; carry on with the plan."
        });
    }
    var kc = lastN(
        7,
        function (x, kk) {
          return x.food.length ? tot(kk).k : null;
        },
        dt
      ),
      ka = avg(kc);
    if (kc.length >= 4 && ka < p.kcal - 450)
      out.push({
        tone: "warn",
        tag: "FUEL",
        title: "Eating too little: " + nf(ka) + " kcal a day",
        text:
          (goalKind() === "gain"
            ? "You cannot build muscle this far under your target. "
            : "Eating this far under your target costs muscle and training strength. ") +
          "Bring it up towards " +
          nf(p.kcal) +
          " kcal. If you simply forgot to log meals, ignore this."
      });
    var pr = lastN(
        7,
        function (x, kk) {
          return x.food.length ? tot(kk).p : null;
        },
        dt
      ),
      pa = avg(pr);
    if (pr.length >= 4 && pa < p.protein - 25)
      out.push({
        tone: "warn",
        tag: "FUEL",
        title: "Protein averaging " + r0(pa) + " g",
        text:
          "Target is " +
          p.protein +
          " g. Easiest fix: a bigger portion of the protein food at two meals. " +
          (function () {
            var s = suggest(400, 30);
            return s.length ? "For example " + s[0] + "." : "";
          })()
      });
    var st = lastN(
        7,
        function (x) {
          return x.steps;
        },
        dt
      ),
      sta = avg(st);
    if (st.length >= 3 && sta < p.steps * 0.7)
      out.push({
        tone: "warn",
        tag: "STEPS",
        title: "Steps averaging " + nf(sta),
        text: "Daily walking burns more across a week than any gym finisher. Add a 15-minute walk after dinner."
      });
    if (tr.last != null && Math.abs((p.calcW || p.startW) - tr.last) >= 4)
      out.push({
        tone: "info",
        tag: "FUEL",
        title: "Time to recalculate your targets",
        text:
          "Your weight has changed by " +
          r1(Math.abs((p.calcW || p.startW) - tr.last)) +
          " kg since your calorie target was set. Open Menu → Personal setup, enter your new weight and apply the new numbers."
      });
    var fin = Object.keys(S.days)
      .filter(function (k2) {
        return k2 <= dt && S.days[k2].wo && S.days[k2].wo.fin && S.days[k2].wo.effort;
      })
      .sort()
      .slice(-2);
    if (
      fin.length === 2 &&
      fin.every(function (k2) {
        return S.days[k2].wo.effort === "hard";
      })
    )
      out.push({
        tone: "warn",
        tag: "TRAIN",
        title: "Two very hard sessions in a row",
        text: "Hold the same weights next session and stop 2–3 reps before failure. Hard every day is how joints get irritated."
      });
    else if (
      fin.length === 2 &&
      fin.every(function (k2) {
        return S.days[k2].wo.effort === "easy";
      })
    )
      out.push({
        tone: "info",
        tag: "TRAIN",
        title: "Sessions feel too easy",
        text: "Time to progress: add the smallest weight step on your first two exercises."
      });
    var logged = Object.keys(S.days).length,
      lb = S.set.lastBackup;
    if (logged >= 7 && (!lb || diff(lb, dt) > 14))
      out.push({
        tone: "info",
        tag: "BACKUP",
        title: lb ? "Last backup was " + diff(lb, dt) + " days ago" : "Your log has never been backed up",
        text: "Everything lives on this phone only. Menu → Backup and restore → Export backup takes ten seconds."
      });
    var sk = streak();
    if (sk >= 3)
      out.push({
        tone: "good",
        tag: "STREAK",
        title: sk + "-day streak",
        text: "Four or more daily goals completed each day. Consistency is what moves the weekly average."
      });
    var order = { bad: 0, warn: 1, info: 2, good: 3 };
    return out.sort(function (a, b) {
      return order[a.tone] - order[b.tone];
    });
  }

  /* ---------- snapshot of the log: used by the coach and the report ---------- */
  function context() {
    var p = S.profile,
      td = today(),
      rows = [];
    for (var i = 0; i < 14; i++) {
      var dt = addDays(td, -i),
        d = S.days[dt];
      if (!d) continue;
      var t = tot(dt);
      rows.push({
        date: dt,
        day: dk(dt),
        weight_kg: d.w,
        kcal: d.food.length ? r0(t.k) : null,
        protein_g: d.food.length ? r0(t.p) : null,
        steps: d.steps,
        water_ml: d.water || null,
        sleep_h: d.sleep,
        trained: d.wo && d.wo.fin ? dayFocus(dt) : rest(dt) ? (d.walk ? "rest-day walk" : "rest") : false,
        note: d.note || undefined
      });
    }
    var tdd = gd(td),
      tt = tot(td),
      tr = trend(),
      lv = level();
    return {
      today: td,
      day_number: diff(p.start, td),
      weekday: dk(td),
      todays_focus: dayFocus(td),
      plan: S.set.plan,
      goal: p.goal,
      targets: {
        kcal: p.kcal,
        protein_g: p.protein,
        carbs_g: p.carbs,
        fat_g: p.fat,
        fibre_g: p.fibre,
        water_ml: p.water,
        steps: p.steps,
        sleep_h: p.sleep
      },
      start_weight_kg: p.startW,
      goal_weight_kg: p.goalW,
      latest_week_avg_kg: tr.last != null ? r1(tr.last) : null,
      loss_rate_kg_per_week: tr.rate != null ? r1(tr.rate) : null,
      today_so_far: {
        kcal: r0(tt.k),
        protein_g: r0(tt.p),
        carbs_g: r0(tt.c),
        fat_g: r0(tt.f),
        fibre_g: r0(tt.fb),
        foods: tdd.food.map(function (f) {
          return f.q + " x " + f.n + " (" + f.u + ")";
        }),
        sets_logged: dayEx(td)
          .map(function (id) {
            var s = viewSets(td, id).filter(function (x) {
              return x.d;
            });
            return s.length
              ? D.EX[id].n +
                  ": " +
                  s
                    .map(function (x) {
                      return (x.w || "bw") + "x" + x.r;
                    })
                    .join(", ")
              : null;
          })
          .filter(Boolean)
      },
      weekly_averages: weeks()
        .slice(-5)
        .map(function (w) {
          return {
            week_of: w.k,
            weigh_ins: w.n,
            avg_weight_kg: w.w != null ? r1(w.w) : null,
            avg_kcal: w.kcal != null ? r0(w.kcal) : null,
            avg_protein_g: w.p != null ? r0(w.p) : null,
            sessions: w.sess,
            avg_sleep_h: w.sleep != null ? r1(w.sleep) : null,
            avg_steps: w.steps != null ? r0(w.steps) : null
          };
        }),
      last_14_days: rows,
      streak_days: streak(),
      level: lv.lv,
      readiness_today_0to100: readiness(td).score,
      energy_today_1to5: tdd.energy
    };
  }
  // Totals for a date.
  function summary(dt) {
    var t = tot(dt),
      d = gd(dt);
    return {
      kcal: r0(t.k),
      protein_g: r0(t.p),
      carbs_g: r0(t.c),
      fat_g: r0(t.f),
      fibre_g: r0(t.fb),
      trained: !!(d.wo && d.wo.fin),
      focus: dayFocus(dt),
      goals_done: doneCount(dt)
    };
  }
  // The shareable progress report.
  function reportText() {
    var c = context(),
      L = [];
    L.push("ZENKAI report, " + c.today + " (Day " + c.day_number + ")");
    L.push(
      "Start " +
        c.start_weight_kg +
        " kg, goal " +
        c.goal_weight_kg +
        " kg. Latest weekly average: " +
        (c.latest_week_avg_kg || "n/a") +
        " kg. Change: " +
        (c.loss_rate_kg_per_week != null
          ? (c.loss_rate_kg_per_week > 0 ? "−" : "+") + Math.abs(c.loss_rate_kg_per_week) + " kg/week"
          : "not enough data")
    );
    L.push(
      "Targets: " +
        c.targets.kcal +
        " kcal, " +
        c.targets.protein_g +
        " g protein, " +
        c.targets.steps +
        " steps, " +
        c.targets.sleep_h +
        " h sleep"
    );
    L.push("date | weight | kcal | protein | steps | water ml | sleep h | trained");
    c.last_14_days.forEach(function (r) {
      L.push(
        [r.date, r.weight_kg, r.kcal, r.protein_g, r.steps, r.water_ml, r.sleep_h, r.trained]
          .map(function (v) {
            return v == null || v === false ? "-" : v;
          })
          .join(" | ")
      );
    });
    return L.join("\n");
  }

  /* ---------- Adaptive target, body fat, saved meals, badges, weekly sets, CSV export ---------- */
  // Works out what you really burn from what you logged and how your weight moved, over the last 28 days.
  function adaptive() {
    return memo("ad", adaptive0);
  }
  // Compares intake with the weight trend over four weeks.
  function adaptive0() {
    var p = S.profile,
      td = today(),
      from = addDays(td, -27),
      W = [],
      K = [],
      i;
    for (i = 0; i < 28; i++) {
      var dt = addDays(from, i),
        d = S.days[dt];
      if (!d) continue;
      if (d.w != null) W.push([i, d.w]);
      if (d.food.length) {
        var k = tot(dt).k;
        if (k >= p.kcal * 0.5) K.push(k);
      }
    }
    var span = W.length ? W[W.length - 1][0] - W[0][0] : 0;
    if (W.length < 8 || K.length < 10 || span < 13)
      return {
        ok: false,
        weigh: Math.max(0, 8 - W.length),
        food: Math.max(0, 10 - K.length),
        span: Math.max(0, 13 - span)
      };
    var n = W.length,
      sx = 0,
      sy = 0,
      sxy = 0,
      sxx = 0;
    W.forEach(function (r) {
      sx += r[0];
      sy += r[1];
      sxy += r[0] * r[1];
      sxx += r[0] * r[0];
    });
    var slope = (n * sxy - sx * sy) / (n * sxx - sx * sx),
      intake = avg(K),
      burn = Math.max(1400, Math.min(4800, intake - slope * 7700));
    var w = W[W.length - 1][1],
      fem = p.sex === "f",
      bmr = 10 * w + 6.25 * p.height - 5 * p.age + (fem ? -161 : 5);
    var adj = S.prog
      ? S.prog.t.kcal - S.prog.t.tdee
      : goalKind() === "lose"
        ? -550
        : goalKind() === "gain"
          ? 250
          : 0; // the planned cut or surplus
    var target = Math.round((adj < 0 ? Math.max(burn + adj, bmr, fem ? 1200 : 1500) : burn + adj) / 10) * 10;
    return {
      ok: true,
      intake: intake,
      rate: -slope * 7,
      burn: burn,
      target: target,
      delta: target - p.kcal,
      days: K.length,
      weighs: n,
      w: w
    };
  }
  // U.S. Navy tape method: an estimate, usually within 3-4 points. Women's version needs the hip measure too.
  function navy(waist, neck, height, hip, sex) {
    if (!(waist > 0) || !(neck > 0)) return null;
    var bf;
    if (sex === "f") {
      if (!(hip > 0) || waist + hip - neck < 20) return null;
      bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(height)) - 450;
    } else {
      if (waist - neck < 5) return null;
      bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    }
    return bf > 2 && bf < 60 ? bf : null;
  }
  // Body-fat history (cached).
  function bodyfat() {
    return memo("bf", bodyfat0);
  }
  // Body fat from every logged waist and neck.
  function bodyfat0() {
    var p = S.profile,
      keys = Object.keys(S.days).sort(),
      neck = null,
      hip = null,
      out = [],
      lw = p.startW;
    keys.forEach(function (k) {
      if (S.days[k].neck != null) neck = neck == null ? S.days[k].neck : neck;
      if (S.days[k].hip != null) hip = hip == null ? S.days[k].hip : hip;
    });
    keys.forEach(function (k) {
      var d = S.days[k];
      if (d.w != null) lw = d.w;
      if (d.neck != null) neck = d.neck;
      if (d.hip != null) hip = d.hip;
      if (d.waist != null && neck != null) {
        var bf = navy(d.waist, neck, p.height, hip, p.sex);
        if (bf != null)
          out.push({
            dt: k,
            bf: bf,
            w: lw,
            fat: (lw * bf) / 100,
            lean: lw * (1 - bf / 100),
            waist: d.waist,
            neck: neck
          });
      }
    });
    return out;
  }
  // Save a logged meal to reuse later.
  function saveMeal(dt, meal, name) {
    var items = gd(dt)
      .food.filter(function (x) {
        return x.m === meal;
      })
      .map(function (x) {
        return { fid: x.fid, n: x.n, u: x.u, q: x.q, k: x.k, p: x.p, c: x.c, f: x.f, fb: x.fb };
      });
    if (!items.length) return null;
    var m = { id: "m_" + uid(), n: String(name || "My meal").slice(0, 40), items: items };
    S.meals.unshift(m);
    if (S.meals.length > 30) S.meals.length = 30;
    touchCore();
    return m;
  }
  // Log a saved meal.
  function addSavedMeal(dt, meal, id) {
    var m = S.meals.filter(function (x) {
      return x.id === id;
    })[0];
    if (!m) return 0;
    m.items.forEach(function (x) {
      addFood(dt, meal, { id: x.fid, n: x.n, u: x.u, k: x.k, p: x.p, c: x.c, f: x.f, fb: x.fb }, x.q, false);
    });
    return m.items.length;
  }
  // Calories and protein of a saved meal.
  function mealTot(m) {
    var k = 0,
      p = 0;
    m.items.forEach(function (x) {
      k += x.k * x.q;
      p += x.p * x.q;
    });
    return { k: k, p: p };
  }
  // Longest run of days that pass a test.
  function bestRun(test) {
    var keys = Object.keys(S.days).sort(),
      best = 0,
      run = 0,
      prev = null;
    keys.forEach(function (k) {
      if (test(S.days[k], k)) {
        run = prev && diff(prev, k) === 1 ? run + 1 : 1;
        prev = k;
        if (run > best) best = run;
      } else {
        run = 0;
        prev = null;
      }
    });
    return best;
  }
  // Badges and whether each is earned (cached).
  function badges() {
    return memo("bd", badges0);
  }
  // Checks every badge.
  function badges0() {
    var p = S.profile,
      keys = Object.keys(S.days),
      sess = 0,
      perfect = 0,
      foodDays = 0,
      tr = trend(),
      gk = goalKind(),
      lost = tr.last != null ? (gk === "gain" ? tr.last - p.startW : p.startW - tr.last) : 0,
      way = gk === "gain" ? "over" : "under";
    var steady = tr.last != null && Math.abs(tr.last - p.startW) <= 1.5 ? Math.min(tr.n, 4) : 0;
    keys.forEach(function (k) {
      var d = S.days[k];
      if (d.wo && d.wo.fin) sess++;
      if (d.food.length) foodDays++;
      if (doneCount(k) >= 7) perfect++;
    });
    var run4 = bestRun(function (d, k) {
        return doneCount(k) >= 4;
      }),
      runP = bestRun(function (d, k) {
        return d.food.length && tot(k).p >= p.protein - 10;
      }),
      runS = bestRun(function (d) {
        return d.sleep != null && d.sleep >= p.sleep;
      });
    var stronger = 0;
    Object.keys(D.EX).forEach(function (id) {
      var h = exHistory(id);
      if (h.length > 1) {
        var b = 0;
        h.forEach(function (x) {
          if (x.e1 > b) b = x.e1;
        });
        if (b > h[0].e1 + 0.01) stronger++;
      }
    });
    function b(id, n, d, have, need) {
      return { id: id, n: n, d: d, hit: have >= need, have: Math.min(have, need), need: need };
    }
    return [
      b("s1", "First session", "Finish one training session", sess, 1),
      b("s10", "Ten sessions", "Finish 10 sessions", sess, 10),
      b("s25", "Regular", "Finish 25 sessions", sess, 25),
      b("s50", "Fifty", "Finish 50 sessions", sess, 50),
      b("s100", "Centurion", "Finish 100 sessions", sess, 100),
      b("r3", "Three in a row", "4+ goals, 3 days running", run4, 3),
      b("r7", "Full week", "4+ goals, 7 days running", run4, 7),
      b("r30", "Thirty days", "4+ goals, 30 days running", run4, 30),
      b("z1", "Zenkai day", "All 7 goals in one day", perfect, 1),
      b("z10", "Ten Zenkai days", "All 7 goals on 10 days", perfect, 10),
      b("p7", "Protein week", "Protein target 7 days running", runP, 7),
      b("sl5", "Rested", "Sleep target 5 nights running", runS, 5),
      b("f14", "Logger", "Food logged on 14 days", foodDays, 14),
      b("st5", "Stronger", "Beat your first lift on 5 exercises", stronger, 5),
      b("l2", "First 2 kg", "Weekly average 2 kg " + way + " the start", Math.max(0, r1(lost)), 2),
      b(
        "l5",
        gk === "gain" ? "Five up" : "Five down",
        "Weekly average 5 kg " + way + " the start",
        Math.max(0, r1(lost)),
        5
      ),
      b(
        "l10",
        gk === "gain" ? "Ten up" : "Ten down",
        "Weekly average 10 kg " + way + " the start",
        Math.max(0, r1(lost)),
        10
      ),
      gk === "hold"
        ? b("goal", "Steady", "Four weeks of weigh-ins within 1.5 kg of your start", steady, 4)
        : b(
            "goal",
            "Goal weight",
            "Weekly average at " + p.goalW + " kg",
            Math.max(0, r1(lost)),
            Math.max(0.1, r1(Math.abs(p.startW - p.goalW)))
          )
    ];
  }
  // badges earned since the last look; marks them as seen
  function newBadges() {
    var seen = S.set.badges,
      fresh = badges().filter(function (x) {
        return x.hit && seen.indexOf(x.id) < 0;
      });
    if (fresh.length) {
      fresh.forEach(function (x) {
        seen.push(x.id);
      });
      touchCore();
    }
    return fresh;
  }
  var GROUPS = [
    ["Chest", ["chest"]],
    ["Back", ["lats", "midback", "traps", "lowback"]],
    ["Shoulders", ["delts", "rdelts", "cuff"]],
    ["Biceps", ["biceps", "forearms"]],
    ["Triceps", ["triceps"]],
    ["Legs", ["glutes", "hams", "calves", "hipab", "quads"]],
    ["Core", ["abs", "obliques"]]
  ];
  // hard sets per muscle group this week: the first muscle an exercise lists counts 1, the helpers count half
  function weekSets(dt) {
    var mk = monday(dt || today()),
      out = GROUPS.map(function (g) {
        return { n: g[0], sets: 0 };
      });
    for (var i = 0; i < 7; i++) {
      var w = (S.days[addDays(mk, i)] || {}).wo;
      if (!w || !w.sets) continue;
      Object.keys(w.sets).forEach(function (ex) {
        var done = w.sets[ex].filter(function (s) {
            return s.d;
          }).length,
          ms = D.EXM[ex] || [];
        if (!done) return;
        var credit = {};
        ms.forEach(function (m, j) {
          GROUPS.forEach(function (g, gi) {
            if (g[1].indexOf(m) > -1) credit[gi] = Math.max(credit[gi] || 0, j === 0 ? 1 : 0.5);
          });
        });
        Object.keys(credit).forEach(function (gi) {
          out[gi].sets += done * credit[gi];
        });
      });
    }
    return out;
  }
  // The last finished session on the same weekday.
  function lastSame(dt) {
    var keys = Object.keys(S.days)
      .filter(function (k) {
        return k < dt && dk(k) === dk(dt) && S.days[k].wo && S.days[k].wo.fin;
      })
      .sort();
    return keys.length ? keys[keys.length - 1] : null;
  }
  // Sets, volume and new bests for a finished session.
  function sessionSummary(dt) {
    var ws = woStats(dt),
      prev = lastSame(dt),
      pv = prev ? woStats(prev).vol : 0,
      best = dayEx(dt)
        .filter(function (id) {
          return isPR(id, dt);
        })
        .map(function (id) {
          return D.EX[id].n;
        });
    return {
      sets: ws.done,
      vol: ws.vol,
      prev: prev,
      change: pv > 0 && ws.vol > 0 ? ((ws.vol - pv) / pv) * 100 : null,
      best: best
    };
  }
  // The whole log as a spreadsheet (CSV).
  function csv() {
    var L = [
      "date,day,weight_kg,kcal,protein_g,carbs_g,fat_g,fibre_g,steps,water_ml,sleep_h,trained,sets_done,volume_kg,energy_1to5,waist_cm,neck_cm,goals_done"
    ];
    Object.keys(S.days)
      .sort()
      .forEach(function (dt) {
        var d = S.days[dt],
          t = tot(dt),
          has = d.food.length,
          ws = rest(dt) ? { done: 0, vol: 0 } : woStats(dt);
        L.push(
          [
            dt,
            dk(dt),
            d.w,
            has ? r0(t.k) : "",
            has ? r0(t.p) : "",
            has ? r0(t.c) : "",
            has ? r0(t.f) : "",
            has ? r0(t.fb) : "",
            d.steps,
            d.water || "",
            d.sleep,
            d.wo && d.wo.fin ? 1 : 0,
            ws.done,
            r0(ws.vol),
            d.energy,
            d.waist,
            d.neck,
            doneCount(dt)
          ]
            .map(function (v) {
              return v == null ? "" : v;
            })
            .join(",")
        );
      });
    return L.join("\n");
  }
  // reminders: the saved choice for each one, falling back to its default time and off
  function reminders() {
    return D.REM.map(function (r) {
      var s = S.rem[r[0]] || {};
      return { id: r[0], on: !!s.on, t: /^\d\d:\d\d$/.test(s.t || "") ? s.t : r[1], title: r[2], text: r[3] };
    });
  }
  // Change one reminder.
  function setReminder(id, on, t) {
    var cur = S.rem[id] || {};
    S.rem[id] = { on: on == null ? !!cur.on : !!on, t: t || cur.t || null };
    touchCore();
  }

  /* ---------- food matching: search and "type what you ate" ---------- */
  function fname(f) {
    return f.n.split(/[,(]/)[0].trim().toLowerCase();
  }
  // Every name a food can be matched by.
  function fkeys(f) {
    var a = (f.a || []).slice();
    a.push(fname(f));
    return a;
  }
  // Naive singular: eggs to egg.
  function sing(w) {
    return w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w;
  }
  // Normalise typed food text: lower case, spelled-out numbers, common Hinglish words.
  function ntext(t) {
    return (
      " " +
      String(t || "")
        .toLowerCase()
        .replace(/[^a-z0-9.\/ऀ-ॿ]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map(sing)
        .join(" ") +
      " "
    );
  }
  // best food for a phrase: the longest known name or alias found in it
  function findFood(text) {
    var t = ntext(text),
      best = null,
      bl = 0;
    allFoods().forEach(function (f) {
      fkeys(f).forEach(function (k) {
        var kk = ntext(k);
        if (kk.length > 2 && t.indexOf(kk) > -1 && kk.length > bl) {
          bl = kk.length;
          best = f;
        }
      });
    });
    return best;
  }
  // Foods matching a search box query.
  function searchFoods(q) {
    q = String(q || "")
      .toLowerCase()
      .trim();
    if (!q) return allFoods();
    var a = [],
      b = [];
    allFoods().forEach(function (f) {
      if (f.n.toLowerCase().indexOf(q) > -1) a.push(f);
      else if (
        (f.a || []).some(function (k) {
          return k.indexOf(q) > -1;
        })
      )
        b.push(f);
    });
    return a.concat(b);
  }
  var NUMW = {
    a: 1,
    an: 1,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    half: 0.5,
    quarter: 0.25,
    couple: 2,
    dozen: 12
  };
  // "2 aloo paratha with dahi and a cup of chai" -> [{f, q, raw, note}], plus the phrases nothing matched
  function parseMeal(text) {
    var items = [],
      miss = [];
    String(text || "")
      .split(/,|;|\n|\+|&|\band\b|\bwith\b|\bplus\b/i)
      .forEach(function (raw) {
        raw = raw.trim();
        if (raw.length < 2) return;
        var f = findFood(raw);
        if (!f) {
          miss.push(raw);
          return;
        }
        var low = raw.toLowerCase(),
          q = null,
          note = "",
          m,
          grams = null;
        if ((m = low.match(/(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|ml)\b/))) grams = +m[1];
        else if ((m = low.match(/(\d+(?:\.\d+)?)\s*(kg|l|litre|liter)\b/))) grams = +m[1] * 1000;
        var base = String(f.u).match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/);
        if (grams != null && base) {
          q = grams / +base[1];
          if (/^\d/.test(f.u) === false) note = "from the weight you typed";
        } else {
          if ((m = low.match(/(\d+)\s*\/\s*(\d+)/))) q = +m[1] / +m[2];
          else if ((m = low.match(/(\d+(?:\.\d+)?)/)) && grams == null) q = +m[1];
          else {
            var w = low.split(/\s+/);
            for (var i = 0; i < w.length; i++)
              if (NUMW[w[i]] != null) {
                q = NUMW[w[i]];
                break;
              }
          }
          if (q == null) q = 1;
          if (grams != null) {
            q = 1;
            note = "weight not used: this food is counted per " + f.u;
          }
        }
        q = Math.max(0.25, Math.min(20, Math.round(q * 4) / 4));
        items.push({ f: f, q: q, raw: raw, note: note });
      });
    return { items: items, miss: miss };
  }

  /* ---------- network: plain GET, through the app shell on Android ---------- */
  // blocked: set by a host page that does not allow outside requests (window.ZENKAI_NO_WEB = true)
  var Net = { seq: 0, wait: {}, blocked: !!window.ZENKAI_NO_WEB };
  Net.online = function () {
    return !Net.blocked && (typeof navigator === "undefined" || navigator.onLine !== false);
  };
  Net.get = function (url, ms) {
    ms = ms || 14000;
    if (NATIVE && window.SZNative.httpGet) {
      return new Promise(function (res, rej) {
        var id = "r" + ++Net.seq,
          t = setTimeout(function () {
            delete Net.wait[id];
            rej({ code: "timeout" });
          }, ms + 4000);
        Net.wait[id] = function (status, body) {
          clearTimeout(t);
          if (status >= 200 && status < 300) res(body);
          else rej({ code: status ? "http_" + status : "network" });
        };
        try {
          window.SZNative.httpGet(id, url);
        } catch (e) {
          clearTimeout(t);
          delete Net.wait[id];
          rej({ code: "network" });
        }
      });
    }
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null,
      timer = setTimeout(function () {
        if (ctl) ctl.abort();
      }, ms);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(
      function (r) {
        clearTimeout(timer);
        if (!r.ok) throw { code: "http_" + r.status };
        return r.text();
      },
      function () {
        clearTimeout(timer);
        throw { code: "network" };
      }
    );
  };
  window.SZ_http = function (id, status, body) {
    var f = Net.wait[id];
    if (f) {
      delete Net.wait[id];
      f(status, body || "");
    }
  };

  /* ---------- packaged foods: Open Food Facts ---------- */
  function offFood(p) {
    var n = p.nutriments || {},
      k = +n["energy-kcal_100g"];
    if (!(k >= 0) && +n["energy_100g"] > 0) k = +n["energy_100g"] / 4.184;
    var name = String(p.product_name || p.product_name_en || "").trim();
    if (!name || !(k >= 0)) return null;
    var brand = String(Array.isArray(p.brands) ? p.brands[0] || "" : p.brands || "")
        .split(",")[0]
        .trim(),
      sv = String(p.serving_size || "").match(/(\d+(?:\.\d+)?)\s*(g|ml)/i);
    return {
      id: "o_" + (p.code || uid()),
      n: (
        name + (brand && name.toLowerCase().indexOf(brand.toLowerCase()) < 0 ? " (" + brand + ")" : "")
      ).slice(0, 80),
      u: "100 g",
      q: 1,
      k: r0(k),
      p: r1(+n.proteins_100g || 0),
      c: r1(+n.carbohydrates_100g || 0),
      f: r1(+n.fat_100g || 0),
      fb: r1(+n.fiber_100g || 0),
      sv: sv ? +sv[1] : null,
      web: 1
    };
  }
  var OFF_FIELDS = "code,product_name,brands,serving_size,nutriments";
  // Search Open Food Facts by name or barcode.
  function searchOnline(q) {
    q = String(q || "").trim();
    if (/^\d{8,14}$/.test(q)) {
      return Net.get(
        "https://world.openfoodfacts.org/api/v2/product/" + q + ".json?fields=" + OFF_FIELDS
      ).then(function (t) {
        var j = JSON.parse(t),
          f = j && j.product ? offFood(Object.assign({ code: q }, j.product)) : null;
        return f ? [f] : [];
      });
    }
    return Net.get(
      "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
        encodeURIComponent(q) +
        "&search_simple=1&action=process&json=1&page_size=12&fields=" +
        OFF_FIELDS
    ).then(function (t) {
      var j = JSON.parse(t);
      return ((j && (j.products || j.hits)) || []).map(offFood).filter(Boolean).slice(0, 8);
    });
  }

  return {
    D: D,
    NATIVE: NATIVE,
    get S() {
      return S;
    },
    pad: pad,
    ymd: ymd,
    pd: pd,
    addDays: addDays,
    today: today,
    diff: diff,
    dk: dk,
    monday: monday,
    avg: avg,
    r0: r0,
    r1: r1,
    nf: nf,
    uid: uid,
    num: num,
    gd: gd,
    md: md,
    touchCore: touchCore,
    persist: persist,
    replaceAll: replaceAll,
    resetAll: resetAll,
    allFoods: allFoods,
    foodById: foodById,
    tot: tot,
    addFood: addFood,
    planTotals: planTotals,
    suggest: suggest,
    findFood: findFood,
    searchFoods: searchFoods,
    parseMeal: parseMeal,
    searchOnline: searchOnline,
    lastSession: lastSession,
    mwo: mwo,
    viewSets: viewSets,
    repTxt: repTxt,
    hint: hint,
    woStats: woStats,
    exHistory: exHistory,
    quests: quests,
    doneCount: doneCount,
    level: level,
    streak: streak,
    weeks: weeks,
    trend: trend,
    insights: insights,
    readiness: readiness,
    nextAction: nextAction,
    prs: prs,
    isPR: isPR,
    weekScore: weekScore,
    weekReview: weekReview,
    recentFoods: recentFoods,
    copyMeal: copyMeal,
    milestones: milestones,
    adaptive: adaptive,
    navy: navy,
    bodyfat: bodyfat,
    saveMeal: saveMeal,
    addSavedMeal: addSavedMeal,
    mealTot: mealTot,
    badges: badges,
    newBadges: newBadges,
    weekSets: weekSets,
    sessionSummary: sessionSummary,
    csv: csv,
    reminders: reminders,
    setReminder: setReminder,
    dayEx: dayEx,
    dayFocus: dayFocus,
    setPlan: setPlan,
    rank: rank,
    applyPlan: applyPlan,
    planAge: planAge,
    learning: learning,
    pickDish: pickDish,
    reorder: reorder,
    swapEx: swapEx,
    rest: rest,
    restK: restK,
    planDays: planDays,
    goalKind: goalKind,
    clock: clock,
    mealMin: mealMin,
    setup: setup,
    setupDraft: setupDraft,
    P: P,
    context: context,
    reportText: reportText,
    Net: Net
  };
})();
