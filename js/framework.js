var DeepvizFramework = {};
var categories; 
var sparklinePadding = {'left': 5, 'right': 5, 'bottom': 10 };
var leftColWidth = 232;
var pointWidth; 
var tooltipSvg;

DeepvizFramework.create = function(a){

	// handle metadata with single-rows
	var count = 0;
	var contextId = null;
	metadata.framework_groups_array.forEach(function(d,i){
		if(contextId==d.context_id){
			count++;
		} else {
			if(count==1){
				var row = {'id': -1, 'context_id': metadata.framework_groups_array[i-1].context_id, 'name': '', 'tooltip': ''};
				metadata.framework_groups_array.splice((i),0,row);
			} else {
				count = 1;
			}
		} 
		contextId=d.context_id;
	});

	var frameworkRowHeight = 28;
	var frameworkHeight = metadata.framework_groups_array.length * frameworkRowHeight;

	var numFrameworkRows = metadata.framework_groups_array.length;
	var frameworkMargins = {top: 20, left: 0, right: 0, bottom: 2, sectorTotalRow: 20};

	if(metadata.sector_array.length>10){
		var leftSpacing = 460; 
	} else {
		var leftSpacing = 575; 
	}

	var frameworkWidth = 1600;
	var colWidth = (frameworkWidth-leftSpacing)/metadata.sector_array.length;
	var rowHeight = (frameworkHeight - (frameworkMargins.top + frameworkMargins.bottom + frameworkMargins.sectorTotalRow))/numFrameworkRows;

	var title = d3.select('#framework-chart').append('div');
	title.attr('class', 'title').text('SECTORAL FRAMEWORK');

	d3.select('#framework-chart').append('img')
	.attr('id', 'frameworkRemoveFilter')
	.attr('class', 'removeFilterBtn')
	.attr('src', 'images/filter.png')
	.attr('title', 'Clear filter');

	// create framework svg
	var frameworkSvg = Deepviz.createSvg({
		id: 'framework-svg',
		viewBoxWidth: frameworkWidth,
		viewBoxHeight: frameworkHeight+5,
		div: '#framework-chart',
		width: '100%'
	});

	var layer1 = frameworkSvg.append('g').attr('id', 'framework-layer1')
	var layer2 = frameworkSvg.append('g').attr('id', 'framework-layer2');
	var layer3 = frameworkSvg.append('g').attr('id', 'framework-layer3')

	// toggle
	var toggle = frameworkSvg.append('g')
	.attr('transform', 'translate(0,-2)');

	// add toggle switch
	var toggleswitch = toggle.append('g')
	.attr('id', 'framework-toggle-switch')
	.attr('transform', 'translate(237,1)')

	toggleswitch = toggleswitch.append('g').attr('transform', 'scale(0.49)');

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
	.text('# of '+textLabel);

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
	.attr('y', 1);
	// .style('font-size', '13px')
	// .attr('x', (colWidth/2)+10)
	// .style('text-anchor', 'middle');

	columnHeaders
	.append('image')
	.attr('class', function(d,i){
		return 'sector-icon sc-icon-'+d.id;
	})
	.attr('xlink:href', function(d,i){
		return 'images/sector-icons/'+(d.name.toLowerCase())+'.svg'; 
	})
	.attr('height', 14)
	.attr('width', 14)
	.attr('y', -11)
	.attr('x', 2);

	// sector total row
	columnHeadersBg
	.append('text')
	.attr('class', 'col-header-value')
	.text(function(d,i){
		return '1,234';
	})
	.attr('id', function(d,i){ return 'framework-col-value-'+d.id; })
	.attr('x', colWidth/2)
	.attr('y', frameworkMargins.sectorTotalRow+2);

	layer2
	.append('line')
	.attr('x1', 0)
	.attr('x2', frameworkWidth)
	.attr('y1', 25)
	.attr('y2', 25)
	.attr('class', 'framework-domain')
	.attr('stroke', 'green')
	.style('stroke-width', '1px');

	var totalLabel = layer2
	.append('text')
	.text(function(d,i){
		return 'TOTAL';
	})
	.style('font-weight', 'bold')
	.style('fill', colorNeutral[4])
	.attr('y', frameworkMargins.top + frameworkMargins.sectorTotalRow -1)
	.style('text-anchor', 'end');

	totalLabel
	.attr('x', function(d,i){
		return leftSpacing-39;
	});

	layer2.append('text')
	.text('00')
	.attr('class', 'col-header-value')
	.attr('id',function(d,i){
		return 'totalDataLabel'
	})
	.style('text-anchor', 'middle')
	.attr('x', function(d,i){
		return leftSpacing-18;
	})
	.attr('y', frameworkMargins.top + frameworkMargins.sectorTotalRow -1)

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
		Deepviz.filter('sector',i+1);
	});

	d3.select('#frameworkRemoveFilter').on('click', function(d,i){
		Deepviz.filter('sector', 'clearFramework');
		d3.selectAll('.col-header-bg-selected').style('opacity', 0);	
		d3.selectAll('.col-header-text').style('opacity', 1);	
		d3.select('#frameworkRemoveFilter').style('display', 'none').style('cursor', 'default');
		d3.select('#sectorRemoveFilter').style('display', 'none').style('cursor', 'default');
		d3.selectAll('.sc-icon').style('opacity', 0.3);
	});

	d3.select('#sectorRemoveFilter').on('click', function(d,i){
		Deepviz.filter('sector', 'clear');
		d3.selectAll('.col-header-bg-selected').style('opacity', 0);	
		d3.selectAll('.col-header-text').style('opacity', 1);	
		d3.select('#frameworkRemoveFilter').style('display', 'none').style('cursor', 'default');
		d3.select('#sectorRemoveFilter').style('display', 'none').style('cursor', 'default');
		d3.selectAll('.sc-icon').style('opacity', 0.3);
	});

	// rows
	var rows = layer1.selectAll('.frameworkRow')
	.data(metadata.framework_groups_array)
	.enter()
	.append('g')
	.attr('class', function(d,i){
		return 'frameworkRow f'+d.id + ' c'+d.context_id;
	})
	.attr('transform', function(d,i){
		return 'translate(0,'+ (frameworkMargins.top + frameworkMargins.sectorTotalRow + (i+1) * rowHeight)+')';
	});

	var rows2 = layer2.selectAll('.frameworkRow')
	.data(metadata.framework_groups_array)
	.enter()
	.append('g')
	.attr('class', function(d,i){
		return 'frameworkRow f'+d.id + ' c'+d.context_id;
	})
	.attr('transform', function(d,i){
		return 'translate(0,'+ (frameworkMargins.top + frameworkMargins.sectorTotalRow + (i+1)* rowHeight )+')';
	});

	rows.append('rect')
	.attr('x', 0)
	.attr('y', -20)
	.attr('width', leftColWidth)
	.attr('height', frameworkRowHeight)
	.style('fill', '#FAFAFA');

	rows.append('rect')
	.attr('x', leftColWidth)
	.attr('y', -20)
	.attr('class', function(d,i){
		return 'frameworkRowSelector frameworkRowSelector-bg frameworkRowSelector-'+d.id;
	})
	.attr('width', (leftSpacing-leftColWidth))
	.attr('height', frameworkRowHeight)
	.style('fill', '#FFF')
	// .style('fill', 'cyan');

	// left headers

	// context name vars (e.g. scope and scale)
	var cat = '';
	var cat0 = 0,
	cat1 = 0;

	var leftColArray = [];

	var contextRow = rows.append('g');

	var labelName = contextRow.append('text')
	.text(function(d,i){
		var cat_name = metadata.context_array[d.context_id-1].name;
		if(cat!=cat_name){
			cat = cat_name;
			cat1++;
			d.contextRow = 1;
			return cat_name;
		} else {
			d.contextRow = 0;
		}
		cat = cat_name;
		cat1++;
	})
	.attr('x',6)
	.attr('y', -3)
	.attr('id', function(d,i){
		return 'context-name-'+d.context_id;
	})
	.style('font-weight', 'bold')
	.style('fill', '#4c4c4c');

	labelName.attr('class', function(d,i){
		if(d.contextRow == 1){
			var b = d3.select(this.parentNode).node().getBBox();
			d3.select(this.parentNode).append('text')
			.text('')
			.attr('class', 'context-val')
			.attr('id', 'context-val-'+d.context_id)
			.style('text-anchor', 'left')
			.style('font-weight', 'bold')
			.style('fill', 'rgb(0, 137, 116)')
			.attr('y', -3)
			.attr('x', b.width + 12)
		}
		return 'context-name';
	});

	// second left headers
	var secondCol = rows.append('g');

	var labels = secondCol.append('text')
	.attr('class', function(d,i){
		return 'frameworkCol2 frameworkRowSelector frameworkRowSelector-'+d.id
	})
	.text(function(d,i){
		return d.name;
	})
	.attr('y', -2)
	.style('text-anchor', 'end');

	labels
	.attr('x', function(d,i){
		var bbox = d3.select(this).node().getBBox();
		return leftSpacing-37;
	})

	var dataLabels = secondCol.append('text')
	.text('00')
	.style('font-weight','bold')
	.style('fill', colorPrimary[4])
	.style('font-size', '13px')
	.attr('id',function(d,i){
		return 'f'+d.id+'-val';
	})
	.attr('class', function(d,i){ 
		return 'f-val frameworkCol2 frameworkRowSelector frameworkRowSelector-'+d.id
	})
	.style('text-anchor', 'middle')
	.attr('x', function(d,i){
		return leftSpacing-18;
	})
	.attr('y', -2);

	// row filters

	categories = d3.nest()
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
			return rowHeight + frameworkMargins.sectorTotalRow;
		} else { 
			rollingH += (categories[i-1].value) * rowHeight;
			return rollingH + frameworkMargins.sectorTotalRow;
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
		Deepviz.filter('context', parseInt(d.key));
	});

	// 2nd col filters
	d3.selectAll('.frameworkRowSelector')
	.style('cursor', function(d,i){
		if(d.name.length>1) return 'pointer';
	})
	.on('mouseover', function(d,i){
		if(d.name.length>1)
		return d3.select('.frameworkRowSelector-'+d.id+'.frameworkRowSelector-bg').style('fill', colorGrey[2]).style('opacity', 0.05);	
	})
	.on('mouseout', function(d,i){
		d3.selectAll('.frameworkRowSelector-bg').style('fill', '#FFF');
	}).on('click', function(d,i){
		if(d.name.length>1){
			d3.selectAll('.frameworkRowSelector-bg').style('fill', '#FFF');
			Deepviz.filter('framework',d.id);
		}
	});

	// sparkline containers
	rollingH = 0;
	frameworkSparklineHeight = d3.min(categories, function(d,i){
		return d.value-1;
	})*rowHeight-sparklinePadding.bottom;

	scale.sparkline.x = d3.scaleTime()
	    .domain([0, dataByDate.length-1])
	    .range([0, (leftColWidth)-(sparklinePadding.left+sparklinePadding.right)])
	    .rangeRound([0, (leftColWidth)-(sparklinePadding.left+sparklinePadding.right)], 0);

	layer2.selectAll('.sparkline')
	.data(categories)
	.enter()
	.append('g')
	.attr('id', function(d,i){ return 'sparkline-g-'+d.key })
	.attr('data-width', (leftColWidth)-(sparklinePadding.left+sparklinePadding.right))
	.attr('data-height', frameworkSparklineHeight)
	.attr('data-x', sparklinePadding.left)
	.attr('data-y', function(d,i){
		if(i==0){
			rollingH += rowHeight;
			return rowHeight + rowHeight + frameworkMargins.sectorTotalRow;
		} else { 
			rollingH += (categories[i-1].value) * rowHeight;
			return rollingH + rowHeight + frameworkMargins.sectorTotalRow;
		}
	})

	// grid
	var cells = rows.selectAll('.frameworkCol')
	.data(metadata.sector_array)
	.enter()
	.append('g')
	.attr('class', function(d,i){
		return 'frameworkCol ' + d3.select(this.parentNode).attr('class').split(' ')[1] + d3.select(this.parentNode).attr('class').split(' ')[2];
	})
	.attr('data-sector', function(d,i){
		return d.id;
	})
	.attr('transform', function(d,i){
		return 'translate('+ ((colWidth)*i+leftSpacing) + ','+ - (frameworkMargins.top) + ')';
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
	.attr('data-sector', function(d,i){
		return d.id;
	})
	.attr('transform', function(d,i){
		return 'translate('+ ((colWidth)*i+leftSpacing) + ','+ - (frameworkMargins.top) + ')';
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
	.attr('x', (leftSpacing))
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
		var val = d3.select('#framework-layer2 #'+this.id +'rect').attr('data-entries');
		if(val>0){
			d3.selectAll('.selector').style('opacity', 1);
		} else {
			d3.selectAll('.selector').style('opacity', 0);
		}					
	});

	tippy('.cell', { 
		// content: setBarName(s),
		theme: 'light-border',
		delay: [500,200],
		inertia: false,
		distance: 8,
		allowHTML: true,
		animation: 'shift-away',
		placement: 'top',
		arrow: true,
		size: 'small',
		onShow(instance) {
	        var cell = d3.select(instance.reference);
	        var v = cell.attr('data-entries');
	        if(!v) return false;
	        if(v==0) return false;

	        if(filters.frameworkToggle=='entries'){
				var html = '<div style="width: 100px; height: 12px; display: inline; margin-bottom: 2px; font-size: 9px; text-align: left; background-color: '+ colorNeutral[2] + '">&nbsp;&nbsp;</div><div style="padding-left: 5px; padding-bottom: 2px; display: inline; color: '+ colorNeutral[4] + '; font-size: 9px"><b>' + v + ' entries</b></div>';
	        } else {
				if (filters.toggle=='severity'){
			        var s = cell.attr('data-severity');
					var text = metadata.severity_units[s].name;
					var color = colorPrimary[s];

				} else {
			        var s = cell.attr('data-reliability');
					var text = metadata.reliability_units[s].name;
					var color = colorSecondary[s];

				}
				var html = '<div style="width: 100px; height: 12px; display: inline; text-align: left; font-size: 9px;  background-color: '+ color + '">&nbsp;&nbsp;</div>&nbsp; <span style="font-size: 10px; ">' + text + ' </span><div style="padding-left: 3px; padding-bottom: 2px; display: inline; color: '+ colorNeutral[4] + '; font-size: 9px"><b>' + v + ' '+textLabel+'</b></div>';
	        }


        	var cellId = cell.attr('id');

        	var parentNode = d3.select(cell.node().parentNode.parentNode);
        	var contextId = parentNode.attr('class').split(' ')[2].substring(1);
        	var frameworkId = parentNode.attr('class').split(' ')[1].substring(1);
        	var sectorId = d3.select(cell.node().parentNode).attr('data-sector');
        	
        	var path = DeepvizFramework.updateTooltipSparkline(contextId, frameworkId, sectorId);
	        html=html+'<br/><svg style="margin-top: 1px; margin-bottom: 1px" id="tooltipSparkline" width="'+tooltipSparklineWidth+'px" height="'+tooltipSparklineHeight+'px">'+path.node().outerHTML+'</svg>';
        	instance.setContent(html);

        	// d3.select(instance).append('svg');
		}
	});

	rows2.on('mouseover', function(d,i){
		hSel.attr('transform', function(){
			return 'translate(0,'+((i*rowHeight)+(frameworkMargins.top+frameworkMargins.sectorTotalRow)+7)+')';
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
		$('#loadImage').fadeIn(5,function(){
		$('#loadImageFramework').fadeIn(50,function(){		
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
			Map.update();
			DeepvizFramework.updateFramework();
			Deepviz.updateTimeline();

			$('#loadImage, #loadImageFramework').delay(50).fadeOut(500);
		});
		});
	});	

}

//**************************
// update framework
//**************************
DeepvizFramework.updateFramework = function(){
	// entries by framework sector (non-unique to populate framework cells)
	var entries = dataByFrameworkSector.filter(function(d){
		return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]))
	});

	if(filters.frameworkToggle=='average'){
		var nullEntries = entries.filter(function(d){
			if(filters.toggle=='severity'){
				return d.s==0;
			} else {
				return d.r==0
			}
		});
		entries = entries.filter(function(d){
			if(filters.toggle=='severity'){
				return d.s>0;
			} else {
				return d.r>0;
			}
		});
	} 

	var d = d3.nest()
	.key(function(d) { return d.framework; })
	.key(function(d) { return d.sector; })
	.rollup(function(leaves) { 
		return { 
			'median_r': d3.median(leaves, function(d,i){return d.r;}), 
			'median_s': d3.median(leaves, function(d,i){return d.s;}), 
			'total': leaves.length, 
		}
	})		
	.entries(entries);	

	// unique entries by framework
	var frameworkEntries = dataByFramework.filter(function(d){
		return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]));
	});

	var f = d3.nest()
	.key(function(d) { return d.framework; })
	.rollup(function(leaves) { 
		return { 
			'total': leaves.length, 
		}
	})		
	.entries(frameworkEntries);	

	// unique entries by context
	var contextEntries = dataByFrameworkContext.filter(function(d){
		return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]));
	});

	var c = d3.nest()
	.key(function(d) { return d.context; })
	.rollup(function(leaves) { 
		return { 
			'total': leaves.length, 
		}
	})		
	.entries(contextEntries);	

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
	} else { // median
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
	d3.selectAll('.framework-text').text('').style('visibility', 'hidden').style('fill', '#000');

	// framework labels
	d3.selectAll('.f-val').text('');
	f.forEach(function(d,i){
		d3.select('#f'+d.key+'-val').text(function(dd,ii){
			return d.value.total;
		})
	});

	// context labels
	d3.selectAll('.context-val').text('');
	c.forEach(function(d,i){
		d3.select('#context-val-'+d.key).text(function(dd,ii){
			return addCommas(d.value.total);
		})
	});

	// color null cells without median
	if(nullEntries){
		nullEntries.forEach(function(d,i){
			var id = 'f'+(d.framework)+'s'+(d.sector-1);
			d3.select('#'+id +'rect').style('fill', function(d){ return colorNeutral[0]; }).style('opacity', 1)
			.attr('data-context', d.context);
		});			
	}

	d3.selectAll('#framework-layer2 .cell').attr('data-entries', 0)
			.attr('data-severity', 0)
			.attr('data-reliability', 0);

	d.forEach(function(d,i){
		var sum = d3.sum(d.values, function(d){ return d.value.total});
		d.total = sum;
		var f = d.key;
		d.values.forEach(function(dd,ii){
			var s = dd.key;
			var id = 'f'+(f)+'s'+(s-1);
			
			if(filters.frameworkToggle == 'entries'){
				var v = dd.value.total;
			} else {
				if(filters.toggle=='severity'){
					var v = dd.value.median_s.toFixed(0);
				} else {
					var v = dd.value.median_r.toFixed(0);
				}
			}

			if(v>0){
				d3.select('#framework-layer2 #'+id +'rect').style('cursor', 'pointer');
			} else {
				d3.select('#framework-layer2 #'+id +'rect').style('cursor', 'default');
			}

			// set cell colour
			d3.select('#'+id +'rect').style('fill', function(d){ if(v==0) {return colorNeutral[0]; } else { return cellColorScale(v); } })
			
			d3.select('#framework-layer2 #'+id +'rect').attr('data-entries', dd.value.total)
			.attr('data-severity', Math.round(dd.value.median_s))
			.attr('data-reliability', Math.round(dd.value.median_r));
			// .attr('data-context', );

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

	// update sector column totals

	d3.selectAll('.col-header-value').text(0);

	var dat = dataBySector.filter(function(d){
		return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]));
	});

	var totalEntriesWithSector = d3.nest()
	.key(function(d) { return d['d'].pk; })
	.entries(dat).length;	

	d3.select('#totalDataLabel').text(addCommas(totalEntriesWithSector))

	var nest = d3.nest()
	.key(function(d) { return d['sector']; })
	.key(function(d) { if((filters.toggle=='severity')||(filters.toggle=='finalScore')){ return d.s; } else { return d.r } }).sortKeys(d3.ascending)
	.rollup(function(leaves) { return leaves.length; })		
	.entries(dat);	

	nest.forEach(function(d,i){
		d.value = d3.sum(d.values, function(d){
			return d.value;
		});
		d3.select('#framework-col-value-'+d.key).text(addCommas(d.value));
	});

}

//**************************
// create sparklines
//**************************
DeepvizFramework.createSparklines = function(){
	
	categories.forEach(function(d,i){

		var dimensions = {};

		dimensions.key = d.key;

		var container = d3.select('#sparkline-g-'+d.key)
		.attr('transform', function(d,i){
			dimensions.y = parseInt(d3.select(this).attr('data-y'));
			return 'translate(0,'+ dimensions.y + ')';
		})


		container.append('rect')
		.attr('class', 'sparkline-bg')
		.attr('id', function(d,i){ return 'sparkline-bg-'+d.key })
		.attr('x', function(d,i){
			return d3.select(this.parentNode).attr('data-x');
		})
		.attr('width', function(d,i){
			return d3.select(this.parentNode).attr('data-width');
		})
		.attr('height', function(d,i){
			return d3.select(this.parentNode).attr('data-height');
		})
		.attr('y', 0)
		.style('cursor', function(d,i){

		})
		.style('fill', '#E9E9E9');


		container.append('rect')
		.attr('class', 'sparkline-overlay')
		.attr('id', function(d,i){ return 'sparkline-overlay-'+d.key })
		.attr('x', function(d,i){
			dimensions.x = parseInt(d3.select(this.parentNode).attr('data-x'));
			return dimensions.x;
		})
		.attr('width', function(d,i){
			dimensions.width = parseInt(d3.select(this.parentNode).attr('data-width'));
			return dimensions.width;
		})
		.attr('height', function(d,i){
			dimensions.height = parseInt(d3.select(this.parentNode).attr('data-height'));
			return dimensions.height;
		})
		.attr('y', 0)
		.style('cursor', function(d,i){

		})
		.style('fill', '#FFF');

		container.append('rect')
		.attr('class', 'sparkline-hover')
		.attr('id', function(d,i){ return 'sparkline-hover-'+d.key })
		.attr('x', function(d,i){
			return dimensions.x + 100;
		})
		.attr('width', function(d,i){
			return 1;
		})
		.attr('height', function(d,i){
			return dimensions.height;
		})
		.attr('y', 0)
		.attr('opacity', 0)
		.style('cursor', function(d,i){

		})
		// .style('fill', '#F7F7F7');
		.style('fill', '#B4B4B4');

		container.append('path')
		.attr('class', 'sparkline')
		.attr('id', function(d,i){ return 'sparkline-'+dimensions.key })
		.attr("stroke", colorNeutral[2])
		.attr("fill", 'transparent')
	    .attr("stroke-width", 1.5);

	    d3.select('#context-filter'+dimensions.key)
	    .on('mouseover', function(d,i){
			
	    })
	    .on('mouseout', function(d,i){
			d3.select('#dateHoverRect').attr('opacity', 0);
			d3.select('#eventDropDateHoverRect').attr('opacity', 0);
			d3.selectAll('.sparkline-hover').attr('opacity', 0);
	    })
		.on('mousemove', function(d,i){
			var pos = d3.mouse(this);
			var x = pos[0];
			var y = pos[1];
			if((x>=dimensions.x)&&(x<=(dimensions.x+dimensions.width))){
				if((y>=dimensions.y)&&(y<=(dimensions.y+dimensions.height))){
					var x = scale.sparkline.x.invert(x);

					var w;
					if(filters.time=='d'){ 
						var x1 = d3.timeDay.floor(x);
						w = d3.timeDay.ceil(x);
						w = scale.timechart.x(w) - scale.timechart.x(x1);
					}
					if(filters.time=='m'){ 
						var x1 = d3.timeMonth.floor(x);
						w = d3.timeMonth.ceil(x);
						w = scale.timechart.x(w) - scale.timechart.x(x1);
					}
					if(filters.time=='y'){ 
						var x1 = d3.timeYear.floor(x);
						w = d3.timeYear.ceil(x);
						w = scale.timechart.x(w) - scale.timechart.x(x1);				
					}
					d3.select('#dateHoverRect').attr('x', scale.timechart.x(x1))
					.attr('width', w);

					d3.select('#eventDropDateHoverRect').attr('x', scale.timechart.x(x1))
					.attr('width', w);
					d3.selectAll('.sparkline-hover').attr('x', scale.sparkline.x(x1)+pointWidth/2);

					d3.select('#dateHoverRect').attr('opacity', 1);
					d3.select('#eventDropDateHoverRect').attr('opacity', 1);
					d3.selectAll('.sparkline-hover').attr('opacity', 1);
				} else {
					d3.select('#dateHoverRect').attr('opacity', 0);
					d3.select('#eventDropDateHoverRect').attr('opacity', 0);
					d3.selectAll('.sparkline-hover').attr('opacity', 0);
				}
			}
		});

	});

	DeepvizFramework.createTooltipSparkline();
	DeepvizFramework.updateSparklines();

}

//**************************
// update sparklines
//**************************
DeepvizFramework.updateSparklines = function(){

	if(frameworkSparklinesCreated===false){
		frameworkSparklinesCreated = true;
		return DeepvizFramework.createSparklines();
	}	

	// var emptyContext = {};

	// metadata.context_array.forEach(function(d,i){
	// 	emptyContext[i] = {'median_r': null, 'median_s': null, 'total': 0}
	// });

	var dataByDateSparkline = [...dataByFrameworkContext];
	var sparklineDates;

	// parse missing dates
	if(filters.time=='d'){
		sparklineDates = d3.timeDays(scale.timechart.x.domain()[0], scale.timechart.x.domain()[1], 1);
		dateIndex = dataByDateSparkline.map(function(d) { return d.date.getTime(); });

		dataByDateSparkline = d3.nest()
		.key(function(d) { return (d.date); })
		.key(function(d) { return d.context; })
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
		.key(function(d) { return d.context; })
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
		.key(function(d) { return d.context; })
		.rollup(function(leaves) { 
			return { 
				'median_r': d3.median(leaves, function(d,i){return d.r;}), 
				'median_s': d3.median(leaves, function(d,i){return d.s;}), 
				'total': leaves.length, 
			}
		})		
		.entries(dataByDateSparkline);
	}



	// add missing dates
	sparklineDates.forEach(function(d,i){
		if(!dateIndex.includes(d.getTime())){
			dataByDateSparkline.push({
				'key': d,
				'values': null
			})
		}		
	})

	dataByDateSparkline.forEach(function(d,i){
		d.key = new Date(d.key);
		d.context = [];
		if(d.values){
			d.values.forEach(function(dd,ii){
				d.context[dd.key-1] = dd.value.total;
			})		
		}

	})
	dataByDateSparkline.sort(function(x,y){
		return d3.ascending(x.key, y.key);
	});

	pointWidth = (leftColWidth - (sparklinePadding.left+sparklinePadding.right))/dataByDateSparkline.length;

	d3.select('#framework-svg').selectAll('linearGradient').remove();

	categories.forEach(function(d,i){

		var contextId = d.key;

		// find maximum value
		var contextMax = d3.max(dataByDateSparkline, function(d,i){
			return d.context[contextId-1];
		});

		// define x scale
		scale.sparkline.x = scale.timechart.x.copy();
		scale.sparkline.x.range([sparklinePadding.left, (leftColWidth-(sparklinePadding.right))])

		// define y scale
		scale.sparkline.y = d3.scaleLinear()
	    .range([frameworkSparklineHeight, 1])
	    .domain([0, contextMax]);

		var filteredSparklineData = dataByDateSparkline.filter(function(d){ 
	    	return d.values; 
	    });

	    if(contextMax>0){

	    // gradient line color
		d3.select('#framework-svg')
			.append("linearGradient")
			.attr("id", 'frameworkLlinearGradient'+i)
			.attr("gradientUnits", "userSpaceOnUse")
			.attr("x1", pointWidth/2)
			.attr("x2", (leftColWidth-(sparklinePadding.right+sparklinePadding.left)+pointWidth/2))
			.selectAll("stop")
			.data(filteredSparklineData)
			.join("stop")
			.attr("offset", function(d,i){
				var w = leftColWidth-(sparklinePadding.right+sparklinePadding.left);
				return ((scale.sparkline.x(d.key))/w);
			})
			.attr("stop-color", function(d,i){
		      	if(filters.frameworkToggle=='entries'){
			      	var col = colorNeutral[2];
	  			} else {
			      	var col = colorLightgrey[2];
	  			}
		      	if(!d.values) return col;
		      	d.values.forEach(function(dd,ii){
		      		if(dd.key==contextId){
		      			if(filters.frameworkToggle=='entries'){
			      			col = colorNeutral[2];
		      			} else {
		      				if(filters.toggle=='severity'){
				      			col = colorPrimary[Math.round(dd.value.median_s)];
		      				} else {
				      			col = colorSecondary[Math.round(dd.value.median_r)];
		      				}
		      			}
		      		}
		      	});
		      	return col;
			});

			d3.select('#sparkline-'+contextId)
			.datum(dataByDateSparkline)
			.attr("d", d3.line()
		        .x(function(d) { return scale.sparkline.x(d.key)+pointWidth/2 })
		        .y(function(d) { 
		        	var v = d.context[contextId-1];
		        	if(v===undefined)v=0;
		        	return scale.sparkline.y(v);
		        })
	        )
	        .attr('opacity', 1)
	        .attr('stroke', 'url(#frameworkLlinearGradient'+i+')');

	    } else {
	    	d3.select('#sparkline-'+contextId).attr('opacity', 0);
	    }

	});

}

DeepvizFramework.updateSparklinesOverlay = function(d1){
	if(scale.sparkline.x(d1[0])>1000) return;
	d3.selectAll('.sparkline-overlay')
	.attr('x', scale.sparkline.x(d1[0]))
	.attr('width', scale.sparkline.x(d1[1])-scale.sparkline.x(d1[0]));

	if(scale.tooltipSparkline.x){
		d3.select('.tooltip-sparkline-overlay')
		.attr('x', scale.tooltipSparkline.x(d1[0]))
		.attr('width', scale.tooltipSparkline.x(d1[1])-scale.tooltipSparkline.x(d1[0]));		
	}
}

DeepvizFramework.createTooltipSparkline = function(){

	tooltipSvg = d3.select('#framework-svg').append('g')
	.attr('opacity', 0).append('g');

	tooltipSvg.append('rect')
	.attr('class', 'tooltip-sparkline-bg')
	.attr('id', function(d,i){ return 'tooltip-sparkline-bg' })
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


	tooltipSvg.append('rect')
	.attr('class', 'tooltip-sparkline-overlay')
	.attr('id', function(d,i){ return 'tooltip-sparkline-overlay' })
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
	tooltipSvg
	.append('path')
	.attr('class', 'sparkline')
	.attr('id','tooltipSparkline')
	.attr("stroke", colorNeutral[2])
	.attr("fill", 'transparent')
    .attr("stroke-width", 1);

	DeepvizFramework.updateSparklinesOverlay(dateRange);
}

DeepvizFramework.updateTooltipSparkline = function(contextId, frameworkId, sectorId){

	var dataByDateSparkline = [...dataByFrameworkSector];
	dataByDateSparkline = dataByDateSparkline.filter(function(d,i){
		return d.context == contextId && d.framework == frameworkId && d.sector == sectorId;
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

    DeepvizFramework.updateSparklinesOverlay(dateRange);

	var filteredSparklineData = dataByDateSparkline.filter(function(d){ 
    	return d.value.total>0; 
    });

    if(contextMax>0){

    	// gradient line color
    	d3.select('#frameworkTooltipGradientSparkline').remove();
		d3.select('#framework-svg')
			.append("linearGradient")
			.attr("id", 'frameworkTooltipGradientSparkline')
			.attr("gradientUnits", "userSpaceOnUse")
			.attr("x1", 0)
			.attr("x2", tooltipSparklineWidth)
			.selectAll("stop")
			.data(filteredSparklineData)
		    .join("stop")
			.attr("offset", d => ((scale.tooltipSparkline.x(d.key)+(pointWidth/2)) / (tooltipSparklineWidth)) )
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

    	d3.select('#tooltipSparkline')
		.datum(dataByDateSparkline)
		.style('stroke', 'url(#frameworkTooltipGradientSparkline)')
		.attr("d", d3.line()
	        .x(function(d) { return scale.tooltipSparkline.x(d.key)+pointWidth/2 })
	        .y(function(d) { 
	        	var v = d.value.total;
	        	if(v===undefined)v=0;
	        	return scale.tooltipSparkline.y(v);
	        })
        ).attr('opacity', 1);   

        return tooltipSvg;

    } else {
    	return null;
    }


}


