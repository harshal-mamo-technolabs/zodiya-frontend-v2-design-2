import { useEffect } from 'react';
import { helpscoutSignature } from '../lib/api.js';
import { t } from '../i18n/index.js';

const SRC = 'https://beacon-v2.helpscout.net';

/* The Help Scout Beacon, mounted only by the support page (as in the earlier
   Zodiya app): it loads the script, opens the chat, and signs the user in with
   secure mode. Leaving the page removes all of it again.
   One component, not three: identify has to wait for init, so the steps run in order. */
export default function SupportBeacon() {
  useEffect(() => {
    const id = import.meta.env.VITE_HELPSCOUT_BEACON_ID;
    if (!id) { console.warn('VITE_HELPSCOUT_BEACON_ID is not set, so support chat is off.'); return; }
    let gone = false;

    // the official queue stub keeps any call made before the script arrives
    if (!window.Beacon) {
      const q = (method, options, data) => q.readyQueue.push({ method, options, data });
      q.readyQueue = [];
      window.Beacon = q;
    }

    const script = Object.assign(document.createElement('script'), { async: true, src: SRC });
    script.onload = async () => {
      if (gone) return;
      const Beacon = window.Beacon;
      Beacon('init', id);
      Beacon('config', {
        enableFab: true, showName: false, showSubject: false, showEmail: false,
        /* Our look, as far as Help Scout allows: its header, buttons and launcher take
           this colour with white text on top, so it is the app's navy (our gold is too
           light for white text). Fonts and the panel itself are Help Scout's own. */
        color: '#1C2538',
        display: { style: 'iconAndText', text: t('Help'), iconImage: 'message', position: 'right' }
      });
      Beacon('once', 'ready', () => { if (!gone) Beacon('show'); });
      // a shared browser must never show the last person's chat: start clean, then identify
      Beacon('logout');
      try {
        // the utm_* fields land on the customer's card as Help Scout customer properties
        const identity = await helpscoutSignature();
        if (!gone) Beacon('identify', identity);
      } catch (e) {
        // signed out, or secure mode not set up on the API: the chat still works, anonymously
      }
      if (!gone) Beacon('event', { type: 'page-viewed', url: window.location.href, title: document.title });
    };
    script.onerror = () => console.error('Help Scout Beacon could not be loaded.');
    document.head.appendChild(script);

    return () => {
      gone = true;
      try { if (typeof window.Beacon === 'function') window.Beacon('destroy'); } catch (e) {}
      script.remove();
      document.querySelectorAll('script[src*="beacon-v2.helpscout.net"], link[href*="beacon"]').forEach(n => n.remove());
      try { delete window.Beacon; } catch (e) {}
    };
  }, []);

  return null;
}
