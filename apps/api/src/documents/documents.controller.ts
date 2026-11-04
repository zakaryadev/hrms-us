import {
  BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Res,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { existsSync, mkdirSync, unlink } from 'fs';
import { diskStorage } from 'multer';
import { extname, join, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'));
const ALLOWED = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => cb(null, randomUUID() + extname(file.originalname).toLowerCase()),
});
const fileFilter = (_req: unknown, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) =>
  ALLOWED.has(extname(file.originalname).toLowerCase())
    ? cb(null, true)
    : cb(new BadRequestException('Фақат PDF, JPG ва PNG файллар рухсат этилади'), false);
const upload = FileInterceptor('file', { storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

@Controller()
export class DocumentsController {
  constructor(private prisma: PrismaService) {}

  @Post('employees/:id/documents')
  @UseInterceptors(upload)
  async add(@Param('id') id: string, @Body('documentType') documentType: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('«file» майдонида файл юборинг');
    return this.prisma.employeeDocument.create({
      data: { employeeId: id, documentType: documentType || 'boshqa', filePath: file.filename },
    });
  }

  @Post('employees/:id/photo')
  @UseInterceptors(upload)
  async photo(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file || !/\.(jpe?g|png)$/i.test(file.filename)) throw new BadRequestException('Расм JPG ёки PNG бўлиши керак');
    return this.prisma.employee.update({ where: { id }, data: { photoUrl: file.filename } });
  }

  @Get('files/:name')
  file(@Param('name') name: string, @Res() res: Response) {
    const path = join(UPLOAD_DIR, name.replace(/[^\w.-]/g, ''));
    if (!existsSync(path)) throw new NotFoundException();
    return res.sendFile(path);
  }

  @Delete('documents/:id')
  async remove(@Param('id') id: string) {
    const doc = await this.prisma.employeeDocument.delete({ where: { id } });
    unlink(join(UPLOAD_DIR, doc.filePath), () => undefined);
    return doc;
  }
}
