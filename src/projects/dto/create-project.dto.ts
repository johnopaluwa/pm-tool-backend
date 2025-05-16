import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator'; // Import IsOptional, IsUUID, IsArray

export class CreateProjectDto {
  @IsString()
  projectName: string;

  @IsString()
  clientName: string;

  @IsString()
  projectType: string;

  @IsString()
  clientIndustry: string;

  @IsArray()
  @IsString({ each: true })
  techStack: string[];

  @IsString()
  teamSize: string;

  @IsString()
  duration: string;

  @IsString()
  keywords: string;

  @IsString()
  businessSpecification: string;

  @IsString()
  description: string;

  @IsString() // Assuming status is a string for now, might change with workflows
  status: string; // Changed type to string to accommodate workflow statuses

  @IsOptional()
  @IsUUID()
  workflow_id?: string; // Add optional workflow_id
}
