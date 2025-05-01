export interface Prediction {
  id: string; // This will be the database UUID
  aiGeneratedId: string; // This will store the AI-generated ID (e.g., "US-1")
  type: 'user-story' | 'bug'; // Added type to be more specific
  title: string;
  description: string;
  similarityScore: number;
  frequency: number;
  sourceProject: string;
  status: string;

  // Added fields for User Stories
  acceptanceCriteria: string[]; // List of acceptance criteria
  dependencies: string[]; // List of dependencies (e.g., IDs of other stories/bugs)
  assumptions: string[]; // List of assumptions
  edgeCases: string[]; // List of edge cases
  nonFunctionalRequirements: string; // Text field for non-functional requirements
  visuals: string[]; // List of URLs or references to visuals/mockups
  dataRequirements: string; // Text field for data requirements
  impact: string; // Text field for impact
  priority: 'Low' | 'Medium' | 'High' | 'Critical'; // Priority level

  // Added fields for Bug Details
  estimatedTime: number; // Estimated time in hours
  stepsToReproduce: string[]; // List of steps to reproduce
  actualResult: string; // Text field for actual result
  expectedResult: string; // Text field for expected result
  environment: string; // Text field for environment details
  userAccountDetails: string; // Text field for user/account details (non-sensitive)
  screenshotsVideos: string[]; // List of URLs or references to screenshots/videos
  errorMessagesLogs: string; // Text field for error messages/logs
  frequencyOfOccurrence: 'Consistent' | 'Intermittent' | 'Rare'; // Frequency of occurrence
  severity: 'Cosmetic' | 'Minor' | 'Major' | 'Blocking'; // Severity level
  workaround: string; // Text field for workaround
  relatedIssues: string[]; // List of related issue IDs
}
