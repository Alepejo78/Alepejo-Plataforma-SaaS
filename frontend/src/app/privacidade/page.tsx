import Link from "next/link";

import { PublicNav } from "@/components/marketing/PublicNav";

const lastUpdated = "19 de agosto de 2026";

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicNav />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Política de Privacidade
        </h1>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Última atualização: {lastUpdated}
        </p>

        <div className="mt-4 rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)]">
          Rascunho inicial, escrito para refletir como o AlePejo ERP Cloud
          funciona hoje. Antes de publicar oficialmente, recomendamos que um
          advogado revise o texto — em especial os pontos marcados com{" "}
          <strong>[preencher]</strong>.
        </div>

        <div className="prose-content mt-10 space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              1. Quem somos
            </h2>
            <p className="mt-2">
              Esta Política de Privacidade descreve como a{" "}
              <strong>
                AlePejo Assessoria e Prestação de Serviço Ltda
              </strong>{" "}
              (CNPJ [preencher]),
              responsável pelo sistema <strong>AlePejo ERP Cloud</strong>{" "}
              ("nós", "AlePejo", "sistema"), coleta, usa, armazena e protege
              dados pessoais de quem usa a plataforma — tanto as empresas
              clientes ("você", "empresa contratante") quanto os
              colaboradores, clientes e fornecedores que essas empresas
              cadastram no sistema.
            </p>
            <p className="mt-2">
              Esta política segue a Lei Geral de Proteção de Dados (Lei nº
              13.709/2018 — LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              2. Papéis: quem é responsável por qual dado
            </h2>
            <p className="mt-2">
              O AlePejo ERP Cloud é usado por empresas para administrar a
              própria operação (vendas, compras, estoque, financeiro,
              recursos humanos e folha de pagamento, entre outros). Isso
              significa dois papéis diferentes, previstos na LGPD:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Como controladora</strong>, a AlePejo decide a
                finalidade dos dados da própria conta da empresa contratante:
                cadastro, faturamento, comunicação, suporte e segurança da
                plataforma.
              </li>
              <li>
                <strong>Como operadora</strong>, a AlePejo processa, em nome
                da empresa contratante e seguindo as instruções dela, os
                dados que ela cadastra no sistema sobre terceiros —
                colaboradores (inclusive dados de folha de pagamento e RH),
                clientes e fornecedores. A empresa contratante continua
                responsável, perante esses terceiros, por ter base legal
                para tratar os dados deles no sistema.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              3. Quais dados coletamos
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Dados de cadastro da empresa:</strong> razão social,
                nome fantasia, CNPJ/CPF, endereço, e-mail e telefone.
              </li>
              <li>
                <strong>Dados de usuários do sistema:</strong> nome, e-mail,
                senha (armazenada com hash — nunca em texto puro), perfil de
                acesso e histórico de login.
              </li>
              <li>
                <strong>Dados operacionais cadastrados pela empresa
                contratante:</strong> parceiros (clientes/fornecedores),
                produtos, pedidos, lançamentos financeiros, e — quando o
                módulo de RH/Folha está contratado — dados de colaboradores,
                incluindo informações sensíveis exigidas pela legislação
                trabalhista (dados bancários, exames médicos, PPE, folha de
                pagamento).
              </li>
              <li>
                <strong>Dados de cobrança:</strong> processados pelo nosso
                parceiro de pagamentos, Asaas — o AlePejo não armazena número
                completo de cartão de crédito.
              </li>
              <li>
                <strong>Dados técnicos:</strong> endereço IP, tipo de
                navegador e registros de acesso, usados para segurança e
                diagnóstico.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              4. Para que usamos os dados
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Fornecer e manter o funcionamento do sistema contratado;</li>
              <li>
                Processar pagamentos e cobranças da assinatura (planos
                mensais/anuais);
              </li>
              <li>
                Enviar comunicações operacionais — confirmação de cadastro,
                redefinição de senha, avisos de cobrança, notificações
                automáticas por e-mail/WhatsApp que a empresa contratante
                configura para seus próprios processos;
              </li>
              <li>Prestar suporte técnico;</li>
              <li>
                Cumprir obrigações legais e regulatórias (fiscais,
                trabalhistas e contábeis) aplicáveis aos dados tratados no
                módulo de Folha de Pagamento;
              </li>
              <li>Prevenir fraude e proteger a segurança da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              5. Bases legais (LGPD, art. 7º e 11º)
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Execução de contrato:</strong> dados necessários para
                prestar o serviço contratado.
              </li>
              <li>
                <strong>Cumprimento de obrigação legal ou regulatória:</strong>{" "}
                dados de folha de pagamento, fiscais e contábeis.
              </li>
              <li>
                <strong>Legítimo interesse:</strong> segurança da plataforma,
                prevenção a fraude e melhoria do sistema.
              </li>
              <li>
                <strong>Consentimento:</strong> comunicações de marketing
                opcionais, quando aplicável.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              6. Com quem compartilhamos dados
            </h2>
            <p className="mt-2">
              Não vendemos dados pessoais. Compartilhamos apenas com quem é
              necessário para operar o sistema:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Asaas</strong> (processamento de cobranças e
                pagamentos da assinatura);
              </li>
              <li>
                <strong>Provedores de e-mail e WhatsApp</strong> configurados
                pela própria empresa contratante, para as notificações que
                ela decide enviar;
              </li>
              <li>
                Autoridades públicas, quando exigido por lei ou ordem
                judicial.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              7. Como protegemos os dados
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Senhas armazenadas com hash criptográfico, nunca em texto puro;</li>
              <li>Conexão criptografada (HTTPS) entre o navegador e o sistema;</li>
              <li>
                Isolamento entre empresas contratantes — uma empresa nunca
                acessa dados de outra;
              </li>
              <li>
                Controle de acesso por perfil e permissão — cada usuário só
                acessa o que seu perfil autoriza.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              8. Por quanto tempo guardamos os dados
            </h2>
            <p className="mt-2">
              Enquanto a assinatura estiver ativa, e por prazo adicional após
              o cancelamento quando exigido por lei (por exemplo, obrigações
              fiscais e trabalhistas relacionadas a dados de folha de
              pagamento, que têm prazo legal de guarda próprio). [preencher:
              definir prazo exato de retenção pós-cancelamento e política de
              exclusão de dados].
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              9. Seus direitos (LGPD, art. 18)
            </h2>
            <p className="mt-2">
              Você pode solicitar, a qualquer momento: confirmação de que
              tratamos seus dados, acesso aos dados, correção de dados
              incompletos ou desatualizados, anonimização ou eliminação de
              dados desnecessários, portabilidade dos dados, informação sobre
              compartilhamento, e revogação do consentimento (quando esta for
              a base legal aplicável).
            </p>
            <p className="mt-2">
              Para colaboradores, clientes e fornecedores cadastrados por uma
              empresa contratante no sistema, a solicitação deve ser feita
              diretamente à empresa contratante, que é a responsável por
              esses dados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              10. Cookies
            </h2>
            <p className="mt-2">
              Usamos apenas cookies essenciais para manter você conectado
              (sessão de login) e lembrar a empresa usada no último acesso.
              Não usamos cookies de rastreamento ou publicidade de
              terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              11. Alterações nesta política
            </h2>
            <p className="mt-2">
              Podemos atualizar esta política para refletir mudanças no
              sistema ou na legislação. A data no topo desta página sempre
              mostra a versão mais recente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              12. Contato
            </h2>
            <p className="mt-2">
              Dúvidas sobre esta política ou sobre seus dados podem ser
              enviadas para{" "}
              <a
                href="mailto:alessandro.lourenco@alepejo.com.br"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                alessandro.lourenco@alepejo.com.br
              </a>
              . [preencher: indicar encarregado de dados (DPO), se
              nomeado.]
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-[var(--text-muted)]">
          <Link
            href="/institucional"
            className="font-medium text-[var(--primary)] hover:underline"
          >
            Voltar para a página inicial
          </Link>
        </p>
      </div>
    </div>
  );
}
