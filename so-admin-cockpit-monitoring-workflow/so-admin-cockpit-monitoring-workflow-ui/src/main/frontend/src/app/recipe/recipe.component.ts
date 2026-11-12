import { Component, OnInit, Inject } from '@angular/core';
import { DataService } from '../data.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RecipeDialogData, RecipeDialogResult, RecipeTab } from '../model/recipe-dialog.model';
import { RecipeRequest } from '../model/recipeRequest.model';

@Component({
  selector: 'app-recipe',
  templateUrl: './recipe.component.html',
  styleUrls: ['./recipe.component.scss']
})
export class RecipeComponent implements OnInit {

  constructor(private data: DataService, private spinner: NgxSpinnerService, private http: HttpClient,
    private popup: ToastrNotificationService,public dialogRef: MatDialogRef<RecipeComponent, RecipeDialogResult>,
    @Inject(MAT_DIALOG_DATA) public parentData: RecipeDialogData) { }

  fileList = [];
  myform: FormGroup;
  modelName: FormControl;
  recipeTimeout: FormControl;
  nfRole: FormControl;
  modelVersionId: FormControl;
  operation: FormControl;
  orchestrationFlow: FormControl;
  isCancel: boolean = false;
  isSaving: boolean = false;
  saveError: string = '';
  modeType: RecipeTab = this.parentData.tab;
  private prefilledFlow?: string;

  ngOnInit() {
    this.createFormControls();
    this.createForm();
  }

  createFormControls() {
    const dialogData = this.parentData;
    this.prefilledFlow = undefined;
    this.modelName = new FormControl('', dialogData.tab === 'Network Recipe' ? Validators.required : []);
    this.modelVersionId = new FormControl('', Validators.required);
    this.operation = new FormControl('', Validators.required);
    this.orchestrationFlow = new FormControl('', Validators.required);
    this.nfRole = new FormControl('');
    // The current controller ignores this optional input and persists 180 seconds.
    this.recipeTimeout = new FormControl('', Validators.pattern(/^\d+$/));

    if (!dialogData.addNew && dialogData.fData) {
      this.recipeTimeout.setValue(dialogData.fData.recipeTimeout);
      this.operation.setValue(dialogData.fData.action);
      this.prefilledFlow = this.flowSuffix(dialogData.fData.orchestrationUri);
      this.orchestrationFlow.setValue(this.prefilledFlow);
      if (dialogData.tab === 'Service Recipe') {
        this.modelVersionId.setValue(dialogData.fData.serviceModelUUID);
      } else {
        this.modelVersionId.setValue(dialogData.fData.versionStr);
      }
      if (dialogData.tab === 'Network Recipe') {
        this.modelName.setValue(dialogData.fData.modelName);
      }
      if (dialogData.tab === 'VNF Recipe') {
        this.nfRole.setValue(dialogData.fData.nfRole);
      }
    }
  }

  private flowSuffix(uri: string): string {
    return uri.replace(/^\/mso\/async\/services\//, '');
  }

  getModelType (type: RecipeTab): RecipeRequest['modelType'] {
    if(type == 'Service Recipe') {
      return 'Service'
    } else if(type == 'Network Recipe') {
      return 'Network'
    } else {
      return 'Vnf'
    }
  }

  createForm() {
    this.myform = new FormGroup({
      modelName: this.modelName,
      nfRole: this.nfRole,
      recipeTimeout: this.recipeTimeout,
      modelVersionId: this.modelVersionId,
      operation: this.operation,
      orchestrationFlow: this.orchestrationFlow,
    });
  }

  onSubmit(): void {
    if (this.isCancel || this.isSaving) {
      return;
    }
    if (this.myform.invalid) {
      Object.keys(this.myform.controls).forEach(name => this.myform.controls[name].markAsTouched());
      this.popup.error('Please fill valid data.');
      return;
    }
    const values = this.myform.value;
    const data: RecipeRequest = {
      modelType: this.getModelType(this.parentData.tab),
      modelVersionId: values.modelVersionId,
      operation: values.operation,
      // The unchanged prefilled suffix has already lost its one server prefix.
      orchestrationFlow: values.orchestrationFlow === this.prefilledFlow ?
        values.orchestrationFlow : this.flowSuffix(values.orchestrationFlow),
      modelName: values.modelName,
      nfRole: values.nfRole,
      recipeTimeout: values.recipeTimeout
    };
    this.saveServiceRecipes(data);
  }

  closeDialog(evt: any): void {
    this.isCancel = true;
    this.dialogRef.close({ saved: false });
  }

  saveServiceRecipes(data: RecipeRequest): void {
    this.isSaving = true;
    this.saveError = '';
    this.data.saveServiceRecipe(data).pipe(
      finalize(() => {
        this.isSaving = false;
        this.spinner.hide();
      })
    ).subscribe(response => {
      if (response !== null && !('errMsg' in response) &&
          typeof response.id === 'string' && response.id.trim() !== '') {
        this.popup.info('Data stored in database.');
        this.myform.reset();
        this.dialogRef.close({ saved: true });
        return;
      }
      this.saveError = response === null ? 'Unable to store recipe: empty response.' :
        response.errMsg || 'Unable to store recipe: invalid save response.';
      this.popup.error(this.saveError);
    }, (error: HttpErrorResponse) => {
      this.saveError = 'Unable to store recipe, Error code:' + error.status;
      this.popup.error(this.saveError);
    });
  }
}
