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
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Articles')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @ApiOperation({ summary: 'Get all articles' })
  @Get()
  findAll(@Query() query: QueryArticleDto) {
    return this.articleService.findAll(query);
  }

  @ApiOperation({ summary: 'Get article by id' })
  @Get(':id')
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.articleService.findOne(id);
  }

  @ApiOperation({ summary: 'Create article' })
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateArticleDto, @Request() req: any) {
    return this.articleService.create(dto, req.user);
  }

  @ApiOperation({ summary: 'Update article' })
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateArticleDto,
    @Request() req: any,
  ) {
    return this.articleService.update(id, dto, req.user);
  }

  @ApiOperation({ summary: 'Delete article' })
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.articleService.remove(id);
  }
}
