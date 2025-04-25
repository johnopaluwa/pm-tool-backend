import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';

import { Prediction } from '../../models/prediction.model';

@Injectable()
export class PredictionsService {
  private mockPredictions: Prediction[] = [
    {
      id: 'us-1',
      type: 'userStory',
      title: 'As a user, I want to reset my password',
      description: 'Allow users to reset their password via email link.',
      similarityScore: 85,
      frequency: 90,
      sourceProject: 'Project Alpha',
      status: 'pending',
    },
    {
      id: 'us-2',
      type: 'userStory',
      title: 'As an admin, I want to manage users',
      description: 'Admin panel for creating, editing, and deleting users.',
      similarityScore: 80,
      frequency: 75,
      sourceProject: 'Project Beta',
      status: 'pending',
    },
    {
      id: 'bug-1',
      type: 'bug',
      title: 'Handling of edge cases in payment API',
      description: 'Ensure payment API handles all error codes gracefully.',
      similarityScore: 75,
      frequency: 60,
      sourceProject: 'Project Gamma',
      status: 'pending',
    },
    {
      id: 'bug-2',
      type: 'bug',
      title: 'Cross-browser compatibility issues',
      description: 'Fix layout issues in Safari and IE11.',
      similarityScore: 70,
      frequency: 55,
      sourceProject: 'Project Alpha',
      status: 'pending',
    },
  ];

  generatePredictions(projectData: any): Observable<Prediction[]> {
    // In a real application, this would involve calling an external prediction model.
    // For now, return mock data.
    console.log('Generating predictions for project:', projectData);
    return of(this.mockPredictions);
  }

  sendFeedback(feedbackData: any): Observable<any> {
    // In a real application, this would send feedback to the prediction model.
    console.log('Feedback received:', feedbackData);
    return of({ success: true });
  }

  getPredictionHistory(projectId: string): Observable<Prediction[]> {
    // Filter mock data by sourceProject
    return of(
      this.mockPredictions.filter((p) => p.sourceProject === projectId),
    );
  }
}
