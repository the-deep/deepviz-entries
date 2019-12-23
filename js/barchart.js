var BarChart = {};

BarChart.createBarChart = function(a){

	var padding = {left: 20, right: 25, top: 35, bar: {y: 5}};

	// create svg
	var svg = Deepviz.createSvg({
		id: a.div+'-svg',
		viewBoxWidth: a.width,
		viewBoxHeight: a.height,
		div: '#'+a.div,
		width: '100%'
	});

	var height = a.height - padding.top;

	a.rows = metadata[a.rows];

	if((a.limit)&&(a.rows.length>a.limit)) {
		var rowHeight = height/a.limit;
		a.rows = a.rows.splice(0,10);
	} else {
		var rowHeight = height/a.rows.length;
	}

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

	var rows = chartarea.selectAll('.bar-row')
	.data(a.rows)
	.enter()
	.append('g')
	.attr('class', function(d,i) { return 'bar-row '+ a.classname+'-row ' + a.classname+'-bar-row'+i; })
	.attr('transform', function(d,i){
		return 'translate(0,' + ((i*rowHeight) + padding.top) + ')';
	});

	var label = rows.append('text')
	.attr('y', rowHeight/2 )
	.attr('class', function(d,i){ return a.classname + ' ' + a.classname+'-'+i })
	.style('alignment-baseline', 'middle')
	.text(function(d,i){
		var name = d.name.substr(0,labelCharLimit);
		if(name.length==labelCharLimit) name += '.';
		return name;
	}).style('text-anchor', 'end');

	var labelWidth = chartarea.node().getBBox().width + padding.left;
	label.attr('x', labelWidth-20);
	labelWidth = labelWidth + 70;

	// title.attr('transform', function(d,i){
	// 	var offset = d3.select(this).node().getBBox().width +35;
	// 	return 'translate('+(labelWidth-offset)+',0)';
	// })

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
		return Deepviz.filter(a.filter, i+1);
	});

	// define x scale
	scale[a.classname] = {};
	scale[a.classname].x = d3.scaleLinear()
	.range([labelWidth, a.width - padding.right])
	.domain([1, 5]);// finalScore/reliability x xcale

	scale[a.classname].paddingLeft = labelWidth;

	for(var s=0; s >= 0; s--) {
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
		.style('outline', 'none')
		.attr('y', padding.bar.y)
		.attr('height', rowHeight-(padding.bar.y*2))
		.style('fill', colorPrimary[s])
	}

	var dataLabel = rows.append('text')
	.text(9999)
	.attr('id', function(d,i){
		return a.classname+d.id+'label';
	})
	.attr('class', a.classname+'-label')
	.attr('y', rowHeight/2)
	.style('alignment-baseline', 'middle')
	.style('text-anchor', 'middle')
	.attr('x', labelWidth - 70)
	.style('fill', colorPrimary[4])
	.style('font-weight', 'bold')
	.style('font-size', '16px');

	var percentLabel = rows.append('text')
	.text('100%')
	.attr('id', function(d,i){
		return a.classname+d.id+'percentlabel';
	})
	.attr('class', a.classname+'-percentlabel')
	.attr('y', rowHeight/2)
	.style('alignment-baseline', 'middle')
	.style('text-anchor', 'middle')
	.attr('x', labelWidth - 30)
	.style('fill', colorPrimary[4])
	.style('font-size', '16px');

	d3.select('#'+a.classname+'RemoveFilter').on('click', function(){ Deepviz.filter(a.filter, 'clear'); });

}

