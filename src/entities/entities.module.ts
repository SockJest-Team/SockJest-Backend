import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuarios } from './Usuarios';
import { Roles } from './Roles';
import { UsuarioRoles } from './UsuarioRoles';
import { Categorias } from './Categorias';
import { Subastas } from './Subastas';
import { Calificaciones } from './Calificaciones';
import { Notificaciones } from './Notificaciones';
import { SubastaHistorialEstados } from './SubastaHistorialEstados';
import { Pagos } from './Pagos';
import { Pujas } from './Pujas';
import { ReservasAcceso } from './ReservasAcceso';
import { Sesiones } from './Sesiones';
// agrega cualquier otra entidad que tengas en la carpeta

const ENTITIES = [
  Usuarios,
  Roles,
  Sesiones,
  UsuarioRoles,
  Categorias,
  Subastas,
  Calificaciones,
  Notificaciones,
  SubastaHistorialEstados,
  Pagos,
  Pujas,
  ReservasAcceso,
];

@Module({
  imports: [TypeOrmModule.forFeature(ENTITIES)],
  exports: [TypeOrmModule],
})
export class EntitiesModule {}