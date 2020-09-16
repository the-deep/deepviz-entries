var DeepvizBumpChart = {};
var maxRank;
var bumpchartTopPadding = 30;
var bData;
var bumpchartTimer;

//**************************
// create bump chart
//**************************
DeepvizBumpChart.create = function(){

	// destroy previous
	d3.select('#contextualRows').remove();
	d3.select('#event-drop-group').remove();
	d3.select('#event-drop-group-bg').remove();
	d3.selectAll('#bumpchartLabels').remove();

	var timechartToggle = d3.select(document.getElementById("timechart-toggle").contentDocument);
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
	var bumpchartLine = svg.append('g');
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

	DeepvizBumpChart.update();
	dragActive = false;
}

//**************************
// update bump chart
//**************************
DeepvizBumpChart.update = function(){

	bData = DeepvizBumpChart.getData();

	scale.bumpchart.y = d3.scaleLinear()
	.range([0, contextualRowsHeight-bumpchartTopPadding-5])
	.domain([0, maxRank]);

	// loop through each line
	var svg = d3.select('#eventdrop');

	d3.selectAll('#bumpchartLabels').remove();
	d3.selectAll('.bumpchartLine').remove();
	d3.selectAll('.bumpchartLineOverlay').remove();
	d3.selectAll('#bumpchartOverlayTop').remove();
	d3.selectAll('#bumpchartOverlay').remove();

	var title = svg.append('text')
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
	var custom = d3.select(bumpchartCustomBase); // replacement of SVG

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

	// draw lines to bumpchart canvas
	var elements = bData.forEach(function(d,i){
		context.beginPath();
		line(d.values);
		context.lineWidth = 2;
		context.opacity = 0.5;

		var rank = (d.values[d.values.length-1].rank);
	    if(rank>10) rank = 10;

		var bumpchartColor = d3.scaleLinear()
	    .domain([0, 10])
	    .range([colorNeutral[4], '#daf5f1'])
	    .interpolate(d3.interpolateHcl);

		var bumpchartColorGrey = d3.scaleLinear()
	    .domain([0, 10])
	    .range([colorGrey[3],colorLightgrey[1]])
	    .interpolate(d3.interpolateHcl);

		var color = bumpchartColor(rank);

		if(filters.bumpchartToggle=='sector'){
			if(filters.sector.length>0){
				if(filters.sector.includes(d.id)){
					color = bumpchartColor(rank);
				} else {
					color = bumpchartColorGrey(rank);
				}
			}
		}

		if(filters.bumpchartToggle=='geo'){
			if(filters.geo.length>0){
				if(filters.geo.includes(d.id)){
					color = bumpchartColor(rank);
				} else {
					color = bumpchartColorGrey(rank);
				}
			}
		}

		if(filters.bumpchartToggle=='affected-group'){
			if(filters.affected_groups.length>0){
				if(filters.affected_groups.includes(d.id)){
					color = bumpchartColor(rank);
				} else {
					color = bumpchartColorGrey(rank);
				}
			}
		}

		if(filters.bumpchartToggle=='specific-needs'){
			if(filters.specific_needs.length>0){
				if(filters.specific_needs.includes(d.id)){
					color = bumpchartColor(rank);
				} else {
					color = bumpchartColorGrey(rank);
				}
			}
		}

		context.strokeStyle = color;
		context.globalAlpha = 0.8;
		context.stroke();
		context.closePath();
	});

	// var lineGroups = svg.append('g').attr('id', 'bumpchartOverlay')
	// .attr("clip-path", "url(#bumpMask)")
	// .selectAll('.bumpchartLine')
	// .data(bData);

	// lineGroups
	// .exit()
	// .remove();

	// var c = 1;
	// var lines = lineGroups
	// .enter()
	// .append('g')
	// .attr('class', 'bumpchartLine')
	// .attr('transform', function(d,i){
	// 	var x = 0;
	// 	return 'translate('+x+','+(timechartHeight2+(bumpchartTopPadding/2))+')';
	// }) 
	// .append('path')
	// .attr('class','pathline')
	// .attr('id',function(d,i){
	// 	return 'pathline'+i;
	// })
	// .attr('stroke', function(d,i){
	//     var rank = (d.values[d.values.length-1].rank);
	//     if(rank>10) rank = 10;
	// 	var bumpchartColor = d3.scaleLinear()
	//     .domain([0, 10])
	//     .range([colorNeutral[4], '#daf5f1'])
	//     .interpolate(d3.interpolateHcl);

	// 	var bumpchartColorGrey = d3.scaleLinear()
	//     .domain([0, 10])
	//     .range([colorGrey[3],colorLightgrey[1]])
	//     .interpolate(d3.interpolateHcl);

	// 	if(filters.bumpchartToggle=='sector'){
	// 		if(filters.sector.length>0){
	// 			if(filters.sector.includes(d.id)){
	// 				return bumpchartColor(rank);
	// 			} else {
	// 				return bumpchartColorGrey(rank);
	// 			}
	// 		}
	// 	}

	// 	if(filters.bumpchartToggle=='geo'){
	// 		if(filters.geo.length>0){
	// 			if(filters.geo.includes(d.id)){
	// 				return bumpchartColor(rank);
	// 			} else {
	// 				return bumpchartColorGrey(rank);
	// 			}
	// 		}
	// 	}

	// 	if(filters.bumpchartToggle=='affected-group'){
	// 		if(filters.affected_groups.length>0){
	// 			if(filters.affected_groups.includes(d.id)){
	// 				return bumpchartColor(rank);
	// 			} else {
	// 				return bumpchartColorGrey(rank);
	// 			}
	// 		}
	// 	}

	// 	if(filters.bumpchartToggle=='specific-needs'){
	// 		if(filters.specific_needs.length>0){
	// 			if(filters.specific_needs.includes(d.id)){
	// 				return bumpchartColor(rank);
	// 			} else {
	// 				return bumpchartColorGrey(rank);
	// 			}
	// 		}
	// 	}

	// 	return bumpchartColor(rank);
	// })
	// .style('stroke-opacity', 1)
	// .style('stroke-width', 3)
	// .style('fill', 'none')
	// .attr('opacity', 1);

	// lines = d3.selectAll('.pathline')
	// .datum(function(d,i){
	// 	if(d.values)
	// 	return d.values;
	// })
	// .attr("d", d3.line()
	// 	.curve(d3.curveMonotoneX)
 //        .x(function(d) { 
 //        	return scale.timechart.x(d.date) })
 //        .y(function(d) { 
 //        	var v = d.rank;
 //        	return scale.bumpchart.y(v);
 //        })
 //    );

	// // overlay mouseover 
	// var lineGroupsOverlay = d3.select("#toplayer").append('g').attr('id', 'bumpchartOverlayTop')
	// .selectAll('.bumpchartLineOverlay')
	// .data(bData);

	// lineGroupsOverlay
	// .exit()
	// .remove();

	// var timer;
	// var c = 1;
	// var linesOverlay = lineGroupsOverlay
	// .enter()
	// .append('g')
	// .attr('class', 'bumpchartLineOverlay')
	// .attr('data-name', function(d,i){
	// 	return d.name;
	// })
	// .attr('data-color', function(d,i){

	//     var rank = (d.values[d.values.length-1].rank);

	// 	var bumpchartColor = d3.scaleLinear()
	//     .domain([0, 9])
	//     .range([colorNeutral[1], colorNeutral[5]])
	//     .interpolate(d3.interpolateRgb.gamma(2.2))(rank);

	// 	var bumpchartColorGrey = d3.scaleLinear()
	//     .domain([0, 9])
	//     .range([colorLightgrey[1], colorGrey[3]])
	//     .interpolate(d3.interpolateRgb.gamma(2.2))(rank);

	// 	if(filters.bumpchartToggle=='sector'){
	// 		if(filters.sector.length>0){
	// 			if(filters.sector.includes(d.id)){
	// 				return bumpchartColor;
	// 			} else {
	// 				return bumpchartColorGrey;
	// 			}
	// 		}
	// 	}

	// 	if(filters.bumpchartToggle=='geo'){
	// 		if(filters.geo.length>0){
	// 			if(filters.geo.includes(d.id)){
	// 				return bumpchartColor;
	// 			} else {
	// 				return bumpchartColorGrey;
	// 			}
	// 		}
	// 	}

	// 	if(filters.bumpchartToggle=='affected-group'){
	// 		if(filters.affected_groups.length>0){
	// 			if(filters.affected_groups.includes(d.id)){
	// 				return bumpchartColor;
	// 			} else {
	// 				return bumpchartColorGrey;
	// 			}
	// 		}
	// 	}

	// 	if(filters.bumpchartToggle=='specific-needs'){
	// 		if(filters.specific_needs.length>0){
	// 			if(filters.specific_needs.includes(d.id)){
	// 				return bumpchartColor;
	// 			} else {
	// 				return bumpchartColorGrey;
	// 			}
	// 		}
	// 	}

	// 	return bumpchartColor;
	// })
	// .attr('transform', function(d,i){
	// 	var x = 0;
	// 	return 'translate('+x+','+(timechartHeight2+(bumpchartTopPadding/2))+')';
	// })
	// .append('path')
	// .attr('class','pathlineOverlay')
	// .attr('id',function(d,i){
	// 	return 'pathlineOverlay'+i;
	// })
	// .style('opacity',0)
	// .style('stroke', function(d,i){
	// 	return d3.select(this.parentNode).attr('data-color');
	// })
	// .style('stroke-opacity', 0)
	// .style('stroke-width', 4)
	// .style('fill', 'none')
	// .attr('opacity', 1)
	// .on('mouseover', function(d,i){
	// 	if(dragActive==true) return false;
	// 	timer = window.setTimeout( function(){
	// 		d3.selectAll('.pathline').style('opacity',0);
	// 		d3.selectAll('#pathline'+i).style('opacity',1);			
	// 	}, 500);
	// })
	// .on('mouseout', function(d,i){
	// 	window.clearTimeout(timer);
	// 	d3.selectAll('.pathline').style('opacity',1);
	// });

	// add labels
	bData.forEach(function(d,i){
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
					d3.select('#event-drop-group-bg').style('opacity', 0.2);
					var bumpchartLine = d3.select('#bumpchartLine')
					.datum(d.values)
					.attr('fill', 'none')
					.attr('stroke', colorNeutral[4])
					.attr('stroke-width', 3)
					.attr('stroke-opacity', 1)
					.style('opacity',1)
					.attr("d", d3.line()
						.curve(d3.curveMonotoneX)
				        .x(function(d) { return scale.timechart.x(d.date)+2 })
				        .y(function(d) { 
				        	var v = d.rank;
				        	return scale.bumpchart.y(v)+timechartHeight2+(contextualRowHeight/2)
				        })
				    );
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

	// tippy('.bumpchartLineOverlay', { 
	// 	content(d) {
	// 		if(filters.timechartToggle=='bumpchart')
	// 		return '<div style="width: 100px; height: 10px; display: inline; background-color: '+ d.getAttribute('data-color') + '">&nbsp;&nbsp;</div>&nbsp;&nbsp;' + d.getAttribute('data-name')
	// 	},
	// 	placement: 'top-end',
	// 	distance: 25,
	// 	followCursor: true,
	// 	theme: 'light-border',
	// 	delay: [500,100],
	// 	inertia: false,
	// 	allowHTML: true,
	// 	animation: 'shift-away',
	// 	arrow: true,
	// 	size: 'small'
	// });
}

//**************************
// get bump chart data
//**************************
DeepvizBumpChart.getData = function(){

	var groupedData = [];
	maxRank = 9;

	// date index for missing dates
	if(filters.time=='d'){
		var dIndex = d3.timeDays(scale.timechart.x.domain()[0], scale.timechart.x.domain()[1], 1);
	}

	if(filters.time=='m'){
		var dIndex = d3.timeMonths(scale.timechart.x.domain()[0], scale.timechart.x.domain()[1], 1);
	}

	if(filters.time=='y'){
		var dIndex = d3.timeYears(scale.timechart.x.domain()[0], scale.timechart.x.domain()[1], 1);
	}

	var activeEl = [];
	var nestedData = [];

	if(filters.bumpchartToggle=='sector'){
		var nestedData = d3.nest()
		.key(function(d) {
			if(filters.time=='d') return new Date(d.date);
			if(filters.time=='m') return new Date(d.month);
			if(filters.time=='y') return new Date(d.year);
		})
		.key(function(d) { 
			return d.sector; 
		})
		.rollup(function(leaves) { return leaves.length; })
		.entries(dataBySector);
	}

	if(filters.bumpchartToggle=='geo'){
		var locData = dataByLocationArray.filter(function(d,i){ return d.admin_level == filters.admin_level})
		var nestedData = d3.nest()
		.key(function(d) {
			if(filters.time=='d') return new Date(d.date);
			if(filters.time=='m') return new Date(d.month);
			if(filters.time=='y') return new Date(d.year);
		})
		.key(function(d) { 
			return d.geo; 
		})
		.rollup(function(leaves) { return leaves.length; })
		.entries(locData);
	}

	if(filters.bumpchartToggle=='affected-group'){
		var nestedData = d3.nest()
		.key(function(d) {
			if(filters.time=='d') return new Date(d.date);
			if(filters.time=='m') return new Date(d.month);
			if(filters.time=='y') return new Date(d.year);
		})
		.key(function(d) { 
			return d.affected_groups; 
		})
		.rollup(function(leaves) { return leaves.length; })
		.entries(dataByAffectedGroups);
	}

	if(filters.bumpchartToggle=='specific-needs'){
		var nestedData = d3.nest()
		.key(function(d) {
			if(filters.time=='d') return new Date(d.date);
			if(filters.time=='m') return new Date(d.month);
			if(filters.time=='y') return new Date(d.year);
		})
		.key(function(d) { 
			return d.specific_needs; 
		})
		.rollup(function(leaves) { return leaves.length; })
		.entries(dataBySpecificNeeds);
	}

	nestedData.forEach(function(d,i){
		d.date = new Date(d.key);
		if(filters.time=='d') d.date.setHours(6,0,0,0);
		delete d.key;
	});

	nestedData.sort(function(a, b){ return d3.ascending(a.date, b.date); });

	var appendData = [];
	var thisRowLeftOffset;

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
		thisRowLeftOffset = {...d};
		if(filters.time=='m') d.date.setDate(5);
		if(filters.time=='y') d.date.setMonth(2);
	});

	nestedData.forEach(function(d,i){
		activeEl.forEach(function(dd,ii){
			if(d.values.filter(function(ddd,iii){ return dd.id == parseInt(ddd.key)}).length == 0 ){
				d.values.push({'key': dd.id, 'value': 0, 'name': dd.name })			
			}
		});
	});

	var concatData = nestedData;
	if(appendData.length>0) concatData = nestedData.concat(appendData);

	concatData.sort(function(a, b){ return d3.ascending(a.date, b.date); });

	var groupedData;

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
			return d3.descending(a.value, b.value)||d3.descending(a.filter, b.filter)||d3.ascending(a.name, b.name) 
		});
		d.values.forEach(function(dd,ii){
			dd.rank = ii;
			dd.key = parseInt(dd.key);
			if(typeof groupedData[dd.key] === 'undefined'){
				groupedData[dd.key] = {'id': dd.key, 'name':dd.name, 'values': []};
			}
			groupedData[dd.key].values.push({'date': d.date, 'rank': dd.rank});
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
