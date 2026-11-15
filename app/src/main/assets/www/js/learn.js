/**
 * ZENKAI — muscle and injury knowledge
 *
 * Adds to SZD: MUSCLES (what each muscle does and how to train it), EXM (the muscles each
 * exercise works, main one first), RULES (habits that prevent injuries), PAIN (normal soreness
 * versus a reason to stop) and JOINTS. General education, not a diagnosis.
 *
 * Author: Atharva Sail
 */
(function () {
  "use strict";
  var D = window.SZD;

  D.MUSCLES = [
    {
      id: "chest",
      n: "Chest",
      sci: "Pectoralis major and minor",
      job: "Pushes the arms forward and brings them across the body. Used in every press and fly.",
      hurt: "Pec strains and tears almost always happen on a heavy bench press when the bar is lowered fast or bounced. Front-of-shoulder pain comes from flared elbows and shoulders rolling forward.",
      protect: [
        "Keep shoulder blades squeezed back and down on every press.",
        "Lower the weight for 2–3 seconds; never bounce.",
        "Elbows 45–60° from the body, not straight out.",
        "On flies, stop when the hands are level with the shoulders.",
        "Do as much pulling as pushing across the week, so the shoulders do not round forward."
      ],
      warn: "Sudden sharp pain or a tearing feeling near the armpit, bruising on the chest or upper arm, or a change in the shape of the chest: stop and see a doctor the same day.",
      rec: "48–72 hours before training it hard again."
    },
    {
      id: "delts",
      n: "Shoulders: front and side",
      sci: "Anterior and lateral deltoid",
      job: "Lift the arm forward and out to the side, and steady every press.",
      hurt: "The shoulder is the most mobile and least stable joint in the body. A pinch at the top of the shoulder (impingement) builds up from pressing with flared elbows, raising above shoulder height, and too much pressing with too little rear-shoulder work.",
      protect: [
        "Press with the elbows slightly in front of the body, not straight out to the sides.",
        "Lateral raises stop at shoulder height; lead with the elbows; keep the weight light.",
        "Front delts already work on chest day, so they need no extra front raises.",
        "Never press or pull behind the neck.",
        "Warm up with band pull-aparts and external rotations."
      ],
      warn: "Pinching pain at the top or front of the shoulder when lifting the arm, pain lying on that side at night, or clicking with pain. Cut range and load for 1–2 weeks; see a physio if it stays.",
      rec: "48 hours. Shoulders also work on chest and back days, so keep shoulder day moderate."
    },
    {
      id: "rdelts",
      n: "Rear delts",
      sci: "Posterior deltoid",
      job: "Pull the arm backward and rotate it outward. They balance the front of the shoulder and hold good posture.",
      hurt: "Rarely injured, usually just neglected. Weak rear delts let the shoulder roll forward, which sets up pinching pain and neck tension over the years.",
      protect: [
        "Train them every week: reverse pec deck and face pulls.",
        "Light weight, 12–15 reps; feel the back of the shoulder, not the traps.",
        "Do not shrug or squeeze the shoulder blades hard on these moves."
      ],
      warn: "None specific. If you cannot feel them working, the weight is too heavy.",
      rec: "They recover fast: 24–48 hours."
    },
    {
      id: "cuff",
      n: "Rotator cuff",
      sci: "Supraspinatus, infraspinatus, teres minor, subscapularis",
      job: "Four small muscles that hold the ball of the upper arm in the shoulder socket while the big muscles move it.",
      hurt: "Wear builds slowly from years of heavy pressing with poor shoulder-blade control, sudden jerks and skipped warm-ups. Problems are far more common later in life in people who ignored early pinching pain.",
      protect: [
        "Band external rotations, 2 × 12–15, before chest and shoulder days.",
        "Face pulls every week.",
        "No jerking and no half-controlled heavy reps.",
        "Keep at least as many pulling sets as pressing sets in the week."
      ],
      warn: "Deep ache in the shoulder at night, weakness lifting the arm out to the side, or pain reaching behind the back. See a physio early; cuff problems respond well when caught early.",
      rec: "These are endurance muscles. Train them light and often, never to failure."
    },
    {
      id: "traps",
      n: "Traps",
      sci: "Trapezius: upper, middle and lower",
      job: "Move and steady the shoulder blades: shrug up (upper), squeeze together (middle), pull down (lower).",
      hurt: "Upper traps get tight and overworked from shrugging during curls, raises and rows, and from desk posture. It shows up as neck stiffness and headaches.",
      protect: [
        "Keep the shoulders down, away from the ears, in every exercise.",
        "Rows and face pulls train the middle and lower traps, which most people lack.",
        "Change sitting position often at work; stand up every hour."
      ],
      warn: "Neck pain that travels down the arm, or numbness and tingling in the hand, is a nerve sign: see a doctor.",
      rec: "48 hours."
    },
    {
      id: "midback",
      n: "Middle back",
      sci: "Rhomboids and middle trapezius",
      job: "Squeeze the shoulder blades together. They hold your posture upright and give the shoulder a stable base for pressing.",
      hurt: "Seldom injured directly; strained by jerky rows with a rounded upper back.",
      protect: [
        "Pause and squeeze for one second on every row.",
        "Chest-supported rows take the lower back out of the lift.",
        "Control the stretch at the front; do not let the weight yank you forward."
      ],
      warn: "Sharp pain between the shoulder blades when breathing in deeply: rest it for a few days and see a doctor if it does not ease.",
      rec: "48–72 hours."
    },
    {
      id: "lats",
      n: "Lats",
      sci: "Latissimus dorsi and teres major",
      job: "Pull the arms down and back. The widest muscle of the back; it gives the V shape.",
      hurt: "Strains come from swinging pulldowns. Shoulder irritation comes from pulling the bar behind the neck.",
      protect: [
        "Pull the shoulders down first, then bend the elbows.",
        "Bar to the upper chest, never behind the neck.",
        "Let the arms straighten fully, under control, at the top.",
        "Use a weight you can hold for a one-second squeeze."
      ],
      warn: "Sharp pain under the armpit or at the side of the back during a pull.",
      rec: "48–72 hours."
    },
    {
      id: "lowback",
      n: "Lower back",
      sci: "Erector spinae, multifidus, quadratus lumborum",
      job: "Hold the spine steady while the arms and legs move. In this plan they work as stabilisers in rows, curls and standing cable work.",
      hurt: "Most gym back injuries come from lifting with a rounded lower back, twisting under load, or swinging weights when tired. Long sitting stiffens it.",
      protect: [
        "Keep a neutral spine: ribs down, slight natural arch, no rounding.",
        "Brace the stomach before each rep, as if about to be poked.",
        "Pick dumbbells up from a rack or bench, not from the floor with a rounded back.",
        "Dead bugs, planks and Pallof presses build the support around it.",
        "Glute bridges strengthen the hips, which takes load off the back."
      ],
      warn: "Pain that shoots down a leg, numbness or tingling in the leg or foot, or weakness in a leg: stop training and see a doctor. Loss of bladder or bowel control, or numbness between the legs, is an emergency.",
      rec: "72 hours after heavy work."
    },
    {
      id: "biceps",
      n: "Biceps",
      sci: "Biceps brachii, brachialis, brachioradialis",
      job: "Bend the elbow and turn the palm up. They help in every pull and row.",
      hurt: "The tendon at the elbow is strained by dropping the weight fast at the bottom of a curl, especially on the preacher bench, and by swinging heavy curls. Front-of-shoulder tendon pain comes from the elbows drifting forward under load.",
      protect: [
        "Lower every curl for 2–3 seconds; never drop into the stretch.",
        "Stop preacher curls just short of locked out.",
        "Elbows stay by your sides.",
        "Biceps already work on back day, so 12 sets on Friday is plenty."
      ],
      warn: "A sudden pop at the elbow or shoulder with bruising, or a new bulge in the upper arm: see a doctor quickly.",
      rec: "48 hours."
    },
    {
      id: "triceps",
      n: "Triceps",
      sci: "Triceps brachii: long, lateral and medial heads",
      job: "Straighten the elbow. About two thirds of upper-arm size, and the lockout of every press.",
      hurt: "Pain at the back of the elbow builds from very heavy extensions, snapping the elbows straight, and too many overhead sets with flared elbows.",
      protect: [
        "Keep the elbows pinned and pointing the same way through the whole rep.",
        "Straighten the arm smoothly; do not snap the lockout.",
        "Ropes and cables are kinder to elbows than heavy free-weight extensions.",
        "If the elbow aches, use lighter weight for 15–20 reps for two weeks."
      ],
      warn: "Pain at the point of the elbow that lingers after training or hurts when you lean on it.",
      rec: "48 hours. They also work on chest and shoulder days."
    },
    {
      id: "forearms",
      n: "Forearms and grip",
      sci: "Wrist flexors and extensors",
      job: "Close the hand and control the wrist. Your grip is the link to every bar and dumbbell.",
      hurt: "Inner-elbow pain (golfer's elbow) and outer-elbow pain (tennis elbow) are overuse problems from gripping too hard, bent wrists during curls and pushdowns, and sudden jumps in pulling volume.",
      protect: [
        "Keep the wrists straight, in line with the forearm, on curls and pushdowns.",
        "Grip firmly, not with a death squeeze.",
        "The EZ bar and palms-in grips reduce elbow stress.",
        "Add pulling and curling volume slowly."
      ],
      warn: "Ache on the inner or outer elbow bone when gripping, lifting a kettle or shaking hands. Drop the painful exercises for 1–2 weeks and return lighter; see a physio if it lasts beyond 3–4 weeks.",
      rec: "48 hours."
    },
    {
      id: "abs",
      n: "Abs",
      sci: "Rectus abdominis, transverse abdominis",
      job: "Bend the trunk forward and, more importantly, brace the spine so force passes safely between the upper and lower body.",
      hurt: "Neck strain from pulling on the head during crunches; lower-back ache from leg raises and sit-ups done with an arched back.",
      protect: [
        "Train bracing first: planks and dead bugs with the lower back flat.",
        "On crunches, curl the ribs towards the hips; hands stay light.",
        "Breathe out as you crunch.",
        "Abs show when body fat drops; hundreds of reps do not burn belly fat."
      ],
      warn: "A bulge near the navel or groin that appears when you strain may be a hernia: see a doctor.",
      rec: "24–48 hours."
    },
    {
      id: "obliques",
      n: "Obliques",
      sci: "Internal and external obliques",
      job: "Rotate and side-bend the trunk, and resist rotation so the spine stays safe when one side is loaded.",
      hurt: "Side strains from fast, loaded twisting.",
      protect: [
        "Train them to resist twisting: Pallof press, side plank.",
        "Avoid fast weighted twists.",
        "Carry bags on alternate sides."
      ],
      warn: "Sharp pain in the side of the waist on twisting or coughing.",
      rec: "48 hours."
    },
    {
      id: "glutes",
      n: "Glutes",
      sci: "Gluteus maximus",
      job: "Straighten the hip: standing up, climbing stairs, walking uphill. The largest muscle in the body.",
      hurt: "Rarely injured. Weak glutes are the real problem: the lower back and knees take the load instead.",
      protect: [
        "Glute bridges every leg day; squeeze for two seconds at the top.",
        "Push through the heels, ribs down, no lower-back arch.",
        "Walk daily: 10,000 steps keeps them working."
      ],
      warn: "Deep buttock pain that travels down the back of the leg can be nerve irritation: see a doctor if it lasts more than a week.",
      rec: "48–72 hours."
    },
    {
      id: "hipab",
      n: "Side of the hip",
      sci: "Gluteus medius and minimus",
      job: "Keep the pelvis level and stop the knee caving inward when you stand on one leg, walk or climb stairs.",
      hurt: "Weakness, not injury, is the usual issue. When these are weak the knee drifts inward on squats and stairs.",
      protect: [
        "Hip abduction work every week, slow and controlled.",
        "Side-lying leg raises at home on rest days: 2 × 15 each side.",
        "On stairs, keep the knee over the second toe."
      ],
      warn: "Pain on the outside of the hip when lying on that side.",
      rec: "24–48 hours."
    },
    {
      id: "hipfl",
      n: "Hip flexors and inner thigh",
      sci: "Iliopsoas, rectus femoris, adductors",
      job: "Lift the knee and bring the legs together. They steady the pelvis when you walk.",
      hurt: "Sitting six days a week shortens the hip flexors, which tilts the pelvis and loads the lower back. Groin strains come from sudden side steps or wide stretches done cold.",
      protect: [
        "Stand up and walk for two minutes every hour at work.",
        "Hip-flexor stretch after training: 2 × 30 seconds each side.",
        "Never stretch hard when cold."
      ],
      warn: "Sharp groin pain when squeezing the knees together.",
      rec: "48 hours."
    },
    {
      id: "quads",
      n: "Quadriceps",
      sci: "Rectus femoris and the three vastus muscles",
      job: "Straighten the knee and control the kneecap. The inner part (vastus medialis) helps hold the kneecap in its groove.",
      hurt: "Front-of-knee pain builds from sudden jumps in volume, knees caving inward, and bouncing out of the bottom of a squat.",
      protect: [
        "Add leg work gradually: start light and add a little each week.",
        "Knees track over the second toe on every squat, press and lunge.",
        "Control the lowering. No bouncing at the bottom.",
        "Warm up with bodyweight squats before loading."
      ],
      warn: "The kneecap shifting or giving way, swelling within hours, locking, or being unable to straighten the knee: see an orthopaedic doctor.",
      rec: "72 hours."
    },
    {
      id: "hams",
      n: "Hamstrings",
      sci: "Biceps femoris, semitendinosus, semimembranosus",
      job: "Bend the knee and straighten the hip. They also stop the shin sliding forward, which supports the knee ligaments.",
      hurt: "Strains happen in sprinting and in fast, heavy curls. Cramps happen when they are weak, tired or dehydrated.",
      protect: [
        "Curl slowly and return even slower; stop just short of a straight knee.",
        "Start light and add weight in small steps.",
        "Drink enough water; a cramp in a curl usually means fatigue or dehydration."
      ],
      warn: "Sudden sharp pain or a pop at the back of the thigh, with bruising a day later.",
      rec: "72 hours."
    },
    {
      id: "calves",
      n: "Calves",
      sci: "Gastrocnemius, soleus, Achilles tendon",
      job: "Push off the ground in every step and absorb landing forces. They pump blood back up from the legs.",
      hurt: "Achilles tendon pain builds from bouncing reps and sudden increases in walking or incline. Calf strains come from explosive push-offs.",
      protect: [
        "Full range, slow: two seconds up, pause, three seconds down.",
        "No bouncing at the bottom.",
        "Add incline walking gradually.",
        "Wear shoes with a firm heel for training and long walks."
      ],
      warn: "Pain or stiffness in the Achilles in the morning. A sudden snap at the back of the ankle is an emergency.",
      rec: "48 hours."
    },
    {
      id: "neck",
      n: "Neck",
      sci: "Deep neck flexors, upper trapezius, levator scapulae",
      job: "Hold and turn the head.",
      hurt: "Strained by pushing the head forward on presses and pulldowns, pulling on the head in crunches, and looking up in planks.",
      protect: [
        "Keep the neck in line with the spine in every lift, chin slightly tucked.",
        "On the bench, the head stays on the pad.",
        "Do not crane forward to watch the mirror mid-rep."
      ],
      warn: "Neck pain with arm numbness, tingling or weakness: see a doctor.",
      rec: "No direct training needed."
    }
  ];

  // which muscles each exercise trains (first = main)
  D.EXM = {
    bench: ["chest", "delts", "triceps"],
    incdb: ["chest", "delts", "triceps"],
    mcp: ["chest", "triceps", "delts"],
    pec: ["chest"],
    lpd: ["lats", "biceps", "midback"],
    scr: ["midback", "lats", "traps", "biceps", "lowback"],
    csr: ["midback", "traps", "rdelts", "lats"],
    sap: ["lats"],
    sdp: ["delts", "triceps", "traps"],
    lat: ["delts"],
    rpd: ["rdelts", "midback"],
    fp: ["rdelts", "cuff", "traps"],
    gb: ["glutes", "hams", "lowback"],
    hc: ["hams"],
    cr: ["calves"],
    ha: ["hipab", "glutes"],
    ez: ["biceps", "forearms"],
    idc: ["biceps"],
    pc: ["biceps", "forearms"],
    hm: ["biceps", "forearms"],
    rp: ["triceps"],
    oce: ["triceps"],
    rgp: ["triceps", "forearms"],
    sace: ["triceps"],
    pl: ["abs", "obliques", "lowback"],
    db: ["abs", "hipfl"],
    pp: ["obliques", "abs"],
    scc: ["abs"],
    gsq: ["quads", "glutes", "abs"],
    lpr: ["quads", "glutes"],
    rdl: ["hams", "glutes", "lowback"],
    lng: ["quads", "glutes", "hams"],
    lext: ["quads"],
    pu: ["chest", "triceps", "delts", "abs"],
    chin: ["lats", "biceps", "midback", "forearms"],
    kbs: ["glutes", "hams", "lowback"],
    hlr: ["abs", "hipfl"],
    cru: ["abs"],
    bic: ["abs", "obliques"],
    rtw: ["obliques", "abs"],
    spl: ["obliques", "hipab"],
    fwk: ["forearms", "traps", "abs"],
    bsq: ["quads", "glutes", "lowback"],
    dl: ["hams", "glutes", "lowback", "traps"],
    ohp: ["delts", "triceps", "traps"],
    bbrow: ["midback", "lats", "rdelts", "biceps"],
    pull: ["lats", "biceps", "midback"],
    hipt: ["glutes", "hams"],
    dip: ["triceps", "chest", "delts"],
    dbp: ["chest", "delts", "triceps"],
    dbrow: ["lats", "midback", "biceps"],
    dbcurl: ["biceps", "forearms"],
    dbext: ["triceps"],
    dbfly: ["chest"],
    dbrear: ["rdelts", "midback"],
    splsq: ["quads", "glutes"],
    dbcalf: ["calves"],
    sq: ["quads", "glutes"],
    blng: ["quads", "glutes"],
    ipu: ["chest", "delts", "triceps"],
    dpu: ["chest", "delts", "triceps"],
    cpu: ["triceps", "chest"],
    bdip: ["triceps", "delts"],
    irow: ["midback", "lats", "biceps"],
    sup: ["lowback", "glutes", "rdelts"],
    slgb: ["glutes", "hams"],
    rcr: ["abs", "hipfl"],
    mtc: ["abs", "hipfl", "delts"],
    jsq: ["quads", "glutes", "calves"],
    stp: ["quads", "glutes"]
  };

  D.RULES = [
    [
      "Technique before weight",
      "Add load only when every rep of every set looks the same as the first. A rep you have to swing or twist to finish does not count."
    ],
    [
      "Progress slowly",
      "Add the smallest step, and not every week. Muscles adapt in weeks; tendons and joints take months. Most gym injuries come from adding load faster than the tendons can follow."
    ],
    [
      "Stop 1–3 reps before failure",
      "Studies find nearly the same growth as going to failure, and your form stays safe. Keep all-out sets rare, and only on machines."
    ],
    [
      "Control the lowering",
      "Take 2–3 seconds to lower every rep. That is where tendons get strong, and where most tears happen when it is rushed."
    ],
    [
      "Pull as much as you push",
      "For every pressing set in the week, do at least one pulling set. It keeps the shoulders centred in the joint."
    ],
    [
      "Warm up every session",
      "8–10 minutes plus one or two light ramp-up sets. A cold, heavy first set is a classic injury moment."
    ],
    [
      "Sharp pain means stop",
      "Muscle burn and next-day soreness are normal. Sharp, pinching, one-sided or joint pain is not: stop that exercise and use a pain-free variation. Never push through it."
    ],
    [
      "Breathe",
      "Breathe out through the hard part of each rep. Holding your breath for a whole set spikes blood pressure and causes dizziness."
    ],
    [
      "Sleep and eat to recover",
      "Repair happens during sleep. Under 6 hours of sleep with a calorie deficit is the highest-risk mix for injury and muscle loss. Enough protein and a moderate deficit protect you."
    ],
    [
      "Take an easy week",
      "Many coaches use one every 6–8 weeks, or when lifts stall: halve the sets and drop the weights by about 20% for one week. You come back stronger."
    ],
    [
      "Fix small problems early",
      "A niggle that lasts more than two weeks, or keeps coming back, deserves a physio visit. Early problems are cheap to fix; ignored ones become long-term."
    ],
    [
      "Train the weak links",
      "Rear shoulders, rotator cuff, glutes, side hips and core are small jobs that prevent the big injuries. Do not skip them when short on time."
    ]
  ];

  D.PAIN = {
    ok: [
      "Dull ache in the muscle itself, 24–72 hours after training",
      "Both sides feel about the same",
      "Stiffness that eases as you warm up",
      "Burning in the last reps that stops when the set ends"
    ],
    stop: [
      "Sharp, stabbing or pinching pain during a rep",
      "Pain in a joint rather than in a muscle",
      "Swelling, bruising, or a pop",
      "Numbness, tingling, or pain shooting down an arm or leg",
      "Pain that wakes you at night or lasts more than 7–10 days",
      "One side suddenly much weaker than before"
    ],
    aid: "For a fresh strain: stop the session, protect the area, keep it moving gently within comfort, and use ice for 10–15 minutes if it eases the pain. Anything on the stop list needs a doctor or physio, not a guess."
  };

  D.JOINTS = [
    [
      "Shoulders",
      "Shoulder blades back and down; nothing behind the neck; raises stop at shoulder height; band work before pressing."
    ],
    ["Elbows", "Straight wrists, smooth lockouts, no dropped curls. If they ache, go lighter for more reps."],
    ["Wrists", "Stack the wrist over the elbow in presses. Use palms-in grips where you can."],
    ["Lower back", "Neutral spine, brace before each rep, never twist under load."],
    [
      "Knees",
      "Knees track over the second toe. Add leg work gradually, control the lowering, and warm up before loading."
    ]
  ];
})();
