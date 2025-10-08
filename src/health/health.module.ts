/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [DbModule],
  controllers: [HealthController],
})
export class HealthModule {}
