import Link from "next/link";

import { PublicNav } from "@/components/marketing/PublicNav";

const lastUpdated = "30 de agosto de 2026";

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicNav />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Política de Privacidade
        </h1>
        <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
          AlePejo ERP Cloud
        </p>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Última atualização: {lastUpdated}
        </p>

        <div className="prose-content mt-10 space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
          <p>
            A <strong>AlePejo Assessoria e Prestação de Serviço Ltda.</strong>,
            inscrita no CNPJ sob nº <strong>68.275.303/0001-50</strong>,
            responsável pelo sistema AlePejo ERP Cloud, valoriza a privacidade
            e a proteção dos dados pessoais tratados por meio de sua
            plataforma.
          </p>
          <p>
            Esta Política de Privacidade explica como coletamos, utilizamos,
            armazenamos, compartilhamos e protegemos dados pessoais
            relacionados à utilização do AlePejo ERP Cloud.
          </p>
          <p>
            O tratamento de dados pessoais realizado por meio da plataforma
            observa a Lei nº 13.709/2018 — Lei Geral de Proteção de Dados
            Pessoais (LGPD) e demais normas aplicáveis.
          </p>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              1. Quem somos
            </h2>
            <p className="mt-2">
              O AlePejo ERP Cloud é uma plataforma de gestão empresarial
              destinada a empresas que desejam administrar, de forma
              integrada, processos como cadastro de clientes e fornecedores,
              vendas, compras, estoque, financeiro, recursos humanos, folha
              de pagamento e demais operações disponibilizadas pela
              plataforma.
            </p>
            <p className="mt-2">Para os fins desta Política, são considerados:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>AlePejo:</strong> a AlePejo Assessoria e Prestação de
                Serviço Ltda., responsável pela operação e disponibilização
                do AlePejo ERP Cloud;
              </li>
              <li>
                <strong>Empresa Contratante:</strong> pessoa jurídica que
                contrata e utiliza o AlePejo ERP Cloud;
              </li>
              <li>
                <strong>Usuário:</strong> pessoa autorizada pela Empresa
                Contratante a utilizar a plataforma;
              </li>
              <li>
                <strong>Titular:</strong> pessoa natural a quem os dados
                pessoais se referem.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              2. Responsabilidade pelo tratamento dos dados
            </h2>
            <p className="mt-2">
              A natureza da responsabilidade da AlePejo pelo tratamento de
              dados pessoais pode variar conforme a finalidade do tratamento.
            </p>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              2.1. AlePejo como Controladora
            </h3>
            <p className="mt-2">
              A AlePejo atua como Controladora quando determina as
              finalidades e os meios do tratamento de dados necessários para
              administrar sua própria relação com a Empresa Contratante e com
              os usuários da plataforma. Nessas situações, os dados podem ser
              tratados para:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>cadastro e administração da conta;</li>
              <li>contratação e manutenção dos serviços;</li>
              <li>faturamento e cobrança;</li>
              <li>atendimento e suporte;</li>
              <li>comunicação relacionada aos serviços;</li>
              <li>segurança da plataforma;</li>
              <li>prevenção de fraudes e abusos;</li>
              <li>cumprimento de obrigações legais e regulatórias.</li>
            </ul>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              2.2. AlePejo como Operadora
            </h3>
            <p className="mt-2">
              Quando a Empresa Contratante utiliza o AlePejo ERP Cloud para
              cadastrar e administrar dados de seus próprios clientes,
              fornecedores, colaboradores ou outros terceiros, a Empresa
              Contratante permanece responsável pelas decisões relativas às
              finalidades do tratamento desses dados.
            </p>
            <p className="mt-2">
              Nessas situações, a AlePejo atua, em regra, como Operadora,
              realizando o tratamento dos dados em nome da Empresa
              Contratante e de acordo com suas instruções e com as
              funcionalidades contratadas.
            </p>
            <p className="mt-2">
              A Empresa Contratante é responsável por garantir que possui uma
              base legal adequada para o tratamento dos dados pessoais que
              inserir na plataforma e por atender às solicitações dos
              titulares relacionadas a esses dados, quando aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              3. Quais dados podem ser tratados
            </h2>
            <p className="mt-2">
              Os dados tratados podem variar de acordo com a utilização da
              plataforma, os módulos contratados e as funcionalidades
              utilizadas.
            </p>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              3.1. Dados da empresa contratante
            </h3>
            <p className="mt-2">Podemos tratar informações como:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>razão social;</li>
              <li>nome fantasia;</li>
              <li>CNPJ ou CPF, conforme aplicável;</li>
              <li>endereço;</li>
              <li>endereço de e-mail;</li>
              <li>telefone;</li>
              <li>informações necessárias à contratação e faturamento;</li>
              <li>informações relacionadas ao plano contratado.</li>
            </ul>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              3.2. Dados dos usuários
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>nome;</li>
              <li>endereço de e-mail;</li>
              <li>telefone, quando informado;</li>
              <li>credenciais de acesso;</li>
              <li>perfil e permissões de acesso;</li>
              <li>empresa à qual o usuário está vinculado;</li>
              <li>registros de acesso;</li>
              <li>informações relacionadas à utilização da plataforma.</li>
            </ul>
            <p className="mt-2">
              As senhas são armazenadas utilizando mecanismos de proteção
              criptográfica apropriados e não são armazenadas em texto puro.
            </p>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              3.3. Dados operacionais inseridos pela Empresa Contratante
            </h3>
            <p className="mt-2">
              Dependendo dos módulos utilizados, a Empresa Contratante poderá
              inserir na plataforma informações relacionadas a:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>clientes;</li>
              <li>fornecedores;</li>
              <li>produtos;</li>
              <li>pedidos;</li>
              <li>vendas;</li>
              <li>compras;</li>
              <li>estoque;</li>
              <li>movimentações financeiras;</li>
              <li>contas a pagar e receber;</li>
              <li>documentos fiscais;</li>
              <li>informações contábeis e administrativas;</li>
              <li>colaboradores;</li>
              <li>informações de recursos humanos;</li>
              <li>informações de folha de pagamento;</li>
              <li>outras informações necessárias à operação empresarial.</li>
            </ul>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              3.4. Dados pessoais sensíveis
            </h3>
            <p className="mt-2">
              Determinados módulos, especialmente aqueles relacionados a
              Recursos Humanos e Folha de Pagamento, podem permitir o
              tratamento de dados pessoais sensíveis, conforme definido pela
              LGPD.
            </p>
            <p className="mt-2">
              Esses dados poderão incluir informações relacionadas à saúde,
              exames ocupacionais e outras informações protegidas por
              legislação específica, quando necessárias para a execução das
              atividades da Empresa Contratante.
            </p>
            <p className="mt-2">
              O tratamento desses dados deverá observar as bases legais e
              requisitos específicos previstos na legislação aplicável. A
              Empresa Contratante é responsável por utilizar essas
              funcionalidades somente quando possuir fundamento legal
              adequado para o tratamento dos respectivos dados.
            </p>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              3.5. Dados técnicos e de segurança
            </h3>
            <p className="mt-2">
              Durante a utilização da plataforma, podemos registrar
              informações técnicas necessárias para operação, segurança e
              diagnóstico, incluindo:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>endereço IP;</li>
              <li>data e horário de acesso;</li>
              <li>navegador utilizado;</li>
              <li>sistema operacional e dispositivo;</li>
              <li>registros de autenticação;</li>
              <li>registros de atividades relevantes para segurança;</li>
              <li>
                informações relacionadas a erros e funcionamento da
                plataforma.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              4. Para que utilizamos os dados
            </h2>
            <p className="mt-2">
              Os dados pessoais poderão ser tratados para as seguintes
              finalidades:
            </p>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              4.1. Prestação dos serviços
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>disponibilizar o AlePejo ERP Cloud;</li>
              <li>criar e administrar contas;</li>
              <li>autenticar usuários;</li>
              <li>disponibilizar os módulos contratados;</li>
              <li>armazenar e processar informações inseridas na plataforma;</li>
              <li>manter o funcionamento e a disponibilidade do sistema.</li>
            </ul>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              4.2. Administração da relação contratual
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>realizar cadastro;</li>
              <li>administrar planos e assinaturas;</li>
              <li>processar cobranças;</li>
              <li>emitir documentos relacionados à contratação;</li>
              <li>prestar atendimento e suporte;</li>
              <li>comunicar alterações relevantes nos serviços.</li>
            </ul>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              4.3. Segurança
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>proteger contas e informações;</li>
              <li>identificar acessos não autorizados;</li>
              <li>prevenir fraudes;</li>
              <li>investigar incidentes de segurança;</li>
              <li>detectar utilização indevida da plataforma;</li>
              <li>preservar a integridade e disponibilidade do sistema.</li>
            </ul>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              4.4. Cumprimento de obrigações legais
            </h3>
            <p className="mt-2">
              Podemos tratar dados pessoais quando necessário para cumprir
              obrigações legais ou regulatórias aplicáveis, inclusive
              obrigações fiscais, trabalhistas, previdenciárias, contábeis ou
              outras previstas na legislação.
            </p>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              4.5. Comunicações
            </h3>
            <p className="mt-2">
              Podemos enviar comunicações necessárias à execução do contrato,
              incluindo:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>confirmação de cadastro;</li>
              <li>recuperação de acesso;</li>
              <li>avisos de segurança;</li>
              <li>notificações relacionadas à assinatura;</li>
              <li>informações sobre cobranças;</li>
              <li>avisos sobre manutenção ou indisponibilidade;</li>
              <li>comunicações operacionais.</li>
            </ul>
            <p className="mt-2">
              Comunicações de marketing, quando realizadas, observarão a
              legislação aplicável e poderão ser recusadas quando legalmente
              cabível.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              5. Bases legais
            </h2>
            <p className="mt-2">
              O tratamento de dados pessoais será realizado com fundamento
              nas bases legais previstas na LGPD, conforme a finalidade e a
              natureza do tratamento. Entre as bases legais que podem ser
              utilizadas estão:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                execução de contrato ou de procedimentos preliminares
                relacionados ao contrato;
              </li>
              <li>cumprimento de obrigação legal ou regulatória;</li>
              <li>exercício regular de direitos;</li>
              <li>
                legítimo interesse, quando aplicável e observados os
                requisitos legais;
              </li>
              <li>consentimento, quando necessário;</li>
              <li>outras bases legais previstas no artigo 7º da LGPD.</li>
            </ul>
            <p className="mt-2">
              Para dados pessoais sensíveis, serão observadas as bases legais
              específicas previstas no artigo 11 da LGPD. A base legal
              aplicável poderá variar conforme o tipo de dado, finalidade e
              contexto do tratamento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              6. Compartilhamento de dados
            </h2>
            <p className="mt-2">
              A AlePejo não vende dados pessoais. Os dados poderão ser
              compartilhados somente quando necessário para a prestação dos
              serviços, cumprimento de obrigações legais ou atendimento das
              finalidades descritas nesta Política. Podemos compartilhar
              dados com:
            </p>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              6.1. Prestadores de serviços e parceiros tecnológicos
            </h3>
            <p className="mt-2">
              Empresas que fornecem infraestrutura, hospedagem, serviços de
              tecnologia, comunicação, segurança, processamento de pagamentos
              ou outros serviços necessários ao funcionamento da plataforma.
              Esses fornecedores deverão tratar os dados de acordo com as
              finalidades contratadas e com as obrigações de segurança e
              proteção de dados aplicáveis.
            </p>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              6.2. Processamento de pagamentos
            </h3>
            <p className="mt-2">
              Para processamento de cobranças e pagamentos relacionados à
              assinatura do AlePejo ERP Cloud, podemos utilizar serviços
              especializados de pagamento, incluindo o Asaas, conforme
              aplicável. Os dados necessários ao processamento da transação
              poderão ser tratados diretamente pelo respectivo prestador de
              serviços. A AlePejo não tem como finalidade armazenar o número
              completo do cartão de crédito utilizado pelo cliente.
            </p>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              6.3. Serviços de comunicação
            </h3>
            <p className="mt-2">
              Quando utilizados recursos de e-mail, WhatsApp ou outros canais
              de comunicação integrados ao sistema, os dados necessários
              poderão ser enviados aos respectivos provedores para execução
              da comunicação solicitada. Quando a comunicação estiver
              relacionada a processos próprios da Empresa Contratante, como
              avisos a clientes ou fornecedores, a Empresa Contratante será
              responsável pela definição da finalidade e pelo conteúdo dessas
              comunicações.
            </p>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              6.4. Autoridades públicas
            </h3>
            <p className="mt-2">
              Os dados poderão ser compartilhados quando houver obrigação
              legal, determinação de autoridade competente, ordem judicial ou
              necessidade de exercício regular de direitos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              7. Segurança da informação
            </h2>
            <p className="mt-2">
              A AlePejo adota medidas técnicas e organizacionais destinadas a
              proteger os dados pessoais contra acessos não autorizados,
              perda, destruição, alteração, divulgação ou qualquer forma de
              tratamento inadequado ou ilícito. Entre as medidas adotadas ou
              previstas estão:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>utilização de conexão segura por HTTPS;</li>
              <li>proteção criptográfica das senhas;</li>
              <li>
                controle de acesso baseado em usuários, perfis e permissões;
              </li>
              <li>segregação lógica dos dados entre empresas contratantes;</li>
              <li>mecanismos de autenticação;</li>
              <li>registros de acesso e atividades relevantes;</li>
              <li>
                medidas de monitoramento e prevenção contra acessos
                indevidos;
              </li>
              <li>
                procedimentos para identificação e tratamento de incidentes
                de segurança.
              </li>
            </ul>
            <p className="mt-2">
              Apesar das medidas adotadas, nenhum sistema eletrônico pode ser
              considerado completamente imune a riscos. Por isso, também é
              responsabilidade dos usuários manter suas credenciais de acesso
              protegidas e não compartilhá-las com terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              8. Isolamento dos dados entre empresas
            </h2>
            <p className="mt-2">
              O AlePejo ERP Cloud utiliza arquitetura destinada a permitir a
              separação dos dados entre diferentes empresas contratantes.
              Cada empresa possui seu próprio ambiente lógico de dados, e os
              usuários somente devem ter acesso às informações pertencentes à
              empresa à qual estão vinculados e às permissões que lhes foram
              atribuídas.
            </p>
            <p className="mt-2">
              A Empresa Contratante é responsável por administrar
              corretamente os usuários, perfis e permissões de acesso de sua
              organização.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              9. Retenção e exclusão dos dados
            </h2>
            <p className="mt-2">
              Os dados pessoais serão mantidos pelo período necessário para
              cumprir as finalidades para as quais foram coletados. Enquanto
              o contrato estiver vigente, os dados necessários à prestação do
              serviço poderão permanecer armazenados na plataforma.
            </p>
            <p className="mt-2">
              Após o encerramento da contratação, os dados poderão ser
              mantidos pelo período necessário para:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>cumprimento de obrigações legais ou regulatórias;</li>
              <li>exercício regular de direitos;</li>
              <li>cumprimento de obrigações contratuais;</li>
              <li>prevenção e investigação de fraudes;</li>
              <li>
                manutenção de registros necessários à segurança da
                plataforma;
              </li>
              <li>atendimento de determinações de autoridades competentes.</li>
            </ul>
            <p className="mt-2">
              Quando não houver mais necessidade legal, contratual ou
              legítima para manutenção dos dados, eles poderão ser excluídos,
              anonimizados ou submetidos a procedimento de descarte seguro,
              observadas as limitações técnicas e legais aplicáveis.
            </p>
            <p className="mt-2">
              A Empresa Contratante poderá solicitar informações sobre os
              procedimentos aplicáveis à exportação, retenção e exclusão de
              seus dados, conforme as condições do contrato e as
              funcionalidades disponíveis na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              10. Direitos dos titulares
            </h2>
            <p className="mt-2">
              Nos termos do artigo 18 da LGPD, os titulares de dados pessoais
              possuem direitos, observadas as condições e limitações
              previstas na legislação, incluindo:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>confirmação da existência de tratamento;</li>
              <li>acesso aos dados pessoais;</li>
              <li>
                correção de dados incompletos, inexatos ou desatualizados;
              </li>
              <li>
                anonimização, bloqueio ou eliminação de dados desnecessários,
                excessivos ou tratados em desconformidade com a legislação;
              </li>
              <li>portabilidade dos dados, quando aplicável;</li>
              <li>informação sobre compartilhamento de dados;</li>
              <li>
                informação sobre a possibilidade de não fornecer
                consentimento e sobre as consequências dessa negativa;
              </li>
              <li>
                revogação do consentimento, quando essa for a base legal
                utilizada;
              </li>
              <li>
                revisão de decisões tomadas unicamente com base em
                tratamento automatizado, quando aplicável.
              </li>
            </ul>
            <p className="mt-2">
              Quando os dados pessoais forem inseridos na plataforma pela
              Empresa Contratante, como dados de clientes, fornecedores ou
              colaboradores, a solicitação do titular deverá ser direcionada
              preferencialmente à própria Empresa Contratante, que é
              responsável pelo tratamento desses dados. A AlePejo poderá
              prestar suporte à Empresa Contratante para o atendimento dessas
              solicitações, quando aplicável e de acordo com suas
              responsabilidades como operadora.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              11. Cookies e tecnologias semelhantes
            </h2>
            <p className="mt-2">
              O AlePejo ERP Cloud poderá utilizar cookies e tecnologias
              semelhantes estritamente necessários ao funcionamento da
              plataforma. Esses recursos podem ser utilizados para:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>manter a sessão de autenticação;</li>
              <li>permitir o funcionamento adequado do sistema;</li>
              <li>preservar informações necessárias à navegação;</li>
              <li>aumentar a segurança da plataforma;</li>
              <li>identificar e prevenir atividades suspeitas.</li>
            </ul>
            <p className="mt-2">
              A AlePejo não utiliza cookies de terceiros destinados à
              publicidade comportamental dentro do AlePejo ERP Cloud, salvo
              se essa prática vier a ser adotada futuramente, hipótese em que
              esta Política será atualizada.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              12. Responsabilidades da Empresa Contratante
            </h2>
            <p className="mt-2">A Empresa Contratante é responsável por:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                inserir somente dados necessários às finalidades legítimas de
                sua atividade;
              </li>
              <li>
                possuir base legal adequada para o tratamento dos dados
                inseridos no sistema;
              </li>
              <li>
                informar os titulares sobre o tratamento de seus dados quando
                exigido pela legislação;
              </li>
              <li>administrar adequadamente usuários, perfis e permissões;</li>
              <li>manter as credenciais de acesso sob sigilo;</li>
              <li>utilizar os dados exclusivamente para finalidades legítimas;</li>
              <li>
                atender às solicitações dos titulares relacionadas aos dados
                pelos quais seja responsável;
              </li>
              <li>
                observar a legislação aplicável ao tratamento de dados
                pessoais e dados pessoais sensíveis.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              13. Transferência internacional de dados
            </h2>
            <p className="mt-2">
              Dependendo dos fornecedores de infraestrutura, tecnologia,
              comunicação, armazenamento ou outros serviços utilizados pela
              plataforma, poderá ocorrer tratamento ou armazenamento de dados
              pessoais fora do Brasil.
            </p>
            <p className="mt-2">
              Quando houver transferência internacional de dados pessoais, a
              AlePejo adotará as medidas e mecanismos previstos na LGPD e nas
              regulamentações aplicáveis da Autoridade Nacional de Proteção
              de Dados — ANPD.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              14. Incidentes de segurança
            </h2>
            <p className="mt-2">
              A AlePejo mantém procedimentos destinados à identificação,
              avaliação e tratamento de incidentes de segurança envolvendo
              dados pessoais. Quando um incidente puder acarretar risco ou
              dano relevante aos titulares, serão adotadas as providências
              previstas na legislação aplicável, inclusive as comunicações às
              autoridades competentes e aos titulares, quando exigidas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              15. Alterações desta política
            </h2>
            <p className="mt-2">
              Esta Política de Privacidade poderá ser atualizada
              periodicamente para refletir:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>alterações na legislação;</li>
              <li>mudanças nas funcionalidades do AlePejo ERP Cloud;</li>
              <li>alterações nos serviços e fornecedores utilizados;</li>
              <li>melhorias nos processos de segurança e proteção de dados;</li>
              <li>mudanças nas práticas de tratamento de dados.</li>
            </ul>
            <p className="mt-2">
              A versão mais recente estará sempre disponível nos canais
              oficiais do AlePejo ERP Cloud. A data indicada no início deste
              documento corresponde à última atualização.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              16. Contato e privacidade
            </h2>
            <p className="mt-2">
              Caso tenha dúvidas sobre esta Política de Privacidade, sobre o
              tratamento de dados pessoais ou queira exercer algum direito
              previsto na LGPD, entre em contato conosco:
            </p>
            <p className="mt-2">
              AlePejo Assessoria e Prestação de Serviço Ltda.
              <br />
              E-mail:{" "}
              <a
                href="mailto:suporte@alepejo.com.br"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                suporte@alepejo.com.br
              </a>
              <br />
              CNPJ: 68.275.303/0001-50
              <br />
              Canal de contato do Encarregado pelo Tratamento de Dados
              Pessoais (DPO): mesmo e-mail acima.
            </p>
            <p className="mt-2">
              As solicitações serão analisadas de acordo com a legislação
              aplicável e poderão exigir informações adicionais para
              confirmação da identidade do solicitante e proteção contra
              solicitações fraudulentas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              17. Disposições finais
            </h2>
            <p className="mt-2">
              Esta Política de Privacidade deve ser interpretada em conjunto
              com os demais documentos aplicáveis à utilização do AlePejo ERP
              Cloud, incluindo os Termos de Uso, Contrato de Prestação de
              Serviços, quando aplicável, e demais políticas disponibilizadas
              pela AlePejo.
            </p>
            <p className="mt-2">
              A utilização do AlePejo ERP Cloud implica ciência desta
              Política de Privacidade.
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
