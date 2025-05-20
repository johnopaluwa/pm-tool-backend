import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  // Add any specific validation rules or types for updating if needed,
  // but PartialType makes all fields of CreateProjectDto optional.
}
