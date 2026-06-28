// Analytics + Pixels (GA4, Meta, TikTok). Os IDs vêm de variáveis de ambiente;
// os scripts SÓ carregam após o consentimento de cookies (LGPD). Sem ID
// configurado, tudo vira no-op silencioso.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: any;
    _fbq?: any;
    ttq?: any;
  }
}

const GA4 = import.meta.env.VITE_GA4_ID as string | undefined;
const META = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const TIKTOK = import.meta.env.VITE_TIKTOK_PIXEL_ID as string | undefined;

let initialized = false;

export function analyticsConfigured(): boolean {
  return !!(GA4 || META || TIKTOK);
}

/** Injeta os scripts uma única vez. Idempotente. */
export function initAnalytics(): void {
  if (initialized || typeof window === "undefined" || !analyticsConfigured()) return;
  initialized = true;

  // Google Analytics 4
  if (GA4) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    // send_page_view:false → enviamos page_view manualmente a cada rota (SPA)
    window.gtag("config", GA4, { send_page_view: false });
  }

  // Meta (Facebook) Pixel
  if (META && !window.fbq) {
    const n: any = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = document.createElement("script");
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    const s = document.getElementsByTagName("script")[0];
    s.parentNode!.insertBefore(t, s);
    window.fbq("init", META);
  }

  // TikTok Pixel
  if (TIKTOK) {
    const ttq: any = (window.ttq = window.ttq || []);
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
    ttq.setAndDefer = function (t: any, e: string) {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.load = function (e: string) {
      const i = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = i;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = {};
      const o = document.createElement("script");
      o.type = "text/javascript";
      o.async = true;
      o.src = i + "?sdkid=" + e + "&lib=ttq";
      const a = document.getElementsByTagName("script")[0];
      a.parentNode!.insertBefore(o, a);
    };
    ttq.load(TIKTOK);
  }
}

export function trackPageView(path: string): void {
  if (!initialized) return;
  window.gtag?.("event", "page_view", { page_path: path, page_location: typeof location !== "undefined" ? location.href : path });
  window.fbq?.("track", "PageView");
  window.ttq?.page?.();
}

export function trackAddToCart(value: number, label?: string): void {
  if (!initialized) return;
  window.gtag?.("event", "add_to_cart", { currency: "BRL", value, items: label ? [{ item_name: label }] : undefined });
  window.fbq?.("track", "AddToCart", { currency: "BRL", value, content_name: label });
  window.ttq?.track?.("AddToCart", { currency: "BRL", value });
}

export function trackBeginCheckout(value: number): void {
  if (!initialized) return;
  window.gtag?.("event", "begin_checkout", { currency: "BRL", value });
  window.fbq?.("track", "InitiateCheckout", { currency: "BRL", value });
  window.ttq?.track?.("InitiateCheckout", { currency: "BRL", value });
}

export function trackPurchase(value: number, transactionId?: string): void {
  if (!initialized) return;
  window.gtag?.("event", "purchase", { currency: "BRL", value, transaction_id: transactionId });
  window.fbq?.("track", "Purchase", { currency: "BRL", value });
  window.ttq?.track?.("CompletePayment", { currency: "BRL", value });
}
