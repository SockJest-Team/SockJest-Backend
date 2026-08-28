import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";
import { Usuarios } from "./Usuarios";

@Index("sesiones_pkey", ["idSesion"], { unique: true })
@Index("idx_sesiones_usuario", ["idUsuario"], {})
@Entity("sesiones", { schema: "public" })
export class Sesiones {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id_sesion" })
  idSesion: string;

  @Column("uuid", { name: "id_usuario" })
  idUsuario: string;

  @Column("inet", { name: "ip_address" })
  ipAddress: string;

  @Column("character varying", { name: "dispositivo", length: 255 })
  dispositivo: string;

  @Column("timestamp with time zone", {
    name: "fecha_inicio",
    default: () => "now()",
  })
  fechaInicio: Date;

  @Column("boolean", { name: "activa", default: () => "true" })
  activa: boolean;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.sesiones, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "id_usuario", referencedColumnName: "idUsuario" }])
  idUsuario2: Relation<Usuarios>;
}
