import { Module } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service'; // Import ProjectsService
import { SupabaseService } from '../supabase/supabase.service'; // Import SupabaseService
import { WorkflowsService } from '../workflows/workflows.service'; // Import WorkflowsService
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, SupabaseService, ProjectsService, WorkflowsService], // Add SupabaseService, ProjectsService, and WorkflowsService to providers
  exports: [TasksService], // Export TasksService if needed by other modules
})
export class TasksModule {}
