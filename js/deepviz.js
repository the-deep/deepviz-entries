var Deepviz = function(sources, callback){

	// define variables
	var dateRange = [new Date(2019, 2, 1), new Date(2019, 3, 31)];
	var minDate = new Date(2019,0,1);
	var data; // active dataset after filters applied
	var originalData; // full original dataset without filters (used to refresh/clear filters)
	var trendlinePoints; 
	var barWidth;
	var reliabilityArray = ["Unreliable", "Not Usually Reliable", "Fairly Reliable", "Usually Reliable", "Completely Reliable"];
	var severityArray = ["No/minor problem", "Of Concern", "Major", "Severe", "Critical"];
	var colorGreen = ['#A1E6DB', '#76D1C3', '#36BBA6', '#1AA791', '#008974'];
	var colorGrey = ['#CDCDCD', '#AFAFAF', '#939393', '#808080', '#646464'];
	var colorLightgrey = ['#EBEBEB', '#CFCFCF', '#B8B8B7', '#A8A9A8', '#969696'];
	var colorBlue = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];
	var colorOrange = ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'];
	var yScale;
	var xScale;
	var pathData = {};
	var clickTimer = 0;
	var timechartHeight = 400;
	var timechartHeightOriginal = timechartHeight;
	var numContextualRows = 5;
	var metadata;
	var sxScale = d3.scaleLinear()
		.range([0, 995])
		.domain([1, 5]);// severity/reliability x xcale

	// filters
	var filters = {
		sector: [],
		severity: [],
		reliability: [],
		affectedGroups: [],
		specificNeeds: [],
		toggle: 'severity'
	};

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

		console.log('loading "' + url +'"');
	});

	// after all data has been loaded
	Promise.all(promises).then(function(values) {
		// do something after data has been loaded
		console.log('all data loaded');
		// return the data
		data = values[0].deep.data;
		metadata = values[0].deep.meta_data;


		data = data.filter(function(d){return new Date(d.date) >= minDate;});
		originalData = data;

		d3.selectAll('.severityToggle').on('click', function(){
			toggle('severity');
		});

		d3.selectAll('.reliabilityToggle').on('click', function(){
			toggle('reliability');
		});

		return callback(values);
	});

	//**************************
	// svg
	//**************************
	this.createSvg = function(options){

		console.log('create svg');
		// defaults
		var width = '100%',
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
		.attr('width', width)
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

		// margins
		var margin = {top: 18, right: 25, bottom: 0, left: 37};
		var chartdata = updateTimeline();

		// container g, and
		var svg = options.appendTo
		.append("svg")
		.attr('id', options.id)
		.attr('class', options.id)
		.style('opacity', options.opacity)
		.attr('x',0+options.offsetX)
		.attr('y',0+options.offsetY)
		.attr('width',options.width)
		.attr('height', options.svgheight)
		.append('g')
		.attr("transform", "translate(0,0)");

		options.width = options.width - (margin.right + margin.left);
		timechartHeight = timechartHeight - (margin.top + margin.bottom);

		var svgBg = svg.append('g');

		svgBg.append('rect')
		.attr('x',margin.left)
		.attr('y',margin.top)
		.attr('width',options.width)
		.attr('height',timechartHeight)
		.attr('opacity',0);

		var gridlines = svg.append('g').attr('id', 'gridlines').attr('class', 'gridlines').attr('transform', 'translate('+margin.left+','+margin.top+')');
		var svgChartBg = svg.append('g').attr('id', 'svgchartbg').attr('class', 'chartarea').attr('transform', 'translate('+margin.left+','+margin.top+')');
		var svgChart = svg.append('g').attr('class', 'chartarea').attr('transform', 'translate('+margin.left+','+margin.top+')');

		var color = options.color;

		// reorganize data
		chartdata.forEach(function(d, i) {
			d.date = new Date(d.date);
			d.date.setHours(0);
			d.barValues = d.severity;
		});

		// define maximum date 
		var maxDate = new Date(d3.max(chartdata, function(d){
			return d.date;
		}));

		// define minimum date 
		var minDate = new Date(d3.min(chartdata, function(d){
			return d.date;
		}));

		var dateMax = new Date(maxDate);
		dateMax.setDate(maxDate.getDate() + 1);
		dateMax.setHours(0);
		dateMax.setMinutes(0);

		var dateIndex = chartdata.map(function(d) { return d[options.dataKey]; });

		var maxValue = d3.max(chartdata, function(d) {
			return d.total_entries;
		});

		barWidth = options.width/dateIndex.length;


	    // define scales
	    xScale = d3.scaleTime()
	    .domain([minDate, dateMax])
	    .range([0, options.width+barWidth])
	    .rangeRound([0, options.width], 0)

	    var xAxis = d3.axisBottom()
	    .scale(xScale)
	    .tickSize(0)
	    .tickPadding(10)
	    .ticks(d3.timeMonth.every(1))
	    .tickFormat(d3.timeFormat("%b %Y"));

	    //**************************
	    // Y AXIS left
	    //**************************
		yScale = d3.scaleLinear()
		.range([timechartHeight, 0])
		.domain([0, (maxValue)]);


		if(options.maxValue=='round'){
			yScale = d3.scaleLinear()
			.range([timechartHeight, 0])
			.domain([0, rounder(maxValue)]);
		}

		var yAxis = d3.axisLeft()
		.scale(yScale)
		.ticks(4)
		.tickSize(0)
		.tickPadding(4);

		// y-axis
		var yAxisText = svgBg.append("g")
		.attr("class", "yAxis axis")
		.attr('transform', 'translate('+(margin.left-1)+','+margin.top+')')
		.call(yAxis)
		.style('font-size', options.yAxis.font.values.size);

		yAxisText
		.append("text")
		.attr('class','axisLabel')
		.attr("transform", "rotate(-90)")
		.attr("y", -25)
		.attr("x", -140)
		.style('font-weight','normal')
		.style('font-size', '15px')
		.style('fill', '#000')
		.text('Total Entries')

		yAxisText
		.append("rect")
		.attr('id', 'leftAxisBox')
		.attr("y", 230)
		.attr("x", -37)
		.attr('width', 10)
		.attr('height', 13)
		.style('fill', colorGreen[3]);

		
		//**************************
		// Y AXIS right
		//**************************

		// define y-axis secondary
		yScale2 = d3.scaleLinear()
		.range([timechartHeight, 0])
		.domain([1, 5]);

		var yAxis2 = d3.axisRight()
		.scale(yScale2)
		.ticks(1)
		.tickSize(5)
		.tickPadding(4);

		var yAxisText2 = svgBg.append("g")
		.attr("class", "yAxis axis")
		.attr('transform', 'translate('+(options.width + margin.left-1)+','+margin.top+')')
		.call(yAxis2)
		.style('font-size', options.yAxis.font.values.size);

		yAxisText2
		.append("text")
		.attr('class','axisLabel')
		.attr('id', 'rightAxisLabel')
		.attr("transform", "rotate(-90)")
		.attr("y", 23)
		.attr("x", -225)
		.style('font-weight','normal')
		.style('font-size', '15px')
		.style('fill', '#000')
		.text('Avg. Severity')

		yAxisText2
		.append("text")
		.attr('class','axisLabel0')
		.attr("y", timechartHeight+4)
		.attr("x", 8)
		.style('font-weight','normal')
		.style('font-size', '15px')
		.style('fill', '#000')
		.text('1')

		yAxisText2
		.append("line")
		.attr('id', 'rightAxisLabelLine')
		.attr("y1", 238)
		.attr("y2", 255)
		.attr("x1", 18)
		.attr("x2", 18)
		.style('stroke', colorGreen[3])
		.style('stroke-width',4)
		.style('stroke-opacity',1)
		.style('stroke-dasharray', '2 3');

		// add the Y gridlines
		gridlines.append("g")			
		.attr("class", "grid")
		.call(make_y_gridlines()
			.tickSize(-options.width)
			.tickFormat("")
			);

		// gridlines in y axis function
		function make_y_gridlines() {		
			return d3.axisLeft(yScale).ticks(5);
		}

		// x-axis 
		console.log('xaxis');
		var xAxisObj = svgBg.append("g")
		.attr("class", "xAxis axis")
		.attr("transform", "translate(" + margin.left + "," + (timechartHeight + margin.top +1) + ")")
		.call(xAxis)
		.style('font-size', options.xAxis.font.values.size)
		.style('font-weight', options.xAxis.font.values.weight)
		.style('fill', options.xAxis.font.values.color)

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
		.attr('y2', timechartHeight+margin.top+1)


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
			return colorGreen[i];
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
			return yScale(d + prevY); 
		})
		.attr("height", function(d,i) { 
			return timechartHeight-yScale(d); 
		})
		.style('fill', function(d,i){ if(color.length > 1){return color[i]} else {return color[0];}})
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


		// *************************
		// draw contextual rows
		//**************************

		var timechart = d3.select('#timeChart');
		var yPadding =25;

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
			.attr('y',-40)
			.style('fill', '#FFF')
			.style('fill-opacity',1);

		contextualRows.append('rect')
			.attr('height', contextualRowsHeight+45)
			.attr('width', 35)
			.attr('x', 1245)
			.attr('y',-40)
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
			.attr('y2', 0)
			.style('stroke', '#DCDCDC');

			contextualRows
			.append('line')
			.attr('class', 'contextualRowLine')
			.attr('x1',0)
			.attr('x2',1250)
			.attr('y1', contextualRowsHeight)
			.attr('y2', contextualRowsHeight)
			.style('stroke', colorLightgrey[0])

			rows.append('text').text(function(d,i){
				return d.name.toUpperCase();
			})
			.attr('y',17)
			.attr('x',1)
			.style('font-weight', 'bold')

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
				return contextualRowsHeight + 110 + (contextualRowHeight*i);
			})
			.style('fill', colorGreen[3]);

		//**************************
		// date slider brushes
		//**************************
	    // initialise the brush
	    var brush = d3.brushX()
		    .extent([[0, -margin.top], [options.width, options.svgheight-(margin.top+margin.bottom)]])
	        .on("brush", brushed)
	        .on("start", brush);

	    // add the selectors
	    var gBrush = svgChart.append("g")
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

			colorBars(dateRange);
			updateDate(dateRange);
			updateTotal(dateRange);
			updateSeverityReliability(dateRange);

			d3.select(this).call(d3.event.target.move, dateRange.map(xScale));
			handleTop.attr("transform", function(d, i) { return "translate(" + (dateRange.map(xScale)[i]-1) + ", -"+ margin.top +")"; });
			handleBottom.attr("transform", function(d, i) { return "translate(" + (dateRange.map(xScale)[i]-1) + ", " + (options.svgheight - margin.top) + ")"; });

		}

		function brush() {

			if(!d3.event.sourceEvent) return;
			if(d3.event.sourceEvent.type === "brush") return;


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

		colorBars(dateRange);
		updateDate(dateRange);
		updateTotal(dateRange);
		updateSeverityReliability(dateRange);

		//**************************
		// trendline
		//**************************
		var lineGenerator = d3.line()
			.curve(d3.curveCardinal);

		// define y-axis
		var trendlineY = d3.scaleLinear()
			.range([timechartHeight, 0])
			.domain([1, (5)]);


		var lineGenerator = d3.line()
			.curve(d3.curveBundle.beta(.46));

		var tp_severity = [];
		var tp_reliability = [];

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
		var severityTrendline = d3.select('#svgchartbg').append('path')
			.attr('d', pathData.severity)
			.style('fill', 'none')
			.style('stroke', colorGreen[4])
			.attr('id', 'severityTrendline');

		var reliabilityTrendline = d3.select('#svgchartbg').append('path')
			.attr('d', pathData.reliability)
			.style('fill', 'none')
			.style('opacity',0)
			.style('stroke', colorOrange[4])
			.attr('id', 'reliabilityTrendline');

		//**************************
		// update functions 
		//**************************

		// update date range text in the chart header
		function updateDate(d1){
			dateRange = d1;
			var dateformatter = d3.timeFormat("%d %b %Y");
			var dx = new Date(d1[1]);
			var dateTo = dx.setDate(dx.getDate()-1);
			var string = dateformatter(d1[0]) + ' - ' + dateformatter(dateTo);
			d3.select('#dateRange').text(string);
		}

		// update total entries widget
		function updateTotal(d1){
			var total = d3.sum(chartdata, function(d){
				if((d.date>=d1[0])&&(d.date<d1[1]))
					return d.total_entries;
			});
			d3.select('#total_entries').text(total);
		}

		// update severity and reliability bars
		function updateSeverityReliability(d1){

			d3.selectAll('.severityBar')
			.attr('fill', function(d,i){
				return colorGreen[i];
			});
			d3.selectAll('.reliabilityBar')
			.attr('fill', function(d,i){
				return colorOrange[i];
			});

			var total = 0;
			var severity = [0,0,0,0,0];
			var severityRolling = [0,0,0,0,0];
			var severityCount = 0;

			var reliability = [0,0,0,0,0];
			var reliabilityRolling = [0,0,0,0,0];
			var reliabilityCount = 0;

			chartdata.forEach(function(d){
				if((d.date>=d1[0])&&(d.date<d1[1])){
					for (i = 0; i < severity.length; i++) { 
						severity[i] += d.severity[i];
						reliability[i] += d.reliability[i];
					}
					total += d.total_entries;
				}
			});

			if(total>0){

				for (i = 0; i < severity.length; i++) { 
					severityCount += severity[i];
					severityRolling[i] = severityCount;
					reliabilityCount += reliability[i];
					reliabilityRolling[i] = reliabilityCount;
				}

				d3.selectAll('.severityBar')
				.attr('opacity', 1)
				.attr('x', function(d,i){
					if(i==0){
						var s = 0;
					} else {
						var s = severityRolling[i-1];
					}
					return (s/total)*1000;
				})
				.attr('width', function(d,i){
					return (severity[i]/total)*1000;
				});

				d3.selectAll('.reliabilityBar')
				.attr('opacity', 1)
				.attr('x', function(d,i){
					if(i==0){
						var s = 0;
					} else {
						var s = reliabilityRolling[i-1];
					}
					return (s/total)*1000;
				})
				.attr('width', function(d,i){
					return (reliability[i]/total)*1000;
				});

				var severityAverage = ( (1*severity[0]) + (2*severity[1]) + (3*severity[2]) + (4*severity[3]) + (5*severity[4]) ) / total;
				d3.select('#severity_value').text(severityArray[(Math.round(severityAverage)-1)] + ' ('+ severityAverage.toFixed(1) +')' )

				d3.select('#severityAvg').attr('x',function(d){
					return sxScale(severityAverage);
				});

				var reliabilityAverage = ( (1*reliability[0]) + (2*reliability[1]) + (3*reliability[2]) + (4*reliability[3]) + (5*reliability[4]) ) / total;
				d3.select('#reliability_value').text(reliabilityArray[(Math.round(reliabilityAverage)-1)] + ' ('+ reliabilityAverage.toFixed(1) +')' )
				
				d3.select('#reliabiltiyAvg').attr('x',function(d){
					return sxScale(reliabilityAverage);
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

		return bars;
	}

	//**************************
	// severity chart
	//**************************
	this.createSeverityChart = function(options){

		// create severity svg
		var severitySvg = this.createSvg({
			id: 'severitySvg',
			viewBoxWidth: 1000,
			viewBoxHeight: 43,
			div: '#severity_bars',
			width: '100%'
		});

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
			return colorGreen[i];
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


			d3.selectAll('.severityBar').style('stroke-width', 0).transition().duration(500).style('stroke-opacity',0)
			d3.selectAll('.bar').transition("mouseoutReliability").duration(500).style('opacity', 1).style('stroke-opacity', 0);
	
			clickTimer = 1;

			filter('severity',i+1);

			if(filters.severity.length==0){
				d3.selectAll('.severityBar').transition().duration(200).style('fill', function(d,i){
					return colorGreen[i];
				});		
			} else {
				d3.selectAll('.severityBar').transition().duration(500).style('fill', function(d,i){
					return colorLightgrey[i];
				});	
				filters.severity.forEach(function(d,i){

					d3.select('.severityBar.severity'+(d)).transition().duration(200)
					.style('fill', colorGreen[d-1])

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
			console.log('click');
			d3.select('#severityRemoveFilter').style('display', 'none');
			d3.selectAll('.severityBar').transition().duration(200).style('fill', function(d,i){
				return colorGreen[i];
			});	
			return filter('severity', 'clear'); 
		});

	}

	//**************************
	// reliability chart
	//**************************
	this.createReliabilityChart = function(options){

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
			return colorGreen[i];
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
					return colorOrange[i];
				});		
			} else {
				d3.selectAll('.reliabilityBar').transition().duration(500).style('fill', function(d,i){
					return colorLightgrey[i];
				});	
				filters.reliability.forEach(function(d,i){

					d3.select('.reliabilityBar.reliability'+(d)).transition().duration(200)
					.style('fill', colorOrange[d-1])

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
			console.log('click');
			d3.select('#reliabilityRemoveFilter').style('display', 'none');
			d3.selectAll('.reliabilityBar').transition().duration(200).style('fill', function(d,i){
				return colorOrange[i];
			});	
			return filter('reliability', 'clear'); 
		});

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

		d3.select('#severityRemoveFilter').style('display', 'none');
		d3.select('#reliabilityRemoveFilter').style('display', 'none');

		// apply filters to data array
		if(filters['severity'].length==5){
			filters['severity'] = [];
		}
		if(filters['severity'].length>0){
			data = data.filter(function(d){return  filters['severity'].includes(d['severity']);});
			d3.select('#severityRemoveFilter').style('display', 'inline');
		}
		if(filters['reliability'].length==5)filters['reliability'] = [];
		if(filters['reliability'].length>0){
			data = data.filter(function(d){return  filters['reliability'].includes(d['reliability']);});
			d3.select('#reliabilityRemoveFilter').style('display', 'inline');
		}
		if(filters['sector'].length>0)
			data = data.filter(function(d){return  filters['sector'].includes(d['sector']);});

		if(filters['affectedGroups'].length>0)
			data = data.filter(function(d){return  filters['affectedGroups'].includes(d['affectedGroups']);});

		if(filters['specificNeeds'].length>0)
			data = data.filter(function(d){return  filters['specificNeeds'].includes(d['specificNeeds']);});

		updateTimeline();
	}

	//**************************
	// get the data
	//**************************
	var updateTimeline = function(){
		// use filters
		console.log('updateTimeline()');

		var timedata = data;

		var dateData = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.severity; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(timedata);

		var contextData = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.context; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(timedata);

		var dateByReliability = d3.nest()
		.key(function(d) { return d.date;})
		.key(function(d) { return d.reliability; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(timedata);

		trendlinePoints = [];

		dateData.forEach(function(d,i){
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

			contextData[i].values.forEach(function(dx, ii){
				var k = dx.key-1;
				contextArr[k] = dx.value
			});

		    d.context = contextArr;

			d.total_entries = count;

		    d.severity_avg = ( (1*d.severity[0]) + (2*d.severity[1]) + (3*d.severity[2]) + (4*d.severity[3]) + (5*d.severity[4]) ) / count;
		    d.reliability_avg = ( (1*d.reliability[0]) + (2*d.reliability[1]) + (3*d.reliability[2]) + (4*d.reliability[3]) + (5*d.reliability[4]) ) / count;

		    trendlinePoints.push({date: d.date, "severity_avg": d.severity_avg, "reliability_avg": d.reliability_avg });

			delete d.values;
		});

		// update bars

		// bar groups
		var bars = d3.selectAll(".barGroup");


		bars.each(function(d,i){

			var timeid = this.id;

			var dD = dateData.filter(obj => {
				return 'date'+obj.date.getTime() == timeid;
			})[0]

			var group = d3.select(this);

			var eventDrops = group.selectAll('.eventDrop' )

			if(dD){

				var iBars = group.selectAll('.bar' )
				.style('fill', function(d,i){
					if(filters.toggle=='severity'){
						return colorGreen[i];
					} else {
						return colorOrange[i];
					}
				})
				.transition().duration(500)
				.attr("height", function(d,i) {
					return timechartHeight-yScale(dD[filters.toggle][i]); 
				})
				.attr("y", function(d,i) { 
					var d = dD[filters.toggle][i];
					if(i>0){
						var prevY = bars.data()[i-1].y;
					} else {
						var prevY = 0;
					}

					bars.data()[i].y = d + prevY;

					return yScale(d + prevY);

				});

				eventDrops.transition().duration(500)
				.attr('r', function(d,i){
					var dx = dD['context'][i]
					return dx*4;
				})

				// .transition().duration(500)
				// .attr("height", function(d,i) {
				// 	return timechartHeight-yScale(dD[filters.toggle][i]); 
				// })
				// .attr("y", function(d,i) { 
				// 	var d = dD[filters.toggle][i];
				// 	if(i>0){
				// 		var prevY = bars.data()[i-1].y;
				// 	} else {
				// 		var prevY = 0;
				// 	}

				// 	bars.data()[i].y = d + prevY;

				// 	return yScale(d + prevY);

				// });



			} else {


				group.selectAll('.bar').transition("h").duration(0).attr('height',0);
				group.selectAll('.bar').transition().duration(500).attr('y',timechartHeight).attr('height',0);

				eventDrops.transition().duration(750)
				.attr('r', 0)
			}

			colorBars(dateRange);

		})

		// // reorganize data
		// dateData.forEach(function(d, i) {
		// 	d.date = new Date(d.date);
		// 	d.date.setHours(0);
		// 	d.barValues = d[filters.toggle];
		// });

		// // define maximum date 
		// var maxDate = new Date(d3.max(dateData, function(d){
		// 	return d.date;
		// }));

		// // define minimum date 
		// var minDate = new Date(d3.min(dateData, function(d){
		// 	return d.date;
		// }));

		// var maxValue = d3.max(dateData, function(d) {
		// 	return d.total_entries;
		// });



		return dateData;
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

			d3.select('#total_entries').style('color',colorOrange[3]);
			d3.select('#timechartTitle').text('ENTRIES BY DATE AND BY RELIABILITY');

			d3.selectAll('.eventDrop').style('fill', colorOrange[3]);

			d3.select('#rightAxisLabel').text('Avg. Reliability');
			d3.select('#rightAxisLabelLine').style('stroke', colorOrange[3]);
			d3.select('#leftAxisBox').style('fill', colorOrange[3]);
			d3.select('.selection').style('fill', colorOrange[1]);

		} else {
			// switch to Severity
			d3.select('#reliabilityToggle').style('opacity', 0);
			d3.select('#severityToggle').style('opacity', 1);	
			filters.toggle = 'severity';

			d3.select('#severityTrendline').style('opacity',1);
			d3.select('#reliabilityTrendline').style('opacity',0);

			d3.select('#total_entries').style('color',colorGreen[3]);

			d3.select('#timechartTitle').text('ENTRIES BY DATE AND BY SEVERITY');
			d3.selectAll('.eventDrop').style('fill', colorGreen[3]);
			d3.select('#rightAxisLabel').text('Avg. Severity');
			d3.select('#rightAxisLabelLine').style('stroke', colorGreen[3]);
			d3.select('#leftAxisBox').style('fill', colorGreen[3]);
			d3.select('.selection').style('fill', colorGreen[2]);

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
						return colorGreen[i];
					} else {
						return colorOrange[i];
					}
				}).style('fill-opacity', 1);

				d3.select(this).selectAll('.eventDrop').style('fill', function(d,i){
					if(filters.toggle == 'severity'){
						return colorGreen[3];
					} else {
						return colorOrange[3];
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
	}

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