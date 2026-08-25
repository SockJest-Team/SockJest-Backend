import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Roles } from "./Roles";
import { Usuarios } from "./Usuarios";

@Index("usuario_roles_pkey", ["idRol", "idUsuario"], { unique: true })
@Entity("usuario_roles", { schema: "public" })
export class UsuarioRoles {
  @Column("uuid", { primary: true, name: "id_usuario" })
  idUsuario: string;

  @Column("smallint", { primary: true, name: "id_rol" })
  idRol: number;

  @Column("timestamp with time zone", {
    name: "fecha_asignacion",
    default: () => "now()",
  })
  fechaAsignacion: Date;

  @ManyToOne(() => Roles, (roles) => roles.usuarioRoles)
  @JoinColumn([{ name: "id_rol", referencedColumnName: "idRol" }])
  idRol2: Roles;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.usuarioRoles, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "id_usuario", referencedColumnName: "idUsuario" }])
  idUsuario2: Usuarios;
}
