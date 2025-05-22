import { IsString } from 'class-validator';
import { ImportTasksDto } from './import-tasks.dto';

export class ImportAzureDevOpsTasksDto extends ImportTasksDto {
  @IsString()
  tokenId: string; // Use token ID instead of raw access token

  @IsString()
  organizationUrl: string;

  @IsString()
  azureDevOpsProjectId: string; // Using a different name to avoid confusion with application's projectId
}
