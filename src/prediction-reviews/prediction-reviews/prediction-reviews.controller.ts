import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CreatePredictionReviewDto } from '../dto/create-prediction-review.dto';
import {
  PredictionReview,
  PredictionReviewsService,
} from './prediction-reviews.service';

@Controller('prediction-reviews')
export class PredictionReviewsController {
  constructor(
    private readonly predictionReviewsService: PredictionReviewsService,
  ) {}

  @Get()
  findAll(): Observable<PredictionReview[]> {
    return this.predictionReviewsService.getPredictionReviews();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Observable<PredictionReview | undefined> {
    return this.predictionReviewsService.getPredictionReviewById(id);
  }

  @Get('project/:projectId')
  findByProjectId(
    @Param('projectId') projectId: string,
  ): Observable<PredictionReview[]> {
    return this.predictionReviewsService.getPredictionReviewsByProjectId(
      +projectId,
    );
  }

  @Post()
  create(
    @Body()
    createPredictionReviewDto: CreatePredictionReviewDto,
  ): Observable<PredictionReview> {
    return this.predictionReviewsService.addPredictionReview(
      createPredictionReviewDto,
    );
  }
}
