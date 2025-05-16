import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() createTaskDto: CreateTaskDto) {
    try {
      return await this.tasksService.create(createTaskDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException
      }
      throw new InternalServerErrorException(error.message); // Handle other errors
    }
  }

  @Get('project/:projectId')
  async findByProjectId(@Param('projectId') projectId: string) {
    try {
      return await this.tasksService.findByProjectId(projectId);
    } catch (error) {
      throw new InternalServerErrorException(error.message); // Handle errors
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const task = await this.tasksService.findOne(id);
      if (!task) {
        throw new NotFoundException(`Task with ID "${id}" not found`);
      }
      return task;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException
      }
      throw new InternalServerErrorException(error.message); // Handle other errors
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    try {
      return await this.tasksService.update(id, updateTaskDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException
      }
      throw new InternalServerErrorException(error.message); // Handle other errors
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.tasksService.remove(id);
    } catch (error) {
      throw new InternalServerErrorException(error.message); // Handle errors
    }
  }
}
