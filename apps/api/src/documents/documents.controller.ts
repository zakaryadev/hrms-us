import {
  BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Post, Res,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { memoryStorage } from 'multer';
import { join, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { DetectedType, MAX_DOC_BYTES, MAX_PHOTO_BYTES, detectType } from './file-type';

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'));
const SAFE_NAME = /^[A-Za-z0-9-]+\.(jpg|png|pdf)$/;

const docUpload = FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_DOC_BYTES, files: 1 } });
const photoUpload = FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } });

/** Buferni tekshirib (haqiqiy tur), noyob nom bilan diskka yozadi */
function store(file: Express.Multer.File | undefined, allowed: DetectedType[], message: string): string {
  if (!file) throw new BadRequestException('«file» майдонида файл юборинг');
  const type = detectType(file.buffer);
  if (!type || !allowed.includes(type)) throw new BadRequestException(message);
  mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${type}`;
  writeFileSync(join(UPLOAD_DIR, name), file.buffer);
  return name;
}
const removeFile = (name?: string | null) => { if (name && SAFE_NAME.test(name)) { try { unlinkSync(join(UPLOAD_DIR, name)); } catch { /* файл аллақачон йўқ */ } } };

@Controller()
export class DocumentsController {
  constructor(private prisma: PrismaService) {}

  private async employeeOr404(id: string) {
    const e = await this.prisma.employee.findUnique({ where: { id }, select: { id: true, photoUrl: true } });
    if (!e) throw new NotFoundException('Ходим топилмади');
    return e;
  }

  @Post('employees/:id/documents')
  @UseInterceptors(docUpload)
  async add(@Param('id', ParseUUIDPipe) id: string, @Body('documentType') documentType: string, @UploadedFile() file?: Express.Multer.File) {
    await this.employeeOr404(id);
    const name = store(file, ['pdf', 'jpg', 'png'], 'Фақат PDF, JPG ва PNG файллар рухсат этилади');
    return this.prisma.employeeDocument.create({ data: { employeeId: id, documentType: documentType || 'boshqa', filePath: name } });
  }

  @Post('employees/:id/photo')
  @UseInterceptors(photoUpload)
  async photo(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: Express.Multer.File) {
    const emp = await this.employeeOr404(id);
    const name = store(file, ['jpg', 'png'], 'Расм JPG ёки PNG бўлиши керак');
    const updated = await this.prisma.employee.update({ where: { id }, data: { photoUrl: name }, select: { id: true, photoUrl: true } });
    removeFile(emp.photoUrl); // эски расм диск тўлдирмаслиги учун
    return updated;
  }

  @Delete('employees/:id/photo')
  async removePhoto(@Param('id', ParseUUIDPipe) id: string) {
    const emp = await this.employeeOr404(id);
    await this.prisma.employee.update({ where: { id }, data: { photoUrl: null } });
    removeFile(emp.photoUrl);
    return { id, photoUrl: null };
  }

  @Get('files/:name')
  file(@Param('name') name: string, @Res() res: Response) {
    if (!SAFE_NAME.test(name)) throw new NotFoundException();
    const path = join(UPLOAD_DIR, name);
    if (!existsSync(path)) throw new NotFoundException();
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(path);
  }

  @Delete('documents/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const doc = await this.prisma.employeeDocument.delete({ where: { id } });
    removeFile(doc.filePath);
    return doc;
  }
}
