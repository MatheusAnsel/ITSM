import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser } from '../../common/decorators/auth.decorators';
import { Audit, fromResult } from '../audit/audit.decorator';
import { AttachmentsService } from './attachments.service';
import { DEFAULT_MAX_UPLOAD_MB, uploadLimitBytes } from './attachments.rules';

// Limite do multer lido na carga do módulo; o service confere de novo com o valor validado do env.
const configured = Number(process.env.MAX_UPLOAD_MB);
const LIMIT = uploadLimitBytes(configured > 0 ? configured : DEFAULT_MAX_UPLOAD_MB);

// RFC 5987: nomes com acento/espaço seguem em filename*.
const contentDisposition = (name: string): string =>
  `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(name)}`;

@Controller('tickets/:ticketId/attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Audit({ action: 'ATTACHMENT_UPLOADED', entity: 'Attachment', entityId: fromResult() })
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: LIMIT, files: 1 } }))
  upload(
    @CurrentUser() user: AuthUser,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.attachments.upload(
      user,
      ticketId,
      file ? { originalName: file.originalname, buffer: file.buffer } : undefined,
    );
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string) {
    return this.attachments.list(user, ticketId);
  }

  @Get(':attachmentId')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { meta, stream } = await this.attachments.download(user, ticketId, attachmentId);
    // Sempre como download: o navegador nunca renderiza o conteúdo enviado dentro da origem da API.
    res.setHeader('Content-Disposition', contentDisposition(meta.filename));
    res.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(stream, { type: meta.mimeType, length: meta.size });
  }
}
