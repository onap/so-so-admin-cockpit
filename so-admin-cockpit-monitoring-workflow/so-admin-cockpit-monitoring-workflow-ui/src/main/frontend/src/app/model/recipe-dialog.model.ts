import { ServiceRecipe } from './serviceRecipe.model';
import { NetworkRecipe } from './networkRecipe.model';
import { VnfRecipe } from './vnfRecipe.model';

export type RecipeTab = 'Service Recipe' | 'Network Recipe' | 'VNF Recipe';
export type RecipeDialogData =
  { tab: 'Service Recipe'; addNew: boolean; fData?: ServiceRecipe } |
  { tab: 'Network Recipe'; addNew: boolean; fData?: NetworkRecipe } |
  { tab: 'VNF Recipe'; addNew: boolean; fData?: VnfRecipe };

export interface RecipeDialogResult { saved: boolean; }
