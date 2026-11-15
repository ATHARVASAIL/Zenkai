package app.systemzero;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Reads text aloud with the phone's own text-to-speech engine. Created on first use, on the UI thread.
 * Lines asked for before the engine is ready wait in a short queue. The page hears about progress
 * through window.SZ_voice(event, id): "start", "done", "stop" or "error".
 *
 * @author Atharva Sail
 */
final class Voice implements TextToSpeech.OnInitListener {
    final MainActivity a;
    TextToSpeech tts;
    volatile boolean ready;
    boolean failed;
    final ArrayList<String[]> queue = new ArrayList<String[]>();

    Voice(MainActivity activity) {
        a = activity;
    }

    static String quote(String s) {
        return JSONObject.quote(s == null ? "" : s);
    }

    void tell(String event, String id) {
        a.js("window.SZ_voice&&window.SZ_voice(" + quote(event) + "," + quote(id) + ")");
    }

    void speak(String text, String id, float rate, boolean flush) {
        if (failed) {
            tell("error", id);
            return;
        }
        if (tts == null) {
            tts = new TextToSpeech(a.getApplicationContext(), this);
        }
        if (!ready) {
            if (flush) {
                queue.clear();
            }
            queue.add(new String[]{text, id, String.valueOf(rate), flush ? "1" : "0"});
            return;
        }
        say(text, id, rate, flush);
    }

    void say(String text, String id, float rate, boolean flush) {
        try {
            tts.setSpeechRate(Math.max(0.5f, Math.min(rate, 2.0f)));
            Bundle params = new Bundle();
            int r = tts.speak(text, flush ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, params, id);
            if (r != TextToSpeech.SUCCESS) {
                tell("error", id);
            }
        } catch (Exception e) {
            tell("error", id);
        }
    }

    void stop() {
        queue.clear();
        if (tts != null && ready) {
            try {
                tts.stop();
            } catch (Exception ignored) {
                // nothing to stop
            }
        }
    }

    void shutdown() {
        queue.clear();
        if (tts != null) {
            try {
                tts.shutdown();
            } catch (Exception ignored) {
                // already gone
            }
            tts = null;
        }
        ready = false;
    }

    @Override
    public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS || tts == null) {
            failed = true;
            queue.clear();
            tell("error", "");
            return;
        }
        int r = tts.setLanguage(new Locale("en", "IN"));
        if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
            r = tts.setLanguage(Locale.UK);
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(Locale.US);
            }
        }
        tts.setOnUtteranceProgressListener(new VoiceDone(this));
        ready = true;
        for (int i = 0; i < queue.size(); i++) {
            String[] q = queue.get(i);
            float rate = 1f;
            try {
                rate = Float.parseFloat(q[2]);
            } catch (Exception ignored) {
                rate = 1f;
            }
            say(q[0], q[1], rate, "1".equals(q[3]));
        }
        queue.clear();
    }
}
