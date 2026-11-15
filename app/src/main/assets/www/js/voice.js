/**
 * ZENKAI — voice
 *
 * Reads text aloud and listens for spoken commands. In the Android app both go through the
 * phone's own text-to-speech engine and voice-input app (see Voice.java and MainActivity.java);
 * in a browser the Web Speech API is used where the browser has it.
 *
 * Exposed as window.SZVoice: speak(), stop(), listen(), canSpeak(), canListen(), on().
 *
 * Author: Atharva Sail
 */
window.SZVoice = (function () {
  "use strict";
  var N = window.SZNative,
    nat = !!(N && N.speak),
    syn = window.speechSynthesis || null,
    Rec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var cur = null,
    seq = 0,
    heardCb = null,
    subs = [],
    rate = 1,
    failed = false,
    enVoice = null;

  // Tell listeners the state changed: speak, listen, idle, fail.
  function fire(state) {
    subs.forEach(function (f) {
      try {
        f(state);
      } catch (e) {
        /* a listener failing never stops speech */
      }
    });
  }
  // Listen for state changes.
  function on(f) {
    subs.push(f);
  }

  // turn screen text into something that sounds right when spoken
  function clean(t) {
    t = String(t || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\*\*/g, "")
      .replace(/^\s*[•\-–]\s*/gm, "")
      .replace(/[\uD800-\uDFFF]/g, "")
      .replace(/[✓›→←↑↓]/g, " ")
      .replace(/(\d),(\d{3})/g, "$1$2")
      .replace(/₹\s?(\d+(?:\.\d+)?)/g, "$1 rupees")
      .replace(/(\d)\s?(?:–|-)\s?(\d)/g, "$1 to $2")
      .replace(/(\d)\s?kcal\b/g, "$1 calories")
      .replace(/\bkcal\b/g, "calories")
      .replace(/(\d)\s?kg\b/g, "$1 kilos")
      .replace(/(\d)\s?g\b/g, "$1 grams")
      .replace(/(\d)\s?ml\b/g, "$1 millilitres")
      .replace(/(\d)\s?L\b/g, "$1 litres")
      .replace(/(\d)\s?mg\b/g, "$1 milligrams")
      .replace(/(\d)\s?IU\b/g, "$1 international units")
      .replace(/(\d)\s?min\b/g, "$1 minutes")
      .replace(/(\d)\s?s\b/g, "$1 seconds")
      .replace(/(\d)\s?h\b/g, "$1 hours")
      .replace(/(\d)\s?%/g, "$1 percent")
      .replace(/\s?×\s?/g, " times ")
      .replace(/≈/g, "about ")
      .replace(/·/g, ", ")
      .replace(/\be\.g\./g, "for example")
      .replace(/\bvs\.?\b/g, "versus")
      .replace(/\s*\n+\s*/g, ". ")
      .replace(/\.\s*\./g, ".")
      .replace(/\s{2,}/g, " ")
      .trim();
    return t;
  }
  // the engine takes up to about 4,000 characters at a time; split at sentence ends
  function chunks(t) {
    var out = [],
      parts = t.match(/[^.!?]+[.!?]*\s*/g) || [t],
      buf = "";
    parts.forEach(function (p) {
      if ((buf + p).length > 1200 && buf) {
        out.push(buf.trim());
        buf = "";
      }
      buf += p;
    });
    if (buf.trim()) out.push(buf.trim());
    return out.map(function (x) {
      return x.length > 3800 ? x.slice(0, 3800) : x;
    });
  }
  // The best English voice the browser has, Indian English first.
  function pickVoice() {
    if (enVoice || !syn) return enVoice;
    var vs = syn.getVoices() || [];
    enVoice =
      vs.filter(function (v) {
        return /en[-_]IN/i.test(v.lang);
      })[0] ||
      vs.filter(function (v) {
        return /^en/i.test(v.lang);
      })[0] ||
      null;
    return enVoice;
  }
  // Whether text can be read aloud here.
  function canSpeak() {
    return !failed && (nat || !!syn);
  }
  // Whether voice input is available here.
  function canListen() {
    try {
      return nat ? !!(N.canListen && N.canListen()) : !!Rec;
    } catch (e) {
      return false;
    }
  }

  // Read text aloud, split into chunks the engine accepts.
  function speak(text, opt) {
    opt = opt || {};
    var t = clean(text);
    if (!t || !canSpeak()) return false;
    stop(true);
    var id = "v" + ++seq,
      parts = chunks(t),
      r = opt.rate || rate;
    cur = { id: id, n: parts.length, done: 0, cb: opt.done || null };
    fire("speak");
    if (nat) {
      parts.forEach(function (p, i) {
        try {
          N.speak(p, id + "_" + i, r, i === 0);
        } catch (e) {
          /* reported by the engine */
        }
      });
    } else {
      parts.forEach(function (p, i) {
        var u = new SpeechSynthesisUtterance(p),
          v = pickVoice();
        u.lang = v ? v.lang : "en-IN";
        if (v) u.voice = v;
        u.rate = r;
        u.onend = function () {
          part(id + "_" + i, "done");
        };
        u.onerror = function () {
          part(id + "_" + i, "error");
        };
        syn.speak(u);
      });
    }
    return true;
  }
  // One chunk finished, stopped or failed.
  function part(uid, ev) {
    if (!cur || String(uid).indexOf(cur.id + "_") !== 0) return;
    if (ev === "done") {
      cur.done++;
      if (cur.done >= cur.n) finish("done");
    } else if (ev === "error" || ev === "stop") finish(ev);
  }
  // Reading finished.
  function finish(ev) {
    var c = cur;
    cur = null;
    fire("idle");
    if (c && c.cb && ev === "done") c.cb();
  }
  // Stop reading.
  function stop(quiet) {
    if (nat) {
      try {
        N.stopSpeaking();
      } catch (e) {
        /* nothing playing */
      }
    } else if (syn) {
      try {
        syn.cancel();
      } catch (e) {
        /* nothing playing */
      }
    }
    if (cur) {
      cur = null;
      if (!quiet) fire("idle");
    }
  }
  window.SZ_voice = function (ev, uid) {
    if (ev === "error" && !uid) {
      failed = true;
      if (cur) finish("error");
      fire("fail");
      return;
    }
    if (ev !== "start") part(uid, ev);
  };

  // Open voice input; cb gets the alternatives heard.
  function listen(cb, prompt) {
    stop();
    heardCb = cb;
    if (nat) {
      try {
        N.listen(prompt || "Speak now");
        fire("listen");
      } catch (e) {
        heard(null, "none");
      }
      return;
    }
    if (!Rec) {
      heard(null, "none");
      return;
    }
    try {
      var rec = new Rec(),
        got = false;
      rec.lang = "en-IN";
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      rec.onresult = function (e) {
        got = true;
        var arr = [],
          r0 = e.results[0];
        for (var i = 0; i < r0.length; i++) arr.push(r0[i].transcript);
        heard(arr);
      };
      rec.onerror = function (e) {
        if (!got) {
          got = true;
          heard(null, e.error || "error");
        }
      };
      rec.onend = function () {
        if (!got) {
          got = true;
          heard(null);
        }
      };
      rec.start();
      fire("listen");
    } catch (e) {
      heard(null, "none");
    }
  }
  // Voice input returned.
  function heard(arr, err) {
    var cb = heardCb;
    heardCb = null;
    fire("idle");
    if (cb) cb(arr && arr.length ? arr : null, err || null);
  }
  window.SZ_heard = function (arr, err) {
    heard(arr, err);
  };

  return {
    canSpeak: canSpeak,
    canListen: canListen,
    speak: speak,
    stop: stop,
    listen: listen,
    on: on,
    clean: clean,
    busy: function () {
      return !!cur;
    },
    setRate: function (r) {
      rate = r > 0.4 && r < 2.1 ? r : 1;
    },
    native: nat
  };
})();
