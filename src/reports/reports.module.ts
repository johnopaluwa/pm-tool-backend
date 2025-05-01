import { Module } from '@nestjs/common';
import { PredictionReviewsModule } from '../prediction-reviews/prediction-reviews.module';
import { PredictionsModule } from '../predictions/predictions.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ProjectsModule, PredictionsModule, PredictionReviewsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
