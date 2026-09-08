import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SubastasService } from './subastas.service';
import { ImagenesService } from './imagenes.service';
import { CreateSubastaDto } from './dto/create-subasta.dto';
import { UpdateSubastaDto } from './dto/update-subasta.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { FiltroSubastasDto } from './dto/filtro-subastas.dto';
import { apiError } from '../../common/utils/api-error';
import { ErrorCodes } from '../../common/constants/error-codes';
import { MAX_IMAGEN_BYTES } from './constants/imagenes.constants';

@Controller('subastas')
export class SubastasController {
  constructor(
    private readonly subastasService: SubastasService,
    private readonly imagenesService: ImagenesService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Subastador', 'Usuario', 'Admin')
  @Post()
  create(@Body() dto: CreateSubastaDto, @Req() req: AuthenticatedRequest) {
    return this.subastasService.create(dto, req.user.userId);
  }

  @Get()
  findAll(@Query() query: FiltroSubastasDto) {
    return this.subastasService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mias')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.subastasService.findAllBySubastador(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Subastador', 'Usuario', 'Admin')
  @Get('estadisticas')
  getEstadisticas(@Req() req: AuthenticatedRequest) {
    return this.subastasService.calcularEstadisticas(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Subastador', 'Usuario', 'Admin')
  @Post('imagenes/verificar')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGEN_BYTES },
    }),
  )
  verificarImagen(
    @UploadedFile() archivo?: Express.Multer.File,
    @Body('url') url?: string,
  ) {
    if (url) return this.imagenesService.verificarUrl(url);
    if (archivo) return this.imagenesService.subirArchivo(archivo);
    throw apiError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.IMAGEN_REQUERIDA,
      'Envía un enlace o selecciona un archivo de imagen.',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Get('pendientes')
  findPendientes() {
    return this.subastasService.findPendientes();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.subastasService.findDetalle(id, req.user?.userId ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/inscribirse')
  inscribirse(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.subastasService.inscribirse(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/inscribirse')
  cancelarInscripcion(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.subastasService.cancelarInscripcion(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Subastador', 'Usuario', 'Admin')
  @Patch(':id')
  update( @Param('id') id: string, @Body() dto: UpdateSubastaDto, @Req() req: AuthenticatedRequest,) {
    return this.subastasService.update(id, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Subastador', 'Usuario', 'Admin')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.subastasService.remove(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Patch(':id/aprobar')
  aprobarSubasta(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.subastasService.cambiarEstado(id, 'Aprobada', req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Patch(':id/rechazar')
  rechazarSubasta(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.subastasService.rechazarSubasta(id, motivo, req.user.userId);
  }
}
