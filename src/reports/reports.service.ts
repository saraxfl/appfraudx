// src/reports/reports.service.ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ReportsRepository } from "./reports.repository";
import * as fs from "fs/promises";

interface CreateReportInput {
  requesterUserId: number;
  page_url?: string;
  description?: string;
  anonymous: boolean;
  categoryId?: number;
  files: { path: string; mimetype?: string; size?: number }[];
}

type UpdateMyReportInput = {
  page_url?: string;
  description?: string;
  categoryId?: number;
  addFile: { path: string; mimetype?: string; size?: number }[];
  deletePhoto: boolean;
};

@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  async createReport(input: CreateReportInput) {
    const {
      requesterUserId,
      anonymous,
      page_url,
      description,
      categoryId,
      files,
    } = input;

    if (!requesterUserId) {
      throw new ForbiddenException(
        "Debes iniciar sesión para crear un reporte",
      );
    }

    const cats: number[] = typeof categoryId === "number" ? [categoryId] : [];

    const incidentId = await this.repo.withTransaction(async (cx) => {
      const id = await this.repo.insertIncident(cx, {
        ownerUserId: requesterUserId,
        userId: anonymous ? null : requesterUserId,
        page_url,
        description,
        anonymous,
        status_id: 1,
        assigned_admin_id: null,
        is_published: 0,
      });

      if (cats.length) {
        await this.repo.insertIncidentCategories(cx, id, cats);
      }

      if (files?.length) {
        await this.repo.insertAttachmentRows(cx, id, files);
      }

      const adminId = await this.repo.findLeastLoadedAdmin(cx);
      if (adminId) {
        await this.repo.assignAdminIfEmpty(cx, id, adminId);
      }
      return id;
    });

    const incident = await this.repo.findIncidentById(incidentId);
    if (!incident)
      throw new NotFoundException("Incidente no encontrado después de crear");

    const attachments = await this.repo.listAttachments(incidentId);
    return {
      ...this.serializeIncident(incident),
      attachments: attachments.map(this.serializeAttachment),
    };
  }

  async updateMyReport(
    userId: number,
    incidentId: number,
    input: UpdateMyReportInput,
  ) {
    const toUnlink: string[] = await this.repo.withTransaction(async (cx) => {
      const ok = await this.repo.updateOwnedIncident(cx, userId, incidentId, {
        page_url: input.page_url,
        description: input.description,
      });
      if (!ok) throw new ConflictException("El reporte ya no es editable");

      if (typeof input.categoryId === "number") {
        await this.repo.setSingleCategory(cx, incidentId, input.categoryId);
      }

      const unlinkPaths: string[] = [];
      const current = await this.repo.getOwnedSingleAttachment(
        cx,
        userId,
        incidentId,
      );
      const newFile = input.addFile?.[0];

      if (newFile) {
        if (current) {
          await this.repo.deleteOwnedAttachmentById(
            cx,
            userId,
            incidentId,
            current.id,
          );
          unlinkPaths.push(current.path);
        }
        await this.repo.insertAttachmentRows(cx, incidentId, [newFile]);
      } else if (input.deletePhoto && current) {
        await this.repo.deleteOwnedAttachmentById(
          cx,
          userId,
          incidentId,
          current.id,
        );
        unlinkPaths.push(current.path);
      }
      return unlinkPaths;
    });

    for (const p of toUnlink) {
      try {
        await fs.unlink(p);
      } catch {}
    }
    const r = await this.repo.getOwnedDetail(userId, incidentId);
    if (!r) throw new NotFoundException("Reporte no existe o no te pertenece");
    return this.projectReportDetail(r);
  }

  async listMine(userId: number) {
    const rows = await this.repo.listByOwner(userId);
    return rows.map((r) => this.projectCompact(r));
  }

  async getMyReportDetail(userId: number, incidentId: number) {
    const r = await this.repo.getOwnedDetail(userId, incidentId);
    if (!r) throw new NotFoundException("Reporte no existe o no te pertenece");
    return this.projectReportDetail(r);
  }

  async deleteMyReport(userId: number, incidentId: number) {
    await this.repo.withTransaction(async (cx) => {
      const row = await this.repo.getOwnedIncidentForUpdate(
        cx,
        userId,
        incidentId,
      );
      if (!row)
        throw new NotFoundException("Reporte no existe o no te pertenece");

      const ok = await this.repo.softDeleteIncident(cx, userId, incidentId);
      if (!ok) throw new ConflictException("No se pudo eliminar el reporte");
    });

    return;
  }

  private projectCompact(r: any) {
    return {
      id: r.id,
      status: r.status,
      description: r.description,
      created_at: r.created_at,
      category: r.category ?? null,
    };
  }

  private projectReportDetail(r: any) {
    const canEdit = r.status_id === 1 && !r.is_published;
    return {
      page_url: r.page_url,
      description: r.description,
      anonymous: !!r.anonymous,
      status: r.status_name,
      is_published: !!r.is_published,
      created_at: r.created_at,
      category_name: r.category_name ?? null,
      attachments_count: Number(r.attachments_count) || 0,
      canEdit,
      canAttach: canEdit,
    };
  }

  private serializeIncident(row: any) {
    return {
      id: row.id,
      owner_user_id: row.owner_user_id,
      user_id: row.user_id,
      page_url: row.page_url,
      domain: row.domain,
      description: row.description,
      anonymous: !!row.anonymous,
      status_id: row.status_id,
      status: row.status_name,
      assigned_admin_id: row.assigned_admin_id,
      is_published: !!row.is_published,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private serializeAttachment = (a: any) => ({
    id: a.id,
    incident_id: a.incident_id,
    path: a.path,
    url: `/${a.path.replace(/^public\//, "public/")}`,
    mime_type: a.mime_type,
    size_bytes: a.size_bytes,
    created_at: a.created_at,
  });
}
