package app.systemzero;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Alarms are wiped by a restart, an app update or a clock change, so this puts them back.
 * It does nothing else.
 *
 * @author Atharva Sail
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        if (i == null || i.getAction() == null) {
            return;
        }
        String a = i.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a)) {
            Remind.scheduleAll(c);
        }
    }
}
