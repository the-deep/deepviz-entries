//**************************
// define variables
//**************************
var dateRange  = [new Date(2019, 4, 15), new Date(2019, 7, 31)]; // selected dateRange on load

// use url parameters
var url = new URL(window.location.href);
var minDate;
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

var labelCharLimit = 60;
var textLabel = 'Entries';

var mapbox;
var mapboxToken = 'pk.eyJ1Ijoic2hpbWl6dSIsImEiOiJjam95MDBhamYxMjA1M2tyemk2aHMwenp5In0.i2kMIJulhyPLwp3jiLlpsA';
var lassoActive = false;
var expandActive = false;
var mapToggle = 'bubbles';
// data related
var originalData; // full original dataset without filters (used to refresh/clear filters)
var data; // active dataset after filters applied
var dataByDate;
var metadata;
var dataByMonth;
var dataByYear;
var dataByLocation;
var dataByLocationSum;
var dataByLocationArray;
var dataByContext;
var dataBySector;
var dataByFramework;
var dataByFrameworkSector;
var	databyFrameworkContext;
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
var margin = {top: 18, right: 17, bottom: 0, left: 45};
var timechartHeight = 360;
var timechartHeight2 = timechartHeight;
var timechartHeightOriginal = timechartHeight;
var timechartSvgHeight = 900;
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
var maxMapPolygonValue;
var mapAspectRatio = 1.263;
var geoBounds = {'lat': [], 'lon': []};

