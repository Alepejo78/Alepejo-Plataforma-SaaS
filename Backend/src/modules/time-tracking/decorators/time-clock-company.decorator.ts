import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

/** Lê o companyId resolvido pelo TimeClockApiKeyGuard. */
export const TimeClockCompany = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    return request.timeClockCompanyId as string;
  },
);
