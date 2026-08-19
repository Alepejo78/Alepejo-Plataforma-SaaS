import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../core/prisma/prisma.service';

import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';

@Injectable()
export class LicenseRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  findCompany(companyId: string) {
    return this.prisma.company.findUnique({
      where: {
        id: companyId,
      },
      include: {
        companyPlan: {
          include: {
            plan: {
              include: {
                planModules: {
                  include: {
                    module: true,
                  },
                },
              },
            },
          },
        },
        companyModules: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  findPlans() {
    return this.prisma.plan.findMany({
      include: {
        planModules: {
          include: { module: true },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  findModules() {
    return this.prisma.module.findMany({
      where: {
        active: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  assignPlan(
    companyId: string,
    planId: string,
    trialEndsAt?: Date,
  ) {
    return this.prisma.companyPlan.upsert({
      where: {
        companyId,
      },
      create: {
        companyId,
        planId,
        trialEndsAt,
      },
      update: {
        planId,
        trialEndsAt,
        active: true,
      },
    });
  }

  enableModule(
    companyId: string,
    moduleId: string,
    expiresAt?: Date,
  ) {
    return this.prisma.companyModule.upsert({
      where: {
        companyId_moduleId: {
          companyId,
          moduleId,
        },
      },
      create: {
        companyId,
        moduleId,
        enabled: true,
        licensed: true,
        expiresAt,
      },
      update: {
        enabled: true,
        licensed: true,
        expiresAt,
      },
    });
  }

  disableModule(
    companyId: string,
    moduleId: string,
  ) {
    return this.prisma.companyModule.update({
      where: {
        companyId_moduleId: {
          companyId,
          moduleId,
        },
      },
      data: {
        enabled: false,
      },
    });
  }

  startTrial(
    companyId: string,
    moduleId: string,
    trialEndsAt: Date,
  ) {
    return this.prisma.companyModule.upsert({
      where: {
        companyId_moduleId: {
          companyId,
          moduleId,
        },
      },
      create: {
        companyId,
        moduleId,
        enabled: true,
        licensed: true,
        trial: true,
        trialEndsAt,
      },
      update: {
        enabled: true,
        licensed: true,
        trial: true,
        trialEndsAt,
      },
    });
  }


  // ==========================
  // Plans
  // ==========================

  findPlan(id: string) {
    return this.prisma.plan.findUnique({
      where: { id },
      include: {
        planModules: {
          include: { module: true },
        },
      },
    });
  }

  findPlanByCode(code: string) {
    return this.prisma.plan.findUnique({ where: { code } });
  }

  createPlan(dto: CreatePlanDto) {
    const { moduleIds, ...data } = dto;

    return this.prisma.plan.create({
      data: {
        ...data,
        ...(moduleIds && moduleIds.length > 0
          ? {
              planModules: {
                create: moduleIds.map((moduleId) => ({
                  moduleId,
                  included: true,
                })),
              },
            }
          : {}),
      },
      include: {
        planModules: {
          include: { module: true },
        },
      },
    });
  }

  updatePlan(id: string, dto: UpdatePlanDto) {
    const { moduleIds, ...data } = dto;

    return this.prisma.plan.update({
      where: { id },
      data: {
        ...data,
        // moduleIds ausente = não mexe na composição; presente (mesmo
        // []) = substitui pelo conjunto novo. Sem isso o campo era
        // aceito no DTO e simplesmente descartado — editar os módulos
        // de um plano já criado nunca funcionava.
        ...(moduleIds !== undefined && {
          planModules: {
            deleteMany: {},
            create: moduleIds.map((moduleId) => ({
              moduleId,
              included: true,
            })),
          },
        }),
      },
      include: {
        planModules: {
          include: { module: true },
        },
      },
    });
  }

  removePlan(id: string) {
    return this.prisma.plan.delete({
      where: { id },
    });
  }

  // ==========================
  // Modules
  // ==========================

  findModule(id: string) {
    return this.prisma.module.findUnique({
      where: { id },
    });
  }

  createModule(data: CreateModuleDto) {
    return this.prisma.module.create({ data });
  }

  updateModule(id: string, data: UpdateModuleDto) {
    return this.prisma.module.update({
      where: { id },
      data,
    });
  }

  removeModule(id: string) {
    return this.prisma.module.delete({
      where: { id },
    });
  }

  // ==========================
  // Platform Settings (singleton)
  // ==========================

  /** Sempre uma linha só — cria com o padrão na primeira leitura, se ainda não existir. */
  async getPlatformSettings() {
    const existing = await this.prisma.platformSettings.findFirst();

    if (existing) {
      return existing;
    }

    return this.prisma.platformSettings.create({ data: {} });
  }

  async updatePlatformSettings(data: { trialDays: number }) {
    const settings = await this.getPlatformSettings();

    return this.prisma.platformSettings.update({
      where: { id: settings.id },
      data,
    });
  }

  dashboard() {
    return Promise.all([
      this.prisma.company.count(),
      this.prisma.plan.count(),
      this.prisma.module.count(),
      this.prisma.companyModule.count(),
    ]);
  }

  history(companyId: string) {
    return this.prisma.licenseHistory.findMany({
      where: { companyId },
      include: {
        module: true,
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

}