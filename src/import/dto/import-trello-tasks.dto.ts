import { IsString } from 'class-validator';
import { ImportTasksDto } from './import-tasks.dto';

export class ImportTrelloTasksDto extends ImportTasksDto {
  @IsString()
  tokenId: string; // Use token ID instead of raw access token

  @IsString()
  boardId: string;
}
