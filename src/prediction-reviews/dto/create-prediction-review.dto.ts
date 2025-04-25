import { Prediction } from '../../models/prediction.model';

export class CreatePredictionReviewDto {
  projectId: number; // Link to the project
  projectName: string;
  clientName?: string;
  predictions: Prediction[];
}
