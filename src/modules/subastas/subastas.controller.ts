import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SubastasService } from './subastas.service';
import { CreateSubastaDto } from './dto/create-subasta.dto';
import { UpdateSubastaDto } from './dto/update-subasta.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('subastas')
export class SubastasController {
  constructor(private readonly subastasService: SubastasService) {}

  @Post()
  create(@Body() createSubastaDto: CreateSubastaDto) {
    return this.subastasService.create(createSubastaDto);
  }

  @Get()
  findAll() {
    return this.subastasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subastasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSubastaDto: UpdateSubastaDto) {
    return this.subastasService.update(+id, updateSubastaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subastasService.remove(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Subastador', 'Usuario')
  @Post()
  create(@Body() dto: CreateSubastaDto, @Req() req) {
    return this.subastasService.create(dto, req.user.userId);
}