BarChart.createStackedBarChart = function(a){

	var padding = {left: 20, right: 25, top: 35, bar: {y: 5}};

	// create svg
	var svg = Deepviz.createSvg({
		id: a.div+'-svg',
		viewBoxWidth: a.width,
		viewBoxHeight: a.height,
		div: '#'+a.div,
		width: '100%'
	});

	a.rows = metadata[a.rows];

	if(a.classname=='organisation'){
		a.rows = a.rows.splice(0,10);
	}

	var height = a.height - padding.top;
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
	.attr('class', 'stacked-bar-row '+a.classname+'-row')
	.attr('transform', function(d,i){
		return 'translate(0,' + ((i*rowHeight) + padding.top) + ')';
	});

	var label = rows.append('text')
	.attr('y', rowHeight/2 )
	.attr('class', function(d,i){ return a.classname + ' ' + a.classname+'-'+i })
	.style('alignment-baseline', 'middle')
	.text(function(d,i){
		var name = d.name.substr(0,labelCharLimit-7);
		if(name.length==labelCharLimit-7) name += '.';
		return name;
	}).style('text-anchor', 'end');

	var labelWidth = chartarea.node().getBBox().width + padding.left;
	label.attr('x', labelWidth-20);
	labelWidth = labelWidth + 76;

	if(a.classname == 'sector'){
		var icon = rows.append('image')
		.attr('class', function(d,i){
			return 'sector-icon sector-icon-'+d.id;
		})
		.attr('xlink:href', function(d,i){
			return 'images/sector-icons/'+(d.name.toLowerCase())+'.svg'; 
		})
		.attr('height', 23)
		.attr('width', 23)
		.attr('y', rowHeight/2 - 12)
		.attr('x', labelWidth-85);
		labelWidth = labelWidth + 36;
	}

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
		if(a.classname=='sector'){
			return Deepviz.filter('sector',i+1);
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
		.style('outline', 'none')
		.attr('y', padding.bar.y)
		.attr('height', rowHeight-(padding.bar.y*2))
		.style('fill', colorPrimary[s])
		.on('click', function(d,i){
			var val = parseInt(d3.select(this).attr('data-id'));
			if((filters.toggle=='severity')||(filters.toggle=='finalScore')){
				Deepviz.filter('severity',val);
			} else {
				Deepviz.filter('reliability',val);
			}
		})
	}

	var dataLabel = rows.append('text')
	.text(9999)
	.attr('id', function(d,i){
		return a.classname+d.id+'label';
	})
	.attr('class', a.classname+'-label')
	.attr('y', rowHeight/2)
	.style('alignment-baseline', 'middle')
	.style('text-anchor', 'middle')
	.attr('x', labelWidth - 73)
	.style('fill', colorNeutral[4])
	.style('font-weight', 'bold')
	.style('font-size', '16px');

	var percentLabel = rows.append('text')
	.text('100%')
	.attr('id', function(d,i){
		return a.classname+d.id+'percentlabel';
	})
	.attr('class', a.classname+'-percentlabel')
	.attr('y', rowHeight/2)
	.style('alignment-baseline', 'middle')
	.style('text-anchor', 'middle')
	.attr('x', labelWidth - 30)
	.style('fill', colorNeutral[4])
	.style('font-size', '16px');

	d3.select('#'+a.classname+'RemoveFilter').on('click', function(){ Deepviz.filter(a.filter, 'clear'); });

}

