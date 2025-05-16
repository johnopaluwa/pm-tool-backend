import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateStageStatusDto {
  @IsString()
  name: string;

  @IsInt()
  order: number;

  @IsUUID()
  stage_id: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsBoolean()
  is_completion_status?: boolean;
}
