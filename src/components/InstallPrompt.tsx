"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "sequence_install_dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if previously dismissed (within 7 days)
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari fallback: show manual instructions if no beforeinstallprompt fires
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setTimeout(() => {
        if (!deferredPrompt) setShow(true);
      }, 1500);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [deferredPrompt]);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
    // iOS: can't trigger programmatically, just dismiss
    setShow(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }, []);

  if (!show) return null;

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm animate-[slideUp_0.3s_ease-out]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-900 flex items-center justify-center text-white font-black text-lg shrink-0">
            S
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Install Sequence</h3>
            <p className="text-sm text-gray-500">
              Add to your home screen for the best experience
            </p>
          </div>
        </div>

        {isIOS && !deferredPrompt ? (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              Tap{" "}
              <span className="inline-flex items-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline text-blue-500">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>{" "}
              Share, then <strong>&quot;Add to Home Screen&quot;</strong>
            </p>
          </div>
        ) : null}

        <div className="flex gap-2">
          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 active:scale-[0.98] transition-all"
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            {deferredPrompt ? "Not now" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
