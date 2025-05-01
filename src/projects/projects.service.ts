import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseMapper } from '../supabase/supabase-mapper'; // Import the mapper
import { SupabaseService } from '../supabase/supabase.service';

export interface Project {
  id: number;
  name: string;
  client: string;
  status: 'new' | 'predicting' | 'completed';
  description: string;
  projectType: string;
  clientIndustry: string;
  techStack: string[];
  teamSize: string;
  duration: string;
  keywords: string;
  businessSpecification: string;
  reportGenerated?: boolean; // Add reportGenerated flag
}

@Injectable()
export class ProjectsService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly supabaseService: SupabaseService) {
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

  async getProjectById(id: number): Promise<Project | undefined> {
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
    project: Omit<Project, 'id' | 'status' | 'name' | 'client'> & {
      projectName: string;
      clientName: string;
    },
  ): Promise<number> {
    const newProject = SupabaseMapper.toSupabaseProject({
      // Use mapper
      name: project.projectName,
      client: project.clientName,
      status: 'new', // New projects start with status 'new'
      reportGenerated: false, // New projects have reportGenerated as false
      description: project.description,
      projectType: project.projectType,
      clientIndustry: project.clientIndustry,
      techStack: project.techStack,
      teamSize: project.teamSize,
      duration: project.duration,
      keywords: project.keywords,
      businessSpecification: project.businessSpecification,
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
    id: number,
    status: 'new' | 'predicting' | 'completed',
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

  async markReportGenerated(id: number): Promise<Project | undefined> {
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
