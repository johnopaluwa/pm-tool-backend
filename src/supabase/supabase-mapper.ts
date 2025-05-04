import { Prediction } from '../models/prediction.model';
import { PredictionReview } from '../prediction-reviews/prediction-reviews/prediction-reviews.service'; // Import PredictionReview interface
import { Project } from '../projects/projects.service'; // Import Project interface

export class SupabaseMapper {
  /**
   * Maps data from the Supabase 'predictions' table to the backend Prediction model.
   * @param data The data object from Supabase.
   * @returns A Prediction model object.
   */
  static fromSupabasePrediction(data: any): Prediction {
    return {
      id: data.id,
      aiGeneratedId: data.aiGeneratedId, // Include the new field
      type: data.type,
      title: data.title,
      description: data.description,
      similarityScore: data.similarityScore,
      frequency: data.frequency,
      sourceProject: data.sourceProject,
      status: data.status,
      acceptanceCriteria: data.acceptanceCriteria || [],
      dependencies: data.dependencies || [],
      assumptions: data.assumptions || [],
      edgeCases: data.edgeCases || [],
      nonFunctionalRequirements: data.nonFunctionalRequirements,
      visuals: data.visuals || [],
      dataRequirements: data.dataRequirements,
      impact: data.impact,
      priority: data.priority,
      estimatedTime: data.estimatedTime,
      stepsToReproduce: data.stepsToReproduce || [],
      actualResult: data.actualResult,
      expectedResult: data.expectedResult,
      environment: data.environment,
      userAccountDetails: data.userAccountDetails,
      screenshotsVideos: data.screenshotsVideos || [],
      errorMessagesLogs: data.errorMessagesLogs,
      frequencyOfOccurrence: data.frequencyOfOccurrence,
      severity: data.severity,
      workaround: data.workaround,
      relatedIssues: data.relatedIssues || [],
    };
  }

  /**
   * Maps a backend Prediction model to an object suitable for inserting/updating the Supabase 'predictions' table.
   * @param prediction The Prediction model object.
   * @returns An object formatted for Supabase insertion/update.
   */
  static toSupabasePrediction(prediction: Prediction): any {
    return {
      id: prediction.id,
      aiGeneratedId: prediction.aiGeneratedId, // Include the new field
      type: prediction.type,
      title: prediction.title,
      description: prediction.description,
      similarityScore: prediction.similarityScore,
      frequency: prediction.frequency,
      sourceProject: prediction.sourceProject,
      status: prediction.status,
      acceptanceCriteria: prediction.acceptanceCriteria,
      dependencies: prediction.dependencies,
      assumptions: prediction.assumptions,
      edgeCases: prediction.edgeCases,
      nonFunctionalRequirements: prediction.nonFunctionalRequirements,
      visuals: prediction.visuals,
      dataRequirements: prediction.dataRequirements,
      impact: prediction.impact,
      priority: prediction.priority,
      estimatedTime: prediction.estimatedTime,
      stepsToReproduce: prediction.stepsToReproduce,
      actualResult: prediction.actualResult,
      expectedResult: prediction.expectedResult,
      environment: prediction.environment,
      userAccountDetails: prediction.userAccountDetails,
      screenshotsVideos: prediction.screenshotsVideos,
      errorMessagesLogs: prediction.errorMessagesLogs,
      frequencyOfOccurrence: prediction.frequencyOfOccurrence,
      severity: prediction.severity,
      workaround: prediction.workaround,
      relatedIssues: prediction.relatedIssues,
      // review_id and project_id are not in the model, so they are not included here.
      // These would typically be handled when inserting/updating based on context (e.g., which project/review the prediction belongs to).
    };
  }

  /**
   * Maps data from the Supabase 'projects' table to the backend Project model.
   * @param data The data object from Supabase.
   * @returns A Project model object.
   */
  static fromSupabaseProject(data: any): Project {
    return {
      id: data.id,
      name: data.name,
      client: data.client,
      status: data.status,
      description: data.description,
      projectType: data.projectType,
      clientIndustry: data.clientIndustry,
      techStack: data.techStack || [],
      teamSize: data.teamSize,
      duration: data.duration,
      keywords: data.keywords,
      businessSpecification: data.businessSpecification,
      reportGenerated: data.reportGenerated,
    };
  }

  /**
   * Maps a backend Project model to an object suitable for inserting/updating the Supabase 'projects' table.
   * @param project The Project model object.
   * @returns An object formatted for Supabase insertion/update.
   */
  static toSupabaseProject(project: Partial<Project>): any {
    return {
      name: project.name,
      client: project.client,
      status: project.status,
      description: project.description,
      projectType: project.projectType,
      clientIndustry: project.clientIndustry,
      techStack: project.techStack,
      teamSize: project.teamSize,
      duration: project.duration,
      keywords: project.keywords,
      businessSpecification: project.businessSpecification,
      reportGenerated: project.reportGenerated,
    };
  }
  /**
   * Maps data from the Supabase 'prediction_reviews' table to the backend PredictionReview model.
   * @param data The data object from Supabase.
   * @returns A PredictionReview model object.
   */
  static fromSupabasePredictionReview(data: any): PredictionReview {
    // Map the nested predictions array if it exists
    const predictions = data.predictions
      ? data.predictions.map((predictionData: any) =>
          this.fromSupabasePrediction(predictionData),
        )
      : [];

    return {
      id: data.id,
      projectId: data.projectId,
      projectName: data.projectName,
      clientName: data.clientName,
      generatedAt: data.generatedAt,
      predictions: predictions, // Include the mapped predictions
    };
  }

  /**
   * Maps a backend PredictionReview model to an object suitable for inserting/updating the Supabase 'prediction_reviews' table.
   * @param review The PredictionReview model object.
   * @returns An object formatted for Supabase insertion/update.
   */
  static toSupabasePredictionReview(review: any): any {
    // Using any for now, will refine with interface later if needed
    return {
      id: review.id,
      projectId: review.projectId,
      projectName: review.projectName,
      clientName: review.clientName,
      generatedAt: review.generatedAt,
      // predictions are handled separately
    };
  }
}
