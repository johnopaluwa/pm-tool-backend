import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto'; // Import the crypto module
import { PredictionReviewsService } from '../prediction-reviews/prediction-reviews/prediction-reviews.service'; // Import PredictionReviewsService for types
import { ProjectsService } from '../projects/projects.service'; // Import ProjectsService for types
import { SupabaseMapper } from '../supabase/supabase-mapper'; // Import the mapper
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReportsService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly projectsService: ProjectsService, // Keep for type hinting if needed, though direct Supabase calls are preferred
    private readonly predictionReviewsService: PredictionReviewsService, // Keep for type hinting if needed
  ) {
    this.supabase = this.supabaseService.getClient();
  }

  async generateOverallReports(): Promise<{
    completionRate: number;
    statusDistribution: { [status: string]: number };
  }> {
    try {
      const { data: projectsData, error } = await this.supabase
        .from('projects')
        .select('*'); // Select all to use mapper

      if (error) {
        this.logger.error(
          `Error fetching projects for overall reports from Supabase: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(error.message);
      }

      const projects = projectsData
        ? projectsData.map((item) => SupabaseMapper.fromSupabaseProject(item))
        : []; // Use mapper

      if (!projects || projects.length === 0) {
        return {
          completionRate: 0,
          statusDistribution: { new: 0, predicting: 0, completed: 0 },
        };
      }

      const completedProjects = projects.filter(
        (project) => project.status === 'completed',
      );
      const completionRate = (completedProjects.length / projects.length) * 100;

      const statusDistribution: { [status: string]: number } = {
        new: 0,
        predicting: 0,
        completed: 0,
      };
      projects.forEach((project) => {
        if (statusDistribution[project.status] !== undefined) {
          statusDistribution[project.status]++;
        }
      });

      const newReportId = crypto.randomUUID(); // Generate UUID for overall report

      // Persist overall report data
      const { data: insertedOverallReport, error: insertOverallError } =
        await this.supabase
          .from('reports')
          .insert([
            {
              id: newReportId, // Include the generated ID
              completion_rate: completionRate,
              status_distribution: statusDistribution,
            },
          ])
          .select('*')
          .single();

      if (insertOverallError) {
        this.logger.error(
          `Error inserting overall report into Supabase: ${insertOverallError.message}`,
          insertOverallError.stack,
        );
        // Do not throw an error here, just log it, as the report was generated
      }

      console.log('Overall reports generated and persisted.');
      return { completionRate, statusDistribution };
    } catch (error: any) {
      this.logger.error(
        'Failed to generate overall reports:',
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to generate overall reports: ${error.message}`,
      );
    }
  }

  async generateProjectReports(projectId: string): Promise<{
    predictionsCount: number;
    predictionTypeDistribution: { [type: string]: number };
  }> {
    try {
      const { data: predictionsData, error } = await this.supabase
        .from('predictions')
        .select('*, prediction_reviews!inner(projectId)') // Select predictions columns and join with prediction_reviews to get projectId
        .eq('prediction_reviews.projectId', projectId); // Filter by projectId from prediction_reviews

      if (error) {
        this.logger.error(
          `Error fetching predictions for project reports from Supabase: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(error.message);
      }

      const predictions = predictionsData
        ? predictionsData.map((item) =>
            SupabaseMapper.fromSupabasePrediction(item),
          )
        : []; // Use mapper

      const predictionsCount = predictions ? predictions.length : 0;

      const predictionTypeDistribution: { [type: string]: number } = {
        'user-story': 0,
        bug: 0,
      };
      if (predictions) {
        predictions.forEach((prediction) => {
          if (predictionTypeDistribution[prediction.type] !== undefined) {
            predictionTypeDistribution[prediction.type]++;
          }
        });
      }

      const newReportId = crypto.randomUUID(); // Generate UUID for project report

      // Persist project report data
      const { data: insertedProjectReport, error: insertProjectError } =
        await this.supabase
          .from('reports')
          .insert([
            {
              id: newReportId, // Include the generated ID
              project_id: projectId,
              predictions_count: predictionsCount,
              prediction_type_distribution: predictionTypeDistribution,
            },
          ])
          .select('*')
          .single();

      if (insertProjectError) {
        this.logger.error(
          `Error inserting project report into Supabase: ${insertProjectError.message}`,
          insertProjectError.stack,
        );
        // Do not throw an error here, just log it, as the report was generated
      }

      console.log(`Reports generated and persisted for project ${projectId}.`);

      // Mark the project report as generated
      await this.projectsService.markReportGenerated(projectId);
      console.log(`Project ${projectId} marked as report generated.`);

      return { predictionsCount, predictionTypeDistribution };
    } catch (error: any) {
      this.logger.error(
        `Failed to generate reports for project ${projectId}:`,
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to generate reports for project ${projectId}: ${error.message}`,
      );
    }
  }

  // The getter methods will now just call the generation methods
  async getOverallProjectCompletionRate(): Promise<number> {
    const reports = await this.generateOverallReports();
    return reports.completionRate;
  }

  async getOverallProjectStatusDistribution(): Promise<{
    [status: string]: number;
  }> {
    const reports = await this.generateOverallReports();
    return reports.statusDistribution;
  }

  async getPredictionsCountForProject(projectId: string): Promise<number> {
    const reports = await this.generateProjectReports(projectId);
    return reports.predictionsCount;
  }

  async getPredictionTypeDistributionForProject(
    projectId: string,
  ): Promise<{ [type: string]: number }> {
    const reports = await this.generateProjectReports(projectId);
    return reports.predictionTypeDistribution;
  }

  // Removed file-based status methods as reports are generated on the fly
  // Removed TODO comment as the main reporting logic is now implemented
  async getOverallReport(): Promise<any | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('reports')
        .select('completion_rate, status_distribution')
        .is('project_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error(
          `Error fetching overall report from Supabase: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(error.message);
      }

      return data || undefined;
    } catch (error: any) {
      this.logger.error(
        'Failed to fetch overall report:',
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch overall report: ${error.message}`,
      );
    }
  }

  async getProjectReport(projectId: string): Promise<any | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('reports')
        .select('predictions_count, prediction_type_distribution')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error(
          `Error fetching project report from Supabase: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(error.message);
      }

      return data || undefined;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch project report for project ${projectId}:`,
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch project report for project ${projectId}: ${error.message}`,
      );
    }
  }
}
