/* eslint-disable prettier/prettier */
import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(private readonly dbService: DbService) {}

  @Get('db')
  async checkDb() {
    try {
      const pool = this.dbService.getPool();
      await pool.query('SELECT 1');
      return { status: 'ok', message: 'Database connection is healthy' };
    } catch (error) {
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
      });
    }
  }
}
