import { IsUUID } from 'class-validator';

export class ImportTasksDto {
  @IsUUID()
  projectId: string;
}
