var Map = {};
var map;
var mapsvg;
var path;
var transform;
var transform2;
var path2;

//**************************
// create map
//**************************
Map.create = function(){

	// set map height

	map = document.getElementById("map");
	map.setAttribute("style","height:"+(map.offsetWidth*mapAspectRatio)+"px");

	mapboxgl.accessToken = mapboxToken;

	// no data fallback
	if(data.length==0) return false; 

	// map toggle
	d3.select('#map-toggle')
	.on('click', function(d,i){
		if(mapToggle=='bubbles') {
			mapToggle='choropleth';
			$('#map-toggle-bubbles').hide();
			$('#map-toggle-choropleth').show();
			Map.updateChoropleth();			
		} else {
			mapToggle='bubbles';
			$('#map-toggle-bubbles').show();
			$('#map-toggle-choropleth').hide();
			Map.updateBubbles();
		}
	});
	$(document).ready(function(){
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
			Map.update();
			d3.selectAll('#adm0_bg, #adm1_bg, #adm2_bg').style('fill', '#FFF');
			d3.selectAll('#adm0_label, #adm1_label, #adm2_label').style('fill', '#343434');
			d3.select('#adm'+filters.admin_level+'_bg').style('fill', '#343434');
			d3.select('#adm'+filters.admin_level+'_label').style('fill', '#FFF');
		})		
	});

	var bounds = new mapboxgl.LngLatBounds([d3.min(geoBounds.lat),d3.min(geoBounds.lon)], [d3.max(geoBounds.lat),d3.max(geoBounds.lon)] );

    //Setup mapbox-gl map
    map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/light-v9',
        center: [d3.mean(geoBounds.lat), d3.mean(geoBounds.lon)],
        zoom: 4,  
        trackResize: true,
        pitchWithRotate: false,
        doubleClickZoom: true,
        dragRotate: false
    });

    mapbox = map;
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');
    map.scrollZoom.disable();
    map.fitBounds(bounds, {
    	padding: 20
    });

    var container = map.getCanvasContainer()

    mapsvg = d3.select(container).append("svg")
    .attr('id','map-bubble-svg')
    .style('position', 'absolute')
    .style('width', '100%')
    .style('height', '100%');

    transform = d3.geoTransform({point: Map.projectPoint});
    path = d3.geoPath().projection(transform);

    this.createBubbles();
    this.createChoropleth();

	d3.selectAll('#geoRemoveFilter').on('click', function(){
		d3.select('#geoRemoveFilter').style('display', 'none').style('cursor', 'default');
		$('#location-search').val(); 
		$('#location-search').trigger('change.select2');
		return Deepviz.filter('geo', 'clear'); 
	});

	this.createSearch();

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

}

