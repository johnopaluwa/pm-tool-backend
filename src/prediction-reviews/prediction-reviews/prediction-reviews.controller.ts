import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
  @Get()
  async findAll(): Promise<PredictionReview[]> {
    return await this.predictionReviewsService.getPredictionReviews();
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<PredictionReview | undefined> {
    return await this.predictionReviewsService.getPredictionReviewById(id);
  }

  @Get('project/:projectId')
  async findByProjectId(
    @Param('projectId') projectId: string,
  ): Promise<PredictionReview[]> {
    return await this.predictionReviewsService.getPredictionReviewsByProjectId(
      +projectId,
    );
  }

  @Post()
  async create(
    @Body()
    createPredictionReviewDto: CreatePredictionReviewDto,
  ): Promise<PredictionReview> {
    return await this.predictionReviewsService.addPredictionReview(
      createPredictionReviewDto,
    );
  }
}
