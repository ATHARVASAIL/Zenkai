package app.systemzero;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Daily reminders. The page hands over the list of reminders that are switched on; it is kept in
 * the app's preferences, and each entry is one alarm that re-arms itself for the next day when it fires.
 * Alarms are inexact on purpose: they need no special permission and still fire while the phone dozes.
 *
 * @author Atharva Sail
 */
final class Remind {
    static final String PREFS = "zenkai";
    static final String KEY = "reminders";
    static final String CHANNEL = "reminders";
    static final String ACTION = "app.systemzero.REMIND";
    static final String EXTRA = "slot";
    static final int MAX = 12;
    static final int REQ_BASE = 100;
    static final int NOTE_BASE = 200;

    private Remind() {
    }

    static JSONArray load(Context c) {
        try {
            return new JSONArray(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    static String cut(String s, int n) {
        return s.length() > n ? s.substring(0, n) : s;
    }

    /** Stores a cleaned copy of the list and re-arms every alarm. */
    static void save(Context c, String json) {
        JSONArray clean = new JSONArray();
        try {
            JSONArray in = new JSONArray(json);
            for (int i = 0; i < in.length() && clean.length() < MAX; i++) {
                JSONObject r = in.getJSONObject(i);
                int h = r.getInt("h");
                int m = r.getInt("m");
                if (h < 0 || h > 23 || m < 0 || m > 59) {
                    continue;
                }
                JSONObject o = new JSONObject();
                o.put("h", h);
                o.put("m", m);
                o.put("title", cut(r.optString("title", "ZENKAI"), 60));
                o.put("text", cut(r.optString("text", ""), 200));
                clean.put(o);
            }
        } catch (Exception e) {
            // keep whatever parsed cleanly
        }
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, clean.toString()).apply();
        scheduleAll(c);
    }

    static PendingIntent alarmIntent(Context c, int slot) {
        Intent i = new Intent(c, AlarmReceiver.class);
        i.setAction(ACTION);
        i.putExtra(EXTRA, slot);
        return PendingIntent.getBroadcast(c, REQ_BASE + slot, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void scheduleAll(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am == null) {
                return;
            }
            for (int s = 0; s < MAX; s++) {
                am.cancel(alarmIntent(c, s));
            }
            JSONArray list = load(c);
            for (int s = 0; s < list.length(); s++) {
                scheduleOne(c, am, s, list.getJSONObject(s));
            }
        } catch (Exception e) {
            // reminders are a convenience; never let them break the app
        }
    }

    /** Arms one reminder for its next time of day: today if that is still ahead, otherwise tomorrow. */
    static void scheduleOne(Context c, AlarmManager am, int slot, JSONObject r) throws Exception {
        Calendar t = Calendar.getInstance();
        t.set(Calendar.HOUR_OF_DAY, r.getInt("h"));
        t.set(Calendar.MINUTE, r.getInt("m"));
        t.set(Calendar.SECOND, 0);
        t.set(Calendar.MILLISECOND, 0);
        if (t.getTimeInMillis() <= System.currentTimeMillis() + 5000) {
            t.add(Calendar.DAY_OF_YEAR, 1);
        }
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t.getTimeInMillis(), alarmIntent(c, slot));
    }

    static boolean enabled(Context c) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            return nm != null && nm.areNotificationsEnabled();
        } catch (Exception e) {
            return false;
        }
    }

    static void show(Context c, int id, String title, String text) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) {
                return;
            }
            if (nm.getNotificationChannel(CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, "Reminders", NotificationManager.IMPORTANCE_DEFAULT);
                ch.setDescription("Daily reminders you switched on in ZENKAI");
                nm.createNotificationChannel(ch);
            }
            Intent open = new Intent(c, MainActivity.class);
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pi = PendingIntent.getActivity(c, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification n = new Notification.Builder(c, CHANNEL)
                    .setSmallIcon(R.drawable.ic_stat)
                    .setContentTitle(title)
                    .setContentText(text)
                    .setStyle(new Notification.BigTextStyle().bigText(text))
                    .setColor(0xFF5AC8FA)
                    .setAutoCancel(true)
                    .setContentIntent(pi)
                    .build();
            nm.notify(NOTE_BASE + id, n);
        } catch (Exception e) {
            // a missing permission or a blocked channel simply means no notification
        }
    }
}
