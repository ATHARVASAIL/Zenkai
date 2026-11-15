# Changelog

All notable changes to ZENKAI. Newest first.

## 6.2.1

- Source cleaned up for publishing: all JavaScript, CSS and HTML formatted with Prettier, a header
  comment on every file and a comment on every function.
- Signing details moved out of the build files into `keystore.properties` (not committed).
  `build.sh` creates a local key when none is configured.
- Plan builder and coach checks added under `tests/` (`npm test`).
- Long session names in the week strip now break cleanly.
- The coach introduces itself by the name you gave it.

## 6.2.0

- **Move your training days.** Train → Your week → Move days: tap a day, then the day to swap it with. Move legs from Thursday to Saturday, rest on Wednesday instead of Sunday, anything. The sessions stay exactly the same, and the app warns when the same muscle would be trained hard two days in a row.
- **Voice.** Tap the microphone at the top and speak: "read my day", "my weight is 88.4", "I drank 2 glasses of water", "I ate 2 eggs and 2 chapatis", "start my workout", "move legs to Saturday", "rest on Wednesday", or any question for the coach. The speaker button on every screen reads it aloud. Guided sessions call out each exercise, rest and countdown. Uses the phone's own text-to-speech and voice-input apps.
- **Name your assistant.** Menu → Voice and assistant. The name shows in the header and you can start commands with it.
- **Swap an exercise** when a machine is busy: today only, or for good.
- **Checked facts.** The coach's answers and the vitamin table were checked against their sources and corrected; advice now follows each person's own plan, times and days instead of fixed examples.
- A "Talk" app-icon shortcut opens voice input straight away.

## 6.1.0

- **The plan matches the answers.** "One muscle group a day" now gives a different muscle every day: chest, back, shoulders, legs, biceps, triceps + abs on six days, with shorter versions for four and five days. Legs come once.
- **Every muscle is counted.** Whatever the split, the builder counts the weekly sets for chest, back, shoulders, biceps, triceps, front and back of the thighs, calves and abs, and adds or swaps exercises until each one gets at least 4 sets, including direct work for biceps, triceps and abs. The plan screen shows the table.
- **Food built from what you eat.** New questions: the kind of food you eat (North, South, West or East Indian, a mix, or not Indian), the foods you eat in a normal week, where your food comes from, and your monthly budget. Each meal now has two or three dishes with about the same calories and protein; swap them on the Food tab.
- **How to eat.** A food guide written for your goal: the plate, protein per meal, the cheapest protein you eat with prices, portions without a scale, sugar, salt and oil limits, cravings, and tips for home cooking, mess food or eating out.
- **For beginners.** A start-here checklist for the first two weeks, a gym basics guide, and two learning weeks with two sets of each exercise.
- **Sources for every rule.** The plan screen lists the research behind each rule with a link: ACSM 2026, Ramos-Campo 2024, Pelland 2026, Behm 2024, Singer 2024, ISSN 2017, Schoenfeld and Aragon 2018, the ICMR-NIN Dietary Guidelines for Indians 2024 and others.
- Plans made by 6.0 are rebuilt from the same answers when the app opens. Your log is untouched.

## 6.0.0 — a plan for anyone

The app no longer assumes one person. The first screen is a setup of thirteen short steps:

| Step | What it asks |
|---|---|
| About you | Name, sex, age, height (cm or ft + in), weight (kg or lb) |
| Your goal | Lose fat, build muscle, tone up, stay fit, or get stronger |
| Your target | Goal weight and pace, with the calories each pace means (loss and gain goals only) |
| Your day | How active you are outside training |
| Training so far | Experience, and any area to go easy on |
| Where and when | Gym, home with dumbbells, or no equipment; which days; session length |
| How you like to train | Full body, upper / lower, push / pull / legs, two muscle groups a day, one a day, or let the app choose |
| Focus | Up to three areas for a little extra work |
| Your food | Non-vegetarian, vegetarian with eggs, vegetarian, vegan; meals a day; foods you avoid |
| Your routine | Wake-up time, training time, bedtime |
| Health check | Conditions that call for a doctor's go-ahead |
| Your plan | Everything below, to review before you start |

From the answers `js/plan.js` builds:

