import { Column, Entity, Index, OneToMany, Relation, } from "typeorm";
import { Calificaciones } from "./Calificaciones";
import { Notificaciones } from "./Notificaciones";
import { Pagos } from "./Pagos";
import { Pujas } from "./Pujas";
import { ReservasAcceso } from "./ReservasAcceso";
import { Sesiones } from "./Sesiones";
import { SubastaHistorialEstados } from "./SubastaHistorialEstados";
import { Subastas } from "./Subastas";
import { UsuarioRoles } from "./UsuarioRoles";

@Index("usuarios_correo_key", ["correo"], { unique: true })
@Index("usuarios_pkey", ["idUsuario"], { unique: true })
@Entity("usuarios", { schema: "public" })
export class Usuarios {
  @Column("uuid", { primary: true, name: "id_usuario" })
  idUsuario: string;

  @Column("character varying", { name: "nombre_completo", length: 150 })
  nombreCompleto: string;

  @Column("character varying", { name: "correo", unique: true, length: 150 })
  correo: string;

  @Column("character varying", { name: "telefono", nullable: true, length: 20 })
  telefono: string | null;

  @Column("character varying", {
    name: "estado",
    length: 15,
    default: () => "'Activo'",
  })
  estado: string;

  @Column("inet", { name: "ultima_ip", nullable: true })
  ultimaIp: string | null;

  @Column("character varying", {
    name: "ultimo_dispositivo",
    nullable: true,
    length: 255,
  })
  ultimoDispositivo: string | null;

  @Column("timestamp with time zone", {
    name: "fecha_registro",
    default: () => "now()",
  })
  fechaRegistro: Date;

  @OneToMany(
    () => Calificaciones,
    (calificaciones) => calificaciones.idComprador
  )
  calificaciones: Relation<Calificaciones>[];

  @OneToMany(
    () => Calificaciones,
    (calificaciones) => calificaciones.idSubastador2
  )
  calificaciones2: Relation<Calificaciones>[];

  @OneToMany(
    () => Notificaciones,
    (notificaciones) => notificaciones.idUsuario2
  )
  notificaciones: Relation<Notificaciones>[];

  @OneToMany(() => Pagos, (pagos) => pagos.idComprador)
  pagos: Relation<Pagos>[];

  @OneToMany(() => Pujas, (pujas) => pujas.idUsuario2)
  pujas: Relation<Pujas>[];

  @OneToMany(
    () => ReservasAcceso,
    (reservasAcceso) => reservasAcceso.idComprador2
  )
  reservasAccesos: Relation<ReservasAcceso>[];

  @OneToMany(() => Sesiones, (sesiones) => sesiones.idUsuario2)
  sesiones: Sesiones[];

  @OneToMany(
    () => SubastaHistorialEstados,
    (subastaHistorialEstados) => subastaHistorialEstados.idUsuarioResponsable
  )
  subastaHistorialEstados: Relation<SubastaHistorialEstados>[];

  @OneToMany(() => Subastas, (subastas) => subastas.idAdminAprobador)
  subastas: Relation<Subastas>[];

  @OneToMany(() => Subastas, (subastas) => subastas.idGanador)
  subastas2: Relation<Subastas>[];

  @OneToMany(() => Subastas, (subastas) => subastas.idSubastador)
  subastas3: Relation<Subastas>[];

  @OneToMany(() => UsuarioRoles, (usuarioRoles) => usuarioRoles.idUsuario2)
  usuarioRoles: UsuarioRoles[];
}
