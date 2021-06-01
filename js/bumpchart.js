var DeepvizBumpChart = {};
var maxRank;
var bumpchartTopPadding = 30;
var bData;
var bumpchartTimer;
var bumpchartColor;
var bumpchartColorGrey;

//**************************
// create bump chart
//**************************
DeepvizBumpChart.create = function(){

	// destroy previous
	d3.select('#contextualRows').remove();
	d3.select('#event-drop-group').remove();
	d3.select('#event-drop-group-bg').remove();
	d3.selectAll('#bumpchartLabels').remove();
	d3.selectAll('#bumpchartLineG').remove();

	var timechartToggle = d3.select("#timechart-toggle");
	timechartToggle.select('#bumpchart-toggle').selectAll('rect').attr('fill', '#F4F4F4');
	timechartToggle.select('#bumpchart-toggle').selectAll('text').attr('fill', '#4c4c4c');
	timechartToggle.select('#bumpchart-toggle #bump-'+filters.bumpchartToggle).select('rect').attr('fill', colorNeutral[3]);
	timechartToggle.select('#bumpchart-toggle #bump-'+filters.bumpchartToggle).select('text').attr('fill', '#FFF');

	//**************************
	// create canvas
	//**************************
	// create element for data binding
	bumpchartCustomBase = document.createElement('custom');

	var svg = d3.select('#eventdrop');
	var bumpchartLine = svg.append('g').attr('id', 'bumpchartLineG');
	bumpchartLine.append('path').attr('id', 'bumpchartLine');

	var foreignObject = d3.select('#eventdrop').append('g').attr('id','event-drop-group-bg').append('foreignObject')
		.attr("x", -20)
		.attr("y", timechartHeight2)
		.attr("width", width-(margin.right+margin.left-20))
		.attr("height", contextualRowsHeight);

	var foBody = foreignObject.append("xhtml:body")
	.style("margin", "0px")
	.style("padding", "0px")
	.style("width", width + "px")
	.style("height", contextualRowsHeight + "px")

	// Add embedded canvas to embedded body
	bumpchartCanvas = foBody.append("canvas")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", width*2)
	    .attr("height", contextualRowsHeight*2)

	// retina display
	if(window.devicePixelRatio){
	    bumpchartCanvas
	    .attr('width', width * window.devicePixelRatio)
	    .attr('height', contextualRowsHeight * window.devicePixelRatio)
	    .style('width', width + 'px')
	    .style('height', contextualRowsHeight + 'px');
	    var ctx = bumpchartCanvas.node().getContext('2d');
	    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	}

	bumpchartLine.append('rect')
	.attr('x',width-(margin.right+margin.left))
	.attr('width', margin.right)
	.attr('height', contextualRowsHeight+100)
	.attr('y', timechartHeight2)
	.attr('fill', '#FFF');

	DeepvizBumpChart.draw();
	dragActive = false;
}

