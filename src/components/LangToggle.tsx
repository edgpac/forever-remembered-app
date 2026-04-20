import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useLang } from "@/lib/language-context";

// useLayoutEffect on client, useEffect on server (avoids SSR warning)
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function LangToggle() {
  const { lang, setLang } = useLang();
  const sliderRef = useRef<HTMLDivElement>(null);
  const enRef = useRef<HTMLButtonElement>(null);
  const esRef = useRef<HTMLButtonElement>(null);
  const initialized = useRef(false);

  useIsomorphicLayoutEffect(() => {
    const slider = sliderRef.current;
    const enBtn = enRef.current;
    const esBtn = esRef.current;
    if (!slider || !enBtn || !esBtn) return;

    const target = lang === "en" ? enBtn : esBtn;
    const container = enBtn.parentElement!;
    const containerLeft = container.getBoundingClientRect().left;
    const targetLeft = target.getBoundingClientRect().left - containerLeft;

    if (!initialized.current) {
      // Snap on first render — no animation
      gsap.set(slider, { x: targetLeft, width: target.offsetWidth });
      initialized.current = true;
    } else {
      gsap.to(slider, {
        x: targetLeft,
        width: target.offsetWidth,
        duration: 0.38,
        ease: "power3.inOut",
      });
    }
  }, [lang]);

  return (
    <div className="relative flex items-center rounded-full border border-border/70 bg-muted/60 p-1 select-none">
      {/* GSAP-animated sliding indicator */}
      <div
        ref={sliderRef}
        className="absolute top-1 bottom-1 rounded-full bg-card border border-border shadow-sm pointer-events-none"
        style={{ left: 4 }}
      />

      <button
        ref={enRef}
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`relative z-10 px-3.5 py-1 rounded-full text-xs font-semibold tracking-widest transition-colors duration-200 ${
          lang === "en" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>

      <button
        ref={esRef}
        type="button"
        onClick={() => setLang("es")}
        aria-pressed={lang === "es"}
        className={`relative z-10 px-3.5 py-1 rounded-full text-xs font-semibold tracking-widest transition-colors duration-200 ${
          lang === "es" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        ES
      </button>
    </div>
  );
}
