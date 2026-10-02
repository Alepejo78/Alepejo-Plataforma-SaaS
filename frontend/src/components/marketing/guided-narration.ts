"use client";

import { useEffect, useState } from "react";

/**
 * Lógica de narração por voz compartilhada pelos tours guiados de
 * marketing (`/institucional` — ERP, `/servicos` — AlePejo Serviços).
 * Extraída daqui pra não duplicar a escolha de voz/duração em cada
 * página — comportamento idêntico nos dois lugares.
 */

/**
 * Tempo que cada parada fica no ar quando a narração está no mudo.
 * Calculado pelo tamanho do texto (~2,6 palavras por segundo, ritmo de
 * locução em português) pra a legenda não sumir antes de dar pra ler.
 */
export function stepDuration(narration: string) {
  const words = narration.trim().split(/\s+/).length;

  return Math.max(7000, Math.round((words / 2.6) * 1000) + 900);
}

/** Preferência masculina apenas como desempate entre vozes de mesma qualidade. */
const MALE_PT_VOICES = [
  "daniel",
  "antonio",
  "antônio",
  "fabio",
  "fábio",
  "julio",
  "júlio",
  "nicolau",
  "valerio",
  "valério",
  "donato",
  "humberto",
  "duarte",
  "felipe",
];

/** Prioriza qualidade e idioma; o gênero não deve superar uma voz natural. */
export function pickVoice(voices: SpeechSynthesisVoice[], locale = "pt-BR") {
  const language = locale.toLowerCase().replace("_", "-");
  const candidates = voices.filter((v) =>
    v.lang?.toLowerCase().replace("_", "-").split("-")[0] === language.split("-")[0]
  );

  if (candidates.length === 0) {
    return null;
  }

  function score(voice: SpeechSynthesisVoice) {
    const name = voice.name.toLowerCase();
    let points = 0;

    if (MALE_PT_VOICES.some((n) => name.includes(n))) {
      points += 1;
    }

    // Neurais do Edge — as mais naturais que aparecem no navegador.
    if (/natural|neural|premium|enhanced/.test(name)) {
      points += 100;
    }

    // Vozes remotas vêm antes das vozes locais básicas, sem superar qualidade explícita.
    if (!voice.localService || name.includes("online") || name.includes("google")) {
      points += 20;
    }

    if (voice.lang.toLowerCase().replace("_", "-") === language) {
      points += 40;
    }

    if (voice.default) {
      points += 2;
    }

    return points;
  }

  return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

/** Preserve the voice's original timbre; avoid an artificially shifted pitch. */
export function createNarration(text: string, voice: SpeechSynthesisVoice | null, locale = "pt-BR") {
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || locale;
  utterance.rate = voice && /natural|neural|premium|enhanced/i.test(voice.name) ? 1 : 0.96;
  utterance.pitch = 1;
  return utterance;
}

/**
 * As vozes chegam de forma assíncrona no Chrome: na primeira chamada
 * `getVoices()` volta vazio e só depois o evento `voiceschanged`
 * avisa. Sem esperar por ele, o tour começaria com a voz padrão do
 * sistema (em inglês) em vez da voz no idioma escolhido.
 */
export function useSpeechVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    function refresh() {
      setVoices(window.speechSynthesis.getVoices());
    }

    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
    };
  }, []);

  return voices;
}