//**************************
// draw bump chart lines
//**************************
DeepvizBumpChart.draw = function(){

	bData = DeepvizBumpChart.getData();

	scale.bumpchart.y = d3.scaleLinear()
	.range([0, contextualRowsHeight-bumpchartTopPadding-5])
	.domain([0, maxRank]);

	// loop through each line
	var svg = d3.select('#eventdrop');

	d3.selectAll('#bumpchartLabels').remove();
	d3.selectAll('.bumpchartLineOverlay').remove();
	d3.selectAll('#bumpchartOverlayTop').remove();
	d3.selectAll('#bumpchartOverlay').remove();

	svg.append('text')
	.text('RANK')
	.attr('class', 'rankTitle')
	.attr('transform', 'rotate(270)')
	.attr('x', -626)
	.attr('y', -20)
	.style('font-size', '23px')
	.style('font-weight', '300')
	.style('fill', '#CCCCCC');

	// Get drawing context of canvas
	var context = bumpchartCanvas.node().getContext("2d");

	var line = d3.line()
		.curve(d3.curveMonotoneX)
        .x(function(d) { 
        	return scale.timechart.x(d.date) +45/2 })
        .y(function(d) { 
        	var v = d.rank;
        	return scale.bumpchart.y(v)+contextualRowHeight/2;
        }).context(context);

	// clear canvas
	context.clearRect(0, 0, width, contextualRowsHeight);

	bumpchartColor = d3.scaleLinear()
    .domain([0, 10])
    .range([colorNeutral[4], '#daf5f1'])
    .interpolate(d3.interpolateHcl);

	bumpchartColorGrey = d3.scaleLinear()
    .domain([0, 10])
    .range([colorGrey[3],colorLightgrey[1]])
    .interpolate(d3.interpolateHcl);

	// draw lines to bumpchart canvas
	bData.forEach(function(d,i){

		var rank = (d.values[d.values.length-1].rank);
	    if(rank>10) rank = 10;

		var color;

		context.beginPath();
		line(d.values);
		context.lineWidth = 2;
		context.opacity = 1;

		if(filters.frameworkToggle == 'average'){
			color = context.createLinearGradient(0, 0, width, 0);
			var c;	
			// loop through values and add gradient stops
			d.values.forEach(function(dd,ii){
				var x = scale.timechart.x(dd.date) +45/2;
				var w = width;
				var c;
				if(filters.toggle == 'reliability'){
					c = colorSecondary[Math.round(dd.median_r)];
				} else { // primary fallback
					c = colorPrimary[Math.round(dd.median_s)];
				} 
				if(dd.total==0){
					c = colorLightgrey[2];
				}
				color.addColorStop((x/w)-0.0001, c);
				color.addColorStop(x/w, c);
			});
		} else {
			color = context.createLinearGradient(0, 0, width, 0);
			var c = bumpchartColor(rank);
			if(filters.bumpchartToggle=='sector'){
				if(filters.sector.length>0){
					if(filters.sector.includes(d.id)){
						c = bumpchartColor(rank);
					} else {
						c = bumpchartColorGrey(rank);
					}
				}
			}

			if(filters.bumpchartToggle=='geo'){
				if(filters.geo.length>0){
					if(filters.geo.includes(d.id)){
						c = bumpchartColor(rank);
					} else {
						c = bumpchartColorGrey(rank);
					}
				}
			}

			if(filters.bumpchartToggle=='affected-group'){
				if(filters.affected_groups.length>0){
					if(filters.affected_groups.includes(d.id)){
						c = bumpchartColor(rank);
					} else {
						c = bumpchartColorGrey(rank);
					}
				}
			}

			if(filters.bumpchartToggle=='specific-needs'){
				if(filters.specific_needs.length>0){
					if(filters.specific_needs.includes(d.id)){
						c = bumpchartColor(rank);
					} else {
						c = bumpchartColorGrey(rank);
					}
				}
			}

			// loop through values and add gradient stops
			d.values.forEach(function(dd,ii){
				var x = scale.timechart.x(dd.date) +45/2;
				var w = width;
				var col;
				if(dd.total==0){
					col = colorLightgrey[2];
				} else {
					col = c;
				}
				color.addColorStop((x/w)-0.0001, col);
				color.addColorStop(x/w, col);
			});
		}
		context.strokeStyle = color;
		context.globalAlpha = 1;
		context.stroke();
		context.closePath();
	});

	// add labels
	bData.forEach(function(d,i){
		if(d.name==undefined) d.name = ' ';
		d3.select('#eventdrop').append('g').attr('id','bumpchartLabels')
		.append('text')
		.style('font-size', '17px')
		.text(function(dd,ii){
			return d.name.trim();
		})
		// .attr('alignment-baseline','middle')
		.attr('x', width-margin.right-35)
		.attr('y', function(dd,ii){
			return scale.bumpchart.y(d.values[d.values.length-1].rank)+timechartHeight2+(contextualRowHeight/2);
		}).on('mouseover', function(){
			if((dragActive==true)||(filters.timechartToggle!='bumpchart')) return false;
				bumpchartTimer = window.setTimeout( function(){
					d3.select('#event-drop-group-bg').style('opacity', 0.05);
					d3.selectAll('#bumpchartlinearGradient').remove();
				    // gradient line color
					d3.select('#bumpchartLineG')
					.append("linearGradient")
					.attr("id", 'bumpchartlinearGradient')
					.attr("gradientUnits", "userSpaceOnUse")
					.attr("x1", 2)
					.attr("x2", width)
					.selectAll("stop")
					.data(d.values)
					.join("stop")
					.attr("offset", function(d,i){
						return scale.timechart.x(d.date)/width;
					})
					.attr("stop-color", function(d,i){
						var c;	
						var rank = d.rank;
					    if(rank>10) rank = 10;

						if(filters.frameworkToggle == 'average'){
							if(filters.toggle == 'reliability'){
								c = colorSecondary[Math.round(d.median_r)];
							} else { // primary fallback
								c = colorPrimary[Math.round(d.median_s)];
							} 
							if(d.total==0){
								c = colorGrey[1];
							}
						} else {
							c = bumpchartColor(rank);

							if(filters.bumpchartToggle=='sector'){
								if(filters.sector.length>0){
									if(filters.sector.includes(d.id)){
										c = bumpchartColor(rank);
									} else {
										c = bumpchartColorGrey(rank);
									}
								}
							}

							if(filters.bumpchartToggle=='geo'){
								if(filters.geo.length>0){
									if(filters.geo.includes(d.id)){
										c = bumpchartColor(rank);
									} else {
										c = bumpchartColorGrey(rank);
									}
								}
							}

							if(filters.bumpchartToggle=='affected-group'){
								if(filters.affected_groups.length>0){
									if(filters.affected_groups.includes(d.id)){
										c = bumpchartColor(rank);
									} else {
										c = bumpchartColorGrey(rank);
									}
								}
							}

							if(filters.bumpchartToggle=='specific-needs'){
								if(filters.specific_needs.length>0){
									if(filters.specific_needs.includes(d.id)){
										c = bumpchartColor(rank);
									} else {
										c = bumpchartColorGrey(rank);
									}
								}
							}

							if(d.total==0){
								c = colorGrey[1];
							} 

						}

				      	return c;
					});

					d3.select('#bumpchartLine')
					.datum(d.values)
					.attr('fill', 'none')
					.attr('stroke-width', 2)
					.attr('stroke-opacity', 1)
					.style('opacity',1)
					.attr("d", d3.line()
						.curve(d3.curveMonotoneX)
				        .x(function(d) { return scale.timechart.x(d.date)+2 })
				        .y(function(d) { 
				        	var v = d.rank;
				        	return scale.bumpchart.y(v)+timechartHeight2+(contextualRowHeight/2)
				        })
				    )
			        .attr('stroke', 'url(#bumpchartlinearGradient)');

				}, 300);
			})
		.on('mouseout', function(d,i){
			window.clearTimeout(bumpchartTimer);
			d3.select('#bumpchartLine').style('opacity',0);
			d3.select('#event-drop-group-bg').style('opacity', 1);
		});
	});

		d3.selectAll('#bumpchartLabels text')
		.call(wrap,170);

		d3.selectAll('#bumpchartLabels text').attr('transform', function(){
			var h = d3.select(this).node().getBBox().height;
			var shift = -(h/2)+16;
			return 'translate('+0+','+shift+')';
		})

}

