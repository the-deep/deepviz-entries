var Map = {};
var map;
var mapsvg;
var path;
var transform;
var transform2;
var path2;
var heatmapColor = 'entries';
var radius = 40; 
var bubbles;
var mapInit = false;
var gridmapInit = false;
var simulation;
var nodes;
var nodeRadius = 13;
var bubbleData;

var heatmapColorEntries = [
		'interpolate',
		['linear'],
		['heatmap-density'],
			0,'rgba(254, 240, 217,0)',
			0.05,'rgba(103,169,207,0.2)',
			0.1,'#ddf6f2',
			0.4,'#36BBA6',
			0.7,'#1AA791',
			0.9,'#008974'
		];

var heatmapColorSeverity = [
		'interpolate',
		['linear'],
		['heatmap-density'],
			0,'rgba(254, 240, 217,0)',
			0.05,'rgba(103,169,207,0.3)',
			0.1,'#fef0d9',
			0.3,'#fdcc8a',
			0.5,'#fc8d59',
			0.8,'#e34a33',
			0.95,'#b30000'
		];

var heatmapColorReliability = [
		'interpolate',
		['linear'],
		['heatmap-density'],
			0,'rgba(254, 240, 217,0)',
			0.05,'rgba(103,169,207,0.3)',
			0.1,'#f1eef6',
			0.3,'#bdc9e1',
			0.6,'#74a9cf',
			0.85,'#2b8cbe',
			0.95,'#045a8d'
		];

//**************************
// create map
//**************************
Map.create = function(){

	// set map height
	map = document.getElementById("map");
	map.setAttribute("style","height:"+(map.offsetWidth*mapAspectRatio)+"px");

	d3.select('#map').append('div')
	.attr('id')

	mapboxgl.accessToken = mapboxToken;

	// no data fallback
	if(data.length==0) return false; 

	// map toggle
	d3.selectAll('#map-toggle-rect-bubbles')
	.on('click', function(d,i){
		mapToggle = 'bubbles';
		$('#map-toggle-bubbles').show();
		$('#map-toggle-heatmap').hide();
		$('#map-toggle-choropleth').hide();
		$('#map-toggle-gridmap').hide();
		$('#gridmap-div').hide();
		Map.updateBubbles();
		map.setLayoutProperty('#heatmap', 'visibility', 'none');
		d3.select('#heatmap-radius-slider-div').style('display', 'none');
	});

	d3.selectAll('#map-toggle-rect-heatmap')
	.on('click', function(d,i){
		mapToggle = 'heatmap';
		$('#map-toggle-bubbles').hide();
		$('#map-toggle-heatmap').show();
		$('#map-toggle-choropleth').hide();
		$('#map-toggle-gridmap').hide();
		Map.updateHeatmap();
		$('#gridmap-div').hide();
		$('#heatmap-radius-slider-div').fadeIn();
	});

	d3.selectAll('#map-toggle-rect-gridmap')
	.on('click', function(d,i){
		mapToggle = 'gridmap';
		$('#map-toggle-bubbles').hide();
		$('#map-toggle-heatmap').hide();
		$('#map-toggle-choropleth').hide();
		$('#map-toggle-gridmap').show();
		d3.select('#heatmap-radius-slider-div').style('display', 'none');
		gridmapInit = false;
		Map.updateGridmap();
		$('#gridmap-div').fadeIn();	
	});

	d3.selectAll('#map-toggle-rect-choropleth')
	.on('click', function(d,i){
		mapToggle = 'choropleth';
		$('#map-toggle-bubbles').hide();
		$('#map-toggle-heatmap').hide();
		$('#map-toggle-choropleth').show();
		$('#map-toggle-gridmap').hide();
		$('#gridmap-div').hide();
		Map.updateChoropleth();
		map.setLayoutProperty('#heatmap', 'visibility', 'none');
		d3.select('#heatmap-radius-slider-div').style('display', 'none');
	});

	$(document).ready(function(){

		tippy('.tippy-btn', { 
			theme: 'light-border',
			placement: 'right',
			delay: [250,100],
			inertia: false,
			distance: 8,
			allowHTML: true,
			animation: 'shift-away',
			arrow: true,
			size: 'small'
		});

		setTimeout(function(){
			var obj = $('#adm-toggle object');
			var svg = obj[0].contentDocument.getElementsByTagName('svg')[0];
			$("#adm-toggle").html(svg);
			d3.select('#adm'+filters.admin_level+'_bg').style('fill', '#343434');
			d3.select('#adm'+filters.admin_level+'_label').style('fill', '#FFF');

			d3.selectAll('#adm0, #adm1, #adm2').on('mouseover', function(d,i){
				var thisAdminLevel = this.id.substr(-1);
				if(thisAdminLevel==filters.admin_level){
					return false;
				} else {
					d3.select('#adm'+thisAdminLevel+'_bg').style('fill', '#F2F2F2');
				}
			}).on('mouseout', function(d,i){
				var thisAdminLevel = this.id.substr(-1);
				if(thisAdminLevel==filters.admin_level){
					return false;
				} else {
					d3.select('#adm'+thisAdminLevel+'_bg').style('fill', '#FFF');
					d3.select('#adm'+thisAdminLevel+'_label').style('fill', '#343434');
				}
			}).on('click', function(d,i){
				var thisAdminLevel = this.id.substr(-1);
				filters.admin_level = thisAdminLevel;
				gridmapInit = false;
				Map.update();
				d3.selectAll('#adm0_bg, #adm1_bg, #adm2_bg').style('fill', '#FFF');
				d3.selectAll('#adm0_label, #adm1_label, #adm2_label').style('fill', '#343434');
				d3.select('#adm'+filters.admin_level+'_bg').style('fill', '#343434');
				d3.select('#adm'+filters.admin_level+'_label').style('fill', '#FFF');
			})		
		},200);
	});

	var bounds = new mapboxgl.LngLatBounds([d3.min(geoBounds.lat),d3.min(geoBounds.lon)], [d3.max(geoBounds.lat),d3.max(geoBounds.lon)] );
 
	var mapboxStyle = $('#map-bg-toggle select').val();

	$('#map-bg-toggle select').on('change', function(){
		mapboxStyle = $('#map-bg-toggle select').val();

		if (map.getLayer('#heatmap')) map.removeLayer('#heatmap');
		if (map.getSource('heatmap')) map.removeSource('heatmap');
		// if (map.getLayer("mapbox-custom-bg")) map.removeLayer("mapbox-custom-bg");
		// if (map.getSource("mapbox-custom-bg")) map.removeSource("mapbox-custom-bg");

		// 	map.addLayer({
		// 		id: 'mapbox-custom-bg',
		// 		source: {"type": "raster",  "url": "mapbox://"+mapboxStyle, "tileSize": 256},
		// 		type: "raster",
		// 		layout: {"visibility":"visible"}
		// 	}, '#heatmap');

		map.setStyle('mapbox://styles/mapbox/' + mapboxStyle);

		map.on('style.load', function() {
		    Map.createHeatmap();
	    });

	})
	if (url.searchParams.get('mapboxStyle')) {
		mapboxStyle = url.searchParams.get('mapboxStyle');
		$('#map-bg-toggle select').val(mapboxStyle);
	}

    //Setup mapbox-gl map
    map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/light-v10',
        center: [d3.mean(geoBounds.lat), d3.mean(geoBounds.lon)],
        zoom: 4,  
        trackResize: true,
        pitchWithRotate: false,
        doubleClickZoom: true,
        preserveDrawingBuffer: true,
        dragRotate: false
    });

    mapbox = map;
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');
    map.scrollZoom.disable();
    map.keyboard.disable()
    map.fitBounds(bounds, {
    	padding: 20
    });

    var container = map.getCanvasContainer()

    mapsvg = d3.select(container).append("svg")
    .attr('id','map-bubble-svg')
    .style('position', 'absolute')
    .style('width', '100%')
    .style('height', '100%')
    .style('z-index', 2);

    mapsvg.append('g').attr('id','map-grid-svg');

    transform = d3.geoTransform({point: Map.projectPoint});
    path = d3.geoPath().projection(transform);

    this.createBubbles();
    this.createChoropleth();

    map.on('load', function() {
	    Map.createHeatmap();
	});

	d3.selectAll('#geoRemoveFilter').on('click', function(){
		d3.select('#geoRemoveFilter').style('display', 'none').style('cursor', 'default');
		$('#location-search').val(); 
		$('#location-search').trigger('change.select2');
		return Deepviz.filter('geo', 'clear'); 
	});

	this.createSearch();
	this.createTooltipSparkline();

	// map lasso
	lassoActive = false;

	var lasso = d3.select('#lasso');
	lasso.on('mouseover', function(){
		if(!lassoActive){
			$('#lasso-default').hide();
			$('#lasso-hover').show();
		}
	}).on('mouseout', function(){
		if(!lassoActive){
			$('#lasso-default').show();
			$('#lasso-hover').hide();
		}	
	}).on('click', function(){
		if(!lassoActive){
			lassoActive = true;
			$('#lasso-default').hide();
			$('#lasso-hover').hide();
			$('#lasso-selected').show();
			// disable panning
			map.dragPan.disable();
		    map.boxZoom.disable();
			// change cursor
			d3.select('#map-bubble-svg').style('cursor', 'crosshair');
		} else {
			lassoActive = false;
			$('#lasso-selected').hide();
			$('#lasso-default').show();
			$('#lasso-hover').hide();
			// enable map panning
			map.dragPan.enable();
		    map.boxZoom.enable();
			// change cursor
			d3.select('#map-bubble-svg').style('cursor', 'inherit');
			d3.select('#select-box').attr("visibility", "hidden");
		}
	})

	function rect(x, y, w, h) {
	  return "M"+[x,y]+" l"+[w,0]+" l"+[0,h]+" l"+[-w,0]+"z";
	}

	var selection = mapsvg.append("path")
	  .attr("id", "select-box")
	  .attr("class", "selection")
	  .attr("visibility", "hidden");

	var startSelection = function(start) {
	    selection.attr("d", rect(start[0], start[0], 0, 0))
	      .attr("visibility", "visible");
	};

	var moveSelection = function(start, moved) {
	    selection.attr("d", rect(start[0], start[1], moved[0]-start[0], moved[1]-start[1]));
	};

	var endSelection = function(start, end) {
		selection.attr("visibility", "hidden");
		var bbox = selection.node().getBBox();
		var bounds = [];
		bounds[0] = Map.unprojectPoint(bbox.x, bbox.y);
		bounds[1] = Map.unprojectPoint((bbox.x+bbox.width), (bbox.y+bbox.height));
		if(d3.event.shiftKey){
			var geoArray = filters.geo;
		} else {
			var geoArray = [];
		}

		metadata.geo_array.forEach(function(d,i){
			if ((d.centroid[0] > bounds[0].lng) && (d.centroid[0] < bounds[1].lng) && (d.centroid[1] < bounds[0].lat) && (d.centroid[1] > bounds[1].lat)){
				if(!geoArray.includes(d.id)){
					geoArray.push(d.id);
				}
			}
		});

		if(bbox.width==0){
			Deepviz.filter('geo', 'clear');
		} else {
			filters.geo = geoArray;
			Deepviz.filter('geo', 0);
		}
	};

	mapsvg.on("mousedown", function(e) {
		if(!lassoActive) return false;
	  	var subject = d3.select(window), parent = this.parentNode,
	    start = d3.mouse(parent);
	    startSelection(start);
	    subject
	      .on("mousemove.selection", function() {
	        moveSelection(start, d3.mouse(parent));
	      }).on("mouseup.selection", function() {
	        endSelection(start, d3.mouse(parent), d3.event);
	        subject.on("mousemove.selection", null).on("mouseup.selection", null);
	      });
	});

	mapsvg.on("touchstart", function() {
		if(!lassoActive) return false;
		var subject = d3.select(this), parent = this.parentNode,
	    id = d3.event.changedTouches[0].identifier,
	    start = d3.touch(parent, id), pos;
	    startSelection(start);
	    subject
	      .on("touchmove."+id, function() {
	        if (pos = d3.touch(parent, id)) {
	          moveSelection(start, pos);
	        }
	      }).on("touchend."+id, function() {
	        if (pos = d3.touch(parent, id)) {
	          endSelection(start, pos, d3.event);
	          subject.on("touchmove."+id, null).on("touchend."+id, null);
	        }
	      });
	});

	map.on('moveend', function(e){
		$('.tippy-popper').hide();
		if (mapToggle=='gridmap') Map.createGridmap();
	});

	//**************************
	// panel expand layout
	//**************************

	expandActive = false;

	var expand = d3.select('#expand');
	expand.on('mouseover', function(){
		if(!expandActive){
			$('#expand-default').hide();
			$('#expand-hover').show();
		}
	}).on('mouseout', function(){
		if(!expandActive){
			$('#expand-default').show();
			$('#expand-hover').hide();
		}	
	}).on('click', function(){
		if(!expandActive){
			expandActive = true;
			$('#expand-default').hide();
			$('#expand-hover').hide();
			$('#expand-selected').show();
		} else {
			expandActive = false;
			$('#expand-selected').hide();
			$('#expand-default').show();
			$('#expand-hover').hide();
		}
		expandLayout();
	});

	var expandLayout = function() {
		d3.select('#timeline .vizlibResponsiveDiv').style('opacity', 0);
		if(expandActive==true){
			$('#mapcol, #mapcontainer').removeClass('leftcol');
			$('#timechart-container').removeClass('rightcol');
			d3.select('#timeline').style('position', 'absolute');
			d3.selectAll('#timeline div').style('top', '0px');
		} else {
			$('#mapcol, #mapcontainer').addClass('leftcol');
			$('#timechart-container').addClass('rightcol');
			d3.select('#timeline').style('position', 'unset');
			d3.selectAll('#timeline div').style('top', '25px');
		}
		Deepviz.redrawTimeline();
		Deepviz.resizeDevice();
	}
}

