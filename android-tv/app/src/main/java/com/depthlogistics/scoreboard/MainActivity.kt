package com.depthlogistics.scoreboard

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Full-screen kiosk shell for the Depth Logistics scoreboard.
 *
 * The scoreboard itself is the existing web app — this activity just hosts it
 * so it behaves like a TV appliance: no browser chrome, screen never sleeps,
 * survives network drops, and comes back on its own after a power cut.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var root: FrameLayout
    private lateinit var offline: LinearLayout

    private val handler = Handler(Looper.getMainLooper())

    /** True while the board is unreachable and the retry loop is armed. */
    private var loadFailed = false

    /** Set if the current page load reported an error, so onPageFinished can
     *  tell a real success from the error page that follows a failure. */
    private var errorThisLoad = false

    /** Retry cadence while the network/site is unreachable. */
    private val retryMs = 15_000L

    private val retryRunnable = object : Runnable {
        override fun run() {
            if (loadFailed) {
                web.loadUrl(BuildConfig.SCOREBOARD_URL)
                handler.postDelayed(this, retryMs)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // A TV is never touched — the picture must never sleep or dim.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        root = FrameLayout(this).apply { setBackgroundColor(BG) }
        web = WebView(this).apply {
            setBackgroundColor(BG)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
            isFocusable = false            // nothing on the board is interactive
            isFocusableInTouchMode = false
        }
        root.addView(
            web,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        root.addView(buildOfflineView())
        setContentView(root)

        configureWebView()
        web.webViewClient = ScoreboardWebViewClient()
        web.loadUrl(BuildConfig.SCOREBOARD_URL)
    }

    private fun configureWebView() = with(web.settings) {
        javaScriptEnabled = true
        domStorageEnabled = true
        loadsImagesAutomatically = true
        mediaPlaybackRequiresUserGesture = false

        // The web app is designed at a fixed 1920x1080 and scales itself —
        // stop WebView from applying its own zoom/reflow on top of that.
        useWideViewPort = true
        loadWithOverviewMode = true
        setSupportZoom(false)
        builtInZoomControls = false
        displayZoomControls = false
        textZoom = 100

        // Serve from cache when the network hiccups, but prefer fresh content.
        cacheMode = WebSettings.LOAD_DEFAULT

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        }
    }

    /** Simple branded "waiting for network" panel shown instead of a browser error page. */
    private fun buildOfflineView(): View {
        offline = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(BG)
            visibility = View.GONE
            addView(TextView(this@MainActivity).apply {
                text = getString(R.string.offline_title)
                setTextColor(Color.parseColor("#E8EEF6"))
                textSize = 34f
                gravity = Gravity.CENTER
            })
            addView(TextView(this@MainActivity).apply {
                text = getString(R.string.offline_body)
                setTextColor(Color.parseColor("#6E7F98"))
                textSize = 18f
                gravity = Gravity.CENTER
                setPadding(0, 24, 0, 0)
            })
        }
        return offline
    }

    private inner class ScoreboardWebViewClient : WebViewClient() {

        override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
            errorThisLoad = false
        }

        override fun onPageFinished(view: WebView?, url: String?) {
            // A load that finished without reporting an error means the board is
            // back — stop the retry loop and show it again.
            if (!errorThisLoad) clearOffline()
        }

        // API 23+
        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            // Only a failure of the page itself matters; a missing image must not
            // blank the whole board.
            if (request?.isForMainFrame == true) showOffline()
        }

        @Suppress("DEPRECATION", "OverridingDeprecatedMember")
        override fun onReceivedError(
            view: WebView?,
            errorCode: Int,
            description: String?,
            failingUrl: String?
        ) {
            if (failingUrl == null || failingUrl == BuildConfig.SCOREBOARD_URL) showOffline()
        }
    }

    private fun showOffline() {
        errorThisLoad = true
        if (loadFailed) return              // retry loop already armed
        loadFailed = true
        web.visibility = View.GONE
        offline.visibility = View.VISIBLE
        handler.postDelayed(retryRunnable, retryMs)
    }

    private fun clearOffline() {
        handler.removeCallbacks(retryRunnable)
        loadFailed = false
        errorThisLoad = false
        offline.visibility = View.GONE
        web.visibility = View.VISIBLE
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUi()
    }

    /** Immersive full screen: no status bar, no navigation bar, no cursor. */
    @Suppress("DEPRECATION")
    private fun hideSystemUi() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
    }

    /**
     * Remote handling. BACK would normally close the app and leave the TV on the
     * launcher, so it is swallowed. A long-press on BACK still exits, which gives
     * an intentional way out for maintenance.
     */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (event != null && event.isLongPress) {
                finish()
                return true
            }
            event?.startTracking()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyLongPress(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            finish()
            return true
        }
        return super.onKeyLongPress(keyCode, event)
    }

    override fun onResume() {
        super.onResume()
        hideSystemUi()
        web.onResume()
        // Coming back from standby with a failed board: retry straight away
        // rather than waiting out the remaining retry interval.
        if (loadFailed) web.loadUrl(BuildConfig.SCOREBOARD_URL)
    }

    override fun onPause() {
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        web.destroy()
        super.onDestroy()
    }

    companion object {
        private val BG = Color.parseColor("#060B14")
    }
}
