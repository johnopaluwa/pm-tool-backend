import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs'; // Although NestJS services typically return Promises or Observables, for a simple mock backend, returning data directly is fine. We'll keep the Observable return type for consistency with the frontend mock service for now, but will likely change this to Promises later.

import { Prediction } from '../../models/prediction.model';

export interface PredictionReview {
  id: string;
  projectId: number; // Link to the project
  projectName: string;
  clientName?: string;
  generatedAt: Date;
  predictions: Prediction[];
}

@Injectable()
export class PredictionReviewsService {
  private mockPredictionReviews: PredictionReview[] = [
    {
      id: 'review-1',
      projectId: 1,
      projectName: 'Project Alpha',
      clientName: 'Client A',
      generatedAt: new Date('2023-10-26T10:00:00Z'),
      predictions: [
        {
          id: 'us-1',
          type: 'user-story', // Updated type
          title: 'As a user, I want to reset my password',
          description: 'Allow users to reset their password via email link.',
          similarityScore: 85,
          frequency: 90,
          sourceProject: 'Project Alpha',
          status: 'pending',
          // Added fields for User Story
          acceptanceCriteria: [
            'User receives an email with a reset link',
            'Link expires after 24 hours',
            'User can set a new password via the link',
          ],
          dependencies: ['Email service integration'],
          assumptions: ['User has access to their registered email'],
          edgeCases: ['User enters an invalid email format'],
          nonFunctionalRequirements:
            'The password reset process should be secure and user-friendly.',
          visuals: ['link/to/mockup.png'],
          dataRequirements: 'Store hashed passwords and user email addresses.',
          impact:
            'Users cannot reset their password if forgotten, leading to support requests.',
          priority: 'High',
          estimatedTime: 4, // Example estimated time in hours
          stepsToReproduce: [
            'Navigate to login page',
            'Click "Forgot Password"',
            'Enter email and submit',
          ],
          actualResult: 'Password reset email is not sent.',
          expectedResult: 'Password reset email is sent with a unique link.',
          environment: 'Production',
          userAccountDetails: 'Any registered user account.',
          screenshotsVideos: ['link/to/screenshot1.png', 'link/to/video.mp4'],
          errorMessagesLogs: 'Error: Email service failed to send.',
          frequencyOfOccurrence: 'Consistent',
          severity: 'Major',
          workaround: 'Manual password reset by admin.',
          relatedIssues: ['issue-101', 'issue-105'],
        },
        {
          id: 'bug-2',
          type: 'bug', // Updated type
          title: 'Cross-browser compatibility issues',
          description: 'Fix layout issues in Safari and IE11.',
          similarityScore: 70,
          frequency: 55,
          sourceProject: 'Project Alpha',
          status: 'pending',
          // Added fields for Bug
          acceptanceCriteria: ['Layout is consistent across Safari and IE11'],
          dependencies: ['Updated CSS framework'],
          assumptions: ['Browser versions are within support policy'],
          edgeCases: ['Specific complex layouts might still have minor issues'],
          nonFunctionalRequirements:
            'Application must render correctly on all supported browsers.',
          visuals: [
            'link/to/safari_screenshot.png',
            'link/to/ie11_screenshot.png',
          ],
          dataRequirements: '',
          impact: 'Users on affected browsers have a poor experience.',
          priority: 'Critical',
          estimatedTime: 8, // Example estimated time in hours
          stepsToReproduce: [
            'Open application in Safari or IE11',
            'Navigate to the dashboard page',
            'Observe layout discrepancies',
          ],
          actualResult: 'Layout is broken in Safari and IE11.',
          expectedResult:
            'Layout should be consistent across all supported browsers.',
          environment: 'Safari 15, IE11 on Windows 10',
          userAccountDetails: 'Any user.',
          screenshotsVideos: [],
          errorMessagesLogs: '',
          frequencyOfOccurrence: 'Consistent',
          severity: 'Major',
          workaround: 'Use a different browser.',
          relatedIssues: ['css-layout-bug-101', 'rendering-issue-205'],
        },
      ],
    },
    {
      id: 'review-2',
      projectId: 2,
      projectName: 'Project Beta',
      clientName: 'Client B',
      generatedAt: new Date('2023-11-15T14:30:00Z'),
      predictions: [
        {
          id: 'us-2',
          type: 'user-story', // Updated type
          title: 'As an admin, I want to manage users',
          description: 'Admin panel for creating, editing, and deleting users.',
          similarityScore: 80,
          frequency: 75,
          sourceProject: 'Project Beta',
          status: 'pending',
          // Added some fields for User Story
          acceptanceCriteria: [
            'Admin can view a list of all users',
            'Admin can add a new user',
            'Admin can edit existing user details',
            'Admin can delete a user',
          ],
          dependencies: ['Backend user API'],
          assumptions: ['Admin has necessary permissions'],
          edgeCases: ['Handling large number of users'],
          nonFunctionalRequirements:
            'User management should be fast and secure.',
          visuals: ['link/to/admin_panel_mockup.png'],
          dataRequirements: 'Access to user database.',
          impact:
            'Admins cannot manage users, affecting system administration.',
          priority: 'High',
          estimatedTime: 16, // Example estimated time in hours
          stepsToReproduce: ['Navigate to admin panel', 'Click on "Users"'],
          actualResult: 'User list is empty or shows an error.',
          expectedResult: 'A list of users is displayed.',
          environment: 'Staging',
          userAccountDetails: 'Admin user account.',
          screenshotsVideos: [],
          errorMessagesLogs: 'Error fetching users: [log details]',
          frequencyOfOccurrence: 'Intermittent',
          severity: 'Major',
          workaround:
            'Manage users directly in the database (not recommended).',
          relatedIssues: ['backend-api-error-302'],
        },
      ],
    },
  ];

  addPredictionReview(
    review: Omit<PredictionReview, 'id' | 'generatedAt'>,
  ): Observable<PredictionReview> {
    const newId = `review-${this.mockPredictionReviews.length + 1}`; // Simple ID generation
    const newReview: PredictionReview = {
      ...review,
      id: newId,
      generatedAt: new Date(),
    };
    this.mockPredictionReviews.push(newReview);
    console.log('New prediction review added:', newReview);
    console.log('All prediction reviews:', this.mockPredictionReviews);
    return of(newReview);
  }

  getPredictionReviews(): Observable<PredictionReview[]> {
    return of(this.mockPredictionReviews);
  }

  getPredictionReviewById(
    id: string,
  ): Observable<PredictionReview | undefined> {
    return of(this.mockPredictionReviews.find((review) => review.id === id));
  }

  getPredictionReviewsByProjectId(
    projectId: number,
  ): Observable<PredictionReview[]> {
    return of(
      this.mockPredictionReviews.filter(
        (review) => review.projectId === projectId,
      ),
    );
  }
}
