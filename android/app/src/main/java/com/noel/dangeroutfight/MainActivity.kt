package com.noel.dangeroutfight

import android.annotation.SuppressLint
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import java.util.Locale

class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize TextToSpeech
        tts = TextToSpeech(this, this)

        // Enable WebView debugging for diagnostic inspects
        WebView.setWebContentsDebuggingEnabled(true)

        // Enable immersive full-screen mode (hide status bar, navigation bar, sticky swipe)
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())

        setContent {
            AndroidView(
                factory = { context ->
                    WebView(context).apply {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        webViewClient = WebViewClient()
                        @Suppress("DEPRECATION")
                        settings.apply {
                            javaScriptEnabled = true
                            domStorageEnabled = true // Required for roguelite localStorage!
                            allowFileAccess = true  // Required for local assets
                            allowContentAccess = true
                            allowFileAccessFromFileURLs = true
                            allowUniversalAccessFromFileURLs = true
                            
                            // Allow autoplay audio without requiring user gesture
                            mediaPlaybackRequiresUserGesture = false
                            
                            // Webview performance optimizations
                            cacheMode = WebSettings.LOAD_NO_CACHE
                            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        }
                        
                        // Add JS Interface for Native Speech
                        addJavascriptInterface(AndroidTTSInterface(), "AndroidTTS")

                        // Load our localized game inside the WebView
                        loadUrl("file:///android_asset/index.html")
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.US)
            if (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED) {
                ttsReady = true
                // Deep low bass voice pitch (0.5 is low, 1.0 is default)
                tts?.setPitch(0.48f)
                tts?.setSpeechRate(0.80f)
            }
        }
    }

    inner class AndroidTTSInterface {
        @JavascriptInterface
        fun speak(text: String) {
            if (ttsReady && tts != null) {
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "IntroTTS")
            }
        }
    }

    override fun onDestroy() {
        if (tts != null) {
            tts?.stop()
            tts?.shutdown()
        }
        super.onDestroy()
    }
}
