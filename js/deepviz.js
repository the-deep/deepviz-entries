var Deepviz = function(sources, callback){

	//**************************
	// define variables
	//**************************
	var dateRange = [new Date(2019, 2, 1), new Date(2019, 3, 31)]; // selected dateRange on load
	var minDate = new Date(2019,0,1);
	var maxDate;
	var dateIndex;
	var scale = {
		'timechart': {x: '', y1: '', y2: ''},
		'map': '',
		'severity': {x: '', y: ''},
		'reliability': {x: '', y: ''},
	};

	// data related
	var metadata;
	var originalData; // full original dataset without filters (used to refresh/clear filters)
	var data; // active dataset after filters applied
	var dataByDate;
	var dataByLocation;
	var dataByLocationSum;
	var dataByContext;
	var total = 0;
	var maxValue; // max value on a given date
	var maxContextValue;
	var tp_severity = [];
	var tp_reliability = [];

	// timechart variables
	var width = 1300;
	var margin = {top: 18, right: 17, bottom: 0, left: 25};
	var timechartHeight = 567;
	var timechartHeightOriginal = timechartHeight;
	var brush;
	var gBrush; 
	var barWidth;
	var numContextualRows = 6;

	// severity / reliability charts
	var reliabilityArray = ["Unreliable", "Not Usually Reliable", "Fairly Reliable", "Usually Reliable", "Completely Reliable"];
	var severityArray = ["No/minor problem", "Of Concern", "Major", "Severe", "Critical"];

	// trendline
	var trendlinePoints;
	var avgSliderBrushing = false; // brush state
	var lineGenerator = d3.line().curve(d3.curveBundle.beta(.5));
	var pathData = {};
	var clickTimer = 0;

	// map
	var maxMapBubbleValue;

	// filters
	var filters = {
		sector: [],
		severity: [],
		reliability: [],
		affectedGroups: [],
		specificNeeds: [],
		toggle: 'severity'
	};

	// colors
	var colorPrimary = ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603']; // severity
	var colorPrimary = ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000']; // severity (multi-hue)
	var colorGrey = ['#CDCDCD', '#AFAFAF', '#939393', '#808080', '#646464'];
	var colorLightgrey = ['#EBEBEB', '#CFCFCF', '#B8B8B7', '#A8A9A8', '#969696'];
	var colorLightgrey = ['#F5F5F5', '#DFDFDF', '#D0D0D0', '#C7C7C7', '#BABABA'];
	var colorBlue = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];
	var colorSecondary = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c']; // reliability
	var colorSecondary = ['#f1eef6', '#bdc9e1', '#74a9cf', '#2b8cbe', '#045a8d']; // reliability (multi-hue PuBu)

	//**************************
	// load data
	//**************************

	// define the data source to be loaded. replace with API URL endpoint
	var files = sources;

	// load each data source
	var promises = [];
	files.forEach(function(url) {

		if(url.endsWith('json')){
			promises.push(d3.json(url));			
		};

		if(url.endsWith('csv')){
			promises.push(d3.csv(url));			
		};

	});

	// after all data has been loaded
	Promise.all(promises).then(function(values) {
		//**************************
		// all data loaded
		//**************************

		// return the data
		data = values[0].deep.data;
		metadata = values[0].deep.meta_data;

		// convert date strings into js date objects
		data.forEach(function(d,i){
			d.date = new Date(d.date);
		});

		// set the data again for reset purposes
		originalData = data;

		// TEMPORARY for testing - filter data before minDate
		data = data.filter(function(d){return (d.date) >= minDate;});

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

		// define minimum date 
		minDate = new Date(d3.min(data, function(d){
			return d.date;
		}));

		// minDate.setDate(minDate.getDate());
		// minDate.setHours(0);
		// minDate.setMinutes(0);

		// define maximum value by date
		dataByDate = d3.nest()
		.key(function(d) { return d.date;})
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);

		maxValue = d3.max(dataByDate, function(d) {
			return d.value;
		});

		// define maximum location value
		dataByLocation = d3.nest()
		.key(function(d) { return d.geo;})
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);

		maxMapBubbleValue = d3.max(dataByLocation, function(d) {
			return d.value;
		});

		// define maximum context value
		dataByContext = d3.nest()
		.key(function(d) { return d.context;})
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);

		maxContextValue = d3.max(dataByContext, function(d) {
			return d.value;
		});

	    // define timechart X scale
		dateIndex = data.map(function(d) { return d['date']; });

	    xScale = d3.scaleTime()
	    .domain([minDate, maxDate])
	    .range([0, (width - (margin.right + margin.left)) +barWidth])
	    .rangeRound([0, (width - (margin.right + margin.left))], 0);

		// override colors
		d3.select('#total_entries').style('color',colorPrimary[3]);
		d3.select('#severity_value').style('color',colorPrimary[3]);
		d3.select('#reliability_value').style('color',colorSecondary[3]);
		d3.select('#severityToggle').style('fill',colorPrimary[3]);
		d3.select('#reliabilityToggle').style('fill',colorSecondary[3]);
		d3.select('.selection').style('fill', colorPrimary[2]);
		d3.select('#dateRange').style('color', colorPrimary[3]);


		refreshData();

		return callback(values);
	});

	var refreshData = function(){
		console.log('refreshData()');
		dataByDate = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.severity; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);

		dataByContext = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.context; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);

		var dateByReliability = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.reliability; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(data);

		dataByLocation = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.geo; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(data)	

		trendlinePoints = [];

		dataByDate.forEach(function(d,i){
			var dt = new Date(d.key);
			dt.setHours(0,0,0,0);
			d.key = dt;
			d.date = d.key;

			var count = 0;

			d.severity = [0,0,0,0,0];

			d.values.forEach(function(dx){
				d.severity[dx.key-1] = dx.value;
				count += dx.value;
			});

			d.reliability = [0,0,0,0,0];

			dateByReliability[i].values.forEach(function(dx){
				d.reliability[dx.key-1] = dx.value;
			});

			// set up empty context array for data loop
			var contextArr = [];
			var numContextRows = metadata.context_array.length;
			for(b=0; b<=numContextRows-1; b++){
				contextArr[b] = 0;
			}

			d.context = contextArr;

			dataByContext[i].values.forEach(function(dx, ii){
				var k = dx.key-1;
				contextArr[k] = dx.value
			});

		    d.context = contextArr;

		    // geo array
			var geoArr = [];

			dataByLocation[i].values.forEach(function(dx, ii){
				var k = dx.key-1;
				geoArr[k] = dx.value
			});

		    d.geo = geoArr;

			d.total_entries = count;

		    d.severity_avg = ( (1*d.severity[0]) + (2*d.severity[1]) + (3*d.severity[2]) + (4*d.severity[3]) + (5*d.severity[4]) ) / count;
		    d.reliability_avg = ( (1*d.reliability[0]) + (2*d.reliability[1]) + (3*d.reliability[2]) + (4*d.reliability[3]) + (5*d.reliability[4]) ) / count;

		    trendlinePoints.push({date: d.date, "severity_avg": d.severity_avg, "reliability_avg": d.reliability_avg });

			dataByDate[i].barValues = d.severity;

			delete d.values;
		});

		updateTotals();

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

		map.setAttribute("style","height:"+(map.offsetWidth*0.8)+"px");

	    mapboxgl.accessToken = 'pk.eyJ1Ijoic2hpbWl6dSIsImEiOiJjam95MDBhamYxMjA1M2tyemk2aHMwenp5In0.i2kMIJulhyPLwp3jiLlpsA'
	        
	    //Setup mapbox-gl map
	    var map = new mapboxgl.Map({
	        container: 'map', // container id
	        style: 'mapbox://styles/mapbox/light-v9',
	        center: [17.4283, 28],
	        zoom: 4,  
	        trackResize: true,
	        pitchWithRotate: false,
	        dragRotate: false
	    })
	    
	    map.addControl(new mapboxgl.NavigationControl(), 'top-left');
	    
	    var container = map.getCanvasContainer()

	    var mapsvg = d3.select(container).append("svg").style('position', 'absolute').style('width', '100%').style('height', '100%');

		var transform = d3.geoTransform({point: projectPoint});
		var path = d3.geoPath().projection(transform);
	    
	    scale.map = d3.scaleLinear()
			.range([0.3,1.8])
			.domain([0,maxMapBubbleValue]);// 

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
					dataByLocationSum[g] = t;
				}
	   		}
		});

	 	var featureElement = mapsvg.selectAll("g")
			.data(dataByLocationSum)
			.enter()
			.append('g')
			.attr('id', function(d,i){
				return 'bubble'+i
			})
			.attr('transform', function(d,i){
				p = projectPoint(metadata.geo_array[i].centroid_lon, metadata.geo_array[i].centroid_lat);
				return 'translate('+p.x+','+p.y+')';
			})
			.style('opacity', 0.9);

			var featureElementG = featureElement
			.append('g')
			.attr('class', 'map-bubble')
			.attr('transform', function(d,i){
				return 'scale('+scale.map(dataByLocationSum[i])+')';
			})
			.style('opacity', function(d,i){
				if(dataByLocationSum[i]>0){
					return 1;
				} else {
					return 0;
				}
			})

			featureElementG
	        .append("circle")
	        .attr('class',  'outerCircle')
	        .attr("stroke", colorPrimary[3])
	        .attr("fill", "#FFF")
	        .attr('cx', 0)
	        .attr('cy', 0)
	        .attr('r' , 30)
	        .attr("stroke-width", 2);

			featureElementG
	        .append("circle")
	        .attr('class',  'innerCircle')
	        .attr("fill", colorPrimary[3])
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
				p = projectPoint(metadata.geo_array[i].centroid_lon, metadata.geo_array[i].centroid_lat);
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
			// this.stream.point(point.x, point.y);
		}
	}


	//**************************
	// create timechart
	//**************************
	this.timeChart = function(options){

		var chartdata = refreshData();

		barWidth = (1300/chartdata.length)-1;

		// container g, and
		var svg = options.appendTo
		.append("svg")
		.attr('id', options.id)
		.attr('class', options.id)
		.style('opacity', options.opacity)
		.attr('x',0+options.offsetX)
		.attr('y',0+options.offsetY)
		.attr('width',width)
		.attr('height', options.svgheight)
		.append('g')
		.attr("transform", "translate(0,0)");

		width = width - (margin.right + margin.left);
		timechartHeight = timechartHeight - (margin.top + margin.bottom);

		var svgBg = svg.append('g');

		svgBg.append('rect')
		.attr('x',margin.left)
		.attr('y',margin.top)
		.attr('width',width)
		.attr('height',timechartHeight)
		.attr('opacity',0);

		var gridlines = svg.append('g').attr('id', 'gridlines').attr('class', 'gridlines').attr('transform', 'translate('+(margin.left+0)+','+margin.top+')');
		var svgChartBg = svg.append('g').attr('id', 'svgchartbg').attr('class', 'chartarea').attr('transform', 'translate('+(margin.left+0)+','+margin.top+')');
		var svgChart = svg.append('g').attr('id', 'chartarea').attr('transform', 'translate('+(margin.left+0)+','+margin.top+')');
		var svgAxisBtns = svg.append('g').attr('id', 'svgAxisBtns').attr('transform', 'translate('+(margin.left+0)+','+(timechartHeight+margin.top+5)+')');


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
		.style('fill', '#000')
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
		.style('fill', '#000')
		.text('Total Entries')

		timechartLegend
		.append("rect")
		.attr('id', 'leftAxisBox')
		.attr("y", 6)
		.attr("x", 5)
		.attr('width', 10)
		.attr('height', 10)
		.style('fill', colorPrimary[3]);


	    var xAxis = d3.axisBottom()
	    .scale(xScale)
	    .tickSize(0)
	    .tickPadding(10)
	    .ticks(d3.timeMonth.every(1))
	    .tickFormat(d3.timeFormat("%b %Y"));

	    //**************************
	    // Y AXIS left
	    //**************************
		scale.timechart.y1 = d3.scaleLinear()
		.range([timechartHeight, 0])
		.domain([0, (maxValue)]);

		if(options.maxValue=='round'){
			scale.timechart.y1 = d3.scaleLinear()
			.range([timechartHeight, 0])
			.domain([0, rounder(maxValue)]);
		}

		var yAxis = d3.axisLeft()
		.scale(scale.timechart.y1)
		.ticks(4)
		.tickSize(0)
		.tickPadding(8);

		// y-axis
		var yAxisText = svgBg.append("g")
		.attr("class", "yAxis axis")
		.attr('transform', 'translate('+(margin.left-1)+','+margin.top+')')
		.call(yAxis)
		.style('font-size', options.yAxis.font.values.size);

		//**************************
		// Y AXIS right
		//**************************

		// define y-axis secondary
		scale.timechart.y2 = d3.scaleLinear()
		.range([timechartHeight, 0])
		.domain([1, 5]);

		var yAxis2 = d3.axisRight()
		.scale(scale.timechart.y2)
		.ticks(1)
		.tickSize(5)
		.tickPadding(4);

		var yAxisText2 = svgBg.append("g")
		.attr("class", "yAxis axis")
		.attr('transform', 'translate('+(width + margin.left-1)+','+margin.top+')')
		.call(yAxis2)
		.style('font-size', options.yAxis.font.values.size);



		yAxisText2
		.append("text")
		.attr('class','axisLabel0')
		.attr("y", timechartHeight+4)
		.attr("x", 8)
		.style('font-weight','normal')
		.style('font-size', '15px')
		.style('fill', '#000')
		.text('1')



		// add the Y gridlines
		gridlines.append("g")			
		.attr("class", "grid")
		.call(make_y_gridlines()
			.tickSize(-width)
			.tickFormat("")
			);

		// gridlines in y axis function
		function make_y_gridlines() {		
			return d3.axisLeft(scale.timechart.y1).ticks(5);
		}

		// x-axis 
		var xAxisObj = svgBg.append("g")
		.attr("class", "xAxis axis")
		.attr("transform", "translate(" + margin.left + "," + (timechartHeight + margin.top +0) + ")")
		.call(xAxis)
		.style('font-size', '16px')
		.style('font-weight', options.xAxis.font.values.weight)

		xAxisObj
		.selectAll('path, line')
		.style('opacity', 1 )
		.style('stroke', '#535353' )
		.style('stroke-width', 1);

		xAxisObj.selectAll(".tick line, text")
		.attr("transform", "translate(" +40 + ", 0)")
		.append('line')
		.attr('class', 'xAxisHorizontalLine')
		.attr('x1', 0)
		.attr('x2', 0)
		.attr('y1', 0)
		.attr('y2', timechartHeight+margin.top+1)

		xAxisObj.selectAll(".tick")
		.append('line')
		.attr('class', 'xAxisHorizontalLine')
		.attr('x1', 0)
		.attr('x2', 0)
		.attr('y1', -timechartHeight)
		.attr('y2', timechartHeight+margin.top+95)

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
					tick.style('color', colorPrimary[3]);
				} else { 
					tick.style('color', colorSecondary[4]);

				}
			})
			.on('mouseout', function(){
				tick.style('color', '#000')
			})
			.on('click', function(){
				dateRange[0] = d;
				dateRange[1] = new Date(d.getFullYear(), d.getMonth()+1, 1);

			    // programattically set date range
			    gBrush.call(brush.move, dateRange.map(xScale));
			})

		});

		//**************************
		// Bar/event drop groups (by date)
		//**************************

		// bar groups
		var bars = svgChart.selectAll(".barGroup")
		.data(chartdata)
		.enter()
		.append('g')
		.attr('id', function(d,i){
			var dt = new Date(d.date);
			dt.setHours(0,0,0,0);
			return 'date'+dt.getTime();
		})
		.attr("class", "barGroup")
		.attr("transform", function(d) { return "translate(" + xScale(d[options.dataKey]) + ",0)"; });

		var dy;

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
			return (barWidth*(1-1))/2+1;
		})
		.attr("width", function(d,i) { 
			return (barWidth*1)-2;
		})
		.attr("y", function(d,i) { 

			if(i>0){
				var prevY = bars.data()[i-1].y;
			} else {
				var prevY = 0;
			}

			bars.data()[i].y = d + prevY;
			return scale.timechart.y1(d + prevY); 
		})
		.attr("height", function(d,i) { 
			return timechartHeight-scale.timechart.y1(d); 
		})
		.on('mouseover', function(){
			d3.select(this).style('fill-opacity', options.fillOpacity - 0.05)
		})
		.on('mouseout', function(){
			d3.select(this).style('fill-opacity', options.fillOpacity)
		});

		// // bar mouse over events
		// individualBars
		// .on('mouseover', function(d,i){
		// 	d3.select(this)
		// 	.style('fill', function(d,i){if(color.length > 1){return color[i]} else {return d3.rgb(color[0]).brighter(0.4);}})
		// })
		// .on('mouseout', function(d,i){
		// 	d3.select(this)
		// 	.style('fill', function(d,i){if(color.length > 1){return color[i]} else {return color[0];}})
		// })

		//**************************
		// draw trendlies
		//**************************
		var severityTrendline = d3.select('#svgchartbg').append('path')
			.style('fill', 'none')
			.style('stroke', colorPrimary[3])
			.attr('id', 'severityTrendline');

		var reliabilityTrendline = d3.select('#svgchartbg').append('path')
			.style('fill', 'none')
			.style('opacity',0)
			.style('stroke', colorSecondary[4])
			.attr('id', 'reliabilityTrendline');

		// *************************
		// draw contextual rows
		//**************************

		var timechart = d3.select('#timeChart');
		var yPadding = 14;

		var contextualRows = svgChartBg.append('g')
			.attr('id', 'contextualRows')
			.attr('transform', 'translate(0,'+ (timechartHeightOriginal + yPadding ) + ')');

		var contextualRowsHeight = timechart.attr('height') - timechartHeightOriginal - yPadding - 36;

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
			.attr('x', 1286)
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
			.attr('y',19)
			.attr('x',1)
			.style('font-weight', 'bold');

			// row total value
			rows.append('text')
			.text('999 entries')
			.attr('class', 'total-label')
			.attr('id', function(d,i){
				return 'total-label'+i;
			})
			.attr('x', function(d,i){
				var xoffset = d3.select(this.parentNode).selectAll('.label').node().getBBox().width;
				return xoffset + 8;
			})
			.attr('y',19)
			.style('font-weight', 'bold')
			.style('fill', colorPrimary[4]);

		//**************************
		// event drops
		//**************************

		// event mask groups (to be used for event drop grey brush mask)
		var eventDropGroup = bars.append('g')
		.attr("class", "eventDropGroup");

		var eventDrops = eventDropGroup.selectAll('.eventDrop')
			.data(function(d,i){ return d.context;})
			.enter()
			.append('circle')
			.attr('class', 'eventDrop')
			.attr('r', function(d){
				return d*4;
			})
			.attr('cx', function(d,i){
				return barWidth/2;
			})
			.attr('cy', function(d,i){
				return contextualRowsHeight + 7 + (contextualRowHeight*i);
			})
			.style('fill', colorPrimary[3]);

		//**************************
		// date slider brushes
		//**************************
	    // initialise the brush
	    brush = d3.brushX()
		    .extent([[0, -margin.top], [width, options.svgheight-(margin.top+margin.bottom)]])
	        .on("brush", brushed)
	        .on("start", brush);

	    // add the selectors
	    gBrush = svgChart.append("g")
	    	.attr('id', 'gBrush')
		    .attr("class", "brush")
		    .attr('transform', 'translate('+(2)+',0)')
		    .call(brush);

		// hover effect on overlay
		d3.select('.selection')
		.on('mouseover', function(){
			d3.select('.selection').style('fill-opacity',0.03);
		})
		.on('mouseout', function(){
			d3.select(this).style('fill-opacity',0.01);
		})

	    d3.selectAll('.handle rect').attr('fill-opacity', '1').style('visibility', 'visible').attr('width', 2).attr('fill', '#000').style('stroke-opacity', 0);

	    // add the triangle handles (top)
	    var handleTop = gBrush.selectAll(".handle--custom-top")
		    .data([{type: "w"}, {type: "e"}])
		    .enter().append("g")

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
	    	.attr('height', options.svgheight)
	    	.attr('y', 0)
	    	// .style('fill', 'blue')
	    	.style('cursor', 'ew-resize');


	    // add the triangle handles (bottom)
	    var handleBottom = gBrush.selectAll(".handle--custom-bottom")
		    .data([{type: "w"}, {type: "e"}])
		    .enter().append("path")
		    .attr("class", "handle--custom-bottom")
		    .attr("stroke", "#000")
		    .attr('stroke-width', 3)
		    .attr('fill', '#000')
		    .attr("cursor", "ew-resize")
		    .attr("d", 'M -9,0 -1,-11 8,0 z');

	    handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(xScale)[i]-1) + ", -" + margin.top + ")"; });
	    handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(xScale)[i]-1) + ", " + (options.svgheight - margin.top) + ")"; });

	    // programattically set date range
	    gBrush.call(brush.move, dateRange.map(xScale));

	    // function to handle the changes during slider dragging
	    function brushed() {

	    	// if not right event then break out of function
			if(!d3.event.sourceEvent) return;
			if(d3.event.sourceEvent.type === "brush") return;

			d3.select('.selection').style('fill-opacity',0.03);

			var d0 = d3.event.selection.map(xScale.invert);
			var d1 = d0.map(d3.timeDay.round);

			// If empty when rounded, use floor instead.
			if (d1[0] >= d1[1]) {
				d1[0] = d3.timeDay.floor(d0[0]);
				d1[1] = d3.timeDay.offset(d1[0]);
			}

			dateRange = d1;

			colorBars();
			updateDate();
			updateSeverityReliability('brush');
			updateBubbles();

			d3.select(this).call(d3.event.target.move, dateRange.map(xScale));
			handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(xScale)[i]-1) + ", -"+ margin.top +")"; });
			handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(xScale)[i]-1) + ", " + (options.svgheight - margin.top) + ")"; });

			updateTotals();

		}

		function brush() {

			if(!d3.event.sourceEvent) return;
			if(d3.event.sourceEvent.type === "brush") return;

			// updateSeverityReliability(dateRange,chartdata,'brush');

			var d0 = d3.event.selection.map(xScale.invert);
			var d1 = d0.map(d3.timeDay.round);

			// If empty when rounded, use floor instead.
			if (d1[0] >= d1[1]) {
				d1[0] = d3.timeDay.floor(d0[0]);
				d1[1] = d3.timeDay.offset(d1[0]);
			}

			dateRange = d1;

			d3.select(this).call(d3.event.target.move, dateRange.map(xScale));
			handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(xScale)[i]-1) + ", -"+ margin.top +")"; });
			handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(xScale)[i]-1) + ", " + (options.svgheight - margin.top) + ")"; });
		}

		colorBars();
		updateDate();
		updateTrendline();
		updateSeverityReliability('init');
			updateTotals();
		
		return bars;
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
			viewBoxHeight: 43,
			div: '#severity_bars',
			width: '100%'
		});

		// define x scale
		scale.severity.x = d3.scaleLinear()
		.range([0, 995])
		.domain([1, 5]);// severity/reliability x xcale

		var severityBars = severitySvg.selectAll('.severityBar')
		.data(severityArray)
		.enter()
		.append('rect')
		.attr('class', function(d,i){
			return 'severityBar severity' + (i+1);
		})
		.attr('x', function(d,i){
			return (1000/5)*i;
		})
		.attr('width', function(d,i){
			return (1000/5);
		})
		.attr('height', function(d,i){
			return (46);
		})
		.attr('y',2)
		.attr('fill', function(d,i){
			return colorPrimary[i];
		}).on('mouseover', function(d,i){

			if(clickTimer == 0 ){

				if((filters.severity.length>0)&&(!filters.severity.includes(i+1))){
					return false;
				}
				d3.selectAll('.severityBar').style('stroke-opacity',0)
				// d3.selectAll('.bar').transition().duration(0).style('opacity', 1).style('stroke-opacity', 0);

				d3.select('.severityBar.severity'+(i+1))
				.style('stroke', '#0E523B')
				.style('stroke-width', 3)
				.transition().duration(500)
				.style('stroke-opacity', 0.6);

				if(filters.toggle=='severity'){
					d3.selectAll('.bar:not(.severity'+(i+1)+')')
					.transition("mouseoutSeverity").delay(1000).duration(1000).style('opacity', 0.33).style('stroke-opacity', 0);
					d3.selectAll('#timeline .severity'+(i+1))
					.transition("mouseoutSeverity").delay(1000).duration(500).style('stroke-opacity', 0.4).style('opacity', 1);
				}
			}
		}).on('mouseout', function(d,i){
			d3.selectAll('.severityBar').style('stroke-width', 0).transition().duration(500).style('stroke-opacity',0)
			d3.selectAll('.bar').transition("mouseoutSeverity").duration(500).style('opacity', 1).style('stroke-opacity', 0);
		}).on('click', function(d,i){


			d3.selectAll('.severityBar').style('stroke-width', 0).style('stroke-opacity',0)
			d3.selectAll('.bar').transition("mouseoutReliability").duration(500).style('opacity', 1).style('stroke-opacity', 0);
	
			clickTimer = 1;

			filter('severity',i+1);

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
					.style('fill', colorPrimary[d-1])

				});
			}

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
			d3.select('#severityRemoveFilter').style('opacity', 0).style('cursor', 'default');
			d3.selectAll('.severityBar').transition().duration(200).style('fill', function(d,i){
				return colorPrimary[i];
			});	
			return filter('severity', 'clear'); 
		});

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
			viewBoxHeight: 43,
			div: '#reliability_bars',
			width: '100%'
		});

		var reliabilityBars = reliabilitySvg.selectAll('.reliabilityBar')
		.data(reliabilityArray)
		.enter()
		.append('rect')
		.attr('class', function(d,i){
			return 'reliabilityBar reliability' + (i+1);
		})
		.attr('x', function(d,i){
			return (1000/5)*i;
		})
		.attr('width', function(d,i){
			return (1000/5);
		})
		.attr('height', function(d,i){
			return (46);
		})
		.style('cursor', 'pointer')
		.attr('y',2)
		.attr('fill', function(d,i){
			return colorPrimary[i];
		}).on('mouseover', function(d,i){

			if(clickTimer == 0 ){

				if((filters.reliability.length>0)&&(!filters.reliability.includes(i+1))) return false;

				d3.selectAll('.reliabilityBar').style('stroke-opacity',0)
				// d3.selectAll('.bar').transition().duration(0).style('opacity', 1).style('stroke-opacity', 0);

				d3.select('.reliabilityBar .severity'+(i+1))
				.style('stroke', '#0E523B')
				.style('stroke-width', 3)
				.transition().duration(500)
				.style('stroke-opacity', 0.6);

				if(filters.toggle=='reliability'){
					d3.selectAll('.bar:not(.severity'+(i+1)+')')
					.transition("mouseoutReliability").delay(1000).duration(1000).style('opacity', 0.33).style('stroke-opacity', 0);
					d3.selectAll('#timeline .severity'+(i+1))
					.transition("mouseoutReliability").delay(1000).duration(500).style('stroke-opacity', 0.4).style('opacity', 1);
				}
			}
		}).on('mouseout', function(d,i){
			d3.selectAll('.severityBar').style('stroke-width', 0).transition().duration(500).style('stroke-opacity',0)
			d3.selectAll('.bar').transition("mouseoutReliability").duration(500).style('opacity', 1).style('stroke-opacity', 0);
		}).on('click', function(d,i){

			d3.selectAll('.severityBar').style('stroke-width', 0).transition().duration(500).style('stroke-opacity',0)
			d3.selectAll('.bar').transition("mouseoutReliability").duration(500).style('opacity', 1).style('stroke-opacity', 0);

			clickTimer = 1;

			filter('reliability',i+1);

			if(filters.reliability.length==0){
				d3.selectAll('.reliabilityBar').transition().duration(200).style('fill', function(d,i){
					return colorSecondary[i];
				});		
			} else {
				d3.selectAll('.reliabilityBar').transition().duration(500).style('fill', function(d,i){
					return colorLightgrey[i];
				});	
				filters.reliability.forEach(function(d,i){

					d3.select('.reliabilityBar.reliability'+(d)).transition().duration(200)
					.style('fill', colorSecondary[d-1])

				});
			}

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
			d3.select('#reliabilityRemoveFilter').style('opacity', 0).style('cursor', 'default');
			d3.selectAll('.reliabilityBar').transition().duration(200).style('fill', function(d,i){
				return colorSecondary[i];
			});	
			return filter('reliability', 'clear'); 
		});

		//**************************
		// severity/reliabilty average trendline smoothing slider
		//**************************

		// create slider

		// create average svg
		var avgSliderSvg = this.createSvg({
			id: 'avg_slide_svg',
			viewBoxWidth: 300,
			viewBoxHeight: 40,
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

		// xlink:href="firefox.jpg" x="0" y="0" height="50px" width="50px"

		avgSliderSvg.on('mouseover', function(){
			d3.selectAll('#severityTrendline, #reliabilityTrendline')
			.style('stroke-width',2)
			.transition().duration(750)
			.style('stroke-opacity',1);

			d3.select('#chartarea').transition().duration(750).style('opacity', 0.2);

		}).on('mouseout', function(){
			if(avgSliderBrushing==false){
				d3.selectAll('#severityTrendline, #reliabilityTrendline')
				.style('stroke-width',1)
				.transition().duration(750)
				.style('stroke-opacity',0.4);	

				d3.select('#chartarea').transition().duration(750).style('opacity', 1);		
			}
		});


		var sliderPadding = 60;

		var xt = d3.scaleLinear()
		    .domain([1, 0.1])
		    .range([0, 190-sliderPadding])
		    .clamp(true);

		var slider = avgSliderSvg.append("g")
		    .attr("class", "slider")
		    .attr("transform", "translate("+139+",20)");

		avgSliderSvg.append("text")
		.attr('class', 'avgSliderLabel')
		.text('Avg. trendline smoothing')
		.attr('y', 21)

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

		        		d3.selectAll('#severityTrendline, #reliabilityTrendline')
					.style('stroke-width',1)
					.transition().duration(750)
					.style('stroke-opacity',0.4);	

					d3.select('#chartarea').transition().duration(500).style('opacity', 1);
		        })
		        .on("start drag", function() { 
		        	avgSliderBrushing = true;
		        	var h = xt.invert(d3.event.x)
					// handle.attr("cx", xt(h));
					handle.attr('transform', 'translate('+xt(h)+',-10)')
		        	smoothAverage(h); }));

		slider.insert("g", ".track-overlay")
		    .attr("class", "ticks")
		    .attr("transform", "translate(0," + sliderPadding/2 + ")");

		// var handle = slider.insert("circle", ".track-overlay")
		//     .attr("class", "handle")
		//     .attr("r", 7)
		//     .attr("cx", xt(0.5));



		slider.insert("g", ".track-overlay")
		    .attr("class", "ticks")
		    .attr("transform", "translate(0," + sliderPadding/2 + ")");

		// var handle = slider.insert("circle", ".track-overlay")
		//     .attr("class", "handle")
		//     .attr("r", 7)
		//     .attr("cx", xt(0.5));

		// 	}

		var handle = slider.insert('g', '.track-overlay')
			.attr('transform', 'translate('+xt(0.5)+',-10)')
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

		if(value=='clear'){
			filters[filterClass] = [];
		} else {
			addOrRemove(filters[filterClass], value);		
		}

		// reset data using original loaded data
		data = originalData;

		d3.select('#severityRemoveFilter').style('opacity', 0).style('cursor', 'default');
		d3.select('#reliabilityRemoveFilter').style('opacity', 0).style('cursor', 'default');

		// apply filters to data array
		if(filters['severity'].length==5){
			filters['severity'] = [];
		}
		if(filters['severity'].length>0){
			data = data.filter(function(d){return  filters['severity'].includes(d['severity']);});
			d3.select('#severityRemoveFilter').style('opacity', 1).style('cursor', 'pointer');
		}
		if(filters['reliability'].length==5)filters['reliability'] = [];
		if(filters['reliability'].length>0){
			data = data.filter(function(d){return  filters['reliability'].includes(d['reliability']);});
			d3.select('#reliabilityRemoveFilter').style('opacity', 1).style('cursor', 'pointer');
		}
		if(filters['sector'].length>0)
			data = data.filter(function(d){return  filters['sector'].includes(d['sector']);});

		if(filters['affectedGroups'].length>0)
			data = data.filter(function(d){return  filters['affectedGroups'].includes(d['affectedGroups']);});

		if(filters['specificNeeds'].length>0)
			data = data.filter(function(d){return  filters['specificNeeds'].includes(d['specificNeeds']);});

		updateTimeline(filterClass);

	}

	//**************************
	// get the data
	//**************************
	var updateTimeline = function(target = null){

		refreshData();

		// update bars

		// bar groups
		var bars = d3.selectAll(".barGroup");

		bars.each(function(d,i){

			var timeid = this.id;

			var dD = dataByDate.filter(obj => {
				return 'date'+obj.date.getTime() == timeid;
			})[0]

			var group = d3.select(this);

			var eventDrops = group.selectAll('.eventDrop' )

			if(dD){

				var iBars = group.selectAll('.bar' )
				.style('fill', function(d,i){
					if(filters.toggle=='severity'){
						return colorPrimary[i];
					} else {
						return colorSecondary[i];
					}
				})
				.transition().duration(500)
				.attr("height", function(d,i) {
					return timechartHeight-scale.timechart.y1(dD[filters.toggle][i]); 
				})
				.attr("y", function(d,i) { 
					var d = dD[filters.toggle][i];
					if(i>0){
						var prevY = bars.data()[i-1].y;
					} else {
						var prevY = 0;
					}

					bars.data()[i].y = d + prevY;

					return scale.timechart.y1(d + prevY);

				});

				eventDrops.transition().duration(500)
				.attr('r', function(d,i){
					var dx = dD['context'][i]
					return dx*4;
				})

			} else {

				group.selectAll('.bar').transition("h").duration(0).attr('height',0);
				group.selectAll('.bar').transition().duration(500).attr('y',timechartHeight).attr('height',0);

				eventDrops.transition().duration(750)
				.attr('r', 0)
			}

			colorBars();

		})

		updateSeverityReliability(target);
		updateTrendline();
		updateBubbles();

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
					dataByLocationSum[g] = t;
				}
	   		}
		});

		var bubbles = d3.selectAll('.map-bubble')
			.attr('transform', function(d,i){
				return 'scale('+scale.map(dataByLocationSum[i])+')';
			})
			.style('opacity', function(d,i){
				if(dataByLocationSum[i]>0){
					return 1;
				} else {
					return 0;
				}
			}).select('.map-bubble-value')
	        .text(function(d,i){
	        	return dataByLocationSum[i];
	        });

		var map = document.getElementById("map");
		map.setAttribute("style","height:"+(map.offsetWidth*0.8)+"px");

	}

	//**************************
	// update date text 
	//**************************
	function updateDate(){
		var dateformatter = d3.timeFormat("%d %b %Y");
		var dx = new Date(dateRange[1]);
		var dateTo = dx.setDate(dx.getDate()-1);
		var string = dateformatter(dateRange[0]) + ' - ' + dateformatter(dateTo);
		d3.select('#dateRange').text(string);
	}

	function updateTotals(){

		var dc = data.filter(function(d){return ((d.date>=dateRange[0])&&(d.date<dateRange[1])) ;});

		// define maximum context value
		var contextualRowTotals = d3.nest()
		.key(function(d) { return d.context;})
		.rollup(function(leaves) { return leaves.length; })
		.entries(dc);

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
		// refreshData();
		//**************************
		// trendline
		//**************************

		// define y-axis
		var trendlineY = d3.scaleLinear()
			.range([timechartHeight, 0])
			.domain([1, (5)]);

		tp_severity = [];
		tp_reliability = [];

		trendlinePoints.forEach(function(d,i){
			d.x = xScale(d.date)+barWidth/2;
			d.y_severity = trendlineY(d.severity_avg);
			d.y_reliability = trendlineY(d.reliability_avg);
			tp_severity.push([d.x,d.y_severity]);
			tp_reliability.push([d.x,d.y_reliability]);
		});

		tp_severity.sort(function(x, y){
		   return d3.ascending(x[0], y[0]);
		});

		tp_reliability.sort(function(x, y){
		   return d3.ascending(x[0], y[0]);
		});

		pathData.severity = lineGenerator(tp_severity);
		pathData.reliability = lineGenerator(tp_reliability);

		// trendline
		var severityTrendline = d3.select('#severityTrendline')
			.attr('d', pathData.severity);

		var reliabilityTrendline = d3.select('#reliabilityTrendline')
			.attr('d', pathData.reliability);

	}

	function smoothAverage(v = 0.5){

		d3.selectAll('#severityTrendline, #reliabilityTrendline')
		.style('stroke-width',2)
		.style('stroke-opacity',1);

		d3.select('#chartarea').style('opacity', 0.2);

		lineGenerator = d3.line().curve(d3.curveBundle.beta(v))

		pathData.severity = lineGenerator(tp_severity);
		pathData.reliability = lineGenerator(tp_reliability);

		var severityTrendline = d3.select('#severityTrendline')
			.attr('d', pathData.severity);

		var reliabilityTrendline = d3.select('#reliabilityTrendline')
			.attr('d', pathData.reliability);

	}

	//**************************
	// update severity / reliability bars
	//**************************
	function updateSeverityReliability(target=null){

		var s_total = 0;
		var r_total = 0;
		var severity = [0,0,0,0,0];
		var severityRolling = [0,0,0,0,0];
		var severityCount = 0;
		var reliability = [0,0,0,0,0];
		var reliabilityRolling = [0,0,0,0,0];
		var reliabilityCount = 0;
		var timedata = originalData;

		d3.selectAll('.severityBar')
		.attr('fill', function(d,i){
			return colorPrimary[i];
		});
		d3.selectAll('.reliabilityBar')
		.attr('fill', function(d,i){
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
			d.severity = [0,0,0,0,0];
			var count = 0;
			d.values.forEach(function(dx){
				d.severity[dx.key-1] = dx.value;
				count += dx.value;
			});

			d.total_entries = count;

		    d.severity_avg = ( (1*d.severity[0]) + (2*d.severity[1]) + (3*d.severity[2]) + (4*d.severity[3]) + (5*d.severity[4]) ) / count;

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

			d.reliability = [0,0,0,0,0];
			d.severity = [0,0,0,0,0];


			dateByReliability[i].values.forEach(function(dx){
				d.reliability[dx.key-1] = dx.value;
				count += dx.value;
			});

			d.total_entries = count;

		    d.reliability_avg = ( (1*d.reliability[0]) + (2*d.reliability[1]) + (3*d.reliability[2]) + (4*d.reliability[3]) + (5*d.reliability[4]) ) / count;

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

			if((target=='reliability')||(target=='init')||(target=='brush')){
				d3.selectAll('.severityBar')
				.attr('opacity', 1)
				.attr('x', function(d,i){
					if(i==0){
						var s = 0;
					} else {
						var s = severityRolling[i-1];
					}
					return (s/s_total)*1000;
				})
				.attr('width', function(d,i){
					return (severity[i]/s_total)*1000;
				});				
			};

			if((target=='severity')||(target=='init')||(target=='brush')){

				d3.selectAll('.reliabilityBar')
				.attr('opacity', 1)
				.attr('x', function(d,i){
					if(i==0){
						var s = 0;
					} else {
						var s = reliabilityRolling[i-1];
					}
					return (s/r_total)*1000;
				})
				.attr('width', function(d,i){
					return (reliability[i]/r_total)*1000;
				});
			}

			var severityAverage = ( (1*severity[0]) + (2*severity[1]) + (3*severity[2]) + (4*severity[3]) + (5*severity[4]) ) / s_total;
			d3.select('#severity_value').text(severityArray[(Math.round(severityAverage)-1)] + ' ('+ severityAverage.toFixed(1) +')' )

			d3.select('#severityAvg').attr('x',function(d){
				return scale.severity.x(severityAverage);
			});

			var reliabilityAverage = ( (1*reliability[0]) + (2*reliability[1]) + (3*reliability[2]) + (4*reliability[3]) + (5*reliability[4]) ) / r_total;
			d3.select('#reliability_value').text(reliabilityArray[(Math.round(reliabilityAverage)-1)] + ' ('+ reliabilityAverage.toFixed(1) +')' )
			
			d3.select('#reliabiltiyAvg').attr('x',function(d){
				return scale.severity.x(reliabilityAverage);
			});

		} else {

			d3.select('#severity_value').text('');
			d3.select('#reliability_value').text('');

			d3.selectAll('.severityBar')
			.attr('fill', '#CDCDCD');
			d3.selectAll('.reliabilityBar')
			.attr('fill', '#CDCDCD');

			d3.select('#reliabiltiyAvg').attr('x',-100);
			d3.select('#severityAvg').attr('x',-100);
		}
	}


	//**************************
	// toggle between severity and reliability
	//**************************
	var toggle = function(d){

		if(d != 'severity'){
			// switch to Reliability
			d3.select('#reliabilityToggle').style('opacity', 1);
			d3.select('#severityToggle').style('opacity', 0);
			filters.toggle = 'reliability';

			d3.select('#reliabilityTrendline').style('opacity',1);
			d3.select('#severityTrendline').style('opacity',0);

			d3.select('#total_entries').style('color',colorSecondary[3]);
			d3.select('#timechartTitle').text('ENTRIES BY DATE AND BY RELIABILITY');

			d3.selectAll('.eventDrop').style('fill', colorSecondary[3]);

			d3.select('#rightAxisLabel').text('Avg. Reliability');
			d3.select('#rightAxisLabelLine').style('stroke', colorSecondary[3]);
			d3.select('#leftAxisBox').style('fill', colorSecondary[3]);
			d3.select('.selection').style('fill', colorSecondary[1]);

			d3.selectAll('.outerCircle').style('stroke', colorSecondary[3]);
			d3.selectAll('.innerCircle').style('fill', colorSecondary[3]);

			// update colors of contextual row total values
			d3.selectAll('.total-label').style('fill', colorSecondary[4]);

			d3.select('#dateRange').style('color', colorSecondary[4]);



		} else {
			// switch to Severity
			d3.select('#reliabilityToggle').style('opacity', 0);
			d3.select('#severityToggle').style('opacity', 1);	
			filters.toggle = 'severity';

			d3.select('#severityTrendline').style('opacity',1);
			d3.select('#reliabilityTrendline').style('opacity',0);

			d3.select('#total_entries').style('color',colorPrimary[3]);

			d3.select('#timechartTitle').text('ENTRIES BY DATE AND BY SEVERITY');
			d3.selectAll('.eventDrop').style('fill', colorPrimary[3]);
			d3.select('#rightAxisLabel').text('Avg. Severity');
			d3.select('#rightAxisLabelLine').style('stroke', colorPrimary[3]);
			d3.select('#leftAxisBox').style('fill', colorPrimary[3]);
			d3.select('.selection').style('fill', colorPrimary[2]);

			d3.selectAll('.outerCircle').style('stroke', colorPrimary[3]);
			d3.selectAll('.innerCircle').style('fill', colorPrimary[3]);

			// update colors of contextual row total values
			d3.selectAll('.total-label').style('fill', colorPrimary[4]);

			d3.select('#dateRange').style('color', colorPrimary[3]);


		}

		updateTimeline();
	}


	function colorBars(){

		d3.selectAll('.barGroup').each(function(d,i){

			if((d.date<dateRange[0])||(d.date>= dateRange[1])){
				d3.select(this).selectAll('.bar').style('fill', function(d,i){
					return colorLightgrey[i];
				}).style('fill-opacity', 1);
				d3.select(this).selectAll('.eventDrop').style('fill', function(d,i){
					return colorLightgrey[1];
				});

			} else {
				d3.select(this).selectAll('.bar').style('fill', function(d,i){
					if(filters.toggle == 'severity'){
						return colorPrimary[i];
					} else {
						return colorSecondary[i];
					}
				}).style('fill-opacity', 1);

				d3.select(this).selectAll('.eventDrop').style('fill', function(d,i){
					if(filters.toggle == 'severity'){
						return colorPrimary[3];
					} else {
						return colorSecondary[3];
					}
				});
			}
		});
	}

	//**************************
	// resizing
	//**************************

	var scrollable = false;

	window.onresize = function(){
		setTimeout(resizeDevice, 10);
	}

	var resizeDevice = function() {

		// set map height
		var map = document.getElementById("map");
		map.setAttribute("style","height:"+(map.offsetWidth*0.8)+"px");

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
	} // .resize

	//**************************
	// useful functions
	//**************************

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