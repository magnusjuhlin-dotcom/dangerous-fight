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

        // Keep screen awake during game and multiplayer
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

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
            // The engine itself is up; language/pitch/rate are set per utterance
            ttsReady = true
        }
    }

    private fun applyVoice(locale: Locale, pitch: Float, rate: Float) {
        val engine = tts ?: return
        val result = engine.setLanguage(locale)
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            // Fall back to the device default rather than staying silent
            engine.setLanguage(Locale.getDefault())
        }
        // Prefer an installed male voice for the language: a real male voice at a
        // natural pitch sounds human, a pitched-down female voice sounds robotic.
        try {
            val lang = engine.voice?.locale?.language ?: locale.language
            val maleHints = listOf("cmh", "iom", "iol", "tpd", "gbd", "male", "-m-")
            val femaleHints = listOf("lfs", "tpf", "sfg", "iob", "female", "-f-")
            val candidates = engine.voices
                ?.filter { it.locale.language == lang && !it.isNetworkConnectionRequired }
                ?.filter { v -> femaleHints.none { v.name.lowercase().contains(it) } }
                ?.sortedWith(compareByDescending<android.speech.tts.Voice> { v -> maleHints.any { v.name.lowercase().contains(it) } }
                    .thenByDescending { it.quality })
            val pick = candidates?.firstOrNull { v -> maleHints.any { v.name.lowercase().contains(it) } }
            if (pick != null) engine.voice = pick
        } catch (e: Exception) {
            // voice listing is best effort; language + pitch still apply
        }
        engine.setPitch(pitch)
        engine.setSpeechRate(rate)
    }

    inner class AndroidTTSInterface {
        // Epic low-pitched English intro voice
        @JavascriptInterface
        fun speak(text: String) {
            if (ttsReady && tts != null) {
                applyVoice(Locale.US, 0.48f, 0.80f)
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "IntroTTS")
            }
        }

        // Read-aloud for the speaker button: any language, natural voice
        @JavascriptInterface
        fun speakText(text: String, lang: String, pitch: Float, rate: Float) {
            if (ttsReady && tts != null) {
                applyVoice(Locale.forLanguageTag(lang), pitch, rate)
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "ReadAloud")
            }
        }

        @JavascriptInterface
        fun stop() {
            tts?.stop()
        }

        @JavascriptInterface
        fun isSpeaking(): Boolean {
            return tts?.isSpeaking ?: false
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
