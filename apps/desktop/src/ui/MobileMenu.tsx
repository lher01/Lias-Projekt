import { ListIcon, XIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { NavigationContent, type NavigationProps } from "./Sidebar";

/** Dauer der Schließ-Animation, muss zu `menu-out` in styles.css passen. */
const CLOSE_MS = 180;

type MenuState = "closed" | "open" | "closing";

/**
 * Burger-Menü für schmale Fenster, angelehnt an DevTrack: Eine "Bubble" in
 * Glas-Optik klappt unter dem Button auf und federt kurz nach.
 * Schließt bei Escape, Klick daneben, Größenänderung oder Filterwahl.
 */
export function MobileMenu(props: NavigationProps) {
  const [state, setState] = useState<MenuState>("closed");
  const [position, setPosition] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setState((s) => (s === "open" ? "closing" : s));
  }, []);

  function open() {
    const rect = buttonRef.current!.getBoundingClientRect();
    const top = rect.bottom + 10;
    setPosition({
      top,
      right: Math.max(16, window.innerWidth - rect.right),
      maxHeight: window.innerHeight - top - 16,
    });
    setState("open");
  }

  // Nach der Schließ-Animation wirklich ausblenden und den Fokus zurückgeben.
  useEffect(() => {
    if (state !== "closing") return;
    const timer = window.setTimeout(() => {
      setState("closed");
      buttonRef.current?.focus({ preventScroll: true });
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state !== "open") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [state, close]);

  // Erstes Element fokussieren, damit man direkt mit der Tastatur weitermachen kann.
  useLayoutEffect(() => {
    if (state === "open") bubbleRef.current?.querySelector<HTMLElement>("button, input")?.focus({ preventScroll: true });
  }, [state]);

  const isOpen = state === "open";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn menu-toggle"
        aria-label={isOpen ? "Menü schließen" : "Menü öffnen"}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : open())}
      >
        {isOpen ? <XIcon size={22} /> : <ListIcon size={22} />}
      </button>

      {state !== "closed" && (
        <>
          <div className={`menu-backdrop menu-backdrop--${state}`} onClick={close} aria-hidden />
          <div
            ref={bubbleRef}
            className={`menu-bubble menu-bubble--${state}`}
            style={position}
            role="dialog"
            aria-label="Navigation"
          >
            <NavigationContent
              {...props}
              onFilter={(filter) => {
                props.onFilter(filter);
                close(); // Nach der Auswahl soll man das Ergebnis sehen.
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
