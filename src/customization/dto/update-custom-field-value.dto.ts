import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomFieldValueDto {
  @IsOptional()
  @IsString() // Storing value as string, will need parsing based on field type
  value?: string;

  // field_id and entity_id are not updated via this DTO
}
