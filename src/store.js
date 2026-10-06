/* DANGEROUS FIGHT - SAMURAJ-BUTIK and HJÄLPMEDEL-BUTIK: real money */
/* Purchases go through Google Play Billing in the Android app (the native
   side is AndroidBilling in MainActivity.kt). Everywhere else the shop is
   shown but cannot sell anything. Credits are only ever added for a purchase
   Google Play reports as paid, and never twice for the same purchase. */

// The product ids must match the in-app products created in Google Play
// Console. The prices here are only shown until Google Play reports the
// real, localised price.
export const CREDIT_PACKS = [
    { id: 'credits_100', credits: 100, price: '10 kr' },
    { id: 'credits_300', credits: 300, price: '30 kr' },
    { id: 'credits_2100', credits: 2100, price: '70 kr', badge: '3× MER!' }
];

// Hjälpmedel: one-match boosts against the computer, bought in packs.
// Each one is used up when a match starts with it switched on.
export const HELPERS = {
    shield: { icon: '🛡️', name: 'TORNSKÖLD', desc: 'Ditt torn tar ingen skada de första 30 sekunderna.' },
    energy: { icon: '⚡', name: 'FULL ENERGI', desc: 'Börja matchen med 3 laddade svärdsvågor.' },
    rage: { icon: '🔥', name: 'RASERI DIREKT', desc: 'RASERI-mätaren är full från start.' },
    revive: { icon: '❤️', name: 'SNABB ÅTERUPPSTÅNDELSE', desc: 'Din samuraj kommer tillbaka efter 1 sekund i stället för 3.' }
};

export const HELPER_PACKS = [
    { id: 'helper_shield_3', helpers: { shield: 3 }, price: '10 kr' },
    { id: 'helper_energy_5', helpers: { energy: 5 }, price: '10 kr' },
    { id: 'helper_rage_3', helpers: { rage: 3 }, price: '15 kr' },
    { id: 'helper_revive_5', helpers: { revive: 5 }, price: '10 kr' },
    { id: 'helper_mega', helpers: { shield: 5, energy: 5, rage: 5, revive: 5 }, price: '39 kr', badge: 'MEGA-PAKET' }
];

// Fusk: bought once, yours forever, switched on and off before a match
// against the computer (never online)
export const CHEATS = {
    god: { icon: '👑', name: 'GUDSLÄGE', desc: 'Din samuraj tar ingen skada alls.' },
    tower: { icon: '🏰', name: 'ODÖDLIGT TORN', desc: 'Ditt torn kan inte falla.' },
    energy: { icon: '♾️', name: 'OÄNDLIG ENERGI', desc: 'Svärdsvågorna tar aldrig slut.' },
    damage: { icon: '💥', name: 'SUPERSKADA', desc: 'Du gör tre gånger så mycket skada.' },
    slow: { icon: '🐌', name: 'SEG DATOR', desc: 'Datorn tänker långsamt och dashar svagt.' },
    speed: { icon: '💨', name: 'SUPERFART', desc: 'Din samuraj dashar 50 % snabbare.' },
    homing: { icon: '🎯', name: 'MÅLSÖKANDE SVÄRDSVÅGOR', desc: 'Dina svärdsvågor svänger mot datorns samuraj.' },
    rage: { icon: '🔥', name: 'EVIGT RASERI', desc: 'RASERI-mätaren fylls på direkt igen.' },
    freeze: { icon: '🧊', name: 'FRYST DATOR', desc: 'Datorn står helt still de första 15 sekunderna.' },
    lava: { icon: '🥾', name: 'LAVASKOR', desc: 'Du kan gå rakt genom lavan utan att brännas.' },
    credits: { icon: '💰', name: 'DUBBLA CREDITS', desc: 'Du får dubbelt så många Cyber-Credits efter varje match.' }
};

