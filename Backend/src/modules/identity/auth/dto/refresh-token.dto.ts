/**
 * O refresh token trafega em cookie httpOnly, não no corpo da requisição.
 * Este tipo é usado apenas como contrato interno entre o controller
 * (que lê o cookie) e o AuthService.
 */
export class RefreshTokenDto {
  refreshToken?: string;
}
