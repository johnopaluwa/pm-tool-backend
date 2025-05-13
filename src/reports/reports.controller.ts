import { Controller, Get, Param, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate/overall')
  async generateOverallReports(): Promise<{ status: string }> {
    await this.reportsService.generateOverallReports(); // Call the service method
    return {
      status: 'Overall report generation triggered and completed.', // Updated status message
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
