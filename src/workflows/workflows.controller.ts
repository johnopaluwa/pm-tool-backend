import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateStageStatusDto } from './dto/create-stage-status.dto'; // Import CreateStageStatusDto
import { CreateWorkflowStageDto } from './dto/create-workflow-stage.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateStageStatusDto } from './dto/update-stage-status.dto'; // Import UpdateStageStatusDto
import { UpdateWorkflowStageDto } from './dto/update-workflow-stage.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  // Workflow Endpoints
  @Post()
  create(@Body() createWorkflowDto: CreateWorkflowDto) {
    return this.workflowsService.create(createWorkflowDto);
  }

  @Get()
  findAll() {
    return this.workflowsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(id, updateWorkflowDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workflowsService.remove(id);
  }

  // Workflow Stage Endpoints
  @Post(':workflowId/stages')
  createStage(
    @Param('workflowId') workflowId: string,
    @Body() createWorkflowStageDto: CreateWorkflowStageDto,
  ) {
    // Ensure the workflowId from the URL matches the DTO, or handle it in the service
    if (createWorkflowStageDto.workflow_id !== workflowId) {
      // Depending on desired behavior, you might throw an error or log a warning
      // For now, we'll proceed assuming the service handles the correct association
    }
    return this.workflowsService.createStage(createWorkflowStageDto);
  }

  @Get(':workflowId/stages')
  findStagesByWorkflowId(@Param('workflowId') workflowId: string) {
    return this.workflowsService.findStagesByWorkflowId(workflowId);
  }

  @Get(':workflowId/stages/:stageId')
  findOneStage(@Param('stageId') stageId: string) {
    // Note: workflowId is available but not used in the service method currently
    return this.workflowsService.findOneStage(stageId);
  }

  @Put(':workflowId/stages/:stageId')
  updateStage(
    @Param('stageId') stageId: string,
    @Body() updateWorkflowStageDto: UpdateWorkflowStageDto,
  ) {
    return this.workflowsService.updateStage(stageId, updateWorkflowStageDto);
  }

  @Delete(':workflowId/stages/:stageId')
  removeStage(@Param('stageId') stageId: string) {
    return this.workflowsService.removeStage(stageId);
  }

  // Stage Status Endpoints
  @Post(':workflowId/stages/:stageId/statuses')
  createStatus(
    @Param('stageId') stageId: string,
    @Body() createStageStatusDto: CreateStageStatusDto,
  ) {
    // Ensure the stageId from the URL matches the DTO, or handle it in the service
    if (createStageStatusDto.stage_id !== stageId) {
      // Depending on desired behavior, you might throw an error or log a warning
      // For now, we'll proceed assuming the service handles the correct association
    }
    return this.workflowsService.createStatus(createStageStatusDto);
  }

  @Get(':workflowId/stages/:stageId/statuses')
  findStatusesByStageId(@Param('stageId') stageId: string) {
    return this.workflowsService.findStatusesByStageId(stageId);
  }

  @Get(':workflowId/stages/:stageId/statuses/:statusId')
  findOneStatus(@Param('statusId') statusId: string) {
    // Note: workflowId and stageId are available but not used in the service method currently
    return this.workflowsService.findOneStatus(statusId);
  }

  @Put(':workflowId/stages/:stageId/statuses/:statusId')
  updateStatus(
    @Param('statusId') statusId: string,
    @Body() updateStageStatusDto: UpdateStageStatusDto,
  ) {
    return this.workflowsService.updateStatus(statusId, updateStageStatusDto);
  }

  @Delete(':workflowId/stages/:stageId/statuses/:statusId')
  removeStatus(@Param('statusId') statusId: string) {
    return this.workflowsService.removeStatus(statusId);
  }
}
