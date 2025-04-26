import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import { Observable, of } from 'rxjs';

import { Prediction } from '../models/prediction.model';

import {
  PredictionReview,
  PredictionReviewsService,
} from 'src/prediction-reviews/prediction-reviews/prediction-reviews.service';
import { ProjectsService } from '../projects/projects.service'; // Corrected import path

@Injectable()
export class PredictionsService {
  private openai: OpenAI;

  constructor(
    private readonly projectsService: ProjectsService, // Inject ProjectsService
    private readonly predictionReviewsService: PredictionReviewsService, // Inject PredictionReviewsService
  ) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const siteUrl = process.env.OPENROUTER_SITE_URL || ''; // Optional
    const siteName = process.env.OPENROUTER_SITE_NAME || ''; // Optional

    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY environment variable is not set.',
      );
    }

    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': siteUrl,
        'X-Title': siteName,
      },
    });
  }

  async generatePredictions(projectData: any): Promise<Prediction[]> {
    console.log('Generating predictions for project:', projectData);

    // Fetch historical data
    const allProjects = this.projectsService.findAll();
    let allPredictionReviews: PredictionReview[] = [];
    try {
      // Convert Observable to Promise and await
      allPredictionReviews =
        (await this.predictionReviewsService
          .getPredictionReviews()
          .toPromise()) || [];
    } catch (error) {
      console.error('Error fetching historical prediction reviews:', error);
      // Decide how to handle this error - either throw or proceed without historical data
      // For now, we'll log and proceed with empty historical data
    }

    // Format historical data for the prompt
    let historicalData = '';
    if (allProjects && allPredictionReviews.length > 0) {
      // Check if there are reviews
      historicalData = allProjects
        .map((project) => {
          const reviewsForProject = allPredictionReviews.filter(
            (review) => review.projectId === project.id,
          );
          const predictionsForProject = reviewsForProject.flatMap(
            (review) => review.predictions,
          );

          if (predictionsForProject.length === 0) {
            return ''; // Skip projects with no predictions
          }

          return `Project Name: ${project.name}
Client Name: ${project.client}
Project Type: ${project.projectType}
Client Industry: ${project.clientIndustry}
Technology Stack: ${project.techStack.join(', ')}
Estimated Team Size: ${project.teamSize}
Estimated Duration: ${project.duration}
Keywords: ${project.keywords}
Business Specification: ${project.businessSpecification}
Description: ${project.description}
Predicted User Stories/Bugs:
${predictionsForProject.map((p) => `- [${p.type}] ${p.title}: ${p.description}`).join('\n')}
---`;
        })
        .filter((block) => block !== '')
        .join('\n\n'); // Filter out empty blocks
    }

    // Formulate the prompt including historical data
    const prompt = `Analyze the following historical project data and their predicted user stories/bugs to generate a list of potential user stories and bugs for a new software project with the characteristics provided below. Identify common patterns, recurring issues, and relevant features from the historical data that might apply to the new project.

Historical Project Data:
${historicalData || 'No historical data available.'}

---

New Project Characteristics:

Project Name: ${projectData.projectName}
Client Name: ${projectData.clientName}
Project Type: ${projectData.projectType}
Client Industry: ${projectData.clientIndustry}
Technology Stack: ${projectData.techStack.join(', ')}
Estimated Team Size: ${projectData.teamSize}
Estimated Duration: ${projectData.duration}
Keywords: ${projectData.keywords}
Business Specification: ${projectData.businessSpecification}
Description: ${projectData.description}

Provide the output as a JSON array of objects, where each object has the following structure:
{
  "id": "unique-id-string",
  "type": "userStory" | "bug",
  "title": "Concise title",
  "description": "Detailed description",
  "similarityScore": "number between 0 and 100 representing relevance to the new project based on historical data",
  "frequency": "number between 0 and 100 representing how common this type of prediction is in the historical data",
  "sourceProject": "${projectData.projectName}", // Use the new project name as source
  "status": "pending" // Default status
}

Ensure the JSON is valid and can be directly parsed. Do not include any introductory or concluding text outside the JSON array. Generate at least 3 user stories and 2 bugs that are relevant to the new project based on its characteristics and the provided historical data.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'google/gemini-2.5-flash-preview:thinking', // Use the specified OpenRouter model
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const text = completion.choices[0].message.content;

      console.log('OpenRouter API response text:', text);

      if (text === null) {
        throw new InternalServerErrorException('AI response content was null.');
      }

      // Attempt to parse the JSON response
      // Need to handle cases where the API might return extra text or markdown
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      let predictions: Prediction[] = [];

      if (jsonMatch && jsonMatch[1]) {
        try {
          predictions = JSON.parse(jsonMatch[1]);
        } catch (parseError) {
          console.error(
            'Failed to parse JSON from OpenRouter response:',
            parseError,
          );
          // Fallback or error handling if JSON parsing fails
          throw new InternalServerErrorException(
            'Failed to parse predictions from AI response.',
          );
        }
      } else {
        // Attempt to parse directly if no code block is found
        try {
          predictions = JSON.parse(text);
        } catch (parseError) {
          console.error(
            'Failed to parse raw text as JSON from OpenRouter response:',
            parseError,
          );
          throw new InternalServerErrorException(
            'Failed to parse predictions from AI response.',
          );
        }
      }

      // Assign unique IDs if not provided by the API and ensure sourceProject is set
      predictions = predictions.map((pred, index) => ({
        ...pred,
        id:
          pred.id ||
          `${projectData.projectName}-${pred.type}-${index}-${Date.now()}`, // Generate a unique ID if missing
        sourceProject: projectData.projectName, // Ensure sourceProject is set
        status: pred.status || 'pending', // Ensure status is set
      }));

      return predictions;
    } catch (error) {
      console.error('Error calling OpenRouter API:', error);
      throw new InternalServerErrorException(
        'Failed to generate predictions using AI.',
      );
    }
  }

  // Keep existing methods for feedback and history
  sendFeedback(feedbackData: any): Observable<any> {
    // In a real application, this would send feedback to the prediction model.
    console.log('Feedback received:', feedbackData);
    return of({ success: true });
  }

  getPredictionHistory(projectId: string): Observable<Prediction[]> {
    // This method currently uses mock data. In a real application, you would fetch from a database.
    // For now, we'll keep the mock data filtering.
    console.log(`Fetching prediction history for project ID: ${projectId}`);
    // Note: The mockPredictions array is static. To see generated predictions persisted,
    // you would need to save them to a database and fetch from there.
    // For demonstration, we'll return an empty array or filter the static mock data if applicable.
    // Since generated predictions are not added to mockPredictions, this will likely return empty.
    return of([]); // Return empty array as generated predictions are not stored in mockPredictions
  }
}
