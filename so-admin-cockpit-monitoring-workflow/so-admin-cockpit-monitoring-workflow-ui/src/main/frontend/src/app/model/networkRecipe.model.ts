export interface NetworkRecipe {
  id: string;
  modelName: string;
  paramXsd: string;
  action: string;
  description: string;
  orchestrationUri: string;
  recipeTimeout: string;
  versionStr: string;
  serviceType: string;
  created: string;
}
