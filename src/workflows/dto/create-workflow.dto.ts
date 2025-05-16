import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  organization_id?: string; // Assuming organization_id is optional for now or handled by context
}
