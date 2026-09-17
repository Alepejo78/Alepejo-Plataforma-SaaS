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

/**
 * Vozes em português que os navegadores costumam ter, separadas por
 * gênero pra pontuar a favor da masculina. As do Edge marcadas como
 * "Natural"/"Online" são neurais e soam bem melhor que a voz robótica
 * antiga do Windows — por isso valem pontos extras.
 */
const FEMALE_PT_VOICES = [
  "francisca",
  "thalita",
  "brenda",
  "elza",
  "giovanna",
  "leila",
  "leticia",
  "letícia",
  "manuela",
  "yara",
  "maria",
  "luciana",
  "joana",
  "camila",
  "vitoria",
  "vitória",
  "helena",
];

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

/**
 * Escolhe a melhor voz disponível: em português, masculina e o mais
 * natural possível. Cada navegador tem um conjunto diferente, então em
 * vez de fixar um nome a gente pontua e fica com a melhor colocada.
 */
export function pickVoice(voices: SpeechSynthesisVoice[]) {
  const candidates = voices.filter((v) => v.lang?.toLowerCase().startsWith("pt"));

  if (candidates.length === 0) {
    return null;
  }

  function score(voice: SpeechSynthesisVoice) {
    const name = voice.name.toLowerCase();
    let points = 0;

    if (MALE_PT_VOICES.some((n) => name.includes(n))) {
      points += 60;
    }

    if (FEMALE_PT_VOICES.some((n) => name.includes(n))) {
      points -= 60;
    }

    // Neurais do Edge — as mais naturais que aparecem no navegador.
    if (name.includes("natural") || name.includes("online")) {
      points += 60;
    }

    /*
     * A voz do Google em pt-BR é a mesma do navegador de mapas: todo
     * mundo já ouviu, e no mascote soa como GPS, não como personagem.
     * Fica por último entre as masculinas — se houver qualquer outra,
     * ela ganha; se for a única do navegador, ainda assim é usada.
     */
    if (name.includes("google")) {
      points -= 25;
    }

    if (voice.lang.toLowerCase().replace("_", "-") === "pt-br") {
      points += 20;
    }

    if (voice.localService) {
      points += 2;
    }

    return points;
  }

  return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

/**
 * As vozes chegam de forma assíncrona no Chrome: na primeira chamada
 * `getVoices()` volta vazio e só depois o evento `voiceschanged`
 * avisa. Sem esperar por ele, o tour começaria com a voz padrão do
 * sistema (em inglês) em vez da masculina em português.
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