//**************************
// get bump chart data
//**************************
DeepvizBumpChart.getData = function(){

	var groupedData = [];
	maxRank = 9;

	var activeEl = [];
	var nestedData = [];

	if(filters.bumpchartToggle=='sector'){
		nestedData = d3.nest()
		.key(function(d) {
			if(filters.time=='d') return new Date(d.date);
			if(filters.time=='m') return new Date(d.month);
			if(filters.time=='y') return new Date(d.year);
		})
		.key(function(d) { 
			return d.sector; 
		})
		.rollup(function(leaves) { 
			return { 
				'median_r': d3.median(leaves, function(d,i){return d.r;}), 
				'median_s': d3.median(leaves, function(d,i){return d.s;}), 
				'total': leaves.length, 
			}
		})
		.entries(dataBySector);
	}

	if(filters.bumpchartToggle=='geo'){
		var locData = dataByLocationArray.filter(function(d,i){ return d.admin_level == filters.admin_level})
		nestedData = d3.nest()
		.key(function(d) {
			if(filters.time=='d') return new Date(d.date);
			if(filters.time=='m') return new Date(d.month);
			if(filters.time=='y') return new Date(d.year);
		})
		.key(function(d) { 
			return d.geo; 
		})
		.rollup(function(leaves) { 
			return { 
				'median_r': d3.median(leaves, function(d,i){return d.r;}), 
				'median_s': d3.median(leaves, function(d,i){return d.s;}), 
				'total': leaves.length, 
			}
		})
		.entries(locData);
	}

	if(filters.bumpchartToggle=='affected-group'){
		nestedData = d3.nest()
		.key(function(d) {
			if(filters.time=='d') return new Date(d.date);
			if(filters.time=='m') return new Date(d.month);
			if(filters.time=='y') return new Date(d.year);
		})
		.key(function(d) { 
			return d.affected_groups; 
		})
		.rollup(function(leaves) { 
			return { 
				'median_r': d3.median(leaves, function(d,i){return d.r;}), 
				'median_s': d3.median(leaves, function(d,i){return d.s;}), 
				'total': leaves.length, 
			}
		})
		.entries(dataByAffectedGroups);
	}

	if(filters.bumpchartToggle=='specific-needs'){
		nestedData = d3.nest()
		.key(function(d) {
			if(filters.time=='d') return new Date(d.date);
			if(filters.time=='m') return new Date(d.month);
			if(filters.time=='y') return new Date(d.year);
		})
		.key(function(d) { 
			return d.specific_needs; 
		})
		.rollup(function(leaves) { 
			return { 
				'median_r': d3.median(leaves, function(d,i){return d.r;}), 
				'median_s': d3.median(leaves, function(d,i){return d.s;}), 
				'total': leaves.length, 
			}
		})
		.entries(dataBySpecificNeeds);
	}

	nestedData.forEach(function(d,i){
		d.date = new Date(d.key);
		if(filters.time=='d') d.date.setHours(6,0,0,0);
		delete d.key;
	});

	nestedData.sort(function(a, b){ return d3.ascending(a.date, b.date); });

	var appendData = [];

	nestedData.forEach(function(d,i){
		d.values.forEach(function(dd,ii){

			if(filters.bumpchartToggle=='sector'){		
				metadata.sector_array.forEach(function(ddd,iii){
					if(ddd.id==dd.key){
						if(typeof activeEl[ddd.id] === 'undefined') { activeEl[ddd.id] = { 'id': ddd.id, 'name': ddd.name } }
						dd.name = ddd.name;
					}
				});
			}

			if(filters.bumpchartToggle=='geo'){		
				metadata.geo_array.forEach(function(ddd,iii){
					if(ddd.id==dd.key){
						if(typeof activeEl[ddd.id] === 'undefined') { activeEl[ddd.id] = { 'id': ddd.id, 'name': ddd.name } }
						dd.name = ddd.name;
					}
				});
			}

			if(filters.bumpchartToggle=='affected-group'){		
				metadata.affected_groups_array.forEach(function(ddd,iii){
					if(ddd.id==dd.key){
						if(typeof activeEl[ddd.id] === 'undefined') { activeEl[ddd.id] = { 'id': ddd.id, 'name': ddd.name } }
						dd.name = ddd.name;
					}
				});
			}

			if(filters.bumpchartToggle=='specific-needs'){		
				metadata.specific_needs_groups_array.forEach(function(ddd,iii){
					if(ddd.id==dd.key){
						if(typeof activeEl[ddd.id] === 'undefined') { activeEl[ddd.id] = { 'id': ddd.id, 'name': ddd.name } }
						dd.name = ddd.name;
					}
				});
			}

		});

		var ckDate = [new Date(moment(d.date).subtract(1,'days')), new Date(moment(d.date).add(1,'days'))];
		if(filters.time=='m') kDate = [new Date(moment(d.date).subtract(1,'months')), new Date(moment(d.date).add(1,'months'))];
		// check if previous date exists
		if(nestedData.filter(function(dd,ii){ return dd.date == ckDate[0]}).length == 0 ){
			if((i<nestedData.length)&&(i>0)){
				var c = {...nestedData[i-1]};
				c.date = ckDate[0];
				if(filters.time=='d') c.date.setHours(18,0,0,0);
				if(filters.time=='m') c.date.setDate(26);
				if(filters.time=='y') c.date.setMonth(9);
				delete c.key;
				appendData.push(c);
			}
		} 
		if(filters.time=='m') d.date.setDate(5);
		if(filters.time=='y') d.date.setMonth(2);
	});

	nestedData.forEach(function(d,i){
		activeEl.forEach(function(dd,ii){
			if(d.values.filter(function(ddd,iii){ return dd.id == parseInt(ddd.key)}).length == 0 ){
				d.values.push({'key': dd.id, 'value': {'total': 0, 'median_r': null, 'median_s': null}, 'name': dd.name })			
			}
		});
	});

	var concatData = nestedData;
	if(appendData.length>0) concatData = nestedData.concat(appendData);

	concatData.sort(function(a, b){ return d3.ascending(a.date, b.date); });

	concatData.forEach(function(d,i){
		d.values.forEach(function(dd,ii){
			dd.filter = 0;

			if(filters.bumpchartToggle=='sector'){
				if(filters.sector.includes(parseInt(dd.key))) {
					dd.filter = 1;
				}
			}
			if(filters.bumpchartToggle=='geo'){
				if(filters.geo.includes(parseInt(dd.key))) {
					dd.filter = 1;
				}
			}
			if(filters.bumpchartToggle=='specific-needs'){
				if(filters.specific_needs.includes(parseInt(dd.key))) {
					dd.filter = 1;
				}
			}
			if(filters.bumpchartToggle=='affected-group'){
				if(filters.affected_groups.includes(parseInt(dd.key))) {
					dd.filter = 1;
				}
			}
		})
		d.values.sort(function(a, b){ 
			return d3.descending(a.value.total, b.value.total)||d3.descending(a.filter, b.filter)||d3.ascending(a.name, b.name) 
		});
		d.values.forEach(function(dd,ii){
			dd.rank = ii;
			dd.key = parseInt(dd.key);
			if(typeof groupedData[dd.key] === 'undefined'){
				groupedData[dd.key] = {'id': dd.key, 'name':dd.name, 'values': []};
			}
			groupedData[dd.key].values.push({'date': d.date, 'rank': dd.rank, 'total': dd.value.total, 'median_r': dd.value.median_r, 'median_s': dd.value.median_s});
		});
	})

	groupedData.forEach(function(d,i){
		d.values.sort(function(a, b){ return d3.ascending(a.date, b.date); });
		var lastRow = {...d.values[d.values.length-1]};
		if(filters.time=='d') lastRow.date = new Date(moment(lastRow.date).add(1,'months'));
		if(filters.time=='m') lastRow.date = new Date(moment(lastRow.date)).setDate(26);
		if(filters.time=='y') lastRow.date = new Date(moment(lastRow.date)).setMonth(10);
		d.values.push(lastRow);
	});

	groupedData = groupedData.filter(el => {
	  return el != null && el != '';
	});

	groupedData = groupedData.sort(function(a, b){ return d3.descending(a.values[a.values.length-1].rank, b.values[b.values.length-1].rank); });

	return groupedData;

}

DeepvizBumpChart.destroy = function(){
	d3.selectAll('.bumpchartLine').remove();
	d3.selectAll('.bumpchartLine').remove();
	d3.selectAll('#bumpchartLabels').remove();
	d3.selectAll('.bumpchartLineOverlay').remove();
	d3.selectAll('#bumpchartOverlayTop').remove();
	d3.selectAll('#bumpchartOverlay').remove();
	d3.selectAll('.rankTitle').remove();
}
