/**
 * Coach check: sets up three very different people (losing, gaining as a vegan without soya,
 * holding weight as an advanced lifter), adds three weeks of weigh-ins, then asks the coach
 * a list of everyday questions. Answers must exist, contain no broken values, and follow each
 * person's own goal, diet and routine.
 *
 * Run: node tests/coach-check.js
 */
const W = require("path").join(__dirname, "../app/src/main/assets/www/js/");
const store = {};
global.window = { ZENKAI_NO_WEB: true };
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => {
    store[k] = v;
  },
  removeItem: (k) => {
    delete store[k];
  }
};
global.navigator = { onLine: false };
global.document = { addEventListener() {} };
["data", "learn", "plan", "core", "coach"].forEach((f) => require(W + f + ".js"));
const Z = window.SZ,
  C = window.SZCoach;
let n = 0,
  bad = 0;
const ck = (name, ok, info) => {
  n++;
  if (!ok) {
    bad++;
    console.log("FAIL", name, "->", String(info).slice(0, 260));
  }
};
const QS = [
  "brief me for today",
  "what should i eat next",
  "review my week",
  "am i on track",
  "when will i reach my goal",
  "what are my targets",
  "what is on today's workout",
  "what about tomorrow",
  "should i train today",
  "how much protein do i need",
  "how was yesterday",
  "what is my body fat",
  "is my plan too expensive",
  "cheap high protein foods",
  "i am craving something salty",
  "can i lose fat and build muscle together",
  "what is my real calorie burn",
  "how many badges do i have",
  "compare this week with last week",
  "how do i sleep more"
];
const people = {
  lose: {
    name: "Arjun",
    sex: "m",
    age: 34,
    h: 178,
    w: 96,
    goal: "lose",
    goalW: 82,
    pace: "mid",
    act: "sed",
    exp: "mid",
    place: "gym",
    days: ["mon", "tue", "thu", "fri"],
    mins: 60,
    style: "ul",
    focus: [],
    limits: [],
    diet: "nonveg",
    meals: 4,
    avoid: [],
    wake: "06:30",
    bed: "23:00",
    wt: "19:00",
    health: []
  },
  gain: {
    name: "Sana",
    sex: "f",
    age: 24,
    h: 165,
    w: 50,
    goal: "gain",
    goalW: 56,
    pace: "mid",
    act: "light",
    exp: "new",
    place: "db",
    days: ["mon", "wed", "fri"],
    mins: 45,
    style: "auto",
    focus: ["glutes"],
    limits: [],
    diet: "vegan",
    meals: 5,
    avoid: ["soy"],
    wake: "07:00",
    bed: "23:30",
    wt: "18:00",
    health: []
  },
  hold: {
    name: "Dev",
    sex: "m",
    age: 41,
    h: 172,
    w: 70,
    goal: "strong",
    pace: "mid",
    act: "mod",
    exp: "adv",
    place: "gym",
    days: ["tue", "thu", "sat", "sun"],
    mins: 75,
    style: "full",
    focus: [],
    limits: ["back"],
    diet: "veg",
    meals: 3,
    avoid: [],
    wake: "05:30",
    bed: "22:00",
    wt: "06:00",
    health: []
  }
};
(async () => {
  for (const key of Object.keys(people)) {
    Z.resetAll();
    Z.setup(people[key]);
    // three weeks of weigh-ins moving the way the goal wants
    const step = key === "lose" ? -0.09 : key === "gain" ? 0.035 : 0.0;
    for (let i = 21; i >= 1; i--) {
      const d = Z.md(Z.addDays(Z.today(), -i));
      d.w = Math.round((people[key].w - step * 21 + step * (21 - i)) * 10) / 10;
      d.sleep = 7;
      d.steps = 8000;
    }
    Z.touchCore();
    let all = "";
    for (const q of QS) {
      let r;
      try {
        r = await C.ask(q, 0);
      } catch (e) {
        ck(key + ": no crash on '" + q + "'", false, e.stack);
        continue;
      }
      const text = (r && r.text) || "";
      all += "\n## " + q + "\n" + text + " " + JSON.stringify(r.chips || []);
      ck(
        key + ": answer to '" + q + "'",
        text.length > 40 && !/undefined|NaN|\[object|null kg/.test(text),
        text
      );
    }
    ck(
      key + ": no leftovers from the built-in plan",
      !/5:00 alarm|In the gym by 5:30|lights out by 10\.|₹5,100|4:30 snack|boil eggs, soak soya|oats, milk and eggs/.test(
        all
      ),
      (all.match(
        /.{40}(5:00 alarm|5:30|lights out by 10\b|₹5,100|4:30 snack|Sunday|oats, milk and eggs).{40}/
      ) || [""])[0]
    );
    const pace = (await C.ask("am i on track", 0)).text,
      eta = (await C.ask("when will i reach my goal", 0)).text,
      tg = (await C.ask("what are my targets", 0)).text,
      tm = (await C.ask("what about tomorrow", 0)).text;
    if (key === "lose") {
      ck("lose: pace is judged as loss", /on pace|Too fast|Stalled/.test(pace), pace);
      ck("lose: time to goal counts down to 82", /to 82 kg/.test(eta), eta);
      ck("lose: targets explain the gap", /leaves a gap/.test(tg), tg);
      ck("lose: chips ask about losing", all.includes("Am I losing at the right speed?"));
    }
    if (key === "gain") {
      ck("gain: pace is judged as gain", /\+0\.|Gaining fast|Not gaining/.test(pace), pace);
      ck("gain: time to goal counts up to 56", /to 56 kg/.test(eta), eta);
      ck("gain: targets explain the surplus", /over, which is what muscle is built from/.test(tg), tg);
      ck(
        "gain: chips ask about gaining",
        all.includes("Am I gaining at the right speed?") && !all.includes("Am I losing")
      );
      ck(
        "gain: vegan without soya is never told to eat eggs, chicken, soya or curd",
        !/egg whites|chicken breast|soya chunks,|low-fat curd/.test(
          (await C.ask("what should i eat next", 0)).text
        ),
        (await C.ask("what should i eat next", 0)).text
      );
    }
    if (key === "hold") {
      ck("hold: pace is judged as steady", /Steady at|Drifting/.test(pace), pace);
      ck("hold: no finish line on the scale", /no finish line/.test(eta), eta);
      ck("hold: chips ask about holding", all.includes("Is my weight holding steady?"));
    }
    ck(
      key + ": tomorrow uses this person's own clock",
      tm.includes(Z.P.t12(people[key].wake)) || /rest day/.test(tm),
      tm
    );
  }
  console.log(n + " coach checks, " + bad + " failed");
})();
