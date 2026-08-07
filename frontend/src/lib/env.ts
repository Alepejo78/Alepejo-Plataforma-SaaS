export const env = {
  apiUrl:
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001/api",

  appName:
    process.env.NEXT_PUBLIC_APP_NAME ??
    "AlePejo ERP Cloud",
};
