import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module'; // Import SupabaseModule
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [SupabaseModule], // Import SupabaseModule
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService], // Export WorkflowsService
})
export class WorkflowsModule {}
