import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate/overall')
  async generateOverallReports(): Promise<{ status: string }> {
    await this.reportsService.generateOverallReports();
    return { status: 'Report generation started' };
  }

  @Get('status/overall')
  getOverallReportsStatus(): { status: string } {
    return { status: this.reportsService.getOverallReportsStatus() };
  }

  @Get('overall/completion-rate')
  getOverallProjectCompletionRate(): number {
    const completionRate =
      this.reportsService.getOverallProjectCompletionRate();
    if (completionRate === undefined) {
      throw new NotFoundException(
        'Overall completion rate report not generated yet.',
      );
    }
    return completionRate;
  }

  @Get('overall/status-distribution')
  getOverallProjectStatusDistribution(): { [status: string]: number } {
    const statusDistribution =
      this.reportsService.getOverallProjectStatusDistribution();
    if (statusDistribution === undefined) {
      throw new NotFoundException(
        'Overall status distribution report not generated yet.',
      );
    }
    return statusDistribution;
  }

  @Post('generate/projects/:projectId')
  async generateProjectReports(
    @Param('projectId') projectId: string,
  ): Promise<{ status: string }> {
    await this.reportsService.generateProjectReports(+projectId);
    return { status: `Report generation started for project ${projectId}` };
  }

  @Get('status/projects/:projectId')
  getProjectReportsStatus(@Param('projectId') projectId: string): {
    status: string;
  } {
    const status = this.reportsService.getProjectReportsStatus(+projectId);
    if (status === undefined) {
      throw new NotFoundException(
        `Reports for project ${projectId} not found.`,
      );
    }
    return { status };
  }

  @Get('projects/:projectId/predictions-count')
  getPredictionsCountForProject(@Param('projectId') projectId: string): number {
    const predictionsCount =
      this.reportsService.getPredictionsCountForProject(+projectId);
    if (predictionsCount === undefined) {
      throw new NotFoundException(
        `Predictions count report for project ${projectId} not generated yet.`,
      );
    }
    return predictionsCount;
  }

  @Get('projects/:projectId/prediction-type-distribution')
  getPredictionTypeDistributionForProject(
    @Param('projectId') projectId: string,
  ): { [type: string]: number } {
    const distribution =
      this.reportsService.getPredictionTypeDistributionForProject(+projectId);
    if (distribution === undefined) {
      throw new NotFoundException(
        `Prediction type distribution report for project ${projectId} not generated yet.`,
      );
    }
    return distribution;
  }

  // TODO: Implement other report endpoints here
}
