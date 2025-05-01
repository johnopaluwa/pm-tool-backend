import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PredictionReviewsService } from '../prediction-reviews/prediction-reviews/prediction-reviews.service';
import { PredictionsService } from '../predictions/predictions.service';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly predictionsService: PredictionsService,
    private readonly predictionReviewsService: PredictionReviewsService,
  ) {}

  getOverallProjectCompletionRate(): number {
    const projects = this.projectsService.findAll();
    if (projects.length === 0) {
      return 0;
    }
    const completedProjects = projects.filter(
      (project) => project.status === 'completed',
    );
    return (completedProjects.length / projects.length) * 100;
  }

  getOverallProjectStatusDistribution(): { [status: string]: number } {
    const projects = this.projectsService.findAll();
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

    return distribution;
  }

  getPredictionsCountForProject(projectId: number): Observable<number> {
    return this.predictionReviewsService
      .getPredictionReviewsByProjectId(projectId)
      .pipe(
        map((predictionReviews) => {
          let totalPredictions = 0;
          for (const review of predictionReviews) {
            totalPredictions += review.predictions.length;
          }
          return totalPredictions;
        }),
      );
  }

  getPredictionTypeDistributionForProject(
    projectId: number,
  ): Observable<{ [type: string]: number }> {
    return this.predictionReviewsService
      .getPredictionReviewsByProjectId(projectId)
      .pipe(
        map((predictionReviews) => {
          const distribution: { [type: string]: number } = {
            'user-story': 0,
            bug: 0,
          };

          for (const review of predictionReviews) {
            for (const prediction of review.predictions) {
              if (distribution[prediction.type] !== undefined) {
                distribution[prediction.type]++;
              }
            }
          }
          return distribution;
        }),
      );
  }

  // TODO: Implement other report methods here
}
