(function() {

  'use strict';

  function abdTableController($mdDialog, $timeout, $mdMedia, $scope) {
    var ctrl = this,
    reverse = {},
    previousOrderField = null,
    previousMenuField = null,
    deleteItems = [],
    fieldLeftSize = 100,
    fieldNum = 0,
    firstRequest = true,
    numItems = 0;

    ctrl.$mdMedia = $mdMedia;
    ctrl.showMenu = {};
    ctrl.deleteFilter = {};
    ctrl.isCleanable = {};

    ctrl.orderFunc = function (field) {
      if(angular.isUndefined(reverse[field])){
        reverse[field] = false;
      }

      if (previousOrderField != field) {
        reverse[previousOrderField] = false;
      }

      ctrl.onOrder({$field: field, $reverse: reverse[field]});
      reverse[field] = !reverse[field];
      previousOrderField = field;
      ctrl.dynamicItems = new DynamicItems();
    };

    ctrl.filterFunc = function (field, filterTab) {
      if (filterTab.length != 0) {
        ctrl.deleteFilter[field] = false;
        ctrl.isCleanable[field] = true;
      }else{
        ctrl.isCleanable[field] = false;
      }

      ctrl.onFilter({$field: field, $filterTab: filterTab});
      ctrl.dynamicItems = new DynamicItems(ctrl.dynamicItems.loadedPages);
      ctrl.keepTable = true;
    };

    ctrl.deleteFilter = function (field) {
      ctrl.deleteFilter[field] = true;
      ctrl.filterFunc(field, []);
      ctrl.dynamicItems = new DynamicItems(ctrl.dynamicItems.loadedPages);
    };

    ctrl.closeMenu = function (field) {
      ctrl.showMenu[field] = false;
    };

    ctrl.openMenu = function (field) {
      if (previousMenuField != field) {
        ctrl.showMenu[previousMenuField] = false;
      }
      ctrl.showMenu[field] = true;
      previousMenuField = field;
    };

    ctrl.changeState = function (id) {
      if (!ctrl.isDeletable && ctrl.boSref) {
        ctrl.boSref({$id: id});
      }
    };

    ctrl.getVirtualHeight = function () {
      let size;
      if (!angular.isUndefined(ctrl.refresh)) {
        size = 320;
      } else {
        size = ctrl.dynamicItems.numItems * 51;
      }
      return {'height': (size > 450 ? 450 : size) + "px"};
    };

    ctrl.getFieldSize = function (index) {
      if (ctrl.headers[index].flex) {
        return {'width': ctrl.headers[index].flex + "%", 'padding': "16"};
      } else {
        return {'width': (fieldLeftSize/fieldNum) + "%", 'padding': "16"};
      }
    };
    ctrl.getSpanStyle = function (style) {
      if(style) {
        style["padding"] = "0 20px 0 0";
        return style;
      } else {
        return {"text-transform": "uppercase", "padding": "0 20px 0 0"};
      }
    };

    ctrl.headerPosition = function(){
      if (ctrl.timeoutDone) {
        var width = angular.element('#virtual-repeat')[0].children[0].clientWidth;
        return {'width': width+'px'}
      }
    };

    ctrl.addDeletableItem = function (id, state) {
      if (state) {
        deleteItems.push(id);
      } else {
        deleteItems.splice(deleteItems.indexOf(id), 1);
      }
    };

    ctrl.rowColor = function (color) {
      if (color != null) {
        return {'background-color':  color, 'color': "#FFF", 'padding': "5px", 'font-weight': "bold"};
      }
    };

    var DynamicItems = function(loadedPages = {}) {
      this.loadedPages = loadedPages;
      this.numItems = numItems;
      this.PAGE_SIZE = 50;
      this.fetchNumItems_();
    };

    DynamicItems.prototype.getItemAtIndex = function(index) {
      var pageNumber = Math.floor(index / this.PAGE_SIZE);
      var page = this.loadedPages[pageNumber];

      if (page) {
        return page[index % this.PAGE_SIZE];
      } else if (page !== null) {
        this.fetchPage_(pageNumber);
      }
    };

    DynamicItems.prototype.getLength = function() {
      return this.numItems;
    };

    DynamicItems.prototype.fetchPage_ = function(pageNumber) {
      this.loadedPages[pageNumber] = null;
      ctrl.getItems({$offset: pageNumber}).then(angular.bind(this, function(response) {
        this.loadedPages[pageNumber] = [];
        this.loadedPages[pageNumber] = response.rows;
        numItems = response.numItems;
        this.numItems = response.numItems;
      }));
    };

    DynamicItems.prototype.fetchNumItems_ = function() {
      ctrl.isLoading = true;
      ctrl.getItems({$offset: 0}).then(angular.bind(this, function(response) {
        numItems = response.numItems;
        this.numItems = response.numItems;
        this.loadedPages[0] = response.rows;
        if (this.numItems == 0 && firstRequest) {
          ctrl.keepTable = false;
        } else {
          ctrl.keepTable = true;
        }
        ctrl.isLoading = false;
      }));
    };

    ctrl.$onInit = function () {
      ctrl.dynamicItems = new DynamicItems();
    };

    ctrl.$onChanges = function ($event) {
      if (!angular.isUndefined($event.refresh)) {
        if ($event.refresh.currentValue) {
          ctrl.getItems().then(response => {
            response.numItems == 0 && firstRequest ? ctrl.keepTable = false : ctrl.keepTable = true;
            this.dynamicItems.numItems = response.numItems;
          });
        }
      }

      if (!angular.isUndefined($event.reset)) {
        if (ctrl.dynamicItems && $event.reset.currentValue) {
          ctrl.dynamicItems = new DynamicItems(ctrl.dynamicItems.loadedPages);
        }
      }

      if (!angular.isUndefined($event.headers) && !angular.isUndefined($event.headers.currentValue)) {
        if ($event.headers.currentValue.length != 0 && firstRequest) {
          fieldNum = ctrl.headers.length
          for (var i = 0; i < fieldNum; i++) {
            if(ctrl.headers[i].flex){
              fieldLeftSize -= ctrl.headers[i].flex;
              fieldNum -= 1;
            }
          }
          firstRequest = false;
        }
      }

      if (!angular.isUndefined($event.isDeletable)) {
        if ($event.isDeletable.currentValue) {
          var confirmMsg;
          deleteItems = [];
        } else if (deleteItems.length != 0){
          !angular.isUndefined(ctrl.confirmMsg) ? confirmMsg = ctrl.confirmMsg : confirmMsg = "'Tout acte de création est d'abord un acte de destruction. N'est-ce pas ?' (Pablo Picasso)"
          var confirm = $mdDialog.confirm()
          .title(confirmMsg)
          .ok('Oui')
          .cancel('Annuler')
          .clickOutsideToClose(true);

          $mdDialog.show(confirm).then(function () {
            ctrl.onDelete({$deletableItems: deleteItems})
          });
        }
      }
    };
  };

  abdTableController.$inject = ['$mdDialog', '$timeout', '$mdMedia', '$scope'];

  angular.module('abd.table').component('abdTable', {
    templateUrl: './abdTable.html',
    bindings:{
      headers: '<',
      getItems: '&',
      filterList: '<?',
      reset: '<?',
      refresh: '<?',
      isDeletable: '<?',
      confirmMsg: '<?',
      boSref: '&?',
      onOrder: '&?',
      onFilter: '&?',
      onDelete: '&?',
      containerSize: '<?'
    },
    controllerAs: "ctrl",
    controller: abdTableController
  });
})();
