/* eslint-disable prettier/prettier */

import { Controller, Post, UploadedFile, UseInterceptors, Delete, Param, BadRequestException, NotFoundException, HttpCode } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from "multer";
import { join, normalize, sep } from "path";
import * as fs from 'fs';
import * as fsp from 'fs/promises';

function uploadDir(): string {
  const dir = join(process.cwd(), 'public', 'uploads'); // <root>/public/uploads
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeJoinUploads(filename: string): string {
  const base = uploadDir();
  const candidate = join(base, filename);
  const normalized = normalize(candidate);
  // evita ../../ ataques: la ruta final debe empezar con el directorio base
  if (!normalized.startsWith(base + sep) && normalized !== base) {
    throw new BadRequestException('Invalid file path');
  }
  return normalized;
}

@ApiTags("Files")
@Controller("files")
export class FileController {

@ApiOperation({ summary: 'Subir archivo y guardar en public/uploads' })
@Post("upload")
@UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
        destination: join(__dirname, "../../public/uploads"),
        filename: (req, file, cb) => {
            const name= file.originalname.replace(" ","");
            cb(null,name)
        }
    })
}))
uploadFile(@UploadedFile() file: Express.Multer.File) {
    return { fileKey: ` ${file.filename}`,
        url: `http://localhost:3000/public/uploads/${file.filename}` };
}

@ApiOperation({ summary: 'Eliminar archivos de public/uploads' })
@Delete(':filename')
@HttpCode(204)
async remove(@Param('filename') filename: string): Promise<void> {
    if (!filename) {
        throw new BadRequestException('Filename is required');
    }

    const decoded = decodeURIComponent(filename);
    const target = safeJoinUploads(decoded);

    try {
        await fsp.access(target); // verificar que existe
    }   catch {
        throw new NotFoundException('File not found');
}

    await fsp.unlink(target);
}
}
