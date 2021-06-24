import { Component, OnInit, Inject } from '@angular/core';
import { DataService } from '../data.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-recipe',
  templateUrl: './recipe.component.html',
  styleUrls: ['./recipe.component.scss']
})
export class RecipeComponent implements OnInit {

  constructor(private data: DataService, private spinner: NgxSpinnerService, private http: HttpClient,
    private popup: ToastrNotificationService,public dialogRef: MatDialogRef<RecipeComponent>,
    @Inject(MAT_DIALOG_DATA) public parentData: any) { }

  fileList = [];
  myform: FormGroup;
  modelName: FormControl;
  recipeTimeout: FormControl;
  nfRole: FormControl;
  modelVersionId: FormControl;
  operation: FormControl;
  orchestrationFlow: FormControl;
  isCancel: boolean = false;
  modeType: string = this.parentData.tab;

  ngOnInit() {
    this.createFormControls();
    this.createForm();
  }

  createFormControls() {
    let dd: any;
    if (!this.parentData.addNew) {
      let dd = this.parentData.fData;
      this.modelName = new FormControl(dd.modelName);
      if (dd.tab === 'Service Recipe') {
        this.modelVersionId = new FormControl(dd.serviceModelUUID);
      } else {
        this.modelVersionId = new FormControl(dd.versionStr);
      }
      if (dd.tab === 'Network Recipe') {
        this.nfRole = new FormControl(dd.nfRole,);
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

  getModelType (type: string) {
    if(type == 'Service Recipe') {
      return 'Service'
    } else if(type == 'Network Recipe') {
      return 'Network'
    } else {
      return 'VNF'
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
    if(this.parentData.isAdd === false) {
      this.myform = this.parentData.fData;
    }
  }

  onSubmit() {
    if (this.isCancel) {
      return;
    }
    if (this.myform.valid ) {
      console.log("Form Submitted!");
      console.log("formdata", this.myform.value)
      let data = this.myform.value;
      data['modelType'] = this.getModelType(this.parentData.tab);
      this.saveServiceRecipes(JSON.stringify(data));
      this.myform.reset();
    } else {
      this.popup.error("Please fill valid data.");
    }
  }

  closeDialog (evt: any) {
    this.isCancel = true
    this.dialogRef.close()
  }

  saveServiceRecipes(data: any): void {
    this.data.saveServiceRecipe(data)
      .subscribe((data: any) => {
        console.log(JSON.stringify(data));
        if(data != null) {
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
        this.popup.error("Unable to store bpmn data, Error code:" + error.status);
        this.spinner.hide();
        this.dialogRef.close()
    });
  }
}

