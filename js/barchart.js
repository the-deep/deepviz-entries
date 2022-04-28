var BarChart = {};
var updating = false;
var updateInterval = 0;
var tooltipSparklineHeight = 40;
var tooltipSparklineWidth = 140;
var maxBarHeight = 60;
var labelWidthText = 250; 

BarChart.createBarChart = function(a){

	var padding = {left: 20, right: 50, top: 20, bar: {y: 5}};

	// add title
	var div = d3.select('#'+a.div);
	var title = div.append('div');

	title.attr('class', 'title').text(a.title);

	div.append('img')
	.attr('id', a.classname+'RemoveFilter')
	.attr('class', 'removeFilterBtn')
	.attr('src', 'images/filter.png')
	.attr('title', 'Clear filter');

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

	if((maxBarHeight>0)&&(rowHeight>maxBarHeight)){
		rowHeight = maxBarHeight
	}

	var chartarea = svg.append('g');

	var rows = chartarea.selectAll('.bar-row')
	.data(a.rows)
	.enter()
	.append('g')
	.attr('class', function(d,i) { return 'bar-row '+ a.classname+'-row ' + a.classname+'-bar-row'+d.key; })
	.attr('transform', function(d,i){
		return 'translate(0,' + ((i*rowHeight) + padding.top) + ')';
	});


	var label = rows.append('foreignObject')
	.attr('requiredFeatures','http://www.w3.org/TR/SVG11/feature#Extensibility')
	.attr('y', 0 )
	.attr('height', rowHeight )
	.attr('width', labelWidthText )
	.attr('class', function(d,i){ return ''+a.classname+'-labeltext labeltext ' })
	.append("xhtml:div")
	.style('height', rowHeight )
	.html(function(d,i){
		// var name = d.name.substr(0,labelCharLimit);
		// if(name.length==labelCharLimit) name += '.';
		return d.name;
	});

	var labelWidth = rows.node().getBBox().width + padding.left;
	label.attr('x', labelWidth-20);
	labelWidth = labelWidth + 70;

	var width = (a.width - labelWidth - padding.right); 

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
		.style('fill', colorNeutral[s])
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
	.style('fill', colorNeutral[5])
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
	.style('fill', colorNeutral[5])
	.style('font-size', '16px');

	d3.select('#'+a.classname+'RemoveFilter').on('click', function(){ Deepviz.filter(a.filter, 'clear'); });
}

