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

@Index("pagos_pkey", ["idPago"], { unique: true })
@Index("pagos_id_subasta_key", ["idSubasta"], { unique: true })
@Entity("pagos", { schema: "public" })
export class Pagos {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id_pago" })
  idPago: string;

  @Column("bigint", { name: "id_subasta", unique: true })
  idSubasta: string;

  @Column("numeric", { name: "monto", precision: 12, scale: 2 })
  monto: string;

  @Column("character varying", {
    name: "estado",
    length: 15,
    default: () => "'Pendiente'",
  })
  estado: string;

  @Column("timestamp with time zone", { name: "fecha_limite" })
  fechaLimite: Date;

  @Column("timestamp with time zone", { name: "fecha_pago", nullable: true })
  fechaPago: Date | null;

  @Column("character varying", {
    name: "referencia_pasarela",
    nullable: true,
    length: 100,
  })
  referenciaPasarela: string | null;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.pagos)
  @JoinColumn([{ name: "id_comprador", referencedColumnName: "idUsuario" }])
  idComprador: Relation<Usuarios>;

  @OneToOne(() => Subastas, (subastas) => subastas.pagos)
  @JoinColumn([{ name: "id_subasta", referencedColumnName: "idSubasta" }])
  idSubasta2: Relation<Subastas>;
}
