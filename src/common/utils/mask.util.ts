export function enmascararCorreo(correo?: string | null): string {
  if (!correo) return 'Anónimo';
  const [usuario, dominio] = correo.split('@');
  if (!usuario || !dominio) return 'Anónimo';
  return `${usuario.charAt(0)}***@${dominio}`;
}
