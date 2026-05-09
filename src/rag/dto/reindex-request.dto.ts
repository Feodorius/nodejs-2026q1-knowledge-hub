import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReindexRequestDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  onlyPublished?: boolean = true;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsString({ each: true })
  articleIds?: string[];
}