export const CHEAT_PACKS = [
    { id: 'cheat_god', cheats: ['god'], price: '20 kr' },
    { id: 'cheat_tower', cheats: ['tower'], price: '20 kr' },
    { id: 'cheat_energy', cheats: ['energy'], price: '20 kr' },
    { id: 'cheat_damage', cheats: ['damage'], price: '20 kr' },
    { id: 'cheat_slow', cheats: ['slow'], price: '20 kr' },
    { id: 'cheat_speed', cheats: ['speed'], price: '20 kr' },
    { id: 'cheat_homing', cheats: ['homing'], price: '20 kr' },
    { id: 'cheat_rage', cheats: ['rage'], price: '20 kr' },
    { id: 'cheat_freeze', cheats: ['freeze'], price: '20 kr' },
    { id: 'cheat_lava', cheats: ['lava'], price: '20 kr' },
    { id: 'cheat_credits', cheats: ['credits'], price: '20 kr' },
    // (everyone who bought ALLT FUSK gets new cheats too: it unlocks this whole list)
    { id: 'cheat_all', cheats: ['god', 'tower', 'energy', 'damage', 'slow', 'speed', 'homing', 'rage', 'freeze', 'lava', 'credits'], price: '99 kr', badge: 'ALLT FUSK' }
];

const ALL_PRODUCTS = [...CREDIT_PACKS, ...HELPER_PACKS, ...CHEAT_PACKS];

const CONNECTING_TEXT = 'Ansluter till Google Play…';
const NOT_OPEN_TEXT = 'Butiken är inte öppen än. Appen måste först finnas på Google Play.';

export class CreditStore {
    constructor(upgradeMgr, onChange) {
        this.upgradeMgr = upgradeMgr;
        this.onChange = onChange; // (statusText) => void, re-render the shop
        this.prices = {};         // productId -> price text from Google Play
        this.ready = false;       // Google Play answered with the products
        this.status = '';
        this.creditedKey = 'dangerous_fight_credited_purchases';

        // The native side calls these (it has no other way into the page)
        window.onBillingProducts = (json) => this.handleProducts(json);
        window.onBillingPurchase = (json) => this.handlePurchase(json);
        window.onBillingOwned = (json) => this.handleOwned(json);
        window.onBillingPending = () => this.setStatus('Köpet väntar på att betalas. Du får det du köpt när betalningen är klar.');
        window.onBillingError = (msg) => this.setStatus(msg || 'Köpet gick inte igenom.');

        if (this.hasBilling()) {
            try { window.AndroidBilling.connect(); } catch (e) {}
        }
    }

    hasBilling() {
        return !!(window.AndroidBilling && window.AndroidBilling.buy);
    }

    setStatus(text) {
        this.status = text;
        if (this.onChange) this.onChange();
    }

    // Opening the shop: ask Google Play for the products and prices again
    refresh() {
        if (!this.hasBilling()) {
            this.status = 'Köp går bara att göra i Android-appen från Google Play.';
            return;
        }
        // A fresh visit starts clean: an old "thank you" or error is not news any more
        this.status = this.ready ? '' : CONNECTING_TEXT;
        try { window.AndroidBilling.connect(); } catch (e) {}
    }

    handleProducts(json) {
        let list = [];
        try { list = JSON.parse(json) || []; } catch (e) {}
        this.prices = {};
        list.forEach((p) => { if (p && p.id) this.prices[p.id] = p.price; });
        this.ready = ALL_PRODUCTS.some((pack) => this.prices[pack.id]);
        if (!this.ready) this.setStatus(NOT_OPEN_TEXT);
        // Products are fetched again on every resume, i.e. right after each
        // Google Play purchase sheet closes: only clear the connection notices,
        // never the purchase result ("Tack för köpet!", "Köpet avbröts." ...)
        else if (this.status === CONNECTING_TEXT || this.status === NOT_OPEN_TEXT) this.setStatus('');
        else if (this.onChange) this.onChange();
    }

    canBuy(pack) {
        return this.hasBilling() && this.ready && !!this.prices[pack.id];
    }

    buy(pack) {
        if (!this.canBuy(pack)) return;
        this.setStatus('Öppnar Google Play…');
        try { window.AndroidBilling.buy(pack.id); } catch (e) { this.setStatus('Köpet gick inte att starta.'); }
    }

