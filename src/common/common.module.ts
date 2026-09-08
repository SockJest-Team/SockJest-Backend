import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRolesService } from './user-roles.service';
import { ImageModerationService } from './services/image-moderation.service';
import { SalaStateService } from './services/sala-state.service';
import { UsuarioRoles } from '../entities/UsuarioRoles';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioRoles])],
  providers: [UserRolesService, ImageModerationService, SalaStateService],
  exports: [UserRolesService, ImageModerationService, SalaStateService],
})
export class CommonModule {}
