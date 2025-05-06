import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.getProjectById(id);
  }

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto) {
    const projectId = await this.projectsService.addProject(createProjectDto);
    return { id: projectId }; // Return the ID within a JSON object
  }
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateProjectStatusDto: UpdateProjectStatusDto,
  ) {
    return this.projectsService.updateProjectStatus(
      id,
      updateProjectStatusDto.status,
    );
  }

  @Patch(':id/mark-report-generated')
  markReportGenerated(@Param('id') id: string) {
    return this.projectsService.markReportGenerated(id);
  }
}
