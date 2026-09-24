import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Relation,
  CreateDateColumn,
} from 'typeorm';
import { Subastas } from './Subastas';
import { Usuarios } from './Usuarios';

@Entity('reportes_subasta', { schema: 'public' })
export class ReportesSubasta {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_reporte' })
  idReporte: string;

  @Column('bigint', { name: 'id_subasta' })
  idSubasta: string;

  @Column('uuid', { name: 'id_reportador' })
  idReportador: string;

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

  @ManyToOne(() => Subastas, (subasta) => subasta.idSubasta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'id_subasta', referencedColumnName: 'idSubasta' }])
  idSubasta2: Relation<Subastas>;

  @ManyToOne(() => Usuarios, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'id_reportador', referencedColumnName: 'idUsuario' }])
  idReportador2: Relation<Usuarios>;
}
