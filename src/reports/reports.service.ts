import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PredictionReviewsService } from '../prediction-reviews/prediction-reviews/prediction-reviews.service';
import { PredictionsService } from '../predictions/predictions.service';
import { ProjectsService } from '../projects/projects.service';

const REPORT_STATUS_FILE = path.join(__dirname, 'report-status.json');

interface ReportStatusData {
  overallReports: {
    completionRate?: number;
    statusDistribution?: { [status: string]: number };
    status: 'pending' | 'generating' | 'completed' | 'failed';
  };
  projectReports: {
    [projectId: number]: {
      predictionsCount?: number;
      predictionTypeDistribution?: { [type: string]: number };
      status: 'pending' | 'generating' | 'completed' | 'failed';
    };
  };
}

@Injectable()
export class ReportsService implements OnModuleInit {
  private overallReports: ReportStatusData['overallReports'] = {
    status: 'pending',
  };
  private projectReports: ReportStatusData['projectReports'] = {};

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly predictionsService: PredictionsService,
    private readonly predictionReviewsService: PredictionReviewsService,
  ) {}

  onModuleInit() {
    this.loadReportStatus();
  }

  private loadReportStatus(): void {
    if (fs.existsSync(REPORT_STATUS_FILE)) {
      try {
        const data = fs.readFileSync(REPORT_STATUS_FILE, 'utf8');
        const reportStatusData: ReportStatusData = JSON.parse(data);
        this.overallReports = reportStatusData.overallReports;
        this.projectReports = reportStatusData.projectReports;
        console.log('Report status loaded from file.');
      } catch (error) {
        console.error('Failed to load report status from file:', error);
      }
    }
  }

  private saveReportStatus(): void {
    const reportStatusData: ReportStatusData = {
      overallReports: this.overallReports,
      projectReports: this.projectReports,
    };
    try {
      fs.writeFileSync(
        REPORT_STATUS_FILE,
        JSON.stringify(reportStatusData, null, 2),
        'utf8',
      );
      console.log('Report status saved to file.');
    } catch (error) {
      console.error('Failed to save report status to file:', error);
    }
  }

  async generateOverallReports(): Promise<void> {
    this.overallReports.status = 'generating';
    this.saveReportStatus(); // Save status change
    try {
      const projects = this.projectsService.findAll();
      if (projects.length === 0) {
        this.overallReports.completionRate = 0;
      } else {
        const completedProjects = projects.filter(
          (project) => project.status === 'completed',
        );
        this.overallReports.completionRate =
          (completedProjects.length / projects.length) * 100;
      }

      const distribution: { [status: string]: number } = {
        new: 0,
        predicting: 0,
        completed: 0,
      };
      projects.forEach((project) => {
        if (distribution[project.status] !== undefined) {
          distribution[project.status]++;
        }
      });
      this.overallReports.statusDistribution = distribution;

      this.overallReports.status = 'completed';
      this.saveReportStatus(); // Save status change and data
    } catch (error) {
      console.error('Failed to generate overall reports:', error);
      this.overallReports.status = 'failed';
      this.saveReportStatus(); // Save status change
    }
  }

  getOverallReportsStatus(): 'pending' | 'generating' | 'completed' | 'failed' {
    return this.overallReports.status;
  }

  getOverallProjectCompletionRate(): number | undefined {
    if (this.overallReports.status === 'completed') {
      return this.overallReports.completionRate;
    }
    return undefined;
  }

  getOverallProjectStatusDistribution():
    | { [status: string]: number }
    | undefined {
    if (this.overallReports.status === 'completed') {
      return this.overallReports.statusDistribution;
    }
    return undefined;
  }

  async generateProjectReports(projectId: number): Promise<void> {
    this.projectReports[projectId] = { status: 'generating' };
    this.saveReportStatus(); // Save status change
    try {
      const predictionReviews = await this.predictionReviewsService
        .getPredictionReviewsByProjectId(projectId)
        .toPromise();

      let totalPredictions = 0;
      if (predictionReviews) {
        for (const review of predictionReviews) {
          totalPredictions += review.predictions.length;
        }
      }
      this.projectReports[projectId].predictionsCount = totalPredictions;

      const distribution: { [type: string]: number } = {
        'user-story': 0,
        bug: 0,
      };
      if (predictionReviews) {
        for (const review of predictionReviews) {
          for (const prediction of review.predictions) {
            if (distribution[prediction.type] !== undefined) {
              distribution[prediction.type]++;
            }
          }
        }
      }
      this.projectReports[projectId].predictionTypeDistribution = distribution;

      this.projectReports[projectId].status = 'completed';
      this.saveReportStatus(); // Save status change and data
    } catch (error) {
      console.error(
        `Failed to generate reports for project ${projectId}:`,
        error,
      );
      this.projectReports[projectId].status = 'failed';
      this.saveReportStatus(); // Save status change
    }
  }

  getProjectReportsStatus(
    projectId: number,
  ): 'pending' | 'generating' | 'completed' | 'failed' | undefined {
    return this.projectReports[projectId]?.status;
  }

  getPredictionsCountForProject(projectId: number): number | undefined {
    if (this.projectReports[projectId]?.status === 'completed') {
      return this.projectReports[projectId].predictionsCount;
    }
    return undefined;
  }

  getPredictionTypeDistributionForProject(
    projectId: number,
  ): { [type: string]: number } | undefined {
    if (this.projectReports[projectId]?.status === 'completed') {
      return this.projectReports[projectId].predictionTypeDistribution;
    }
    return undefined;
  }

  // TODO: Implement other report methods here
}
