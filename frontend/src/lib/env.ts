const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/api";

export const env = {
  apiUrl,

  // Base para arquivos estáticos (uploads), que ficam fora do
  // prefixo /api — ex.: `${apiOrigin}/uploads/branding/...`.
  apiOrigin: apiUrl.replace(/\/api\/?$/, ""),

  appName:
    process.env.NEXT_PUBLIC_APP_NAME ??
    "AlePejo ERP Cloud",
};
