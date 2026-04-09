import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '@api/auth/auth.service';
import { FastifyRequest as Request } from 'fastify';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

interface JWTPayload {
  sub: string;
  role: string;
  permissions: string[];
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload: JWTPayload = await this.authService.verifyToken(token);
      request.user = payload;

      const { role, permissions } = payload;

      // SUPER_ADMIN bypass
      if (role === 'SUPER_ADMIN') {
        return true;
      }

      const hasPermission = requiredPermissions.every((permission) => permissions.includes(permission));

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) return undefined;

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
