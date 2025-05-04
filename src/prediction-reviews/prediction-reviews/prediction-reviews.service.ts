import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Prediction } from '../../models/prediction.model';
import { SupabaseMapper } from '../../supabase/supabase-mapper'; // Import the mapper
import { SupabaseService } from '../../supabase/supabase.service';

export interface PredictionReview {
  id: string; // Supabase will generate UUID
  projectId: number; // Link to the project
  projectName: string;
  clientName?: string;
  generatedAt: string; // Store as ISO string
  predictions: Prediction[]; // This will not be stored directly, but fetched via relationship
}

@Injectable()
export class PredictionReviewsService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(PredictionReviewsService.name);

  constructor(private readonly supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
  }

  async addPredictionReview(
    review: Omit<PredictionReview, 'id' | 'generatedAt' | 'predictions'> & {
      predictions: Prediction[];
    },
  ): Promise<PredictionReview> {
    const { predictions, ...reviewData } = review;

    // Insert the prediction review first
    // Generate a UUID for the prediction review ID
    const reviewId = crypto.randomUUID();

    const { data: reviewResult, error: reviewError } = await this.supabase
      .from('prediction_reviews')
      .insert([
        SupabaseMapper.toSupabasePredictionReview({
          id: reviewId, // Explicitly set the generated UUID
          ...reviewData,
          generatedAt: new Date().toISOString(), // Add generatedAt here as it's not in the input type
        }),
      ])
      .select()
      .single();

    if (reviewError) {
      this.logger.error(
        `Error inserting prediction review into Supabase: ${reviewError.message}`,
        reviewError.stack,
      );
      throw new InternalServerErrorException(reviewError.message);
    }

    // Insert the associated predictions using the mapper
    const predictionsToInsert = predictions.map((pred) => ({
      ...SupabaseMapper.toSupabasePrediction(pred),
      review_id: reviewResult.id, // Link prediction to the new review
      // Ensure project_id is included if needed, though it might be handled elsewhere
      // project_id: review.projectId,
    }));

    const { data: predictionsResult, error: predictionsError } =
      await this.supabase
        .from('predictions')
        .insert(predictionsToInsert)
        .select();

    if (predictionsError) {
      // Consider rolling back the review insertion if prediction insertion fails
      this.logger.error(
        `Error inserting predictions into Supabase: ${predictionsError.message}`,
        predictionsError.stack,
      );
      // For now, we'll just throw the error
      throw new InternalServerErrorException(predictionsError.message);
    }

    console.log('New prediction review and predictions added.');
    // Map the inserted predictions back to the backend model before returning
    const mappedPredictions = predictionsResult
      ? predictionsResult.map((item) =>
          SupabaseMapper.fromSupabasePrediction(item),
        )
      : [];
    const mappedReview =
      SupabaseMapper.fromSupabasePredictionReview(reviewResult);
    return {
      ...mappedReview,
      predictions: mappedPredictions,
    } as PredictionReview;
  }

  async getPredictionReviews(): Promise<PredictionReview[]> {
    const { data: reviews, error: reviewsError } = await this.supabase
      .from('prediction_reviews')
      .select('*, predictions(*)'); // Fetch predictions along with reviews

    if (reviewsError) {
      this.logger.error(
        `Error fetching prediction reviews from Supabase: ${reviewsError.message}`,
        reviewsError.stack,
      );
      throw new InternalServerErrorException(reviewsError.message);
    }

    // Map the fetched data using the updated mapper
    const mappedReviews = reviews
      ? reviews.map((reviewData) =>
          SupabaseMapper.fromSupabasePredictionReview(reviewData),
        )
      : [];

    return mappedReviews as PredictionReview[];
  }

  async getPredictionReviewById(
    id: string,
  ): Promise<PredictionReview | undefined> {
    const { data: review, error: reviewError } = await this.supabase
      .from('prediction_reviews')
      .select('*, predictions(*)') // Fetch predictions along with the review
      .eq('id', id)
      .single();

    if (reviewError && reviewError.code !== 'PGRST116') {
      // PGRST116 means no rows found
      this.logger.error(
        `Error fetching prediction review by ID ${id} from Supabase: ${reviewError.message}`,
        reviewError.stack,
      );
      throw new InternalServerErrorException(reviewError.message);
    }

    if (!review) {
      return undefined;
    }

    // Map the fetched data using the updated mapper
    return SupabaseMapper.fromSupabasePredictionReview(
      review,
    ) as PredictionReview;
  }

  async getPredictionReviewsByProjectId(
    projectId: number,
  ): Promise<PredictionReview[]> {
    const { data: reviews, error: reviewsError } = await this.supabase
      .from('prediction_reviews')
      .select('*, predictions(*)') // Fetch predictions along with reviews
      .eq('projectId', projectId);

    if (reviewsError) {
      this.logger.error(
        `Error fetching prediction reviews by project ID ${projectId} from Supabase: ${reviewsError.message}`,
        reviewsError.stack,
      );
      throw new InternalServerErrorException(reviewsError.message);
    }

    // Map the fetched data using the updated mapper
    const mappedReviews = reviews
      ? reviews.map((reviewData) =>
          SupabaseMapper.fromSupabasePredictionReview(reviewData),
        )
      : [];

    return mappedReviews as PredictionReview[];
  }
}