Map.createBubbles = function(){

	var locationBySeverityReliability = dataByLocationArray;

	bubbleData = d3.nest()
	.key(function(d) {  return d.geo;})
	.rollup(function(v) { return {
		'total': d3.sum(v, function(d){
			return 1;
		})
		}
	})
	.entries(locationBySeverityReliability);

	metadata.geo_array.forEach(function(d,i){
		d.value = 0;
		d.median = 0;
		bubbleData.forEach(function(dd,ii){
			if(d.id==parseInt(dd.key)){
				d.value = dd.value.total;
			}
		})
	})

    maxMapBubbleValue = d3.max(bubbleData, function(d) {
    	return d.value.total;
    });

	scale.map = d3.scaleSqrt()
	.range([0.1,1])
	.domain([0,maxMapBubbleValue]);

	// create bubbles
	bubbles = mapsvg.append('g').attr('id', 'map-bubbles').selectAll(".bubble")
	.data(metadata.geo_array)
	.enter()
	.append('g')
	.attr('class','bubble')
	.style('outline', 'none')
	.attr('data-name',function(d,i){
		return metadata.geo_array[i].name;
	})
	.attr('id', function(d,i){
		return 'bubble'+i;
	})
	.attr('data-id', function(d,i){
		return i+1;
	})
	.attr('data-total', function(d,i){
		return d.value;
	})
	.attr('data-median', function(d,i){
		return d.median;
	})
	.attr('transform', function(d,i){
		p = Map.projectPoint(metadata.geo_array[i].centroid[0], metadata.geo_array[i].centroid[1]);
		return 'translate('+p.x+','+p.y+')';
	})
	.style('opacity', 1)
	.on('click', function(d,i){
		if(lassoActive) return false;
		var geo = metadata.geo_array[i];
		Deepviz.filter('geo',geo.id);
	});

	tippy('.bubble', { 
		theme: 'light-border',
		delay: [250,100],
		inertia: false,
		distance: 8,
		allowHTML: true,
		animation: 'shift-away',
		arrow: true,
		size: 'small',
		onShow(instance){
			var geoId = d3.select(d3.select(instance.reference).node()).attr('data-id');
			var geoName = d3.select(d3.select(instance.reference).node()).attr('data-name');
			var geoTotal = d3.select(d3.select(instance.reference).node()).attr('data-total');
			var geoMedian = d3.select(d3.select(instance.reference).node()).attr('data-median');
        	var html = Map.updateTooltipSparkline(geoId, geoName, geoTotal, geoMedian);
        	(html) ? instance.setContent(html) : instance.setContent(geoName)
		}
	});

	var featureElementG = bubbles
	.append('g')
	.attr('class', 'map-bubble')
	.attr('transform', function(d,i){
		// var size = scale.map(dataByLocationSum[i]);
		var size = 1;
		return 'scale('+size+')';
	})
	.style('display', function(d,i){
		// if(dataByLocationSum[i]>0){
			return 'inline';
		// } else {
			// return 'none';
		// }
	}).on('mouseover', function(){
		d3.select(this).style('cursor', function(){
			if(lassoActive) {
				return 'crosshair ';
			} else {
				return 'pointer';
			}
		})
		if(lassoActive) return false;
		d3.select(this).style('opacity', 0.85);
	}).on('mouseout', function(){
		d3.select(this).style('opacity', 1);
	});

	featureElementG
	.append("circle")
	.attr('class',  'outerCircle')
	.attr("stroke", colorNeutral[3])
	.attr("fill", "#FFF")
	.attr('cx', 0)
	.attr('cy', 0)
	.attr('r' , 28)
	.attr("stroke-width", 4);

	featureElementG
	.append("circle")
	.attr('class',  'innerCircle')
	.attr("fill", colorNeutral[3])
	.attr('cx', 0)
	.attr('cy', 0)
	.attr('r' , 25)
	.attr("stroke-width", 0);

	featureElementG
	.append('text')
	.attr('text-anchor', 'middle')
	.attr('class', 'map-bubble-value')
	.text(function(d,i){
		return 'x';
		// return dataByLocationSum[i];
	})
	.attr('y', 7)
	.style('font-weight', 'normal')
	.style('font-size', '20px')
	.style('fill', '#FFF');

	function updatePos() {
		bubbles.attr('transform', function(d,i){
			p = Map.projectPoint(metadata.geo_array[i].centroid[0], metadata.geo_array[i].centroid[1]);
			return 'translate('+p.x+','+p.y+')';
		});  
	}

	map.on("viewreset", updatePos)

	map.on("movestart", function(){
		mapsvg.classed("hidden", true);
	});	
	map.on("move", function(){
		updatePos();
	});
	map.on("rotate", function(){
		mapsvg.classed("hidden", true);
	});	
	map.on("moveend", function(){
		updatePos();
		mapsvg.classed("hidden", false);
	});

	mapInit = true;
	Map.update();

}

