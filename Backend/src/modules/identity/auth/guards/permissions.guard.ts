import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
  } from '@nestjs/common';
  
  import { Reflector } from '@nestjs/core';
  
  import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
  
  @Injectable()
  export class PermissionsGuard implements CanActivate {
    constructor(
      private readonly reflector: Reflector,
    ) {}
  
    canActivate(context: ExecutionContext): boolean {
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );
  
      if (
        !requiredPermissions ||
        requiredPermissions.length === 0
      ) {
        return true;
      }
  
      const request = context.switchToHttp().getRequest();
  
      const user = request.user;
  
      if (!user) {
        throw new ForbiddenException('Usuário não autenticado.');
      }
  
      const userPermissions: string[] = Array.isArray(user.permissions)
        ? user.permissions
        : [];
        console.log("===== USER =====");
        console.log(user);
        
        console.log("===== REQUIRED =====");
        console.log(requiredPermissions);
        
        console.log("===== PERMISSIONS =====");
        console.log(user.permissions);
      const authorized = requiredPermissions.every(permission =>
        userPermissions.includes(permission),
      );
  
      if (!authorized) {
        throw new ForbiddenException(
          'Você não possui permissão para executar esta operação.',
        );
      }
  
      return true;
    }
  }