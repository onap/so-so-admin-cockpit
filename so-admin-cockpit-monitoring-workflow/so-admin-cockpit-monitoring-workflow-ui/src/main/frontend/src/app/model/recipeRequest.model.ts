export interface RecipeRequest {
  modelType: 'Service' | 'Network' | 'Vnf';
  modelVersionId: string;
  operation: string;
  orchestrationFlow: string;
  modelName?: string;
  // Submitted by the existing form; the current controller does not persist these fields.
  nfRole?: string;
  recipeTimeout?: string;
}
