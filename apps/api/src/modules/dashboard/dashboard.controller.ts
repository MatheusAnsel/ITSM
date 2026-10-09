import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/auth.decorators';
import { DashboardService } from './dashboard.service';
import { DashboardRangeQuery } from './dto/dashboard.dto';

@Roles('MANAGER', 'ADMIN')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@Query() q: DashboardRangeQuery) {
    return this.dashboard.summary(q.from, q.to);
  }

  @Get('by-category')
  byCategory(@Query() q: DashboardRangeQuery) {
    return this.dashboard.byCategory(q.from, q.to);
  }

  @Get('by-agent')
  byAgent(@Query() q: DashboardRangeQuery) {
    return this.dashboard.byAgent(q.from, q.to);
  }

  @Get('volume')
  volume() {
    return this.dashboard.volume();
  }
}
