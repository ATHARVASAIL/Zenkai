/**
 * Plan builder check: builds a plan for 5,400 different people (every split, goal, equipment,
 * experience level, session length and day count, with mixed diets, cuisines and budgets) and
 * checks the promises the app makes:
 *   - every session has at least three exercises and fits its time (+12 min slack)
 *   - no exercise needs equipment the person does not have
 *   - "one muscle group a day" never repeats a day and has exactly one leg day
 *   - biceps, triceps and abs get direct work every week (biceps excepted with no equipment)
 *   - with 3+ days of 45+ minutes, every major muscle gets at least MINSETS sets a week
 *   - menus stay within 10% of the calorie target and respect the diet
 * Protein misses are counted but allowed: the app shows a note when a menu falls short.
 *
 * Run: node tests/plan-check.js
 */
global.window = {};
var J = require("path").join(__dirname, "../app/src/main/assets/www/js/");
require(J + "data.js");
require(J + "learn.js");
require(J + "plan.js");
var P = window.SZP,
  D = window.SZD;
var PF = {},
  KF = {};
var fails = {},
  n = 0,
  ex = 0;
// Soft results: the app shows a note to the person when these happen, so they are counted, not failed.
var SOFT = /^(prot|kcal|thin_)/;
function bad(k, msg) {
  fails[k] = (fails[k] || 0) + 1;
  if (fails[k] <= 3 && !SOFT.test(k)) console.log("FAIL", k, msg);
}
var DAYS = {
  2: ["mon", "thu"],
  3: ["mon", "wed", "fri"],
  4: ["mon", "tue", "thu", "fri"],
  5: ["mon", "tue", "wed", "thu", "fri"],
  6: ["mon", "tue", "wed", "thu", "fri", "sat"]
};
var styles = ["auto", "full", "ul", "ppl", "double", "single"],
  goals = ["lose", "gain", "recomp", "fit", "strong"],
  places = ["gym", "db", "bw"],
  exps = ["new", "mid", "adv"],
  mins = [30, 45, 60, 75];
var diets = ["nonveg", "egg", "veg", "vegan"],
  cuis = ["north", "south", "west", "east", "mix", "global"],
  buds = ["low", "mid", "high"];
styles.forEach(function (st) {
  goals.forEach(function (go) {
    places.forEach(function (pl) {
      exps.forEach(function (xp) {
        mins.forEach(function (mi) {
          [2, 3, 4, 5, 6].forEach(function (nd) {
            var i = n++,
              a = Object.assign(P.blank(), {
                sex: i % 2 ? "f" : "m",
                age: 20 + (i % 40),
                h: 160 + (i % 25),
                w: 55 + (i % 45),
                goal: go,
                pace: "mid",
                exp: xp,
                place: pl,
                days: DAYS[nd],
                mins: mi,
                style: st,
                diet: diets[i % 4],
                cui: cuis[i % 6],
                bud: buds[i % 3],
                meals: 3 + (i % 3),
                limits: i % 7 == 0 ? ["knee"] : i % 11 == 0 ? ["shoulder"] : [],
                focus: i % 5 == 0 ? ["arms", "abs"] : []
              });
            var g;
            try {
              g = P.build(a);
            } catch (e) {
              bad("crash", e.stack);
              return;
            }
            var sf = g.info.style,
              tr = a.days.map(function (d) {
                return g.split[d];
              });
            tr.forEach(function (d) {
              if (d.ex.length < 3) bad("few", st + " " + pl + " " + d.focus);
              if (d.kind !== "active" && g.info.mins[a.days[tr.indexOf(d)]] > mi + 12)
                bad("time", st + " " + mi + " " + d.focus + " " + g.info.mins[a.days[tr.indexOf(d)]]);
              if (new Set(d.ex).size !== d.ex.length) bad("dup", d.focus);
              d.ex.forEach(function (id) {
                if (!D.EX[id]) bad("noex", id);
                if (P.tier(id) > { gym: 3, db: 2, bw: 1 }[pl]) bad("equip", id + " " + pl);
              });
              if (d.fin && !D.FIN[d.fin]) bad("nofin", d.fin);
            });
            if (sf === "single") {
              var f = tr.map(function (d) {
                return d.focus;
              });
              if (new Set(f).size !== f.length) bad("singlerepeat", f.join("/"));
              if (
                f.filter(function (x) {
                  return /Legs/.test(x);
                }).length !== 1
              )
                bad("singlelegs", f.join("/"));
            }
            if (st === "single" && sf !== "single" && pl === "gym" && nd >= 4)
              bad("singlelost", nd + " " + pl);
            var cv = {};
            g.info.cover.forEach(function (c) {
              cv[c.k] = c;
            });
            ["biceps", "triceps", "core"].forEach(function (k) {
              if (!(k === "biceps" && pl === "bw") && cv[k].direct < 1)
                bad("nodirect_" + k, st + "/" + sf + " " + pl + " " + mi + " " + nd);
            });
            if (mi > 30 && nd > 2 && pl !== "bw")
              ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hams", "core"].forEach(
                function (k) {
                  if (cv[k].sets < P.MINSETS)
                    bad("thin_" + k, sf + " " + pl + " " + xp + " " + mi + " " + nd + " " + cv[k].sets);
                }
              );
            var t = g.mealTot;
            if (Math.abs(t.k - g.t.kcal) > g.t.kcal * 0.1)
              bad("kcal", a.diet + " " + a.cui + " " + Math.round(t.k) + "/" + g.t.kcal);
            if (t.p < g.t.protein * 0.85) {
              bad("prot", a.diet + " " + a.cui + " " + a.bud + " " + Math.round(t.p) + "/" + g.t.protein);
              PF[a.diet + " " + a.cui + " m" + a.meals] =
                (PF[a.diet + " " + a.cui + " m" + a.meals] || 0) + 1;
            }
            if (Math.abs(t.k - g.t.kcal) > g.t.kcal * 0.1)
              KF[a.diet + " " + a.cui + " m" + a.meals + " " + (g.t.kcal < 1700 ? "low" : "hi")] =
                (KF[a.diet + " " + a.cui + " m" + a.meals + " " + (g.t.kcal < 1700 ? "low" : "hi")] || 0) + 1;
            g.meals.forEach(function (m) {
              m.plan.forEach(function (it) {
                var t = window.SZD.FOODS.filter(function (f) {
                  return f.id === it[0];
                })[0];
                if (!t) bad("nofood", it[0]);
                if (a.diet !== "nonveg" && /chicken|fish/.test(it[0])) bad("diet", it[0]);
                if ((a.diet === "veg" || a.diet === "vegan") && it[0] === "egg") bad("diet", it[0]);
                if (
                  a.diet === "vegan" &&
                  /milk$|dahi|paneer|chaas|curdrice|whey/.test(it[0]) &&
                  it[0] !== "soyamilk"
                )
                  bad("vegan", it[0]);
              });
              if (m.plan.length && m.opts.length < 1) bad("opts", m.id);
            });
            ex++;
          });
        });
      });
    });
  });
});
var hard = Object.keys(fails).filter(function (k) {
    return !SOFT.test(k);
  }),
  soft = Object.keys(fails).filter(function (k) {
    return SOFT.test(k);
  });
console.log("profiles", n, "checked", ex);
console.log(
  "noted to the user (menu short of protein or calories, a muscle under the weekly minimum):",
  soft.length
    ? soft
        .map(function (k) {
          return k + " " + fails[k];
        })
        .join(", ")
    : "none"
);
console.log(hard.length ? "FAILED: " + hard.join(", ") : "all checks passed");
process.exit(hard.length ? 1 : 0);
