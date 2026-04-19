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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get all users' })
  @Get()
  async findAll(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  @ApiOperation({ summary: 'Get user by id' })
  @Get(':id')
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.userService.findOne(id);
  }

  @ApiOperation({ summary: 'Create user' })
  @Roles(UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @ApiOperation({ summary: 'Update user password' })
  @Put(':id')
  async updatePassword(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdatePasswordDto,
    @Request() req: any,
  ) {
    return this.userService.updatePassword(id, dto, req.user);
  }

  @ApiOperation({ summary: 'Delete user' })
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUuidPipe) id: string) {
    return this.userService.remove(id);
  }
}
