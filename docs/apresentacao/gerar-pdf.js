/*
 * Gera o PDF comercial a partir de `apresentacao.html`.
 *
 *   node docs/apresentacao/gerar-pdf.js
 *
 * Usa o Chrome que já está instalado (--headless --print-to-pdf) em vez
 * de puxar um puppeteer só pra isso. A logo entra embutida em base64
 * porque o Chrome headless não carrega arquivo local dentro do PDF.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const CHROMES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

function chromePath() {
  const found = CHROMES.find((p) => fs.existsSync(p));

  if (!found) {
    throw new Error(
      "Chrome/Edge não encontrado — ajuste a lista CHROMES neste script."
    );
  }

  return found;
}

function dataUri(file) {
  const bytes = fs.readFileSync(path.join(DIR, "..", "..", "frontend", "public", file));

  return `data:image/png;base64,${bytes.toString("base64")}`;
}

const html = fs
  .readFileSync(path.join(DIR, "apresentacao.html"), "utf8")
  .replace(/{{LOGO_DARK}}/g, dataUri("logo-dark.png"))
  .replace(/{{LOGO_LIGHT}}/g, dataUri("logo.png"));

const tmp = path.join(DIR, ".build.html");
const out = path.join(DIR, "AlePejo-ERP-Cloud-Apresentacao.pdf");

fs.writeFileSync(tmp, html, "utf8");

try {
  execFileSync(
    chromePath(),
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--no-pdf-header-footer",
      `--print-to-pdf=${out}`,
      `file:///${tmp.replace(/\\/g, "/")}`,
    ],
    { stdio: "inherit" }
  );
} finally {
  fs.unlinkSync(tmp);
}

console.log(`PDF gerado: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
