import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto'; // Import the crypto module
import OpenAI from 'openai';
import { SupabaseService } from '../supabase/supabase.service';

import { Prediction } from '../models/prediction.model';
import { SupabaseMapper } from '../supabase/supabase-mapper'; // Import the mapper

import {
  PredictionReview,
  PredictionReviewsService,
} from 'src/prediction-reviews/prediction-reviews/prediction-reviews.service';
import { ProjectsService } from '../projects/projects.service'; // Corrected import path

@Injectable()
export class PredictionsService {
  private openai: OpenAI;
  private supabase: SupabaseClient;
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly projectsService: ProjectsService, // Inject ProjectsService
    private readonly predictionReviewsService: PredictionReviewsService, // Inject PredictionReviewsService
    private readonly supabaseService: SupabaseService, // Inject SupabaseService
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

    this.supabase = this.supabaseService.getClient();
  }

  async generatePredictions(
    projectData: any,
    projectId: string,
  ): Promise<Prediction[]> {
    console.log(
      `Generating predictions for project ID: ${projectId}`,
      projectData,
    );

    // Update project status to 'predicting'
    // Ensure projectsService.updateProjectStatus is awaited if it's async
    await this.projectsService.updateProjectStatus(projectId, 'predicting');

    // Fetch historical data
    // Ensure projectsService.findAll is awaited if it's async
    const allProjects = await this.projectsService.findAll();
    let allPredictionReviews: PredictionReview[] = [];
    try {
      // Ensure predictionReviewsService.getPredictionReviews is awaited
      allPredictionReviews =
        (await this.predictionReviewsService.getPredictionReviews()) || [];
    } catch (error: any) {
      // Catch error as any to access message property
      console.error(
        'Error fetching historical prediction reviews:',
        error.message,
      );
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
    const prompt = `YOUR RESPONSE MUST BE A VALID JSON ARRAY. DO NOT INCLUDE ANY INTRODUCTORY OR CONCLUDING TEXT, EXPLANATIONS, OR MARKDOWN FORMATTING. SPECIFICALLY, DO NOT INCLUDE \`\`\`json\` OR \`\`\` AT THE BEGINNING OR END OF THE RESPONSE. PROVIDE ONLY THE JSON ARRAY.

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

Ensure the JSON is valid and can be directly parsed. Generate all relevant potential user stories and bugs for the new project based on its characteristics and the provided historical data.`;

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

      let predictions: Prediction[] = [];
      let cleanedJsonString = text;

      // Remove markdown code block fences and any surrounding whitespace
      cleanedJsonString = cleanedJsonString.replace(
        /^[\s]*```(?:json)?[\s]*/,
        '',
      );
      cleanedJsonString = cleanedJsonString.replace(/[\s]*```[\s]*$/, '');

      // Find the first '[' and last ']' to extract the core JSON array
      const startIndex = cleanedJsonString.indexOf('[');
      const endIndex = cleanedJsonString.lastIndexOf(']');

      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        this.logger.error(
          'Could not find valid JSON array structure in AI response after initial cleaning. Raw text:',
          text,
        );
        throw new InternalServerErrorException(
          'AI response did not contain a valid JSON array.',
        );
      }

      // Extract the substring containing the JSON array
      cleanedJsonString = cleanedJsonString.substring(startIndex, endIndex + 1);

      // Remove all non-printable ASCII characters except common whitespace (tabs, newlines, carriage returns)
      cleanedJsonString = cleanedJsonString.replace(
        /[^\x20-\x7E\x09\x0A\x0D]/g,
        '',
      );

      // Remove trailing commas within arrays or objects
      // This regex looks for a comma followed by optional whitespace and then a closing bracket or brace,
      // ensuring it's not part of a string value.
      cleanedJsonString = cleanedJsonString.replace(/,\s*([\]}])/g, '$1');
      // Add an extra step to specifically target trailing commas within arrays that might be missed
      cleanedJsonString = cleanedJsonString.replace(/,\s*\]/g, ']');

      // Remove leading/trailing whitespace
      cleanedJsonString = cleanedJsonString.trim();

      // Log the cleaned string before parsing for debugging
      this.logger.debug(
        `Attempting to parse cleaned JSON string: ${cleanedJsonString}`,
      );

      try {
        predictions = JSON.parse(cleanedJsonString);
        this.logger.log('Successfully parsed JSON string after cleaning.', {
          cleanedString: cleanedJsonString,
        });
      } catch (parseError: any) {
        this.logger.warn(
          `Initial parsing of cleaned JSON string failed. Attempting LLM-based cleanup. Error: ${parseError.message}`,
          {
            extractedString: text,
            cleanedString: cleanedJsonString,
            rawText: text,
            parseErrorMessage: parseError.message,
          },
        );

        let cleanupAttempts = 0;
        const maxCleanupAttempts = 20;
        let lastCleanupError: any = parseError;
        let cleanedText: string | null = cleanedJsonString; // Start with the initially cleaned string

        while (cleanupAttempts < maxCleanupAttempts) {
          cleanupAttempts++;
          this.logger.debug(
            `Attempting LLM cleanup (Attempt ${cleanupAttempts}/${maxCleanupAttempts})`,
          );

          const cleanupPrompt = `The following text failed to parse as a JSON array after initial cleaning. It was intended to be a JSON array of objects following the structure provided below. Your task is to correct any syntax errors, missing commas, incorrect formatting, or extraneous characters to produce a VALID JSON array.

Provide ONLY the corrected JSON array. DO NOT include any introductory or concluding text, explanations, or markdown formatting (like \`\`\`json\` or \`\`\`). The output must be a directly parseable JSON array.

Previous parsing error: ${lastCleanupError.message}

Expected JSON structure (each object in the array should follow this):
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

Text to clean and format:
${cleanedText}
`;

          try {
            const cleanupCompletion = await this.openai.chat.completions.create(
              {
                model: 'google/gemini-2.5-flash-preview:thinking', // Use the specified OpenRouter model
                messages: [
                  {
                    role: 'user',
                    content: cleanupPrompt,
                  },
                ],
              },
            );

            cleanedText = cleanupCompletion.choices[0].message.content;
            this.logger.debug(
              `LLM cleanup response text (Attempt ${cleanupAttempts}): ${cleanedText}`,
            );

            if (cleanedText === null) {
              this.logger.error(
                `LLM cleanup response content was null (Attempt ${cleanupAttempts}).`,
              );
              lastCleanupError = new Error(
                'LLM cleanup response content was null.',
              );
              continue; // Continue to the next attempt
            }

            // Attempt to parse the cleaned text from the LLM
            predictions = JSON.parse(cleanedText);
            this.logger.debug(
              `Successfully parsed JSON string after LLM cleanup (Attempt ${cleanupAttempts}).`,
            );
            break; // Exit the loop if parsing is successful
          } catch (cleanupError: any) {
            // Catch cleanupError as any to access message
            this.logger.warn(
              `LLM cleanup failed or the cleaned text is still not valid JSON (Attempt ${cleanupAttempts}): ${cleanupError.message}`,
              {
                rawText: text,
                initialCleanedString: cleanedJsonString,
                cleanupErrorMessage: cleanupError.message,
              },
            );
            lastCleanupError = cleanupError; // Update the last error for the next prompt
            // Continue to the next attempt
          }
        }

        // If after max attempts, parsing is still not successful, throw a final error
        if (cleanupAttempts === maxCleanupAttempts) {
          this.logger.error(
            `Failed to parse predictions after ${maxCleanupAttempts} LLM cleanup attempts. Last error: ${lastCleanupError.message}. Unparseable text:`,
            {
              finalCleanedText: cleanedText,
              cleanupErrorMessage: lastCleanupError.message,
            },
          );
          throw new InternalServerErrorException(
            `Failed to parse predictions from AI response after ${maxCleanupAttempts} LLM cleanup attempts.`,
          );
        }
      }
      // Assign unique database IDs (UUIDs) and map AI-generated IDs
      predictions = predictions.map((pred: any) => ({
        id: crypto.randomUUID(), // Generate a unique UUID for the database primary key
        aiGeneratedId: pred.id || '', // Store the AI-generated ID in the new field
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
        dependencies: pred.dependencies || [], // REQUIRED: List of dependencies (e.g., IDs of other stories/bugs)
        assumptions: pred.assumptions || [], // REQUIRED: List of assumptions
        edgeCases: pred.edgeCases || [], // REQUIRED: List of edge cases
        nonFunctionalRequirements: pred.nonFunctionalRequirements || '', // REQUIRED: Text field for non-functional requirements
        visuals: pred.visuals || [], // REQUIRED: List of URLs or references to visuals/mockups
        dataRequirements: pred.dataRequirements || '', // REQUIRED: Text field for data requirements
        impact: pred.impact || '', // REQUIRED: Text field for impact
        priority: pred.priority || 'Low', // REQUIRED: Provide default 'Low'

        // Fields for Bug Details (include only if type is 'bug')
        stepsToReproduce: pred.stepsToReproduce || [], // REQUIRED: List of steps to reproduce
        actualResult: pred.actualResult || '', // REQUIRED: Provide default empty string
        expectedResult: pred.expectedResult || '', // REQUIRED: Provide default empty string
        environment: pred.environment || '', // REQUIRED: Text field for environment details
        userAccountDetails: pred.userAccountDetails || '', // REQUIRED: Text field for user/account details (non-sensitive)
        screenshotsVideos: pred.screenshotsVideos || [], // REQUIRED: List of URLs or references to screenshots/videos
        errorMessagesLogs: pred.errorMessagesLogs || '', // REQUIRED: Provide default empty string
        frequencyOfOccurrence: pred.frequencyOfOccurrence || 'Consistent', // REQUIRED: Provide default 'Consistent'
        severity: pred.severity || 'Minor', // REQUIRED: Provide default 'Minor'
        workaround: pred.workaround || '', // REQUIRED: Text field for workaround
        relatedIssues: pred.relatedIssues || [], // REQUIRED: List of related issue IDs
      }));
      return predictions; // Return the generated predictions
    } catch (error: any) {
      // Catch error as any to access message property
      this.logger.error(
        'Error generating or saving predictions:',
        error.message,
        error.stack,
      );
      // Consider updating status to an error state if needed
      // Ensure projectsService.updateProjectStatus is awaited if it's async
      await this.projectsService.updateProjectStatus(projectId, 'new'); // Revert to 'new' on error
      throw new InternalServerErrorException(
        `Failed to generate or save predictions: ${error.message}`,
      );
    }
  }

  async generateAndSavePredictionReview(
    projectData: any, // Assuming projectData contains projectName and clientName
    projectId: string,
  ): Promise<PredictionReview> {
    try {
      // 1. Generate predictions
      const generatedPredictions = await this.generatePredictions(
        projectData,
        projectId,
      );

      // 2. Create CreatePredictionReviewDto
      const reviewDto: Omit<PredictionReview, 'id' | 'generatedAt'> = {
        projectId: projectId,
        projectName: projectData.name, // Assuming name is in projectData
        clientName: projectData.client, // Assuming client is in projectData
        predictions: generatedPredictions,
      };

      // 3. Save the prediction review and link predictions
      const savedReview =
        await this.predictionReviewsService.addPredictionReview(reviewDto);

      return savedReview;
    } catch (error: any) {
      this.logger.error(
        'Error generating and saving prediction review:',
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to generate and save prediction review: ${error.message}`,
      );
    }
  }

  // Keep existing methods for feedback and history
  async sendFeedback(feedbackData: any): Promise<any> {
    // In a real application, this would send feedback to the prediction model or save to DB.
    console.log('Feedback received:', feedbackData);
    // If you want to save feedback to Supabase:
    // const { data, error } = await this.supabase.from('feedback').insert([feedbackData]);
    // if (error) {
    //   console.error('Error saving feedback:', error.message);
    //   throw new InternalServerErrorException(`Failed to save feedback: ${error.message}`);
    // }
    return { success: true };
  }

  async getPredictionHistory(projectId: string): Promise<Prediction[]> {
    console.log(`Fetching prediction history for project ID: ${projectId}`);
    const { data, error } = await this.supabase
      .from('predictions')
      .select('*')
      .eq('project_id', projectId); // Fetch predictions linked to the project ID

    if (error) {
      this.logger.error(
        `Error fetching prediction history from Supabase: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch prediction history: ${error.message}`,
      );
    }

    // Map the fetched data using the SupabaseMapper
    return data
      ? data.map((item) => SupabaseMapper.fromSupabasePrediction(item))
      : [];
  }
}
