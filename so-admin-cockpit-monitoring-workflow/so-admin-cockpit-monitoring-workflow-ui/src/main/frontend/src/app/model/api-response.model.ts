import { ServiceRecipe } from './serviceRecipe.model';
import { NetworkRecipe } from './networkRecipe.model';
import { VnfRecipe } from './vnfRecipe.model';

export interface ApiErrorBody { errMsg: string; }
export type ServiceRecipeResponse = { serviceRecipes: ServiceRecipe[] } | ApiErrorBody;
export type NetworkRecipeResponse = { networkRecipes: NetworkRecipe[] } | ApiErrorBody;
export type VnfRecipeResponse = { vnfRecipes: VnfRecipe[] } | ApiErrorBody;

export interface RecipeSaveResponse {
  id?: string;
  errMsg?: string;
}

export interface WorkflowOnboardResponse {
  result?: string;
  message?: string;
  errMsg?: string;
}
