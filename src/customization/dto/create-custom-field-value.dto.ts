import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomFieldValueDto {
  @IsString()
  @IsNotEmpty()
  field_id: string; // The ID of the custom field definition

  @IsString()
  @IsNotEmpty()
  entity_id: string; // The ID of the entity (project, task, user)

  @IsOptional() // Value can be optional depending on field type (e.g., checkbox)
  @IsString() // Storing value as string, will need parsing based on field type
  value?: string;

  // organization_id will be handled by the service based on the field_id's organization
}
