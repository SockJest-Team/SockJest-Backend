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
import { Relation } from "typeorm";

@Index("notificaciones_pkey", ["idNotificacion"], { unique: true })
@Index("idx_notificaciones_usuario", ["idUsuario", "leido"], {})
@Entity("notificaciones", { schema: "public" })
export class Notificaciones {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id_notificacion" })
  idNotificacion: string;

  @Column("uuid", { name: "id_usuario" })
  idUsuario: string;

  @Column("character varying", { name: "tipo", length: 30 })
  tipo: string;

  @Column("text", { name: "mensaje" })
  mensaje: string;

  @Column("character varying", {
    name: "canal",
    length: 10,
    default: () => "'WebSocket'",
  })
  canal: string;

  @Column("boolean", { name: "leido", default: () => "false" })
  leido: boolean;

  @Column("timestamp with time zone", {
    name: "fecha_envio",
    default: () => "now()",
  })
  fechaEnvio: Date;

  @ManyToOne(() => Subastas, (subastas) => subastas.notificaciones)
  @JoinColumn([{ name: "id_subasta", referencedColumnName: "idSubasta" }])
  idSubasta: Relation<Subastas>;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.notificaciones, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "id_usuario", referencedColumnName: "idUsuario" }])
  idUsuario2: Relation<Usuarios>;
}
