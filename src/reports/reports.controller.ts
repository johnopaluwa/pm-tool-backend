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

  @Post('generate/projects/:projectId')
  async generateProjectReports(
    @Param('projectId') projectId: string,
  ): Promise<{ status: string }> {
    await this.reportsService.generateProjectReports(projectId);
    return {
      status: `Project report generation triggered for project ${projectId}`,
    };
  }

  // Removed getOverallReportsStatus as reports are generated on the fly

  @Get('overall')
  async getOverallReport(): Promise<any | undefined> {
    return this.reportsService.getOverallReport();
  }

  @Get('project/:projectId')
  async getProjectReport(
    @Param('projectId') projectId: string,
  ): Promise<any | undefined> {
    return this.reportsService.getProjectReport(projectId);
  }
}
