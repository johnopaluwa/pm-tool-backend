import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto'; // Import the crypto module
import OpenAI from 'openai'; // Import OpenAI
import { PredictionReviewsService } from '../prediction-reviews/prediction-reviews/prediction-reviews.service'; // Import PredictionReviewsService for types
import { ProjectsService } from '../projects/projects.service'; // Import ProjectsService for types
import { SupabaseMapper } from '../supabase/supabase-mapper'; // Import the mapper
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReportsService {
  private openai: OpenAI; // Add openai property
  private supabase: SupabaseClient;
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly projectsService: ProjectsService, // Keep for type hinting if needed, though direct Supabase calls are preferred
    private readonly predictionReviewsService: PredictionReviewsService, // Keep for type hinting if needed
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

  /**
   * Generates overall reports using an LLM.
   * This method fetches necessary data and sends it to a placeholder LLM integration.
   * TODO: Replace placeholder LLM integration with actual LLM API calls.
   */
  async generateOverallReports(): Promise<{
    completionRate: number;
    statusDistribution: { [status: string]: number };
    projectTypeDistribution: { [type: string]: number };
    clientIndustryDistribution: { [industry: string]: number };
    teamSizeDistribution: { [size: string]: number };
    durationDistribution: { [duration: string]: number };
    totalPredictionsCount: number;
    averagePredictionsPerProject: number;
  }> {
    let llmResponse: {
      completionRate: number;
      statusDistribution: { [status: string]: number };
      projectTypeDistribution: { [type: string]: number };
      clientIndustryDistribution: { [industry: string]: number };
      teamSizeDistribution: { [size: string]: number };
      durationDistribution: { [duration: string]: number };
      totalPredictionsCount: number;
      averagePredictionsPerProject: number;
    };
    let completionRate: number = 0; // Initialize with default value
    let statusDistribution: { [status: string]: number } = {
      // Initialize with default distribution
      new: 0,
      predicting: 0,
      completed: 0,
    };
    let projectTypeDistribution: { [type: string]: number } = {};
    let clientIndustryDistribution: { [industry: string]: number } = {};
    let teamSizeDistribution: { [size: string]: number } = {};
    let durationDistribution: { [duration: string]: number } = {};
    let totalPredictionsCount: number = 0;
    let averagePredictionsPerProject: number = 0;

    this.logger.log('Starting overall report generation.'); // Log at the beginning

    try {
      // Fetch necessary data from Supabase
      const { data: projectsData, error: projectsError } = await this.supabase
        .from('projects')
        .select('*'); // Select all to use mapper

      if (projectsError) {
        this.logger.error(
          `Error fetching projects for overall reports from Supabase: ${projectsError.message}`,
          projectsError.stack,
        );
        throw new InternalServerErrorException(projectsError.message);
      }

      const projects = projectsData
        ? projectsData.map((item) => SupabaseMapper.fromSupabaseProject(item))
        : []; // Use mapper

      const { data: predictionsData, error: predictionsError } =
        await this.supabase.from('predictions').select('*'); // Select all predictions

      if (predictionsError) {
        this.logger.error(
          `Error fetching predictions for overall reports from Supabase: ${predictionsError.message}`,
          predictionsError.stack,
        );
        // Do not throw an error here, as we can still generate a report without predictions
      }

      const predictions = predictionsData
        ? predictionsData.map((item) =>
            SupabaseMapper.fromSupabasePrediction(item),
          )
        : []; // Use mapper

      // Prepare data for the LLM
      const dataForLlm = {
        projects: projects,
        predictions: predictions,
      };

      // Formulate the prompt for overall reports
      const overallReportPrompt = `YOUR RESPONSE MUST BE A VALID JSON OBJECT. DO NOT INCLUDE ANY INTRODUCTORY OR CONCLUDING TEXT, EXPLANATIONS, OR MARKDOWN FORMATTING. SPECIFICALLY, DO NOT INCLUDE \`\`\`json\` OR \`\`\` AT THE BEGINNING OR END OF THE RESPONSE. PROVIDE ONLY THE JSON OBJECT.

Analyze the following project and prediction data to generate a comprehensive overall report.

Project Data:
${JSON.stringify(projects, null, 2)}

Prediction Data:
${JSON.stringify(predictions, null, 2)}

Provide the output as a JSON object with the following structure:
{
  "completionRate": number, // Percentage of projects with status 'completed'
  "statusDistribution": { // Distribution of projects by status
    "new": number,
    "predicting": number,
    "completed": number
    // ... other project statuses if any
  },
  "projectTypeDistribution": { // Distribution of projects by projectType
    // e.g., "web": 5, "mobile": 3
  },
  "clientIndustryDistribution": { // Distribution of projects by clientIndustry
    // e.g., "finance": 2, "healthcare": 4
  },
  "teamSizeDistribution": { // Distribution of projects by teamSize
    // e.g., "small": 5, "medium": 3
  },
  "durationDistribution": { // Distribution of projects by duration
    // e.g., "short": 5, "medium": 3
  },
  "totalPredictionsCount": number, // Total number of predictions across all projects
  "averagePredictionsPerProject": number // Average number of predictions per project
}

Ensure the JSON is valid and can be directly parsed.`;

      this.logger.log('Calling LLM for overall reports...'); // Log before LLM call
      const completion = await this.openai.chat.completions.create({
        model: 'google/gemini-2.5-flash-preview:thinking', // Use the specified OpenRouter model
        messages: [
          {
            role: 'user',
            content: overallReportPrompt,
          },
        ],
      });

      const text = completion.choices[0].message.content;

      this.logger.log(
        'LLM call completed for overall reports. Response text:', // Log after LLM call
        text,
      );

      if (text === null) {
        throw new InternalServerErrorException(
          'AI response content was null for overall reports.',
        );
      }

      let cleanedJsonString = text;

      // Remove markdown code block fences and any surrounding whitespace
      cleanedJsonString = cleanedJsonString.replace(
        /^[\s]*```(?:json)?[\s]*/,
        '',
      );
      cleanedJsonString = cleanedJsonString.replace(/[\s]*```[\s]*$/, '');

      // Find the first '{' and last '}' to extract the core JSON object
      const startIndex = cleanedJsonString.indexOf('{');
      const endIndex = cleanedJsonString.lastIndexOf('}');

      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        this.logger.error(
          'Could not find valid JSON object structure in AI response for overall reports after initial cleaning. Raw text:',
          text,
        );
        throw new InternalServerErrorException(
          'AI response for overall reports did not contain a valid JSON object.',
        );
      }

      // Extract the substring containing the JSON object
      cleanedJsonString = cleanedJsonString.substring(startIndex, endIndex + 1);

      // Remove all non-printable ASCII characters except common whitespace (tabs, newlines, carriage returns)
      cleanedJsonString = cleanedJsonString.replace(
        /[^\x20-\x7E\x09\x0A\x0D]/g,
        '',
      );

      // Remove trailing commas within arrays or objects
      cleanedJsonString = cleanedJsonString.replace(/,\s*([\]}])/g, '$1');
      cleanedJsonString = cleanedJsonString.replace(/,\s*\]/g, ']'); // Specific for arrays

      // Remove leading/trailing whitespace
      cleanedJsonString = cleanedJsonString.trim();

      // Log the cleaned string before parsing for debugging
      this.logger.debug(
        `Attempting to parse cleaned JSON string for overall reports: ${cleanedJsonString}`,
      );

      try {
        llmResponse = JSON.parse(cleanedJsonString);
        this.logger.log(
          'Successfully parsed JSON string after cleaning for overall reports.',
          {
            cleanedString: cleanedJsonString,
          },
        );
        completionRate = llmResponse.completionRate;
        statusDistribution = llmResponse.statusDistribution;
        projectTypeDistribution = llmResponse.projectTypeDistribution;
        clientIndustryDistribution = llmResponse.clientIndustryDistribution;
        teamSizeDistribution = llmResponse.teamSizeDistribution;
        durationDistribution = llmResponse.durationDistribution;
        totalPredictionsCount = llmResponse.totalPredictionsCount;
        averagePredictionsPerProject = llmResponse.averagePredictionsPerProject;
      } catch (parseError: any) {
        this.logger.warn(
          `Initial parsing of cleaned JSON string failed for overall reports. Attempting LLM-based cleanup. Error: ${parseError.message}`,
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
            `Attempting LLM cleanup for overall reports (Attempt ${cleanupAttempts}/${maxCleanupAttempts})`,
          );

          const cleanupPrompt = `The following text failed to parse as a JSON object after initial cleaning. It was intended to be a JSON object following the structure provided below. Your task is to correct any syntax errors, missing commas, incorrect formatting, or extraneous characters to produce a VALID JSON object.

Provide ONLY the corrected JSON object. DO NOT include any introductory or concluding text, explanations, or markdown formatting (like \`\`\`json\` or \`\`\`). The output must be a directly parseable JSON object.

Previous parsing error: ${lastCleanupError.message}

Expected JSON structure:
{
  "completionRate": number, // Percentage of projects with status 'completed'
  "statusDistribution": { // Distribution of projects by status
    "new": number,
    "predicting": number,
    "completed": number,
    // ... other statuses if any
  },
  "projectTypeDistribution": { // Distribution of projects by projectType
    // e.g., "web": 5, "mobile": 3
  },
  "clientIndustryDistribution": { // Distribution of projects by clientIndustry
    // e.g., "finance": 2, "healthcare": 4
  },
  "teamSizeDistribution": { // Distribution of projects by teamSize
    // e.g., "small": 5, "medium": 3
  },
  "durationDistribution": { // Distribution of projects by duration
    // e.g., "short": 5, "medium": 3
  },
  "totalPredictionsCount": number, // Total number of predictions across all projects
  "averagePredictionsPerProject": number // Average number of predictions per project
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
              `LLM cleanup response text for overall reports (Attempt ${cleanupAttempts}): ${cleanedText}`,
            );

            if (cleanedText === null) {
              this.logger.error(
                `LLM cleanup response content was null for overall reports (Attempt ${cleanupAttempts}).`,
              );
              lastCleanupError = new Error(
                'LLM cleanup response content was null for overall reports.',
              );
              continue; // Continue to the next attempt
            }

            // Attempt to parse the cleaned text from the LLM
            llmResponse = JSON.parse(cleanedText);
            this.logger.debug(
              `Successfully parsed JSON string after LLM cleanup for overall reports (Attempt ${cleanupAttempts}).`,
            );
            completionRate = llmResponse.completionRate;
            statusDistribution = llmResponse.statusDistribution;
            projectTypeDistribution = llmResponse.projectTypeDistribution;
            clientIndustryDistribution = llmResponse.clientIndustryDistribution;
            teamSizeDistribution = llmResponse.teamSizeDistribution;
            durationDistribution = llmResponse.durationDistribution;
            totalPredictionsCount = llmResponse.totalPredictionsCount;
            averagePredictionsPerProject =
              llmResponse.averagePredictionsPerProject;
            break; // Exit the loop if parsing is successful
          } catch (cleanupError: any) {
            this.logger.warn(
              `LLM cleanup failed or the cleaned text is still not valid JSON for overall reports (Attempt ${cleanupAttempts}): ${cleanupError.message}`,
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
            `Failed to parse overall reports after ${maxCleanupAttempts} LLM cleanup attempts. Last error: ${lastCleanupError.message}. Unparseable text:`,
            {
              finalCleanedText: cleanedText,
              cleanupErrorMessage: lastCleanupError.message,
            },
          );
          throw new InternalServerErrorException(
            `Failed to parse overall reports from AI response after ${maxCleanupAttempts} LLM cleanup attempts.`,
          );
        }
      }

      const newReportId = crypto.randomUUID(); // Generate UUID for overall report

      // Persist overall report data
      const { data: insertedOverallReport, error: insertOverallError } =
        await this.supabase
          .from('reports')
          .insert([
            {
              id: newReportId, // Include the generated ID
              completion_rate: completionRate,
              status_distribution: statusDistribution,
              project_type_distribution: projectTypeDistribution,
              client_industry_distribution: clientIndustryDistribution,
              team_size_distribution: teamSizeDistribution,
              duration_distribution: durationDistribution,
              total_predictions_count: totalPredictionsCount,
              average_predictions_per_project: averagePredictionsPerProject,
              project_id: null, // Overall report is not linked to a specific project
            },
          ])
          .select('*')
          .single();

      if (insertOverallError) {
        this.logger.error(
          `Error inserting overall report into Supabase: ${insertOverallError.message}`,
          insertOverallError.stack,
        );
        // Do not throw an error here, just log it, as the report was generated
      }

      console.log('Overall reports generated and persisted.');
      return {
        completionRate,
        statusDistribution,
        projectTypeDistribution,
        clientIndustryDistribution,
        teamSizeDistribution,
        durationDistribution,
        totalPredictionsCount,
        averagePredictionsPerProject,
      };
    } catch (error: any) {
      this.logger.error(
        'Error during overall report generation:', // Log in catch block
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to generate overall reports: ${error.message}`,
      );
    }
  }

  /**
   * Generates project-specific reports using an LLM.
   * This method fetches necessary data and sends it to a placeholder LLM integration.
   * TODO: Replace placeholder LLM integration with actual LLM API calls.
   */
  async generateProjectReports(projectId: string): Promise<{
    predictionsCount: number;
    predictionTypeDistribution: { [type: string]: number };
    predictionStatusDistribution: { [status: string]: number };
    predictionPriorityDistribution: { [priority: string]: number };
    predictionSeverityDistribution: { [severity: string]: number };
    averageEstimatedTime: number;
    topKeywords: string[];
    techStackList: string[];
  }> {
    let llmResponse: {
      predictionsCount: number;
      predictionTypeDistribution: { [type: string]: number };
      predictionStatusDistribution: { [status: string]: number };
      predictionPriorityDistribution: { [priority: string]: number };
      predictionSeverityDistribution: { [severity: string]: number };
      averageEstimatedTime: number;
      topKeywords: string[];
      techStackList: string[];
    };
    let predictionsCount: number = 0; // Initialize with default value
    let predictionTypeDistribution: { [type: string]: number } = {
      // Initialize with default distribution
      'user-story': 0,
      bug: 0,
    };
    let predictionStatusDistribution: { [status: string]: number } = {};
    let predictionPriorityDistribution: { [priority: string]: number } = {};
    let predictionSeverityDistribution: { [severity: string]: number } = {};
    let averageEstimatedTime: number = 0;
    let topKeywords: string[] = [];
    let techStackList: string[] = [];

    try {
      // Fetch necessary data from Supabase
      const { data: projectData, error: projectError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        this.logger.error(
          `Error fetching project ${projectId} for project reports from Supabase: ${projectError.message}`,
          projectError.stack,
        );
        throw new InternalServerErrorException(projectError.message);
      }

      const project = projectData
        ? SupabaseMapper.fromSupabaseProject(projectData)
        : null;

      if (!project) {
        throw new InternalServerErrorException(
          `Project with ID ${projectId} not found.`,
        );
      }

      const { data: predictionsData, error: predictionsError } =
        await this.supabase
          .from('predictions')
          .select('*, prediction_reviews!inner(projectId)') // Select predictions columns and join with prediction_reviews to get projectId
          .eq('prediction_reviews.projectId', projectId); // Filter by projectId from prediction_reviews

      if (predictionsError) {
        this.logger.error(
          `Error fetching predictions for project reports from Supabase: ${predictionsError.message}`,
          predictionsError.stack,
        );
        // Do not throw an error here, as we can still generate a report without predictions
      }

      const predictions = predictionsData
        ? predictionsData.map((item) =>
            SupabaseMapper.fromSupabasePrediction(item),
          )
        : []; // Use mapper

      // Prepare data for the LLM
      const dataForLlm = {
        project: project,
        predictions: predictions,
      };

      // Formulate the prompt for project reports
      const projectReportPrompt = `YOUR RESPONSE MUST BE A VALID JSON OBJECT. DO NOT INCLUDE ANY INTRODUCTORY OR CONCLUDING TEXT, EXPLANATIONS, OR MARKDOWN FORMATTING. SPECIFICALLY, DO NOT INCLUDE \`\`\`json\` OR \`\`\` AT THE BEGINNING OR END OF THE RESPONSE. PROVIDE ONLY THE JSON OBJECT.

Analyze the following project and prediction data for project ID "${projectId}" to generate a comprehensive project-specific report.

Project Data:
${JSON.stringify(project, null, 2)}

Prediction Data:
${JSON.stringify(predictions, null, 2)}

Provide the output as a JSON object with the following structure:
{
  "predictionsCount": number, // Total number of predictions for this project
  "predictionTypeDistribution": { // Distribution of prediction types
    "user-story": number,
    "bug": number
    // ... other prediction types if any
  },
  "predictionStatusDistribution": { // Distribution of predictions by status
    // e.g., "new": 5, "in-progress": 3
  },
  "predictionPriorityDistribution": { // Distribution of predictions by priority
    // e.g., "high": 2, "medium": 4
  },
  "predictionSeverityDistribution": { // Distribution of predictions by severity
    // e.g., "critical": 1, "major": 3
  },
  "averageEstimatedTime": number, // Average estimatedTime for predictions
  "topKeywords": string[], // List of top keywords from project keywords
  "techStackList": string[] // List of technologies from project techStack
}

Ensure the JSON is valid and can be directly parsed.`;

      this.logger.log(
        `Calling LLM for project reports for project ${projectId}...`,
      );
      const completion = await this.openai.chat.completions.create({
        model: 'google/gemini-2.5-flash-preview:thinking', // Use the specified OpenRouter model
        messages: [
          {
            role: 'user',
            content: projectReportPrompt,
          },
        ],
      });

      const text = completion.choices[0].message.content;

      this.logger.log(
        `OpenRouter API response text for project reports for project ${projectId}:`,
        text,
      );

      if (text === null) {
        throw new InternalServerErrorException(
          `AI response content was null for project reports for project ${projectId}.`,
        );
      }

      let cleanedJsonString = text;

      // Remove markdown code block fences and any surrounding whitespace
      cleanedJsonString = cleanedJsonString.replace(
        /^[\s]*```(?:json)?[\s]*/,
        '',
      );
      cleanedJsonString = cleanedJsonString.replace(/[\s]*```[\s]*$/, '');

      // Find the first '{' and last '}' to extract the core JSON object
      const startIndex = cleanedJsonString.indexOf('{');
      const endIndex = cleanedJsonString.lastIndexOf('}');

      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        this.logger.error(
          `Could not find valid JSON object structure in AI response for project reports for project ${projectId} after initial cleaning. Raw text:`,
          text,
        );
        throw new InternalServerErrorException(
          `AI response for project reports for project ${projectId} did not contain a valid JSON object.`,
        );
      }

      // Extract the substring containing the JSON object
      cleanedJsonString = cleanedJsonString.substring(startIndex, endIndex + 1);

      // Remove all non-printable ASCII characters except common whitespace (tabs, newlines, carriage returns)
      cleanedJsonString = cleanedJsonString.replace(
        /[^\x20-\x7E\x09\x0A\x0D]/g,
        '',
      );

      // Remove trailing commas within arrays or objects
      cleanedJsonString = cleanedJsonString.replace(/,\s*([\]}])/g, '$1');
      cleanedJsonString = cleanedJsonString.replace(/,\s*\]/g, ']'); // Specific for arrays

      // Remove leading/trailing whitespace
      cleanedJsonString = cleanedJsonString.trim();

      // Log the cleaned string before parsing for debugging
      this.logger.debug(
        `Attempting to parse cleaned JSON string for project reports for project ${projectId}: ${cleanedJsonString}`,
      );

      try {
        llmResponse = JSON.parse(cleanedJsonString);
        this.logger.log(
          `Successfully parsed JSON string after cleaning for project reports for project ${projectId}.`,
          {
            cleanedString: cleanedJsonString,
          },
        );
        predictionsCount = llmResponse.predictionsCount;
        predictionTypeDistribution = llmResponse.predictionTypeDistribution;
        predictionStatusDistribution = llmResponse.predictionStatusDistribution;
        predictionPriorityDistribution =
          llmResponse.predictionPriorityDistribution;
        predictionSeverityDistribution =
          llmResponse.predictionSeverityDistribution;
        averageEstimatedTime = llmResponse.averageEstimatedTime;
        topKeywords = llmResponse.topKeywords;
        techStackList = llmResponse.techStackList;
      } catch (parseError: any) {
        this.logger.warn(
          `Initial parsing of cleaned JSON string failed for project reports for project ${projectId}. Attempting LLM-based cleanup. Error: ${parseError.message}`,
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
            `Attempting LLM cleanup for project reports for project ${projectId} (Attempt ${cleanupAttempts}/${maxCleanupAttempts})`,
          );

          const cleanupPrompt = `The following text failed to parse as a JSON object after initial cleaning. It was intended to be a JSON object following the structure provided below. Your task is to correct any syntax errors, missing commas, incorrect formatting, or extraneous characters to produce a VALID JSON object.

Provide ONLY the corrected JSON object. DO NOT include any introductory or concluding text, explanations, or markdown formatting (like \`\`\`json\` or \`\`\`). The output must be a directly parseable JSON object.

Previous parsing error: ${lastCleanupError.message}

Expected JSON structure:
{
  "predictionsCount": number, // Total number of predictions for this project
  "predictionTypeDistribution": { // Distribution of prediction types
    "user-story": number,
    "bug": number
    // ... other prediction types if any
  },
  "predictionStatusDistribution": { // Distribution of predictions by status
    // e.g., "new": 5, "in-progress": 3
  },
  "predictionPriorityDistribution": { // Distribution of predictions by priority
    // e.g., "high": 2, "medium": 4
  },
  "predictionSeverityDistribution": { // Distribution of predictions by severity
    // e.g., "critical": 1, "major": 3
  },
  "averageEstimatedTime": number, // Average estimatedTime for predictions
  "topKeywords": string[], // List of top keywords from project keywords
  "techStackList": string[] // List of technologies from project techStack
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
              `LLM cleanup response text for project reports for project ${projectId} (Attempt ${cleanupAttempts}): ${cleanedText}`,
            );

            if (cleanedText === null) {
              this.logger.error(
                `LLM cleanup response content was null for project reports for project ${projectId} (Attempt ${cleanupAttempts}).`,
              );
              lastCleanupError = new Error(
                'LLM cleanup response content was null for project reports for project.',
              );
              continue; // Continue to the next attempt
            }

            // Attempt to parse the cleaned text from the LLM
            llmResponse = JSON.parse(cleanedText);
            this.logger.debug(
              `Successfully parsed JSON string after LLM cleanup for project reports for project ${projectId} (Attempt ${cleanupAttempts}).`,
            );
            predictionsCount = llmResponse.predictionsCount;
            predictionTypeDistribution = llmResponse.predictionTypeDistribution;
            predictionStatusDistribution =
              llmResponse.predictionStatusDistribution;
            predictionPriorityDistribution =
              llmResponse.predictionPriorityDistribution;
            predictionSeverityDistribution =
              llmResponse.predictionSeverityDistribution;
            averageEstimatedTime = llmResponse.averageEstimatedTime;
            topKeywords = llmResponse.topKeywords;
            techStackList = llmResponse.techStackList;
            break; // Exit the loop if parsing is successful
          } catch (cleanupError: any) {
            this.logger.warn(
              `LLM cleanup failed or the cleaned text is still not valid JSON for project reports for project ${projectId} (Attempt ${cleanupAttempts}): ${cleanupError.message}`,
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
            `Failed to parse project reports for project ${projectId} after ${maxCleanupAttempts} LLM cleanup attempts. Last error: ${lastCleanupError.message}. Unparseable text:`,
            {
              finalCleanedText: cleanedText,
              cleanupErrorMessage: lastCleanupError.message,
            },
          );
          throw new InternalServerErrorException(
            `Failed to parse project reports for project ${projectId} from AI response after ${maxCleanupAttempts} LLM cleanup attempts.`,
          );
        }
      }

      const newReportId = crypto.randomUUID(); // Generate UUID for project report

      // Persist project report data
      const { data: insertedProjectReport, error: insertProjectError } =
        await this.supabase
          .from('reports')
          .insert([
            {
              id: newReportId, // Include the generated ID
              project_id: projectId, // Link to the project
              predictions_count: predictionsCount,
              prediction_type_distribution: predictionTypeDistribution,
              prediction_status_distribution: predictionStatusDistribution,
              prediction_priority_distribution: predictionPriorityDistribution,
              prediction_severity_distribution: predictionSeverityDistribution,
              average_estimated_time: averageEstimatedTime,
              top_keywords: topKeywords,
              tech_stack_list: techStackList,
            },
          ])
          .select('*')
          .single();

      if (insertProjectError) {
        this.logger.error(
          `Error inserting project report for project ${projectId} into Supabase: ${insertProjectError.message}`,
          insertProjectError.stack,
        );
        // Do not throw an error here, just log it, as the report was generated
      }

      console.log(
        `Project reports generated and persisted for project ${projectId}.`,
      );

      // Generate overall reports after project report is generated
      await this.generateOverallReports();
      this.logger.log(
        'Overall reports regenerated after project report generation.',
      );

      // Mark the project as having a generated report
      await this.projectsService.markReportGenerated(projectId);
      return {
        predictionsCount,
        predictionTypeDistribution,
        predictionStatusDistribution,
        predictionPriorityDistribution,
        predictionSeverityDistribution,
        averageEstimatedTime,
        topKeywords,
        techStackList,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to generate project reports for project ${projectId}:`,
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to generate project reports for project ${projectId}: ${error.message}`,
      );
    }
  }

  async getOverallReport(): Promise<any | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('reports')
        .select('*')
        .is('project_id', null) // Filter for overall reports
        .order('created_at', { ascending: false })
        .limit(1) // Get the latest overall report
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found
        this.logger.error(
          `Error fetching overall report from Supabase: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(error.message);
      }

      return data; // Returns undefined if no rows found
    } catch (error: any) {
      this.logger.error(
        'Failed to fetch overall report:',
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch overall report: ${error.message}`,
      );
    }
  }

  async getProjectReport(projectId: string): Promise<any | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('reports')
        .select('*')
        .eq('project_id', projectId) // Filter for project-specific reports
        .order('created_at', { ascending: false })
        .limit(1) // Get the latest report for this project
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found
        this.logger.error(
          `Error fetching project report for project ${projectId} from Supabase: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(error.message);
      }

      return data; // Returns undefined if no rows found
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch project report for project ${projectId}:`,
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch project report for project ${projectId}: ${error.message}`,
      );
    }
  }
}
