import { Injectable } from '@nestjs/common';

export interface Project {
  id: number;
  name: string;
  client: string;
  status: 'new' | 'predicting' | 'completed';
  description: string;
  projectType: string;
  clientIndustry: string;
  techStack: string[];
  teamSize: string;
  duration: string;
  keywords: string;
  businessSpecification: string;
  reportGenerated?: boolean; // Add reportGenerated flag
}

@Injectable()
export class ProjectsService {
  private mockProjects: Project[] = [
    {
      id: 1,
      name: 'Project Alpha',
      client: 'Client A',
      status: 'completed', // Changed to 'predicting' as it has prediction reviews
      reportGenerated: true, // Set reportGenerated to true for Alpha
      description: 'This is a description for Project Alpha.',
      projectType: 'Web App',
      clientIndustry: 'Finance',
      techStack: ['React', 'Node', 'AWS'],
      teamSize: '4-6',
      duration: '3-6 months',
      keywords: 'User auth, payment gateway',
      businessSpecification:
        'Detailed requirements for user authentication and payment processing.',
    },
    {
      id: 2,
      name: 'Project Beta',
      client: 'Client B',
      status: 'completed', // Changed to 'predicting' as it has prediction reviews
      reportGenerated: true, // Set reportGenerated to true for Beta
      description: 'This is a description for Project Beta.',
      projectType: 'Mobile App',
      clientIndustry: 'Retail',
      techStack: ['Angular', 'Azure'],
      teamSize: '1-3',
      duration: '<1 month',
      keywords: 'Push notifications, user profiles',
      businessSpecification:
        'Specifications for mobile app features including push notifications and user profile management.',
    },
    {
      id: 3,
      name: 'Project Gamma',
      client: 'Client C',
      status: 'new', // Changed to 'new' as it has no prediction reviews
      reportGenerated: false, // Initialize reportGenerated
      description: 'This is a description for Project Gamma.',
      projectType: 'API',
      clientIndustry: 'Healthcare',
      techStack: ['Python', 'AWS'],
      teamSize: '7-10',
      duration: '6+ months',
      keywords: 'Data integration, security',
      businessSpecification:
        'API requirements focusing on secure data integration and handling sensitive healthcare information.',
    },
  ];

  findAll(): Project[] {
    return this.mockProjects;
  }

  getProjectById(id: number): Project | undefined {
    return this.mockProjects.find((project) => project.id === id);
  }

  addProject(
    project: Omit<Project, 'id' | 'status' | 'name' | 'client'> & {
      projectName: string;
      clientName: string;
    },
  ): number {
    const newId =
      this.mockProjects.length > 0
        ? Math.max(...this.mockProjects.map((p) => p.id)) + 1
        : 1;
    const newProject: Project = {
      ...project,
      id: newId,
      name: project.projectName,
      client: project.clientName,
      status: 'new', // New projects start with status 'new'
      reportGenerated: false, // New projects have reportGenerated as false
    };
    this.mockProjects.push(newProject);
    console.log('New project added:', newProject);
    console.log('All projects:', this.mockProjects);
    return newId;
  }
  updateProjectStatus(
    id: number,
    status: 'new' | 'predicting' | 'completed',
  ): Project | undefined {
    const project = this.mockProjects.find((p) => p.id === id);
    if (project) {
      project.status = status;
      console.log(`Project ${id} status updated to ${status}`);
      return project;
    }
    return undefined;
  }

  markReportGenerated(id: number): Project | undefined {
    const project = this.mockProjects.find((p) => p.id === id);
    if (project) {
      project.reportGenerated = true;
      console.log(`Project ${id} reportGenerated status updated to true`);
      return project;
    }
    return undefined;
  }
}
