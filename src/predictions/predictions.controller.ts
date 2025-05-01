import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Prediction } from '../models/prediction.model'; // Corrected import path
import { PredictionsService } from './predictions.service';

@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post('generate/:projectId')
  generatePredictions(
    @Param('projectId') projectId: string,
    @Body() projectData: any,
  ): Promise<Prediction[]> {
    // Updated return type to Promise and added projectId parameter
    return this.predictionsService.generatePredictions(projectData, +projectId);
  }

  @Post('feedback')
  @Post('feedback')
  async sendFeedback(@Body() feedbackData: any): Promise<any> {
    return this.predictionsService.sendFeedback(feedbackData);
  }

  @Get('history/:projectId')
  async getPredictionHistory(
    @Param('projectId') projectId: string,
  ): Promise<Prediction[]> {
    return this.predictionsService.getPredictionHistory(+projectId); // Convert projectId to number
  }
}
