import { Injectable } from '@nestjs/common';

import { UsersService } from '../../users/services/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ) {
    // Implementaremos a validação com bcrypt na próxima etapa.
    return {
      email,
      password,
    };
  }
}