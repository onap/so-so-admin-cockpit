import { Component, OnInit, ViewChild } from '@angular/core';
import { DataService } from '../data.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { MatPaginator, MatSort, MatTableDataSource, MatTabChangeEvent } from '@angular/material';
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

  constructor(private data: DataService, private spinner: NgxSpinnerService,
    private popup: ToastrNotificationService, public dialog: MatDialog) { }

  fileList: File[] = [];
  serviceRecipe = new MatTableDataSource<ServiceRecipe>();
  networkRecipe = new MatTableDataSource<NetworkRecipe>();
  vnfRecipe = new MatTableDataSource<VnfRecipe>();

  displayedServiceColumns = Constants.DISPLAYED_COLUMNS_SERVICE;
  displayedNetworkColumns = Constants.DISPLAYED_COLUMNS_NETWORK;
  displayedVnfColumns = Constants.DISPLAYED_COLUMNS_VNF;
  pageSizeOptions = Constants.DEFAULT_PAGE_SIZE_OPTIONS;
  currentTab: RecipeTab = 'Service Recipe';

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  ngOnInit() {
    this.getServiceRecipe();
  }

  changeTab(event: MatTabChangeEvent): void {
    const tabs: RecipeTab[] = ['Service Recipe', 'Network Recipe', 'VNF Recipe'];
    const selected = tabs[event.index];
    if (!selected || selected === this.currentTab) { return; }
    this.currentTab = selected;
    this.reloadSelectedRecipes();
  }

  private reloadSelectedRecipes(): void {
    if (this.currentTab === 'Network Recipe') {
      this.getNetworkRecipe();
    } else if (this.currentTab === 'VNF Recipe') {
      this.getVnfRecipe();
    } else {
      this.getServiceRecipe();
    }
  }

  addRecipe(): void {
    if (this.currentTab === 'Service Recipe') {
      this.openRecipe({ tab: this.currentTab, addNew: true });
    } else if (this.currentTab === 'Network Recipe') {
      this.openRecipe({ tab: this.currentTab, addNew: true });
    } else {
      this.openRecipe({ tab: this.currentTab, addNew: true });
    }
  }

  editRecipe(recipe: ServiceRecipe | NetworkRecipe | VnfRecipe): void {
    if (this.currentTab === 'Service Recipe' && 'serviceModelUUID' in recipe) {
      this.openRecipe({ tab: this.currentTab, addNew: false, fData: recipe });
    } else if (this.currentTab === 'Network Recipe' && 'modelName' in recipe) {
      this.openRecipe({ tab: this.currentTab, addNew: false, fData: recipe });
    } else if (this.currentTab === 'VNF Recipe' && 'nfRole' in recipe) {
      this.openRecipe({ tab: this.currentTab, addNew: false, fData: recipe });
    }
  }

  private openRecipe(dialogData: RecipeDialogData): void {
    const dialogRef = this.dialog.open<RecipeComponent, RecipeDialogData, RecipeDialogResult>(RecipeComponent, {
      height: '500px',
      width: '600px',
      data: dialogData
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.saved) {
        this.reloadSelectedRecipes();
      }
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
        if (this.sort) { this.serviceRecipe.sort = this.sort; }
        if (this.paginator) {
          this.serviceRecipe.paginator = this.paginator;
          this.paginator.firstPage();
        }
      }, error => {
        console.log(error);
        this.popup.error('Unable to load service recipes, Error code:' + error.status);
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
      }, error => {
        console.log(error);
        this.popup.error('Unable to load network recipes, Error code:' + error.status);
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
      }, error => {
        console.log(error);
        this.popup.error('Unable to load VNF recipes, Error code:' + error.status);
        this.spinner.hide();
    });
  }

  onSubmit() {
    if (this.fileList.length > 0) {
      this.handleUpload();
    } else {
      this.popup.error('Please select atleast one file.');
    }
  }

  beforeUpload = (evt: Event): boolean => {
    this.fileList = [];
    if (evt) {
      const input = evt.currentTarget;
      if (!(input instanceof HTMLInputElement) || !input.files) { return false; }
      const file = input.files[0];
      if (!file) { return false; }
      if (file.name.endsWith('.war')) {
        this.fileList = this.fileList.concat(file);
      } else {
        this.popup.error('Invalid file format.');
      }
    }
    return false;
  }

  handleUpload(): void {
    if (this.fileList.length === 0) {
      return;
    }
    this.spinner.show();
    const formData = new FormData();
    this.fileList.forEach((file) => {
      formData.append('file', file, file.name);
    });
    this.data.onboardBPMNInfra(formData)
      .subscribe((data) => {
        this.spinner.hide();
        console.log(JSON.stringify(data));
        if (data !== null) {
          if (data.result === 'true') {
            this.popup.info(data.message || 'Workflow uploaded.');
          } else if (data.errMsg) {
            this.popup.error(data.errMsg);
          } else {
            this.popup.error(data.message || 'Unable to upload bpmn file.');
          }
        } else {
          this.popup.error('Unable to upload bpmn file: empty response.');
        }
      }, error => {
        console.log(error);
        this.popup.error('Unable to upload bpmn file, Error code:' + error.status);
        this.spinner.hide();
    });
  }
}

