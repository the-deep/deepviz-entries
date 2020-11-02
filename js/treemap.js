var DeepvizTreemap = {};
var treemapData;
var treemapToggle;
var treemapSvg; 
var sunburstSvg; 
var treemapArea; 
var sunburstArea; 
var treemapActiveLevel = 'geo';
var treemapFilters = {
	geo: 0,
	sector: 0,
	affected_groups: 0,
	special_needs: 0,
	demography: 0
};

//**************************
// create treemap
//**************************
DeepvizTreemap.create = function(){

	// create svg
	treemapSvg = Deepviz.createSvg({
		id: 'treemap-svg',
		viewBoxWidth: 1000,
		viewBoxHeight: 570,
		div: '#treemap',
		width: '99%'
	});

	treemapSvg.style('background-color', 'rgba(255,255,255,0.5)');

	treemapArea = treemapSvg.append('g');

	// create svg
	sunburstSvg = Deepviz.createSvg({
		id: 'sunburst-svg',
		viewBoxWidth: 1000,
		viewBoxHeight: 1000,
		div: '#sunburst',
		width: '99%'
	});

	sunburstSvg.style('background-color', 'rgba(255,255,255,0.5)');

	sunburstArea = sunburstSvg.append('g');

	// create hierarchy toggle
	$("#treemap-toggle-list ul").sortable({
		axis: "x",
		start: function(e,ui) {
			$(ui.item).addClass('active');
	    },stop: function(e,ui) {
			$(ui.item).removeClass('active');
			$(ui.item).nextAll().addClass('disabled');

			if($(this).hasClass('disabled')&&($('.disabled').length>=5)){
				$(this).removeClass('disabled')
			}
			// $(ui.item).removeClass('disabled');
	    },update: function(e,ui){
			$(ui.item).removeClass('active');
			$(ui.item).nextAll().addClass('disabled');
			$('.disabled').appendTo('#treemap-toggle-list ul');
			if($('.disabled').length==5){
				$('.disabled:first-child').removeClass('disabled');
			}

			DeepvizTreemap.update();
	    }
	}).disableSelection();
	$("#treemap-toggle-list li").click(function(d,i){
		if(($(this).hasClass('disabled'))&&($('.disabled').length<5)) return false;
		if(!$(this).hasClass('disabled')){
			$(this).nextAll('li').addClass('disabled');
		}
		$('.disabled').appendTo('#treemap-toggle-list ul');

		DeepvizTreemap.update();
	});

	$("#treemap-toggle-list li").dblclick(function(d,i){
		$("#treemap-toggle-list li").addClass('disabled');
		$(this).removeClass('disabled')
		treemapFilters = {
			geo: 0,
			sector: 0,
			affected_groups: 0,
			special_needs: 0,
			demography: 0
		};
		$('.disabled').appendTo('#treemap-toggle-list ul');
		DeepvizTreemap.update();
	});

	DeepvizTreemap.update();
}

//**************************
// update treemap
//**************************
DeepvizTreemap.update = function(){
	DeepvizTreemap.destroy();

	$("#treemap-toggle-list li").each(function(i,el){
		var str = el.id.substring(8);	
		if($(el).hasClass('disabled')){
			if(str=='geo') treemapFilters.geo = 0;
			if(str=='sector') treemapFilters.sector = 0;
			if(str=='affected_groups') treemapFilters.affected_groups = 0;
			if(str=='special_needs') treemapFilters.special_needs = 0;
			if(str=='demography') treemapFilters.demography = 0;
		} 
	});

	if($('.disabled').length==4){
		treemapFilters = {
			geo: 0,
			sector: 0,
			affected_groups: 0,
			special_needs: 0,
			demography: 0
		};
	}		

	var root = DeepvizTreemap.updateData();

	if(!treemapArea) return false;
	// treemapData = DeepvizTreemap.getData();
		  // Then d3.treemap computes the position of each element of the hierarchy
	d3.treemap()
	.size([1000, 570])
	.padding(1)
	(root)

	// use this information to add rectangles:
	var squares = treemapArea
	.append('g')
	.attr('id', 'treemapRender')
	.selectAll("g")
	.data(root.leaves())
	.enter()
	.append("g")
	.attr('transform',function(d,i){
		return 'translate(' + d.x0 + ',' + d.y0 + ')';
	});

	squares.append('rect')
	.attr('x', 0)
	.attr('y', 0)
	.attr('width', function (d) { return d.x1 - d.x0; })
	.attr('height', function (d) { return d.y1 - d.y0; })
	.style("fill", colorNeutral[2]);

	squares.append("text")
	.attr("x", function(d){ return 5})    // +10 to adjust position (more right)
	.attr("y", function(d){ return 12})    // +20 to adjust position (lower)
	.text(function(d){ return d.data.name })
	.attr("font-size", "11px")
	.attr("fill", "white");

	squares.append("text")
	.attr("x", function(d){ return 5})    // +10 to adjust position (more right)
	.attr("y", function(d){ return 28})    // +20 to adjust position (lower)
	.text(function(d){ return d.data.value })
	.attr("font-size", "17px")
	.attr("fill", "white");

	squares
	.style('cursor', 'pointer')
	.on('mouseover', function(d,i){
		d3.select(this).select('rect').style('stroke', 'cyan').style('stroke-width', 2)
	}).on('mouseout', function(d,i){
		d3.select(this).select('rect').style('stroke', 'none')
	}).on('click', function(d,i){
		var next = $('#treemap-toggle-list ul').find('.disabled:first').attr('id').substring(8);
		$('#treemap-toggle-list ul').find('.disabled:first').removeClass('disabled');
		var thisId = d.data.id;
		treemapFilters[treemapActiveLevel] = thisId;
		DeepvizTreemap.update(thisId);
	});

	var partition = d3.partition();

	var x = d3.scaleLinear()
	.range([0, 2 * Math.PI])
	.clamp(true);

	var y = d3.scaleSqrt()
	.range([400*.05, 440]);

	var arc = d3.arc()
	.startAngle(d => x(d.x0))
	.endAngle(d => x(d.x1))
	.innerRadius(d => Math.max(0, y(d.y0)))
	.outerRadius(d => Math.max(0, y(d.y1)));

	var slice = sunburstArea.append('g').attr('id','sunburstRender').selectAll('g.slice')
        .data(partition(root).descendants().slice(1));

    var newSlice = slice.enter()
        .append('g').attr('class', 'slice')
        .attr('transform', 'translate(500,500)')
        .on('click', d => {
            d3.event.stopPropagation();
            // focusOn(d);
        });

    newSlice.append('title')
        .text(d => d.data.name + '\n' + (d.value));

    newSlice.append('path')
        .attr('class', 'main-arc')
        .style('fill', colorNeutral[1])
        .style('stroke', '#FFF')
        .attr('d', arc);

}

