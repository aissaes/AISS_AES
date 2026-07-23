package com.example.aiss_aes

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class ExamBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            Log.d("ExamBootReceiver", "Device rebooted or package updated. Ready to restore exam alarms.")
            // Upon reboot, Flutter app will check active schedule and reschedule pending alarms on app open or background sync.
        }
    }
}