BarChart.createStackedBarChart = function(a){

	var data_group = a.rows;
	if(data_group=='sector_array') data_group = 'sector';
	if(data_group=='context_array') data_group = 'context';
	if(data_group=='specific_needs_groups_array') data_group = 'special_needs';
	if(data_group=='affected_groups_array') data_group = 'affected_groups';
	if(data_group=='demographic_groups_array') data_group = 'demographic_groups';

	var padding = {left: 20, right: 50, top: 15, bar: {y: 5}};
	
	// add title
	var div = d3.select('#'+a.div).append('div').attr('class', 'titleContainer')
	var title = div.append('div');

	title.attr('class', 'title').text(a.title);

	div.append('img')
	.attr('id', a.classname+'RemoveFilter')
	.attr('class', 'removeFilterBtn')
	.attr('src', 'images/filter.png')
	.attr('title', 'Clear filter');

	// create svg
	var svg = Deepviz.createSvg({
		id: a.div+'-svg',
		viewBoxWidth: a.width,
		viewBoxHeight: a.height,
		div: '#'+a.div,
		width: '100%'
	});

	var rws = metadata[a.rows];

	if((data_group=='special_needs')||(data_group=='affected_groups')||(data_group=='demographic_groups')){

		rws = [];
		metadata[a.rows].forEach(function(d,i){
			dataEntries.forEach(function(dd,ii){
				if(dd[data_group].includes(d.id)){
					if(!rws.includes(d))	rws.push(d);
				}
			})
		})
	}

	a.rows = rws;

	if(a.rows.length==0){
		return false;
	}

	if(a.classname.includes('organisation')){
		a.rows = a.rows.splice(0,10);
	}

	var height = a.height - padding.top;
	var rowHeight = height/a.rows.length;

	if((maxBarHeight>0)&&(rowHeight>maxBarHeight)){
		rowHeight = maxBarHeight;
	}

	var chartarea = svg.append('g');
	
	var rows = chartarea.selectAll('.stacked-bar-row')
	.data(a.rows)
	.enter()
	.append('g')
	.attr('class', 'stacked-bar-row '+a.classname+'-row')
	.attr('transform', function(d,i){
		return 'translate(0,' + ((i*rowHeight) + padding.top) + ')';
	});


	var label = rows.append('foreignObject')
	.attr('requiredFeatures','http://www.w3.org/TR/SVG11/feature#Extensibility')
	.attr('y', 0 )
	.attr('height', rowHeight )
	.attr('width', labelWidthText )
	.attr('class', function(d,i){ return ''+a.classname+'-labeltext labeltext ' })
	.append("xhtml:div")
	.style('height', rowHeight )
	.html(function(d,i){
		// var name = d.name.substr(0,labelCharLimit);
		// if(name.length==labelCharLimit) name += '.';
		return d.name;
	});
	
	
	var labelWidth = rows.node().getBBox().width + padding.left;
	label.attr('x', labelWidth-20);
	labelWidth = labelWidth + 80;

	var width = (a.width - labelWidth - padding.right); 

	if(a.classname == 'sector'){
		rows.append('image')
		.attr('class', function(d,i){
			return 'sector-icon sector-icon-'+d.id;
		})
		.attr('xlink:href', function(d,i){
			if(availableSectorIcons.includes(d.name.toLowerCase())) {
				return 'images/sector-icons/'+d.name.toLowerCase()+'.svg'
			} else {
				return '';
			}
		})
		.attr('height', 23)
		.attr('width', 23)
		.attr('y', rowHeight/2 - 12)
		.attr('x', labelWidth-85);
		labelWidth = labelWidth + 36;
	}

	if(a.classname == 'data_collection_technique'){
		rows.append('image')
		.attr('class', function(d,i){
			return 'data-collection-technique-icon data-collection-technique-icon-'+d.id;
		})
		.attr('xlink:href', function(d,i){
			return 'images/data-collection-technique-icons/'+(d.name.replace(/\s+/g, '-').toLowerCase())+'.svg'; 
		})
		.attr('height', 23)
		.attr('width', 23)
		.attr('y', rowHeight/2 - 12)
		.attr('x', labelWidth-85);
		labelWidth = labelWidth + 36;
	}

	// adjust title and filter button spacing
	d3.select('#'+a.classname+'Title').style('text-align', 'left').style('display', 'inline');

	var rowBg = rows.append('rect')
	.attr('y', 1)
	.attr('x', 0)
	.attr('width', labelWidth+0)
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
			return a.classname+(i+1)+'s'+(s);
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
		.style('cursor', 'pointer')
		.attr('y', padding.bar.y)
		.attr('height', rowHeight-(padding.bar.y*2))
		.style('fill', colorPrimary[s])
		.on('click', function(d,i){
			var val = parseInt(d3.select(this).attr('data-id'));
			if(filters.toggle=='finalScore'){
				Deepviz.filter('finalScore',val);
			} else if(filters.toggle=='severity'){
				Deepviz.filter('severity',val);
			} else {
				Deepviz.filter('reliability',val);
			}
		});
	}

	var dataLabel = rows.append('text')
	.text(9999)
	.attr('id', function(d,i){
		return a.classname+(i+1)+'label';
	})
	.attr('class', a.classname+'-label')
	.attr('y', rowHeight/2)
	.style('alignment-baseline', 'middle')
	.style('text-anchor', 'middle')
	.attr('x', labelWidth - 73)
	.style('fill', colorNeutral[5])
	.style('font-weight', 'bold')
	.style('font-size', '16px');

	var percentLabel = rows.append('text')
	.text('100%')
	.attr('id', function(d,i){
		return a.classname+(i+1)+'percentlabel';
	})
	.attr('class', a.classname+'-percentlabel')
	.attr('y', rowHeight/2)
	.style('alignment-baseline', 'middle')
	.style('text-anchor', 'middle')
	.attr('x', labelWidth - 30)
	.style('fill', colorNeutral[5])
	.style('font-size', '16px');

	d3.select('#'+a.classname+'RemoveFilter').on('click', function(){ Deepviz.filter(a.filter, 'clear'); });

}

