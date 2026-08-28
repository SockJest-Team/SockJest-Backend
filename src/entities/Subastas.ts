import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Calificaciones } from "./Calificaciones";
import { Notificaciones } from "./Notificaciones";
import { Pagos } from "./Pagos";
import { Pujas } from "./Pujas";
import { ReservasAcceso } from "./ReservasAcceso";
import { SubastaHistorialEstados } from "./SubastaHistorialEstados";
import { Usuarios } from "./Usuarios";
import { Categorias } from "./Categorias";
import { Relation } from "typeorm";

@Index("idx_subastas_estado_categoria", ["estado", "idCategoria"], {})
@Index("idx_subastas_fecha_inicio", ["fechaInicio"], {})
@Index("subastas_pkey", ["idSubasta"], { unique: true })
@Entity("subastas", { schema: "public" })
export class Subastas {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id_subasta" })
  idSubasta: string;

  @Column("bigint", { name: "id_categoria" })
  idCategoria: string;

  @Column("character varying", { name: "titulo", length: 150 })
  titulo: string;

  @Column("text", { name: "descripcion", nullable: true })
  descripcion: string | null;

  @Column("text", { name: "politica_envio" })
  politicaEnvio: string;

  @Column("numeric", { name: "precio_base", precision: 12, scale: 2 })
  precioBase: string;

  @Column("numeric", {
    name: "incremento_minimo_pct",
    precision: 5,
    scale: 2,
    default: () => "5.00",
  })
  incrementoMinimoPct: string;

  @Column("boolean", { name: "requiere_reserva", default: () => "false" })
  requiereReserva: boolean;

  @Column("integer", { name: "limite_usuarios_concurrentes", nullable: true })
  limiteUsuariosConcurrentes: number | null;

  @Column("character varying", {
    name: "estado",
    length: 15,
    default: () => "'Pendiente'",
  })
  estado: string;

  @Column("timestamp with time zone", {
    name: "fecha_aprobacion",
    nullable: true,
  })
  fechaAprobacion: Date | null;

  @Column("text", { name: "motivo_rechazo", nullable: true })
  motivoRechazo: string | null;

  @Column("timestamp with time zone", { name: "fecha_inicio" })
  fechaInicio: Date;

  @Column("timestamp with time zone", { name: "fecha_fin" })
  fechaFin: Date;

  @Column("timestamp with time zone", {
    name: "fecha_creacion",
    default: () => "now()",
  })
  fechaCreacion: Date;

  @OneToOne(() => Calificaciones, (calificaciones) => calificaciones.idSubasta2)
  calificaciones: Relation<Calificaciones>;

  @OneToMany(() => Notificaciones, (notificaciones) => notificaciones.idSubasta)
  notificaciones: Relation<Notificaciones>[];

  @OneToOne(() => Pagos, (pagos) => pagos.idSubasta2)
  pagos: Relation<Pagos>;

  @OneToMany(() => Pujas, (pujas) => pujas.idSubasta2)
  pujas: Relation<Pujas>[];

  @OneToMany(
    () => ReservasAcceso,
    (reservasAcceso) => reservasAcceso.idSubasta2
  )
  reservasAccesos: Relation<ReservasAcceso>[];

  @OneToMany(
    () => SubastaHistorialEstados,
    (subastaHistorialEstados) => subastaHistorialEstados.idSubasta
  )
  subastaHistorialEstados: Relation<SubastaHistorialEstados>[];

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.subastas)
  @JoinColumn([
    { name: "id_admin_aprobador", referencedColumnName: "idUsuario" },
  ])
  idAdminAprobador: Relation<Usuarios>;

  @ManyToOne(() => Categorias, (categorias) => categorias.subastas)
  @JoinColumn([{ name: "id_categoria", referencedColumnName: "idCategoria" }])
  idCategoria2: Relation<Categorias>;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.subastas2)
  @JoinColumn([{ name: "id_ganador", referencedColumnName: "idUsuario" }])
  idGanador: Relation<Usuarios>;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.subastas3)
  @JoinColumn([{ name: "id_subastador", referencedColumnName: "idUsuario" }])
  idSubastador: Relation<Usuarios>;
}
