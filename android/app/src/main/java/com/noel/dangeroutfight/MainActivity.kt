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
    private var lastVoiceWasNeural = false
    private var forceLocalVoice = false
    private var lastSpokenText: String? = null
    private var lastLocale: Locale = Locale.US
    private var lastPitch = 1.0f
    private var lastRate = 1.0f

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
            tts?.setOnUtteranceProgressListener(object : android.speech.tts.UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) {}
                @Deprecated("deprecated in API 21")
                override fun onError(utteranceId: String?) = onError(utteranceId, -1)
                override fun onError(utteranceId: String?, errorCode: Int) {
                    // A neural voice needs the network: retry the same line with the
                    // offline voice instead of leaving the player in silence.
                    val text = lastSpokenText ?: return
                    if (!lastVoiceWasNeural) return
                    forceLocalVoice = true
                    android.os.Handler(mainLooper).post {
                        applyVoice(lastLocale, lastPitch, lastRate)
                        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId ?: "Retry")
                    }
                }
            })
        }
    }

    // Google's voice ids end in -local or -network; the network ones are the
    // neural models and sound markedly more human. Male Swedish voices carry
    // the -cmh/-iom/-iol/-tpd/-gbd suffixes, female ones -lfs/-tpf/-sfg/-iob.
    private val maleHints = listOf("cmh", "iom", "iol", "tpd", "gbd", "male", "-m-")
    private val femaleHints = listOf("lfs", "tpf", "sfg", "iob", "female", "-f-")

    private fun pickVoice(lang: String): android.speech.tts.Voice? {
        val engine = tts ?: return null
        val all = engine.voices?.filter { it.locale.language == lang } ?: return null
        fun isMale(v: android.speech.tts.Voice) = maleHints.any { v.name.lowercase().contains(it) }
        fun isFemale(v: android.speech.tts.Voice) = femaleHints.any { v.name.lowercase().contains(it) }
        // Score: male first, then neural (network) models, then engine quality
        val usable = if (forceLocalVoice) all.filterNot { it.isNetworkConnectionRequired } else all
        val ranked = usable.filterNot { isFemale(it) }.sortedWith(
            compareByDescending<android.speech.tts.Voice> { if (isMale(it)) 1 else 0 }
                .thenByDescending { if (!forceLocalVoice && it.isNetworkConnectionRequired) 1 else 0 }
                .thenByDescending { it.quality }
        )
        return ranked.firstOrNull { isMale(it) } ?: ranked.firstOrNull()
    }

    private fun applyVoice(locale: Locale, pitch: Float, rate: Float) {
        val engine = tts ?: return
        val result = engine.setLanguage(locale)
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            // Fall back to the device default rather than staying silent
            engine.setLanguage(Locale.getDefault())
        }
        try {
            val lang = engine.voice?.locale?.language ?: locale.language
            val pick = pickVoice(lang)
            lastVoiceWasNeural = false
            if (pick != null) {
                engine.voice = pick
                // A neural voice is already a real male timbre, so it only needs a
                // nudge downwards; heavy pitch shifting is what sounds robotic.
                lastVoiceWasNeural = pick.isNetworkConnectionRequired
            }
        } catch (e: Exception) {
            // voice listing is best effort; language + pitch still apply
        }
        engine.setPitch(if (lastVoiceWasNeural) (pitch + 0.15f).coerceAtMost(1.0f) else pitch)
        engine.setSpeechRate(rate)
    }

    inner class AndroidTTSInterface {
        // Epic low-pitched English intro voice
        @JavascriptInterface
        fun speak(text: String) {
            if (ttsReady && tts != null) {
                lastSpokenText = text; lastLocale = Locale.US; lastPitch = 0.48f; lastRate = 0.80f
                applyVoice(Locale.US, 0.48f, 0.80f)
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "IntroTTS")
            }
        }

        // Read-aloud for the speaker button: any language, natural voice
        @JavascriptInterface
        fun speakText(text: String, lang: String, pitch: Float, rate: Float) {
            if (ttsReady && tts != null) {
                val loc = Locale.forLanguageTag(lang)
                lastSpokenText = text; lastLocale = loc; lastPitch = pitch; lastRate = rate
                applyVoice(loc, pitch, rate)
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

        // Diagnostics: which voices the device actually offers, and which one is active
        @JavascriptInterface
        fun listVoices(lang: String): String {
            val engine = tts ?: return "[]"
            val all = engine.voices?.filter { it.locale.language == lang } ?: emptyList()
            val current = engine.voice?.name ?: "-"
            return all.joinToString(",", prefix = "current=$current|") {
                it.name + ":q" + it.quality + (if (it.isNetworkConnectionRequired) ":net" else ":local")
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
