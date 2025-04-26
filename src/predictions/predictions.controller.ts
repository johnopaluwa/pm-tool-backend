import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Prediction } from '../models/prediction.model'; // Corrected import path
import { PredictionsService } from './predictions.service';

@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post('generate')
  generatePredictions(@Body() projectData: any): Promise<Prediction[]> {
    // Updated return type to Promise
    return this.predictionsService.generatePredictions(projectData);
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
