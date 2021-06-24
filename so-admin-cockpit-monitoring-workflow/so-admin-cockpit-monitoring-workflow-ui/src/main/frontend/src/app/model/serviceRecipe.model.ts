export interface ServiceRecipe {
  id: string;
  serviceModelUUID: string;
  paramXsd: string;
  action: string;
  description: string;
  orchestrationUri: string;
  recipeTimeout: string;
  serviceTimeoutInterim: string;
  created: string;
}
