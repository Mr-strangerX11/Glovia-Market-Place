import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private blogsService: BlogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all blogs' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.blogsService.findAll(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get blog by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.blogsService.findBySlug(slug);
  }
}
