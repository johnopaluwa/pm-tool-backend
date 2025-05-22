import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { ProjectsModule } from '../projects/projects.module'; // Import ProjectsModule
import { TasksModule } from '../tasks/tasks.module'; // Import TasksModule
import { WorkflowsModule } from '../workflows/workflows.module'; // Import WorkflowsModule
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TasksModule,
    WorkflowsModule,
    ProjectsModule,
  ], // Add ConfigModule, TasksModule, WorkflowsModule, and ProjectsModule here
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
