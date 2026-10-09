import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/categories.dto';
import { Audit, fromParam, fromResult } from '../audit/audit.decorator';
import { pickFields } from '../audit/audit.rules';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.categories.list(user.role === 'ADMIN');
  }

  @Roles('ADMIN')
  @Audit({ action: 'CATEGORY_CREATED', entity: 'Category', entityId: fromResult() })
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Roles('ADMIN')
  @Audit({
    action: 'CATEGORY_UPDATED',
    entity: 'Category',
    entityId: fromParam(),
    extra: (req) => pickFields(req.body, ['active']),
  })
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }
}