Map.projectPoint = function(lon, lat){
	var point = map.project(new mapboxgl.LngLat(lon, lat));
	return point;
}

Map.unprojectPoint = function(x, y){
	var point = map.unproject([x,y]);
	return point;
}

Map.project = function(lon, lat) {
    var point = map.project(new mapboxgl.LngLat(lon, lat));
	this.stream.point(point.x, point.y);
}


Map.createChoropleth = function(){

	transform2 = d3.geoTransform({point: Map.project});
	path2 = d3.geoPath().projection(transform2);

    var gd = dataByDate.filter(function(d){
    	return ((new Date(d.key)>=dateRange[0])&&(new Date(d.key)<dateRange[1]));
    });

    var dataByLocationSum = [];

    for(var g=0; g < metadata.geo_json.length; g++) {
    	dataByLocationSum[g] = 0;
    }

    gd.forEach(function(d,i){
    	for(var g=0; g < metadata.geo_json.features.length; g++) {
    		if(d.geo[g]>0){
    			var t = (dataByLocationSum[g]) + (d.geo[g]);
    			if(metadata.geo_json.features[g].properties.admin_level!=0){
	    			dataByLocationSum[g] = t;
	    			metadata.geo_json.features[g].properties.value = t;

    			} else {
	    			dataByLocationSum[g] = 0;
	    			metadata.geo_json.features[g].properties.value = 0;
    			}
    		}
    	}
    });

	var featureElement = mapsvg.append('g')
	.attr('id', 'map-polygons')
	.style('display', 'none')
	.selectAll("path")
	.data(metadata.geo_json.features)
	.enter()
    .append("path")
    .attr('id', function(d,i){
    	return 'polygon-'+d.properties.id;
    })
    .attr('class', 'polygon')
	.attr('data-id', function(d,i){
		return i+1;
	})
	.attr('data-name', function(d,i){
		return metadata.geo_array[i].name;
	})
	.attr('data-total', function(d,i){
		return d.value;
	})
	.attr('data-median', function(d,i){
		return d.median;
	})
    .attr("stroke", "#FFF")
    .style('display', function(d,i){
    	if(d.properties.admin_level == 1){
    		return 'block';
    	} else {
    		return 'none';
    	}
    })
    .style("fill", "green")
    .style("fill-opacity", 1)
	.on('mouseover', function(){
		d3.select(this).style('cursor', function(){
			if(lassoActive) {
				return 'crosshair ';
			} else {
				return 'pointer';
			}
		})
		if(lassoActive) return false;
		d3.select(this).style('opacity', 1);
	}).on('mouseout', function(){
		d3.select(this).style('opacity', 1);
	}).on('click', function(d,i){
		if(lassoActive) return false;
		var geo = metadata.geo_array[i];
		Deepviz.filter('geo',geo.id);
	});

	tippy('.polygon', { 
		theme: 'light-border',
		delay: [250,100],
		inertia: false,
		distance: 8,
		followCursor: 'initial',
		allowHTML: true,
		animation: 'shift-away',
		arrow: true,
		size: 'small',
		onShow(instance) {
			var geoId = d3.select(d3.select(instance.reference).node()).attr('data-id');
			var geoName = d3.select(d3.select(instance.reference).node()).attr('data-name');
			var geoTotal = d3.select(d3.select(instance.reference).node()).attr('data-total');
			var geoMedian = d3.select(d3.select(instance.reference).node()).attr('data-median');
        	var html = Map.updateTooltipSparkline(geoId, geoName, geoTotal, geoMedian);
        	(html) ? instance.setContent(html) : instance.setContent(geoName)
		}
	});

	function update() {
		featureElement.attr("d", path2); 
	}

	map.on("viewreset", update)

	map.on("movestart", function(){
		mapsvg.classed("hidden", true);
	});	
	map.on("move", function(){
		update();
	});
	map.on("rotate", function(){
		mapsvg.classed("hidden", true);
	});	
	map.on("moveend", function(){
		update()
		mapsvg.classed("hidden", false);
	});

	Map.update();
}

