import { Module } from '@nestjs/common';
import { PredictionReviewsModule } from '../prediction-reviews/prediction-reviews.module'; // Import PredictionReviewsModule
import { ProjectsModule } from '../projects/projects.module'; // Import ProjectsModule
import { SupabaseModule } from '../supabase/supabase.module';
import { PredictionsController } from './predictions.controller'; // Corrected import path
import { PredictionsService } from './predictions.service';

@Module({
  imports: [ProjectsModule, PredictionReviewsModule, SupabaseModule], // Import the necessary modules
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService], // Export PredictionsService
})
export class PredictionsModule {}
