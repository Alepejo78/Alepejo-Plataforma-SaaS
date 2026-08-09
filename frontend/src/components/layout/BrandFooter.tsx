/**
 * Marca fixa do produto, visível em toda tela — mesmo quando a empresa
 * cliente troca a logo/nome pelo módulo de marca própria (white-label).
 */
export function BrandFooter() {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-6 z-20 select-none text-right leading-tight text-[var(--text-muted)] opacity-80 print:hidden"
    >
      <p className="text-[11px] font-medium tracking-wide">
        AlePejo ERP Cloud
      </p>

      <p className="text-[9px]">Gestão inteligente para empresas</p>
    </div>
  );
}
