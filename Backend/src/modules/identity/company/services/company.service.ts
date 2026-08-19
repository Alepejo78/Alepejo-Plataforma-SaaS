import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Company } from '@prisma/client';

import { CompanyRepository } from '../repositories/company.repository';

import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const companyExists = await this.companyRepository.findByDocument(
      dto.document,
    );

    if (companyExists) {
      throw new ConflictException(
        'Já existe uma empresa cadastrada com este documento.',
      );
    }

    return this.companyRepository.create(dto);
  }

  async findAll(page = 1, limit = 20) {
    return this.companyRepository.findAll(page, limit);
  }

  async findById(id: string): Promise<Company> {
    const company = await this.companyRepository.findById(id);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return company;
  }

  /**
   * Só o essencial pra montar a página pública de login com o nome da
   * empresa (`/<slug>/login`) — sem sessão, então nada sensível aqui.
   */
  async findPublicBySlug(
    slug: string,
  ): Promise<{ legalName: string; tradeName: string | null }> {
    const company = await this.companyRepository.findBySlug(slug);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return {
      legalName: company.legalName,
      tradeName: company.tradeName,
    };
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
  ): Promise<Company> {
    await this.findById(id);

    return this.companyRepository.update(id, dto);
  }

  async remove(id: string): Promise<Company> {
    await this.findById(id);

    return this.companyRepository.softDelete(id);
  }

  /** Empresas que o login atual pode acessar (login cruzado) — ver UserCompany. */
  async getMyCompanies(userId: string): Promise<Company[]> {
    return this.companyRepository.findLinkedToUser(userId);
  }

  /** Raiz + filiais do grupo de quem está pedindo (ver Company.rootCompanyId). */
  async getGroup(companyId: string): Promise<Company[]> {
    const company = await this.findById(companyId);
    const rootCompanyId = company.rootCompanyId ?? company.id;

    return this.companyRepository.findGroup(rootCompanyId);
  }

  /**
   * Garante que `targetId` pertence ao mesmo grupo (mesma raiz) de
   * `companyId`, pra não vazar acesso entre clientes diferentes.
   */
  private async assertSameGroup(
    companyId: string,
    targetId: string,
  ): Promise<Company> {
    const requester = await this.findById(companyId);
    const rootCompanyId = requester.rootCompanyId ?? requester.id;

    const target = await this.findById(targetId);
    const targetRootId = target.rootCompanyId ?? target.id;

    if (targetRootId !== rootCompanyId) {
      throw new ForbiddenException(
        'Esta empresa não pertence ao seu grupo.',
      );
    }

    return target;
  }

  /**
   * Atualiza uma empresa do grupo (inclusive ativar/desativar) — só
   * permitido se `targetId` pertencer ao mesmo grupo de `companyId`.
   */
  async updateInGroup(
    companyId: string,
    targetId: string,
    dto: UpdateCompanyDto,
  ): Promise<Company> {
    await this.assertSameGroup(companyId, targetId);

    return this.companyRepository.update(targetId, dto);
  }
}