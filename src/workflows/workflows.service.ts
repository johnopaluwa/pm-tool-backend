import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateStageStatusDto } from './dto/create-stage-status.dto'; // Import CreateStageStatusDto
import { CreateWorkflowStageDto } from './dto/create-workflow-stage.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateStageStatusDto } from './dto/update-stage-status.dto'; // Import UpdateStageStatusDto
import { UpdateWorkflowStageDto } from './dto/update-workflow-stage.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowsService {
  private supabase;

  constructor(private readonly supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
  }

  async create(createWorkflowDto: CreateWorkflowDto) {
    const { data, error } = await this.supabase
      .from('workflows')
      .insert([createWorkflowDto])
      .select();

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    return data[0];
  }

  async findAll() {
    const { data, error } = await this.supabase.from('workflows').select('*');

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        throw new NotFoundException(`Workflow with ID "${id}" not found`);
      }
      throw new Error(error.message); // TODO: Better error handling
    }

    return data;
  }

  async update(id: string, updateWorkflowDto: UpdateWorkflowDto) {
    const { data, error } = await this.supabase
      .from('workflows')
      .update(updateWorkflowDto)
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    if (!data || data.length === 0) {
      throw new NotFoundException(`Workflow with ID "${id}" not found`);
    }

    return data[0];
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    // Supabase delete does not return the deleted item, so we can't confirm deletion this way.
    // We could try fetching it first, but for now, assume success if no error.
    return { success: true, message: `Workflow with ID "${id}" deleted` };
  }

  // Methods for Workflow Stages

  async createStage(createWorkflowStageDto: CreateWorkflowStageDto) {
    console.log(
      'WorkflowsService.createStage called with:',
      createWorkflowStageDto,
    ); // Log input DTO
    const { data, error } = await this.supabase
      .from('workflow_stages')
      .insert([createWorkflowStageDto])
      .select();

    console.log('Supabase insert result - data:', data); // Log Supabase data result
    console.log('Supabase insert result - error:', error); // Log Supabase error result

    if (error) {
      console.error('Error inserting workflow stage:', error.message); // Log error before throwing
      throw new Error(error.message); // TODO: Better error handling
    }

    return data[0];
  }

  async findStagesByWorkflowId(workflowId: string) {
    const { data, error } = await this.supabase
      .from('workflow_stages')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('order', { ascending: true }); // Order stages by their defined order

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    return data;
  }

  async findOneStage(stageId: string) {
    const { data, error } = await this.supabase
      .from('workflow_stages')
      .select('*')
      .eq('id', stageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        throw new NotFoundException(
          `Workflow stage with ID "${stageId}" not found`,
        );
      }
      throw new Error(error.message); // TODO: Better error handling
    }

    return data;
  }

  async updateStage(
    stageId: string,
    updateWorkflowStageDto: UpdateWorkflowStageDto,
  ) {
    const { data, error } = await this.supabase
      .from('workflow_stages')
      .update(updateWorkflowStageDto)
      .eq('id', stageId)
      .select();

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    if (!data || data.length === 0) {
      throw new NotFoundException(
        `Workflow stage with ID "${stageId}" not found`,
      );
    }

    return data[0];
  }

  async removeStage(stageId: string) {
    const { error } = await this.supabase
      .from('workflow_stages')
      .delete()
      .eq('id', stageId);

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    // Supabase delete does not return the deleted item, so we can't confirm deletion this way.
    // We could try fetching it first, but for now, assume success if no error.
    return {
      success: true,
      message: `Workflow stage with ID "${stageId}" deleted`,
    };
  }

  // Methods for Stage Statuses

  async createStatus(createStageStatusDto: CreateStageStatusDto) {
    console.log(
      'WorkflowsService.createStatus called with:',
      createStageStatusDto,
    );
    const { data, error } = await this.supabase
      .from('stage_statuses')
      .insert([createStageStatusDto])
      .select();
    console.log('Supabase insert result - data:', data);
    console.log('Supabase insert result - error:', error);

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    return data[0];
  }

  async findStatusesByStageId(stageId: string) {
    const { data, error } = await this.supabase
      .from('stage_statuses')
      .select('*')
      .eq('stage_id', stageId)
      .order('order', { ascending: true }); // Order statuses by their defined order

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    return data;
  }

  async findOneStatus(statusId: string) {
    const { data, error } = await this.supabase
      .from('stage_statuses')
      .select('*')
      .eq('id', statusId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        throw new NotFoundException(
          `Stage status with ID "${statusId}" not found`,
        );
      }
      throw new Error(error.message); // TODO: Better error handling
    }

    return data;
  }

  async updateStatus(
    statusId: string,
    updateStageStatusDto: UpdateStageStatusDto,
  ) {
    console.log(
      'WorkflowsService.updateStatus called with ID:',
      statusId,
      'and data:',
      updateStageStatusDto,
    );
    const { data, error } = await this.supabase
      .from('stage_statuses')
      .update(updateStageStatusDto)
      .eq('id', statusId)
      .select();
    console.log('Supabase update result - data:', data);
    console.log('Supabase update result - error:', error);

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    if (!data || data.length === 0) {
      throw new NotFoundException(
        `Stage status with ID "${statusId}" not found`,
      );
    }

    return data[0];
  }

  async removeStatus(statusId: string) {
    const { error } = await this.supabase
      .from('stage_statuses')
      .delete()
      .eq('id', statusId);

    if (error) {
      throw new Error(error.message); // TODO: Better error handling
    }

    // Supabase delete does not return the deleted item, so we can't confirm deletion this way.
    // We could try fetching it first, but for now, assume success if no error.
    return {
      success: true,
      message: `Stage status with ID "${statusId}" deleted`,
    };
  }
}
