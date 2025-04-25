import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions/predictions.controller';
import { PredictionsService } from './predictions/predictions.service';

@Module({
  controllers: [PredictionsController],
  providers: [PredictionsService],
})
export class PredictionsModule {}
