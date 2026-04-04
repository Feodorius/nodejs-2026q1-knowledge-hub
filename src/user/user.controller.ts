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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get all users' })
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @ApiOperation({ summary: 'Get user by id' })
  @Get(':id')
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.userService.findOne(id);
  }

  @ApiOperation({ summary: 'Create user' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @ApiOperation({ summary: 'Update user password' })
  @Put(':id')
  updatePassword(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.userService.updatePassword(id, dto);
  }

  @ApiOperation({ summary: 'Delete user' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUuidPipe) id: string) {
    return this.userService.remove(id);
  }
}