BarChart.updateBars = function(group, dataset, duration = 0){

	if(!scale[group]) return false;

	var sort = true;

	// affected groups
	var dat = dataset.filter(function(d){
		return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]));
	});

	barTooltipData[group] = dataset;

	var grp = group;
	if(group=='organisation-un') grp = 'organisation';
	if(group=='organisation-ingo') grp = 'organisation';
	if(group=='organisation-lngo') grp = 'organisation';
	if(group=='organisation-rcrc') grp = 'organisation';
	if(group=='organisation-media') grp = 'organisation';
	if(group=='organisation-other') grp = 'organisation';
	if(group=='organisation-gov') grp = 'organisation';
	if(group=='organisation-academic') grp = 'organisation';
	if(group=='organisation-donor') grp = 'organisation';
	if(group=='organisation-cluster') grp = 'organisation';

	var nest = d3.nest()
	.key(function(d) {  return d[grp]; })
	.rollup(function(leaves) { return leaves.length; })		
	.entries(dat);	

	var labels = d3.nest().key(function(d) {
		return d[grp];
	}).sortKeys(d3.ascending)
	.rollup(function(leaves) {
		return d3.sum(leaves, function(d) {
			return 1;
		});
	}).entries(dat);

	var data_group = group;
	if(data_group=='focus') data_group = 'focus_array';
	if(data_group=='sector') data_group = 'sector_array';
	if(data_group=='specific_needs') data_group = 'specific_needs_groups_array';
	if(data_group=='affected_groups') data_group = 'affected_groups_array';
	if(data_group=='demographic_groups') data_group = 'demographic_groups_array';
	if(data_group=='additional_documentation') data_group = 'additional_documentation_array';
	if(data_group=='unit_of_reporting') data_group = 'type_of_unit_of_analysis';
	if(data_group=='unit_of_analysis') data_group = 'type_of_unit_of_analysis';
	if(data_group=='organisation') data_group = 'organization';
	if(data_group=='organisation-un') data_group = 'organization';
	if(data_group=='organisation-ingo') data_group = 'organization';
	if(data_group=='organisation-lngo') data_group = 'organization';
	if(data_group=='organisation-rcrc') data_group = 'organization';
	if(data_group=='organisation-media') data_group = 'organization';
	if(data_group=='organisation-other') data_group = 'organization';
	if(data_group=='organisation-gov') data_group = 'organization';
	if(data_group=='organisation-academic') data_group = 'organization';
	if(data_group=='organisation-donor') data_group = 'organization';
	if(data_group=='organisation-cluster') data_group = 'organization';

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
			return d3.ascending(y.value, x.value)||d3.ascending(x.name, y.name);
		});
	}

	if(group.includes('organisation')){
		d = d.splice(0,10);
	}

	var rowMax = d3.max(labels, function(d,i){
		return d.value
	});

	if(scale[group].x=='')return false;
	
	scale[group].x.domain([0, rowMax]);// finalScore/reliability x xcale

    // reset all bars to zero width
    d3.selectAll('.'+group+'-bar').attr('width', 0);

	var rows = d3.selectAll('.'+group+'-row')
	.data(d)
	.attr('class', function(d,i){
		return 'bar-row '+group+'-row '+group+'-bar-row'+d.key;
	})
	.style('display', function(d,i){
		if(d.value>0){
			return 'inline-block';
		} else {
			return 'none';
		}
	});

	labels = d3.selectAll('.'+group+'-labeltext div')
	.data(d)
	.html(function(d,ii){
		// var name = d.name.substr(0,labelCharLimit);
		// if(name.length==labelCharLimit) name += '.';
		return d.name;
	});

	
	rows.select('.'+group+'-bg')
	.attr('class', function(d,i) { 
		return group+'-bg ' + group + '-bg-'+d.key;
	}).on('click', function(d,i){
		return Deepviz.filter(grp, d.key);
	});

	rows.select('.'+group+'-bar')
	.on('click', function(d,i){
		return false;
	}).style('cursor', 'default')
	.attr('data-group', grp)
	.attr('data-name', function(d,i){
		return d.name;
	})
	.attr('data-group-id', function(d,i){
		return d.key;
	})
	.attr('width', function(d,i){
			var id = d3.select(this).attr('id');
			var rect = document.querySelector('#'+id);
			tippy(rect, { 
				// content: setBarName(s),
				theme: 'light-border',
				delay: [250,100],
				inertia: false,
				distance: 8,
				allowHTML: true,
				animation: 'shift-away',
				arrow: true,
				size: 'small',
				onShow(instance) {
					var t = d3.select(instance.reference);
					var dataGroup = t.attr('data-group');
					var dataGroupId = t.attr('data-group-id');
					var dataName = t.attr('data-name');
					var dataTotal = t.attr('data-value');
					var html = BarChart.updateTooltipSparkline(null, grp, dataGroupId, dataName, dataTotal);
					instance.setContent(html);
			    }
			});
		if(d.value>0){
			return scale[group].x(d.value)-scale[group].paddingLeft;
		} else {
			return 0;
		}
	})
	.attr('x', function(d,i){
		return scale[group].paddingLeft;
	})
	.style('fill', colorNeutral[3])
	.attr('data-value', function(d,i){
		return d.value;
	});

	rows.select('.'+group+'-label').text(function(d,i){
		if(d.value>0){ return d.value; } else { return ''}
	});

	rows.select('.sector-icon')
	.attr('class', function(d,i) { 
		return 'sector-icon sector-icon-'+d.key;
	});

	if(group=='sector'){
		d.forEach(function(d,i){
			var key = d.key;
			var name = d.name;
			d3.select('.'+group+'-icon-'+(d.key))
			.attr('href', function(d,i){
				if(availableSectorIcons.includes(name.toLowerCase())) {
					return 'images/sector-icons/'+name.toLowerCase()+'.svg';
				} else {
					return '';
				}
			})
			.style('opacity', function(d,i){
				if(filters['sector'].includes(key)){
					return 1;
				} else {
					return 0.5;
				}
			});		
		});
	}

	rows.select('.'+group+'-percentlabel').text(function(d,i){
		if(textLabel=='Assessments'){
			var t = totalAssessments;
		} else {
			var t = total;
			if((data_group=='organization')&&(filters.authorToggle=='leads')){
				var t = totalLeads;
			}
		}
		var p = (d.value/t)*100;
		p = Math.round(p);
		if(d.value>0){ return '('+p+'%)'; } else { return ''};
	});

	if(filters[grp]){
		if(filters[grp].length>0){
			d3.selectAll('.'+grp).style('opacity', 0.2);
			d3.selectAll('.'+grp+'-bg').style('opacity', 0);
		} else {
			d3.selectAll('.'+grp).style('opacity', 1);
		}
		filters[grp].forEach(function(d,i){
			d3.selectAll('.'+grp+'-'+(d)).style('opacity', 1);
		});
	}
}

