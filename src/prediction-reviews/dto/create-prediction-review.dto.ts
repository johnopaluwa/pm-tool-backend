import { Prediction } from '../../models/prediction.model';

export class CreatePredictionReviewDto {
  projectId: string; // Link to the project
  projectName: string;
  clientName?: string;
  predictions: Prediction[];
}
