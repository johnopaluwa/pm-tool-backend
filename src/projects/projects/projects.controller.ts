import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectsService } from '../projects.service';

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
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.addProject(createProjectDto);
  }
}