//**************************
// update stacked bars
//**************************
var barTooltipData = {};

BarChart.getTooltipData = function(group){
	return barTooltipData[group];
}

BarChart.updateStackedBars = function(group, dataset, duration = 0){

	if(updating[group]==true) { return false; } else { setTimeout(function(){

		var sort = true;

		var grp = group;
		if(group=='organisation-un') grp = 'organisation';
		if(group=='organisation-ingo') grp = 'organisation';
		if(group=='organisation-lngo') grp = 'organisation';
		if(group=='organisation-rcrc') grp = 'organisation';
		if(group=='organisation-media') grp = 'organisation';
		if(group=='organisation-other') grp = 'organisation';
		if(group=='organisation-gov') grp = 'organisation';
		if(group=='organisation-academic') grp = 'organisation';
		if(group=='organisation-donor') grp = 'organisation';
		if(group=='organisation-cluster') grp = 'organisation';

		barTooltipData[group] = dataset;

		var data_group = group;
		if(data_group=='sector') data_group = 'sector_array';
		if(data_group=='context') data_group = 'context_array';
		if(data_group=='affected_groups') data_group = 'affected_groups_array';
		if(data_group=='demographic_groups') data_group = 'demographic_groups_array';
		if(data_group=='specific_needs') data_group = 'specific_needs_groups_array';
		if(data_group=='unit_of_reporting') data_group = 'type_of_unit_of_analysis';
		if(data_group=='unit_of_analysis') data_group = 'type_of_unit_of_analysis';
		if(data_group=='organisation') data_group = 'organization';
		if(data_group=='organisation-un') data_group = 'organization';
		if(data_group=='organisation-ingo') data_group = 'organization';
		if(data_group=='organisation-lngo') data_group = 'organization';
		if(data_group=='organisation-rcrc') data_group = 'organization';
		if(data_group=='organisation-media') data_group = 'organization';
		if(data_group=='organisation-other') data_group = 'organization';
		if(data_group=='organisation-gov') data_group = 'organization';
		if(data_group=='organisation-academic') data_group = 'organization';
		if(data_group=='organisation-donor') data_group = 'organization';
		if(data_group=='organisation-cluster') data_group = 'organization';

		var dat = dataset.filter(function(d){
			return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]));
		});

		var nest = d3.nest()
		.key(function(d) { return d[grp]; })
		.key(function(d) { if((filters.toggle=='severity')||(filters.toggle=='finalScore')){ return d.s; } else { return d.r } }).sortKeys(d3.ascending)
		.rollup(function(leaves) { return leaves.length; })		
		.entries(dat);	

		nest.forEach(function(d,i){
			d.value = d3.sum(d.values, function(d){
				return d.value;
			})
		});

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
				return d3.ascending(y.value, x.value)||d3.ascending(x.name, y.name);
			});
		}

		if(data_group=='organization'){
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
		})
		.style('display', function(d,i){
			if(d.value>0){
				return 'inline-block';
			} else {
				return 'none';
			}
		})

		rows.select('.sector-icon')
		.attr('class', function(d,i) { 
			return 'sector-icon sector-icon-'+d.key;
		});

		var labels = d3.selectAll('.'+group+'-labeltext div')
		.data(d)
		.style('opacity', 1)
		.html(function(d,ii){
			// var name = d.name.substr(0,labelCharLimit);
			// if(name.length==labelCharLimit) name += '.';
			return d.name;
		})

		d3.selectAll('.'+group+'-bg')
		.data(d)
		.attr('class', function(d,i) { 
			return group+'-bg ' + group + '-bg-'+d.key;
		}).on('click', function(d,i){
			return Deepviz.filter(grp, d.key);
		});

		d.forEach(function(d,i){
			var key = d.key;
			var wcount = scale[group].paddingLeft;
			var xcount = scale[group].paddingLeft;
			var value = d.value; 
			var name = d.name;

			d3.select('#'+group+(d.id)+'label').text(function(d,i){
				if(value>0){ return value; } else { return ''};
			});

			d3.select('#'+group+(d.id)+'percentlabel').text(function(d,i){
				if(textLabel=='Assessments'){
					var t = totalAssessments;
				} else {
					var t = total;
				}
				var p = (value/t)*100;
				p = Math.round(p);
				if(value>0){ return '('+p+'%)'; } else { return ''};
			});

			if(group=='sector'){
				d3.select('.'+group+'-icon-'+(d.key))
				.attr('href', function(d,i){
					if(availableSectorIcons.includes(name.toLowerCase())) {
						return 'images/sector-icons/'+name.toLowerCase()+'.svg'
					} else {
						return '';
					}
				})
				.style('opacity', function(d,i){
					if(filters['sector'].includes(key)){
						return 1;
					} else {
						return 0.5;
					}
				})				
			}
			if(group=='data_collection_technique'){
				d3.select('.data-collection-technique-icon-'+(i+1))
				.attr('href', function(d,i){
					return 'images/data-collection-technique-icons/'+name.replace(/\s+/g, '-').toLowerCase()+'.svg'
				})
				.style('opacity', function(d,i){
					if(filters['data_collection_technique'].includes(key)){
						return 1;
					} else {
						return 0.7;
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
				.attr('data-id', s)
				.attr('data-group', group)
				.attr('data-name', name)
				.attr('data-group-id', key)
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
					// content: setBarName(s),
					theme: 'light-border',
					delay: [250,100],
					inertia: false,
					distance: 8,
					allowHTML: true,
					animation: 'shift-away',
					arrow: true,
					size: 'small',
					onShow(instance) {
						var t = d3.select(instance.reference);
						var dataId = t.attr('data-id');
						var dataGroup = t.attr('data-group');
						var dataName = t.attr('data-name');
						var dataGroupId = t.attr('data-group-id');
						var dataTotal = t.attr('data-value');
						var html = BarChart.updateTooltipSparkline(dataId, grp, dataGroupId, dataName, dataTotal);
						instance.setContent(html);
				    }
				});
				xcount = xcount + w;
			});
		});
		if(filters[grp]){
			if(filters[grp].length>0){
				d3.selectAll('.'+grp).style('opacity', 0.2);
				d3.selectAll('.'+grp+'-bg').style('opacity', 0);
			} else {
				d3.selectAll('.'+grp).style('opacity', 1);
			}
			filters[grp].forEach(function(d,i){
				d3.selectAll('.'+grp+'-'+(d)).style('opacity', 1);
			});
		}

		updating[group] = false;
	} ,updateInterval);

}}

