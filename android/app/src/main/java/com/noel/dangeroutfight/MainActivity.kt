package com.noel.dangeroutfight

import android.annotation.SuppressLint
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import org.json.JSONArray
import org.json.JSONObject
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

    // Samuraj-butik (Google Play Billing). The ids must match the in-app
    // products in Play Console and CREDIT_PACKS in src/store.js.
    private var webView: WebView? = null
    private var billing: BillingClient? = null
    private val creditProducts = listOf(
        "credits_100", "credits_300", "credits_2100",
        // Hjälpmedel-butik (HELPER_PACKS in src/store.js)
        "helper_shield_3", "helper_energy_5", "helper_rage_3", "helper_revive_5", "helper_mega",
        // Fusk-butik (CHEAT_PACKS in src/store.js): kept for good, never consumed
        "cheat_god", "cheat_tower", "cheat_energy", "cheat_damage", "cheat_slow",
        "cheat_speed", "cheat_homing", "cheat_rage", "cheat_freeze", "cheat_lava", "cheat_credits", "cheat_all"
    )
    private val productDetails = mutableMapOf<String, ProductDetails>()
    private var billingConnecting = false

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
                        webView = this
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        webViewClient = WebViewClient()
                        // Without a WebChromeClient the WebView drops alert()/confirm()
                        // silently (confirm() answers false): "NOLLSTÄLL STATISTIK" did nothing
                        webChromeClient = WebChromeClient()
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
                        addJavascriptInterface(AndroidBillingInterface(), "AndroidBilling")
                        addJavascriptInterface(AndroidHapticsInterface(), "AndroidHaptics")

                        // Load our localized game inside the WebView
                        loadUrl("file:///android_asset/index.html")
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }

        // The phone's back button: the page closes its screen / pauses the
        // match (window.onAndroidBack in src/ui.js). Only when the page says
        // it has nothing to go back to (main menu) does the app go to the
        // background, instead of closing in the middle of a match.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val view = webView
                if (view == null) {
                    moveTaskToBack(true)
                    return
                }
                view.evaluateJavascript(
                    "(function(){try{return !!(window.onAndroidBack && window.onAndroidBack());}catch(e){return false;}})()"
                ) { result ->
                    if (result != "true") moveTaskToBack(true)
                }
            }
        })
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            // The engine itself is up; language/pitch/rate are set per utterance
            ttsReady = true
            // A line asked for while the engine was still starting (the
            // "AJ Sports" line as the game opens): say it now
            pendingIntro?.let { pendingIntro = null; speakIntro(it) }
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
                        speakNaturally(text, "Retry")
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
        // Score: a deep voice has to be a male one, and a human one has to be a
        // neural (network) model. Male neural > unknown neural > male local >
        // anything female, then engine quality.
        val usable = if (forceLocalVoice) all.filterNot { it.isNetworkConnectionRequired } else all
        fun score(v: android.speech.tts.Voice): Int {
            val neural = !forceLocalVoice && v.isNetworkConnectionRequired
            return when {
                isMale(v) && neural -> 4
                !isFemale(v) && neural -> 3
                isMale(v) -> 2
                !isFemale(v) -> 1
                else -> 0
            }
        }
        val ranked = usable.sortedWith(
            compareByDescending<android.speech.tts.Voice> { score(it) }
                .thenByDescending { it.quality }
                .thenBy { if (it.features?.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED) == true) 1 else 0 }
        )
        return ranked.firstOrNull()
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
        // Every step away from 1.0 is processing on top of the recorded voice,
        // and below roughly 0.85 the formants smear and it turns synthetic.
        // Keep it close to natural: the depth comes from picking a male voice.
        engine.setPitch(pitch.coerceIn(0.85f, 1.1f))
        engine.setSpeechRate(rate)
        // Speak on the media stream at full volume so the narrator carries over the game
        try {
            engine.setAudioAttributes(
                android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
        } catch (e: Exception) {
        }
    }

    // One long utterance comes out as a flat run-on. Splitting on sentence ends
    // and inserting a short silence gives the narrator natural phrasing.
    private fun speakNaturally(text: String, idPrefix: String) {
        val engine = tts ?: return
        val chunks = text.split(Regex("(?<=[.!?:])\\s+"))
            .map { it.trim() }
            .filter { it.isNotEmpty() }
        if (chunks.isEmpty()) {
            engine.speak(text, TextToSpeech.QUEUE_FLUSH, loudParams(), idPrefix)
            return
        }
        engine.speak(chunks[0], TextToSpeech.QUEUE_FLUSH, loudParams(), idPrefix)
        for (i in 1 until chunks.size) {
            try {
                // about the breath a person takes between sentences
                engine.playSilentUtterance(220L,TextToSpeech.QUEUE_ADD, "$idPrefix-pause$i")
            } catch (e: Exception) {
            }
            engine.speak(chunks[i], TextToSpeech.QUEUE_ADD, loudParams(), "$idPrefix-$i")
        }
    }

    // Max volume for the utterance itself (independent of the device volume slider)
    private fun loudParams(): Bundle {
        val params = Bundle()
        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
        params.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, android.media.AudioManager.STREAM_MUSIC)
        return params
    }

    // ---- Samuraj-butik: Google Play Billing ----

    // Call window.<fn>(arg) in the page; the argument is passed as a JS string
    private fun js(fn: String, arg: String) {
        val quoted = JSONObject.quote(arg)
        runOnUiThread { webView?.evaluateJavascript("window.$fn && window.$fn($quoted)", null) }
    }

    private val purchasesListener = PurchasesUpdatedListener { result, purchases ->
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> purchases?.forEach { deliver(it) }
            BillingClient.BillingResponseCode.USER_CANCELED -> js("onBillingError", "Köpet avbröts.")
            // (the page would otherwise keep showing "Öppnar Google Play…")
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                js("onBillingError", "Du har redan köpt det här.")
                queryProductsAndPurchases()
            }
            else -> js("onBillingError", "Köpet gick inte igenom (fel ${result.responseCode}).")
        }
    }

    // Hand a paid purchase to the page. The page credits it and then calls
    // consume(); until then Google Play keeps it and delivers it again.
    private fun deliver(p: Purchase) {
        when (p.purchaseState) {
            Purchase.PurchaseState.PURCHASED -> p.products.forEach { id ->
                val o = JSONObject()
                o.put("productId", id)
                o.put("token", p.purchaseToken)
                o.put("orderId", p.orderId ?: "")
                o.put("quantity", p.quantity)
                // (fusk is handed over again on every start: acknowledge it only once)
                o.put("acknowledged", p.isAcknowledged)
                js("onBillingPurchase", o.toString())
            }
            Purchase.PurchaseState.PENDING -> js("onBillingPending", "")
            else -> {}
        }
    }

    private fun connectBilling() {
        val client = billing ?: BillingClient.newBuilder(this)
            .setListener(purchasesListener)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build()
            .also { billing = it }
        if (client.isReady) {
            queryProductsAndPurchases()
            return
        }
        // A second startConnection() while the first is still connecting is
        // answered at once with DEVELOPER_ERROR, which would tell the page the
        // shop is closed. The first connection's answer covers both calls.
        if (billingConnecting) return
        billingConnecting = true
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                billingConnecting = false
                if (result.responseCode == BillingClient.BillingResponseCode.OK) queryProductsAndPurchases()
                else js("onBillingProducts", "[]")
            }
            override fun onBillingServiceDisconnected() {
                billingConnecting = false
            }
        })
    }

    private fun queryProductsAndPurchases() {
        val client = billing ?: return
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(creditProducts.map {
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(it)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            })
            .build()
        client.queryProductDetailsAsync(params) { _, result ->
            val list = JSONArray()
            result.productDetailsList.forEach { d ->
                productDetails[d.productId] = d
                val price = d.oneTimePurchaseOfferDetails?.formattedPrice ?: return@forEach
                list.put(JSONObject().put("id", d.productId).put("price", price))
            }
            js("onBillingProducts", list.toString())
        }
        // Paid but never used up (the app closed mid-purchase, or a pending
        // payment completed later): deliver it again
        client.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
        ) { result, purchases ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                purchases.forEach { deliver(it) }
                // Everything the account owns right now: fusk that was
                // refunded is no longer in this list and is locked again
                val owned = JSONArray()
                purchases.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
                    .forEach { p -> p.products.forEach { owned.put(it) } }
                js("onBillingOwned", owned.toString())
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (billing?.isReady == true) queryProductsAndPurchases()
    }

    // Buzz on hits. The page's navigator.vibrate only works after a tap in
    // the page itself; the native vibrator always does.
    inner class AndroidHapticsInterface {
        @JavascriptInterface
        fun vibrate(pattern: String) {
            val timings = pattern.split(',').mapNotNull { it.trim().toLongOrNull() }.map { it.coerceIn(0L, 2000L) }
            if (timings.isEmpty()) return
            try {
                val vibrator = if (android.os.Build.VERSION.SDK_INT >= 31) {
                    (getSystemService(VIBRATOR_MANAGER_SERVICE) as android.os.VibratorManager).defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    getSystemService(VIBRATOR_SERVICE) as android.os.Vibrator
                }
                // [on, off, on, ...] like navigator.vibrate; Android wants a leading pause
                val wave = longArrayOf(0L) + timings.toLongArray()
                if (android.os.Build.VERSION.SDK_INT >= 26) {
                    vibrator.vibrate(android.os.VibrationEffect.createWaveform(wave, -1))
                } else {
                    // Android 7 (minSdk 24) has no VibrationEffect
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(wave, -1)
                }
            } catch (e: Exception) {
            }
        }
    }

    inner class AndroidBillingInterface {
        @JavascriptInterface
        fun connect() {
            runOnUiThread { connectBilling() }
        }

        @JavascriptInterface
        fun buy(productId: String) {
            runOnUiThread {
                val details = productDetails[productId]
                val client = billing
                if (details == null || client == null || !client.isReady) {
                    js("onBillingError", "Butiken är inte öppen än.")
                    return@runOnUiThread
                }
                val flow = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(listOf(
                        BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).build()
                    ))
                    .build()
                client.launchBillingFlow(this@MainActivity, flow)
            }
        }

        // Fusk is kept for good: acknowledged (else Google Play refunds it
        // after 3 days) but never consumed
        @JavascriptInterface
        fun acknowledge(token: String) {
            runOnUiThread {
                billing?.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build()) { _ -> }
            }
        }

        // Called by the page once the credits are saved
        @JavascriptInterface
        fun consume(token: String) {
            runOnUiThread {
                billing?.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(token).build()) { _, _ -> }
            }
        }
    }

    private var pendingIntro: String? = null

    // Epic low-pitched English intro voice. The engine takes a moment to start
    // after launch, so a line asked for before that is kept and said once ready.
    private fun speakIntro(text: String) {
        if (!ttsReady || tts == null) {
            pendingIntro = text
            return
        }
        lastSpokenText = text; lastLocale = Locale.US; lastPitch = 0.85f; lastRate = 0.88f
        applyVoice(Locale.US, 0.85f, 0.88f)
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, loudParams(), "IntroTTS")
    }

    inner class AndroidTTSInterface {
        // Epic low-pitched English intro voice
        @JavascriptInterface
        fun speak(text: String) {
            runOnUiThread { speakIntro(text) }
        }

        // Read-aloud for the speaker button: any language, natural voice
        @JavascriptInterface
        fun speakText(text: String, lang: String, pitch: Float, rate: Float) {
            if (ttsReady && tts != null) {
                val loc = Locale.forLanguageTag(lang)
                lastSpokenText = text; lastLocale = loc; lastPitch = pitch; lastRate = rate
                applyVoice(loc, pitch, rate)
                speakNaturally(text, "ReadAloud")
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
        billing?.endConnection()
        if (tts != null) {
            tts?.stop()
            tts?.shutdown()
        }
        super.onDestroy()
    }
}
