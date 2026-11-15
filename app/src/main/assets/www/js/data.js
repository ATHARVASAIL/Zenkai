/**
 * ZENKAI — static data
 *
 * Everything the app knows before the user types anything:
 *   - PLANS / PLAN_INFO   the two ready-made weekly plans
 *   - EX                  70 exercise guides (sets, reps, rest, form steps, mistakes, alternatives)
 *   - FIN, WARM, COOL     finishers, warm-up drills and cool-down stretches
 *   - FOODS, ALIAS        148 Indian foods with search aliases (values per serving)
 *   - MEALS, IDEAS        the default day of eating and quick protein ideas
 *   - MICROS, BUDGET      vitamins and minerals table, monthly grocery estimate
 *   - VID                 one form-video id per exercise
 *   - SOURCES             the guidelines and studies behind the numbers, with links
 *
 * Food values are estimates from standard food tables, not lab measurements.
 *
 * Author: Atharva Sail
 */
window.SZD = (function () {
  "use strict";

  var PLATE = {
    mon: "#ef5350",
    tue: "#4c8dff",
    wed: "#f2b705",
    thu: "#2fbf71",
    fri: "#f07a32",
    sat: "#e9ecee",
    sun: "#8fa0ad"
  };
  var DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  // Two plans. "shape" is the default: fat loss, general fitness, arms and abs twice a week, conditioning.
  // "split" is the classic one-muscle-a-day routine. Each day: warm-up, lifts, a timed finisher, a cool-down.
  var PLANS = {
    shape: {
      mon: {
        name: "Monday",
        focus: "Push",
        muscles: ["chest", "delts", "triceps", "abs"],
        fin: "abs",
        cool: ["chest", "shoulder", "triceps", "child"],
        note: "Chest, shoulders and triceps in one session. Presses first while you are fresh, the smaller muscles after.",
        warm: [
          "Band pull-aparts, 15 more",
          "Push-ups on a bench, 8 slow",
          "Empty-bar bench press, 12 easy reps"
        ],
        ex: ["bench", "incdb", "sdp", "lat", "rp"]
      },
      tue: {
        name: "Tuesday",
        focus: "Pull",
        muscles: ["lats", "midback", "rdelts", "biceps"],
        fin: "sprint",
        cool: ["upperback", "biceps", "cat", "child"],
        note: "Back and biceps. Pulldowns for width, rows for thickness, then two curls for the arms.",
        warm: ["Shoulder-blade pulldowns, 12 light", "Band rows, 15", "Dead hang, 2 × 15 seconds"],
        ex: ["lpd", "scr", "fp", "ez", "hm"]
      },
      wed: {
        name: "Wednesday",
        focus: "Legs",
        muscles: ["quads", "glutes", "hams", "calves"],
        fin: "core",
        cool: ["quad", "hamstring", "hipflexor", "glute", "calf"],
        note: "Legs burn the most energy of any session. Start every lift lighter than you think and add weight week by week.",
        warm: [
          "Bodyweight squats, 12 slow",
          "Glute bridges, 12",
          "Leg swings, 10 each leg",
          "One light set of goblet squats"
        ],
        ex: ["gsq", "lpr", "rdl", "hc", "lng", "cr"]
      },
      thu: {
        name: "Thursday",
        focus: "Arms + Abs",
        muscles: ["biceps", "triceps", "abs", "obliques", "forearms"],
        fin: "carry",
        cool: ["biceps", "triceps", "shoulder", "cat"],
        note: "The two things you want most. Slow reps and a full stretch grow arms; abs are built here and revealed by the calorie gap.",
        warm: [
          "Wrist circles, 10 each way",
          "Light curls, 15",
          "Light pushdowns, 15",
          "Dead bugs, 5 each side"
        ],
        ex: ["idc", "pc", "oce", "rgp", "scc", "hlr", "rtw"]
      },
      fri: {
        name: "Friday",
        focus: "Full Body",
        muscles: ["chest", "lats", "quads", "glutes", "abs"],
        fin: "mix",
        cool: ["chest", "hamstring", "hipflexor", "child"],
        note: "An athletic day: big movements, short rests, heart rate up. This is the session that makes you fitter, not just stronger.",
        warm: [
          "Bodyweight squats, 12",
          "Push-ups on a bench, 8",
          "Dead hang, 2 × 15 seconds",
          "Hip hinges with no weight, 10"
        ],
        ex: ["pu", "chin", "gsq", "kbs", "pl"]
      },
      sat: {
        name: "Saturday",
        focus: "Active Day",
        muscles: ["abs", "obliques"],
        fin: "cardio",
        cool: ["hamstring", "hipflexor", "calf", "child"],
        note: "Get outside if you can: a long brisk walk, a jog, a bike ride, football, badminton, a swim. Then ten minutes of abs.",
        warm: ["Leg swings, 10 each leg", "Easy pace for the first 5 minutes"],
        ex: ["cru", "bic", "spl"]
      },
      sun: {
        name: "Sunday",
        focus: "Rest",
        muscles: [],
        note: "Full rest. Easy walk, meal prep, extra sleep. Your body gets fitter while it recovers.",
        warm: [],
        ex: [],
        cool: []
      }
    },
    split: {
      mon: {
        name: "Monday",
        focus: "Chest",
        muscles: ["chest", "delts", "triceps"],
        fin: "abs",
        cool: ["chest", "shoulder", "triceps", "child"],
        note: "Incline pressing builds the upper chest; flat pressing builds the whole chest. Front shoulders and triceps help in every press.",
        warm: ["Band pull-aparts, 15 more", "Push-ups on a bench, 8 slow", "Light pec deck, 15 easy reps"],
        ex: ["bench", "incdb", "mcp", "pec"]
      },
      tue: {
        name: "Tuesday",
        focus: "Back",
        muscles: ["lats", "traps", "midback", "lowback", "biceps"],
        fin: "sprint",
        cool: ["upperback", "biceps", "cat", "child"],
        note: "Lats give width and the V-shape. Traps and rhomboids give thickness. Pulldowns build width, rows build thickness.",
        warm: ["Shoulder-blade pulldowns, 12 light", "Band rows, 15", "Dead hang, 2 × 15 seconds"],
        ex: ["lpd", "scr", "csr", "sap"]
      },
      wed: {
        name: "Wednesday",
        focus: "Shoulders",
        muscles: ["delts", "rdelts", "traps"],
        fin: "core",
        cool: ["shoulder", "upperback", "chest", "child"],
        note: "Side delts make shoulders wider (lateral raises). Rear delts fix posture (reverse pec deck, face pulls).",
        warm: ["Band external rotations, 12 each arm", "Light lateral raise, 15", "Light face pull, 15"],
        ex: ["sdp", "lat", "rpd", "fp"]
      },
      thu: {
        name: "Thursday",
        focus: "Legs",
        muscles: ["quads", "glutes", "hams", "calves"],
        fin: "walk",
        cool: ["quad", "hamstring", "hipflexor", "glute", "calf"],
        note: "Start every lift lighter than you think and add weight week by week. Legs respond to patience.",
        warm: [
          "Bodyweight squats, 12 slow",
          "Glute bridges, 12",
          "Leg swings, 10 each leg",
          "One light set of goblet squats"
        ],
        ex: ["gsq", "lpr", "rdl", "hc", "lext", "cr"]
      },
      fri: {
        name: "Friday",
        focus: "Biceps",
        muscles: ["biceps", "forearms"],
        fin: "carry",
        cool: ["biceps", "shoulder", "cat"],
        note: "A short day. Slow reps and a full stretch grow biceps; swinging heavy weights does not.",
        warm: ["Wrist circles, 10 each way", "Light dumbbell curls, 15", "Band curls, 15"],
        ex: ["ez", "idc", "pc", "hm"]
      },
      sat: {
        name: "Saturday",
        focus: "Triceps + Abs",
        muscles: ["triceps", "abs", "obliques"],
        fin: "sprint",
        cool: ["triceps", "shoulder", "cat", "child"],
        note: "Ab training makes the core strong. It does not burn belly fat by itself; the calorie gap and daily steps do that.",
        warm: ["Light rope pushdowns, 15", "Slow dead bugs, 5 each side", "Wrist circles, 10 each way"],
        ex: ["rp", "oce", "rgp", "sace", "pl", "db", "pp", "scc"]
      },
      sun: {
        name: "Sunday",
        focus: "Rest",
        muscles: [],
        note: "Full rest. Easy walk, meal prep, extra sleep. Your body gets fitter while it recovers.",
        warm: [],
        ex: [],
        cool: []
      }
    }
  };
  var PLAN_INFO = [
    [
      "shape",
      "Shape",
      "Push, pull, legs, arms + abs, full body, active day. Best for losing fat, getting fitter and building arms and abs."
    ],
    ["split", "Classic split", "One muscle group a day: chest, back, shoulders, legs, biceps, triceps + abs."]
  ];
  var SPLIT = PLANS.shape;

  // Timed finishers: rounds of [label, seconds]. The guided session runs the clock.
  var FIN = {
    abs: {
      n: "Abs circuit",
      text: "Three rounds, moving straight from one to the next.",
      rounds: 3,
      steps: [
        ["Plank", 30],
        ["Crunches", 30],
        ["Mountain climbers", 30],
        ["Rest", 30]
      ]
    },
    core: {
      n: "Core circuit",
      text: "Three rounds. Keep your hips still on the side planks.",
      rounds: 3,
      steps: [
        ["Side plank, left", 25],
        ["Side plank, right", 25],
        ["Bicycle crunch", 30],
        ["Rest", 30]
      ]
    },
    sprint: {
      n: "Bike or rower sprints",
      text: "Hard enough that you could not hold a conversation, then easy pedalling.",
      rounds: 8,
      steps: [
        ["Go hard", 30],
        ["Easy", 30]
      ]
    },
    carry: {
      n: "Farmer's carry",
      text: "Two heavy dumbbells, stand tall, walk. Builds grip, posture and a hard midsection.",
      rounds: 6,
      steps: [
        ["Carry", 30],
        ["Rest", 30]
      ]
    },
    mix: {
      n: "Conditioning mix",
      text: "Four rounds. Keep moving; slow down before you stop.",
      rounds: 4,
      steps: [
        ["Skipping rope or fast march", 40],
        ["Push-ups", 20],
        ["Bodyweight squats", 30],
        ["Rest", 30]
      ]
    },
    feet: {
      n: "Fast feet",
      text: "On the spot: high knees or a fast march as quick as you can, then walk it off. No equipment needed.",
      rounds: 8,
      steps: [
        ["Go hard", 30],
        ["Easy", 30]
      ]
    },
    walk: {
      n: "Incline walk",
      text: "Brisk pace, slight incline. You should be breathing hard but able to talk.",
      rounds: 1,
      steps: [["Brisk incline walk", 600]]
    },
    steady: {
      n: "Steady cardio, 15 min",
      text: "Bike, cross-trainer, brisk incline walk or a jog at a pace where you can still talk. The easiest way to add fat-burning minutes.",
      rounds: 1,
      steps: [["Steady pace", 900]]
    },
    cardio20: {
      n: "Steady cardio, 20 min",
      text: "A brisk walk, jog, cycle or swim at a pace you can hold. Start easy and build.",
      rounds: 1,
      steps: [["Keep moving", 1200]]
    },
    cardio: {
      n: "Steady cardio",
      text: "Thirty minutes at a pace you can hold: brisk walk, jog, cycle, a sport or a swim. Start easy and build.",
      rounds: 1,
      steps: [["Keep moving", 1800]]
    }
  };
  // Cool-down stretches: [name, how, seconds, photo, each side]
  var COOL = {
    chest: [
      "Chest stretch",
      "Hands behind your head or on a doorframe, open the elbows and lift the chest.",
      30,
      "Behind_Head_Chest_Stretch",
      0
    ],
    shoulder: [
      "Shoulder stretch",
      "Pull one straight arm across your chest with the other hand.",
      25,
      "Shoulder_Stretch",
      1
    ],
    triceps: [
      "Triceps stretch",
      "Elbow up beside your head, hand down your back, ease the elbow back.",
      25,
      "Triceps_Stretch",
      1
    ],
    biceps: [
      "Biceps stretch",
      "Arms straight behind you, palms down, lift gently and open the chest.",
      30,
      "Standing_Biceps_Stretch",
      0
    ],
    upperback: [
      "Upper-back stretch",
      "Clasp your hands in front, round the upper back and push the hands away.",
      30,
      "Upper_Back_Stretch",
      0
    ],
    cat: [
      "Cat stretch",
      "On hands and knees, round the back up slowly, then let it sink.",
      40,
      "Cat_Stretch",
      0
    ],
    child: [
      "Child's pose",
      "Sit back on your heels, arms long in front, forehead down. Breathe slowly.",
      45,
      "Childs_Pose",
      0
    ],
    quad: [
      "Thigh stretch",
      "Standing, hold one ankle behind you and bring the heel toward your seat.",
      25,
      "Quad_Stretch",
      1
    ],
    hamstring: [
      "Hamstring stretch",
      "Sit with legs straight and reach toward your toes with a long back.",
      40,
      "Seated_Floor_Hamstring_Stretch",
      0
    ],
    hipflexor: [
      "Hip-flexor stretch",
      "Half-kneel, tuck the hips under and shift forward until the front of the hip opens.",
      25,
      "Kneeling_Hip_Flexor",
      1
    ],
    glute: [
      "Glute stretch",
      "On your back, cross one ankle over the other knee and pull the legs in.",
      25,
      "Lying_Glute",
      1
    ],
    calf: [
      "Calf stretch",
      "Hands on a wall, one leg back with the heel down, lean in.",
      25,
      "Calf_Stretch_Hands_Against_Wall",
      1
    ]
  };

  // General warm-up, every session: [name, how, photo, seconds]
  var WARM = [
    ["Easy cardio", "Treadmill walk building to a light jog, or the bike", "Jogging_Treadmill", 180],
    ["Arm circles", "10 forward, 10 backward", "Arm_Circles", 30],
    ["Shoulder rolls", "10 slow rolls", "Shoulder_Circles", 25],
    ["Torso rotations", "10 each side, feet planted, turning from the upper back", null, 30],
    ["Band pull-aparts", "15 reps, arms straight at chest height", "Band_Pull_Apart", 35],
    ["Hip circles", "8 each way", "Standing_Hip_Circles", 30],
    ["Bodyweight squats", "10 slow reps, sitting back and down", "Bodyweight_Squat", 40]
  ];

  // Marks an exercise entry; kept as a single place to add defaults to every exercise later.
  function X(o) {
    return o;
  }
  var EX = {
    bench: X({
      n: "Flat bench press",
      t: "Whole chest, front shoulders, triceps",
      img: "Barbell_Bench_Press_-_Medium_Grip",
      sets: 3,
      lo: 8,
      hi: 10,
      rest: 120,
      start:
        "Lie on a flat bench with your eyes under the bar. Feet flat on the floor. Grip a little wider than shoulder width.",
      posture:
        "Squeeze shoulder blades back and down into the bench. Keep a small natural arch in the lower back. Head and hips stay on the bench.",
      steps: [
        "Lift the bar off the rack with straight arms over your shoulders.",
        "Lower it slowly (2–3 sec) to your lower chest. Elbows about 45–60° from your body, not flared straight out.",
        "Touch the chest lightly. No bounce.",
        "Press up and slightly back until arms are straight over the shoulders."
      ],
      breath: "Big breath in at the top. Hold while lowering. Breathe out as you push past the hardest part.",
      mistakes: [
        "Bouncing the bar off the chest",
        "Lifting hips off the bench",
        "Elbows flared at 90°",
        "Wrists bent far back",
        "Going heavy alone with no spotter or safety bars"
      ],
      alt: "Dumbbell bench press (safer when alone), Smith machine press, machine chest press",
      q: "barbell bench press"
    }),
    incdb: X({
      n: "Incline dumbbell press",
      t: "Upper chest, front shoulders",
      img: "Incline_Dumbbell_Press",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 90,
      start: "Set the bench to about 30°. Sit with the dumbbells resting on your thighs.",
      posture: "Back and head on the pad. Shoulder blades pulled back. Feet flat.",
      steps: [
        "Bring the dumbbells to your shoulders while seated, then lie back carefully.",
        "Press up over your upper chest until arms are nearly straight.",
        "Lower slowly to the sides of your upper chest, elbows about 45°.",
        "Feel a stretch in the chest, then press again."
      ],
      breath: "In as you lower, out as you press.",
      mistakes: [
        "Bench too steep (becomes a shoulder press)",
        "Dumbbells drifting far apart at the top",
        "Arching the back off the bench",
        "Dropping the weights fast"
      ],
      alt: "Incline machine press, incline Smith press, low-to-high cable fly",
      q: "incline dumbbell press"
    }),
    mcp: X({
      n: "Machine chest press",
      t: "Middle chest, triceps",
      img: "Machine_Bench_Press",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 90,
      start: "Adjust the seat so the handles line up with your mid-chest. Feet flat.",
      posture:
        "Back and head against the pad. Shoulder blades squeezed back and down. Chest slightly lifted.",
      steps: [
        "Grip the handles a little wider than your shoulders.",
        "Push forward until arms are almost straight. Do not lock the elbows hard.",
        "Pause one second.",
        "Return slowly (2–3 sec) until you feel a chest stretch."
      ],
      breath: "Out as you push, in as you return.",
      mistakes: [
        "Seat too high or low",
        "Shoulders rolling forward at the end",
        "Letting the stack slam",
        "Short half-range reps"
      ],
      alt: "Push-ups with hands on a bench, dumbbell floor press, Smith flat press",
      q: "machine chest press"
    }),
    pec: X({
      n: "Pec deck fly",
      t: "Inner and middle chest",
      img: "Butterfly",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      start: "Seat height so the handles are at chest level. Slight bend in the elbows.",
      posture: "Back flat on the pad, chest up, shoulders down away from the ears.",
      steps: [
        "Bring the handles together in a wide arc in front of your chest.",
        "Squeeze the chest for one second.",
        "Open slowly until you feel a stretch. Stop when hands are in line with the shoulders."
      ],
      breath: "Out as you squeeze in, in as you open.",
      mistakes: ["Too heavy, so it turns into a press", "Stretching too far back", "Jerky, fast reps"],
      alt: "Cable chest fly (standing, staggered stance), flat dumbbell fly",
      q: "pec deck fly"
    }),

    lpd: X({
      n: "Lat pulldown",
      t: "Lats (width), teres major, biceps",
      img: "Wide-Grip_Lat_Pulldown",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 90,
      start: "Sit and set the thigh pad snug. Grip the bar a little wider than shoulders, palms facing away.",
      posture: "Sit tall, chest up, lean back only 10–15°.",
      steps: [
        "First pull your shoulders down, away from the ears.",
        "Drive the elbows down and back; bar to the upper chest.",
        "Squeeze the back for a second.",
        "Let the bar rise slowly until arms are straight and the lats stretch."
      ],
      breath: "Out as you pull down, in as the bar goes up.",
      mistakes: [
        "Pulling behind the neck",
        "Leaning far back and swinging",
        "Pulling only with the arms",
        "Shrugging the shoulders up"
      ],
      alt: "Neutral-grip pulldown, assisted pull-up machine, single-arm cable pulldown",
      q: "lat pulldown"
    }),
    scr: X({
      n: "Seated cable row",
      t: "Middle back (rhomboids, traps), lats",
      img: "Seated_Cable_Rows",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 90,
      start: "Sit with feet on the platform, hold the V-handle, knees softly bent.",
      posture: "Tall chest, flat back, torso almost upright.",
      steps: [
        "Pull the handle to your belly button, elbows close to the body.",
        "Squeeze the shoulder blades together for one second.",
        "Straighten the arms slowly; let the shoulder blades move forward without rounding the lower back."
      ],
      breath: "Out as you pull, in as you return.",
      mistakes: [
        "Rocking the body back and forth",
        "Rounding the lower back",
        "Shrugging",
        "Pulling high with flared elbows"
      ],
      alt: "Machine row, chest-supported row",
      q: "seated cable row"
    }),
    csr: X({
      n: "Chest-supported dumbbell row",
      t: "Upper and middle back, rear shoulders",
      img: "Dumbbell_Incline_Row",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 90,
      start:
        "Lie face down on a bench set to 30–45° with a dumbbell in each hand, or use a chest-supported row machine.",
      posture: "Chest stays on the pad the whole time. Neck in line with the spine; look down.",
      steps: [
        "Let your arms hang straight.",
        "Row the elbows back towards your hips.",
        "Squeeze the back for one second.",
        "Lower slowly to a full stretch."
      ],
      breath: "Out as you row, in as you lower.",
      mistakes: ["Lifting the chest off the pad", "Jerking the weight", "Shrugging instead of rowing"],
      alt: "One-arm dumbbell row with one hand on a bench and both feet on the floor",
      q: "chest supported dumbbell row"
    }),
    sap: X({
      n: "Straight-arm pulldown",
      t: "Lats",
      img: "Straight-Arm_Pulldown",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      start: "Rope or straight bar on the high cable. Step back, hold it at eye level with straight arms.",
      posture: "Hinge forward about 30° at the hips. Soft knees. Flat back. Elbows slightly bent and fixed.",
      steps: [
        "Pull the bar down in an arc to your thighs, using the back, not the arms.",
        "Squeeze for one second.",
        "Return slowly to eye level."
      ],
      breath: "Out as you pull down, in as you return.",
      mistakes: ["Bending the elbows (becomes a triceps pushdown)", "Swinging the body", "Going too heavy"],
      alt: "Machine pullover, single-arm cable lat pull",
      q: "straight arm pulldown"
    }),

    sdp: X({
      n: "Seated dumbbell shoulder press",
      t: "Front and side delts, triceps",
      img: "Dumbbell_Shoulder_Press",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 105,
      start: "Bench upright (80–90°). Back on the pad, dumbbells at shoulder height, palms forward.",
      posture: "Back on the pad, chest up, core tight. Elbows slightly in front of the body.",
      steps: [
        "Press up until arms are nearly straight overhead.",
        "Do not bang the dumbbells together.",
        "Lower slowly to about chin or ear level.",
        "Press again."
      ],
      breath: "Out as you press, in as you lower.",
      mistakes: [
        "Arching the lower back off the pad",
        "Lowering too fast or too deep",
        "Elbows flared straight out to the sides"
      ],
      alt: "Machine shoulder press, neutral-grip dumbbell press if shoulders feel pinched",
      q: "seated dumbbell shoulder press"
    }),
    lat: X({
      n: "Dumbbell lateral raise",
      t: "Side delts (width)",
      img: "Side_Lateral_Raise",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      start: "Stand tall or sit, dumbbells at your sides, palms facing in.",
      posture: "Slight forward lean, small bend in the elbows, shoulders down.",
      steps: [
        "Raise the arms out to the sides, leading with the elbows.",
        "Stop when the hands reach shoulder height.",
        "Pause one second.",
        "Lower over 2–3 seconds."
      ],
      breath: "Out as you raise, in as you lower.",
      mistakes: ["Too heavy, so you swing", "Shrugging the traps up", "Lifting above shoulder height"],
      alt: "Cable lateral raise, machine lateral raise, seated lateral raise",
      q: "dumbbell lateral raise"
    }),
    rpd: X({
      n: "Reverse pec deck",
      t: "Rear delts, upper back",
      img: "Reverse_Machine_Flyes",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      start: "Sit facing the pad. Handles at shoulder height. Arms nearly straight.",
      posture: "Chest on the pad, neck neutral, shoulders down.",
      steps: [
        "Open the arms out and back in a wide arc until they are in line with your body.",
        "Squeeze the back of the shoulders.",
        "Return slowly."
      ],
      breath: "Out as you open, in as you return.",
      mistakes: ["Squeezing the shoulder blades hard (becomes a traps move)", "Too heavy", "Jerky reps"],
      alt: "Chest-supported dumbbell reverse fly, cable rear-delt fly",
      q: "reverse pec deck rear delt"
    }),
    fp: X({
      n: "Face pull",
      t: "Rear delts, rotator cuff, upper back",
      img: "Face_Pull",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      start: "Cable at face height with a rope. Step back until arms are straight.",
      posture: "Staggered stance, soft knees, stand tall, ribs down.",
      steps: [
        "Pull the rope towards your face, splitting the ends apart.",
        "Hands finish beside the ears, elbows high.",
        "Rotate so the knuckles point back; squeeze one second.",
        "Return slowly."
      ],
      breath: "Out as you pull, in as you return.",
      mistakes: [
        "Pulling down to the chest",
        "Leaning back to move the weight",
        "Elbows dropping low",
        "Too heavy"
      ],
      alt: "Band pull-apart, reverse pec deck",
      q: "cable face pull"
    }),

    gb: X({
      n: "Glute bridge",
      t: "Glutes, hamstrings",
      img: "Butt_Lift_Bridge",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      bw: true,
      start:
        "Lie on your back on a mat. Knees bent, feet flat and hip-width, heels about a foot from the hips.",
      posture: "Ribs down, chin slightly tucked, knees pointing the same way as the toes.",
      steps: [
        "Squeeze the glutes and push through the heels.",
        "Lift the hips until knees, hips and shoulders form a straight line.",
        "Hold two seconds at the top.",
        "Lower slowly."
      ],
      breath: "Out as you lift, in as you lower.",
      mistakes: ["Arching the lower back at the top", "Pushing through the toes", "Knees falling in or out"],
      alt: "Hip thrust with the upper back on a bench; later, hold a dumbbell on the hips",
      q: "glute bridge"
    }),
    hc: X({
      n: "Seated hamstring curl",
      t: "Hamstrings",
      img: "Seated_Leg_Curl",
      sets: 3,
      lo: 10,
      hi: 15,
      rest: 75,
      start:
        "Line your knee joint up with the machine's pivot. Lower pad just above the heels. Thigh pad snug.",
      posture: "Sit back against the pad, hold the handles, hips down.",
      steps: [
        "Curl the heels down and back under the seat.",
        "Squeeze the hamstrings for one second.",
        "Return slowly. Stop just before the knee is fully straight; never let the weight slam."
      ],
      breath: "Out as you curl, in as you return.",
      mistakes: ["Knee not lined up with the pivot", "Lifting the hips", "Heavy, jerky reps"],
      alt: "Lying hamstring curl, Romanian deadlift",
      q: "seated leg curl"
    }),
    cr: X({
      n: "Seated calf raise",
      t: "Calves",
      img: "Seated_Calf_Raise",
      sets: 3,
      lo: 12,
      hi: 20,
      rest: 60,
      start: "Balls of the feet on the platform, pad resting on the lower thighs.",
      posture: "Sit tall, feet straight ahead.",
      steps: [
        "Lower the heels for a deep stretch.",
        "Push up onto the toes as high as you can.",
        "Hold 1–2 seconds at the top.",
        "Lower over 2–3 seconds."
      ],
      breath: "Out as you push up, in as you lower.",
      mistakes: ["Bouncing at the bottom", "Short range", "Rushing"],
      alt: "Standing calf raise holding a rail, knees straight but not locked",
      q: "seated calf raise"
    }),
    ha: X({
      n: "Hip abduction machine",
      t: "Glute medius (side of hip)",
      img: "Thigh_Abductor",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      start: "Sit back in the machine with the pads on the outside of your thighs.",
      posture: "Back against the pad, hold the handles, feet on the rests.",
      steps: [
        "Push the legs apart as far as is comfortable.",
        "Hold one second.",
        "Return slowly without letting the stack touch."
      ],
      breath: "Out as you push apart, in as you return.",
      mistakes: ["Leaning forward and rocking", "Fast, bouncing reps", "Too heavy"],
      alt: "Side-lying leg raise on a mat (top leg straight, lift to 30–40°), small banded side steps",
      q: "hip abduction machine"
    }),

    ez: X({
      n: "EZ-bar curl",
      t: "Biceps (both heads)",
      img: "EZ-Bar_Curl",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 90,
      start: "Stand tall, feet hip-width, knees soft. Hold the EZ bar on the angled part, arms straight.",
      posture: "Elbows by your sides, chest up, core tight.",
      steps: [
        "Curl the bar up by bending only at the elbows.",
        "Squeeze at the top; elbows stay mostly still.",
        "Lower over 2–3 seconds until the arms are fully straight."
      ],
      breath: "Out as you curl, in as you lower.",
      mistakes: ["Swinging the back or hips", "Elbows moving forward", "Half reps", "Bending the wrists"],
      alt: "Straight-bar cable curl, dumbbell curl",
      q: "ez bar curl"
    }),
    idc: X({
      n: "Incline dumbbell curl",
      t: "Biceps long head (the peak)",
      img: "Incline_Dumbbell_Curl",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 75,
      start: "Bench at 45–60°. Sit back with dumbbells hanging straight down, palms forward.",
      posture: "Back and head on the pad. Shoulders back. Upper arms stay behind the body line.",
      steps: [
        "Curl up without moving the upper arms forward.",
        "Squeeze at the top.",
        "Lower slowly to a full stretch."
      ],
      breath: "Out as you curl, in as you lower.",
      mistakes: ["Too heavy", "Shoulders rolling forward", "Bench too low"],
      alt: "Cable curl facing away from the machine, standing dumbbell curl",
      q: "incline dumbbell curl"
    }),
    pc: X({
      n: "Preacher curl",
      t: "Biceps short head",
      img: "Preacher_Curl",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 75,
      start: "Seat height so the armpits rest at the top of the pad. Upper arms flat on the pad.",
      posture: "Sit tall, chest close to the pad.",
      steps: [
        "Curl up until the forearms are nearly vertical.",
        "Squeeze.",
        "Lower slowly until the arms are almost straight. Control the bottom; never drop."
      ],
      breath: "Out as you curl, in as you lower.",
      mistakes: [
        "Lifting off the seat",
        "Dropping fast at the bottom (stresses the biceps tendon)",
        "Too heavy"
      ],
      alt: "Machine preacher curl, single-arm dumbbell preacher curl",
      q: "preacher curl"
    }),
    hm: X({
      n: "Hammer curl",
      t: "Brachialis, forearm (thicker arms)",
      img: "Hammer_Curls",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 60,
      start: "Stand with dumbbells at your sides, palms facing the body.",
      posture: "Tall, soft knees, elbows by your sides.",
      steps: ["Curl up keeping palms facing in the whole time.", "Squeeze at the top.", "Lower slowly."],
      breath: "Out as you curl, in as you lower.",
      mistakes: ["Swinging", "Elbows drifting forward", "Rushing the lowering"],
      alt: "Rope cable hammer curl, cross-body hammer curl",
      q: "dumbbell hammer curl"
    }),

    rp: X({
      n: "Rope pushdown",
      t: "Triceps (outer head)",
      img: "Triceps_Pushdown_-_Rope_Attachment",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 75,
      start: "Rope on the high cable. Stand close, elbows bent about 90°.",
      posture: "Soft knees, slight forward lean, elbows pinned to your sides.",
      steps: [
        "Push the rope down until the arms are straight.",
        "Spread the rope ends apart at the bottom and squeeze.",
        "Return slowly to about 90° at the elbow."
      ],
      breath: "Out as you push, in as you return.",
      mistakes: ["Elbows moving forward or flaring", "Leaning over the rope", "Shrugging"],
      alt: "Straight-bar or V-bar pushdown",
      q: "tricep rope pushdown"
    }),
    oce: X({
      n: "Overhead cable extension",
      t: "Triceps long head (biggest part)",
      img: "Cable_Rope_Overhead_Triceps_Extension",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 75,
      start: "Rope on a low or mid pulley. Turn away from the machine and bring the rope over your head.",
      posture:
        "Staggered stance, soft knees, slight forward lean, elbows pointing forward close to the head.",
      steps: [
        "Straighten the arms forward and up.",
        "Squeeze at the end.",
        "Bend the elbows slowly to feel a stretch behind the head."
      ],
      breath: "Out as you extend, in as you return.",
      mistakes: ["Elbows flaring wide", "Arching the lower back", "Moving the upper arms"],
      alt: "Seated two-hand dumbbell overhead extension",
      q: "overhead cable tricep extension"
    }),
    rgp: X({
      n: "Reverse-grip pushdown",
      t: "Triceps (inner head)",
      img: "Reverse_Grip_Triceps_Pushdown",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      start: "Straight bar on the high cable. Grip shoulder width, palms facing up.",
      posture: "Elbows pinned, soft knees, wrists straight.",
      steps: [
        "Push the bar down until the arms are straight.",
        "Keep the wrists straight.",
        "Return slowly."
      ],
      breath: "Out as you push, in as you return.",
      mistakes: ["Bending the wrists", "Going too heavy (this move needs lighter weight)"],
      alt: "Single-arm reverse-grip pushdown",
      q: "reverse grip tricep pushdown"
    }),
    sace: X({
      n: "Single-arm cable extension",
      t: "Triceps, each arm separately",
      img: "Cable_One_Arm_Tricep_Extension",
      sets: 2,
      lo: 12,
      hi: 15,
      rest: 50,
      each: "arm",
      start: "D-handle on the high cable. Hold it in one hand, elbow bent, upper arm by your side.",
      posture: "Stand side-on, soft knees, other hand on your waist.",
      steps: ["Push down until the arm is straight.", "Squeeze.", "Return slowly. Switch arms."],
      breath: "Out as you push, in as you return.",
      mistakes: ["Elbow moving forward", "Twisting the body"],
      alt: "Single-arm dumbbell kickback with a hand on a bench",
      q: "single arm cable tricep extension"
    }),
    pl: X({
      n: "Forearm plank",
      t: "Deep core, abs",
      img: "Plank",
      flip: true,
      sets: 3,
      lo: 20,
      hi: 40,
      unit: "sec",
      rest: 45,
      bw: true,
      start: "Forearms on a mat, elbows under shoulders, legs straight back, on your toes.",
      posture: "Straight line from head to heels. Squeeze glutes, brace the stomach.",
      steps: ["Hold the position.", "Keep hips level; not sagging, not high.", "Add 5 seconds each week."],
      breath: "Breathe slowly and normally. Do not hold your breath.",
      mistakes: ["Hips sagging", "Hips piked up", "Looking up and straining the neck"],
      alt: "High plank with hands on a bench, side plank",
      q: "forearm plank"
    }),
    db: X({
      n: "Dead bug",
      t: "Deep core, lower abs",
      img: "Dead_Bug",
      sets: 3,
      lo: 8,
      hi: 10,
      rest: 45,
      bw: true,
      each: "side",
      start: "Lie on your back, arms straight up, hips and knees bent at 90°.",
      posture: "Press the lower back gently into the floor and keep it there.",
      steps: [
        "Slowly lower the opposite arm and leg towards the floor.",
        "Keep the lower back flat.",
        "Return and switch sides."
      ],
      breath: "Breathe out as the arm and leg go out.",
      mistakes: ["Lower back lifting off the floor", "Rushing"],
      alt: "Heel taps (only the legs move)",
      q: "dead bug exercise"
    }),
    pp: X({
      n: "Pallof press",
      t: "Core anti-rotation, obliques",
      img: "Pallof_Press",
      sets: 3,
      lo: 8,
      hi: 10,
      rest: 45,
      each: "side",
      start:
        "Cable at chest height with a D-handle. Stand side-on to the machine, handle held at your chest with both hands.",
      posture: "Feet shoulder-width, knees soft, hips and shoulders square to the front.",
      steps: [
        "Press the handle straight out in front of your chest.",
        "Hold two seconds; do not let the cable twist you.",
        "Bring it back to the chest. Finish the reps, then face the other way."
      ],
      breath: "Out as you press, in as you return.",
      mistakes: ["Letting the hips or shoulders rotate", "Standing too close (no tension)", "Too heavy"],
      alt: "Bird dog on a thick mat, or side plank",
      q: "pallof press"
    }),
    scc: X({
      n: "Standing cable crunch",
      t: "Upper abs",
      img: "Standing_Rope_Crunch",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      start: "Face away from or towards the high cable with a rope. Hold the rope ends beside your head.",
      posture: "Feet hip-width, soft knees, hips stay still.",
      steps: [
        "Crunch the ribs down towards the hips, rounding the spine.",
        "Squeeze the abs for one second.",
        "Return slowly to standing tall."
      ],
      breath: "Breathe out hard as you crunch.",
      mistakes: ["Pulling with the arms", "Bending at the hips instead of the spine", "Too heavy"],
      alt: "Lying crunch on a mat, machine crunch",
      q: "standing cable crunch"
    }),
    gsq: X({
      n: "Goblet squat",
      t: "Thighs, glutes, core",
      img: "Goblet_Squat",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 90,
      start:
        "Hold one dumbbell upright against your chest with both hands. Feet a little wider than your hips, toes turned out slightly.",
      posture: "Chest up, elbows tucked under the weight, whole foot on the floor.",
      steps: [
        "Brace your stomach, then sit back and down between your hips.",
        "Go as low as you can while your heels stay down and your back stays straight.",
        "Push the floor away and stand tall, squeezing your glutes."
      ],
      breath: "In on the way down, out as you stand.",
      mistakes: [
        "Knees collapsing inward",
        "Heels lifting",
        "Rounding the lower back at the bottom",
        "Dropping fast and bouncing"
      ],
      alt: "Bodyweight squat to a bench, leg press, barbell squat once a heavy dumbbell feels easy",
      q: "goblet squat"
    }),
    lpr: X({
      n: "Leg press",
      t: "Thighs, glutes",
      img: "Leg_Press",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 90,
      start:
        "Sit with your back and hips flat on the pad. Feet shoulder-width in the middle of the platform.",
      posture: "Lower back stays on the pad the whole time. Knees track over your toes.",
      steps: [
        "Press the platform up and release the safety handles.",
        "Lower under control until your knees are bent to about 90°.",
        "Push back up through the whole foot. Stop just short of locking the knees."
      ],
      breath: "In as the weight comes down, out as you push.",
      mistakes: [
        "Hips rolling off the pad at the bottom",
        "Locking the knees hard at the top",
        "Hands pushing on the knees",
        "Half reps with too much weight"
      ],
      alt: "Goblet squat, hack squat, Smith-machine squat",
      q: "leg press"
    }),
    rdl: X({
      n: "Romanian deadlift",
      t: "Hamstrings, glutes, lower back",
      img: "Romanian_Deadlift",
      sets: 3,
      lo: 8,
      hi: 10,
      rest: 120,
      start:
        "Stand tall holding a barbell or two dumbbells in front of your thighs. Feet hip-width, knees soft.",
      posture: "Back flat, shoulders pulled back, weight close to your legs.",
      steps: [
        "Push your hips straight back and let the weight slide down your thighs.",
        "Stop when you feel a strong stretch in the hamstrings, usually just below the knees.",
        "Drive the hips forward to stand up. Do not lean back at the top."
      ],
      breath: "In as you hinge down, out as you stand.",
      mistakes: [
        "Rounding the back",
        "Bending the knees so much it becomes a squat",
        "Letting the weight drift away from the legs",
        "Going lower than your hamstrings allow"
      ],
      alt: "Dumbbell Romanian deadlift, cable pull-through, 45° back extension",
      q: "romanian deadlift"
    }),
    lng: X({
      n: "Dumbbell lunge",
      t: "Thighs, glutes, balance",
      img: "Dumbbell_Lunges",
      sets: 2,
      lo: 8,
      hi: 10,
      rest: 75,
      each: true,
      start: "Stand tall with a dumbbell in each hand, or none while you learn it.",
      posture: "Torso upright, eyes forward, front foot flat.",
      steps: [
        "Take a long step forward.",
        "Lower straight down until both knees are bent to about 90°. The back knee stops just above the floor.",
        "Push through the front heel to step back. Do all reps on one side, then switch."
      ],
      breath: "In as you lower, out as you push back.",
      mistakes: [
        "Front knee caving inward",
        "A short step so the front heel lifts",
        "Leaning far forward",
        "Dropping the back knee onto the floor"
      ],
      alt: "Split squat holding a rail, reverse lunge, step-up on a low bench",
      q: "dumbbell lunge"
    }),
    lext: X({
      n: "Leg extension",
      t: "Front of the thighs",
      img: "Leg_Extensions",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      start:
        "Sit with your back on the pad and the roller on your lower shins. Line your knees up with the machine's pivot.",
      posture: "Hips down in the seat, hands on the handles.",
      steps: [
        "Straighten your legs smoothly until they are nearly locked.",
        "Squeeze the thighs for one second.",
        "Lower slowly, about three seconds."
      ],
      breath: "Out as you lift, in as you lower.",
      mistakes: [
        "Kicking the weight up",
        "Hips lifting off the seat",
        "Dropping the weight",
        "Going too heavy to pause at the top"
      ],
      alt: "Slow goblet squat, split squat",
      q: "leg extension machine"
    }),
    pu: X({
      n: "Push-up",
      t: "Chest, shoulders, triceps, core",
      img: "Pushups",
      sets: 3,
      lo: 8,
      hi: 15,
      rest: 75,
      bw: true,
      start: "Hands just wider than your shoulders, feet together, body in one straight line.",
      posture: "Glutes and stomach tight. Elbows about 45° from your sides.",
      steps: [
        "Lower your chest to a fist's height above the floor.",
        "Push the floor away until your arms are straight.",
        "Too hard? Put your hands on a bench. Too easy? Take three seconds to lower."
      ],
      breath: "In going down, out pushing up.",
      mistakes: ["Hips sagging", "Elbows flared straight out", "Half reps", "Head dropping forward"],
      alt: "Push-up with hands on a bench, knee push-up, machine chest press",
      q: "push up"
    }),
    chin: X({
      n: "Chin-up",
      t: "Lats, biceps, grip",
      img: "Chin-Up",
      sets: 3,
      lo: 5,
      hi: 10,
      rest: 120,
      bw: true,
      start:
        "Grip the bar with palms facing you, hands shoulder-width. Use the assisted machine or a band until you can do five clean reps.",
      posture: "Hang with arms straight and shoulders pulled down away from your ears.",
      steps: [
        "Pull your elbows down to your ribs until your chin clears the bar.",
        "Pause for a moment at the top.",
        "Lower all the way under control, about three seconds."
      ],
      breath: "Out as you pull up, in as you lower.",
      mistakes: [
        "Kicking or swinging",
        "Half reps that never reach a full hang",
        "Shrugging the shoulders up",
        "Dropping fast"
      ],
      alt: "Assisted chin-up machine, band-assisted chin-up, lat pulldown with palms facing you",
      q: "chin up"
    }),
    kbs: X({
      n: "Kettlebell swing",
      t: "Glutes, hamstrings, heart and lungs",
      img: "One-Arm_Kettlebell_Swings",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 75,
      start:
        "Feet shoulder-width, the kettlebell a step in front of you. Use both hands. No kettlebell? Hold one dumbbell by its head.",
      posture: "Flat back, soft knees. This is a hip hinge, not a squat.",
      steps: [
        "Hike the bell back between your legs.",
        "Snap your hips forward so the bell floats up to chest height. The arms only guide it.",
        "Let it fall, hinge, and go straight into the next rep."
      ],
      breath: "A sharp breath out at the top of each swing.",
      mistakes: [
        "Lifting with the arms and shoulders",
        "Squatting instead of hinging",
        "Rounding the back",
        "Leaning back at the top"
      ],
      alt: "Dumbbell swing, cable pull-through, fast step-ups",
      q: "kettlebell swing"
    }),
    hlr: X({
      n: "Hanging knee raise",
      t: "Lower abs, hip flexors, grip",
      img: "Hanging_Leg_Raise",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 60,
      bw: true,
      start: "Hang from a bar with a shoulder-width grip, or rest your forearms in the captain's chair.",
      posture: "Shoulders active, legs together, no swinging.",
      steps: [
        "Curl your knees up toward your chest, rolling your hips up at the top.",
        "Pause for a second.",
        "Lower slowly until your legs are straight. Straight-leg raises come later."
      ],
      breath: "Out as the knees come up, in as they lower.",
      mistakes: [
        "Swinging for momentum",
        "Lifting the thighs without curling the hips",
        "Dropping the legs",
        "Holding your breath"
      ],
      alt: "Lying leg raise on a bench, reverse crunch, captain's-chair knee raise",
      q: "hanging knee raise"
    }),
    cru: X({
      n: "Crunch",
      t: "Upper abs",
      img: "Crunches",
      sets: 3,
      lo: 12,
      hi: 20,
      rest: 45,
      bw: true,
      start: "Lie on your back with knees bent and feet flat. Fingertips by your temples.",
      posture: "Lower back stays on the floor. Chin off your chest.",
      steps: [
        "Curl your ribs toward your hips until your shoulder blades leave the floor.",
        "Squeeze for one second.",
        "Lower slowly without resting your head between reps."
      ],
      breath: "Out as you curl up, in as you lower.",
      mistakes: [
        "Pulling on the neck",
        "Sitting all the way up with the hip flexors",
        "Rushing",
        "Feet lifting"
      ],
      alt: "Cable crunch, machine crunch, dead bug",
      q: "crunches"
    }),
    bic: X({
      n: "Bicycle crunch",
      t: "Abs and obliques",
      img: "Air_Bike",
      sets: 3,
      lo: 10,
      hi: 15,
      rest: 45,
      bw: true,
      each: true,
      start: "Lie on your back, hands by your temples, knees up at 90°.",
      posture: "Lower back pressed into the floor.",
      steps: [
        "Bring one knee in while turning the opposite shoulder toward it.",
        "Straighten the other leg just above the floor.",
        "Switch sides smoothly, like pedalling slowly."
      ],
      breath: "Breathe out on every twist.",
      mistakes: [
        "Pedalling fast with no twist",
        "Pulling the head with the hands",
        "Lower back arching",
        "Elbows flapping instead of the shoulders turning"
      ],
      alt: "Russian twist, dead bug, Pallof press",
      q: "bicycle crunch"
    }),
    rtw: X({
      n: "Russian twist",
      t: "Obliques, abs",
      img: "Russian_Twist",
      sets: 3,
      lo: 10,
      hi: 15,
      rest: 45,
      each: true,
      start:
        "Sit with knees bent and heels on the floor. Lean back until your abs switch on. Hold a plate or dumbbell at your chest.",
      posture: "Back straight, chest lifted.",
      steps: [
        "Turn your shoulders to one side and touch the weight down beside your hip.",
        "Turn to the other side under control.",
        "Lift the feet only when it is easy with them down."
      ],
      breath: "Out on each turn.",
      mistakes: ["Rounding the back", "Moving only the arms", "Rushing", "Going too heavy"],
      alt: "Bicycle crunch, Pallof press, cable woodchop",
      q: "russian twist"
    }),
    spl: X({
      n: "Side plank",
      t: "Obliques, hips, shoulders",
      img: "Side_Bridge",
      sets: 2,
      lo: 20,
      hi: 40,
      rest: 45,
      bw: true,
      each: true,
      unit: "sec",
      start: "Lie on your side with your elbow under your shoulder and feet stacked.",
      posture: "One straight line from head to heels. Hips forward, not folded.",
      steps: [
        "Lift your hips until your body is straight.",
        "Hold, breathing normally.",
        "Lower with control and switch sides."
      ],
      breath: "Slow steady breaths. Do not hold your breath.",
      mistakes: [
        "Hips sagging",
        "Rolling the chest toward the floor",
        "Elbow far from under the shoulder",
        "Holding the breath"
      ],
      alt: "Side plank from the knees, Pallof press, suitcase carry",
      q: "side plank"
    }),
    fwk: X({
      n: "Farmer's carry",
      t: "Grip, traps, core, posture",
      img: "Farmers_Walk",
      sets: 3,
      lo: 30,
      hi: 40,
      rest: 60,
      unit: "sec",
      start: "Stand between two heavy dumbbells. Hinge down with a flat back and pick them up.",
      posture: "Stand tall: shoulders back, ribs down, eyes forward.",
      steps: [
        "Walk with short, quick steps.",
        "Keep the weights still at your sides.",
        "Set them down with a flat back when your grip is nearly gone."
      ],
      breath: "Short steady breaths.",
      mistakes: [
        "Leaning or shrugging",
        "Long swaying steps",
        "Rounding the back to pick up or put down",
        "Going so heavy that posture breaks"
      ],
      alt: "Suitcase carry with one dumbbell, dead hang, plate pinch hold",
      q: "farmers walk"
    }),
    bsq: X({
      n: "Barbell back squat",
      t: "Thighs, glutes, lower back, core",
      img: "Barbell_Squat",
      sets: 3,
      lo: 5,
      hi: 8,
      rest: 150,
      start:
        "Set the bar in the rack at upper-chest height with the safety bars just below your lowest point. Step under so the bar rests on your upper back, not your neck. Feet a little wider than your hips.",
      posture: "Chest up, back flat, whole foot on the floor. Knees travel in line with your toes.",
      steps: [
        "Stand up with the bar and take two small steps back.",
        "Take a big breath, tighten your middle, then sit back and down under control.",
        "Go as low as you can while your back stays flat and your heels stay down.",
        "Drive up through the whole foot until you stand tall."
      ],
      breath:
        "Big breath in at the top and hold it on the way down. Breathe out as you pass the hardest part.",
      mistakes: [
        "Heels lifting",
        "Knees caving inward",
        "Rounding the lower back at the bottom",
        "Cutting the depth short to add weight",
        "Squatting without safety bars or a spotter"
      ],
      alt: "Goblet squat, leg press, Smith machine squat",
      q: "barbell back squat"
    }),
    dl: X({
      n: "Deadlift",
      t: "Hamstrings, glutes, whole back, grip",
      img: "Barbell_Deadlift",
      sets: 3,
      lo: 4,
      hi: 6,
      rest: 180,
      start:
        "Stand with the bar over the middle of your feet, feet hip-width. Bend down and grip the bar just outside your legs. Shins touch the bar.",
      posture:
        "Back flat from hips to head, chest lifted, arms straight, shoulders just in front of the bar.",
      steps: [
        "Tighten your middle and pull the slack out of the bar.",
        "Push the floor away. The bar slides up your shins and thighs.",
        "Stand tall with hips and knees locked. Do not lean back.",
        "Hinge at the hips first, then bend the knees to put it down under control."
      ],
      breath: "Big breath and brace before each rep. Breathe out at the top.",
      mistakes: [
        "Rounding the back",
        "Jerking the bar off the floor",
        "Bar drifting away from the legs",
        "Hips shooting up first",
        "Leaning back at the top"
      ],
      alt: "Romanian deadlift, trap-bar deadlift, hip thrust",
      q: "conventional deadlift"
    }),
    ohp: X({
      n: "Standing barbell press",
      t: "Shoulders, triceps, upper chest, core",
      img: "Standing_Military_Press",
      sets: 3,
      lo: 6,
      hi: 8,
      rest: 120,
      start:
        "Take the bar from a rack at collarbone height. Hands just outside shoulder width, forearms upright. Feet hip-width.",
      posture:
        "Squeeze your glutes and tighten your middle so the lower back does not arch. Wrists straight.",
      steps: [
        "Press the bar straight up, moving your head back slightly to let it pass.",
        "Finish with the bar over the middle of your feet and arms straight.",
        "Lower under control to your collarbone."
      ],
      breath: "In at the bottom, out as you press.",
      mistakes: [
        "Leaning back and turning it into an incline press",
        "Pressing the bar forward instead of up",
        "Using the legs to bounce it",
        "Elbows flared wide"
      ],
      alt: "Seated dumbbell shoulder press, machine shoulder press",
      q: "standing overhead press barbell"
    }),
    bbrow: X({
      n: "Bent-over barbell row",
      t: "Middle back, lats, rear shoulders, biceps",
      img: "Bent_Over_Barbell_Row",
      sets: 3,
      lo: 6,
      hi: 10,
      rest: 120,
      start:
        "Hold the bar with hands just outside your legs. Soften the knees and hinge forward until your chest is between 45° and flat to the floor.",
      posture: "Back flat and still. Neck in line with the spine. The bar hangs under your shoulders.",
      steps: [
        "Pull the bar to your lower ribs, leading with the elbows.",
        "Squeeze the shoulder blades together for a moment.",
        "Lower until the arms are straight without letting the back move."
      ],
      breath: "Out as you pull, in as you lower.",
      mistakes: [
        "Standing up a little with every rep",
        "Rounding the back",
        "Yanking with the arms",
        "Too heavy to reach the body"
      ],
      alt: "Chest-supported dumbbell row, seated cable row, one-arm dumbbell row",
      q: "bent over barbell row"
    }),
    pull: X({
      n: "Pull-up",
      t: "Lats, upper back, biceps, grip",
      img: "Pullups",
      sets: 3,
      lo: 4,
      hi: 10,
      rest: 120,
      bw: true,
      start: "Hang from the bar with palms facing away, hands a little wider than your shoulders.",
      posture: "Legs still, ribs down, shoulders pulled down away from your ears before you start.",
      steps: [
        "Pull your elbows down toward your sides until your chin clears the bar.",
        "Pause for a moment.",
        "Lower all the way until your arms are straight."
      ],
      breath: "Out as you pull, in as you lower.",
      mistakes: [
        "Kicking or swinging",
        "Half reps",
        "Shrugging the shoulders up",
        "Dropping fast from the top"
      ],
      alt: "Lat pulldown, band-assisted pull-up, slow lowering from the top only",
      q: "pull up"
    }),
    hipt: X({
      n: "Barbell hip thrust",
      t: "Glutes, hamstrings",
      img: "Barbell_Hip_Thrust",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 90,
      start:
        "Sit on the floor with your upper back against a bench and a padded bar across your hips. Feet flat, about hip-width.",
      posture: "Chin tucked, ribs down. At the top your shins are upright.",
      steps: [
        "Drive through your heels and lift your hips until your body is flat from shoulders to knees.",
        "Squeeze the glutes hard for one second.",
        "Lower under control."
      ],
      breath: "Out as you lift, in as you lower.",
      mistakes: [
        "Arching the lower back to get higher",
        "Feet too far forward or too close",
        "Pushing through the toes",
        "Bouncing off the floor"
      ],
      alt: "Glute bridge, single-leg glute bridge, cable pull-through",
      q: "barbell hip thrust"
    }),
    dip: X({
      n: "Parallel-bar dip",
      t: "Triceps, chest, front shoulders",
      img: "Dips_-_Triceps_Version",
      sets: 3,
      lo: 6,
      hi: 12,
      rest: 90,
      bw: true,
      start: "Support yourself on the bars with straight arms. Cross your ankles behind you.",
      posture: "Shoulders pulled down, chest up. A slight forward lean is fine.",
      steps: [
        "Bend the elbows and lower until your upper arms are about level with the floor.",
        "Do not sink lower than your shoulders are comfortable with.",
        "Press back up to straight arms."
      ],
      breath: "In as you lower, out as you press.",
      mistakes: [
        "Dropping too deep",
        "Shrugging the shoulders up",
        "Swinging the legs",
        "Half reps at the top only"
      ],
      alt: "Bench dip, rope pushdown, close-grip push-up",
      q: "parallel bar dips"
    }),
    dbp: X({
      n: "Dumbbell bench press",
      t: "Chest, front shoulders, triceps",
      img: "Dumbbell_Bench_Press",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 90,
      start:
        "Lie on a bench, or on the floor if you have no bench, with a dumbbell in each hand at chest level. Feet flat.",
      posture: "Shoulder blades squeezed back and down. Wrists straight over the elbows.",
      steps: [
        "Press both dumbbells up until your arms are straight over your shoulders.",
        "Lower slowly until your elbows are just below the bench line, or touch the floor lightly.",
        "Keep the elbows about 45° from your body."
      ],
      breath: "In as you lower, out as you press.",
      mistakes: [
        "Elbows flared straight out",
        "Dumbbells drifting toward the face",
        "Bouncing at the bottom",
        "Lifting the hips"
      ],
      alt: "Push-up, machine chest press, flat bench press",
      q: "dumbbell bench press"
    }),
    dbrow: X({
      n: "One-arm dumbbell row",
      t: "Lats, middle back, biceps",
      img: "One-Arm_Dumbbell_Row",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 75,
      each: true,
      start:
        "Put one hand and the same-side knee on a bench or sturdy chair. The other foot is on the floor and that hand holds the dumbbell.",
      posture: "Back flat like a table. Shoulders level; do not twist open.",
      steps: [
        "Pull the dumbbell to your hip, elbow close to your side.",
        "Squeeze the shoulder blade back for a moment.",
        "Lower until the arm is straight and the shoulder blade stretches forward."
      ],
      breath: "Out as you pull, in as you lower.",
      mistakes: [
        "Twisting the body to lift it",
        "Pulling to the chest instead of the hip",
        "Rounding the back",
        "Short, jerky reps"
      ],
      alt: "Seated cable row, chest-supported dumbbell row, inverted row",
      q: "one arm dumbbell row"
    }),
    dbcurl: X({
      n: "Dumbbell curl",
      t: "Biceps",
      img: "Dumbbell_Bicep_Curl",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 60,
      start: "Stand tall with a dumbbell in each hand, palms facing forward, arms straight.",
      posture: "Elbows stay by your sides. Shoulders back, no leaning.",
      steps: [
        "Curl both dumbbells up without moving the elbows forward.",
        "Squeeze at the top.",
        "Lower slowly, about three seconds, to straight arms."
      ],
      breath: "Out as you curl, in as you lower.",
      mistakes: [
        "Swinging the body",
        "Elbows drifting forward",
        "Dropping the weight on the way down",
        "Half reps"
      ],
      alt: "EZ-bar curl, hammer curl, band curl",
      q: "dumbbell bicep curl"
    }),
    dbext: X({
      n: "Dumbbell overhead extension",
      t: "Triceps",
      img: "Standing_Dumbbell_Triceps_Extension",
      sets: 3,
      lo: 10,
      hi: 12,
      rest: 60,
      start: "Hold one dumbbell with both hands and lift it overhead. Stand or sit tall.",
      posture: "Upper arms stay close to your ears. Ribs down so the lower back does not arch.",
      steps: [
        "Bend the elbows and lower the dumbbell behind your head.",
        "Stop when your forearms pass level with the floor.",
        "Straighten the arms without letting the elbows flare."
      ],
      breath: "In as you lower, out as you straighten.",
      mistakes: [
        "Elbows flaring wide",
        "Arching the back",
        "Moving the upper arms",
        "Going too heavy to control behind the head"
      ],
      alt: "Overhead cable extension, rope pushdown, close-grip push-up",
      q: "dumbbell overhead tricep extension"
    }),
    dbfly: X({
      n: "Dumbbell fly",
      t: "Chest",
      img: "Dumbbell_Flyes",
      sets: 3,
      lo: 10,
      hi: 15,
      rest: 60,
      start:
        "Lie on a bench or the floor holding light dumbbells straight above your chest, palms facing each other.",
      posture: "Elbows slightly bent and locked at that angle. Shoulder blades back.",
      steps: [
        "Open your arms wide in an arc until you feel the chest stretch.",
        "Bring them back together in the same arc, as if hugging a tree.",
        "Stop just before the dumbbells touch."
      ],
      breath: "In as you open, out as you close.",
      mistakes: [
        "Going too heavy",
        "Turning it into a press by bending the elbows",
        "Dropping below a comfortable stretch",
        "Shoulders rolling forward"
      ],
      alt: "Pec deck fly, cable fly, push-up",
      q: "dumbbell chest fly"
    }),
    dbrear: X({
      n: "Bent-over rear-delt raise",
      t: "Rear shoulders, upper back",
      img: "Seated_Bent-Over_Rear_Delt_Raise",
      sets: 3,
      lo: 12,
      hi: 15,
      rest: 60,
      start:
        "Sit on the edge of a bench or chair with light dumbbells. Lean forward until your chest is close to your thighs.",
      posture: "Back flat, neck long. Arms hang below your shoulders with a soft bend at the elbow.",
      steps: [
        "Lift the dumbbells out to the sides until your arms are level with the floor.",
        "Lead with the elbows and pause for a moment.",
        "Lower slowly."
      ],
      breath: "Out as you lift, in as you lower.",
      mistakes: [
        "Swinging the weights",
        "Shrugging toward the ears",
        "Sitting up as you lift",
        "Using a weight that is too heavy"
      ],
      alt: "Reverse pec deck, face pull, band pull-apart",
      q: "seated bent over rear delt raise"
    }),
    splsq: X({
      n: "Dumbbell split squat",
      t: "Thighs, glutes, balance",
      img: "Split_Squat_with_Dumbbells",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 75,
      each: true,
      start:
        "Stand in a long stride, one foot forward and one back, holding dumbbells at your sides. The back heel is off the floor.",
      posture: "Body upright, front foot flat. Hips square to the front.",
      steps: [
        "Lower straight down until the back knee is just above the floor.",
        "Keep the front knee in line with the toes.",
        "Push through the front foot to stand. Finish one side, then swap."
      ],
      breath: "In as you lower, out as you stand.",
      mistakes: ["Stance too short", "Front heel lifting", "Leaning far forward", "Front knee caving in"],
      alt: "Dumbbell lunge, goblet squat, step-up",
      q: "dumbbell split squat"
    }),
    dbcalf: X({
      n: "Standing calf raise",
      t: "Calves",
      img: "Standing_Dumbbell_Calf_Raise",
      sets: 3,
      lo: 12,
      hi: 20,
      rest: 45,
      start:
        "Stand with the balls of your feet on a step, heels hanging off. Hold a wall for balance, and a dumbbell if you have one.",
      posture: "Knees straight but not locked. Body tall.",
      steps: [
        "Lower your heels below the step until the calves stretch.",
        "Rise as high as you can onto your toes.",
        "Pause at the top for one second, then lower slowly."
      ],
      breath: "Out as you rise, in as you lower.",
      mistakes: [
        "Bouncing",
        "Short range at the top or bottom",
        "Rolling onto the outside of the foot",
        "Bending the knees to help"
      ],
      alt: "Seated calf raise, single-leg calf raise",
      q: "standing calf raise"
    }),
    sq: X({
      n: "Bodyweight squat",
      t: "Thighs, glutes",
      img: "Bodyweight_Squat",
      sets: 3,
      lo: 12,
      hi: 20,
      rest: 60,
      bw: true,
      start:
        "Stand with feet a little wider than your hips, toes turned out slightly. Arms out in front for balance.",
      posture: "Chest up, back flat, whole foot on the floor.",
      steps: [
        "Sit back and down as if onto a low chair.",
        "Go as low as you can with heels down and back flat.",
        "Stand up by pushing the floor away."
      ],
      breath: "In as you lower, out as you stand.",
      mistakes: ["Heels lifting", "Knees caving in", "Rounding the back", "Rushing the reps"],
      alt: "Goblet squat, squat to a chair, leg press",
      q: "bodyweight squat"
    }),
    blng: X({
      n: "Walking lunge",
      t: "Thighs, glutes, balance",
      img: "Bodyweight_Walking_Lunge",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 60,
      bw: true,
      each: true,
      start:
        "Stand tall with hands on your hips and a clear path ahead. No space? Step back into reverse lunges on the spot.",
      posture: "Body upright, eyes forward.",
      steps: [
        "Take a long step forward and lower until the back knee is just above the floor.",
        "Push through the front foot and bring the back leg through into the next step.",
        "Keep each step the same length."
      ],
      breath: "In as you lower, out as you step through.",
      mistakes: [
        "Steps too short",
        "Front knee caving in",
        "Leaning forward",
        "Slamming the back knee into the floor"
      ],
      alt: "Reverse lunge on the spot, split squat, step-up",
      q: "bodyweight walking lunge"
    }),
    ipu: X({
      n: "Incline push-up",
      t: "Chest, shoulders, triceps",
      img: "Incline_Push-Up",
      sets: 3,
      lo: 8,
      hi: 15,
      rest: 60,
      bw: true,
      start:
        "Hands on a bench, bed edge or sturdy table, a little wider than your shoulders. Walk your feet back until your body is straight.",
      posture: "One straight line from head to heels. Glutes and stomach tight.",
      steps: [
        "Lower your chest to the edge with elbows about 45° from your body.",
        "Touch lightly.",
        "Press back to straight arms. A lower surface makes it harder."
      ],
      breath: "In as you lower, out as you press.",
      mistakes: ["Hips sagging", "Elbows flared out", "Head dropping forward", "Half reps"],
      alt: "Knee push-up, push-up, machine chest press",
      q: "incline push up"
    }),
    dpu: X({
      n: "Decline push-up",
      t: "Upper chest, shoulders, triceps",
      img: "Decline_Push-Up",
      sets: 3,
      lo: 6,
      hi: 12,
      rest: 75,
      bw: true,
      start: "Feet on a bench, chair or step, hands on the floor a little wider than your shoulders.",
      posture: "Body straight from head to heels. Stomach tight so the lower back does not sag.",
      steps: [
        "Lower your chest toward the floor, elbows about 45° from your body.",
        "Stop just above the floor.",
        "Press back to straight arms."
      ],
      breath: "In as you lower, out as you press.",
      mistakes: [
        "Hips sagging or piking up",
        "Elbows flared out",
        "Neck craning forward",
        "Feet too high too soon"
      ],
      alt: "Push-up, incline dumbbell press, seated dumbbell shoulder press",
      q: "decline push up"
    }),
    cpu: X({
      n: "Close-grip push-up",
      t: "Triceps, chest",
      img: "Push-Ups_-_Close_Triceps_Position",
      sets: 3,
      lo: 6,
      hi: 12,
      rest: 60,
      bw: true,
      start: "Push-up position with your hands under your chest, about a hand-width apart.",
      posture: "Body straight. Elbows stay close to your ribs all the way.",
      steps: [
        "Lower your chest to your hands with the elbows brushing your sides.",
        "Pause just above the floor.",
        "Press back to straight arms. Drop to your knees to finish the set if you need to."
      ],
      breath: "In as you lower, out as you press.",
      mistakes: ["Elbows flaring out", "Hips sagging", "Hands too far forward", "Half reps"],
      alt: "Bench dip, rope pushdown, dumbbell overhead extension",
      q: "close grip push up triceps"
    }),
    bdip: X({
      n: "Bench dip",
      t: "Triceps, front shoulders",
      img: "Bench_Dips",
      sets: 3,
      lo: 8,
      hi: 15,
      rest: 60,
      bw: true,
      start:
        "Sit on the edge of a bench or sturdy chair, hands beside your hips, fingers forward. Slide your hips off the edge with legs out in front.",
      posture: "Back close to the bench. Shoulders down, chest up.",
      steps: [
        "Bend your elbows and lower your hips until the upper arms are about level with the floor.",
        "Do not go lower than is comfortable for the shoulders.",
        "Press back up to straight arms. Bend your knees to make it easier."
      ],
      breath: "In as you lower, out as you press.",
      mistakes: [
        "Hips drifting far from the bench",
        "Shrugging the shoulders",
        "Dropping too deep",
        "Elbows flaring wide"
      ],
      alt: "Close-grip push-up, rope pushdown, dumbbell overhead extension",
      q: "bench dips"
    }),
    irow: X({
      n: "Inverted row",
      t: "Middle back, lats, biceps",
      img: "Inverted_Row",
      sets: 3,
      lo: 6,
      hi: 12,
      rest: 75,
      bw: true,
      start:
        "Lie under a bar set at waist height, or under a sturdy table, and grip it a little wider than your shoulders. Heels on the floor, body straight.",
      posture: "One straight line from head to heels. Glutes tight.",
      steps: [
        "Pull your chest up to the bar or table edge.",
        "Squeeze the shoulder blades together.",
        "Lower until the arms are straight. Bend your knees to make it easier."
      ],
      breath: "Out as you pull, in as you lower.",
      mistakes: ["Hips sagging", "Chin reaching forward", "Half reps", "Using a table that can tip"],
      alt: "One-arm dumbbell row, seated cable row, band row",
      q: "inverted row"
    }),
    sup: X({
      n: "Superman",
      t: "Lower back, glutes, rear shoulders",
      img: "Superman",
      sets: 3,
      lo: 10,
      hi: 15,
      rest: 45,
      bw: true,
      start: "Lie face down with arms stretched out in front and legs straight.",
      posture: "Neck long, eyes on the floor.",
      steps: [
        "Lift your arms, chest and legs a few centimetres off the floor at the same time.",
        "Hold for two seconds, squeezing the glutes and upper back.",
        "Lower slowly."
      ],
      breath: "Out as you lift, in as you lower.",
      mistakes: ["Throwing the head back", "Jerking up high", "Holding the breath", "Bending the knees"],
      alt: "Bird-dog, back extension, reverse pec deck",
      q: "superman exercise"
    }),
    slgb: X({
      n: "Single-leg glute bridge",
      t: "Glutes, hamstrings",
      img: "Single_Leg_Glute_Bridge",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 45,
      bw: true,
      each: true,
      start: "Lie on your back with one knee bent and that foot flat. Lift the other leg off the floor.",
      posture: "Ribs down, hips level. Arms on the floor for balance.",
      steps: [
        "Push through the heel and lift your hips until your body is straight from shoulder to knee.",
        "Squeeze the glute for one second.",
        "Lower slowly without letting the hips twist."
      ],
      breath: "Out as you lift, in as you lower.",
      mistakes: [
        "Hips twisting or dropping to one side",
        "Arching the lower back",
        "Pushing through the toes",
        "Rushing"
      ],
      alt: "Glute bridge, hip thrust, seated hamstring curl",
      q: "single leg glute bridge"
    }),
    rcr: X({
      n: "Reverse crunch",
      t: "Lower abs",
      img: "Reverse_Crunch",
      sets: 3,
      lo: 10,
      hi: 15,
      rest: 45,
      bw: true,
      start: "Lie on your back, hands by your sides, knees bent at 90° above your hips.",
      posture: "Lower back pressed into the floor at the start. Head down.",
      steps: [
        "Curl your hips off the floor and bring your knees toward your chest.",
        "Pause for a moment.",
        "Lower slowly until your hips touch down. Do not swing."
      ],
      breath: "Out as you curl up, in as you lower.",
      mistakes: [
        "Swinging the legs",
        "Arching the lower back on the way down",
        "Pushing hard with the hands",
        "Rushing"
      ],
      alt: "Hanging knee raise, dead bug, crunch",
      q: "reverse crunch"
    }),
    mtc: X({
      n: "Mountain climbers",
      t: "Core, shoulders, heart and lungs",
      img: "Mountain_Climbers",
      sets: 3,
      lo: 20,
      hi: 30,
      unit: "sec",
      rest: 45,
      bw: true,
      start: "Start at the top of a push-up: hands under shoulders, body straight.",
      posture: "Hips level with your shoulders. Stomach tight.",
      steps: [
        "Drive one knee toward your chest.",
        "Switch legs quickly, as if running on the spot.",
        "Keep your hands planted and your hips low."
      ],
      breath: "Short, steady breaths. Do not hold your breath.",
      mistakes: [
        "Hips bouncing up",
        "Shoulders drifting behind the hands",
        "Tiny steps",
        "Holding the breath"
      ],
      alt: "Fast march on the spot, plank, step-ups",
      q: "mountain climbers"
    }),
    jsq: X({
      n: "Jump squat",
      t: "Thighs, glutes, power",
      img: "Freehand_Jump_Squat",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 75,
      bw: true,
      start: "Stand with feet hip-width, arms by your sides.",
      posture: "Chest up. Knees in line with your toes when you land.",
      steps: [
        "Dip into a half squat, swinging the arms back.",
        "Jump straight up.",
        "Land softly on the whole foot, bend the knees to absorb it, and go into the next rep."
      ],
      breath: "Out as you jump, in as you land.",
      mistakes: [
        "Landing stiff-legged or loud",
        "Knees caving in on landing",
        "Squatting too deep to jump well",
        "Carrying on when the landings get sloppy"
      ],
      alt: "Bodyweight squat, step-up, kettlebell swing",
      q: "jump squat"
    }),
    stp: X({
      n: "Step-up",
      t: "Thighs, glutes, balance",
      img: "Step-up_with_Knee_Raise",
      sets: 3,
      lo: 8,
      hi: 12,
      rest: 60,
      bw: true,
      each: true,
      start: "Stand facing a sturdy step, bench or chair. Place one whole foot on it.",
      posture: "Body tall. The knee on the step stays in line with the toes.",
      steps: [
        "Push through the top foot and stand up fully on the step.",
        "Lift the other knee to hip height if your balance allows.",
        "Step down slowly with the same leg. Finish one side, then swap."
      ],
      breath: "Out as you step up, in as you step down.",
      mistakes: [
        "Pushing off the floor with the back foot",
        "Dropping down fast",
        "Knee caving in",
        "A step so high that the hips twist"
      ],
      alt: "Split squat, walking lunge, leg press",
      q: "step up exercise"
    })
  };

  // [id, name, unit label, default qty, kcal, protein, carbs, fat, fibre]  — per 1 unit
  var F = [
    ["egg", "Whole egg, boiled", "1 egg", 2, 72, 6.3, 0.4, 4.8, 0],
    ["eggwhite", "Egg white", "1 white", 2, 17, 3.6, 0.2, 0.1, 0],
    ["omelette", "Omelette, 2 eggs + 1 tsp oil", "1 omelette", 1, 189, 12.6, 0.8, 14.6, 0],
    ["bhurji", "Egg bhurji, 2 eggs + 1 tsp oil", "1 serving", 1, 210, 13, 4, 15, 1],
    ["chicken", "Chicken breast, raw weight", "100 g", 1.5, 120, 22.5, 0, 2.6, 0],
    ["chickencurry", "Chicken curry, home-style", "1 serving (150 g chicken)", 1, 280, 34, 6, 13, 1],
    ["fish", "Fish (rohu / bangda), raw weight", "100 g", 1.5, 105, 18, 0, 3.5, 0],
    ["soya", "Soya chunks, dry weight", "10 g", 4, 34.5, 5.2, 3.3, 0.05, 1.3],
    ["paneer", "Paneer", "50 g", 1, 132, 9, 1.5, 10, 0],
    ["dal", "Dal, cooked (30 g raw, light tadka)", "1 katori", 1, 130, 7.2, 18, 3, 3],
    ["rajma", "Rajma / chole, cooked", "1 katori", 1, 190, 9, 27, 5, 7.5],
    ["milk", "Toned milk", "250 ml", 1, 145, 7.8, 12, 7.5, 0],
    ["dahi", "Dahi (curd)", "100 g", 1, 60, 3.5, 4.5, 3, 0],
    ["chaas", "Chaas, plain", "250 ml", 1, 40, 2, 3, 1.5, 0],
    ["lassi", "Sweet lassi", "250 ml", 1, 180, 6, 28, 5, 0],
    ["whey", "Whey protein (check your label)", "1 scoop", 1, 120, 24, 3, 1.5, 0],
    ["chapati", "Chapati, no ghee (30 g atta)", "1 chapati", 2, 100, 3.6, 21, 0.6, 3],
    ["ragiroti", "Ragi roti (30 g flour)", "1 roti", 2, 98, 2.2, 21.6, 0.4, 3.4],
    ["paratha", "Aloo paratha", "1 paratha", 1, 250, 5.5, 36, 9.5, 3.5],
    ["rice", "Rice, cooked", "100 g", 1.5, 130, 2.7, 28, 0.3, 0.4],
    ["oats", "Rolled oats, dry weight", "50 g", 1, 190, 6.5, 33, 3.5, 5],
    ["breadbrown", "Brown bread", "1 slice", 2, 72, 2.8, 13.5, 0.9, 1.5],
    ["breadwhite", "White bread", "1 slice", 2, 75, 2.3, 14.5, 0.9, 0.6],
    ["poha", "Poha", "1 plate (200 g)", 1, 270, 5.5, 46, 7.5, 2.5],
    ["upma", "Upma", "1 plate (200 g)", 1, 250, 6, 40, 8, 3],
    ["idli", "Idli", "1 idli", 3, 55, 1.8, 11.5, 0.2, 0.6],
    ["dosa", "Plain dosa", "1 dosa", 2, 130, 3, 22, 3.5, 1],
    ["sambar", "Sambar", "1 katori", 1, 110, 5, 16, 3, 3.5],
    ["biryani", "Chicken biryani", "1 plate (300 g)", 1, 480, 24, 55, 17, 2],
    ["sabzi", "Vegetable sabzi (about 1 tsp oil)", "1 katori (150 g)", 1, 90, 2.3, 7.5, 5.3, 3],
    ["aloo", "Aloo sabzi", "1 katori", 1, 150, 2.5, 20, 7, 2.5],
    ["salad", "Cucumber + carrot", "150 g", 1, 35, 1, 7, 0.2, 2.5],
    ["banana", "Banana", "1 medium", 1, 105, 1.3, 27, 0.4, 3],
    ["apple", "Apple", "1 medium", 1, 80, 0.4, 21, 0.3, 3.5],
    ["guava", "Guava", "1 medium (100 g)", 1, 68, 2.6, 14, 1, 5.4],
    ["orange", "Orange", "1 medium", 1, 62, 1.2, 15, 0.2, 3],
    ["papaya", "Papaya", "150 g", 1, 65, 0.7, 16, 0.4, 2.5],
    ["chana", "Roasted chana", "40 g", 1, 150, 7.5, 22, 2.5, 6],
    ["peanuts", "Roasted peanuts", "15 g", 1, 85, 3.9, 2.4, 7.4, 1.3],
    ["almonds", "Almonds", "10 pieces", 1, 70, 2.5, 2.6, 6, 1.5],
    ["pb", "Peanut butter", "1 tbsp", 1, 95, 4, 3.5, 8, 1],
    ["makhana", "Roasted makhana", "25 g", 1, 90, 2.4, 19, 0.3, 3.6],
    ["oil", "Cooking oil", "1 tsp", 1, 45, 0, 0, 5, 0],
    ["ghee", "Ghee", "1 tsp", 1, 45, 0, 0, 5, 0],
    ["butter", "Butter", "10 g", 1, 72, 0.1, 0, 8.1, 0],
    ["jam", "Jam", "1 tbsp", 1, 55, 0, 14, 0, 0.2],
    ["chai", "Chai with milk + 1 tsp sugar", "1 cup", 1, 60, 1.6, 8.5, 1.8, 0],
    ["biscuit", "Marie biscuits", "4 biscuits", 1, 88, 1.6, 15, 2.2, 0.4],
    ["bhel", "Bhel puri", "1 plate (150 g)", 1, 280, 7, 45, 8, 4],
    ["samosa", "Samosa", "1 samosa", 1, 260, 4.5, 28, 14.5, 2],
    ["vadapav", "Vada pav", "1 vada pav", 1, 290, 6.5, 40, 11.5, 3],
    ["pavbhaji", "Pav bhaji with butter", "1 plate (2 pav)", 1, 520, 12, 68, 22, 7],
    ["chips", "Potato chips", "small pack (25 g)", 1, 135, 1.7, 13, 8.5, 0.9],
    ["namkeen", "Sev / namkeen", "30 g", 1, 165, 4, 13.5, 10.5, 1.5],
    ["shrikhand", "Shrikhand", "100 g", 1, 260, 6, 40, 8.5, 0],
    ["cola", "Soft drink, regular", "300 ml", 1, 130, 0, 33, 0, 0],
    ["colazero", "Soft drink, zero sugar", "1 can", 1, 1, 0, 0, 0, 0],
    ["coconut", "Coconut water", "250 ml", 1, 48, 0.5, 11, 0, 0],
    // Wider Indian table. Home recipes vary, so treat these as estimates.
    ["eggfried", "Fried egg (1 tsp oil)", "1 egg", 2, 115, 6.3, 0.4, 9.8, 0],
    ["eggcurry", "Egg curry (2 eggs)", "1 serving", 1, 260, 14, 8, 19, 1.5],
    ["eggsandwich", "Egg sandwich (2 eggs)", "1 sandwich", 1, 330, 17, 29, 16, 2.5],
    ["chickencooked", "Chicken breast, cooked weight", "100 g", 1.5, 165, 31, 0, 3.6, 0],
    ["chickentikka", "Chicken tikka", "6 pieces (150 g)", 1, 240, 36, 5, 8, 0.5],
    ["tandoori", "Tandoori chicken", "1 leg piece", 1, 220, 26, 3, 11, 0.3],
    ["butterchicken", "Butter chicken", "1 serving (200 g)", 1, 440, 28, 12, 31, 1.5],
    ["keema", "Chicken keema", "1 serving (150 g)", 1, 260, 28, 6, 14, 1],
    ["mutton", "Mutton curry", "1 serving (150 g)", 1, 360, 27, 6, 25, 1],
    ["chickenroll", "Chicken kathi roll", "1 roll", 1, 400, 22, 42, 16, 3],
    ["shawarma", "Chicken shawarma", "1 roll", 1, 430, 24, 40, 19, 2.5],
    ["momo", "Chicken momos, steamed", "6 pieces", 1, 270, 15, 33, 8, 1.5],
    ["fishfry", "Fish fry, shallow-fried", "1 piece (100 g)", 1, 200, 19, 6, 11, 0.3],
    ["fishcurry", "Fish curry", "1 serving (150 g fish)", 1, 250, 28, 6, 12, 1],
    ["paneerbhurji", "Paneer bhurji (100 g paneer)", "1 serving", 1, 330, 19, 8, 25, 1.5],
    ["palakpaneer", "Palak paneer", "1 katori", 1, 260, 13, 9, 19, 3.5],
    ["paneerbm", "Paneer butter masala", "1 katori", 1, 360, 13, 13, 29, 2],
    ["tofu", "Tofu (soya paneer)", "100 g", 1, 120, 13, 3, 7, 1],
    ["hungcurd", "Hung curd / Greek yogurt", "100 g", 1, 95, 9, 4, 4.5, 0],
    ["cheese", "Cheese slice", "1 slice", 1, 65, 4, 1, 5, 0],
    ["soyamilk", "Soya milk, unsweetened", "250 ml", 1, 85, 8, 4, 4.5, 1],
    ["sprouts", "Moong sprouts, steamed", "1 katori (100 g)", 1, 85, 7, 14, 0.5, 4],
    ["besanchilla", "Besan chilla", "1 chilla", 2, 130, 6, 15, 5, 3],
    ["moongchilla", "Moong dal chilla", "1 chilla", 2, 120, 7, 15, 3.5, 3],
    ["sattu", "Sattu drink (30 g sattu)", "1 glass", 1, 120, 6.5, 19, 2, 5],
    ["proteinbar", "Protein bar (check your label)", "1 bar", 1, 200, 20, 18, 7, 5],
    ["rotighee", "Chapati with ghee", "1 chapati", 2, 120, 3.6, 21, 3, 3],
    ["bhakri", "Jowar / bajra bhakri", "1 bhakri", 1, 175, 5, 36, 1.5, 5],
    ["plainparatha", "Plain paratha", "1 paratha", 1, 180, 4, 26, 7, 3],
    ["paneerparatha", "Paneer paratha", "1 paratha", 1, 270, 10, 32, 11.5, 3],
    ["thepla", "Methi thepla", "1 thepla", 2, 120, 3, 17, 4.5, 2.5],
    ["puri", "Puri", "1 puri", 2, 100, 1.8, 12, 5, 0.8],
    ["naan", "Butter naan", "1 naan", 1, 300, 8, 45, 10, 2],
    ["jeerarice", "Jeera rice", "1 katori (150 g)", 1, 215, 3.8, 40, 4.5, 0.8],
    ["pulao", "Veg pulao", "1 plate (250 g)", 1, 340, 7, 58, 9, 4],
    ["friedrice", "Veg fried rice", "1 plate (250 g)", 1, 380, 8, 62, 11, 3],
    ["eggrice", "Egg fried rice", "1 plate (250 g)", 1, 430, 14, 60, 14, 2],
    ["khichdi", "Dal khichdi", "1 plate (250 g)", 1, 300, 11, 48, 7, 5],
    ["curdrice", "Curd rice", "1 plate (250 g)", 1, 290, 8, 45, 8, 1],
    ["dalia", "Dalia (broken wheat), cooked", "1 katori (150 g)", 1, 150, 5, 28, 2, 4.5],
    ["cornflakes", "Cornflakes with 200 ml milk", "1 bowl", 1, 230, 8.5, 37, 6, 1],
    ["muesli", "Muesli, dry weight", "40 g", 1, 150, 4, 27, 3, 3],
    ["masaladosa", "Masala dosa", "1 dosa", 1, 330, 6.5, 50, 11.5, 3.5],
    ["uttapam", "Onion uttapam", "1 uttapam", 1, 210, 5, 35, 5.5, 2],
    ["meduvada", "Medu vada", "1 vada", 2, 135, 4, 13, 7.5, 2],
    ["sabudana", "Sabudana khichdi", "1 plate (200 g)", 1, 430, 5, 68, 16, 2],
    ["misal", "Misal pav", "1 plate (2 pav)", 1, 480, 17, 62, 18, 10],
    ["dabeli", "Dabeli", "1 dabeli", 1, 300, 6, 45, 11, 3],
    ["panipuri", "Pani puri", "6 puris", 1, 220, 4, 36, 7, 2.5],
    ["sevpuri", "Sev puri", "1 plate (6 pieces)", 1, 300, 6, 38, 14, 3],
    ["dhokla", "Dhokla", "4 pieces (120 g)", 1, 190, 8, 28, 5, 2.5],
    ["kachori", "Kachori", "1 kachori", 1, 250, 5, 26, 14, 2.5],
    ["pakora", "Pakora / bhajiya", "6 pieces (100 g)", 1, 300, 7, 26, 19, 3.5],
    ["fries", "French fries", "medium (110 g)", 1, 340, 4, 44, 16, 4],
    ["burger", "Veg burger", "1 burger", 1, 400, 10, 52, 17, 3.5],
    ["chickenburger", "Chicken burger", "1 burger", 1, 440, 22, 42, 20, 2.5],
    ["pizza", "Cheese pizza", "1 slice (medium)", 2, 270, 11, 33, 10, 2],
    ["noodles", "Hakka noodles", "1 plate (250 g)", 1, 430, 9, 64, 15, 3.5],
    ["maggi", "Instant noodles", "1 pack (70 g)", 1, 310, 7, 45, 11.5, 2],
    ["sandwich", "Veg sandwich", "1 sandwich (2 slices)", 1, 230, 7, 36, 6.5, 3.5],
    ["potato", "Potato, boiled", "1 medium (150 g)", 1, 130, 3, 30, 0.2, 2.7],
    ["sweetpotato", "Sweet potato, boiled", "150 g", 1, 130, 2.4, 30, 0.2, 4.5],
    ["corn", "Sweet corn, boiled", "1 cup (150 g)", 1, 145, 5, 31, 2, 3.5],
    ["mango", "Mango", "1 medium (200 g)", 1, 125, 1.2, 30, 0.6, 3.2],
    ["watermelon", "Watermelon", "200 g", 1, 60, 1.2, 15, 0.3, 0.8],
    ["grapes", "Grapes", "100 g", 1, 70, 0.7, 18, 0.2, 0.9],
    ["pomegranate", "Pomegranate", "1 medium (150 g seeds)", 1, 125, 2.5, 28, 1.7, 6],
    ["dates", "Dates", "2 dates", 1, 55, 0.4, 15, 0, 1.3],
    ["walnuts", "Walnuts", "4 halves (15 g)", 1, 98, 2.3, 2, 9.8, 1],
    ["flax", "Flax seeds (alsi)", "1 tbsp (10 g)", 1, 53, 1.8, 2.9, 4.2, 2.7],
    ["chikki", "Peanut chikki", "1 piece (25 g)", 1, 125, 3.5, 13, 7, 1],
    ["sugar", "Sugar", "1 tsp", 1, 16, 0, 4, 0, 0],
    ["jaggery", "Jaggery (gur)", "10 g", 1, 38, 0, 9.8, 0, 0],
    ["honey", "Honey", "1 tsp", 1, 21, 0, 5.7, 0, 0],
    ["chaiplain", "Chai without sugar", "1 cup", 1, 40, 1.6, 3.5, 1.8, 0],
    ["coffee", "Coffee with milk + 1 tsp sugar", "1 cup", 1, 70, 2, 9, 2.5, 0],
    ["blackcoffee", "Black coffee / green tea", "1 cup", 1, 3, 0.2, 0, 0, 0],
    ["juice", "Fruit juice, packaged", "200 ml", 1, 95, 0.4, 23, 0, 0.3],
    ["sugarcane", "Sugarcane juice", "1 glass (250 ml)", 1, 180, 0.4, 45, 0, 0],
    ["nimbu", "Nimbu pani with 2 tsp sugar", "1 glass", 1, 45, 0.1, 11, 0, 0],
    ["gulabjamun", "Gulab jamun", "1 piece", 1, 150, 2, 25, 5, 0.2],
    ["jalebi", "Jalebi", "2 pieces (50 g)", 1, 190, 1.5, 33, 6.5, 0.3],
    ["ladoo", "Besan / motichoor ladoo", "1 ladoo", 1, 180, 3, 24, 8.5, 1],
    ["rasgulla", "Rasgulla", "1 piece", 1, 110, 2, 22, 1.5, 0],
    ["kheer", "Kheer", "1 katori", 1, 220, 6, 34, 7, 0.3],
    ["icecream", "Ice cream", "1 scoop (60 g)", 1, 125, 2.2, 15, 6.5, 0.3],
    ["chocolate", "Milk chocolate", "4 squares (25 g)", 1, 135, 2, 14.5, 7.5, 0.5],
    ["cake", "Cake / pastry", "1 slice", 1, 300, 4, 40, 14, 0.8],
    ["beer", "Beer", "330 ml", 1, 140, 1.2, 11, 0, 0],
    ["spirits", "Whisky / rum / vodka", "30 ml", 1, 70, 0, 0, 0, 0]
  ];
  // other names people type for a food: used by search and by "type what you ate"
  var ALIAS = {
    egg: "egg|eggs|anda|ande|boiled egg|boiled eggs|whole egg|whole eggs",
    eggwhite: "egg white|egg whites|whites",
    omelette: "omelette|omelet|omlet",
    bhurji: "egg bhurji|bhurji|anda bhurji|scrambled egg|scrambled eggs",
    eggfried: "fried egg|fried eggs|half fry|sunny side",
    chicken: "chicken breast|raw chicken|chicken",
    chickencooked: "cooked chicken|grilled chicken|boiled chicken",
    chickencurry: "chicken curry|chicken gravy|chicken masala",
    fish: "fish|rohu|bangda|surmai|pomfret",
    fishfry: "fish fry|fried fish",
    fishcurry: "fish curry",
    soya: "soya chunks|soya|soy chunks|soyabean|nutrela|soya curry",
    paneer: "paneer|cottage cheese",
    dal: "dal|daal|dhal|varan|dal tadka|dal fry",
    rajma: "rajma|chole|chhole|chana masala|kidney beans|chickpeas",
    milk: "milk|doodh|toned milk|glass of milk",
    dahi: "dahi|curd|yogurt|yoghurt",
    chaas: "chaas|buttermilk|taak|chhaas",
    lassi: "lassi|sweet lassi",
    whey: "whey|protein shake|protein powder|whey protein|scoop of whey|scoop whey",
    chapati: "chapati|chapatis|chapatti|roti|rotis|phulka|phulkas|poli",
    rotighee: "ghee roti|roti with ghee|chapati with ghee",
    ragiroti: "ragi roti|nachni roti|nachni bhakri",
    bhakri: "bhakri|jowar roti|bajra roti|jowar bhakri|bajra bhakri",
    paratha: "aloo paratha|alu paratha",
    plainparatha: "paratha|plain paratha|parantha",
    paneerparatha: "paneer paratha",
    rice: "rice|steamed rice|plain rice|bhaat|chawal|white rice",
    jeerarice: "jeera rice",
    oats: "oats|oatmeal|rolled oats",
    breadbrown: "brown bread|wheat bread|multigrain bread|atta bread",
    breadwhite: "bread|white bread|toast|pav|pao",
    poha: "poha|pohe|kanda poha",
    upma: "upma|rava upma",
    idli: "idli|idlis|idly",
    dosa: "dosa|dosas|plain dosa|sada dosa",
    masaladosa: "masala dosa",
    uttapam: "uttapam|uttappa",
    meduvada: "medu vada|vada|wada|medu wada",
    sambar: "sambar|sambhar",
    biryani: "biryani|chicken biryani|biriyani",
    sabzi: "sabzi|sabji|bhaji|vegetable|vegetables|veg|subzi|bhindi|gobi|cabbage sabzi",
    aloo: "aloo sabzi|aloo|potato sabzi|batata bhaji",
    salad: "salad|cucumber|carrot|kakdi|gajar",
    banana: "banana|bananas|kela",
    apple: "apple|apples|seb",
    guava: "guava|peru|amrood",
    orange: "orange|oranges|santra|mosambi",
    papaya: "papaya|papita",
    chana: "roasted chana|chana|chane|futana",
    peanuts: "peanuts|peanut|shengdana|moongphali|groundnuts",
    almonds: "almonds|almond|badam",
    pb: "peanut butter|pb",
    makhana: "makhana|fox nuts|lotus seeds",
    oil: "oil|tsp oil|cooking oil",
    ghee: "ghee|tup",
    butter: "butter|amul butter",
    jam: "jam",
    chai: "chai|tea|cutting chai|cutting",
    chaiplain: "chai without sugar|sugarless tea|tea without sugar|sugar free chai",
    biscuit: "biscuit|biscuits|marie|parle g|parle-g",
    bhel: "bhel|bhel puri|bhelpuri",
    samosa: "samosa|samosas",
    vadapav: "vada pav|vadapav|wada pav",
    pavbhaji: "pav bhaji|pavbhaji",
    chips: "chips|wafers|lays|kurkure",
    namkeen: "namkeen|sev|farsan|chivda|mixture|bhujia",
    shrikhand: "shrikhand|amrakhand",
    cola: "cola|coke|pepsi|thums up|soft drink|sprite|cold drink|soda",
    colazero: "coke zero|diet coke|zero sugar|diet cola",
    coconut: "coconut water|nariyal pani|tender coconut",
    eggcurry: "egg curry|anda curry",
    eggsandwich: "egg sandwich",
    chickentikka: "chicken tikka|tikka",
    tandoori: "tandoori chicken|tandoori|chicken leg",
    butterchicken: "butter chicken|murgh makhani",
    keema: "keema|kheema|chicken keema",
    mutton: "mutton|mutton curry|lamb|goat",
    chickenroll: "chicken roll|kathi roll|frankie|chicken frankie",
    shawarma: "shawarma|shawrma",
    momo: "momo|momos",
    paneerbhurji: "paneer bhurji",
    palakpaneer: "palak paneer",
    paneerbm: "paneer butter masala|paneer masala|shahi paneer|kadai paneer|paneer sabzi",
    tofu: "tofu|soya paneer",
    hungcurd: "hung curd|greek yogurt|greek yoghurt",
    cheese: "cheese|cheese slice",
    soyamilk: "soya milk|soy milk",
    sprouts: "sprouts|moong sprouts|matki|sprouted moong",
    besanchilla: "besan chilla|chilla|cheela|besan cheela",
    moongchilla: "moong chilla|moong dal chilla|moong cheela",
    sattu: "sattu",
    proteinbar: "protein bar",
    thepla: "thepla|theple",
    puri: "puri|poori|puris",
    naan: "naan|butter naan|kulcha",
    pulao: "pulao|pulav|veg pulao",
    friedrice: "fried rice|veg fried rice",
    eggrice: "egg fried rice|egg rice",
    khichdi: "khichdi|khichadi|dal khichdi",
    curdrice: "curd rice|dahi bhaat|dahi rice",
    dalia: "dalia|daliya|broken wheat|lapsi",
    cornflakes: "cornflakes|corn flakes",
    muesli: "muesli|granola",
    sabudana: "sabudana|sabudana khichdi|sago",
    misal: "misal|misal pav",
    dabeli: "dabeli",
    panipuri: "pani puri|panipuri|golgappa|gol gappa|puchka",
    sevpuri: "sev puri|sevpuri|dahi puri",
    dhokla: "dhokla|khaman",
    kachori: "kachori",
    pakora: "pakora|pakoda|bhajiya|bhaji pav|bhajji|kanda bhaji",
    fries: "fries|french fries",
    burger: "burger|veg burger|aloo tikki burger",
    chickenburger: "chicken burger|zinger",
    pizza: "pizza|pizza slice|slice of pizza",
    noodles: "noodles|hakka noodles|chowmein|chow mein",
    maggi: "maggi|instant noodles|yippee",
    sandwich: "sandwich|veg sandwich",
    potato: "boiled potato|potato|batata",
    sweetpotato: "sweet potato|ratalu|shakarkandi",
    corn: "corn|sweet corn|bhutta",
    mango: "mango|aam|amba",
    watermelon: "watermelon|tarbooj|kalingad",
    grapes: "grapes|angoor",
    pomegranate: "pomegranate|anar",
    dates: "dates|khajoor|khajur",
    walnuts: "walnuts|walnut|akhrot",
    flax: "flax|alsi|flax seeds|flaxseed",
    chikki: "chikki",
    sugar: "sugar|tsp sugar",
    jaggery: "jaggery|gur|gul",
    honey: "honey",
    coffee: "coffee|milk coffee",
    blackcoffee: "black coffee|green tea|black tea",
    juice: "juice|fruit juice|real juice",
    sugarcane: "sugarcane|sugarcane juice|ganne ka ras",
    nimbu: "nimbu pani|lemonade|lemon water|limbu pani",
    gulabjamun: "gulab jamun|gulabjamun",
    jalebi: "jalebi",
    ladoo: "ladoo|laddu|ladu",
    rasgulla: "rasgulla|rosogolla",
    kheer: "kheer|payasam",
    icecream: "ice cream|icecream|kulfi",
    chocolate: "chocolate|dairy milk|cadbury",
    cake: "cake|pastry",
    beer: "beer",
    spirits: "whisky|whiskey|rum|vodka|peg|gin"
  };
  var FOODS = F.map(function (r) {
    return {
      id: r[0],
      n: r[1],
      u: r[2],
      q: r[3],
      k: r[4],
      p: r[5],
      c: r[6],
      f: r[7],
      fb: r[8],
      a: ALIAS[r[0]] ? ALIAS[r[0]].split("|") : []
    };
  });

  var MEALS = [
    { id: "pre", n: "Pre-workout", t: "5:05 AM", plan: [["banana", 1]] },
    {
      id: "bf",
      n: "Breakfast",
      t: "7:05 AM",
      plan: [
        ["oats", 1],
        ["milk", 1],
        ["egg", 3],
        ["eggwhite", 2],
        ["oil", 1]
      ]
    },
    {
      id: "lunch",
      n: "Lunch",
      t: "1:00 PM",
      plan: [
        ["chapati", 3],
        ["soya", 4],
        ["oil", 1],
        ["dahi", 1.5],
        ["sabzi", 1]
      ]
    },
    {
      id: "snack",
      n: "Snack",
      t: "4:30 PM",
      plan: [
        ["chana", 1],
        ["peanuts", 1],
        ["salad", 1],
        ["guava", 1]
      ]
    },
    {
      id: "dinner",
      n: "Dinner",
      t: "8:30 PM",
      plan: [
        ["chicken", 1.5],
        ["oil", 1],
        ["rice", 1.5],
        ["dal", 1],
        ["sabzi", 1]
      ]
    }
  ];

  // quick ideas used by the offline coach: [text, kcal, protein]
  var IDEAS = [
    ["150 g chicken breast (raw weight) + 1 tsp oil", 225, 34],
    ["3 boiled eggs + 2 egg whites", 250, 26],
    ["40 g soya chunks curry + 1 chapati", 285, 24],
    ["4-egg bhurji with 1 tsp oil", 330, 25],
    ["250 ml milk + 40 g roasted chana", 295, 15],
    ["200 g dahi + 1 banana", 225, 8],
    ["150 g fish curry + 100 g rice", 330, 30],
    ["2 chapati + 1 katori dal + sabzi", 420, 17],
    ["40 g roasted chana + 15 g peanuts", 235, 11],
    ["2 egg whites + 1 whole egg omelette", 150, 13]
  ];

  var TIMETABLE = [
    ["05:00", "Wake up", "500 ml water + 1 banana. Weigh in. Gym clothes ready from last night."],
    ["05:15", "Leave for the gym", ""],
    ["05:30", "Warm-up, 8 min", "General drills, then two or three for today's muscles.", 1],
    ["05:38", "Strength, 35–40 min", "Five to seven exercises. The app times your rests.", 1],
    ["06:15", "Finisher, 6–10 min", "A timed circuit, sprints or a carry: this is the fitness part.", 1],
    ["06:25", "Cool-down, 5 min", "Stretch what you trained while it is warm.", 1],
    ["06:50", "Home, shower", ""],
    ["07:05", "Breakfast", "Oats in milk + 3 eggs + 2 whites. Biggest protein hit of the day."],
    ["07:25", "Pack tiffin", "Lunch, 4:30 snack, 1 L water bottle."],
    ["07:40", "Leave for work", "Walk where you can, take the stairs. 10,000 steps is the target."],
    ["13:00", "Lunch", "Chapati, soya curry, dahi, sabzi. A 10-minute walk after."],
    [
      "16:30",
      "Snack",
      "Roasted chana, peanuts, cucumber-carrot, fruit. This stops the evening chips craving."
    ],
    ["19:00", "Home, steps check", "If steps are short, walk 15–20 minutes before or after dinner."],
    ["20:30", "Dinner", "Chicken (or eggs / fish), rice, dal, sabzi. Finish by 9."],
    ["21:30", "Wind down", "Phone away. Pack the gym bag. Fill the water bottle."],
    ["22:00", "Sleep", "Lights out at 10 gives you seven hours before the 5:00 alarm."]
  ];

  var MICROS = [
    [
      "Calcium · 1,000 mg a day",
      "Milk, dahi, ragi, paneer, til (sesame), methi, palak",
      "The adult allowance in India (ICMR 2020). A glass of milk has about 300 mg; two servings of milk or curd plus ragi or til gets most people close."
    ],
    [
      "Vitamin D · 600 IU a day",
      "Sun on arms and face, egg yolks, fish",
      "A common gap in India, especially for people who work indoors. Midday sun on arms and face a few times a week helps. Ask a doctor about a 25-OH vitamin D test; supplement only on medical advice."
    ],
    [
      "Vitamin B12",
      "Eggs, milk, dahi, chicken, fish",
      "Comes almost only from animal foods. Vegetarians and vegans: ask a doctor about a B12 test."
    ],
    [
      "Iron · 19 mg men, 29 mg women",
      "Chicken, eggs, soya, chana, dal, palak, ragi",
      "Squeeze lemon on dal and greens to absorb more; keep tea and coffee away from meals."
    ],
    [
      "Zinc",
      "Chicken, eggs, chana, peanuts, pumpkin seeds",
      "Pulses, nuts and whole grains cover most needs."
    ],
    ["Magnesium", "Peanuts, chana, oats, dal, banana, greens", "Whole grains and pulses cover most needs."],
    [
      "Potassium",
      "Banana, dal, dahi, potato with skin, coconut water",
      "Fruit and vegetables every day cover it."
    ],
    [
      "Vitamin C · 80 mg men, 65 mg women",
      "Guava, amla, orange, lemon, tomato, capsicum",
      "One guava or amla covers a day."
    ],
    [
      "Vitamin A, folate",
      "Carrot, papaya, pumpkin, palak, methi, dal, eggs",
      "A daily carrot and a green sabzi cover both."
    ],
    ["Omega-3", "Bangda, mathi, 1 tbsp alsi (flax), mustard oil", "Fish once a week, or 1 tbsp alsi daily."]
  ];

  // [item, unit, monthly quantity, price per unit (rough), home staple 0/1, tag: egg and chk scale with chicken dinners]
  var BUDGET = [
    ["Eggs", "eggs", 150, 7, 0, "egg"],
    ["Toned milk (drinking + oats + dahi)", "L", 12, 56, 0, "milk"],
    ["Chicken breast", "kg", 0, 320, 0, "chk"],
    ["Soya chunks", "kg", 1.2, 200, 0, ""],
    ["Rolled oats", "kg", 1.5, 190, 0, ""],
    ["Roasted chana", "kg", 1.2, 150, 0, ""],
    ["Peanuts", "kg", 0.45, 150, 0, ""],
    ["Bananas", "pcs", 30, 6, 0, ""],
    ["Seasonal fruit", "kg", 3, 80, 0, ""],
    ["Cucumber + carrot", "kg", 4.5, 40, 0, ""],
    ["Atta", "kg", 2.7, 50, 1, ""],
    ["Rice", "kg", 1.5, 60, 1, ""],
    ["Dal", "kg", 0.9, 140, 1, ""],
    ["Vegetables for sabzi", "kg", 9, 40, 1, ""],
    ["Cooking oil", "L", 0.75, 170, 1, ""]
  ];

  // Form videos, one per exercise: [YouTube video id, title]. The app only embeds or links them.
  var VID = {
    bench: ["CayG6UYqL8g", "How to do a Barbell Bench Press"],
    incdb: ["sh5ZsRpEZCw", "How to Do the Incline Dumbbell Bench Press"],
    mcp: ["B-zyH8OTlsg", "Machine Chest Press: How To"],
    pec: ["ze4JaQCcGLg", "HOW TO: Pec Deck (AKA: Chest Fly Machine)"],
    lpd: ["AKl1em_pH_c", "How to Do the Lat Pulldown Correctly"],
    scr: ["lJoozxC0Rns", "How To Do A Seated Cable Row"],
    csr: ["2DzwJwr_t4M", "How to: Dumbbell Incline Chest Supported Row"],
    sap: ["r34PR1mxzmU", "Straight-Arm Pulldown - Back Exercise"],
    sdp: ["WKEl69bIGus", "How to Do the Seated Dumbbell Shoulder Press"],
    lat: ["XPPfnSEATJA", "How to do a Dumbbell Lateral Raise"],
    rpd: ["5OI1CFf1oc8", "How To Do A Rear Delt Fly"],
    fp: ["eTCBSFlCJ_s", "How to do a Face Pull"],
    gb: ["KI6fjDqGZh4", "Glute Bridge: How To (3 steps to proper form)"],
    hc: ["SjqyLjxSlCY", "How To Do A Seated Leg Curl"],
    cr: ["6O5hh1rBtx8", "How to PROPERLY Calf Raise (SEATED CALF RAISE TIPS)"],
    ha: ["5O_Y9l__iao", "Seated Hip Abduction Machine: How To"],
    ez: ["rL_5SVxXRm4", "How to do EZ Bar Curl"],
    idc: ["0dT4L6Lsi80", "How to do a Incline Dumbbell Curl"],
    pc: ["e7X6G07KnPI", "EZ-Bar Preacher Curl"],
    hm: ["nL3SedGG7X0", "How to do a Dumbbell Hammer Curl"],
    rp: ["d-ySLTHUgQA", "Rope Tricep Pushdowns (Tutorial + Tips)"],
    oce: ["AUsSlsBu5eg", "Overhead Rope Tricep Extensions (How To)"],
    rgp: ["s_zVDdBEfYA", "Reverse Grip Triceps Pushdown"],
    sace: ["WrrH4FugqyA", "How to Perfect the Single Arm Tricep Cable Extension"],
    pl: ["mH5Sfb_KTGg", "How to do a Forearm Plank"],
    db: ["bxn9FBrt4-A", "How to do a Dead Bug"],
    pp: ["HXrLaqNIkTs", "How To Do A Pallof Press"],
    scc: ["ij3lWMnoFzA", "How To Do: Cable Crunch - Standing"],
    gsq: ["3O77G_yiFUw", "Goblet Squat: How To"],
    lpr: ["P-FZknD_DxM", "Leg Press: Machine Workout Proper Form and Technique"],
    rdl: ["2bmuYtv4HbQ", "How to do a Romanian Deadlift"],
    lng: ["pT7K8D8SLk4", "How To Do a Forward Lunge with Dumbbells"],
    lext: ["xAUvXdHu1sI", "How to do the LEG EXTENSION properly (in just 80 seconds)"],
    pu: ["WDIpL0pjun0", "How to do a Push-Up"],
    chin: ["53kV7Ou7oZo", "How to Do Chin Ups"],
    kbs: ["6A0yJetx7hg", "How To Do A Kettlebell Swing Correctly"],
    hlr: ["O7iDA3ory-w", "How To Do Hanging Knee Raises"],
    cru: ["iZ-CWW-hZRA", "How to Perform Crunches Properly"],
    bic: ["1we3bh9uhqY", "How to do a Bicycle Crunch"],
    rtw: ["99T1EfpMwPA", "How To Do A Russian Twist"],
    spl: ["44ND4bOB-T0", "How to do a Side Plank"],
    fwk: ["VBobkldqqvk", "How To Do The FARMER'S WALK Correctly"]
  };

  var SOURCES = [
    [
      "Exercise photos",
      "Free Exercise DB by yuhonas — public-domain (Unlicense) dataset of 800+ exercises",
      "https://github.com/yuhonas/free-exercise-db"
    ],
    [
      "Form videos",
      "Played from YouTube. Each video belongs to its uploader; the app links to it and keeps no copy.",
      "https://www.youtube.com/"
    ],
    [
      "Sleep and fat loss",
      "Nedeltcheva et al., Annals of Internal Medicine 2010: with 5.5 h vs 8.5 h in bed during a diet, far less of the weight lost was fat",
      "https://pubmed.ncbi.nlm.nih.gov/20921542/"
    ],
    [
      "Protein and lifting",
      "Morton et al., British Journal of Sports Medicine 2018: gains from extra protein level off around 1.6 g per kg per day",
      "https://pubmed.ncbi.nlm.nih.gov/28698222/"
    ],
    [
      "Indian nutrient targets",
      "ICMR-NIN 2020 Recommended Dietary Allowances: calcium 1,000 mg/day for adults; protein RDA 0.83 g/kg/day for sedentary adults",
      "https://www.nin.res.in/rdabook/brief_note.pdf"
    ],
    [
      "Calorie estimate",
      "Mifflin–St Jeor equation for resting energy, multiplied by a factor for your day and your training days. An estimate; after four weeks of logging, Stats measures what you really burn.",
      ""
    ],
    [
      "Training frequency and volume",
      "American College of Sports Medicine position stand 2026, an overview of 137 systematic reviews: train every major muscle group at least twice a week; around ten or more sets per muscle a week for size; turning up consistently matters more than the exact plan.",
      "https://www.eurekalert.org/news-releases/1119943"
    ],
    [
      "Twice a week or once",
      "Schoenfeld et al., Sports Medicine 2016: with the weekly work kept equal, training a muscle twice a week grew it more than once a week.",
      "https://pubmed.ncbi.nlm.nih.gov/27102172/"
    ],
    [
      "Activity for health",
      "World Health Organization guidelines 2020: adults need 150–300 minutes of moderate activity a week, plus muscle-strengthening work on two or more days.",
      "https://www.who.int/initiatives/behealthy/physical-activity"
    ],
    [
      "Protein targets",
      "International Society of Sports Nutrition position stand 2017: 1.4–2.0 g per kg a day suits most people who train; more can help hold on to muscle during a calorie cut.",
      "https://pubmed.ncbi.nlm.nih.gov/28642676/"
    ],
    [
      "Safe rate of loss",
      "U.S. Centers for Disease Control and Prevention: a gradual loss of about 0.5–1 kg a week is more likely to stay off. Helms et al. 2014 advise 0.5–1% of body weight a week to protect muscle.",
      "https://www.cdc.gov/healthyweight/losing_weight/index.html"
    ],
    [
      "Lowest calorie targets",
      "Harvard Health Publishing: not below 1,200 kcal a day for women or 1,500 for men without professional supervision.",
      ""
    ],
    [
      "Rate of gain",
      "Iraki et al., Sports 2019: a 10–20% calorie surplus and about 0.25–0.5% of body weight a week for newer lifters, slower for experienced ones.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6680710/"
    ],
    [
      "Split or full body",
      "Ramos-Campo et al., Journal of Strength and Conditioning Research 2024, 14 studies: split and full-body routines built the same strength and muscle when the weekly sets were equal. Pick the split you enjoy.",
      "https://pubmed.ncbi.nlm.nih.gov/38595233/"
    ],
    [
      "Sets per muscle per week",
      "Pelland et al., Sports Medicine 2026, 67 studies and 2,058 people: more weekly sets build more muscle with smaller returns each time; about 4 sets a week is the least with a measurable effect. Sets where a muscle only helps count as half.",
      "https://sportrxiv.org/index.php/server/preprint/view/460"
    ],
    [
      "Starting small",
      "Behm et al., Sports Medicine 2024: beginners gain strength from very little training in the first 8 to 12 weeks, then need to do more.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10933173/"
    ],
    [
      "Rest between sets",
      "Singer et al., Frontiers in Sports and Active Living 2024: rests longer than 60 seconds build slightly more muscle; beyond about 90 seconds there is no further gain for size.",
      "https://pubmed.ncbi.nlm.nih.gov/39205815/"
    ],
    [
      "How hard to push a set",
      "Robinson et al., Sports Medicine 2024: stopping closer to failure matters for muscle size more than for strength. Beginners can stop with a few reps left and still progress.",
      "https://sportrxiv.org/index.php/server/preprint/view/295"
    ],
    [
      "Protein per meal",
      "Schoenfeld and Aragon, Journal of the International Society of Sports Nutrition 2018: about 0.4 g of protein per kg of body weight per meal, over at least four meals, to reach 1.6 g per kg a day.",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC5828430/"
    ],
    [
      "Indian plate",
      "ICMR-National Institute of Nutrition, Dietary Guidelines for Indians 2024: half the plate vegetables and fruit, cereals no more than 45% of calories, pulses, eggs and meat about 15%, sugar under 5%, salt under 5 g a day, protein from food rather than supplements.",
      "https://main.icmr.nic.in/sites/default/files/upload_documents/DGI_07th_May_2024_fin.pdf"
    ],
    [
      "Eating slowly",
      "Robinson et al., American Journal of Clinical Nutrition 2014, 22 studies: eating more slowly lowered how much people ate, without leaving them hungrier afterwards.",
      "https://pubmed.ncbi.nlm.nih.gov/24847856/"
    ],
    [
      "BMI ranges",
      "World Health Organization: 18.5–24.9 is the healthy range. Consensus statement for Asian Indians (Misra et al. 2009): overweight from 23, obesity from 25.",
      ""
    ],
    [
      "Coach: general knowledge",
      "Wikipedia, the free encyclopedia. Text under CC BY-SA 4.0; the coach quotes short passages and links the article.",
      "https://en.wikipedia.org/"
    ],
    [
      "Coach: health topics",
      "Information from MedlinePlus.gov, U.S. National Library of Medicine. MedlinePlus does not endorse this app.",
      "https://medlineplus.gov/"
    ],
    [
      "Packaged-food search",
      "Open Food Facts, a free open database of food products (Open Database License).",
      "https://world.openfoodfacts.org/"
    ]
  ];
  var APP = { name: "ZENKAI", ver: "6.2.1", by: "Atharva Sail" };
  // [id, default time, title, text]
  var REM = [
    [
      "wake",
      "05:00",
      "Time to move",
      "Feet on the floor. Water, banana, gym clothes. The hard part is the first two minutes."
    ],
    ["weigh", "05:05", "Weigh in", "After the toilet, before water or food. It takes ten seconds."],
    ["bf", "07:05", "Breakfast", "Your biggest protein meal: oats, milk and eggs. Log it in one tap."],
    ["water1", "11:00", "Water check", "Aim to have a litre down by now."],
    ["lunch", "13:00", "Lunch", "Chapati, soya, dahi, sabzi. Protein first."],
    ["snack", "16:30", "Snack on time", "Chana, peanuts and fruit now stops the evening chips craving."],
    ["steps", "19:00", "Steps check", "Short of your target? A 15-minute walk fixes it."],
    ["dinner", "20:30", "Dinner", "Chicken or eggs, rice, dal, sabzi. Finish by 9 and log it."],
    ["bed", "21:30", "Wind down", "Pack the gym bag, fill the bottle, phone away. Lights out by 10."]
  ];

  return {
    APP: APP,
    REM: REM,
    PLATE: PLATE,
    DOW: DOW,
    PLANS: PLANS,
    PLAN_INFO: PLAN_INFO,
    FIN: FIN,
    COOL: COOL,
    SPLIT: SPLIT,
    WARM: WARM,
    EX: EX,
    VID: VID,
    FOODS: FOODS,
    MEALS: MEALS,
    IDEAS: IDEAS,
    TIMETABLE: TIMETABLE,
    MICROS: MICROS,
    BUDGET: BUDGET,
    SOURCES: SOURCES
  };
})();
