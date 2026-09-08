import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Subastas } from './Subastas';

@Index('subasta_imagenes_pkey', ['idImagen'], { unique: true })
@Index('idx_subasta_imagenes_subasta', ['idSubasta'], {})
@Entity('subasta_imagenes', { schema: 'public' })
export class SubastaImagenes {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_imagen' })
  idImagen: string;

  @Column('bigint', { name: 'id_subasta' })
  idSubasta: string;

  @Column('text', { name: 'url' })
  url: string;

  @Column('boolean', { name: 'es_principal', default: false })
  esPrincipal: boolean;

  @Column('integer', { name: 'orden', default: 0 })
  orden: number;

  @ManyToOne(() => Subastas, (subasta) => subasta.imagenes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'id_subasta', referencedColumnName: 'idSubasta' }])
  idSubasta2: Relation<Subastas>;
}
