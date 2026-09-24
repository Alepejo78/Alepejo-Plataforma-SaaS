"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import "./marketing-shared.css";

export interface FaqItem {
  question: string;
  answer: string;
}

/** Perguntas do AlePejo ERP (exibidas em /institucional). */
export const erpFaqItems: FaqItem[] = [
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
    question: "O sistema faz contagem de inventário?",
    answer:
      "Sim, com o módulo Inventário — vendido à parte do Estoque. Ele abre a contagem, permite recontagem em até 3 rodadas quando a quantidade não bate, e mostra o acompanhamento e um dashboard com o resultado do último inventário até que o próximo comece.",
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

/** Perguntas do AlePejo Serviços (exibidas em /servicos). */
export const servicosFaqItems: FaqItem[] = [
  {
    question: "O que é o AlePejo Serviços?",
    answer:
      "É um sistema online de agenda e gestão para negócios de atendimento, como barbearia, salão, clínica, petshop e estética. Reúne agenda, link de agendamento para o cliente, cadastro e histórico de clientes, financeiro, comissões, fidelidade e app do profissional.",
  },
  {
    question: "Meu cliente precisa instalar alguma coisa para agendar?",
    answer:
      "Não. O cliente abre o link de agendamento do seu negócio no navegador, escolhe o serviço, o profissional e o horário livre, e recebe a confirmação com um código e um link para ver ou cancelar o agendamento.",
  },
  {
    question: "Como funcionam os lembretes por WhatsApp?",
    answer:
      "O sistema envia lembretes antes do atendimento pelo WhatsApp da própria empresa (você conecta o número nas configurações). O cliente responde 1 para confirmar, 2 para cancelar ou 3 para reagendar, e a agenda se atualiza sozinha. Só a primeira resposta a cada lembrete vale.",
  },
  {
    question: "E se um cliente cancelar e o horário ficar vago?",
    answer:
      "Com a lista de espera, quando um horário é liberado o próximo da lista recebe a oferta por WhatsApp e responde 1 para agendar ou 2 para recusar. Se aceitar, o agendamento é criado; se recusar, a oferta segue para o próximo.",
  },
  {
    question: "Consigo vender pacotes e assinaturas?",
    answer:
      "Sim. Você cria pacotes de sessões e planos de assinatura com créditos. O crédito do cliente aparece no agendamento, no painel e no link público, é consumido no atendimento e devolvido se o agendamento for cancelado.",
  },
  {
    question: "Como funciona o programa de fidelidade?",
    answer:
      "Você define quantos pontos cada real gasto vale, quanto vale cada ponto no resgate e o saldo mínimo para resgatar. Os pontos são creditados quando o atendimento é concluído, e o cliente escolhe quantos usar ao confirmar um agendamento online.",
  },
  {
    question: "Como o profissional é remunerado no sistema?",
    answer:
      "O sistema calcula a comissão de cada atendimento concluído e permite fazer o acerto de contas: soma tudo o que é devido ao profissional e gera um título único de pagamento, a qualquer momento. Profissionais que recebem direto na própria conta podem ser configurados no cadastro.",
  },
  {
    question: "Existe aplicativo para o profissional?",
    answer:
      "Sim. Pelo celular, cada profissional acompanha a própria agenda e o faturamento, sem precisar abrir o sistema completo.",
  },
  {
    question: "Serve para outros segmentos além de salão de beleza?",
    answer:
      "Serve. O sistema atende barbearia, salão, manicure, maquiagem, estética e depilação, bem-estar, odontologia, clínica de estética, petshop e estética automotiva, com a linguagem de cada segmento no link público. Para petshops e clínicas veterinárias há ainda a carteira de vacinação do pet.",
  },
  {
    question: "Preciso instalar algum programa ou ter servidor?",
    answer:
      "Não. O sistema é online e roda no navegador, no computador ou no celular.",
  },
  {
    question: "Os dados da minha empresa ficam misturados com os de outras?",
    answer:
      "Não. Cada empresa enxerga apenas os próprios dados, e o acesso da equipe é controlado por perfis de permissão.",
  },
  {
    question: "Existe período de teste?",
    answer:
      "Sim, todos os planos começam com um período de teste grátis. A duração e os valores atuais aparecem na página de planos.",
  },
  {
    question: "Como falo com o suporte?",
    answer:
      "Pelo e-mail suporte@alepejo.com.br ou pelo WhatsApp (43) 99154-4557. O atendimento é remoto em todo o Brasil, e o presencial pode ser negociado.",
  },
];

/**
 * Perguntas frequentes — sanfona animada, uma aberta por vez. Lê só os
 * tokens `--mkt-*` (definidos por cada tema), então serve às duas páginas.
 */
export function Faq({
  items,
  title = "Perguntas frequentes",
  contactHref,
  id = "perguntas-frequentes",
}: {
  items: FaqItem[];
  title?: string;
  /** Link do "Fale com a gente" no rodapé — cada página aponta pro seu contato. */
  contactHref: string;
  id?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const base = useId();

  return (
    <section id={id} className="scroll-mt-20 bg-[var(--mkt-bg-alt)] py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="mkt-eyebrow">Dúvidas</p>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-sm text-[var(--mkt-muted)]">
            Não achou sua dúvida aqui?{" "}
            <a href={contactHref} className="font-semibold text-[var(--mkt-accent)] underline-offset-4 hover:underline">
              Fale com a gente
            </a>
            .
          </p>
        </div>

        <ul className="divide-y divide-[var(--mkt-border)] border-y border-[var(--mkt-border)]">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `${base}-p${index}`;
            const buttonId = `${base}-b${index}`;

            return (
              <li key={item.question}>
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="mkt-acc-btn flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="font-display text-lg font-semibold text-[var(--mkt-ink)]">{item.question}</span>
                    <ChevronDown
                      size={18}
                      aria-hidden
                      className={`mkt-acc-chevron shrink-0 text-[var(--mkt-muted)] ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="mkt-acc-panel"
                  data-open={isOpen}
                >
                  <div>
                    <p className="max-w-[68ch] pb-5 leading-relaxed text-[var(--mkt-muted)]">{item.answer}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
