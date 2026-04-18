import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Categories')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Get all categories' })
  @Get()
  async findAll(@Query() query: QueryCategoryDto) {
    return this.categoryService.findAll(query);
  }

  @ApiOperation({ summary: 'Get category by id' })
  @Get(':id')
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.categoryService.findOne(id);
  }

  @ApiOperation({ summary: 'Create category' })
  @Roles(UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @ApiOperation({ summary: 'Update category' })
  @Roles(UserRole.ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete category' })
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUuidPipe) id: string) {
    return this.categoryService.remove(id);
  }
}
