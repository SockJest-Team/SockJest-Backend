import { Injectable } from '@nestjs/common';

@Injectable()
export class SalaStateService {
  private readonly compradoresPorSala = new Map<string, Set<string>>();

  agregarComprador(subastaId: string, socketId: string) {
    const set = this.compradoresPorSala.get(subastaId) ?? new Set<string>();
    set.add(socketId);
    this.compradoresPorSala.set(subastaId, set);
  }

  quitarComprador(subastaId: string, socketId: string) {
    this.compradoresPorSala.get(subastaId)?.delete(socketId);
  }

  contarCompradores(subastaId: string): number {
    return this.compradoresPorSala.get(subastaId)?.size ?? 0;
  }
}
