import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { StageStatus, Task } from '../interfaces'; // Import interfaces from shared location
import { ProjectsService } from '../projects/projects.service';
import { SupabaseService } from '../supabase/supabase.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  private supabase;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly projectsService: ProjectsService,
    private readonly workflowsService: WorkflowsService,
  ) {
    this.supabase = this.supabaseService.getClient();
  }

  async create(createTaskDto: CreateTaskDto) {
    // Fetch the project to get its workflow_id
    const project = await this.projectsService.getProjectById(
      createTaskDto.project_id,
    );
    if (!project) {
      throw new NotFoundException(
        `Project with ID "${createTaskDto.project_id}" not found`,
      );
    }

    let initialStatusId: string | null = null;
    if (project.workflow_id) {
      // Fetch the default status of the first stage in the project's workflow
      const stages = await this.workflowsService.findStagesByWorkflowId(
        project.workflow_id,
      );
      if (stages && stages.length > 0) {
        const firstStage = stages[0];
        const statuses = await this.workflowsService.findStatusesByStageId(
          firstStage.id,
        );
        const defaultStatus = statuses.find((status) => status.is_default);
        if (defaultStatus) {
          initialStatusId = defaultStatus.id; // Use the ID of the default status
        } else if (statuses.length > 0) {
          // If no default status is explicitly marked, use the first status in the first stage
          initialStatusId = statuses[0].id;
        }
      }
    }

    const { data, error } = await this.supabase
      .from('tasks')
      .insert([
        {
          ...createTaskDto,
          status_id: initialStatusId, // Set initial status_id
        },
      ])
      .select();

    if (error) {
      throw new InternalServerErrorException(error.message); // TODO: Better error handling
    }

    return data[0];
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*, status:status_id(*)') // Select task fields and join with stage_statuses to get status details
      .eq('project_id', projectId);

    if (error) {
      throw new InternalServerErrorException(error.message); // TODO: Better error handling
    }

    return data;
  }

  async findOne(id: string): Promise<Task | undefined> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*, status:status_id(*)') // Select task fields and join with stage_statuses
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return undefined; // Return undefined for not found
      }
      throw new InternalServerErrorException(error.message); // TODO: Better error handling
    }

    return data;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    if (updateTaskDto.status_id !== undefined) {
      // Status is being updated, perform validation
      const task = await this.findOne(id);
      if (!task) {
        throw new NotFoundException(`Task with ID "${id}" not found`);
      }

      const project = await this.projectsService.getProjectById(
        task.project_id,
      );
      if (!project || !project.workflow_id) {
        // If no project or workflow, allow status update (or throw error based on requirements)
        console.warn(
          `Task ${id} belongs to a project without a workflow. Status transition not validated.`,
        );
      } else {
        // Fetch workflow stages and statuses
        const stages = await this.workflowsService.findStagesByWorkflowId(
          project.workflow_id,
        );
        let allStatuses: StageStatus[] = [];
        for (const stage of stages) {
          const statuses = await this.workflowsService.findStatusesByStageId(
            stage.id,
          );
          allStatuses = allStatuses.concat(
            statuses.map(
              (s) =>
                ({ ...s, stage_order: stage.order }) as StageStatus & {
                  stage_order: number;
                },
            ),
          ); // Add stage order for comparison
        }

        const currentStatus = allStatuses.find((s) => s.id === task.status_id);
        const targetStatus = allStatuses.find(
          (s) => s.id === updateTaskDto.status_id,
        );

        if (!currentStatus || !targetStatus) {
          throw new BadRequestException('Invalid current or target status ID.');
        }

        // Simple validation: must move to a status in the same stage or a later stage
        // Add checks for stage_order being defined
        if (
          currentStatus.stage_order !== undefined &&
          targetStatus.stage_order !== undefined &&
          targetStatus.stage_order < currentStatus.stage_order
        ) {
          throw new BadRequestException(
            `Invalid status transition from "${currentStatus.name}" to "${targetStatus.name}". Cannot move to an earlier stage.`,
          );
        }

        // If in the same stage, must move to a status with an equal or higher order
        // Add checks for stage_order being defined
        if (
          currentStatus.stage_order !== undefined &&
          targetStatus.stage_order !== undefined &&
          targetStatus.stage_order === currentStatus.stage_order &&
          targetStatus.order < currentStatus.order
        ) {
          throw new BadRequestException(
            `Invalid status transition from "${currentStatus.name}" to "${targetStatus.name}". Cannot move to a status with a lower order in the same stage.`,
          );
        }

        // TODO: Implement more complex workflow rules if needed (e.g., specific allowed transitions)
      }
    }

    const { data, error } = await this.supabase
      .from('tasks')
      .update(updateTaskDto)
      .eq('id', id)
      .select('*, status:status_id(*)'); // Select task fields and join with stage_statuses

    if (error) {
      throw new InternalServerErrorException(error.message); // TODO: Better error handling
    }

    if (!data || data.length === 0) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    const updatedTask = data[0];

    // After successful task update, check if the project is completed
    if (updatedTask.project_id && updatedTask.status?.is_completion_status) {
      await this.checkAndCompleteProject(updatedTask.project_id);
    }

    return updatedTask;
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const { error } = await this.supabase.from('tasks').delete().eq('id', id);

    if (error) {
      throw new InternalServerErrorException(error.message); // TODO: Better error handling
    }

    // Supabase delete does not return the deleted item, so we can't confirm deletion this way.
    // We could try fetching it first, but for now, assume success if no error.
    return { success: true, message: `Task with ID "${id}" deleted` };
  }

  private async checkAndCompleteProject(projectId: string): Promise<void> {
    const project = await this.projectsService.getProjectById(projectId);
    if (!project || !project.workflow_id) {
      // Cannot determine project completion without a workflow
      return;
    }

    const tasks = await this.findByProjectId(projectId);
    if (!tasks || tasks.length === 0) {
      // No tasks, project might be considered completed or requires manual completion
      // For now, we won't auto-complete if there are no tasks.
      return;
    }

    // Fetch all completion status IDs for the project's workflow
    const stages = await this.workflowsService.findStagesByWorkflowId(
      project.workflow_id,
    );
    let completionStatusIds: string[] = [];
    for (const stage of stages) {
      const statuses = await this.workflowsService.findStatusesByStageId(
        stage.id,
      );
      const stageCompletionStatusIds = statuses
        .filter((status) => status.is_completion_status)
        .map((status) => status.id);
      completionStatusIds = completionStatusIds.concat(
        stageCompletionStatusIds,
      );
    }

    // Check if all tasks are in a completion status
    const allTasksCompleted = tasks.every(
      (task) =>
        task.status_id !== undefined &&
        completionStatusIds.includes(task.status_id),
    );

    if (allTasksCompleted) {
      // TODO: Determine the appropriate completion status name or ID for the project
      // For now, using a hardcoded 'completed' status name. This should ideally
      // be configurable or derived from the workflow itself.
      await this.projectsService.updateProjectStatus(projectId, 'completed');
      console.log(`Project ${projectId} automatically marked as completed.`);
    }
  }
}