Map.createHeatmap = function(){

    var gd = dataByDate.filter(function(d){
    	return ((new Date(d.key)>=dateRange[0])&&(new Date(d.key)<dateRange[1]));
    });

    var dataByLocationSum = [];

    for(var g=0; g < metadata.geo_json_point.length; g++) {
    	dataByLocationSum[g] = 0;
    }

    gd.forEach(function(d,i){
    	for(var g=0; g < metadata.geo_json_point.features.length; g++) {

			metadata.geo_json_point.features[g].properties.value = 0;

    		if(d.geo[g]>0){
    			var t = (dataByLocationSum[g]) + (d.geo[g]);

    			if(metadata.geo_json_point.features[g].properties.admin_level!=0){
	    			dataByLocationSum[g] = t;
	    			metadata.geo_json_point.features[g].properties.value = t;

    			} else {
	    			dataByLocationSum[g] = 0;
	    			metadata.geo_json_point.features[g].properties.value = 0;
    			}
    		}
    	}
    });

	if (map.getLayer('#heatmap')) map.removeLayer('#heatmap');
	if (map.getSource('heatmap')) map.removeSource('heatmap');

	if(filters.frameworkToggle!='entries'){
		if(filters.toggle=='severity'){
			var heatmapColor = heatmapColorSeverity;	
		} else {
			var heatmapColor = heatmapColorReliability;	
		}
	} else {
		var heatmapColor = heatmapColorEntries;
	}

		map.addSource('heatmap', {
			type: 'geojson',
			data: metadata.geo_json_point
		});

		map.addLayer({
			'id': '#heatmap',
			'type': 'heatmap',
			'source': 'heatmap',
			'maxzoom': 9,
			'paint': {
			// Increase the heatmap weight based on frequency and property magnitude
			'heatmap-weight': { property: 'value', type: 'exponential', stops: [[0,0],[1,0.1],[100,1]]},
			'heatmap-intensity': 1.4,
			'heatmap-color': heatmapColor,
			'heatmap-radius': radius,
			'heatmap-opacity': 0
			}
			},
			'waterway-label'
			);

	Map.update();

	//**************************
	// heatmap radius slider
	//**************************
	if(document.getElementById("heatmap-radius-slider")) return;

	// create average svg
	var heatmapSliderSvg = d3.select('#heatmap-radius-slider-div').append('svg')
	.attr('id', 'heatmap-radius-slider')
	.attr('width', 300)
	.attr('height', 30)
	.attr('viewBox', "0 0 "+(520)+" "+(30));

	// create checkbox
	var heatmapCheckbox = heatmapSliderSvg.append('g')
	.attr('id', 'heatmap-checkbox')
	.attr('transform','translate(6,0)');

	heatmapCheckbox.append('rect')
	.attr('x', 4)
	.attr('y', 5)
	.attr('width', 22)
	.attr('height', 22)
	.style('fill', '#FFF')
	.style('stroke-width', 3)
	.attr('stroke', '#B7BEBE')
	.attr('rx', 3)
	.attr('ry', 3);

	var heatmapCheck = heatmapCheckbox.append('rect')
	.attr('x', 8)
	.attr('y', 9)
	.attr('width', 14)
	.attr('height', 14)
	.attr('fill', '#FFF')
	.attr('rx', 3)
	.attr('ry', 3);

	heatmapCheckbox.append('text')
	.text('Factor # of entries')
	.attr('font-family', 'SourceSansPro-Bold, Source Sans Pro')
	.attr('font-weight', 'bold')
	.attr('fill', '#363636')
	.attr('font-size', 19)
	.attr('y', 24)
	.attr('x', 33);

	d3.select('#heatmap-checkbox').on('click', function(){
		if(filters.heatmapCheckbox==true){
			// disable checkbox
			filters.heatmapCheckbox = false;
			heatmapCheck.attr('fill', '#FFF');
			Map.update();
		} else {
			// enable checkbox
			filters.heatmapCheckbox = true;
			heatmapCheck.attr('fill', '#666A69');
			Map.update();
		}
	})

	heatmapSliderSvg = heatmapSliderSvg.append('g')
	.attr('transform','translate(230,0)');

	var sliderWidth = 200;

	heatmapSliderSvg.append('rect')
	.attr('x', 66)
	.attr('y', 1)
	.attr('width', sliderWidth+23)
	.attr('height', 33)
	.attr('rx', 7)
	.attr('ry', 7)
	.style('fill', '#FFF')
	.style('stroke-width', 3)
	.attr('stroke', '#B7BEBE');

	heatmapSliderSvg.append('text')
	.text('Radius')
	.attr('font-family', 'SourceSansPro-Bold, Source Sans Pro')
	.attr('font-weight', 'bold')
	.attr('fill', '#363636')
	.attr('font-size', 19)
	.attr('y', 24)
	.attr('x', 0);

	var heatmapSliderScale = d3.scaleLinear()
		.domain([0, sliderWidth])
		.range([0, sliderWidth])
		.clamp(true);

	var heatmapSliderScale2 = d3.scaleLinear()
		.domain([10, 70])
		.range([0, sliderWidth])
		.clamp(true);

	var heatmapSlider = heatmapSliderSvg.append("g")
	.attr("class", "heatmap-slider")
	.attr("transform", "translate("+(78)+",22)");

	heatmapSlider.append("line")
	.attr("class", "track")
	.attr("x1", 0)
	.attr("x2", sliderWidth)
	.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
	.attr("class", "track-inset")
	.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
	.attr("class", "track-overlay")
	.call(d3.drag()
		.on("start.interrupt", function() { heatmapSlider.interrupt(); })
		.on('end', function(){

		})
		.on("start drag", function() { 
			var heatmapScale = heatmapSliderScale(d3.event.x);
			heatmapSliderHandle.attr('transform', 'translate(' + heatmapScale +',-10)');
			var heatmapScaleInvert = heatmapSliderScale2.invert(heatmapScale);
			radius = heatmapScaleInvert;
			if(mapToggle == 'heatmap'){
				map.setPaintProperty('#heatmap', 'heatmap-radius', heatmapScaleInvert);
			}
	 }));

	heatmapSlider.insert("g", ".track-overlay")
	.attr("class", "ticks")
	.attr("transform", "translate(0," + 0 + ")");

	heatmapSlider.insert("g", ".track-overlay")
	.attr("class", "ticks")
	.attr("transform", "translate(0," + 0 + ")");

    // slider init
    var heatmapSliderHandle = heatmapSlider.insert('g', '.track-overlay')
    .attr('transform', 'translate('+sliderWidth/2+',-10)')
    .attr("class", "handle");

	if(mapToggle == 'heatmap'){
		map.setPaintProperty('#heatmap', 'heatmap-radius', radius);
	}

    heatmapSliderHandle
    .append('path')
    .attr("stroke", "#000")
    .attr('stroke-width', 0)
    .attr('fill', '#000')
    .attr("cursor", "ew-resize")
    .attr("d", 'M -7,0 -1,9 6,0 z');

}

//**************************
// create select2 location search
//**************************
Map.createSearch = function(){

	var locations = metadata.geo_array;

	locations = $.map(locations, function (obj) {
	  obj.text = obj.text || obj.name; // replace name with the property used for the text
	  return obj;
	});

	$(document).ready(function() {
	    $('#location-search').select2({
	    	data: locations,
	    	placeholder: 'LOCATIONS',
	    	scrollAfterSelect: true,
	    	shouldFocusInput: function() {
				return false;
			},
	    	templateResult: function(data) {
				var $state = $('<span>' + data.text + ' </span><div class="search-adm-id">ADM '+ data.admin_level + '</div>');
				return $state;
			}
	    });

	    $('#location-search').on('select2:select', function (e) {
	    	Deepviz.filter('geo', parseInt(e.params.data.id));
		});


		$('#location-search').on('select2:unselect', function (e) {
			Deepviz.filter('geo', parseInt(e.params.data.id));
			if(!e.params.originalEvent) {
				return;
			}
			e.params.originalEvent.stopPropagation();
		});

		d3.selectAll('.main-content, #main-content').transition().duration(1500).style('opacity', 1);

	});
}

Map.update = function(e){
	if(mapToggle=='bubbles') {
		Map.updateBubbles();			
	} else if (mapToggle=='choropleth') {
		Map.updateChoropleth();
	} else if (mapToggle=='heatmap') {
		Map.updateHeatmap();
	} else if (mapToggle=='gridmap') {
		Map.updateGridmap();
	}		
}

