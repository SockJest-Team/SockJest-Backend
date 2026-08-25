import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Usuarios } from "./Usuarios";
import { Subastas } from "./Subastas";

@Index(
  "reservas_acceso_id_subasta_id_comprador_key",
  ["idComprador", "idSubasta"],
  { unique: true }
)
@Index("reservas_acceso_pkey", ["idReserva"], { unique: true })
@Entity("reservas_acceso", { schema: "public" })
export class ReservasAcceso {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id_reserva" })
  idReserva: string;

  @Column("bigint", { name: "id_subasta", unique: true })
  idSubasta: string;

  @Column("uuid", { name: "id_comprador", unique: true })
  idComprador: string;

  @Column("character varying", {
    name: "estado",
    length: 15,
    default: () => "'Pendiente'",
  })
  estado: string;

  @Column("timestamp with time zone", {
    name: "fecha_solicitud",
    default: () => "now()",
  })
  fechaSolicitud: Date;

  @Column("timestamp with time zone", {
    name: "fecha_respuesta",
    nullable: true,
  })
  fechaRespuesta: Date | null;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.reservasAccesos)
  @JoinColumn([{ name: "id_comprador", referencedColumnName: "idUsuario" }])
  idComprador2: Usuarios;

  @ManyToOne(() => Subastas, (subastas) => subastas.reservasAccesos, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "id_subasta", referencedColumnName: "idSubasta" }])
  idSubasta2: Subastas;
}