    // Everything the Google Play account owns right now (sent after every
    // purchase query). Fusk that is not in it any more was refunded or
    // cancelled: lock it again. Fusk handed over in this session stays, in
    // case this list was asked for just before that purchase went through.
    handleOwned(json) {
        let ids = null;
        try { ids = JSON.parse(json); } catch (e) {}
        if (!Array.isArray(ids)) return;
        const keep = new Set(this.deliveredCheats || []);
        CHEAT_PACKS.forEach((pack) => { if (ids.includes(pack.id)) pack.cheats.forEach((k) => keep.add(k)); });
        const st = this.upgradeMgr.state;
        let changed = false;
        Object.keys(st.cheats || {}).forEach((k) => {
            if (st.cheats[k] && !keep.has(k)) {
                st.cheats[k] = false;
                if (st.cheatsOn) st.cheatsOn[k] = false;
                changed = true;
            }
        });
        if (changed) {
            this.upgradeMgr.save();
            if (this.onChange) this.onChange();
        }
    }

    creditedTokens() {
        // (a damaged value must not stop purchases from being paid out)
        try {
            const list = JSON.parse(localStorage.getItem(this.creditedKey));
            return Array.isArray(list) ? list : [];
        } catch (e) { return []; }
    }

    // A paid purchase. Credit it once (remembered by its token, so a purchase
    // that is delivered again after a crash is not paid out twice), and only
    // then tell Google Play it has been used up so it can be bought again.
    handlePurchase(json) {
        let p = null;
        try { p = JSON.parse(json); } catch (e) {}
        if (!p || !p.token) return;
        const pack = ALL_PRODUCTS.find((x) => x.id === p.productId);
        if (!pack) return; // not ours: never use up a purchase we did not pay out
        const done = this.creditedTokens();
        // Fusk is kept for good: never used up, only acknowledged. Google Play
        // hands it over again on every start (and after a reinstall), so it
        // is simply unlocked again every time.
        if (pack.cheats) {
            const owned = this.upgradeMgr.state.cheats || {};
            const isNew = !pack.cheats.every((k) => owned[k]);
            this.upgradeMgr.unlockCheats(pack.cheats);
            this.deliveredCheats = this.deliveredCheats || new Set();
            pack.cheats.forEach((k) => this.deliveredCheats.add(k));
            // (an old token can be trimmed off the list below: then only the
            // fact that the fusk is already unlocked keeps the thanks away)
            if (!done.includes(p.token)) {
                done.push(p.token);
                try { localStorage.setItem(this.creditedKey, JSON.stringify(done.slice(-200))); } catch (e) {}
            }
            if (isNew) this.setStatus('Tack för köpet! Fusket är ditt för alltid. Slå på det innan en match mot datorn.');
            else if (this.onChange) this.onChange();
            if (!p.acknowledged) {
                try { if (window.AndroidBilling.acknowledge) window.AndroidBilling.acknowledge(p.token); } catch (e) {}
            }
            return;
        }
        if (!done.includes(p.token)) {
            const qty = Math.max(1, Math.floor(p.quantity || 1)); // multi-quantity purchases
            if (pack.credits) {
                const credits = pack.credits * qty;
                this.upgradeMgr.addCredits(credits);
                done.push(p.token);
                try { localStorage.setItem(this.creditedKey, JSON.stringify(done.slice(-200))); } catch (e) {}
                this.setStatus(`Tack för köpet! +${credits.toLocaleString('sv-SE')} ⚡`);
            } else {
                this.upgradeMgr.addHelpers(pack.helpers, qty);
                done.push(p.token);
                try { localStorage.setItem(this.creditedKey, JSON.stringify(done.slice(-200))); } catch (e) {}
                this.setStatus('Tack för köpet! Slå på hjälpmedlen innan en match mot datorn.');
            }
        }
        // The WebView writes localStorage to disk a few seconds late. Use the
        // purchase up only after that: if the app dies first, Google Play
        // delivers it again on the next start, and either the credits were
        // never saved (paid out now) or the token was saved with them (skipped).
        this.pendingConsume = this.pendingConsume || new Set();
        if (this.pendingConsume.has(p.token)) return;
        this.pendingConsume.add(p.token);
        setTimeout(() => {
            this.pendingConsume.delete(p.token);
            try { window.AndroidBilling.consume(p.token); } catch (e) {}
        }, 10000);
    }
}
