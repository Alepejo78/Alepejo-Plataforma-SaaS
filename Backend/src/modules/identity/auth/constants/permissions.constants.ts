export const ERP_MODULES = {
    PLATFORM: 'platform',
  
    BPS: 'bps',
  
    RH: 'hr',
  
    PRODUCTS: 'products',
  
    PURCHASE: 'purchase',
  
    SALES: 'sales',
  
    INVENTORY: 'inventory',

    INVENTORY_COUNT: 'inventory_count',

    WAREHOUSE: 'warehouse',
  
    FINANCIAL: 'financial',
  
    FISCAL: 'fiscal',
  
    CRM: 'crm',
  
    SERVICE: 'service',
  
    PRODUCTION: 'production',
  
    PDV: 'pdv',
  
    BI: 'bi',
  } as const;
  
  export const PERMISSION_ACTIONS = {
    VIEW: 'view',
  
    CREATE: 'create',
  
    UPDATE: 'update',
  
    DELETE: 'delete',
  
    APPROVE: 'approve',
  
    CANCEL: 'cancel',
  
    CLOSE: 'close',
  
    REOPEN: 'reopen',
  
    IMPORT: 'import',
  
    EXPORT: 'export',
  
    PRINT: 'print',
  
    EMAIL: 'email',
  
    ENTRY: 'entry',
  
    EXIT: 'exit',
  
    TRANSFER: 'transfer',
  
    ADJUST: 'adjust',
  
    INVOICE: 'invoice',
  } as const;
  
  export const PERMISSIONS = {
    PLATFORM: {
      ACCESS: 'platform.access',
      SETTINGS: 'platform.settings',
      AUDIT: 'platform.audit',
    },
  
    COMPANY: {
      VIEW: 'company.view',
      CREATE: 'company.create',
      UPDATE: 'company.update',
      DELETE: 'company.delete',
    },
  
    USERS: {
      VIEW: 'user.view',
      CREATE: 'user.create',
      UPDATE: 'user.update',
      DELETE: 'user.delete',
    },
  
    ROLES: {
      VIEW: 'role.view',
      CREATE: 'role.create',
      UPDATE: 'role.update',
      DELETE: 'role.delete',
    },
  
    BPS: {
      VIEW: 'bps.view',
      CREATE: 'bps.create',
      UPDATE: 'bps.update',
      DELETE: 'bps.delete',
    },
  
    PRODUCTS: {
      VIEW: 'products.view',
      CREATE: 'products.create',
      UPDATE: 'products.update',
      DELETE: 'products.delete',
    },
  
    PURCHASE: {
      VIEW: 'purchase.view',
      CREATE: 'purchase.create',
      UPDATE: 'purchase.update',
      APPROVE: 'purchase.approve',
      CANCEL: 'purchase.cancel',
    },
  
    SALES: {
      VIEW: 'sales.view',
      CREATE: 'sales.create',
      UPDATE: 'sales.update',
      CANCEL: 'sales.cancel',
      INVOICE: 'sales.invoice',
    },
  
    INVENTORY: {
      VIEW: 'inventory.view',
      ENTRY: 'inventory.entry',
      EXIT: 'inventory.exit',
      TRANSFER: 'inventory.transfer',
      ADJUST: 'inventory.adjust',
    },
  
    FINANCIAL: {
      VIEW: 'financial.view',
      CREATE: 'financial.create',
      UPDATE: 'financial.update',
      DELETE: 'financial.delete',
      APPROVE: 'financial.approve',
    },
  
    FISCAL: {
      VIEW: 'fiscal.view',
      CREATE: 'fiscal.create',
      UPDATE: 'fiscal.update',
      DELETE: 'fiscal.delete',
    },
  
    RH: {
      VIEW: 'hr.view',
      CREATE: 'hr.create',
      UPDATE: 'hr.update',
      DELETE: 'hr.delete',
      APPROVE: 'hr.approve',
    },
  
    CRM: {
      VIEW: 'crm.view',
      CREATE: 'crm.create',
      UPDATE: 'crm.update',
      DELETE: 'crm.delete',
    },
  
    SERVICE: {
      VIEW: 'service.view',
      CREATE: 'service.create',
      UPDATE: 'service.update',
      DELETE: 'service.delete',
    },
  
    PRODUCTION: {
      VIEW: 'production.view',
      CREATE: 'production.create',
      UPDATE: 'production.update',
      DELETE: 'production.delete',
    },
  
    PDV: {
      VIEW: 'pdv.view',
      CREATE: 'pdv.create',
      CANCEL: 'pdv.cancel',
      CLOSE: 'pdv.close',
    },
  
    BI: {
      VIEW: 'bi.view',
      EXPORT: 'bi.export',
    },
  } as const;