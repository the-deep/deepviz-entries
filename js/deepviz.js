var Deepviz = function(sources, callback){

	this.dateRange = [new Date(2018, 10, 1), new Date(2018, 11, 1)];


	var colorGreen = ['#A1E6DB', '#76D1C3', '#36BBA6', '#1AA791', '#008974'];
	var colorGrey = ['#A1E6DB', '#76D1C3', '#36BBA6', '#1AA791', '#008974'];

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
		div = '#timeline',
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
	// time chart stacked column
	//**************************
	this.timeChart = function(options){

		// margins
		var margin = {top: 18, right: 10, bottom: 0, left: 50};

		var chartdata = options.data;

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
		options.height = options.height - (margin.top + margin.bottom);

		var svgBg = svg.append('g');

		svgBg.append('rect')
		.attr('x',margin.left)
		.attr('y',margin.top)
		.attr('width',options.width)
		.attr('height',options.height)
		.attr('opacity',0);

		var svgChart = svg.append('g').attr('class', 'chartarea').attr('transform', 'translate('+margin.left+','+margin.top+')');

		var color = options.color;

		// reorganize data
		chartdata.forEach(function(d, i) {
			d.barValues = [d.value];
		});

		// define maximum date 
		var maxDate = d3.max(chartdata, function(d){
			return d.key;
		});
		var dateMax = new Date(maxDate);
		dateMax.setDate(maxDate.getDate() + 1);
		dateMax.setHours(0);
		dateMax.setMinutes(0);
		chartdata.push({ key: dateMax, barValues: [0] });

		var dateIndex = chartdata.map(function(d) { return d[options.dataKey]; });

		var maxValue = d3.max(chartdata, function(d) {
			return d.value;
		});

		var barWidth = options.width/dateIndex.length;

	    // define scales
	    var x = d3.scaleTime()
	    .domain([new Date(2018, 8, 1), dateMax])
	    .range([0, options.width+barWidth])
	    .rangeRound([0, options.width], 0)

	    var xAxis = d3.axisBottom()
	    .scale(x)
	    .tickSize(0)
	    .tickPadding(8)
	    .ticks(d3.timeMonth.every(1))
	    .tickFormat(d3.timeFormat("%b %Y"));

		// define y-axis
		var y = d3.scaleLinear()
		.range([options.height, 0])
		.domain([0, (maxValue)]);

		if(options.maxValue=='round'){
			var y = d3.scaleLinear()
			.range([options.height, 0])
			.domain([0, rounder(maxValue)]);
		}

		var yAxis = d3.axisLeft()
		.scale(y)
		.ticks(5)
		.tickPadding(0);

		// y-axis
		if(options.yAxis.enabled==true){
			
			var yAxisText = svgBg.append("g")
			.attr("class", "yAxis axis")
			.attr('transform', 'translate('+(margin.left-1)+','+margin.top+')')
			.call(yAxis)
			.style('font-size', options.yAxis.font.values.size);

			if((options.yAxis.label)&&(options.yAxis.label != '')){
				yAxisText
				.append("text")
				.attr('class','axisLabel')
				.attr("transform", "rotate(-90)")
				.attr("y", -30-options.yAxis.font.label.padding)
				.attr("dy", ".71em")
				.attr("x", ((-height/2)+25))
				.style("text-anchor", "end")
				.style('font-weight', options.yAxis.font.label.weight)
				.style('font-size', options.yAxis.font.label.size)
				.text(options.yAxis.label)
			}
		}

		// gridlines in y axis function
		function make_y_gridlines() {		
			return d3.axisLeft(y)
			.ticks(5)
		}

	  // add the Y gridlines
	  svg.append("g")			
	  .attr("class", "grid")
	  .attr("transform","translate("+margin.left+","+margin.top+")")
	  .call(make_y_gridlines()
	  	.tickSize(-options.width)
	  	.tickFormat("")
	  	);


		// x-axis 
		if(options.xAxis.enabled == true){
			console.log('xaxis');
			var xAxisObj = svgBg.append("g")
			.attr("class", "xAxis axis")
			.attr("transform", "translate(" + margin.left + "," + (options.height + margin.top +1) + ")")
			.call(xAxis)
			.style('font-size', options.xAxis.font.values.size)
			.style('font-family', options.xAxis.font.values.family)
			.style('font-weight', options.xAxis.font.values.weight)
			.style('fill', options.xAxis.font.values.color)

			xAxisObj
			.selectAll('path, line')
			.style('opacity', options.xAxis.gridlines.opacity )
			.style('stroke', options.xAxis.gridlines.stroke )
			.style('stroke-width', options.xAxis.gridlines.strokeWidth );

			xAxisObj.selectAll(".tick line, text")
			.attr("transform", "translate(" +33 + ", 0)")
			.append('line')
			.attr('class', 'xAxisHorizontalLine')
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', 0)
			.attr('y2', options.height+margin.top+1)

			xAxisObj.selectAll(".tick")
			.append('line')
			.attr('class', 'xAxisHorizontalLine')
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', -options.height)
			.attr('y2', options.height+margin.top+1)

		}

		// bar groups
		var bars = svgChart.selectAll(".barGroup")
		.data(chartdata)
		.enter()
		.append('g')
		.attr("class", "barGroup")
		.attr("transform", function(d) { return "translate(" + x(d[options.dataKey]) + ",0)"; });

		// individual bars
		var individualBars = bars.selectAll('.bar')
		.data(function(d,i){ return d.barValues;})
		.enter()
		.append("rect")
		.attr('class', 'bar')
		.attr("x", function(d,i) { 
			return (barWidth*i)+options.gutter;
		})
		.attr("width", function(d,i) { 
			return barWidth-(options.gutter*2);
		})
		.attr("y", function(d,i) { 
			if(i>=0){
				var v = d; 
			} else {
				var v = d[i];
			}

			return y(v); 
		})
		.attr("height", function(d,i) { 
			var vs = 0;
			if(i>0){
				if(!options.grouped){
					vs = d3.select(this.parentNode).datum().barValues[i-1];
				} 				
			}
			return options.height-y(d-vs); 

			// return y(d);
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



		    // initialise the date selectors
		    var brush = d3.brushX()
		    // .extent([50,100],100)
		    .extent([[0, -margin.top], [options.width, options.svgheight-(margin.top+margin.bottom)]])
		        // .on("end", brushed)
		        .on("brush", brushed)
		        .on("start", brush);

		    // add the selectors
		    var gBrush = svgChart.append("g")
		    .attr("class", "brush")
		    .attr('transform', 'translate('+(2)+',0)')
		    .call(brush);

		    d3.selectAll('.handle rect').attr('fill-opacity', '1').style('visibility', 'visible').attr('width', 2).attr('fill', '#000').style('stroke-opacity', 0);

		    var handleTop = gBrush.selectAll(".handle--custom-top")
		    .data([{type: "w"}, {type: "e"}])
		    .enter().append("path")
		    .attr("class", "handle--custom-top")
		    .attr("stroke", "#000")
		    .attr('stroke-width', 3)
		    .attr('fill', '#000')
		    .attr("cursor", "ew-resize")
		    .attr("d", 'M -9,0 -1,11 8,0 z');

		    var handleBottom = gBrush.selectAll(".handle--custom-bottom")
		    .data([{type: "w"}, {type: "e"}])
		    .enter().append("path")
		    .attr("class", "handle--custom-bottom")
		    .attr("stroke", "#000")
		    .attr('stroke-width', 3)
		    .attr('fill', '#000')
		    .attr("cursor", "ew-resize")
		    .attr("d", 'M -9,0 -1,-11 8,0 z');

		    // programattically set date range

		    var d1 = this.dateRange;

		    gBrush.call(brush.move, d1.map(x));

		    handleTop.attr("transform", function(d, i) { return "translate(" + (d1.map(x)[i]-1) + ", -" + margin.top + ")"; });
		    handleBottom.attr("transform", function(d, i) { return "translate(" + (d1.map(x)[i]-1) + ", " + (options.svgheight - margin.top) + ")"; });

		    // function to handle the changes during slider dragging
		    function brushed() {

		    	if(!d3.event.sourceEvent) return;

		    	if(d3.event.sourceEvent.type === "brush") return;

		    	var d0 = d3.event.selection.map(x.invert),
		    	d1 = d0.map(d3.timeDay.round);

				  // If empty when rounded, use floor instead.
				  if (d1[0] >= d1[1]) {
				  	d1[0] = d3.timeDay.floor(d0[0]);
				  	d1[1] = d3.timeDay.offset(d1[0]);
				  }

				  colorBars(d1);

				  d3.select(this).call(d3.event.target.move, d1.map(x));
				  handleTop.attr("transform", function(d, i) { return "translate(" + (d1.map(x)[i]-1) + ", -"+ margin.top +")"; });
				  handleBottom.attr("transform", function(d, i) { return "translate(" + (d1.map(x)[i]-1) + ", " + (options.svgheight - margin.top) + ")"; });

				  console.log(d1);

				}


				function brush() {

					if(!d3.event.sourceEvent) return;

					if(d3.event.sourceEvent.type === "brush") return;

					var d0 = d3.event.selection.map(x.invert),
					d1 = d0.map(d3.timeDay.round);

				  // If empty when rounded, use floor instead.
				  if (d1[0] >= d1[1]) {
				  	d1[0] = d3.timeDay.floor(d0[0]);
				  	d1[1] = d3.timeDay.offset(d1[0]);
				  }


				  d3.select(this).call(d3.event.target.move, d1.map(x));
				  handleTop.attr("transform", function(d, i) { return "translate(" + (d1.map(x)[i]-1) + ", -"+ margin.top +")"; });
				  handleBottom.attr("transform", function(d, i) { return "translate(" + (d1.map(x)[i]-1) + ", " + (options.svgheight - margin.top) + ")"; });
				}


				function colorBars(dateRange){
					bars.each(function(d,i){
						if((d.key<dateRange[0])||(d.key>= dateRange[1])){
							d3.select(this).selectAll('.bar').style('fill', 'grey');
						} else {
							d3.select(this).selectAll('.bar').style('fill', colorGreen[4]);

						}
					});
				}

				colorBars(this.dateRange);


				bars.update = function(updateOptions){

					var delay = 100;
					var duration = updateOptions.duration;

			// reorganize data
			updateOptions.data.forEach(function(d, i) {
				d.barValues = [];
			});

			updateOptions.data.forEach(function(d, i) {
				var barValue = d.barValues;
				// barValue[0]=0;
				// if totals is an array, loop through each value to make a stack
				if(d[options.dataValues].length>1){
					d[options.dataValues].forEach(function(d2, i2){
						var v = 0;
						if(i2>=1){
							v = barValue[i2-1];
						}
						if(!options.grouped){
							barValue[i2] = d2 + v;
						} else {
							barValue[i2] = d2;
						}
					})
				// if totals is jsut one value, set it to index 1
			} else {
				barValue[0] = d[options.dataValues];
			}
		});

			// find maximum value
			var maxValue = d3.max(updateOptions.data, function(d) {
				return d[options.dataValues];
			});

			if(updateOptions.maxValue){
				maxValue = updateOptions.maxValue;
			}

			if(updateOptions.minValue){
				var minValue = updateOptions.minValue;
			} else {
				var minValue = 0;
			}


			// redefine scale
			var y = d3.scaleLinear()
			.range([options.height, 0])
			.domain([minValue, rounder(maxValue)]);

			var yAxis = d3.svg.axis()
			.scale(y)
			.orient("left")
			.ticks(5)
			.tickPadding(0);

			d3.selectAll(".yAxis.axis.colchart")
			.transition()
			.delay(delay)
			.duration(500)
			.call(yAxis);

			var yAxisGrid = yAxis
			.tickSize(options.width, 0)
			.tickFormat("")
			.orient("right");

			d3.selectAll('.colChartGrid')
			.transition()
			.delay(delay)
			.duration(500)
			.call(yAxisGrid);

			d3.selectAll('.colChartGrid line')
			.style('stroke', options.yAxis.gridlines.stroke)
			.style('stroke-opacity', options.yAxis.gridlines.opacity)
			.style('stroke-width', options.yAxis.gridlines.strokeWidth)
			.style('stroke-dasharray', '2,2');

			bars.data(updateOptions.data).selectAll('.bar')
			.data(function(d,i){ return d.barValues;})
			.transition()
			.delay(delay)
			.duration(500)
			.attr("y", function(d,i) { 
				if(i>=0){
					var v = d;
				} else {
					var v = 0;
				}
				return y(v); 
			})
			.attr("height", function(d) { return options.height-y(d); });
			// .style('fill', function(d,i){ if(color.length > 1){return color[i]} else {return color[0];}});
		}

		// // return object
		return bars;

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


	}