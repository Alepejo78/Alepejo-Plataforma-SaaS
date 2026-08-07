import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { LicenseRepository } from '../repositories/license.repository';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';

@Injectable()
export class LicenseService {
  constructor(
    private readonly repository: LicenseRepository,
  ) {}

  async getCompanyLicenses(companyId: string) {
    const company =
      await this.repository.findCompany(companyId);

    if (!company) {
      throw new NotFoundException(
        'Empresa não encontrada.',
      );
    }

    return company;
  }

  async getPlans() {
    return this.repository.findPlans();
  }

  async getModules() {
    return this.repository.findModules();
  }

  async assignPlan(
    companyId: string,
    planId: string,
    trialEndsAt?: Date,
  ) {
    return this.repository.assignPlan(
      companyId,
      planId,
      trialEndsAt,
    );
  }

  async enableModule(
    companyId: string,
    moduleId: string,
    expiresAt?: Date,
  ) {
    return this.repository.enableModule(
      companyId,
      moduleId,
      expiresAt,
    );
  }

  async disableModule(
    companyId: string,
    moduleId: string,
  ) {
    return this.repository.disableModule(
      companyId,
      moduleId,
    );
  }

  async startTrial(
    companyId: string,
    moduleId: string,
    days: number,
  ) {
    const trialEndsAt = new Date();

    trialEndsAt.setDate(
      trialEndsAt.getDate() + days,
    );

    return this.repository.startTrial(
      companyId,
      moduleId,
      trialEndsAt,
    );
  }

  async hasModule(
    companyId: string,
    moduleCode: string,
  ): Promise<boolean> {
    const company =
      await this.repository.findCompany(companyId);

    if (!company) {
      return false;
    }

    // Módulos básicos do ERP sempre disponíveis
    if (
      [
        'BPS',
        'AUTH',
        'CONFIG',
        'DASHBOARD',
      ].includes(moduleCode)
    ) {
      return true;
    }

    // Módulos liberados pelo plano
    if (
      company.companyPlan?.plan?.planModules?.some(
        (item) =>
          item.included &&
          item.module.code === moduleCode,
      )
    ) {
      return true;
    }

    // Módulos licenciados individualmente
    const companyModule =
      company.companyModules.find(
        (item) =>
          item.module.code === moduleCode,
      );

    if (!companyModule) {
      return false;
    }

    if (
      !companyModule.enabled ||
      !companyModule.licensed
    ) {
      return false;
    }

    if (
      companyModule.expiresAt &&
      companyModule.expiresAt < new Date()
    ) {
      return false;
    }

    return true;
  }


async getDashboard() {
  const [companies, plans, modules, licenses] =
    await this.repository.dashboard();

  return {
    companies,
    plans,
    modules,
    licenses,
  };
}

async getPlan(id: string) {
  return this.repository.findPlan(id);
}

async createPlan(dto: CreatePlanDto) {
  return this.repository.createPlan(dto);
}

async updatePlan(id: string, dto: UpdatePlanDto) {
  return this.repository.updatePlan(id, dto);
}

async removePlan(id: string) {
  return this.repository.removePlan(id);
}

async getModule(id: string) {
  return this.repository.findModule(id);
}

async createModule(dto: CreateModuleDto) {
  return this.repository.createModule(dto);
}

async updateModule(id: string, dto: UpdateModuleDto) {
  return this.repository.updateModule(id, dto);
}

async removeModule(id: string) {
  return this.repository.removeModule(id);
}

async history(companyId: string) {
  return this.repository.history(companyId);
}
}