//**************************
// update map bubbles
//**************************
Map.updateBubbles = function(){
	if(!mapInit)return;

	d3.selectAll('.bubble').style('display', 'none');
	d3.select('#map-polygons').style('display', 'none');
	d3.select('#map-grid-svg').style('display', 'none');

	if(lassoActive!=true){
		map.dragPan.enable();
		map.doubleClickZoom.enable();	
		d3.selectAll('#map-bubble-svg').style('cursor','grab');
	}
	
	$('#map-bg-toggle').show();
	d3.selectAll('#map-bubble-svg .bubble').style('cursor','pointer');

	// bubbles display severity/reliability
	if(filters.frameworkToggle!='entries'){

		// color bubbles accoring to severity/reliability
		var locationBySeverityReliability = dataByLocationArray.filter(function(d){
			if(filters.toggle=='severity'){
				return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.s>0)&&(d.admin_level==filters.admin_level));
			} else {
				return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.r>0)&&(d.admin_level==filters.admin_level));
			}
		});

		bubbleData = d3.nest()
		.key(function(d) {  return d.geo;})
		.rollup(function(v) { return {
			'median': Math.round(d3.median(v, function(d) { if(filters.toggle=='severity'){return d.s;} else { return d.r; } } )), 
			'total': d3.sum(v, function(d){
				return 1;
				})
			}
		})
		.entries(locationBySeverityReliability);

		metadata.geo_array.forEach(function(d,i){
			d.total = 0;
			bubbleData.forEach(function(dd,ii){
				if(d.id==parseInt(dd.key)){
					d.total = dd.value.total;
					d.median = dd.value.median;
				}
			})
		});

	    maxMapBubbleValue = d3.max(bubbleData, function(d) {
	    	return d.value.total;
	    });

		scale.map = d3.scaleSqrt()
		.range([0.1,1])
		.domain([0,maxMapBubbleValue]);

		bubbles.data(metadata.geo_array)
		.style('display','inline')
		.attr('data-id', function(d,i){
			return i+1;
		})
		.attr('data-total', function(d,i){
			return d.total;
		})
		.attr('data-median', function(d,i){
			return d.median;
		})
		.exit().style('display','none');

		var featureElementG = bubbles
		.select('.map-bubble')
		.attr('transform', function(d,i){
			if(d.total>0) {
				var size = scale.map(d.total);
				return 'scale('+size+')';
			}
		})
		.style('display', function(d,i){
			if(d.total>0){
				return 'inline';
			} else {
				return 'none';
			}
		});

		featureElementG.select('.map-bubble-value')
		.text(function(d,i){
			return d.total;
		});

		if(filters.toggle=='severity'){
			featureElementG.select('.innerCircle').style('fill', function(d,i){ 
				if((filters.geo.length==0)||(filters.geo.includes(d.id))){
					return colorPrimary[d.median];
				} else { 
					return colorGrey[1]; 
				}
			});
			featureElementG.select('.outerCircle').attr('stroke', function(d,i){ 
				if(filters.geo.includes(d.id)){
					return 'cyan';
				} else {
					if(filters.geo.length>0){
						return colorGrey[1];
					} else {
						return colorPrimary[d.median];
					}
				}
			});

		} else {
			featureElementG.select('.innerCircle').style('fill', function(d,i){ 
				if((filters.geo.length==0)||(filters.geo.includes(d.id))){
					return colorSecondary[d.median];
				} else { 
					return colorGrey[1]; 
				}
			});
			featureElementG.select('.outerCircle').attr('stroke', function(d,i){ 
				if(filters.geo.includes(d.id)){
					return 'cyan';
				} else {
					if(filters.geo.length>0){
						return colorGrey[1];
					} else {
						return colorSecondary[d.median];
					}
				}
			});
		}

	// bubbles display number of entries
	} else {

		// color bubbles accoring to number of entries
		var locationBySeverityReliability = dataByLocationArray.filter(function(d){
			return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.admin_level==filters.admin_level));
		});

		bubbleData = d3.nest()
		.key(function(d) {  return d.geo;})
		.rollup(function(v) { return {
			'total': d3.sum(v, function(d){
				return 1;
			})
			}
		})
		.entries(locationBySeverityReliability);

		metadata.geo_array.forEach(function(d,i){
			d.total = 0;
			bubbleData.forEach(function(dd,ii){
				if(d.id==parseInt(dd.key)){
					d.total = dd.value.total;
				}
			})
		})

	    maxMapBubbleValue = d3.max(bubbleData, function(d) {
	    	return d.value.total;
	    });

		scale.map = d3.scaleSqrt()
		.range([0.1,1])
		.domain([0,maxMapBubbleValue]);

		// update bubbles data
		bubbles.data(metadata.geo_array)
		.attr('data-id', function(d,i){
			return i+1;
		})
		.attr('data-total', function(d,i){
			return d.total;
		})
		.attr('data-median', function(d,i){
			return d.median;
		})
		.style('display','inline')
		.exit().style('display','none');

		var featureElementG = bubbles
		.select('.map-bubble')
		.attr('transform', function(d,i){
			if(d.total>0) {
				var size = scale.map(d.total);
				return 'scale('+size+')';
			}
		})
		.style('display', function(d,i){
			if(d.total>0){
				return 'inline';
			} else {
				return 'none';
			}
		});

		featureElementG.select('.map-bubble-value')
		.text(function(d,i){
			return d.total;
		})

		featureElementG.select('.innerCircle').style('fill', function(d,i){ 
			if((filters.geo.length==0)||(filters.geo.includes(d.id))){
				return colorNeutral[3];
			} else { 
				return colorGrey[1]; 
			}
		});

		featureElementG.select('.outerCircle').attr('stroke', function(d,i){ 
			if(filters.geo.includes(d.id)){
				return 'cyan';
			} else {
				if(filters.geo.length>0){
					return colorGrey[1];
				} else {
					return colorNeutral[3];
				}
			}
		});
	}

}

