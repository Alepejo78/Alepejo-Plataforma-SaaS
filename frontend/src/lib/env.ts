export const env = {
    apiUrl:
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3333/api",
  
    appName:
      process.env.NEXT_PUBLIC_APP_NAME ??
      "AlePejo ERP Cloud",
  
    tenant:
      process.env.NEXT_PUBLIC_DEFAULT_TENANT ??
      "master",
  };