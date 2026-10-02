"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { usePathname } from "next/navigation";
import { isMarketingHomepage } from "@/lib/publicRoutes";
import { usePejoDemo } from "./PejoDemoContext";

const PAGES = ["/inicio", "/institucional", "/planos", "/servicos", "/servicos/planos", "/checkout"];
const NORMAL = "/videos/Robo normal.mp4";
const TALKING = "/videos/robo falando.mp4";
const KNOCKING = "/videos/pejo/vidro.mp4";
const REACTIONS = ["ideia", "acenando", "coracao"];
const SERVICE_REACTIONS = [...REACTIONS, "academia", "corte", "maquiagem", "personal", "dog"];

type Position = { left: number; top: number };
type Drag = Position & { id: number; x: number; y: number; moved: boolean };
const subscribeHostname = () => () => {};
const getHostname = () => window.location.hostname;
const getServerHostname = () => "";

export function MascoteFlutuante() {
  const pathname = usePathname();
  const hostname = useSyncExternalStore(subscribeHostname, getHostname, getServerHostname);
  const visible = PAGES.includes(pathname) || pathname.startsWith("/checkout/") ||
    (hostname !== "" && isMarketingHomepage(pathname, hostname));
  // Reset timers and playback on navigation; never run them inside the ERP.
  return visible ? <Pejo key={pathname} pathname={pathname} /> : null;
}

function Pejo({ pathname }: { pathname: string }) {
  const playing = usePejoDemo();
  const services = pathname === "/servicos" || pathname === "/servicos/planos";
  const [reaction, setReaction] = useState({ src: NORMAL, sequence: 0 });
  const [idle, setIdle] = useState(false);
  const [previousPlaying, setPreviousPlaying] = useState(playing);
  const [position, setPosition] = useState<Position | null>(null);
  const rootRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const idleRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Playback transitions reset reactions before paint, while preserving the dragged position.
  if (previousPlaying !== playing) {
    setPreviousPlaying(playing);
    setIdle(false);
    setReaction(previous => ({ src: NORMAL, sequence: previous.sequence + 1 }));
  }

  const randomReaction = useCallback(() => {
    const pool = services ? SERVICE_REACTIONS : REACTIONS;
    setReaction(previous => {
      const choices = pool.map(name => `/videos/pejo/${name}.mp4`).filter(src => src !== previous.src);
      return { src: choices[Math.floor(Math.random() * choices.length)], sequence: previous.sequence + 1 };
    });
  }, [services]);

  useEffect(() => {
    idleRef.current = false;
    if (playing) return;
    function armIdle() {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        idleRef.current = true;
        setReaction(previous => ({ src: NORMAL, sequence: previous.sequence + 1 }));
        setIdle(true);
      }, 30_000);
    }
    function activity() {
      if (idleRef.current) {
        idleRef.current = false;
        setIdle(false);
      }
      armIdle();
    }
    armIdle();
    const events = ["pointermove", "pointerdown", "keydown", "scroll", "wheel", "touchstart"] as const;
    for (const event of events) window.addEventListener(event, activity, { passive: true, capture: true });
    const interval = setInterval(() => {
      if (!idleRef.current && !drag.current && !document.hidden) randomReaction();
    }, 10_000);
    return () => {
      clearTimeout(idleTimer.current);
      clearInterval(interval);
      for (const event of events) window.removeEventListener(event, activity, true);
    };
  }, [playing, randomReaction]);

  const src = playing ? TALKING : idle ? KNOCKING : reaction.src;
  // Landscape clips have extra side margins: match the robot's apparent size
  // to the portrait clips without stretching it or resizing the draggable frame.
  const landscape = src === "/videos/pejo/maquiagem.mp4" || src === "/videos/pejo/personal.mp4";
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      // Before the first interaction, browsers can block autoplay with sound.
      // Keep the animation running; the next knock retries with its original audio.
      if (videoRef.current !== video || video.muted) return;
      video.muted = true;
      void video.play().catch(() => {});
    });
  }, [src, reaction.sequence]);

  useEffect(() => {
    function fit() {
      const root = rootRef.current;
      if (!root) return;
      setPosition(previous => previous && ({
        left: Math.max(0, Math.min(previous.left, window.innerWidth - root.offsetWidth)),
        top: Math.max(0, Math.min(previous.top, window.innerHeight - root.offsetHeight)),
      }));
    }
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    suppressClick.current = false;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < 6) return;
    current.moved = true;
    setPosition({
      left: Math.max(0, Math.min(current.left + dx, window.innerWidth - event.currentTarget.offsetWidth)),
      top: Math.max(0, Math.min(current.top + dy, window.innerHeight - event.currentTarget.offsetHeight)),
    });
  }
  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.id !== event.pointerId) return;
    suppressClick.current = drag.current.moved || event.type === "pointercancel";
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const theme = services
    ? "theme-servicos"
    : pathname === "/inicio" || pathname === "/"
      ? "theme-inicio"
      : "theme-erp";

  return (
    <button
      ref={rootRef}
      type="button"
      aria-label="PEJO: clique para mudar a animação ou arraste para mover"
      title="Clique para interagir ou arraste para mover"
      data-pejo-state={playing ? "falando" : idle ? "vidro" : reaction.src === NORMAL ? "normal" : "reacao"}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onLostPointerCapture={() => { drag.current = null; }}
      onClick={() => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        if (!playing) randomReaction();
      }}
      style={{
        ...(position ? { left: position.left, top: position.top, bottom: "auto" } : {}),
        background: "var(--mkt-surface, var(--surface))",
        borderColor: "var(--mkt-border, var(--border))",
      }}
      className={`fixed z-30 w-[100px] touch-none select-none overflow-hidden rounded-3xl border-2 p-1.5 shadow-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--primary)] active:cursor-grabbing sm:w-[125px] print:hidden ${position ? "" : "bottom-12 left-3 sm:left-5"} cursor-grab ${theme}`}
    >
      <span className="block aspect-[4/7] w-full overflow-hidden rounded-2xl bg-white">
      <video
        ref={videoRef}
        key={`${src}-${reaction.sequence}`}
        src={src}
        poster={landscape ? src.replace(".mp4", "-poster.jpg") : "/videos/pejo/poster.jpg"}
        autoPlay
        muted={src !== KNOCKING}
        playsInline
        loop={playing || idle || reaction.src === NORMAL}
        aria-hidden="true"
        className="pointer-events-none h-full w-full object-contain"
        style={landscape ? { transform: "scale(2.25)", transformOrigin: src.includes("maquiagem") ? "45% 50%" : "50% 50%" } : undefined}
        onEnded={() => {
          if (!playing && !idleRef.current) setReaction(previous => ({ src: NORMAL, sequence: previous.sequence + 1 }));
        }}
        onError={() => {
          if (!playing && !idleRef.current && reaction.src !== NORMAL) setReaction(previous => ({ src: NORMAL, sequence: previous.sequence + 1 }));
        }}
      />
      </span>
    </button>
  );
}
