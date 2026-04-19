import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Comments')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @ApiOperation({ summary: 'Get comments by articleId' })
  @Get()
  async findByArticle(@Query() query: QueryCommentDto) {
    return this.commentService.findByArticle(query);
  }

  @ApiOperation({ summary: 'Get comment by id' })
  @Get(':id')
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.commentService.findOne(id);
  }

  @ApiOperation({ summary: 'Create comment' })
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCommentDto, @Request() req: any) {
    return this.commentService.create(dto, req.user);
  }

  @ApiOperation({ summary: 'Delete comment' })
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUuidPipe) id: string, @Request() req: any) {
    return this.commentService.remove(id, req.user);
  }
}
