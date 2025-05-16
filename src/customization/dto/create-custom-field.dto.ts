import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCustomFieldDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['text', 'number', 'date', 'dropdown']) // Define allowed types
  type: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['project', 'task', 'user']) // Define allowed entity types
  entity_type: string;

  @IsOptional()
  @IsObject()
  options?: any; // Define a more specific type if needed, e.g., { values: string[] }

  // organization_id will be extracted from the user context, not provided in the body
}
