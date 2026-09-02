import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { Request } from 'express';

@Injectable()
export class AntiCheatGuard implements CanActivate {
  constructor(private readonly antiCheatService: AntiCheatService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) return true;

    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.socket.remoteAddress ||
      '';
    const device = request.headers['user-agent'] || 'Desconocido';

    this.antiCheatService.analyzeUser(user.userId, ip, device);

    return true;
  }
}
