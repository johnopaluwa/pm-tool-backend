import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { WorkflowsModule } from '../workflows/workflows.module'; // Import WorkflowsModule
import { ProjectsController } from './projects.controller'; // Corrected import path
import { ProjectsService } from './projects.service';

@Module({
  imports: [SupabaseModule, WorkflowsModule], // Add WorkflowsModule to imports
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService], // Export the service to be used in other modules
})
export class ProjectsModule {}
