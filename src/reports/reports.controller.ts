import { Controller, Get, Param, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate/overall')
  @Post('generate/overall')
  async generateOverallReports(): Promise<{ status: string }> {
    // Reports are now generated on the fly when requested via GET endpoints
    // This endpoint can be kept to trigger a regeneration if needed, but the GET endpoints are the primary way to get reports
    // For now, we'll just return a success status indicating the capability exists
    return {
      status:
        'Overall report generation triggered (reports are generated on demand via GET endpoints)',
    };
  }

  // Removed getOverallReportsStatus as reports are generated on the fly

  @Get('overall/completion-rate')
  async getOverallProjectCompletionRate(): Promise<number> {
    const reports = await this.reportsService.generateOverallReports();
    return reports.completionRate;
  }

  @Get('overall/status-distribution')
  async getOverallProjectStatusDistribution(): Promise<{
    [status: string]: number;
  }> {
    const reports = await this.reportsService.generateOverallReports();
    return reports.statusDistribution;
  }

  @Post('generate/projects/:projectId')
  async generateProjectReports(
    @Param('projectId') projectId: string,
  ): Promise<{ status: string }> {
    // Reports are now generated on the fly when requested via GET endpoints
    // This endpoint can be kept to trigger a regeneration if needed, but the GET endpoints are the primary way to get reports
    // For now, we'll just return a success status indicating the capability exists
    return {
      status: `Project report generation triggered for project ${projectId} (reports are generated on demand via GET endpoints)`,
    };
  }

  // Removed getProjectReportsStatus as reports are generated on the fly

  @Get('projects/:projectId/predictions-count')
  async getPredictionsCountForProject(
    @Param('projectId') projectId: string,
  ): Promise<number> {
    const reports =
      await this.reportsService.generateProjectReports(+projectId);
    return reports.predictionsCount;
  }

  @Get('projects/:projectId/prediction-type-distribution')
  async getPredictionTypeDistributionForProject(
    @Param('projectId') projectId: string,
  ): Promise<{ [type: string]: number }> {
    const reports =
      await this.reportsService.generateProjectReports(+projectId);
    return reports.predictionTypeDistribution;
  }

  // TODO: Implement other report endpoints here
}
