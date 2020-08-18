var HumanitarianProfile = {};
var height = 360;
var padding = 60;
var maxRadius = 28;

HumanitarianProfile.create = function(){

	var svg = Deepviz.createSvg({
		id: 'humanitarianprofile-svg',
		viewBoxWidth: 1200,
		viewBoxHeight: height,
		div: '#humanitarianprofile',
		width: '100%'
	});
	svg.append('g').attr('class','links');
	svg.append('g').attr('class','nodes');
	// svg.style('background-color', '#f6f6f6');

	var groups = metadata.affected_groups_array;
	var tree = [];
	var treeStr = [];

	groups.forEach(function(d,i){
		var affectedGroups = d.name.split("/");
		var parent = null;
		affectedGroups.forEach(function(dd,ii){
			var name = dd.trim();
			var level = ii;
			var rowStr = name+'-'+level;
			if(!treeStr.includes(rowStr)){
				treeStr.push(rowStr);
				tree.push({name: name, level: level, parent: parent})
			}
			parent = name;
		});
	});

	var root = d3.stratify()
	.id(function(d) { return d.name; })
	.parentId(function(d) { return d.parent; })
	(tree);

	var treeLayout = d3.tree()
	.size([1200, height-padding])

	root = d3.hierarchy(root);

	treeLayout(root)

	// Nodes
	var nodes = svg.select('g.nodes')
	.selectAll('circle.node')
	.data(root.descendants())
	.enter()
	.append('g')
	.attr('transform', function(d,i){
		return 'translate('+d.x+','+ (d.y+(padding/2)) +')';
	})
	.append('g')
	.attr('id', function(d,i){
		return 'hp-'+d.data.data.name.replace(/\s+/g,'')+'-'+(d.data.data.level+1);
	})
	.attr('class', function(d,i){return 'node hp-'+d.data.data.name.replace(/\s+/g,'') })
	.style('cursor', 'pointer')
	.on('click', function(d,i){
		return Deepviz.filter('humanitarian_profile',d.data.data.name.replace(/\s+/g,''))
	});

	nodes
	.append('circle')
	.attr('class', 'outerCircle')
	.attr('cx', 0)
	.attr('cy', 0)
	.attr('r', maxRadius+2)
	.attr('fill', colorNeutral[3])

	nodes
	.append('circle')
	.attr('cx', 0)
	.attr('cy', 0)
	.attr('r', maxRadius-2)
	.attr('fill', colorNeutral[3])
	.style('stroke', '#FFF')
	.style('stroke-width', '1px');

	nodes.append('text')
	.attr('text-anchor', 'middle')
	.attr('class', 'node-title')
	.text(function(d,i){
		return d.data.data.name
	})
	.attr('y', -7)
	.attr('x', 0)
	.style('font-weight', 'bold')
	.style('font-size', '10px')
	.style('fill', '#3F3F3F');

	nodes.append('text')
	.attr('text-anchor', 'middle')
	.attr('class', 'node-value')
	.text(function(d,i){
		return '1,123';
	})
	.attr('y', 11)
	.attr('x', 0)
	.style('font-weight', 'normal')
	.style('font-size', '18px')
	.style('fill', '#FFF');

	// Links
	d3.select('svg g.links')
	.selectAll('path.link')
	.data(root.links())
	.enter()
	.append('path')
	.classed('link', true)
	.attr('id', function(d,i){
		return 'link-'+(d.target.data.id.replace(/\s+/g,''));
	})
	.attr("d", d3.linkVertical()
		.x(function(d) { return d.x; })
		.y(function(d) { return d.y+22; })
	)
	.style('fill', 'none')
	.style('stroke', '#CCC')
	.style('stroke-width', '1px');

	d3.selectAll('#humanitarianprofileRemoveFilter').on('click', function(){
		d3.select('#humanitarianprofileRemoveFilter').style('display', 'none').style('cursor', 'default');
		return Deepviz.filter('humanitarian_profile', 'clear'); 
	});

	HumanitarianProfile.update();
}

HumanitarianProfile.update = function(){

	var dat = dataByAffectedGroupsRows.filter(function(d){
		return (((d.date)>=dateRange[0])&&((d.date)<dateRange[1]));
	});

	var nested = d3.nest()
	.key(function(d) { return d.affected_groups; })
	.rollup(function(leaves) { 
		return { 
			'level': Math.round(d3.median(leaves, function(d,i){return d.level;})), 
			'median_r': Math.ceil(d3.median(leaves, function(d,i){if(d.r>0) {return d.r;} else { return null } })), 
			'median_s': Math.ceil(d3.median(leaves, function(d,i){if(d.s>0) {return d.s;} else { return null } })), 
			'total': leaves.length, 
		}
	})		
	.entries(dat);

	var nodes = d3.selectAll('.node');

	nodes.attr('transform','scale(0.5)')
	.attr('opacity', 0.44);

	nodes.selectAll('circle')
	.attr('fill', colorLightgrey[2]);

	nodes.selectAll('.node-value')
	.text(0)

	d3.selectAll('.link').attr('opacity',0.2)
	.style('stroke-width', '1px');

	var max = d3.max(nested, function(d,i){
		return d.value.total;
	});

	var scalehumanitarianprofile = d3.scaleSqrt()
	.range([0.44,1])
	.domain([0,max]);

	var scalehumanitarianprofileLink = d3.scaleSqrt()
	.range([1,12])
	.domain([0,max]);

	nested.forEach(function(d,i){
		var node = d3.select('#hp-'+d.key.replace(/\s+/g,'')+'-'+(d.value.level));

		node.attr('transform',function(dd,ii){
			var scale = scalehumanitarianprofile(d.value.total);
			return 'scale('+scale+')'
		})
		.attr('opacity', 1)
		.select('.node-value')
		.text(addCommas(d.value.total))

		node.selectAll('circle').attr('fill', function(dd,ii){
			if(filters.frameworkToggle!='entries'){
				var median;
				if(filters.toggle=='severity'){
					median = d.value.median_s;
					if(isNaN(median))median = 0;
					return colorPrimary[median];
				} else {
					median = d.value.median_r;
					if(isNaN(median))median = 0;
					return colorSecondary[median];
				}
			} else {
				return colorNeutral[3];
			}
		});

		d3.select('#link-'+(d.key.replace(/\s+/g,''))).attr('opacity',0.5)
		.style('stroke-width',function(dd,ii){
			var scale = scalehumanitarianprofileLink(d.value.total);
			return scale+'px';
		});

	});

	filters.humanitarian_profile.forEach(function(d,i){
		d3.select('.hp-'+d).select('.outerCircle').attr('fill', 'cyan');
	})

			

}