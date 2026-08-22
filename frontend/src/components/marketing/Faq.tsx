"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// A pergunta aberta usa o mesmo gradiente dos botões de destaque
// (`aurora-banner`); importado aqui pra sanfona não depender de quem a
// coloca na página ter importado antes.
import "./aurora.css";

interface FaqItem {
  question: string;
  answer: string;
}

/** Compartilhado entre /institucional e /planos — mesmas perguntas nos dois lugares. */
export const faqItems: FaqItem[] = [
  {
    question: "O sistema é online?",
    answer:
      "Sim, o sistema AlePejo ERP Cloud é 100% online e pode ser acessado de qualquer lugar, sem necessidade de instalação na sua máquina.",
  },
  {
    question: "O sistema tem limite de usuários?",
    answer:
      "Não. Com a compra realizada, usuários são ilimitados, podendo parametrizar o que cada usuário terá acesso e permissão para executar.",
  },
  {
    question: "Se adquirir um plano, a licença é só para a empresa matriz?",
    answer:
      "Não, é ilimitado. Após a compra você pode cadastrar quantas filiais quiser, cada filial tem a sua visão no sistema, e o administrador consegue ver o resultado de todas as empresas, sem precisar de um módulo novo pra isso.",
  },
  {
    question: "Consigo emitir nota fiscal?",
    answer:
      "Não, esse sistema não oferece emissão de notas — mas tem controle das emissões, vinculando a nota fiscal de compra ou venda aos seus módulos.",
  },
  {
    question: "A implantação é gratuita?",
    answer:
      "Sim. Por ser 100% online, não precisa instalar nada em servidor ou computador.",
  },
  {
    question: "Vocês oferecem treinamento?",
    answer:
      "Sim, treinamento gratuito em acesso remoto. Treinamento presencial também é possível, assistido, com custo de deslocamento.",
  },
  {
    question: "O sistema tem suporte?",
    answer: "Sim, temos suporte 24h.",
  },
  {
    question: "O sistema tem controle financeiro?",
    answer:
      "Sim, o sistema AlePejo ERP Cloud possui vínculos automáticos em compras e vendas, gerando títulos a pagar e a receber com acompanhamento — pra não esquecer nenhum título.",
  },
  {
    question: "O sistema tem controle de estoque?",
    answer:
      "Sim, o sistema conta com estoque online: comprou e recebeu, o produto já entra no estoque; confirmou uma venda, o material já é retirado do estoque — com possibilidade de ajustes.",
  },
  {
    question: "O sistema tem controle de RH?",
    answer:
      "Sim, é bem completo pra quem quer controlar colaboradores: função, salários, horas, exames médicos e muito mais.",
  },
  {
    question: "O sistema tem controle de marcação de horas?",
    answer:
      "Sim — além do controle de gestão de RH, o sistema também tem controle de marcação de ponto.",
  },
  {
    question: "O sistema possui controle de banco de horas?",
    answer:
      "Sim. No acompanhamento de horas você consegue controlar horas positivas e negativas. Como não há vínculo a sindicatos, se as horas não forem compensadas durante o mês até o cálculo da folha, elas entram como pagamento de horas extras.",
  },
  {
    question: "O sistema tem geração de holerites?",
    answer: "Sim, esse módulo é mais um diferencial do sistema AlePejo.",
  },
  {
    question: "E se eu não souber qual plano escolher?",
    answer:
      "É só entrar em contato que avaliamos a sua necessidade e quais módulos seriam mais adequados pra sua empresa.",
  },
];

/** Perguntas frequentes — sanfona, só uma aberta por vez. */
export function Faq({
  title = "Perguntas frequentes",
  contactHref = "/institucional#contato",
}: {
  title?: string;
  /** Link do "Fale com a gente" no rodapé — cada página aponta pro seu próprio formulário de contato. */
  contactHref?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="perguntas-frequentes"
      className="border-t border-[var(--border)] bg-[var(--surface)] py-20"
    >
      <div className="mx-auto max-w-3xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            {title}
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              // `overflow-hidden` porque a pergunta aberta ganha o
              // gradiente de ponta a ponta — sem isso ele vaza por cima
              // dos cantos arredondados da caixa.
              <div
                key={item.question}
                className={`overflow-hidden rounded-2xl border bg-[var(--background)] transition-shadow ${
                  isOpen
                    ? "border-transparent shadow-md"
                    : "border-[var(--border)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors ${
                    isOpen
                      ? "aurora-banner text-white"
                      : "hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <span
                    className={`font-medium ${
                      isOpen ? "text-white" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {item.question}
                  </span>

                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform ${
                      isOpen
                        ? "rotate-180 text-white"
                        : "text-[var(--text-muted)]"
                    }`}
                  />
                </button>

                {isOpen && (
                  <p className="px-5 pb-4 text-sm text-[var(--text-muted)]">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
          Não achou sua dúvida aqui?{" "}
          <a
            href={contactHref}
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            Fale com a gente
          </a>
          .
        </p>
      </div>
    </section>
  );
}
