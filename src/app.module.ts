import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PredictionReviewsModule } from './prediction-reviews/prediction-reviews.module';
import { PredictionsModule } from './predictions/predictions.module';
import { ProjectsModule } from './projects/projects.module'; // Corrected import path
import { ReportsModule } from './reports/reports.module'; // Import ReportsModule

@Module({
  imports: [
    ConfigModule.forRoot(), // Load environment variables from .env file
    ProjectsModule,
    PredictionReviewsModule,
    PredictionsModule,
    ReportsModule, // Add ReportsModule here
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
