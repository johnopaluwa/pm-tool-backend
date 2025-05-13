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
  }> {
    let llmResponse: {
      completionRate: number;
      statusDistribution: { [status: string]: number };
    };
    let completionRate: number = 0; // Initialize with default value
    let statusDistribution: { [status: string]: number } = {
      // Initialize with default distribution
      new: 0,
      predicting: 0,
      completed: 0,
    };

    try {
      // Fetch necessary data from Supabase
      const { data: projectsData, error } = await this.supabase
        .from('projects')
        .select('*'); // Select all to use mapper

      if (error) {
        this.logger.error(
          `Error fetching projects for overall reports from Supabase: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(error.message);
      }

      const projects = projectsData
        ? projectsData.map((item) => SupabaseMapper.fromSupabaseProject(item))
        : []; // Use mapper

      // Prepare data for the LLM
      const dataForLlm = {
        projects: projects,
      };

      // Formulate the prompt for overall reports
      const overallReportPrompt = `YOUR RESPONSE MUST BE A VALID JSON OBJECT. DO NOT INCLUDE ANY INTRODUCTORY OR CONCLUDING TEXT, EXPLANATIONS, OR MARKDOWN FORMATTING. SPECIFICALLY, DO NOT INCLUDE \`\`\`json\` OR \`\`\` AT THE BEGINNING OR END OF THE RESPONSE. PROVIDE ONLY THE JSON OBJECT.

Analyze the following project data to generate an overall report including the project completion rate and the distribution of projects by status.

Project Data:
${JSON.stringify(projects, null, 2)}

Provide the output as a JSON object with the following structure:
{
  "completionRate": number, // Percentage of projects with status 'completed'
  "statusDistribution": { // Distribution of projects by status
    "new": number,
    "predicting": number,
    "completed": number,
    // ... other statuses if any
  }
}

Ensure the JSON is valid and can be directly parsed.`;

      this.logger.log('Calling LLM for overall reports...');
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
        'OpenRouter API response text for overall reports:',
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
  }
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
      return { completionRate, statusDistribution };
    } catch (error: any) {
      this.logger.error(
        'Failed to generate overall reports:',
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
  }> {
    let llmResponse: {
      predictionsCount: number;
      predictionTypeDistribution: { [type: string]: number };
    };
    let predictionsCount: number = 0; // Initialize with default value
    let predictionTypeDistribution: { [type: string]: number } = {
      // Initialize with default distribution
      'user-story': 0,
      bug: 0,
    };

    try {
      // Fetch necessary data from Supabase
      const { data: predictionsData, error } = await this.supabase
        .from('predictions')
        .select('*, prediction_reviews!inner(projectId)') // Select predictions columns and join with prediction_reviews to get projectId
        .eq('prediction_reviews.projectId', projectId); // Filter by projectId from prediction_reviews

      if (error) {
        this.logger.error(
          `Error fetching predictions for project reports from Supabase: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(error.message);
      }

      const predictions = predictionsData
        ? predictionsData.map((item) =>
            SupabaseMapper.fromSupabasePrediction(item),
          )
        : []; // Use mapper

      // Prepare data for the LLM
      const dataForLlm = {
        projectId: projectId,
        predictions: predictions,
      };

      // Formulate the prompt for project reports
      const projectReportPrompt = `YOUR RESPONSE MUST BE A VALID JSON OBJECT. DO NOT INCLUDE ANY INTRODUCTORY OR CONCLUDING TEXT, EXPLANATIONS, OR MARKDOWN FORMATTING. SPECIFICALLY, DO NOT INCLUDE \`\`\`json\` OR \`\`\` AT THE BEGINNING OR END OF THE RESPONSE. PROVIDE ONLY THE JSON OBJECT.

Analyze the following prediction data for project ID "${projectId}" to generate a project-specific report including the total count of predictions and the distribution of prediction types (user stories vs. bugs).

Prediction Data:
${JSON.stringify(predictions, null, 2)}

Provide the output as a JSON object with the following structure:
{
  "predictionsCount": number, // Total number of predictions for this project
  "predictionTypeDistribution": { // Distribution of prediction types
    "user-story": number,
    "bug": number
  }
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
  }
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
                `LLM cleanup response content was null for project reports for project ${projectId}.`,
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
              project_id: projectId,
              predictions_count: predictionsCount,
              prediction_type_distribution: predictionTypeDistribution,
            },
          ])
          .select('*')
          .single();

      if (insertProjectError) {
        this.logger.error(
          `Error inserting project report into Supabase: ${(insertProjectError as any).message}`,
          insertProjectError.stack,
        );
        // Do not throw an error here, just log it, as the report was generated
      }

      console.log(`Reports generated and persisted for project ${projectId}.`);

      // Mark the project report as generated
      await this.projectsService.markReportGenerated(projectId);
      console.log(`Project ${projectId} marked as report generated.`);

      return { predictionsCount, predictionTypeDistribution };
    } catch (error: any) {
      this.logger.error(
        `Failed to generate reports for project ${projectId}:`,
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to generate reports for project ${projectId}: ${error.message}`,
      );
    }
  }

  // The getter methods will now just call the generation methods
  async getOverallProjectCompletionRate(): Promise<number> {
    const reports = await this.generateOverallReports();
    return reports.completionRate;
  }

  async getOverallProjectStatusDistribution(): Promise<{
    [status: string]: number;
  }> {
    const reports = await this.generateOverallReports();
    return reports.statusDistribution;
  }

  async getPredictionsCountForProject(projectId: string): Promise<number> {
    const reports = await this.generateProjectReports(projectId);
    return reports.predictionsCount;
  }

  async getPredictionTypeDistributionForProject(
    projectId: string,
  ): Promise<{ [type: string]: number }> {
    const reports = await this.generateProjectReports(projectId);
    return reports.predictionTypeDistribution;
  }

  // Removed file-based status methods as reports are generated on the fly
  // Removed TODO comment as the main reporting logic is now implemented
  async getOverallReport(): Promise<any | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('reports')
        .select('completion_rate, status_distribution')
        .is('project_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error(
          `Error fetching overall report from Supabase: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(error.message);
      }

      // If no overall report is found, generate one and return it
      if (!data) {
        this.logger.log('No overall report found, generating a new one.');
        const generatedReport = await this.generateOverallReports();
        // Fetch the newly generated report from the database to ensure consistency
        const { data: newData, error: newError } = await this.supabase
          .from('reports')
          .select('completion_rate, status_distribution')
          .is('project_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (newError && newError.code !== 'PGRST116') {
          this.logger.error(
            `Error fetching newly generated overall report from Supabase: ${newError.message}`,
            newError.stack,
          );
          throw new InternalServerErrorException(newError.message);
        }
        return newData || undefined;
      }

      return data || undefined;
    } catch (error: any) {
      this.logger.error(
        'Failed to fetch or generate overall report:',
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch or generate overall report: ${error.message}`,
      );
    }
  }

  async getProjectReport(projectId: string): Promise<any | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('reports')
        .select('predictions_count, prediction_type_distribution')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error(
          `Error fetching project report from Supabase: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(error.message);
      }

      return data || undefined;
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