var getBarColorName = function(s){
	if(s){
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
	} else {
		var color = colorNeutral[2];
		var text = '';
	}
	
	return [color,text];
}

BarChart.createTooltipSparkline = function(){

	barTooltipSvg = d3.select('body').append('svg')
	.style('display', 'none').append('g')
	.attr('opacity', 0).append('g');

	barTooltipSvg.append('rect')
	.attr('class', 'bar-tooltip-sparkline-bg')
	.attr('id', function(d,i){ return 'bar-tooltip-sparkline-bg' })
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


	barTooltipSvg.append('rect')
	.attr('class', 'bar-tooltip-sparkline-overlay')
	.attr('id', function(d,i){ return 'bar-tooltip-sparkline-overlay' })
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
	barTooltipSvg
	.append('path')
	.attr('class', 'sparkline')
	.attr('id','barTooltipSparkline')
	.attr("stroke", colorNeutral[2])
	.attr("fill", 'transparent')
    .attr("stroke-width", 1);

	BarChart.updateSparklinesOverlay(dateRange);
}

BarChart.updateTooltipSparkline = function(dataId, group, dataGroupId, dataGroupName, dataTotal){

	var dataset = BarChart.getTooltipData(group);
	var color = getBarColorName(dataId)[0];
	var name = getBarColorName(dataId)[1];

	var dataByDateSparkline = [...dataset];
	
	dataByDateSparkline = dataByDateSparkline.filter(function(d,i){
		if(dataId>0){ //if stacked bar
			var med;
			if(filters.toggle=='finalScore'){
				med = d.s;
			} else if (filters.toggle=='severity'){
				med = d.s;
			} else {
				med = d.r;
			}
			return d[group] == parseInt(dataGroupId) && parseInt(med) == parseInt(dataId);
		} else { // if regular bar
			return d[group] == parseInt(dataGroupId);
		}
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

    BarChart.updateSparklinesOverlay(dateRange);

    if(contextMax>0){

    	if(dataId){
			if(filters.toggle=='finalScore'){
				var color = colorPrimary[dataId];
				var text = metadata.scorepillar_scale[dataId].name;
			} else if (filters.toggle=='severity'){
				var color = colorPrimary[dataId];
				var text = metadata.severity_units[dataId].name;
			} else {
				var color = colorSecondary[dataId];
				var text = metadata.reliability_units[dataId].name;
			}   
			text='&nbsp;&nbsp;'+text+'&nbsp;'; 		
    	} else {
    		var color = colorNeutral[2];
    		var text = ' ';
    	}

    	d3.select('#barTooltipSparkline')
		.datum(dataByDateSparkline)
		.style('stroke', color)
		.attr("d", d3.line()
	        .x(function(d) { return scale.tooltipSparkline.x(d.key)+pointWidth/2 })
	        .y(function(d) { 
	        	var v = d.value.total;
	        	if(v===undefined)v=0;
	        	return scale.tooltipSparkline.y(v);
	        })
        ).attr('opacity', 1);   

		if(textLabel=='Assessments'){
			var t = totalAssessments;
		} else {
			var t = total;
		}
		var tl = textLabel;
		if((group=='organisation')&&(filters.authorToggle=='leads')){
			tl = 'leads';
		}

		var p = (dataTotal/t)*100;
		p = Math.round(p)+'%';
		var html =  '<div style="text-align: left; font-weight: bold;">'+dataGroupName+'&nbsp;&nbsp;<span style="font-size: 9px; color: lightgrey;"></span></div><div style="width: 100px; height: 10px; display: inline; background-color: '+ color + '">&nbsp;&nbsp;</div><span style="font-size: 10px">' + text + '</span><div style="padding-left: 3px; padding-bottom: 2px; display: inline; color: '+ colorNeutral[5] + '; font-size: 9px"><b>' + dataTotal + ' '+tl+'</b>&nbsp;&nbsp;('+p+')</div>';
        html=html+'<br/><svg style="margin-top: 1px; margin-bottom: 1px" id="tooltipSparkline" width="'+tooltipSparklineWidth+'px" height="'+tooltipSparklineHeight+'px">'+barTooltipSvg.node().outerHTML+'</svg>';
        return html;

    } else {
    	return null;
    }
}

BarChart.updateSparklinesOverlay = function(d1){
	if(scale.tooltipSparkline.x){
		d3.select('.bar-tooltip-sparkline-overlay')
		.attr('x', scale.tooltipSparkline.x(d1[0]))
		.attr('width', scale.tooltipSparkline.x(d1[1])-scale.tooltipSparkline.x(d1[0]));		
	}
}

BarChart.createTooltipSparkline();
