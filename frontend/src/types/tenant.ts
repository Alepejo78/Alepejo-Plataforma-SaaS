import { CompanyBrand } from "./branding";

export interface Tenant {
  id: string;

  company: CompanyBrand;

  language: string;

  timezone: string;

  currency: string;
}