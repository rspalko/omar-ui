(function() {
  "use strict";
  angular
    .module("omarApp")
    .service("imageSpaceService", [
      "$rootScope",
      "$http",
      "stateService",
      "wfsService",
      "$timeout",
      "$q",
      "$stateParams",
      imageSpaceService
    ]);

  function imageSpaceService(
    $rootScope,
    $http,
    stateService,
    wfsService,
    $timeout,
    $q,
    $stateParams
  ) {
    // #################################################################################
    // AppO2.APP_CONFIG is passed down from the .gsp, and is a global variable.  It
    // provides access to various client params in application.yml
    // #################################################################################
    //console.log('AppO2.APP_CONFIG in imageSpaceService: ', AppO2.APP_CONFIG);

    var map,
      filename,
      entry,
      format,
      histCenterTile,
      histOp,
      imageGeometry,
      imageProperties,
      imgWidth,
      imgHeight,
      tileX,
      tileY,
      tileZ,
      imgCenter,
      proj,
      resamplerFilter,
      sharpenMode,
      source,
      source2,
      upAngle,
      northAngle,
      bands,
      numOfBands,
      brightness,
      numResLevels,
      contrast,
      urlString,
      imgID,
      transparent,
      imageData,
      wfsRequestUrl;

    var imageSpaceBaseUrl, imageSpaceContextPath, imageSpaceRequestUrl;

    var uiBaseUrl, uiContextPath, uiRequestUrl;

    var mensaBaseUrl, mensaContextPath, mensaRequestUrl;

    /**
     * Description: Updates all of the url endpoints via the stateService omarSitesState object
     */
    this.setImageServiceUrlProps = function() {
      imageSpaceBaseUrl = stateService.omarSitesState.url.base;
      imageSpaceContextPath = stateService.omarSitesState.url.omsContextPath;
      imageSpaceRequestUrl = $stateParams.imageSpaceRequestUrl + "/imageSpace";

      uiBaseUrl = stateService.omarSitesState.url.base;
      uiContextPath = stateService.omarSitesState.url.uiContextPath;
      uiRequestUrl = $stateParams.uiRequestUrl;

      mensaBaseUrl = stateService.omarSitesState.url.base;
      mensaContextPath = stateService.omarSitesState.url.mensaContextPath;
      mensaRequestUrl = $stateParams.mensaRequestUrl + "/mensa";
    };
    this.setImageServiceUrlProps();

    // Measurement variables
    var measureSource = new ol.source.Vector();

    var vector = new ol.layer.Vector({
      source: measureSource,
      style: new ol.style.Style({
        fill: new ol.style.Fill({ color: "rgba(255, 255, 255, 0.3)" }),
        stroke: new ol.style.Stroke({ color: "cyan", width: 3 }),
        image: new ol.style.Circle({
          radius: 3,
          fill: new ol.style.Fill({ color: "cyan" })
        })
      })
    });

    var type, sketch, draw, helpTooltipElement, helpTooltip;

    var continuePolygonMsg = "Click to continue drawing the polygon";
    var continueLineMsg = "Click to continue drawing the line";
    // end Measurement variables

    var ImageSpaceTierSizeCalculation = {
      DEFAULT: "default",
      TRUNCATED: "truncated"
    };

    var RotateNorthControl = function(opt_options) {
      var options = opt_options || {};
      var span = document.createElement("span");
      span.className = "ol-compass";
      span.textContent = "\u21E7";

      var button = document.createElement("button");
      button.appendChild(span);
      button.title = "North is Up";

      var this_ = this;

      var handleRotateNorth = function(e) {
        this_
          .getMap()
          .getView()
          .setRotation(northAngle);
      };

      button.addEventListener("click", handleRotateNorth, false);
      button.addEventListener("touchstart", handleRotateNorth, false);

      var element = document.createElement("div");

      element.className = "rotate-north ol-unselectable ol-control";
      element.appendChild(button);

      ol.control.Control.call(this, {
        element: element,
        target: options.target
      });
    };

    ol.inherits(RotateNorthControl, ol.control.Control);

    function rotateNorthArrow(radians) {
      var transform = "rotate(" + radians + "rad)";
      var arrow = $(".ol-compass");
      arrow.css("msTransform", transform);
      arrow.css("transform", transform);
      arrow.css("webkitTransform", transform);
    }

    var RotateUpControl = function(opt_options) {
      var options = opt_options || {};
      var button = document.createElement("button");

      button.innerHTML = "U";
      button.title = "Up is Up";

      var this_ = this;

      var handleRotateUp = function(e) {
        this_
          .getMap()
          .getView()
          .setRotation(upAngle);
      };

      button.addEventListener("click", handleRotateUp, false);
      button.addEventListener("touchstart", handleRotateUp, false);

      var element = document.createElement("div");

      element.className = "rotate-up ol-unselectable ol-control";
      element.appendChild(button);

      ol.control.Control.call(this, {
        element: element,
        target: options.target
      });
    };
    ol.inherits(RotateUpControl, ol.control.Control);

    var ImageSpace = function(opt_options) {
      var options = opt_options || {};

      var size = options.size;
      var tierSizeCalculation =
        options.tierSizeCalculation !== undefined
          ? options.tierSizeCalculation
          : ImageSpaceTierSizeCalculation.DEFAULT;

      var filename = options.filename;
      var entry = options.entry;
      var outputFormat = options.outputFormat;

      var imageWidth = size[0];
      var imageHeight = size[1];
      var tierSizeInTiles = [];
      var tileSize = ol.DEFAULT_TILE_SIZE || 256;

      switch (tierSizeCalculation) {
        case ImageSpaceTierSizeCalculation.DEFAULT:
          while (imageWidth > tileSize || imageHeight > tileSize) {
            tierSizeInTiles.push([
              Math.ceil(imageWidth / tileSize),
              Math.ceil(imageHeight / tileSize)
            ]);
            tileSize += tileSize;
          }
          break;
        case ImageSpaceTierSizeCalculation.TRUNCATED:
          var width = imageWidth;
          var height = imageHeight;
          while (width > tileSize || height > tileSize) {
            tierSizeInTiles.push([
              Math.ceil(width / tileSize),
              Math.ceil(height / tileSize)
            ]);
            width >>= 1;
            height >>= 1;
          }
          break;
        default:
          goog.asserts.fail();
          break;
      }

      tierSizeInTiles.push([1, 1]);
      tierSizeInTiles.reverse();

      var resolutions = [1];
      var tileCountUpToTier = [0];
      var i = 1,
        ii = tierSizeInTiles.length;
      while (i < ii) {
        resolutions.push(1 << i);
        tileCountUpToTier.push(
          tierSizeInTiles[i - 1][0] * tierSizeInTiles[i - 1][1] +
            tileCountUpToTier[i - 1]
        );
        i++;
      }

      resolutions.reverse();

      var extent = [0, -size[1], size[0], 0];
      var tileGrid = new ol.tilegrid.TileGrid({
        extent: extent,
        origin: ol.extent.getTopLeft(extent),
        resolutions: resolutions
      });

      var url = options.url;

      function tileUrlFunction(tileCoord, pixelRatio, projection) {
        if (!tileCoord) {
          return undefined;
        } else {
          tileZ = tileCoord[0];
          tileX = tileCoord[1];
          tileY = -tileCoord[2] - 1;

          return (
            url +
            "?" +
            "bands=" +
            bands +
            "&brightness=" +
            brightness +
            "&contrast=" +
            contrast +
            "&entry=" +
            entry +
            "&filename=" +
            filename +
            "&height=" +
            imgHeight +
            "&histOp=" +
            histOp +
            "&histCenterTile=" +
            histCenterTile +
            "&numOfBands=" +
            numOfBands +
            "&numResLevels=" +
            numResLevels +
            "&outputFormat=" +
            outputFormat +
            "&resamplerFilter=" +
            resamplerFilter +
            "&sharpenMode=" +
            sharpenMode +
            "&transparent=" +
            transparent +
            "&width=" +
            imgWidth +
            "&x=" +
            tileX +
            "&y=" +
            tileY +
            "&z=" +
            tileZ
          );
        }
      }

      ol.source.TileImage.call(this, {
        attributions: options.attributions,
        logo: options.logo,
        reprojectionErrorThreshold: options.reprojectionErrorThreshold,
        tileClass: ol.source.ZoomifyTile,
        tileGrid: tileGrid,
        tileUrlFunction: tileUrlFunction
      });
    };

    ol.inherits(ImageSpace, ol.source.TileImage);

    this.initImageSpaceMap = function(params) {
      filename = params.filename;
      entry = params.entry;
      histOp = params.histOp || "auto-minmax";
      histCenterTile = params.histCenterTile || "true";
      imgWidth = params.imgWidth;
      imgHeight = params.imgHeight;
      numOfBands = params.numOfBands;
      bands = params.bands || "default";
      imgID = params.imageId;
      brightness = params.brightness || 0;
      contrast = params.contrast || 1;
      numResLevels = params.numResLevels || 1;
      resamplerFilter = params.resamplerFilter || "bilinear";
      sharpenMode = params.sharpenMode || "none";
      transparent = params.transparent || "true";
      wfsRequestUrl = params.wfsRequestUrl; // TODO: Add a default in case this is undefined

      // Sets header title and grabs the image's metadata
      wfsService
        .getImageProperties(wfsRequestUrl, filename)
        .then(function(response) {
          imageData = response;
          imageGeometry = imageData.geometry;
          imageProperties = imageData.properties;
        });

      // Make AJAX call here to getAngles with filename & entry as args
      // to get the upAngle and northAngle values
      $http({
        method: "GET",
        url: imageSpaceRequestUrl + "/getAngles",
        params: {
          filename: filename,
          entry: entry
        }
      }).then(
        function successCallback(response) {
          upAngle = response.data.upAngle;
          northAngle = response.data.northAngle;

          // it is likely that the "sensor up" and "north up" are not the same
          rotateNorthArrow(northAngle);
          // default the view to be "up is up"
          map.getView().setRotation(upAngle);
        },
        function errorCallback(response) {
          console.error(response);
        }
      );

      imgCenter = [imgWidth / 2, -imgHeight / 2];

      // Maps always need a projection, but Zoomify layers are not geo-referenced, and
      // are only measured in pixels.  So, we create a fake projection that the map
      // can use to properly display the layer.
      proj = new ol.proj.Projection({
        code: "ImageSpace",
        //units: "pixels",
        code: 'EPSG:21781',
        units: 'm',
        extent: [0, 0, imgWidth, imgHeight]
      });

      source = new ImageSpace({
        url: imageSpaceRequestUrl + "/getTile",
        filename: filename,
        entry: entry,
        outputFormat: "jpeg",
        size: [imgWidth, imgHeight],
        numOfBands: numOfBands,
        bands: bands,
        numResLevels: numResLevels,
        brightness: brightness,
        contrast: contrast,
        histOp: histOp,
        histCenterTile: histCenterTile,
        resamplerFilter: resamplerFilter,
        sharpenMode: sharpenMode,
        transparent: transparent
      });

      source2 = new ImageSpace({
        url: imageSpaceRequestUrl + "/getTileOverlay",
        filename: filename,
        entry: entry,
        outputFormat: "png",
        size: [imgWidth, imgHeight]
      });

      /**
       * Renders a progress icon.
       * @param {Element} el The target element.
       * @constructor
       */
      function Progress(el) {
        this.el = el;
        this.loading = 0;
        this.loaded = 0;
      }

      /**
       * Increment the count of loading tiles.
       */
      Progress.prototype.addLoading = function() {
        if (this.loading === 0) {
          this.show();
        }
        ++this.loading;
        this.update();
      };

      /**
       * Increment the count of loaded tiles.
       */
      Progress.prototype.addLoaded = function() {
        var this_ = this;
        setTimeout(function() {
          ++this_.loaded;
          this_.update();
        }, 100);
      };

      /**
       * Update the progress icon.
       */
      Progress.prototype.update = function() {
        if (this.loading === this.loaded) {
          this.loading = 0;
          this.loaded = 0;
          var this_ = this;
          setTimeout(function() {
            this_.hide();
          }, 500);
        }
      };

      /**
       * Show the progress icon.
       */
      Progress.prototype.show = function() {
        this.el.style.visibility = "visible";
      };

      /**
       * Hide the progress icon.
       */
      Progress.prototype.hide = function() {
        if (this.loading === this.loaded) {
          this.el.style.visibility = "hidden";
        }
      };

      var progress = new Progress(document.getElementById("progress"));

      source.on("tileloadstart", function() {
        progress.addLoading();
      });

      source.on("tileloadend", function() {
        progress.addLoaded();
      });

      source.on("tileloaderror", function() {
        progress.addLoaded();
      });

      var interactions = ol.interaction.defaults({ altShiftDragRotate: true });

      // Create full screen control
      var span = document.createElement("span");
      span.className = "glyphicon glyphicon-fullscreen";
      var fullScreenControl = new ol.control.FullScreen({ label: span });

      let resolutionsSingle = [];
      for (let idx = numResLevels - 1; idx > 0; --idx) {
        //resolutionsSingle.push(imgWidth / Math.pow(2, idx));
        resolutionsSingle.push(Math.pow(2, idx));
      }
      //[minx, miny, maxx, maxy]
      const singleShotLayer = new ol.layer.Image({
        //        extent: [0, -imgHeight, imgWidth, 0],
        extent: [0, -imgHeight, imgWidth, 0],
        //extent: [-imgWidth/2, -imgHeight/2, imgWidth/2, imgHeight/2],

        source: new ol.source.ImageWMS({
          url: "http://localhost:8081/imageSpace/getTile2",
          params: { LAYERS: "image" },
          ratio: 1,
          imageLoadFunction: function (image, src) {
            image.getImage().src = src;
            console.log("source", decodeURIComponent(src));
            //console.log("image", image);
            //parse src for whatever you want to know
            var bbox = decodeURI(src)
              .match(/BBOX\=([^&^#]*)/)[1]
              .split(",")
              .map(Number);
            console.log(bbox);
          },
          resolutions: resolutionsSingle
        })
      });

      map = new ol.Map({
        controls: ol.control
          .defaults()
          .extend([
            new RotateNorthControl(),
            new RotateUpControl(),
            fullScreenControl
          ]),
        interactions: interactions,
        layers: [
          new ol.layer.Tile({ source: source }),
          //vector,
          singleShotLayer
        ],
        logo: false,
        target: "imageMap",
        view: new ol.View({
          projection: proj,
          center: imgCenter,
          zoom: 1,
          // constrain the center: center cannot be set outside
          // this extent
          extent: [0, -imgHeight, imgWidth, 0]
          // TODO: Need to add zoom level clamping for the image zoom
          // levels
        })
      });

      //Beginning - Band Selections Section
      this.getImageBands = function() {
        var bandVal = bands.split(",");

        if (bandVal.length > 0) {
          if (bandVal[0] != "default") {
            if (numOfBands <= 1) {
              bands = bandVal[0];
            } else {
              if (numOfBands == 2) {
                bands = "1,2";
              } else {
                bands = bandVal[0];
              }
              for (var bandNum = 1; bandNum < numOfBands; bandNum++) {
                if (bandVal[bandNum]) {
                  bands = bands + "," + bandVal[bandNum];
                }
              }
            }
          } else {
            bands = "default";
          }
        }
        //if ( bandVal.length >= 3 ) {}
        this.bands = bands;
        this.numOfBands = numOfBands;
      };

      this.setBands = function(bandsVal) {
        bands = bandsVal;
        source.refresh();
      };

      //END - Band Selection Section

      this.getImageLink = function() {
        return (
          AppO2.APP_CONFIG.serverURL +
          "/omar/#/mapImage?" +
          "bands=" +
          bands +
          "&" +
          "brightness=" +
          brightness +
          "&" +
          "contrast=" +
          contrast +
          "&" +
          "entry_id=" +
          entry +
          "&" +
          "filename=" +
          encodeURIComponent(filename) +
          "&" +
          "height=" +
          imgHeight +
          "&" +
          "histCenterTile=" +
          histCenterTile +
          "&" +
          "histOp=" +
          histOp +
          "&" +
          "imageId=" +
          imgID +
          "&" +
          "numOfBands=" +
          numOfBands +
          "&" +
          "numResLevels=" +
          numResLevels +
          "&" +
          "resamplerFilter=" +
          resamplerFilter +
          "&" +
          "sharpenMode=" +
          sharpenMode +
          "&" +
          "transparent=" +
          transparent +
          "&" +
          "width=" +
          imgWidth +
          "&" +
          "imageSpaceRequestUrl=" +
          encodeURIComponent($stateParams.imageSpaceRequestUrl) +
          "&" +
          "uiRequestUrl=" +
          encodeURIComponent(uiRequestUrl) +
          "&" +
          "mensaRequestUrl=" +
          encodeURIComponent(mensaRequestUrl) +
          "&" +
          "wfsRequestUrl=" +
          encodeURIComponent(wfsRequestUrl) +
          "&" +
          "showModalSplash=true"
        );
      };

      this.setDynamicRange = function(value) {
        histOp = value;
        source.refresh();
      };

      this.setDynamicRangeRegion = function(value) {
        histCenterTile = value;
        source.refresh();
      };

      this.setResamplerFilter = function(value) {
        resamplerFilter = value;
        source.refresh();
      };

      this.setSharpenMode = function(value) {
        sharpenMode = value;
        source.refresh();
      };

      this.setBrightness = function(brightnessVal) {
        brightness = brightnessVal;
        source.refresh();
      };

      this.setContrast = function(contrastVal) {
        contrast = contrastVal;
        source.refresh();
      };

      this.resetBrightnessContrast = function() {
        brightness = $stateParams.brightness ? $stateParams.brightness : 0.0;
        contrast = $stateParams.contrast ? $stateParams.contrast : 1.0;
        source.refresh();
      };

      map.render("imageMap");

      // hide the default north arrow
      $(".ol-rotate").removeClass("ol-rotate");

      // rotate the custom north arrow according to the view
      map.getView().on("change:rotation", function(e) {
        var rotation = e.target.get(e.key) - northAngle;
        rotateNorthArrow(rotation);
      });

      // Begin Measure stuff
      var pointerMoveHandler = function(evt) {
        if (evt.dragging) {
          return;
        }
        var helpMsg =
          '<div class="text-center">Single-click to start measuring. </br>  Double-click to end.</div>';

        if (sketch) {
          var geom = sketch.getGeometry();

          if (geom instanceof ol.geom.Polygon) {
            helpMsg = continuePolygonMsg;
          } else if (geom instanceof ol.geom.LineString) {
            helpMsg = continueLineMsg;
          }
        }

        helpTooltipElement.innerHTML = helpMsg;
        helpTooltip.setPosition(evt.coordinate);

        helpTooltipElement.classList.remove("hidden");
      };

      function addMeasureInteraction(measureType) {
        var type = measureType;

        draw = new ol.interaction.Draw({
          source: measureSource,
          type: type,
          style: new ol.style.Style({
            fill: new ol.style.Fill({ color: "rgba(255, 255, 255, 0.2)" }),
            stroke: new ol.style.Stroke({
              //color: 'rgba(0, 0, 0, 0.5)',
              color: "rgba(0,255,255, 1.0)",
              lineDash: [10, 10],
              width: 3
            }),
            image: new ol.style.Circle({
              radius: 5,
              stroke: new ol.style.Stroke({ color: "rgba(0, 0, 0, 0.7)" }),
              fill: new ol.style.Fill({ color: "rgba(255, 255, 255, 0.2)" })
            })
          })
        });

        createHelpTooltip();

        var listener;
        draw.on(
          "drawstart",
          function(evt) {
            // clear any measurements that may be there
            $timeout(function() {
              $rootScope.$broadcast("measure: updated", null);
            });

            measureSource.clear();

            // set sketch
            sketch = evt.feature;

            var tooltipCoord = evt.coordinate;

            listener = sketch.getGeometry().on("change", function(evt) {
              var geom = evt.target;

              var output;
              if (geom instanceof ol.geom.Polygon) {
                tooltipCoord = geom.getInteriorPoint().getCoordinates();
              } else if (geom instanceof ol.geom.LineString) {
                tooltipCoord = geom.getLastCoordinate();
              }
            });
          },
          this
        );

        draw.on(
          "drawend",
          function() {
            var sketchGeom = sketch.getGeometry();

            var sketchArray = [];

            var pointArray;
            if (sketchGeom instanceof ol.geom.LineString) {
              pointArray = sketch.getGeometry().getCoordinates();
            } else {
              pointArray = sketch.getGeometry().getCoordinates()[0];
            }

            // We need to map over the items in the sketchArray, and
            // multiply every other item (the y value on the OL3 grid) by -1
            // before we pass this to the mensa service.  Mensa expects the
            // XY to start in the upper-left.  OL3 starts in the lower-left.;
            pointArray.forEach(function(el) {
              sketchArray.push(el[0]);
              sketchArray.push(el[1] * -1);
            });

            var sketchString = sketchArray
              .join(" ")
              .match(/[+-]?\d+(\.\d+)?\s+[+-]?\d+(\.\d+)?/g)
              .join(", ");

            // Logic for type of geometry on sketch to set the type
            // of string we need to send to the mensa service
            if (sketchGeom instanceof ol.geom.LineString) {
              var wktArray = "LINESTRING(" + sketchString + ")";
            } else {
              var wktArray = "POLYGON((" + sketchString + "))";
            }

            var measureOutput;

            $http({
              method: "POST",
              url: encodeURI(mensaRequestUrl + "/imageDistance?"),
              data: {
                filename: filename,
                entryId: entry,
                pointList: wktArray
              }
            }).then(
              function(response) {
                var data;
                data = response.data.data;

                // $timeout needed: http://stackoverflow.com/a/18996042
                $timeout(function() {
                  $rootScope.$broadcast("measure: updated", data);
                });

                ol.Observable.unByKey(listener);
              },
              function errorCallback(response) {
                console.log("Error: ", response);
              }
            );

            //unset sketch
            sketch = null;
          },
          this
        );

        // Creates a new help tooltip
        function createHelpTooltip() {
          if (helpTooltipElement) {
            helpTooltipElement.parentNode.removeChild(helpTooltipElement);
          }
          helpTooltipElement = document.createElement("div");
          helpTooltipElement.className = ".tooltip-measure hidden";
          helpTooltip = new ol.Overlay({
            element: helpTooltipElement,
            offset: [15, 0],
            positioning: "center-left"
          });
          map.addOverlay(helpTooltip);
        }
      }

      this.measureActivate = function(measureType) {
        map.getViewport().addEventListener("mouseout", function() {
          helpTooltipElement.classList.add("hidden");
        });

        // Remove the draw interaction if it is present (resets it)
        map.removeInteraction(draw);

        // Set the desired measurement type (Polygon or LineString)
        addMeasureInteraction(measureType);

        // Add the draw interaction for aour measurement
        map.addInteraction(draw);

        map.on("pointermove", pointerMoveHandler);
      };

      this.measureClear = function() {
        // Removes previous measure item from the vector layer
        measureSource.clear();

        map.removeInteraction(draw);
        map.un("pointermove", pointerMoveHandler);
      };
      // End Measure stuff

      // Begin Screenshot stuff
      this.screenshot = function() {
        map.once("postcompose", function(event) {
          var canvas = event.context.canvas;
          canvas.toBlob(function(blob) {
            var filename = "O2_Screenshot.png";
            var link = document.createElement("a");
            if (link.download !== undefined) {
              // feature detection
              $(link).attr("href", window.URL.createObjectURL(blob));
              $(link).attr("download", filename);
              $("body").append(link);
              link.click();
            } else {
              alert("This browser doesn't support client-side downloading, :(");
            }
            link.remove();
          });
        });
        map.renderSync();
      };
      // end Screenshot stuff

      // Begin Position Quality Evaluator stuff

      var drawPqePoint;
      drawPqePoint = new ol.interaction.Draw({
        source: measureSource,
        type: "Point"
      });

      var probability = "0.9"; // Default
      this.setPqeProbability = function(value) {
        probability = value;
      };

      function addPqeInteraction() {
        if (drawPqePoint != undefined) {
          map.addInteraction(drawPqePoint);
        }

        drawPqePoint.on("drawend", function(evt) {
          measureSource.clear();

          var pqePoint = evt.feature;

          var pqeArray = pqePoint.getGeometry().getCoordinates();

          // We need to map over the items in the pqeArray, and multiply
          // the second item (the y value on the OL3 grid) by -1
          // before we pass this to the mensa service.  Mensa expects the
          // XY to start in the upper-left.  OL3 starts in the lower-left.;
          var pqeModArray = pqeArray.map(function(el, index) {
            return index % 2 ? el * -1 : el;
          });

          var pqeString = pqeModArray
            .join(" ")
            .match(/[+-]?\d+(\.\d+)?\s+[+-]?\d+(\.\d+)?/g)
            .join(", ");

          var pqeMpArray = "MULTIPOINT(" + pqeString + ")";

          var mensaPqeUrl = mensaRequestUrl + "/imagePointsToGround?";

          $http({
            method: "POST",
            url: encodeURI(mensaPqeUrl),
            data: {
              filename: filename,
              entryId: entry,
              pointList: pqeMpArray,
              pqeIncludePositionError: true,
              pqeProbabilityLevel: probability,
              pqeEllipsePointType: "array",
              pqeEllipseAngularIncrement: "10"
            }
          }).then(
            function(response) {
              var data;
              data = response.data.data;

              var centerPoint = [];
              centerPoint.push(data[0].x);
              centerPoint.push(data[0].y);

              var pqeErrorArray = data[0].pqe.ellPts;

              var pqeModErrorArray = [];

              pqeErrorArray.forEach(function(el) {
                pqeModErrorArray.push(el.x);
                pqeModErrorArray.push(el.y * -1);
              });

              var pqeErrorString = pqeModErrorArray
                .join(" ")
                .match(/[+-]?\d+(\.\d+)?\s+[+-]?\d+(\.\d+)?/g)
                .join(", ");

              var formatModError = new ol.format.WKT();

              var pqeErrorModWkt = "POLYGON((" + pqeErrorString + "))";
              var pqeErrorModFeature = formatModError.readFeature(
                pqeErrorModWkt
              );
              measureSource.addFeature(pqeErrorModFeature);

              //var pqeCenterWkt =  'POINT(' + centerPoint[0] + ' ' + centerPoint[1] + ')';
              //var pqeCenterFeature = formatModError.readFeature(pqeCenterWkt);
              //measureSource.addFeature(pqeCenterFeature);

              //var pqeExtent = pqeErrorModFeature.getGeometry().getExtent();
              //var deltaX = pqeExtent[2]-pqeExtent[0];
              //var deltaY = pqeExtent[3]-pqeExtent[1];

              //$timeout needed: http://stackoverflow.com/a/18996042
              $timeout(function() {
                $rootScope.$broadcast("pqe: updated", data);
              });
            },
            function errorCallback(response) {
              console.log("Error: ", response);
            }
          );
        });
      }

      this.pqeActivate = function(probabilty) {
        addPqeInteraction(probabilty);
      };

      this.pqeClear = function() {
        measureSource.clear();
        map.removeInteraction(drawPqePoint);
      };

      this.groundToImage = function(points) {
        var deferred = $q.defer();

        $http({
          data: {
            entryId: entry,
            filename: filename,
            pointList: points
          },
          method: "POST",
          url: encodeURI(mensaRequestUrl + "/groundToImagePoints")
        }).then(function(response) {
          var pixels = response.data.data;

          if (pixels.length > 0) {
            deferred.resolve(pixels[0]);
          } else {
            deferred.resolve(false);
          }
        });

        return deferred.promise;
      };

      this.getFootprintGeometry = function() {
        return new ol.geom.MultiPolygon(imageGeometry.coordinates);
      };

      this.openGeometries = function() {
        var north = northAngle * 180 / Math.PI;
        var up = upAngle * 180 / Math.PI;
        map.once("postcompose", function(event) {
          var form = document.createElement("form");
          var url =
            AppO2.APP_CONFIG.params.sites[0].url.tlvContextPath || "/tlv";
          form.action = url + "/geometries";
          form.method = "post";
          $("body").append(form);

          var size = map.getSize();
          var viewRotation =
            (map.getView().getRotation() - northAngle) * 180 / Math.PI;
          var params = {
            azimuth: imageProperties.azimuth_angle - viewRotation,
            elevation: imageProperties.grazing_angle,
            height: size[1],
            north: 90 - viewRotation,
            sunAzimuth: imageProperties.sun_azimuth - viewRotation,
            sunElevation: imageProperties.sun_elevation,
            up: up + north + 90 - viewRotation,
            width: size[0]
          };
          $.each(params, function(key, value) {
            var input = document.createElement("input");
            input.name = key;
            input.type = "hidden";
            input.value = value;

            $(form).append(input);
          });
          mapCanvas = event.context.canvas;

          var popup = window.open(
            "about:blank",
            "Collection Geometries",
            "height=512,width=512"
          );
          form.target = "Collection Geometries";

          form.submit();
          form.remove();
        });
        map.renderSync();
      };

      this.setCenter = function(point) {
        map.getView().setCenter(point);
      };

      this.zoomToFullExtent = function() {
        map.getView().setZoom(1);
      };

      this.zoomToFullRes = function() {
        var gsd = Math.min(imageProperties.gsdx, imageProperties.gsdy);
        map.getView().setResolution(1 / gsd);
      };
    };
  }
})();
