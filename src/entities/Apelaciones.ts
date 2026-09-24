import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Relation,
  CreateDateColumn,
} from 'typeorm';
import { Usuarios } from './Usuarios';

@Entity('apelaciones', { schema: 'public' })
export class Apelaciones {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_apelacion' })
  idApelacion: string;

  @Column('uuid', { name: 'id_usuario' })
  idUsuario: string;

  @Column('text', { name: 'motivo' })
  motivo: string;

  @Column('character varying', {
    name: 'estado',
    length: 15,
    default: () => "'Pendiente'",
  })
  estado: string;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @ManyToOne(() => Usuarios, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'id_usuario', referencedColumnName: 'idUsuario' }])
  idUsuario2: Relation<Usuarios>;
}
