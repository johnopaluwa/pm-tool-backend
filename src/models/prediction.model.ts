export interface Prediction {
  id: string;
  type: string;
  title: string;
  description: string;
  similarityScore: number;
  frequency: number;
  sourceProject: string;
  status: string;
}