//**************************
// update map choropleth
//**************************
Map.updateChoropleth = function(){

	d3.selectAll('.bubble').style('display', 'none');
	d3.select('#map-polygons').style('display', 'block');
	d3.select('#map-grid-svg').style('display', 'none');

	d3.selectAll('.polygon').style('fill', colorLightgrey[1]).attr('data-total', 0);

	$('#map-bg-toggle').show();

	d3.selectAll('#map-bubble-svg').style('cursor','grab');
	d3.selectAll('#map-bubble-svg .bubble').style('cursor','pointer');
	map.dragPan.enable();
	map.doubleClickZoom.enable();

	var dataByLocationSum = [];

	for(var g=0; g < metadata.geo_json.features.length; g++) {
		dataByLocationSum[g] = 0;
		metadata.geo_json.features[g].properties.value = null;
		metadata.geo_json.features[g].properties.total = null;
	}

	// choropleth display severity/reliability
	if(filters.frameworkToggle!='entries'){
		// color bubbles accoring to severity/reliability
		var locationBySeverityReliability = dataByLocationArray.filter(function(d){
			if(filters.toggle=='severity'){
				return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.s>0));
			} else {
				return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.r>0));
			}
		});

		var sev = d3.nest()
		.key(function(d) {  return d.geo;})
		.rollup(function(v) { return {
			'value': Math.round(d3.median(v, function(d) { if(filters.toggle=='severity'){return d.s;} else { return d.r; } } )), 
			'total': d3.sum(v, function(d){
				return 1;
			}) 
		}
		})
		.entries(locationBySeverityReliability);

		sev.forEach(function(d,i){
			var geo = metadata.geo_json.features[d.key-1];
			if(geo.properties.admin_level==filters.admin_level){
				metadata.geo_json.features[d.key-1].properties.value = d.value.value;
				metadata.geo_json.features[d.key-1].properties.total = d.value.total;
			} 
		});

		maxMapPolygonValue = 5;

	    scale.mapPolygons = d3.scaleLinear()
	    .range([colorNeutral[0],colorNeutral[4]])
		.domain([0,maxMapPolygonValue]);

		metadata.geo_json.features.forEach(function(d,i){
			var v = d.properties.value;
			var t = d.properties.total;

			d3.select('#polygon-'+d.properties.id).style('fill', function(d,i){
				if(v>0){
					if(filters.toggle=='severity'){
						return colorPrimary[v];
					} else {
						return colorSecondary[v];
					}
				} else {
					return colorLightgrey[1];
				}
			})
			.attr('data-total', t)
			.attr('data-median', v)
			.style('display', function(dd,ii){
				if(dd.properties.admin_level==filters.admin_level){
					return 'block';
				} else {
					return 'none';
				}
			})
			.attr('stroke', function(d,i){
				var id = d.properties.id;
				if(filters.geo.includes(id)){
					return 'cyan';
				} else {
					return '#FFF';
				}
			})
		});
	// choropleth display number of entries
	} else {

		var gd = dataByDate.filter(function(d){
			return ((new Date(d.key)>=dateRange[0])&&(new Date(d.key)<dateRange[1]));
		});

	    gd.forEach(function(d,i){
	    	for(var g=0; g < metadata.geo_json.features.length; g++) {
	    		if(d.geo[g]>0){
	    			var t = (dataByLocationSum[g]) + (d.geo[g]);
	    			dataByLocationSum[g] = t;
	    			metadata.geo_json.features[g].properties.value = t;
				}
	    	}
	    });

		maxMapPolygonValue = d3.max(dataByLocationSum, function(d,i) {
			if(metadata.geo_json.features[i].properties.admin_level==filters.admin_level)
	    	return d;
	    });

	    scale.mapPolygons = d3.scaleLinear()
	    .range([colorNeutral[0],colorNeutral[4]])
		.domain([0,maxMapPolygonValue]);

		metadata.geo_json.features.forEach(function(d,i){
			var v = dataByLocationSum[i];
			d3.select('#polygon-'+d.properties.id).style('fill', function(d,i){
				if(v>0){
					return scale.mapPolygons(v);
				} else {
					return colorLightgrey[1];
				}
			})
			.attr('data-total', v)
			.style('display', function(dd,ii){
				if(dd.properties.admin_level==filters.admin_level){
					return 'block';
				} else {
					return 'none';
				}
			})
			.attr('stroke', function(d,i){
				var id = d.properties.id;
				if(filters.geo.includes(id)){
					return 'cyan';
				} else {
					return '#FFF';
				}
			})
		});

	}

}

//**************************
// update heatmap
//**************************
Map.updateHeatmap = function(){

    if(!map.getSource('heatmap')) return;

	d3.selectAll('.bubble')
	.style('display', 'none');

	d3.select('#map-polygons').style('display', 'none');

	d3.select('#map-grid-svg').style('display', 'none');
	$('#map-bg-toggle').show();

	map.dragPan.enable();
	map.doubleClickZoom.enable();

	// heatmap display number of entries
	if(filters.frameworkToggle=='entries'){

		d3.select('#heatmap-checkbox').style('display', 'none');	

		var gd = dataByDate.filter(function(d){
			return ((new Date(d.key)>=dateRange[0])&&(new Date(d.key)<dateRange[1]));
		});

		var dataByLocationSum = [];

		for(var g=0; g < metadata.geo_json_point.features.length; g++) {
			dataByLocationSum[g] = 0;
			metadata.geo_json_point.features[g].properties.value = 0;
		}

	    gd.forEach(function(d,i){
	    	for(var g=0; g < metadata.geo_json_point.features.length; g++) {
	    		var t = 0;
	    		if(d.geo[g]>0){
		    		if(metadata.geo_json_point.features[g].properties.admin_level==filters.admin_level){
		    			t = (dataByLocationSum[g]) + (d.geo[g]);
		    			dataByLocationSum[g] = t;
						metadata.geo_json_point.features[g].properties.value = t;
	    			}
	    		}
			}
	    });

	    var maxMapValue = d3.max(dataByLocationSum, function(d) {
	    	return d;
	    });

		map.getSource('heatmap').setData(metadata.geo_json_point);
		if(maxMapValue>0){
			map.setPaintProperty('#heatmap', 'heatmap-weight', {property: 'value', type: 'exponential', stops: [[0,0],[1,0.4],[maxMapValue,3]]});		
		}

		if(heatmapColor!='entries'){
			heatmapColor = 'entries';
			map.setPaintProperty('#heatmap', 'heatmap-color', heatmapColorEntries);
		}
	// heatmap display severity/reliability
	} else {

		$('#heatmap-checkbox').fadeIn();	

		for(var g=0; g < metadata.geo_json_point.features.length; g++) {
			metadata.geo_json_point.features[g].properties.value = 0;
		}

		// color bubbles accoring to severity/reliability
		var locationBySeverityReliability = dataByLocationArray.filter(function(d){
			if(filters.toggle=='severity'){
				return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.s>0));
			} else {
				return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.r>0));
			}
		});

		var sev = d3.nest()
		.key(function(d) {  return d.geo;})
		.rollup(function(v) { return {
			'value': Math.round(d3.median(v, function(d) { if(filters.toggle=='severity'){return d.s;} else { return d.r; } } )), 
			'total': d3.sum(v, function(d){
				return 1;
			}) 
		}

		})
		.entries(locationBySeverityReliability);

		sev.forEach(function(d,i){
			var geo = metadata.geo_json_point.features[d.key-1];
			if(geo.properties.admin_level==filters.admin_level){
				if(filters.heatmapCheckbox==true){
					metadata.geo_json_point.features[d.key-1].properties.value = (d.value.value * d.value.total);
				} else {
					metadata.geo_json_point.features[d.key-1].properties.value = d.value.value;
				}
			} 
		});

		if(filters.heatmapCheckbox==true){
		    var maxMapValue = d3.max(metadata.geo_json_point.features, function(d,i){
		    	if(d.properties.admin_level==filters.admin_level){
		    		return d.properties.value;
		    	}
		    })
    		if(maxMapValue<5){
				maxMapValue = 5;
			}
		} else {
		    var maxMapValue = 5;
		}

		map.getSource('heatmap').setData(metadata.geo_json_point);

		if(maxMapValue>0){
			map.setPaintProperty('#heatmap', 'heatmap-weight', {property: 'value', type: 'exponential', stops: [[0,0],[1,0.4],[maxMapValue,3]]});		
		}

		if((heatmapColor!='severity')&&(filters.toggle=='severity')){
			heatmapColor = 'severity';
			map.setPaintProperty('#heatmap', 'heatmap-color', heatmapColorSeverity);
		}

		if((heatmapColor!='reliability')&&(filters.toggle=='reliability')){
			heatmapColor = 'reliability';
			map.setPaintProperty('#heatmap', 'heatmap-color', heatmapColorReliability);
		}
	}
	map.setPaintProperty('#heatmap', 'heatmap-opacity', 0.6);
	map.setLayoutProperty('#heatmap', 'visibility', 'visible');		
}

function check_style_status() {
  if (map.isStyleLoaded()) {
    checking_style_status = false;
    map._container.trigger('map_style_finally_loaded');
  } else {
    setTimeout(function() {check_style_status();}, 200);
    return;
  }
}

