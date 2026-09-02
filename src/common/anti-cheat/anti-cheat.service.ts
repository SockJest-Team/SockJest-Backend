import { Injectable, ForbiddenException } from '@nestjs/common';

interface UserBehavior {
  trustScore: number;
  events: number[];
  knownIps: Set<string>;
  knownDevices: Set<string>;
}

@Injectable()
export class AntiCheatService {
  private behaviorMap = new Map<string, UserBehavior>();

  private readonly WEIGHTS = {
    RAPID_CLICK: 15,
    IP_CHANGE: 25,
    DEVICE_CHANGE: 40,
    TIME_PATTERN: 10,
  };

  analyzeUser(userId: string, currentIp: string, currentDevice: string) {
    let behavior = this.behaviorMap.get(userId);

    if (!behavior) {
      behavior = {
        trustScore: 100,
        events: [],
        knownIps: new Set([currentIp]),
        knownDevices: new Set([currentDevice]),
      };
      this.behaviorMap.set(userId, behavior);
      return;
    }

    let scorePenalty = 0;

    const hasIp = behavior.knownIps.has(currentIp);
    const hasDevice = behavior.knownDevices.has(currentDevice);

    if (!hasIp && !hasDevice) {
      scorePenalty += this.WEIGHTS.IP_CHANGE;
    } else if (hasDevice && !hasIp) {
      scorePenalty += 5;
    } else if (!hasDevice && hasIp) {
      scorePenalty *= this.WEIGHTS.DEVICE_CHANGE;
    }

    const now = Date.now();
    behavior.events.push(now);
    if (behavior.events.length > 10) behavior.events.shift();

    if (behavior.events.length === 10) {
      const timeDiff = now - behavior.events[0];
      if (timeDiff < 2000) {
        scorePenalty += this.WEIGHTS.RAPID_CLICK;
      }

      const deltas: number[] = [];
      for (let i = 1; i < behavior.events.length; i++) {
        deltas.push(behavior.events[i] - behavior.events[i - 1]);
      }
      const firstDelta = deltas[0];
      if (firstDelta !== undefined) {
        const isRobotic = deltas.every((d) => Math.abs(d - deltas[0]) < 50);
        if (isRobotic) {
          scorePenalty += this.WEIGHTS.TIME_PATTERN;
        }
      }
    }

    behavior.knownIps.add(currentIp);
    behavior.knownDevices.add(currentDevice);
    behavior.trustScore -= scorePenalty;

    if (scorePenalty === 0) {
      behavior.trustScore = Math.min(100, behavior.trustScore + 2);
    }

    if (behavior.trustScore < 50) {
      throw new ForbiddenException(
        'Comportamiento sospechoso detectado. Sesión bloqueada por seguridad. Por favor, inicie sesión nuevamente.',
      );
    }
  }

  resetTrust(userId: string) {
    this.behaviorMap.delete(userId);
  }
}
