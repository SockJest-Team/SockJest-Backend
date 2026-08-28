import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";
import { Usuarios } from "./Usuarios";
import { Subastas } from "./Subastas";

@Index("calificaciones_pkey", ["idCalificacion"], { unique: true })
@Index("calificaciones_id_subasta_key", ["idSubasta"], { unique: true })
@Index("idx_calificaciones_subastador", ["idSubastador"], {})
@Entity("calificaciones", { schema: "public" })
export class Calificaciones {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id_calificacion" })
  idCalificacion: string;

  @Column("bigint", { name: "id_subasta", unique: true })
  idSubasta: string;

  @Column("uuid", { name: "id_subastador" })
  idSubastador: string;

  @Column("smallint", { name: "puntuacion" })
  puntuacion: number;

  @Column("text", { name: "comentario", nullable: true })
  comentario: string | null;

  @Column("timestamp with time zone", { name: "fecha", default: () => "now()" })
  fecha: Date;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.calificaciones)
  @JoinColumn([{ name: "id_comprador", referencedColumnName: "idUsuario" }])
  idComprador: Relation<Usuarios>;

  @OneToOne(() => Subastas, (subastas) => subastas.calificaciones)
  @JoinColumn([{ name: "id_subasta", referencedColumnName: "idSubasta" }])
  idSubasta2: Relation<Subastas>;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.calificaciones2)
  @JoinColumn([{ name: "id_subastador", referencedColumnName: "idUsuario" }])
  idSubastador2: Relation<Usuarios>;
}
