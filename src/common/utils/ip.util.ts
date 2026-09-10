export function limpiarIp(bruta: string | undefined | null): string {
  const valor = bruta?.split(',')[0]?.trim() || '0.0.0.0';

  const sinPrefijo = valor.startsWith('::ffff:') ? valor.slice(7) : valor;

  const partes = sinPrefijo.split(':');
  if (partes.length === 2 && /^\d{1,3}(\.\d{1,3}){3}$/.test(partes[0])) {
    return partes[0];
  }

  return sinPrefijo || '0.0.0.0';
}
