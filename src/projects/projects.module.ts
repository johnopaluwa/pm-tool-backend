import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller'; // Corrected import path
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService], // Export the service to be used in other modules
})
export class ProjectsModule {}