- **Daily targets**: calories, protein, carbs, fat, fibre, water, steps and sleep, with the working shown.
- **A training week** on the days you chose: exercises picked for your equipment and experience, sets,
  reps and rests set for your goal, a warm-up, a finisher and a cool-down for each day.
- **A day of meals** from the food table, fitted to your calories and protein and to what you eat.
- **A timetable and reminder times** built around when you wake, train and sleep.

Safety rules are built in: calories never go below 1,200 (women) or 1,500 (men); the cut is never more
than a quarter of your daily burn; a goal weight cannot sit below the healthy range for your height;
under-18s get no calorie cut; pregnancy or an eating disorder switches the plan to maintenance with no
weight target; and any health flag adds a note to see a doctor first.

Also new: 28 more exercises (70 in all) for home, dumbbell and barbell training; goal-aware coach,
weight card, badges and tips for people gaining or holding weight; the women's body-fat formula (it
needs a hip measure); a monthly grocery list added up from your own menu.

**Updating from version 5:** your log is kept and the app carries on with the plan you had. A card on
Today offers the personal setup, filled in with what the app already knows. Nothing changes until you
finish it and tap *Use this plan*.

Limits worth knowing: the app works in kg and cm after setup; menus are built from everyday Indian
foods; the 28 new exercises have photos and written guides, and their *Form video* button opens a
YouTube search instead of one chosen video.

## 5.1.0

- **Form inside the guided session.** Each exercise opens with its start and end photos moving back and
  forth, and the full guide under it: set-up, posture, numbered steps, breathing and the mistakes to avoid.
  The guide folds away after the first set.
- **Form video for every exercise.** Tap *Form video* and a tutorial plays in the same screen, without
  leaving the workout or losing the numbers you typed. The same switch is in every exercise guide.
- **Learn while you rest.** The rest before a new exercise shows that exercise's demo, video and steps.
  The rest clock holds while a video is open and carries on when you close it.
- Videos need internet; the photos and written steps work offline. If a video will not play in the app,
  the caption has a link that opens it in YouTube.

## 5.0.0

- **Two training plans.** *Shape* (the default) is built for losing fat, getting fitter and adding arms and
  abs: push, pull, legs, arms + abs, full body, and an active day. *Classic split* is one muscle group a day.
  Switch in Menu → Training plan; past sessions keep the plan they were logged on.
- **Guided session.** One button runs the whole workout a screen at a time: timed warm-up, each set with
  weight and rep steppers, automatic rests, a timed finisher (circuits, sprints, carries) and a cool-down.
- **Normal leg training.** Goblet squat, leg press, Romanian deadlift, lunges, leg extension. The earlier
  movement restrictions are gone.
- **14 new exercises** with photos and form guides (42 in all), and 12 cool-down stretches.
- **5:00 AM schedule**: timetable, meal times and reminders moved, with a new wake-up reminder.
- **New look**: an anime sports style with a new Z logo, slanted panels, bold condensed type, a rank badge
  (E to S) and a drive bar. Light and dark, five accent colours.

## 4.0.0

- **Real calorie burn**: after four weeks of logging, the app measures what you actually burn from your food
  and weight trend and offers a corrected calorie target.
- **Body-fat estimate** from waist and neck (U.S. Navy tape formula), with fat mass and lean mass over time.
- **Saved meals**: save what you logged for a meal and add it again in one tap.
- **Badges** (18), **hard sets per muscle group** each week, and a **session summary** against your last one.
- **Reminders**: weigh-in, meals, water, steps and wind-down as phone notifications at times you choose.
- **App-icon shortcuts**: long-press the icon for Log weight, Add food, Ask the coach.
- **Coach**: forgives spelling slips, understands common Hinglish words, and answers new questions
  (real burn, body fat, yesterday, this week against last week, badges).
- **Spreadsheet export** (CSV, one row per day) next to the backup.
- **Smaller and faster**: photos converted to WebP (the APK went from 2.3 MB to 1.5 MB) and the heavier
  sums are cached between changes.

The package id is `app.systemzero` (the app's working name was SYSTEM ZERO). It is kept on purpose:
a new version signed with the same key installs over the old one and keeps every log.