BarChart.updateBars = function(group, dataset, duration = 0){

	var sort = true;

	// affected groups
	var dat = dataset.filter(function(d){
		return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]));
	});

	var nest = d3.nest()
	.key(function(d) {  return d[group]; })
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

	var data_group = group;
	if(data_group=='focus') data_group = 'focus_array';
	if(data_group=='affected_groups') data_group = 'affected_groups_array';
	if(data_group=='additional_documentation') data_group = 'additional_documentation_array';
	if(data_group=='unit_of_reporting') data_group = 'type_of_unit_of_analysis';
	if(data_group=='unit_of_analysis') data_group = 'type_of_unit_of_analysis';
	if(data_group=='organisation') data_group = 'organization';

	var d = [];
	metadata[data_group].forEach(function(mt,ii){
		var name = mt.name;
		var key = mt.id;
		var value = 0;
		nest.forEach(function(dd,ii){
			if(mt.id==dd.key){
				value = dd.value;
			}
		});
		d.push({'key': key, 'value': value, 'name': name});
	});

	if(sort==true){
		d = d.sort(function(x,y){
			return d3.ascending(y.value, x.value);
		});
	}

	if(group=='organisation'){
		d = d.splice(0,10);
	}

	var rowMax = d3.max(labels, function(d,i){
		return d.value
	});

	scale[group].x.domain([0, rowMax]);// finalScore/reliability x xcale

    // reset all bars to zero width
    d3.selectAll('.'+group+'-bar').attr('width', 0);

	var rows = d3.selectAll('.'+group+'-row')
	.data(d)
	.attr('class', function(d,i){
		return 'bar-row '+group+'-row '+group+'-bar-row'+d.key;
	});

	var labels =d3.selectAll('text.'+group)
	.data(d)
	.text(function(d,ii){
		return d.name;
	})
	.attr('class', function(d,i){
		return group + ' ' +group +'-'+d.key;``
	})

	rows.select('.'+group+'-bg')
	.attr('class', function(d,i) { 
		return group+'-bg ' + group + '-bg-'+d.key;
	}).on('click', function(d,i){
		return Deepviz.filter(group, d.key);
	});

	rows.select('.'+group+'-bar')
	.attr('width', function(d,i){
		if(d.value>0){
			return scale[group].x(d.value)-scale[group].paddingLeft;
		} else {
			return 0;
		}
	})
	.attr('x', function(d,i){
		return scale[group].paddingLeft;
	})
	.style('fill', colorPrimary[3])
	.attr('data-value', function(d,i){
		return d.value;
	});

	rows.select('.'+group+'-label').text(function(d,i){
		if(d.value>0){ return d.value; } else { return ''}
	});

	rows.select('.'+group+'-percentlabel').text(function(d,i){
		var p = (d.value/total)*1000;
		p = Math.round(p)/10;
		if(d.value>0){ return p+'%'; } else { return ''};
	});

	if(filters[group].length>0){
		d3.selectAll('.'+group).style('opacity', 0.2);
		d3.selectAll('.'+group+'-bg').style('opacity', 0);
	}
	filters[group].forEach(function(d,i){
		d3.selectAll('.'+group+'-'+(d)).style('opacity', 1);
	});

	// labels.forEach(function(dd,ii){

	// 	d3.select('#'+group+dd.key+'label').text(dd.value).style('opacity', 1)
	// 	.style('fill', function(){
	// 		if(filters.toggle == 'finalScore'){
	// 			return colorNeutral[4];
	// 		} else {
	// 			return colorNeutral[4];
	// 		}
	// 	});
	// 	var row = dd.key;
	// });

	// d.forEach(function(d,i){
	// 	var key = d.key;
	// 	var wcount = scale[group].paddingLeft;
	// 	var xcount = scale[group].paddingLeft;
	// 		var s = d.key;
	// 		var id = group+(key)+'s0';
	// 		var w = scale[group].x(d.value)-wcount;
	// 		d3.select('#'+id )
	// 		.attr('x', xcount)
	// 		.attr('width', w)
	// 		.attr('data-value', d.value)
	// 		.style('fill', function(){
	// 			if(filters.toggle == 'finalScore'){
	// 				return colorPrimary[3];
	// 			} else {
	// 				return colorSecondary[s];
	// 			}
	// 		});
	// 		var rect = document.querySelector('#'+id)
	// 		tippy(rect, { 
	// 			content: '1',
	// 			theme: 'light-border',
	// 			delay: [250,100],
	// 			inertia: false,
	// 			distance: 8,
	// 			allowHTML: true,
	// 			animation: 'shift-away',
	// 			arrow: true,
	// 			size: 'small',
	// 			onShow(instance) {
	// 		        var v = d3.select('#'+id).attr('data-value');
	// 				return '<div style="width: 100px; height: 10px; display: inline; background-color: '+ colorPrimary[2] + '">&nbsp;&nbsp;</div>&nbsp;&nbsp;<div style="padding-left: 3px; padding-bottom: 2px; display: inline; font-weight: bold; color: '+ colorNeutral[4] + '; font-size: 9px">' + v + ' entries</div>';
	// 			}
	// 		});
	// });
}

