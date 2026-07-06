// Central GDPR/ePrivacy consent model, shared by the consent banner and every
// feature that needs consent. Three independent categories the user opts into:
//
//   storage — remember app state (filters, audience) in localStorage. Rejecting
//             doesn't disable anything, it just means preferences don't persist
//             between visits.
//   chat    — send chat messages to Ollama Cloud. Rejecting disables the chat.
//   maps    — load Google Maps (third party, cookies). Rejecting disables maps.
//
// The consent record itself is the one "strictly necessary" thing we always
// persist (so we can remember the choice and not re-ask every load); everything
// else routes through storeGet/storeSet, which no-op unless `storage` is granted.

export interface Consent {
  storage: boolean;
  chat: boolean;
  maps: boolean;
}

const KEY = 'neuro-consent';
const VERSION = 1;
export const CONSENT_EVENT = 'neuro-consent-change';

// App-state keys gated behind the `storage` category (cleared if it's withdrawn).
const APP_STATE_KEYS = ['neuro-map-filters', 'neuro-web-filters', 'neuro-audience'];

export function getConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || o.v !== VERSION) return null;
    return { storage: !!o.storage, chat: !!o.chat, maps: !!o.maps };
  } catch {
    return null;
  }
}

export function hasDecision(): boolean {
  return getConsent() !== null;
}

export const canStore = (): boolean => getConsent()?.storage === true;
export const canChat = (): boolean => getConsent()?.chat === true;
export const canMaps = (): boolean => getConsent()?.maps === true;

// Persist a decision and notify listeners. Writing the consent record itself is
// the necessary exception, so it's stored regardless of the `storage` choice.
export function setConsent(c: Consent): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...c, v: VERSION }));
  } catch {
    // storage unavailable — the choice still holds for this page via the event below
  }
  if (!c.storage) {
    // Withdrew storage consent → drop any app-state we may have kept.
    for (const k of APP_STATE_KEYS) {
      try { localStorage.removeItem(k); } catch {}
    }
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
  } catch {}
}

// Clears the decision so the banner shows again (consent withdrawal / change).
export function resetConsent(): void {
  try { localStorage.removeItem(KEY); } catch {}
  for (const k of APP_STATE_KEYS) {
    try { localStorage.removeItem(k); } catch {}
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
  } catch {}
}

// Grant one category without disturbing the others (point-of-use opt-in, e.g. the
// "enable maps" button on the map placeholder). If no decision exists yet, the
// other categories default to false.
export function grant(category: keyof Consent): void {
  const cur = getConsent() ?? { storage: false, chat: false, maps: false };
  setConsent({ ...cur, [category]: true });
}

// --- guarded app-state storage (no-ops unless `storage` consent is granted) -----

export function storeGet(key: string): string | null {
  if (!canStore()) return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

export function storeSet(key: string, value: string): void {
  if (!canStore()) return;
  try { localStorage.setItem(key, value); } catch {}
}

export function storeRemove(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}
