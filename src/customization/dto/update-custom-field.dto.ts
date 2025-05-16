import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateCustomFieldDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['text', 'number', 'date', 'dropdown']) // Define allowed types
  type?: string;

  @IsOptional()
  @IsObject()
  options?: any; // Define a more specific type if needed, e.g., { values: string[] }

  // organization_id is not updated via this DTO
}
