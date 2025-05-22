import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'; // Import BadRequestException
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto'; // Import crypto for state generation
import { lastValueFrom } from 'rxjs';
import { ProjectsService } from '../projects/projects.service';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowsService } from '../workflows/workflows.service';

@Injectable()
export class ImportService {
  private tokenStore: Map<string, string> = new Map();
  private tokenCounter = 0;
  // In a real application, you would use a persistent store (like a database)
  // to store and validate the state parameter, associated with a user session.
  private azureDevOpsStateStore: Map<string, string> = new Map(); // Temporary in-memory state store

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tasksService: TasksService,
    private readonly workflowsService: WorkflowsService,
    private readonly projectsService: ProjectsService,
  ) {}

  private storeToken(token: string): string {
    const id = `token-${this.tokenCounter++}`;
    this.tokenStore.set(id, token);
    // In a real application, you would associate this token with a user and potentially set an expiration
    console.log(`Stored token with ID: ${id}`);
    return id;
  }

  getToken(id: string): string | undefined {
    return this.tokenStore.get(id);
  }

  initiateAzureDevOpsOAuth(): string {
    const clientId = this.configService.get<string>('AZURE_DEVOPS_CLIENT_ID');
    const redirectUri = this.configService.get<string>(
      'AZURE_DEVOPS_REDIRECT_URI',
    );
    const scope = 'vso.workitems_read'; // Scope for reading work items
    const state = crypto.randomBytes(16).toString('hex'); // Generate a random state

    // In a real application, store the state parameter associated with the user's session
    // For this example, we'll use a temporary in-memory store
    this.azureDevOpsStateStore.set(state, 'valid'); // Store state temporarily

    const authorizationUrl =
      `https://app.vssps.visualstudio.com/oauth2/authorize` +
      `?client_id=${clientId}` +
      `&response_type=Assertion` + // Use Assertion for server-side flow
      `&state=${state}` + // Include the generated state
      `&scope=${scope}` +
      `&redirect_uri=${redirectUri}`;

    return authorizationUrl;
  }

  initiateTrelloOAuth(): string {
    const apiKey = this.configService.get<string>('TRELLO_API_KEY');
    const redirectUri = this.configService.get<string>('TRELLO_REDIRECT_URI');
    const scope = 'read,write'; // Scope for reading and writing cards
    const expiration = 'never'; // Token expiration
    // Trello's client-side OAuth flow doesn't typically use a state parameter in the initial request
    // as the token is returned in the fragment, which is not sent to the server.
    // State validation is more critical for server-side flows like Azure DevOps.

    const authorizationUrl =
      `https://trello.com/1/authorize` +
      `?expiration=${expiration}` +
      `&name=Project Management App` + // Application name
      `&scope=${scope}` +
      `&response_type=token` + // Request a token directly
      `&key=${apiKey}` +
      `&return_url=${redirectUri}`; // Use return_url for the redirect
    return authorizationUrl;
  }

  async handleAzureDevOpsCallback(callbackData: any): Promise<any> {
    console.log('Azure DevOps callback data:', callbackData);

    const clientId = this.configService.get<string>('AZURE_DEVOPS_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'AZURE_DEVOPS_CLIENT_SECRET',
    );
    const redirectUri = this.configService.get<string>(
      'AZURE_DEVOPS_REDIRECT_URI',
    );
    const code = callbackData.code; // Assuming the authorization code is in the 'code' query parameter
    const state = callbackData.state; // Get the state parameter

    if (!code) {
      console.error(
        'Authorization code not found in Azure DevOps callback data.',
      );
      throw new BadRequestException('Authorization code not found.');
    }

    // Validate the state parameter to prevent CSRF attacks
    // In a real application, retrieve the state associated with the user's session
    // and compare it to the state parameter received in the callback.
    if (!state || !this.azureDevOpsStateStore.has(state)) {
      console.error(
        'Invalid or missing state parameter in Azure DevOps callback.',
      );
      // Remove the state from the temporary store after validation (whether success or failure)
      if (state) {
        this.azureDevOpsStateStore.delete(state);
      }
      throw new BadRequestException('Invalid or missing state parameter.');
    }

    // Remove the state from the temporary store after successful validation
    this.azureDevOpsStateStore.delete(state);

    // TODO: Associate the token with the user who initiated the OAuth flow

    const tokenUrl = 'https://app.vssps.visualstudio.com/oauth2/token';
    const tokenRequestBody = new URLSearchParams({
      client_assertion_type:
        'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientSecret as string, // In Azure DevOps, client_assertion is the client secret
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', // Use jwt-bearer for assertion flow
      assertion: code, // The authorization code is the assertion
      redirect_uri: redirectUri as string,
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    try {
      const response = await lastValueFrom(
        this.httpService.post(tokenUrl, tokenRequestBody, { headers }),
      );
      const accessToken = response.data.access_token;
      console.log('Azure DevOps Access Token obtained.');

      const tokenId = this.storeToken(accessToken); // Store the token

      return {
        success: true,
        message: 'Azure DevOps OAuth callback handled successfully',
        tokenId, // Return the token identifier
      };
    } catch (error) {
      console.error('Error handling Azure DevOps OAuth callback:', error);
      if (error.response) {
        console.error(
          'Azure DevOps Token Exchange Error Response:',
          error.response.data,
        );
        throw new BadRequestException(
          `Failed to exchange authorization code for token: ${error.response.statusText}`,
        );
      } else {
        throw new BadRequestException(
          'Failed to handle Azure DevOps OAuth callback.',
        );
      }
    }
  }

  handleTrelloCallback(callbackData: any): any {
    console.log('Trello callback data:', callbackData);

    const accessToken = callbackData.token; // Assuming the access token is in the 'token' query parameter
    // Trello's client-side OAuth flow doesn't typically use a state parameter in the initial request
    // as the token is returned in the fragment, which is not sent to the server.
    // State validation is more critical for server-side flows like Azure DevOps.

    if (!accessToken) {
      console.error('Access token not found in Trello callback data.');
      throw new BadRequestException('Access token not found in callback data.');
    }

    console.log('Trello Access Token received.');

    const tokenId = this.storeToken(accessToken); // Store the token

    return {
      success: true,
      message: 'Trello OAuth callback handled successfully',
      tokenId, // Return the token identifier
    };
  }

  async importFromAzureDevOps(
    tokenId: string, // Use token ID
    organizationUrl: string,
    azureDevOpsProjectId: string, // Azure DevOps project ID
    projectId: string, // Application's project ID
  ): Promise<any> {
    console.log(
      `Importing from Azure DevOps project ${azureDevOpsProjectId} in organization ${organizationUrl} into application project ${projectId}`,
    );

    const accessToken = this.getToken(tokenId); // Retrieve token from store
    if (!accessToken) {
      console.error(`Azure DevOps token with ID ${tokenId} not found.`);
      return {
        success: false,
        message:
          'Azure DevOps access token not found or expired. Please re-authenticate.',
      };
    }

    // Get project details to find the associated workflow
    const project = await this.projectsService.getProjectById(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    // Assuming the Project interface includes a workflow_id
    const workflowId = (project as any).workflow_id; // TODO: Update Project interface and remove any cast
    if (!workflowId) {
      return {
        success: false,
        message: `Project with ID ${projectId} does not have an associated workflow.`,
      };
    }

    // Fetch all statuses for the project's workflow
    const stages =
      await this.workflowsService.findStagesByWorkflowId(workflowId);
    const applicationStatuses = new Map<string, string>(); // Map status name to status ID
    let defaultStatusId: string | undefined;

    if (stages.length > 0) {
      const firstStageStatuses =
        await this.workflowsService.findStatusesByStageId(stages[0].id);
      if (firstStageStatuses.length > 0) {
        defaultStatusId = firstStageStatuses[0].id;
      }
    }

    for (const stage of stages) {
      const statuses = await this.workflowsService.findStatusesByStageId(
        stage.id,
      );
      statuses.forEach((status) =>
        applicationStatuses.set(status.name, status.id),
      );
    }

    const apiUrl = `${organizationUrl}/${azureDevOpsProjectId}/_apis/wit/workitems?$filter=odata.type eq 'Microsoft.VSTS.WorkItemTypes.UserStory'&$select=System.Title,System.Description,System.State&$expand=Fields&$apiVersion=6.0`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    try {
      const response = await lastValueFrom(
        this.httpService.get(apiUrl, { headers }),
      );

      if (response.status !== 200) {
        console.error(
          'Azure DevOps API returned non-200 status:',
          response.status,
          response.data,
        );
        return {
          success: false,
          message: `Error from Azure DevOps API: ${response.status} - ${response.statusText}`,
        };
      }

      const workItems = response.data.value;

      if (!workItems || workItems.length === 0) {
        return {
          success: true,
          message:
            'No user stories found in the specified Azure DevOps project.',
        };
      }

      const importedTasks: CreateTaskDto[] = workItems.map((workItem: any) => {
        const azureDevOpsStatus = workItem.fields['System.State'];
        let status_id = applicationStatuses.get(azureDevOpsStatus); // Dynamic status mapping

        if (!status_id) {
          console.warn(
            `No matching application status found for Azure DevOps state "${azureDevOpsStatus}". Using default status.`,
          );
          status_id = defaultStatusId; // Fallback to default status
        }

        return {
          project_id: projectId, // Use the provided application projectId
          title: workItem.fields['System.Title'],
          description: workItem.fields['System.Description'],
          status_id: status_id,
          extra_data: workItem.fields, // Store all fields in extra_data
        };
      });

      // Call TasksService.create for each imported task
      for (const taskDto of importedTasks) {
        await this.tasksService.create(taskDto);
      }

      console.log('Imported Tasks (Azure DevOps):', importedTasks);

      return {
        success: true,
        message: `Imported ${importedTasks.length} tasks from Azure DevOps`,
      };
    } catch (error) {
      console.error('Error importing from Azure DevOps:', error);
      // More specific error handling for HTTP errors
      if (error.response) {
        console.error('Azure DevOps API error response:', error.response.data);
        return {
          success: false,
          message: `Error from Azure DevOps API: ${error.response.status} - ${error.response.statusText}. Details: ${JSON.stringify(error.response.data)}`,
        };
      } else if (error.request) {
        console.error(
          'No response received from Azure DevOps API:',
          error.request,
        );
        return {
          success: false,
          message:
            'No response received from Azure DevOps API. The request was made but no response was received.',
        };
      } else {
        console.error(
          'Error setting up Azure DevOps import request:',
          error.message,
        );
        return {
          success: false,
          message: `Error setting up Azure DevOps import request: ${error.message}`,
        };
      }
    }
  }
  async importFromTrello(
    tokenId: string, // Use token ID
    boardId: string,
    projectId: string,
  ): Promise<any> {
    console.log(
      `Importing from Trello for board ${boardId} into project ${projectId}`,
    );

    const accessToken = this.getToken(tokenId); // Retrieve token from store
    if (!accessToken) {
      console.error(`Trello token with ID ${tokenId} not found.`);
      return {
        success: false,
        message:
          'Trello access token not found or expired. Please re-authenticate.',
      };
    }

    // Get project details to find the associated workflow
    const project = await this.projectsService.getProjectById(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    // Assuming the Project interface includes a workflow_id
    const workflowId = (project as any).workflow_id; // TODO: Update Project interface and remove any cast
    if (!workflowId) {
      return {
        success: false,
        message: `Project with ID ${projectId} does not have an associated workflow.`,
      };
    }

    // Fetch all statuses for the project's workflow
    const stages =
      await this.workflowsService.findStagesByWorkflowId(workflowId);
    const applicationStatuses = new Map<string, string>(); // Map status name to status ID
    let defaultStatusId: string | undefined;

    if (stages.length > 0) {
      const firstStageStatuses =
        await this.workflowsService.findStatusesByStageId(stages[0].id);
      if (firstStageStatuses.length > 0) {
        defaultStatusId = firstStageStatuses[0].id;
      }
    }

    for (const stage of stages) {
      const statuses = await this.workflowsService.findStatusesByStageId(
        stage.id,
      );
      statuses.forEach((status) =>
        applicationStatuses.set(status.name, status.id),
      );
    }

    const apiKey = this.configService.get<string>('TRELLO_API_KEY');
    const apiUrl = `https://api.trello.com/1/boards/${boardId}/cards?key=${apiKey}&token=${accessToken}&fields=name,desc,idList`; // Include idList to get the list the card is in
    const listsUrl = `https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${accessToken}`; // To get list names

    try {
      const [cardsResponse, listsResponse] = await Promise.all([
        lastValueFrom(this.httpService.get(apiUrl)),
        lastValueFrom(this.httpService.get(listsUrl)),
      ]);

      if (cardsResponse.status !== 200) {
        console.error(
          'Trello Cards API returned non-200 status:',
          cardsResponse.status,
          cardsResponse.data,
        );
        return {
          success: false,
          message: `Trello Cards API returned status ${cardsResponse.status}. Details: ${JSON.stringify(cardsResponse.data)}`,
        };
      }

      if (listsResponse.status !== 200) {
        console.error(
          'Trello Lists API returned non-200 status:',
          listsResponse.status,
          listsResponse.data,
        );
        return {
          success: false,
          message: `Trello Lists API returned status ${listsResponse.status}. Details: ${JSON.stringify(listsResponse.data)}`,
        };
      }

      const cards = cardsResponse.data;
      const lists = listsResponse.data;

      if (!cards || cards.length === 0) {
        return {
          success: true,
          message: 'No cards found in the specified Trello board.',
        };
      }

      // Create a mapping from list ID to list name
      const listMap = new Map<string, string>();
      lists.forEach((list: any) => {
        listMap.set(list.id, list.name);
      });

      const importedTasks: CreateTaskDto[] = [];

      for (const card of cards) {
        const trelloListName = listMap.get(card.idList);
        let status_id: string | undefined;

        if (trelloListName && applicationStatuses.has(trelloListName)) {
          status_id = applicationStatuses.get(trelloListName);
        } else {
          console.warn(
            `No matching application status found for Trello list "${trelloListName}". Using default status.`,
          );
          status_id = defaultStatusId;
        }

        importedTasks.push({
          project_id: projectId, // Use the provided projectId
          title: card.name,
          description: card.desc,
          status_id: status_id,
          extra_data: card, // Store all card data in extra_data
        });
      }

      // Call TasksService.create for each imported task
      for (const taskDto of importedTasks) {
        await this.tasksService.create(taskDto);
      }

      console.log('Imported Tasks (Trello):', importedTasks);

      return {
        success: true,
        message: `Imported ${importedTasks.length} tasks from Trello`,
      };
    } catch (error) {
      console.error('Error importing from Trello:', error);
      // More specific error handling for HTTP errors
      if (error.response) {
        console.error('Trello API error response:', error.response.data);
        return {
          success: false,
          message: `Error from Trello API: ${error.response.status} - ${error.response.statusText}. Details: ${JSON.stringify(error.response.data)}`,
        };
      } else if (error.request) {
        console.error('No response received from Trello API:', error.request);
        return {
          success: false,
          message:
            'No response received from Trello API. The request was made but no response was received.',
        };
      } else {
        return {
          success: false,
          message: `Error setting up Trello import request: ${error.message}`,
        };
      }
    }
  }
}
