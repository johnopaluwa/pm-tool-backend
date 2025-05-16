import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto'; // Import the crypto module
import { SupabaseMapper } from '../supabase/supabase-mapper'; // Import the mapper
import { SupabaseService } from '../supabase/supabase.service';
import { WorkflowsService } from '../workflows/workflows.service'; // Import WorkflowsService
import { CreateProjectDto } from './dto/create-project.dto'; // Import CreateProjectDto

export interface Project {
  id: string;
  name: string;
  client: string;
  status: string; // Changed type to string to accommodate workflow statuses
  description: string;
  projectType: string;
  clientIndustry: string;
  techStack: string[];
  teamSize: string;
  duration: string;
  keywords: string;
  businessSpecification: string;
  reportGenerated?: boolean; // Add reportGenerated flag
  workflow_id?: string; // Add optional workflow_id
}

@Injectable()
export class ProjectsService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly workflowsService: WorkflowsService, // Inject WorkflowsService
  ) {
    this.supabase = this.supabaseService.getClient();
  }

  async findAll(): Promise<Project[]> {
    const { data, error } = await this.supabase.from('projects').select('*');
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data
      ? data.map((item) => SupabaseMapper.fromSupabaseProject(item))
      : []; // Use mapper
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found
      throw new InternalServerErrorException(error.message);
    }
    return data ? SupabaseMapper.fromSupabaseProject(data) : undefined; // Use mapper
  }

  async addProject(
    createProjectDto: CreateProjectDto, // Accept CreateProjectDto directly
  ): Promise<string> {
    const newProjectId = crypto.randomUUID(); // Generate UUID

    // Determine initial status based on workflow_id
    let initialStatus = 'new'; // Default status if no workflow
    if (createProjectDto.workflow_id) {
      // Fetch the default status of the first stage in the assigned workflow
      const stages = await this.workflowsService.findStagesByWorkflowId(
        createProjectDto.workflow_id,
      );
      if (stages && stages.length > 0) {
        const firstStage = stages[0];
        const statuses = await this.workflowsService.findStatusesByStageId(
          firstStage.id,
        );
        const defaultStatus = statuses.find((status) => status.is_default);
        if (defaultStatus) {
          initialStatus = defaultStatus.name; // Use the name of the default status
        } else if (statuses.length > 0) {
          // If no default status is explicitly marked, use the first status in the first stage
          initialStatus = statuses[0].name;
        }
      }
    }

    const newProject = SupabaseMapper.toSupabaseProject({
      // Use mapper
      id: newProjectId, // Include the generated ID
      name: createProjectDto.projectName,
      client: createProjectDto.clientName,
      status: initialStatus, // Set initial status
      reportGenerated: false, // New projects have reportGenerated as false
      description: createProjectDto.description,
      projectType: createProjectDto.projectType,
      clientIndustry: createProjectDto.clientIndustry,
      techStack: createProjectDto.techStack,
      teamSize: createProjectDto.teamSize,
      duration: createProjectDto.duration,
      keywords: createProjectDto.keywords,
      businessSpecification: createProjectDto.businessSpecification,
      workflow_id: createProjectDto.workflow_id, // Include workflow_id
    });

    const { data, error } = await this.supabase
      .from('projects')
      .insert([newProject])
      .select('id');

    if (error) {
      this.logger.error(
        `Error inserting project into Supabase:`,
        error.message,
        error,
      ); // Log the entire error object
      throw new InternalServerErrorException(
        `Failed to create project: ${error.message || 'Unknown error'}`,
      );
    }

    if (!data || data.length === 0) {
      this.logger.error('Failed to retrieve new project ID after insertion.');
      throw new InternalServerErrorException(
        'Failed to retrieve new project ID after insertion.',
      );
    }

    console.log('New project added:', data[0].id);
    return data[0].id;
  }

  async updateProjectStatus(
    id: string,
    status: string, // Changed type to string
  ): Promise<Project | undefined> {
    const { data, error } = await this.supabase
      .from('projects')
      .update({ status: status })
      .eq('id', id)
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found
      this.logger.error(`Error updating project status in Supabase:`, error); // Log the entire error object
      throw new InternalServerErrorException(error.message || 'Unknown error');
    }

    if (data) {
      console.log(`Project ${id} status updated to ${status}`);
      return SupabaseMapper.fromSupabaseProject(data); // Use mapper
    }
    return undefined;
  }

  async markReportGenerated(id: string): Promise<Project | undefined> {
    const { data, error } = await this.supabase
      .from('projects')
      .update({ reportGenerated: true })
      .eq('id', id)
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found
      this.logger.error(`Error marking report generated in Supabase:`, error); // Log the entire error object
      throw new InternalServerErrorException(error.message || 'Unknown error');
    }

    if (data) {
      console.log(`Project ${id} reportGenerated status updated to true`);
      return SupabaseMapper.fromSupabaseProject(data); // Use mapper
    }
    return undefined;
  }
}
