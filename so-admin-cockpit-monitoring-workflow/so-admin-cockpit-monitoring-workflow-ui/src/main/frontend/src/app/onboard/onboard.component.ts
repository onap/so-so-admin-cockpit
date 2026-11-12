import { Component, OnInit, ViewChild } from '@angular/core';
import { DataService } from '../data.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { HttpClient } from '@angular/common/http';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { MatPaginator, MatSort, MatTableDataSource } from '@angular/material';
import { ServiceRecipe } from '../model/serviceRecipe.model';
import { NetworkRecipe } from '../model/networkRecipe.model';
import { VnfRecipe } from '../model/vnfRecipe.model';
import { Constants } from './onboard.constant';
import { MatDialog } from '@angular/material/dialog';
import { RecipeComponent } from '../recipe/recipe.component';
import { RecipeDialogData, RecipeDialogResult, RecipeTab } from '../model/recipe-dialog.model';

@Component({
  selector: 'app-onboard',
  templateUrl: './onboard.component.html',
  styleUrls: ['./onboard.component.scss']
})
export class OnboardComponent implements OnInit {

  constructor(private data: DataService, private spinner: NgxSpinnerService, private http: HttpClient,
    private popup: ToastrNotificationService, public dialog: MatDialog) { }

  fileList = [];
  serviceRecipe: MatTableDataSource<ServiceRecipe>;
  networkRecipe: MatTableDataSource<NetworkRecipe>;
  vnfRecipe: MatTableDataSource<VnfRecipe>;

  displayedServiceColumns = Constants.DISPLAYED_COLUMNS_SERVICE;
  displayedNetworkColumns = Constants.DISPLAYED_COLUMNS_NETWORK;
  displayedVnfColumns = Constants.DISPLAYED_COLUMNS_VNF;
  pageSizeOptions = Constants.DEFAULT_PAGE_SIZE_OPTIONS;
  currentTab: RecipeTab = 'Service Recipe'

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  ngOnInit() {
    this.createFormControls();
    this.getServiceRecipe()
  }

  createFormControls() {
    let tabDiv = document.getElementsByClassName('mat-tab-label-container')
    var bDiv = document.createElement("div");
    bDiv.className = 'addRecipe';  
    var node = document.createElement("button");
    node.className = 'btn btn-primary';  
    node.title = 'Click here to add recipes or update existing recipes in the SO-Catalog';
    node.addEventListener("click", this.addRecipe.bind(this));
    var textnode = document.createTextNode("Add Recipe");         
    node.appendChild(textnode); 
    bDiv.appendChild(node)                             
    tabDiv[0].appendChild(bDiv);
  }

  changeTab(evt: any) {
    if (evt.tab) {
      this.currentTab = evt.tab.textLabel
    }
    if (this.currentTab === 'Network Recipe') {
      this.getNetworkRecipe()
    } else if (this.currentTab === 'VNF Recipe') {
      this.getVnfRecipe()
    } else {
      this.getServiceRecipe()
    }
    
  }

  addRecipe(evt: any) {
    let isAdd = false;
    if (evt.currentTarget) {
      isAdd = true
    }
    let dialogData: RecipeDialogData;
    if (this.currentTab === 'Service Recipe') {
      dialogData = { tab: this.currentTab, addNew: isAdd, fData: isAdd ? undefined : evt };
    } else if (this.currentTab === 'Network Recipe') {
      dialogData = { tab: this.currentTab, addNew: isAdd, fData: isAdd ? undefined : evt };
    } else {
      dialogData = { tab: this.currentTab, addNew: isAdd, fData: isAdd ? undefined : evt };
    }
    const dialogRef = this.dialog.open<RecipeComponent, RecipeDialogData, RecipeDialogResult>(RecipeComponent, {
      height: '500px',
      width: '600px',
      data: dialogData
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.changeTab(this.currentTab)
    });
  }

  getServiceRecipe () {
    this.data.getServiceRecipe()
      .subscribe((data) => {
        if (data === null) {
          this.popup.error('Unable to load service recipes: empty response.');
          this.spinner.hide();
          return;
        }
        if ('errMsg' in data) {
          this.popup.error(data.errMsg);
          this.spinner.hide();
          return;
        }
        console.log(JSON.stringify(data));
        this.serviceRecipe = new MatTableDataSource<ServiceRecipe>(data.serviceRecipes);
        this.serviceRecipe.sort = this.sort;
        this.serviceRecipe.paginator = this.paginator;
        this.serviceRecipe.paginator.firstPage();
      },error => {
        console.log(error);
        this.popup.error("Unable to load service recipes, Error code:" + error.status);
        this.spinner.hide();
    });
  }

  getNetworkRecipe () {
    this.data.getNetworkRecipe()
      .subscribe((data) => {
        if (data === null) {
          this.popup.error('Unable to load network recipes: empty response.');
          this.spinner.hide();
          return;
        }
        if ('errMsg' in data) {
          this.popup.error(data.errMsg);
          this.spinner.hide();
          return;
        }
        this.networkRecipe = new MatTableDataSource<NetworkRecipe>(data.networkRecipes);
        console.log(JSON.stringify(data));
      },error => {
        console.log(error);
        this.popup.error("Unable to load network recipes, Error code:" + error.status);
        this.spinner.hide();
    });
  }

  getVnfRecipe () {
    this.data.getVnfRecipe()
      .subscribe((data) => {
        if (data === null) {
          this.popup.error('Unable to load VNF recipes: empty response.');
          this.spinner.hide();
          return;
        }
        if ('errMsg' in data) {
          this.popup.error(data.errMsg);
          this.spinner.hide();
          return;
        }
        this.vnfRecipe = new MatTableDataSource<VnfRecipe>(data.vnfRecipes);
        console.log(JSON.stringify(data));
      },error => {
        console.log(error);
        this.popup.error("Unable to load VNF recipes, Error code:" + error.status);
        this.spinner.hide();
    });
  }

  onSubmit() {
    if(this.fileList.length > 0) {
      this.handleUpload();
    } else {
      this.popup.error("Please select atleast one file.");
    }
  }

  beforeUpload = (evt: any): boolean => {
    this.fileList = [];
    if(evt) {
      let file = evt.currentTarget.files[0];
      if (!file) { return false; }
      if(file.name.endsWith(".war")) {
        this.fileList = this.fileList.concat(file);
      } else {
        this.popup.error("Invalid file format.");
      }
    }
    return false;
  };

  handleUpload(): void {
    if (this.fileList.length == 0) {
      return;
    }
    this.spinner.show()
    const formData = new FormData();
    this.fileList.forEach((file: any) => {
      formData.append('file', file, file.name);
    });
    this.data.onboardBPMNInfra(formData)
      .subscribe((data) => {
        this.spinner.hide();
        console.log(JSON.stringify(data));
        if(data !== null) {
          if(data.result == "true") {
            this.popup.info(data.message || 'Workflow uploaded.');
          } else if(data.errMsg) {
            this.popup.error(data.errMsg);
          } else {
            this.popup.error(data.message || 'Unable to upload bpmn file.');
          }
        } else {
          this.popup.error('Unable to upload bpmn file: empty response.');
        }
      },error => {
        console.log(error);
        this.popup.error("Unable to upload bpmn file, Error code:" + error.status);
        this.spinner.hide();
    });
  }
}