Map.createTooltipSparkline = function(){

	mapTooltipSvg = d3.select('#map-bubble-svg').append('g')
	.attr('opacity', 0).append('g');

	mapTooltipSvg.append('rect')
	.attr('class', 'map-tooltip-sparkline-bg')
	.attr('id', function(d,i){ return 'map-tooltip-sparkline-bg' })
	.attr('x', function(d,i){
		return 0;
	})
	.attr('width', function(d,i){
		return tooltipSparklineWidth;
	})
	.attr('height', function(d,i){
		return tooltipSparklineHeight;
	})
	.attr('y', 0)
	.style('cursor', function(d,i){

	})
	.style('fill', '#E9E9E9');


	mapTooltipSvg.append('rect')
	.attr('class', 'map-tooltip-sparkline-overlay')
	.attr('id', function(d,i){ return 'map-tooltip-sparkline-overlay' })
	.attr('x', function(d,i){
		return 0;
	})
	.attr('width', function(d,i){
		return tooltipSparklineWidth
	})
	.attr('height', function(d,i){
		return tooltipSparklineHeight;
	})
	.attr('y', 0)
	.style('cursor', function(d,i){

	})
	.style('fill', '#FFF');

	// tooltip sparkline
	mapTooltipSvg
	.append('path')
	.attr('class', 'sparkline')
	.attr('id','mapTooltipSparkline')
	.attr("stroke", colorNeutral[2])
	.attr("fill", 'transparent')
    .attr("stroke-width", 1);

	Map.updateSparklinesOverlay(dateRange);
}

Map.updateTooltipSparkline = function(geoId, geoName, geoTotal, geoMedian){

	var dataByDateSparkline = [...dataByLocationArray];

	dataByDateSparkline = dataByDateSparkline.filter(function(d,i){
		return parseInt(d.geo) == parseInt(geoId);
	});

	var sparklineDates;

	// parse missing dates
	if(filters.time=='d'){
		sparklineDates = d3.timeDays(scale.timechart.x.domain()[0], scale.timechart.x.domain()[1], 1);
		dateIndex = dataByDateSparkline.map(function(d) { return d.date.getTime(); });

		dataByDateSparkline = d3.nest()
		.key(function(d) { return (d.date); })
		.rollup(function(leaves) { 
			return { 
				'median_r': d3.median(leaves, function(d,i){return d.r;}), 
				'median_s': d3.median(leaves, function(d,i){return d.s;}), 
				'total': leaves.length, 
			}
		})		
		.entries(dataByDateSparkline);

	}

	if(filters.time=='m'){
		sparklineDates = d3.timeMonths(scale.timechart.x.domain()[0], scale.timechart.x.domain()[1], 1);
		dateIndex = dataByDateSparkline.map(function(d) { return d.month.getTime(); });

		dataByDateSparkline = d3.nest()
		.key(function(d) { return (d.month); })
		.rollup(function(leaves) { 
			return { 
				'median_r': d3.median(leaves, function(d,i){return d.r;}), 
				'median_s': d3.median(leaves, function(d,i){return d.s;}), 
				'total': leaves.length, 
			}
		})		
		.entries(dataByDateSparkline);
	}

	if(filters.time=='y'){
		sparklineDates = d3.timeYears(scale.timechart.x.domain()[0], scale.timechart.x.domain()[1], 1);
		dateIndex = dataByDateSparkline.map(function(d) { return d.year.getTime(); });

		dataByDateSparkline = d3.nest()
		.key(function(d) { return (d.year); })
		.rollup(function(leaves) { 
			return { 
				'median_r': d3.median(leaves, function(d,i){return d.r;}), 
				'median_s': d3.median(leaves, function(d,i){return d.s;}), 
				'total': leaves.length, 
			}
		})		
		.entries(dataByDateSparkline);
	}

	sparklineDates.forEach(function(d,i){
		if(!dateIndex.includes(d.getTime())){
			dataByDateSparkline.push({
				'key': d,
				'value': {'median_r': null, 'median_s': null, 'total': null}
			})
		}		
	});

	dataByDateSparkline.forEach(function(d,i){
		d.key = new Date(d.key);
	});

	dataByDateSparkline.sort(function(x,y){
		return d3.ascending(x.key, y.key);
	});

	pointWidth = (tooltipSparklineWidth)/dataByDateSparkline.length;

	// find maximum value
	var contextMax = d3.max(dataByDateSparkline, function(d,i){
		return d.value.total;
	});

	// define x scale
	scale.tooltipSparkline.x = scale.timechart.x.copy();
	scale.tooltipSparkline.x.range([0, tooltipSparklineWidth])

	// define y scale
	scale.tooltipSparkline.y = d3.scaleLinear()
    .range([tooltipSparklineHeight, 1])
    .domain([0, contextMax]);

    Map.updateSparklinesOverlay(dateRange);

	var filteredSparklineData = dataByDateSparkline.filter(function(d){ 
    	return d.value.total>0; 
    });

    if(contextMax>0){

    	// gradient line color
    	d3.select('#linearGradientSparkline').remove();
		mapsvg
			.append("linearGradient")
			.attr("id", 'linearGradientSparkline')
			.attr("gradientUnits", "userSpaceOnUse")
			.attr("x1", 0)
			.attr("x2", tooltipSparklineWidth)
			.selectAll("stop")
			.data(filteredSparklineData)
		    .join("stop")
			.attr("offset", d => ((scale.tooltipSparkline.x(d.key)+pointWidth/2) / (tooltipSparklineWidth)) )
			.attr("stop-color", function(d,i){
				if(filters.frameworkToggle=='entries'){
			      	var col = colorNeutral[2];
      			} else {
			      	var col = colorLightgrey[3];
      			}
				if(!d.value.total) return col;
				if(filters.frameworkToggle=='entries'){
					col = colorNeutral[2];
				} else {
					if(filters.toggle=='severity'){
						col = colorPrimary[Math.round(d.value.median_s)];
					} else {
						col = colorSecondary[Math.round(d.value.median_r)];
					}
				}
				return col;
			});

    	d3.select('#mapTooltipSparkline')
		.datum(dataByDateSparkline)
		.style('stroke', 'url(#linearGradientSparkline)')
		.attr("d", d3.line()
	        .x(function(d) { return scale.tooltipSparkline.x(d.key)+pointWidth/2 })
	        .y(function(d) { 
	        	var v = d.value.total;
	        	if(v===undefined)v=0;
	        	return scale.tooltipSparkline.y(v);
	        })
        ).attr('opacity', 1);   
			var html = '<div style="text-align: left; font-weight: bold;">'+geoName+'&nbsp;&nbsp;<span style="font-size: 9px; color: lightgrey;">ADM '+filters.admin_level+'</span></div>';

				if(filters.frameworkToggle=='entries'){
					html = html+'<div style="width: 100px; height: 13px; display: inline; margin-bottom: 2px; font-size: 10px; text-align: left; background-color: '+ colorNeutral[2] + '">&nbsp;&nbsp;</div><div style="padding-left: 5px; padding-bottom: 0px; display: inline; color: '+ colorNeutral[4] + '; font-size: 9px"><b>' + geoTotal + ' entries</b></div>';
				} else {
					if(geoMedian>0){
						if (filters.toggle=='severity'){
							var color = colorPrimary[geoMedian];
							var text = metadata.severity_units[geoMedian].name;
						} else {
							var color = colorSecondary[geoMedian];
							var text = metadata.reliability_units[geoMedian].name;
						}
						html = html+'<div style="width: 100px; height: 13px; display: inline; margin-bottom: 2px; font-size: 10px; text-align: left; background-color: '+ color + '">&nbsp;&nbsp;</div>&nbsp;&nbsp;<span style="font-size: 10px">'+text+'</span><div style="padding-left: 5px; padding-bottom: 0px; display: inline; color: '+ colorNeutral[4] + '; font-size: 9px"><b>' + geoTotal + ' entries</b></div>';
					}
				}
		        html=html+'<br/><svg style="margin-top: 1px; margin-bottom: 1px" id="tooltipSparkline" width="'+tooltipSparklineWidth+'px" height="'+tooltipSparklineHeight+'px">'+mapTooltipSvg.node().outerHTML+'</svg>';
			} 
	        return html;

    } 

