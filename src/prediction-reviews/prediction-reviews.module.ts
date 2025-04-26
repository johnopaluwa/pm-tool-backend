import { Module } from '@nestjs/common';
import { PredictionReviewsController } from './prediction-reviews/prediction-reviews.controller';
import { PredictionReviewsService } from './prediction-reviews/prediction-reviews.service';

@Module({
  controllers: [PredictionReviewsController],
  providers: [PredictionReviewsService],
  exports: [PredictionReviewsService], // Export the service
})
export class PredictionReviewsModule {}
