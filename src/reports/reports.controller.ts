import { Controller, Get, Param } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('completion-rate')
  getOverallProjectCompletionRate(): number {
    return this.reportsService.getOverallProjectCompletionRate();
  }

  @Get('status-distribution')
  getOverallProjectStatusDistribution(): { [status: string]: number } {
    return this.reportsService.getOverallProjectStatusDistribution();
  }

  @Get('projects/:projectId/predictions-count')
  getPredictionsCountForProject(
    @Param('projectId') projectId: string,
  ): Observable<number> {
    return this.reportsService.getPredictionsCountForProject(+projectId); // Convert projectId to number
  }

  @Get('projects/:projectId/prediction-type-distribution')
  getPredictionTypeDistributionForProject(
    @Param('projectId') projectId: string,
  ): Observable<{ [type: string]: number }> {
    return this.reportsService.getPredictionTypeDistributionForProject(
      +projectId,
    ); // Convert projectId to number
  }

  // TODO: Implement other report endpoints here
}
