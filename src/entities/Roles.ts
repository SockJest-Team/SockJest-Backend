import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { UsuarioRoles } from "./UsuarioRoles";

@Index("roles_pkey", ["idRol"], { unique: true })
@Index("roles_nombre_rol_key", ["nombreRol"], { unique: true })
@Entity("roles", { schema: "public" })
export class Roles {
  @PrimaryGeneratedColumn({ type: "smallint", name: "id_rol" })
  idRol: number;

  @Column("character varying", { name: "nombre_rol", unique: true, length: 20 })
  nombreRol: string;

  @OneToMany(() => UsuarioRoles, (usuarioRoles) => usuarioRoles.idRol2)
  usuarioRoles: UsuarioRoles[];
}