Map.createBubbles = function(){

    var gd = dataByDate.filter(function(d){
    	return ((new Date(d.key)>=dateRange[0])&&(new Date(d.key)<dateRange[1]));
    });

    var dataByLocationSum = [];

    for(var g=0; g < metadata.geo_array.length; g++) {
    	dataByLocationSum[g] = 0;
    }

    gd.forEach(function(d,i){
    	for(var g=0; g < metadata.geo_array.length; g++) {
    		if(d.geo[g]>0){
    			var t = (dataByLocationSum[g]) + (d.geo[g]);
    			if(metadata.geo_array[g].admin_level!=0){
	    			dataByLocationSum[g] = t;
    			} else {
	    			dataByLocationSum[g] = 0;
    			}
    		}
    	}
    });

    maxMapBubbleValue = d3.max(dataByLocationSum, function(d) {
    	return d;
    });

    scale.map = d3.scaleLinear()
    .range([0.2,1])
	.domain([0,maxMapBubbleValue]);

	// create bubbles
	var featureElement = mapsvg.selectAll("g")
	.data(dataByLocationSum)
	.enter()
	.append('g')
	.attr('class','bubble')
	.style('outline', 'none')
	.attr('data-tippy-content',function(d,i){
		return metadata.geo_array[i].name;
	})
	.attr('id', function(d,i){
		return 'bubble'+i
	})
	.attr('transform', function(d,i){
		p = Map.projectPoint(metadata.geo_array[i].centroid[0], metadata.geo_array[i].centroid[1]);
		return 'translate('+p.x+','+p.y+')';
	})
	.style('opacity', 1)
	.on('mouseover', function(){
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
	}).on('click', function(d,i){
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
		size: 'small'
	});

	var featureElementG = featureElement
	.append('g')
	.attr('class', 'map-bubble')
	.attr('transform', function(d,i){
		var size = scale.map(dataByLocationSum[i]);
		return 'scale('+size+')';
	})
	.style('display', function(d,i){
		if(dataByLocationSum[i]>0){
			return 'inline';
		} else {
			return 'none';
		}
	});

	featureElementG
	.append("circle")
	.attr('class',  'outerCircle')
	.attr("stroke", colorNeutral[3])
	.attr("fill", "#FFF")
	.attr('cx', 0)
	.attr('cy', 0)
	.attr('r' , 30)
	.attr("stroke-width", 2);

	featureElementG
	.append("circle")
	.attr('class',  'innerCircle')
	.attr("fill", colorNeutral[3])
	.attr('cx', 0)
	.attr('cy', 0)
	.attr('r' , 26)
	.attr("stroke-width", 0);

	featureElementG
	.append('text')
	.attr('text-anchor', 'middle')
	.attr('class', 'map-bubble-value')
	.text(function(d,i){
		return dataByLocationSum[i];
	})
	.attr('y', 8)
	.style('font-weight', 'normal')
	.style('font-size', '24px')
	.style('fill', '#FFF');

	function update() {
		featureElement.attr('transform', function(d,i){
			p = Map.projectPoint(metadata.geo_array[i].centroid[0], metadata.geo_array[i].centroid[1]);
			return 'translate('+p.x+','+p.y+')';
		});  
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
    .attr('data-value', function(d,i){
    	return d.properties.value;
    })
    .style("stroke", "#FFF")
    .style('display', function(d,i){
    	if(d.properties.admin_level == 1){
    		return 'block';
    	} else {
    		return 'none';
    	}
    })
    .style("fill", "green")
    .style("fill-opacity", 0.85)
	.on('mouseover', function(){
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
		allowHTML: true,
		animation: 'shift-away',
		arrow: true,
		size: 'small',
		onShow(instance) {
			var ref = (instance.reference).__data__;
			var text = ref.properties.name;

			if(ref.properties.value>0){
				text = text + '<div style="padding-left: 3px; padding-bottom: 2px; display: inline; font-weight: bold; color: '+ colorNeutral[4] + '; font-size: 9px">' + ref.properties.value + ' '+textLabel+'</div>';
			}
			instance.setContent(text);
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

Map.update = function(){
	if(mapToggle=='bubbles') {
		Map.updateBubbles();			
	} else {
		Map.updateChoropleth();
	}	
}

//**************************
// update map bubbles
//**************************
Map.updateBubbles = function(){

	d3.selectAll('.map-bubble')
	.style('opacity', 0);

	d3.select('#map-polygons').style('display', 'none');

	var gd = dataByDate.filter(function(d){
		return ((new Date(d.key)>=dateRange[0])&&(new Date(d.key)<dateRange[1]));
	});

	var dataByLocationSum = [];

	for(var g=0; g < metadata.geo_array.length; g++) {
		dataByLocationSum[g] = 0;
	}

    gd.forEach(function(d,i){
    	for(var g=0; g < metadata.geo_array.length; g++) {
    		if(d.geo[g]>0){
    			var t = (dataByLocationSum[g]) + (d.geo[g]);
    			if(metadata.geo_array[g].admin_level==filters.admin_level){
	    			dataByLocationSum[g] = t;
    			} else {
	    			dataByLocationSum[g] = 0;
    			}
    		}
    	}
    });

    maxMapBubbleValue = d3.max(dataByLocationSum, function(d) {
    	return d;
    });

	scale.map = d3.scaleLinear()
	.range([0.2,1])
	.domain([0,maxMapBubbleValue]);

	var bubbles = d3.selectAll('.map-bubble')
	.attr('transform', function(d,i){
		var size = scale.map(dataByLocationSum[i]);
		return 'scale('+size+')';
	});

	bubbles.select('.map-bubble-value')
	.text(function(d,i){
		return dataByLocationSum[i];
	});

	bubbles.selectAll('.innerCircle').style('fill', colorNeutral[2]);

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
	.rollup(function(v) { return Math.round(d3.median(v, function(d) { 
		if(filters.toggle=='severity'){
			return d.s; 
		} else {
			return d.r;
		}
	}))})
	.entries(locationBySeverityReliability);

	sev.forEach(function(d,i){
		if(filters.toggle=='severity'){
			d3.selectAll('#bubble'+(d.key-1)+ ' .innerCircle').style('fill', colorPrimary[d.value]);
			d3.selectAll('#bubble'+(d.key-1)+ ' .outerCircle').style('stroke', colorPrimary[d.value]);
		} else {
			d3.selectAll('#bubble'+(d.key-1)+ ' .innerCircle').style('fill', colorSecondary[d.value]);
			d3.selectAll('#bubble'+(d.key-1)+ ' .outerCircle').style('stroke', colorSecondary[d.value]);
		}
	})

	bubbles
	.style('opacity', function(d,i){
		d3.select(this).select('.outerCircle').style('stroke', function(){
			var id = metadata.geo_array[i].id;
			if(filters.geo.includes(id)){
				return 'cyan';
			}
		});

		if(dataByLocationSum[i]>0){
			return 1;
		} else {
			return 0;
		}
	})
	.style('display', function(d,i){
		if(dataByLocationSum[i]>0){
			return 'block';
		} else {
			return 'none';
		}
	});
	// map.setPaintProperty('choropleth', 'fill-opacity', 0);
	// map.setLayoutProperty('choropleth', 'visibility', 'none');

}

//**************************
// update map choropleth
//**************************
Map.updateChoropleth = function(){

	d3.selectAll('.map-bubble')
	.style('opacity', 0);

	d3.select('#map-polygons').style('display', 'block');

	d3.selectAll('.polygon')
	.style('fill', colorLightgrey[1]);

	var gd = dataByDate.filter(function(d){
		return ((new Date(d.key)>=dateRange[0])&&(new Date(d.key)<dateRange[1]));
	});

	var dataByLocationSum = [];

	for(var g=0; g < metadata.geo_json.features.length; g++) {
		dataByLocationSum[g] = 0;
	}

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
		.attr('data-value', v)
		.style('display', function(dd,ii){
			if(dd.properties.admin_level==filters.admin_level){
				return 'block';
			} else {
				return 'none';
			}
		})
		.style('stroke', function(d,i){
			var id = d.properties.id;
			if(filters.geo.includes(id)){
				return 'cyan';
			} else {
				return '#FFF';
			}
		})
	});

}