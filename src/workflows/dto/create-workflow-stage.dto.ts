import { IsInt, IsString, IsUUID } from 'class-validator';

export class CreateWorkflowStageDto {
  @IsString()
  name: string;

  @IsInt()
  order: number;

  @IsUUID()
  workflow_id: string;
}
