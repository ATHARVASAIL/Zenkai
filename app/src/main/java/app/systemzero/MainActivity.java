package app.systemzero;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * ZENKAI: one full-screen WebView that serves the bundled app from the APK's assets
 * under a fixed https origin, so storage behaves like a normal web page. The coach's web
 * lookups go through a small native GET helper that only talks to a fixed list of hosts.
 * No third-party libraries.
 *
 * Helper classes are static and take the activity explicitly. That keeps the class files
 * free of compiler-generated parameters (inner-class constructors, generic bridge methods),
 * which the bundled dex compiler rejects.
 *
 * @author Atharva Sail
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String START = "https://" + HOST + "/assets/www/index.html";
    static final int REQ_FILE = 41;
    static final int REQ_SAVE = 42;
    static final int REQ_NOTIFY = 43;
    static final int REQ_SPEECH = 44;
    static final String NOTIFY_PERMISSION = "android.permission.POST_NOTIFICATIONS";
    static final String VERSION = "6.2.1";
    static final String USER_AGENT = "ZENKAI/" + VERSION + " (Android; personal fitness tracker)";
    /** The only hosts the coach and the food search may read from. */
    static final String[] NET_HOSTS = {"en.wikipedia.org", "wsearch.nlm.nih.gov", "world.openfoodfacts.org"};
    static final int NET_MAX_BYTES = 900000;

    volatile boolean alive = true;
    WebView web;
    ValueCallback<Uri[]> fileCallback;
    String pendingSave;
    String pendingMime = "application/json";
    /** Where an app-icon shortcut asked to go; the page collects it once it has loaded. */
    volatile String launchTarget = "";
    boolean notifyAsked;
    /** Text-to-speech, created the first time something is read aloud. UI thread only. */
    Voice voice;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(10, 15, 22));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(this), "SZNative");
        web.setWebViewClient(new Client(this));
        web.setWebChromeClient(new Chrome(this));

        if (state == null) {
            readIntent(getIntent(), false);
        }
        if (state == null || web.restoreState(state) == null) {
            web.loadUrl(START);
        }
    }

    /** Shortcuts open the app with zenkai://open/NAME; anything else is ignored. */
    void readIntent(Intent i, boolean pageIsUp) {
        try {
            Uri d = i != null ? i.getData() : null;
            if (d == null || !"zenkai".equals(d.getScheme())) {
                return;
            }
            String t = d.getLastPathSegment();
            if (t == null || !t.matches("[a-z]{1,12}")) {
                return;
            }
            if (pageIsUp && web != null) {
                web.evaluateJavascript("window.SZ_open&&window.SZ_open('" + t + "')", null);
            } else {
                launchTarget = t;
            }
        } catch (Exception e) {
            // a malformed link just opens the app normally
        }
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        readIntent(i, true);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == REQ_NOTIFY && web != null) {
            boolean ok = results != null && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
            web.evaluateJavascript("window.SZ_notify&&window.SZ_notify(" + (ok ? "true" : "false") + ")", null);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        if (voice != null) {
            voice.stop();
        }
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        alive = false;
        if (voice != null) {
            voice.shutdown();
            voice = null;
        }
        if (web != null) {
            web.destroy();
        }
        super.onDestroy();
    }

    @Override
    @SuppressWarnings("unchecked")
    public void onBackPressed() {
        web.evaluateJavascript("(window.SZ_back&&window.SZ_back())?1:0", new BackResult(this));
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == REQ_FILE) {
            if (fileCallback == null) {
                return;
            }
            Uri[] picked = null;
            if (result == RESULT_OK && data != null && data.getData() != null) {
                picked = new Uri[]{data.getData()};
            }
            fileCallback.onReceiveValue(picked);
            fileCallback = null;
        } else if (request == REQ_SPEECH) {
            String heard = "null";
            if (result == RESULT_OK && data != null) {
                ArrayList<String> said = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (said != null && !said.isEmpty()) {
                    heard = new JSONArray(said).toString();
                }
            }
            web.evaluateJavascript("window.SZ_heard&&window.SZ_heard(" + heard + ")", null);
        } else if (request == REQ_SAVE) {
            boolean ok = false;
            if (result == RESULT_OK && data != null && data.getData() != null && pendingSave != null) {
                OutputStream os = null;
                try {
                    os = getContentResolver().openOutputStream(data.getData());
                    if (os != null) {
                        os.write(pendingSave.getBytes(StandardCharsets.UTF_8));
                        ok = true;
                    }
                } catch (Exception e) {
                    ok = false;
                } finally {
                    if (os != null) {
                        try {
                            os.close();
                        } catch (IOException ignored) {
                            // nothing to do
                        }
                    }
                }
            }
            pendingSave = null;
            web.evaluateJavascript("window.SZ_saved&&window.SZ_saved(" + (ok ? "true" : "false") + ")", null);
        }
    }

    /** Run a script in the page from any thread. */
    void js(String script) {
        runOnUiThread(new JsTask(this, script));
    }

    Voice voice() {
        if (voice == null) {
            voice = new Voice(this);
        }
        return voice;
    }

    boolean canListen() {
        try {
            return !getPackageManager().queryIntentActivities(new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH), 0).isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    void openExternal(Uri uri) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, uri);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(this, "No app can open this link", Toast.LENGTH_SHORT).show();
        }
    }

    static String mimeOf(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    static boolean hostAllowed(String host) {
        if (host == null) {
            return false;
        }
        for (int i = 0; i < NET_HOSTS.length; i++) {
            if (NET_HOSTS[i].equalsIgnoreCase(host)) {
                return true;
            }
        }
        // the food database may hand a search over to one of its own sub-domains
        return host.toLowerCase().endsWith(".openfoodfacts.org");
    }

    /** Back button: let the page close a sheet or go to Today first; otherwise leave the app running in the background. */
    @SuppressWarnings("rawtypes")
    static final class BackResult implements ValueCallback {
        final MainActivity a;

        BackResult(MainActivity activity) {
            a = activity;
        }

        @Override
        public void onReceiveValue(Object v) {
            if (!"1".equals(v)) {
                a.moveTaskToBack(true);
            }
        }
    }

    static final class Client extends WebViewClient {
        final MainActivity a;

        Client(MainActivity activity) {
            a = activity;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (!HOST.equals(u.getHost())) {
                return null;
            }
            String path = u.getPath();
            if (path == null || !path.startsWith("/assets/") || path.contains("..")) {
                return notFound();
            }
            String rel = path.substring("/assets/".length());
            try {
                InputStream in = a.getAssets().open(rel);
                String mime = mimeOf(rel);
                boolean text = mime.startsWith("text/") || mime.equals("application/json") || mime.equals("image/svg+xml");
                WebResourceResponse r = new WebResourceResponse(mime, text ? "UTF-8" : null, in);
                Map<String, String> headers = new HashMap<String, String>();
                headers.put("Cache-Control", "no-cache");
                r.setResponseHeaders(headers);
                return r;
            } catch (IOException e) {
                return notFound();
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (HOST.equals(u.getHost())) {
                return false;
            }
            if (!request.isForMainFrame()) {
                return false;
            }
            a.openExternal(u);
            return true;
        }
    }

    static final class Chrome extends WebChromeClient {
        final MainActivity a;

        Chrome(MainActivity activity) {
            a = activity;
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (a.fileCallback != null) {
                a.fileCallback.onReceiveValue(null);
                a.fileCallback = null;
            }
            boolean image = false;
            String[] types = params != null ? params.getAcceptTypes() : null;
            if (types != null) {
                for (int i = 0; i < types.length; i++) {
                    if (types[i] != null && types[i].startsWith("image")) {
                        image = true;
                    }
                }
            }
            try {
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType(image ? "image/*" : "*/*");
                a.fileCallback = callback;
                a.startActivityForResult(Intent.createChooser(pick, image ? "Choose a photo" : "Choose a backup file"), REQ_FILE);
                return true;
            } catch (Exception e) {
                a.fileCallback = null;
                return false;
            }
        }
    }

    /** Runs one small job on the main thread for the bridge. */
    static final class UiTask implements Runnable {
        static final int SAVE = 1;
        static final int COPY = 2;
        static final int AWAKE = 3;
        static final int BARS = 4;
        static final int NOTIFY = 5;
        static final int LISTEN = 6;

        final MainActivity a;
        final int kind;
        final String s1;
        final String s2;
        final boolean flag;

        UiTask(MainActivity activity, int taskKind, String first, String second, boolean on) {
            a = activity;
            kind = taskKind;
            s1 = first;
            s2 = second;
            flag = on;
        }

        @Override
        public void run() {
            if (kind == SAVE) {
                try {
                    a.pendingSave = s2;
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType(a.pendingMime);
                    i.putExtra(Intent.EXTRA_TITLE, s1);
                    a.startActivityForResult(i, REQ_SAVE);
                } catch (Exception e) {
                    a.pendingSave = null;
                    Toast.makeText(a, "No file app is available to save the backup", Toast.LENGTH_LONG).show();
                }
            } else if (kind == LISTEN) {
                try {
                    Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN");
                    i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
                    if (s1 != null && s1.length() > 0) {
                        i.putExtra(RecognizerIntent.EXTRA_PROMPT, s1);
                    }
                    a.startActivityForResult(i, REQ_SPEECH);
                } catch (Exception e) {
                    a.web.evaluateJavascript("window.SZ_heard&&window.SZ_heard(null,'none')", null);
                }
            } else if (kind == COPY) {
                ClipboardManager cm = (ClipboardManager) a.getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null) {
                    cm.setPrimaryClip(ClipData.newPlainText("ZENKAI", s1));
                }
            } else if (kind == AWAKE) {
                if (flag) {
                    a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            } else if (kind == NOTIFY) {
                try {
                    boolean needsGrant = Build.VERSION.SDK_INT >= 33 && a.checkSelfPermission(NOTIFY_PERMISSION) != PackageManager.PERMISSION_GRANTED;
                    if (needsGrant && !(a.notifyAsked && !a.shouldShowRequestPermissionRationale(NOTIFY_PERMISSION))) {
                        a.notifyAsked = true;
                        a.requestPermissions(new String[]{NOTIFY_PERMISSION}, REQ_NOTIFY);
                    } else if (!Remind.enabled(a)) {
                        // already refused once, or switched off in the phone's settings: only the settings screen can turn it back on
                        Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                        i.putExtra(Settings.EXTRA_APP_PACKAGE, a.getPackageName());
                        a.startActivity(i);
                    } else {
                        a.web.evaluateJavascript("window.SZ_notify&&window.SZ_notify(true)", null);
                    }
                } catch (Exception e) {
                    Toast.makeText(a, "Open your phone's settings to allow notifications for ZENKAI", Toast.LENGTH_LONG).show();
                }
            } else if (kind == BARS) {
                try {
                    Window w = a.getWindow();
                    w.setStatusBarColor(flag ? Color.rgb(238, 245, 251) : Color.rgb(10, 15, 22));
                    w.setNavigationBarColor(flag ? Color.rgb(255, 255, 255) : Color.rgb(17, 25, 35));
                    View decor = w.getDecorView();
                    int vis = decor.getSystemUiVisibility();
                    int light = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    decor.setSystemUiVisibility(flag ? (vis | light) : (vis & ~light));
                } catch (Exception ignored) {
                    // bar colours are cosmetic
                }
            }
        }
    }

    /** Speech output work, on the UI thread. */
    static final class VoiceTask implements Runnable {
        final MainActivity a;
        final String text;
        final String id;
        final float rate;
        final boolean flush;
        final boolean stop;

        VoiceTask(MainActivity activity, String t, String utterance, float speed, boolean first, boolean halt) {
            a = activity;
            text = t;
            id = utterance;
            rate = speed;
            flush = first;
            stop = halt;
        }

        @Override
        public void run() {
            if (!a.alive) {
                return;
            }
            if (stop) {
                if (a.voice != null) {
                    a.voice.stop();
                }
            } else {
                a.voice().speak(text, id, rate, flush);
            }
        }
    }

    /** Hands a finished script to the page on the main thread. */
    static final class JsTask implements Runnable {
        final MainActivity a;
        final String js;

        JsTask(MainActivity activity, String script) {
            a = activity;
            js = script;
        }

        @Override
        public void run() {
            if (a.alive && a.web != null) {
                a.web.evaluateJavascript(js, null);
            }
        }
    }

    /**
     * One HTTPS GET on a worker thread, for the coach and the packaged-food search.
     * Only hosts in NET_HOSTS are contacted, redirects are re-checked against the same list,
     * and the reply is capped in size. The result goes back as window.SZ_http(id, status, body).
     */
    static final class HttpTask implements Runnable {
        final MainActivity a;
        final String id;
        final String url;

        HttpTask(MainActivity activity, String requestId, String address) {
            a = activity;
            id = requestId;
            url = address;
        }

        @Override
        public void run() {
            int status = 0;
            String body = "";
            HttpURLConnection c = null;
            InputStream in = null;
            try {
                String next = url;
                for (int hop = 0; hop < 4; hop++) {
                    URL u = new URL(next);
                    if (!"https".equals(u.getProtocol()) || !hostAllowed(u.getHost())) {
                        status = 403;
                        break;
                    }
                    c = (HttpURLConnection) u.openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(8000);
                    c.setReadTimeout(12000);
                    c.setRequestProperty("User-Agent", USER_AGENT);
                    c.setRequestProperty("Accept", "application/json, text/xml;q=0.9, */*;q=0.5");
                    status = c.getResponseCode();
                    if (status >= 300 && status < 400) {
                        String loc = c.getHeaderField("Location");
                        c.disconnect();
                        c = null;
                        if (loc == null) {
                            break;
                        }
                        next = new URL(u, loc).toString();
                        continue;
                    }
                    in = status >= 400 ? c.getErrorStream() : c.getInputStream();
                    if (in != null) {
                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                        byte[] buf = new byte[8192];
                        int n;
                        while (out.size() < NET_MAX_BYTES && (n = in.read(buf)) > 0) {
                            out.write(buf, 0, n);
                        }
                        body = new String(out.toByteArray(), StandardCharsets.UTF_8);
                    }
                    break;
                }
            } catch (Exception e) {
                status = 0;
                body = "";
            } finally {
                if (in != null) {
                    try {
                        in.close();
                    } catch (IOException ignored) {
                        // nothing to do
                    }
                }
                if (c != null) {
                    c.disconnect();
                }
            }
            // line and paragraph separators are legal in JSON but not in older script engines
            body = body.replace('\u2028', ' ').replace('\u2029', ' ');
            a.runOnUiThread(new JsTask(a, "window.SZ_http&&window.SZ_http(" + JSONObject.quote(id) + "," + status + "," + JSONObject.quote(body) + ")"));
        }
    }

    /** Small native helpers the page calls as window.SZNative.*. */
    static final class Bridge {
        final MainActivity a;

        Bridge(MainActivity activity) {
            a = activity;
        }

        @JavascriptInterface
        public void saveFile(String name, String content) {
            a.pendingMime = "application/json";
            a.runOnUiThread(new UiTask(a, UiTask.SAVE, name, content, false));
        }

        /** Same as saveFile, for the spreadsheet export. Only a few plain-text types are accepted. */
        @JavascriptInterface
        public void saveFileAs(String name, String content, String mime) {
            a.pendingMime = "text/csv".equals(mime) || "text/plain".equals(mime) ? mime : "application/json";
            a.runOnUiThread(new UiTask(a, UiTask.SAVE, name, content, false));
        }

        /** The reminders that are switched on, as a JSON list of {h, m, title, text}. */
        @JavascriptInterface
        public void setReminders(String json) {
            if (json == null || json.length() > 6000) {
                return;
            }
            Remind.save(a.getApplicationContext(), json);
        }

        @JavascriptInterface
        public boolean canNotify() {
            return Remind.enabled(a);
        }

        @JavascriptInterface
        public void askNotify() {
            a.runOnUiThread(new UiTask(a, UiTask.NOTIFY, null, null, false));
        }

        @JavascriptInterface
        public void testNotify() {
            Remind.show(a.getApplicationContext(), 99, "ZENKAI reminders work", "This is how a reminder will look.");
        }

        /** The shortcut target this launch was started with, handed over once. */
        @JavascriptInterface
        public String launchTarget() {
            String t = a.launchTarget;
            a.launchTarget = "";
            return t;
        }

        @JavascriptInterface
        public void copy(String text) {
            a.runOnUiThread(new UiTask(a, UiTask.COPY, text, null, false));
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) a.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.vibrate(VibrationEffect.createOneShot(Math.max(1, Math.min(ms, 1000)), VibrationEffect.DEFAULT_AMPLITUDE));
                }
            } catch (Exception ignored) {
                // vibration is optional
            }
        }

        @JavascriptInterface
        public void keepAwake(boolean on) {
            a.runOnUiThread(new UiTask(a, UiTask.AWAKE, null, null, on));
        }

        /** Match the system bars to the app's light or dark mode. */
        @JavascriptInterface
        public void setBars(boolean light) {
            a.runOnUiThread(new UiTask(a, UiTask.BARS, null, null, light));
        }

        /** GET a URL from one of the allowed hosts; the page gets the reply in window.SZ_http. */
        @JavascriptInterface
        public void httpGet(String id, String url) {
            if (id == null || url == null || id.length() > 40 || url.length() > 2000) {
                return;
            }
            Thread t = new Thread(new HttpTask(a, id, url), "zenkai-net");
            t.setDaemon(true);
            t.start();
        }

        @JavascriptInterface
        public String version() {
            return VERSION;
        }

        /** Read text aloud. flush starts fresh; otherwise the text queues after what is playing. */
        @JavascriptInterface
        public void speak(String text, String id, float rate, boolean flush) {
            if (text == null || text.length() == 0 || text.length() > 3900) {
                return;
            }
            a.runOnUiThread(new VoiceTask(a, text, id == null ? "" : id, rate, flush, false));
        }

        @JavascriptInterface
        public void stopSpeaking() {
            a.runOnUiThread(new VoiceTask(a, null, null, 1f, false, true));
        }

        /** Whether the phone has a speech-to-text app to open. */
        @JavascriptInterface
        public boolean canListen() {
            return a.canListen();
        }

        /** Open the phone's voice input; the words come back in window.SZ_heard. */
        @JavascriptInterface
        public void listen(String prompt) {
            a.runOnUiThread(new UiTask(a, UiTask.LISTEN, prompt == null ? "" : prompt.substring(0, Math.min(prompt.length(), 80)), null, false));
        }
    }
}
