/* eslint-disable prettier/prettier */

import { Body, Controller, Post, Get, Param, ParseIntPipe, Put, Headers, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { UserService } from "./users.service";
import { ApiOperation, ApiTags} from "@nestjs/swagger";
import { TokenService } from "src/auth/token.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@ApiTags('Modulo de Usuarios')
@Controller('users')
export class UsersController {
    constructor(
        private readonly userService: UserService,
        private readonly tokenService: TokenService,
    ) {}

    @ApiOperation({summary: "Endpoint de registro de usuarios"})
    @Post()
    async createUser(@Body() createUserDto: CreateUserDto) {
        return this.userService.createUser(
            createUserDto.email,
            createUserDto.name,
            createUserDto.password,
        );
    }

    @ApiOperation({ summary: "Endpoint para lista de usuarios" })
    @Get('list')
    getAll() {
        return this.userService.findAll();
    }
    
    @ApiOperation({ summary: "Endpoint para encontrar usuario" })
    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        return this.userService.findById(id);
    }

    @ApiOperation({ summary: "Modificar usuario usando Access Token" })
    @Put('modify')
    async updateMe(
        @Headers('authorization') authHeader: string,
        @Body() dto: UpdateUserDto) {
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Falta Bearer token en Authorization');
    }
    const token = authHeader.slice(7).trim();

    let payload: any;
    try {
        payload = await this.tokenService.verifyAccessToken(token);
    } catch (e: any) {
    
    if (e?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('TOKEN_EXPIRED'); 
    }
    throw new UnauthorizedException('INVALID_TOKEN');
    }

    if (!dto || (dto.email == null && dto.name == null)) {
      throw new BadRequestException("Nada que actualizar");
    }

    const userId = Number(payload.sub ?? payload.profile?.id);
    return this.userService.updateById(userId, { email: dto.email ?? undefined, name: dto.name ?? undefined });
  }

}

export { CreateUserDto };
