import { Component, OnInit, Inject } from '@angular/core';
import { DataService } from '../data.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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
  modeType: RecipeTab = this.parentData.tab;

  ngOnInit() {
    this.createFormControls();
    this.createForm();
  }

  createFormControls() {
    const dialogData = this.parentData;
    if (!dialogData.addNew && dialogData.fData) {
      const dd = dialogData.fData;
      this.modelName = new FormControl(dialogData.tab === 'Network Recipe' ? dialogData.fData.modelName : '');
      if (dialogData.tab === 'Service Recipe') {
        this.modelVersionId = new FormControl(dialogData.fData.serviceModelUUID);
      } else {
        this.modelVersionId = new FormControl(dialogData.fData.versionStr);
      }
      if (dialogData.tab === 'VNF Recipe') {
        this.nfRole = new FormControl(dialogData.fData.nfRole,);
      } else {
        this.nfRole = new FormControl('',);
      }
      this.recipeTimeout = new FormControl(dd.recipeTimeout);
      this.operation = new FormControl(dd.action,);
      this.orchestrationFlow = new FormControl(dd.orchestrationUri,);
    } else {
      this.modelName = new FormControl('', );
      this.modelVersionId = new FormControl('', );
      this.operation = new FormControl('', );
      this.orchestrationFlow = new FormControl('',);
      this.nfRole = new FormControl('',);
      this.recipeTimeout = new FormControl('',);
    }
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

  onSubmit() {
    if (this.isCancel) {
      return;
    }
    if (this.myform.valid ) {
      console.log("Form Submitted!");
      console.log("formdata", this.myform.value)
      const values = this.myform.value;
      const data: RecipeRequest = {
        modelType: this.getModelType(this.parentData.tab),
        modelVersionId: values.modelVersionId,
        operation: values.operation,
        orchestrationFlow: values.orchestrationFlow,
        modelName: values.modelName,
        nfRole: values.nfRole,
        recipeTimeout: values.recipeTimeout
      };
      this.saveServiceRecipes(data);
      this.myform.reset();
    } else {
      this.popup.error("Please fill valid data.");
    }
  }

  closeDialog (evt: any) {
    this.isCancel = true
    this.dialogRef.close()
  }

  saveServiceRecipes(data: RecipeRequest): void {
    this.data.saveServiceRecipe(data)
      .subscribe((data) => {
        console.log(JSON.stringify(data));
        if(data === null) {
          this.popup.error('Unable to store recipe: empty response.');
        } else {
          if (data.id && data.id != "") {
            this.popup.info("Data stored in database.");
          } else if(data.errMsg) {
            this.popup.error(data.errMsg);
          }
        }
        this.spinner.hide();
        this.dialogRef.close()
      },error => {
        console.log(error);
        this.popup.error("Unable to store recipe, Error code:" + error.status);
        this.spinner.hide();
        this.dialogRef.close()
    });
  }
}

