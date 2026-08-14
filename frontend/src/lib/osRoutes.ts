/**
 * URLs que hoje têm prefixo `/erp/...` mas já renderizam com `OsShell`
 * (telas relocadas pro app OS numa sessão anterior — Usuários, Perfis,
 * Licenciamento etc., ver docs/08-Continuidade.md). Precisa dessa lista
 * fixa porque o prefixo da URL sozinho não basta pra saber a qual app
 * uma tela pertence.
 */
const OS_ONLY_ERP_PATHS = [
  "/erp/configuracoes/usuarios",
  "/erp/configuracoes/perfis",
  "/erp/licenciamento",
  "/erp/configuracoes",
  "/erp/configuracoes/personalizacao",
  "/erp/configuracoes/notificacoes",
  "/erp/rh/ponto/chave-api",
  "/erp/produtos/cadastros",
  "/erp/estoque/depositos",
  "/erp/financeiro/plano-contas",
  "/erp/financeiro/classificacoes",
  "/erp/rh/funcoes",
  "/erp/rh/cadastros",
  "/erp/producao/configuracoes",
] as const;

/** `/erp/configuracoes` sozinho é a tela "Empresa" — não deve casar com
 * `/erp/configuracoes/plano-contas` e outras rotas do ERP que só por
 * acaso começam igual (nenhuma existe hoje, mas evita futuro falso
 * positivo). As demais entradas da lista aceitam sub-rotas (ex.:
 * `/erp/configuracoes/perfis/[id]/permissoes`).
 */
function matchesOsPath(pathname: string, osPath: string): boolean {
  if (pathname === osPath) {
    return true;
  }

  if (osPath === "/erp/configuracoes") {
    return false;
  }

  return pathname.startsWith(`${osPath}/`);
}

/** Empresa/app dono de uma URL: OS (cards) ou Sistema ERP (menu lateral). */
export function isOsPath(pathname: string): boolean {
  if (pathname.startsWith("/os")) {
    return true;
  }

  return OS_ONLY_ERP_PATHS.some((osPath) =>
    matchesOsPath(pathname, osPath)
  );
}

/**
 * Título de cada tela "principal" do app OS (hubs em `/os/**` + as 16
 * telas relocadas que continuam com URL `/erp/...`) — usado pra abrir
 * guia automaticamente quando a navegação não passou por `openTab`
 * (ex.: F5, voltar do navegador) e pra saber quais URLs de OS viram guia.
 */
export const OS_PATH_TITLES: Record<string, string> = {
  "/os": "OS",
  "/os/portal": "Portal",
  "/os/seguranca": "Segurança",
  "/os/apis": "APIs",
  "/os/configuracoes": "Configurações",
  "/os/configuracoes/cadastro": "Configurações — Cadastro",
  "/os/configuracoes/estoque": "Configurações — Estoque",
  "/os/configuracoes/financeiro": "Configurações — Financeiro",
  "/os/configuracoes/rh": "Configurações — RH",
  "/os/configuracoes/producao": "Configurações — Produção",
  "/erp/configuracoes/usuarios": "Usuários",
  "/erp/configuracoes/perfis": "Perfis de acesso",
  "/erp/licenciamento": "Licenciamento",
  "/erp/configuracoes": "Empresa",
  "/erp/configuracoes/personalizacao": "Personalização",
  "/erp/configuracoes/notificacoes": "Notificações",
  "/erp/rh/ponto/chave-api": "Chave de API (ponto)",
  "/erp/produtos/cadastros": "Categorias e marcas",
  "/erp/estoque/depositos": "Depósitos",
  "/erp/financeiro/plano-contas": "Plano de contas",
  "/erp/financeiro/classificacoes": "Classificações",
  "/erp/rh/funcoes": "Funções e cargos",
  "/erp/rh/cadastros": "Setores, horários e EPI",
  "/erp/producao/configuracoes": "Configurações de produção",
};
