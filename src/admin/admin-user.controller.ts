/* eslint-disable prettier/prettier */
import { Controller, Get, Put, Post, Param, ParseIntPipe, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiPropertyOptional } from '@nestjs/swagger';
import { UserService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';


class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 'nuevo@mail.com' })
  email?: string | null;

  @ApiPropertyOptional({ example: 'Nuevo Nombre' })
  name?: string | null;
}

@ApiTags('Admin/users')
@UseGuards(JwtAuthGuard, AdminGuard) 
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Create an admin user' })
  @Post()
  async createAdmin(@Body() dto: CreateUserDto) {
    return this.userService.createAdmin(dto.email, dto.name, dto.password);
  }


  @ApiOperation({ summary: 'Ver lista de usuarios (admin)' })
  @Get('list')
  getAll() {
    return this.userService.findAll();
  }

  @ApiOperation({ summary: 'Ver usuario por id (admin)' })
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
      return this.userService.findById(id);
  }

  @ApiOperation({ summary: 'Modificar usuario por id (admin): name/email' })
  @Put(':id')
  async updateUserById(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: AdminUpdateUserDto
  ) {
  if (!dto || (dto.email == null && dto.name == null)) {
    throw new BadRequestException('Nada que actualizar');
  }
  
  return this.userService.updateById(id, {
    ...(dto.email != null ? { email: dto.email } : {}),
    ...(dto.name  != null ? { name:  dto.name  } : {}),
  });
  }
}
