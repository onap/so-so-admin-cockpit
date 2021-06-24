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
  currentTab:String = 'Service Recipe'

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
    const dialogRef = this.dialog.open(RecipeComponent, {
      height: '500px',
      width: '600px',
      data: {
        tab: this.currentTab,
        addNew: isAdd,
        fData: isAdd ? {} : evt
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.changeTab(this.currentTab)
    });
  }

  getServiceRecipe () {
    this.data.getServiceRecipe()
      .subscribe((data: any) => {
        console.log(JSON.stringify(data));
        this.serviceRecipe = new MatTableDataSource<ServiceRecipe>(data.serviceRecipes);
        this.serviceRecipe.sort = this.sort;
        this.serviceRecipe.paginator = this.paginator;
        this.serviceRecipe.paginator.firstPage();
      },error => {
        console.log(error);
        console.log("Unable to store bpmn data, Error code:" + error.status);
        this.spinner.hide();
    });
  }

  getNetworkRecipe () {
    this.data.getNetworkRecipe()
      .subscribe((data: any) => {
        this.networkRecipe = new MatTableDataSource<NetworkRecipe>(data.networkRecipes);
        console.log(JSON.stringify(data));
      },error => {
        console.log(error);
        console.log("Unable to store bpmn data, Error code:" + error.status);
        this.spinner.hide();
    });
  }

  getVnfRecipe () {
    this.data.getVnfRecipe()
      .subscribe((data: any) => {
        this.vnfRecipe = new MatTableDataSource<VnfRecipe>(data.vnfRecipes);
        console.log(JSON.stringify(data));
      },error => {
        console.log(error);
        console.log("Unable to store bpmn data, Error code:" + error.status);
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
      if(file.name.includes(".war")) {
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
      .subscribe((data: any) => {
        this.spinner.hide();
        console.log(JSON.stringify(data));
        if(data != null) {
          if(data.result == "true") {
            this.popup.info(data.message);
          } else if(data.errMsg) {
            this.popup.error(data.errMsg);
          } else {
            this.popup.error(data.message);
          }
        }
      },error => {
        console.log(error);
        this.popup.error("Unable to upload bpmn file, Error code:" + error.status);
        this.spinner.hide();
    });
  }
}

