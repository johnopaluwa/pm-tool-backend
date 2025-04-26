import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Observable } from 'rxjs';
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
  sendFeedback(@Body() feedbackData: any): Observable<any> {
    return this.predictionsService.sendFeedback(feedbackData);
  }

  @Get('history/:projectId')
  getPredictionHistory(
    @Param('projectId') projectId: string,
  ): Observable<Prediction[]> {
    return this.predictionsService.getPredictionHistory(projectId);
  }
}