//**************************
// update stacked bars
//**************************
BarChart.updateStackedBars = function(group, dataset, duration = 0){

	var sort = true;

	var data_group = group;
	if(data_group=='organisation') data_group = 'organization';
	if(data_group=='sector') data_group = 'sector_array';
	if(data_group=='affected_groups') data_group = 'affected_groups_array';
	if(data_group=='specific_needs') data_group = 'specific_needs_groups_array';
	if(data_group=='unit_of_reporting') data_group = 'type_of_unit_of_analysis';
	if(data_group=='unit_of_analysis') data_group = 'type_of_unit_of_analysis';

	// affected groups
	var dat = dataset.filter(function(d){
		return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]));
	});

	var nest = d3.nest()
	.key(function(d) { return d[group]; })
	.key(function(d) { if((filters.toggle=='severity')||(filters.toggle=='finalScore')){ return d.s; } else { return d.r } }).sortKeys(d3.ascending)
	.rollup(function(leaves) { return leaves.length; })		
	.entries(dat);	

	nest.forEach(function(d,i){
		d.value = d3.sum(d.values, function(d){
			return d.value;
		})
	});

	if(sort==true){
		nest = nest.sort(function(x,y){
			return d3.ascending(y.value, x.value);
		});
	}

	if(group=='organisation'){
		nest = nest.splice(0,10);
	}

	var d = [];

	metadata[data_group].forEach(function(mt,ii){
		var name = mt.name.substr(0,labelCharLimit-7);
		if(name.length==labelCharLimit-7) name += '.';
		var key = mt.id;
		var value = 0;
		var values = [];
		nest.forEach(function(dd,ii){
			if(mt.id==dd.key){
				value = dd.value;
				values = dd.values;
			}
		});
		d.push({'key': key, 'value': value, 'values': values, 'name': name});
	});

	if(sort==true){
		d = d.sort(function(x,y){
			return d3.ascending(y.value, x.value);
		});
	}

	if(group=='organisation'){
		d = d.splice(0,10);
	}

	var rowMax = d3.max(d, function(d,i){
		return d.value
	});

	scale[group].x.domain([0, rowMax]);// severity/reliability x xcale

    // reset all bars to zero width
    d3.selectAll('.'+group+'-bar').attr('width', 0);

	var rows = d3.selectAll('.'+group+'-row')
	.data(d)
	.attr('class', function(d,i){
		return 'bar-row '+group+'-row '+group+'-bar-row'+d.key;
	});

	var labels =d3.selectAll('text.'+group)
	.data(d)
	.text(function(d,ii){
		return d.name;
	})
	.attr('class', function(d,i){
		return group + ' ' +group +'-'+d.key;``
	})
	.style('opacity', 1);

	d3.selectAll('.'+group+'-bg')
	.data(d)
	.attr('class', function(d,i) { 
		return group+'-bg ' + group + '-bg-'+d.key;
	}).on('click', function(d,i){
		return Deepviz.filter(group, d.key);
	});

	d.forEach(function(d,i){
		var key = d.key;
		var wcount = scale[group].paddingLeft;
		var xcount = scale[group].paddingLeft;
		var value = d.value; 
		var name = d.name;

		d3.select('#'+group+(i+1)+'label').text(function(d,i){
			if(value>0){ return value; } else { return ''};
		});

		d3.select('#'+group+(i+1)+'percentlabel').text(function(d,i){
			var p = (value/total)*1000;
			p = Math.round(p)/10;
			if(value>0){ return p+'%'; } else { return ''};
		});

		if(group=='sector'){
			d3.select('.'+group+'-icon-'+(i+1))
			.attr('href', function(d,i){
				return 'images/sector-icons/'+name.toLowerCase()+'.svg'
			})
			.style('opacity', function(d,i){
				if(filters['sector'].includes(key)){
					return 1;
				} else {
					return 0.2;
				}
			})				
		}

		d.values.forEach(function(dd,ii){
			var s = dd.key;
			var id = group+(i+1)+'s'+(s);
			var w = scale[group].x(dd.value)-wcount;
			d3.select('#'+id )
			.attr('x', xcount)
			.attr('width', w)
			.attr('data-value', dd.value)
			.style('fill', function(){
				if((filters.toggle=='severity')||(filters.toggle=='finalScore')){
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

	if(filters[group].length>0){
		d3.selectAll('.'+group).style('opacity', 0.2);
		d3.selectAll('.'+group+'-bg').style('opacity', 0);
	}
	filters[group].forEach(function(d,i){
		d3.selectAll('.'+group+'-'+(d)).style('opacity', 1);
	});
}

var setBarName = function(s,v){
	// if(s==0) return false;
	if(filters.toggle=='finalScore'){
		var color = colorPrimary[s];
		var text = metadata.scorepillar_scale[s].name;
	} else if (filters.toggle=='severity'){
		var color = colorPrimary[s];
		var text = metadata.severity_units[s].name;
	} else {
		var color = colorSecondary[s];
		var text = metadata.reliability_units[s].name;
	}
	return '<div style="width: 100px; height: 10px; display: inline; background-color: '+ color + '">&nbsp;&nbsp;</div>&nbsp;&nbsp; ' + text + ' <div style="padding-left: 3px; padding-bottom: 2px; display: inline; font-weight: bold; color: '+ colorNeutral[4] + '; font-size: 9px">' + v + ' entries</div>';
}
