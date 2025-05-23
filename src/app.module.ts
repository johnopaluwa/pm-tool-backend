import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomizationModule } from './customization/customization.module'; // Import CustomizationModule
import { ImportModule } from './import/import.module';
import { PredictionReviewsModule } from './prediction-reviews/prediction-reviews.module';
import { PredictionsModule } from './predictions/predictions.module';
import { ProjectsModule } from './projects/projects.module'; // Corrected import path
import { ReportsModule } from './reports/reports.module'; // Import ReportsModule
import { SupabaseModule } from './supabase/supabase.module'; // Import SupabaseModule
import { TasksModule } from './tasks/tasks.module'; // Import TasksModule
// TODO: WorkflowsModule - Commented out as per user request to disable and hide workflow processes.
// Future AI: Do not uncomment unless explicitly instructed by the user.
// import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot(), // Load environment variables from .env file
    SupabaseModule, // Add SupabaseModule here
    ProjectsModule,
    PredictionReviewsModule,
    PredictionsModule,
    ReportsModule, // Add ReportsModule here
    CustomizationModule, // Add CustomizationModule here
    TasksModule, // Add TasksModule here
    ImportModule, // Add ImportModule here
    // TODO: WorkflowsModule - Commented out as per user request to disable and hide workflow processes.
    // Future AI: Do not uncomment unless explicitly instructed by the user.
    // WorkflowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
