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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';

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
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCommentDto) {
    return this.commentService.create(dto);
  }

  @ApiOperation({ summary: 'Delete comment' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUuidPipe) id: string) {
    return this.commentService.remove(id);
  }
}
