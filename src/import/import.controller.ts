import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import { ImportAzureDevOpsTasksDto } from './dto/import-azure-devops-tasks.dto';
import { ImportTrelloTasksDto } from './dto/import-trello-tasks.dto';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get('azure-devops/initiate') // Changed to initiate endpoint
  @Redirect()
  initiateAzureDevOpsImport() {
    const url = this.importService.initiateAzureDevOpsOAuth();
    return { url };
  }

  @Post('azure-devops') // Changed to POST for import
  async importFromAzureDevOps(
    @Body() importTasksDto: ImportAzureDevOpsTasksDto,
  ) {
    try {
      const result = await this.importService.importFromAzureDevOps(
        importTasksDto.tokenId, // Use tokenId
        importTasksDto.organizationUrl,
        importTasksDto.azureDevOpsProjectId,
        importTasksDto.projectId,
      );
      if (result.success) {
        return { message: result.message };
      } else {
        // Return a 400 Bad Request for import failures reported by the service
        return { statusCode: 400, message: result.message };
      }
    } catch (error) {
      // Handle potential exceptions thrown by the service (e.g., NotFoundException)
      if (error instanceof NotFoundException) {
        return { statusCode: 404, message: error.message };
      }
      console.error('Error in importFromAzureDevOps controller:', error);
      return {
        statusCode: 500,
        message: 'Internal server error during Azure DevOps import.',
      };
    }
  }

  @Get('trello/initiate') // Changed to initiate endpoint
  @Redirect()
  initiateTrelloImport() {
    const url = this.importService.initiateTrelloOAuth();
    return { url };
  }

  @Post('trello') // Changed to POST for import
  async importFromTrello(@Body() importTasksDto: ImportTrelloTasksDto) {
    try {
      const result = await this.importService.importFromTrello(
        importTasksDto.tokenId, // Use tokenId
        importTasksDto.boardId,
        importTasksDto.projectId,
      );
      if (result.success) {
        return { message: result.message };
      } else {
        // Return a 400 Bad Request for import failures reported by the service
        return { statusCode: 400, message: result.message };
      }
    } catch (error) {
      // Handle potential exceptions thrown by the service (e.g., NotFoundException)
      if (error instanceof NotFoundException) {
        return { statusCode: 404, message: error.message };
      }
      console.error('Error in importFromTrello controller:', error);
      return {
        statusCode: 500,
        message: 'Internal server error during Trello import.',
      };
    }
  }

  @Get('azure-devops/callback')
  async handleAzureDevOpsCallback(@Query() query: any) {
    try {
      const result = await this.importService.handleAzureDevOpsCallback(query);
      if (result.success) {
        // TODO: Redirect to a frontend page indicating success, passing the tokenId
        return { message: result.message, tokenId: result.tokenId };
      } else {
        // TODO: Redirect to a frontend error page, passing the error message
        return { statusCode: 400, message: result.message };
      }
    } catch (error) {
      console.error('Error in handleAzureDevOpsCallback controller:', error);
      // TODO: Redirect to a frontend error page
      return {
        statusCode: 500,
        message: 'Internal server error during Azure DevOps callback.',
      };
    }
  }

  @Get('trello/callback')
  async handleTrelloCallback(@Query() query: any) {
    try {
      const result = await this.importService.handleTrelloCallback(query);
      if (result.success) {
        // TODO: Redirect to a frontend page indicating success, passing the tokenId
        return { message: result.message, tokenId: result.tokenId };
      } else {
        // TODO: Redirect to a frontend error page, passing the error message
        return { statusCode: 400, message: result.message };
      }
    } catch (error) {
      console.error('Error in handleTrelloCallback controller:', error);
      // TODO: Redirect to a frontend error page
      return {
        statusCode: 500,
        message: 'Internal server error during Trello callback.',
      };
    }
  }
}
