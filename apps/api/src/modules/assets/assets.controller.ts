import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/auth.decorators';
import { AssetsService } from './assets.service';
import { CreateAssetDto, ListAssetsQuery, UpdateAssetDto } from './dto/assets.dto';
import { Audit, fromParam, fromResult } from '../audit/audit.decorator';
import { pickFields } from '../audit/audit.rules';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @Get()
  list(@Query() query: ListAssetsQuery) {
    return this.assets.list({
      type: query.type,
      status: query.status,
      assignedToId: query.assignedToId,
      search: query.q,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Roles('MANAGER', 'ADMIN')
  @Audit({ action: 'ASSET_CREATED', entity: 'Asset', entityId: fromResult() })
  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assets.create(dto);
  }

  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.assets.get(id);
  }

  @Roles('MANAGER', 'ADMIN')
  @Audit({
    action: 'ASSET_UPDATED',
    entity: 'Asset',
    entityId: fromParam(),
    extra: (req) => pickFields(req.body, ['status', 'assignedToId']),
  })
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(id, dto);
  }
}
