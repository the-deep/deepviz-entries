var Deepviz = function(sources, callback){

	//**************************
	// define variables
	//**************************
	var dateRange  = [new Date(2019, 4, 15), new Date(2019, 7, 31)]; // selected dateRange on load
	// var minDate = new Date('2019-08-05');

	// use url parameters
	var url = new URL(window.location.href);
	// minDate = new Date(url.searchParams.get("min_date"));

	var maxDate;
	var dateIndex;
	var scale = {
		'timechart': {x: '', y1: '', y2: ''},
		'trendline': {x: '', y: ''},
		'map': '',
		'eventdrop': '',
		'severity': {x: '', y: ''},
		'sector': {x: '', y: ''},
		'reliability': {x: '', y: ''}
	};

	var mapbox;
	// data related
	var metadata;
	var originalData; // full original dataset without filters (used to refresh/clear filters)
	var data; // active dataset after filters applied
	var dataByDate;
	var dataByMonth;
	var dataByYear;
	var dataByLocation;
	var dataByLocationSum;
	var dataByContext;
	var dataByFramework;
	var dataBySector;
	var dataBySpecificNeeds;
	var dataByAffectedGroups;
	var total = 0;
	var maxValue; // max value on a given date
	var maxContextValue;
	var tp_severity = [];
	var tp_reliability = [];
	// timechart variables
	var timechartInit = 0;
	var timechartyAxis;
	var timechartyGrids;
	var width = 1300;
	var margin = {top: 18, right: 17, bottom: 0, left: 37};
	var timechartHeight = 370;
	var timechartHeight2 = timechartHeight;
	var timechartHeightOriginal = timechartHeight;
	var timechartSvgHeight = 870;
	var brush;
	var gBrush; 
	var barWidth;
	var numContextualRows;
	var numCategories;
	var frameworkToggleImg;
	// trendline
	var trendlinePoints;
	var avgSliderBrushing = false; // brush state
	var pathData = {};
	var clickTimer = 0;
	var smoothingVal = 10;
	var curvedLine = d3.line()
	.x(function(d,i){
		return scale.timechart.x(dataByDate[i].date);
	})
	.y(d => (d))
	.curve(d3.curveLinear);

	// map
	var maxMapBubbleValue;
	var mapAspectRatio = 1.35;
	var geoBounds = {'lat': [], 'lon': []};

	// filters
	var filters = {
		sector: [],
		severity: [],
		reliability: [],
		affectedGroups: [],
		specificNeeds: [],
		context: [],
		geo: [],
		toggle: 'severity',
		frameworkToggle: 'entries',
		time: 'd'
	};

	// colors
	var colorPrimary = ['#A1E6DB','#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000']; // severity (multi-hue)
	var colorGrey = ['#CDCDCD', '#AFAFAF', '#939393', '#808080', '#646464'];
	var colorLightgrey = ['#EBEBEB', '#CFCFCF', '#B8B8B7', '#A8A9A8', '#969696'];
	var colorLightgrey = ['#fafafa','#F5F5F5', '#DFDFDF', '#D0D0D0', '#C7C7C7', '#BABABA'];
	var colorBlue = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];
	var colorNeutral = ['#ddf6f2', '#76D1C3', '#36BBA6', '#1AA791', '#008974'];
	var colorSecondary = ['#A1E6DB','#f1eef6', '#bdc9e1', '#74a9cf', '#2b8cbe', '#045a8d']; // reliability (multi-hue PuBu)

	var maxCellSize = 4;
	var cellColorScale = d3.scaleSequential().domain([1,maxCellSize])
	.interpolator(d3.interpolateReds);

	// stacked bar charts (sector, affected groups, special needs groups)
	var stackedBarHeight = 550;
	//**************************
	// load data
	//**************************

	// define the data source to be loaded. replace with API URL endpoint
	var files = sources;

	// load each data source
	var promises = [];
	files.forEach(function(url) {
        // Error handle for invalid URL
        parsed_url = new URL(url);
        pathname = parsed_url.pathname

		if(pathname.endsWith('json')){
			promises.push(d3.json(url));			
		};
		if(pathname.endsWith('csv')){
			promises.push(d3.csv(url));			
		};
		if(pathname.endsWith('svg')){
			promises.push(d3.xml(url));			
		};
	});

	// after all data has been loaded
	Promise.all(promises).then(function(values) {
		//**************************
		// all data loaded
		//**************************

		// return the data
		data = values[0].data;
		metadata = values[0].meta;
		frameworkToggleImg = values[1];

		// parse meta data, create integer id column from string ids
		metadata.context_array.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
		});
		metadata.framework_groups_array.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
			d._context_id = d.context_id;
			metadata.context_array.forEach(function(ddd,ii){
				if(d._context_id==ddd._id){
					d.context_id = ddd.id;
				}
			});
		});
		metadata.affected_groups_array.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
		});
		metadata.specific_needs_groups_array.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
		});
		metadata.sector_array.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
		});
		metadata.severity_units.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
		});
		metadata.reliability_units.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
		});
		metadata.geo_array.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
		});

		metadata.severity_units.unshift({
			"id": 6,
			"color": "grey",
			"name": "Null",
			"_id": null,
		});
		metadata.reliability_units.unshift({
			"id": 6,
			"color": "grey",
			"name": "Null",
			"_id": null,
		})

		// convert date strings into js date objects
		data.forEach(function(d,i){
			d.date = new Date(d.date);
			d.date.setHours(0,0,0,0);
			d.month = new Date(d.date);
			d.month.setHours(0,0,0,0);
			d.month.setDate(1);
			d.year = new Date(d.date);
			d.year.setHours(0,0,0,0);
			d.year.setDate(1);
			d.year.setMonth(0);

			// PARSE STRING IDS TO INTEGERS
			// parse context array
			d._context = d.context;
			d.context = [];
			d._context.forEach(function(dd,ii){
				metadata.context_array.forEach(function(ddd,ii){
					if(dd==ddd._id){
						d.context.push(ddd.id);
					}
				});
			});
			// parse specific needs array
			d._special_needs = d.special_needs;
			d.special_needs = [];
			d._special_needs.forEach(function(dd,ii){
				metadata.specific_needs_groups_array.forEach(function(ddd,ii){
					if(dd==ddd._id){
						d.special_needs.push(ddd.id);
					}
				});
			});
			// parse affected groups array
			d._affected_groups = d.affected_groups;
			d.affected_groups = [];
			d._affected_groups.forEach(function(dd,ii){
				metadata.affected_groups_array.forEach(function(ddd,ii){
					if(dd==ddd._id){
						d.affected_groups.push(ddd.id);
					}
				});
			});
			// parse affected groups array
			d._sector = d.sector;
			d.sector = [];
			d._sector.forEach(function(dd,ii){
				var context_id = 0;
				metadata.context_array.forEach(function(ddd,ii){
					if(dd[0]==ddd._id){
						context_id = ddd.id;
					}
				});
				var framework_id = 0;
				metadata.framework_groups_array.forEach(function(ddd,ii){
					if(dd[1]==ddd._id){
						framework_id = ddd.id;
					}
				});
				var sector_id = 0;
				metadata.sector_array.forEach(function(ddd,ii){
					if(dd[2]==ddd._id){
						sector_id = ddd.id;
					}
				});
				d.sector.push([context_id,framework_id,sector_id]);
			});

			// parse severity id
			d._severity = d.severity;
			metadata.severity_units.forEach(function(ddd,ii){
				if(d._severity==ddd._id){
					d.severity = ddd.id;
				}
				// parse null values
				if(d._severity===null){
					d.severity = 0;
				}


			});
			// parse reliability id
			d._reliability = d.reliability;
			metadata.reliability_units.forEach(function(ddd,ii){
				if(d._reliability==ddd._id){
					d.reliability = ddd.id;
				}
				// parse null values
				if(d._reliability===null){
					d.reliability = 0;
				}
			});
			// parse geo id
			d._geo = d.geo;
			d.geo = [];

			d._geo.forEach(function(dd,ii){
				metadata.geo_array.forEach(function(ddd,ii){
					if(dd==ddd._id){
						d.geo.push(ddd.id);
						geoBounds.lat.push(ddd.bounds[0][0]);
						geoBounds.lat.push(ddd.bounds[1][0]);
						geoBounds.lon.push(ddd.bounds[0][1]);
						geoBounds.lon.push(ddd.bounds[1][1]);
					}
				});
			});

		});

		// TEMPORARY for testing - filter data before minDate
		// data = data.filter(function(d){return (d.date) >= (minDate);});

		
		// set the data again for reset purposes
		originalData = data;

		// num contextual rows
		numContextualRows = metadata.context_array.length;

		//**************************
		// find maximum and minimum values in the data to define scales
		//**************************

		// define maximum date 
		maxDate = new Date(d3.max(data, function(d){
			return d.date;
		}));

		maxDate.setDate(maxDate.getDate() + 1);
		maxDate.setHours(0);
		maxDate.setMinutes(0);

		dateRange[1] = maxDate;
		
		// define minimum date 
		minDate = new Date(d3.min(data, function(d){
			return d.date;
		}));

		minDate.setDate(minDate.getDate());
		minDate.setHours(0);
		minDate.setMinutes(0);

		// define maximum value by date
		dataByDate = d3.nest()
		.key(function(d) { return d.date;})
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);

		maxValue = d3.max(dataByDate, function(d) {
			return d.value;
		});

		dataByMonth = d3.nest()
		.key(function(d) { return d.date.getMonth();})
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);

		// define maximum location value
		dataByLocation = d3.nest()
		.key(function(d) { return d.geo;})
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);

	    // define timechart X scale
	    dateIndex = data.map(function(d) { return d['date']; });

	    scale.timechart.x = d3.scaleTime()
	    .domain([minDate, maxDate])
	    .range([0, (width - (margin.right + margin.left)) +barWidth])
	    .rangeRound([0, (width - (margin.right + margin.left))], 0);

	    scale.trendline.x = d3.scaleTime()
	    .domain([0, dataByDate.length-1])
	    .range([0, (width - (margin.right + margin.left)) +barWidth])
	    .rangeRound([0, (width - (margin.right + margin.left))], 0);

		// override colors
		d3.select('#total_entries').style('color',colorNeutral[3]);
		d3.select('#severity_value').style('color',colorPrimary[3]);
		d3.select('#reliability_value').style('color',colorSecondary[3]);
		d3.select('#severityToggle').style('fill',colorPrimary[3]);
		d3.select('#reliabilityToggle').style('fill',colorSecondary[3]);
		d3.select('.selection').style('fill', colorNeutral[3]);
		d3.select('#dateRange').style('color', colorNeutral[4]);
		
		return callback(values);
	});

	var refreshData = function(){

		dataByDate = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.severity; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);	

		var dateByReliability = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.reliability; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);

		if(filters.time=='m'){
			dataByDate = d3.nest()
			.key(function(d) { return d.month;})
			.key(function(d) { return d.severity; })
			.rollup(function(leaves) { return leaves.length; })
			.entries(data);			

			var dateByReliability = d3.nest()
			.key(function(d) { return d.month;})
			.key(function(d) { return d.reliability; })
			.rollup(function(leaves) { return leaves.length; })
			.entries(data);
		}

		if(filters.time=='y'){
			dataByDate = d3.nest()
			.key(function(d) { return d.year;})
			.key(function(d) { return d.severity; })
			.rollup(function(leaves) { return leaves.length; })
			.entries(data);			

			var dateByReliability = d3.nest()
			.key(function(d) { return d.year;})
			.key(function(d) { return d.reliability; })
			.rollup(function(leaves) { return leaves.length; })
			.entries(data);
		}

		dataByFramework = [];
		dataByAffectedGroups = [];
		dataBySpecificNeeds = [];
		var dataByLocationArray = [];
		var dataByContextArray = [];


		data.forEach(function(d,i){

			d.sector.forEach(function(dd,ii){
				var f = dd[1];
				var s = dd[2];
				dataByFramework.push({"date": d.date, "framework": f, "sc": s, 's': d.severity, 'r': d.reliability});
			});

			d.geo.forEach(function(dd,ii){
				dataByLocationArray.push({"date": d.date, "month": d.month, "year": d.year, "geo": dd})
			});

			d.context.forEach(function(dd,ii){
				dataByContextArray.push({"date": d.date, "month": d.month, "year": d.year, "context": dd})
			});

			d.special_needs.forEach(function(dd,ii){
				dataBySpecificNeeds.push({"date": d.date, "sn": dd, 's': d.severity, 'r': d.reliability})
			});

			d.affected_groups.forEach(function(dd,ii){
				dataByAffectedGroups.push({"date": d.date, "ag": dd, 's': d.severity, 'r': d.reliability})
			});

		});
	    // dataByLocationArray = dataByLocationArray.filter(function(d){
	    // 	return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1]));
	    // });

		dataByLocation = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.geo; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(dataByLocationArray);

		dataByContext = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.context; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(dataByContextArray);

		if(filters.time=='m'){

			dataByLocation = d3.nest()
			.key(function(d) { return d.month;})
			.key(function(d) { return d.geo; })
			.rollup(function(leaves) { return leaves.length; })
			.entries(dataByLocationArray);

			dataByContext = d3.nest()
			.key(function(d) { return d.month;})
			.key(function(d) { return d.context; })
			.rollup(function(leaves) { return leaves.length; })
			.entries(dataByContextArray);
		}

		if(filters.time=='y'){

			dataByLocation = d3.nest()
			.key(function(d) { return d.year;})
			.key(function(d) { return d.geo; })
			.rollup(function(leaves) { return leaves.length; })
			.entries(dataByLocationArray);

			dataByContext = d3.nest()
			.key(function(d) { return d.year;})
			.key(function(d) { return d.context; })
			.rollup(function(leaves) { return leaves.length; })
			.entries(dataByContextArray);
		}

		maxContextValue = d3.max(dataByContext, function(d) {
			var m = d3.max(d.values, function(d) {
				return d.value;
			})
			return m;
		});

		scale.eventdrop = d3.scaleLinear()
		.range([0,12])
		.domain([0,maxContextValue]);

		trendlinePoints = [];
		tp = [];

		dataByLocation.forEach(function(d,i){
			var dt = new Date(d.key);
			dt.setHours(0,0,0,0);
			d.date = d.key;
		});

		dataByDate.forEach(function(d,i){
			var dt = new Date(d.key);
			dt.setHours(0,0,0,0);
			d.key = dt;
			d.date = d.key;

			var count = 0;

			d.severity = [0,0,0,0,0,0];

			d.values.forEach(function(dx){
				d.severity[dx.key] = dx.value;
				count += dx.value;
			});

			d.reliability = [0,0,0,0,0,0];

			dateByReliability[i].values.forEach(function(dx){
				d.reliability[dx.key] = dx.value;
			});

			// set up empty context array for data loop
			var contextArr = [];
			var numContextRows = metadata.context_array.length;

			for(b=0; b<=numContextRows-1; b++){
				contextArr[b] = 0;
			}

			d.context = contextArr;

			dataByContext[i] && dataByContext[i].values.forEach(function(dx, ii){
				var k = dx.key-1;
				contextArr[k] = dx.value
			});

			d.context = contextArr;

		    // geo array
		    var geoArr = [];

	    	dataByLocation.forEach(function(dl,ii){
	    		if(dl.key==d.key){
				    dl.values.forEach(function(dx, ii){
				    	var k = dx.key-1;
				    	geoArr[k] = dx.value;
				    });
	    		}
	    	})

		    d.geo = geoArr;

		    d.total_entries = count;

		    d.severity_avg = ( (1*d.severity[1]) + (2*d.severity[2]) + (3*d.severity[3]) + (4*d.severity[4]) + (5*d.severity[5]) ) / count;
		    d.reliability_avg = ( (1*d.reliability[1]) + (2*d.reliability[2]) + (3*d.reliability[3]) + (4*d.reliability[4]) + (5*d.reliability[5]) ) / count;

		    trendlinePoints.push({date: d.date, "severity_avg": d.severity_avg, "reliability_avg": d.reliability_avg });

		    dataByDate[i].barValues = d[filters.toggle];

		    delete d.values;
		});

		dataByDate.sort(function(x,y){
			return d3.ascending(x.date, y.date);
		})

		dataByLocation.sort(function(x,y){
			return d3.ascending(x.date, y.date);
		})

		maxValue = d3.max(dataByDate, function(d) {
			return d.total_entries;
		});

		// console.log(dataByDate);
		// console.log(dataByLocation);

		updateFramework();
		updateTotals();
		updateStackedBars('ag', dataByAffectedGroups);
		updateStackedBars('sn', dataBySpecificNeeds);
		updateStackedBars('sc', dataByFramework);
		return dataByDate;

	}

	//**************************
	// create svg function (reuseable)
	//**************************
	this.createSvg = function(options){

		// defaults
		var w = '100%',
		height = '100%',
		viewBoxWidth = options.viewBoxWidth,
		viewBoxHeight = options.viewBoxHeight,
		id = options.id,
		svgClass = options.id,
		div = options.div,
		aspectRatio = viewBoxWidth/viewBoxHeight;

		// height = $(div).width()*aspectRatio;

		var rid = 'divcontainer_'+Math.floor(Math.random()*10000);
		$(div).append('<div id="'+rid+'"></div>');

		div = '#'+rid;
		$(div).css('margin', 'auto');
		$(div).addClass('vizlibResponsiveDiv');
		$(div).attr('data-aspectRatio', aspectRatio);
		$(div).css('overflow','hidden');

		var vx = viewBoxWidth;
		var vy = vx*aspectRatio;

		// append svg to div
		this.svg = d3.select(div)
		.append('svg')
		.attr('id', id)
		.attr('class', svgClass)
		.attr('width', w)
		.attr('viewBox', "0 0 "+(viewBoxWidth)+" "+(viewBoxHeight-00))
		.attr('preserveAspectRatio', "xMinYMin slice")
		.style('-moz-user-select','none')
		.style('-khtml-user-select','none')
		.style('-webkit-user-select','none')
		.style('-ms-user-select','none')
		.style('user-select','none')
		.style('cursor','default');

		return this.svg;
	};

	//**************************
	// create map
	//**************************
	this.createMap = function(){

		// set map height
		var map = document.getElementById("map");

		map.setAttribute("style","height:"+(map.offsetWidth*mapAspectRatio)+"px");

		mapboxgl.accessToken = 'pk.eyJ1Ijoic2hpbWl6dSIsImEiOiJjam95MDBhamYxMjA1M2tyemk2aHMwenp5In0.i2kMIJulhyPLwp3jiLlpsA'

		var bounds = new mapboxgl.LngLatBounds([d3.min(geoBounds.lat),d3.min(geoBounds.lon)], [d3.max(geoBounds.lat),d3.max(geoBounds.lon)] );

	    //Setup mapbox-gl map
	    var map = new mapboxgl.Map({
	        container: 'map', // container id
	        style: 'mapbox://styles/mapbox/light-v9',
	        center: [d3.mean(geoBounds.lat), d3.mean(geoBounds.lon)],
	        zoom: 4,  
	        trackResize: true,
	        pitchWithRotate: false,
	        doubleClickZoom: false,
	        dragRotate: false
	    });

	    mapbox = map;
	    map.addControl(new mapboxgl.NavigationControl(), 'top-left');
	    map.scrollZoom.disable();
	    map.fitBounds(bounds, {
	    	padding: 20
	    });

	    var container = map.getCanvasContainer()

	    var mapsvg = d3.select(container).append("svg")
	    .attr('id','map-bubble-svg')
	    .style('position', 'absolute')
	    .style('width', '100%')
	    .style('height', '100%');

	    var transform = d3.geoTransform({point: projectPoint});
	    var path = d3.geoPath().projection(transform);

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
			.domain([0,maxMapBubbleValue]);// 

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
				p = projectPoint(metadata.geo_array[i].centroid[0], metadata.geo_array[i].centroid[1]);
				return 'translate('+p.x+','+p.y+')';
			})
			.style('opacity', 1)
			.on('mouseover', function(){
				d3.select(this).style('opacity', 0.85);
			}).on('mouseout', function(){
				d3.select(this).style('opacity', 1);
			}).on('click', function(d,i){
				var geo = metadata.geo_array[i];
				filter('geo',geo.id);
				updateSeverityReliability('map', 500);
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
			.style('fill', '#FFF')

			function update() {
				featureElement.attr('transform', function(d,i){
					p = projectPoint(metadata.geo_array[i].centroid[0], metadata.geo_array[i].centroid[1]);
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

			function projectPoint(lon, lat) {
				var point = map.project(new mapboxgl.LngLat(lon, lat));
				return point;
			}

			d3.selectAll('#geoRemoveFilter').on('click', function(){
				d3.select('#geoRemoveFilter').style('display', 'none').style('cursor', 'default');
				return filter('geo', 'clear'); 
			});
		}

	//**************************
	// create timechart
	//**************************
	this.timeChart = function(options){

		var chartdata = refreshData();

		// container g, and
		var svg = options.appendTo
		.append("svg")
		.attr('id', options.id)
		.attr('class', options.id)
		.style('opacity', options.opacity)
		.attr('x',0+options.offsetX)
		.attr('y',0+options.offsetY)
		.attr('width',width)
		.attr('height', timechartSvgHeight)
		.append('g')
		.attr("transform", "translate(0,0)");

		var width_new = width - (margin.right + margin.left);
		timechartHeight2 = timechartHeight - (margin.top + margin.bottom);

		maxValue = d3.max(dataByDate, function(d) {
			return d.total_entries;
		});

		// define maximum date 
		maxDate = new Date(d3.max(data, function(d){
			return d.date;
		}));

		maxDate.setHours(0);
		maxDate.setMinutes(0);
		
		// define minimum date 
		minDate = new Date(d3.min(data, function(d){
			return d.date;
		}));

		minDate.setHours(0);
		minDate.setMinutes(0);

		if(timechartInit==0){
			if(filters.time=='d'){
				maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth()+1, 1);
				minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
				dateRange[0] = new Date(maxDate.getFullYear(), maxDate.getMonth()-1, 1);
				dateRange[1] = maxDate;
			}	
			timechartInit=1;
		} else {
			if(filters.time=='d'){
				minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
				maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth()+1, 1);
				if(dateRange[1]>maxDate)dateRange[1]=maxDate;
				if(dateRange[0]<minDate)dateRange[0]=minDate;
			}				
		}

		if($('#dateRange').data('daterangepicker'))$('#dateRange').data('daterangepicker').remove();
		d3.select('#dateRange').style('cursor', 'default');	

		if(filters.time=='d'){

			var today = new Date();
			var thisYear = today.getFullYear();

			$('#dateRange').daterangepicker({
				"locale": {
					"format": "DD MMM YYYY",
				},
				showDropdowns: true,
				showCustomRangeLabel: false,
				alwaysShowCalendars: true,
				ranges: {
					'Today': [moment(), moment()],
					'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
					'This Year': [new Date(today.getFullYear(), 0, 1), moment(maxDate).subtract(1,'days')],
					'Last Year': [new Date(dateRange[0].getFullYear()-1, 0, 1), new Date(dateRange[0].getFullYear()-1, 12, 0)],
					'Last 30 Days': [moment(new Date()).subtract(29, 'days'), moment()],
					'This Month': [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth()+1, 0)],
					'Last Month': [new Date(today.getFullYear(), today.getMonth()-1, 0), new Date(today.getFullYear(), today.getMonth(), 0)]
				},
				maxYear: maxDate.getFullYear(),
				minYear: minDate.getFullYear(),
				minDate: minDate,
				maxDate: maxDate
			});		

			d3.select('#dateRange').style('cursor', 'pointer');

			d3.select('#timeChart').on('click', function(){
				// $('#dateRange').trigger('cancel.daterangepicker');
				$('#dateRange').data('daterangepicker').hide();
			})	
		} 

		if(filters.time=='m'){
			maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth()+1, 1);
			minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
			
			var d1 = dateRange.map(d3.timeDay.round);
			d1[0] = d3.timeMonth.floor(d1[0]);
			d1[1] = d3.timeMonth.ceil(d1[1]);

			dateRange[0] = d1[0];
			dateRange[1] = d1[1];

			if(dateRange[0]<minDate)dateRange[0]=minDate;
			if(dateRange[1]>maxDate)dateRange[1]=maxDate;

			if (dateRange[1] <= dateRange[0]) {
				dateRange[1] = new Date(dateRange[1].getFullYear(), dateRange[1].getMonth() +1, 1);
			} 
		}

		if(filters.time=='y'){
			maxDate = new Date(maxDate.getFullYear(),12, -1);
			minDate = new Date(minDate.getFullYear(), 0, 1);
			var d1 = dateRange.map(d3.timeDay.round);
			// dateRange[0] = d1[0];
			// dateRange[1] = d1[1];
			var d2 = new Date(dateRange[1]);
			d2.setDate(d2.getDate()-1);
			dateRange[0] = new Date(d1[0].getFullYear(), 0, 1);;
			dateRange[1] = new Date(d2.getFullYear()+1, 0, -1);
		}

		scale.timechart.x.domain([minDate, maxDate]);

		barWidth = (width_new/1)*.9;

		var svgBg = svg.append('g');

		svgBg.append('rect')
		.attr('x',margin.left)
		.attr('y',margin.top)
		.attr('width',width_new)
		.attr('height',timechartHeight2)
		.attr('opacity',0);

		var gridlines = svg.append('g').attr('id', 'gridlines').attr('class', 'gridlines').attr('transform', 'translate('+(margin.left+0)+','+margin.top+')');
		var svgChartBg = svg.append('g').attr('id', 'svgchartbg').attr('class', 'chartarea').attr('transform', 'translate('+(margin.left+0)+','+margin.top+')');
		var svgChart = svg.append('g')
		.attr('id', 'chartarea')
		.attr('transform', 'translate('+(margin.left+0)+','+margin.top+')')
		.style('opacity', 0);

		var svgAxisBtns = svg.append('g').attr('id', 'svgAxisBtns').attr('transform', 'translate('+(margin.left+0)+','+(timechartHeight2+margin.top+5)+')');

		// create average svg
		var timechartLegend = this.createSvg({
			id: 'timechart_legend',
			viewBoxWidth: 235,
			viewBoxHeight: 20,
			div: '#timechart-legend',
			width: '100%'
		}).append('g');

		timechartLegend
		.append("text")
		.attr('class','axisLabel')
		.attr('id', 'rightAxisLabel')
		.attr("y", 16)
		.attr("x", 135)
		.style('font-weight','lighter')
		.style('font-size', '15px')
		.text('Avg. Severity')

		timechartLegend
		.append("line")
		.attr('id', 'rightAxisLabelLine')
		.attr("y1", 12)
		.attr("y2", 12)
		.attr("x1", 128)
		.attr("x2", 112)
		.style('stroke', colorPrimary[3])
		.style('stroke-width',3)
		.style('stroke-opacity',1)
		.style('stroke-dasharray', '2 2');

		timechartLegend
		.append("text")
		.attr('class','axisLabel')
		.attr("y", 16)
		.attr("x", 22)
		.style('font-weight','lighter')
		.style('font-size', '15px')
		.text('Total Entries')

		timechartLegend
		.append("rect")
		.attr('id', 'leftAxisBox')
		.attr("y", 6)
		.attr("x", 5)
		.attr('width', 10)
		.attr('height', 10)
		.style('fill', colorNeutral[3]);

		var xAxis = d3.axisBottom()
		.scale(scale.timechart.x)
		.tickSize(0)
		.tickPadding(10)
		.ticks(d3.timeMonth.every(1))

		if(filters.time=='y'){
			xAxis.ticks(d3.timeYear.every(1))
			.tickFormat(d3.timeFormat("%Y"));

		} else {
			xAxis.ticks(d3.timeMonth.every(1))
			.tickFormat(d3.timeFormat("%b %Y"));
		}

	    //**************************
	    // Y AXIS left
	    //**************************
	    scale.timechart.y1 = d3.scaleLinear()
	    .range([timechartHeight2, 0])
	    .domain([0, rounder(maxValue)]);

	    timechartyAxis = d3.axisLeft()
	    .scale(scale.timechart.y1)
	    .ticks(4)
	    .tickSize(0)
	    .tickPadding(8);

		// y-axis
		var yAxisText = svgBg.append("g")
		.attr("class", "yAxis axis")
		.attr("id", "timechartyAxis")
		.attr('transform', 'translate('+(margin.left-1)+','+margin.top+')')
		.call(timechartyAxis)
		.style('font-size', options.yAxis.font.values.size);

		//**************************
		// Y AXIS right
		//**************************

		// define y-axis secondary
		scale.trendline.y = d3.scaleLinear()
		.range([(timechartHeight2), 0])
		.domain([0, 5]);

		var yAxis2 = d3.axisRight()
		.scale(scale.trendline.y)
		.ticks(1)
		.tickSize(5)
		.tickPadding(4);

		var yAxisText2 = svgBg.append("g")
		.attr("class", "yAxis axis")
		.attr('transform', 'translate('+(width_new + margin.left-1)+','+margin.top+')')
		.call(yAxis2)
		.style('font-size', options.yAxis.font.values.size);

		yAxisText2
		.append("text")
		.attr('class','axisLabel0')
		.attr("y", timechartHeight2+4)
		.attr("x", 8)
		.style('font-weight','normal')
		.style('font-size', '15px')
		.style('fill', '#000')
		.text('1')

		// add the Y gridline
		timechartyGrid = d3.axisLeft(scale.timechart.y1)
		.ticks(4)
		.tickSize(-width)
		.tickFormat("")

		gridlines.append("g")			
		.attr("class", "grid")
		.attr('id', 'timechartyGrid')
		.call(timechartyGrid);

		d3.select('#timechartyGrid')
		.transition()
		.call(timechartyGrid);

		// x-axis 
		var xAxisObj = svgBg.append("g")
		.attr("class", "xAxis axis")
		.attr("transform", "translate(" + margin.left + "," + (timechartHeight2 + margin.top +0) + ")")
		.call(xAxis)
		.style('font-size', '16px')
		.style('font-weight', options.xAxis.font.values.weight)

		xAxisObj
		.selectAll('path, line')
		.style('opacity', 1 )
		.style('stroke', '#535353' )
		.style('stroke-width', 1);

		xAxisObj.selectAll(".tick line, text")
		.attr("transform", "translate(" + 40 + ", 3)")
		.append('line')
		.attr('class', 'xAxisHorizontalLine')
		.attr('x1', 0)
		.attr('x2', 0)
		.attr('y1', 0)
		.attr('y2', timechartHeight2+margin.top+1)

		xAxisObj.selectAll(".tick")
		.append('line')
		.attr('class', 'xAxisHorizontalLine')
		.attr('x1', 0)
		.attr('x2', 0)
		.attr('y1', -timechartHeight2)
		.attr('y2', timechartSvgHeight-timechartHeight2-35)

		// add the axis buttons
		xAxisObj.selectAll(".tick").each(function(d,i){
			var tick = d3.select(this);
			svgAxisBtns.append('rect')
			.attr('width', 80)
			.attr('height',20)
			.attr('x', 5)
			.attr('y', 0)
			.attr('transform', tick.attr('transform'))
			.style('cursor', 'pointer')
			.style('opacity', 0)
			.on('mouseover', function(){
				if(filters.toggle == 'severity'){
					return tick.style('color', colorNeutral[4]);
				} else { 
					return tick.style('color', colorNeutral[4]);
				}
			})
			.on('mouseout', function(){
				return tick.style('color', '#000')
			})
			.on('click', function(){
				if((filters.time == 'm')||(filters.time =='d')){
					dateRange[0] = d;
					dateRange[1] = new Date(d.getFullYear(), d.getMonth()+1, 1);					
				} else {
					dateRange[0] = d;
					dateRange[1] = new Date(d.getFullYear()+1, 0, 1);	
				}
			    // programattically set date range
			    gBrush.call(brush.move, dateRange.map(scale.timechart.x));
			});

		});

		//**************************
		// Bar/event drop groups (by date)
		//**************************
		// bar groups
		var barGroup = svgChart.append('g').attr('id', 'chart-bar-group');

		var bars = barGroup.selectAll(".barGroup")
		.data(chartdata)
		.enter()
		.append('g')
		.attr('id', function(d,i){
			var dt = new Date(d.date);
			dt.setHours(0,0,0,0);
			return 'date'+dt.getTime();
		})
		.attr("class", "barGroup")
		.attr('data-width', function(d,i) { 
			if(filters.time=='y'){
				var date = new Date(d[options.dataKey]);
				var endYear = new Date(date.getFullYear(), 11, 31);
				return scale.timechart.x(endYear) - scale.timechart.x(d.key);   		
			}

			if(filters.time=='m'){
				var date = new Date(d[options.dataKey]);
				var endMonth = new Date(date.getFullYear(), date.getMonth()+1, 1);
				return scale.timechart.x(endMonth) - scale.timechart.x(d.key);   		
			}

			if(filters.time=='d'){
				var date = new Date(d[options.dataKey]);
				var endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()+1);
				return scale.timechart.x(endDate) - scale.timechart.x(d.key);   		
			}	

		})
		.attr("transform", function(d,i) { if(i==1){barWidth+=scale.timechart.x(d.key);} return "translate(" + scale.timechart.x(d.key) + ",0)"; });
		
		var yArray = [];

		// individual bars
		var individualBars = bars.selectAll('.bar')
		.data(function(d,i){ return d.barValues;})
		.enter()
		.append("rect")
		.attr('class', function(d,i){
			return 'bar severity'+(i+1);
		})
		.style('stroke', '#fff')
		.style('stroke-opacity',0)
		.attr('fill', function(d,i){
			return colorPrimary[i];
		})
		.attr("x", function(d,i) { 
			var w = d3.select(this.parentNode).attr('data-width');
			barWidth = w;
			if(filters.time=='m'){
				return w*0.2
			}
			if(filters.time=='y'){
				return w*0.3
			}
		})
		.attr("width", function(d,i) { 
			var w = d3.select(this.parentNode).attr('data-width');
			if(filters.time=='m'){
				w=w*0.6;
			}
			if(filters.time=='y'){
				w=w*0.4
			}
			return w-1;
		})
		.attr("y", function(d,i) { 
			if(i>0){
				yArray[i] = yArray[i-1] + d;
			} else {
				yArray[i] = d;
			}
			return scale.timechart.y1(yArray[i]); 
		})
		.attr("height", function(d,i) { 
			return timechartHeight2-scale.timechart.y1(d); 
		})
		.on('mouseover', function(){
			d3.select(this).style('fill-opacity', options.fillOpacity - 0.05)
		})
		.on('mouseout', function(){
			d3.select(this).style('fill-opacity', options.fillOpacity)
		});

		//**************************
		// draw trendline
		//**************************
		var trendline = d3.select('#svgchartbg')
		.append('g')
		.attr('class', 'trendline')
		.attr('transform', 'translate('+(barWidth/2) + ', 0)' )
		.append('path')
		.attr('id', 'avg-line')
		.style('opacity', 0)
		.style('stroke', function(){
			if(filters.toggle=='severity'){
				d3.select('#rightAxisLabel').text('Avg. Severity');
				d3.select('#rightAxisLabelLine').style('stroke', colorPrimary[3]);
				return colorPrimary[3];
			} else {
				d3.select('#rightAxisLabelLine').style('stroke', colorSecondary[3]);
				d3.select('#rightAxisLabel').text('Avg. Reliability');
				return colorSecondary[3];
			}
		});

		// *************************
		// draw contextual rows
		//**************************

		var timechart = d3.select('#timeChart');
		var yPadding = 20;

		var contextualRows = svgChartBg.append('g')
		.attr('id', 'contextualRows')
		.attr('transform', 'translate(0,'+ (timechartHeightOriginal + yPadding ) + ')');

		var contextualRowsHeight = timechartSvgHeight - timechartHeightOriginal - yPadding - 36;

		contextualRows.append('rect')
		.attr('height', contextualRowsHeight)
		.attr('width', 1240)
		.attr('x', 0)
		.attr('y',0)
		.style('fill', '#FFF')
		.style('fill-opacity',0);

		contextualRows.append('rect')
		.attr('height', contextualRowsHeight+45)
		.attr('width', 10)
		.attr('x', -5)
		.attr('y',-30)
		.style('fill', '#FFF')
		.style('fill-opacity',1);

		svg.append('rect')
		.attr('height', contextualRowsHeight+38)
		.attr('width', 35)
		.attr('x', 1287)
		.attr('y',timechartHeightOriginal+2)
		.style('fill', '#FFF')
		.style('fill-opacity',1);

		var contextualRowHeight = contextualRowsHeight/numContextualRows;

		var rows = contextualRows.selectAll('.contextualRow')
		.data(metadata.context_array)
		.enter()
		.append('g')
		.attr('class', 'contextualRow')
		.attr('transform', function(d,i){
			return 'translate(0,'+(i*(contextualRowHeight)) + ' )' ;
		});

		rows
		.append('line')
		.attr('class', 'contextualRowLine')
		.attr('x1',0)
		.attr('x2',1250)
		.attr('y1', 0)
		.attr('y2', 0);

		contextualRows
		.append('line')
		.attr('class', 'contextualRowLine')
		.attr('x1',0)
		.attr('x2',1250)
		.attr('y1', contextualRowsHeight)
		.attr('y2', contextualRowsHeight);

		// row title
		rows.append('text').text(function(d,i){
			return d.name.toUpperCase();
		})
		.attr('class', 'label')
		.attr('y',21)
		.attr('x',4)
		// .style('font-weight', 'bold')
		.style('font-size', '16px');

		// row total value
		rows.append('text')
		.text('0')
		.attr('class', 'total-label')
		.attr('id', function(d,i){
			return 'total-label'+i;
		})
		.attr('x', function(d,i){
			var xoffset = d3.select(this.parentNode).selectAll('.label').node().getBBox().width;
			return xoffset + 10;
		})
		.attr('y',21)
		.style('font-size', '16px')
		.style('font-weight', 'bold')
		.style('fill', colorNeutral[4]);

		//**************************
		// date buttons Y M D
		//**************************
		var dateButtons = d3.selectAll('.time-select')
		.on('mouseover', function(d,i){
			var id = d3.select(this).attr('id');
			var v = id.substr(-1);
			if(filters.time!=v)
				d3.select(this).select('rect').style('fill', colorGrey[3]);
		})
		.on('mouseout', function(d,i){
			d3.selectAll('.time-select rect').style('fill', colorGrey[2]);
			d3.select('#time-select-'+filters.time+ ' rect').style('fill', colorNeutral[4]);
		}).on('click', function(d,i){
			var id = d3.select(this).attr('id');
			var v = id.substr(-1);
			if(v!=filters.time){
				redrawTimeline();
			}
			filters.time = v;
			d3.selectAll('.time-select rect').style('fill', colorGrey[2]);
			d3.select('#time-select-'+filters.time+ ' rect').style('fill', colorNeutral[4]);
		})

		d3.select('#time-select-'+filters.time+ ' rect').style('fill', colorNeutral[4]);

		//**************************
		// event drops
		//**************************

		maxContextValue = d3.max(dataByContext, function(d) {
			var m = d3.max(d.values, function(d) {
				return d.value;
			})
			return m;
		});

		scale.eventdrop = d3.scaleLinear()
		.range([0,12])
			.domain([0,maxContextValue]);// 

		// event mask groups (to be used for event drop grey brush mask)
		var eventDropGroup = bars.append('g')
		.attr("class", "eventDropGroup");

		var eventDrops = eventDropGroup.selectAll('.eventDrop')
		.data(function(d,i){ return d.context;})
		.enter()
		.append('circle')
		.attr('class', 'eventDrop')
		.attr('r', function(d){
			return scale.eventdrop(d);
		})
		.attr('cx', function(d,i){
				// return barWidth/2;
				var w = d3.select(this.parentNode.parentNode).attr('data-width');
				return (w/2);
			})
		.attr('cy', function(d,i){
			return timechartHeight2 + (contextualRowHeight*(i+1))+16;
		})
		.style('fill', colorNeutral[3]);

		//**************************
		// date slider brushes
		//**************************
	    // initialise the brush
	    brush = d3.brushX()
	    .extent([[0, -margin.top], [width_new, timechartSvgHeight-(margin.top+margin.bottom)]])
	    .on("brush", dragging)
	    .on("start", dragged);

	    // add the selectors
	    gBrush = svgChart.append("g")
	    .attr('id', 'gBrush')
	    .attr("class", "brush")
	    .attr('transform', 'translate('+(2)+',0)')
	    .call(brush);

		d3.selectAll('.handle rect').attr('fill-opacity', '1').style('visibility', 'visible').attr('width', 2).attr('fill', '#000').style('stroke-opacity', 0);

	    // add the triangle handles (top)
	    var handleTop = gBrush.selectAll(".handle--custom-top")
	    .data([{type: "w"}, {type: "e"}])
	    .enter().append("g")
	    .attr('class', 'handleG')

	    handleTop.append('path')
	    .attr("class", "handle--custom-top")
	    .attr("stroke", "#000")
	    .attr('stroke-width', 3)
	    .attr('fill', '#000')
	    .attr("cursor", "ew-resize")
	    .attr("d", 'M -9,0 -1,11 8,0 z');

	    handleTop.append('rect')
	    .attr('x',-5)
	    .attr('width', 10)
	    .attr('height', timechartSvgHeight)
	    .attr('y', 0)
    	.style('cursor', 'ew-resize');

	    // add the triangle handles (bottom)
	    var handleBottom = gBrush.selectAll(".handle--custom-bottom")
	    .data([{type: "w"}, {type: "e"}])
	    .enter().append('g').attr('class', 'handleG').append("path")
	    .attr("class", "handle--custom-bottom")
	    .attr("stroke", "#000")
	    .attr('stroke-width', 3)
	    .attr('fill', '#000')
	    .attr("cursor", "ew-resize")
	    .attr("d", 'M -9,0 -1,-11 8,0 z');

	    handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", -" + margin.top + ")"; });
	    handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", " + (timechartSvgHeight - margin.top) + ")"; });

	    // handle mouseovers
	    d3.selectAll('.handleG')
	    .on('mouseover', function(){
	    	d3.selectAll('.handle--custom-top, .handle--custom-bottom').style('fill', 'silver');
	    })
	    .on('mouseout', function(){
	    	d3.selectAll('.handle--custom-top, .handle--custom-bottom').style('fill', '#000');
	    })

	    $('#dateRange').on('apply.daterangepicker', function(ev, picker) {
	    	dateRange[0] = new Date(picker.startDate._d);
	    	dateRange[0].setHours(0,0,0,0);

	    	dateRange[1] = new Date(picker.endDate._d);
	    	dateRange[1].setHours(0,0,0,0);
	    	dateRange[1] = moment(dateRange[1].setDate(dateRange[1].getDate())).add(1, 'day');
	    	gBrush.call(brush.move, dateRange.map(scale.timechart.x));

	    	colorBars();
	    	updateDate();
	    	updateSeverityReliability('brush', 500);
	    	updateBubbles();
	    	updateFramework();
	    	updateStackedBars('ag', dataByAffectedGroups);
	    	updateStackedBars('sn', dataBySpecificNeeds);
	    	updateStackedBars('sc', dataByFramework);

	    	handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", -"+ margin.top +")"; });
	    	handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", " + (timechartSvgHeight - margin.top) + ")"; });

	    	updateTotals();
	    });

	    // programattically set date range
	    gBrush.call(brush.move, dateRange.map(scale.timechart.x));

	    // function to handle the changes during slider dragging
	    function dragging() {

	    	if($('#dateRange').data('daterangepicker'))
	    		$('#dateRange').data('daterangepicker').hide();
	    	// if not right event then break out of function
	    	if(!d3.event.sourceEvent) return;
	    	if(d3.event.sourceEvent.type === "start") return;
	    	if(d3.event.sourceEvent.type === "click") return;
	    	if(d3.event.sourceEvent.type === "brush") return;

	    	var d0 = d3.event.selection.map(scale.timechart.x.invert);

			if(filters.time=='d'){
				var d1 = d0.map(d3.timeDay.round);
				if (d1[0] >= d1[1]) {
					d1[0] = d3.timeDay.floor(d0[0]);
					d1[1] = d3.timeDay.ceil(d0[0]);
				} 
				if (d1[0] >= d1[1]) {
					d1[0] = d3.timeDay.floor(d0[0]);
					d1[1] = d3.timeDay.offset(d1[0]);
				}
			}
			if(filters.time=='m'){
				var d1 = d0.map(d3.timeDay.round);
				d1[0] = d3.timeMonth.floor(d1[0]);
				d1[1] = d3.timeMonth.ceil(d1[1]);
				if (d1[0] >= d1[1]) {
					d1[0] = d3.timeMonth.floor(d0[0]);
					d1[1] = d3.timeMonth.offset(d1[0]);
				} 
			}
			if(filters.time=='y'){
				var d1 = d0.map(d3.timeYear.round);
				d1[0] = d3.timeYear.floor(d0[0]);
				d1[1] = d3.timeYear.ceil(d0[1]);
				if (d1[0] >= d1[1]) {
					d1[0] = d3.timeYear(d0[0]);
					d1[1] = d3.timeYear.ceil(d0[0]);
				} 
			}

			dateRange = d1;

			colorBars();
			updateDate();
			updateSeverityReliability('brush');
			updateBubbles();
			updateFramework();
			updateStackedBars('ag', dataByAffectedGroups);
			updateStackedBars('sn', dataBySpecificNeeds);
			updateStackedBars('sc', dataByFramework);

			d3.select(this).call(d3.event.target.move, dateRange.map(scale.timechart.x));
			handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", -"+ margin.top +")"; });
			handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", " + (timechartSvgHeight - margin.top) + ")"; });

			updateTotals();
		}

		function dragged() {

			if(!d3.event.sourceEvent) return;
			if(d3.event.sourceEvent.type === "brush") return;

			var d0 = d3.event.selection.map(scale.timechart.x.invert);
			if(filters.time=='d'){
				var d1 = d0.map(d3.timeDay.round);
			}
			if(filters.time=='m'){
				var d1 = d0.map(d3.timeMonth.round);
				if (d1[0] >= d1[1]) {
					d1[0] = d3.timeMonth(d0[0]);
					d1[1] = d3.timeMonth.ceil(d0[0]);
				} 

				if (d1[0] >= d1[1]) {
					d1[0] = d3.timeDay.floor(d0[0]);
					d1[1] = d3.timeDay.offset(d1[0]);
				}
			}
			if(filters.time=='y'){
				var d1 = d0.map(d3.timeYear.round);
				if (d1[0] >= d1[1]) {
					d1[0] = d3.timeYear.floor(d0[0]);
					d1[1] = d3.timeYear.offset(d1[0]);
				}
			}
			// If empty when rounded, use floor instead.
			if (d1[0] >= d1[1]) {
				d1[0] = d3.timeDay.floor(d0[0]);
				d1[1] = d3.timeDay.offset(d1[0]);
			}

			dateRange = d1;

			colorBars();
			updateDate();
			updateSeverityReliability('brush',500);
			updateBubbles();
			updateFramework();
			updateStackedBars('ag', dataByAffectedGroups);
			updateStackedBars('sn', dataBySpecificNeeds);
			updateStackedBars('sc', dataByFramework);

			d3.select(this).call(d3.event.target.move, dateRange.map(scale.timechart.x));
			handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", -"+ margin.top +")"; });
			handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", " + (timechartSvgHeight - margin.top) + ")"; });

			updateTotals();
		}

		d3.select('#chartarea').transition().duration(1000).style('opacity', 1);
		d3.select('#avg-line').transition().duration(500).style('opacity', 1);

		colorBars();
		updateDate();
		updateTrendline();
		updateSeverityReliability('init', 500);
		updateBubbles();
		updateFramework();
		updateTotals();
		updateStackedBars('ag', dataByAffectedGroups);
		updateStackedBars('sn', dataBySpecificNeeds);
		updateStackedBars('sc', dataByFramework);
		return bars;
	}


	//**************************
	// framework chart
	//**************************	
	this.createFrameworkChart = function(options){

		var frameworkRowHeight = 28;
		var frameworkHeight = metadata.framework_groups_array.length * frameworkRowHeight;

		var numFrameworkRows = metadata.framework_groups_array.length;
		var frameworkMargins = {top: 20, left: 0, right: 0, bottom: 2};

		if(metadata.sector_array.length>10){
			var leftSpacing = 460; 
		} else {
			var leftSpacing = 575; 
		}

		var leftColWidth = 220;
		
		var frameworkWidth = 1600;
		var colWidth = (frameworkWidth-leftSpacing)/metadata.sector_array.length;
		var rowHeight = (frameworkHeight - (frameworkMargins.top + frameworkMargins.bottom))/numFrameworkRows;

		// create framework svg
		var frameworkSvg = this.createSvg({
			id: 'framework-svg',
			viewBoxWidth: frameworkWidth,
			viewBoxHeight: frameworkHeight+5,
			div: '#framework-chart',
			width: '100%'
		});

		var layer1 = frameworkSvg.append('g').attr('id', 'framework-layer1')
		var layer2 = frameworkSvg.append('g').attr('id', 'framework-layer2');
		var layer3 = frameworkSvg.append('g').attr('id', 'framework-layer3')

		// title
		var title = frameworkSvg.append('g')
		.attr('transform', 'translate(0,-2)');

		title
		.append('text')
		.attr('x', 0)
		.attr('y', 20)
		.style('font-weight', 'bold')
		.text('SECTORAL FRAMEWORK');

		// add filter icon
		title.append('image')
		.attr('id', 'frameworkRemoveFilter')
		.attr('class', 'removeFilterBtn')
		.attr('xlink:href', 'images/filter.png')
		.attr('title', 'Reset filter')
		.attr('y', 5)
		.attr('x', title.node().getBBox().width +5 )
		.attr('height', '17px')
		.attr('width', '17px');

		// add toggle switch
		var toggleswitch = title.append('g')
		.attr('id', 'framework-toggle-switch')
		.attr('transform', 'translate(237,1)')

		toggleswitch = toggleswitch.append('g').attr('transform', 'scale(0.52)');

		toggleswitch.append('path').attr('d','M164.383333,2.03489404 L164.383333,2 L192.616667,2 L192.616667,2.03489404 C193.041489,2.01173252 193.469368,2 193.9,2 C206.657778,2 217,12.2974508 217,25 C217,37.7025492 206.657778,48 193.9,48 C193.469368,48 193.041489,47.9882675 192.616667,47.965106 L192.616667,48 L164.383333,48 L164.383333,47.965106 C163.958511,47.9882675 163.530632,48 163.1,48 C150.342222,48 140,37.7025492 140,25 C140,12.2974508 150.342222,2 163.1,2 C163.530632,2 163.958511,2.01173252 164.383333,2.03489404 Z')
		.style('fill', '#FFF')
		.style('stroke', '777777')
		.style('stroke-width', '2px');

		toggleswitch.append('circle')
		.attr('id', 'framework-toggle')
		.attr('cx', 164)
		.attr('cy', 25)
		.attr('r', 20)
		.style('fill', colorNeutral[3]);

		toggleswitch.append('text')
		.attr('x', 12)
		.attr('y', 32)
		// .style('font-size', '24px')
		.text('# of entries');

		toggleswitch.append('text')
		.attr('x', 230)
		.attr('y', 32)
		.attr('id', 'framework-toggle-text')
		// .style('font-size', '24px')
		.text('median severity');

		var columnHeadersBg = frameworkSvg.append('g')
		.attr('id', 'col-header')
		.selectAll('.frameworkColHeader')
		.data(metadata.sector_array)
		.enter()
		.append('g')
		.attr('id', function(d,i){ return 'col-header-'+ d.id })
		.attr('transform', function(d,i){
			return 'translate('+ ((colWidth)*i+leftSpacing) + ',17)';
		})

		var columnHeaders = columnHeadersBg
		.append('g')
		.attr('class', function(d,i){
			return 'frameworkColHeader frameworkColHeader'+i
		});

		columnHeadersBg
		.append('rect')
		.attr('class', 'col-header-bg-selected')
		.attr('id', function(d,i){ return 'col-header-bg-'+ d.id })
		.attr('x', 0)
		.attr('y', -16)
		.attr('width', colWidth)
		.attr('height', 24)
		.style('opacity', 0)
		.style('fill', 'grey')
		.style('stroke', 'transparent');

		columnHeadersBg
		.append('rect')
		.attr('class', 'col-header-bg')
		.attr('x', 0)
		.attr('y', -16)
		.attr('width', colWidth)
		.attr('height', 24)
		.style('opacity', 0)
		.style('stroke', '#FFF')
		.style('cursor', 'pointer')
		.style('fill', '#000')
		.attr('data-sector-id', function(d,i){
			return d.id;
		});

		columnHeaders
		.append('text')
		.attr('class', 'col-header-text')
		.text(function(d,i){
			return d.name;
		})
		.attr('id', function(d,i){ return 'framework-col-'+i; })
		.attr('x', 21)
		.attr('y', 1)
		// .style('font-size', '13px')
		// .attr('x', (colWidth/2)+10)
		// .style('text-anchor', 'middle');

		columnHeaders
		.append('image')
		.attr('class', function(d,i){
			return 'sector-icon sector-icon-'+d.id;
		})
		.attr('xlink:href', function(d,i){return 'images/sector-icons/'+(i+1)+'.svg'; })
		.attr('height', 14)
		.attr('width', 14)
		.attr('y', -11)
		.attr('x', 2);

		columnHeaders
		.attr('transform', function(d,i){
			var t = d3.select(this).node().getBBox();
			var tx = this.parentNode.getBBox();
			return 'translate('+((colWidth - t.width)/2 - 3)+',0)';
		});

		columnHeadersBg.on('mouseover', function(d,i){
			d3.select(this).select('.col-header-bg').style('opacity', 0.05);
		}).on('mouseout', function(d,i){
			d3.select(this).select('.col-header-bg').style('opacity', 0);
		}).on('click', function(d,i){
			// toggle 
			filter('sector',i+1);
		});

		d3.select('#frameworkRemoveFilter').on('click', function(d,i){
			filter('sector', 'clearFramework');
			d3.selectAll('.col-header-bg-selected').style('opacity', 0);	
			d3.selectAll('.col-header-text').style('opacity', 1);	
			d3.select('#frameworkRemoveFilter').style('display', 'none').style('cursor', 'default');
			d3.select('#scRemoveFilter').style('display', 'none').style('cursor', 'default');
			d3.selectAll('.sector-icon').style('opacity', 0.3);
		});

		d3.select('#scRemoveFilter').on('click', function(d,i){
			filter('sector', 'clear');
			d3.selectAll('.col-header-bg-selected').style('opacity', 0);	
			d3.selectAll('.col-header-text').style('opacity', 1);	
			d3.select('#frameworkRemoveFilter').style('display', 'none').style('cursor', 'default');
			d3.select('#scRemoveFilter').style('display', 'none').style('cursor', 'default');
			d3.selectAll('.sector-icon').style('opacity', 0.3);
		});

		// rows
		var rows = layer1.selectAll('.frameworkRow')
		.data(metadata.framework_groups_array)
		.enter()
		.append('g')
		.attr('class', function(d,i){
			return 'frameworkRow f'+i
		})
		.attr('transform', function(d,i){
			return 'translate(0,'+ (frameworkMargins.top + (i+1) * rowHeight)+')';
		});

		var rows2 = layer2.selectAll('.frameworkRow')
		.data(metadata.framework_groups_array)
		.enter()
		.append('g')
		.attr('class', function(d,i){
			return 'frameworkRow f'+i
		})
		.attr('transform', function(d,i){
			return 'translate(0,'+ (frameworkMargins.top + (i+1)* rowHeight )+')';
		});

		rows.append('rect')
		.attr('x', 0)
		.attr('y', -20)
		.attr('width', leftColWidth)
		.attr('height', frameworkRowHeight)
		.style('fill', '#FAFAFA');

		// left headers

		// context name vars (e.g. scope and scale)
		var cat = '';
		var cat0 = 0,
		cat1 = 0;

		var leftColArray = [];
		rows.append('text')
		.text(function(d,i){
			var cat_name = metadata.context_array[d.context_id-1].name;
			if(cat!=cat_name){
				cat = cat_name;
				cat1++;
				return cat_name;
			}
			cat = cat_name;
			cat1++;
		})
		.attr('x',7)
		.attr('class', function(d,i){
			return 'context-name'
		})
		.style('font-weight', 'bold');

		// second left headers

		var secondCol = rows.append('g');

		var labels = secondCol.append('text')
		.attr('class','frameworkCol2')
		.text(function(d,i){
			return d.name;
		})
		.attr('y', -2)
		.style('text-anchor', 'end');

		labels
		.attr('x', function(d,i){
			var bbox = d3.select(this).node().getBBox();
			return leftSpacing-32;
		})

		var dataLabels = secondCol.append('text')
		.text('00')
		.style('font-weight','bold')
		.style('fill', colorPrimary[4])
		.style('font-size', '13px')
		.attr('id',function(d,i){
			return 'f'+d.id+'-val';
		})
		.attr('class', 'f-val')
		.style('text-anchor', 'middle')
		.attr('x', function(d,i){
			return leftSpacing-19;
		})
		.attr('y', -2);

		// row filters

		var categories = d3.nest()
		.key(function(d) { return d.context_id;})
		.rollup(function(leaves) { return leaves.length; })
		.entries(metadata.framework_groups_array);

		numCategories = categories.length;

		var rollingH = 0;
		var contextFilters = layer3.selectAll('.catFilter')
		.data(categories)
		.enter()
		.append('rect')
		.attr('x',0)
		.attr('width', leftColWidth)
		.attr('class', 'context-filter')
		.attr('id', function(d,i){ return 'context-filter'+d.key })
		.attr('height', function(d,i){
			return d.value * rowHeight;
		})
		.attr('y', function(d,i){
			if(i==0){
				rollingH += rowHeight;
				return rowHeight;
			} else { 
				rollingH += (categories[i-1].value) * rowHeight;
				return rollingH;
			}
		})
		.style('cursor', function(d,i){

		})
		.style('fill', colorLightgrey[3])
		.style('cursor', 'pointer')
		.style('opacity', 0)
		.on('mouseover', function(d,i){
			if(filters['context'].includes(parseInt(d.key))){
				// return d3.select(this).style('fill', '#FFF').style('opacity',0.5);
			} else {
				if(filters['context'].length>0){
					return d3.select(this).style('fill', '#FFF').style('opacity', 0.1);	
				} else {
					return d3.select(this).style('fill', colorGrey[2]).style('opacity', 0.05);	
				}
			}
		})
		.on('mouseout', function(d,i){
			if(!filters['context'].includes(parseInt(d.key))){
				if(filters['context'].length>0){
					return d3.select(this).style('fill', '#FFF').style('opacity', 0.6);	
				} else {

					return d3.select(this).style('opacity', 0);
				}
			} else {
				// selected state
				return d3.select(this).style('opacity', 0.1);

			}
		})
		.on('click', function(d,i){
			filter('context', parseInt(d.key));
		});

		// grid
		var cells = rows.selectAll('.frameworkCol')
		.data(metadata.sector_array)
		.enter()
		.append('g')
		.attr('class', function(d,i){
			return 'frameworkCol ' + d3.select(this.parentNode).attr('class').split(' ')[1];
		})
		.attr('transform', function(d,i){
			return 'translate('+ ((colWidth)*i+leftSpacing) + ','+ - frameworkMargins.top + ')';
		})
		.attr('id', function(d,i){
			var c = d3.select(this.parentNode).attr('class').split(' ')[1];
			return c+'s'+i;
		});

		cells
		.append('rect')
		.attr('class', 'cell')
		.attr('width', colWidth)
		.attr('height', rowHeight)
		.attr('id', function(d,i){
			return d3.select(this.parentNode).attr('id') + 'rect';
		});

		cells
		.append('rect')
		.attr('width', colWidth-2)
		.attr('height', rowHeight-2)
		.attr('x', 1)
		.attr('y', 1)
		.style('stroke', '#FFF')
		.style('stroke-width', 3)
		.style('fill', 'transparent');

		cells
		.append('text')
		.style('text-anchor', 'middle')
		.text('')
		.attr('class', 'framework-text')
		.attr('y', function(d){
			return rowHeight/2+4;
		})
		.attr('x', colWidth/2)
		.style('fill', "#000")
		.style('font-weight', 'bold')
		.style('font-size', '16px')
		.attr('id', function(d,i){
			return d3.select(this.parentNode).attr('id') + 'text';
		});

		rows
		.append('line')
		.style('opacity', function(d,i){
			var cat_name = metadata.context_array[d.context_id-1].name;
			if(cat!=cat_name){
				cat = cat_name;
				cat1++;
				return 1;
			} else {
				return 0
			}
			cat = cat_name;
			cat1++;
		})
		.attr('x1', 0)
		.attr('x2', frameworkWidth)
		.attr('y1', -20)
		.attr('y2', -20)
		.attr('class', 'framework-domain')
		.style('stroke-width', '1px');

		var bottomLine = frameworkSvg
		.append('line')
		.style('opacity', 1)
		.attr('class', 'framework-domain')
		.attr('x1', 0)
		.attr('x2', frameworkWidth)
		.attr('y1', frameworkHeight+5)
		.attr('y2', frameworkHeight+5)
		.style('stroke-width', '2px');

		var cells2 = rows2.selectAll('g')
		.data(metadata.sector_array)
		.enter()
		.append('g')
		.attr('class', function(d,i){
			return d3.select(this.parentNode).attr('class').split(' ')[1];
		})
		.attr('transform', function(d,i){
			return 'translate('+ ((colWidth)*i+leftSpacing) + ','+ - (frameworkMargins.top ) + ')';
		})
		.attr('id', function(d,i){
			var c = d3.select(this.parentNode).attr('class').split(' ')[1];
			return c+'s'+i;
		})

		cells2
		.append('rect')
		.attr('class', 'cell')
		.attr('width', colWidth)
		.attr('height', rowHeight)
		.attr('id', function(d,i){
			return d3.select(this.parentNode).attr('id') + 'rect';
		})
		.style('opacity', 0)

		var frameworkSelectStyle = { 'stroke': '#FFF', 'fill': 'black', 'fillOpacity': 0.03, 'strokeOpacity': 0.8};

		var hSel = layer1.append('g')
		.attr('class', 'selector')
		.attr('transform', 'translate(0,0)');

		hSel.append('rect')
		.attr('x', 210)
		.attr('width', frameworkWidth+20)
		.attr('height', rowHeight-1)
		.style('fill', frameworkSelectStyle.fill)
		.style('fill-opacity', frameworkSelectStyle.fillOpacity)
		.style('stroke-opacity', frameworkSelectStyle.strokeOpacity)
		.style('stroke', frameworkSelectStyle.stroke)
		.style('stroke-width', '1px');

		var vSel = layer1.append('rect')
		.attr('class', 'selector')
		.attr('x', 194+colWidth+leftSpacing-4)
		.attr('y', 1)
		.attr('width', colWidth)
		.attr('height', frameworkHeight+20)
		.style('fill', frameworkSelectStyle.fill)
		.style('fill-opacity', frameworkSelectStyle.fillOpacity)
		.style('stroke', frameworkSelectStyle.stroke)
		.style('stroke-opacity', frameworkSelectStyle.strokeOpacity)
		.style('stroke-width', '1px');

		cells2.on('mouseover', function(d,i){
			vSel.attr('x', (colWidth*(d.id-1))+leftSpacing);
			d3.selectAll('.framework-text').style('visibility', 'hidden');
			var val = d3.select('#'+this.id+'text').text();
			if(filters.frameworkToggle=='entries'){
				d3.select('#'+this.id+'text').style('visibility', 'visible');
				d3.selectAll('.selector').style('opacity', 1);
			} else {
				if(val>0){
					d3.select('#'+this.id+'text').style('visibility', 'visible');
					d3.selectAll('.selector').style('opacity', 1);
				} else {
					d3.selectAll('.selector').style('opacity', 0);
				}					
			}
		});

		rows2.on('mouseover', function(d,i){
			hSel.attr('transform', function(){
				return 'translate(0,'+((i*rowHeight)+frameworkMargins.top+7)+')';
			})
		});

		d3.selectAll('.selector').style('opacity', 0);

		d3.select('#framework-layer2').on('mouseover', function(d,i){
			// d3.selectAll('.selector').style('opacity', 1);
		}).on('mouseout', function(d,i){
			d3.selectAll('.selector').style('opacity', 0);
			d3.selectAll('.framework-text').style('visibility', 'hidden');
		});

		// framework toggle switch
		d3.select('#framework-toggle-switch').on('mouseover', function(d,i){
			d3.selectAll('#framework-toggle').style('opacity', .9)
		}).on('mouseout', function(d,i){
			d3.selectAll('#framework-toggle').style('opacity', 1)

		}).on('click', function(d,i){
			if(filters.frameworkToggle=='entries'){
				if(filters.toggle == 'severity'){
					d3.select('#framework-toggle').style('fill', colorPrimary[3]);
				} else {
					d3.select('#framework-toggle').style('fill', colorSecondary[3]);
				}
				d3.select('#framework-toggle').transition().duration(200).attr('cx', 194);
				filters.frameworkToggle = 'average';
			} else {
				d3.select('#framework-toggle').style('fill', colorNeutral[3]);
				d3.select('#framework-toggle').transition().duration(200).attr('cx', 164);
				filters.frameworkToggle = 'entries';				
			};
			updateFramework();
		});
	}

	//**************************
	// stacked bar chart
	//**************************
	this.createStackedBarChart = function(a){

		var padding = {left: 20, right: 25, top: 35, bar: {y: 5}};

		// create svg
		var svg = this.createSvg({
			id: a.div+'-svg',
			viewBoxWidth: a.width,
			viewBoxHeight: stackedBarHeight,
			div: '#'+a.div,
			width: '100%'
		});

		var height = stackedBarHeight - padding.top;
		var rowHeight = height/a.rows.length;

		// add title
		var title = svg.append('g')
		.attr('transform', 'translate(0,0)');

		title
		.append('text')
		.attr('x', 0)
		.attr('y', 20)
		.style('font-weight', 'bold')
		.text(a.title);

		// add filter icon
		title.append('image')
		.attr('id', a.classname+'RemoveFilter')
		.attr('class', 'removeFilterBtn')
		.attr('xlink:href', 'images/filter.png')
		.attr('title', 'Reset filter')
		.attr('y', 1)
		.attr('x', title.node().getBBox().width +5 )
		.attr('height', '22px')
		.attr('width', '22px');

		var chartarea = svg.append('g');

		var rows = chartarea.selectAll('.stacked-bar-row')
		.data(a.rows)
		.enter()
		.append('g')
		.attr('class', 'stacked-bar-row')
		.attr('transform', function(d,i){
			return 'translate(0,' + ((i*rowHeight) + padding.top) + ')';
		});

		var label = rows.append('text')
		.attr('y', rowHeight/2 )
		.attr('class', function(d,i){ return a.classname + ' ' + a.classname+'-'+i })
		.style('alignment-baseline', 'middle')
		.text(function(d,i){
			return d.name;
		}).style('text-anchor', 'end');

		var labelWidth = chartarea.node().getBBox().width + padding.left;
		label.attr('x', labelWidth-20);
		labelWidth = labelWidth + 16;

		if(a.classname == 'sc'){
			var icon = rows.append('image')
			.attr('class', function(d,i){
				return 'sector-icon sector-icon-'+d.id;
			})
			.attr('xlink:href', function(d,i){return 'images/sector-icons/'+(i+1)+'.svg'; })
			.attr('height', 23)
			.attr('width', 23)
			.attr('y', rowHeight/2 - 12)
			.attr('x', labelWidth-30);

			labelWidth = labelWidth + 30;
		}

		title.attr('transform', function(d,i){
			var offset = d3.select(this).node().getBBox().width +35;
			return 'translate('+(labelWidth-offset)+',0)';
		})

		var width = a.width - labelWidth - padding.right; 

		// adjust title and filter button spacing
		d3.select('#'+a.classname+'Title').style('text-align', 'left').style('display', 'inline');

		var rowBg = rows.append('rect')
		.attr('y', 1)
		.attr('x', 0)
		.attr('width', labelWidth-30)
		.attr('height', rowHeight-2)
		.style('opacity', 0)
		.style('cursor', 'pointer')
		.attr('class', function(d,i){ return a.classname +'-bg ' + a.classname+'-bg-'+i })
		.on('mouseover', function(){
			d3.select(this).style('opacity', 0.03)
		})
		.on('mouseout', function(){
			d3.select(this).style('opacity', 0)
		})
		.on('click', function(d,i){
			if(a.classname=='sc'){
				return filter('sector',i+1);
			}
			if(a.classname=='ag'){
				return filter ('affectedGroups', i+1);
			}
			if(a.classname=='sn'){
				return filter ('specificNeeds', i+1);
			}
		});

		// define x scale
		scale[a.classname] = {};
		scale[a.classname].x = d3.scaleLinear()
		.range([labelWidth, a.width - padding.right])
		.domain([1, 5]);// severity/reliability x xcale

		scale[a.classname].paddingLeft = labelWidth;

		for(var s=5; s >= 0; s--) {
			var val = s;
			var bar = rows.append('rect')
			.attr('id', function(d,i){
				return a.classname+d.id+'s'+(s);
			})
			.attr('class', a.classname+'-bar s'+(s))
			.attr('x', function(d,i){
				return scale[a.classname].x(s);
			})
			.attr('width', width/5)
			.attr('data-width', width)
			.attr('data-id', s)
			.attr('data-percent', 0)
			.attr('y', padding.bar.y)
			.attr('height', rowHeight-(padding.bar.y*2))
			.style('fill', colorPrimary[s])
			.on('click', function(d,i){
				var val = parseInt(d3.select(this).attr('data-id'));
				if(filters.toggle=='severity'){
					filter('severity',val);
				} else {
					filter('reliability',val);
				}
			})
		}

		var dataLabel = rows.append('text')
		.text(999)
		.attr('id', function(d,i){
			return a.classname+d.id+'label';
		})
		.attr('class', a.classname+'-label')
		.attr('y', rowHeight/2)
		.style('alignment-baseline', 'middle')
		.style('text-anchor', 'middle')
		.attr('x', labelWidth -20 )
		.style('fill', colorPrimary[4])
		.style('font-weight', 'bold')
		.style('font-size', '16px');

	}

	//**************************
	// create sector chart
	//**************************
	this.createSectorChart = function(options){

		var sectorChart = this.createStackedBarChart({
			title: 'SECTOR',
			rows: metadata.sector_array,
			width: 700,
			classname: 'sc',
			div: 'sector-svg'
		});

	}

	//**************************
	// create specific needs chart
	//**************************
	this.createSpecificNeedsChart = function(options){

		var specificNeedsChart = this.createStackedBarChart({
			title: 'SPECIFIC NEEDS GROUPS',
			rows: metadata.specific_needs_groups_array,
			classname: 'sn',
			width: 700,
			div: 'specific-needs-svg'
		});
		d3.select('#snRemoveFilter').on('click', function(){ filter('specificNeeds', 'clear'); });

	}

	//**************************
	// create affected groups chart
	//**************************
	this.createAffectedGroupsChart = function(options){

		var affectedGroupsChart = this.createStackedBarChart({
			title: 'AFFECTED GROUPS',
			rows: metadata.affected_groups_array,
			classname: 'ag',
			width: 700,
			div: 'affected-groups-svg'
		});
		d3.select('#agRemoveFilter').on('click', function(){ filter('affectedGroups', 'clear'); });
	}

	//**************************
	// severity chart
	//**************************
	this.createSeverityChart = function(options){

		// set toggle button listener
		d3.selectAll('.severityToggle').on('click', function(){
			toggle('severity');
		});

		// create severity svg
		var severitySvg = this.createSvg({
			id: 'severitySvg',
			viewBoxWidth: 1000,
			viewBoxHeight: 70,
			div: '#severity_bars',
			width: '100%'
		});

		// define x scale
		scale.severity.x = d3.scaleLinear()
		.range([0, 995])
		.domain([0,5]);// severity/reliability x xcale

		var severityBars = severitySvg.selectAll('.severityBar')
		.data(metadata.severity_units)
		.enter()
		.append('g')
		.attr('class','top-bar');

		severityBars.append('rect')
		.attr('class', function(d,i){
			return 'severityBar severity' + (i);
		})
		.attr('x', function(d,i){
			return (1000/5)*i;
		})
		.attr('width', function(d,i){
			return (1000/5);
		})
		.attr('height', function(d,i){
			return (53);
		})
		.attr('y',2)
		.attr('fill', function(d,i){
			return colorPrimary[i];
		});

		var labels = severityBars.append('g')
		.attr('class', function(d,i){
			return 's'+(i+1)+'-text'
		})
		.attr('transform', function(d,i){
			var x = (1000/5)*i + ((1000/5)/2);
			return 'translate('+x+',36)';
		});

		labels
		.append('text')
		.attr('class', function(d,i){
			return 's'+(i+1)+'-percent bar-percent'
		})
		.style('fill', function(d,i){
			if(i<3){
				return '#000'
			} else {
				return '#FFF'
			}
		})
		.style('font-size', '25px')
		.style('text-anchor', 'middle')
		.style('opacity', 1)
		.text('00%');

		labels
		.append('text')
		.attr('class', function(d,i){
			return 's'+(i+1)+'-value bar-value'
		})
		.style('fill', function(d,i){
			if(i<3){
				return '#000'
			} else {
				return '#FFF'
			}
		})
		.style('font-size', '25px')
		.style('text-anchor', 'middle')
		.style('opacity', 0)
		.text('00');

		severityBars.on('mouseover', function(d,i){
			d3.select(this).select('.bar-percent').style('opacity',0);
			d3.select(this).select('.bar-value').style('opacity',1);
		}).on('mouseout', function(d,i){
	            d3.select(this).select('.bar-percent').style('opacity',1);
	            d3.select(this).select('.bar-value').style('opacity',0);
		}).on('click', function(d,i){
			d3.selectAll('.bar').transition("mouseoutReliability").duration(500).style('opacity', 1);	
			clickTimer = 1;
			filter('severity',i);
			setTimeout(function(){ clickTimer = 0 }, 2000);
		});

		severitySvg.append('rect')
		.attr('id', 'severityAvg')
		.attr('x', 0)
		.attr('y', -2)
		.attr('height', 55)
		.attr('width', 5)
		.style('fill', '#000');		

		//**************************
		// severity filter remove button
		//**************************
		d3.selectAll('#severityRemoveFilter').on('click', function(){
			d3.select('#severityRemoveFilter').style('display', 'none').style('cursor', 'default');
			d3.selectAll('.severityBar').transition().duration(200).style('fill', function(d,i){
				return colorPrimary[i];
			});	
			return filter('severity', 'clear'); 
		});

		updateSeverityReliability('init', 500);
	}

	//**************************
	// reliability chart
	//**************************
	this.createReliabilityChart = function(options){

		// set toggle button listener
		d3.selectAll('.reliabilityToggle').on('click', function(){
			toggle('reliability');
		});

		// create reliability svg
		var reliabilitySvg = Deepviz.createSvg({
			id: 'reliabilitySvg',
			viewBoxWidth: 1000,
			viewBoxHeight: 70,
			div: '#reliability_bars',
			width: '100%'
		});

		var reliabilityBars = reliabilitySvg.selectAll('.reliabilityBar')
		.data(metadata.reliability_units)
		.enter()
		.append('g')
		.attr('class','reliability-bar-group top-bar');

		reliabilityBars.append('rect')
		.attr('class', function(d,i){
			return 'reliabilityBar reliability' + (i);
		})
		.attr('x', function(d,i){
			return (1000/5)*i;
		})
		.attr('width', function(d,i){
			return (1000/5);
		})
		.attr('height', function(d,i){
			return (53);
		})
		.style('cursor', 'pointer')
		.attr('y',2)
		.attr('fill', function(d,i){
			return colorSecondary[i];
		});

		var labels = reliabilityBars.append('g')
		.attr('class', function(d,i){
			return 'r'+(i+1)+'-text'
		})
		.attr('transform', function(d,i){
			var x = (1000/5)*i + ((1000/5)/2);
			return 'translate('+x+',36)';
		});

		labels
		.append('text')
		.attr('class', function(d,i){
			return 'r'+(i+1)+'-percent bar-percent'
		})
		.style('fill', function(d,i){
			if(i<3){
				return '#000'
			} else {
				return '#FFF'
			}
		})
		.style('font-size', '25px')
		.style('text-anchor', 'middle')
		.style('opacity', 1)
		.text('00%');

		labels
		.append('text')
		.attr('class', function(d,i){
			return 'r'+(i+1)+'-value bar-value'
		})
		.style('fill', function(d,i){
			if(i<3){
				return '#000'
			} else {
				return '#FFF'
			}
		})
		.style('font-size', '25px')
		.style('text-anchor', 'middle')
		.style('opacity', 0)
		.text('00');

		reliabilityBars.on('mouseover', function(d,i){
			d3.select(this).select('.bar-percent').style('opacity',0);
			d3.select(this).select('.bar-value').style('opacity',1);
		}).on('mouseout', function(d,i){
		   d3.select(this).select('.bar-percent').style('opacity',1);
		   d3.select(this).select('.bar-value').style('opacity',0);
		}).on('click', function(d,i){
			clickTimer = 1;
			filter('reliability',i);
			setTimeout(function(){ clickTimer = 0 }, 2000);
		});

		reliabilitySvg.append('rect')
		.attr('id', 'reliabiltiyAvg')
		.attr('x', 0)
		.attr('y', -2)
		.attr('height', 55)
		.attr('width', 5)
		.style('fill', '#000');	

		//**************************
		// reliability filter remove button
		//**************************
		d3.selectAll('#reliabilityRemoveFilter').on('click', function(){
			d3.select('#reliabilityRemoveFilter').style('display', 'none').style('cursor', 'default');
			d3.selectAll('.reliabilityBar').transition().duration(200).style('fill', function(d,i){
				return colorSecondary[i];
			});	
			return filter('reliability', 'clear'); 
		});

		updateSeverityReliability('init', 500);

		//**************************
		// trendline smoothing slider
		//**************************

		// create average svg
		var avgSliderSvg = this.createSvg({
			id: 'avg_slide_svg',
			viewBoxWidth: 300,
			viewBoxHeight: 30,
			div: '#avg_slider',
			width: '100%'
		});

		var avgSliderIcons = avgSliderSvg.append('g')
		.attr('id', 'sliderIcons');

		avgSliderIcons.append('image')
		.attr('class', 'sliderIcon')
		.attr('xlink:href', 'images/oscillator_saw.png')
		.attr('y', 8)
		.attr('x', 113)
		.attr('height', '22px')
		.attr('width', '22px');

		avgSliderIcons.append('image')
		.attr('class', 'sliderIcon')
		.attr('xlink:href', 'images/oscillator_sine.png')
		.attr('y', 8)
		.attr('x', 276)
		.attr('height', '19px')
		.attr('width', '19px');

		avgSliderSvg.on('mouseover', function(){
			d3.select('#avg-line')
			.style('stroke-width',2)
			.transition().duration(750)
			.style('stroke-opacity',1);

			d3.select('#chartarea').transition().duration(750).style('opacity', 0.2);

		}).on('mouseout', function(){
			if(avgSliderBrushing==false){
				d3.select('#avg-line')
				.style('stroke-width',1)
				.transition().duration(750)
				.style('stroke-opacity',0.4);	

				d3.select('#chartarea').transition().duration(750).style('opacity', 1);		
			}
		});

		var sliderPadding = 60;

		var xt = d3.scaleLinear()
		.domain([0, (dataByDate.length/2)])
		.range([0, 190-sliderPadding])
		.clamp(true);

		var slider = avgSliderSvg.append("g")
		.attr("class", "slider")
		.attr("transform", "translate("+139+",20)");

		avgSliderSvg.append("text")
		.attr('class', 'avgSliderLabel')
		.text('Moving avg. interpolation')
		.attr('y', 23)

		var nDays = avgSliderSvg.append("text")
		.attr('class', 'avgSliderLabel')
		.attr('id', 'n-days')
		.text('( n days = 10 )')
		.attr('y', 36)
		.attr('x', 180)

		slider.append("line")
		.attr("class", "track")
		.attr("x1", xt.range()[0])
		.attr("x2", xt.range()[1])
		.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		.attr("class", "track-inset")
		.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		.attr("class", "track-overlay")
		.call(d3.drag()
			.on("start.interrupt", function() { slider.interrupt(); })
			.on('end', function(){
				avgSliderBrushing = false;

				d3.selectAll('#avg-line')
				.style('stroke-width',1)
				.transition().duration(750)
				.style('stroke-opacity',0.4);	

				d3.select('#chartarea').transition().duration(500).style('opacity', 1);
			})
			.on("start drag", function() { 
				avgSliderBrushing = true;
				var h = xt.invert(d3.event.x)
				handle.attr('transform', 'translate('+xt(h)+',-10)')
				smoothAverage(h); }));

		slider.insert("g", ".track-overlay")
		.attr("class", "ticks")
		.attr("transform", "translate(0," + sliderPadding/2 + ")");

		slider.insert("g", ".track-overlay")
		.attr("class", "ticks")
		.attr("transform", "translate(0," + sliderPadding/2 + ")");

	    // slider init
	    var handle = slider.insert('g', '.track-overlay')
	    .attr('transform', 'translate('+xt(smoothingVal)+',-10)')
	    .attr("class", "handle");

	    handle
	    .append('path')
	    .attr("stroke", "#000")
	    .attr('stroke-width', 0)
	    .attr('fill', '#000')
	    .attr("cursor", "ew-resize")
	    .attr("d", 'M -7,0 -1,9 6,0 z');

	}

	//**************************
	// filtering (push values to filter array)
	//**************************
	var filter = function(filterClass, value){

		if(filterClass=='clear'){
			filters.sector = [];
			filters.severity = [];
			filters.context = [];
			filters.reliability = [];
			filters.affectedGroups = [];
			filters.specificNeeds = [];
			filters.geo = [];
		}

		d3.selectAll('.sector-icon').style('opacity', 0.3);
		d3.selectAll('.sc').style('opacity', 1);
		d3.selectAll('.col-header-bg-selected').style('opacity', 0);	
		d3.selectAll('.col-header-text').style('opacity', 1);	
		d3.select('#frameworkRemoveFilter').style('display', 'none').style('cursor', 'default');
		d3.select('#scRemoveFilter').style('display', 'none').style('cursor', 'default');

		d3.selectAll('.sn').style('opacity', 1);
		d3.selectAll('.ag').style('opacity', 1);
		d3.select('#snRemoveFilter').style('display', 'none').style('cursor', 'default');
		d3.select('#agRemoveFilter').style('display', 'none').style('cursor', 'default');

		d3.selectAll('.outerCircle').attr("stroke", colorNeutral[3]);
		d3.selectAll('.innerCircle').attr("stroke", colorNeutral[3]);

		if(value=='clear'){
			filters[filterClass] = [];
		} else if(value == 'clearFramework'){
			filters['sector'] = [];
			filters['context'] = [];
		} else {
		  addOrRemove(filters[filterClass], value);		
		}


		if((filters['severity'].length>0)||(filters['context'].length>0)||(filters['reliability'].length>0)||(filters['sector'].length>0)||(filters['geo'].length>0)||(filters['specificNeeds'].length>0)||(filters['affectedGroups'].length>0)){
			d3.select('#globalRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
		} else { 
			d3.select('#globalRemoveFilter').style('display', 'none').style('cursor', 'default');
		}
		// reset data using original loaded data
		data = originalData;

		d3.select('#severityRemoveFilter').style('display', 'none').style('cursor', 'default');
		d3.select('#reliabilityRemoveFilter').style('display', 'none').style('cursor', 'default');
		d3.select('#geoRemoveFilter').style('display', 'none').style('cursor', 'default');

		// apply filters to data array
		if(filters['severity'].length==6){
			filters['severity'] = [];
		}

		if(filters['severity'].length>0){
			data = data.filter(function(d){return  filters['severity'].includes(d['severity']);});
			d3.select('#severityRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
		}

		if(filters['reliability'].length==6)filters['reliability'] = [];

		if(filters['reliability'].length>0){
			data = data.filter(function(d){return  filters['reliability'].includes(d['reliability']);});
			d3.select('#reliabilityRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
		}

		if(filters.reliability.length==0){
			d3.selectAll('.reliabilityBar').style('fill', function(d,i){
				return colorSecondary[i];
			});		
		} else {
			d3.selectAll('.reliabilityBar').style('fill', function(d,i){
				return colorLightgrey[i];
			});	
			filters.reliability.forEach(function(d,i){
				d3.select('.reliabilityBar.reliability'+(d))
				.style('fill', colorSecondary[d])
			});
		}

		if(filters.severity.length==0){
			d3.selectAll('.severityBar').style('fill', function(d,i){
				return colorPrimary[i];
			});		
		} else {
			d3.selectAll('.severityBar').style('fill', function(d,i){
				return colorLightgrey[i];
			});	
			filters.severity.forEach(function(d,i){
				d3.select('.severityBar.severity'+(d))
				.style('fill', colorPrimary[d]);
			});
		}

		if(filters['geo'].length==metadata.geo_array.length){
			filters['geo'] = [];
		}

		if(filters['geo'].length>0){
			data = data.filter(function(d){
				return d['geo'].some(r=> filters['geo'].indexOf(r) >= 0);
			});
			d3.select('#geoRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
		}

		if(filters['context'].length>=numCategories)filters['context'] = [];


		if(filters['context'].length>0){
			d3.selectAll('.context-filter').style('fill', '#FFF').style('opacity',0.6);

			// filter data
			data = data.filter(function(d){
				return d['context'].some(r=> filters['context'].indexOf(parseInt(r)) >= 0);
				// return filters['sector'].includes(d['sector'][2]);
			});
			// bar/text shading
			filters.context.forEach(function(d,i){
				// selected state
				d3.selectAll('#context-filter'+(d)).style('fill', colorGrey[1]).style('opacity', 0.1);
			});
			d3.select('#frameworkRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
		} else {
			d3.selectAll('.context-filter').style('fill', '#FFF').style('opacity',0);
		}

		if(filters['sector'].length>=metadata.sector_array.length)filters['sector'] = [];

		if(filters['sector'].length>0){
			// filter data
			data = data.filter(function(d){
				return d['sector'].some(r=> filters['sector'].indexOf(r[2]) >= 0);
				// return filters['sector'].includes(d['sector'][2]);
			});
			// bar/text shading
			d3.selectAll('.sc').style('opacity', 0.2);
			d3.selectAll('.sc-bg').style('opacity', 0);
			d3.selectAll('.col-header-bg-selected').style('opacity', 0);	
			d3.selectAll('.col-header-text').style('opacity', 0.3);	
			d3.select('#frameworkRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
			d3.select('#scRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
			filters.sector.forEach(function(d,i){
				d3.selectAll('.sc-'+(d-1)).style('opacity', 1);
				d3.selectAll('.sc-bg-'+(d-1)).style('opacity', 0);
				d3.select('#col-header-bg-'+(d)).style('opacity', .1)
				d3.selectAll('.sector-icon-'+(d)).style('opacity', 1)
				d3.select('#col-header-'+(d) + ' .col-header-text' ).style('opacity', 1)
			});
		} 

		if(filters['affectedGroups'].length>0){
			data = data.filter(function(d){
				return d['affected_groups'].some(r=> filters['affectedGroups'].indexOf(r) >= 0);
			});
			// bar/text shading
			d3.selectAll('.ag').style('opacity', 0.2);
			d3.selectAll('.ag-bg').style('opacity', 0);
			filters.affectedGroups.forEach(function(d,i){
				d3.selectAll('.ag-'+(d-1)).style('opacity', 1);
			});

			d3.select('#agRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
		}

		if(filters['specificNeeds'].length>0){
			data = data.filter(function(d){
				return d['special_needs'].some(r=> filters['specificNeeds'].indexOf(r) >= 0);
			});
			// bar/text shading
			d3.selectAll('.sn').style('opacity', 0.2);
			d3.selectAll('.sn-bg').style('opacity', 0);
			filters.specificNeeds.forEach(function(d,i){
				d3.selectAll('.sn-'+(d-1)).style('opacity', 1);
			});
			d3.select('#snRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
		}
		updateTimeline(filterClass);
		d3.select('#globalRemoveFilter').on('click', function(){ filter('clear', 'clear'); });
	}

	//**************************
	// redraw timeline
	//**************************
	var redrawTimeline = function(){

		d3.select('#avg-line').transition().duration(200).style('opacity', 0)
		d3.select('#chartarea').transition().duration(200).style('opacity', 0)
		.on("end", function(){
			d3.select('#timeline .vizlibResponsiveDiv').remove();
			d3.select('#timechart-legend .vizlibResponsiveDiv').remove();		

			// create svg
			var timelineSvg = Deepviz.createSvg({
				id: 'timeline_viz',
				viewBoxWidth: 1300,
				viewBoxHeight: 900,
				div: '#timeline'
			});

			var timeChart = Deepviz.timeChart({
				appendTo: timelineSvg,
				id: 'timeChart',
				opacity: 1,
				gutter: 0.5,
				width: 1300,
				color: ['#0033A0'],
				maxValue: 'round', // integerValue (force define the maximum), 'auto' (find the maximum value in the data), 'round' (pretty rounding based on maximum value in the data)
				paddingLeft: 0,
				paddingTop: 0,
				offsetX: 1,
				offsetY: 0,

				yAxis: {
					enabled: true,
					label: '',
					gridlines: {
						enabled: true,
						stroke: '#A7A7A7',
						strokeWidth: 1,
						opacity: 1,
						dotted: true
					},
					font: {
						values: {
							size: '15px',
							weight: 'bold',
							padding: 0
						},
						label: {
							size: '14px',
							weight: 'bold',
							padding: 10
						}
					}
				},
				xAxis: {
					enabled: true,
					label: 'Date',
					gridlines: {
						enabled: true,
						stroke: 'grey',
						strokeWidth: 1,
						opacity: 1
					},
					font: {
						values: {
							size: '14px',
							weight: 'bold',
						},
						label: {
							size: '14px',
							weight: 'bold',
						}
					}
				},
				font: {
					title: {
						size: '20px',
						weight: 'bold'
					},
					subtitle: {
						size: '12px',
						weight: 'normal'
					},
				},
				legend: {
					enabled: false,
					position: 'top'
				},
				dateBrush: true,
				dataValues: 'total_entries',
				dataKey: 'key',
				// sliderUpdate: function(a,b){
				// 	sliderUpdate(a,b);
				// },
				frame: [1]
			});

			updateBubbles();
			updateFramework();
			updateTotals();
			updateStackedBars('ag', dataByAffectedGroups);
			updateStackedBars('sn', dataBySpecificNeeds);
			updateStackedBars('sc', dataByFramework);
		});
	}

	//**************************
	// get the data
	//**************************
	var updateTimeline = function(target = null){

		var chartdata = refreshData();

		scale.timechart.y1 = d3.scaleLinear()
		.range([timechartHeight2, 0])
		.domain([0, rounder(maxValue)]);

		//**************************
		// Bar/event drop groups (by date)
		//**************************
		var barGroup = d3.select('#chart-bar-group');

		var bars = barGroup.selectAll(".barGroup")
		.data(chartdata)
		.enter()
		.append('g')
		.attr('id', function(d,i){
			var dt = new Date(d.date);
			dt.setHours(0,0,0,0);
			return 'date'+dt.getTime();
		})
		.attr("class", "barGroup")
		.attr('data-width', function(d,i) { 
			if(filters.time=='y'){
				var date = new Date(d.key);
				var endYear = new Date(date.getFullYear(), 11, 31);
				return scale.timechart.x(endYear) - scale.timechart.x(d.key);   		
			}

			if(filters.time=='m'){
				var date = new Date(d.key);
				var endMonth = new Date(date.getFullYear(), date.getMonth()+1, 1);
				return scale.timechart.x(endMonth) - scale.timechart.x(d.key);   		
			}

			if(filters.time=='d'){
				var date = new Date(d.key);
				var endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()+1);
				return scale.timechart.x(endDate) - scale.timechart.x(d.key);   		
			}	

		})
		.attr("transform", function(d,i) { if(i==1){barWidth+=scale.timechart.x(d.key);} return "translate(" + scale.timechart.x(d.key) + ",0)"; })
		.exit()
		.remove();
		
		bars = d3.select('#chart-bar-group').selectAll(".barGroup");

		var yArray = [];

		var individualBars = bars.selectAll('.bar')
		.data(function(d,i){ return d.barValues;})
		.enter()
		.append("rect")
		.attr('class', function(d,i){
			return 'bar severity'+(i+1);
		})
		.style('stroke', '#fff')
		.style('stroke-opacity',0)
		.attr("x", function(d,i) { 
			var w = d3.select(this.parentNode).attr('data-width');
			barWidth = w;
			if(filters.time=='m'){
				return w*0.2
			}
			if(filters.time=='y'){
				return w*0.3
			}
		})
		.attr("width", function(d,i) { 
			var w = d3.select(this.parentNode).attr('data-width');
			if(filters.time=='m'){
				w=w*0.6;
			}
			if(filters.time=='y'){
				w=w*0.4
			}
			return w-1;
		})
		.on('mouseover', function(){
			d3.select(this).style('fill-opacity', 1 - 0.05)
		})
		.on('mouseout', function(){
			d3.select(this).style('fill-opacity', 1)
		})
		.attr("height", 0)
		.attr("y", timechartHeight2);

		individualBars.transition()
		.duration(500)
		.attr("y", function(d,i) { 
			if(i>0){
				yArray[i] = yArray[i-1] + d;
			} else {
				yArray[i] = d;
			}
			return scale.timechart.y1(yArray[i]); 
		})
		.attr("height", function(d,i) { 
			return timechartHeight2-scale.timechart.y1(d); 
		});

		timechartyAxis = d3.axisLeft()
		.scale(scale.timechart.y1)
		.ticks(4)
		.tickSize(0)
		.tickPadding(8);

		d3.select("#timechartyAxis")
		.transition()
		.call(timechartyAxis);

		timechartyGrid = d3.axisLeft(scale.timechart.y1)
		.tickSize(-width)
		.ticks(4)
		.tickFormat("")

		d3.select('#timechartyGrid')
		.transition()
		.call(timechartyGrid);

		// update bars

		bars = d3.select('#chart-bar-group').selectAll(".barGroup");
		bars.each(function(d,i){

			var timeid = this.id;
			var dD = dataByDate.filter(obj => {
				return 'date'+obj.date.getTime() == timeid;
			})[0];
			var group = d3.select(this);
			var eventDrops = group.selectAll('.eventDrop' );

			if(dD){
				var yArray = [];
				var iBars = group.selectAll('.bar' )
				.style('fill', function(d,i){
					if(dD.key<dateRange[0]){
						return colorLightgrey[i];
					} else {
						if(filters.toggle=='severity'){
							return colorPrimary[i];
						} else {
							return colorSecondary[i];
						}
					}
				})
				.transition().duration(500)
				.attr("height", function(d,i) {
					return timechartHeight2-scale.timechart.y1(dD[filters.toggle][i]); 
				})
				.attr("y", function(d,i) { 
					if(i>0){
						yArray[i] = yArray[i-1] + dD[filters.toggle][i];
					} else {
						yArray[i] = dD[filters.toggle][i];
					}
					return scale.timechart.y1(yArray[i]); 
				});
				eventDrops.transition().duration(500)
				.attr('r', function(d,i){
					var dx = dD['context'][i]
					return scale.eventdrop(dx);
				})
			} else {
				group.selectAll('.bar').transition("h").duration(0).attr('height',0);
				group.selectAll('.bar').transition().duration(500).attr('y',timechartHeight2).attr('height',0);
				eventDrops.transition().duration(750)
				.attr('r', 0)
			}
		});
		updateSeverityReliability(target, 500);
		updateTrendline();
		updateBubbles();
		colorBars();
	}

	//**************************
	// update map bubbles
	//**************************
	function updateBubbles(){

		d3.selectAll('.map-bubble')
		.style('opacity', 0);

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

		var bubbles = d3.selectAll('.map-bubble')
		.attr('transform', function(d,i){
			var size = scale.map(dataByLocationSum[i]);
			return 'scale('+size+')';
		})
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
		});

		bubbles.select('.map-bubble-value')
		.text(function(d,i){
			return dataByLocationSum[i];
		});

		bubbles.selectAll('.innerCircle').style('fill', colorNeutral[3]);
		var map = document.getElementById("map");
		map.setAttribute("style","height:"+(map.offsetWidth*mapAspectRatio)+"px");
	}

	//**************************
	// update date text 
	//**************************
	function updateDate(){
		var dateformatter = d3.timeFormat("%d %b %Y");

		var dx = new Date(dateRange[1]);
		var dateToStr = dx.setDate(dx.getDate()-1);

		if(filters.time=='d'){
			var string = dateformatter(dateRange[0]) + ' - ' + dateformatter(dateToStr);
			$('#dateRange').data('daterangepicker').setStartDate(dateRange[0]);
			$('#dateRange').data('daterangepicker').setEndDate(dx);		
		}

		if(filters.time=='m'){
			var dateformatter = d3.timeFormat("%b %Y");
			if(dateformatter(dateRange[0]) == dateformatter(dateToStr)){
				var string = dateformatter(dateRange[0]);
			} else {
				var string = dateformatter(dateRange[0]) + ' - ' + dateformatter(dateToStr);
			}
		}

		if(filters.time=='y'){
			var dateformatter = d3.timeFormat("%Y");
			if(dateformatter(dateRange[0]) == dateformatter(dateToStr)){
				var string = dateformatter(dateRange[0]);
			} else {
				var string = dateformatter(dateRange[0]) + ' - ' + dateformatter(dateToStr);
			}
		}

		d3.select('#dateRangeText').text(string);

	}

	function updateTotals(){

		var dc = data.filter(function(d){return ((d.date>=dateRange[0])&&(d.date<dateRange[1])) ;});
		var context = [];

		dc.forEach(function(d,i){
			d.context.forEach(function(dd,ii){
				context.push(dd);
			})
		});

		// define maximum context value
		var contextualRowTotals = d3.nest()
		.key(function(d) { return d;})
		.rollup(function(leaves) { return leaves.length; })
		.entries(context);

		d3.selectAll('.total-label').text(0);
		
		contextualRowTotals.forEach(function(d,i){
			d3.select('#total-label'+(d.key-1)).text(d.value);
		})

		total = d3.sum(dataByDate, function(d){
			if((d.date>=dateRange[0])&&(d.date<dateRange[1]))
				return d.total_entries;
		});

		d3.select('#total_entries').text(total);
	}

	//**************************
	// update trendline
	//**************************
	var updateTrendline = function(){

		tp = [];

		trendlinePoints.sort(function(x,y){
			return d3.ascending(x.date, y.date);
		})

		trendlinePoints.forEach(function(d,i){
			d.y_severity = scale.trendline.y(d.severity_avg);
			d.y_reliability = scale.trendline.y(d.reliability_avg);
			if(filters.toggle=='severity'){
				tp.push(d.y_severity );
			} else {
				tp.push(d.y_reliability );			
			}
		});

		movingAvg = function (adata, neighbors) {
			return adata.map((val, idx, arr) => {
				let start = Math.max(0, idx - neighbors), end = idx + neighbors
				let subset = arr.slice(start, end + 1)
				let sum = subset.reduce((a,b) => a + b)
				return sum / subset.length
			})
		}

		var dataAvg = movingAvg(tp, smoothingVal);
		
		d3.select('#avg-line')
		.datum(dataAvg)
		.attr('d', curvedLine)

	}

	function smoothAverage(v = 4){
		smoothingVal = Math.ceil(v);
		var dataAvg = movingAvg(tp, v);
		d3.select('#avg-line')
		.datum(dataAvg)
		.attr('d', curvedLine)
		.style('stroke-width',2)
		.style('stroke-opacity',1);
		d3.select('#chartarea').style('opacity', 0.2);
		d3.select('#n-days').text('( n days = '+(Math.round(v))+' )');
	}

	//**************************
	// update severity / reliability bars
	//**************************
	function updateSeverityReliability(target=null, duration = 0){

		if(target == 'brush') duration = 0;

		var s_total = 0;
		var r_total = 0;
		var s_total_not_null = 0;
		var r_total_not_null = 0;
		var severity = [0,0,0,0,0,0];
		var severityRolling = [0,0,0,0,0,0];
		var severityCount = 0;
		var reliability = [0,0,0,0,0,0];
		var reliabilityRolling = [0,0,0,0,0,0];
		var reliabilityCount = 0;
		var timedata = data;

		d3.selectAll('.severityBar')
		.attr('fill', function(d,i){
			tippy(this.parentNode, { 
				content: '<div style="width: 100px; height: 10px; display: inline; background-color: '+ colorPrimary[i] + '">&nbsp;&nbsp;</div>&nbsp;&nbsp;' + d.name,
				theme: 'light-border',
				delay: [250,100],
				inertia: false,
				distance: 8,
				allowHTML: true,
				animation: 'shift-away',
				arrow: true,
				size: 'small'
			});
			return colorPrimary[i];
		});

		d3.selectAll('.reliabilityBar')
		.attr('fill', function(d,i){
			tippy(this.parentNode, { 
				content: '<div style="width: 100px; height: 10px; display: inline; background-color: '+ colorSecondary[i] + '">&nbsp;&nbsp;</div>&nbsp;&nbsp;' + d.name,
				theme: 'light-border',
				delay: [250,100],
				inertia: false,
				distance: 8,
				allowHTML: true,
				animation: 'shift-away',
				arrow: true,
				size: 'small'
			});
			return colorSecondary[i];
		});

		var reliabilityData = timedata;
		if(filters['severity'].length>0){
			reliabilityData = timedata.filter(function(d){return  filters['severity'].includes(d['severity']);});
		}

		var severityData = timedata;
		if(filters['reliability'].length>0){
			severityData = timedata.filter(function(d){return  filters['reliability'].includes(d['reliability']);});
		}

		var dateBySeverity = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.severity; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(severityData);

		var dateByReliability = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.reliability; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(reliabilityData);

		dateBySeverity.forEach(function(d,i){
			var dt = new Date(d.key);
			dt.setHours(0,0,0,0);
			d.key = dt;
			d.date = d.key;
			d.severity = [0,0,0,0,0,0];
			var count = 0;
			d.values.forEach(function(dx){
				d.severity[dx.key] = dx.value;
				count += dx.value;
			});

			d.total_entries = count;
			d.severity_avg = ( (1*d.severity[5]) + (2*d.severity[1]) + (3*d.severity[2]) + (4*d.severity[3]) + (5*d.severity[4]) ) / count;

			if((d.date>=dateRange[0])&&(d.date<dateRange[1])){
				for (i = 0; i < severity.length; i++) { 
					severity[i] += d.severity[i];
				}
				s_total += d.total_entries;
			}
			delete d.values;
		});

		dateByReliability.forEach(function(d,i){
			var dt = new Date(d.key);
			dt.setHours(0,0,0,0);
			d.key = dt;
			d.date = d.key;
			var count = 0;

			d.reliability = [0,0,0,0,0,0];
			d.severity = [0,0,0,0,0,0];

			dateByReliability[i].values.forEach(function(dx){
				d.reliability[dx.key] = dx.value;
				count += dx.value;
			});

			d.total_entries = count;
			d.reliability_avg = ( (1*d.reliability[5]) + (2*d.reliability[1]) + (3*d.reliability[2]) + (4*d.reliability[3]) + (5*d.reliability[4]) ) / count;

			if((d.date>=dateRange[0])&&(d.date<dateRange[1])){
				for (i = 0; i < reliability.length; i++) { 
					reliability[i] += d.reliability[i];
				}
				r_total += d.total_entries;
			}
			delete d.values;
		});

		if((s_total>0)&&(r_total>0)){

			for (i = 0; i < severity.length; i++) { 
				if(filters.severity.includes(i+1)){}
					severityCount += severity[i];
				severityRolling[i] = severityCount;
				reliabilityCount += reliability[i];
				reliabilityRolling[i] = reliabilityCount;
			}

			if((target=='reliability')||(target=='init')||(target=='context')||(target=='geo')||(target=='specificNeeds')||(target=='affectedGroups')||(target=='brush')||(target=='sector')||(target=='clear')||(target=='map')||((target=='severity')&&(filters.severity.length == 0))){
				d3.selectAll('.severityBar')
				.transition()
				.duration(duration)
				.attr('opacity', 1)
				.attr('x', function(d,i){
					if(i==0){
						var s = 0;
					} else {
						var s = severityRolling[i-1];
					}
					var v = (s/s_total)*1000;
					var w = (severity[i]/s_total)*1000;
					// hide show percent label
					d3.select('.s'+(i+1)+'-text')
					.style('opacity', function(){
						if(w<=20){ return  0 } else { return 1};
					});

					if(duration>0){
						d3.select('.s'+(i+1)+'-text')
						.transition()
						.duration(duration)
						.attr('transform', function(d,i){
							return 'translate('+(v+(w/2))+',36)';
						});
					} else {
						d3.select('.s'+(i+1)+'-text')
						.attr('transform', function(d,i){
							return 'translate('+(v+(w/2))+',36)';
						});
					}
					d3.select('.s'+(i+1)+'-percent')
					.text(function(){
						var v = (severity[i]/s_total)*100;
						return Math.round(v)+'%';
					});
					d3.select('.s'+(i+1)+'-value')
					.text(function(){
						return severity[i];
					});
					return v;
				})
				.attr('width', function(d,i){
					var v = (severity[i]/s_total)*1000;
					return v;
				});				
			};

			if((target=='severity')||(target=='init')||(target=='geo')||(target=='context')||(target=='specificNeeds')||(target=='affectedGroups')||(target=='brush')||(target=='sector')||(target=='map')||(target=='clear')||((target=='reliability')&&(filters.reliability.length == 0))){
				d3.selectAll('.reliabilityBar')
				.attr('opacity', 1)
				.transition()
				.duration(duration)
				.attr('x', function(d,i){
					if(i==0){
						var s = 0;
					} else {
						var s = reliabilityRolling[i-1];
					}
					var v = (s/r_total)*1000;
					var w = (reliability[i]/r_total)*1000;
					d3.select('.r'+(i+1)+'-text')
					.attr('transform', function(d,i){
						return 'translate('+(v+(w/2))+',36)';
					})
					.style('opacity', function(){
					// hide show percent label

					if(w<=20){ return  0 } else { return 1};
				});

					d3.select('.r'+(i+1)+'-percent')
					.text(function(){
						var v = (reliability[i]/r_total)*100;
						return Math.round(v)+'%';
					});
					d3.select('.r'+(i+1)+'-value')
					.text(function(){
						return reliability[i];
					});					
					return v;
				})
				.attr('width', function(d,i){
					var v = (reliability[i]/r_total)*1000;
					return v;
				});
			}

			// severity median
			var s = 0;
			var s_median = 0;
			var t = 0;

			severity.every(function(d,i){
				s += severity[i];
				if (s > s_total / 2){
					s_median = i;
					return false;	
				} else { 
					return true;
				}
			});

			// reliability median
			var r = 0;
			var r_median = 0;
			reliability.every(function(d,i){
				r += reliability[i];
				if (r > r_total / 2){
					r_median = i;
					return false;	
				} else { 
					return true;
				}
			});

			var severityAverage = ( (1*severity[5]) + (2*severity[1]) + (3*severity[2]) + (4*severity[3]) + (5*severity[4]) ) / s_total;
			d3.select('#severity_value').text(metadata.severity_units[(Math.round(severityAverage))] + ' ('+ severityAverage.toFixed(1) +')' )
			d3.select('#severity_value').text(metadata.severity_units[s_median].name )
			d3.select('#severityAvg').attr('x',function(d){
				return scale.severity.x(s_median);
			});

			var reliabilityAverage = ( (1*reliability[5]) + (2*reliability[1]) + (3*reliability[2]) + (4*reliability[3]) + (5*reliability[4]) ) / r_total;
			d3.select('#reliability_value').text(metadata.reliability_units[(Math.round(reliabilityAverage))] + ' ('+ reliabilityAverage.toFixed(1) +')' )
			d3.select('#reliability_value').text(metadata.reliability_units[r_median].name )
			d3.select('#reliabiltiyAvg').attr('x',function(d){
				return scale.severity.x(r_median);
			});

			d3.select('#severitySvg').style('visibility', 'visible');
			d3.select('#reliabilitySvg').style('visibility', 'visible');

		} else {

			d3.select('#severitySvg').style('visibility', 'hidden');
			d3.select('#reliabilitySvg').style('visibility', 'hidden');
			d3.select('#severity_value').text('');
			d3.select('#reliability_value').text('');
			d3.selectAll('.severityBar').attr('fill', '#CDCDCD');
			d3.selectAll('.reliabilityBar').attr('fill', '#CDCDCD');
		}
	}

	//**************************
	// update stacked bars
	//**************************
	var updateStackedBars = function(group, dataset, duration = 0){

		// affected groups
		var dat = dataset.filter(function(d){
			return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]));
		});

		var d = d3.nest()
		.key(function(d) { return d[group]; })
		// .rollup(function(leaves) { return leaves.length; })		
		.key(function(d) { if(filters.toggle == 'severity'){ return d.s; } else { return d.r } }).sortKeys(d3.ascending)
		.rollup(function(leaves) { return leaves.length; })		
		.entries(dat);	

		var labels = d3.nest().key(function(d) {
			return d[group];
		}).sortKeys(d3.ascending)
		.rollup(function(leaves) {
			return d3.sum(leaves, function(d) {
				return 1;
			});
		}).entries(dat);

		var rowMax = d3.max(labels, function(d,i){
			return d.value
		});

		scale[group].x.domain([0, rowMax]);// severity/reliability x xcale

	    // reset all bars to zero width
	    d3.selectAll('.'+group+'-bar').attr('width', 0);
		// reset all text labels to zero and hide
		d3.selectAll('.'+group+'-label').text(0).style('opacity', 0);

		labels.forEach(function(dd,ii){
			d3.select('#'+group+dd.key+'label').text(dd.value).style('opacity', 1)
			.style('fill', function(){
				if(filters.toggle == 'severity'){
					return colorNeutral[4];
				} else {
					return colorNeutral[4];
				}
			});
			var row = dd.key;
		});

		d.forEach(function(d,i){
			var key = d.key;
			var wcount = scale[group].paddingLeft;
			var xcount = scale[group].paddingLeft;
			d.values.forEach(function(dd,ii){
				var s = dd.key;
				var id = group+(key)+'s'+(s);
				var w = scale[group].x(dd.value)-wcount;
				d3.select('#'+id )
				.attr('x', xcount)
				.attr('width', w)
				.attr('data-value', dd.value)
				.style('fill', function(){
					if(filters.toggle == 'severity'){
						return colorPrimary[s];
					} else {
						return colorSecondary[s];
					}
				});
				var rect = document.querySelector('#'+id)
				tippy(rect, { 
					content: setBarName(s),
					theme: 'light-border',
					delay: [250,100],
					inertia: false,
					distance: 8,
					allowHTML: true,
					animation: 'shift-away',
					arrow: true,
					size: 'small',
					onShow(instance) {
				        // instance.popper.hidden = instance.reference.dataset.tippy ? false : true;
				        var v = d3.select('#'+id).attr('data-value');
				        if(s>=0)
				        	instance.setContent(setBarName(s, v));
				    }
				});
				xcount = xcount + w;
			});
		});
	}

	var setBarName = function(s,v){
		// if(s==0) return false;
		if(filters.toggle == 'severity'){
			var color = colorPrimary[s];
			var text = metadata.severity_units[s].name;
		} else {
			var color = colorSecondary[s];
			var text = metadata.reliability_units[s].name;
		}
		return '<div style="width: 100px; height: 10px; display: inline; background-color: '+ color + '">&nbsp;&nbsp;</div>&nbsp;&nbsp; ' + text + ' <div style="padding-left: 3px; padding-bottom: 2px; display: inline; font-weight: bold; color: '+ colorNeutral[4] + '; font-size: 9px">' + v + ' entries</div>';
	}
	//**************************
	// update framework
	//**************************
	var updateFramework = function(){
		var d = dataByFramework.filter(function(d){
			return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]));
		});

		d = d3.nest()
		.key(function(d) { return d.framework; })
		.key(function(d) { return d.sc; })
		.rollup(function(leaves) { 
			return { 
				'median_r': d3.median(leaves, function(d,i){return d.r;}), 
				'median_s': d3.median(leaves, function(d,i){return d.s;}), 
				'total': leaves.length, 
			}
		})		
		.entries(d);	

		if(filters.frameworkToggle == 'entries'){
			maxCellSize = d3.max(d, function(dd){
				return d3.max(dd.values, function(ddd){
					return ddd.value.total;
				});
			})
			var cellColorScale = d3.scaleLinear().domain([1,maxCellSize])
			.range([colorNeutral[0], colorNeutral[4]])
			.interpolate(d3.interpolateHcl);
			d3.selectAll('.f-val').text('').style('fill', colorNeutral[4]);
		} else {
			if(filters.toggle == 'severity'){
				maxCellSize = 5;
				d3.select('#toggle1').style('fill', colorPrimary[3]);
				var cellColorScale = d3.scaleSequential().domain([0.2,maxCellSize+1])
				.interpolator(d3.interpolateOrRd);
				// d3.selectAll('.f-val').text('').style('fill', colorPrimary[4]);
			} else {
				maxCellSize = 5;
				d3.select('#toggle1').style('fill', colorSecondary[3]);
				var cellColorScale = d3.scaleSequential().domain([0.2,maxCellSize+1])
				.interpolator(d3.interpolatePuBu);
			}
		}

		d3.selectAll('.cell').style('fill', '#FFF');
		d3.selectAll('.framework-text').text(0).style('visibility', 'hidden').style('fill', '#000');
		d3.selectAll('.f-val').text('');

		d.forEach(function(d,i){
			var sum = d3.sum(d.values, function(d){ return d.value.total});
			d3.select('#f'+d.key+'-val').text(sum);
			var f = d.key;
			d.values.forEach(function(dd,ii){
				var s = dd.key;
				var id = 'f'+(f-1)+'s'+(s-1);
				
				if(filters.frameworkToggle == 'entries'){
					var v = dd.value.total;
				} else {
					if(filters.toggle=='severity'){
						var v = dd.value.median_s.toFixed(1);
					} else {
						var v = dd.value.median_r.toFixed(1);
					}
				}
				// set cell colour
				d3.select('#'+id +'rect').style('fill', function(d){ if(v==0) {return colorNeutral[0]; } else { return cellColorScale(v); } });
				// set the text for all cells
				d3.select('#'+id +'text').text(v).style('visibility', 'hidden')
				.style('fill', function(){
					if((v/maxCellSize)>=0.8){
						return '#FFF';
					} else {
						return '#000';
					}
				});
			});
		});
	}

	//**************************
	// toggle between severity and reliability
	//**************************
	var toggle = function(d){
		d3.select('#framework-toggle').style('fill', colorNeutral[3]);
		if(d != 'severity'){
			// switch to Reliability
			d3.select('#reliabilityToggle').style('opacity', 1);
			d3.select('#severityToggle').style('opacity', 0);
			filters.toggle = 'reliability';
			d3.select('#total_entries').style('color',colorNeutral[3]);
			d3.select('#timechartTitle').text('ENTRIES BY DATE AND BY RELIABILITY');
			d3.selectAll('.eventDrop').style('fill', colorNeutral[3]);
			d3.select('#rightAxisLabel').text('Avg. Reliability');
			d3.select('#rightAxisLabelLine').style('stroke', colorSecondary[3]);
			d3.select('#leftAxisBox').style('fill', colorNeutral[3]);
			d3.select('.selection').style('fill', colorNeutral[3]);
			d3.selectAll('.outerCircle').style('stroke', colorNeutral[3]);
			d3.selectAll('.innerCircle').style('fill', colorNeutral[3]);
			if(filters.frameworkToggle == 'average'){
				d3.select('#framework-toggle').style('fill', colorSecondary[3])
			}
			// update colors of contextual row total values
			d3.selectAll('.total-label').style('fill', colorNeutral[4]);
			d3.select('#dateRange').style('color', colorNeutral[4]);
			d3.select('#avg-line').style('stroke', colorSecondary[3]);
			d3.select('#framework-toggle-text tspan').text('median reliability');
		} else {
			// switch to Severity
			d3.select('#reliabilityToggle').style('opacity', 0);
			d3.select('#severityToggle').style('opacity', 1);	
			filters.toggle = 'severity';
			d3.select('#total_entries').style('color',colorNeutral[3]);
			if(filters.frameworkToggle == 'average'){
				d3.select('#framework-toggle').style('fill', colorPrimary[3]);
			}
			d3.select('#timechartTitle').text('ENTRIES BY DATE AND BY SEVERITY');
			d3.selectAll('.eventDrop').style('fill', colorNeutral[3]);
			d3.select('#rightAxisLabel').text('Avg. Severity');
			d3.select('#rightAxisLabelLine').style('stroke', colorPrimary[3]);
			d3.select('#leftAxisBox').style('fill', colorNeutral[3]);
			d3.select('.selection').style('fill', colorNeutral[3]);
			d3.selectAll('.outerCircle').style('stroke', colorNeutral[3]);
			d3.selectAll('.innerCircle').style('fill', colorNeutral[3]);
			// update colors of contextual row total values
			d3.selectAll('.total-label').style('fill', colorNeutral[4]);
			d3.select('#dateRange').style('color', colorNeutral[4]);
			d3.select('#avg-line').style('stroke', colorPrimary[3]);
			d3.select('#framework-toggle-text tspan').text('median severity');
		}
		updateTimeline();
	}

	function colorBars(){
		d3.selectAll('.barGroup').each(function(d,i){
			var idate = parseInt(d3.select(this).attr('id').slice(4));
			if(((new Date(idate)) >= (dateRange[0]))&&((new Date(idate))< (dateRange[1]))){
				d3.select(this).selectAll('.bar').style('fill', function(d,i){
					if(filters.toggle == 'severity'){
						return colorPrimary[i];
					} else {
						return colorSecondary[i];
					}
				}).style('fill-opacity', 1);

				d3.select(this).selectAll('.eventDrop').style('fill', function(d,i){
					if(filters.toggle == 'severity'){
						return colorNeutral[3];
					} else {
						return colorNeutral[3];
					}
				});
			} else {
				d3.select(this).selectAll('.bar').style('fill', function(d,i){
					return colorLightgrey[i];
				}).style('fill-opacity', 1);
				d3.select(this).selectAll('.eventDrop').style('fill', function(d,i){
					return colorLightgrey[1];
				});
			}
		});
	}

	//**************************
	// resizing
	//**************************
	var scrollable = false;
	window.onresize = function(){
		setTimeout(resizeDevice, 50);
	}
	var resizeDevice = function() {
		// set map height
		var map = document.getElementById("map");
		map.setAttribute("style","height:"+(map.offsetWidth*mapAspectRatio)+"px");
		$('.vizlibResponsiveDiv').each(function(){
			var rDiv = this;
			if($(rDiv).hasClass('vizlibResponsiveDiv')){
				$(rDiv).width('100%');
				var ar = $(rDiv).attr('data-aspectRatio');
				var cWidth = $(rDiv).width();
				var cHeight = $(rDiv).height();
				$(rDiv).height(cWidth/ar);
				if(scrollable == false){
					$(rDiv).height('100%');
					cWidth = $(rDiv).width();
					cHeight = $(rDiv).height();
					if((cWidth/ar)>cHeight){
						$(rDiv).width($(rDiv).height()*ar);
					} else {
						$(rDiv).width('100%');
						$(rDiv).height($(rDiv).width()/ar);
					}
				} else {
					$(rDiv).width('100%');
					var cWidth = $(rDiv).width();
					var cHeight = $(rDiv).height();
					if((cWidth/ar)>cHeight){
						$(rDiv).height($(rDiv).width()/ar);
					} 
				}
			} 
		});
		mapbox.resize();
	}

	// rounding function
	var rounder = function(value){
		var v = Math.abs(value);
		if(v<100){
			return Math.ceil(value/10)*10;
		};
		if(v<500){
			return Math.ceil(value/50)*50;
		};
		if(v<1000) {
			return Math.ceil(value/100)*100;
		}
		if(v<10000){
			return Math.ceil(value/1000)*1000;
		}
		if(v<100000){
			return Math.ceil(value/10000)*10000;
		}
		if(v<1000000){
			return Math.ceil(value/100000)*100000;
		}
		if(v<10000000){
			return Math.ceil(value/1000000)*1000000;
		}
		if(v<100000000){
			return Math.ceil(value/10000000)*10000000;
		}
	}

	// add or remove values from an array if exists
	function addOrRemove(array, value) {
		var index = array.indexOf(value);
		if (index === -1) {
			array.push(value);
		} else {
			array.splice(index, 1);
		}
	}

	var removeFromArray = function(array, elem) {  
		var index = array.indexOf(elem);
		while (index > -1) {
			array.splice(index, 1);
			index = array.indexOf(elem);
		}
	}
}
