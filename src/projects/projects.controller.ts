import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common'; // Import Put
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { UpdateProjectDto } from './dto/update-project.dto'; // Import UpdateProjectDto
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

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }
}
