import { PrismaService } from '../../prisma/prisma.service';

export abstract class BaseRepository {
  constructor(
    protected readonly prisma: PrismaService,
  ) {}

  protected getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  protected getTotalPages(
    total: number,
    limit: number,
  ): number {
    return Math.ceil(total / limit);
  }

  protected buildPagination(
    page: number,
    limit: number,
    total: number,
  ) {
    return {
      page,
      limit,
      total,
      totalPages: this.getTotalPages(total, limit),
    };
  }
}