import { ApiProperty } from '@nestjs/swagger';

class SearchResultItem {
  @ApiProperty()
  articleId: string;

  @ApiProperty()
  articleTitle: string;

  @ApiProperty()
  chunk: string;

  @ApiProperty()
  similarity: number;
}

export class RagSearchResponseDto {
  @ApiProperty({ type: [SearchResultItem] })
  results: SearchResultItem[];
}
