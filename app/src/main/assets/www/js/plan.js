/**
 * ZENKAI — plan builder
 *
 * Turns the setup answers into a complete plan:
 *   - targets()    calories (Mifflin–St Jeor), protein, fat, carbs, water, steps, safety limits
 *   - program()    the training week: picks a split, fills each day with exercises that suit the
 *                  equipment, experience and any sore joints, then checks that every muscle gets
 *                  at least MINSETS sets a week and adds or swaps moves until it does
 *   - meals()      a day of eating from the foods the user ticked, sized to the targets and the budget
 *   - routine()    meal, training and bed times around the user's own day
 *   - foodGuide()  the "How to eat" guide; evidence() the research behind each rule
 *
 * Pure functions: nothing here reads or writes the log. build() runs them all.
 * Exposed as window.SZP.
 *
 * Author: Atharva Sail
 */
window.SZP = (function () {
  "use strict";
  var D = window.SZD;
  // Round to a whole number.
  function r0(x) {
    return Math.round(x);
  }
  // Round to one decimal place.
  function r1(x) {
    return Math.round(x * 10) / 10;
  }
  // Keep x between lo and hi.
  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }
  // Round to a step, e.g. 50 kcal.
  function rnd(x, s) {
    return Math.round(x / s) * s;
  }
  // True when a list contains x.
  function has(arr, v) {
    return !!arr && arr.indexOf(v) >= 0;
  }
  // Whole number with thousands separators.
  function nf(x) {
    return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  // Split a space-separated string.
  function words(s) {
    return s.split(" ");
  }

  /* ---------- the questions' options: [value, label, help] ---------- */
  var OPT = {
    sex: [
      ["m", "Male"],
      ["f", "Female"]
    ],
    goal: [
      ["lose", "Lose fat", "Lower body fat and keep your muscle"],
      ["gain", "Build muscle", "Gain weight and size"],
      ["recomp", "Tone up", "Lose some fat and add muscle at about the same weight"],
      ["fit", "Stay fit and healthy", "Hold your weight, move more, feel better"],
      ["strong", "Get stronger", "Lift heavier at about the same weight"]
    ],
    pace: [
      ["slow", "Easy"],
      ["mid", "Steady"],
      ["fast", "Fast"]
    ],
    act: [
      ["sed", "Mostly sitting", "Desk work or study, little walking"],
      ["light", "Some walking", "On your feet for part of the day"],
      ["mod", "On my feet", "Standing or walking most of the day"],
      ["high", "Physical work", "Manual job or sport most days"]
    ],
    exp: [
      ["new", "New to it", "Less than 6 months of steady training"],
      ["mid", "Some experience", "6 months to 2 years"],
      ["adv", "Experienced", "More than 2 years; you know the main lifts"]
    ],
    place: [
      ["gym", "Gym", "Machines, cables, barbells and dumbbells"],
      ["db", "Home with dumbbells", "Dumbbells, plus a bench or sturdy chair"],
      ["bw", "Home, no equipment", "Bodyweight; a step and a sturdy table help"]
    ],
    style: [
      ["auto", "Choose for me", "The split that fits your days, goal and experience"],
      ["full", "Full body", "Every muscle in each session"],
      ["ul", "Upper / lower", "Upper body one day, legs the next"],
      ["ppl", "Push / pull / legs", "Pressing muscles, pulling muscles, legs"],
      ["double", "Two muscle groups a day", "Chest + triceps, back + biceps, legs + shoulders"],
      [
        "single",
        "One muscle group a day",
        "A different muscle every day: chest, back, shoulders, legs, biceps, triceps + abs"
      ]
    ],
    mins: [
      [30, "30 min"],
      [45, "45 min"],
      [60, "60 min"],
      [75, "75 min"]
    ],
    focus: [
      ["arms", "Arms"],
      ["abs", "Abs"],
      ["chest", "Chest"],
      ["back", "Back"],
      ["shoulders", "Shoulders"],
      ["legs", "Legs"],
      ["glutes", "Glutes"]
    ],
    limits: [
      ["back", "Lower back"],
      ["shoulder", "Shoulders"],
      ["knee", "Knees"],
      ["wrist", "Wrists or elbows"]
    ],
    diet: [
      ["nonveg", "Non-vegetarian", "Chicken, fish, eggs, milk products"],
      ["egg", "Vegetarian + eggs", "No meat or fish"],
      ["veg", "Vegetarian", "Milk products, no eggs"],
      ["vegan", "Vegan", "No animal foods"]
    ],
    meals: [
      [3, "3 meals"],
      [4, "3 meals + snack"],
      [5, "3 meals + 2 snacks"]
    ],
    cui: [
      ["north", "North Indian", "Roti, dal, sabzi, paratha, rajma, paneer"],
      ["south", "South Indian", "Rice, idli, dosa, sambar, curd rice"],
      ["west", "West Indian", "Poha, bhakri, thepla, usal, dal and rice"],
      ["east", "East Indian", "Rice, dal, fish, sattu"],
      ["mix", "A mix of Indian food", "A bit of everything"],
      ["global", "Not Indian food", "Oats, bread, rice, eggs, chicken, beans, potatoes"]
    ],
    eat: [
      ["egg", "Eggs"],
      ["chicken", "Chicken"],
      ["fish", "Fish"],
      ["paneer", "Paneer"],
      ["dahi", "Curd / yogurt"],
      ["milk", "Milk"],
      ["dal", "Dal / lentils"],
      ["rajma", "Rajma, chole, beans"],
      ["soya", "Soya chunks"],
      ["tofu", "Tofu"],
      ["sprouts", "Sprouts"],
      ["chana", "Roasted chana"],
      ["peanuts", "Peanuts"],
      ["whey", "Protein powder"],
      ["roti", "Roti / chapati"],
      ["rice", "Rice"],
      ["oats", "Oats"],
      ["poha", "Poha / upma"],
      ["idli", "Idli / dosa"],
      ["bread", "Bread"],
      ["millet", "Ragi, jowar, bajra"]
    ],
    bud: [
      ["low", "Tight", "Under ₹5,000 a month. The cheapest protein foods you eat do most of the work."],
      ["mid", "Medium", "₹5,000 to ₹8,000 a month. A mix of cheap and pricier protein foods."],
      ["high", "Flexible", "More than ₹8,000 a month. Whatever you like to eat."]
    ],
    src: [
      ["home", "Cooked at home", "By you or your family"],
      ["mess", "Mess, canteen or tiffin", "You eat what is served"],
      ["out", "Restaurants and takeaway", "Most meals are bought"]
    ],
    avoid: [
      ["dairy", "Milk products"],
      ["nuts", "Nuts and peanuts"],
      ["gluten", "Wheat / gluten"],
      ["soy", "Soya"]
    ],
    health: [
      ["heart", "A heart condition or high blood pressure"],
      ["dizzy", "Chest pain, fainting or dizziness when I exert myself"],
      ["diab", "Diabetes or another condition I take daily medicine for"],
      ["injury", "A recent operation or an injury that is still healing"],
      ["preg", "Pregnant, or gave birth in the last six months"],
      ["ed", "An eating disorder, now or in the past"]
    ]
  };
  // The display label of an option.
  function label(group, v) {
    var o = OPT[group].filter(function (x) {
      return x[0] === v;
    })[0];
    return o ? o[1] : String(v);
  }
  var DOWS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  var DNAME = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday"
  };

  // Default setup answers.
  function blank() {
    return {
      name: "",
      sex: "m",
      age: null,
      h: null,
      w: null,
      goal: "lose",
      goalW: null,
      pace: "mid",
      act: "sed",
      exp: "new",
      place: "gym",
      days: ["mon", "tue", "wed", "thu", "fri"],
      mins: 60,
      style: "auto",
      focus: [],
      limits: [],
      diet: "nonveg",
      meals: 4,
      avoid: [],
      cui: "mix",
      eat: null,
      bud: "mid",
      src: "home",
      wake: "06:30",
      bed: "22:30",
      wt: "07:00",
      health: [],
      order: null,
      swaps: null
    };
  }
  // tidy whatever was typed into something the builder can trust
  function clean(a) {
    var b = blank(),
      o = {},
      k;
    for (k in b) o[k] = a && a[k] != null ? a[k] : b[k];
    o.name = String(o.name || "")
      .trim()
      .slice(0, 30);
    o.sex = o.sex === "f" ? "f" : "m";
    o.age = clamp(Math.round(+o.age || 0), 13, 90);
    o.h = clamp(r1(+o.h || 0), 120, 230);
    o.w = clamp(r1(+o.w || 0), 30, 300);
    ["goal", "pace", "act", "exp", "place", "style", "diet", "cui", "bud", "src"].forEach(function (g) {
      if (
        !OPT[g].some(function (x) {
          return x[0] === o[g];
        })
      )
        o[g] = b[g];
    });
    o.days = DOWS.filter(function (d) {
      return has(o.days, d);
    });
    if (o.days.length < 2) o.days = ["mon", "thu"];
    if (o.days.length > 6) o.days = o.days.slice(0, 6);
    // a week the person rearranged: for each weekday, which session of the plan falls on it (-1 for rest)
    var ord =
      Array.isArray(o.order) && o.order.length === 7
        ? o.order.map(function (x) {
            return x == null || isNaN(+x) ? -1 : Math.round(+x);
          })
        : null;
    if (ord) {
      var on = DOWS.filter(function (d, i) {
          return ord[i] >= 0;
        }),
        idx = ord
          .filter(function (x) {
            return x >= 0;
          })
          .sort(function (x, y) {
            return x - y;
          });
      o.order =
        on.join() === o.days.join() &&
        idx.every(function (x, i) {
          return x === i;
        })
          ? ord
          : null;
    } else o.order = null;
    // exercises the person swapped for good: { from: to }
    var sw = {};
    if (o.swaps && typeof o.swaps === "object")
      Object.keys(o.swaps).forEach(function (k) {
        var v = o.swaps[k];
        if (D.EX[k] && D.EX[v] && k !== v && tier(v) <= TIER[o.place]) sw[k] = v;
      });
    o.swaps = Object.keys(sw).length ? sw : null;
    o.mins = has([30, 45, 60, 75], +o.mins) ? +o.mins : 60;
    o.meals = has([3, 4, 5], +o.meals) ? +o.meals : 4;
    ["focus", "limits", "avoid", "health"].forEach(function (g) {
      o[g] = (Array.isArray(o[g]) ? o[g] : []).filter(function (v) {
        return OPT[g].some(function (x) {
          return x[0] === v;
        });
      });
    });
    if (o.sex !== "f")
      o.health = o.health.filter(function (v) {
        return v !== "preg";
      });
    ["wake", "bed", "wt"].forEach(function (g) {
      if (!/^\d\d:\d\d$/.test(o[g])) o[g] = b[g];
    });
    o.goalW = +o.goalW > 0 ? r1(+o.goalW) : null;
    // the foods the person usually eats: only ones their diet allows, and never without a protein food and a grain
    var ok = eatOptions(o).map(function (x) {
        return x[0];
      }),
      eat = Array.isArray(a && a.eat)
        ? a.eat.filter(function (k) {
            return has(ok, k);
          })
        : [];
    o.eat =
      eat.some(function (k) {
        return has(EATPROTEIN, k);
      }) &&
      eat.some(function (k) {
        return has(EATSTAPLE, k);
      })
        ? ok.filter(function (k) {
            return has(eat, k);
          })
        : eatDefault(o);
    return o;
  }

  /* ---------- body numbers and daily targets ---------- */
  var ACT = { sed: 1.2, light: 1.35, mod: 1.5, high: 1.7 };
  var ACTWORD = {
    sed: "a mostly-sitting day",
    light: "a lightly active day",
    mod: "a day on your feet",
    high: "a physical job"
  };
  var PACE = { slow: 0.25, mid: 0.5, fast: 0.75 }; // % of body weight lost per week
  var GAIN = { slow: 0.05, mid: 0.1, fast: 0.15 }; // surplus as a share of maintenance
  var FLOOR = { m: 1500, f: 1200 };
  // Body-mass index.
  function bmi(w, h) {
    return w / Math.pow(h / 100, 2);
  }
  // Weight at a given BMI for a height.
  function wAt(b, h) {
    return b * Math.pow(h / 100, 2);
  }
  // BMI band for Asian Indians (WHO expert consultation; Misra et al. 2009).
  function band(b) {
    return b < 18.5 ? "under" : b < 25 ? "healthy" : b < 30 ? "over" : "high";
  }
  var BANDWORD = {
    under: "below the healthy range",
    healthy: "in the healthy range",
    over: "above the healthy range",
    high: "well above the healthy range"
  };

  // the goal the plan is actually built for, after the safety rules
  function effGoal(a) {
    var g = a.goal,
      b = bmi(a.w, a.h);
    if (has(a.health, "preg") || has(a.health, "ed")) return "fit";
    if (a.age < 18 && (g === "lose" || g === "recomp")) return "fit";
    if (g === "lose" && b < 18.5 + 0.3) return "fit";
    return g;
  }
  // A sensible goal weight when none is given.
  function goalWeight(a, g) {
    var lo = Math.ceil(wAt(18.5, a.h) * 2) / 2,
      w = a.w;
    if (g === "lose") {
      var sug = Math.min(w - 1, rnd(wAt(24, a.h), 0.5));
      return clamp(a.goalW && a.goalW < w ? a.goalW : sug, Math.min(lo, w), w);
    }
    if (g === "gain") return Math.max(a.goalW && a.goalW > w ? a.goalW : rnd(w * 1.06, 0.5), w);
    return w;
  }
  // Daily targets: calories (Mifflin–St Jeor × activity), protein, fat, carbs, fibre, water, steps, sleep. Applies the safety limits.
  function targets(a0) {
    var a = clean(a0),
      g = effGoal(a),
      w = a.w,
      h = a.h,
      nd = a.days.length,
      b = bmi(w, h),
      warn = [],
      why = [];
    var bmr = 10 * w + 6.25 * h - 5 * a.age + (a.sex === "f" ? -161 : 5);
    var factor = Math.min(1.9, ACT[a.act] + 0.05 * nd),
      tdee = bmr * factor,
      kcal = tdee,
      gw = goalWeight(a, g),
      floor = FLOOR[a.sex];
    why.push(
      "Resting burn, Mifflin–St Jeor equation: 10 × " +
        w +
        " kg + 6.25 × " +
        h +
        " cm − 5 × " +
        a.age +
        (a.sex === "f" ? " − 161" : " + 5") +
        " = " +
        nf(bmr) +
        " kcal."
    );
    why.push(
      "× " +
        factor.toFixed(2) +
        " for " +
        ACTWORD[a.act] +
        " and " +
        nd +
        " training days ≈ " +
        nf(tdee) +
        " kcal to hold your weight."
    );
    if (g === "lose") {
      var def = ((PACE[a.pace] / 100) * w * 7700) / 7,
        cap = 0.25 * tdee;
      if (def > cap) {
        def = cap;
        warn.push(
          "The pace you picked would need too large a cut, so the plan uses the largest safe one: a quarter of your daily burn."
        );
      }
      kcal = tdee - def;
      if (kcal < floor) {
        kcal = floor;
        warn.push(
          "Calories stop at " +
            nf(floor) +
            " a day. Going lower without a doctor or dietitian makes it hard to get enough protein, vitamins and minerals."
        );
      }
    } else if (g === "gain") {
      var s = GAIN[a.pace];
      if (a.exp === "adv") s = Math.max(0.05, s - 0.05);
      kcal = tdee * (1 + s);
    } else if (g === "recomp") kcal = tdee * (b >= 25 ? 0.9 : 0.95);
    kcal = Math.max(rnd(kcal, 50), g === "lose" ? floor : 0);
    var weekly = ((kcal - tdee) * 7) / 7700; // kg a week, negative when losing
    if (g === "lose")
      why.push(
        "Minus " +
          nf(tdee - kcal) +
          " kcal a day for about " +
          r1(-weekly) +
          " kg a week = " +
          nf(kcal) +
          " kcal."
      );
    else if (g === "gain")
      why.push(
        "Plus " +
          nf(kcal - tdee) +
          " kcal a day, a " +
          r0((kcal / tdee - 1) * 100) +
          "% surplus, for about " +
          r1(weekly) +
          " kg a week = " +
          nf(kcal) +
          " kcal."
      );
    else if (g === "recomp")
      why.push(
        "A small cut of " +
          nf(tdee - kcal) +
          " kcal keeps fat coming off slowly while training and protein build muscle = " +
          nf(kcal) +
          " kcal."
      );
    else why.push("No cut and no surplus: " + nf(kcal) + " kcal.");
    var ref = b > 25 ? wAt(25, h) : w,
      ppk = { lose: 1.8, recomp: 1.8, gain: 1.6, strong: 1.6, fit: 1.4 }[g];
    if (a.age < 18) ppk = Math.min(ppk, 1.6);
    var protein = Math.min(rnd(ppk * ref, 5), rnd((0.35 * kcal) / 4, 5));
    var fat = Math.max(rnd((0.25 * kcal) / 9, 5), rnd(0.6 * ref, 5));
    var carbs = Math.max(50, rnd((kcal - protein * 4 - fat * 9) / 4, 5));
    why.push(
      "Protein " +
        ppk +
        " g per kg" +
        (b > 25
          ? " of " + r0(ref) + " kg (your weight at BMI 25, so the number is not inflated by body fat)"
          : "") +
        " = " +
        protein +
        " g. Fat about a quarter of calories = " +
        fat +
        " g. Carbs fill the rest = " +
        carbs +
        " g."
    );
    var out = {
      goal: g,
      asked: a.goal,
      bmr: r0(bmr),
      tdee: rnd(tdee, 10),
      factor: factor,
      kcal: kcal,
      protein: protein,
      carbs: carbs,
      fat: fat,
      fibre: clamp(r0((14 * kcal) / 1000), 25, 40),
      water: clamp(rnd(w * 33, 250), 2000, 4000),
      steps: { lose: 10000, recomp: 9000, fit: 8000, gain: 7000, strong: 7000 }[g],
      sleep: a.age < 18 ? 8 : 7,
      goalW: gw,
      weekly: r1(weekly * 100) / 100,
      weeks: null,
      bmi: r1(b),
      band: band(b),
      lo: Math.ceil(wAt(18.5, h) * 2) / 2,
      hi: Math.floor(wAt(24.9, h) * 2) / 2,
      warn: warn,
      why: why,
      doctor: false
    };
    if ((g === "lose" || g === "gain") && Math.abs(weekly) > 0.03 && Math.abs(gw - w) >= 0.5)
      out.weeks = Math.ceil(Math.abs(gw - w) / Math.abs(weekly));
    // why the plan differs from what was asked for
    if (has(a.health, "preg"))
      warn.unshift(
        "Pregnancy and the months after it change what your body needs. This plan holds calories at maintenance and sets no weight target. Follow your doctor's advice on food and exercise."
      );
    else if (has(a.health, "ed"))
      warn.unshift(
        "Because you ticked an eating disorder, this plan sets no calorie cut and no weight target. A doctor or dietitian who knows you is the right person to set those."
      );
    else if (a.age < 18 && g !== a.goal)
      warn.unshift(
        "You are under 18 and still growing, so this plan does not cut calories. It builds strength, fitness and good eating habits at your current intake."
      );
    else if (a.goal === "lose" && g === "fit")
      warn.unshift(
        "Your weight is already at the low end for your height (BMI " +
          r1(b) +
          "). This plan holds your weight and builds fitness instead of aiming lower."
      );
    if (g === "lose" && a.goalW && a.goalW < out.lo && gw >= out.lo)
      warn.push(
        "Goal weight set to " +
          gw +
          " kg. For your height, anything lower falls below the healthy range (BMI 18.5)."
      );
    if (g === "gain" && b >= 30)
      warn.push(
        "At your current weight, Tone up (losing fat while building muscle) usually works better than eating in a surplus. You can change the goal any time."
      );
    if (a.health.length || a.age >= 65 || b >= 35) {
      out.doctor = true;
      warn.push(
        "Check with a doctor before you start, and show them this plan. That applies to the training as much as the food."
      );
    }
    return out;
  }

  /* ---------- training: what each exercise needs, which slot it fills, what it loads ---------- */
  var TIER = { gym: 3, db: 2, bw: 1 },
    EQ = {};
  words(
    "bench mcp pec lpd scr sap rpd fp hc cr ha ez pc rp oce rgp sace pp scc lpr lext chin hlr kbs bsq dl ohp bbrow pull hipt dip incdb csr idc"
  ).forEach(function (id) {
    EQ[id] = 3;
  });
  words("sdp lat hm gsq rdl lng fwk dbp dbrow dbcurl dbext dbfly dbrear splsq").forEach(function (id) {
    EQ[id] = 2;
  });
  // Equipment an exercise needs: 1 bodyweight, 2 dumbbells, 3 gym.
  function tier(id) {
    return EQ[id] || 1;
  }
  var SLOT = {
    hpush: "bench dbp mcp pu ipu",
    incpush: "incdb dpu mcp dbp pu",
    fly: "pec dbfly",
    vpush: "sdp ohp dpu",
    latraise: "lat",
    vpull: "lpd chin pull",
    hpull: "scr csr bbrow dbrow irow",
    sapd: "sap",
    reardelt: "rpd fp dbrear sup",
    squat: "lpr gsq bsq sq",
    hinge: "rdl dl hipt gb slgb",
    lunge: "lng splsq blng stp",
    quadiso: "lext stp",
    hamiso: "hc slgb gb",
    glute: "hipt ha gb slgb",
    calf: "cr dbcalf",
    curl: "ez dbcurl idc hm pc",
    tri: "rp oce dbext rgp sace dip bdip cpu",
    abs: "cru hlr scc rcr bic rtw",
    core: "pl db pp spl",
    cond: "kbs mtc jsq fwk"
  };
  Object.keys(SLOT).forEach(function (k) {
    SLOT[k] = words(SLOT[k]);
  });
  var FALL = {
    vpush: "latraise",
    fly: "hpush",
    latraise: "vpush",
    vpull: "hpull",
    sapd: "hpull",
    curl: "hpull",
    quadiso: "lunge",
    hamiso: "hinge",
    glute: "hinge",
    incpush: "hpush",
    lunge: "squat",
    squat: "hinge",
    cond: "core"
  };
  var COMPOUND = words("hpush incpush vpush vpull hpull squat hinge lunge glute");
  var ISO = words("fly latraise sapd reardelt quadiso hamiso calf curl tri");
  // the order moves are done in: big lifts while you are fresh, small muscles after, midsection last
  var RANK = {
    squat: 1,
    hinge: 1,
    hpush: 2,
    vpull: 2,
    hpull: 2,
    incpush: 2,
    vpush: 2,
    lunge: 3,
    glute: 3,
    fly: 4,
    sapd: 4,
    quadiso: 4,
    hamiso: 4,
    latraise: 5,
    reardelt: 5,
    calf: 5,
    curl: 6,
    tri: 6,
    abs: 7,
    core: 7,
    cond: 8
  };
  var EASY = words(
      "mcp lpd scr lpr gsq pec ipu sq hc lext rp dbcurl dbp sdp lat rpd cru pl cr incdb csr dbrow sap fp dbrear dbfly hm dbcalf db rcr"
    ),
    HEAVY = words("bench bsq dl ohp bbrow pull chin dip hipt ez");
  var STRESS = {};
  [
    ["knee", "bsq gsq lng blng splsq jsq lext stp sq"],
    ["back", "dl bbrow rdl kbs bsq ohp sup"],
    ["shoulder", "ohp sdp dip bdip dpu bench hlr pull"],
    ["wrist", "pu ipu dpu cpu bdip dip pc ez"]
  ].forEach(function (r) {
    words(r[1]).forEach(function (id) {
      (STRESS[id] = STRESS[id] || []).push(r[0]);
    });
  });

  // The nine areas every plan has to cover each week: key, name, the muscles that count towards it.
  var AREAS = [
    ["chest", "Chest", ["chest"]],
    ["back", "Back", ["lats", "midback", "traps"]],
    ["shoulders", "Shoulders", ["delts", "rdelts"]],
    ["biceps", "Biceps", ["biceps"]],
    ["triceps", "Triceps", ["triceps"]],
    ["quads", "Front of thighs", ["quads"]],
    ["hams", "Back of thighs and glutes", ["hams", "glutes"]],
    ["calves", "Calves", ["calves"]],
    ["core", "Abs and core", ["abs", "obliques"]]
  ];
  var ANAME = {};
  AREAS.forEach(function (ar) {
    ANAME[ar[0]] = ar[1];
  });
  var MINSETS = 4; // the smallest weekly dose per muscle with a measurable effect (Pelland et al. 2026)
  // Sets one exercise gives each area. Counted the way the dose-response research counts them:
  // a full set where the muscle does the main work, half a set where it only helps.
  function areaOf(id) {
    var m = D.EXM[id] || [],
      o = {};
    AREAS.forEach(function (ar) {
      if (has(ar[2], m[0])) o[ar[0]] = 1;
      else if (
        ar[0] !== "core" &&
        m.slice(1, 4).some(function (x) {
          return has(ar[2], x);
        })
      )
        o[ar[0]] = 0.5;
    });
    return o;
  }
  var AREASLOT = {
    chest: "fly hpush incpush",
    back: "hpull vpull sapd",
    shoulders: "latraise reardelt vpush",
    biceps: "curl",
    triceps: "tri",
    quads: "quadiso squat lunge",
    hams: "hamiso hinge glute",
    calves: "calf",
    core: "abs core"
  };
  var AREAKIND = {
    chest: "push upper full",
    back: "pull upper full",
    shoulders: "push upper full arms",
    biceps: "pull upper full arms",
    triceps: "push upper full arms",
    quads: "legs full",
    hams: "legs full",
    calves: "legs full",
    core: "push pull upper full arms legs active"
  };

  // Day types: name, kind (for warm-up, cool-down and finisher), movement slots with the most important first,
  // and, for days named after muscles, the areas the day belongs to.
  var DAY = {
    fulla: ["Full Body A", "full", "squat hpush hpull tri core hamiso curl latraise calf"],
    fullb: ["Full Body B", "full", "hinge vpush vpull curl abs quadiso tri fly calf"],
    fullc: ["Full Body C", "full", "lunge incpush hpull curl tri core latraise hamiso"],
    upa: ["Upper A", "upper", "hpush hpull vpush vpull curl tri abs latraise"],
    upb: ["Upper B", "upper", "incpush vpull hpull latraise tri curl core reardelt fly"],
    loa: ["Lower A", "legs", "squat hinge quadiso hamiso core calf lunge"],
    lob: ["Lower B", "legs", "hinge lunge hamiso quadiso abs calf glute"],
    push: ["Push", "push", "hpush vpush incpush tri latraise fly tri abs"],
    pull: ["Pull", "pull", "vpull hpull curl reardelt hpull curl core sapd"],
    legs: ["Legs", "legs", "squat hinge quadiso hamiso core calf lunge glute"],
    chest: ["Chest", "push", "hpush incpush fly hpush core", "chest"],
    back: ["Back", "pull", "vpull hpull sapd hpull", "back"],
    shoulders: ["Shoulders", "push", "vpush latraise reardelt reardelt abs", "shoulders"],
    legday: ["Legs", "legs", "squat hinge quadiso hamiso calf lunge glute", "quads hams calves"],
    biceps: ["Biceps", "arms", "curl curl curl curl core", "biceps"],
    triabs: ["Triceps + Abs", "arms", "tri tri abs tri abs core tri", "triceps core"],
    armsabs: ["Arms + Abs", "arms", "curl tri curl tri abs curl tri abs core", "biceps triceps core"],
    sharms: [
      "Shoulders + Arms",
      "arms",
      "vpush latraise curl tri reardelt curl tri abs",
      "shoulders biceps triceps"
    ],
    chtri: ["Chest + Triceps", "push", "hpush incpush tri fly tri abs hpush", "chest triceps"],
    bkbi: ["Back + Biceps", "pull", "vpull hpull curl hpull curl core sapd", "back biceps"],
    legsh: [
      "Legs + Shoulders",
      "legs",
      "squat hinge vpush latraise hamiso quadiso reardelt calf",
      "quads hams shoulders calves"
    ],
    shabs: ["Shoulders + Abs", "push", "vpush latraise reardelt abs core reardelt abs", "shoulders core"],
    legabs: [
      "Legs + Abs",
      "legs",
      "squat hinge quadiso hamiso abs calf core lunge",
      "quads hams core calves"
    ],
    active: ["Active Day", "active", "cond core abs abs"]
  };
  var SCHED = {
    full: {
      2: "fulla fullb",
      3: "fulla fullb fullc",
      4: "fulla fullb fullc fulla",
      5: "fulla fullb fullc fulla fullb",
      6: "fulla fullb fullc fulla fullb fullc"
    },
    ul: {
      2: "upa loa",
      3: "upa loa fullb",
      4: "upa loa upb lob",
      5: "upa loa upb lob armsabs",
      6: "upa loa upb lob upa loa"
    },
    ppl: {
      3: "push pull legs",
      4: "push pull legs fullb",
      5: "push pull legs upb lob",
      6: "push pull legs push pull legs"
    },
    double: {
      3: "chtri bkbi legsh",
      4: "chtri bkbi legabs sharms",
      5: "chtri bkbi legday shabs armsabs",
      6: "chtri bkbi legsh chtri bkbi legabs"
    },
    // one muscle group a day: every day is a different muscle, legs come once, arms and abs have their own days
    single: {
      4: "chest back legday sharms",
      5: "chest back shoulders legday armsabs",
      6: "chest back shoulders legday biceps triabs"
    },
    shape: { 5: "push pull legs fullb active", 6: "push pull legs armsabs fullb active" }
  };
  var STYLEWHY = {
    full: "Full body: every muscle is trained each session, so missing a day costs you little. The best fit for two or three days a week.",
    ul: "Upper / lower: each half of the body gets two sessions a week with a day to recover in between.",
    ppl: "Push / pull / legs: muscles that work together are trained together, then rested together.",
    double: "Two muscle groups a day: a big muscle paired with the smaller one that helps it.",
    single:
      "One muscle group a day: each muscle has its own day with three or four exercises, then a week to recover.",
    shape:
      "Push, pull, legs, then full-body and conditioning days: built for fat loss and fitness, with each muscle trained about twice a week."
  };
  var NOTE = {
    full: "Big movements first while you are fresh, smaller muscles after. Leave a day between full-body sessions when you can.",
    upper: "Chest, back, shoulders and arms. Pair each press with a pull so the shoulders stay balanced.",
    legs: "Legs use more energy than any other session. Start every lift lighter than you think and add weight week by week.",
    push: "The pressing muscles: chest, shoulders, triceps. Presses first while you are fresh, the smaller muscles after.",
    pull: "The pulling muscles: back and biceps. Pulldowns and pull-ups build width, rows build thickness.",
    arms: "Slow reps and a full stretch grow arms; swinging heavy weights does not.",
    active:
      "Get your heart rate up: a long brisk walk, a jog, a bike ride, a sport or a swim. Then ten minutes for the midsection."
  };
  var DAYNOTE = {
    chest:
      "Chest day. Press first while you are fresh, then the fly for a full stretch. Your shoulders and triceps help on every press, so they get work today too.",
    back: "Back day. Pulldowns build width, rows build thickness. Pull with your elbows, not your hands; your biceps help on every rep.",
    shoulders:
      "Shoulder day. One press, then raises for the side and the rear of the shoulder. Light weights and slow reps: these are small muscles.",
    legday:
      "Leg day. The biggest muscles you have, so this is the hardest session of the week. Start every lift lighter than you think.",
    biceps:
      "Biceps day. Elbows still, no swinging, full stretch at the bottom of every rep. Finish with the core work.",
    triabs:
      "Triceps and abs. Keep your elbows fixed and move only the forearm. On the abs, slow controlled reps beat fast ones.",
    armsabs:
      "Arms and abs. Alternate a curl with a triceps move, slow reps and a full stretch. Finish with the abs.",
    sharms: "Shoulders and arms. Press first, then the raises, then curls and triceps.",
    chtri:
      "Chest and triceps. The presses come first because the triceps help on them; then the triceps get their own work.",
    bkbi: "Back and biceps. Pulls and rows first, curls after: the biceps are already warm from helping.",
    legsh: "Legs and shoulders. Squat and hinge first, then the shoulder work while your legs recover.",
    shabs: "Shoulders and abs. One press, then raises with light weights and slow reps. Finish with the abs.",
    legabs:
      "Legs and abs. The big leg lifts first; the abs work comes last so a tired midsection never limits your squat."
  };
  var WARMUP = {
    full: ["Bodyweight squats, 12", "Push-ups on a raised surface, 8", "Hip hinges with no weight, 10"],
    upper: [
      "Arm swings across the chest, 10",
      "Shoulder-blade squeezes, 12",
      "Push-ups on a raised surface, 8"
    ],
    legs: ["Bodyweight squats, 12 slow", "Glute bridges, 12", "Leg swings, 10 each leg"],
    push: ["Arm swings across the chest, 10", "Push-ups on a raised surface, 8 slow"],
    pull: [
      "Shoulder-blade squeezes, 12",
      "Arm circles, 10 each way",
      "Dead hang or doorway stretch, 2 × 15 seconds"
    ],
    arms: ["Wrist circles, 10 each way", "Arm circles, 10 each way"],
    active: ["Leg swings, 10 each leg", "Easy pace for the first 5 minutes"]
  };
  var COOL = {
    full: ["chest", "hamstring", "hipflexor", "child"],
    upper: ["chest", "upperback", "triceps", "child"],
    legs: ["quad", "hamstring", "hipflexor", "glute", "calf"],
    push: ["chest", "shoulder", "triceps", "child"],
    pull: ["upperback", "biceps", "cat", "child"],
    arms: ["biceps", "triceps", "shoulder", "cat"],
    active: ["hamstring", "hipflexor", "calf", "child"]
  };
  var FOCUS = {
    arms: ["curl", "tri"],
    abs: ["abs", "core"],
    chest: ["fly", "incpush"],
    back: ["sapd", "hpull"],
    shoulders: ["latraise", "reardelt"],
    legs: ["quadiso", "hamiso"],
    glutes: ["glute"]
  };
  var FOCUSOK = {
    arms: "upper push pull full arms",
    abs: "upper push pull full arms legs active",
    chest: "upper push full",
    back: "upper pull full",
    shoulders: "upper push full arms",
    legs: "legs full",
    glutes: "legs full"
  };
  var FOCUSAREA = {
    arms: "biceps triceps",
    abs: "core",
    chest: "chest",
    back: "back",
    shoulders: "shoulders",
    legs: "quads hams",
    glutes: "hams"
  };
  var MAXEX = { new: 6, mid: 7, adv: 8 };
  var HOMEWARM = [
    ["Easy cardio", "March on the spot, building to a light jog or skipping", null, 180],
    ["Arm circles", "10 forward, 10 backward", "Arm_Circles", 30],
    ["Shoulder rolls", "10 slow rolls", "Shoulder_Circles", 25],
    ["Torso rotations", "10 each side, feet planted, turning from the upper back", null, 30],
    ["Shoulder-blade squeezes", "15 reps, arms out to the sides, pinch the blades together", null, 35],
    ["Hip circles", "8 each way", "Standing_Hip_Circles", 30],
    ["Bodyweight squats", "10 slow reps, sitting back and down", "Bodyweight_Squat", 40]
  ];

  // Exercises that can fill a movement slot, best suited first.
  function candidates(slot, a, strict) {
    var t = TIER[a.place],
      list = (SLOT[slot] || []).filter(function (id) {
        return tier(id) <= t && D.EX[id];
      });
    if (strict && a.limits.length)
      list = list.filter(function (id) {
        return !(STRESS[id] || []).some(function (s) {
          return has(a.limits, s);
        });
      });
    var heavy = a.exp === "adv" || (a.goal === "strong" && a.exp !== "new"),
      easy = a.exp === "new";
    function score(id) {
      return easy ? (has(EASY, id) ? -1 : has(HEAVY, id) ? 1 : 0) : heavy ? (has(HEAVY, id) ? -1 : 0) : 0;
    }
    return list
      .map(function (id, i) {
        return [id, score(id), i];
      })
      .sort(function (x, y) {
        return x[1] - y[1] || x[2] - y[2];
      });
  }
  // first choice not already used today; among those, the one used least this week
  function pick(slot, a, today, week, depth) {
    function best(list) {
      // list: [id, suitability, order]; stay in the most suitable group, rotate inside it
      list = list.filter(function (x) {
        return today.indexOf(x[0]) < 0;
      });
      if (!list.length) return null;
      list = list.filter(function (x) {
        return x[1] === list[0][1];
      });
      var m = Math.min.apply(
        null,
        list.map(function (x) {
          return week[x[0]] || 0;
        })
      );
      return list.filter(function (x) {
        return (week[x[0]] || 0) === m;
      })[0][0];
    }
    var id = best(candidates(slot, a, true));
    if (!id && FALL[slot] && (depth || 0) < 2) id = pick(FALL[slot], a, today, week, (depth || 0) + 1);
    if (!id && !depth) id = best(candidates(slot, a, false));
    return id;
  }
  // which split the week uses, and a plain reason whenever it is not the one that was asked for
  function styleFor(a, g) {
    var n = a.days.length,
      st = a.style,
      note = "",
      from = st;
    if (st === "auto") {
      if (n <= 3) st = "full";
      else if (n === 4 || a.place === "bw") st = "ul";
      else if (g === "lose" || g === "recomp" || g === "fit") st = "shape";
      else st = a.exp === "new" ? "ul" : "ppl";
    } else if (a.place === "bw" && st !== "full" && st !== "ul") {
      st = n >= 4 ? "ul" : "full";
      note =
        label("style", from) +
        " needs weights. With no equipment there are too few pulling, shoulder and arm exercises to fill those days, so the plan uses " +
        label("style", st).toLowerCase() +
        ", which trains every muscle with moves you can do at home.";
    } else if (a.place === "db" && st === "single") {
      st = "double";
      note =
        "One muscle group a day needs the machines and cables of a gym: with dumbbells alone there are not enough different exercises for a whole back or shoulder day. The plan pairs two muscle groups a day instead.";
    }
    if (!SCHED[st][n]) {
      var was = st;
      st = n <= 2 ? (st === "ppl" || st === "double" ? "ul" : "full") : n === 3 ? "double" : "ul";
      if (!SCHED[st][n]) st = "full";
      if (!note)
        note =
          label("style", was) +
          " needs " +
          (was === "single" ? "at least four" : "at least three") +
          " training days, so with " +
          n +
          " the plan uses " +
          label("style", st).toLowerCase() +
          " instead. That way no muscle waits too long for its next session.";
    }
    return { st: st, note: note, asked: from };
  }
  // the names of the training days a set of answers leads to, for the preview in the setup
  function weekNames(a0, style) {
    var a = clean(a0);
    if (style) a.style = style;
    var sf = styleFor(a, effGoal(a));
    return {
      st: sf.st,
      changed: !!sf.note,
      names: words(SCHED[sf.st][a.days.length]).map(function (k) {
        return DAY[k][0];
      })
    };
  }
  // Sets, reps and rest for an exercise in this plan.
  function rxFor(id, slot, order, a, g, own, lead) {
    var e = D.EX[id],
      comp = has(COMPOUND, slot),
      iso = has(ISO, slot),
      mid = slot === "abs" || slot === "core",
      o = {};
    var fresh = a.exp === "new",
      short = a.mins <= 30,
      sets = 3;
    if (mid) {
      if (!short) return null;
      o.sets = 2;
      return o;
    }
    if (!comp && !iso) return null; // conditioning keeps its own numbers
    if (iso && (fresh || short) && !(own && !short)) sets = 2; // small moves: two sets for beginners and short sessions, three on the muscle's own day
    if (comp && !fresh && !short && order < 2 && (g === "gain" || g === "strong")) sets = 4;
    if (lead && !fresh && !short) sets = 4; // the first lift of a muscle's own day
    o.sets = sets;
    if (e.unit === "sec" || e.bw) {
      o.rest = comp ? 75 : 60;
      return o;
    } // bodyweight moves keep their own rep range
    if (g === "strong") {
      if (comp && order < 2) {
        o.lo = fresh ? 5 : 4;
        o.hi = fresh ? 8 : 6;
        o.rest = 180;
      } else if (comp) {
        o.lo = 6;
        o.hi = 10;
        o.rest = 120;
      } else {
        o.lo = 10;
        o.hi = 12;
        o.rest = 75;
      }
    } else if (g === "gain") {
      if (comp) {
        o.lo = 6;
        o.hi = 10;
        o.rest = 120;
      } else {
        o.lo = 10;
        o.hi = 15;
        o.rest = 75;
      }
    } else {
      if (comp) {
        o.lo = 8;
        o.hi = 12;
        o.rest = 90;
      } else {
        o.lo = 12;
        o.hi = 15;
        o.rest = 60;
      }
    }
    if (short && o.rest > 75 && !(g === "strong" && order < 2)) o.rest = 75; // short sessions: rests stay above a minute, the point where shorter starts to cost results
    return o;
  }
  // Minutes for warm-up and cool-down.
  function overhead(a) {
    return a.mins <= 30 ? 8 : 12;
  } // warm-up and cool-down
  // Minutes an exercise takes, rests included.
  function exMins(id, rx) {
    var e = D.EX[id],
      r = rx[id] || {},
      sets = r.sets || e.sets,
      rest = r.rest || e.rest;
    return ((sets * (45 + rest)) / 60) * (e.each ? 1.35 : 1);
  }
  // Minutes a finisher takes.
  function finMins(fin) {
    return fin && D.FIN[fin]
      ? (D.FIN[fin].rounds *
          D.FIN[fin].steps.reduce(function (x, y) {
            return x + y[1];
          }, 0)) /
          60
      : 0;
  }
  // Minutes a whole session takes.
  function sessionMins(ids, rx, fin, a) {
    var s = overhead(a);
    ids.forEach(function (id) {
      s += exMins(id, rx);
    });
    return Math.round(s + finMins(fin));
  }
  // the finisher that fits the goal and the minutes left; conditioning for fat loss and fitness, midsection work otherwise
  function finFor(kind, a, g, i, left, hasMid) {
    var t = TIER[a.place],
      cond = g === "lose" || g === "recomp" || g === "fit";
    if (kind === "active") return left >= 30 ? "cardio" : left >= 20 ? "cardio20" : "steady";
    if (cond) {
      if (kind === "legs") return left >= 10 ? "walk" : null;
      var hiit = t === 3 && kind === "pull" ? "sprint" : "feet";
      if (left >= 15 && i % 2 === 0) return "steady";
      if (left >= 8) return hiit;
      if (left >= 6 && !hasMid) return i % 2 ? "core" : "abs";
      return null;
    }
    if (kind !== "legs" && left >= 6 && !hasMid) return i % 2 ? "core" : "abs";
    return null;
  }
  var GROUPS = [
    ["Chest", ["chest"]],
    ["Back", ["lats", "midback", "traps"]],
    ["Shoulders", ["delts", "rdelts"]],
    ["Arms", ["biceps", "triceps"]],
    ["Legs", ["quads", "hams", "glutes"]],
    ["Core", ["abs", "obliques"]]
  ];
  // The training week: split, exercises per day, sets and reps, finishers, and the weekly sets per muscle.
  function program(a0, tg) {
    var a = clean(a0),
      g = tg.goal,
      sf = styleFor(a, g),
      n = a.days.length,
      keys = words(SCHED[sf.st][n]);
    var named = sf.st === "single" || sf.st === "double",
      cond = g === "lose" || g === "recomp" || g === "fit";
    var rx = {},
      week = {},
      mins = {},
      notes = [],
      focusI = 0,
      home = a.place !== "gym",
      budget = a.mins + 5,
      days = [];
    if (sf.note) notes.push(sf.note);
    function ensure(id, slot, order, own, lead) {
      if (!rx[id]) {
        var r = rxFor(id, slot, order, a, g, own, lead);
        if (r) rx[id] = r;
      }
    }
    function used(d) {
      var s = overhead(a) + d.reserve;
      d.list.forEach(function (x) {
        s += exMins(x.id, rx);
      });
      return s;
    }
    function ownOf(d, id) {
      var ar = areaOf(id);
      return (
        !!d.own &&
        d.own.some(function (k) {
          return ar[k] === 1;
        })
      );
    }
    // try one more exercise on a day; it only stays if the session still fits
    function add(d, slot, force) {
      var ids = d.list.map(function (x) {
          return x.id;
        }),
        id = pick(slot, a, ids, week);
      if (!id) return null;
      var isNew = !rx[id],
        lead = named && !d.list.length && ownOf(d, id);
      ensure(id, slot, d.list.length, named && ownOf(d, id), lead);
      if (!force && used(d) + exMins(id, rx) > budget) {
        if (isNew) delete rx[id];
        return null;
      }
      d.list.push({ id: id, slot: slot });
      return id;
    }
    // which session of the template falls on which weekday; sessions are built in template order, so moving a
    // session to another day never changes its exercises
    var slotOf = {};
    a.days.forEach(function (dow, i) {
      slotOf[dow] = a.order ? a.order[DOWS.indexOf(dow)] : i;
    });
    a.days
      .slice()
      .sort(function (x, y) {
        return slotOf[x] - slotOf[y];
      })
      .forEach(function (dow) {
        var di = slotOf[dow],
          def = DAY[keys[di]],
          kind = def[1],
          slots = words(def[2]),
          d = {
            dow: dow,
            key: keys[di],
            def: def,
            kind: kind,
            own: def[3] ? words(def[3]) : null,
            list: [],
            di: di
          };
        d.cap = kind === "active" ? (a.mins >= 60 ? 3 : 2) : Math.min(MAXEX[a.exp], a.mins <= 30 ? 5 : 9);
        d.reserve = cond && a.mins >= 45 && kind !== "legs" && kind !== "active" ? 8 : 0; // room kept for a conditioning finisher
        // a focus area gets one extra move, placed fourth so it survives a short session
        var fz = a.focus.filter(function (f) {
          return named
            ? f === "abs" ||
                words(FOCUSAREA[f]).some(function (k) {
                  return has(d.own || [], k);
                })
            : has(words(FOCUSOK[f]), kind);
        });
        if (fz.length && kind !== "active") {
          var f = fz[focusI++ % fz.length],
            fs = FOCUS[f];
          slots.splice(Math.min(3, slots.length), 0, fs[di % fs.length]);
        }
        for (var si = 0; si < slots.length && d.list.length < d.cap; si++) add(d, slots[si]);
        // a slot can come up empty with little equipment; never leave a session with fewer than three moves
        for (
          var fi = 0, fill = ["core", "abs", "hinge", "hpush", "cond"];
          d.list.length < 3 && fi < fill.length;
          fi++
        )
          add(d, fill[fi], true);
        d.list.forEach(function (x) {
          week[x.id] = (week[x.id] || 0) + 1;
        });
        days.push(d);
      });
    function setsOf(id) {
      return (rx[id] || {}).sets || D.EX[id].sets;
    }
    function volume() {
      var v = {};
      AREAS.forEach(function (ar) {
        v[ar[0]] = 0;
      });
      days.forEach(function (d) {
        d.list.forEach(function (x) {
          var ar = areaOf(x.id),
            k;
          for (k in ar) v[k] += ar[k] * setsOf(x.id);
        });
      });
      return v;
    }
    // sets aimed straight at a muscle; arms and abs must get some every week, not only the help they give on presses and pulls
    function direct() {
      var v = { biceps: 0, triceps: 0, core: 0 };
      days.forEach(function (d) {
        d.list.forEach(function (x) {
          var ar = areaOf(x.id);
          ["biceps", "triceps", "core"].forEach(function (k) {
            if (ar[k] === 1) v[k] += setsOf(x.id);
          });
        });
      });
      return v;
    }
    var OWN = 2;
    function short(v, dv) {
      var s = 0;
      dv = dv || direct();
      AREAS.forEach(function (ar) {
        if (ar[0] !== "calves") s += Math.max(0, MINSETS - v[ar[0]]);
      });
      ["biceps", "triceps", "core"].forEach(function (k) {
        s += 3 * Math.max(0, OWN - dv[k]);
      });
      return s;
    }
    // Coverage check. Whatever the split, every muscle has to reach the weekly minimum: add a move where
    // there is time, otherwise swap out a move from a muscle that has plenty.
    for (var pass = 0; pass < 24; pass++) {
      var v = volume(),
        dv = direct(),
        lack = function (k) {
          return dv[k] != null && dv[k] < OWN ? -10 + dv[k] : v[k];
        };
      var need = AREAS.filter(function (ar) {
        return ar[0] !== "calves" && (v[ar[0]] < MINSETS || (dv[ar[0]] != null && dv[ar[0]] < OWN));
      }).sort(function (x, y) {
        return lack(x[0]) - lack(y[0]);
      });
      if (!need.length) break;
      var fixed = false;
      for (var ni = 0; ni < need.length && !fixed; ni++) {
        var area = need[ni][0],
          slotsA = words(AREASLOT[area]);
        var fit = days
          .filter(function (d) {
            return (
              d.kind !== "active" &&
              has(words(AREAKIND[area]), d.kind) &&
              (!named || area === "core" || has(d.own || [], area))
            );
          })
          .sort(function (x, y) {
            return used(x) - used(y);
          });
        for (var fi2 = 0; fi2 < fit.length && !fixed; fi2++) {
          var d2 = fit[fi2];
          if (d2.list.length < d2.cap)
            for (var s2 = 0; s2 < slotsA.length && !fixed; s2++) {
              var got = add(d2, slotsA[s2]);
              if (got) {
                if (areaOf(got)[area] === 1) {
                  week[got] = (week[got] || 0) + 1;
                  fixed = true;
                } else d2.list.pop();
              }
            }
        }
        // no room anywhere: replace the least important move of a muscle that can spare it
        for (var fi3 = 0; fi3 < fit.length && !fixed; fi3++) {
          var d3 = fit[fi3],
            before = short(v, dv);
          for (var xi = d3.list.length - 1; xi >= 1 && !fixed; xi--) {
            var old = d3.list[xi];
            d3.list.splice(xi, 1);
            var got2 = null;
            for (var s3 = 0; s3 < slotsA.length && !got2; s3++) {
              got2 = add(d3, slotsA[s3]);
              if (got2 && areaOf(got2)[area] !== 1) {
                d3.list.pop();
                got2 = null;
              }
            }
            if (got2 && short(volume()) < before - 0.01) {
              week[got2] = (week[got2] || 0) + 1;
              week[old.id]--;
              fixed = true;
            } else {
              if (got2) d3.list.pop();
              d3.list.splice(xi, 0, old);
            }
          }
        }
      }
      if (!fixed) break;
    }
    Object.keys(rx).forEach(function (id) {
      if (!week[id]) delete rx[id];
    }); // overrides for moves that did not make the final week
    var split = {};
    days.forEach(function (d) {
      var kind = d.kind,
        sorted = d.list.map(function (x, i) {
          return [x, i];
        });
      if (kind !== "active")
        sorted.sort(function (x, y) {
          return (RANK[x[0].slot] || 9) - (RANK[y[0].slot] || 9) || x[1] - y[1];
        });
      var ids = sorted.map(function (x) {
        return x[0].id;
      });
      var hasMid = d.list.some(function (x) {
        return x.slot === "abs" || x.slot === "core";
      });
      var left = budget - (used(d) - d.reserve),
        fin = finFor(kind, a, g, d.di, left, hasMid);
      if (fin && kind !== "active" && finMins(fin) > left + 0.5) fin = null;
      var mus = [];
      ids.forEach(function (id) {
        (D.EXM[id] || []).slice(0, 2).forEach(function (m) {
          if (mus.indexOf(m) < 0) mus.push(m);
        });
      });
      var first = D.EX[ids[0]],
        warm = WARMUP[kind].slice();
      if (first && !first.bw && kind !== "active")
        warm.push("One light set of " + first.n.toLowerCase() + ", 12 easy reps");
      split[d.dow] = {
        name: DNAME[d.dow],
        focus: d.def[0],
        kind: kind,
        muscles: mus.slice(0, 6),
        fin: fin || undefined,
        cool: COOL[kind].slice(),
        note: DAYNOTE[d.key] || NOTE[kind],
        warm: warm,
        ex: ids
      };
      mins[d.dow] = sessionMins(ids, rx, fin, a);
    });
    var walk = cond;
    DOWS.forEach(function (dow) {
      if (!split[dow])
        split[dow] = {
          name: DNAME[dow],
          focus: "Rest",
          kind: "rest",
          muscles: [],
          note: walk
            ? "Rest from lifting. An easy 30-minute walk keeps you moving; your body gets fitter while it recovers."
            : "Full rest. Eat well and sleep long: this is when the muscle is built.",
          warm: [],
          ex: [],
          cool: []
        };
    });
    var ordered = {};
    DOWS.forEach(function (dow) {
      ordered[dow] = split[dow];
    });
    split = ordered; // Monday first, whatever order the days were built in
    // the weekly count for every area, and the days it is trained on
    var vol2 = volume(),
      cover = AREAS.map(function (ar) {
        var k = ar[0],
          on = [],
          direct = 0;
        days.forEach(function (d) {
          var hit = 0;
          d.list.forEach(function (x) {
            var w = areaOf(x.id)[k];
            if (w === 1) {
              hit = 2;
              direct += setsOf(x.id);
            } else if (w && !hit) hit = 1;
          });
          if (hit === 2) on.push(DNAME[d.dow].slice(0, 3));
        });
        // the midsection circuits used as finishers count as three sets each
        if (k === "core")
          a.days.forEach(function (dow) {
            var fn = split[dow].fin;
            if (fn === "abs" || fn === "core") {
              vol2.core += 3;
              direct += 3;
              if (on.indexOf(DNAME[dow].slice(0, 3)) < 0) on.push(DNAME[dow].slice(0, 3));
            }
          });
        var sets = Math.round(vol2[k] * 2) / 2,
          SH = DOWS.map(function (x) {
            return DNAME[x].slice(0, 3);
          });
        on.sort(function (x, y) {
          return SH.indexOf(x) - SH.indexOf(y);
        });
        return {
          k: k,
          n: ar[1],
          sets: sets,
          direct: direct,
          days: on,
          level: sets < MINSETS ? "light" : sets < 10 ? "good" : "strong"
        };
      });
    var vol = {};
    GROUPS.forEach(function (gr) {
      vol[gr[0]] = 0;
    });
    a.days.forEach(function (dow) {
      split[dow].ex.forEach(function (id) {
        var e = D.EX[id],
          sets = (rx[id] || {}).sets || e.sets,
          m = D.EXM[id] || [];
        GROUPS.forEach(function (gr) {
          if (has(gr[1], m[0])) vol[gr[0]] += sets;
          else if (has(gr[1], m[1])) vol[gr[0]] += sets / 2;
        });
      });
    });
    Object.keys(vol).forEach(function (k) {
      vol[k] = Math.round(vol[k]);
    });
    var thin = cover
      .filter(function (c) {
        return c.k !== "calves" && c.level === "light";
      })
      .map(function (c) {
        return c.n.toLowerCase();
      });
    if (thin.length)
      notes.push(
        n +
          " sessions of " +
          a.mins +
          " minutes cover every muscle, but " +
          thin.join(", ").replace(/, ([^,]*)$/, " and $1") +
          " get" +
          (thin.length === 1 ? "s" : "") +
          " fewer than the " +
          MINSETS +
          " sets a week that studies point to as the least for visible growth. One more day, or longer sessions, fixes that."
      );
    if (sf.st === "single")
      notes.push(
        "One muscle group a day works as well as any other split when the weekly sets are the same; that is what the research compares. Each muscle gets up to 12 sets on its own day, and your arms and shoulders get a second, lighter dose on chest and back days because they help on every press and pull."
      );
    if (a.exp === "new")
      notes.push(
        "Your first two weeks are learning weeks: two sets of each exercise with a light weight, stopping while you could still do three or four more reps. Beginners improve on very little, and clean form now saves you injuries later."
      );
    if (a.limits.length)
      notes.push(
        "Left out where possible: the moves that usually aggravate " +
          a.limits
            .map(function (l) {
              return label("limits", l).toLowerCase();
            })
            .join(" and ") +
          ". This is not treatment. Pain that is sharp, or that lasts, needs to be seen."
      );
    if (a.place === "bw")
      notes.push(
        "With no equipment the back and biceps are the hardest to train. A sturdy table for inverted rows, or a doorway pull-up bar, makes a big difference."
      );
    for (var i = 1, run = 1, maxRun = 1; i < 14; i++) {
      if (has(a.days, DOWS[i % 7]) && has(a.days, DOWS[(i - 1) % 7])) {
        run++;
        maxRun = Math.max(maxRun, run);
      } else run = 1;
    }
    if (sf.st === "full" && maxRun > 1 && n <= 4)
      notes.push(
        "Full-body sessions on back-to-back days leave little time to recover. Spread your days out if your week allows."
      );
    return {
      split: split,
      rx: rx,
      warm: home ? HOMEWARM : null,
      info: {
        style: sf.st,
        asked: sf.asked,
        why: STYLEWHY[sf.st],
        mins: mins,
        vol: vol,
        cover: cover,
        notes: notes
      }
    };
  }

  /* ---------- routine: clock helpers, meal times, timetable, reminders ---------- */
  function toMin(s) {
    var p = String(s).split(":");
    return +p[0] * 60 + +p[1];
  }
  // Minutes after midnight to HH:MM.
  function hhmm(m) {
    m = ((Math.round(m) % 1440) + 1440) % 1440;
    return ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + (m % 60)).slice(-2);
  }
  // HH:MM to a 12-hour clock.
  function t12(s) {
    var m = toMin(s),
      h = Math.floor(m / 60),
      x = m % 60;
    return ((h + 11) % 12) + 1 + ":" + ("0" + x).slice(-2) + (h < 12 ? " AM" : " PM");
  }
  // Meal, training and bed times around the user's day.
  function routine(a0) {
    var a = clean(a0),
      wk = toMin(a.wake),
      rel = function (s) {
        return (toMin(s) - wk + 1440) % 1440;
      }; // minutes after waking
    var awake = rel(a.bed) || 960;
    if (awake < 600) awake = 960;
    var ws = rel(a.wt);
    if (ws >= awake - 60) ws = Math.min(60, awake / 4);
    var we = ws + a.mins + 10,
      morning = ws <= 150,
      normal = wk >= 240 && wk <= 570;
    var bf = morning ? we + 20 : 45;
    var lunch = normal ? Math.max(780 - wk, bf + 180) : Math.max(bf + 240, awake * 0.4);
    var dinner = awake - 90;
    if (normal) dinner = Math.min(dinner, 1260 - wk);
    dinner = Math.max(dinner, lunch + 270);
    dinner = Math.min(dinner, awake - 45);
    var snack = normal ? Math.max(990 - wk, lunch + 150) : (lunch + dinner) / 2;
    snack = Math.min(snack, dinner - 120);
    function clear(t) {
      return t > ws - 40 && t < we + 15 ? we + 20 : t;
    } // never plan a meal on top of the session
    lunch = clear(lunch);
    snack = clear(snack);
    dinner = clear(dinner);
    if (!morning) bf = clear(bf);
    var pre = morning ? Math.min(10, Math.max(0, ws - 20)) : (bf + lunch) / 2; // before training, or a mid-morning snack
    var q = function (t) {
      return hhmm(wk + rnd(t, 5));
    };
    return {
      wk: wk,
      awake: awake,
      ws: ws,
      we: we,
      morning: morning,
      t: {
        wake: q(0),
        weigh: q(5),
        pre: q(pre),
        train: q(ws),
        end: q(we),
        bf: q(bf),
        lunch: q(lunch),
        snack: q(snack),
        dinner: q(dinner),
        wind: q(awake - 30),
        bed: q(awake)
      }
    };
  }

  /* ---------- food: dishes built from the food table, chosen for the person and scaled meal by meal ---------- */
  // what each food is, for diet and allergy rules: m meat/fish, e egg, d dairy, s soya, n nuts, g gluten
  var FT = {
    chicken: "m",
    fish: "m",
    egg: "e",
    milk: "d",
    dahi: "d",
    paneer: "d",
    chaas: "d",
    curdrice: "d",
    whey: "d",
    paneerparatha: "dg",
    soya: "s",
    soyamilk: "s",
    tofu: "s",
    peanuts: "n",
    pb: "n",
    almonds: "n",
    chapati: "g",
    oats: "g",
    breadbrown: "g",
    thepla: "g",
    dalia: "g",
    upma: "g"
  };
  // which "foods I usually eat" tick a food needs before a dish may use it
  var EATKEY = {
    egg: "egg",
    chicken: "chicken",
    fish: "fish",
    paneer: "paneer",
    paneerparatha: "paneer",
    dahi: "dahi",
    chaas: "dahi",
    curdrice: "dahi rice",
    milk: "milk",
    dal: "dal",
    sambar: "dal",
    khichdi: "dal rice",
    rajma: "rajma",
    soya: "soya",
    tofu: "tofu",
    sprouts: "sprouts",
    chana: "chana",
    peanuts: "peanuts",
    pb: "peanuts",
    whey: "whey",
    chapati: "roti",
    thepla: "roti",
    rice: "rice",
    oats: "oats",
    poha: "poha",
    upma: "poha",
    idli: "idli",
    dosa: "idli",
    breadbrown: "bread",
    ragiroti: "millet",
    bhakri: "millet"
  };
  var EATFOOD = {
    egg: "egg",
    chicken: "chicken",
    fish: "fish",
    paneer: "paneer",
    dahi: "dahi",
    milk: "milk",
    dal: "dal",
    rajma: "rajma",
    soya: "soya",
    tofu: "tofu",
    sprouts: "sprouts",
    chana: "chana",
    peanuts: "peanuts",
    whey: "whey",
    roti: "chapati",
    rice: "rice",
    oats: "oats",
    poha: "poha",
    idli: "idli",
    bread: "breadbrown",
    millet: "ragiroti"
  };
  var EATPROTEIN = words("egg chicken fish paneer dahi milk dal rajma soya tofu sprouts chana peanuts whey"),
    EATSTAPLE = words("roti rice oats poha idli bread millet");
  var EATBASE = {
    north: "roti rice dal rajma paneer dahi milk chana peanuts poha",
    south: "rice idli dal dahi milk chana peanuts millet poha",
    west: "roti rice poha millet dal sprouts dahi milk chana peanuts",
    east: "rice roti dal dahi milk chana peanuts",
    mix: "roti rice dal dahi milk poha oats chana peanuts sprouts",
    global: "oats bread rice dahi milk peanuts rajma"
  };
  // usual portion of each food, in units of the food table: [start, step, least, most]
  var PORT = {
    egg: [2, 1, 1, 4],
    chicken: [1.25, 0.25, 0.5, 2.5],
    fish: [1.5, 0.25, 0.5, 2.5],
    soya: [4, 1, 2, 5],
    paneer: [2, 0.5, 1, 3],
    tofu: [1.5, 0.5, 0.5, 2.5],
    dal: [1.5, 0.5, 0.5, 2],
    rajma: [1.5, 0.5, 1, 2.5],
    sambar: [1, 0.5, 1, 2],
    milk: [1, 0.5, 0.5, 2],
    soyamilk: [1, 0.5, 0.5, 2],
    dahi: [1, 0.5, 0.5, 2.5],
    sprouts: [1, 0.5, 0.5, 2],
    chana: [1, 0.5, 0.5, 2],
    peanuts: [1, 1, 1, 3],
    pb: [1, 0.5, 0.5, 2],
    almonds: [1, 0.5, 0.5, 2],
    whey: [1, 0.5, 1, 1.5],
    sattu: [1.5, 0.5, 1, 2],
    chapati: [3, 1, 2, 5],
    rice: [1.5, 0.25, 0.75, 3.5],
    oats: [1, 0.5, 0.5, 2],
    poha: [1, 0.25, 0.5, 1.5],
    upma: [1, 0.25, 0.5, 1.5],
    idli: [3, 1, 2, 6],
    dosa: [2, 1, 1, 4],
    breadbrown: [2, 1, 1, 4],
    ragiroti: [2, 1, 1, 4],
    bhakri: [2, 0.5, 1, 3],
    thepla: [2, 1, 1, 4],
    besanchilla: [3, 1, 1, 4],
    moongchilla: [2, 1, 1, 4],
    paneerparatha: [1, 0.5, 1, 2],
    khichdi: [1.25, 0.25, 0.5, 2],
    dalia: [1.5, 0.5, 1, 3],
    curdrice: [1, 0.25, 0.5, 1.5],
    potato: [1.5, 0.5, 0.5, 2.5],
    makhana: [1, 0.5, 1, 2],
    banana: [1, 1, 1, 2],
    dates: [1, 0.5, 0.5, 3]
  };
  // rough Indian city prices in rupees for one unit of the food table; used for ranking and for the monthly estimate
  var COST = {
    egg: 7,
    chicken: 28,
    fish: 30,
    soya: 1.5,
    paneer: 20,
    tofu: 25,
    dal: 9,
    rajma: 12,
    sambar: 10,
    milk: 15,
    soyamilk: 12,
    dahi: 8,
    sprouts: 6,
    chana: 6,
    peanuts: 2.5,
    pb: 6,
    almonds: 10,
    whey: 65,
    sattu: 5,
    chapati: 2.5,
    rice: 2.5,
    oats: 9,
    poha: 8,
    upma: 8,
    idli: 4,
    dosa: 8,
    breadbrown: 3.5,
    ragiroti: 3.5,
    bhakri: 5,
    thepla: 5,
    besanchilla: 6,
    moongchilla: 7,
    paneerparatha: 22,
    khichdi: 15,
    dalia: 5,
    curdrice: 15,
    potato: 5,
    makhana: 15,
    banana: 5,
    dates: 6,
    sabzi: 12,
    salad: 8,
    oil: 1,
    chaas: 8,
    blackcoffee: 3,
    guava: 8,
    apple: 25,
    orange: 10,
    papaya: 10
  };
  var BUDCAP = { low: 5000, mid: 8000, high: null },
    BUDW = { low: 8, mid: 30, high: 200 };
  // foods a home kitchen buys anyway; everything else is the extra a person pays for their own plan
  var BASICS = words(
    "chapati rice dal rajma sabzi salad oil poha upma bhakri ragiroti sambar khichdi idli dosa thepla dalia curdrice besanchilla moongchilla potato"
  );
  // how amounts are written: one, many; foods sold by weight keep their grams
  var UNITS = {
    egg: ["egg", "eggs"],
    chapati: ["chapati", "chapatis"],
    ragiroti: ["ragi roti", "ragi rotis"],
    idli: ["idli", "idlis"],
    dosa: ["plain dosa", "plain dosas"],
    banana: ["banana", "bananas"],
    breadbrown: ["slice of brown bread", "slices of brown bread"],
    bhakri: ["bhakri", "bhakris"],
    thepla: ["thepla", "theplas"],
    besanchilla: ["besan chilla", "besan chillas"],
    moongchilla: ["moong dal chilla", "moong dal chillas"],
    paneerparatha: ["paneer paratha", "paneer parathas"],
    dal: ["katori of dal", "katoris of dal"],
    rajma: ["katori of rajma or chole", "katoris of rajma or chole"],
    sambar: ["katori of sambar", "katoris of sambar"],
    sabzi: ["katori of sabzi", "katoris of sabzi"],
    sprouts: ["katori of sprouts", "katoris of sprouts"],
    oil: ["tsp of oil", "tsp of oil"],
    poha: ["plate of poha", "plates of poha"],
    upma: ["plate of upma", "plates of upma"],
    khichdi: ["plate of dal khichdi", "plates of dal khichdi"],
    curdrice: ["plate of curd rice", "plates of curd rice"],
    dalia: ["katori of dalia", "katoris of dalia"],
    potato: ["boiled potato", "boiled potatoes"],
    guava: ["guava", "guavas"],
    apple: ["apple", "apples"],
    orange: ["orange", "oranges"],
    pb: ["tbsp of peanut butter", "tbsp of peanut butter"],
    whey: ["scoop of protein powder", "scoops of protein powder"],
    sattu: ["glass of sattu drink", "glasses of sattu drink"],
    blackcoffee: ["cup of black coffee", "cups of black coffee"],
    salad: ["plate of salad", "plates of salad"]
  };
  var GNAME = {
    milk: "milk",
    dahi: "curd",
    rice: "cooked rice",
    oats: "oats",
    chicken: "chicken (raw weight)",
    fish: "fish (raw weight)",
    soya: "soya chunks (dry weight)",
    soyamilk: "soya milk",
    chana: "roasted chana",
    peanuts: "peanuts",
    makhana: "roasted makhana",
    chaas: "chaas"
  };
  // the protein a person is used to comes first when the price allows it
  var PREF = {
    nonveg: { chicken: 1.2, fish: 1, egg: 0.7 },
    egg: { egg: 1 },
    veg: { paneer: 0.6, dal: 0.3 },
    vegan: { tofu: 0.5, soya: 0.5 }
  };
  var FRUIT = "guava,banana,orange,apple";
  // Dishes: id, name, meal (bf breakfast, ld lunch or dinner, sn snack, pre before training), home-food styles it belongs to
  // ("*" all, "in" every Indian style), rows, and a one-line tip. A row is role:foods[:start]. Roles: P the dish's main protein,
  // p other protein, c the grain or main carb, f small extras that go up first when calories are short, e extras used only
  // for high targets, x fixed. A "?" marks a row the dish can do without. In a list of foods the first one the person eats is used.
  var DISHES = [
    [
      "b_oatsegg",
      "Oats with milk, boiled eggs and a banana",
      "bf",
      "*",
      "c:oats P:egg:2 p:milk,soyamilk f:banana:1 e:pb:0",
      "Cook the oats in the milk. Boil the eggs the night before to save time."
    ],
    [
      "b_oatspb",
      "Oats with milk, peanut butter and a banana",
      "bf",
      "*",
      "c:oats P:milk,soyamilk:1.5 f:pb:1 f:banana:1 e:dates:0",
      "Stir the peanut butter into the hot oats."
    ],
    [
      "b_bhurji",
      "Egg bhurji with roti",
      "bf",
      "north west mix east",
      "P:egg:3 x:oil c:chapati:2 p?:milk:0",
      "Scramble the eggs with onion, tomato and chilli in one teaspoon of oil."
    ],
    [
      "b_omtoast",
      "Omelette with toast and a banana",
      "bf",
      "global mix east",
      "P:egg:3 x:oil c:breadbrown:2 f:banana:1 p?:milk:0",
      "Add onion, tomato or spinach to the omelette for volume."
    ],
    [
      "b_pohaegg",
      "Poha with peanuts and boiled eggs",
      "bf",
      "west mix north",
      "c:poha f:peanuts:1 P:egg:2 p?:milk:0",
      "Poha alone is mostly carbs; the eggs make it a complete breakfast."
    ],
    [
      "b_pohaspr",
      "Poha with peanuts, sprouts and curd",
      "bf",
      "west mix north",
      "c:poha f:peanuts:1 P:sprouts:1 p?:dahi,soyamilk:1",
      "Mix the steamed sprouts into the poha at the end."
    ],
    [
      "b_idliegg",
      "Idli and sambar with boiled eggs",
      "bf",
      "south",
      "c:idli:3 p:sambar:1 P:egg:2",
      "Go easy on the coconut chutney: it is mostly fat."
    ],
    [
      "b_idlicurd",
      "Idli and sambar with curd",
      "bf",
      "south",
      "c:idli:4 P:sambar:1.5 p?:dahi:1.5",
      "Take a second katori of sambar before a fifth idli: the protein is in the sambar."
    ],
    [
      "b_dosaegg",
      "Dosa and sambar with an omelette",
      "bf",
      "south",
      "c:dosa:2 p:sambar:1 P:egg:2 x:oil",
      "Plain dosa made with little oil; a masala dosa is more than twice the calories."
    ],
    [
      "b_upma",
      "Upma with sprouts and curd",
      "bf",
      "south west mix",
      "c:upma P:sprouts:1 p?:dahi,soyamilk:1",
      "Cook the upma with plenty of vegetables and one teaspoon of oil."
    ],
    [
      "b_besan",
      "Besan chilla with curd",
      "bf",
      "north west mix",
      "c:besanchilla:3 P:dahi,soyamilk:1.5 f:banana:0",
      "Besan is gram flour, so the chilla itself carries protein."
    ],
    [
      "b_moong",
      "Moong dal chilla with paneer",
      "bf",
      "north mix",
      "c:moongchilla:2 P:paneer:1.5 p?:milk:0",
      "Crumble the paneer inside the chilla."
    ],
    [
      "b_pparatha",
      "Paneer paratha with curd",
      "bf",
      "north",
      "c:paneerparatha:1 P:dahi:2",
      "Cook it dry on the tawa, or with half a teaspoon of ghee."
    ],
    [
      "b_thepla",
      "Methi thepla with sprouts and curd",
      "bf",
      "west",
      "c:thepla:2 P:sprouts:1 p:dahi:1.5",
      "Thepla keeps for two days, so make a batch."
    ],
    [
      "b_dalia",
      "Dalia with milk and nuts",
      "bf",
      "north mix east",
      "c:dalia:1.5 P:milk,soyamilk:1.5 f:almonds,peanuts:1 f:banana:0",
      "Broken wheat keeps you full longer than cornflakes or white bread."
    ],
    [
      "b_pbtoast",
      "Peanut butter toast with milk and a banana",
      "bf",
      "global mix",
      "c:breadbrown:2 f:pb:1.5 P:milk,soyamilk:1.5 f:banana:1",
      "Buy peanut butter with no added sugar."
    ],
    [
      "b_ragiegg",
      "Ragi roti with egg bhurji",
      "bf",
      "south west",
      "c:ragiroti:2 P:egg:3 x:oil",
      "Ragi is high in calcium and fibre."
    ],
    [
      "b_sattu",
      "Sattu drink with a banana and roasted chana",
      "bf",
      "east north",
      "P:sattu:1.5 c:banana:1 p:chana:1",
      "Sattu is roasted gram flour: stir it into water with salt, lemon and roasted cumin."
    ],
    [
      "b_tofu",
      "Tofu bhurji with roti",
      "bf",
      "in",
      "P:tofu:1.5 x:oil c:chapati:2",
      "Crumble the tofu and cook it exactly like egg bhurji."
    ],
    [
      "b_paneerbh",
      "Paneer bhurji with roti",
      "bf",
      "north mix west",
      "P:paneer:2 x:oil c:chapati:2",
      "One teaspoon of oil is enough: paneer brings its own fat."
    ],
    [
      "b_yog",
      "Yogurt bowl with oats, banana and peanuts",
      "bf",
      "global",
      "c:oats P:dahi:2 f:banana:1 f:peanuts:1",
      "Plain unsweetened yogurt; the banana is the sugar."
    ],
    [
      "m_rotidal",
      "Roti, dal and sabzi with curd",
      "ld",
      "north west mix east",
      "c:chapati:3 P:dal:1.5 p?:dahi:1 x:sabzi x:salad p?:sprouts:0 e?:rice:0",
      "Take the second katori of dal before an extra roti."
    ],
    [
      "m_dalrice",
      "Dal, rice and sabzi with curd",
      "ld",
      "in",
      "c:rice:1.5 P:dal:1.5 p?:dahi:1 x:sabzi x:salad p?:sprouts:0",
      "Thick dal, not watery: the protein is in the lentils, not the water."
    ],
    [
      "m_chroti",
      "Chicken curry with roti and sabzi",
      "ld",
      "north west mix east",
      "P:chicken:1.25 x:oil c:chapati:3 x:sabzi x:salad e?:rice:0",
      "Home-style: onion, tomato and spices in one or two teaspoons of oil. Skip the cream and butter."
    ],
    [
      "m_chrice",
      "Chicken curry with rice and sabzi",
      "ld",
      "in",
      "P:chicken:1.25 x:oil c:rice:1.5 x:sabzi x:salad",
      "Home-style: onion, tomato and spices in one or two teaspoons of oil. Skip the cream and butter."
    ],
    [
      "m_fish",
      "Fish curry with rice",
      "ld",
      "east south west mix",
      "P:fish:1.5 x:oil c:rice:1.5 p?:dal:0.5 x:sabzi",
      "Curry, steamed or shallow-fried in a little oil; deep-frying doubles the calories."
    ],
    [
      "m_eggrice",
      "Egg curry with rice and sabzi",
      "ld",
      "in",
      "P:egg:3 x:oil c:rice:1.5 x:sabzi x:salad p?:dal:0 p?:dahi:0",
      "Boiled eggs in a thin onion-tomato gravy. A katori of dal or curd on the side lifts the protein."
    ],
    [
      "m_eggroti",
      "Egg curry with roti and sabzi",
      "ld",
      "north west mix",
      "P:egg:3 x:oil c:chapati:3 x:sabzi x:salad p?:dal:0 p?:dahi:0",
      "Boiled eggs in a thin onion-tomato gravy. A katori of dal or curd on the side lifts the protein."
    ],
    [
      "m_rajma",
      "Rajma or chole with rice and curd",
      "ld",
      "north mix west",
      "P:rajma:1.5 c:rice:1.5 p?:dahi:1 x:salad p?:paneer:0",
      "Beans with rice give a complete protein. Go light on the oil in the gravy."
    ],
    [
      "m_soyaroti",
      "Soya chunk curry with roti",
      "ld",
      "north west mix east",
      "P:soya:4 x:oil c:chapati:3 x:sabzi p?:dahi:1",
      "Boil the chunks, squeeze the water out, then cook them in the same masala you would use for chicken."
    ],
    [
      "m_soyarice",
      "Soya chunk curry with rice",
      "ld",
      "south east mix",
      "P:soya:4 x:oil c:rice:1.5 x:sabzi p?:dahi:1",
      "Boil the chunks, squeeze the water out, then cook them in the same masala you would use for chicken."
    ],
    [
      "m_paneer",
      "Paneer sabzi with roti and dal",
      "ld",
      "north mix west",
      "P:paneer:2 x:oil c:chapati:3 p:dal:1 x:salad",
      "Palak paneer or a dry bhurji. Butter masala and shahi gravies carry far more fat."
    ],
    [
      "m_sambar",
      "Sambar rice with curd and a vegetable side",
      "ld",
      "south",
      "c:rice:2 P:sambar:2 p?:dahi:1.5 x:sabzi",
      "More sambar and poriyal, less rice: the plate should not be mostly white."
    ],
    [
      "m_sambaregg",
      "Sambar rice with boiled eggs",
      "ld",
      "south",
      "c:rice:2 p:sambar:1.5 P:egg:2 x:sabzi p?:dahi:0",
      "More sambar and poriyal, less rice: the plate should not be mostly white."
    ],
    [
      "m_khichdi",
      "Dal khichdi with curd and salad",
      "ld",
      "west north mix east",
      "c:khichdi P:dahi:2 x:salad f:peanuts:0",
      "Use as much dal as rice when you cook it."
    ],
    [
      "m_bhakri",
      "Bhakri with sprouts usal and dal",
      "ld",
      "west",
      "c:bhakri:2 P:sprouts:1.5 p:dal:1 x:sabzi p?:dahi:1",
      "Jowar and bajra are whole grains: more fibre than wheat or rice."
    ],
    [
      "m_ragi",
      "Ragi roti with dal and sabzi",
      "ld",
      "south west",
      "c:ragiroti:3 P:dal:1.5 x:sabzi p?:dahi:1",
      "Ragi is high in calcium and fibre."
    ],
    [
      "m_tofurice",
      "Tofu curry with rice and sabzi",
      "ld",
      "in",
      "P:tofu:1.5 x:oil c:rice:1.5 x:sabzi",
      "Press the water out of the tofu and brown it before it goes into the gravy."
    ],
    [
      "m_tofuroti",
      "Tofu curry with roti and sabzi",
      "ld",
      "north west mix",
      "P:tofu:1.5 x:oil c:chapati:3 x:sabzi",
      "Press the water out of the tofu and brown it before it goes into the gravy."
    ],
    [
      "m_curdrice",
      "Curd rice with sprouts",
      "ld",
      "south",
      "c:curdrice P:sprouts:1.5 x:salad",
      "A light meal: good for dinner on a rest day."
    ],
    [
      "g_chrice",
      "Chicken, rice and vegetables",
      "ld",
      "global",
      "P:chicken:1.25 x:oil c:rice:1.5 x:sabzi x:salad",
      "Grill, bake or pan-fry the chicken in a teaspoon of oil."
    ],
    [
      "g_eggpot",
      "Omelette, potatoes and salad",
      "ld",
      "global",
      "P:egg:3 x:oil c:potato x:salad",
      "Boiled or baked potatoes, not fried."
    ],
    [
      "g_beans",
      "Beans and rice with yogurt",
      "ld",
      "global",
      "P:rajma:1.5 c:rice:1.5 p?:dahi:1 x:salad",
      "Beans with rice give a complete protein."
    ],
    [
      "g_tofu",
      "Tofu, rice and vegetables",
      "ld",
      "global",
      "P:tofu:1.5 x:oil c:rice:1.5 x:sabzi",
      "Press the water out of the tofu and brown it in the pan first."
    ],
    [
      "g_fish",
      "Fish, potatoes and vegetables",
      "ld",
      "global",
      "P:fish:1.5 x:oil c:potato x:sabzi",
      "Baked, grilled or pan-fried in a teaspoon of oil."
    ],
    [
      "g_lentil",
      "Lentils and rice with yogurt",
      "ld",
      "global",
      "c:rice:1.5 P:dal:1.5 p?:dahi:1 x:sabzi",
      "Cook the lentils thick."
    ],
    [
      "s_chana",
      "Roasted chana and a fruit",
      "sn",
      "in",
      "P:chana:1 x:" + FRUIT,
      "Keeps for weeks in a jar at work, and it is salty enough to replace chips."
    ],
    [
      "s_sprouts",
      "Sprouts chaat and a fruit",
      "sn",
      "in",
      "P:sprouts:1 x:" + FRUIT,
      "Onion, tomato, lemon and a pinch of chaat masala."
    ],
    [
      "s_curd",
      "Curd with banana and peanuts",
      "sn",
      "*",
      "P:dahi:2 f:banana:1 f:peanuts:1",
      "Plain curd, no sugar: the banana sweetens it."
    ],
    [
      "s_eggs",
      "Boiled eggs and a fruit",
      "sn",
      "*",
      "P:egg:2 x:" + FRUIT,
      "Boil six at a time; they keep three days in the fridge."
    ],
    [
      "s_peanut",
      "Peanuts and a banana",
      "sn",
      "*",
      "P:peanuts:2 c:banana:1",
      "Measure the peanuts once: a handful easily turns into three."
    ],
    [
      "s_makhana",
      "Milk with roasted makhana",
      "sn",
      "north mix east",
      "P:milk,soyamilk:1 c:makhana:1",
      "Dry-roast the makhana with salt and pepper: a crunchy swap for namkeen."
    ],
    [
      "s_paneer",
      "Paneer cubes with cucumber and a fruit",
      "sn",
      "north mix west",
      "P:paneer:1.5 x:salad x:" + FRUIT,
      "Raw paneer with salt, pepper and lemon."
    ],
    [
      "s_sattu",
      "Sattu drink and a fruit",
      "sn",
      "east north",
      "P:sattu:1.5 x:" + FRUIT,
      "Salt, lemon and roasted cumin; no sugar."
    ],
    [
      "s_chaas",
      "Chaas with roasted chana",
      "sn",
      "west north south mix",
      "P:chana:1 x:chaas",
      "Plain or salted chaas, not sweet lassi."
    ],
    [
      "s_pbtoast",
      "Peanut butter toast",
      "sn",
      "global mix",
      "c:breadbrown:1 P:pb:1.5 p?:milk,soyamilk:0",
      "Buy peanut butter with no added sugar."
    ],
    [
      "s_whey",
      "Protein shake and a banana",
      "sn",
      "*",
      "P:whey:1 c:banana:1",
      "A shake is a convenience, not a need: it only stands in for protein you did not get from food."
    ],
    [
      "s_soymilk",
      "Soya milk with peanuts and a fruit",
      "sn",
      "*",
      "P:soyamilk:1 f:peanuts:2 x:" + FRUIT,
      "Unsweetened soya milk has about as much protein as cow's milk."
    ],
    ["p_banana", "A banana", "pre", "*", "c:banana:1", "Easy to digest and enough to train on."],
    [
      "p_dates",
      "Dates and black coffee",
      "pre",
      "*",
      "c:dates:1.5 x:blackcoffee",
      "Quick sugar from the dates; the coffee is optional."
    ],
    [
      "p_toast",
      "Toast with peanut butter",
      "pre",
      "global mix",
      "c:breadbrown:1 f:pb:0.5",
      "Eat it at least 30 minutes before you train."
    ]
  ].map(function (r) {
    return {
      id: r[0],
      n: r[1],
      m: r[2],
      cui: r[3],
      tip: r[5],
      rows: words(r[4]).map(function (s) {
        var p = s.split(":"),
          opt = p[0].slice(-1) === "?";
        return {
          role: opt ? p[0].slice(0, -1) : p[0],
          opt: opt,
          foods: p[1].split(","),
          base: p[2] != null ? +p[2] : null
        };
      })
    };
  });
  var SIDE = {
    banana: "a banana",
    peanuts: "peanuts",
    pb: "peanut butter",
    dates: "dates",
    almonds: "almonds",
    rice: "extra rice",
    chapati: "extra roti",
    egg: "boiled eggs",
    dahi: "curd",
    milk: "a glass of milk",
    soyamilk: "soya milk",
    paneer: "paneer",
    tofu: "tofu",
    sprouts: "sprouts",
    soya: "soya chunks",
    chana: "roasted chana",
    sattu: "a sattu drink"
  };
  // a dish's name only names what is on the plate: foods left out are dropped, swapped foods renamed
  var NAMEW = {
    peanuts: "peanuts",
    pb: "peanut butter",
    banana: "a banana|banana",
    milk: "milk",
    soyamilk: "soya milk",
    dahi: "curd",
    almonds: "nuts",
    sprouts: "sprouts",
    dal: "dal",
    egg: "boiled eggs|eggs|an omelette",
    paneer: "paneer",
    dates: "dates",
    makhana: "roasted makhana",
    rice: "rice"
  };
  // A dish's name, matching what is actually on the plate.
  function dishName(o) {
    var n = o.d.n;
    function drop(f0) {
      var w = NAMEW[f0];
      if (w)
        n = n
          .replace(new RegExp("(,? and |,? with |, )(" + w + ")\\b", "i"), "")
          .replace(new RegExp("^(" + w + ")( and | with |, )", "i"), "");
    }
    (o.miss || []).forEach(drop);
    o.items.forEach(function (x) {
      if (x.side || x.extra) return;
      if (x.q <= 0) drop(x.f0);
      else if (x.id !== x.f0 && NAMEW[x.f0] && NAMEW[x.id])
        n = n.replace(new RegExp("\\b(" + NAMEW[x.f0] + ")\\b", "i"), NAMEW[x.id].split("|")[0]);
    });
    n = n
      .replace(/ and$/, "")
      .replace(/ with$/, "")
      .replace(/,\s*$/, "");
    if (n !== o.d.n && !/ and [^,]*$/.test(n)) n = n.replace(/, ([^,]*)$/, " and $1");
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  var MNAME = { pre: "Pre-workout", bf: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" },
    FBY = {};
  // A food from the table by id.
  function food(id) {
    return (
      FBY[id] ||
      (FBY[id] = D.FOODS.filter(function (f) {
        return f.id === id;
      })[0])
    );
  }
  // Whether a food fits the diet and avoid list.
  function allowed(id, a) {
    var t = FT[id] || "";
    if (t.indexOf("m") >= 0 && a.diet !== "nonveg") return false;
    if (t.indexOf("e") >= 0 && (a.diet === "veg" || a.diet === "vegan")) return false;
    if (t.indexOf("d") >= 0 && (a.diet === "vegan" || has(a.avoid, "dairy"))) return false;
    if (t.indexOf("s") >= 0 && has(a.avoid, "soy")) return false;
    if (t.indexOf("n") >= 0 && has(a.avoid, "nuts")) return false;
    if (t.indexOf("g") >= 0 && has(a.avoid, "gluten")) return false;
    return !!food(id);
  }
  // Whether the user said they eat a food.
  function eats(id, a) {
    if (id === "soyamilk") return a.diet === "vegan" || has(a.avoid, "dairy"); // only offered in place of milk
    var k = EATKEY[id];
    return (
      !k ||
      words(k).every(function (x) {
        return has(a.eat, x);
      })
    );
  }
  // the ticks a person can be offered, and the ones that start switched on
  function eatOptions(a) {
    return OPT.eat.filter(function (o) {
      return allowed(EATFOOD[o[0]], a);
    });
  }
  // Foods ticked by default for a cuisine, diet and budget.
  function eatDefault(a) {
    var e = words(EATBASE[a.cui] || EATBASE.mix);
    if (a.diet === "nonveg") {
      e.push("egg", "chicken");
      if (a.cui === "east" || a.cui === "south") e.push("fish");
    }
    if (a.diet === "egg") e.push("egg");
    if (a.diet === "veg") e.push("soya");
    if (a.diet === "vegan") e.push("soya", "tofu", "sprouts", "rajma");
    if (a.bud === "low") e.push("soya", "dal", "chana", "peanuts"); // the cheapest protein there is
    return OPT.eat
      .map(function (o) {
        return o[0];
      })
      .filter(function (k) {
        return has(e, k) && allowed(EATFOOD[k], a);
      });
  }
  // A dish turned into portions of foods the user eats; null when it cannot be made.
  function resolve(dd, a) {
    var items = [],
      ok = true;
    items.miss = [];
    dd.rows.forEach(function (r) {
      var id = r.foods.filter(function (f) {
        return allowed(f, a) && eats(f, a);
      })[0];
      if (!id) {
        if (!r.opt && r.role !== "f" && r.role !== "e") ok = false;
        else items.miss.push(r.foods[0]);
        return;
      }
      var pt = PORT[id] || [1, 1, 1, 1],
        base = r.base != null ? r.base : pt[0],
        free = r.opt || r.role === "f" || r.role === "e";
      var it = {
        id: id,
        role: r.role,
        q: base,
        step: pt[1],
        min: free ? 0 : pt[2],
        max: pt[3],
        f0: r.foods[0],
        extra: base === 0
      };
      if (r.role === "x") {
        it.min = it.max = it.q;
      }
      it.q = clamp(it.q, it.min, it.max);
      items.push(it);
    });
    return ok && items.length ? items : null;
  }
  // Calories, protein and cost of a list of portions.
  function sum(items) {
    var t = { k: 0, p: 0, cost: 0 };
    items.forEach(function (x) {
      var f = food(x.id);
      t.k += f.k * x.q;
      t.p += f.p * x.q;
      t.cost += (COST[x.id] || 0) * x.q;
    });
    return t;
  }
  // Scale a dish to a calorie and protein target: the main protein first, then the grain, then the extras.
  // A step is only taken when it brings the number it is fixing closer to its target, so the loop settles.
  function fit(items, kT, pT, tolK, tolP, choose) {
    choose =
      choose ||
      function (L, i) {
        return L[i % L.length];
      };
    function can(role, dir, dk, dp) {
      return items.filter(function (x) {
        if (x.role !== role || (dir > 0 ? x.q + x.step > x.max + 1e-6 : x.q - x.step < x.min - 1e-6))
          return false;
        var f = food(x.id);
        return dk != null ? f.k * x.step < 2 * Math.abs(dk) : f.p * x.step < 2 * Math.abs(dp);
      });
    }
    function step(x, dir) {
      x.q = Math.round((x.q + dir * x.step) * 100) / 100;
    }
    for (var i = 0, t, L, dp, dk; i < 500; i++) {
      t = sum(items);
      dp = pT - t.p;
      dk = kT - t.k;
      L = [];
      if (dp > tolP && dk <= -tolK) {
        // short of protein with no calories to spare: trade grain or a thin pulse for a denser protein
        var dens = function (x) {
          var f = food(x.id);
          return f.p / f.k;
        };
        var up = items.filter(function (x) {
          return (x.role === "P" || x.role === "p") && dens(x) >= 0.065 && x.q + x.step <= x.max + 1e-6;
        });
        var dn = items
          .filter(function (x) {
            return x.role !== "x" && dens(x) < 0.05 && x.q - x.step >= x.min - 1e-6;
          })
          .sort(function (x, y) {
            return dens(x) - dens(y);
          });
        if (up.length && dn.length) {
          step(choose(up, i, "p"), 1);
          step(dn[0], -1);
          continue;
        }
      }
      if (dp > tolP && dk > -tolK) {
        L = can("P", 1, null, dp);
        if (!L.length) L = can("p", 1, null, dp);
        if (L.length) {
          step(choose(L, i, "p"), 1);
          continue;
        }
      } else if (dp < -2 * tolP) {
        L = can("p", -1, null, dp);
        if (!L.length && dk < -tolK) L = can("P", -1, null, dp);
        if (L.length) {
          step(L[0], -1);
          continue;
        }
      }
      if (dk > tolK) {
        L = can("c", 1, dk);
        if (!L.length) L = can("f", 1, dk);
        if (!L.length) L = can("e", 1, dk);
        if (!L.length && dp > -tolP) L = can("p", 1, dk);
        if (!L.length && dp > -tolP) L = can("P", 1, dk);
      } else if (dk < -tolK) {
        L = can("e", -1, dk);
        if (!L.length) L = can("f", -1, dk);
        if (!L.length) L = can("c", -1, dk);
        if (!L.length && dp < -tolP) L = can("p", -1, dk);
        if (!L.length && dp < -tolP) L = can("P", -1, dk);
        if (!L.length && dk < -2 * tolK)
          L = can("p", -1, dk)
            .concat(can("P", -1, dk))
            .filter(function (x) {
              var f = food(x.id);
              return f.p / f.k < 0.065;
            });
      } // calories come first on a cut
      if (!L.length) break;
      step(choose(L, i, "k"), dk > 0 ? 1 : -1);
    }
  }
  // How well a dish fits the user's kind of food.
  function cuiScore(dd, a) {
    if (a.cui === "global")
      return dd.cui === "global" ? 3 : dd.cui === "*" || has(words(dd.cui), "global") ? 2.5 : -9;
    if (dd.cui === "global") return -9;
    if (has(words(dd.cui), a.cui)) return 3;
    return a.cui === "mix" ? 2 : dd.cui === "*" || dd.cui === "in" ? 1.5 : 0;
  }
  // "125 g chicken (raw weight)", "3 chapatis", "1½ katoris of dal", "4 dates"
  function amount(id, q) {
    var f = food(id);
    if (!f) return "";
    var name = f.n.split(/[,(]/)[0].trim().toLowerCase(),
      m = /^(\d+(?:\.\d+)?) (g|ml)\b/.exec(f.u);
    if (m) return r0(+m[1] * q) + " " + m[2] + " " + (GNAME[id] || name);
    if (id === "dates") return r0(q * 2) + " dates";
    if (id === "almonds") return r0(q * 10) + " almonds";
    var w = Math.floor(q + 1e-6),
      fr = { 25: "¼", 50: "½", 75: "¾" }[Math.round((q - w) * 100)],
      num = (w ? w : "") + (fr || "");
    if (!fr && q !== w) num = String(q);
    var u = UNITS[id];
    if (u) return num + " " + (q > 1 ? u[1] : u[0]);
    return num + " " + f.u.replace(/^1 /, "").replace(/ \(.*\)$/, "") + " " + name;
  }
  // A day of eating: two or three dishes per meal, sized to the targets and the budget.
  function meals(a0, tg, rt) {
    var a = clean(a0),
      order =
        a.meals === 3
          ? ["bf", "lunch", "dinner"]
          : a.meals === 4
            ? ["bf", "lunch", "snack", "dinner"]
            : ["pre", "bf", "lunch", "snack", "dinner"];
    // the share of the day's calories and protein each meal carries: protein split evenly over the main meals
    var ks = {},
      ps = {},
      restK = 1,
      restP = 1;
    if (has(order, "pre")) {
      ks.pre = rt.morning ? 0.06 : 0.11;
      ps.pre = rt.morning ? 0.01 : 0.09;
    }
    if (has(order, "snack")) {
      ks.snack = 0.13;
      ps.snack = 0.12;
    }
    Object.keys(ks).forEach(function (k) {
      restK -= ks[k];
      restP -= ps[k];
    });
    ks.bf = restK * 0.3;
    ks.lunch = restK * 0.37;
    ks.dinner = restK * 0.33;
    ps.bf = restP * 0.3;
    ps.lunch = restP * 0.36;
    ps.dinner = restP * 0.34;
    var taken = {},
      usedIds = [],
      chosen = {};
    function headOf(items) {
      var h =
        items.filter(function (x) {
          return x.role === "P";
        })[0] || items[0];
      return h.id;
    }
    function typeOf(mid) {
      return mid === "bf"
        ? "bf"
        : mid === "snack"
          ? "sn"
          : mid === "pre"
            ? rt.morning
              ? "pre"
              : "sn"
            : "ld";
    }
    function pool(mid) {
      var type = typeOf(mid),
        kT = tg.kcal * ks[mid],
        pT = tg.protein * ps[mid],
        list = [];
      DISHES.forEach(function (dd) {
        if (dd.m !== type) return;
        var cs = cuiScore(dd, a);
        if (cs < 0) return;
        var items = resolve(dd, a);
        if (!items) return;
        items.forEach(function (x) {
          x.m = mid;
        });
        if (type !== "pre") fit(items, kT, pT, type === "sn" ? 25 : 35, type === "sn" ? 3 : 4);
        items.forEach(function (x) {
          x.q0 = x.q;
        });
        var t = sum(items),
          head = headOf(items);
        list.push({
          d: dd,
          items: items,
          miss: items.miss,
          k: t.k,
          p: t.p,
          cost: t.cost,
          head: head,
          sc:
            cs -
            Math.abs(pT - t.p) / (type === "sn" ? 4 : 6) -
            Math.abs(kT - t.k) / 60 -
            t.cost / BUDW[a.bud] +
            ((PREF[a.diet] || {})[head] || 0)
        });
      });
      return list;
    }
    // up to three dishes for a meal: the best fit first, then alternatives built on a different protein
    function choose(mid) {
      var list = pool(mid),
        out = [],
        rest = list.filter(function (x) {
          return usedIds.indexOf(x.d.id) < 0;
        });
      if (rest.length < 2) rest = list.slice();
      function adj(x) {
        return (
          x.sc -
          (mid === "dinner" ? 5 : 2.5) * (out.length ? 0 : taken[x.head] || 0) -
          4 *
            out.filter(function (o) {
              return o.head === x.head;
            }).length
        );
      }
      while (out.length < 3 && rest.length) {
        rest.sort(function (x, y) {
          return adj(y) - adj(x);
        });
        out.push(rest.shift());
      }
      if (out.length) {
        taken[out[0].head] = (taken[out[0].head] || 0) + 1;
        out.forEach(function (o) {
          usedIds.push(o.d.id);
        });
      }
      chosen[mid] = out;
    }
    ["lunch", "dinner", "bf", "snack", "pre"].forEach(function (mid) {
      if (has(order, mid)) choose(mid);
    });
    function defaults() {
      var all = [];
      order.forEach(function (mid) {
        if (chosen[mid][0]) all = all.concat(chosen[mid][0].items);
      });
      return all;
    }
    function settle() {
      // bring the first-choice dishes together to the day's totals
      var all = defaults(),
        free = all.filter(function (x) {
          return x.role !== "x" && !(x.m === "pre" && rt.morning);
        }),
        fixed = sum(
          all.filter(function (x) {
            return free.indexOf(x) < 0;
          })
        );
      // extra protein goes to the meal that is furthest below its share, so it stays spread over the day
      function lean(L, i, what) {
        if (what !== "p") return L[i % L.length];
        var by = {};
        all.forEach(function (x) {
          by[x.m] = (by[x.m] || 0) + food(x.id).p * x.q;
        });
        return L.slice().sort(function (x, y) {
          return by[x.m] / ps[x.m] - by[y.m] / ps[y.m];
        })[0];
      }
      fit(free, tg.kcal - fixed.k, tg.protein - fixed.p, 40, 5, lean);
      // still short of protein: add a side of a protein food the person eats to the meals that are lowest, then fit again
      var tp = sum(all).p;
      if (tp < tg.protein * 0.93) {
        var side = words("soya egg paneer tofu dahi sprouts milk soyamilk chana sattu").filter(function (id) {
          return allowed(id, a) && eats(id, a);
        });
        ["lunch", "dinner", "bf", "snack"].forEach(function (mid) {
          var o = chosen[mid] && chosen[mid][0];
          if (!o) return;
          var here = o.items.map(function (x) {
              return x.id;
            }),
            id = side.filter(function (x) {
              return (
                here.indexOf(x) < 0 &&
                !(x === "soya" && mid === "bf") &&
                !(x === "milk" && mid !== "bf" && mid !== "snack")
              );
            })[0];
          if (!id) return;
          var pt = PORT[id] || [1, 0.5, 0, 2],
            it = { id: id, role: "p", q: 0, q0: 0, step: pt[1], min: 0, max: pt[3], m: mid, side: true };
          o.items.push(it);
          all.push(it);
          free.push(it);
        });
        fit(free, tg.kcal - fixed.k, tg.protein - fixed.p, 40, 5, lean);
        order.forEach(function (mid) {
          if (chosen[mid] && chosen[mid][0])
            chosen[mid][0].items = chosen[mid][0].items.filter(function (x) {
              return !x.side || x.q > 0;
            });
        });
      }
      // a high target the dishes cannot reach at normal portions: add energy-dense sides the person eats
      if (sum(all).k < tg.kcal * 0.94) {
        var esd = words("peanuts banana milk pb dates almonds rice chapati").filter(function (id) {
          return allowed(id, a) && (eats(id, a) || id === "banana" || id === "dates");
        });
        ["lunch", "dinner", "bf", "snack"].forEach(function (mid) {
          var o = chosen[mid] && chosen[mid][0];
          if (!o) return;
          var here = o.items.map(function (x) {
            return x.id;
          });
          esd
            .filter(function (x) {
              return (
                here.indexOf(x) < 0 &&
                !((x === "rice" || x === "chapati") && (mid === "bf" || mid === "snack")) &&
                !(x === "milk" && mid !== "bf" && mid !== "snack")
              );
            })
            .slice(0, 2)
            .forEach(function (id) {
              var pt = PORT[id] || [1, 0.5, 0, 2],
                it = { id: id, role: "e", q: 0, q0: 0, step: pt[1], min: 0, max: pt[3], m: mid, side: true };
              o.items.push(it);
              all.push(it);
              free.push(it);
            });
        });
        fit(free, tg.kcal - fixed.k, tg.protein - fixed.p, 40, 5, lean);
        order.forEach(function (mid) {
          if (chosen[mid] && chosen[mid][0])
            chosen[mid][0].items = chosen[mid][0].items.filter(function (x) {
              return !x.side || x.q > 0;
            });
        });
      }
      order.forEach(function (mid) {
        chosen[mid].forEach(function (o) {
          var t = sum(o.items);
          o.k = t.k;
          o.p = t.p;
          o.cost = t.cost;
        });
      });
    }
    settle();
    // keep the first choices inside the monthly budget where another dish does the same job for less
    var cap = BUDCAP[a.bud],
      day = function () {
        return sum(defaults()).cost;
      };
    if (cap)
      for (var guard = 0; guard < 6 && day() > cap / 30; guard++) {
        var bestM = null,
          bestSave = 5;
        order.forEach(function (mid) {
          var o = chosen[mid];
          for (var i = 1; i < o.length; i++)
            if (o[0].cost - o[i].cost > bestSave && o[i].p >= tg.protein * ps[mid] * 0.7) {
              bestSave = o[0].cost - o[i].cost;
              bestM = [mid, i];
            }
        });
        if (!bestM) break;
        var arr = chosen[bestM[0]];
        arr[0].items.forEach(function (x) {
          x.q = x.q0;
        }); // the dish it replaces goes back to its own meal-sized portions
        arr.unshift(arr.splice(bestM[1], 1)[0]);
        settle();
      }
    var times = { pre: rt.t.pre, bf: rt.t.bf, lunch: rt.t.lunch, snack: rt.t.snack, dinner: rt.t.dinner };
    function planOf(o) {
      return o.items
        .filter(function (x) {
          return x.q > 0;
        })
        .map(function (x) {
          return [x.id, x.q];
        });
    }
    var out = ["pre", "bf", "lunch", "snack", "dinner"].map(function (mid) {
      var os = chosen[mid] || [],
        m = {
          id: mid,
          n: mid === "pre" && !rt.morning ? "Mid-morning snack" : MNAME[mid],
          t: t12(times[mid]),
          h: toMin(times[mid]),
          plan: [],
          pick: 0,
          opts: []
        };
      m.opts = os.map(function (o) {
        var add = o.items
          .filter(function (x) {
            return (x.side || x.extra) && x.q > 0;
          })
          .map(function (x) {
            return SIDE[x.id] || food(x.id).n.split(/[,(]/)[0].trim().toLowerCase();
          });
        var t = sum(o.items);
        return {
          n: dishName(o) + (add.length ? ", plus " + add.join(" and ") : ""),
          tip: o.d.tip,
          plan: planOf(o),
          k: r0(t.k),
          p: r0(t.p),
          cost: r0(t.cost)
        };
      });
      if (m.opts.length) {
        m.plan = m.opts[0].plan;
        m.dish = m.opts[0].n;
        m.tip = m.opts[0].tip;
      }
      return m;
    });
    return out.sort(function (x, y) {
      return ((x.h - rt.wk + 1440) % 1440) - ((y.h - rt.wk + 1440) % 1440);
    });
  }
  // A meal in one line.
  function mealLine(m) {
    return m.dish
      ? m.dish
      : m.plan
          .slice(0, 4)
          .map(function (it) {
            var f = food(it[0]);
            return f ? f.n.split(/[,(]/)[0].trim().toLowerCase() : "";
          })
          .filter(Boolean)
          .join(", ");
  }
  // Calories and macros of the planned day.
  function mealTotals(ms) {
    var t = { k: 0, p: 0, c: 0, f: 0, fb: 0 };
    ms.forEach(function (m) {
      m.plan.forEach(function (it) {
        var f = food(it[0]);
        if (f) {
          t.k += f.k * it[1];
          t.p += f.p * it[1];
          t.c += f.c * it[1];
          t.f += f.f * it[1];
          t.fb += f.fb * it[1];
        }
      });
    });
    return t;
  }
  // Rough cost of a meal plan in rupees.
  function planCost(plan) {
    var c = 0;
    plan.forEach(function (it) {
      c += (COST[it[0]] || 0) * it[1];
    });
    return c;
  }
  // money and protein facts about the menu, for the plan screen and the food guide
  function foodFacts(a0, tg, ms) {
    var a = clean(a0),
      day = 0,
      home = 0;
    ms.forEach(function (m) {
      day += planCost(m.plan);
      m.plan.forEach(function (it) {
        if (has(BASICS, it[0])) home += (COST[it[0]] || 0) * it[1];
      });
    });
    var cap = BUDCAP[a.bud],
      ref = tg.bmi > 25 ? wAt(25, a.h) : a.w,
      per = clamp(rnd(0.4 * ref, 5), 20, 45);
    var cheap = words(
      "soya sattu peanuts chana sprouts egg dal chicken rajma fish milk tofu paneer dahi whey"
    )
      .filter(function (id) {
        return allowed(id, a) && eats(id, a) && COST[id];
      })
      .map(function (id) {
        var f = food(id);
        return [f.n.split(/[,(]/)[0].trim(), Math.round((COST[id] / f.p) * 20), id];
      })
      .sort(function (x, y) {
        return x[1] - y[1];
      });
    // single foods that reach one meal's protein in a portion a person would actually eat
    var like = words("egg chicken fish soya paneer tofu")
      .filter(function (id) {
        return allowed(id, a) && eats(id, a);
      })
      .map(function (id) {
        var f = food(id),
          pt = PORT[id],
          q = Math.max(pt[1], Math.round(per / f.p / pt[1]) * pt[1]);
        return q <= pt[3] * 1.3 ? amount(id, Math.round(q * 100) / 100) : null;
      })
      .filter(Boolean)
      .slice(0, 4);
    return {
      day: r0(day),
      month: rnd(day * 30, 50),
      home: rnd(home * 30, 50),
      extra: rnd((day - home) * 30, 50),
      cap: cap,
      over: !!cap && day * 30 > cap * 1.05,
      money: a.cui !== "global",
      cheap: cheap,
      per: per,
      like: like,
      pair:
        allowed("dal", a) && eats("dal", a) && eats("chapati", a) && allowed("chapati", a)
          ? "1½ katoris of dal with 3 chapatis" +
            (allowed("dahi", a) && eats("dahi", a)
              ? " and 200 g of curd comes to about 29 g"
              : " comes to about 22 g")
          : ""
    };
  }
  // "How to eat": the food guide, written for this person's goal, foods, budget and kitchen
  function foodGuide(g) {
    var a = g.a,
      t = g.t,
      f = g.food,
      S = [],
      dairy = allowed("dahi", a),
      by = {};
    g.meals.forEach(function (m) {
      by[m.id] = m;
    });
    var prot = words("dal egg chicken fish paneer soya tofu rajma sprouts")
      .filter(function (id) {
        return allowed(id, a) && eats(id, a);
      })
      .map(function (id) {
        return {
          dal: "dal",
          egg: "eggs",
          chicken: "chicken",
          fish: "fish",
          paneer: "paneer",
          soya: "soya chunks",
          tofu: "tofu",
          rajma: "rajma or chole",
          sprouts: "sprouts"
        }[id];
      });
    var grain =
      has(a.eat, "roti") && has(a.eat, "rice")
        ? "roti or rice"
        : has(a.eat, "rice")
          ? "rice"
          : has(a.eat, "roti")
            ? "roti"
            : "your grain";
    S.push([
      "Build every main meal like this",
      [
        "Half the plate: vegetables. Cooked sabzi, raw salad, or both.",
        "A quarter: protein" + (prot.length ? " (" + prot.join(", ") + ")" : "") + ".",
        "A quarter: " +
          grain +
          ". Your plan gives the amount. Whole wheat, millets and less-polished rice are the better picks.",
        dairy
          ? "Add a katori of curd or a glass of milk once or twice a day."
          : "Add a fruit once or twice a day.",
        t.goal === "lose" || t.goal === "recomp"
          ? "Eat the protein and the vegetables first and the " +
            grain +
            " last. You will feel full on fewer calories."
          : t.goal === "gain"
            ? "Struggling to eat enough? Add " +
              ["a glass of milk", "a banana", "a spoon of peanut butter", "a handful of peanuts"]
                .filter(function (x, i) {
                  return [allowed("milk", a), true, allowed("pb", a), allowed("peanuts", a)][i];
                })
                .join(", ")
                .replace(/, ([^,]*)$/, " or $1") +
              " before you add another plate."
            : "The same plate at every meal. A steady week beats one perfect day."
      ]
    ]);
    S.push([
      "Protein: " + t.protein + " g a day, about " + f.per + " g at each main meal",
      [
        "Your body uses protein best when it is spread out: about 0.4 g for each kg of body weight at a time, three or four times a day.",
        f.like.length ? "What " + f.per + " g of protein looks like: " + f.like.join(", or ") + "." : "",
        f.pair ? "Dal alone will not get you there, so pair it: " + f.pair + "." : "",
        "Protein powder is optional. India's national dietary guidelines advise getting your protein from food; a shake only helps on days you cannot eat enough.",
        "Raw weights: chicken, fish and soya chunks are weighed before cooking, dal and rice after."
      ].filter(Boolean)
    ]);
    if (f.money && f.cheap.length)
      S.push([
        "The cheapest protein you eat",
        f.cheap
          .slice(0, 7)
          .map(function (c) {
            return c[0] + ": about ₹" + c[1] + " for 20 g of protein.";
          })
          .concat([
            "Your menu costs about ₹" +
              nf(f.day) +
              " a day, ₹" +
              nf(f.month) +
              " a month, at rough city prices. About ₹" +
              nf(f.home) +
              " of that is roti, rice, dal, vegetables and oil that a home kitchen buys anyway; the rest is about ₹" +
              nf(f.extra) +
              ".",
            f.over
              ? "That is above the budget you picked. On the Food tab, swap meals for the dishes built on " +
                f.cheap
                  .slice(0, 3)
                  .map(function (c) {
                    return c[0].toLowerCase();
                  })
                  .join(", ")
                  .replace(/, ([^,]*)$/, " or $1") +
                ": they cost the least for the same protein."
              : "Powders are not the cheap option: a scoop costs more for the same protein than " +
                f.cheap
                  .slice(0, 3)
                  .map(function (c) {
                    return c[0].toLowerCase();
                  })
                  .join(", ")
                  .replace(/, ([^,]*)$/, " or $1") +
                "."
          ])
      ]);
    S.push([
      "How to eat",
      [
        "Sit down and slow down. Give a meal 15 to 20 minutes and put the spoon down between bites. In trials, people who ate slowly ate less without feeling hungrier later.",
        "Drink a glass of water before each meal. Your target is " +
          r1(t.water / 1000) +
          " L across the day.",
        "Keep the same meal times" +
          (by.bf && by.bf.plan.length
            ? ": breakfast " + by.bf.t + ", lunch " + by.lunch.t + ", dinner " + by.dinner.t
            : "") +
          ". A skipped meal usually comes back as a much bigger one.",
        "Stop when you are comfortably full. For a second helping, take vegetables or dal first."
      ]
    ]);
    S.push([
      "Portions without a scale",
      [
        "1 katori is a small steel bowl, about 150 ml: one serving of dal, sabzi or curd.",
        "1 chapati is the size of your open hand, made from about 30 g of atta, with no ghee.",
        "100 g of cooked rice is about three-quarters of a katori.",
        "100 g of raw chicken or fish is a piece about the size of your palm.",
        "1 teaspoon of oil per person per dish. Measure it once so you know what it looks like.",
        "These are rough guides. A kitchen scale costs about ₹300 and removes the guessing for the first few weeks."
      ]
    ]);
    S.push([
      "Keep these low",
      [
        "Sugar: under 5% of your calories, which is about " +
          Math.max(3, Math.round((t.kcal * 0.05) / 4 / 4)) +
          " teaspoons a day. Chai, biscuits, sweets and soft drinks all count.",
        "Salt: under 5 g a day, about one level teaspoon in total. Pickle, papad, namkeen and packet snacks use it up fast.",
        "Oil and ghee: about " +
          Math.max(3, Math.round((t.fat * 0.45) / 5)) +
          " teaspoons a day in cooking. The rest of your fat comes from the food itself.",
        "Fried and packet snacks: plan one or two a week, put the portion on a plate, log it and move on."
      ]
    ]);
    S.push([
      "When a craving hits",
      [
        "Salty and crunchy: roasted chana, roasted makhana, " +
          (allowed("peanuts", a) ? "measured peanuts, " : "") +
          "home-popped popcorn or cucumber with chaat masala.",
        "Sweet: a fruit, two dates" + (dairy ? ", or curd with banana." : "."),
        "Eat your planned snack on time. Most evening cravings are a missed snack.",
        "Want the real thing? Buy the smallest pack, eat it from a plate, never from the bag."
      ]
    ]);
    S.push(
      a.src === "mess"
        ? [
            "Eating from a mess, canteen or tiffin",
            [
              "Take double dal, or the egg, paneer or chicken dish when there is one.",
              "One roti fewer or half the rice, and all the sabzi and salad on offer.",
              "Keep your own protein in your room: " +
                words("egg dahi milk chana peanuts sprouts")
                  .filter(function (id) {
                    return allowed(id, a);
                  })
                  .map(function (id) {
                    return {
                      egg: "boiled eggs",
                      dahi: "curd",
                      milk: "milk",
                      chana: "roasted chana",
                      peanuts: "peanuts",
                      sprouts: "sprouts"
                    }[id];
                  })
                  .join(", ") +
                ", fruit.",
              allowed("soya", a)
                ? "Soya chunks need only boiling water and salt: the cheapest way to close a protein gap."
                : "Roasted chana and sprouts need no cooking: the easiest way to close a protein gap."
            ]
          ]
        : a.src === "out"
          ? [
              "Eating out most days",
              [
                "Tandoori, grilled or roasted instead of fried or creamy. Roti instead of naan.",
                "Order a dal, a dry sabzi and a salad with every meal. Skip the soft drink.",
                a.diet === "nonveg"
                  ? "Biryani: half a plate with raita and a boiled egg or extra chicken pieces."
                  : "Biryani or pulao: half a plate with raita and a dal on the side.",
                "South Indian: idli or plain dosa with extra sambar; go light on the chutney and the vada.",
                "Keep breakfast and snacks at home, where you control them: " +
                  (allowed("egg", a) ? "eggs, " : "") +
                  (dairy ? "curd, milk, " : "") +
                  "roasted chana, fruit."
              ]
            ]
          : [
              "Cooking at home",
              [
                "Batch-cook for three days at a time: dal, sprouts" +
                  (allowed("egg", a) ? ", boiled eggs" : "") +
                  (allowed("soya", a) ? ", boiled soya chunks" : "") +
                  ".",
                "Decide tomorrow's meals tonight. A missing plan is how the ordering-in starts.",
                "Cook with a measured spoon of oil, not a pour from the bottle.",
                "The family eats the same food. Only your portions change: more dal and sabzi, the planned number of rotis."
              ]
            ]
    );
    if (a.diet === "veg" || a.diet === "vegan")
      S.push([
        "Vegetarian and vegan plates",
        [
          "Combine a grain with a pulse at every meal: roti with dal, rice with rajma, idli with sambar. Together they give a complete protein.",
          "Vitamin B12 comes almost only from animal foods, and omega-3 fats run low on vegetarian diets. " +
            (dairy ? "Have milk or curd daily, " : "") +
            "add a spoon of flax seeds" +
            (allowed("almonds", a) ? " or a few walnuts" : "") +
            ", and ask a doctor about a B12 test.",
          allowed("soya", a)
            ? "Soya chunks and tofu are the most protein-dense plant foods, and among the cheapest."
            : "Sprouts, chana, rajma and dal are your densest protein foods: have one at every meal."
        ]
      ]);
    S.push([
      "Around training",
      [
        "Total protein for the day matters more than exact timing. Have one of your protein meals in the two or three hours after you train.",
        "Training early? A banana or two dates beforehand is enough. Nothing at all is fine too, if you feel good."
      ]
    ]);
    // the guide never suggests a food the person cannot eat
    var NO = [];
    if (!allowed("chicken", a)) NO.push(/chicken|fish/i);
    if (!allowed("egg", a)) NO.push(/\beggs?\b/i);
    if (!allowed("peanuts", a)) NO.push(/peanut/i);
    if (!dairy) NO.push(/\b(curd|milk|paneer|raita|chaas)\b/i);
    S.forEach(function (sec) {
      sec[1] = sec[1].filter(function (l) {
        return !NO.some(function (r) {
          return r.test(l);
        });
      });
    });
    return S;
  }

  // The daily timetable.
  function timetable(a0, tg, rt, ms, prog) {
    var a = clean(a0),
      T = rt.t,
      rows = [],
      by = {};
    ms.forEach(function (m) {
      by[m.id] = m;
    });
    var hrs = r1((1440 - rt.awake) / 60),
      place = a.place === "gym" ? "gym" : "home";
    function add(t, title, text, gym) {
      rows.push([t, title, text || "", gym ? 1 : 0]);
    }
    add(T.wake, "Wake up", "A big glass of water. Weigh in before you eat or drink anything else.");
    function session() {
      add(T.train, "Warm-up, 8 min", "General drills, then two or three for today's muscles.", 1);
      add(
        hhmm(toMin(T.train) + 8),
        "Strength, about " + Math.max(15, a.mins - 22) + " min",
        "The app times your rests and tells you when to add weight.",
        1
      );
      add(
        hhmm(toMin(T.end) - 14),
        "Finisher and cool-down",
        "A short timed circuit when the day has one, then stretch what you trained.",
        1
      );
    }
    if (by.pre.plan.length && rt.morning) add(T.pre, "Before training", mealLine(by.pre) + ".");
    if (rt.morning) session();
    if (by.bf.plan.length) add(T.bf, "Breakfast", mealLine(by.bf) + ".");
    if (by.lunch.plan.length)
      add(
        T.lunch,
        "Lunch",
        mealLine(by.lunch) + ". A 10-minute walk after helps digestion and your step count."
      );
    if (by.snack.plan.length)
      add(T.snack, "Snack", mealLine(by.snack) + ". Eating this on time stops the evening cravings.");
    if (by.pre.plan.length && !rt.morning) add(T.pre, "Mid-morning snack", mealLine(by.pre) + ".");
    if (!rt.morning) session();
    if (by.dinner.plan.length)
      add(
        T.dinner,
        "Dinner",
        mealLine(by.dinner) + ". Check your steps: short of " + nf(tg.steps) + "? Walk 15 minutes."
      );
    add(
      T.wind,
      "Wind down",
      "Screens away. Get tomorrow's " +
        (place === "gym" ? "gym bag" : "training clothes") +
        " and water bottle ready."
    );
    add(T.bed, "Sleep", "Lights out now gives you " + hrs + " hours before the " + t12(T.wake) + " alarm.");
    var wk = rt.wk;
    rows.sort(function (x, y) {
      return ((toMin(x[0]) - wk + 1440) % 1440) - ((toMin(y[0]) - wk + 1440) % 1440);
    });
    return rows;
  }
  // Reminder times and texts for the user's day.
  function reminders(a0, tg, rt, ms) {
    var T = rt.t,
      by = {},
      out = [];
    ms.forEach(function (m) {
      by[m.id] = m;
    });
    out.push([
      "wake",
      T.wake,
      "Time to get up",
      "Feet on the floor and a glass of water. The first two minutes are the hard part."
    ]);
    out.push(["weigh", T.weigh, "Weigh in", "After the toilet, before food or drink. It takes ten seconds."]);
    if (!rt.morning || rt.ws > 45)
      out.push([
        "train",
        hhmm(toMin(T.train) - 20),
        "Training in 20 minutes",
        "Fill your bottle and open today's session."
      ]);
    if (by.bf.plan.length)
      out.push(["bf", T.bf, "Breakfast", "Your first protein of the day. Log it in one tap."]);
    out.push([
      "water1",
      hhmm(rnd(toMin(T.bf) + ((toMin(T.lunch) - toMin(T.bf) + 1440) % 1440) / 2, 5)),
      "Water check",
      "Aim to have a third of your " + r1(tg.water / 1000) + " L down by now."
    ]);
    if (by.lunch.plan.length)
      out.push(["lunch", T.lunch, "Lunch", "Protein first, then the rest of the plate."]);
    if (by.snack.plan.length)
      out.push(["snack", T.snack, "Snack on time", "Eating it now makes the evening easier."]);
    out.push([
      "steps",
      hhmm(toMin(T.dinner) - 75),
      "Steps check",
      "Short of " + nf(tg.steps) + "? A 15-minute walk fixes it."
    ]);
    if (by.dinner.plan.length)
      out.push(["dinner", T.dinner, "Dinner", "Eat, then log it while you remember."]);
    out.push(["bed", T.wind, "Wind down", "Screens away, tomorrow's kit ready. Lights out in 30 minutes."]);
    return out;
  }

  // other exercises that do the same job, for a busy machine or a move someone dislikes
  function alts(id, a0, avoid) {
    var a = clean(a0),
      out = [];
    Object.keys(SLOT).forEach(function (k) {
      if (SLOT[k].indexOf(id) < 0) return;
      candidates(k, a, true)
        .concat(candidates(k, a, false))
        .forEach(function (x) {
          if (x[0] !== id && out.indexOf(x[0]) < 0 && (avoid || []).indexOf(x[0]) < 0) out.push(x[0]);
        });
    });
    return out.slice(0, 6);
  }
  /* ---------- moving days around: which muscles each session works hard ---------- */
  var BIG = ["chest", "back", "shoulders", "quads", "hams"];
  // Direct sets per big muscle in one session.
  function dayLoad(ids, rx) {
    var v = {};
    (ids || []).forEach(function (id) {
      var e = D.EX[id];
      if (!e) return;
      var ar = areaOf(id),
        sets = (rx && rx[id] && rx[id].sets) || e.sets;
      BIG.forEach(function (k) {
        if (ar[k] === 1) v[k] = (v[k] || 0) + sets;
      });
    });
    return v;
  }
  // order: 7 entries (Monday first), each the index of a session or -1; load: per session index, sets per big muscle
  function backToBack(order, load, names) {
    var out = [];
    for (var i = 0; i < 7; i++) {
      var j = (i + 1) % 7,
        x = order[i],
        y = order[j];
      if (x < 0 || y < 0) continue;
      var both = BIG.filter(function (k) {
        return (load[x][k] || 0) >= 3 && (load[y][k] || 0) >= 3;
      });
      if (both.length)
        out.push(
          DNAME[DOWS[i]] +
            " and " +
            DNAME[DOWS[j]] +
            " both work " +
            both
              .map(function (k) {
                return ANAME[k].toLowerCase();
              })
              .join(", ")
              .replace(/, ([^,]*)$/, " and $1") +
            " hard" +
            (names ? " (" + names[x] + ", then " + names[y] + ")" : "") +
            ". The usual advice is about 48 hours before training the same muscle hard again."
        );
    }
    return out;
  }
  // Which session falls on each weekday (-1 for rest).
  function orderOf(g) {
    var a = g.a;
    if (a.order) return a.order.slice();
    var i = 0;
    return DOWS.map(function (d) {
      return has(a.days, d) ? i++ : -1;
    });
  }

  /* ---------- the reasons behind the plan, each tied to where it comes from ---------- */
  var SRC = {
    acsm: [
      "American College of Sports Medicine position stand, 2026",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823"
    ],
    split: [
      "Ramos-Campo et al., Journal of Strength and Conditioning Research, 2024 (14 studies)",
      "https://pubmed.ncbi.nlm.nih.gov/38595233/"
    ],
    dose: [
      "Pelland et al., Sports Medicine, 2026 (67 studies, 2,058 people)",
      "https://sportrxiv.org/index.php/server/preprint/view/460"
    ],
    minimal: ["Behm et al., Sports Medicine, 2024", "https://pmc.ncbi.nlm.nih.gov/articles/PMC10933173/"],
    rest: [
      "Singer et al., Frontiers in Sports and Active Living, 2024",
      "https://pubmed.ncbi.nlm.nih.gov/39205815/"
    ],
    who: [
      "World Health Organization physical activity guidelines, 2020",
      "https://www.who.int/initiatives/behealthy/physical-activity"
    ],
    issn: [
      "International Society of Sports Nutrition position stand, 2017",
      "https://pubmed.ncbi.nlm.nih.gov/28642676/"
    ],
    meal: [
      "Schoenfeld and Aragon, Journal of the International Society of Sports Nutrition, 2018",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC5828430/"
    ],
    nin: [
      "ICMR-National Institute of Nutrition, Dietary Guidelines for Indians, 2024",
      "https://main.icmr.nic.in/sites/default/files/upload_documents/DGI_07th_May_2024_fin.pdf"
    ],
    slow: [
      "Robinson et al., American Journal of Clinical Nutrition, 2014 (22 studies)",
      "https://pubmed.ncbi.nlm.nih.gov/24847856/"
    ],
    cdc: [
      "U.S. Centers for Disease Control and Prevention; Helms et al., 2014",
      "https://www.cdc.gov/healthyweight/losing_weight/index.html"
    ],
    gain: ["Iraki et al., Sports, 2019", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6680710/"]
  };
  // The research behind each rule, written for this plan.
  function evidence(a, tg, pr, ff) {
    var E = [],
      cv = pr.info.cover.filter(function (c) {
        return c.k !== "calves";
      }),
      lo = Math.min.apply(
        null,
        cv.map(function (c) {
          return c.sets;
        })
      ),
      hi = Math.max.apply(
        null,
        cv.map(function (c) {
          return c.sets;
        })
      );
    function add(text, key) {
      E.push({ text: text, src: SRC[key][0], url: SRC[key][1] });
    }
    add(
      "Your split is a preference, not a magic formula. Trials that compared split routines with full-body routines found the same strength and muscle when the weekly sets were equal. So this plan counts weekly sets for every muscle instead of trusting the split's name.",
      "split"
    );
    add(
      "Each muscle needs at least 4 sets a week to show measurable growth; more sets give more, with smaller returns each time. Your week gives every area between " +
        lo +
        " and " +
        hi +
        " sets, counting half a set when a muscle only helps.",
      "dose"
    );
    if (a.exp === "new")
      add(
        "Beginners gain strength on very little training in the first two to three months. That is why your first two weeks use two sets and light weights, and why the plan starts below what an experienced lifter would do.",
        "minimal"
      );
    add(
      "Rests of a minute or more between sets build slightly more muscle than shorter ones, and going past about 90 seconds adds nothing for size. Your small exercises rest 60 to 75 seconds, big lifts 90 or more.",
      "rest"
    );
    add(
      "Train every major muscle group at least twice a week where you can, and turn up: over months, consistency matters more than the details of the programme." +
        (pr.info.style === "single"
          ? " On a one-muscle-a-day week the second dose comes from overlap: presses also work the triceps and shoulders, pulls also work the biceps."
          : ""),
      "acsm"
    );
    add(
      "Adults need 150 to 300 minutes of moderate activity a week on top of strength training. Your " +
        nf(tg.steps) +
        "-step target and the cardio at the end of sessions cover that.",
      "who"
    );
    if (tg.goal === "lose")
      add(
        "Losing about 0.5 to 1% of body weight a week keeps the loss mostly fat and protects muscle. Your target works out to about " +
          r1(-tg.weekly) +
          " kg a week.",
        "cdc"
      );
    if (tg.goal === "gain")
      add(
        "A surplus of 10 to 20% above maintenance, gaining about 0.25 to 0.5% of body weight a week, builds muscle without much extra fat. Your target is about " +
          r1(tg.weekly) +
          " kg a week.",
        "gain"
      );
    add(
      "People who train do best on 1.4 to 2.0 g of protein per kg of body weight a day, and towards the top of that when cutting calories. Yours is " +
        tg.protein +
        " g.",
      "issn"
    );
    add(
      "Protein works best spread over the day: about 0.4 g per kg at a time, in at least three or four meals. For you that is about " +
        ff.per +
        " g at each main meal.",
      "meal"
    );
    add(
      "Half of every plate is vegetables and fruit, grains stay under 45% of calories, sugar under 5%, salt under 5 g a day, and protein comes from food rather than powders. Your menu and food guide follow these.",
      "nin"
    );
    add(
      "Eating slowly lowers how much people eat at a meal without leaving them hungrier afterwards. Hence the 15 to 20 minutes per meal in your food guide.",
      "slow"
    );
    return E;
  }

  /* ---------- everything in one call ---------- */
  function build(a0) {
    var a = clean(a0),
      tg = targets(a),
      pr = program(a, tg),
      rt = routine(a),
      ms = meals(a, tg, rt);
    if (a.swaps)
      DOWS.forEach(function (d) {
        var ex = pr.split[d].ex;
        ex.forEach(function (id, i) {
          var to = a.swaps[id];
          if (to && ex.indexOf(to) < 0) {
            ex[i] = to;
            if (pr.rx[id] && !pr.rx[to]) pr.rx[to] = pr.rx[id];
          }
        });
      });
    var mt = mealTotals(ms),
      ff = foodFacts(a, tg, ms);
    if (a.order) {
      var ld = [],
        nm = [];
      DOWS.forEach(function (d, i) {
        if (a.order[i] >= 0) {
          ld[a.order[i]] = dayLoad(pr.split[d].ex, pr.rx);
          nm[a.order[i]] = pr.split[d].focus;
        }
      });
      backToBack(a.order, ld, nm).forEach(function (n) {
        pr.info.notes.push(n);
      });
    }
    if (mt.p < tg.protein * 0.85)
      pr.info.notes.push(
        "With the foods you ticked, this menu reaches about " +
          r0(mt.p) +
          " g of protein a day against a target of " +
          tg.protein +
          " g. Ticking one more protein food in the setup (eggs, soya chunks, paneer, curd, dal) closes the gap."
      );
    if (mt.k < tg.kcal * 0.92)
      pr.info.notes.push(
        "The menu comes to about " +
          nf(mt.k) +
          " kcal against a target of " +
          nf(tg.kcal) +
          ". Your target is high: add a snack, or larger portions of rice, roti, nuts and fruit."
      );
    if (mt.k > tg.kcal * 1.08)
      pr.info.notes.push(
        "The menu comes to about " +
          nf(mt.k) +
          " kcal, a little over your " +
          nf(tg.kcal) +
          " target: that much protein in " +
          a.meals +
          " meals leaves little room. Smaller portions of rice, roti or oil bring it down."
      );
    return {
      v: 2,
      a: a,
      t: tg,
      split: pr.split,
      rx: pr.rx,
      warm: pr.warm,
      info: pr.info,
      meals: ms,
      mealTot: mt,
      food: ff,
      ev: evidence(a, tg, pr, ff),
      tt: timetable(a, tg, rt, ms, pr),
      rem: reminders(a, tg, rt, ms),
      hours: r1((1440 - rt.awake) / 60)
    };
  }
  // one line that says what the plan is for
  function goalLine(tg, a) {
    var w = a.w;
    if (tg.goal === "lose")
      return "getting from " + w + " kg to " + tg.goalW + " kg while keeping your muscle";
    if (tg.goal === "gain") return "building muscle and getting from " + w + " kg to " + tg.goalW + " kg";
    if (tg.goal === "recomp") return "losing fat and adding muscle at about " + w + " kg";
    if (tg.goal === "strong") return "getting stronger at about " + w + " kg";
    return "staying fit, healthy and active";
  }
  return {
    OPT: OPT,
    DOWS: DOWS,
    DNAME: DNAME,
    label: label,
    blank: blank,
    clean: clean,
    bmi: bmi,
    wAt: wAt,
    band: band,
    BANDWORD: BANDWORD,
    effGoal: effGoal,
    targets: targets,
    program: program,
    routine: routine,
    meals: meals,
    mealTotals: mealTotals,
    mealLine: mealLine,
    build: build,
    goalLine: goalLine,
    t12: t12,
    toMin: toMin,
    hhmm: hhmm,
    tier: tier,
    STRESS: STRESS,
    GROUPS: GROUPS,
    AREAS: AREAS,
    MINSETS: MINSETS,
    areaOf: areaOf,
    weekNames: weekNames,
    alts: alts,
    dayLoad: dayLoad,
    backToBack: backToBack,
    orderOf: orderOf,
    ANAME: ANAME,
    eatOptions: eatOptions,
    eatDefault: eatDefault,
    EATPROTEIN: EATPROTEIN,
    EATSTAPLE: EATSTAPLE,
    COST: COST,
    BUDCAP: BUDCAP,
    planCost: planCost,
    foodFacts: foodFacts,
    foodGuide: foodGuide,
    amount: amount,
    DISHES: DISHES
  };
})();
