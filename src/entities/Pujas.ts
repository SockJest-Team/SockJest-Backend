import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Subastas } from "./Subastas";
import { Usuarios } from "./Usuarios";

@Index("pujas_pkey", ["idPuja"], { unique: true })
@Index("idx_pujas_subasta_monto", ["idSubasta", "monto"], {})
@Index("idx_pujas_usuario", ["idUsuario"], {})
@Entity("pujas", { schema: "public" })
export class Pujas {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id_puja" })
  idPuja: string;

  @Column("bigint", { name: "id_subasta" })
  idSubasta: string;

  @Column("uuid", { name: "id_usuario" })
  idUsuario: string;

  @Column("numeric", { name: "monto", precision: 12, scale: 2 })
  monto: string;

  @Column("bigint", { name: "timestamp_ms" })
  timestampMs: string;

  @Column("inet", { name: "ip_address" })
  ipAddress: string;

  @Column("character varying", { name: "dispositivo", length: 255 })
  dispositivo: string;

  @Column("character varying", {
    name: "estado",
    length: 15,
    default: () => "'Perdedora'",
  })
  estado: string;

  @Column("timestamp with time zone", {
    name: "fecha_registro",
    default: () => "now()",
  })
  fechaRegistro: Date;

  @ManyToOne(() => Subastas, (subastas) => subastas.pujas)
  @JoinColumn([{ name: "id_subasta", referencedColumnName: "idSubasta" }])
  idSubasta2: Subastas;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.pujas)
  @JoinColumn([{ name: "id_usuario", referencedColumnName: "idUsuario" }])
  idUsuario2: Usuarios;
}
