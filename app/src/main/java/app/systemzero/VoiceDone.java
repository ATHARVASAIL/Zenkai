package app.systemzero;

import android.speech.tts.UtteranceProgressListener;

/**
 * Passes the speech engine's progress back to the page. Called on a background thread.
 *
 * @author Atharva Sail
 */
final class VoiceDone extends UtteranceProgressListener {
    final Voice v;

    VoiceDone(Voice voice) {
        v = voice;
    }

    @Override
    public void onStart(String id) {
        v.tell("start", id);
    }

    @Override
    public void onDone(String id) {
        v.tell("done", id);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onError(String id) {
        v.tell("error", id);
    }

    @Override
    public void onError(String id, int code) {
        v.tell("error", id);
    }

    @Override
    public void onStop(String id, boolean interrupted) {
        v.tell("stop", id);
    }
}
