(function() {
    'use strict';
    angular.module('omarApp').controller('ListController', [
        'stateService',
        'wfsService',
        'shareService',
        'downloadService',
        'beNumberService',
        '$stateParams',
        '$uibModal',
        'mapService',
        'jpipService',
        'avroMetadataService',
        '$scope',
        '$http',
        '$log',
        ListController
    ]);

    function ListController(stateService, wfsService, shareService, downloadService, beNumberService, $stateParams, $uibModal, mapService, jpipService, avroMetadataService, $scope, $http, $log) {

        // #################################################################################
        // AppO2.APP_CONFIG is passed down from the .gsp, and is a global variable.  It
        // provides access to various client params in application.yml
        // #################################################################################
        //console.log('AppO2.APP_CONFIG in ListController: ', AppO2.APP_CONFIG);

        /* jshint validthis: true */
        var vm = this;

        var thumbnailsBaseUrl,
            thumbnailsContextPath,
            thumbnailsRequestUrl;

        var uiBaseUrl,
            uiContextPath,
            uiRequestUrl;

        var wfsBaseUrl,
            wfsContextPath,
            wfsRequestUrl;

        var tlvBaseUrl,
            tlvContextPath,
            tlvRequestUrl;
        vm.tlvRequestUrl = '';

        var kmlBaseUrl,
            kmlContextPath,
            kmlRequestUrl;
        vm.kmlRequestUrl = '';

        var imageSpaceBaseUrl,
            imageSpaceContextPath,
            imageSpaceRequestUrl;
        vm.imageSpaceRequestUrl = '';

        var uiBaseUrl,
            uiContextPath,
            uiRequestUrl;
        vm.uiRequestUrl = '';

        var mensaBaseUrl,
            mensaContextPath,
            mensaRequestUrl;
        vm.mensaRequestUrl = '';

        function setlistControllerUrlProps() {

            thumbnailsBaseUrl = stateService.omarSitesState.url.base;
            thumbnailsContextPath = stateService.omarSitesState.url.omsContextPath;
            thumbnailsRequestUrl = thumbnailsBaseUrl + thumbnailsContextPath + '/imageSpace/getThumbnail';

            uiBaseUrl = stateService.omarSitesState.url.base;
            uiContextPath = stateService.omarSitesState.url.uiContextPath;
            uiRequestUrl = uiBaseUrl + uiContextPath;

            wfsBaseUrl = stateService.omarSitesState.url.base;
            wfsContextPath = stateService.omarSitesState.url.wfsContextPath;
            wfsRequestUrl = wfsBaseUrl + wfsContextPath + '/wfs?';
            vm.wfsRequestUrl = wfsRequestUrl;

            tlvBaseUrl = stateService.omarSitesState.url.base;
            tlvContextPath = stateService.omarSitesState.url.tlvContextPath;
            tlvRequestUrl = tlvBaseUrl + tlvContextPath;
            vm.tlvRequestUrl = tlvRequestUrl;

            kmlBaseUrl = stateService.omarSitesState.url.base;
            kmlContextPath = stateService.omarSitesState.url.kmlContextPath;
            kmlRequestUrl = kmlBaseUrl + kmlContextPath + '/superOverlay/createKml/';
            vm.kmlRequestUrl = kmlRequestUrl;

            imageSpaceBaseUrl = stateService.omarSitesState.url.base;
            imageSpaceContextPath = stateService.omarSitesState.url.omsContextPath;
            imageSpaceRequestUrl = imageSpaceBaseUrl + imageSpaceContextPath;
            vm.imageSpaceRequestUrl = imageSpaceRequestUrl;

            uiBaseUrl = stateService.omarSitesState.url.base;
            uiContextPath = stateService.omarSitesState.url.uiContextPath;
            uiRequestUrl = uiBaseUrl + uiContextPath;
            vm.uiRequestUrl = uiRequestUrl;

            mensaBaseUrl = stateService.omarSitesState.url.base;
            mensaContextPath = stateService.omarSitesState.url.mensaContextPath;
            mensaRequestUrl = mensaBaseUrl + mensaContextPath;
            vm.mensaRequestUrl = mensaRequestUrl;

        }

        vm.selectedOmar = '';

        // The list of urls we want to iterate over
        vm.sites = AppO2.APP_CONFIG.params.sites;
        vm.selectedUrl = AppO2.APP_CONFIG.params.sites[0].info.name;

        /**
         * Description: Updates the omar (o2) sites object from the select/dropdown
         */
        vm.changeOmarSiteUrl = function() {

            stateService.updateSitesAppState({
                infoName: vm.selectedOmar.info.name,
                infoDescription: vm.selectedOmar.info.description,
                urlBase: vm.selectedOmar.url.base,
                urlUiContextPath: vm.selectedOmar.url.uiContextPath,
                urlWfsContextPath: vm.selectedOmar.url.wfsContextPath,
                urlWmsContextPath: vm.selectedOmar.url.wmsContextPath,
                urlOmsContextPath: vm.selectedOmar.url.omsContextPath,
                urlGeoscriptContextPath: vm.selectedOmar.url.geoscriptContextPath,
                urlAvroMetadataContextPath: vm.selectedOmar.url.avroMetadataContextPath,
                urlMensaContextPath: vm.selectedOmar.url.mensaContextPath,
                urlStagerContextPath: vm.selectedOmar.url.stagerContextPath,
                urlDownloadContextPath: vm.selectedOmar.url.downloadContextPath,
                urlKmlContextPath: vm.selectedOmar.url.kmlContextPath,
                urlJpipContextPath: vm.selectedOmar.url.jpipContextPath,
                urlWmtsContextPath: vm.selectedOmar.url.wmtsContextPath,
                urlTlvContextPath: vm.selectedOmar.url.tlvContextPath
            });

        }

        /**
         * Sets the initial state for the sites that are loaded into the UI
         */
        stateService.updateSitesAppState({});

        $scope.$on('omarSitesState.updated', function(event, params) {

            setlistControllerUrlProps();
            wfsService.setWfsUrlProps();
            downloadService.setDownloadServiceUrlProps();
            wfsService.executeWfsQuery();
            mapService.updateFootprintsUrl();
            avroMetadataService.setAvroMetadataUrlProps();

            $scope.$apply(function() {

                thumbnailsBaseUrl = stateService.omarSitesState.url.base;
                thumbnailsContextPath = stateService.omarSitesState.url.omsContextPath;
                thumbnailsRequestUrl = thumbnailsBaseUrl + thumbnailsContextPath + '/imageSpace/getThumbnail';

                // Resets the thumbnails URL for the view
                vm.thumbPath = thumbnailsRequestUrl;

            });

        });

        vm.totalPaginationCount = 1000;
        vm.pageLimit = 10;

        if (AppO2.APP_CONFIG.params.misc.totalPaginationCount != undefined) {
            vm.totalPaginationCount = AppO2.APP_CONFIG.params.misc.totalPaginationCount;
        }
        if (AppO2.APP_CONFIG.params.misc.pageLimit != undefined) {
            vm.pageLimit = AppO2.APP_CONFIG.params.misc.pageLimit;
        }

        // DONE: Updated URL
        //vm.thumbPath = AppO2.APP_CONFIG.params.thumbnails.baseUrl;
        vm.thumbPath = thumbnailsRequestUrl;
        vm.thumbFilename = '&filename='; // Parameter provided by image.properties.filename
        vm.thumbEntry = '&entry='; // Parameter provided by image.properties.entry_id
        vm.thumbSize = '&thumbnailResolution=100';
        vm.thumbFormat = '&outputFormat=jpeg';

        vm.getImageSpaceUrl = function(image) {
            var defaults = imageSpaceDefaults;
            var properties = image.properties;

            // DONE: Updated URL
            return AppO2.APP_CONFIG.serverURL + '/omar/#/mapImage?' +
            //return uiRequestUrl + '/omar/#/mapImage?' +
            'bands=' + defaults.bands + '&' + 'brightness=' + defaults.brightness + '&' + 'contrast=' + defaults.contrast + '&' + 'entry_id=' + properties.entry_id + '&' + 'filename=' + properties.filename + '&' + 'height=' + properties.height + '&' + 'histOp=' + defaults.histOp + '&' + 'histCenterTile=' + defaults.histCenterTile + '&' + 'imageId=' + properties.id + '&' + 'numOfBands=' + properties.number_of_bands + '&' + 'resamplerFilter=' + defaults.resamplerFilter + '&' + 'sharpenMode=' + defaults.sharpenMode + '&' + 'width=' + properties.width + '&' + 'imageSpaceRequestUrl=' + imageSpaceRequestUrl + '&' + 'uiRequestUrl=' + uiRequestUrl + '&' + 'mensaRequestUrl=' + mensaRequestUrl + '&' + 'wfsRequestUrl=' + wfsRequestUrl;
        }

        vm.thumbBorder = function(imageType) {

            var border = {
                "border-color": "white",
                "border-width": "1px",
                "border-style": "solid",
                "border-radius": "4px"
            };

            switch (imageType) {
                default:
                    border["border-color"] = "white";

            }

            return border;
        };

        vm.listRefreshButtonVisible = AppO2.APP_CONFIG.params.misc.listRefreshButtonVisible;
        vm.refreshSpin = false;
        vm.refreshList = function() {

            wfsService.executeWfsQuery();
            vm.refreshSpin = true;

        }

        // Shows/Hides the KML SuperOverlay button based on parameters passed down
        // from application.yml
        vm.kmlSuperOverlayAppEnabled = AppO2.APP_CONFIG.params.kmlApp.enabled;
        if (vm.kmlSuperOverlayAppEnabled) {
            vm.kmlSuperOverlayLink = AppO2.APP_CONFIG.params.kmlApp.baseUrl;
        }

        // Shows/Hides the jpip stream button based on parameters passed down
        // from application.yml
        vm.jpipAppEnabled = AppO2.APP_CONFIG.params.jpipApp.enabled;
        if (vm.jpipAppEnabled) {
            vm.jpipLink = AppO2.APP_CONFIG.params.jpipApp.baseUrl;
        }

        vm.o2baseUrl = AppO2.APP_CONFIG.serverURL + '/omar';
        //vm.o2baseUrl = uiRequestUrl + '/omar';

        var imageSpaceDefaults = {
            bands: 'default',
            brightness: 0,
            contrast: 1,
            histOp: 'auto-minmax',
            histCenterTile: 'true',
            resamplerFilter: 'bilinear',
            sharpenMode: 'none'
        };

        //used in _map.partial.html.gsp
        vm.imageSpaceDefaults = imageSpaceDefaults;

        vm.displayFootprint = function(obj) {

            mapService.mapShowImageFootprint(obj);

        };

        vm.removeFootprint = function() {

            mapService.mapRemoveImageFootprint();

        };

        vm.getJpipStream = function($event, file, entry, projCode, index, type) {
            vm.showProcessInfo[index] = true;
            vm.processType = "Creating JPIP " + type;
            var TRACE = 0;
            if (TRACE) {
                console.log('list.getJpipStream entered...');
                console.log('file: ' + file);
                console.log('entry: ' + entry);
            }

            // Get the jpip stream. 3rd arg is projCode.  chip=image space.

            jpipService.getJpipStream($event, file, entry, projCode);

            $scope.$on('jpip: updated', function(event) {

                // Update the DOM (card list)
                $scope.$apply(function() {

                    vm.showProcessInfo[index] = false;

                });

            });

            if (TRACE) {
                console.log('list.getJpipStream exited...');
            }
        };

        vm.currentSortText = "Acquired (New)";

        vm.currentStartIndex = 1;

        vm.pagingChanged = function() {

            wfsService.updateAttrFilterPaginate((vm.currentStartIndex - 1) * wfsService.attrObj.pageLimit);

        };

        vm.sortWfs = function(field, type, text) {

            // Sets the text of the current sort method on the sort navbar
            vm.currentSortText = text;

            //wfsService.updateAttrFilter(undefined, field, type);
            wfsService.updateAttrFilter(wfsService.attrObj.filter, field, type);

        };

        vm.shareModal = function(imageLink) {
            shareService.imageLinkModal(imageLink);
        };

        vm.archiveDownload = function(imageId) {
            downloadService.downloadFiles(imageId);
        };

        // We need an $on event here to listen for changes to the
        // wfs.spatial and wfs.attr filters
        $scope.$on('spatialObj.updated', function(event, filter) {

            wfsService.executeWfsQuery();

        });

        $scope.$on('attrObj.updated', function(event, filter) {

            wfsService.executeWfsQuery();

        });

        $scope.$on('wfs: updated', function(event, data) {

            // Update the DOM (card list) with the data
            $scope.$apply(function() {

                vm.wfsData = data;
                $("#list").animate({
                    scrollTop: 0
                }, "fast");
                vm.refreshSpin = false;

            });

        });

        $scope.$on('wfs features: updated', function(event, features) {

            // Update the total feature count
            $scope.$apply(function() {
                vm.wfsFeatures = features;
                if (features != undefined) {
                    vm.wfsFeaturesTotalPaginationCount = Math.min(vm.totalPaginationCount, vm.wfsFeatures);
                }
            });

        });

        vm.showImageModal = function(imageObj, imageSpaceDefaults, imageSpaceRequestUrl, uiRequestUrl, mensaRequestUrl, wfsRequestUrl, tlvRequestUrl, kmlRequestUrl) {

            var modalInstance = $uibModal.open({
                size: 'lg',
                templateUrl: AppO2.APP_CONFIG.serverURL + '/views/list/list.image-card.partial.html',
                controller: [
                    'shareService',
                    'downloadService',
                    '$uibModalInstance',
                    'beNumberService',
                    'avroMetadataService',
                    '$scope',
                    'imageObj',
                    'imageSpaceDefaults',
                    'imageSpaceRequestUrl',
                    'uiRequestUrl',
                    'mensaRequestUrl',
                    'wfsRequestUrl',
                    'tlvRequestUrl',
                    'kmlRequestUrl',
                    ImageModalController
                ],
                controllerAs: 'vm',
                resolve: {
                    imageObj: function() {
                        return imageObj;
                    },
                    imageSpaceDefaults: function() {
                        return imageSpaceDefaults;
                    },
                    imageSpaceRequestUrl: function() {
                        return imageSpaceRequestUrl;
                    },
                    uiRequestUrl: function() {
                        return uiRequestUrl;
                    },
                    mensaRequestUrl: function() {
                        return mensaRequestUrl;
                    },
                    wfsRequestUrl: function() {
                        return wfsRequestUrl;
                    },
                    tlvRequestUrl: function() {
                        return tlvRequestUrl;
                    },
                    kmlRequestUrl: function() {
                        return kmlRequestUrl;
                    }
                }
            });

            modalInstance.result.then(function() {}, function() {
                //console.log('Modal dismissed at: ' + new Date());
            });

        };

        vm.viewOrtho = function(image, location) {
            var feature = new ol.format.GeoJSON().readFeature(image);

            var centerLat,
                centerLon;
            if (location) {
                centerLat = location[1];
                centerLon = location[0];
            } else {
                var extent = feature.getGeometry().getExtent();
                centerLat = (extent[1] + extent[3]) / 2;
                centerLon = (extent[0] + extent[2]) / 2;
            }

            var filter = "in(" + feature.getProperties().id + ")";

            // DONE: Updated URL
            //var tlvUrl = AppO2.APP_CONFIG.params.tlvApp.baseUrl + "?" +
            var tlvUrl = tlvRequestUrl + "?" + "bbox=" + extent.join(",") + "&" + "filter=" + filter + "&" + "location=" + [centerLat, centerLon].join(",");

            window.open(tlvUrl, "_blank");

        };
    }

    // Handles the selected image modal obj
    function ImageModalController(shareService, downloadService, $uibModalInstance, beNumberService, avroMetadataService, $scope, imageObj, imageSpaceDefaults, imageSpaceRequestUrl, uiRequestUrl, mensaRequestUrl, wfsRequestUrl, tlvRequestUrl, kmlRequestUrl) {

        var vm = this;

        vm.imageSpaceRequestUrl = imageSpaceRequestUrl;
        vm.uiRequestUrl = uiRequestUrl;
        vm.mensaRequestUrl = mensaRequestUrl;
        vm.wfsRequestUrl = wfsRequestUrl;

        vm.beData = [];
        vm.avroMetaData;

        vm.selectedImage = imageObj;
        //used in the modal _list.image-card.partial.html.gsp
        vm.imageSpaceDefaults = imageSpaceDefaults;

        //modal.rendered = false;

        //AppO2.APP_PATH is passed down from the .gsp
        vm.o2baseUrlModal = AppO2.APP_CONFIG.serverURL + '/omar';
        //vm.o2baseUrlModal = uiRequestUrl = '/omar';

        vm.placemarkConfig = AppO2.APP_CONFIG.params.misc.placemarks;
        vm.beLookupEnabled = (vm.placemarkConfig)
            ? true
            : false;

        vm.kmlSuperOverlayAppEnabled = AppO2.APP_CONFIG.params.kmlApp.enabled;
        if (vm.kmlSuperOverlayAppEnabled) {
            //vm.kmlSuperOverlayLink = AppO2.APP_CONFIG.params.kmlApp.baseUrl;
            vm.kmlRequestUrl = kmlRequestUrl;
        }

        var imageSpaceObj = {};

        if (imageObj) {
            imageSpaceObj = {
                filename: imageObj.properties.filename,
                entry: imageObj.properties.entry_id,
                imgWidth: imageObj.properties.width,
                imgHeight: imageObj.properties.height,
                numOfBands: imageObj.properties.number_of_bands,
                id: imageObj.properties.id
            };
        }

        vm.imageMapHelpPopover = {
            zoomHotkey: 'SHIFT',
            rotateHotkey: 'SHIFT + ALT',
            templateUrl: 'imageMapHelpTemplate.html',
            title: 'Help'
        };

        vm.getImageSpaceUrl = function(image) {
            var defaults = imageSpaceDefaults;
            var properties = image.properties;

            return AppO2.APP_CONFIG.serverURL + '/omar/#/mapImage?' + 'bands=' + defaults.bands + '&' + 'brightness=' + defaults.brightness + '&' + 'contrast=' + defaults.contrast + '&' + 'entry_id=' + properties.entry_id + '&' + 'filename=' + properties.filename + '&' + 'height=' + properties.height + '&' + 'histOp=' + defaults.histOp + '&' + 'histCenterTile=' + defaults.histCenterTile + '&' + 'imageId=' + properties.id + '&' + 'numOfBands=' + properties.number_of_bands + '&' + 'resamplerFilter=' + defaults.resamplerFilter + '&' + 'sharpenMode=' + defaults.sharpenMode + '&' + 'width=' + properties.width + '&' + 'imageSpaceRequestUrl=' + imageSpaceRequestUrl + '&' + 'uiRequestUrl=' + uiRequestUrl + '&' + 'mensaRequestUrl=' + mensaRequestUrl + '&' + 'wfsRequestUrl=' + wfsRequestUrl;

        }

        // Used to show/hide the 'Image not found message'
        vm.showAvroMetadata = true;

        // Executes a query to the omar-avro-metadata service to pull
        // in the associated Avro metadata information
        vm.loadAvroMetadata = function loadAvroMetadata() {

            // Checks to see if there is a valid imageId to pass in
            // otherwise we need to use the image's filename
            if (imageObj.properties.title === undefined || imageObj.properties.title === '') {

                // If there isn't a filename we just return and show the image can not be
                // found message
                if (imageObj.properties.filename === undefined || imageObj.properties.filename === '') {

                    // Shows the 'Could not find Avro metadata for the selected image.' message
                    vm.showAvroMetadata = false;
                    return;

                }

                var fileFullPath = imageObj.properties.filename;
                // Split at the dot so that we can start getting to only the filename
                var fileFullPathSplit = fileFullPath.split(".")[0];
                // Remove the slashes, and the filepath
                var fileName = fileFullPathSplit.replace(/^.*[\\\/]/, '');

                avroMetadataService.getAvroMetadata(fileName);

            } else {

                avroMetadataService.getAvroMetadata(imageObj.properties.title);

            }

        }

        // Updates the data in the Metadata modal after a
        // a user clicks on the Avro tab
        $scope.$on('avroMetadata: updated', function(event, data) {

            // If there isn't any data show the 'not found message'
            if (!data) {

                vm.showAvroMetadata = false;

            } else {

                // Bind the image metadata to the UI
                $scope.$apply(function() {

                    vm.avroMetadata = data;

                });

            }

        });

        vm.loadBeData = function loadBeData(geom) {
            vm.beData = beNumberService.getBeData(new ol.geom.MultiPolygon(imageObj.geometry.coordinates));
        };

        vm.calcRes = function calcRes() {
            var bbox = new ol.geom.MultiPolygon(vm.selectedImage.geometry.coordinates).getExtent();
            var res = (bbox[2] - bbox[0]) / vm.selectedImage.properties.width;

            return res;
        };

        vm.cancel = function() {
            $uibModalInstance.close('paramObj');
        };

        vm.dismiss = function() {
            $uibModalInstance.dismiss('cancel');
        };

        vm.shareModal = function(imageLink) {
            shareService.imageLinkModal(imageLink);
        };

        vm.archiveDownload = function(imageId) {
            downloadService.downloadFiles(imageId);
        };

        vm.viewOrtho = function(image, location) {
            var feature = new ol.format.GeoJSON().readFeature(image);

            var centerLat,
                centerLon;
            if (location) {
                centerLat = location[1];
                centerLon = location[0];
            } else {
                var extent = feature.getGeometry().getExtent();
                centerLat = (extent[1] + extent[3]) / 2;
                centerLon = (extent[0] + extent[2]) / 2;
            }

            var filter = "in(" + feature.getProperties().id + ")";

            var tlvUrl = tlvRequestUrl + "?" + "bbox=" + extent.join(",") + "&" + "filter=" + filter + "&" + "location=" + [centerLat, centerLon].join(",");

            window.open(tlvUrl, "_blank");
        };

        $scope.$on('placemarks: updated', function(event, data) {
            // Update the DOM (card list)
            $scope.$apply(function() {
                vm.beData = data;
            });

        });
    }

})();
