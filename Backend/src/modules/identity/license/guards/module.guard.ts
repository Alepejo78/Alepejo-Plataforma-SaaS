import {
    CanActivate,
    ExecutionContext,
    Injectable,
  } from '@nestjs/common';
  
  import { Reflector } from '@nestjs/core';
  
  @Injectable()
  export class ModuleGuard implements CanActivate {
    constructor(
      private readonly reflector: Reflector,
    ) {}
  
    canActivate(
      context: ExecutionContext,
    ): boolean {
      const moduleCode =
        this.reflector.get<string>(
          'module',
          context.getHandler(),
        );
  
      if (!moduleCode) {
        return true;
      }
  
      const request =
        context.switchToHttp().getRequest();
  
      const modules =
        request.user?.modules ?? [];
  
      return modules.some(
        (module: { code: string }) =>
          module.code === moduleCode,
      );
    }
  }