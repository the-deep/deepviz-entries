var Summary = {};

Summary.create = function(svg_summary1,svg_summary2,svg_summary3){

	var summary1 = document.getElementById('svg_summary1_div');
	// remove title tag from map svg
	var title = svg_summary1.getElementsByTagName('title')[0];
	svg_summary1.documentElement.removeChild(title);
	svg_summary1.documentElement.removeAttribute('height');
	svg_summary1.documentElement.setAttribute('width', '100%');
	// add svg to map div 
	summary1.innerHTML = new XMLSerializer().serializeToString(svg_summary1.documentElement);

	var summary2 = document.getElementById('svg_summary2_div');
	// remove title tag from map svg
	var title = svg_summary2.getElementsByTagName('title')[0];
	svg_summary2.documentElement.removeChild(title);
	svg_summary2.documentElement.removeAttribute('height');
	svg_summary2.documentElement.setAttribute('width', '100%');
	// add svg to map div 
	summary2.innerHTML = new XMLSerializer().serializeToString(svg_summary2.documentElement);		

	var summary3 = document.getElementById('svg_summary3_div');
	// remove title tag from map svg
	var title = svg_summary3.getElementsByTagName('title')[0];
	svg_summary3.documentElement.removeChild(title);
	svg_summary3.documentElement.removeAttribute('height');
	svg_summary3.documentElement.setAttribute('width', '100%');
	// add svg to map div 
	summary3.innerHTML = new XMLSerializer().serializeToString(svg_summary3.documentElement);

	d3.select('#svg_summary3_div').on('mouseover', function(){
		d3.select('#collapse_bg').transition().duration(200).style('fill', '#D4D4D4');
	}).on('mouseout', function(){
		d3.select('#collapse_bg').transition().duration(200).style('fill', '#E9E9E9');
	});
	var origHeight = 
	d3.select('#svg_summary3_div').on('click', function(){
		if(collapsed==false){
			collapsed = true;

			d3.select('#collapsed1').transition().duration(duration).style('opacity', 1);
			d3.select('#collapsed0').transition().duration(duration).style('opacity', 0);

			d3.select('#svg_summary2_div')
			.transition()
			.duration(duration)
			.style('margin-top', -$('#svg_summary1_div').height()+'px')
			.on('end', function(d){
				d3.select(this).style('opacity', 0);
			})

			d3.select('#summary_row')
			.transition()
			.duration(duration)
			.style('margin-top', function(){
				var h = $('#svg_summary1_div').height()+$('#svg_summary3_div').height()+10;
				return h+'px';
			});

		} else {
			collapsed = false;

			d3.select('#collapsed1').transition().duration(duration).style('opacity', 0);
			d3.select('#collapsed0').transition().duration(duration).style('opacity', 1);

			d3.select('#svg_summary2_div')
			.transition()
			.duration(duration)
			.style('margin-top', '0px')
			.style('display', 'block')
			.style('opacity', 1);

			d3.select('#summary_row')
			.transition()
			.duration(duration)
			.style('margin-top', function(){
				var h = $('#svg_summary1_div').height()*2+$('#svg_summary3_div').height()+10;
				return h+'px';
			});
		}
	});

	// init
	d3.select('#collapsed1').style('opacity', 1);
	d3.select('#collapsed0').style('opacity', 0);
	collapsed = true;
	d3.select('#svg_summary2_div')
	.style('margin-top', -$('#svg_summary1_div').height()+'px')
	.style('opacity', 0);

	d3.select('#summary_row')
	.style('margin-top', function(){
		var h = $('#svg_summary1_div').height()+$('#svg_summary3_div').height()+10;
		return h+'px';
	});

	d3.selectAll('#top_row svg tspan').attr('class', function(d,i){
		var t = d3.select(this).text();
		if(t.includes(00)){
			return 'summary-value';
		} else {
			return 'summary-label'
		}
	});

	d3.selectAll('#top_row svg tspan').attr('data-x', function(d,i){
		var t = d3.select(this).text();
		if(!t.includes(00)){
			return d3.select(this).attr('x');
		} 
	});

	// topline filters

	var topFilters = [
		{'name': 'coordination_5_box', 'filterFn': function(){ Deepviz.filter('top', 'coordination_5' ); }}, 
		{'name': 'coordination_2_box', 'filterFn': function(){ Deepviz.filter('top', 'coordination_2' ); }}, 
		{'name': 'coordination_1_box', 'filterFn': function(){ Deepviz.filter('top', 'coordination_1' ); }}, 
		{'name': 'harmonized_box', 'filterFn': function(){ Deepviz.filter('top', 'harmonized') }}, 
		{'name': 'uncoordinated_box', 'filterFn': function(){ Deepviz.filter('top', 'uncoordinated') }}, 
		{'name': 'lngo_box', 'filterFn': function(){ Deepviz.filter('top', 'lngo') }}, 
		{'name': 'ingo_box', 'filterFn': function(){ Deepviz.filter('top', 'ingo') }}, 
		{'name': 'un_agency_box', 'filterFn': function(){ Deepviz.filter('top', 'un_agency') }}, 
		{'name': 'cluster_box', 'filterFn': function(){ Deepviz.filter('top', 'cluster') }}, 
		{'name': 'donor_box', 'filterFn': function(){ Deepviz.filter('top', 'donor') }}, 
		{'name': 'rcrc_box', 'filterFn': function(){ Deepviz.filter('top', 'rcrc') }}, 
		{'name': 'government_box', 'filterFn': function(){ Deepviz.filter('top', 'government') }},
		{'name': 'community_group_discussion_box', 'filterFn': function(){ Deepviz.filter('top', 'community_group_discussion' ) }},
		{'name': 'focus_group_discussion_box', 'filterFn': function(){ Deepviz.filter('top', 'focus_group_discussion' ) }},
		{'name': 'key_informant_interview_box', 'filterFn': function(){ Deepviz.filter('top', 'key_informant_interview' )}},
		{'name': 'monitoring_5_box', 'filterFn': function(){ Deepviz.filter('top', 'monitoring_5' ) }},
		{'name': 'monitoring_2_box', 'filterFn': function(){ Deepviz.filter('top', 'monitoring_2' ) }},
		{'name': 'monitoring_1_box', 'filterFn': function(){ Deepviz.filter('top', 'monitoring_1' ) }},
		{'name': 'in_depth_box', 'filterFn': function(){ Deepviz.filter('top', 'in_depth') }},
		{'name': 'initial_box', 'filterFn': function(){ Deepviz.filter('top', 'initial') }},
		{'name': 'rapid_box', 'filterFn': function(){ Deepviz.filter('top', 'rapid')}},
		{'name': 'sector_1_box', 'filterFn': function(){ Deepviz.filter('top', 'sector_1' ) }},
		{'name': 'sector_2_box', 'filterFn': function(){ Deepviz.filter('top', 'sector_2' ) }},
		{'name': 'sector_5_box', 'filterFn': function(){ Deepviz.filter('top', 'sector_5' ) }}
	];

	topFilters.forEach(function(d,i){
		var name = d.name.slice(0,-4);
		var f = 'filter_'+ name;
		d3.select('#'+f).style('opacity', 0.01).attr('class', 'top_filter');
		// d3.select('#top_row #'+d.name).style('cursor', 'pointer')
		// .on('mouseover', function(d,i){
		// 	if(!filters['top'].includes(name)) {
		// 		d3.select('#'+f).transition().duration(5).style('opacity', 0.3);
		// 	}
		// })
		// .on('mouseout', function(d,i){
		// 	if(!filters['top'].includes(name)) {
		// 		d3.select('#'+f).transition().duration(250).style('opacity', 0.01);
		// 	}
		// })
		// .on('click', function(dd,ii){
		// 	d.filterFn();
		// 	if(filters['top'].includes(name)) {
		// 		d3.select('#'+f).transition().duration(5).style('opacity', 1);
		// 	} else {
		// 		d3.select('#'+f).transition().duration(500).style('opacity', 0.3);
		// 	}
		// })
	});

	Summary.update();
}

