import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/auth.decorators';
import { AssetsService } from './assets.service';
import { CreateAssetDto, ListAssetsQuery, UpdateAssetDto } from './dto/assets.dto';

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
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(id, dto);
  }
}
