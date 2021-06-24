export interface VnfRecipe {
    id: string;
    nfRole: string;
    paramXsd: string;
    vfModuleId: string;
    action: string;
    description: string;
    orchestrationUri: string;
    recipeTimeout: string;
    versionStr: string;
    serviceType: string;
    created: string;
  }
