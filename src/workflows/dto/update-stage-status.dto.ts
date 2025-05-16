import { PartialType } from '@nestjs/mapped-types';
import { CreateStageStatusDto } from './create-stage-status.dto';

export class UpdateStageStatusDto extends PartialType(CreateStageStatusDto) {}
