// src/seed.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Usuarios } from './entities/Usuarios';
import { Roles } from './entities/Roles';
import { UsuarioRoles } from './entities/UsuarioRoles';
import { Categorias } from './entities/Categorias';
import { Subastas } from './entities/Subastas';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Usuarios, Roles, UsuarioRoles, Categorias, Subastas],
  synchronize: true,
});

async function runSeed() {
  await AppDataSource.initialize();
  console.log('Conectado a la BD para seed...');

  const userRepo = AppDataSource.getRepository(Usuarios);
  const roleRepo = AppDataSource.getRepository(Roles);
  const userRoleRepo = AppDataSource.getRepository(UsuarioRoles);
  const catRepo = AppDataSource.getRepository(Categorias);
  const subRepo = AppDataSource.getRepository(Subastas);

  // 1. Roles
  const adminRole = roleRepo.create({ nombreRol: 'Admin' });
  const subRole = roleRepo.create({ nombreRol: 'Subastador' });
  const compRole = roleRepo.create({ nombreRol: 'Comprador' });
  await roleRepo.save([adminRole, subRole, compRole]);

  // 2. Usuarios
  const admin = userRepo.create({
    idUsuario: '11111111-1111-1111-1111-111111111111',
    nombreCompleto: 'Admin Master',
    correo: 'admin@livebid.com',
    estado: 'Activo',
  });
  const subastador = userRepo.create({
    idUsuario: '22222222-2222-2222-2222-222222222222',
    nombreCompleto: 'Jeycom Caballero',
    correo: 'jeycom@livebid.com',
    estado: 'Activo',
  });
  const comprador = userRepo.create({
    idUsuario: '33333333-3333-3333-3333-333333333333',
    nombreCompleto: 'Valerie Gonzalez',
    correo: 'valerie@livebid.com',
    estado: 'Activo',
  });
  await userRepo.save([admin, subastador, comprador]);

  // 3. Asignar Roles
  await userRoleRepo.save([
    userRoleRepo.create({ idUsuario: admin.idUsuario, idRol: adminRole.idRol }),
    userRoleRepo.create({
      idUsuario: subastador.idUsuario,
      idRol: subRole.idRol,
    }),
    userRoleRepo.create({
      idUsuario: comprador.idUsuario,
      idRol: compRole.idRol,
    }),
  ]);

  // 4. Categorías
  const arte = catRepo.create({
    nombre: 'Arte',
    descripcion: 'Pinturas y esculturas',
  });
  const tech = catRepo.create({
    nombre: 'Tecnología',
    descripcion: 'Gadgets y dispositivos',
  });
  await catRepo.save([arte, tech]);

  // 5. Subastas
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await subRepo.save([
    subRepo.create({
      idSubastador: { idUsuario: subastador.idUsuario } as any,
      idCategoria2: { idCategoria: arte.idCategoria } as any,
      titulo: 'Pintura Moderna Abstracta',
      descripcion: 'Óleo sobre lienzo, firma visible.',
      politicaEnvio: 'Envío seguro con seguro incluido',
      precioBase: '500.00',
      incrementoMinimoPct: '5.00',
      requiereReserva: false,
      limiteUsuariosConcurrentes: 50,
      estado: 'Aprobada',
      fechaAprobacion: now,
      fechaInicio: now,
      fechaFin: tomorrow,
    }),
    subRepo.create({
      idSubastador: { idUsuario: subastador.idUsuario } as any,
      idCategoria2: { idCategoria: tech.idCategoria } as any,
      titulo: 'iPhone 15 Pro Max 1TB',
      descripcion: 'Nuevo en caja sellada.',
      politicaEnvio: 'Envío nacional gratis',
      precioBase: '1200.00',
      incrementoMinimoPct: '10.00',
      requiereReserva: true,
      limiteUsuariosConcurrentes: 100,
      estado: 'Pendiente',
      fechaInicio: tomorrow,
      fechaFin: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
    }),
  ]);

  console.log('¡Seed completado!');
  await AppDataSource.destroy();
}

runSeed().catch(console.error);