// filters
var filters = {
	sector: [],
	severity: [],
	reliability: [],
	affected_groups: [],
	specific_needs: [],
	context: [],
	geo: [],
	toggle: 'severity',
	admin_level: 1,
	frameworkToggle: 'entries',
	time: 'd',
	heatmapCheckbox: false,
	panelLayout: 'default'
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

var Deepviz = function(sources, callback){

	//**************************
	// load data
	//**************************

	// define the data source to be loaded. replace with API URL endpoint
	var files = sources;

	// load each data source
	var promises = [];
	files.forEach(function(url) {
        // Error handle for invalid URL
        if(url.startsWith('http')){
			parsed_url = new URL(url);
	        pathname = parsed_url.pathname;
        } else {
        	pathname = url;
        }
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

		// parse parent locations up to 4 levels
		data.forEach(function(d,i){
			d.geo.forEach(function(dd,ii){

				dd = parseInt(dd);
				d.geo[ii]=dd;

				var parents = [];

				var parent = getParent(dd);
				if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
					parents.push(parent);
				}

				var parent = getParent(parent);
				if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
					parents.push(parent);
				}

				var parent = getParent(parent);
				if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
					parents.push(parent);
				}

				var parent = getParent(parent);
				if((parent>0)&&(!parents.includes(parent))&&(!d.geo.includes(parent))){
					parents.push(parent);
				}

				d.geo.push.apply(d.geo,parents);
			});

		});

		function getParent(geo_id){
			var parent;
			metadata.geo_array.forEach(function(d,i){
				if(geo_id==d.id){
					parent = d.parent;
				}
			})
			return parseInt(parent);
		}

		// remove unsed locations
		var locationArray = [];
		data.forEach(function(d,i){
			d.geo.forEach(function(dd,ii){
				if(!locationArray.includes(parseInt(dd))){
					locationArray.push(parseInt(dd));
				}
			})
		});

		var newGeoArray = [];
		metadata.geo_array.forEach(function(d,i,obj){
			if(locationArray.includes(parseInt(d.id))){
				newGeoArray.push(d);
			}	
		})

		metadata.geo_array = newGeoArray;

		// parse meta data, create integer id column from string ids and programattically attempt to shorten label names
		metadata.context_array.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
		});
		metadata.framework_groups_array.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
			d._context_id = d.context_id;
			// programattically shorten a long framework label
			if(d.name== "Status of essential infrastructure, systems, markets and networks"){
				d.name = "Infrastructure, systems, markets and networks";
			}
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
			// shorten label by cutting text after the first full-stop
			d.name = d.name.split('.')[0];
		});
		metadata.reliability_units.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
		});

		metadata.geo_array.sort(function(x, y){
		   return d3.ascending(x.name, y.name);
		});

		metadata.geo_json = {"type": "FeatureCollection", "features": []};
		metadata.geo_json_point = {"type": "FeatureCollection", "features": []};

		metadata.geo_array.forEach(function(d,i){
			d._id = d.id;
			d.id = i+1;
			var polygons = d.polygons;
			polygons.coordinates = polygons.coordinates;
			var feature = {'type':'Feature', 'properties':{'name': d.name, 'id': d.id, 'admin_level': d.admin_level}, 'geometry': polygons }
			metadata.geo_json.features[i] = feature;
			var point = { "type": "Point", "coordinates": [ d.centroid[0],d.centroid[1],0.0 ] }
			var featurePoint = {'type':'Feature', 'properties':{'name': d.name, 'id': d.id, 'admin_level': d.admin_level}, 'geometry': point }
			metadata.geo_json_point.features[i] = featurePoint;
		});

		metadata.geo_json.features.forEach(function(feature) {
		   if(feature.geometry.type == "MultiPolygon") {
		     feature.geometry.coordinates.forEach(function(polygon) {
		       polygon.forEach(function(ring) {
		         ring.reverse();
		       })
		     })
		   }
		   else if (feature.geometry.type == "Polygon") {
		     feature.geometry.coordinates.forEach(function(ring) {
		       ring.reverse();
		     })  
		   }
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
		});

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
						if(!d.geo.includes(ddd.id)){d.geo.push(ddd.id);};
						geoBounds.lat.push(ddd.bounds[0][0]);
						geoBounds.lat.push(ddd.bounds[1][0]);
						geoBounds.lon.push(ddd.bounds[0][1]);
						geoBounds.lon.push(ddd.bounds[1][1]);
					}
				});
			});

		});

		// parse url variable options
		if(urlQueryParams.get('minDate')){
			minDate = new Date(urlQueryParams.get('minDate'));
			minDate.setHours(0);
			minDate.setMinutes(0);
			data = data.filter(function(d){
				return d.date >= minDate;
			})
		}

		// parse url variable options
		if(urlQueryParams.get('maxDate')){
			maxDate = new Date(urlQueryParams.get('maxDate'));
			maxDate.setHours(0);
			maxDate.setMinutes(0);
			data = data.filter(function(d){
				return d.date <= maxDate;
			})
		}


		if(urlQueryParams.get('time')){
			filters.time=urlQueryParams.get('time');
		}

		if(urlQueryParams.get('admin_level')){
			filters.admin_level=parseInt(urlQueryParams.get('admin_level'));
		}

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

		var today = new Date();
		if(maxDate<today){
			maxDate = today;
		};

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
	    .range([0, (width - (margin.right + margin.left))])
	    .nice();

	    scale.trendline.x = d3.scaleTime()
	    .domain([0, dataByDate.length-1])
	    .range([0, (width - (margin.right + margin.left))])
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

		dataByFrameworkSector = [];
		dataBySector = [];
		dataByFramework = [];
		dataByAffectedGroups = [];
		dataBySpecificNeeds = [];
		dataByLocationArray = [];
		var dataByContextArray = [];
		dataByFrameworkContext = [];

		data.forEach(function(d,i){

			var frameworks = [];
			var contexts = [];
			var sectors = [];

			d.sector.forEach(function(dd,ii){
				var c = dd[0];
				var f = dd[1];
				var s = dd[2];
				// data by sector (non-unique) for framework cells
				dataByFrameworkSector.push({"date": d.date, "context": c, "framework": f, "sector": s, 's': d.severity, 'r': d.reliability});
				// unique entries by framework
				var frameworkRow = {"date": d.date, "context": c, "framework": f, 's': d.severity, 'r': d.reliability};
				if(!frameworks.includes(f)){
					dataByFramework.push(frameworkRow);
					frameworks.push(f);
				}
				// unique entries by context
				var contextRow = {"date": d.date, "context": c, 's': d.severity, 'r': d.reliability};
				if(!contexts.includes(c)){
					dataByFrameworkContext.push(contextRow);
					contexts.push(c);
				}
				// unique entries by sector
				var sectorRow = {"date": d.date, "sector": s, 's': d.severity, 'r': d.reliability};
				if(!sectors.includes(s)){
					dataBySector.push(sectorRow);
					sectors.push(s);
				}
			});

			d.geo.forEach(function(dd,ii){
				var adm = null;
				metadata.geo_array.forEach(function(d,i){
					if(dd==d.id){
						adm = d.admin_level;
					}
				})
				dataByLocationArray.push({"date": d.date, "month": d.month, "year": d.year, "geo": dd, "admin_level": adm, 's': d.severity, 'r': d.reliability });
			});

			d.context.forEach(function(dd,ii){
				dataByContextArray.push({"date": d.date, "month": d.month, "year": d.year, "context": dd, 's': d.severity, 'r': d.reliability})
			});

			d.special_needs.forEach(function(dd,ii){
				dataBySpecificNeeds.push({"date": d.date, "specific_needs": dd, 's': d.severity, 'r': d.reliability})
			});

			d.affected_groups.forEach(function(dd,ii){
				dataByAffectedGroups.push({"date": d.date, "affected_groups": dd, 's': d.severity, 'r': d.reliability})
			});

		});

		dataByLocation = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.geo; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(dataByLocationArray);

		// entries by framework sector (non-unique to populate framework cells)
		dataByContext = dataByContextArray;

		if(filters.frameworkToggle=='average'){
			var dataByContextNullEntries = dataByContext.filter(function(d){
				if(filters.toggle=='severity'){
					return d.s==0;
				} else {
					return d.r==0
				}
			});
			dataByContext = dataByContext.filter(function(d){
				if(filters.toggle=='severity'){
					return d.s>0;
				} else {
					return d.r>0;
				}
			});
		} 

		if(filters.time=='d'){

			dataByContext = d3.nest()
			.key(function(d) { return d.date; })
			.key(function(d) { return d.context; })
			.rollup(function(leaves) { 
				return { 
					'median_r': d3.median(leaves, function(d,i){return d.r;}), 
					'median_s': d3.median(leaves, function(d,i){return d.s;}), 
					'total': leaves.length, 
				}
			})		
			.entries(dataByContext);	

		}

		if(filters.time=='m'){

			dataByLocation = d3.nest()
			.key(function(d) { return d.month;})
			.key(function(d) { return d.geo; })
			.rollup(function(leaves) { return leaves.length; })
			.entries(dataByLocationArray);

			dataByContext = d3.nest()
			.key(function(d) { return d.month; })
			.key(function(d) { return d.context; })
			.rollup(function(leaves) { 
				return { 
					'median_r': d3.median(leaves, function(d,i){return d.r;}), 
					'median_s': d3.median(leaves, function(d,i){return d.s;}), 
					'total': leaves.length, 
				}
			})		
			.entries(dataByContext);		
		}

		if(filters.time=='y'){

			dataByLocation = d3.nest()
			.key(function(d) { return d.year;})
			.key(function(d) { return d.geo; })
			.rollup(function(leaves) { return leaves.length; })
			.entries(dataByLocationArray);

			dataByContext = d3.nest()
			.key(function(d) { return d.year; })
			.key(function(d) { return d.context; })
			.rollup(function(leaves) { 
				return { 
					'median_r': d3.median(leaves, function(d,i){return d.r;}), 
					'median_s': d3.median(leaves, function(d,i){return d.s;}), 
					'total': leaves.length, 
				}
			})		
			.entries(dataByContext);	
		}

		maxContextValue = d3.max(dataByContext, function(d) {
			var m = d3.max(d.values, function(d) {
				return d.value.total;
			})
			if(new Date(d.key)<=new Date(maxDate)){
				return m;
			}
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
				contextArr[b] = {'median_r': null, 'median_s': null, 'total': 0 };
			}

			d.context = contextArr;

			dataByContext[i] && dataByContext[i].values.forEach(function(dx, ii){
				var k = dx.key-1;
				contextArr[k] = dx.value;
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
		    // without null
		    d.trendline_severity_avg = ( (1*d.severity[1]) + (2*d.severity[2]) + (3*d.severity[3]) + (4*d.severity[4]) + (5*d.severity[5]) ) / (count- parseInt(d.severity[0]))   ;
		    d.trendline_reliability_avg = ( (1*d.reliability[1]) + (2*d.reliability[2]) + (3*d.reliability[3]) + (4*d.reliability[4]) + (5*d.reliability[5]) ) / (count- parseInt(d.reliability[0])) ;

		    if((count-parseInt(d.severity[0]))==0){
		    	d.trendline_severity_avg = null;
		    }
		    if((count-parseInt(d.reliability[0]))==0){
		    	d.trendline_reliability_avg = null;
		    }

		    trendlinePoints.push({date: d.date, "severity_avg": d.trendline_severity_avg, "reliability_avg": d.trendline_reliability_avg });
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

		updateTotals();
		DeepvizFramework.updateFramework();
		BarChart.updateStackedBars('affected_groups', dataByAffectedGroups);
		BarChart.updateStackedBars('specific_needs', dataBySpecificNeeds);
		BarChart.updateStackedBars('sector', dataBySector);
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
		.attr('width',options.width)
		.attr('height', timechartSvgHeight)
		.append('g')
		.attr("transform", "translate(0,0)");

		var width_new = options.width - (margin.right + margin.left);
		timechartHeight2 = timechartHeight - (margin.top + margin.bottom);

		maxValue = d3.max(dataByDate, function(d) {
			return d.total_entries;
		});

		// define maximum date 
		maxDate = new Date(d3.max(data, function(d){
			return d.date;
		}));

		var maxEntriesDate = maxDate;

		var today = new Date();
		if(maxDate<today){
			maxDate = today;
		};

		if(urlQueryParams.get('maxDate')){
			maxDate = new Date(urlQueryParams.get('maxDate'));
			maxEntriesDate = maxDate;
		}	

		maxDate.setHours(0);
		maxDate.setMinutes(0);
		
		// define minimum date 
		minDate = new Date(d3.min(originalData, function(d){
			return d.date;
		}));

		if(urlQueryParams.get('minDate')){
			minDate = new Date(urlQueryParams.get('minDate'));
		}	

		minDate.setHours(0);
		minDate.setMinutes(0);

		if(timechartInit==0){
			if(filters.time=='d'){
				maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth()+1, 1);
				minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
				dateRange[0] = new Date(maxEntriesDate.getFullYear(), maxEntriesDate.getMonth(), 1);
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
			today.setHours(0,0,0,1);
			var thisYear = today.getFullYear();

			var md = new Date(today.getFullYear(), today.getMonth()+1, 0);
			if(md>=new Date(maxDate.getFullYear(), maxDate.getMonth()+1, 0)){
				md = new Date(moment(maxDate).subtract(1,'days'));
			}

			var ranges = {};

			if(maxDate>today){
				ranges['Today'] = [moment(), moment()];
			}

			if(maxDate>moment().subtract(1, 'days')){
				ranges['Yesterday'] = [moment().subtract(1, 'days'), moment().subtract(1, 'days')];
			}

			ranges['Last Week'] = [new Date(moment().subtract(7,'days')), moment()],

			ranges['Last 30 Days'] = [moment(new Date()).subtract(29, 'days'), now];

			ranges['Last Month'] = [new Date(today.getFullYear(), today.getMonth()-1, 1), new Date(today.getFullYear(), today.getMonth(), 0)],
			ranges['Last 3 Months'] = [new Date(today.getFullYear(), today.getMonth()-2, 1), md],
			ranges['Last 6 Months'] = [new Date(today.getFullYear(), today.getMonth()-5, 1), md]

			if(md.getFullYear()>=today.getFullYear() ) {
				ranges['This Year'] = [new Date(today.getFullYear(), 0, 1), moment(maxDate).subtract(1,'days')];
			}

			if(minDate.getFullYear()<=(today.getFullYear()-1)){
				var max = new Date(today.getFullYear()-1, 12, 0);
				if(maxDate<=max){
					max = moment(maxDate).subtract(1,'days');
				}
				ranges['Last Year'] = [new Date(today.getFullYear()-1, 0, 0), max];
			}

			var now = moment(); 
			if(maxDate<=now){
				now = moment(maxDate).subtract(1,'days');
			}

			// 1 may 2020
			var thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
			// 1 apr 2020
			var maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
			if( maxMonth > thisMonth) ranges['This Month'] = [new Date(today.getFullYear(), today.getMonth(), 1), moment(maxDate).subtract(1,'days')];

			if(maxDate.getFullYear<=now){
				now = moment(maxDate).subtract(1,'days');
			}

			$('#dateRange').daterangepicker({
				"locale": {
					"format": "DD MMM YYYY",
				},
				showDropdowns: true,
				showCustomRangeLabel: false,
				alwaysShowCalendars: true,
				ranges: ranges,
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

		// define horizontal scale
		scale.timechart.x = d3.scaleTime()
	    .domain([minDate, maxDate])
	    .range([0, (options.width - (margin.right + margin.left))])

		var svgBg = svg.append('g').attr('id', 'svgBg');

		svgBg.append('rect')
		.attr('x',margin.left)
		.attr('y',margin.top)
		.attr('width',width_new)
		.attr('height',timechartHeight2)
		.attr('opacity',0);

		//**************************
		// setup svg layers
		//**************************
		var gridlines = svgBg.append('g').attr('id', 'gridlines').attr('class', 'gridlines').attr('transform', 'translate('+(margin.left+0)+','+margin.top+')');
		var svgChartBg = svg.append('g').attr('id', 'svgchartbg').attr('class', 'chartarea').attr('transform', 'translate('+(margin.left+0)+','+margin.top+')');
		
		var chartAreaParent = svg.append('g').attr('id', 'chart-area-parent').attr('transform', 'translate('+(margin.left+0)+','+margin.top+')');

		var chartAreaSvg = chartAreaParent
		.append('svg')
		.attr('id', 'chart-area-svg')
		.attr('preserveAspectRatio', 'none')
		.attr('viewBox', '0 0 '+options.width+' '+timechartSvgHeight);

		var svgChart = chartAreaSvg
		.append('g')
		.attr('id', 'chartarea')
		.style('opacity', 1);

		// right chart - white rect masks
		svg
		.append('rect')
		.attr('height', timechartSvgHeight)
		.attr('width', 35)
		.attr('x', options.width-18)
		.attr('y',margin.top)
		.style('fill', '#FFF')
		.style('fill-opacity',1);

		// svg
		// .append('line')
		// .attr('y1',  timechartHeight2+margin.top+1)
		// .attr('y2', margin.top)
		// .attr('stroke-width', 1)
		// .attr('x1', options.width-margin.right)
		// .attr('x2', options.width-margin.right)
		// .style('stroke', '#ebebeb');

		var svgEventDrop = svg.append('g')
		.attr('id', 'eventdrop')
		.attr('transform', 'translate('+(margin.left+0)+','+margin.top+')')
		.style('opacity', 1);

		var topLayer = svg.append('g')
		.attr('id', 'toplayer')
		.attr('transform', 'translate('+(margin.left+0)+','+margin.top+')')
		.style('opacity', 1);

		var svgAxisBtns = svg.append('g').attr('id', 'svgAxisBtns').attr('transform', 'translate('+(margin.left+0)+','+(timechartSvgHeight-38+8)+')');

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
		.text('Total '+textLabel)

		timechartLegend
		.append("rect")
		.attr('id', 'leftAxisBox')
		.attr("y", 6)
		.attr("x", 5)
		.attr('width', 10)
		.attr('height', 10)
		.style('fill', colorNeutral[3]);

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

		var yAxisText2 = svg.append("g")
		.attr("class", "yAxis axis")
		.attr('transform', 'translate('+(width_new + margin.left-1)+','+margin.top+')')
		.style('font-size', options.yAxis.font.values.size);

		yAxisText2
		.append("text")
		.attr('class','axisLabel1')
		.attr("y", timechartHeight2+4)
		.attr("x", 8)
		.style('font-weight','normal')
		.style('font-size', '15px')
		.style('fill', '#000')
		.text('1')

		yAxisText2
		.append("text")
		.attr('class','axisLabel1')
		.attr("y", 4)
		.attr("x", 8)
		.style('font-weight','normal')
		.style('font-size', '15px')
		.style('fill', '#000')
		.text('5');

		yAxisText2
		.append('text')
		.attr('id','trendLineAxisLabel')
		.text('SEVERITY')
		.attr('transform', 'rotate(270)')
		.attr('x', ( -timechartHeight2/2)-10)
		.attr('y', 16)
		.style('font-size', '15px')
		.style('font-weight', 'normal')
		.style('fill', '#767676')
		.style('opacity',0)

		// add the Y gridline
		timechartyGrid = d3.axisLeft(scale.timechart.y1)
		.ticks(4)
		.tickSize(-options.width+52)
		.tickFormat("")

		gridlines.append("g")			
		.attr("class", "grid")
		.attr('id', 'timechartyGrid')
		.call(timechartyGrid);

		d3.select('#timechartyGrid')
		.transition()
		.call(timechartyGrid);

		//**************************
		// x-axis
		//**************************

		var xAxis = d3.axisBottom()
		.scale(scale.timechart.x)
		.tickSize(0)
		.tickPadding(6);

		var xAxisTop = d3.axisBottom()
		.scale(scale.timechart.x)
		.tickSize(0)

		var textLength = '5%';
		if(expandActive==true) textLength = '3.3%';

		if(filters.time=='y'){
			xAxis.ticks(d3.timeYear.every(1))
			.tickFormat(d3.timeFormat("%Y"));
			xAxisTop.ticks(d3.timeYear.every(1))
			.tickFormat(d3.timeFormat("%d %b %Y"));
			var textLength = '3%';
			if(expandActive==true) textLength = '2%';
		} else {
			var months = monthDiff(minDate, maxDate);
			if(months<=5){
				xAxis.ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b %Y"));
				xAxisTop.ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%d %b %Y"));
			} else {
				xAxis.ticks(10).tickFormat(d3.timeFormat("%b %Y"));
				xAxisTop.ticks(10).tickFormat(d3.timeFormat("%d %b %Y"))

			}
		}

		// x-axis top
		var xAxisObjTop = chartAreaSvg.append("g")
		.attr("class", "xAxis2 axis")
		.attr("transform", "translate(" + -0.5 + "," + (timechartHeight2) + ")")
		.call(xAxisTop);

		xAxisObjTop.selectAll(".tick")
		.append('line')
		.attr('class', 'xAxisHorizontalLine')
		.attr('x1', 0)
		.attr('x2', 0)
		.attr('y1', -(timechartSvgHeight-timechartHeight2-margin.top-39))
		.attr('y2', 0)
		.attr('vector-effect', 'non-scaling-stroke');

		xAxisObjTop.selectAll(".tick text")
		.attr("transform", "translate(" + 0 + ", "+-timechartHeight2+")")
		.attr('lengthAdjust', 'spacingAndGlyphs')
		.attr('text-anchor', 'start')
		.attr('text-align', 'left')
		.attr('textLength', '6.5%')
		.attr('font-variant', 'small-caps')
		.attr('x', '0.3%');

		// x-axis bottom
		var xAxisObj = svgBg.append("g")
		.attr("class", "xAxis axis")
		.attr("transform", "translate(" + margin.left + "," + (timechartSvgHeight-38) + ")")
		.call(xAxis)
		.style('font-weight', 'normal')
		.style('fill', 'green');

		xAxisObj
		.selectAll('path, line')
		.style('opacity', 1 )
		.style('stroke', '#535353' )
		.style('stroke-width', 1);

		xAxisObj.selectAll(".tick line, text")
		.attr("transform", "translate(" + 38 + ", 3)")
		.attr('font-variant', 'small-caps')

		xAxisObj.selectAll(".tick")
		.append('line')
		.attr('class', 'xAxisHorizontalLine')
		.attr('x1', 0)
		.attr('x2', 0)
		.attr('y1', -(timechartSvgHeight-timechartHeight2-margin.top-39))
		.attr('y2', 22)

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

		var updatingTopAxis = false;
		var updateTopAxisInterval = 100;
		var axisRange = 'every month';
		updateTopAxis = function(){

			var count = (Math.abs(moment(dateRange[1]).diff(moment(dateRange[0]), 'months', true)));

			if((count<=0.4)){
				if(axisRange=='single day') return; // if already 'single month' then break out of fn
				// console.log('updateTopAxis to single day');
				var ticks = d3.timeDay.every(1);
				axisRange = 'single day';
			}

			else if((count>0.4)&&(count<=2)){
				if(axisRange=='single month') return; // if already 'single month' then break out of fn
				// console.log('updateTopAxis to single month');
				var ticks = d3.timeWeek.every(1);
				axisRange = 'single month';
			}

			else if((count>2)&&(count<=10)){
				if(axisRange=='every month') return; // if already 'every month' then break out of fn
				// console.log('updateTopAxis to every month');
				var ticks = d3.timeMonth.every(1);
				axisRange = 'every month';
			}

			else if((count>10)){
				if(axisRange=='every 3 months') return; // if already 'every month' then break out of fn
				// console.log('updateTopAxis to every 3 months');
				var ticks = d3.timeMonth.every(3);
				axisRange = 'every 3 months';
			}

			xAxisTop
			.tickFormat(d3.timeFormat("%d %b %Y"))
			.ticks(ticks);
					
			d3.select('.xAxis2')
			.call(xAxisTop);

			xAxisObjTop.selectAll(".tick")
			.append('line')
			.attr('class', 'xAxisHorizontalLine')
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', -(timechartSvgHeight-timechartHeight2-margin.top-39))
			.attr('y2', 0)
			.attr('vector-effect', 'non-scaling-stroke');

			xAxisObjTop.selectAll(".tick text")
			.attr("transform", "translate(" + 0 + ", "+-timechartHeight2+")")
			.attr('lengthAdjust', 'spacingAndGlyphs')
			.attr('text-anchor', 'start')
			.attr('text-align', 'left')
			.attr('textLength', '6%')
			.attr('font-variant', 'small-caps')
			.attr('x', '0.3%');

			updatingTopAxis = false;

		}

		updateTopAxis();

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
		.attr('data-value', function(d,i){
			return d;
		})		
		.attr('fill', function(d,i){
			if(filters.toggle=='severity'){
				return colorPrimary[i];
			} else {
				return colorSecondary[i];
			}
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
			return w;
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
		})
		.on('click', function(d,i){
			clickTimer = 1;
			Deepviz.filter(filters.toggle,i);
			setTimeout(function(){ clickTimer = 0 }, 2000);
		});
		var placement = 'top';
		if(filters.time=='d') placement = 'top-start';

		tippy('.bar', { 
			// content: setBarName(s),
			theme: 'light-border',
			delay: [250,100],
			inertia: false,
			distance: 8,
			allowHTML: true,
			animation: 'shift-away',
			placement: placement,
			delay: [600, 100],
			arrow: true,
			size: 'small',
			onShow(instance) {
		        var v = d3.select(instance.reference).attr('data-value');
		        d3.select(instance.reference).style('stroke', 'grey').style('stroke-opacity', 0.2).attr('vector-effect', 'non-scaling-stroke');
		        // get severity/reliability id
		        var parentId = d3.select(instance.reference.parentNode).attr('id');
		        var date = new Date(parseInt(parentId.slice(4)));
        		if(filters.time=='d'){
        			var dateformatter = d3.timeFormat("%d %b %Y");
				}

				if(filters.time=='m'){
					var dateformatter = d3.timeFormat("%b %Y");
				}

				if(filters.time=='y'){
					var dateformatter = d3.timeFormat("%Y");
				}
				date = dateformatter(date);
		        var s = parseInt(instance.reference.classList[1][instance.reference.classList[1].length-1])-1;
				if (filters.toggle=='severity'){
					var color = colorPrimary[s];
					var text = metadata.severity_units[s].name;
				} else {
					var color = colorSecondary[s];
					var text = metadata.reliability_units[s].name;
				}
				var html = '<div style="text-align: left; font-weight: bold;">'+date+'</div>';
				html += '<div style="width: 100px; height: 10px; display: inline; background-color: '+ color + '">&nbsp;&nbsp;</div>&nbsp; ' + text + ' <div style="padding-left: 3px; padding-bottom: 2px; display: inline; color: '+ colorNeutral[4] + '; font-size: 9px"><b>' + v + ' '+textLabel+'</b></div>';
	        	instance.setContent(html);
			},
			onHide(instance) {
		        d3.select(instance.reference).style('stroke', 'cyan').style('stroke-opacity', 0);
			}
		});


		//**************************
		// draw trendline
		//**************************
		var trendline = d3.select('#chartarea')
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
		})
		.attr('vector-effect', 'non-scaling-stroke');

		// *************************
		// draw contextual rows
		//**************************

		var timechart = d3.select('#timeChart');
		var yPadding = 20;

		var contextualRows = svgChartBg.append('g')
		.attr('id', 'contextualRows')
		.attr('transform', 'translate(0,'+ (timechartHeightOriginal + yPadding - 38 ) + ')');

		var contextualRowsHeight = timechartSvgHeight - timechartHeightOriginal - yPadding - 17;

		var title = contextualRows.append('text')
		.text('CONTEXT')
		.attr('transform', 'rotate(270)')
		.attr('x', -contextualRowsHeight/2 - 20)
		.attr('y', -20)
		.style('font-size', '23px')
		.style('font-weight', '300')
		.style('fill', '#CCCCCC');

		contextualRows.append('rect')
		.attr('height', contextualRowsHeight)
		.attr('width', options.width-60)
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

		// svg.append('rect')
		// .attr('height', timechartSvgHeight)
		// .attr('width', 35)
		// .attr('x', options.width-16)
		// .attr('y',6)
		// .style('fill', '#FFF')
		// .style('fill-opacity',1);

		var contextualRowHeight = contextualRowsHeight/numContextualRows;

		var rows = contextualRows.selectAll('.contextualRow')
		.data(metadata.context_array)
		.enter()
		.append('g')
		.attr('class', 'contextualRow')
		.attr('transform', function(d,i){
			return 'translate(0,'+(i*(contextualRowHeight)) + ' )' ;
		})

		rows
		.append('line')
		.attr('class', 'contextualRowLine')
		.attr('x1',0)
		.attr('x2',options.width)
		.attr('y1', 0)
		.attr('y2', 0);

		// row title
		rows.append('text').text(function(d,i){
			return d.name.toUpperCase();
		})
		.attr('class', 'label')
		.attr('y',18)
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
		.attr('y',18)
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
				Deepviz.redrawTimeline();
			}
			filters.time = v;
			d3.selectAll('.time-select rect').style('fill', colorGrey[2]);
			d3.select('#time-select-'+filters.time+ ' rect').style('fill', colorNeutral[4]);
		})

		d3.select('#time-select-'+filters.time+ ' rect').style('fill', colorNeutral[4]);

		//**************************
		// create event drops
		//**************************

		maxContextValue = d3.max(dataByContext, function(d) {
			var m = d3.max(d.values, function(d) {
				return d.value.total;
			})
			if(new Date(d.key)<=new Date(maxDate)){
				return m;
			}
		});

		scale.eventdrop = d3.scaleLinear()
		.range([0,12])
		.domain([0,maxContextValue]);

		var eventDropGroup = svgEventDrop.append('g').attr('id', 'event-drop-group');

		var eventDrops = eventDropGroup.selectAll(".eventDropGroup")
		.data(dataByContext)
		.enter()
		.append('g')
		.attr('id', function(d,i){
			var dt = d.key = new Date(d.key);
			dt.setHours(0,0,0,0);
			return 'date'+dt.getTime();
		})
		.attr("class", "eventDropGroup")
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
		.attr("transform", function(d,i) { if(i==1){barWidth+=scale.timechart.x(d.key);} return "translate(" + scale.timechart.x(d.key) + ",-38)"; });
		
		// event mask groups (to be used for event drop grey brush mask)
		var eventDropGroup = eventDrops.append('g');

		var eventDrops = eventDropGroup.selectAll('.eventDrop')
		.data(function(d,i){ return d.values;})
		.enter()
		.append('circle')
		.attr('id', function(d,i){
			var parent = d3.select(this.parentNode).datum();
			var dt = new Date(parent.key);
			dt.setHours(0,0,0,0);
			return 'event-drop-'+(d.key)+'-'+dt.getTime();
		})
		.attr('class', 'eventDrop')
		.attr('r', function(d){
			var t = 0;
			if(d) t = d.value.total;
			return scale.eventdrop(t);
		})
		.attr('cx', function(d,i){
				var w = d3.select(this.parentNode.parentNode).attr('data-width');
				return (w/2);
			})
		.attr('cy', function(d,i){
			return timechartHeight2 + (contextualRowHeight*(d.key))+19;
		})
		.style('fill', function(d,i){
			if(filters.frameworkToggle == 'average'){
				if(filters.toggle == 'reliability'){
					return colorSecondary[Math.round(d.value.median_r)];
				} else { // primary fallback
					return colorPrimary[Math.round(d.value.median_s)];
				} 
			} else {
				return colorNeutral[3];
			}
		})

		//**************************
		// date slider brushes
		//**************************
	    // initialise the brush
	    brush = d3.brushX()
	    .extent([[scale.timechart.x(minDate), -margin.top], [scale.timechart.x(maxDate), timechartSvgHeight-(margin.top+margin.bottom)]])
	    .on("start", dragging)
	    .on("brush", dragging)
	    .on("end", dragged);

	    // add the selectors
	    gBrush = topLayer.append("g")
	    .attr('id', 'gBrush')
	    .attr("class", "brush")
	    .attr('transform', 'translate('+(2)+','+(timechartHeight2+18)+')')
	    .call(brush);

		d3.selectAll('.handle rect').attr('fill-opacity', '1').style('visibility', 'visible').attr('width', 2).attr('fill', '#000').style('stroke-opacity', 0);

	    // add the triangle handles (top)
	    var handleTop = gBrush.selectAll(".handle--custom-top")
	    .data([{type: "w"}, {type: "e"}])
	    .enter().append("g")
	    .attr('class', 'handleG');

	    // handleTop.append('path')
	    // .attr("class", "handle--custom-top")
	    // .attr("stroke", "#000")
	    // .attr('stroke-width', 3)
	    // .attr('fill', '#000')
	    // .attr("cursor", "ew-resize")
	    // .attr("d", 'M -8,0 -1,11 6,0 z')
	    // .attr('transform', 'translate(0,1)')

	    handleTop.append('rect')
	    .attr('x',-5)
	    .attr('width', 0)
	    .attr('height', (timechartSvgHeight-timechartHeight2))
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
	    .attr("d", 'M -8,0 -1,-11 6,0 z');

	    d3.selectAll('#toplayer .handle').attr('transform', 'translate(0,3)')

	    // no data fallback
		if(data.length==0) return false; 

	    handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", -" + margin.top + ")"; });
	    handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", " + ((timechartSvgHeight-timechartHeight2-20) - margin.top) + ")"; });

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

		    update();
		});

		 // keyboard pagination
		var k = 0;
		document.body.onkeyup = function(e){

			var unit = 'day';
			if(filters.time=='m') unit = 'month';
			if(filters.time=='y') unit = 'year';

		     if(e.keyCode == 37){ // arrow left
	        	if((dateRange[0]>minDate)||(e.shiftKey)){
	        		if(e.shiftKey){
	        			var d = new Date(moment(dateRange[1]).subtract(1, unit));
	        			if(d>dateRange[0]){
				        	dateRange[1] = d;
				        }
			        } else {
			        	dateRange[0] = new Date(moment(dateRange[0]).subtract(1, unit));
			        	dateRange[1] = new Date(moment(dateRange[1]).subtract(1, unit));
			        }
			    	gBrush.call(brush.move, dateRange.map(scale.timechart.x));	
			    	update();	        		
	        	}
		    }

		    if(e.keyCode == 39){ // arrow right
	        	if(dateRange[1]<maxDate){
	        		if(e.shiftKey){
			        	dateRange[1] = new Date(moment(dateRange[1]).add(1, unit));
	        		} else {
	        			dateRange[0] = new Date(moment(dateRange[0]).add(1, unit));
			        	dateRange[1] = new Date(moment(dateRange[1]).add(1, unit));
	        		}
			    	gBrush.call(brush.move, dateRange.map(scale.timechart.x));	
			    	update();	
	        	}
		    }

		    if(e.keyCode == 77){ // M
		    	dateKey('m');
		    }

		    if(e.keyCode == 68){ // D
		    	dateKey('d');
		    }

		    if(e.keyCode == 89){ // Y
		    	dateKey('y');
		    }

		    if(e.keyCode == 67){ // C
		    	Deepviz.filter('clear', 'clear');
		    }

		    if(e.keyCode == 8){ // BACKSPACE
		    	Deepviz.filter('clear', 'clear');
		    }

		    if(e.keyCode == 27){ // ESC
		    	Deepviz.filter('clear', 'clear');
		    }

		    if(e.keyCode == 49){ // 1
		    	Deepviz.filter(filters.toggle, 1);
		    }

		    if(e.keyCode == 50){ // 2
		    	Deepviz.filter(filters.toggle, 2);
		    }

		    if(e.keyCode == 51){ // 3
		    	Deepviz.filter(filters.toggle, 3);
		    }

		    if(e.keyCode == 52){ // 4
		    	Deepviz.filter(filters.toggle, 4);
		    }

		    if(e.keyCode == 53){ // 5
		    	Deepviz.filter(filters.toggle, 5);
		    }

		    function dateKey(v){
				if(v!=filters.time){
					filters.time = v;
					Deepviz.redrawTimeline();
				}
				d3.selectAll('.time-select rect').style('fill', colorGrey[2]);
				d3.select('#time-select-'+filters.time+ ' rect').style('fill', colorNeutral[4]);
		    }

		}

	    function update(){
	    	// colorBars();
	    	updateDate();
	    	updateTotals();
	    	updateSeverityReliability('brush', 500);
			Map.update();
	    	DeepvizFramework.updateFramework();
	    	BarChart.updateStackedBars('affected_groups', dataByAffectedGroups);
	    	BarChart.updateStackedBars('specific_needs', dataBySpecificNeeds);
	    	BarChart.updateStackedBars('sector', dataBySector);

	    	handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", -"+ margin.top +")"; });
	    	handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", " + ((timechartSvgHeight-timechartHeight2-20) - margin.top) + ")"; });
	    }

	    // programattically set date range
	    gBrush.call(brush.move, dateRange.map(scale.timechart.x));
	    // function to handle the changes during slider dragging
	    function dragging() {

	    	if($('#dateRange').data('daterangepicker'))
	    	$('#dateRange').data('daterangepicker').hide();
	    	// if not right event then break out of function
	    	// if(d3.event.sourceEvent.type === "start") return;
	    	// if(d3.event.sourceEvent.type === "click") return;
	    	if(d3.event.sourceEvent) if(d3.event.sourceEvent.type === "brush") return;
	    	var d0 = d3.event.selection.map(scale.timechart.x.invert);
	    	var count = 0;
			if(filters.time=='d'){
				count = Math.round(Math.abs((d0[0] - d0[1]) / (24 * 60 * 60 * 1000)));
				if(count<1)count = 1;
				var d1 = d0.map(d3.timeDay.round);
				d1[1] = moment(d1[0]).add(count,'days')
			}
			if(filters.time=='m'){
				count = Math.round(Math.abs(moment(d0[1]).diff(moment(d0[0]), 'months', true)));
				if(count<1)count = 1;
				var d1 = d0.map(d3.timeMonth.round);
				d1[1] = moment(d1[0]).add(count,'month');
			}
			if(filters.time=='y'){
				count = Math.round(Math.abs(moment(d0[1]).diff(moment(d0[0]), 'years', true)));
				if(count<1)count = 1;
				var d1 = d0.map(d3.timeYear.round);
				d1[1] = moment(d1[0]).add(count,'years');
			}

			dateRange = d1;

			colorBars();
			updateDate();
			updateTotals();
			if(!urlQueryParams.get('disableSync')){
					DeepvizFramework.updateFramework();
					Map.update();
					updateSeverityReliability('brush');
			}
			// BarChart.updateStackedBars('affected_groups', dataByAffectedGroups);
			// BarChart.updateStackedBars('specific_needs', dataBySpecificNeeds);
			// BarChart.updateStackedBars('sector', dataBySector);

			handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", -"+ margin.top +")"; });
			handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", " + ((timechartSvgHeight-timechartHeight2-20) - margin.top) + ")"; });
			
			if(d3.event.sourceEvent)  { 
				d3.select(this).call(d3.event.target.move, dateRange.map(scale.timechart.x));
				$('#location-search').select2('close');
			}

			//**************************
			// update chartArea viewBox
			//**************************
			var margins = (margin.left+margin.right);
			// x position left handle
			var xOffset = scale.timechart.x(d1[0]); // good
			var ratio = (scale.timechart.x(d1[0])/1238) + (1-(scale.timechart.x(d1[1])/1238));
			var marginWeighted = ((margin.left+margin.right)*ratio);
			var xOffset2 = (scale.timechart.x(d1[1]))-(marginWeighted);
			var vWidth = ((xOffset2-xOffset))+(margins);
			var vBox = xOffset +' 0 '+ vWidth +' '+timechartSvgHeight;
			chartAreaSvg.attr('viewBox', vBox);
			
			updateTopAxis();
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
			updateTotals();
			updateSeverityReliability('brush',500);
			Map.update();
			DeepvizFramework.updateFramework();
			BarChart.updateStackedBars('affected_groups', dataByAffectedGroups);
			BarChart.updateStackedBars('specific_needs', dataBySpecificNeeds);
			BarChart.updateStackedBars('sector', dataBySector);

			// d3.select(this).call(d3.event.target.move, dateRange.map(scale.timechart.x));
			handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", -"+ margin.top +")"; });
			handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(scale.timechart.x)[i]-1) + ", " + ((timechartSvgHeight-timechartHeight2-20) - margin.top) + ")"; });

			$('#location-search').select2('close');

		}

		d3.select('#chart-bar-group').transition().duration(1000).style('opacity', 1);
		d3.select('#avg-line').transition().duration(500).style('opacity', 1);

		colorBars();
		updateDate();
		updateTotals();
		updateTrendline();
		updateSeverityReliability('init', 500);
		DeepvizFramework.updateFramework();
		BarChart.updateStackedBars('affected_groups', dataByAffectedGroups);
		BarChart.updateStackedBars('specific_needs', dataBySpecificNeeds);
		BarChart.updateStackedBars('sector', dataBySector);


		return bars;
	}

	//**************************
	// create sector chart
	//**************************
	this.createSectorChart = function(options){

		var sectorChart = BarChart.createStackedBarChart({
			title: 'SECTOR',
			rows: 'sector_array',
			width: 700,
			height: 500,
			filter: 'sector',
			classname: 'sector',
			div: 'sector-svg'
		});

	}

	//**************************
	// create specific needs chart
	//**************************
	this.createSpecificNeedsChart = function(options){

		var specificNeedsChart = BarChart.createStackedBarChart({
			title: 'SPECIFIC NEEDS GROUPS',
			rows: 'specific_needs_groups_array',
			classname: 'specific_needs',
			width: 700,
			height: 500,
			filter: 'specific_needs',
			div: 'specific-needs-svg'
		});
		d3.select('#specific_needsRemoveFilter').on('click', function(){ Deepviz.filter('specific_needs', 'clear'); });

	}

	//**************************
	// create affected groups chart
	//**************************
	this.createAffectedGroupsChart = function(options){

		var affectedGroupsChart = BarChart.createStackedBarChart({
			title: 'AFFECTED GROUPS',
			rows: 'affected_groups_array',
			classname: 'affected_groups',
			width: 700,
			height: 500,
			filter: 'affected_groups',
			div: 'affected-groups-svg'
		});
		d3.select('#affected_groupsRemoveFilter').on('click', function(){ Deepviz.filter('affected_groups', 'clear'); });
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
			viewBoxHeight: 60,
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
			return (50);
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
			Deepviz.filter('severity',i);
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
			return Deepviz.filter('severity', 'clear'); 
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
			viewBoxHeight: 60,
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
			return (50);
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
			Deepviz.filter('reliability',i);
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
			return Deepviz.filter('reliability', 'clear'); 
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

			d3.select('#chart-bar-group').transition().duration(750).style('opacity', 0.2);
			d3.select('#trendLineAxisLabel').transition().duration(750).style('opacity',1);

		}).on('mouseout', function(){
			// if(avgSliderBrushing==false){
				d3.select('#avg-line')
				.style('stroke-width',1)
				.transition().duration(750)
				.style('stroke-opacity',0.4);	
				d3.select('#chart-bar-group').transition().duration(750).style('opacity', 1);	
			// }

				d3.select('#trendLineAxisLabel').transition().duration(750).style('opacity',0);
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
		.attr('y', 22)
		.attr('x', 6);

		// var nDays = avgSliderSvg.append("text")
		// .attr('class', 'avgSliderLabel')
		// .attr('id', 'n-days')
		// .text('( n days = 10 )')
		// .attr('y', 36)
		// .attr('x', 180)

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

				// d3.selectAll('#avg-line')
				// .style('stroke-width',1)
				// .transition().duration(750)
				// .style('stroke-opacity',0.4);	

				// d3.select('#chart-bar-group').transition().duration(500).style('opacity', 1);
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
	this.filter = function(filterClass, value){

		if(filterClass=='clear'){
			filters.sector = [];
			filters.severity = [];
			filters.context = [];
			filters.reliability = [];
			filters.affected_groups = [];
			filters.specific_needs = [];
			filters.geo = [];
		}

		d3.selectAll('.sector-icon').style('opacity', 0.3);
		d3.selectAll('.sector').style('opacity', 1);
		d3.selectAll('.col-header-bg-selected').style('opacity', 0);	
		d3.selectAll('.col-header-text').style('opacity', 1);	
		d3.select('#frameworkRemoveFilter').style('display', 'none').style('cursor', 'default');
		d3.select('#sectorRemoveFilter').style('display', 'none').style('cursor', 'default');

		d3.selectAll('.specifc_needs').style('opacity', 1);
		d3.selectAll('.affected_groups').style('opacity', 1);
		d3.select('#specific_needsRemoveFilter').style('display', 'none').style('cursor', 'default');
		d3.select('#affected_groupsRemoveFilter').style('display', 'none').style('cursor', 'default');

		// d3.selectAll('.outerCircle').attr("stroke", colorNeutral[3]);
		// d3.selectAll('.innerCircle').attr("stroke", colorNeutral[3]);

		if(value=='clear'){
			filters[filterClass] = [];
		} else if(value == 'clearFramework'){
			filters['sector'] = [];
			filters['context'] = [];
		} else {
		  addOrRemove(filters[filterClass], value);		
		}

		if((filters['severity'].length>0)||(filters['context'].length>0)||(filters['reliability'].length>0)||(filters['sector'].length>0)||(filters['geo'].length>0)||(filters['specific_needs'].length>0)||(filters['affected_groups'].length>0)){
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
			$('#location-search').val(filters['geo']); 
			$('#location-search').trigger('change.select2');
			// select2 many location results override default behavior and show number of locations selected in placeholder
			var values = $('#location-search').select2('data');
			var select2Height = $('.select2').height();
			if(select2Height>30){
				$('.select2-selection__choice').hide();
				$('.select2-search__field').attr('placeholder', values.length+' LOCATIONS SELECTED' ).css('width', '100%')
			} else {
				$('.select2-search__field').attr('placeholder', '' );
				$('.select2-selection__choice').show();
			}
		} else {
			$('#location-search').val(filters['geo']); 
			$('#location-search').trigger('change.select2');
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
			d3.selectAll('.sector').style('opacity', 0.2);
			d3.selectAll('.sector-bg').style('opacity', 0);
			d3.selectAll('.col-header-bg-selected').style('opacity', 0);	
			d3.selectAll('.col-header-text').style('opacity', 0.3);	
			d3.select('#frameworkRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
			d3.select('#sectorRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
			filters.sector.forEach(function(d,i){
				d3.selectAll('.sector-'+(d-1)).style('opacity', 1);
				d3.selectAll('.sector-bg-'+(d-1)).style('opacity', 0);
				d3.select('#col-header-bg-'+(d)).style('opacity', .1)
				d3.selectAll('.sector-icon-'+(d)).style('opacity', 1)
				d3.select('#col-header-'+(d) + ' .col-header-text' ).style('opacity', 1)
			});
		} 

		if(filters['affected_groups'].length>0){
			data = data.filter(function(d){
				return d['affected_groups'].some(r=> filters['affected_groups'].indexOf(r) >= 0);
			});
			// bar/text shading
			d3.selectAll('.affected_groups').style('opacity', 0.2);
			d3.selectAll('.affected_groups-bg').style('opacity', 0);
			filters.affected_groups.forEach(function(d,i){
				d3.selectAll('.affected_groups-'+(d-1)).style('opacity', 1);
			});

			d3.select('#affected_groupsRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
		}

		if(filters['specific_needs'].length>0){
			data = data.filter(function(d){
				return d['special_needs'].some(r=> filters['specific_needs'].indexOf(r) >= 0);
			});
			// bar/text shading
			d3.selectAll('.specifc_needs').style('opacity', 0.2);
			d3.selectAll('.specifc_needs-bg').style('opacity', 0);
			filters.specific_needs.forEach(function(d,i){
				d3.selectAll('.specifc_needs-'+(d-1)).style('opacity', 1);
			});
			d3.select('#specific_needsRemoveFilter').style('display', 'inline').style('cursor', 'pointer');
		}
		Deepviz.updateTimeline(filterClass);
		d3.select('#globalRemoveFilter').on('click', function(){ Deepviz.filter('clear', 'clear'); });
	}

	//**************************
	// redraw timeline
	//**************************
	this.redrawTimeline = function(){

		var w = width;
		if(expandActive==true){
			w = 2000;
		}

		d3.select('#avg-line').transition().duration(200).style('opacity', 0)
		d3.select('#chart-bar-group').transition().duration(200).style('opacity', 0)
		.on("end", function(){
			d3.select('#timeline .vizlibResponsiveDiv').remove();
			d3.select('#timechart-legend .vizlibResponsiveDiv').remove();		

			// create svg
			var timelineSvg = Deepviz.createSvg({
				id: 'timeline_viz',
				viewBoxWidth: w,
				viewBoxHeight: 900,
				div: '#timeline'
			});

			var timeChart = Deepviz.timeChart({
				appendTo: timelineSvg,
				id: 'timeChart',
				opacity: 1,
				gutter: 0.5,
				width: w,
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
			updateTotals();
			Map.update();
			DeepvizFramework.updateFramework();
			BarChart.updateStackedBars('affected_groups', dataByAffectedGroups);
			BarChart.updateStackedBars('specific_needs', dataBySpecificNeeds);
			BarChart.updateStackedBars('sector', dataBySector);
		});
	}

	//**************************
	// get the data
	//**************************
	this.updateTimeline = function(target = null){

		var chartdata = refreshData();

		scale.timechart.y1 = d3.scaleLinear()
		.range([timechartHeight2, 0])
		.domain([0, rounder(maxValue)]);

		// //**************************
		// // Bar/event drop groups (by date)
		// //**************************
		// var barGroup = d3.select('#chart-bar-group');

		// var bars = barGroup.selectAll(".barGroup")
		// .data(chartdata)
		// .enter()
		// .append('g')
		// .attr('id', function(d,i){
		// 	var dt = new Date(d.date);
		// 	dt.setHours(0,0,0,0);
		// 	return 'date'+dt.getTime();
		// })
		// .attr("class", "barGroup")
		// .attr('data-width', function(d,i) { 
		// 	if(filters.time=='y'){
		// 		var date = new Date(d.key);
		// 		var endYear = new Date(date.getFullYear(), 11, 31);
		// 		return scale.timechart.x(endYear) - scale.timechart.x(d.key);   		
		// 	}

		// 	if(filters.time=='m'){
		// 		var date = new Date(d.key);
		// 		var endMonth = new Date(date.getFullYear(), date.getMonth()+1, 1);
		// 		return scale.timechart.x(endMonth) - scale.timechart.x(d.key);   		
		// 	}

		// 	if(filters.time=='d'){
		// 		var date = new Date(d.key);
		// 		var endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()+1);
		// 		return scale.timechart.x(endDate) - scale.timechart.x(d.key);   		
		// 	}	

		// })
		// .attr("transform", function(d,i) { if(i==1){barWidth+=scale.timechart.x(d.key);} return "translate(" + scale.timechart.x(d.key) + ",0)"; })
		// .exit()
		// .remove();
		
		// bars = d3.select('#chart-bar-group').selectAll(".barGroup");

		// var yArray = [];

		// var individualBars = bars.selectAll('.bar')
		// .data(function(d,i){ return d.barValues;})
		// .enter()
		// .append("rect")
		// .attr('class', function(d,i){
		// 	return 'bar severity'+(i+1);
		// })
		// .style('stroke', '#fff')
		// .style('stroke-opacity',0)
		// .attr("x", function(d,i) { 
		// 	var w = d3.select(this.parentNode).attr('data-width');
		// 	barWidth = w;
		// 	if(filters.time=='m'){
		// 		return w*0.2
		// 	}
		// 	if(filters.time=='y'){
		// 		return w*0.3
		// 	}
		// })
		// .attr("width", function(d,i) { 
		// 	var w = d3.select(this.parentNode).attr('data-width');
		// 	if(filters.time=='m'){
		// 		w=w*0.6;
		// 	}
		// 	if(filters.time=='y'){
		// 		w=w*0.4
		// 	}
		// 	return w-1;
		// })
		// .on('mouseover', function(){
		// 	d3.select(this).style('fill-opacity', 1 - 0.05)
		// })
		// .on('mouseout', function(){
		// 	d3.select(this).style('fill-opacity', 1)
		// })
		// .attr("height", 0)
		// .attr("y", timechartHeight2);

		// individualBars.transition()
		// .duration(500)

		// .attr("y", function(d,i) { 
		// 	if(i>0){
		// 		yArray[i] = yArray[i-1] + d;
		// 	} else {
		// 		yArray[i] = d;
		// 	}
		// 	return scale.timechart.y1(yArray[i]); 
		// })
		// .attr("height", function(d,i) { 
		// 	return timechartHeight2-scale.timechart.y1(d); 
		// });

		timechartyAxis = d3.axisLeft()
		.scale(scale.timechart.y1)
		.ticks(4)
		.tickSize(0)
		.tickPadding(8);

		d3.select("#timechartyAxis")
		.transition()
		.call(timechartyAxis);

		timechartyGrid = d3.axisLeft(scale.timechart.y1)
		.tickSize(-width+52)
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

			if(dD){
				var yArray = [];
				var iBars = group.selectAll('.bar' )
				.transition().delay(2).duration(500)
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
				}).attr('data-value', function(d,i){
					return dD[filters.toggle][i];
				})	
			} else {
				group.selectAll('.bar').attr('data-value',0);
				group.selectAll('.bar').transition("h").duration(0).attr('height',0);
				group.selectAll('.bar').transition().delay(2).duration(500).attr('y',timechartHeight2).attr('height',0);
			}

		});

		//**************************
		// update event drops
		//**************************

		var eventDrops = d3.select('#event-drop-group').selectAll(".eventDropGroup");

		var eventDropCircles = eventDrops.selectAll('.eventDrop')
				.attr('r', 0);

		dataByContext.forEach(function(d,i){
			var time = new Date(d.key).getTime();
			d.values.forEach(function(dd,ii){
				var id = '#event-drop-'+(parseInt(dd.key))+'-'+time;
				d3.select(id).attr('r', function(ddd,iii){
					return scale.eventdrop(dd.value.total);
				}).style('fill', function(ddd,iii){
					if(filters.frameworkToggle == 'average'){
						if(filters.toggle == 'reliability'){
							return colorSecondary[Math.round(dd.value.median_r)];
						} else { // primary fallback
							return colorPrimary[Math.round(dd.value.median_s)];
						} 
					} else {
						return colorNeutral[3];
					}
					
				})
			})
		});

		updateSeverityReliability(target, 500);
		updateTrendline();
		Map.update();
		colorBars();

		d3.selectAll('.barGroup').each(function(d,i){
			d3.select(this).selectAll('.bar').style('fill', function(d,i){
				if(filters.toggle == 'severity'){
					return colorPrimary[i];
				} else {
					return colorSecondary[i];
				}
			})
		});

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

		d3.select('#total_entries').text(addCommas(total));
	}

	//**************************
	// update trendline
	//**************************
	var updateTrendline = function(){

		tp = [];

		trendlinePoints.sort(function(x,y){
			return d3.ascending(x.date, y.date);
		})

		if(filters.toggle=='severity'){
			trendlinePoints = trendlinePoints.filter(function(d){
				return d.severity_avg !== null;
			})
		}

		if(filters.toggle=='reliability'){
			trendlinePoints = trendlinePoints.filter(function(d){
				return d.reliability_avg !== null;
			})
		}

		trendlinePoints.forEach(function(d,i){
			d.y_severity = scale.trendline.y(d.severity_avg);
			d.y_reliability = scale.trendline.y(d.reliability_avg);
			if(filters.toggle=='severity'){
				if(d.severity_avg) tp.push(d.y_severity);
			} else {
				if(d.reliability_avg) tp.push(d.y_reliability );			
			}
		});

		curvedLine = d3.line()
		.x(function(d,i){
			return scale.timechart.x(trendlinePoints[i].date);
		})
		.y(d => (d))
		.curve(d3.curveLinear);

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
		d3.select('#chart-bar-group').style('opacity', 0.2);
		d3.select('#n-days').text('( n days = '+(Math.round(v))+' )');
	}

	//**************************
	// update severity / reliability bars
	//**************************
	function updateSeverityReliability(target=null, duration = 0){

		if(target == 'brush') duration = 0;

		var s_total = 0;
		var r_total = 0;
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

			if((target=='reliability')||(target=='init')||(target=='context')||(target=='geo')||(target=='specific_needs')||(target=='affected_groups')||(target=='brush')||(target=='sector')||(target=='clear')||(target=='map')||((target=='severity')&&(filters.severity.length == 0))){
				d3.selectAll('.severityBar')
				.transition()
				.duration(duration)
				.attr('opacity', function(d,i){
					var parent = d3.select(this.parentNode);
					if(severity[i]>0){
						parent.style('display','block');
						return 1;
					} else { 
						parent.style('display','none');
						return 0
					}
				})
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

			if((target=='severity')||(target=='init')||(target=='geo')||(target=='context')||(target=='specific_needs')||(target=='affected_groups')||(target=='brush')||(target=='sector')||(target=='map')||(target=='clear')||((target=='reliability')&&(filters.reliability.length == 0))){
				d3.selectAll('.reliabilityBar')
				.attr('opacity', function(d,i){
					var parent = d3.select(this.parentNode);
					if(reliability[i]>0){
						parent.style('display','block');
						return 1;
					} else { 
						parent.style('display','none');
						return 0
					}
				})
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
			s_total += -severity[0];
			var severityNull = severity[0];
			severity[0] = 0;
			var s = 0;
			var s_median = 0;
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
			r_total += -reliability[0];
			var reliabilityNull = reliability[0];
			reliability[0] = 0;
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

			d3.select('#severity_value').text(metadata.severity_units[s_median].name ).style('color', colorPrimary[s_median]);
			d3.select('#severityAvg').attr('x',function(d){
				var nullP = (1 - (s_total / (s_total+severityNull)))*1000;
				return (1000-nullP)/2+nullP;
			});

			d3.select('#reliability_value').text(metadata.reliability_units[r_median].name ).style('color', colorSecondary[r_median]);
			d3.select('#reliabiltiyAvg').attr('x',function(d){
				var nullP = (1 - (r_total / (r_total+reliabilityNull)))*1000;
				return (1000-nullP)/2+nullP;
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
			// d3.selectAll('.outerCircle').style('stroke', colorNeutral[3]);
			// d3.selectAll('.innerCircle').style('fill', colorNeutral[3]);
			if(filters.frameworkToggle == 'average'){
				d3.select('#framework-toggle').style('fill', colorSecondary[3])
			}
			// update colors of contextual row total values
			d3.selectAll('.total-label').style('fill', colorNeutral[4]);
			d3.select('#dateRange').style('color', colorNeutral[4]);
			d3.select('#avg-line').style('stroke', colorSecondary[3]);
			d3.select('#framework-toggle-text').text('median reliability');
			d3.select('#trendLineAxisLabel').text('RELIABILITY');
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
			// d3.selectAll('.outerCircle').style('stroke', colorNeutral[3]);
			// d3.selectAll('.innerCircle').style('fill', colorNeutral[3]);
			// update colors of contextual row total values
			d3.selectAll('.total-label').style('fill', colorNeutral[4]);
			d3.select('#dateRange').style('color', colorNeutral[4]);
			d3.select('#avg-line').style('stroke', colorPrimary[3]);
			d3.select('#framework-toggle-text').text('median severity');
			d3.select('#trendLineAxisLabel').text('SEVERITY');

		}
		Deepviz.updateTimeline();
	}

	function colorBars(){
		// d3.selectAll('.eventDropGroup').each(function(d,i){
		// 	if(!d3.select(this).attr('id')) return;
		// 	var idate = parseInt(d3.select(this).attr('id').slice(4));
		// 	if(((new Date(idate)) >= (dateRange[0]))&&((new Date(idate))< (dateRange[1]))){
		// 		// d3.select(this).selectAll('.bar').style('fill', function(d,i){
		// 		// 	if(filters.toggle == 'severity'){
		// 		// 		return colorPrimary[i];
		// 		// 	} else {
		// 		// 		return colorSecondary[i];
		// 		// 	}
		// 		// }).style('fill-opacity', 1);

		// 		d3.select(this).selectAll('.eventDrop').style('fill', function(d,i){
		// 			if(filters.toggle == 'severity'){
		// 				return colorNeutral[3];
		// 			} else {
		// 				return colorNeutral[3];
		// 			}
		// 		});
		// 	} else {
		// 		// d3.select(this).selectAll('.bar').style('fill', function(d,i){
		// 		// 	return colorLightgrey[i];
		// 		// }).style('fill-opacity', 1);
		// 		d3.select(this).selectAll('.eventDrop').style('fill', function(d,i){
		// 			return colorLightgrey[1];
		// 		});
		// 	}
		// });
		// d3.selectAll('.barGroup').each(function(d,i){
		// 	if(!d3.select(this).attr('id')) return;
		// 	var idate = parseInt(d3.select(this).attr('id').slice(4));
		// 	if(((new Date(idate)) >= (dateRange[0]))&&((new Date(idate))< (dateRange[1]))){
		// 		d3.select(this).selectAll('.bar').style('fill', function(d,i){
		// 			if(filters.toggle == 'severity'){
		// 				return colorPrimary[i];
		// 			} else {
		// 				return colorSecondary[i];
		// 			}
		// 		}).style('fill-opacity', 1);
		// 	} else {
		// 		d3.select(this).selectAll('.bar').style('fill', function(d,i){
		// 			return colorLightgrey[i];
		// 		}).style('fill-opacity', 1);
		// 	}
		// });

	}

	//**************************
	// resizing
	//**************************
	var scrollable = false;
	window.onresize = function(){
		setTimeout(Deepviz.resizeDevice, 50);
	}
	this.resizeDevice = function() {
		// set map height
		var map = document.getElementById("map");
		if(expandActive==true){

		} else {
			map.setAttribute("style","height:"+(map.offsetWidth*mapAspectRatio)+"px");
		}

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

	function monthDiff(dateFrom, dateTo) {
		return dateTo.getMonth() - dateFrom.getMonth() + 
		(12 * (dateTo.getFullYear() - dateFrom.getFullYear()))
	}

	function makePolyCCW(points) {
	  var sum = 0;
	  for (var i = 0; i < (points.length - 1); i++) {
	    sum += (points[i+1][0] - points[i][0])*(points[i+1][1] + points[i][1]);
	  }
	  return sum > 0 ? points.slice().reverse() : points;
	}


}

function addCommas(nStr){
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}