Summary.update = function(){

	var dcEntries = data.filter(function(d){return ((d.date>=dateRange[0])&&(d.date<dateRange[1])) ;});
	var dc = dataAssessments.filter(function(d){return ((d.date>=dateRange[0])&&(d.date<dateRange[1])) ;});
	var context = [];

	dcEntries.forEach(function(d,i){
		d.context.forEach(function(dd,ii){
			context.push(dd);
		})
	});

	// define maximum context value
	var contextualRowTotals = d3.nest()
	.key(function(d) { return d;})
	.rollup(function(leaves) { return leaves.length; })
	.entries(context);

	d3.selectAll('.total-label').text(0);
	
	contextualRowTotals.forEach(function(d,i){
		d3.select('#total-label'+(d.key-1)).text(d.value);
	});

	var individuals = d3.sum(dc, d => d.individuals);
	var households = d3.sum(dc, d => d.households);

	// total entries
	total = d3.sum(dataByDate, function(d){
		if((d.date>=dateRange[0])&&(d.date<dateRange[1]))
			return d.total_entries;
	});

	d3.select('#total_entries tspan').text(addCommas(total));

	var uniqueLeads = [];
	dataByLead.forEach(function(d,i){
		if((d.date>=dateRange[0])&&(d.date<dateRange[1])){
			if(!uniqueLeads.includes(d.lead_id)){
				uniqueLeads.push(d.lead_id)
			}
		}
	});

	var totalLeads = uniqueLeads.length;
	d3.select('#total_documents tspan').text(addCommas(totalLeads));

	// publishers
	var uniquePublishers = [];
	dataByPublisher.forEach(function(d,i){
		if((d.date>=dateRange[0])&&(d.date<dateRange[1])){
			if(!uniquePublishers.includes(d.publisher_str)){
				uniquePublishers.push(d.publisher_str)
			}
		}
	});

	var totalPublishers = uniquePublishers.length;

	d3.select('#total_publishers tspan').text(addCommas(totalPublishers));

	var totalAssessments = dc.length;

	// other documents
	d3.select('#total_other_documents tspan').text(addCommas(totalLeads-totalAssessments));

	var mutli_sector_5 = d3.sum(dc, function(d){
		if(d.sector_count>=5)
			return 1;
	});

	var mutli_sector_2 = d3.sum(dc, function(d){
		if(d.sector_count>=2)
			return 1;
	});

	var single_sector = d3.sum(dc, function(d){
		if(d.sector_count==1)
			return 1;
	});

	// coordinated totals
	var coordinated_5 = d3.sum(dc, function(d){
		if((d.sector_count>=5)&&((d.coordination==coordinatedJointId)||(d.coordination==coordinatedHarmonizedId)))
			return 1;
	});

	var coordinated_2 = d3.sum(dc, function(d){
		if((d.sector_count>=2)&&((d.coordination==coordinatedJointId)||(d.coordination==coordinatedHarmonizedId)))
			return 1;
	});

	var coordinated_1 = d3.sum(dc, function(d){
		if((d.sector_count==1)&&((d.coordination==coordinatedJointId)||(d.coordination==coordinatedHarmonizedId)))
			return 1;
	});

	// harmonized total
	var harmonized = d3.sum(dc, function(d){
		if(d.coordination==coordinatedHarmonizedId)
			return 1;
	});

	// uncoordianted total
	var uncoordinated = d3.sum(dc, function(d){
		if(d.coordination==uncoordinatedId)
			return 1;
	});

	// sector monitoring totals
	var sector_monitoring_5 = d3.sum(dc, function(d){
		if((d.sector_count>=5)&&(d.assessment_type==atype_keys.monitoring))
			return 1;
	});

	var sector_monitoring_2 = d3.sum(dc, function(d){
		if((d.sector_count>=2)&&(d.assessment_type==atype_keys.monitoring))
			return 1;
	});

	var sector_monitoring_1 = d3.sum(dc, function(d){
		if((d.sector_count==1)&&(d.assessment_type==atype_keys.monitoring))
			return 1;
	});

	d3.select('#total_assessments tspan').text(addCommas(totalAssessments));
	d3.select('#coordinated_5_sector tspan').text(addCommas(coordinated_5));
	d3.select('#coordinated_2_sector tspan').text(addCommas(coordinated_2));
	d3.select('#coordinated_1_sector tspan').text(addCommas(coordinated_1));
	d3.select('#harmonized tspan').text(addCommas(harmonized));
	d3.select('#uncoordinated tspan').text(addCommas(uncoordinated));
	
	d3.select('#total_stakeholders tspan').text(0);
	d3.select('#lngo tspan').text(0);
	d3.select('#ingo tspan').text(0);
	d3.select('#un_agency tspan').text(0);
	d3.select('#cluster tspan').text(0);
	d3.select('#donor tspan').text(0);
	d3.select('#rcrc tspan').text(0);
	d3.select('#government tspan').text(0);

	d3.select('#mutli_sector_5 tspan').text(addCommas(mutli_sector_5));
	d3.select('#multi_sector_2 tspan').text(addCommas(mutli_sector_2));
	d3.select('#single_sector tspan').text(addCommas(single_sector));
	d3.select('#sector_monitoring_5 tspan').text(addCommas(sector_monitoring_5));
	d3.select('#sector_monitoring_2 tspan').text(addCommas(sector_monitoring_2));
	d3.select('#sector_monitoring_1 tspan').text(addCommas(sector_monitoring_1));
	d3.select('#total_initial tspan').text(0);
	d3.select('#total_rapid tspan').text(0);
	d3.select('#total_in_depth tspan').text(0);

	d3.select('#individuals tspan').text(addCommas(individuals));
	d3.select('#households tspan').text(addCommas(households));
	d3.select('#key_informants tspan').text(0);
	d3.select('#focus_group_discussions tspan').text(0);
	d3.select('#community_group_discussions tspan').text(0);

	// assessment types row
	var assessmentTypes = dataByAssessmentType.filter(function(d){return ((d.date>=dateRange[0])&&(d.date<dateRange[1])) ;});
	assessmentTypes = d3.nest()
	.key(function(d){ return d.assessment_type; })
	.rollup(function(leaves){ 
		return leaves.length;
	})
	.entries(assessmentTypes);

	assessmentTypes.forEach(function(d,i){
		d.key = parseInt(d.key);

		// initial assessments
		if(d.key==atype_keys.initial){
			d3.select('#total_initial tspan').text(addCommas(d.value));
		} 

		// rapid assessments
		if(d.key==atype_keys.rapid){
			d3.select('#total_rapid tspan').text(addCommas(d.value));
		} 

		// in-depth assessments
		if(d.key==atype_keys.in_depth){
			d3.select('#total_in_depth tspan').text(addCommas(d.value));
		} 
	});

	// stakeholder row
	var organisations = dataByOrganisation.filter(function(d){return ((d.date>=dateRange[0])&&(d.date<dateRange[1])) ;});
	var uniqueOrganisations = [];
	var stakeholderTypes = [];

	organisations.forEach(function(d,i){
		if(!uniqueOrganisations.includes(d.organisation)){
			uniqueOrganisations.push(d.organisation);
			if(d.stakeholder_type!=null) stakeholderTypes.push(d.stakeholder_type);
		}
	});

	d3.select('#total_stakeholders tspan').text(addCommas(uniqueOrganisations.length));

	// STAKEHOLDERS ROW
	var lngo = d3.sum(dc, function(d){
		if(d.top.includes('lngo')) return 1;
	})
	d3.select('#lngo tspan').text(addCommas(lngo));

	var ingo = d3.sum(dc, function(d){
		if(d.top.includes('ingo')) return 1;
	})
	d3.select('#ingo tspan').text(addCommas(ingo));

	var un_agency = d3.sum(dc, function(d){
		if(d.top.includes('un_agency')) return 1;
	})
	d3.select('#un_agency tspan').text(addCommas(un_agency));

	var cluster = d3.sum(dc, function(d){
		if(d.top.includes('cluster')) return 1;
	})
	d3.select('#cluster tspan').text(addCommas(cluster));

	var donor = d3.sum(dc, function(d){
		if(d.top.includes('donor')) return 1;
	})
	d3.select('#donor tspan').text(addCommas(donor));

	var rcrc = d3.sum(dc, function(d){
		if(d.top.includes('rcrc')) return 1;
	})
	d3.select('#rcrc tspan').text(addCommas(rcrc));

	var government = d3.sum(dc, function(d){
		if(d.top.includes('government')) return 1;
	})
	d3.select('#government tspan').text(addCommas(government));

	// BOTTOM ROW
	var key_informants = d3.sum(dc,function(d){
		if(d.top.includes('key_informant_interview')) return d.data_collection_technique_sample_size[data_collection_technique_keys.key_informant_interview]
	})
	d3.select('#key_informants tspan').text(addCommas(key_informants));

	var focus_group_discussion = d3.sum(dc,function(d){
		if(d.top.includes('focus_group_discussion')) return 1;
	})
	d3.select('#focus_group_discussions tspan').text(addCommas(focus_group_discussion));

	var community_group_discussion = d3.sum(dc,function(d){
		if(d.top.includes('community_group_discussion')) return 1;
	})
	d3.select('#community_group_discussions tspan').text(addCommas(community_group_discussion));

	// spacing
	var boxes = d3.selectAll('#top_row svg g').filter(function(d,i){
		var t = d3.select(this).attr('id');
		return t.includes('_box');
	});

	boxes.each(function(d,i){
		var valueWidth = d3.select(this).select('.summary-value').node().getBBox().width;

		d3.select(this).selectAll('.summary-label').attr('x',function(d,i){
			if(d3.select(this).text().includes('=')){
					return valueWidth+126;		
				} else {
					return valueWidth+18;						
				}

		});
	})

}
