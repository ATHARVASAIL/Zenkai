package app.systemzero;

import android.app.AlarmManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Fires when a reminder is due: shows it, then arms the same reminder for tomorrow.
 *
 * @author Atharva Sail
 */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        try {
            if (i == null || !Remind.ACTION.equals(i.getAction())) {
                return;
            }
            int slot = i.getIntExtra(Remind.EXTRA, -1);
            JSONArray list = Remind.load(c);
            if (slot < 0 || slot >= list.length()) {
                return;
            }
            JSONObject r = list.getJSONObject(slot);
            Remind.show(c, slot, r.optString("title", "ZENKAI"), r.optString("text", ""));
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                Remind.scheduleOne(c, am, slot, r);
            }
        } catch (Exception e) {
            // nothing useful to do from a background receiver
        }
    }
}
