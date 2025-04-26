export class CreateProjectDto {
  projectName: string;
  clientName: string;
  projectType: string;
  clientIndustry: string;
  techStack: string[];
  teamSize: string;
  duration: string;
  keywords: string;
  businessSpecification: string;
  description: string;
  status: 'new' | 'predicting' | 'completed';
}
