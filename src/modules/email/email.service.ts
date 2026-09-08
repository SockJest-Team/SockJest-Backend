import { Injectable, Logger } from '@nestjs/common';

interface Destinatario {
  email: string;
  nombre: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined = process.env.RESEND_API_KEY;

  private readonly from: string =
    process.env.EMAIL_FROM ?? 'LiveBid <onboarding@resend.dev>';

  private readonly frontendUrl: string =
    process.env.FRONTEND_URL ?? 'http://localhost:3000';

  constructor() {
    if (!this.apiKey) {
      this.logger.warn(
        'RESEND_API_KEY no configurada — los correos serán omitidos (modo no-op)',
      );
    } else {
      this.logger.log(
        `EmailService listo — remitente: ${this.from} · frontend: ${this.frontendUrl}`,
      );
    }
  }

  private async enviar(
    to: Destinatario,
    asunto: string,
    html: string,
  ): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(
        `Correo omitido (sin API key): "${asunto}" → ${to.email}`,
      );
      return;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [to.email],
          subject: asunto,
          html,
        }),
      });

      if (!res.ok) {
        this.logger.error(
          `Resend falló (${res.status}) para ${to.email}: ${await res.text()}`,
        );
      } else {
        this.logger.log(`Correo enviado: "${asunto}" → ${to.email}`);
      }
    } catch (e) {
      this.logger.error(
        `Resend inaccesible: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private plantilla(titulo: string, cuerpoHtml: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;background:#F9F8F6;font-family:Georgia,serif;color:#1c1917;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e7e5e4;">
    <div style="background:#1c1917;padding:28px 32px;">
      <p style="margin:0;font-family:monospace;font-size:11px;letter-spacing:0.3em;color:#a8a29e;">LIVEBID STUDIO</p>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:24px;font-weight:400;margin:0 0 16px;">${titulo}</h1>
      ${cuerpoHtml}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e7e5e4;">
      <p style="margin:0;font-family:monospace;font-size:10px;color:#a8a29e;">©2026 LiveBid · Plataforma de subastas en tiempo real</p>
    </div>
  </div>
</body>
</html>`;
  }

  private formatoMoneda(valor: string | number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(valor));
  }

  async correoGanador(
    ganador: Destinatario,
    subasta: { titulo: string; monto: string; horas: number },
  ): Promise<void> {
    await this.enviar(
      ganador,
      `¡Ganaste "${subasta.titulo}"!`,
      this.plantilla(
        '¡Felicitaciones!',
        `<p style="font-size:15px;line-height:1.7;">Hola <b>${ganador.nombre}</b>, ganaste la subasta <b>«${subasta.titulo}»</b> con una puja de <b style="font-size:18px;">${this.formatoMoneda(subasta.monto)}</b>.</p>
         <p style="font-size:15px;line-height:1.7;">Tienes <b>${subasta.horas} horas</b> para completar el pago y asegurar tu pieza.</p>
         <a href="${this.frontendUrl}/pagos" style="display:inline-block;margin-top:8px;background:#1c1917;color:#fff;font-family:monospace;font-size:12px;letter-spacing:0.1em;padding:14px 24px;text-decoration:none;">IR A PAGAR</a>`,
      ),
    );
  }

  async correoVentaSubastador(
    subastador: Destinatario,
    subasta: { titulo: string; monto: string; comision: number; neto: number },
  ): Promise<void> {
    await this.enviar(
      subastador,
      `Tu lote "${subasta.titulo}" se vendió`,
      this.plantilla(
        'Venta confirmada',
        `<p style="font-size:15px;line-height:1.7;">Hola <b>${subastador.nombre}</b>, tu lote <b>«${subasta.titulo}»</b> se vendió por <b>${this.formatoMoneda(subasta.monto)}</b>.</p>
         <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
           <tr><td style="padding:8px 0;border-bottom:1px solid #e7e5e4;color:#78716c;">Precio final</td><td style="text-align:right;border-bottom:1px solid #e7e5e4;">${this.formatoMoneda(subasta.monto)}</td></tr>
           <tr><td style="padding:8px 0;border-bottom:1px solid #e7e5e4;color:#78716c;">Comisión plataforma (5%)</td><td style="text-align:right;border-bottom:1px solid #e7e5e4;">− ${this.formatoMoneda(subasta.comision)}</td></tr>
           <tr><td style="padding:12px 0;font-weight:bold;">Neto a recibir</td><td style="text-align:right;font-weight:bold;font-size:18px;">${this.formatoMoneda(subasta.neto)}</td></tr>
         </table>`,
      ),
    );
  }

  async correoPagoConfirmadoComprador(
    comprador: Destinatario,
    pago: { titulo: string; monto: string; referencia: string },
  ): Promise<void> {
    await this.enviar(
      comprador,
      `Pago confirmado — ${pago.titulo}`,
      this.plantilla(
        'Pago confirmado ✅',
        `<p style="font-size:15px;line-height:1.7;">Hola <b>${comprador.nombre}</b>, tu pago por <b>«${pago.titulo}»</b> fue procesado exitosamente.</p>
         <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
           <tr><td style="padding:8px 0;border-bottom:1px solid #e7e5e4;color:#78716c;">Monto pagado</td><td style="text-align:right;border-bottom:1px solid #e7e5e4;"><b>${this.formatoMoneda(pago.monto)}</b></td></tr>
           <tr><td style="padding:8px 0;color:#78716c;">Referencia</td><td style="text-align:right;font-family:monospace;font-size:12px;">${pago.referencia}</td></tr>
         </table>
         <p style="font-size:15px;line-height:1.7;margin-top:16px;">El subastador ya fue notificado y coordinarán el envío de tu pieza.</p>`,
      ),
    );
  }

  async correoPagoConfirmadoSubastador(
    subastador: Destinatario,
    pago: { titulo: string; monto: string; referencia: string },
  ): Promise<void> {
    await this.enviar(
      subastador,
      `¡Venta pagada! — ${pago.titulo}`,
      this.plantilla(
        'El comprador ya pagó 🎉',
        `<p style="font-size:15px;line-height:1.7;">Hola <b>${subastador.nombre}</b>, el ganador de <b>«${pago.titulo}»</b> completó el pago de <b>${this.formatoMoneda(pago.monto)}</b>.</p>
         <p style="font-size:15px;line-height:1.7;">Referencia de la transacción: <span style="font-family:monospace;font-size:12px;">${pago.referencia}</span></p>
         <p style="font-size:15px;line-height:1.7;">Es momento de <b>coordinar el envío</b> del producto con el comprador.</p>`,
      ),
    );
  }

  async correoPagoVencido2oPuesto(
    nuevoGanador: Destinatario,
    subasta: { titulo: string; monto: string; horas: number },
  ): Promise<void> {
    await this.enviar(
      nuevoGanador,
      `La subasta "${subasta.titulo}" es tuya — el ganador no pagó`,
      this.plantilla(
        'Segunda oportunidad',
        `<p style="font-size:15px;line-height:1.7;">Hola <b>${nuevoGanador.nombre}</b>, el ganador original de <b>«${subasta.titulo}»</b> no completó el pago. Como segunda mejor puja, <b>la pieza es tuya</b> por <b>${this.formatoMoneda(subasta.monto)}</b>.</p>
         <p style="font-size:15px;line-height:1.7;">Tienes <b>${subasta.horas} horas</b> para pagar.</p>
         <a href="${this.frontendUrl}/pagos" style="display:inline-block;margin-top:8px;background:#1c1917;color:#fff;font-family:monospace;font-size:12px;letter-spacing:0.1em;padding:14px 24px;text-decoration:none;">IR A PAGAR</a>`,
      ),
    );
  }

  async correoRenovacionSubastador(
    subastador: Destinatario,
    subasta: { titulo: string },
  ): Promise<void> {
    await this.enviar(
      subastador,
      `Renueva tu lote "${subasta.titulo}"`,
      this.plantilla(
        'Tu lote quedó sin venta',
        `<p style="font-size:15px;line-height:1.7;">Hola <b>${subastador.nombre}</b>, <b>«${subasta.titulo}»</b> no concretó venta (el ganador no pagó). Puedes <b>renovarla</b>: edítala y publícala de nuevo — pasará por moderación otra vez.</p>`,
      ),
    );
  }
}