//**************************
// get treemap data
//**************************
DeepvizTreemap.updateData = function(){

	var order = DeepvizTreemap.getHierarchyOrder();
	
	treemapActiveLevel = order[order.length-1];

 	var treeData;

 	if(treemapActiveLevel=='geo'){

	 	var dat = dataByLocationArray.filter(function(d){
			return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1])&&(d.admin_level==filters.admin_level));
		});

		dat = treemapFilter(dat);

 		treeData = d3.nest()
		.key(function(d) { return d.geo; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(dat);

		treeData.forEach(function(d,i){
			metadata.geo_array.forEach(function(dd){
				if(dd.id==d.key){
					d.name = dd.name;
					d.id = dd.id;
				}
			})
			delete d.key;
		});		
 	}

 	if(treemapActiveLevel=='sector'){

	 	var dat = dataBySector.filter(function(d){
			return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1]));
		});

		dat = treemapFilter(dat);

 		treeData = d3.nest()
		.key(function(d) { return d.sector; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(dat);

		treeData.forEach(function(d,i){
			metadata.sector_array.forEach(function(dd){
				if(dd.id==d.key){
					d.name = dd.name;
					d.id = dd.id;
				}
			})
			delete d.key;
		});		
 	}

 	if(treemapActiveLevel=='affected_groups'){

	 	var dat = dataByAffectedGroups.filter(function(d){
			return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1]));
		});

		dat = treemapFilter(dat);

 		treeData = d3.nest()
		.key(function(d) { return d.affected_groups; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(dat);

		treeData.forEach(function(d,i){
			metadata.affected_groups_array.forEach(function(dd){
				if(dd.id==d.key){
					d.name = dd.name;
					d.id = dd.id;
				}
			})
			delete d.key;
		});		


 	}

  	if(treemapActiveLevel=='special_needs'){

	 	var dat = dataBySpecificNeeds.filter(function(d){
			return ((new Date(d.date)>=dateRange[0])&&(new Date(d.date)<dateRange[1]));
		});

		dat = treemapFilter(dat);

 		treeData = d3.nest()
		.key(function(d) {  return d.specific_needs; })
		.rollup(function(leaves) { return leaves.length; })
		.entries(dat);

		treeData.forEach(function(d,i){
			metadata.specific_needs_groups_array.forEach(function(dd){
				if(dd.id==d.key){
					d.name = dd.name;
					d.id = dd.id;
				}
			})
			delete d.key;
		});		

 	}

	var treeDataObj = {'name': root, 'children': treeData}

	var root = d3.hierarchy(treeDataObj)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

	return root;

}

DeepvizTreemap.getHierarchyOrder = function(){
	var order = [];
	$("#treemap-toggle-list li").each(function(i,el){
		var str = el.id.substring(8);	
		if(!$(el).hasClass('disabled')){
			order.push(str);
		} 
	})

	return order;
}

DeepvizTreemap.destroy = function(){
	d3.selectAll('#treemapRender').remove();
	d3.selectAll('#sunburstRender').remove();
}

function treemapFilter(treedata){
	if(treemapFilters.geo>0){
		treedata = treedata.filter(function(d){
			return d.d['geo'].includes(treemapFilters.geo);
		});
	}
	if(treemapFilters.sector>0){
		treedata = treedata.filter(function(d){
			return d.d['sector_i'].includes(treemapFilters.sector);
		});
	}
	if(treemapFilters.affected_groups>0){
		treedata = treedata.filter(function(d){
			return d.d['affected_groups'].includes(treemapFilters.affected_groups);
		});
	}
	if(treemapFilters.special_needs>0){
		treedata = treedata.filter(function(d){
			return d.d['special_needs'].includes(treemapFilters.special_needs);
		});
	}
	return treedata;
}
