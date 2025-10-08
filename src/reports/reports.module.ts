import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ReportsRepository } from "./reports.repository";
import { DbModule } from "src/db/db.module";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

@Module({
  imports: [DbModule, AuthModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository, JwtAuthGuard],
  exports: [ReportsService, ReportsRepository],
})
export class ReportsModule {}