Map.updateSparklinesOverlay = function(d1){
	if(scale.tooltipSparkline.x){
		d3.select('.map-tooltip-sparkline-overlay')
		.attr('x', scale.tooltipSparkline.x(d1[0]))
		.attr('width', scale.tooltipSparkline.x(d1[1])-scale.tooltipSparkline.x(d1[0]));		
	}
}

//**************************
// create grid map
//**************************
Map.createGridmap = function(){

	d3.select('#map-grid-svg')
    .selectAll('.grid-rect').remove();

	// dynamic grid size
	if(filters.admin_level==0){
		nodeRadius = 26;
	} else if(filters.admin_level==1){
		nodeRadius = 16;		
	} else {
		nodeRadius = 13;			
	}

    nodes = metadata.geo_json_point.features.filter(function(d){
		return d.properties.admin_level == filters.admin_level;
	});

	simulation = d3.forceSimulation(nodes)
	.force('x', d3.forceX().x(function(d) {
		var point = Map.projectPoint(d.geometry.coordinates[0], d.geometry.coordinates[1]);
		return point.x ;
	}))
	.force('y', d3.forceY().y(function(d) {
		var point = Map.projectPoint(d.geometry.coordinates[0], d.geometry.coordinates[1]);
		return point.y ;
	}))
	.force('collision', d3.forceCollide().radius(function(d) {
	    return nodeRadius*.7;
	  }))
	.on('tick', Map.ticked)

	for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
	    simulation.tick();
	}

	gridmapInit = true;
	Map.updateGridmap();

}

Map.ticked = function() {

  var u = d3.select('#map-grid-svg')
    .selectAll('.grid-rect')
    .data(nodes)

  u.enter()
    .append('rect')
    .attr('class','grid-rect')
    .attr('width', nodeRadius)
    .attr('height', nodeRadius)
    .merge(u)
    .attr('x', function(d) {
    	if(!d.x)return;
      return Math.round(d.x/(nodeRadius))*(nodeRadius);
    })
    .attr('y', function(d) {
    	if(!d.y)return;
      return Math.round(d.y/(nodeRadius))*(nodeRadius);
    })
	.style('cursor','pointer').on('click', function(d,i){
		if(lassoActive) return false;
		Deepviz.filter('geo',d.properties.id);
	});

  u.exit().remove();

  Map.updateGridmap();

}

//**************************
// update grid map
//**************************
Map.updateGridmap = function(){
	if(gridmapInit==false) return Map.createGridmap();

 	d3.selectAll('.bubble')
	.style('display', 'none');

	d3.select('#map-polygons').style('display', 'none');

	d3.select('#map-grid-svg').style('display', 'block');

	$('#map-bg-toggle').hide();

	// map.dragPan.disable();
	// map.doubleClickZoom.disable();
	// d3.selectAll('#map-bubble-svg').style('cursor','default');

	d3.selectAll('#map-bubble-svg rect').style('cursor','pointer');

	// gridmap display number of entries
	if(filters.frameworkToggle=='entries'){

		var locationData = dataByLocationArray.filter(function(d){
			return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.admin_level==filters.admin_level));
		});

		bubbleData = d3.nest()
		.key(function(d) {  return d.geo;})
		.rollup(function(v) { return {
			'total': d3.sum(v, function(d){
				return 1;
				})
			}
		})
		.entries(locationData);

		metadata.geo_json_point.features.forEach(function(d,i){
			d.total = 0;
			bubbleData.forEach(function(dd,ii){
				if(d.properties.id==parseInt(dd.key)){
					d.total = dd.value.total;
				}
			})
		});

		var nodeMax = d3.max(nodes, function(d,i){
			return d.total;
		});

	    d3.select('#map-grid-svg')
	    .selectAll('.grid-rect')
	    .data(nodes)
	    .attr('data-name',function(d,i){
			return d.properties.name;
		})
		.attr('id', function(d,i){
			return 'grid'+d.properties.id;
		})
		.attr('data-id', function(d,i){
			return d.properties.id;
		})
		.attr('data-total', function(d,i){
			return d.total;
		})
		.attr('data-median', function(d,i){
			return d.median;
		});

	    simulation.tick();

	    var colorScale = d3.scaleLinear().domain([1,nodeMax])
		.range([colorNeutral[0], colorNeutral[4]])
		.interpolate(d3.interpolateHcl);

	    d3.selectAll('.grid-rect').attr('fill', function(d) {
	    	var v = d.total;
	    	if(v>0) return colorScale(v);
	    	return '#FFF';
	    }).style('stroke', function(d,i){ 
			if(filters.geo.includes(d.properties.id)){
				return 'cyan';
			} else {
				return colorLightgrey[2]
			}
		}).on('mouseover', function(d,i){
			d3.select(this).style('stroke', function(d,i){ 
				if(filters.geo.includes(d.properties.id)){
					return 'cyan';
				} else {
					return colorLightgrey[3];
				}
			});
		}).on('mouseout', function(d,i){
			d3.select(this).style('stroke', function(d,i){ 
				if(filters.geo.includes(d.properties.id)){
					return 'cyan';
				} else {
					return colorLightgrey[2];
				}
			});
		})

	} else {

		// color bubbles accoring to severity/reliability
		var locationBySeverityReliability = dataByLocationArray.filter(function(d){
			if(filters.toggle=='severity'){
				return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.s>0)&&(d.admin_level==filters.admin_level));
			} else {
				return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.r>0)&&(d.admin_level==filters.admin_level));
			}
		});

		bubbleData = d3.nest()
		.key(function(d) {  return d.geo;})
		.rollup(function(v) { return {
			'median': Math.round(d3.median(v, function(d) { if(filters.toggle=='severity'){return d.s;} else { return d.r; } } )), 
			'total': d3.sum(v, function(d){
				return 1;
				})
			}
		})
		.entries(locationBySeverityReliability);

		metadata.geo_json_point.features.forEach(function(d,i){
			d.total = 0;
			bubbleData.forEach(function(dd,ii){
				if(d.properties.id==parseInt(dd.key)){
					d.total = dd.value.total;
					d.median = dd.value.median;
				}
			})
		});

	    d3.select('#map-grid-svg')
	    .selectAll('.grid-rect')
	    .data(nodes)
	    .attr('data-name',function(d,i){
			return d.properties.name;
		})
		.attr('id', function(d,i){
			return 'grid'+d.properties.id;
		})
		.attr('data-id', function(d,i){
			return d.properties.id;
		})
		.attr('data-total', function(d,i){
			return d.total;
		})
		.attr('data-median', function(d,i){
			return d.median;
		});

	    simulation.tick();

		d3.selectAll('.grid-rect').attr('fill', function(d) {
			if(d.median>0){
				if(filters.toggle=='severity'){
			    	return colorPrimary[d.median];
				} else {
			    	return colorSecondary[d.median];
				}			
			} else {
				return '#FFF';
			}

	    }).style('stroke', function(d,i){ 
			if(filters.geo.includes(d.properties.id)){
				return 'cyan';
			} else {
				return colorLightgrey[2];
			}
		});
	}

	tippy('.grid-rect', { 
		theme: 'light-border',
		delay: [250,100],
		inertia: false,
		distance: 8,
		allowHTML: true,
		animation: 'shift-away',
		arrow: true,
		size: 'small',
		onShow(instance){
			var geoId = d3.select(d3.select(instance.reference).node()).attr('data-id');
			var geoName = d3.select(d3.select(instance.reference).node()).attr('data-name');
			var geoTotal = d3.select(d3.select(instance.reference).node()).attr('data-total');
			var geoMedian = d3.select(d3.select(instance.reference).node()).attr('data-median');
        	var html = Map.updateTooltipSparkline(geoId, geoName, geoTotal, geoMedian);
        	(html) ? instance.setContent(html) : instance.setContent(geoName)
		}
	});

	gridmapInit = true;
}
