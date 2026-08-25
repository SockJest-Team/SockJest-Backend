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

@Index("subasta_historial_estados_pkey", ["idHistorial"], { unique: true })
@Entity("subasta_historial_estados", { schema: "public" })
export class SubastaHistorialEstados {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id_historial" })
  idHistorial: string;

  @Column("character varying", {
    name: "estado_anterior",
    nullable: true,
    length: 15,
  })
  estadoAnterior: string | null;

  @Column("character varying", { name: "estado_nuevo", length: 15 })
  estadoNuevo: string;

  @Column("timestamp with time zone", { name: "fecha", default: () => "now()" })
  fecha: Date;

  @ManyToOne(() => Subastas, (subastas) => subastas.subastaHistorialEstados, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "id_subasta", referencedColumnName: "idSubasta" }])
  idSubasta: Subastas;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.subastaHistorialEstados)
  @JoinColumn([
    { name: "id_usuario_responsable", referencedColumnName: "idUsuario" },
  ])
  idUsuarioResponsable: Usuarios;
}
