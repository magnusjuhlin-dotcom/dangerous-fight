/* DANGEROUS FIGHT - LANGUAGE: Swedish (as written) or English */
/* The game is written in Swedish. In English mode every piece of text is
   swapped on its way to the screen: DOM text nodes (also the ones the game
   changes later - a MutationObserver sees those), a few text attributes, and
   everything drawn on the canvas with fillText/strokeText. The Swedish
   original is remembered, so switching back restores it. */

import { EN_EXACT, EN_PATTERNS } from './i18n-en.js';

export class I18n {
    constructor() {
        this.storageKey = 'dangerous_fight_lang';
        let saved = null;
        try { saved = localStorage.getItem(this.storageKey); } catch (e) {}
        this.lang = saved === 'en' || saved === 'sv' ? saved : null; // null: not chosen yet
        window.gameLang = this.lang || 'sv';
        document.documentElement.lang = window.gameLang;

        this.original = new WeakMap(); // text node -> its Swedish text
        this.written = new WeakMap();  // text node -> the text we put there
        this.cache = new Map();        // Swedish -> English (or null)
        this.attrs = ['placeholder', 'title', 'aria-label', 'data-text'];

        this.patchCanvas();
        this.patchDialogs();
        this.observer = new MutationObserver((mutations) => this.onMutations(mutations));
        this.observer.observe(document.body, {
            childList: true, characterData: true, subtree: true,
            attributes: true, attributeFilter: this.attrs
        });
        if (window.gameLang === 'en') {
            this.everTranslated = true;
            this.translateTree(document.body);
        }
    }

    get chosen() { return this.lang !== null; }

    setLang(lang) {
        this.lang = lang;
        window.gameLang = lang;
        document.documentElement.lang = lang;
        try { localStorage.setItem(this.storageKey, lang); } catch (e) {}
        if (lang === 'en') this.everTranslated = true;
        this.translateTree(document.body);
    }

    // English for a Swedish text, or null when there is none
    english(sv) {
        const key = sv.replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim(); // (soft hyphens are only a line-break hint)
        if (!key) return null;
        if (this.cache.has(key)) return this.cache.get(key);
        let en = Object.prototype.hasOwnProperty.call(EN_EXACT, key) ? EN_EXACT[key] : null;
        if (en === null) {
            for (const [re, out] of EN_PATTERNS) {
                if (re.test(key)) { en = key.replace(re, out); break; }
            }
        }
        this.cache.set(key, en);
        return en;
    }

    // A Swedish text in the current language, keeping its surrounding spaces
    tr(sv) {
        if (window.gameLang !== 'en' || typeof sv !== 'string') return sv;
        const en = this.english(sv);
        if (en === null) return sv;
        const lead = sv.match(/^\s*/)[0];
        const trail = sv.match(/\s*$/)[0];
        return lead + en + trail;
    }

    applyText(node) {
        const cur = node.nodeValue;
        // Whatever the game wrote last is the Swedish original
        if (this.written.get(node) !== cur) this.original.set(node, cur);
        const sv = this.original.get(node);
        const target = this.tr(sv);
        this.written.set(node, target);
        if (cur !== target) node.nodeValue = target;
    }

    applyAttr(el, name) {
        if (!el.hasAttribute(name)) return;
        const store = el.__i18n || (el.__i18n = {});
        const rec = store[name] || (store[name] = {});
        const cur = el.getAttribute(name);
        if (rec.written !== cur) rec.sv = cur;
        const target = this.tr(rec.sv);
        rec.written = target;
        if (cur !== target) el.setAttribute(name, target);
    }

    translateTree(root) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) { this.applyText(root); return; }
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        if (root.closest && root.closest('script, style, [data-no-translate]')) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.parentElement && n.parentElement.closest('script, style, [data-no-translate]'))
                ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });
        let n;
        while ((n = walker.nextNode())) this.applyText(n);
        const sel = this.attrs.map((a) => `[${a}]`).join(',');
        [root, ...root.querySelectorAll(sel)].forEach((el) => {
            if (!el.getAttribute) return;
            this.attrs.forEach((a) => this.applyAttr(el, a));
        });
    }

    onMutations(mutations) {
        // Swedish and never translated: nothing to undo, stay out of the way
        if (window.gameLang !== 'en' && !this.everTranslated) return;
        if (window.gameLang === 'en') this.everTranslated = true;
        for (const m of mutations) {
            if (m.type === 'characterData') this.applyText(m.target);
            else if (m.type === 'attributes') this.applyAttr(m.target, m.attributeName);
            else m.addedNodes.forEach((node) => this.translateTree(node));
        }
    }

    // Browser dialogs ("Är du säker ... nollställa poängtavlan?") are not in
    // the page, so neither the observer nor the canvas patch sees them
    patchDialogs() {
        const i18n = this;
        ['alert', 'confirm', 'prompt'].forEach((fn) => {
            const orig = window[fn];
            if (typeof orig !== 'function' || orig.__i18nPatched) return;
            const patched = function (message, ...rest) {
                return orig.call(window, i18n.tr(message), ...rest);
            };
            patched.__i18nPatched = true;
            window[fn] = patched;
        });
    }

    // Words drawn in the arena ("K.O.!", "RAM!"...) go through here
    patchCanvas() {
        const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
        if (!proto || proto.__i18nPatched) return;
        proto.__i18nPatched = true;
        const i18n = this;
        ['fillText', 'strokeText', 'measureText'].forEach((fn) => {
            const orig = proto[fn];
            proto[fn] = function (text, ...rest) {
                return orig.call(this, i18n.tr(text), ...rest);
            };
        });
    }
}
