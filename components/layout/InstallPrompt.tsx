"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "install-prompt-dismissed";

type EnvState = { isIOS: boolean; isStandalone: boolean; dismissed: boolean };

export function InstallPrompt() {
  const [env, setEnv] = useState<EnvState | null>(null);

  useEffect(() => {
    // Reads browser-only APIs (navigator, matchMedia, localStorage) that don't
    // exist during SSR — must run post-mount, not derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv({
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window),
      isStandalone: window.matchMedia("(display-mode: standalone)").matches,
      dismissed: localStorage.getItem(DISMISSED_KEY) === "1",
    });
  }, []);

  if (!env || env.isStandalone || env.dismissed || !env.isIOS) {
    return null;
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setEnv((prev) => (prev ? { ...prev, dismissed: true } : prev));
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-accent px-4 py-2 text-sm">
      <p>
        Install this app: tap the share icon, then &quot;Add to Home Screen&quot;.
      </p>
      <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss">
        <X className="size-4" />
      </Button>
    </div>
  );
}
