/**
 * ZENKAI — coach
 *
 * A rule-based coach that runs entirely on the phone. A question goes through:
 *   1. safety checks (chest pain, injuries, crash diets, drugs) that always answer first
 *   2. answers from the user's own log and plan (today, the week, pace, what to eat next)
 *   3. the knowledge base KB: about 40 topics, each tied to published guidance
 *   4. a web lookup on Wikipedia, MedlinePlus or Open Food Facts, with the source shown
 *
 * No account and no API key. Exposed as window.SZCoach.
 *
 * Author: Atharva Sail
 */
window.SZCoach = (function () {
  "use strict";
  var Z = window.SZ,
    D = Z.D,
    nf = Z.nf,
    r0 = Z.r0,
    r1 = Z.r1;
  var last = { topic: "", more: [], src: [] },
    netFail = false;

  /* ---------- text tools ---------- */
  function lc(s) {
    return String(s == null ? "" : s).toLowerCase();
  }
  // Lower-case the first letter.
  function low1(s) {
    return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  }
  // The profile (targets and body numbers).
  function P() {
    return Z.S.profile;
  }
  // lose, gain or hold.
  function GK() {
    return Z.goalKind();
  }
  // The follow-up chip that fits the goal.
  function paceQ() {
    return GK() === "gain"
      ? "Am I gaining at the right speed?"
      : GK() === "lose"
        ? "Am I losing at the right speed?"
        : "Is my weight holding steady?";
  }
  // the leanest protein foods this person eats
  function leanList() {
    var a = Z.S.prog && Z.S.prog.a,
      d = a ? a.diet : "nonveg",
      soy = !a || a.avoid.indexOf("soy") < 0,
      milk = !a || (a.avoid.indexOf("dairy") < 0 && d !== "vegan");
    if (d === "nonveg") return "egg whites, chicken breast or fish";
    if (d === "egg")
      return "egg whites" + (soy ? ", soya chunks" : "") + (milk ? " or low-fat curd" : " or sprouts");
    if (d === "veg")
      return (soy ? "soya chunks, " : "") + (milk ? "low-fat paneer or hung curd" : "sprouts or dal");
    return (soy ? "soya chunks, tofu or " : "") + "sprouts and dal";
  }
  // Minutes after midnight as 6:30 AM.
  function clockTxt(m) {
    return Z.P.t12(Z.P.hhmm(m));
  }
  // The user's first name.
  function first() {
    return String(P().name || "").split(" ")[0];
  }
  var STOP = {};
  (
    "a an the is are was were be been am do does did to of in on for with and or but if then than that this these those it its i me my mine you your we our they them he she his her " +
    "what which who whom how why when where can could should would will shall may might must have has had not no yes at by from as about into over under up down out off so such very just " +
    "also too more most much many any some there here please tell explain give need want know think get make good bad best better okay ok really actually like vs versus thing things"
  )
    .split(" ")
    .forEach(function (w) {
      STOP[w] = 1;
    });
  // Words of a question.
  function toks(s) {
    return lc(s)
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .filter(Boolean);
  }
  // Light stemming so plurals and verb forms match.
  function stem(w) {
    if (w.length > 4) {
      w = w.replace(/ies$/, "y").replace(/(ch|sh|ss|x)es$/, "$1");
      if (!/ss$/.test(w)) w = w.replace(/s$/, "");
      if (w.length > 5) w = w.replace(/ing$/, "");
      if (w.length > 4) w = w.replace(/ed$/, "");
      w = w.replace(/([b-df-hj-np-tv-z])\1$/, "$1");
      if (w.length > 4) w = w.replace(/e$/, "");
    }
    return w;
  }
  // The content words of a question, without stop words.
  function keys(s) {
    var seen = {},
      out = [];
    toks(s).forEach(function (w) {
      if (STOP[w] || w.length < 2) return;
      w = stem(w);
      if (!seen[w]) {
        seen[w] = 1;
        out.push(w);
      }
    });
    return out;
  }
  // Regex test on lower-case text.
  function has(t, re) {
    return re.test(t);
  }
  // A list as bullet lines.
  function bul(a) {
    return a
      .map(function (x) {
        return "• " + x;
      })
      .join("\n");
  }

  // Split article text into sentences.
  function sentences(text) {
    var t = String(text || "")
        .replace(/\s+/g, " ")
        .trim(),
      out = [],
      start = 0;
    for (var i = 0; i < t.length; i++) {
      var c = t.charAt(i);
      if (
        (c === "." || c === "!" || c === "?") &&
        (i + 1 >= t.length || (t.charAt(i + 1) === " " && /[A-Z0-9"“(]/.test(t.charAt(i + 2))))
      ) {
        var prev = t
          .slice(Math.max(start, i - 6), i)
          .split(" ")
          .pop();
        if (
          c === "." &&
          (/^(e\.g|i\.e|vs|dr|mr|mrs|ms|no|fig|approx|st|inc|etc)$/i.test(prev) || /^[A-Z]$/.test(prev))
        )
          continue;
        out.push(t.slice(start, i + 1).trim());
        start = i + 1;
      }
    }
    if (start < t.length) out.push(t.slice(start).trim());
    return out;
  }
  // pick the sentences that best match the question; returns them in reading order, each with a score
  function rank(text, qk, n) {
    var all = sentences(text),
      S = [],
      df = {};
    all.forEach(function (s, i) {
      if (
        s.length < 45 ||
        s.length > 330 ||
        s.split(" ").length < 7 ||
        /[{}\\|=]|\bISBN\b|\bdoi\b|^\W/.test(s)
      )
        return;
      var k = {};
      keys(s).forEach(function (w) {
        k[w] = 1;
      });
      S.push({ s: s, i: i, k: k });
    });
    qk.forEach(function (q) {
      S.forEach(function (x) {
        if (x.k[q]) df[q] = (df[q] || 0) + 1;
      });
    });
    S.forEach(function (x) {
      var sc = 0,
        hit = 0;
      qk.forEach(function (q) {
        if (x.k[q]) {
          sc += Math.log(1 + S.length / df[q]);
          hit++;
        }
      });
      sc = sc / (1 + Math.abs(x.s.length - 150) / 500);
      if (x.i < 2) sc += 0.9;
      else if (x.i < 5) sc += 0.3;
      if (/^(it|this|they|these|those|he|she|however|but|also|in addition|for example|such)\b/i.test(x.s))
        sc *= 0.7;
      x.sc = sc;
      x.hit = hit;
    });
    var top = S.slice()
      .sort(function (a, b) {
        return b.sc - a.sc;
      })
      .slice(0, n);
    return top.sort(function (a, b) {
      return a.i - b.i;
    });
  }

  /* ---------- spelling slips and Hinglish words ---------- */
  var FIX = {
    protien: "protein",
    protine: "protein",
    protin: "protein",
    proten: "protein",
    creatin: "creatine",
    createne: "creatine",
    wieght: "weight",
    weigth: "weight",
    wight: "weight",
    waight: "weight",
    calory: "calorie",
    calries: "calories",
    calaries: "calories",
    calori: "calorie",
    musle: "muscle",
    muscel: "muscle",
    masule: "muscle",
    masules: "muscles",
    musles: "muscles",
    excercise: "exercise",
    exersize: "exercise",
    exercice: "exercise",
    excersise: "exercise",
    workot: "workout",
    wokout: "workout",
    diat: "diet",
    dite: "diet",
    slep: "sleep",
    sleeep: "sleep",
    strech: "stretch",
    suppliment: "supplement",
    suppliments: "supplements",
    injurry: "injury",
    injuri: "injury",
    sholder: "shoulder",
    shoulde: "shoulder",
    bicep: "biceps",
    tricep: "triceps",
    abbs: "abs",
    stomac: "stomach",
    brekfast: "breakfast",
    breakfst: "breakfast",
    dinnar: "dinner",
    luch: "lunch",
    snaks: "snacks",
    fatloss: "fat loss",
    weightloss: "weight loss",
    vedio: "video",
    vedios: "videos",
    knie: "knee",
    nee: "knee",
    hight: "height",
    wey: "whey",
    crave: "craving",
    vajan: "weight",
    wajan: "weight",
    vazan: "weight",
    pet: "belly",
    tond: "belly",
    neend: "sleep",
    nind: "sleep",
    khana: "food",
    khaana: "food",
    khau: "eat",
    khaun: "eat",
    khaye: "eat",
    khaya: "ate",
    kya: "what",
    kaise: "how",
    kitna: "how much",
    kitni: "how much",
    kitne: "how many",
    dard: "pain",
    dukh: "pain",
    ghutna: "knee",
    ghutne: "knee",
    kamar: "lower back",
    peeth: "back",
    kandha: "shoulder",
    kandhe: "shoulder",
    seena: "chest",
    chhati: "chest",
    pani: "water",
    paani: "water",
    aaj: "today",
    thakan: "tired",
    bhook: "hungry",
    bhukh: "hungry",
    charbi: "fat",
    motapa: "fat",
    kasrat: "exercise",
    vyayam: "exercise",
    nashta: "breakfast",
    raat: "night",
    subah: "morning",
    chahiye: "need",
    mera: "my",
    meri: "my",
    mere: "my",
    mujhe: "i",
    hai: "is",
    hoon: "am",
    karu: "do",
    karun: "do",
    kare: "do",
    kab: "when",
    kyu: "why",
    kyun: "why",
    kaun: "which",
    nahi: "not",
    nahin: "not",
    accha: "good",
    acha: "good",
    bura: "bad"
  };
  var VOCAB = null;
  // Every word the coach knows, for spelling correction.
  function vocab() {
    if (VOCAB) return VOCAB;
    VOCAB = {};
    (
      "protein creatine calories calorie exercise exercises workout weight muscle muscles shoulder shoulders biceps triceps hamstring hamstrings stretch stretching supplement supplements breakfast dinner lunch sleep water injury injuries soreness cardio treadmill " +
      "stomach craving cravings alcohol fasting intermittent vitamin vitamins posture plateau progress progression review tomorrow yesterday steroids sugar snack snacks chapati paneer chicken strength training failure recovery overload readiness reminder reminders " +
      "protect protection faster fastest process weigh height increase decrease reduce without because between better healthy unhealthy energy tired hungry breathe breathing forearm forearms glutes calves quads abdominal deadlift squats lunges running walking " +
      "morning evening night weekly monthly budget cheap expensive vegetarian chapatis samosa biryani banana peanut peanuts almonds calcium magnesium potassium digestion constipation headache cramps badge badges target targets body percentage measure measurement"
    )
      .split(" ")
      .forEach(function (w) {
        VOCAB[w] = 1;
      });
    function add(t) {
      toks(t).forEach(function (w) {
        if (w.length >= 5) VOCAB[w] = 1;
      });
    }
    Object.keys(D.EX).forEach(function (id) {
      add(D.EX[id].n);
    });
    D.MUSCLES.forEach(function (m) {
      add(m.n);
    });
    D.FOODS.forEach(function (f) {
      add(f.n);
      (f.a || []).forEach(add);
    });
    return VOCAB;
  }
  // edit distance with swaps of neighbouring letters, cut off early at max
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev2 = null,
      prev = [],
      cur,
      i,
      j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      var low = i;
      for (j = 1; j <= b.length; j++) {
        var c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1))
          cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
        if (cur[j] < low) low = cur[j];
      }
      if (low > max) return max + 1;
      prev2 = prev;
      prev = cur;
    }
    return prev[b.length];
  }
  // Correct misspelt words against the coach's vocabulary.
  function fixWords(q) {
    var V = vocab(),
      names = Object.keys(V);
    return q
      .split(" ")
      .map(function (raw) {
        var w = raw.replace(/[^a-z]/g, "");
        if (!w || w !== raw.replace(/[?!.,]+$/, "")) return raw;
        var tail = raw.slice(w.length);
        if (FIX[w]) return FIX[w] + tail;
        if (w.length < 6 || V[w] || STOP[w]) return raw;
        var max = w.length >= 8 ? 2 : 1,
          best = null,
          bd = max + 1;
        for (var i = 0; i < names.length; i++) {
          var n = names[i];
          if (n.charAt(0) !== w.charAt(0)) continue;
          var d = dist(w, n, max);
          if (d < bd) {
            bd = d;
            best = n;
            if (d === 1) break;
          }
        }
        return best ? best + tail : raw;
      })
      .join(" ");
  }

  /* ---------- web lookups (documented open services only) ---------- */
  function plain(html) {
    try {
      return (new DOMParser().parseFromString("<body>" + html, "text/html").body.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
    } catch (e) {
      return String(html)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  // Drop reference sections from a Wikipedia article.
  function wikiClean(x) {
    var cut = x.search(
      /\n==+\s*(See also|References|Notes|External links|Further reading|Citations|Bibliography|Sources|Footnotes)\s*==+/i
    );
    if (cut > 0) x = x.slice(0, cut);
    return x.replace(/^==+.*==+\s*$/gm, " ").replace(/\{\\displaystyle[^}]*\}/g, " ");
  }
  var WIKI = "https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query";
  async function wikiOnce(q) {
    var j = JSON.parse(
      await Z.Net.get(WIKI + "&list=search&srlimit=5&srprop=&srsearch=" + encodeURIComponent(q))
    );
    var hits = ((j.query || {}).search || []).filter(function (h) {
      return !/disambiguation|^List of|^Index of|^Outline of/i.test(h.title);
    });
    if (!hits.length) return null;
    var k = JSON.parse(
      await Z.Net.get(
        WIKI + "&prop=extracts&explaintext=1&redirects=1&titles=" + encodeURIComponent(hits[0].title)
      )
    );
    var pages = (k.query || {}).pages || {},
      id = Object.keys(pages)[0],
      pg = id && pages[id];
    if (!pg || !pg.extract) return null;
    return {
      src: "Wikipedia",
      title: pg.title,
      url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(pg.title.replace(/ /g, "_")),
      text: wikiClean(pg.extract)
    };
  }
  async function medOnce(q) {
    var xml = await Z.Net.get(
      "https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&retmax=3&rettype=brief&tool=zenkai&term=" +
        encodeURIComponent(q)
    );
    var d = new DOMParser().parseFromString(xml, "text/xml").getElementsByTagName("document")[0];
    if (!d) return null;
    function val(n) {
      var e = d.getElementsByTagName("content");
      for (var i = 0; i < e.length; i++)
        if (lc(e[i].getAttribute("name")) === n) return e[i].textContent || "";
      return "";
    }
    var sum = plain(
      val("fullsummary")
        .replace(/<\/(li|p|h\d)>/gi, ". ")
        .replace(/<li>/gi, " ")
    ).replace(/([.:!?])\s*\./g, "$1");
    if (sum.length < 80) return null;
    return {
      src: "MedlinePlus",
      title: plain(val("title")),
      url: d.getAttribute("url") || "https://medlineplus.gov/",
      text: sum
    };
  }
  // Run a lookup; if it finds nothing, retry with the two main words.
  function tryTwice(fn, q) {
    var short = keys(q).slice(0, 2).join(" ");
    return fn(q)
      .then(function (r) {
        return r || (short && short !== q ? fn(short) : null);
      })
      .catch(function (e) {
        if (e && (e.code === "network" || e.code === "timeout")) netFail = true;
        return null;
      });
  }
  // w: { q: search words, k: question keywords, h: health topic }
  async function web(w, n) {
    // the health service does not allow cross-site browser calls, so it is used only inside the Android app
    var jobs = [tryTwice(wikiOnce, w.q)];
    if (w.h && Z.NATIVE) jobs.unshift(tryTwice(medOnce, w.q));
    var docs = (await Promise.all(jobs)).filter(Boolean),
      out = { lines: [], more: [], src: [] };
    docs.forEach(function (d) {
      var tk = keys(d.title),
        qk = w.k.length ? w.k : tk,
        top = rank(d.text, qk, 7),
        best = 0;
      top.forEach(function (x) {
        if (x.hit > best) best = x.hit;
      });
      var related =
        tk.some(function (a) {
          return qk.indexOf(a) > -1;
        }) || best >= Math.min(2, qk.length);
      if (!related || !top.length) return;
      out.src.push({ t: d.src + ": " + d.title, u: d.url });
      var keep = docs.length > 1 ? Math.ceil(n / 2) : n,
        byScore = top.slice().sort(function (a, b) {
          return b.sc - a.sc;
        }),
        take = {};
      byScore.slice(0, keep).forEach(function (x) {
        take[x.i] = 1;
      });
      top.forEach(function (x) {
        (take[x.i] ? out.lines : out.more).push(x.s);
      });
    });
    return out;
  }
  // True when web lookup is on and the phone is online.
  function canWeb() {
    return Z.S.set.web !== false && Z.Net.online();
  }

  /* ---------- answers from the log ---------- */
  function hello() {
    var h = new Date().getHours(),
      n = first();
    return (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + (n ? ", " + n : "") + ".";
  }
  // Today's briefing: session, food, water, next step.
  function brief() {
    var td = Z.today(),
      p = P(),
      d = Z.gd(td),
      k = Z.dk(td),
      sp = D.SPLIT[k],
      t = Z.tot(td),
      r = Z.readiness(td),
      na = Z.nextAction(td),
      L = [];
    L.push("**Day " + Z.diff(p.start, td) + " · " + (Z.rest(td) ? "Rest day" : Z.dayFocus(td)) + "**");
    if (Z.rest(td))
      L.push("• Recover: 30–45 min easy walk" + (d.walk ? " (done)" : "") + ", meal prep, early night.");
    else {
      var ws = Z.woStats(td);
      L.push(
        "• Training: " +
          (d.wo && d.wo.fin
            ? "session complete, " + ws.done + " sets."
            : sp.ex.length + " exercises, " + ws.done + " of " + ws.total + " sets logged.")
      );
    }
    L.push("• Readiness " + r.score + "/100: " + low1(r.label) + ". " + r.tip);
    L.push(
      "• Food: " +
        nf(t.k) +
        " of " +
        nf(p.kcal) +
        " kcal and " +
        r0(t.p) +
        " of " +
        p.protein +
        " g protein so far."
    );
    if (na && na.title !== "All caught up") L.push("**Do this next:** " + na.title + ". " + na.text);
    var top = Z.insights(td).filter(function (i) {
      return i.tone === "bad" || i.tone === "warn";
    })[0];
    if (top) L.push("**Watch:** " + top.title + ". " + top.text);
    return {
      text: L.join("\n"),
      chips: ["What should I eat next?", "Review my week", paceQ()],
      acts: Z.rest(td) ? [] : [{ l: "Open training", a: "tab", tab: "train" }]
    };
  }
  // This week's score and what to improve.
  function review() {
    var r = Z.weekReview(),
      tr = Z.trend(),
      L = ["**This week: " + r.score.total + " / 100**"].concat(
        r.lines.map(function (x) {
          return "• " + x;
        })
      );
    if (tr.rate != null)
      L.push(
        "• Trend: " +
          (tr.rate > 0.04 ? "down " : tr.rate < -0.04 ? "up " : "") +
          r1(Math.abs(tr.rate)) +
          " kg a week" +
          (tr.solid ? "." : " (early: needs 3 weeks of weigh-ins to trust).")
      );
    L.push("**Fix first:** " + r.focus);
    return {
      text: L.join("\n"),
      chips: [paceQ(), "How do I sleep more?", "Cheap high-protein foods"],
      acts: [{ l: "Open stats", a: "tab", tab: "stats" }]
    };
  }
  // Is the weight changing at the planned speed?
  function pace() {
    var tr = Z.trend(),
      p = P(),
      L = [],
      gk = GK(),
      up = tr.rate == null ? 0 : -tr.rate,
      w = tr.last || p.startW;
    var chips = ["When will I reach my goal?", "Why does my weight jump day to day?", "Review my week"],
      acts = [{ l: "See the weight chart", a: "tab", tab: "stats" }];
    if (tr.rate == null)
      L.push(
        "**Too early to say.** I need weigh-ins across at least two weeks.",
        "• Weigh every morning: after the toilet, before food or water.",
        "• Judge the weekly average, never one day. Salt, carbs and a late dinner swing the scale by 0.5–2 kg."
      );
    else if (gk === "lose") {
      if (tr.rate > Math.max(0.5, w * 0.01))
        L.push(
          "**Too fast: " + r1(tr.rate) + " kg a week.**",
          "• More than about 1% of your weight a week costs muscle and training strength.",
          "• Add 150–200 kcal a day and keep protein at " + p.protein + " g."
        );
      else if (tr.rate >= 0.2)
        L.push(
          "**Right on pace: " + r1(tr.rate) + " kg a week.**",
          "• A healthy range for you is about " + r1(w * 0.0025) + "–" + r1(w * 0.01) + " kg a week.",
          "• Weekly average is " + r1(tr.last) + " kg. Change nothing."
        );
      else if (tr.solid)
        L.push(
          "**Stalled: " + r1(Math.abs(tr.rate)) + " kg a week over three weeks.**",
          "• First check the log is honest: cooking oil, snacks, weekends, liquid calories.",
          "• Hit " + nf(p.steps) + " steps daily for two weeks.",
          "• Still flat after that? Drop about 150–200 kcal a day and recheck."
        );
      else
        L.push(
          "**Early trend: " + r1(tr.rate) + " kg a week.**",
          "• Two weeks is not enough to change the plan. Keep logging and judge after week three."
        );
    } else if (gk === "gain") {
      if (up > Math.max(0.4, w * 0.006))
        L.push(
          "**Gaining fast: " + r1(up) + " kg a week.**",
          "• Past about half a percent of your weight a week, most of the extra is fat, not muscle.",
          "• Take 150–200 kcal a day off and keep protein at " + p.protein + " g."
        );
      else if (up >= 0.1)
        L.push(
          "**Right on pace: +" + r1(up) + " kg a week.**",
          "• Slow gain is what lean gain looks like. Weekly average is " + r1(tr.last) + " kg.",
          "• Keep adding reps or weight in the gym; that is what tells the food where to go."
        );
      else if (tr.solid)
        L.push(
          "**Not gaining: " + (up >= 0 ? "+" : "−") + r1(Math.abs(up)) + " kg a week over three weeks.**",
          "• You are eating at maintenance. Add about 200 kcal a day and recheck in two weeks.",
          "• Easiest ways: a glass of milk and a banana, an extra roti with ghee, or a handful of nuts."
        );
      else
        L.push(
          "**Early trend: " + (up >= 0 ? "+" : "−") + r1(Math.abs(up)) + " kg a week.**",
          "• Two weeks is not enough to change the plan. Keep logging and judge after week three."
        );
    } else {
      if (Math.abs(up) <= 0.25)
        L.push(
          "**Steady at " + r1(tr.last) + " kg.**",
          "• That is the aim for your goal. The changes come from training and protein, and show in the mirror and the tape before the scale."
        );
      else if (tr.solid)
        L.push(
          "**Drifting " + (up > 0 ? "up" : "down") + ": " + r1(Math.abs(up)) + " kg a week.**",
          "• " + (up > 0 ? "Trim" : "Add") + " about 150 kcal a day to hold steady.",
          "• If the drift is what you want, change your goal in Menu → Personal setup and the targets will follow."
        );
      else
        L.push(
          "**Early trend: " + (up >= 0 ? "+" : "−") + r1(Math.abs(up)) + " kg a week.**",
          "• Two weeks is not enough to judge. Keep logging."
        );
    }
    return { text: L.join("\n"), chips: chips, acts: acts };
  }
  // When the goal weight is likely, from the real trend.
  function eta() {
    var tr = Z.trend(),
      p = P(),
      gk = GK(),
      cur = tr.last != null ? tr.last : p.startW,
      togo = gk === "gain" ? p.goalW - cur : cur - p.goalW,
      L = [];
    if (gk === "hold")
      return {
        text:
          "**Your goal has no finish line on the scale.** You are holding about " +
          r1(cur) +
          " kg and working on strength, shape and fitness. Watch your lifts in Stats and your waist measurement instead. Want a weight target? Change the goal in Menu → Personal setup.",
        chips: ["Review my week", paceQ()],
        acts: [{ l: "Open stats", a: "tab", tab: "stats" }]
      };
    if (togo <= 0)
      return {
        text: "**You are at your goal weight.** Time to move calories to maintenance: open Menu → Personal setup, choose Stay fit and healthy, and the targets are rebuilt.",
        acts: [{ l: "Personal setup", a: "setup" }]
      };
    var mine = tr.rate == null ? null : gk === "gain" ? -tr.rate : tr.rate,
      plan = Z.S.prog ? Math.abs(Z.S.prog.t.weekly) : gk === "gain" ? 0.25 : 0.5,
      ok = mine != null && mine >= (gk === "gain" ? 0.1 : 0.2);
    var rate = ok ? mine : Math.max(0.1, plan),
      wk = Math.round(togo / rate),
      when = Z.pd(Z.addDays(Z.today(), wk * 7)).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
      });
    L.push(
      "**About " + wk + " weeks: around " + when + ".**",
      "• " + r1(togo) + " kg to go, from " + r1(cur) + " to " + p.goalW + " kg.",
      "• Worked out at " +
        r1(rate) +
        " kg a week" +
        (ok ? ", your current trend." : ", the planned pace, because your own trend is not clear yet."),
      "• Expect it to slow near the end, with a few flat weeks on the way. That is normal."
    );
    return { text: L.join("\n"), chips: [paceQ(), "Can I lose fat and build muscle together?"] };
  }
  // What to eat next, from what is left today.
  function eatNow() {
    var td = Z.today(),
      p = P(),
      t = Z.tot(td),
      remK = p.kcal - t.k,
      remP = p.protein - t.p,
      L = [],
      s = Z.suggest(remK, remP);
    L.push(
      "**Left today: " +
        (remK >= 0 ? nf(remK) + " kcal" : nf(-remK) + " kcal over") +
        " and " +
        (remP > 0 ? r0(remP) + " g protein." : "protein is done.") +
        "**"
    );
    if (remK < 150 && remP > 15)
      L.push("• Calories are nearly used, so go lean: " + leanList() + ", with vegetables.");
    else if (remK < 0)
      L.push("• No punishment tomorrow. Keep the next meal to lean protein and vegetables, then carry on.");
    else if (s.length)
      s.forEach(function (x) {
        L.push("• " + x);
      });
    else L.push("• You are close on both. A fruit or a glass of chaas is plenty.");
    if (remK > 400)
      L.push(
        "• Build the plate in this order: protein first, then sabzi or salad, then chapati or rice to fill the calories."
      );
    return {
      text: L.join("\n"),
      chips: ["Cheap high-protein foods", "I am craving something salty", "Is it bad to eat late at night?"],
      acts: [{ l: "Open the food log", a: "tab", tab: "food" }]
    };
  }
  // Tomorrow's session and meals.
  function tomorrow() {
    var tm = Z.addDays(Z.today(), 1),
      k = Z.dk(tm),
      sp = D.SPLIT[k],
      off = Z.restK(k),
      c = Z.clock(),
      home = Z.S.prog && Z.S.prog.a.place !== "gym",
      L = ["**Tomorrow: " + sp.name + " · " + (off ? "rest day" : sp.focus) + "**"];
    if (off)
      L.push(
        "• Sleep a little longer. 30–45 min easy walk, outdoors if you can.",
        "• Meal prep: cook or portion your protein for the next few days and chop some vegetables.",
        "• Check your weekly average in Stats."
      );
    else
      L.push(
        "• Alarm at " + clockTxt(c.wake) + ". Training starts at " + clockTxt(c.wt) + ".",
        "• " +
          sp.ex
            .map(function (id) {
              return D.EX[id].n;
            })
            .join(", ") +
          ".",
        "• Tonight: " +
          (home ? "lay out your training clothes" : "pack the gym bag") +
          ", fill the bottle, lights out by " +
          clockTxt(c.bed) +
          "."
      );
    return {
      text: L.join("\n"),
      chips: ["What is on today's workout?", "How do I sleep more?"],
      acts: off ? [] : [{ l: "Open training", a: "tab", tab: "train" }]
    };
  }
  // The daily targets and how they were worked out.
  function targets() {
    var p = P(),
      tr = Z.trend(),
      g = Z.S.prog,
      w = tr.last != null ? tr.last : p.startW,
      bmr = 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === "f" ? -161 : 5),
      burn = bmr * (g ? g.t.factor : 1.55),
      gap = burn - p.kcal;
    return {
      text:
        "**Your daily targets**\n" +
        bul([
          nf(p.kcal) + " kcal",
          p.protein + " g protein · " + p.carbs + " g carbs · " + p.fat + " g fat · " + p.fibre + " g fibre",
          r1(p.water / 1000) + " L water · " + nf(p.steps) + " steps · " + p.sleep + " h sleep"
        ]) +
        "\n**Where the calories come from:** at " +
        r1(w) +
        " kg you burn about " +
        nf(bmr) +
        " kcal at rest and roughly " +
        nf(burn) +
        " with your day and your training. Eating " +
        nf(p.kcal) +
        (gap > 80
          ? " leaves a gap of about " + nf(gap) + " kcal a day, which is what moves the scale down."
          : gap < -80
            ? " puts you about " + nf(-gap) + " kcal over, which is what muscle is built from."
            : " matches that, so your weight holds.") +
        "\nRedo the setup after every 4–5 kg of change so the targets keep up.",
      chips: [paceQ(), "How much protein do I need?"],
      acts: [{ l: "My plan", a: "myplan" }]
    };
  }
  // Today's session in one answer.
  function workout() {
    var td = Z.today(),
      k = Z.dk(td),
      sp = D.SPLIT[k];
    if (Z.rest(td)) return tomorrow();
    return {
      text:
        "**Today: " +
        Z.dayFocus(td) +
        "**\n" +
        Z.dayEx(td)
          .map(function (id, i) {
            var e = D.EX[id];
            return i + 1 + ". " + e.n + " · " + e.sets + " × " + Z.repTxt(e);
          })
          .join("\n") +
        "\nWarm up for 8 minutes, then the lifts, the timed finisher and a 5-minute cool-down. Start guided session runs the whole thing for you.\n" +
        sp.note,
      chips: ["Should I train today?", "How do I add weight safely?"],
      acts: [{ l: "Open training", a: "tab", tab: "train" }]
    };
  }
  // Today's readiness score explained.
  function ready() {
    var r = Z.readiness(Z.today());
    return {
      text:
        "**Readiness " +
        r.score +
        " / 100: " +
        low1(r.label) +
        ".**\n• " +
        r.tip +
        "\n• Tired but not ill? Do the warm-up and the first exercise. If it still feels wrong after that, go home: one easy day costs nothing.\n• Fever, body ache or a chest cold: rest until it clears.",
      chips: ["How do I sleep more?", "What is on today's workout?"],
      acts: [{ l: "Log sleep and energy", a: "tab", tab: "today" }]
    };
  }
  // Where to find the grocery estimate.
  function budget() {
    return {
      text:
        "**Your month of groceries is in Menu → Monthly groceries,** added up from your own menu with a rough cost.\n" +
        bul([
          "Cheapest protein per rupee: soya chunks, eggs, roasted chana, dal, milk and curd.",
          "Buy dal, chana, oats and rice in bulk; they keep for months.",
          "If the family kitchen already covers roti, rice, dal, vegetables and oil, tick that box and you see only your own spend.",
          "No supplement is required. Whey is a convenience, not a need."
        ]),
      chips: ["Cheap high-protein foods", "Do I need whey protein?"],
      acts: [{ l: "Monthly groceries", a: "system", open: "bud" }]
    };
  }

  // The calorie target suggested by the real trend.
  function adaptAns() {
    var a = Z.adaptive(),
      p = P();
    if (!a.ok) {
      var need = [];
      if (a.weigh) need.push(a.weigh + " more weigh-in" + (a.weigh > 1 ? "s" : ""));
      if (a.food) need.push(a.food + " more day" + (a.food > 1 ? "s" : "") + " with meals logged");
      if (!need.length) need.push("weigh-ins spread over two full weeks");
      return {
        text:
          "**Not enough data yet to measure your real burn.**\nI work it out from what you ate and how your weight moved over four weeks. Still needed: " +
          need.join(" and ") +
          ".\nUntil then, " +
          nf(p.kcal) +
          " kcal is the best estimate from your height, weight and activity.",
        chips: ["How many calories should I eat?", paceQ()],
        acts: [{ l: "Nutrition calculator", a: "calc" }]
      };
    }
    var L = [
      "**Your real burn is about " + nf(a.burn) + " kcal a day.**",
      "• Measured from your own log: you ate " +
        nf(a.intake) +
        " kcal a day on " +
        a.days +
        " logged days, and your weight moved " +
        (a.rate >= 0 ? "down " : "up ") +
        r1(Math.abs(a.rate)) +
        " kg a week across " +
        a.weighs +
        " weigh-ins."
    ];
    if (Math.abs(a.delta) < 80)
      L.push("• Your target of " + nf(p.kcal) + " kcal already fits. Change nothing.");
    else
      L.push(
        "• For about 0.5 kg a week, eat **" +
          nf(a.target) +
          " kcal**. That is " +
          nf(Math.abs(a.delta)) +
          (a.delta > 0 ? " more" : " less") +
          " than your current target."
      );
    L.push(
      "It is only as good as the log. Missed snacks and cooking oil make the burn look lower than it is."
    );
    return {
      text: L.join("\n"),
      chips: [paceQ(), "When will I reach my goal?"],
      acts:
        Math.abs(a.delta) >= 80
          ? [
              { l: "Use " + nf(a.target) + " kcal", a: "adaptapply" },
              { l: "Open stats", a: "tab", tab: "stats" }
            ]
          : [{ l: "Open stats", a: "tab", tab: "stats" }]
    };
  }
  // Body-fat estimate history.
  function bfAns() {
    var h = Z.bodyfat();
    if (!h.length)
      return {
        text: "**I can estimate body fat from two tape measurements.**\n• Waist: around the navel, relaxed, breathing out.\n• Neck: just under the Adam's apple, tape level.\nEnter both in Stats → Body measurements. It uses the U.S. Navy formula, which is usually within 3–4 points. The trend matters more than the number.",
        acts: [{ l: "Open stats", a: "tab", tab: "stats" }],
        chips: ["Can I lose belly fat first?"]
      };
    var a = h[h.length - 1],
      f = h[0],
      L = [
        "**About " + r1(a.bf) + "% body fat** (tape estimate, usually within 3–4 points).",
        "• That is roughly " +
          r1(a.fat) +
          " kg of fat and " +
          r1(a.lean) +
          " kg of lean mass at " +
          r1(a.w) +
          " kg."
      ];
    if (h.length > 1)
      L.push(
        "• Since " +
          Z.pd(f.dt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
          ": fat " +
          (a.fat <= f.fat ? "down " : "up ") +
          r1(Math.abs(a.fat - f.fat)) +
          " kg, lean mass " +
          (a.lean >= f.lean ? "up " : "down ") +
          r1(Math.abs(a.lean - f.lean)) +
          " kg." +
          (a.lean >= f.lean - 0.5 && a.fat < f.fat
            ? " That is the result you want: fat going, muscle staying."
            : "")
      );
    L.push("Measure every two weeks, same time of day, same tape position.");
    return {
      text: L.join("\n"),
      acts: [{ l: "Open stats", a: "tab", tab: "stats" }],
      chips: ["Can I lose fat and build muscle together?", "How do I get visible abs?"]
    };
  }
  // Yesterday in numbers.
  function yesterdayAns() {
    var y = Z.addDays(Z.today(), -1),
      d = Z.gd(y),
      t = Z.tot(y),
      p = P(),
      L = ["**Yesterday, " + Z.pd(y).toLocaleDateString("en-IN", { weekday: "long" }) + "**"];
    L.push(
      d.food.length
        ? "• Food: " +
            nf(t.k) +
            " kcal and " +
            r0(t.p) +
            " g protein (" +
            (t.p >= p.protein - 10 ? "protein hit" : r0(p.protein - t.p) + " g short on protein") +
            ")."
        : "• Food: nothing logged."
    );
    if (d.food.length)
      L.push(
        "• You ate: " +
          d.food
            .slice(0, 8)
            .map(function (f) {
              return f.q + " × " + f.n.split(",")[0].toLowerCase();
            })
            .join(", ") +
          (d.food.length > 8 ? " and more" : "") +
          "."
      );
    L.push(
      "• Training: " +
        (Z.rest(y)
          ? d.walk
            ? "rest-day walk done."
            : "rest day."
          : d.wo && d.wo.fin
            ? Z.dayFocus(y).toLowerCase() + " session done, " + Z.woStats(y).done + " sets."
            : "no finished session.")
    );
    L.push(
      "• Sleep " +
        (d.sleep != null ? d.sleep + " h" : "not logged") +
        ", steps " +
        (d.steps != null ? nf(d.steps) : "not logged") +
        ", " +
        Z.doneCount(y) +
        " of 7 goals."
    );
    return { text: L.join("\n"), chips: ["Brief me for today", "Review my week"] };
  }
  // This week against last week.
  function compareAns() {
    var wk = Z.weeks(),
      mk = Z.monday(Z.today()),
      c = null,
      l = null;
    wk.forEach(function (w) {
      if (w.k === mk) c = w;
      if (w.k === Z.addDays(mk, -7)) l = w;
    });
    if (!c || !l)
      return {
        text: "**I need two weeks in the log to compare.** Keep logging and ask again next week.",
        chips: ["Review my week"]
      };
    function row(n, a, b, f, good) {
      if (a == null || b == null) return "• " + n + ": not enough logged.";
      var d = a - b;
      return (
        "• " +
        n +
        ": " +
        f(a) +
        " vs " +
        f(b) +
        (Math.abs(d) < 0.05 * Math.abs(b || 1) ? " (level)" : d > 0 === good ? " (better)" : " (worse)")
      );
    }
    return {
      text:
        "**This week vs last week**\n" +
        [
          row(
            "Average weight",
            c.w,
            l.w,
            function (v) {
              return r1(v) + " kg";
            },
            false
          ),
          row(
            "Calories",
            c.kcal,
            l.kcal,
            function (v) {
              return nf(v);
            },
            false
          ),
          row(
            "Protein",
            c.p,
            l.p,
            function (v) {
              return r0(v) + " g";
            },
            true
          ),
          row(
            "Sleep",
            c.sleep,
            l.sleep,
            function (v) {
              return r1(v) + " h";
            },
            true
          ),
          row(
            "Steps",
            c.steps,
            l.steps,
            function (v) {
              return nf(v);
            },
            true
          ),
          "• Sessions: " + c.sess + " vs " + l.sess + " (this week is still running)."
        ].join("\n"),
      chips: ["Review my week", "What is my real calorie burn?"],
      acts: [{ l: "Open stats", a: "tab", tab: "stats" }]
    };
  }
  // Badges earned and the next ones.
  function badgeAns() {
    var b = Z.badges(),
      got = b.filter(function (x) {
        return x.hit;
      }),
      next = b
        .filter(function (x) {
          return !x.hit;
        })
        .sort(function (x, y) {
          return y.have / y.need - x.have / x.need;
        })
        .slice(0, 3);
    return {
      text:
        "**" +
        got.length +
        " of " +
        b.length +
        " badges earned.**" +
        (got.length
          ? "\nLatest: " +
            got
              .slice(-3)
              .map(function (x) {
                return x.n;
              })
              .join(", ") +
            "."
          : "") +
        (next.length
          ? "\n**Closest next:**\n" +
            bul(
              next.map(function (x) {
                return x.n + ": " + low1(x.d) + " (" + x.have + " of " + x.need + ")";
              })
            )
          : ""),
      acts: [{ l: "See all badges", a: "tab", tab: "stats" }],
      chips: ["Review my week"]
    };
  }

  /* ---------- exercises, muscles, joints ---------- */
  var GENERIC = {
    press: 1,
    curl: 1,
    raise: 1,
    machine: 1,
    cable: 1,
    dumbbell: 1,
    barbell: 1,
    seated: 1,
    standing: 1,
    extension: 1,
    pulldown: 1,
    row: 1,
    bar: 1,
    arm: 1,
    single: 1,
    grip: 1,
    deck: 1
  };
  // The exercise a question is about.
  function findEx(t) {
    var best = null,
      bl = 0,
      tk = {};
    keys(t).forEach(function (w) {
      tk[w] = 1;
    });
    Object.keys(D.EX).forEach(function (id) {
      var e = D.EX[id];
      [lc(e.n), lc(e.q)].forEach(function (nm) {
        var n2 = " " + nm.replace(/-/g, " ") + " ";
        if (t.indexOf(n2) > -1 && n2.length > bl) {
          bl = n2.length;
          best = id;
        }
      });
      var w = keys(e.n),
        hit = w.filter(function (x) {
          return tk[x];
        }),
        strong = hit.filter(function (x) {
          return !GENERIC[x];
        });
      if (hit.length >= 2 && strong.length >= 1 && hit.length * 4 > bl) {
        bl = hit.length * 4;
        best = id;
      }
    });
    return best;
  }
  // How to do an exercise, with the user's own history.
  function exAns(id, t) {
    var e = D.EX[id],
      td = Z.today();
    if (
      has(t, /replace|alternative|instead|substitut|swap|another exercise|don.?t have|no machine|busy|taken/)
    )
      return {
        text:
          "**Instead of " +
          low1(e.n) +
          ":** " +
          e.alt +
          ".\nKeep the same sets and reps (" +
          e.sets +
          " × " +
          Z.repTxt(e) +
          ") and start lighter than you expect.",
        acts: [{ l: "Photos and full guide", a: "guide", id: id }],
        chips: ["How do I do " + low1(e.n) + "?"]
      };
    if (has(t, /progress|add weight|increase|heavier|stuck|how much weight|what weight|last time|previous/)) {
      var h = Z.exHistory(id);
      return {
        text:
          "**" +
          e.n +
          "**\n• " +
          Z.hint(id, td) +
          (h.length > 1
            ? "\n• Logged " +
              h.length +
              " sessions. Best set so far: " +
              (h[h.length - 1].w ? h[h.length - 1].w + " kg × " : "") +
              h[h.length - 1].r +
              "."
            : "") +
          "\n• The rule: stay in " +
          e.lo +
          "–" +
          e.hi +
          (e.unit === "sec" ? " seconds" : " reps") +
          ". When every set reaches " +
          e.hi +
          " with clean form, take the smallest step up and start again from " +
          e.lo +
          ".",
        acts: [{ l: "See strength chart", a: "tab", tab: "stats" }],
        chips: ["How do I do " + low1(e.n) + "?"]
      };
    }
    return {
      text:
        "**" +
        e.n +
        "** · " +
        e.sets +
        " × " +
        Z.repTxt(e) +
        "\nWorks: " +
        low1(e.t) +
        ".\n**Set up:** " +
        e.start +
        " " +
        e.posture +
        "\n**Do it:**\n" +
        e.steps
          .map(function (s, i) {
            return i + 1 + ". " + s;
          })
          .join("\n") +
        "\n**Breathe:** " +
        e.breath +
        "\n**Avoid:** " +
        e.mistakes.slice(0, 3).map(low1).join("; ") +
        ".",
      acts: [{ l: "Photos and full guide", a: "guide", id: id }],
      chips: ["What can replace " + low1(e.n) + "?", "How do I progress on " + low1(e.n) + "?"]
    };
  }
  var MSYN = {
    chest: "chest|pec|pecs|pectoral",
    delts: "shoulder|shoulders|delt|delts|deltoid",
    rdelts: "rear delt|rear delts|rear shoulder",
    cuff: "rotator cuff|cuff",
    traps: "trap|traps|trapezius",
    midback: "middle back|mid back|upper back|rhomboid|rhomboids",
    lats: "lat|lats|latissimus|back muscles|back workout|back day|wider back|my back",
    lowback:
      "lower back|low back|lumbar|spine|slip disc|slipped disc|back pain|back hurts|back is sore|back ache",
    biceps: "bicep|biceps",
    triceps: "tricep|triceps",
    forearms: "forearm|forearms|grip",
    abs: "abs|core|six pack|stomach muscles",
    obliques: "oblique|obliques|side abs",
    glutes: "glute|glutes|butt|gluteus",
    hipab: "side of the hip|hip abductor|glute medius",
    hipfl: "hip flexor|hip flexors|groin|inner thigh|adductor",
    quads: "quad|quads|quadriceps|thigh|thighs",
    hams: "hamstring|hamstrings",
    calves: "calf|calves|achilles|shin",
    neck: "neck"
  };
  // The muscle a question is about.
  function findMuscle(t) {
    var best = null,
      bl = 0;
    Object.keys(MSYN).forEach(function (id) {
      MSYN[id].split("|").forEach(function (a) {
        if (t.indexOf(" " + a + " ") > -1 && a.length > bl) {
          bl = a.length;
          best = id;
        }
      });
    });
    return best;
  }
  // A muscle by id.
  function mById(id) {
    for (var i = 0; i < D.MUSCLES.length; i++) if (D.MUSCLES[i].id === id) return D.MUSCLES[i];
    return null;
  }
  var PAINW =
    /pain|hurt|ache|aching|sore|injur|strain|sprain|pulled|tear|tore|click|pop|swollen|swell|stiff|cramp|tight|inflam|tendon|pinch|numb|tingl/;
  // A muscle: what it does, how to train it, and what pain there means.
  function muscleAns(id, pain) {
    var m = mById(id),
      by = Object.keys(D.EXM)
        .filter(function (e) {
          return D.EXM[e].indexOf(id) > -1;
        })
        .map(function (e) {
          return D.EX[e].n;
        });
    if (pain)
      return {
        text:
          "**" +
          m.n +
          ": pain check**\n**How it usually gets hurt:** " +
          m.hurt +
          "\n**Normal soreness:** a dull ache in the muscle 24–72 hours after training, about equal on both sides, easing as you warm up.\n**Stop and get it checked:** " +
          m.warn +
          "\n**Until it settles:**\n" +
          bul(m.protect.slice(0, 3)) +
          "\n" +
          D.PAIN.aid +
          (m.you ? "\n**For you:** " + m.you : ""),
        web: { q: m.n.split(":")[0] + " injuries", k: keys(m.n + " injury pain strain"), h: 1 },
        acts: [{ l: m.n + " in the muscle guide", a: "muscle", id: id }],
        chips: ["Normal soreness or injury?", "Should I train today?"]
      };
    return {
      text:
        "**" +
        m.n +
        "** (" +
        low1(m.sci) +
        ")\n**Job:** " +
        m.job +
        "\n**Trained in your plan by:** " +
        (by.length ? by.join(", ") + "." : "nothing directly yet.") +
        "\n**Protect it:**\n" +
        bul(m.protect.slice(0, 4)) +
        "\n**Recovery:** " +
        m.rec +
        (m.you ? "\n**For you:** " + m.you : ""),
      acts: [{ l: m.n + " in the muscle guide", a: "muscle", id: id }],
      chips: ["How do I avoid " + low1(m.n.split(":")[0]) + " injuries?", "Normal soreness or injury?"]
    };
  }
  // A joint: common problems and when to see someone.
  function jointAns(name, wq) {
    var j = D.JOINTS.filter(function (r) {
      return r[0] === name;
    })[0];
    return {
      text:
        "**" +
        name +
        ": joint pain is not muscle soreness.**\n• " +
        (j ? j[1] : "Stop the movement that causes it.") +
        "\n**Stop and get it checked if:**\n" +
        bul(D.PAIN.stop.slice(0, 4)) +
        "\n" +
        D.PAIN.aid,
      web: { q: wq, k: keys(wq + " pain"), h: 1 },
      acts: [{ l: "Muscle and injury guide", a: "atlas" }],
      chips: ["Normal soreness or injury?", "Should I train today?"]
    };
  }

  /* ---------- food ---------- */
  function foodAns(f, q) {
    var p = P(),
      t = Z.tot(Z.today()),
      k = f.k * q,
      pr = f.p * q,
      per = f.k ? r1((f.p / f.k) * 100) : 0;
    var verdict =
      per >= 10
        ? "Very lean protein: ideal while losing fat."
        : per >= 6
          ? "Decent protein for its calories."
          : f.k * (f.q || 1) >= 250
            ? "Calorie-dense with little protein. Fine as a planned treat: log it and move on."
            : k <= 90
              ? "Light. Easy to fit in."
              : "Mostly carbs or fat. Count it and pair it with a protein food.";
    var remK = p.kcal - t.k;
    return {
      text:
        "**" +
        (q !== 1 ? q + " × " : "") +
        f.n +
        "** (" +
        f.u +
        ")\n• " +
        r0(k) +
        " kcal · " +
        r1(pr) +
        " g protein · " +
        r1(f.c * q) +
        " g carbs · " +
        r1(f.f * q) +
        " g fat" +
        (f.fb ? " · " + r1(f.fb * q) + " g fibre" : "") +
        "\n• " +
        per +
        " g protein per 100 kcal. " +
        verdict +
        "\n• " +
        (remK > 0
          ? "It would use " +
            Math.min(999, Math.round((k / remK) * 100)) +
            "% of the " +
            nf(remK) +
            " kcal you have left today."
          : "You are already at today's calories, so this would go over.") +
        "\nHome recipes vary, so treat the numbers as estimates.",
      acts: [{ l: "Add to today's log", a: "coachadd", id: f.id, q: q }],
      chips: ["What should I eat next?", "Cheap high-protein foods"]
    };
  }
  // Totals for a typed meal.
  function mealAns(items) {
    var k = 0,
      p = 0,
      c = 0,
      f = 0;
    items.forEach(function (x) {
      k += x.f.k * x.q;
      p += x.f.p * x.q;
      c += x.f.c * x.q;
      f += x.f.f * x.q;
    });
    return {
      text:
        "**That meal, from the built-in food table:**\n" +
        bul(
          items.map(function (x) {
            return x.q + " × " + x.f.n + ": " + r0(x.f.k * x.q) + " kcal · " + r1(x.f.p * x.q) + " g protein";
          })
        ) +
        "\n**Total: " +
        nf(k) +
        " kcal · " +
        r0(p) +
        " g protein · " +
        r0(c) +
        " g carbs · " +
        r0(f) +
        " g fat.**\nHome recipes vary, so treat it as an estimate. To log it, type the same words on the Food tab.",
      acts: [{ l: "Open the food log", a: "tab", tab: "food" }],
      chips: ["What should I eat next?"]
    };
  }
  async function foodOnline(name) {
    var list = await Z.searchOnline(name);
    if (!list.length) return null;
    return {
      text:
        "**Not in the built-in table, so here is what Open Food Facts lists** (per 100 g):\n" +
        bul(
          list.slice(0, 4).map(function (f) {
            return (
              f.n + ": " + f.k + " kcal · " + f.p + " g protein · " + f.c + " g carbs · " + f.f + " g fat"
            );
          })
        ) +
        "\nPack labels are entered by volunteers. Check yours. To log one, use Food → Add → Search online.",
      src: [{ t: "Open Food Facts", u: "https://world.openfoodfacts.org/" }],
      acts: [{ l: "Open the food log", a: "tab", tab: "food" }],
      chips: ["What should I eat next?"]
    };
  }

  var MICRO = [
    [/calcium/, 0, "calcium"],
    [/vitamin d\b|vit d\b|sunlight|d3\b/, 1, "vitamin D"],
    [/b12|b 12|cobalamin/, 2, "vitamin B12"],
    [/\biron\b|h(a)?emoglobin|an(a)?emi/, 3, "iron"],
    [/zinc/, 4, "zinc"],
    [/magnesium/, 5, "magnesium"],
    [/potassium/, 6, "potassium"],
    [/vitamin c\b|vit c\b/, 7, "vitamin C"],
    [/vitamin a\b|folate|folic/, 8, "folate"],
    [/omega|fish oil/, 9, "omega-3 fatty acids"]
  ];
  // A vitamin or mineral: sources and daily need.
  function microAns(t) {
    for (var i = 0; i < MICRO.length; i++)
      if (MICRO[i][0].test(t)) {
        var r = D.MICROS[MICRO[i][1]],
          def = /deficien|low |lack|symptom|sign/.test(t);
        return {
          text:
            "**" +
            r[0].split(" ·")[0] +
            "**" +
            (r[0].indexOf("·") > -1
              ? " (target " + r[0].split("· ")[1].replace("~", "about ") + " a day)"
              : "") +
            "\n• Cheap sources: " +
            low1(r[1]) +
            ".\n• In your plan: " +
            low1(r[2]) +
            "\nSupplement only when a blood test or a doctor says you need it.",
          web: { q: MICRO[i][2] + (def ? " deficiency" : ""), k: keys(t).concat(keys(MICRO[i][2])), h: 1 },
          acts: [{ l: "Vitamins and minerals", a: "system", open: "mic" }],
          chips: ["Which supplements are worth it?"]
        };
      }
    return null;
  }

  /* ---------- built-in guide: short, evidence-based answers ---------- */
  function you(s) {
    return "**For you:** " + s;
  }
  // facts about the person's own plan, so advice never assumes someone else's week
  function ME() {
    var g = Z.S.prog,
      a = g && g.a,
      o = { g: g, a: a },
      T = Z.P.toMin;
    o.wake = a ? T(a.wake) : 360;
    o.bed = a ? T(a.bed) : 1350;
    o.wt = a ? T(a.wt) : 1080;
    o.early = o.wt >= 240 && o.wt < 480;
    o.toBed = (o.bed - o.wt + 1440) % 1440;
    o.inBed = ((o.wake - o.bed + 1440) % 1440) / 60;
    o.bud = a ? { low: "under ₹5,000", mid: "₹5,000–8,000", high: "over ₹8,000" }[a.bud] + " a month" : "";
    o.n = a ? a.days.length : 0;
    o.veg = a && (a.diet === "veg" || a.diet === "vegan");
    o.cov = {};
    if (g && g.info && g.info.cover)
      g.info.cover.forEach(function (c) {
        o.cov[c.k] = c;
      });
    o.list = function (arr) {
      return arr.join(", ").replace(/, ([^,]*)$/, " and $1");
    };
    o.days = function (k) {
      var c = o.cov[k];
      return c && c.days.length ? o.list(c.days) : "";
    };
    o.fins = function (re) {
      var out = [];
      if (g)
        Z.P.DOWS.forEach(function (d) {
          var x = g.split[d];
          if (x && x.fin && re.test(x.fin)) out.push(Z.P.DNAME[d]);
        });
      return out;
    };
    o.gap = g ? g.t.tdee - g.t.kcal : null;
    o.weekly = g ? g.t.weekly : null;
    return o;
  }
  var KB = [
    {
      re: /creatine/,
      wq: "creatine supplement",
      h: 0,
      a: function () {
        return [
          "**Creatine works, and it is optional.** It is the most-studied sports supplement: it lets you do slightly more work in short, hard efforts, which adds up to a little more strength and muscle.",
          bul([
            "Dose: 3–5 g of plain creatine monohydrate a day, any time. No loading, no cycling.",
            "The scale may rise 0.5–1.5 kg in the first weeks. That is water held inside the muscle, not fat.",
            "A 2021 expert review found no kidney harm in healthy people at these doses. With any kidney condition or regular medicine, ask a doctor first.",
            "The hair-loss worry comes from one small 2009 study that measured a hormone, not hair. No study has shown creatine causing hair loss."
          ]),
          you(
            "food, sleep and training come first." +
              (ME().bud ? " Your food budget is " + ME().bud + "." : "") +
              " If you buy it, plain unflavoured monohydrate is the cheapest form that works. The water jump in the first weeks shows up on the scale, so judge by the weekly average."
          )
        ];
      },
      chips: ["Do I need whey protein?", "Which supplements are worth it?"]
    },
    {
      re: /whey|protein (powder|shake|supplement)|mass gainer|gainer/,
      wq: "whey protein",
      a: function () {
        var p = P();
        return [
          "**Whey is convenient, not necessary.** It is milk protein as a powder: about 24 g protein for 120 kcal per scoop.",
          bul([
            "Your food plan already reaches about " +
              r0(Z.planTotals().p) +
              " g against a " +
              p.protein +
              " g target, without powder.",
            "Worth buying only if you keep missing protein on busy days.",
            "Pick a brand with third-party lab testing. Cheap powders are often under-dosed.",
            "Skip mass gainers while losing fat: they are mostly sugar."
          ])
        ];
      },
      chips: ["Cheap high-protein foods", "How much protein do I need?"]
    },
    {
      re: /bcaa|eaa|glutamine/,
      wq: "branched-chain amino acid",
      a: function () {
        return [
          "**Skip it.** BCAAs, EAAs and glutamine add nothing when your daily protein is on target. Eggs, chicken, milk and soya already contain all of them.",
          you("put that money into eggs or chicken.")
        ];
      },
      chips: ["Which supplements are worth it?"]
    },
    {
      re: /pre.?workout|caffeine|coffee/,
      wq: "caffeine",
      a: function () {
        return [
          "**Coffee is the only pre-workout you need.**",
          bul([
            "One cup 30–45 minutes before training improves effort a little.",
            "Skip powders with long ingredient lists and heavy stimulants.",
            "Keep caffeine at least 6 hours away from bedtime. In a sleep-lab study, a large dose taken 6 hours before bed still cut sleep by about an hour, and people did not notice."
          ]),
          (function () {
            var m = ME();
            return you(
              m.toBed < 360
                ? "you train at " +
                    clockTxt(m.wt) +
                    ", less than 6 hours before bed at " +
                    clockTxt(m.bed) +
                    ". Skip the coffee then: a banana or two dates is enough."
                : m.early
                  ? "at " +
                    clockTxt(m.wt) +
                    ", water and a banana do the job. A black coffee is fine if you like it."
                  : "a coffee before your " +
                    clockTxt(m.wt) +
                    " session is fine; it is more than 6 hours before your bedtime."
            );
          })()
        ];
      },
      chips: ["How do I sleep more?"]
    },
    {
      re: /fat burner|fat.?loss (pill|tablet|supplement)|green tea extract|apple cider|detox|slimming/,
      wq: "weight loss dietary supplement",
      a: function () {
        return [
          "**Save your money.** Fat burners are mostly caffeine plus marketing. The effect is tiny, and some contain unlisted drugs. Detox drinks and apple cider vinegar do not burn fat either.",
          "What moves the scale: the calorie gap, protein, lifting, steps and sleep."
        ];
      },
      chips: [paceQ()]
    },
    {
      re: /supplement|multivitamin|ashwagandha|tablets? (for|to)|which vitamins?|vitamins? (should|do) i|need (any )?vitamins/,
      wq: "dietary supplements",
      h: 1,
      a: function () {
        return [
          "**Food first. Supplement only a proven gap.**",
          bul([
            "Vitamin D is a common gap in India" +
              (ME().early
                ? ", more so when you train before sunrise and work indoors"
                : ", especially for people who work indoors") +
              ". Ask a doctor for a 25-OH vitamin D test and supplement only on advice. The Indian daily allowance is 600 IU.",
            ME().veg
              ? "B12 comes almost only from animal foods. As a vegetarian or vegan, ask a doctor about a B12 test."
              : "B12 is covered by eggs, milk, fish and chicken.",
            "Iron, zinc and magnesium come from dal, chana, soya, peanuts, greens and whole grains.",
            "Omega-3: fish once a week, or 1 tbsp flax seeds (alsi) a day.",
            "Calcium: adults need about 1,000 mg a day (ICMR 2020). Milk, curd, paneer, ragi and til are the best sources."
          ])
        ];
      },
      acts: [{ l: "Vitamins and minerals", a: "system", open: "mic" }],
      chips: ["Is creatine safe?", "Do I need whey protein?"]
    },
    {
      re: /how much protein|protein (do i|should i|need|intake|target|per day|a day|requirement)|too much protein|protein.*(kidney|liver)|enough protein/,
      wq: "protein nutrient requirements",
      a: function () {
        var p = P(),
          w = Z.trend().last || p.startW;
        return [
          "**Aim for " +
            p.protein +
            " g a day.** That is about " +
            r1(p.protein / w) +
            " g per kg. Research on lifters puts the useful range at 1.6–2.2 g per kg, with little extra benefit above it.",
          bul([
            "Spread it out: 25–40 g at each main meal.",
            "Protein matters most in a calorie deficit: it is what protects muscle.",
            "In healthy people these intakes have not been shown to harm the kidneys. With kidney disease, protein needs a doctor's advice."
          ])
        ];
      },
      chips: ["Cheap high-protein foods", "Do I need whey protein?"]
    },
    {
      re: /cheap.*protein|protein.*(cheap|budget|source|food|veg|swap)|high.?protein (food|snack|meal|swap|breakfast|option)|veg(etarian)? protein|protein rich/,
      a: function () {
        var g = ME().g;
        if (g && g.food && g.food.cheap.length)
          return [
            "**Best protein for the money, from the foods you eat:**",
            bul(
              g.food.cheap.slice(0, 7).map(function (c) {
                return c[0] + ": about ₹" + c[1] + " for 20 g of protein.";
              })
            ),
            "Prices are rough city averages. Peanuts and paneer bring a lot of fat with the protein, so measure them.",
            you(
              "when you are short on protein, add one more portion of the cheapest food at the top of this list."
            )
          ];
        return [
          "**Best protein for the money, cheapest first:**",
          bul([
            "Soya chunks: 52 g protein per 100 g dry. 40 g in a curry gives 21 g.",
            "Eggs: about 6 g each.",
            "Roasted chana: about 7.5 g per 40 g handful.",
            "Dal 7 g per katori, curd 3.5 g per 100 g, milk 8 g per glass.",
            "Chicken breast: about 34 g per 150 g raw.",
            "Peanuts add protein but are calorie-heavy: keep to 15 g."
          ])
        ];
      },
      chips: ["What should I eat next?", "What does my diet cost a month?"]
    },
    {
      re: /intermittent|fasting|\bif\b diet|16.?8|omad|skip breakfast|skipping breakfast/,
      wq: "intermittent fasting",
      a: function () {
        return [
          "**Fasting works only by helping you eat less.** With calories and protein matched, studies find no extra fat loss over normal meals.",
          bul([
            "It suits people who prefer two big meals to four small ones.",
            "It makes hitting a high protein target harder.",
            "Training hard and then waiting many hours to eat makes recovery and the protein target harder."
          ]),
          you(
            "have one of your protein meals within two or three hours after training. If you want a shorter eating window, close the kitchen after dinner instead of skipping that meal."
          )
        ];
      },
      chips: ["What should I eat next?", "Is it bad to eat late at night?"]
    },
    {
      re: /keto|low.?carb|no.?carb|carbs? (bad|make|at night|after)|rice (or|vs) (roti|chapati)|(roti|chapati) (or|vs) rice|stop (eating )?rice|cut (out )?(rice|carbs)|eat(ing)? (late|at night)|late.?night|night.*(eat|carb|dinner)/,
      wq: "low-carbohydrate diet",
      a: function () {
        return [
          "**Carbs do not make you fat. A calorie surplus does.**",
          bul([
            "Rice or chapati, noon or night: timing does not change fat loss. The day's total does.",
            "100 g cooked rice is about 130 kcal. One chapati is about 100 kcal.",
            "Carbs fuel lifting. Very low-carb diets often make hard sessions feel worse, especially in the first weeks.",
            "Keto loses fat only when it cuts calories, and the fast early drop is mostly water."
          ]),
          you(
            "keep rice and chapati in the plan and measure them. A late dinner is fine; just finish it about 90 minutes before bed so sleep is not disturbed."
          )
        ];
      },
      chips: ["What should I eat next?", "Why does my weight jump day to day?"]
    },
    {
      re: /sugar|jaggery|\bgur\b|honey|sweet tooth|sweets|dessert|mithai|chocolate craving/,
      wq: "added sugar",
      a: function () {
        return [
          "**Sugar is not poison, but it is easy calories with no protein.**",
          bul([
            "Jaggery and honey are still sugar: about the same calories, spoon for spoon.",
            "One tsp of sugar in chai is 16 kcal. Four cups a day is a chapati's worth.",
            "Fruit is different: fibre and water make it filling."
          ]),
          you(
            "plan a sweet once or twice a week and log it. Daily, swap to fruit, dahi with a little jaggery, or a date."
          )
        ];
      },
      chips: ["I am craving something salty", "Can I have a cheat meal?"]
    },
    {
      re: /cheat|eating out|eat out|restaurant|party|wedding|festival|diwali|buffet|junk|fast food|outside food|treat meal|ordered|swiggy|zomato/,
      wq: "",
      a: function () {
        return [
          "**One meal does not undo a week. One weekend can.**",
          bul([
            "Decide before you go: one plate, protein first (tandoori, tikka, eggs, dal), then the rest.",
            "Skip liquid calories: soft drinks, shakes, sugary lassi.",
            "Log it honestly, even as a rough entry.",
            "Next meal back to normal. Never starve the next day to make up."
          ]),
          you(
            "one or two planned treats a week fit inside " +
              nf(P().kcal) +
              " kcal if the rest of the day is lean."
          )
        ];
      },
      chips: ["What should I eat next?", "I am craving something salty"]
    },
    {
      re: /crav|chips|namkeen|salty|snack(ing)?|munch|binge|can.?t stop eating/,
      wq: "",
      a: function () {
        return [
          "**Cravings are mostly hunger, habit or tiredness. Fix those first.**",
          bul([
            "Eat your afternoon snack on time: roasted chana, fruit, a handful of nuts. It stops most evening cravings.",
            "Swap: 25 g roasted makhana or home-popped popcorn in place of chips.",
            "If you want chips, have one ₹10 pack on a plate. Never eat from a big bag.",
            "Drink water and wait ten minutes. Short sleep makes cravings stronger the next day."
          ]),
          you("salty snacks are your weak spot, so keep them out of the house and buy single packs only.")
        ];
      },
      chips: ["What should I eat next?", "Can I have a cheat meal?"]
    },
    {
      re: /hungry|hunger|starving|not full|feel(ing)? empty|appetite/,
      wq: "",
      a: function () {
        return [
          "**Fill up on volume, not calories.**",
          bul([
            "Protein at every meal: it is the most filling nutrient.",
            "Add sabzi, salad, dal, chaas and fruit: lots of food for few calories.",
            "Drink water first. Thirst often feels like hunger.",
            "Sleep: short nights raise hunger the next day."
          ]),
          you(
            "check today's log before adding food. If you are well under " +
              nf(P().kcal) +
              " kcal, eat. Being hungry all day is a sign the gap is too big."
          )
        ];
      },
      chips: ["What should I eat next?", paceQ()]
    },
    {
      re: /alcohol|beer|whisky|whiskey|rum|vodka|drink(ing)? (tonight|alcohol)|\bwine\b|peg/,
      wq: "alcohol and health",
      h: 1,
      a: function () {
        return [
          "**Alcohol slows fat loss in three ways:** its own calories, worse sleep and recovery, and the snacks that come with it.",
          bul([
            "A 330 ml beer is about 140 kcal. A 30 ml peg is about 70 kcal, before the mixer.",
            "If you drink: cap it at one or two, log it, drink water alongside.",
            "Not the night before a heavy session.",
            "Less is better for health at any amount."
          ])
        ];
      },
      chips: ["Can I have a cheat meal?", "How do I sleep more?"]
    },
    {
      re: /smok|cigarette|vape|tobacco|gutka/,
      wq: "quitting smoking",
      h: 1,
      a: function () {
        return [
          "**Quitting is the single best thing you can do for your health and your lifting.** Smoking cuts oxygen delivery, slows recovery and healing, and weakens bones and tendons.",
          "Nicotine replacement (patch, gum or lozenge) raises the chance of quitting by about 50–60% in large reviews. A doctor can help you choose."
        ];
      },
      chips: []
    },
    {
      re: /diet (coke|soda|cola)|zero sugar|coke zero|soft drink|cold drink|artificial sweetener|sugar.?free/,
      wq: "diet soda",
      a: function () {
        return [
          "**Zero-sugar drinks are a fine swap.** They have about no calories, and approved sweeteners are considered safe at normal intakes.",
          bul([
            "A regular 300 ml soft drink is about 130 kcal of sugar.",
            "Water is still the main drink. Keep the fizzy one as a treat."
          ])
        ];
      },
      chips: ["How much water should I drink?"]
    },
    {
      re: /water|hydrat|dehydrat|thirst|electrolyte|\bors\b/,
      wq: "dehydration",
      h: 1,
      a: function () {
        var p = P(),
          d = Z.gd(Z.today());
        return [
          "**Aim for about " +
            r1(p.water / 1000) +
            " L a day,** more in hot weather or a sweaty session. European guidance puts adequate total water at about 2.5 L a day for men and 2.0 L for women, counting all drinks and the water in food.",
          bul([
            "500 ml on waking, a bottle through the gym, the rest across the day.",
            "Pale-yellow urine means you are fine. Dark means drink.",
            "Plain water is enough for a one-hour session. Chaas or nimbu pani with a pinch of salt helps on hot days."
          ]),
          you("today you have logged " + r1((d.water || 0) / 1000) + " L.")
        ];
      },
      chips: ["How do I sleep more?"]
    },
    {
      re: /sleep|insomnia|nap\b|wake up|waking|bedtime|tired all|rest more/,
      wq: "sleep hygiene",
      h: 1,
      a: function () {
        var sl = [],
          td = Z.today();
        for (var i = 0; i < 7; i++) {
          var x = Z.S.days[Z.addDays(td, -i)];
          if (x && x.sleep != null) sl.push(x.sleep);
        }
        var av = Z.avg(sl);
        var m = ME();
        return [
          "**Sleep is your biggest free gain.** In a small two-week diet study, people given 5.5 hours in bed lost less than half as much fat, and more muscle, than with 8.5 hours on the same food.",
          bul([
            "Fix the wake time first. Then move bedtime 30 minutes earlier each week.",
            "Dinner 2–3 hours before bed. Phone away an hour before bed. Room dark and cool.",
            "No caffeine in the 6–8 hours before bed.",
            "A 20-minute nap in the early afternoon helps on short nights."
          ]),
          you(
            (av != null ? "you are averaging " + r1(av) + " h of sleep. " : "") +
              "Your plan is bed at " +
              clockTxt(m.bed) +
              " and up at " +
              clockTxt(m.wake) +
              ": about " +
              r1(m.inBed) +
              " hours in bed." +
              (m.inBed < 7.5
                ? " Most people need 7.5 hours in bed to sleep 7, so try lights out 30 minutes earlier."
                : " That leaves room for seven hours of actual sleep.")
          )
        ];
      },
      acts: [{ l: "Daily timetable", a: "system", open: "tt" }],
      chips: ["Should I train today?", "Review my week"]
    },
    {
      re: /belly|stomach fat|tummy|love handle|spot reduc|lower abs fat|chest fat|man boob|gyno|face fat|thigh fat|arm fat|side fat|reduce fat from/,
      wq: "spot reduction",
      a: function (t) {
        return [
          "**You cannot burn fat from one chosen spot.** Fat comes off the whole body in an order set mostly by your genes, and the belly is usually last.",
          bul([
            "What works everywhere: the calorie gap, protein, lifting, steps, sleep.",
            "Ab exercises build the muscle underneath. They do not remove the fat on top.",
            "Track your waist every two weeks. It often shrinks before the mirror shows it."
          ]) +
            (/chest|boob|gyno/.test(t)
              ? "\nChest fat in men is usually just body fat and shrinks with the rest. A firm or tender lump under the nipple is different: show a doctor."
              : ""),
          you("stay on the weekly-average trend. At 0.4–0.7 kg a week the waist follows.")
        ];
      },
      chips: ["When will I reach my goal?", "How do I get visible abs?"]
    },
    {
      re: /six.?pack|visible abs|get abs|abs (show|visible)/,
      wq: "",
      a: function () {
        return [
          "**Abs show only at fairly low body fat.** Everyone has them; fat covers them.",
          bul([
            "Fat loss reveals them. Ab training makes them thicker so they show sooner.",
            "Two or three ab sessions a week is enough: plank, dead bug, Pallof press, cable crunch.",
            "Hundreds of crunches do not burn belly fat."
          ]),
          you(
            ME().days("core")
              ? "your plan trains abs and core on " +
                  ME().days("core") +
                  ". The rest is the calorie gap and patience."
              : "add 2 or 3 short ab sessions a week. The rest is the calorie gap and patience."
          )
        ];
      },
      chips: ["Can I lose belly fat first?", "When will I reach my goal?"]
    },
    {
      re: /(lose|burn|cut) fat (and|while|\+).*(build|gain|muscle)|(build|gain) muscle (and|while).*(los|fat|cut)|recomp|same time|bulk or cut|should i (bulk|cut)/,
      wq: "body recomposition",
      a: function () {
        return [
          "**Yes, you can lose fat and gain muscle together.** It works best for people who are new to proper training, or who have fat to lose.",
          bul([
            "Keep any calorie gap moderate, about 10–20% below maintenance.",
            "Protein high, every day.",
            "Progress the weights. Strength going up while weight goes down is the proof.",
            "Sleep is where the muscle is built."
          ]),
          (function () {
            var m = ME();
            return you(
              GK() === "lose" && m.gap
                ? "your plan is a cut of about " +
                    nf(m.gap) +
                    " kcal a day. Keep protein high and keep adding weight to the bar."
                : GK() === "gain"
                  ? "your plan is a small surplus. If your waist grows faster than your lifts, trim it."
                  : "your plan holds your weight, which suits recomposition: train hard, keep protein high, and judge by your waist and your lifts, not the scale."
            );
          })()
        ];
      },
      chips: ["How do I add weight safely?", "How much protein do I need?"]
    },
    {
      re: /weight (went|go|goes|jump|fluctuat|up|increase|gain)|gained (weight|\d)|scale (went|is|jump|up)|water (weight|retention)|bloat|fluctuat/,
      wq: "",
      a: function () {
        return [
          "**Daily weight is noise. The weekly average is the signal.**",
          bul([
            "A salty or carb-heavy dinner holds 0.5–2 kg of water by morning.",
            "Hard training, poor sleep, a late meal and constipation all push it up.",
            "To gain 1 kg of real fat you would need about 7,700 kcal above maintenance.",
            "Weigh at the same time daily and read the 7-day line in Stats."
          ])
        ];
      },
      acts: [{ l: "See the weight chart", a: "tab", tab: "stats" }],
      chips: [paceQ()]
    },
    {
      re: /progressive overload|add weight|increase (the )?weight|go heavier|lift heavier|when (should|to|do) i (increase|add)|get stronger|strength gain|not getting stronger/,
      wq: "progressive overload",
      a: function () {
        return [
          "**Do a little more over time, with the same clean form.**",
          bul([
            "Each exercise has a rep range, say 8–12. Start at the bottom.",
            "Add a rep when you can. When every set reaches the top, take the smallest weight step and drop back to the bottom.",
            "Progress over weeks, not every session. A repeat week is normal.",
            "Never add weight to a rep you had to cheat."
          ]),
          you("the grey hint under each exercise in Train does this maths from your last session.")
        ];
      },
      acts: [{ l: "Open training", a: "tab", tab: "train" }],
      chips: ["Should I train to failure?", "How long should I rest between sets?"]
    },
    {
      re: /how many (sets|reps)|sets and reps|rep range|high reps|low reps|light weight|heavy weight|volume/,
      wq: "strength training",
      a: function () {
        return [
          "**For muscle: 6–15 reps per set, 10–20 hard sets per muscle a week.**",
          bul([
            "Heavy and light both build muscle if the set ends 1–3 reps before failure.",
            "Moderate reps (8–12) are kinder to joints than very heavy sets.",
            "More sets is not better once quality drops."
          ]),
          you("your plan sits at 12–16 sets per muscle a week, in the middle of that range.")
        ];
      },
      chips: ["Should I train to failure?", "How do I add weight safely?"]
    },
    {
      re: /rest (between|time|period)|how long (should i|to) rest|rest timer/,
      wq: "",
      a: function () {
        return [
          "**Rest about 2 minutes on big presses, rows, squats and pulldowns (up to 3 for heavy strength sets), and 60–90 seconds on curls, raises and pushdowns.**",
          bul([
            "A 2024 review found rests longer than a minute built slightly more muscle; beyond about 90 seconds there was no further gain for size.",
            "Rest long enough that the next set is a good one. Very short rests just cost you reps."
          ]),
          you("the timer starts by itself when you tick a set, set to each exercise's rest.")
        ];
      },
      chips: ["Should I train to failure?"]
    },
    {
      re: /failure|last rep|reps in reserve|\brir\b|how hard|go all out/,
      wq: "training to failure",
      a: function () {
        return [
          "**Stop 1–3 reps before failure on most sets.** It builds almost as much muscle with much less joint and tendon stress.",
          bul([
            "Failure is fine on the last set of a machine or cable move.",
            "Never on bench press without a spotter.",
            "If form breaks, the set is over."
          ])
        ];
      },
      chips: ["How do I add weight safely?"]
    },
    {
      re: /doms|sore(ness)?( after| next| muscle| all)|muscle pain after|still sore|recover faster|recovery/,
      wq: "delayed onset muscle soreness",
      h: 1,
      a: function () {
        return [
          "**Soreness 24–72 hours after new or hard work is normal. It is not a score for the workout.**",
          bul([
            "Helps: light movement, sleep, protein, a warm shower.",
            "Training a sore muscle lightly is fine and often eases it.",
            "Not normal: sharp or pinching pain, pain in a joint, swelling, one side much worse. Stop and get it checked."
          ])
        ];
      },
      acts: [{ l: "Normal soreness or injury?", a: "atlas" }],
      chips: ["Should I train today?"]
    },
    {
      re: /warm.?up|stretch|mobility|cool.?down|foam roll/,
      wq: "warming up",
      a: function () {
        return [
          "**Warm up for 8–10 minutes, every session.**",
          bul([
            "5 minutes easy movement, then the day's drills.",
            "Ramp-up sets before the first lift: 50% × 10, then 75% × 5.",
            "Long static stretches go after training, not before heavy sets.",
            "Stretch what you trained for 20–30 seconds, without bouncing."
          ])
        ];
      },
      acts: [{ l: "Open training", a: "tab", tab: "train" }],
      chips: ["How do I avoid injuries?"]
    },
    {
      re: /deload|easy week|overtrain|burn.?out|plateau in (the )?gym|lifts? (stuck|stall)/,
      wq: "overtraining",
      a: function () {
        return [
          "**Take an easy week when lifts stall and joints ache. Many coaches plan one every 6–8 weeks; there is no fixed rule.**",
          bul([
            "Same exercises, about 60% of the sets, same or slightly lighter weights.",
            "Stalled lifts in a calorie deficit are common. Check sleep and protein before the programme.",
            "Holding strength while losing weight is a win."
          ])
        ];
      },
      chips: ["How do I sleep more?", "Review my week"]
    },
    {
      re: /cardio|treadmill|cycling|\bbike\b|hiit|steps|walk(ing)?|burn calories|fasted|\brun\b|running|jog|sprint|skipping rope|jump rope|stamina|endurance/,
      wq: "aerobic exercise",
      a: function () {
        var p = P();
        return [
          "**Walk every day, and push your heart twice a week.**",
          bul([
            "The World Health Organization advises 150–300 minutes of moderate activity a week for adults, on top of strength training.",
            nf(p.steps) + " steps a day is the base. It burns more across a week than any single workout.",
            (function () {
              var m = ME(),
                hard = m.fins(/sprint|feet|mix/),
                easy = m.fins(/steady|cardio|walk/);
              return hard.length || easy.length
                ? "Your plan has " +
                    [
                      hard.length ? "intervals on " + m.list(hard) : "",
                      easy.length ? "steady cardio or a walk on " + m.list(easy) : ""
                    ]
                      .filter(Boolean)
                      .join(", and ") +
                    "."
                : "Add two sessions a week that get you out of breath: brisk uphill walking, cycling, a sport.";
            })(),
            "New to running? Jog 1 minute, walk 2, eight times. Add a minute of jogging each week.",
            "Fasted cardio has no fat-loss edge when the day's calories are the same."
          ]),
          you(
            "build running slowly and wear proper shoes: tendons and joints take weeks to catch up with your lungs."
          )
        ];
      },
      chips: ["How do I become more active?", paceQ()]
    },
    {
      re: /home workout|at home|no gym|without gym|can.?t go to (the )?gym|gym (is )?closed|travel|bodyweight/,
      wq: "",
      a: function () {
        return [
          "**A full session at home, 3 rounds:**",
          bul([
            "Push-ups (hands on a bed if needed): 10–15",
            "Backpack row, one hand on a chair: 12 each side",
            "Bodyweight squats: 15",
            "Reverse lunges: 10 each leg",
            "Glute bridge: 15, pause at the top",
            "Plank: 30–40 seconds, then bicycle crunches: 12 each side"
          ]),
          "Finish with a 20–30 minute brisk walk or a jog."
        ];
      },
      chips: ["How do I become more active?"]
    },
    {
      re: /train legs|leg (day|workout|exercise)|legs with|quad (exercise|training)|skinny legs|leg muscles|squat|lunge|deadlift|leg press/,
      wq: "",
      a: function () {
        return [
          "**Legs are your biggest muscles, so leg training does the most work.**",
          bul([
            "Goblet squat, leg press, Romanian deadlift, hamstring curl, lunges, calf raises.",
            "First month: lighter than you think, full range, slow lowering. Add a little each week.",
            "Knees follow your toes on every rep. Heels stay down.",
            "Leg day burns the most energy of the week and builds the base that makes everything else easier."
          ]),
          you(
            (ME().days("quads") ? "your plan trains legs on " + ME().days("quads") + ". " : "") +
              "Expect two or three days of soreness after the first sessions. That is normal. Sharp pain in a joint is not: stop that exercise and get it checked."
          )
        ];
      },
      acts: [{ l: "Open training", a: "tab", tab: "train" }],
      chips: ["Normal soreness or injury?", "How do I add weight safely?"]
    },
    {
      re: /bigger (arms|biceps)|biceps? (size|bigger|grow|growth|peak)|arm size|grow (my )?(arms|biceps)|big arms|toned arms/,
      wq: "",
      a: function () {
        return [
          "**Arms grow from slow reps, a full stretch and patience.**",
          bul([
            (function () {
              var m = ME(),
                b = m.cov.biceps,
                t = m.cov.triceps;
              return b && t
                ? "Your plan gives biceps about " +
                    b.sets +
                    " sets a week" +
                    (b.days.length ? " (" + m.list(b.days) + ")" : "") +
                    " and triceps about " +
                    t.sets +
                    (t.days.length ? " (" + m.list(t.days) + ")" : "") +
                    ", counting half a set when they only help."
                : "Train biceps and triceps directly at least twice a week, 6–12 sets each.";
            })(),
            "Three seconds down on every curl. No swinging.",
            "Add a rep or the smallest weight step when all sets reach the top of the range.",
            "Arms look bigger as body fat drops, so the calorie gap matters as much as the curls."
          ])
        ];
      },
      acts: [{ l: "Open training", a: "tab", tab: "train" }],
      chips: ["How do I add weight safely?", "How do I get visible abs?"]
    },
    {
      re: /in shape|get fit|fitter|toned|lean body|look good|athletic|not (a )?body ?build/,
      wq: "",
      a: function () {
        var p = P();
        return [
          "**In shape means three things: less fat, some muscle, and a body that likes to move.**",
          bul([
            "Fat: the calorie gap. " + nf(p.kcal) + " kcal and " + p.protein + " g protein a day.",
            "Muscle: " +
              (ME().n ? ME().n + " sessions a week" : "three to five sessions a week") +
              ", the same lifts, a little more each week. You do not need a bodybuilder's volume.",
            "Movement: " +
              nf(p.steps) +
              " steps daily and something that gets you out of breath twice a week.",
            "Sleep seven hours. It decides how much of the weight you lose is fat."
          ]),
          you(
            ME().g
              ? "your plan counts the weekly sets for every muscle and adds cardio for this goal. Open My plan to see the table."
              : "run the setup so the plan is built around your own week."
          )
        ];
      },
      chips: ["When will I reach my goal?", "How do I become more active?"]
    },
    {
      re: /more active|be active|become active|sedentary|sitting all day|too lazy to (move|walk)|move more/,
      wq: "",
      a: function () {
        var p = P();
        return [
          "**Being active is a habit you build in small pieces, not a personality.**",
          bul([
            "Training days: use Start guided session and just follow the screen.",
            "Work: stand up every 45 minutes, take stairs, walk during phone calls.",
            "After lunch and dinner: a 10-minute walk. Those two alone are about 2,000–2,500 steps.",
            "Rest days: something you enjoy outdoors. Football, badminton, a long walk, a ride.",
            "Track steps daily. " + nf(p.steps) + " is the target, but beating last week is the real game."
          ])
        ];
      },
      chips: ["I feel lazy today", "Brief me for today"]
    },
    {
      re: /avoid injur|prevent injur|injury free|stay safe|train safely|long.?term|joints? (safe|health)|protect (my )?joints/,
      wq: "sports injuries",
      h: 1,
      a: function () {
        return [
          "**The rules that keep people lifting for decades:**",
          bul(
            D.RULES.slice(0, 7).map(function (r) {
              return r[0] + ". " + r[1];
            })
          )
        ];
      },
      acts: [{ l: "All 12 rules", a: "atlas" }],
      chips: ["Normal soreness or injury?", "Should I train to failure?"]
    },
    {
      re: /soreness or injury|is (this|it) (an )?injur|normal (pain|soreness)/,
      wq: "",
      a: function () {
        return [
          "**Normal, keep training:**",
          bul(D.PAIN.ok),
          "**Stop and get it checked:**",
          bul(D.PAIN.stop),
          D.PAIN.aid
        ];
      },
      acts: [{ l: "Muscle and injury guide", a: "atlas" }],
      chips: []
    },
    {
      re: /motivat|lazy|don.?t feel like|bored|give up|quit|no progress|demotivat|consisten|discipline|skip(ped)? (the )?gym/,
      wq: "",
      a: function () {
        var s = Z.streak();
        return [
          "**Do not wait to feel like it. Make starting small.**",
          bul([
            "Pack the gym bag at night. In the morning the only decision is to pick it up.",
            "Rule: do the warm-up and one exercise. You may leave after that. You almost never will.",
            "Missed a day? Carry on with the split tomorrow. Never double up.",
            "Judge by the weekly average and your logbook, not the mirror."
          ]),
          "Feeling lazy is normal. It is a feeling, not an instruction.",
          you(
            s >= 2
              ? "you are on a " + s + "-day streak. Protect it today."
              : "four goals today starts a streak. Start with the easiest two."
          )
        ];
      },
      chips: ["Brief me for today", "Review my week"]
    },
    {
      re: /height|taller|grow tall/,
      wq: "human height",
      a: function () {
        return [
          "**Height stops increasing once the growth plates close, usually in the late teens or early twenties.** After that, no exercise, food or supplement adds height.",
          "Posture does change how tall you stand: strong upper back, face pulls, and less slouching."
        ];
      },
      chips: []
    },
    {
      re: /testosterone|test booster|\bt level/,
      wq: "testosterone",
      h: 1,
      a: function () {
        return [
          "**Boosters do not work. The basics do.**",
          bul([
            "Sleep 7+ hours: short sleep lowers testosterone within a week.",
            "Losing excess body fat raises it.",
            "Lift, and do not cut dietary fat very low: in a review of six small studies, men on low-fat diets had about 10–15% lower testosterone. Fix vitamin D if a test shows it is low.",
            "Real symptoms need a blood test and a doctor, not a supplement."
          ])
        ];
      },
      chips: ["How do I sleep more?"]
    },
    {
      re: /posture|slouch|hunch|round(ed)? shoulder|desk|sitting all day/,
      wq: "poor posture",
      a: function () {
        return [
          "**Posture is strength plus habit.**",
          bul([
            "Pull as much as you push: rows, face pulls, reverse pec deck.",
            "Stand up every 30–45 minutes at work.",
            "Screen at eye level, feet flat, lower back supported.",
            "No single posture is perfect. Changing position often is what helps."
          ])
        ];
      },
      chips: []
    },
    {
      re: /budget|cost|expensive|rupee|₹|afford|grocery|groceries/,
      wq: "",
      a: function () {
        var b = budget();
        return [b.text];
      },
      acts: [{ l: "Monthly groceries", a: "system", open: "bud" }],
      chips: ["Cheap high-protein foods"]
    }
  ];
  // Answer from the knowledge base, with a web query for more.
  function kbAns(t) {
    for (var i = 0; i < KB.length; i++)
      if (KB[i].re.test(t)) {
        var e = KB[i];
        return {
          text: e.a(t).join("\n"),
          web: e.wq ? { q: e.wq, k: keys(t).concat(keys(e.wq)), h: e.h } : null,
          acts: e.acts || [],
          chips: e.chips || [],
          kb: 1
        };
      }
    return null;
  }

  /* ---------- router ---------- */
  var DEF_CHIPS = [
    "Brief me for today",
    "Review my week",
    "What should I eat next?",
    paceQ(),
    "What is my real calorie burn?",
    "Cheap high-protein foods",
    "Is creatine safe?",
    "How do I sleep more?",
    "Normal soreness or injury?"
  ];
  // Every answer that needs no network: safety first, then the log, then the knowledge base.
  function local(q, t) {
    // 1. anything that should not wait for a coach
    if (
      has(
        t,
        /chest pain|can.?t breathe|cannot breathe|short(ness)? of breath|faint|black(ed)? out|passed out|heart (attack|racing|pound)|coughing blood|blood in/
      )
    )
      return {
        text: "**Stop exercising now.** Chest pain, trouble breathing, fainting or a racing heart that does not settle needs a doctor today. If it is severe or does not ease with rest in a few minutes, call 112 or go to the nearest emergency room. Do not train again until you have been checked.",
        stop: 1
      };
    if (
      has(
        t,
        /kneecap (has |just )?(slipped|popped|came out|moved out|shifted|dislocated)|knee (has |just |is )?(gave way|given way|buckled|locked|dislocated|popped)|dislocated (it |my \w+ )?(again|today|yesterday|just)|heard a (pop|snap)|can.?t (put|bear) (any )?weight|can.?t (bend|straighten|walk)|swell\w* (up )?(fast|quick|quickly|suddenly|a lot)|swollen (a lot|badly|up)|severe pain|unbearable/
      )
    )
      return {
        text: "**Stop training and get this seen.** A joint that slips, locks, gives way, swells quickly or will not take weight needs an orthopaedic doctor, the same day if you can. Until then: rest it, support it, ice for 10–15 minutes if that eases it, and do not try to push it back or test it.\nI can guide training, but I cannot examine an injury.",
        stop: 1,
        acts: []
      };
    if (
      has(
        t,
        /starv|stop eating|not eat(ing)? (anything|at all|for)|skip(ping)? (all )?meals|purg|throw(ing)? up|vomit (after|to)|laxative|water fast|crash diet|lose \d+ ?(kg|kilo)s? in (a|one|1|2|two|3|three) (day|week)|(500|600|800|1000) ?k?cal(orie)?s? (a|per) day|very low calorie/
      )
    )
      return {
        text:
          "**I will not plan a crash diet.** Losing faster than about 1% of body weight a week takes muscle with the fat, wrecks gym strength, and the weight comes back.\nThe pace that keeps muscle is 0.4–0.7 kg a week, which is what your " +
          nf(P().kcal) +
          " kcal target is set for.\nIf eating feels out of control, or you feel driven to restrict or to make up for meals, please talk to a doctor. That is a health matter, not a willpower one.",
        stop: 1,
        chips: [paceQ(), "When will I reach my goal?"]
      };
    if (
      has(
        t,
        /steroid|sarm|anavar|dianabol|\bdbol\b|trenbolone|\btren\b|testosterone (inject|cycle|shot)|\bcycle\b.*(test|deca)|clenbuterol|\bclen\b|\bhgh\b|\bdnp\b|ostarine|injectable/
      )
    )
      return {
        text: "**Not something I will coach.** Anabolic steroids, SARMs and drugs like clenbuterol carry real risks: heart, liver, hormones, fertility and mood. Most of what is sold is also unregulated.\nIn your first years of training, food, sleep and steady progression give nearly all the progress there is to get. If something about hormones worries you, see a doctor and get a blood test.",
        stop: 1,
        chips: ["Can I lose fat and build muscle together?", "Is creatine safe?"]
      };
    // 2. small talk
    var short = q.split(" ").length <= 4;
    if (
      short &&
      has(t, /^ (hi|hello|hey|yo|hii+|namaste|good (morning|evening|afternoon|night)|sup|hola) /)
    ) {
      var b = brief();
      b.text = hello() + "\n" + b.text;
      return b;
    }
    if (
      short &&
      has(t, /^ (thanks|thank you|thank u|thx|great|nice|cool|ok|okay|got it|done|perfect|awesome) /)
    )
      return {
        text: "Anytime. Log today's numbers and I will have more to work with tomorrow.",
        chips: ["Brief me for today", "What should I eat next?"]
      };
    if (
      has(
        t,
        /who are you|what are you|your name|are you (a |an )?(ai|bot|robot|human|real|person|chatgpt|gpt|gemini)|who (made|built|created|developed) (you|this)|what can you do|how do you work|^ help /
      )
    )
      return {
        text:
          "**I am " +
          (Z.S.set.aname && Z.S.set.aname !== "Coach" ? Z.S.set.aname + ", the coach" : "the coach") +
          " built into " +
          D.APP.name +
          ",** made by " +
          D.APP.by +
          ".\nI answer from three places:\n" +
          bul([
            "Your own log on this phone: weight, food, training, sleep.",
            "The built-in training, nutrition and injury guide.",
            "Live web lookups when you are online: Wikipedia, MedlinePlus and Open Food Facts, with the source shown under the answer."
          ]) +
          "\nI am a training guide, not a doctor. For pain or a medical question, I will tell you when to see one.",
        chips: DEF_CHIPS.slice(0, 5)
      };
    // 3. food facts asked by name
    var fq = q.replace(
      /calories?|kcal|proteins?|carbs?|carbohydrates?|fibre|fiber|macros?|nutrition(al)?|nutrients?|values?|how (much|many)|healthy|content/g,
      " "
    );
    var fm =
      q.match(
        /(?:calories?|kcal|proteins?|carbs?|carbohydrates?|fibre|fiber|macros?|nutrition|nutrients?)\s+(?:are |is )?(?:there )?(?:in|of|for)\s+(.+?)\??$/
      ) ||
      q.match(/how (?:much|many) .*?\b(?:in|does|do)\s+(.+?)(?: have| contain| has|\?|$)/) ||
      q.match(/^(?:nutrition|macros|calories)\s+(?:in |of |for )?(.+?)\??$/);
    if (
      fm &&
      !/\b(i|my|me|we|you|day|daily|need|should|enough|body|diet|plan|belly|blood|week|gym|muscle|muscles|build|lose|gain)\b/.test(
        fm[1]
      )
    ) {
      var pm = Z.parseMeal(fm[1]);
      if (pm.items.length > 1) return mealAns(pm.items);
      if (pm.items.length) return foodAns(pm.items[0].f, pm.items[0].q);
      var nm = fm[1]
        .replace(/\b(a|an|the|one|some|plate|bowl|cup|glass|piece|pieces|of)\b/g, " ")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (nm.length >= 3 && /[a-z]{3}/.test(nm)) return { text: "", offq: nm };
    }
    // 3b. the log
    if (
      has(
        t,
        /recalculat|adaptive|real (calorie )?(burn|tdee)|actual (burn|tdee)|true (burn|tdee)|adjust (my )?(calorie|target)|(calorie )?target (still )?(right|correct|ok)|how much do i (really |actually )?burn/
      )
    )
      return adaptAns();
    if (has(t, /body ?fat|\bbf\b|fat (percent|%)|lean (body )?mass|how much fat do i/)) return bfAns();
    if (has(t, /yesterday/)) return yesterdayAns();
    if (has(t, /compare|(vs|versus|than|to) last week|last week (vs|versus)|week (on|over) week/))
      return compareAns();
    if (has(t, /badge|achievement|medal|trophy/)) return badgeAns();
    if (has(t, /remind|notification|alarm|alert me|nudge/))
      return {
        text: "**Reminders are in Menu → Reminders.**\nSwitch on the ones you want (weigh-in, meals, water, steps, wind-down) and set each time. Your phone shows them even when the app is closed.\nOn some phones you also need to allow notifications and turn off battery saving for ZENKAI, or the system delays them.",
        acts: [{ l: "Open reminders", a: "system", open: "rem" }],
        chips: []
      };
    if (has(t, /brief|plan (for )?today|what (should|do) i do (today|now)|today.?s plan|my day/))
      return brief();
    if (
      has(
        t,
        /review|how am i doing|my progress|last (7|seven|week)|this week|weekly|report|summary|how.?s it going/
      )
    )
      return review();
    if (
      has(
        t,
        /when will i|how long (will|until|to|till|before)|how many (weeks|months)|reach (my )?goal|goal weight/
      )
    )
      return eta();
    if (
      has(
        t,
        /right speed|too (fast|slow)|losing (weight )?(too )?(fast|slow)|gaining (weight )?(too )?(fast|slow)|not gaining|holding steady|weight (is )?steady|rate of|\bpace\b|plateau|stuck|not losing|weight (is |has )?(not|n.?t|stopped) (moving|going|changing|dropping)|stall|on track|weight (why )?not/
      ) &&
      !has(t, /lift|bench|curl|press|gym/)
    )
      return pace();
    if (
      has(
        t,
        /what (should |can |do |to )?i eat|what eat|eat (now|next|tonight|today)|for (dinner|lunch|breakfast|snack)|meal idea|dinner idea|rest of (the )?day|what to eat/
      )
    )
      return eatNow();
    if (has(t, /tomorrow/)) return tomorrow();
    if (
      has(
        t,
        /how (many|much) (calories|kcal|carbs|fat)|my (target|macros|calories|numbers)|\bmacros?\b|deficit|maintenance|tdee|bmr|calorie (target|goal|need|intake)/
      ) &&
      !has(t, / in | of .* (in|has)/)
    )
      return targets();
    if (
      has(
        t,
        /today.?s (workout|session|exercises?|training)|what.*(train|workout|exercise).*today|which muscle|my split|my routine|workout (plan|split)/
      )
    )
      return workout();
    if (
      has(
        t,
        /readiness|should i (train|go to (the )?gym|work ?out|lift|rest|go)( today| now| or rest| tomorrow)? $|too tired|exhausted|no energy|skip (the )?gym today|rest today|feeling weak|low energy/
      )
    )
      return ready();
    if (
      has(
        t,
        /fever|\bcold\b|cough|\bsick\b|\bill\b|\bflu\b|unwell|infection|loose motion|diarrh|headache|body ache/
      )
    )
      return {
        text:
          "**Rest when the illness is in your chest or whole body.**\n" +
          bul([
            "Fever, body ache, chest cough, stomach upset: no training until it clears, then one easy session first.",
            "Only a blocked or runny nose: a light session is fine if you feel up to it.",
            "Keep protein and fluids up. Eat at maintenance while ill; fat loss can wait a few days.",
            "See a doctor for a high fever, or one lasting more than three days."
          ]),
        web: { q: keys(q).slice(0, 2).join(" "), k: keys(q), h: 1 },
        chips: ["Should I train today?"]
      };
    // 4. the body
    var pain = has(t, PAINW),
      mus = findMuscle(t);
    if (has(t, /knee|kneecap|patella|\bacl\b|\bmcl\b|ligament|menisc/) && (pain || !findEx(t)))
      return jointAns("Knees", "knee injuries");
    if (pain && has(t, /elbow/)) return jointAns("Elbows", "elbow injuries");
    if (pain && has(t, /wrist/)) return jointAns("Wrists", "wrist injuries");
    if (pain && has(t, /shoulder/)) return jointAns("Shoulders", "shoulder injuries");
    if (pain && mus) return muscleAns(mus, true);
    var ex = findEx(t);
    if (ex) return exAns(ex, t);
    // 5. the guide, then foods by name
    var kb = kbAns(t);
    if (kb) return kb;
    var mi = microAns(t);
    if (mi) return mi;
    if (
      has(
        t,
        /can i (eat|have|drink)|should i (eat|have|drink)|is .* (healthy|good|bad|ok|okay|fine)|are .* (healthy|good|bad|ok|okay|fine)|how (healthy|bad|good) (is|are)/
      )
    ) {
      var f = Z.findFood(fq);
      if (f) return foodAns(f, 1);
    }
    if (mus) return muscleAns(mus, false);
    if (pain)
      return {
        text:
          "**Tell me where it hurts** (shoulder, elbow, lower back, knee…) and I can be specific. Until then:\n**Normal:** " +
          D.PAIN.ok.slice(0, 2).map(low1).join("; ") +
          ".\n**Stop and get it checked:** " +
          D.PAIN.stop.slice(0, 4).map(low1).join("; ") +
          ".\n" +
          D.PAIN.aid,
        web: { q: keys(q).slice(0, 3).join(" "), k: keys(q), h: 1 },
        acts: [{ l: "Muscle and injury guide", a: "atlas" }],
        chips: ["My shoulder hurts on bench press", "My lower back is sore"]
      };
    return null;
  }

  // q: the question as typed. stage(text) reports progress. Resolves to { text, src, chips, acts }.
  async function ask(raw, stage) {
    stage = stage || function () {};
    var q = fixWords(lc(raw).replace(/\s+/g, " ").trim()),
      t =
        " " +
        q
          .replace(/[^a-z0-9₹.%'\- ]/g, " ")
          .replace(/\s+/g, " ")
          .trim() +
        " ";
    var online = canWeb(),
      a,
      w;
    // "tell me more" continues the last web answer
    if (
      /^ ((tell|give|show) me )?(some )?(more|details?|elaborate|explain( more| that| it)?|go on|continue|and|why|how so)( about (it|that|this))? ?\?* $/.test(
        t
      ) &&
      (last.more.length || last.topic)
    ) {
      if (last.more.length) {
        var m = last.more.splice(0, 3);
        return { text: bul(m), src: last.src, chips: last.more.length ? ["Tell me more"] : [], acts: [] };
      }
      if (!online)
        return {
          text: "I would need the internet to dig further into that. Connect and ask again.",
          chips: [],
          acts: []
        };
      stage("Searching the web…");
      w = await web({ q: last.topic, k: keys(last.topic), h: 0 }, 4);
      if (w.lines.length) {
        last.more = w.more;
        last.src = w.src;
        return { text: bul(w.lines), src: w.src, chips: w.more.length ? ["Tell me more"] : [], acts: [] };
      }
      return { text: "That is all I could find on it.", chips: [], acts: [] };
    }
    stage("Checking your log…");
    netFail = false;
    a = local(q, t);
    last = { topic: "", more: [], src: [] };
    if (a && a.stop) return fin(a);
    if (a && a.offq != null) {
      // a food the built-in table does not have
      var why = ", and you are offline, so I cannot look it up.";
      if (online) {
        stage("Searching the food database…");
        try {
          var fo = await foodOnline(a.offq);
          if (fo) return fin(fo);
          why = ", and the online database had no match.";
        } catch (e) {
          why = ", and I could not reach the online database just now.";
        }
      }
      return fin({
        text:
          "**I do not have “" +
          a.offq +
          "” in the food table" +
          why +
          "**\nAdd it once as a custom food from the pack label and it stays in your list.",
        acts: [{ l: "Open the food log", a: "tab", tab: "food" }],
        chips: []
      });
    }
    if (a) {
      if (a.web && online) {
        stage("Searching the web…");
        try {
          w = await web(a.web, 2);
          if (w.lines.length) {
            a.text += "\n\n**From the web**\n" + bul(w.lines);
            a.src = w.src;
            last = { topic: a.web.q, more: w.more, src: w.src };
            if (w.more.length) a.chips = ["Tell me more"].concat(a.chips || []);
          }
        } catch (e) {
          /* the built-in answer stands */
        }
      } else if (a.web) last.topic = a.web.q;
      return fin(a);
    }
    // nothing built in: answer from the web
    var qk = keys(q),
      wq = qk.slice(0, 6).join(" ");
    if (!wq)
      return fin({
        text: "Ask me about your training, food, weight trend, sleep or an injury worry. A few to start with:",
        chips: DEF_CHIPS.slice(0, 6)
      });
    var gl = {
      l: "Search the web for this",
      href: "https://www.google.com/search?q=" + encodeURIComponent(raw)
    };
    if (!online)
      return fin({
        text:
          "**That is outside my built-in guide, and " +
          (Z.Net.blocked
            ? "web lookup is not available in this preview. It works in the Android app."
            : Z.S.set.web === false
              ? "web lookup is switched off."
              : "you are offline.") +
          "**\nWith a connection I can look it up. Offline, I can still answer about your log, exercises, food, muscles and injuries.",
        chips: DEF_CHIPS.slice(0, 4),
        acts: [gl]
      });
    stage("Searching the web…");
    var health = has(
      t,
      /health|disease|symptom|medicine|tablet|doctor|blood|sugar|diabet|pressure|cholesterol|thyroid|skin|hair|acne|stomach|digest|constipat|acidity|gas|heart|liver|kidney|bone|joint|muscle|vitamin|deficien|allerg|asthma|infection|hormone|stress|anxiety|headache|migraine|cramp|injur|pain/
    );
    try {
      w = await web({ q: wq, k: qk, h: 1 }, 4);
    } catch (e) {
      w = { lines: [], more: [], src: [] };
    }
    if (!w.lines.length)
      return fin({
        text: netFail
          ? "**I could not reach the web just now.** Check the connection and ask again. Questions about your log, exercises, food and injuries still work offline."
          : "**I could not find a solid answer to that.** Try asking it another way, with the main word first (for example “creatine side effects”).",
        chips: DEF_CHIPS.slice(0, 4),
        acts: [gl]
      });
    last = { topic: wq, more: w.more, src: w.src };
    if (
      w.src.some(function (x) {
        return x.t.indexOf("MedlinePlus") === 0;
      })
    )
      health = true;
    return fin({
      text:
        "**Here is what I found:**\n" +
        bul(w.lines) +
        (health
          ? "\nGeneral information, not a diagnosis. For anything that worries you, see a doctor."
          : ""),
      src: w.src,
      chips: (w.more.length ? ["Tell me more"] : []).concat(["Brief me for today"]),
      acts: [gl]
    });
  }
  // Tidy an answer before it is shown.
  function fin(a) {
    return {
      text: String(a.text || "").trim(),
      src: a.src || [],
      chips: (a.chips || []).slice(0, 4),
      acts: a.acts || []
    };
  }

  return {
    ask: ask,
    chips: DEF_CHIPS,
    canWeb: canWeb,
    fix: fixWords,
    _t: { keys: keys, rank: rank, sentences: sentences, local: local, findEx: findEx, findMuscle: findMuscle }
  };
})();
