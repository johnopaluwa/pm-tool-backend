import { IsEnum } from 'class-validator';

export class UpdateProjectStatusDto {
  @IsEnum(['new', 'predicting', 'completed'])
  status: 'new' | 'predicting' | 'completed';
}
