package com.example.aiss_aes

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.util.Log

class ExamAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val examId = intent.getStringExtra("examId") ?: ""
        Log.d("ExamAlarmReceiver", "Alarm received for examId: $examId! Waking up device...")

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "AissAes::ExamAlarmWakeLock"
        )
        wakeLock.acquire(5000)

        try {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or 
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                launchIntent.putExtra("auto_launched_from_exam_alarm", true)
                launchIntent.putExtra("examId", examId)
                context.startActivity(launchIntent)
                Log.d("ExamAlarmReceiver", "MainActivity launched successfully for exam: $examId")
            } else {
                Log.e("ExamAlarmReceiver", "Launch intent for package not found")
            }
        } catch (e: Exception) {
            Log.e("ExamAlarmReceiver", "Failed to launch MainActivity from alarm", e)
        }
    }
}
