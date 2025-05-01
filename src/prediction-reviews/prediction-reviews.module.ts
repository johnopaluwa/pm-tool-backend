import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PredictionReviewsController } from './prediction-reviews/prediction-reviews.controller';
import { PredictionReviewsService } from './prediction-reviews/prediction-reviews.service';

@Module({
  imports: [SupabaseModule],
  controllers: [PredictionReviewsController],
  providers: [PredictionReviewsService],
  exports: [PredictionReviewsService], // Export the service
})
export class PredictionReviewsModule {}
