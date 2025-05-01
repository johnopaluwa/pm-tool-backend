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

  async generatePredictions(
    projectData: any,
    projectId: number,
  ): Promise<Prediction[]> {
    console.log(
      `Generating predictions for project ID: ${projectId}`,
      projectData,
    );

    // Update project status to 'predicting'
    this.projectsService.updateProjectStatus(projectId, 'predicting');

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
${predictionsForProject
  .map((p) => {
    let details = `- [${p.type}] ${p.title}: ${p.description}`;
    if (p.type === 'user-story') {
      if (p.acceptanceCriteria)
        details += `\n  Acceptance Criteria: ${p.acceptanceCriteria.join('; ')}`;
      if (p.dependencies)
        details += `\n  Dependencies: ${p.dependencies.join(', ')}`;
      if (p.assumptions)
        details += `\n  Assumptions: ${p.assumptions.join('; ')}`;
      if (p.edgeCases) details += `\n  Edge Cases: ${p.edgeCases.join('; ')}`;
      if (p.nonFunctionalRequirements)
        details += `\n  Non-Functional Requirements: ${p.nonFunctionalRequirements}`;
      if (p.visuals) details += `\n  Visuals: ${p.visuals.join(', ')}`;
      if (p.dataRequirements)
        details += `\n  Data Requirements: ${p.dataRequirements}`;
      if (p.impact) details += `\n  Impact: ${p.impact}`;
      if (p.priority) details += `\n  Priority: ${p.priority}`;
    } else if (p.type === 'bug') {
      if (p.stepsToReproduce)
        details += `\n  Steps to Reproduce: ${p.stepsToReproduce.join(' -> ')}`;
      if (p.actualResult) details += `\n  Actual Result: ${p.actualResult}`;
      if (p.expectedResult)
        details += `\n  Expected Result: ${p.expectedResult}`;
      if (p.environment) details += `\n  Environment: ${p.environment}`;
      if (p.userAccountDetails)
        details += `\n  User/Account Details: ${p.userAccountDetails}`;
      if (p.screenshotsVideos)
        details += `\n  Screenshots/Videos: ${p.screenshotsVideos.join(', ')}`;
      if (p.errorMessagesLogs)
        details += `\n  Error Messages/Logs: ${p.errorMessagesLogs}`;
      if (p.frequencyOfOccurrence)
        details += `\n  Frequency: ${p.frequencyOfOccurrence}`;
      if (p.severity) details += `\n  Severity: ${p.severity}`;
      if (p.workaround) details += `\n  Workaround: ${p.workaround}`;
      if (p.relatedIssues)
        details += `\n  Related Issues: ${p.relatedIssues.join(', ')}`;
    }
    return details;
  })
  .join('\n')}
---`;
        })
        .filter((block) => block !== '')
        .join('\n\n'); // Filter out empty blocks
    }

    // Formulate the prompt including historical data
    const prompt = `YOUR RESPONSE MUST BE A VALID JSON ARRAY. DO NOT INCLUDE ANY INTRODUCTORY OR CONCLUDING TEXT, EXPLANATIONS, OR MARKDOWN FORMATTING (like \`\`\`json\`). PROVIDE ONLY THE JSON ARRAY.

Analyze the following historical project data and their predicted user stories/bugs to generate a list of potential user stories and bugs for a new software project with the characteristics provided below. Identify common patterns, recurring issues, and relevant features from the historical data that might apply to the new project.

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

Provide the output as a JSON array of objects, where each object has the following structure, including fields relevant to user stories or bugs. Ensure all fields defined in the structure are present in each object, using empty strings or appropriate default values if a specific value is not applicable.
{
  "id": "unique-id-string", // REQUIRED
  "type": "user-story" | "bug", // REQUIRED: Must be one of these two values
  "title": "Concise title", // REQUIRED
  "description": "Detailed description", // REQUIRED
  "similarityScore": "number between 0 and 100 representing relevance to the new project based on historical data", // REQUIRED
  "frequency": "number between 0 and 100 representing how common this type of prediction is in the historical data", // REQUIRED
  "sourceProject": "${projectData.projectName}", // REQUIRED: Use the new project name as source
  "status": "pending", // REQUIRED: Default status
  "estimatedTime": number, // REQUIRED: Estimated time in hours. It is crucial that this field is accurately predicted and included for each item, as this information is essential for the frontend display.

  // Fields for User Stories (include only if type is 'user-story')
  "acceptanceCriteria": string[], // REQUIRED: List of acceptance criteria
  "dependencies": string[], // REQUIRED: List of dependencies (e.g., IDs of other stories/bugs)
  "assumptions": string[], // REQUIRED: List of assumptions
  "edgeCases": string[], // REQUIRED: List of edge cases
  "nonFunctionalRequirements": string, // REQUIRED: Text field for non-functional requirements
  "visuals": string[], // REQUIRED: List of URLs or references to visuals/mockups
  "dataRequirements": string, // REQUIRED: Text field for data requirements
  "impact": string, // REQUIRED: Text field for impact
  "priority": "Low" | "Medium" | "High" | "Critical", // REQUIRED: Priority level


  // Fields for Bug Details (include only if type is 'bug')
  "stepsToReproduce": string[], // REQUIRED: List of steps to reproduce
  "actualResult": string, // REQUIRED: Text field for actual result
  "expectedResult": string, // REQUIRED: Text field for expected result
  "environment": string, // REQUIRED: Text field for environment details
  "userAccountDetails": string, // REQUIRED: Text field for user/account details (non-sensitive)
  "screenshotsVideos": string[], // REQUIRED: List of URLs or references to screenshots/videos
  "errorMessagesLogs": string, // REQUIRED: Text field for error messages/logs
  "frequencyOfOccurrence": "Consistent" | "Intermittent" | "Rare", // REQUIRED: Frequency of occurrence
  "severity": "Cosmetic" | "Minor" | "Major" | "Blocking", // REQUIRED: Severity level
  "workaround": string, // REQUIRED: Text field for workaround
  "relatedIssues": string[] // REQUIRED: List of related issue IDs
}

Ensure the JSON is valid and can be directly parsed. Generate at least 3 user stories and 2 bugs that are relevant to the new project based on its characteristics and the provided historical data.`;

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
      // Attempt to parse the JSON response, handling potential surrounding text or markdown
      let predictions: Prediction[] = [];
      let jsonString = '';
      const startIndex = text.indexOf('[');
      const endIndex = text.lastIndexOf(']');

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsonString = text.substring(startIndex, endIndex + 1);
      } else {
        console.error(
          'Could not find valid JSON array in AI response. Raw text:',
          text,
        );
        throw new InternalServerErrorException(
          'AI response did not contain a valid JSON array.',
        );
      }

      // Remove all non-ASCII characters from the extracted JSON string
      // Remove all non-ASCII characters from the extracted JSON string
      let cleanedJsonString = jsonString;

      // Remove markdown code block fences at the start and end
      cleanedJsonString = cleanedJsonString.replace(/^[\s]*```json[\s]*/, '');
      cleanedJsonString = cleanedJsonString.replace(/^[\s]*```[\s]*/, '');
      cleanedJsonString = cleanedJsonString.replace(/[\s]*```[\s]*$/, '');

      // Remove all non-ASCII characters from the extracted JSON string
      cleanedJsonString = cleanedJsonString.replace(/[^\x00-\x7F]/g, '');

      // Remove trailing commas before closing brackets or braces
      cleanedJsonString = cleanedJsonString.replace(/,\s*([\]}])/g, '$1');

      try {
        predictions = JSON.parse(cleanedJsonString);
        console.log(
          'Successfully parsed JSON string after cleaning:',
          cleanedJsonString,
        );
      } catch (parseError) {
        console.error(
          'Failed to parse extracted and cleaned JSON string:',
          parseError,
          'Extracted string:',
          jsonString,
          'Cleaned string (after targeted cleaning):',
          cleanedJsonString,
          'Raw text:',
          text,
        );
        throw new InternalServerErrorException(
          'Failed to parse predictions from AI response after cleaning.',
        );
      }
      // Assign unique IDs if not provided by the API and ensure sourceProject is set
      predictions = predictions.map((pred: any, index: number) => ({
        id:
          pred.id ||
          `${projectData.projectName}-${pred.type}-${index}-${Date.now()}`, // Generate a unique ID if missing
        type: pred.type, // REQUIRED
        title: pred.title || '', // REQUIRED: Provide default empty string
        description: pred.description || '', // REQUIRED: Provide default empty string
        similarityScore: pred.similarityScore ?? 0, // REQUIRED: Provide default 0 for number
        frequency: pred.frequency ?? 0, // REQUIRED: Provide default 0 for number
        sourceProject: pred.sourceProject || projectData.projectName, // REQUIRED: Ensure sourceProject is set
        status: pred.status || 'pending', // REQUIRED: Ensure status is set, default to 'pending'
        estimatedTime: pred.estimatedTime ?? 0, // REQUIRED: Provide default 0 for number

        // Fields for User Stories (include only if type is 'user-story')
        acceptanceCriteria: pred.acceptanceCriteria || [], // REQUIRED: Provide default empty array
        dependencies: pred.dependencies || [], // REQUIRED: Provide default empty array
        assumptions: pred.assumptions || [], // REQUIRED: Provide default empty array
        edgeCases: pred.edgeCases || [], // REQUIRED: Provide default empty array
        nonFunctionalRequirements: pred.nonFunctionalRequirements || '', // REQUIRED: Provide default empty string
        visuals: pred.visuals || [], // REQUIRED: Provide default empty array
        dataRequirements: pred.dataRequirements || '', // REQUIRED: Provide default empty string
        impact: pred.impact || '', // REQUIRED: Provide default empty string
        priority: pred.priority || 'Low', // REQUIRED: Provide default 'Low'

        // Fields for Bug Details (include only if type is 'bug')
        stepsToReproduce: pred.stepsToReproduce || [], // REQUIRED: Provide default empty array
        actualResult: pred.actualResult || '', // REQUIRED: Provide default empty string
        expectedResult: pred.expectedResult || '', // REQUIRED: Provide default empty string
        environment: pred.environment || '', // REQUIRED: Provide default empty string
        userAccountDetails: pred.userAccountDetails || '', // REQUIRED: Provide default empty string
        screenshotsVideos: pred.screenshotsVideos || [], // REQUIRED: Provide default empty array
        errorMessagesLogs: pred.errorMessagesLogs || '', // REQUIRED: Provide default empty string
        frequencyOfOccurrence: pred.frequencyOfOccurrence || 'Consistent', // REQUIRED: Provide default 'Consistent'
        severity: pred.severity || 'Minor', // REQUIRED: Provide default 'Minor'
        workaround: pred.workaround || '', // REQUIRED: Provide default empty string
        relatedIssues: pred.relatedIssues || [], // REQUIRED: Provide default empty array
      }));

      // Update project status to 'completed' after successful generation
      this.projectsService.updateProjectStatus(projectId, 'completed');

      return predictions;
    } catch (error) {
      console.error('Error calling OpenRouter API:', error);
      // Consider updating status to an error state if needed
      this.projectsService.updateProjectStatus(projectId, 'new'); // Revert to 'new' on error
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
