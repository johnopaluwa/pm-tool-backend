// Shared Interfaces

export interface StageStatus {
  id: string;
  stage_id: string;
  name: string;
  order: number;
  is_default: boolean;
  is_completion_status: boolean;
  created_at: string;
  updated_at: string;
  stage_order?: number; // Add stage_order for easier comparison in service logic
}

export interface WorkflowStage {
  id: string;
  workflow_id: string;
  name: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status_id?: string;
  status?: StageStatus; // Include status details after join
  created_at: string;
  updated_at: string;
}

// Add other shared interfaces here as needed
