package com.depthlogistics.scoreboard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Brings the scoreboard back up by itself after a reboot or power cut, so the
 * screen never sits on the launcher waiting for someone to notice.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                val launch = Intent(context, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(launch)
            }
        }
    }
}
