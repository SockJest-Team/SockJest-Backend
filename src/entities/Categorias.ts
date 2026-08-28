import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";
import { Subastas } from "./Subastas";

@Index("categorias_pkey", ["idCategoria"], { unique: true })
@Index("idx_categorias_padre", ["idCategoriaPadre"], {})
@Index(
  "categorias_id_categoria_padre_nombre_key",
  ["idCategoriaPadre", "nombre"],
  { unique: true }
)
@Entity("categorias", { schema: "public" })
export class Categorias {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id_categoria" })
  idCategoria: string;

  @Column("bigint", {
    name: "id_categoria_padre",
    nullable: true,
    unique: true,
  })
  idCategoriaPadre: string | null;

  @Column("character varying", { name: "nombre", unique: true, length: 80 })
  nombre: string;

  @Column("text", { name: "descripcion", nullable: true })
  descripcion: string | null;

  @Column("boolean", { name: "activa", default: () => "true" })
  activa: boolean;

  @ManyToOne(() => Categorias, (categorias) => categorias.categorias, {
    onDelete: "CASCADE",
  })
  @JoinColumn([
    { name: "id_categoria_padre", referencedColumnName: "idCategoria" },
  ])
  idCategoriaPadre2: Relation<Categorias>;

  @OneToMany(() => Categorias, (categorias) => categorias.idCategoriaPadre2)
  categorias: Relation<Categorias>[];

  @OneToMany(() => Subastas, (subastas) => subastas.idCategoria2)
  subastas: Relation<Subastas>[];
}
